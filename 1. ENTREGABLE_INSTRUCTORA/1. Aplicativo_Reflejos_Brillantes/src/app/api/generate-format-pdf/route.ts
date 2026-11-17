import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  generateFormatDocxBuffer,
  type FormatDocxRequest,
} from '../generate-format-docx/route';

const execFileAsync = promisify(execFile);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function safeFileName(s: string): string {
  return (s || 'formato')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 60);
}

/**
 * Devuelve el nombre del ejecutable de LibreOffice headless. En Linux
 * suele ser `soffice` o `libreoffice`; en macOS está dentro del bundle
 * `.app`. Aquí asumimos despliegue Linux/WSL (el README del proyecto
 * menciona Caddy + Node), pero igualmente probamos `soffice` primero y
 * `libreoffice` como fallback.
 */
async function runLibreOffice(
  args: string[],
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string }> {
  const candidates =
    process.platform === 'darwin'
      ? [
          '/Applications/LibreOffice.app/Contents/MacOS/soffice',
          'soffice',
          'libreoffice',
        ]
      : ['soffice', 'libreoffice'];

  let lastErr: unknown = null;
  for (const bin of candidates) {
    try {
      return await execFileAsync(bin, args, {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (err) {
      lastErr = err;
      // ENOENT → probamos el siguiente candidato; otros errores → salimos.
      const e = err as NodeJS.ErrnoException;
      if (e?.code !== 'ENOENT') throw err;
    }
  }
  throw lastErr ?? new Error('LibreOffice (soffice) no encontrado en el PATH.');
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/*                                                                     */
/*  1. Genera el .docx reutilizando `generateFormatDocxBuffer` del    */
/*     route hermano (`/api/generate-format-docx`).                   */
/*  2. Lo escribe en un directorio temporal.                          */
/*  3. Lo convierte a PDF con `soffice --headless --convert-to pdf`.  */
/*  4. Lee el PDF resultante y lo devuelve.                           */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  let payload: FormatDocxRequest;
  try {
    payload = (await req.json()) as FormatDocxRequest;
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de la petición no es JSON válido.' },
      { status: 400 },
    );
  }

  if (!payload || !payload.formatId || !payload.formatName) {
    return NextResponse.json(
      { error: 'Faltan campos obligatorios: formatId, formatName.' },
      { status: 400 },
    );
  }
  if (!payload.empresa || !payload.empresa.name) {
    return NextResponse.json(
      { error: 'Falta la configuración de la empresa (empresa.name).' },
      { status: 400 },
    );
  }

  // 1. Generar el .docx base (reutiliza la lógica del route hermano).
  let docxBuffer: Buffer;
  try {
    docxBuffer = await generateFormatDocxBuffer(payload);
  } catch (err) {
    console.error('[generate-format-pdf] Error generando .docx base:', err);
    return NextResponse.json(
      {
        error: 'No se pudo generar el .docx base para convertirlo a PDF.',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  // 2. Escribir el .docx a un archivo temporal.
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sigth-pdf-'));
  const docxPath = path.join(tmpDir, 'document.docx');
  await fs.writeFile(docxPath, docxBuffer);

  try {
    // 3. Convertir con LibreOffice headless. Usamos un profile dir
    //    temporal para evitar conflictos con otros procesos soffice.
    const userInstallDir = path.join(tmpDir, 'lo-profile');
    await runLibreOffice(
      [
        `env:UserInstallation=file://${userInstallDir}`,
        '--headless',
        '--norestore',
        '--nolockcheck',
        '--convert-to',
        'pdf',
        '--outdir',
        tmpDir,
        docxPath,
      ],
      120_000,
    );

    // 4. Leer el PDF generado.
    const pdfPath = path.join(tmpDir, 'document.pdf');
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await fs.readFile(pdfPath);
    } catch (err) {
      console.error('[generate-format-pdf] No se encontró el PDF generado:', err);
      return NextResponse.json(
        {
          error:
            'LibreOffice no produjo un PDF. Revisa que el .docx sea válido y que LibreOffice esté instalado.',
        },
        { status: 500 },
      );
    }

    const filename = `${safeFileName(payload.formatId)}_${safeFileName(
      payload.formatName,
    )}.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[generate-format-pdf] Error en conversión con LibreOffice:', err);
    return NextResponse.json(
      {
        error: 'LibreOffice no pudo convertir el .docx a .pdf',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  } finally {
    // Limpieza del directorio temporal (siempre, incluso en error).
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

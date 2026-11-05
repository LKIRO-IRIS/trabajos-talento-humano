import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface HVAnalysisResult {
  nombre: string;
  telefono: string;
  correo: string;
  ciudad: string;
  formacion: string;
  areaFormacion: string;
  experiencia: string;
  cargoAspira: string;
  habilidades: string[];
  perfilProfesional: string;
  cumpleFormacion: boolean;
  cumpleExperiencia: boolean;
  perfilCompatible: boolean;
  motivoIncompatibilidad: string;
  rawText?: string;
}

/* ------------------------------------------------------------------ */
/*  JSON extraction & normalisation helpers (mirrors analyze-hv)       */
/* ------------------------------------------------------------------ */

function extractJson(content: string): any {
  if (!content) return null;
  let cleaned = content.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    /* continue */
  }
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      /* continue */
    }
  }
  return null;
}

function toArray(v: any): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  if (typeof v === 'string') {
    return v
      .split(/[,;•·\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function toStr(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function normaliseResult(parsed: any): HVAnalysisResult {
  return {
    nombre: toStr(parsed?.nombre) || 'Nombre no identificado',
    telefono: toStr(parsed?.telefono),
    correo: toStr(parsed?.correo),
    ciudad: toStr(parsed?.ciudad),
    formacion: toStr(parsed?.formacion) || 'No especificada',
    areaFormacion: toStr(parsed?.areaFormacion),
    experiencia: toStr(parsed?.experiencia) || '0',
    cargoAspira: toStr(parsed?.cargoAspira) || 'No especificado',
    habilidades: toArray(parsed?.habilidades),
    perfilProfesional: toStr(parsed?.perfilProfesional),
    cumpleFormacion: Boolean(parsed?.cumpleFormacion),
    cumpleExperiencia: Boolean(parsed?.cumpleExperiencia),
    perfilCompatible: parsed?.perfilCompatible !== false,
    motivoIncompatibilidad:
      parsed?.perfilCompatible === false
        ? toStr(parsed?.motivoIncompatibilidad) ||
          'El perfil profesional del candidato no se considera directamente compatible con el cargo solicitado.'
        : '',
    rawText: typeof parsed === 'string' ? parsed : undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  HTML → plain text extraction                                        */
/* ------------------------------------------------------------------ */

/**
 * Fetches the page at the given URL and extracts the visible text content
 * (strips scripts, styles, tags, and collapses whitespace). Caps the result
 * at 5000 chars so the VLM doesn't get flooded with boilerplate markup.
 *
 * Adds a realistic User-Agent so most public sites don't 403 us.
 */
async function fetchUrlText(url: string): Promise<string> {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; SIGTH-HV-Bot/1.0; +https://sigth.local)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    },
  });
  if (!response.ok) {
    throw new Error(`No se pudo descargar el enlace (HTTP ${response.status}).`);
  }
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('text/') && !contentType.includes('html') && !contentType.includes('xml')) {
    throw new Error(
      `El enlace no devuelve contenido HTML/texto (Content-Type: ${contentType || 'desconocido'}). Solo se admiten páginas web públicas.`,
    );
  }
  const html = await response.text();
  // Strip scripts/styles then all remaining tags, then collapse whitespace.
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|td|th)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) {
    throw new Error(
      'No se pudo extraer texto útil de la página. Puede requerir login o ser una SPA sin contenido estático.',
    );
  }
  return text.substring(0, 5000);
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, cargoRequerido } = body as {
      url?: string;
      cargoRequerido?: string;
    };

    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json(
        { error: 'Se requiere una URL válida (http:// o https://).' },
        { status: 400 },
      );
    }

    // 1. Fetch the page content server-side.
    const pageText = await fetchUrlText(url);

    // 2. Ask the VLM to analyse the extracted text — no image needed.
    const zai = await ZAI.create();

    const cargoContext = cargoRequerido
      ? `\n\nContexto del proceso de selección: el cargo a cubrir es "${cargoRequerido}". Evalúa "cumpleFormacion" y "cumpleExperiencia" considerando los requisitos típicos de ese cargo si la información es inferible. Evalúa también "perfilCompatible" analizando si el perfil profesional del candidato (área de formación, experiencia y cargos previos) es coherente con el cargo solicitado "${cargoRequerido}". Si "perfilCompatible" es false, explica brevemente el motivo en "motivoIncompatibilidad"; si es true, devuelve null o cadena vacía en "motivoIncompatibilidad".`
      : '';

    const prompt = `Analiza la siguiente información de una hoja de vida extraída de una página web. Extrae los datos en formato JSON válido. Responde SOLO con el objeto JSON, sin markdown, sin texto adicional ni explicaciones:
{
  "nombre": "nombre completo del candidato",
  "telefono": "teléfono de contacto (con indicativo país si aparece)",
  "correo": "correo electrónico",
  "ciudad": "ciudad de residencia",
  "formacion": "nivel de formación más alto alcanzado. Usa uno de estos valores exactos: Bachiller, Técnico, Tecnólogo, Profesional, Especialización, Maestría",
  "areaFormacion": "área específica de formación (ej: Logística, Administración, Psicología, Enfermería, Ingeniería Industrial, Comercio, Mercadeo, Contaduría, Talento Humano, etc.). Si no es posible determinarla, devuelve cadena vacía.",
  "experiencia": "años de experiencia total como número entero (si no se puede determinar, usa 0)",
  "cargoAspira": "cargo al que aspira o cargo más reciente",
  "habilidades": ["lista de 3 a 5 habilidades principales mencionadas"],
  "perfilProfesional": "resumen breve del perfil profesional en 1-2 líneas",
  "cumpleFormacion": true | false,
  "cumpleExperiencia": true | false,
  "perfilCompatible": true | false,
  "motivoIncompatibilidad": "explica brevemente por qué no es compatible, o null si sí es compatible"
}${cargoContext}

Contenido extraído de la página web (${url}):

${pageText}

Devuelve únicamente el JSON.`;

    const response = await zai.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      thinking: { type: 'disabled' },
    });

    const content = response?.choices?.[0]?.message?.content || '';

    const parsed = extractJson(content);
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            'No se pudo extraer JSON estructurado de la respuesta del VLM.',
          rawContent: content,
        },
        { status: 422 },
      );
    }

    const result = normaliseResult(parsed);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[fetch-url] Error:', error?.message || error);
    return NextResponse.json(
      {
        error: 'Error al analizar el enlace de la hoja de vida.',
        detail: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}

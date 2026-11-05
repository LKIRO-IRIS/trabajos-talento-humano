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
  /** AI-evaluated compatibility between candidate's profile and the requested cargo. */
  perfilCompatible: boolean;
  /** Brief explanation of why the profile is NOT compatible, or empty/null if compatible. */
  motivoIncompatibilidad: string;
  rawText?: string;
}

/**
 * Strips markdown fences and extracts the JSON object from a VLM response.
 * Falls back gracefully to a regex search if direct parse fails.
 */
function extractJson(content: string): any {
  if (!content) return null;
  let cleaned = content.trim();
  // Remove ```json ... ``` fences if present
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    /* continue */
  }
  // Try to find the first {...} block
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

function normaliseResult(parsed: any): HVAnalysisResult {
  const toArray = (v: any): string[] => {
    if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
    if (typeof v === 'string') {
      return v
        .split(/[,;•·\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  };
  const toStr = (v: any): string => {
    if (v === null || v === undefined) return '';
    return String(v).trim();
  };
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
    // Default to true if missing — only treat as incompatible when AI explicitly says false.
    perfilCompatible: parsed?.perfilCompatible !== false,
    motivoIncompatibilidad:
      parsed?.perfilCompatible === false
        ? toStr(parsed?.motivoIncompatibilidad) ||
          'El perfil profesional del candidato no se considera directamente compatible con el cargo solicitado.'
        : '',
    rawText: typeof parsed === 'string' ? parsed : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType, cargoRequerido } = body as {
      imageBase64?: string;
      mimeType?: string;
      cargoRequerido?: string;
    };

    if (!imageBase64 || !mimeType) {
      return NextResponse.json(
        { error: 'Faltan parámetros (imageBase64, mimeType).' },
        { status: 400 },
      );
    }

    const zai = await ZAI.create();

    const cargoContext = cargoRequerido
      ? `\n\nContexto del proceso de selección: el cargo a cubrir es "${cargoRequerido}". Evalúa "cumpleFormacion" y "cumpleExperiencia" considerando los requisitos típicos de ese cargo si la información es inferible. Evalúa también "perfilCompatible" analizando si el perfil profesional del candidato (área de formación, experiencia y cargos previos) es coherente con el cargo solicitado "${cargoRequerido}". Si "perfilCompatible" es false, explica brevemente el motivo en "motivoIncompatibilidad"; si es true, devuelve null o cadena vacía en "motivoIncompatibilidad".`
      : '';

    const prompt = `Analiza esta hoja de vida (resume) en español. Extrae la siguiente información en formato JSON válido. Responde SOLO con el objeto JSON, sin markdown, sin texto adicional ni explicaciones:
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

Devuelve únicamente el JSON.`;

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    });

    const content = response?.choices?.[0]?.message?.content || '';

    const parsed = extractJson(content);
    if (!parsed) {
      return NextResponse.json(
        {
          error: 'No se pudo extraer JSON estructurado de la respuesta del VLM.',
          rawContent: content,
        },
        { status: 422 },
      );
    }

    const result = normaliseResult(parsed);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[analyze-hv] Error:', error?.message || error);
    return NextResponse.json(
      {
        error: 'Error al analizar la hoja de vida con el VLM.',
        detail: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}

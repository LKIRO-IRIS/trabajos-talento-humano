import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { getZai } from "@/lib/zai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface GenerateHvRequest {
  nombre: string;
  cargo: string;
  nivelFormacion?: string;
  aniosExperiencia?: number;
  ciudad?: string;
  habilidadesClave?: string[];
}

const SYSTEM_PROMPT = `Eres un generador experto de hojas de vida profesionales para el mercado laboral colombiano.
Vas a generar una hoja de vida completa y realista para un candidato ficticio que encaje perfectamente en el cargo solicitado.
Devuelves EXCLUSIVAMENTE un objeto JSON válido (sin markdown, sin texto explicativo, sin comentarios) con esta forma exacta:

{
  "nombresApellidos": "string (usa el nombre solicitado)",
  "tipoDocumento": "Cédula de ciudadanía",
  "numeroDocumento": "string de 8-10 dígitos numéricos",
  "lugarExpedicion": "ciudad colombiana realista (Bogotá, Medellín, Cali, Barranquilla, Bucaramanga, etc.)",
  "fechaNacimiento": "YYYY-MM-DD (entre 1980 y 2000, coherente con los años de experiencia)",
  "lugarNacimiento": "ciudad colombiana realista",
  "nacionalidad": "Colombiana",
  "direccion": "dirección realista de la ciudad (calle o carrera + número)",
  "municipio": "ciudad colombiana",
  "telefono": "+57 3XX XXX XXXX (formato colombiano)",
  "correo": "email profesional basado en el nombre (gmail.com o hotmail.com)",
  "estadoCivil": "Soltero/a | Casado/a | Unión libre",
  "perfilProfesional": "3-4 frases destacando trayectoria, fortalezas, logros y encaje concreto con el cargo objetivo",
  "formacion": [
    {
      "id": "f1",
      "nivel": "Profesional | Especialización | Maestría | Tecnólogo (coherente con el nivel solicitado)",
      "titulo": "nombre del título",
      "institucion": "universidad colombiana reconocida (Nacional, Andes, EAFIT, Javeriana, etc.)",
      "fechaGrado": "YYYY-MM-DD (coherente con la edad y experiencia)",
      "semestres": "9 | 10 | 12"
    }
  ],
  "experiencia": [
    {
      "id": "e1",
      "empresa": "empresa colombiana realista",
      "cargo": "cargo previo lógico (más junior que el cargo objetivo)",
      "telefono": "+57 6XX XXXX o +57 1XXXXXXX",
      "fechaInicio": "YYYY-MM-DD",
      "fechaFin": "YYYY-MM-DD o cadena vacía si es el cargo actual",
      "funciones": "5-7 funciones en viñetas separadas por ; "
    }
  ],
  "referencias": [
    {
      "id": "r1",
      "nombre": "nombre completo realista",
      "cargo": "cargo de la persona que recomienda",
      "empresa": "empresa",
      "telefono": "+57 3XX XXX XXXX",
      "tipo": "Personal | Laboral"
    }
  ]
}

Reglas obligatorias:
- Genera MÍNIMO 1 formación, 2 experiencias laborales (la más reciente debe ser el cargo objetivo o uno previo lógico) y 2 referencias.
- Usa datos realistas de Colombia. El email debe ser profesional y estar basado en el nombre.
- Asegúrate de que las fechas sean coherentes con la edad y la experiencia declarada.
- Las habilidades clave solicitadas deben reflejarse en el perfil profesional y las funciones.
- Devuelve SIEMPRE JSON válido y nada más (sin texto antes ni después, sin markdown).`;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateHvRequest;
    if (!body.nombre || !body.cargo) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: nombre y cargo." },
        { status: 400 },
      );
    }

    const zai = await getZai();
    const userPrompt = `Genera la hoja de vida para:
- Nombre: ${body.nombre}
- Cargo objetivo: ${body.cargo}
- Nivel de formación: ${body.nivelFormacion || "Profesional"}
- Años de experiencia: ${body.aniosExperiencia || 3}
- Ciudad: ${body.ciudad || "Bogotá"}
- Habilidades clave: ${(body.habilidadesClave || []).join(", ") || "no especificadas"}

Recuerda: devuelve SOLO el objeto JSON, sin markdown, sin texto adicional.`;

    const completion = await zai.chat.completions.create({
      model: "glm-4.6",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2400,
    });

    const raw = completion.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```(?:json)?\s*/, "")
        .replace(/```\s*$/, "");
    }
    // Find first { and last } in case the model prefixed/appendix text
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return NextResponse.json(
        {
          error: "El modelo no devolvió JSON válido.",
          raw,
        },
        { status: 422 },
      );
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("[generate-hv] Error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Error interno" },
      { status: 500 },
    );
  }
}

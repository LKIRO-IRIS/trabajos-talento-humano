import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

interface FilaExcel {
  id: string;
  nombre: string;
  departamento: string;
  cargo: string;
  promedio: number;
  ultimaCalificacion: string;
  ultimaPuntuacion: number | null;
  evaluaciones: number;
  periodo: string;
}

interface Body {
  empresa: string;
  filas: FilaExcel[];
}

export async function POST(req: NextRequest) {
  try {
    // Validar tamaño del body (máximo 1MB para prevenir DoS)
    const text = await req.text();
    if (text.length > 1_000_000) {
      return NextResponse.json({ error: "El cuerpo de la solicitud es demasiado grande" }, { status: 413 });
    }

    let body: Body;
    try {
      body = JSON.parse(text) as Body;
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    // Validar estructura del body
    if (!body || !Array.isArray(body.filas)) {
      return NextResponse.json({ error: "El cuerpo debe contener un array 'filas'" }, { status: 400 });
    }
    if (typeof body.empresa !== "string") {
      body.empresa = "Empresa";
    }

    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen comparativo
    const resumen = body.filas.map((f, i) => ({
      "#": i + 1,
      ID: f.id || "",
      Nombre: f.nombre || "",
      Departamento: f.departamento || "",
      Cargo: f.cargo || "",
      "Promedio General": typeof f.promedio === "number" && !isNaN(f.promedio)
        ? Number(f.promedio.toFixed(2)) : 0,
      "Última Calificación": f.ultimaCalificacion || "",
      "Última Puntuación": typeof f.ultimaPuntuacion === "number" ? f.ultimaPuntuacion : "",
      "Nº Evaluaciones": typeof f.evaluaciones === "number" ? f.evaluaciones : 0,
      "Último Periodo": f.periodo || "",
    }));

    const ws1 = XLSX.utils.json_to_sheet(resumen, {
      header: [
        "#",
        "ID",
        "Nombre",
        "Departamento",
        "Cargo",
        "Promedio General",
        "Última Calificación",
        "Última Puntuación",
        "Nº Evaluaciones",
        "Último Periodo",
      ],
    });

    // Anchos de columna
    ws1["!cols"] = [
      { wch: 5 },
      { wch: 18 },
      { wch: 26 },
      { wch: 18 },
      { wch: 26 },
      { wch: 16 },
      { wch: 20 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(wb, ws1, "Resumen");

    // Hoja 2: Metadatos
    const meta = [
      { Campo: "Empresa", Valor: body.empresa },
      { Campo: "Reporte", Valor: "Evaluación de Desempeño Laboral" },
      { Campo: "Generado", Valor: new Date().toLocaleString("es-CO") },
      { Campo: "Total empleados", Valor: body.filas.length },
    ];
    const ws2 = XLSX.utils.json_to_sheet(meta);
    ws2["!cols"] = [{ wch: 22 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Información");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="evaluaciones.xlsx"',
      },
    });
  } catch (err) {
    console.error("Error generando Excel:", err);
    return NextResponse.json(
      { error: "Error interno al generar el Excel" },
      { status: 500 }
    );
  }
}

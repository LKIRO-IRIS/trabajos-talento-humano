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
    const body = (await req.json()) as Body;

    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen comparativo
    const resumen = body.filas.map((f, i) => ({
      "#": i + 1,
      ID: f.id,
      Nombre: f.nombre,
      Departamento: f.departamento,
      Cargo: f.cargo,
      "Promedio General": Number(f.promedio.toFixed(2)),
      "Última Calificación": f.ultimaCalificacion,
      "Última Puntuación": f.ultimaPuntuacion ?? "",
      "Nº Evaluaciones": f.evaluaciones,
      "Último Periodo": f.periodo,
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

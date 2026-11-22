import { NextRequest, NextResponse } from "next/server";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface FilaComparativa {
  nombre: string;
  departamento: string;
  cargo: string;
  promedio: number;
  calificacion: string;
  count: number;
}

interface FilaEmpleado {
  id: string;
  nombre: string;
  departamento: string;
  cargo: string;
}

interface ConclusionItem {
  areaId: string;
  areaLabel: string;
  pregunta: string;
  texto: string;
  ultimaEdicion: string;
}

interface AnalisisConclusiones {
  areaMejor: string;
  areaMejorPromedio: number;
  areaPeor: string;
  areaPeorPromedio: number;
  tipoMasFuerte: string;
  tipoMasDebil: string;
  promedioGeneral: number;
  totalEvaluados: number;
  porArea: Array<{
    area: string;
    tecnica: number;
    blanda: number;
    organizacional: number;
    promedio: number;
    total: number;
  }>;
}

interface BodyEmpleado {
  tipo: "empleado";
  empresa: string;
  config?: { nombre: string; primaryColor: string; secondaryColor: string };
  empleado: FilaEmpleado;
  evaluaciones: Array<{
    id: string;
    periodo: string;
    fecha: string;
    puntuacionFinal: number;
    calificacion: string;
    comentarios: string;
    evaluadorNombre: string;
    criterios: Array<{ criterioId: string; puntaje: number }>;
    planMejora?: {
      generado: boolean;
      criterioMasBajo: string;
      acciones: string[];
      fechaSeguimiento: string;
      responsable: string;
      estado: string;
    };
  }>;
  criterios: Array<{ id: string; nombre: string; peso: number }>;
}

interface BodyComparativo {
  tipo: "comparativo";
  empresa: string;
  config?: { nombre: string; primaryColor: string; secondaryColor: string };
  filas: FilaComparativa[];
}

interface BodyConclusiones {
  tipo: "conclusiones";
  empresa: string;
  config?: { nombre: string; primaryColor: string; secondaryColor: string };
  conclusiones: ConclusionItem[];
  analisis: AnalisisConclusiones;
}

type Body = BodyEmpleado | BodyComparativo | BodyConclusiones;

function colorCalificacion(cal: string): [number, number, number] {
  switch (cal) {
    case "Sobresaliente":
      return [22, 163, 74];
    case "Satisfactorio":
      return [37, 99, 235];
    case "Necesita Mejora":
      return [245, 158, 11];
    case "Insatisfactorio":
      return [220, 38, 38];
    default:
      return [107, 114, 128];
  }
}

export async function POST(req: NextRequest) {
  try {
    // Validar tamaño del body (máximo 2MB para prevenir DoS)
    const text = await req.text();
    if (text.length > 2_000_000) {
      return NextResponse.json({ error: "El cuerpo de la solicitud es demasiado grande" }, { status: 413 });
    }

    let body: Body;
    try {
      body = JSON.parse(text) as Body;
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    // Validar estructura mínima
    if (!body || (body.tipo !== "empleado" && body.tipo !== "comparativo" && body.tipo !== "conclusiones")) {
      return NextResponse.json({ error: "El campo 'tipo' debe ser 'empleado', 'comparativo' o 'conclusiones'" }, { status: 400 });
    }
    if (!body.empresa || typeof body.empresa !== "string") {
      body.empresa = "Evaluación de Desempeño";
    }
    if (body.tipo === "comparativo" && !Array.isArray((body as BodyComparativo).filas)) {
      return NextResponse.json({ error: "El tipo 'comparativo' requiere el array 'filas'" }, { status: 400 });
    }
    if (body.tipo === "empleado") {
      const b = body as BodyEmpleado;
      if (!b.empleado || !Array.isArray(b.evaluaciones)) {
        return NextResponse.json({ error: "El tipo 'empleado' requiere 'empleado' y 'evaluaciones'" }, { status: 400 });
      }
    }
    if (body.tipo === "conclusiones") {
      const b = body as BodyConclusiones;
      if (!Array.isArray(b.conclusiones) || !b.analisis) {
        return NextResponse.json({ error: "El tipo 'conclusiones' requiere 'conclusiones' y 'analisis'" }, { status: 400 });
      }
    }

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;

    // Cabecera
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, pageWidth, 70, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(body.empresa || "Evaluación de Desempeño", margin, 32);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Reporte de Evaluación de Desempeño Laboral", margin, 50);
    doc.text(
      `Generado: ${new Date().toLocaleDateString("es-CO")}`,
      pageWidth - margin,
      50,
      { align: "right" }
    );

    let y = 90;

    if (body.tipo === "comparativo") {
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Reporte comparativo de empleados", margin, y);
      y += 10;

      autoTable(doc, {
        startY: y,
        head: [["#", "Empleado", "Departamento", "Cargo", "Promedio", "Calificación", "Eval."]],
        body: body.filas.map((f, i) => [
          String(i + 1),
          f.nombre,
          f.departamento,
          f.cargo,
          f.promedio.toFixed(1),
          f.calificacion,
          String(f.count),
        ]),
        theme: "striped",
        headStyles: { fillColor: [13, 148, 136], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        columnStyles: {
          0: { cellWidth: 24, halign: "center" },
          4: { halign: "right", fontStyle: "bold" },
          6: { halign: "center" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 5) {
            const cal = String(data.cell.raw);
            const [r, g, b] = colorCalificacion(cal);
            data.cell.styles.textColor = [r, g, b];
            data.cell.styles.fontStyle = "bold";
          }
        },
        margin: { left: margin, right: margin },
      });
    } else if (body.tipo === "conclusiones") {
      // Informe de conclusiones del estudiante
      const { conclusiones, analisis } = body;

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("Informe de Conclusiones", margin, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generado: ${new Date().toLocaleDateString("es-CO")} · Evaluados: ${analisis.totalEvaluados}`,
        margin,
        y
      );
      y += 18;

      // Cuadro resumen del análisis
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 70, 4, 4, "F");
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Resumen del análisis", margin + 12, y + 18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        `Promedio general: ${analisis.promedioGeneral.toFixed(1)} / 100`,
        margin + 12,
        y + 32
      );
      doc.text(
        `Área más fuerte: ${analisis.areaMejor} (${analisis.areaMejorPromedio.toFixed(1)})`,
        margin + 12,
        y + 44
      );
      doc.text(
        `Área a mejorar: ${analisis.areaPeor} (${analisis.areaPeorPromedio.toFixed(1)})`,
        margin + 12,
        y + 56
      );
      doc.text(
        `Competencia más fuerte: ${analisis.tipoMasFuerte}`,
        pageWidth / 2,
        y + 32
      );
      doc.text(
        `Competencia más débil: ${analisis.tipoMasDebil}`,
        pageWidth / 2,
        y + 44
      );
      y += 86;

      // Tabla de promedios por área
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("Promedios por área y tipo de competencia", margin, y);
      y += 8;
      autoTable(doc, {
        startY: y,
        head: [["Área", "Técnicas", "Blandas", "Organiz.", "Promedio", "Empl."]],
        body: analisis.porArea.map((a) => [
          a.area,
          a.tecnica.toFixed(1),
          a.blanda.toFixed(1),
          a.organizacional.toFixed(1),
          a.promedio.toFixed(1),
          String(a.total),
        ]),
        theme: "grid",
        headStyles: { fillColor: [13, 148, 136], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          4: { halign: "right", fontStyle: "bold" },
          5: { halign: "center" },
        },
        margin: { left: margin, right: margin },
      });
      const finalY1 = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY;
      y = typeof finalY1 === "number" ? finalY1 + 24 : y;

      // Conclusiones del estudiante
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text("Conclusiones del estudiante", margin, y);
      y += 16;

      for (const c of conclusiones) {
        if (!c.texto || !c.texto.trim()) continue;
        // Nueva página si no cabe el título
        if (y > doc.internal.pageSize.getHeight() - 100) {
          doc.addPage();
          y = 60;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(13, 148, 136);
        doc.text(c.areaLabel, margin, y);
        y += 12;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const preguntaLines = doc.splitTextToSize(c.pregunta, pageWidth - margin * 2);
        doc.text(preguntaLines, margin, y);
        y += preguntaLines.length * 10 + 4;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        const lines = doc.splitTextToSize(c.texto, pageWidth - margin * 2);
        // Paginación por si la conclusión es muy larga
        const lineHeight = 13;
        for (const line of lines) {
          if (y > doc.internal.pageSize.getHeight() - 60) {
            doc.addPage();
            y = 60;
          }
          doc.text(line, margin, y);
          y += lineHeight;
        }
        y += 10;
      }

      // Firmas
      if (y > doc.internal.pageSize.getHeight() - 100) {
        doc.addPage();
        y = 60;
      }
      y += 20;
      doc.setDrawColor(15, 23, 42);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("_____________________", margin, y);
      doc.text("_____________________", pageWidth - margin - 110, y);
      y += 14;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Evaluador", margin, y);
      doc.text("Responsable", pageWidth - margin - 110, y);
    } else {
      // Ficha individual de empleado
      const { empleado, evaluaciones, criterios } = body;

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text(empleado.nombre, margin, y);
      y += 18;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `${empleado.cargo} · ${empleado.departamento} · ID: ${empleado.id}`,
        margin,
        y
      );
      y += 18;

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Historial de evaluaciones", margin, y);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [["Periodo", "Fecha", "Puntuación", "Calificación", "Evaluador"]],
        body: evaluaciones.map((e) => [
          e.periodo,
          new Date(e.fecha).toLocaleDateString("es-CO"),
          e.puntuacionFinal.toFixed(1),
          e.calificacion,
          e.evaluadorNombre,
        ]),
        theme: "grid",
        headStyles: { fillColor: [13, 148, 136], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: margin, right: margin },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 3) {
            const cal = String(data.cell.raw);
            const [r, g, b] = colorCalificacion(cal);
            data.cell.styles.textColor = [r, g, b];
            data.cell.styles.fontStyle = "bold";
          }
        },
      });

      // Cast seguro: si autoTable no seteó finalY, usar y actual
      const finalY1 = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY;
      y = typeof finalY1 === "number" ? finalY1 + 24 : y;

      if (evaluaciones.length > 0) {
        const ultima = evaluaciones[evaluaciones.length - 1];

        // Desglose por criterio
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text("Desglose por criterio (última evaluación)", margin, y);
        y += 8;

        autoTable(doc, {
          startY: y,
          head: [["Criterio", "Peso", "Puntaje", "Aporte"]],
          body: criterios.map((c) => {
            const p =
              ultima.criterios.find((x) => x.criterioId === c.id)?.puntaje ?? 0;
            return [
              c.nombre,
              `${c.peso}%`,
              p.toFixed(1),
              ((p * c.peso) / 100).toFixed(1),
            ];
          }),
          foot: [["", "", "Final", ultima.puntuacionFinal.toFixed(1)]],
          theme: "grid",
          headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 9 },
          footStyles: { fillColor: [241, 245, 249], textColor: 15, fontStyle: "bold", fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          margin: { left: margin, right: margin },
        });

        // Cast seguro: si autoTable no seteó finalY, usar y actual
        const finalY2 = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY;
        y = typeof finalY2 === "number" ? finalY2 + 24 : y;

        // Comentarios
        if (ultima.comentarios) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.text("Comentarios del evaluador", margin, y);
          y += 16;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          const split = doc.splitTextToSize(ultima.comentarios, pageWidth - margin * 2);
          doc.text(split, margin, y);
          y += split.length * 12 + 10;
        }

        // Plan de mejora
        if (ultima.planMejora?.generado) {
          if (y > doc.internal.pageSize.getHeight() - 180) {
            doc.addPage();
            y = 60;
          }
          doc.setFillColor(254, 243, 199);
          doc.roundedRect(margin, y, pageWidth - margin * 2, 24, 4, 4, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.setTextColor(146, 64, 14);
          doc.text("Plan de mejora automático", margin + 10, y + 16);
          y += 36;

          doc.setTextColor(15, 23, 42);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.text(
            `Criterio más bajo: ${ultima.planMejora.criterioMasBajo}`,
            margin,
            y
          );
          y += 14;
          doc.text(
            `Seguimiento: ${new Date(ultima.planMejora.fechaSeguimiento).toLocaleDateString("es-CO")}`,
            margin,
            y
          );
          y += 14;
          doc.text(`Responsable: ${ultima.planMejora.responsable}`, margin, y);
          y += 14;
          doc.text(`Estado: ${ultima.planMejora.estado}`, margin, y);
          y += 20;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text("Acciones recomendadas:", margin, y);
          y += 14;
          doc.setFont("helvetica", "normal");
          // Validar que acciones sea un array antes de iterar
          const acciones = Array.isArray(ultima.planMejora?.acciones) ? ultima.planMejora.acciones : [];
          acciones.forEach((a, i) => {
            const lines = doc.splitTextToSize(`${i + 1}. ${a}`, pageWidth - margin * 2 - 10);
            doc.text(lines, margin + 4, y);
            y += lines.length * 12 + 2;
          });
        }
      }
    }

    // Pie de página
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${body.empresa ?? "Evaluación de Desempeño"} — Documento generado automáticamente`,
      margin,
      pageHeight - 16
    );
    // Pie de página con numeración dinámica en todas las páginas
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth - margin,
        pageHeight - 16,
        { align: "right" }
      );
    }

    const pdfBytes = doc.output("arraybuffer");
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="reporte-evaluacion.pdf"',
      },
    });
  } catch (err) {
    console.error("Error generando PDF:", err);
    return NextResponse.json(
      { error: "Error interno al generar el PDF" },
      { status: 500 }
    );
  }
}

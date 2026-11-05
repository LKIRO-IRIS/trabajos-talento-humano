import type { GenericFormatConfig } from "@/components/sigth/gestion/formats/GenericFormat";

/**
 * Configuration for the 22 "simple" formats that use the generic renderer.
 * Detailed formats (TH-01, TH-03, TH-04, TH-06, TH-07, TH-09, TH-11, TH-22, TH-MD-01)
 * have their own dedicated components.
 */

export const FORMAT_CONFIGS: Record<string, GenericFormatConfig> = {
  /* ----- Atracción & Selección ----- */
  "TH-02": {
    formatId: "TH-02",
    formatName: "Perfil de Cargos",
    sections: [
      {
        title: "Identificación del Cargo",
        fields: [
          { key: "cargo", label: "Nombre del cargo", span: 2 },
          { key: "codigo", label: "Código" },
          { key: "area", label: "Área / Dependencia", span: 2 },
          { key: "jefe", label: "Jefe inmediato" },
          { key: "nivel", label: "Nivel jerárquico", type: "select", options: ["Operativo", "Técnico", "Profesional", "Dirección"] },
          { key: "nivelSalarial", label: "Nivel salarial" },
        ],
      },
      {
        title: "Propósito del Cargo",
        fields: [{ key: "proposito", label: "Describa el propósito principal", type: "textarea", span: 3, fullWidth: true }],
      },
      {
        title: "Funciones y Responsabilidades",
        table: {
          key: "funciones",
          columns: ["#", "Función", "Frecuencia"],
          initialRows: 5,
        },
      },
      {
        title: "Requisitos del Cargo",
        fields: [
          { key: "formacion", label: "Formación académica", span: 2 },
          { key: "experiencia", label: "Experiencia (años)" },
          { key: "conocimientos", label: "Conocimientos técnicos", type: "textarea", span: 3, fullWidth: true },
          { key: "competencias", label: "Competencias requeridas", type: "textarea", span: 3, fullWidth: true },
        ],
      },
      {
        title: "Aprobaciones",
        signatures: [
          { key: "elaboro", label: "Elaboró", role: "Gestión Humana" },
          { key: "reviso", label: "Revisó", role: "Jefe de área" },
          { key: "aprobo", label: "Aprobó", role: "Gerencia" },
        ],
      },
    ],
  },

  "TH-05": {
    formatId: "TH-05",
    formatName: "Verificación de Referencias",
    sections: [
      {
        title: "Datos del Candidato",
        fields: [
          { key: "nombre", label: "Nombre del candidato", span: 2 },
          { key: "documento", label: "Documento" },
          { key: "cargo", label: "Cargo al que aspira", span: 2 },
          { key: "fecha", label: "Fecha de verificación", type: "date" },
        ],
      },
      {
        title: "Referencias Laborales",
        table: {
          key: "referencias",
          columns: ["Empresa", "Jefe inmediato", "Cargo", "Teléfono", "Tiempo laburado", "Motivo retiro", "Concepto (1-5)"],
          initialRows: 2,
        },
      },
      {
        title: "Referencias Personales",
        table: {
          key: "personales",
          columns: ["Nombre", "Cargo", "Empresa", "Teléfono", "Concepto (1-5)"],
          initialRows: 2,
        },
      },
      {
        title: "Concepto de Verificación",
        fields: [
          { key: "concepto", label: "Concepto final", type: "select", options: ["Favorable", "Favorable con observaciones", "No favorable"] },
          { key: "observaciones", label: "Observaciones", type: "textarea", span: 3, fullWidth: true },
        ],
        signatures: [{ key: "responsable", label: "Responsable", role: "Gestión Humana" }],
      },
    ],
  },

  /* ----- Contratación & Onboarding ----- */
  "TH-08": {
    formatId: "TH-08",
    formatName: "Exámenes Médicos",
    sections: [
      {
        title: "Datos del Empleado",
        fields: [
          { key: "nombre", label: "Nombre del empleado", span: 2 },
          { key: "documento", label: "Documento" },
          { key: "cargo", label: "Cargo", span: 2 },
          { key: "fecha", label: "Fecha del examen", type: "date" },
        ],
      },
      {
        title: "Entidad Prestadora",
        fields: [
          { key: "ips", label: "IPS / Clínica", span: 2 },
          { key: "medico", label: "Médico ocupacional" },
          { key: "direccion", label: "Dirección", span: 2 },
          { key: "telefono", label: "Teléfono" },
        ],
      },
      {
        title: "Exámenes Realizados",
        table: {
          key: "examenes",
          columns: ["Tipo de examen", "Resultado", "Fecha", "Observación"],
          initialRows: 4,
        },
      },
      {
        title: "Concepto Médico",
        fields: [
          { key: "concepto", label: "Concepto de aptitud", type: "select", options: ["Apto", "Apto con restricciones", "No apto"] },
          { key: "recomendaciones", label: "Recomendaciones", type: "textarea", span: 3, fullWidth: true },
        ],
        signatures: [
          { key: "medico", label: "Médico", role: "Médico ocupacional" },
          { key: "th", label: "Gestión Humana", role: "TH" },
        ],
      },
    ],
  },

  "TH-10": {
    formatId: "TH-10",
    formatName: "Entrega de EPP y Dotación",
    sections: [
      {
        title: "Datos del Empleado",
        fields: [
          { key: "nombre", label: "Nombre del empleado", span: 2 },
          { key: "documento", label: "Documento" },
          { key: "cargo", label: "Cargo", span: 2 },
          { key: "fecha", label: "Fecha de entrega", type: "date" },
        ],
      },
      {
        title: "Elementos de Protección Personal (EPP)",
        table: {
          key: "epp",
          columns: ["Elemento", "Talla", "Cantidad", "Recibido"],
          checkboxColumns: ["Recibido"],
          initialRows: 5,
        },
      },
      {
        title: "Dotación",
        table: {
          key: "dotacion",
          columns: ["Prenda", "Talla", "Cantidad", "Recibido"],
          checkboxColumns: ["Recibido"],
          initialRows: 4,
        },
      },
      {
        title: "Compromisos",
        fields: [
          { key: "compromiso", label: "El empleado se compromete al uso adecuado y conservación de los elementos entregados.", type: "checkbox", span: 3, fullWidth: true },
        ],
        signatures: [
          { key: "entrega", label: "Entrega", role: "Gestión Humana / SST" },
          { key: "recibe", label: "Recibe", role: "Empleado" },
        ],
      },
    ],
  },

  "TH-12": {
    formatId: "TH-12",
    formatName: "Control de Asistencia",
    sections: [
      {
        title: "Datos del Empleado",
        fields: [
          { key: "nombre", label: "Nombre del empleado", span: 2 },
          { key: "documento", label: "Documento" },
          { key: "cargo", label: "Cargo", span: 2 },
          { key: "mes", label: "Mes/Año" },
        ],
      },
      {
        title: "Registro Diario",
        table: {
          key: "registro",
          columns: ["Día", "Entrada AM", "Salida AM", "Entrada PM", "Salida PM", "Novedad"],
          initialRows: 8,
        },
      },
      {
        title: "Novedades del Periodo",
        fields: [
          { key: "ausencias", label: "Días de ausencia" },
          { key: "permisos", label: "Permisos concedidos" },
          { key: "incapacidades", label: "Incapacidades (días)" },
          { key: "vacaciones", label: "Vacaciones disfrutadas" },
          { key: "observaciones", label: "Observaciones", type: "textarea", span: 3, fullWidth: true },
        ],
        signatures: [
          { key: "empleado", label: "Empleado", role: "Empleado" },
          { key: "jefe", label: "Jefe inmediato", role: "Jefe inmediato" },
        ],
      },
    ],
  },

  "TH-13": {
    formatId: "TH-13",
    formatName: "Satisfacción de Inducción",
    sections: [
      {
        title: "Datos del Encuestado",
        fields: [
          { key: "nombre", label: "Nombre del empleado", span: 2 },
          { key: "cargo", label: "Cargo" },
          { key: "fechaInduccion", label: "Fecha de inducción", type: "date" },
          { key: "fechaEncuesta", label: "Fecha de encuesta", type: "date" },
        ],
      },
      {
        title: "Evaluación de la Inducción (1-5)",
        table: {
          key: "items",
          columns: ["Aspecto evaluado", "Calificación", "Observación"],
          initialRows: 6,
        },
      },
      {
        title: "Comentarios Finales",
        fields: [
          { key: "fortalezas", label: "Fortalezas del proceso", type: "textarea", span: 3, fullWidth: true },
          { key: "mejoras", label: "Oportunidades de mejora", type: "textarea", span: 3, fullWidth: true },
        ],
        signatures: [{ key: "empleado", label: "Firma", role: "Empleado" }],
      },
    ],
  },

  /* ----- Desempeño & Desarrollo ----- */
  "TH-14": {
    formatId: "TH-14",
    formatName: "Evaluación de Desempeño",
    sections: [
      {
        title: "Datos del Evaluado",
        fields: [
          { key: "nombre", label: "Nombre del evaluado", span: 2 },
          { key: "documento", label: "Documento" },
          { key: "cargo", label: "Cargo actual", span: 2 },
          { key: "area", label: "Área" },
          { key: "fechaIngreso", label: "Fecha de ingreso", type: "date" },
          { key: "periodo", label: "Periodo evaluado" },
          { key: "evaluador", label: "Evaluador" },
        ],
      },
      {
        title: "Competencias Evaluadas (1-5)",
        table: {
          key: "competencias",
          columns: ["Competencia", "Autoevaluación", "Evaluador", "Promedio", "Observación"],
          initialRows: 5,
        },
      },
      {
        title: "Objetivos del Periodo",
        table: {
          key: "objetivos",
          columns: ["Objetivo", "% Cumplimiento", "Observación"],
          initialRows: 3,
        },
      },
      {
        title: "Plan de Acción",
        fields: [
          { key: "fortalezas", label: "Fortalezas", type: "textarea", span: 3, fullWidth: true },
          { key: "mejoras", label: "Aspectos a mejorar", type: "textarea", span: 3, fullWidth: true },
          { key: "compromisos", label: "Compromisos", type: "textarea", span: 3, fullWidth: true },
        ],
        signatures: [
          { key: "evaluado", label: "Evaluado", role: "Empleado" },
          { key: "evaluador", label: "Evaluador", role: "Jefe inmediato" },
          { key: "th", label: "Gestión Humana", role: "TH" },
        ],
      },
    ],
  },

  "TH-15": {
    formatId: "TH-15",
    formatName: "Plan de Mejoramiento",
    sections: [
      {
        title: "Datos del Empleado",
        fields: [
          { key: "nombre", label: "Nombre del empleado", span: 2 },
          { key: "documento", label: "Documento" },
          { key: "cargo", label: "Cargo", span: 2 },
          { key: "fecha", label: "Fecha de elaboración", type: "date" },
        ],
      },
      {
        title: "Hallazgos Identificados",
        table: {
          key: "hallazgos",
          columns: ["Aspecto a mejorar", "Evidencia", "Impacto en el cargo"],
          initialRows: 3,
        },
      },
      {
        title: "Acciones de Mejora",
        table: {
          key: "acciones",
          columns: ["Acción", "Responsable", "Fecha límite", "Indicador de seguimiento"],
          initialRows: 3,
        },
      },
      {
        title: "Compromisos",
        fields: [
          { key: "seguimiento", label: "Frecuencia de seguimiento", type: "select", options: ["Semanal", "Quincenal", "Mensual"] },
          { key: "observaciones", label: "Observaciones", type: "textarea", span: 3, fullWidth: true },
        ],
        signatures: [
          { key: "empleado", label: "Empleado", role: "Empleado" },
          { key: "jefe", label: "Jefe inmediato", role: "Jefe inmediato" },
          { key: "th", label: "Gestión Humana", role: "TH" },
        ],
      },
    ],
  },

  "TH-16": {
    formatId: "TH-16",
    formatName: "Plan Anual de Capacitación (PAC)",
    sections: [
      {
        title: "Información General",
        fields: [
          { key: "empresa", label: "Empresa", span: 2 },
          { key: "anio", label: "Año" },
          { key: "elaborado", label: "Elaborado por", span: 2 },
          { key: "aprobado", label: "Aprobado por" },
        ],
      },
      {
        title: "Cronograma de Capacitaciones",
        table: {
          key: "capacitaciones",
          columns: ["Tema", "Población objetivo", "Modalidad", "Fecha", "Duración (h)", "Responsable", "Presupuesto"],
          initialRows: 4,
        },
      },
      {
        title: "Aprobaciones",
        signatures: [
          { key: "elaboro", label: "Elaboró", role: "Gestión Humana" },
          { key: "reviso", label: "Revisó", role: "Coordinador" },
          { key: "aprobo", label: "Aprobó", role: "Gerencia" },
        ],
      },
    ],
  },

  "TH-17": {
    formatId: "TH-17",
    formatName: "Satisfacción de Capacitación",
    sections: [
      {
        title: "Datos de la Capacitación",
        fields: [
          { key: "tema", label: "Tema de la capacitación", span: 2 },
          { key: "fecha", label: "Fecha", type: "date" },
          { key: "instructor", label: "Instructor", span: 2 },
          { key: "duracion", label: "Duración (horas)" },
        ],
      },
      {
        title: "Datos del Participante",
        fields: [
          { key: "nombre", label: "Nombre", span: 2 },
          { key: "cargo", label: "Cargo" },
        ],
      },
      {
        title: "Evaluación (1-5)",
        table: {
          key: "items",
          columns: ["Aspecto evaluado", "Calificación", "Observación"],
          initialRows: 5,
        },
      },
      {
        title: "Comentarios",
        fields: [
          { key: "aprendizajes", label: "Principales aprendizajes", type: "textarea", span: 3, fullWidth: true },
          { key: "aplicacion", label: "Cómo aplicará lo aprendido", type: "textarea", span: 3, fullWidth: true },
        ],
        signatures: [{ key: "participante", label: "Participante", role: "Empleado" }],
      },
    ],
  },

  "TH-19": {
    formatId: "TH-19",
    formatName: "Matriz de Brechas de Competencias",
    sections: [
      {
        title: "Datos Generales",
        fields: [
          { key: "cargo", label: "Cargo evaluado", span: 2 },
          { key: "fecha", label: "Fecha", type: "date" },
        ],
      },
      {
        title: "Matriz de Brechas",
        table: {
          key: "brechas",
          columns: ["Competencia", "Nivel requerido", "Nivel actual", "Brecha", "Acción de cierre"],
          initialRows: 5,
        },
      },
      {
        title: "Aprobaciones",
        signatures: [
          { key: "elaboro", label: "Elaboró", role: "Gestión Humana" },
          { key: "jefe", label: "Jefe inmediato", role: "Jefe" },
        ],
      },
    ],
  },

  "TH-20": {
    formatId: "TH-20",
    formatName: "Plan Individual de Desarrollo (PID)",
    sections: [
      {
        title: "Datos del Empleado",
        fields: [
          { key: "nombre", label: "Nombre", span: 2 },
          { key: "documento", label: "Documento" },
          { key: "cargo", label: "Cargo actual", span: 2 },
          { key: "fecha", label: "Fecha de elaboración", type: "date" },
        ],
      },
      {
        title: "Objetivos de Desarrollo",
        table: {
          key: "objetivos",
          columns: ["Objetivo", "Acción", "Plazo", "Indicador"],
          initialRows: 3,
        },
      },
      {
        title: "Recursos y Apoyos",
        fields: [
          { key: "recursos", label: "Recursos necesarios", type: "textarea", span: 3, fullWidth: true },
          { key: "seguimiento", label: "Mecanismos de seguimiento", type: "textarea", span: 3, fullWidth: true },
        ],
        signatures: [
          { key: "empleado", label: "Empleado", role: "Empleado" },
          { key: "jefe", label: "Jefe inmediato", role: "Jefe inmediato" },
          { key: "th", label: "Gestión Humana", role: "TH" },
        ],
      },
    ],
  },

  /* ----- Estrategia & Bienestar ----- */
  "TH-18": {
    formatId: "TH-18",
    formatName: "Presupuesto Anual de Talento Humano",
    sections: [
      {
        title: "Información General",
        fields: [
          { key: "empresa", label: "Empresa", span: 2 },
          { key: "anio", label: "Año" },
        ],
      },
      {
        title: "Detalle del Presupuesto",
        table: {
          key: "rubros",
          columns: ["Rubro", "Concepto", "Trimestre 1", "Trimestre 2", "Trimestre 3", "Trimestre 4", "Total"],
          initialRows: 6,
        },
      },
      {
        title: "Resumen",
        fields: [
          { key: "totalAnual", label: "Total anual presupuestado" },
          { key: "ejecutado", label: "Ejecutado a la fecha" },
          { key: "porcentaje", label: "% Ejecución" },
        ],
        signatures: [
          { key: "elaboro", label: "Elaboró", role: "TH" },
          { key: "aprobo", label: "Aprobó", role: "Gerencia" },
        ],
      },
    ],
  },

  "TH-21": {
    formatId: "TH-21",
    formatName: "Plan de Bienestar",
    sections: [
      {
        title: "Información General",
        fields: [
          { key: "empresa", label: "Empresa", span: 2 },
          { key: "anio", label: "Año" },
          { key: "objetivo", label: "Objetivo del programa", type: "textarea", span: 3, fullWidth: true },
        ],
      },
      {
        title: "Programación de Actividades",
        table: {
          key: "actividades",
          columns: ["Actividad", "Población objetivo", "Fecha", "Presupuesto", "Responsable", "Indicador"],
          initialRows: 5,
        },
      },
      {
        title: "Aprobaciones",
        signatures: [
          { key: "elaboro", label: "Elaboró", role: "Comité de bienestar" },
          { key: "aprobo", label: "Aprobó", role: "Gerencia" },
        ],
      },
    ],
  },

  /* ----- Modelos de Documentos ----- */
  "TH-MD-02": {
    formatId: "TH-MD-02",
    formatName: "Modelo de Correos de Citación",
    sections: [
      {
        title: "Datos del Correo",
        fields: [
          { key: "para", label: "Para (correo destinatario)", span: 2 },
          { key: "asunto", label: "Asunto" },
          { key: "fecha", label: "Fecha envío", type: "date" },
        ],
      },
      {
        title: "Cuerpo del Correo",
        fields: [
          { key: "saludo", label: "Saludo", placeholder: "Cordial saludo, Sr(a)..." },
          { key: "cuerpo", label: "Cuerpo", type: "textarea", span: 3, fullWidth: true, placeholder: "Por medio del presente correo le citamos a..." },
          { key: "fechaCita", label: "Fecha y hora de la cita" },
          { key: "lugar", label: "Lugar / enlace" },
          { key: "documentos", label: "Documentos a llevar", type: "textarea", span: 3, fullWidth: true },
        ],
      },
      {
        title: "Firma",
        fields: [
          { key: "firmaNombre", label: "Nombre firmante" },
          { key: "firmaCargo", label: "Cargo" },
        ],
      },
    ],
  },

  "TH-MD-03": {
    formatId: "TH-MD-03",
    formatName: "Modelo de Informe",
    sections: [
      {
        title: "Datos del Informe",
        fields: [
          { key: "titulo", label: "Título del informe", span: 3, fullWidth: true },
          { key: "destinatario", label: "Destinatario" },
          { key: "cargo", label: "Cargo del destinatario" },
          { key: "fecha", label: "Fecha", type: "date" },
          { key: "elaborado", label: "Elaborado por" },
          { key: "cargoElabora", label: "Cargo" },
        ],
      },
      {
        title: "Cuerpo del Informe",
        fields: [
          { key: "introduccion", label: "1. Introducción", type: "textarea", span: 3, fullWidth: true },
          { key: "objetivo", label: "2. Objetivo", type: "textarea", span: 3, fullWidth: true },
          { key: "alcance", label: "3. Alcance", type: "textarea", span: 3, fullWidth: true },
          { key: "desarrollo", label: "4. Desarrollo", type: "textarea", span: 3, fullWidth: true },
          { key: "hallazgos", label: "5. Hallazgos", type: "textarea", span: 3, fullWidth: true },
          { key: "conclusiones", label: "6. Conclusiones", type: "textarea", span: 3, fullWidth: true },
          { key: "recomendaciones", label: "7. Recomendaciones", type: "textarea", span: 3, fullWidth: true },
        ],
      },
      {
        title: "Aprobaciones",
        signatures: [
          { key: "elaboro", label: "Elaboró", role: "Funcionario" },
          { key: "reviso", label: "Revisó", role: "Coordinador" },
          { key: "aprobo", label: "Aprobó", role: "Gerencia" },
        ],
      },
    ],
  },

  "TH-MD-04": {
    formatId: "TH-MD-04",
    formatName: "Modelo de Contrato",
    sections: [
      {
        title: "Datos del Contrato",
        fields: [
          { key: "numero", label: "Número de contrato" },
          { key: "fecha", label: "Fecha de suscripción", type: "date" },
          { key: "lugar", label: "Lugar de suscripción" },
          { key: "empresa", label: "Empleador", span: 2 },
          { key: "nit", label: "NIT" },
          { key: "empleado", label: "Nombre del empleado", span: 2 },
          { key: "documento", label: "Cédula" },
          { key: "cargo", label: "Cargo a desempeñar", span: 2 },
          { key: "tipoContrato", label: "Tipo de contrato", type: "select", options: ["Término fijo", "Término indefinido", "Obra o labor", "Prestación de servicios"] },
          { key: "duracion", label: "Duración" },
          { key: "salario", label: "Salario mensual" },
          { key: "jornada", label: "Jornada de trabajo" },
          { key: "lugarTrabajo", label: "Lugar de trabajo" },
        ],
      },
      {
        title: "Cláusulas",
        fields: [
          { key: "clausula1", label: "Cláusula primera — Objeto", type: "textarea", span: 3, fullWidth: true },
          { key: "clausula2", label: "Cláusula segunda — Obligaciones", type: "textarea", span: 3, fullWidth: true },
          { key: "clausula3", label: "Cláusula tercera — Remuneración", type: "textarea", span: 3, fullWidth: true },
          { key: "clausula4", label: "Cláusula cuarta — Vigencia", type: "textarea", span: 3, fullWidth: true },
        ],
      },
      {
        title: "Firmas",
        signatures: [
          { key: "empleador", label: "El empleador", role: "Representante legal" },
          { key: "empleado", label: "El empleado", role: "Empleado" },
        ],
      },
    ],
  },

  "TH-MD-05": {
    formatId: "TH-MD-05",
    formatName: "Inventario de Capacitación",
    sections: [
      {
        title: "Información General",
        fields: [
          { key: "empresa", label: "Empresa", span: 2 },
          { key: "periodo", label: "Periodo" },
        ],
      },
      {
        title: "Inventario de Capacitaciones Recibidas",
        table: {
          key: "capacitaciones",
          columns: ["Empleado", "Cargo", "Tema", "Fecha", "Duración (h)", "Institución", "Certificado"],
          initialRows: 5,
        },
      },
      {
        title: "Resumen",
        fields: [
          { key: "totalHoras", label: "Total horas-hombre capacitadas" },
          { key: "totalCapacitaciones", label: "Total capacitaciones" },
          { key: "observaciones", label: "Observaciones", type: "textarea", span: 3, fullWidth: true },
        ],
        signatures: [{ key: "responsable", label: "Responsable", role: "Gestión Humana" }],
      },
    ],
  },

  "TH-MD-06": {
    formatId: "TH-MD-06",
    formatName: "Informe de Necesidades de Bienestar",
    sections: [
      {
        title: "Datos Generales",
        fields: [
          { key: "empresa", label: "Empresa", span: 2 },
          { key: "periodo", label: "Periodo" },
          { key: "fecha", label: "Fecha", type: "date" },
        ],
      },
      {
        title: "Metodología",
        fields: [
          { key: "metodologia", label: "Metodología aplicada", type: "textarea", span: 3, fullWidth: true, placeholder: "Encuesta, entrevista, focus group..." },
          { key: "poblacion", label: "Población encuestada" },
        ],
      },
      {
        title: "Necesidades Identificadas",
        table: {
          key: "necesidades",
          columns: ["Necesidad", "Población interesada", "Frecuencia esperada", "Viabilidad"],
          initialRows: 4,
        },
      },
      {
        title: "Conclusiones y Recomendaciones",
        fields: [
          { key: "conclusiones", label: "Conclusiones", type: "textarea", span: 3, fullWidth: true },
          { key: "recomendaciones", label: "Recomendaciones", type: "textarea", span: 3, fullWidth: true },
        ],
        signatures: [{ key: "responsable", label: "Responsable", role: "Gestión Humana" }],
      },
    ],
  },

  "TH-MD-07": {
    formatId: "TH-MD-07",
    formatName: "Modelo de Cartas",
    sections: [
      {
        title: "Datos de la Carta",
        fields: [
          { key: "tipo", label: "Tipo de carta", type: "select", options: ["Laboral", "Recomendación", "Solicitud", "Renuncia", "Otra"] },
          { key: "fecha", label: "Fecha", type: "date" },
          { key: "destinatario", label: "Destinatario", span: 2 },
          { key: "cargo", label: "Cargo destinatario" },
          { key: "empresa", label: "Empresa destinataria" },
          { key: "ciudad", label: "Ciudad" },
        ],
      },
      {
        title: "Cuerpo de la Carta",
        fields: [
          { key: "saludo", label: "Saludo", placeholder: "Apreciado(a) Sr(a). ..." },
          { key: "cuerpo", label: "Cuerpo", type: "textarea", span: 3, fullWidth: true },
          { key: "despedida", label: "Despedida", placeholder: "Cordialmente," },
        ],
      },
      {
        title: "Firma",
        fields: [
          { key: "firmaNombre", label: "Nombre firmante" },
          { key: "firmaCargo", label: "Cargo" },
        ],
      },
    ],
  },

  "TH-MD-08": {
    formatId: "TH-MD-08",
    formatName: "Modelo de Memorandos",
    sections: [
      {
        title: "Datos del Memorando",
        fields: [
          { key: "numero", label: "Número / Código" },
          { key: "fecha", label: "Fecha", type: "date" },
          { key: "para", label: "Para", span: 2 },
          { key: "cargoPara", label: "Cargo" },
          { key: "de", label: "De", span: 2 },
          { key: "cargoDe", label: "Cargo" },
          { key: "asunto", label: "Asunto", span: 3, fullWidth: true },
        ],
      },
      {
        title: "Cuerpo del Memorando",
        fields: [
          { key: "cuerpo", label: "Cuerpo", type: "textarea", span: 3, fullWidth: true },
        ],
      },
      {
        title: "Firma",
        fields: [
          { key: "firmaNombre", label: "Nombre firmante" },
          { key: "firmaCargo", label: "Cargo" },
        ],
      },
    ],
  },

  "TH-MD-09": {
    formatId: "TH-MD-09",
    formatName: "Modelo de Plan",
    sections: [
      {
        title: "Información del Plan",
        fields: [
          { key: "titulo", label: "Título del plan", span: 3, fullWidth: true },
          { key: "empresa", label: "Empresa", span: 2 },
          { key: "fecha", label: "Fecha de elaboración", type: "date" },
          { key: "elaborado", label: "Elaborado por", span: 2 },
          { key: "aprobado", label: "Aprobado por" },
        ],
      },
      {
        title: "Objetivos",
        fields: [
          { key: "objetivoGeneral", label: "Objetivo general", type: "textarea", span: 3, fullWidth: true },
          { key: "objetivosEspecificos", label: "Objetivos específicos", type: "textarea", span: 3, fullWidth: true },
        ],
      },
      {
        title: "Actividades",
        table: {
          key: "actividades",
          columns: ["#", "Actividad", "Responsable", "Fecha", "Indicador", "Presupuesto"],
          initialRows: 5,
        },
      },
      {
        title: "Aprobaciones",
        signatures: [
          { key: "elaboro", label: "Elaboró", role: "Responsable" },
          { key: "aprobo", label: "Aprobó", role: "Gerencia" },
        ],
      },
    ],
  },

  "TH-MD-10": {
    formatId: "TH-MD-10",
    formatName: "Modelo de Programa",
    sections: [
      {
        title: "Información del Programa",
        fields: [
          { key: "titulo", label: "Título del programa", span: 3, fullWidth: true },
          { key: "empresa", label: "Empresa", span: 2 },
          { key: "fecha", label: "Fecha de inicio", type: "date" },
          { key: "duracion", label: "Duración total" },
          { key: "poblacion", label: "Población objetivo" },
        ],
      },
      {
        title: "Justificación y Objetivos",
        fields: [
          { key: "justificacion", label: "Justificación", type: "textarea", span: 3, fullWidth: true },
          { key: "objetivos", label: "Objetivos", type: "textarea", span: 3, fullWidth: true },
        ],
      },
      {
        title: "Cronograma del Programa",
        table: {
          key: "cronograma",
          columns: ["Sesión", "Tema", "Fecha", "Responsable", "Modalidad"],
          initialRows: 4,
        },
      },
      {
        title: "Aprobaciones",
        signatures: [
          { key: "elaboro", label: "Elaboró", role: "Responsable" },
          { key: "aprobo", label: "Aprobó", role: "Gerencia" },
        ],
      },
    ],
  },
};

/**
 * Cronograma de actividades de Talento Humano — 61 actividades en 8 procesos.
 * Used by TH-TB-01 (Tablero) and TH-22 (Cronograma).
 */

export interface CronogramaActivity {
  id: string;
  /** Process index (0-7) */
  process: number;
  /** Activity number within the cronograma (1-61) */
  number: number;
  name: string;
  format?: string;
  /** Default planned date in YYYY-MM-DD format */
  defaultPlanned?: string;
  defaultResponsible?: string;
}

export interface CronogramaProcess {
  name: string;
  count: number;
  color: string;
}

export const CRONOGRAMA_PROCESSES: CronogramaProcess[] = [
  { name: "RECLUTAMIENTO", count: 8, color: "#6B1F2E" },
  { name: "SELECCIÓN", count: 9, color: "#8B2E3C" },
  { name: "VINCULACIÓN", count: 8, color: "#B8941F" },
  { name: "INDUCCIÓN", count: 6, color: "#5C4A1E" },
  { name: "EVALUACIÓN DE DESEMPEÑO", count: 8, color: "#4F8C28" },
  { name: "CAPACITACIÓN", count: 7, color: "#2C3E50" },
  { name: "DESARROLLO", count: 5, color: "#34495E" },
  { name: "BIENESTAR", count: 10, color: "#FF9800" },
];

export const CRONOGRAMA_ACTIVITIES: CronogramaActivity[] = [
  // ====== 1. RECLUTAMIENTO (8) ======
  { id: "act-01", process: 0, number: 1, name: "Análisis de necesidad de personal", defaultPlanned: "2025-01-06", defaultResponsible: "Jefe de TH" },
  { id: "act-02", process: 0, number: 2, name: "Elaboración de requisición de personal", format: "TH-01", defaultPlanned: "2025-01-08", defaultResponsible: "Solicitante del cargo" },
  { id: "act-03", process: 0, number: 3, name: "Definición de perfil de cargo", format: "TH-02", defaultPlanned: "2025-01-10", defaultResponsible: "Gestión Humana" },
  { id: "act-04", process: 0, number: 4, name: "Publicación de convocatoria", format: "TH-MD-01", defaultPlanned: "2025-01-13", defaultResponsible: "Gestión Humana" },
  { id: "act-05", process: 0, number: 5, name: "Recepción de hojas de vida", format: "TH-03", defaultPlanned: "2025-01-20", defaultResponsible: "Gestión Humana" },
  { id: "act-06", process: 0, number: 6, name: "Filtro inicial de hojas de vida", defaultPlanned: "2025-01-22", defaultResponsible: "Gestión Humana" },
  { id: "act-07", process: 0, number: 7, name: "Actualización del tracker / base de datos", format: "TH-06", defaultPlanned: "2025-01-24", defaultResponsible: "Gestión Humana" },
  { id: "act-08", process: 0, number: 8, name: "Programación de entrevistas", format: "TH-07", defaultPlanned: "2025-01-27", defaultResponsible: "Gestión Humana" },

  // ====== 2. SELECCIÓN (9) ======
  { id: "act-09", process: 1, number: 9, name: "Aplicación de pruebas técnicas", defaultPlanned: "2025-02-03", defaultResponsible: "Jefe del área" },
  { id: "act-10", process: 1, number: 10, name: "Entrevista estructurada", format: "TH-07", defaultPlanned: "2025-02-05", defaultResponsible: "Equipo selector" },
  { id: "act-11", process: 1, number: 11, name: "Matriz comparativa de candidatos", format: "TH-04", defaultPlanned: "2025-02-07", defaultResponsible: "Gestión Humana" },
  { id: "act-12", process: 1, number: 12, name: "Verificación de referencias", format: "TH-05", defaultPlanned: "2025-02-10", defaultResponsible: "Gestión Humana" },
  { id: "act-13", process: 1, number: 13, name: "Visita domiciliaria (cuando aplique)", defaultPlanned: "2025-02-12", defaultResponsible: "Seguridad" },
  { id: "act-14", process: 1, number: 14, name: "Exámenes médicos ocupacionales", format: "TH-08", defaultPlanned: "2025-02-14", defaultResponsible: "Salud Ocupacional" },
  { id: "act-15", process: 1, number: 15, name: "Selección de candidato final", defaultPlanned: "2025-02-17", defaultResponsible: "Comité de selección" },
  { id: "act-16", process: 1, number: 16, name: "Informe de resultados de selección", format: "TH-MD-03", defaultPlanned: "2025-02-18", defaultResponsible: "Gestión Humana" },
  { id: "act-17", process: 1, number: 17, name: "Notificación al candidato seleccionado", format: "TH-MD-02", defaultPlanned: "2025-02-19", defaultResponsible: "Gestión Humana" },

  // ====== 3. VINCULACIÓN (8) ======
  { id: "act-18", process: 2, number: 18, name: "Chequeo de documentos legales", format: "TH-09", defaultPlanned: "2025-02-24", defaultResponsible: "Gestión Humana" },
  { id: "act-19", process: 2, number: 19, name: "Firma de contrato de trabajo", format: "TH-MD-04", defaultPlanned: "2025-02-26", defaultResponsible: "Gestión Humana" },
  { id: "act-20", process: 2, number: 20, name: "Afiliación a EPS y AFP", defaultPlanned: "2025-02-27", defaultResponsible: "Gestión Humana" },
  { id: "act-21", process: 2, number: 21, name: "Afiliación a caja de compensación", defaultPlanned: "2025-02-28", defaultResponsible: "Gestión Humana" },
  { id: "act-22", process: 2, number: 22, name: "Inscripción en libro de empleados", defaultPlanned: "2025-03-03", defaultResponsible: "Gestión Humana" },
  { id: "act-23", process: 2, number: 23, name: "Entrega de EPP y dotación", format: "TH-10", defaultPlanned: "2025-03-04", defaultResponsible: "Seguridad y Salud" },
  { id: "act-24", process: 2, number: 24, name: "Apertura de carpeta del empleado", defaultPlanned: "2025-03-05", defaultResponsible: "Gestión Humana" },
  { id: "act-25", process: 2, number: 25, name: "Registro en nómina y contabilidad", defaultPlanned: "2025-03-06", defaultResponsible: "Contabilidad" },

  // ====== 4. INDUCCIÓN (6) ======
  { id: "act-26", process: 3, number: 26, name: "Programación de inducción general", format: "TH-11", defaultPlanned: "2025-03-10", defaultResponsible: "Gestión Humana" },
  { id: "act-27", process: 3, number: 27, name: "Sesión: misión, visión y valores", defaultPlanned: "2025-03-11", defaultResponsible: "Gerencia" },
  { id: "act-28", process: 3, number: 28, name: "Sesión: reglamento interno", defaultPlanned: "2025-03-12", defaultResponsible: "Gestión Humana" },
  { id: "act-29", process: 3, number: 29, name: "Sesión: seguridad y salud en el trabajo (SST)", defaultPlanned: "2025-03-13", defaultResponsible: "SST" },
  { id: "act-30", process: 3, number: 30, name: "Entrega del puesto de trabajo", defaultPlanned: "2025-03-14", defaultResponsible: "Jefe inmediato" },
  { id: "act-31", process: 3, number: 31, name: "Evaluación de satisfacción de inducción", format: "TH-13", defaultPlanned: "2025-03-21", defaultResponsible: "Gestión Humana" },

  // ====== 5. EVALUACIÓN DE DESEMPEÑO (8) ======
  { id: "act-32", process: 4, number: 32, name: "Diseño del modelo de evaluación", defaultPlanned: "2025-04-01", defaultResponsible: "Gestión Humana" },
  { id: "act-33", process: 4, number: 33, name: "Sensibilización al personal", defaultPlanned: "2025-04-07", defaultResponsible: "Gestión Humana" },
  { id: "act-34", process: 4, number: 34, name: "Aplicación de evaluación de desempeño", format: "TH-14", defaultPlanned: "2025-04-14", defaultResponsible: "Jefes de área" },
  { id: "act-35", process: 4, number: 35, name: "Calibración de resultados", defaultPlanned: "2025-04-21", defaultResponsible: "Comité de calibración" },
  { id: "act-36", process: 4, number: 36, name: "Entrevista de retroalimentación", defaultPlanned: "2025-04-28", defaultResponsible: "Jefe inmediato" },
  { id: "act-37", process: 4, number: 37, name: "Plan de mejoramiento individual", format: "TH-15", defaultPlanned: "2025-05-05", defaultResponsible: "Gestión Humana" },
  { id: "act-38", process: 4, number: 38, name: "Seguimiento al plan de mejoramiento", defaultPlanned: "2025-06-02", defaultResponsible: "Jefe inmediato" },
  { id: "act-39", process: 4, number: 39, name: "Informe de resultados de desempeño", format: "TH-MD-03", defaultPlanned: "2025-06-09", defaultResponsible: "Gestión Humana" },

  // ====== 6. CAPACITACIÓN (7) ======
  { id: "act-40", process: 5, number: 40, name: "Análisis de necesidades de capacitación", defaultPlanned: "2025-05-01", defaultResponsible: "Gestión Humana" },
  { id: "act-41", process: 5, number: 41, name: "Matriz de brechas de competencias", format: "TH-19", defaultPlanned: "2025-05-08", defaultResponsible: "Gestión Humana" },
  { id: "act-42", process: 5, number: 42, name: "Diseño del Plan Anual de Capacitación (PAC)", format: "TH-16", defaultPlanned: "2025-05-15", defaultResponsible: "Gestión Humana" },
  { id: "act-43", process: 5, number: 43, name: "Programación de cursos", defaultPlanned: "2025-05-22", defaultResponsible: "Gestión Humana" },
  { id: "act-44", process: 5, number: 44, name: "Ejecución de capacitaciones", defaultPlanned: "2025-06-02", defaultResponsible: "Instructores" },
  { id: "act-45", process: 5, number: 45, name: "Evaluación de satisfacción de capacitación", format: "TH-17", defaultPlanned: "2025-06-09", defaultResponsible: "Gestión Humana" },
  { id: "act-46", process: 5, number: 46, name: "Inventario de capacitación", format: "TH-MD-05", defaultPlanned: "2025-06-16", defaultResponsible: "Gestión Humana" },

  // ====== 7. DESARROLLO (5) ======
  { id: "act-47", process: 6, number: 47, name: "Identificación de potencial", defaultPlanned: "2025-07-01", defaultResponsible: "Gestión Humana" },
  { id: "act-48", process: 6, number: 48, name: "Plan Individual de Desarrollo (PID)", format: "TH-20", defaultPlanned: "2025-07-08", defaultResponsible: "Jefe inmediato" },
  { id: "act-49", process: 6, number: 49, name: "Programas de carrera y sucesión", defaultPlanned: "2025-07-15", defaultResponsible: "Gerencia" },
  { id: "act-50", process: 6, number: 50, name: "Mentoring y coaching", defaultPlanned: "2025-07-22", defaultResponsible: "Mentores designados" },
  { id: "act-51", process: 6, number: 51, name: "Evaluación de impacto en el desarrollo", defaultPlanned: "2025-08-15", defaultResponsible: "Gestión Humana" },

  // ====== 8. BIENESTAR (10) ======
  { id: "act-52", process: 7, number: 52, name: "Diagnóstico de necesidades de bienestar", format: "TH-MD-06", defaultPlanned: "2025-03-01", defaultResponsible: "Gestión Humana" },
  { id: "act-53", process: 7, number: 53, name: "Diseño del plan de bienestar", format: "TH-21", defaultPlanned: "2025-03-15", defaultResponsible: "Gestión Humana" },
  { id: "act-54", process: 7, number: 54, name: "Programación de actividades de bienestar", format: "TH-22", defaultPlanned: "2025-03-22", defaultResponsible: "Comité de bienestar" },
  { id: "act-55", process: 7, number: 55, name: "Actividades recreativas y culturales", defaultPlanned: "2025-05-10", defaultResponsible: "Comité de bienestar" },
  { id: "act-56", process: 7, number: 56, name: "Programas de reconocimiento", defaultPlanned: "2025-06-15", defaultResponsible: "Gerencia" },
  { id: "act-57", process: 7, number: 57, name: "Actividades deportivas", defaultPlanned: "2025-07-19", defaultResponsible: "Comité de bienestar" },
  { id: "act-58", process: 7, number: 58, name: "Celebraciones especiales (día del trabajador, etc.)", defaultPlanned: "2025-08-15", defaultResponsible: "Comité de bienestar" },
  { id: "act-59", process: 7, number: 59, name: "Encuesta de clima laboral", defaultPlanned: "2025-09-01", defaultResponsible: "Gestión Humana" },
  { id: "act-60", process: 7, number: 60, name: "Atención al colaborador", defaultPlanned: "2025-10-01", defaultResponsible: "Gestión Humana" },
  { id: "act-61", process: 7, number: 61, name: "Informe de gestión de bienestar", format: "TH-MD-03", defaultPlanned: "2025-11-15", defaultResponsible: "Gestión Humana" },
];

export interface CronogramaRow {
  id: string;
  process: number;
  number: number;
  name: string;
  format?: string;
  done: boolean;
  plannedDate: string;
  executedDate: string;
  responsible: string;
  observations: string;
}

/** Builds the initial list of 61 rows using the data above. */
export function buildInitialCronograma(): CronogramaRow[] {
  return CRONOGRAMA_ACTIVITIES.map((a) => ({
    id: a.id,
    process: a.process,
    number: a.number,
    name: a.name,
    format: a.format,
    done: false,
    plannedDate: a.defaultPlanned ?? "",
    executedDate: "",
    responsible: a.defaultResponsible ?? "",
    observations: "",
  }));
}

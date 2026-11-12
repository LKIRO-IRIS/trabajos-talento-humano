/**
 * Catálogo de los 32 formatos TH disponibles en el sistema de Gestión.
 */

export type FormatId =
  | "TH-TB-01"
  | "TH-01" | "TH-02" | "TH-03" | "TH-04" | "TH-05" | "TH-06" | "TH-07"
  | "TH-08" | "TH-09" | "TH-10" | "TH-11" | "TH-12" | "TH-13"
  | "TH-14" | "TH-15" | "TH-16" | "TH-17" | "TH-19" | "TH-20"
  | "TH-18" | "TH-21" | "TH-22"
  | "TH-CONTRATO" | "TH-AFILIACIONES" | "TH-RENUNCIA"
  | "TH-MD-01" | "TH-MD-02" | "TH-MD-03" | "TH-MD-04" | "TH-MD-05"
  | "TH-MD-06" | "TH-MD-07" | "TH-MD-08" | "TH-MD-09" | "TH-MD-10";

export interface FormatCatalogEntry {
  id: FormatId;
  name: string;
  /** Categoria del sidebar (Tablero, Atracción, Contratación, ...) */
  category: "tablero" | "atraccion" | "contratacion" | "desempeno" | "estrategia" | "modelos" | "retiro";
  /** Indica si el formato tiene un formulario interactivo completo (true) o es "próximamente" (false) */
  implemented: boolean;
  version: string;
  date: string;
}

export const FORMAT_CATALOG: FormatCatalogEntry[] = [
  // Tablero de Gestión
  { id: "TH-TB-01", name: "Avance por proceso", category: "tablero", implemented: true, version: "02", date: "26/10/2025" },

  // Atracción & Selección
  { id: "TH-01", name: "Requisición de Personal", category: "atraccion", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-02", name: "Perfil de Cargos", category: "atraccion", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-03", name: "Hoja de Vida", category: "atraccion", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-04", name: "Matriz Comparativa", category: "atraccion", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-05", name: "Verificación de Referencias", category: "atraccion", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-06", name: "Base de Datos / Tracker", category: "atraccion", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-07", name: "Entrevista Estructurada", category: "atraccion", implemented: true, version: "02", date: "26/10/2025" },

  // Contratación & Onboarding
  { id: "TH-08", name: "Exámenes Médicos", category: "contratacion", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-09", name: "Chequeo Documentos", category: "contratacion", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-10", name: "Entrega EPP y Dotación", category: "contratacion", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-11", name: "Chequeo Inducción", category: "contratacion", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-12", name: "Control de Asistencia", category: "contratacion", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-13", name: "Satisfacción Inducción", category: "contratacion", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-CONTRATO", name: "Contrato Laboral (Auto-generado)", category: "contratacion", implemented: true, version: "01", date: "05/11/2026" },
  { id: "TH-AFILIACIONES", name: "Afiliaciones Seguridad Social (Auto-generado)", category: "contratacion", implemented: true, version: "01", date: "05/11/2026" },

  // Desempeño & Desarrollo
  { id: "TH-14", name: "Evaluación Desempeño", category: "desempeno", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-15", name: "Plan de Mejoramiento", category: "desempeno", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-16", name: "Plan Capacitación (PAC)", category: "desempeno", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-17", name: "Satisfacción Capacitación", category: "desempeno", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-19", name: "Matriz de Brechas", category: "desempeno", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-20", name: "Plan Desarrollo (PID)", category: "desempeno", implemented: true, version: "02", date: "26/10/2025" },

  // Estrategia & Bienestar
  { id: "TH-18", name: "Presupuesto Anual TH", category: "estrategia", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-21", name: "Plan de Bienestar", category: "estrategia", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-22", name: "Cronograma de Actividades", category: "estrategia", implemented: true, version: "02", date: "26/10/2025" },

  // Modelos de Documentos
  { id: "TH-MD-01", name: "Modelo Convocatoria", category: "modelos", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-MD-02", name: "Correos de Citación", category: "modelos", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-MD-03", name: "Modelo Informe", category: "modelos", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-MD-04", name: "Modelo Contrato", category: "modelos", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-MD-05", name: "Inventario Capacitación", category: "modelos", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-MD-06", name: "Informe Necesidades Bienestar", category: "modelos", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-MD-07", name: "Modelo Cartas", category: "modelos", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-MD-08", name: "Modelo Memorandos", category: "modelos", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-MD-09", name: "Modelo Plan", category: "modelos", implemented: true, version: "02", date: "26/10/2025" },
  { id: "TH-MD-10", name: "Modelo Programa", category: "modelos", implemented: true, version: "02", date: "26/10/2025" },

  // Desvinculación & Retiro
  { id: "TH-RENUNCIA", name: "Carta de Renuncia Voluntaria (Auto-generada)", category: "retiro", implemented: true, version: "01", date: "12/11/2026" },
];

export const FORMAT_CATEGORIES: { id: FormatCatalogEntry["category"]; label: string; icon: string }[] = [
  { id: "tablero", label: "Tablero de Gestión", icon: "LayoutDashboard" },
  { id: "atraccion", label: "Atracción & Selección", icon: "Users" },
  { id: "contratacion", label: "Contratación & Onboarding", icon: "UserCheck" },
  { id: "desempeno", label: "Desempeño & Desarrollo", icon: "TrendingUp" },
  { id: "estrategia", label: "Estrategia & Bienestar", icon: "HeartHandshake" },
  { id: "retiro", label: "Desvinculación & Retiro", icon: "DoorOpen" },
  { id: "modelos", label: "Modelos de Documentos", icon: "FileText" },
];

/** LocalStorage prefix for each format. Each format saves its data independently. */
export const FORMAT_LS_PREFIX = "sigth-gestion-format-";

/** LocalStorage key for the cronograma state (used by TH-22 and TH-TB-01). */
export const CRONOGRAMA_LS_KEY = "sigth-gestion-cronograma";

/** LocalStorage key for the uploaded company logo (shared across formats). */
export const LOGO_LS_KEY = "sigth-gestion-logo";

/** LocalStorage key for the company display name (shared). */
export const COMPANY_NAME_LS_KEY = "sigth-gestion-company-name";

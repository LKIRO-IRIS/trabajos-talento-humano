// Tipos TypeScript principales del aplicativo de Evaluación de Desempeño Laboral

/** Áreas organizacionales (8). */
export const AREAS_ORGANIZACIONALES = [
  "Directiva",
  "Administrativa",
  "Talento Humano",
  "Finanzas",
  "Operaciones",
  "Producción",
  "Jurídica",
  "Ventas",
] as const;

export type AreaOrganizacional = (typeof AREAS_ORGANIZACIONALES)[number];

/** Tipos de competencia para análisis. */
export type TipoCompetencia = "tecnica" | "blanda" | "organizacional";

export const TIPOS_COMPETENCIA: Record<
  TipoCompetencia,
  { label: string; descripcion: string; color: string }
> = {
  tecnica: {
    label: "Competencias Técnicas",
    descripcion:
      "Conocimiento técnico, cumplimiento de objetivos y dominio del puesto.",
    color: "#0D9488",
  },
  blanda: {
    label: "Competencias Blandas",
    descripcion:
      "Comunicación, trabajo en equipo, liderazgo y adaptabilidad.",
    color: "#9333EA",
  },
  organizacional: {
    label: "Competencias Organizacionales",
    descripcion:
      "Asistencia, puntualidad y compromiso con las políticas internas.",
    color: "#F59E0B",
  },
};

export type Rol = "admin" | "evaluador";

export interface User {
  id: string;
  username: string;
  password: string; // En producción sería hash
  role: Rol;
  nombre: string;
  creadoEn: string;
}

export interface Criterio {
  id: string;
  nombre: string;
  descripcion: string;
  peso: number; // 0-100
}

export interface Empleado {
  id: string;
  nombre: string;
  departamento: string;
  cargo: string;
}

export type Calificacion =
  | "Sobresaliente"
  | "Satisfactorio"
  | "Necesita Mejora"
  | "Insatisfactorio";

export interface PuntajeCriterio {
  criterioId: string;
  puntaje: number; // 1-100
}

export interface Evaluacion {
  id: string;
  empleadoId: string;
  evaluadorId: string;
  evaluadorNombre: string;
  periodo: string; // ej: "2026-Q4"
  fecha: string; // ISO
  criterios: PuntajeCriterio[];
  puntuacionFinal: number;
  calificacion: Calificacion;
  comentarios: string;
  planMejora?: PlanMejora;
}

export type EstadoPlan = "Pendiente" | "En curso" | "Completado";

export interface PlanMejora {
  generado: boolean;
  criterioMasBajo: string;
  acciones: string[];
  fechaSeguimiento: string; // ISO +30 días
  responsable: string;
  estado: EstadoPlan;
  /**
   * Notas adicionales del estudiante al editar el plan.
   * Campo opcional porque las evaluaciones creadas antes de esta
   * mejora no lo tenían.
   */
  observacionesEstudiante?: string;
}

/**
 * Plan de mejora editable por el estudiante. Es la vista "editada"
 * del PlanMejora. Se persiste en localStorage separado para no
 * sobreescribir el original generado automáticamente.
 */
export interface PlanMejoraEditable {
  generado: boolean;
  criterioMasBajo: string;
  acciones: string[];
  fechaSeguimiento: string;
  responsable: string;
  estado: string;
  observacionesEstudiante: string;
}

/** Conclusión escrita por el estudiante. */
export interface Conclusion {
  areaId: string; // "analisis" | "competencias" | "plan" | "finales"
  texto: string;
  ultimaEdicion: string; // ISO date
}

export interface EmpresaConfig {
  nombre: string;
  logo: string; // URL o data URL
  primaryColor: string; // hex
  secondaryColor: string; // hex
  criterios: Criterio[];
}

export interface EmpleadoResumen {
  empleado: Empleado;
  evaluaciones: Evaluacion[];
  ultima: Evaluacion | null;
  promedio: number;
  mejor: boolean;
  peor: boolean;
}

export interface AppData {
  users: User[];
  empleados: Empleado[];
  evaluaciones: Evaluacion[];
  config: EmpresaConfig;
}

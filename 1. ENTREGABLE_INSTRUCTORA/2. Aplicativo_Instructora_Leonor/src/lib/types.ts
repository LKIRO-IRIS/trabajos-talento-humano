// Tipos TypeScript principales del aplicativo de Evaluación de Desempeño Laboral

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

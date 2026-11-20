import type {
  AppData,
  EmpresaConfig,
  Evaluacion,
  User,
  Empleado,
} from "./types";
import { construirEvaluacion } from "./evaluacion";
import { genId } from "./utils";

export const DEFAULT_CRITERIOS = [
  {
    id: "crit_objetivos",
    nombre: "Evaluación de Objetivos",
    descripcion:
      "Cumplimiento de metas y objetivos individuales del periodo.",
    peso: 50,
  },
  {
    id: "crit_competencias",
    nombre: "Competencias Blandas",
    descripcion:
      "Comunicación, trabajo en equipo, liderazgo y adaptabilidad.",
    peso: 30,
  },
  {
    id: "crit_asistencia",
    nombre: "Asistencia y Puntualidad",
    descripcion:
      "Cumplimiento de jornada, llegadas tarde e inasistencias.",
    peso: 20,
  },
];

export const DEFAULT_CONFIG: EmpresaConfig = {
  nombre: "Evaluación de Desempeño",
  logo: "",
  primaryColor: "#0D9488", // teal-600
  secondaryColor: "#F59E0B", // amber-500
  criterios: DEFAULT_CRITERIOS,
};

export const DEFAULT_ADMIN: User = {
  id: "user_admin",
  username: "admin",
  password: "admin123",
  role: "admin",
  nombre: "Administrador",
  creadoEn: new Date().toISOString(),
};

/** Crea los 3 empleados de ejemplo y sus evaluaciones precargadas. */
export function buildDefaultData(): AppData {
  const config: EmpresaConfig = {
    ...DEFAULT_CONFIG,
    criterios: DEFAULT_CRITERIOS.map((c) => ({ ...c })),
  };

  const empleados: Empleado[] = [
    {
      id: "emp_001",
      nombre: "Carlos Pérez",
      departamento: "Ventas",
      cargo: "Asesor Comercial",
    },
    {
      id: "emp_002",
      nombre: "María Gómez",
      departamento: "Finanzas",
      cargo: "Analista Financiera",
    },
    {
      id: "emp_003",
      nombre: "Juan Rodríguez",
      departamento: "Operaciones",
      cargo: "Coordinador de Logística",
    },
  ];

  // Carlos Pérez → 88.5 (Satisfactorio)
  // Objetivos 92 (×0.5=46) + Competencias 80 (×0.3=24) + Asistencia 92.5 (×0.2=18.5) = 88.5
  const evalCarlos = construirEvaluacion({
    empleadoId: "emp_001",
    evaluadorId: "user_admin",
    evaluadorNombre: "Administrador",
    periodo: "2026-Q4",
    criterios: [
      { criterioId: "crit_objetivos", puntaje: 92 },
      { criterioId: "crit_competencias", puntaje: 80 },
      { criterioId: "crit_asistencia", puntaje: 92.5 },
    ],
    configCriterios: config.criterios,
    comentarios:
      "Buen cumplimiento de metas comerciales. Oportunidad de mejora en trabajo en equipo interárea.",
    responsable: "Administrador",
  });
  evalCarlos.fecha = "2026-10-15T14:30:00.000Z";
  evalCarlos.id = "eval_001";

  // María Gómez → 90.5 (Sobresaliente)
  // Objetivos 95 (×0.5=47.5) + Competencias 88 (×0.3=26.4) + Asistencia 83 (×0.2=16.6) = 90.5
  const evalMaria = construirEvaluacion({
    empleadoId: "emp_002",
    evaluadorId: "user_admin",
    evaluadorNombre: "Administrador",
    periodo: "2026-Q4",
    criterios: [
      { criterioId: "crit_objetivos", puntaje: 95 },
      { criterioId: "crit_competencias", puntaje: 88 },
      { criterioId: "crit_asistencia", puntaje: 83 },
    ],
    configCriterios: config.criterios,
    comentarios:
      "Desempeño sobresaliente. Liderazgo destacado en proyectos de cierre financiero.",
    responsable: "Administrador",
  });
  evalMaria.fecha = "2026-10-15T15:00:00.000Z";
  evalMaria.id = "eval_002";

  // Juan Rodríguez → 69.5 (Necesita Mejora)
  // Objetivos 70 (×0.5=35) + Competencias 65 (×0.3=19.5) + Asistencia 75 (×0.2=15) = 69.5
  const evalJuan = construirEvaluacion({
    empleadoId: "emp_003",
    evaluadorId: "user_admin",
    evaluadorNombre: "Administrador",
    periodo: "2026-Q4",
    criterios: [
      { criterioId: "crit_objetivos", puntaje: 70 },
      { criterioId: "crit_competencias", puntaje: 65 },
      { criterioId: "crit_asistencia", puntaje: 75 },
    ],
    configCriterios: config.criterios,
    comentarios:
      "Requiere acompañamiento. Se detectan oportunidades en cumplimiento de objetivos y competencias interpersonales.",
    responsable: "Administrador",
  });
  evalJuan.fecha = "2026-10-15T15:30:00.000Z";
  evalJuan.id = "eval_003";

  const evaluaciones: Evaluacion[] = [evalCarlos, evalMaria, evalJuan];

  const users: User[] = [DEFAULT_ADMIN];

  return {
    users,
    empleados,
    evaluaciones,
    config,
  };
}

export { genId };

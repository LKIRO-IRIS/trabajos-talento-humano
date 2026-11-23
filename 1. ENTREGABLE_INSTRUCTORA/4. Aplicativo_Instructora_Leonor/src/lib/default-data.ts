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
      "Cumplimiento de metas y objetivos individuales del periodo. Representa las competencias técnicas del puesto.",
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
      "Cumplimiento de jornada, llegadas tarde e inasistencias. Competencias organizacionales.",
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

/**
 * Crea 8 empleados de ejemplo (uno por área organizacional) y sus
 * evaluaciones precargadas, cubriendo los 4 niveles de calificación.
 *
 * Pesos: Objetivos 50%, Blandas 30%, Asistencia 20%.
 */
export function buildDefaultData(): AppData {
  const config: EmpresaConfig = {
    ...DEFAULT_CONFIG,
    criterios: DEFAULT_CRITERIOS.map((c) => ({ ...c })),
  };

  const empleados: Empleado[] = [
    {
      id: "EMP-001",
      nombre: "María Fernanda López",
      departamento: "Directiva",
      cargo: "Gerente General",
    },
    {
      id: "EMP-002",
      nombre: "Carlos Pérez",
      departamento: "Administrativa",
      cargo: "Asistente Administrativo",
    },
    {
      id: "EMP-003",
      nombre: "Skleyris Cenobia",
      departamento: "Talento Humano",
      cargo: "Analista de TH",
    },
    {
      id: "EMP-004",
      nombre: "Daniel Torres",
      departamento: "Finanzas",
      cargo: "Asistente Contable",
    },
    {
      id: "EMP-005",
      nombre: "Juan Rodríguez",
      departamento: "Operaciones",
      cargo: "Auxiliar de Logística",
    },
    {
      id: "EMP-006",
      nombre: "Andrea Gómez",
      departamento: "Producción",
      cargo: "Supervisor de Producción",
    },
    {
      id: "EMP-007",
      nombre: "Felipe Ramírez",
      departamento: "Jurídica",
      cargo: "Asesor Jurídico",
    },
    {
      id: "EMP-008",
      nombre: "Laura Martínez",
      departamento: "Ventas",
      cargo: "Asesor Comercial",
    },
  ];

  type SeedEval = {
    empleadoId: string;
    objetivos: number;
    blandas: number;
    asistencia: number;
    fecha: string;
    comentarios: string;
    id: string;
  };

  // Los puntajes por criterio están calibrados para reflejar el promedio objetivo
  // (objetivos*0.5 + blandas*0.3 + asistencia*0.2 = promedio esperado).
  const seeds: SeedEval[] = [
    {
      empleadoId: "EMP-001",
      objetivos: 95,
      blandas: 90,
      asistencia: 88,
      fecha: "2026-10-15T09:00:00.000Z",
      comentarios:
        "Liderazgo sobresaliente. Cumple los objetivos estratégicos y promueve una cultura de trabajo en equipo sólida.",
      id: "eval_001",
    },
    {
      empleadoId: "EMP-002",
      objetivos: 88,
      blandas: 82,
      asistencia: 82,
      fecha: "2026-10-15T09:30:00.000Z",
      comentarios:
        "Desempeño satisfactorio. Cumple las tareas administrativas; puede mejorar la proactividad en la comunicación.",
      id: "eval_002",
    },
    {
      empleadoId: "EMP-003",
      objetivos: 92,
      blandas: 95,
      asistencia: 78,
      fecha: "2026-10-15T10:00:00.000Z",
      comentarios:
        "Excelentes competencias blandas. Gestiona con empatía los procesos de selección. Oportunidad de mejora en puntualidad.",
      id: "eval_003",
    },
    {
      empleadoId: "EMP-004",
      objetivos: 80,
      blandas: 75,
      asistencia: 78,
      fecha: "2026-10-15T10:30:00.000Z",
      comentarios:
        "Desempeño satisfactorio. Conocimiento contable adecuado; oportunidad de mejora en trabajo en equipo interárea.",
      id: "eval_004",
    },
    {
      empleadoId: "EMP-005",
      objetivos: 65,
      blandas: 70,
      asistencia: 75,
      fecha: "2026-10-15T11:00:00.000Z",
      comentarios:
        "Requiere acompañamiento. Se detectan oportunidades en cumplimiento de objetivos y habilidades interpersonales.",
      id: "eval_005",
    },
    {
      empleadoId: "EMP-006",
      objetivos: 85,
      blandas: 78,
      asistencia: 80,
      fecha: "2026-10-15T11:30:00.000Z",
      comentarios:
        "Buen manejo de la línea de producción. Satisfactorio en general; oportunidad de fortalecer liderazgo de equipo.",
      id: "eval_006",
    },
    {
      empleadoId: "EMP-007",
      objetivos: 60,
      blandas: 70,
      asistencia: 70,
      fecha: "2026-10-15T12:00:00.000Z",
      comentarios:
        "Necesita mejora en cumplimiento de objetivos del área jurídica. Asistencia aceptable pero debe mejorar la planificación.",
      id: "eval_007",
    },
    {
      empleadoId: "EMP-008",
      objetivos: 98,
      blandas: 92,
      asistencia: 92,
      fecha: "2026-10-15T12:30:00.000Z",
      comentarios:
        "Desempeño sobresaliente. Supera metas comerciales y mantiene excelente relaciones con clientes y compañeros.",
      id: "eval_008",
    },
  ];

  const evaluaciones: Evaluacion[] = seeds.map((s) => {
    const ev = construirEvaluacion({
      empleadoId: s.empleadoId,
      evaluadorId: "user_admin",
      evaluadorNombre: "Administrador",
      periodo: "2026-Q4",
      criterios: [
        { criterioId: "crit_objetivos", puntaje: s.objetivos },
        { criterioId: "crit_competencias", puntaje: s.blandas },
        { criterioId: "crit_asistencia", puntaje: s.asistencia },
      ],
      configCriterios: config.criterios,
      comentarios: s.comentarios,
      responsable: "Administrador",
    });
    ev.fecha = s.fecha;
    ev.id = s.id;
    return ev;
  });

  const users: User[] = [DEFAULT_ADMIN];

  return {
    users,
    empleados,
    evaluaciones,
    config,
  };
}

export { genId };

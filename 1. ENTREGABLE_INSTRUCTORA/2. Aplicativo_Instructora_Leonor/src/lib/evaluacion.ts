import type {
  Calificacion,
  Criterio,
  Evaluacion,
  PuntajeCriterio,
  PlanMejora,
  Empleado,
  TipoCompetencia,
} from "./types";
import { fechaMas30dias, genId } from "./utils";

/**
 * Calcula la puntuación final ponderada.
 * puntuacionFinal = Σ(puntaje_criterio × peso_criterio) / Σ(pesos)
 */
export function calcularPuntuacionFinal(
  criterios: PuntajeCriterio[],
  configCriterios: Criterio[]
): number {
  let total = 0;
  let pesoTotal = 0;
  for (const c of criterios) {
    const config = configCriterios.find((x) => x.id === c.criterioId);
    if (config) {
      total += c.puntaje * config.peso;
      pesoTotal += config.peso;
    }
  }
  return pesoTotal > 0 ? total / pesoTotal : 0;
}

/** Asigna la calificación cualitativa según la puntuación. */
export function getCalificacion(puntuacion: number): Calificacion {
  if (puntuacion >= 90) return "Sobresaliente";
  if (puntuacion >= 75) return "Satisfactorio";
  if (puntuacion >= 60) return "Necesita Mejora";
  return "Insatisfactorio";
}

/** Devuelve el criterio con el puntaje más bajo. */
export function getCriterioMasBajo(
  criterios: PuntajeCriterio[],
  configCriterios: Criterio[]
): { id: string; nombre: string; puntaje: number } | null {
  if (criterios.length === 0) return null;
  let min = criterios[0];
  for (const c of criterios) {
    if (c.puntaje < min.puntaje) min = c;
  }
  const cfg = configCriterios.find((x) => x.id === min.criterioId);
  return {
    id: min.criterioId,
    nombre: cfg?.nombre ?? "Criterio",
    puntaje: min.puntaje,
  };
}

/** Catálogo de acciones recomendadas por criterio. */
export function accionesRecomendadas(
  criterioNombre: string,
  puntaje: number
): string[] {
  const nombre = criterioNombre.toLowerCase();
  const base: string[] = [];

  if (nombre.includes("objetivo")) {
    base.push(
      "Revisar y redefinir los objetivos del periodo junto con el jefe inmediato."
    );
    base.push(
      "Establecer un plan de seguimiento quincenal con indicadores medibles (SMART)."
    );
    base.push(
      "Asignar un mentor o compañero senior para acompañamiento en el cumplimiento de metas."
    );
  } else if (nombre.includes("competencia") || nombre.includes("blanda")) {
    base.push(
      "Inscribir al empleado en taller de comunicación asertiva y trabajo en equipo."
    );
    base.push(
      "Programar sesiones de retroalimentación 1:1 cada 15 días con foco en habilidades interpersonales."
    );
    base.push(
      "Asignar proyectos colaborativos para fortalecer liderazgo y resolución de conflictos."
    );
  } else if (nombre.includes("asistencia") || nombre.includes("puntual")) {
    base.push(
      "Implementar control de asistencia biométrico y revisar causas de inasistencia."
    );
    base.push(
      "Entrevistar al empleado para identificar factores personales o logísticos que afectan la puntualidad."
    );
    base.push(
      "Definir compromisos por escrito con horarios claros y consecuencias definidas."
    );
  } else {
    base.push(
      `Realizar un plan de mejora enfocado en "${criterioNombre}" con metas a 30 días.`
    );
    base.push(
      "Asignar seguimiento quincenal por parte del jefe inmediato."
    );
    base.push(
      "Capacitación específica para cerrar brechas identificadas."
    );
  }

  if (puntaje < 60) {
    base.push(
      "Generar acta de compromiso firmada con consecuencias claras en caso de no mejora."
    );
  }

  return base;
}

/** Genera un plan de mejora automático cuando la calificación es baja. */
export function generarPlanMejora(
  evaluacion: Evaluacion,
  configCriterios: Criterio[],
  responsable: string
): PlanMejora | undefined {
  if (
    evaluacion.calificacion !== "Necesita Mejora" &&
    evaluacion.calificacion !== "Insatisfactorio"
  ) {
    return undefined;
  }

  const masBajo = getCriterioMasBajo(evaluacion.criterios, configCriterios);
  const acciones = masBajo
    ? accionesRecomendadas(masBajo.nombre, masBajo.puntaje)
    : accionesRecomendadas("desempeño general", evaluacion.puntuacionFinal);

  return {
    generado: true,
    criterioMasBajo: masBajo?.nombre ?? "Desempeño general",
    acciones,
    fechaSeguimiento: fechaMas30dias(evaluacion.fecha),
    responsable,
    estado: "Pendiente",
  };
}

/** Construye una evaluación completa a partir de datos básicos. */
export function construirEvaluacion(params: {
  empleadoId: string;
  evaluadorId: string;
  evaluadorNombre: string;
  periodo: string;
  criterios: PuntajeCriterio[];
  configCriterios: Criterio[];
  comentarios: string;
  responsable?: string;
}): Evaluacion {
  const puntuacionFinal = calcularPuntuacionFinal(
    params.criterios,
    params.configCriterios
  );
  const calificacion = getCalificacion(puntuacionFinal);
  const evalBase: Evaluacion = {
    id: genId("eval"),
    empleadoId: params.empleadoId,
    evaluadorId: params.evaluadorId,
    evaluadorNombre: params.evaluadorNombre,
    periodo: params.periodo,
    fecha: new Date().toISOString(),
    criterios: params.criterios,
    puntuacionFinal,
    calificacion,
    comentarios: params.comentarios,
  };
  evalBase.planMejora = generarPlanMejora(
    evalBase,
    params.configCriterios,
    params.responsable ?? params.evaluadorNombre
  );
  return evalBase;
}

/** Valida que los pesos de los criterios sumen 100. */
export function validarPesos(criterios: Criterio[]): {
  ok: boolean;
  total: number;
  mensaje: string;
} {
  const total = criterios.reduce((acc, c) => acc + (Number(c.peso) || 0), 0);
  const ok = Math.abs(total - 100) < 0.01;
  return {
    ok,
    total,
    mensaje: ok
      ? "Los pesos suman 100%."
      : `Los pesos suman ${total.toFixed(1)}%. Deben sumar 100%.`,
  };
}

/* ===================== ANÁLISIS DE COMPETENCIAS ===================== */

/**
 * Clasifica un criterio en uno de los 3 tipos de competencia:
 * - "tecnica": cumplimiento de objetivos, dominio técnico del puesto.
 * - "blanda": comunicación, liderazgo, trabajo en equipo.
 * - "organizacional": asistencia, puntualidad, compromiso con políticas.
 *
 * El mapeo se hace por ID (default) o por palabras clave en el nombre.
 */
export function getTipoCompetencia(criterio: Criterio): TipoCompetencia {
  const id = criterio.id.toLowerCase();
  const nombre = criterio.nombre.toLowerCase();

  // Blanda: contiene "blanda", "competencias blandas", "comunicación",
  // "liderazgo", "trabajo en equipo".
  if (
    id.includes("competencias") ||
    nombre.includes("blanda") ||
    nombre.includes("comunicación") ||
    nombre.includes("liderazgo") ||
    nombre.includes("trabajo en equipo")
  ) {
    return "blanda";
  }
  // Organizacional: asistencia, puntualidad, conducta, disciplina.
  if (
    id.includes("asistencia") ||
    nombre.includes("asistencia") ||
    nombre.includes("puntual") ||
    nombre.includes("conducta") ||
    nombre.includes("disciplina") ||
    nombre.includes("organizac")
  ) {
    return "organizacional";
  }
  // Por defecto → técnica (objetivos, metas, conocimiento técnico, etc.)
  return "tecnica";
}

/** Devuelve el puntaje promedio de un criterio en una evaluación. */
export function getPuntajeCriterio(
  evaluacion: Evaluacion,
  criterioId: string
): number {
  const p = evaluacion.criterios.find((c) => c.criterioId === criterioId);
  return p?.puntaje ?? 0;
}

/**
 * Para una evaluación, calcula el promedio de los criterios que pertenecen
 * a un tipo de competencia. Si no hay criterios de ese tipo, devuelve 0.
 */
export function getPromedioPorTipo(
  evaluacion: Evaluacion,
  configCriterios: Criterio[],
  tipo: TipoCompetencia
): number {
  const ids = configCriterios
    .filter((c) => getTipoCompetencia(c) === tipo)
    .map((c) => c.id);
  const puntajes = evaluacion.criterios
    .filter((c) => ids.includes(c.criterioId))
    .map((c) => c.puntaje);
  if (puntajes.length === 0) return 0;
  return puntajes.reduce((a, b) => a + b, 0) / puntajes.length;
}

/** Resultado del análisis por área y por tipo de competencia. */
export interface AnalisisPorArea {
  area: string;
  totalEmpleados: number;
  promedioPorTipo: Record<TipoCompetencia, number>;
  promedioGeneral: number;
  empleados: Array<{
    empleado: Empleado;
    evaluacion: Evaluacion | null;
    promedioPorTipo: Record<TipoCompetencia, number>;
    promedioGeneral: number;
  }>;
}

/** Resultado global del análisis. */
export interface AnalisisGlobal {
  porArea: AnalisisPorArea[];
  promedioPorTipoGlobal: Record<TipoCompetencia, number>;
  promedioGeneral: number;
  areaMejor: AnalisisPorArea | null;
  areaPeor: AnalisisPorArea | null;
  tipoMasFuerte: TipoCompetencia;
  tipoMasDebil: TipoCompetencia;
  totalEvaluados: number;
  distribucionBlandas: {
    sobresaliente: number;
    satisfactorio: number;
    necesitaMejora: number;
    insatisfactorio: number;
  };
}

/** Toma solo la última evaluación por empleado. */
export function ultimasEvaluaciones(
  evaluaciones: Evaluacion[]
): Evaluacion[] {
  const map = new Map<string, Evaluacion>();
  for (const ev of evaluaciones) {
    const prev = map.get(ev.empleadoId);
    if (!prev || new Date(ev.fecha) > new Date(prev.fecha)) {
      map.set(ev.empleadoId, ev);
    }
  }
  return Array.from(map.values());
}

/**
 * Genera el análisis completo por área y por tipo de competencia.
 * Recibe todas las evaluaciones visibles y los empleados, y devuelve
 * un objeto listo para pintar el Heat Map y el resumen automático.
 */
export function analizarDatos(
  empleados: Empleado[],
  evaluaciones: Evaluacion[],
  configCriterios: Criterio[],
  areas: readonly string[]
): AnalisisGlobal {
  const ultimas = ultimasEvaluaciones(evaluaciones);
  const empleadoToEval = new Map<string, Evaluacion>();
  for (const ev of ultimas) empleadoToEval.set(ev.empleadoId, ev);

  const tipos: TipoCompetencia[] = ["tecnica", "blanda", "organizacional"];

  const porArea: AnalisisPorArea[] = areas.map((area) => {
    const empsArea = empleados.filter((e) => e.departamento === area);
    const detalles = empsArea.map((empleado) => {
      const ev = empleadoToEval.get(empleado.id) ?? null;
      const promedioPorTipo = {
        tecnica: ev ? getPromedioPorTipo(ev, configCriterios, "tecnica") : 0,
        blanda: ev ? getPromedioPorTipo(ev, configCriterios, "blanda") : 0,
        organizacional: ev
          ? getPromedioPorTipo(ev, configCriterios, "organizacional")
          : 0,
      } as Record<TipoCompetencia, number>;
      const promedioGeneral = ev?.puntuacionFinal ?? 0;
      return {
        empleado,
        evaluacion: ev,
        promedioPorTipo,
        promedioGeneral,
      };
    });
    const evaluadosArea = detalles.filter((d) => d.evaluacion);
    const promedioPorTipo = {
      tecnica: avg(evaluadosArea.map((d) => d.promedioPorTipo.tecnica)),
      blanda: avg(evaluadosArea.map((d) => d.promedioPorTipo.blanda)),
      organizacional: avg(
        evaluadosArea.map((d) => d.promedioPorTipo.organizacional)
      ),
    } as Record<TipoCompetencia, number>;
    const promedioGeneral = avg(evaluadosArea.map((d) => d.promedioGeneral));
    return {
      area,
      totalEmpleados: empsArea.length,
      promedioPorTipo,
      promedioGeneral,
      empleados: detalles,
    };
  });

  // Promedios globales por tipo: promedio de las áreas evaluadas.
  const areasEvaluadas = porArea.filter((a) => a.totalEmpleados > 0);
  const promedioPorTipoGlobal = {
    tecnica: avg(areasEvaluadas.map((a) => a.promedioPorTipo.tecnica)),
    blanda: avg(areasEvaluadas.map((a) => a.promedioPorTipo.blanda)),
    organizacional: avg(
      areasEvaluadas.map((a) => a.promedioPorTipo.organizacional)
    ),
  } as Record<TipoCompetencia, number>;
  const promedioGeneral = avg(areasEvaluadas.map((a) => a.promedioGeneral));

  // Mejor y peor área (solo con empleados)
  const areasConDatos = areasEvaluadas.filter(
    (a) => a.promedioGeneral > 0 || a.totalEmpleados > 0
  );
  const sorted = [...areasConDatos].sort(
    (a, b) => b.promedioGeneral - a.promedioGeneral
  );
  const areaMejor = sorted[0] ?? null;
  const areaPeor = sorted[sorted.length - 1] ?? null;

  // Tipo más fuerte / débil
  let tipoMasFuerte: TipoCompetencia = "tecnica";
  let tipoMasDebil: TipoCompetencia = "tecnica";
  let max = -1;
  let min = 101;
  for (const t of tipos) {
    const v = promedioPorTipoGlobal[t];
    if (v > max) {
      max = v;
      tipoMasFuerte = t;
    }
    if (v < min) {
      min = v;
      tipoMasDebil = t;
    }
  }

  // Distribución de calificaciones de competencias blandas.
  // Para cada empleado evaluado, miramos su puntaje en "blanda" y lo clasificamos.
  const distribucionBlandas = {
    sobresaliente: 0,
    satisfactorio: 0,
    necesitaMejora: 0,
    insatisfactorio: 0,
  };
  for (const ev of ultimas) {
    const puntaje = getPromedioPorTipo(ev, configCriterios, "blanda");
    const cal = getCalificacion(puntaje);
    if (cal === "Sobresaliente") distribucionBlandas.sobresaliente++;
    else if (cal === "Satisfactorio") distribucionBlandas.satisfactorio++;
    else if (cal === "Necesita Mejora") distribucionBlandas.necesitaMejora++;
    else distribucionBlandas.insatisfactorio++;
  }

  return {
    porArea,
    promedioPorTipoGlobal,
    promedioGeneral,
    areaMejor,
    areaPeor,
    tipoMasFuerte,
    tipoMasDebil,
    totalEvaluados: ultimas.length,
    distribucionBlandas,
  };
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Color de fondo Tailwind para el heat map según el puntaje. */
export function heatColor(score: number): string {
  if (score >= 90) return "bg-emerald-500 text-white";
  if (score >= 75) return "bg-lime-400 text-emerald-950";
  if (score >= 60) return "bg-amber-400 text-amber-950";
  if (score > 0) return "bg-red-500 text-white";
  return "bg-muted text-muted-foreground";
}

/** Color hex para usar en celdas / charts. */
export function heatHex(score: number): string {
  if (score >= 90) return "#10B981"; // emerald-500
  if (score >= 75) return "#84CC16"; // lime-500
  if (score >= 60) return "#F59E0B"; // amber-500
  if (score > 0) return "#EF4444"; // red-500
  return "#94A3B8"; // slate-400
}

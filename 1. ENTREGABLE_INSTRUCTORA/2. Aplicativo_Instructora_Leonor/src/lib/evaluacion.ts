import type {
  Calificacion,
  Criterio,
  Evaluacion,
  PuntajeCriterio,
  PlanMejora,
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

import type { AppData, Conclusion, Empleado, EmpresaConfig, Evaluacion, PlanMejora, User } from "./types";
import { buildDefaultData } from "./default-data";

const STORAGE_KEY = "app-leonor:data:v1";
const CONCLUSIONES_KEY = "app-leonor:conclusiones:v1";

/* ===================== LOCK ANTI-RACE-CONDITION ===================== */
// Serializa las mutaciones de localStorage para que doble-click o
// múltiples tabs no pierdan datos (read-modify-write atómico).
let mutationQueue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => T): Promise<T> {
  const result = mutationQueue.then(fn);
  mutationQueue = result.then(() => undefined, () => undefined);
  return result;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/** Lee todos los datos del localStorage, o inicializa con datos por defecto. */
export function loadData(): AppData {
  if (!isBrowser()) return buildDefaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const def = buildDefaultData();
      saveData(def);
      return def;
    }
    const parsed = JSON.parse(raw) as AppData;
    // Saneamiento: validar que cada campo tenga la estructura correcta
    if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
      parsed.users = buildDefaultData().users;
    }
    if (!parsed.config || typeof parsed.config !== "object") {
      parsed.config = buildDefaultData().config;
    } else {
      // Validar campos mínimos de config
      const def = buildDefaultData().config;
      if (!Array.isArray(parsed.config.criterios) || parsed.config.criterios.length === 0) {
        parsed.config.criterios = def.criterios;
      }
      if (typeof parsed.config.nombre !== "string") parsed.config.nombre = def.nombre;
      if (typeof parsed.config.primaryColor !== "string") parsed.config.primaryColor = def.primaryColor;
      if (typeof parsed.config.secondaryColor !== "string") parsed.config.secondaryColor = def.secondaryColor;
    }
    if (!Array.isArray(parsed.empleados)) parsed.empleados = [];
    if (!Array.isArray(parsed.evaluaciones)) parsed.evaluaciones = [];
    return parsed;
  } catch {
    const def = buildDefaultData();
    saveData(def);
    return def;
  }
}

/** Persiste todos los datos con manejo de errores (no crashea si localStorage se llena). */
export function saveData(data: AppData): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // QuotaExceededError, modo privado de Safari, o disco lleno
    console.error("No se pudo guardar en localStorage:", e);
    // Disparar evento para que la UI muestre un toast
    window.dispatchEvent(new CustomEvent("app-leonor:storage-error", {
      detail: "No se pudo guardar. Es posible que el almacenamiento del navegador esté lleno."
    }));
  }
}

/** Reinicia a los datos por defecto (manteniendo usuarios registrados opcional). */
export function resetData(keepUsers = false): AppData {
  const def = buildDefaultData();
  if (keepUsers && isBrowser()) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppData;
        if (Array.isArray(parsed.users) && parsed.users.length) def.users = parsed.users;
      }
    } catch {
      /* ignore */
    }
  }
  saveData(def);
  return def;
}

/* ===================== MUTACIÓN ATÓMICA ===================== */
/**
 * Mutación atómica: lee, aplica la función mutadora y guarda en una sola
 * operación serializada. Evita race conditions cuando hay múltiples
 * mutaciones concurrentes (doble click, múltiples tabs).
 */
export function mutateData(fn: (draft: AppData) => void): void {
  withLock(() => {
    const data = loadData();
    fn(data);
    saveData(data);
  });
}

/* ===================== USERS ===================== */
export function getUsers(): User[] {
  return loadData().users;
}

export function saveUsers(users: User[]): void {
  mutateData((data) => {
    data.users = users;
  });
}

/* ===================== EMPLEADOS ===================== */
export function getEmpleados(): Empleado[] {
  return loadData().empleados;
}

export function saveEmpleados(empleados: Empleado[]): void {
  mutateData((data) => {
    data.empleados = empleados;
  });
}

/* ===================== EVALUACIONES ===================== */
export function getEvaluaciones(): Evaluacion[] {
  return loadData().evaluaciones;
}

export function saveEvaluaciones(evaluaciones: Evaluacion[]): void {
  mutateData((data) => {
    data.evaluaciones = evaluaciones;
  });
}

/* ===================== CONFIG ===================== */
export function getConfig(): EmpresaConfig {
  return loadData().config;
}

export function saveConfig(config: EmpresaConfig): void {
  mutateData((data) => {
    data.config = config;
  });
}

/* ===================== IMPORT/EXPORT ===================== */
export function exportData(): string {
  return JSON.stringify(loadData(), null, 2);
}

/**
 * Valida que un objeto unknown tenga la estructura mínima de AppData.
 * Evita que un JSON corrupto o malicioso rompa toda la app.
 */
function isValidAppData(d: unknown): d is AppData {
  if (!d || typeof d !== "object") return false;
  const o = d as Record<string, unknown>;
  // Campos obligatorios
  if (!Array.isArray(o.users)) return false;
  if (!o.config || typeof o.config !== "object") return false;
  // Campos opcionales pero si existen deben ser arrays
  if (o.empleados !== undefined && !Array.isArray(o.empleados)) return false;
  if (o.evaluaciones !== undefined && !Array.isArray(o.evaluaciones)) return false;
  // Validar que cada user tenga los campos mínimos
  for (const u of o.users) {
    if (!u || typeof u !== "object") return false;
    const uu = u as Record<string, unknown>;
    if (typeof uu.id !== "string") return false;
    if (typeof uu.username !== "string") return false;
    if (typeof uu.role !== "string") return false;
  }
  // Validar config mínima
  const c = o.config as Record<string, unknown>;
  if (typeof c.nombre !== "string") return false;
  if (!Array.isArray(c.criterios)) return false;
  return true;
}

export function importData(json: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("El archivo no es un JSON válido. Verifica que el archivo no esté corrupto.");
  }
  if (!isValidAppData(parsed)) {
    throw new Error(
      "El JSON no tiene la estructura esperada. Asegúrate de que sea un archivo exportado desde esta aplicación."
    );
  }
  // Asegurar campos opcionales
  const data = parsed as AppData;
  if (!data.empleados) data.empleados = [];
  if (!data.evaluaciones) data.evaluaciones = [];
  saveData(data);
  return data;
}

/* ===================== CONCLUSIONES ===================== */

/** Lee todas las conclusiones guardadas en localStorage. */
export function loadConclusiones(): Record<string, Conclusion> {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(CONCLUSIONES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Conclusion>;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

/** Persiste todas las conclusiones. */
export function saveConclusiones(conclusiones: Record<string, Conclusion>): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(CONCLUSIONES_KEY, JSON.stringify(conclusiones));
    window.dispatchEvent(new Event("app-leonor:conclusiones-changed"));
  } catch (e) {
    console.error("No se pudieron guardar las conclusiones:", e);
    window.dispatchEvent(
      new CustomEvent("app-leonor:storage-error", {
        detail:
          "No se pudieron guardar las conclusiones. Es posible que el almacenamiento del navegador esté lleno.",
      })
    );
  }
}

/** Guarda o actualiza una conclusión individual. */
export function setConclusion(areaId: string, texto: string): void {
  const all = loadConclusiones();
  all[areaId] = {
    areaId,
    texto,
    ultimaEdicion: new Date().toISOString(),
  };
  saveConclusiones(all);
}

/** Borra una conclusión individual. */
export function deleteConclusion(areaId: string): void {
  const all = loadConclusiones();
  delete all[areaId];
  saveConclusiones(all);
}

/* ===================== PLAN DE MEJORA EDITABLE ===================== */

/**
 * Sustituye el plan de mejora de una evaluación específica.
 * Si la evaluación no existe, no hace nada.
 */
export function updatePlanMejora(evalId: string, plan: PlanMejora): void {
  mutateData((data) => {
    const idx = data.evaluaciones.findIndex((e) => e.id === evalId);
    if (idx >= 0) {
      data.evaluaciones[idx].planMejora = plan;
    }
  });
  window.dispatchEvent(new Event("app-leonor:changed"));
}

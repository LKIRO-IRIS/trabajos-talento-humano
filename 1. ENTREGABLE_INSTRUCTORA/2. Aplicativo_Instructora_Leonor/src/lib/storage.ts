import type { AppData, Empleado, EmpresaConfig, Evaluacion, User } from "./types";
import { buildDefaultData } from "./default-data";

const STORAGE_KEY = "app-leonor:data:v1";

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
    // saneamiento mínimo
    if (!parsed.users || parsed.users.length === 0) {
      const def = buildDefaultData();
      parsed.users = def.users;
    }
    if (!parsed.config) parsed.config = defConfig();
    if (!parsed.empleados) parsed.empleados = [];
    if (!parsed.evaluaciones) parsed.evaluaciones = [];
    return parsed;
  } catch {
    const def = buildDefaultData();
    saveData(def);
    return def;
  }
}

function defConfig(): EmpresaConfig {
  return buildDefaultData().config;
}

/** Persiste todos los datos. */
export function saveData(data: AppData): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Reinicia a los datos por defecto (manteniendo usuarios registrados opcional). */
export function resetData(keepUsers = false): AppData {
  const def = buildDefaultData();
  if (keepUsers && isBrowser()) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppData;
        if (parsed.users?.length) def.users = parsed.users;
      }
    } catch {
      /* ignore */
    }
  }
  saveData(def);
  return def;
}

/* ===================== USERS ===================== */
export function getUsers(): User[] {
  return loadData().users;
}

export function saveUsers(users: User[]): void {
  const data = loadData();
  data.users = users;
  saveData(data);
}

/* ===================== EMPLEADOS ===================== */
export function getEmpleados(): Empleado[] {
  return loadData().empleados;
}

export function saveEmpleados(empleados: Empleado[]): void {
  const data = loadData();
  data.empleados = empleados;
  saveData(data);
}

/* ===================== EVALUACIONES ===================== */
export function getEvaluaciones(): Evaluacion[] {
  return loadData().evaluaciones;
}

export function saveEvaluaciones(evaluaciones: Evaluacion[]): void {
  const data = loadData();
  data.evaluaciones = evaluaciones;
  saveData(data);
}

/* ===================== CONFIG ===================== */
export function getConfig(): EmpresaConfig {
  return loadData().config;
}

export function saveConfig(config: EmpresaConfig): void {
  const data = loadData();
  data.config = config;
  saveData(data);
}

/* ===================== IMPORT/EXPORT ===================== */
export function exportData(): string {
  return JSON.stringify(loadData(), null, 2);
}

export function importData(json: string): AppData {
  const parsed = JSON.parse(json) as AppData;
  if (!parsed.users || !parsed.config) {
    throw new Error("JSON inválido: faltan usuarios o configuración.");
  }
  if (!parsed.empleados) parsed.empleados = [];
  if (!parsed.evaluaciones) parsed.evaluaciones = [];
  saveData(parsed);
  return parsed;
}

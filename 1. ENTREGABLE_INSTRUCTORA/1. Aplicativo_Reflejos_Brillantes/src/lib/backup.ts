/**
 * Sistema de respaldo para SIGTH.
 *
 * Permite empaquetar TODA la información del aprendiz (empresa, formatos,
 * HVs analizadas, cabeceras, cronograma) en un único archivo `.sigth`
 * comprimido con lz-string, y restaurarlo después.
 *
 * También soporta códigos cortos (TH-XXXX-XXXX) que se guardan como
 * referencia local en IndexedDB.
 */

import LZString from "lz-string";
import type { EmpresaConfig } from "./analysis";

export interface BackupData {
  version: 1;
  exportedAt: string;
  empresa: EmpresaConfig;
  formats: Record<string, unknown>;
  analyzedHvs: unknown[];
  docHeader: unknown;
  cronograma: unknown;
  docHeaderPerFormat?: Record<string, unknown>;
  backupCode?: string;
}

/** Prefijo de localStorage que usan los formatos individuales (sin "-header"). */
export const BACKUP_LS_PREFIX = "sigth-gestion-format-";

const COMPANY_LS_KEY = "sigth-company";
const LOGO_LS_KEY = "sigth-gestion-logo";
const COMPANY_NAME_LS_KEY = "sigth-gestion-company-name";
const ANALYZED_HVS_LS_KEY = "sigth-analyzed-hvs";
const DOC_HEADER_LS_KEY = "sigth-gestion-doc-header";
const CRONOGRAMA_LS_KEY = "sigth-gestion-cronograma";

/** Recoge todos los datos relevantes de localStorage en un objeto BackupData. */
export function collectBackup(empresa: EmpresaConfig): BackupData {
  if (typeof window === "undefined") throw new Error("client-only");
  const formats: Record<string, unknown> = {};
  const docHeaderPerFormat: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(BACKUP_LS_PREFIX)) continue;
    if (key.endsWith("-header")) {
      const fmtId = key.slice(BACKUP_LS_PREFIX.length, -"-header".length);
      try {
        docHeaderPerFormat[fmtId] = JSON.parse(localStorage.getItem(key) || "{}");
      } catch {}
    } else {
      const fmtId = key.slice(BACKUP_LS_PREFIX.length);
      try {
        formats[fmtId] = JSON.parse(localStorage.getItem(key) || "{}");
      } catch {}
    }
  }
  let analyzedHvs: unknown[] = [];
  try {
    analyzedHvs = JSON.parse(localStorage.getItem(ANALYZED_HVS_LS_KEY) || "[]");
  } catch {}
  let docHeader = {};
  try {
    docHeader = JSON.parse(localStorage.getItem(DOC_HEADER_LS_KEY) || "{}");
  } catch {}
  let cronograma: unknown = [];
  try {
    cronograma = JSON.parse(localStorage.getItem(CRONOGRAMA_LS_KEY) || "[]");
  } catch {}
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    empresa,
    formats,
    analyzedHvs,
    docHeader,
    cronograma,
    docHeaderPerFormat,
  };
}

/** Serializa un BackupData en una cadena comprimida (base64). */
export function serializeBackup(data: BackupData): string {
  return LZString.compressToBase64(JSON.stringify(data));
}

/** Descomprime y parsea una cadena en un BackupData. */
export function deserializeBackup(s: string): BackupData | null {
  try {
    const json = LZString.decompressFromBase64(s);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (parsed && parsed.version === 1) return parsed as BackupData;
    return null;
  } catch {
    return null;
  }
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I confundibles

/** Genera un código corto de respaldo con formato `TH-XXXX-XXXX`. */
export function generateBackupCode(): string {
  const pick = (n: number) =>
    Array.from({ length: n }, () =>
      CODE_ALPHABET.charAt(Math.floor(Math.random() * CODE_ALPHABET.length)),
    ).join("");
  return `TH-${pick(4)}-${pick(4)}`;
}

/** Restaura todos los datos del backup en localStorage. */
export function restoreBackup(data: BackupData): {
  formats: number;
  hvs: number;
} {
  if (typeof window === "undefined") throw new Error("client-only");
  // Empresa
  window.localStorage.setItem("sigth-empresa-config", JSON.stringify(data.empresa));
  if (data.empresa.logo) {
    window.localStorage.setItem(LOGO_LS_KEY, data.empresa.logo);
  } else {
    window.localStorage.removeItem(LOGO_LS_KEY);
  }
  window.localStorage.setItem(COMPANY_NAME_LS_KEY, data.empresa.name);
  window.localStorage.setItem(COMPANY_LS_KEY, data.empresa.id);

  // Formatos
  let formatsCount = 0;
  for (const [fmtId, fmtData] of Object.entries(data.formats || {})) {
    window.localStorage.setItem(`${BACKUP_LS_PREFIX}${fmtId}`, JSON.stringify(fmtData));
    formatsCount++;
  }
  // Cabeceras por formato
  for (const [fmtId, hdrData] of Object.entries(data.docHeaderPerFormat || {})) {
    window.localStorage.setItem(
      `${BACKUP_LS_PREFIX}${fmtId}-header`,
      JSON.stringify(hdrData),
    );
  }
  // HVs analizadas
  if (Array.isArray(data.analyzedHvs)) {
    window.localStorage.setItem(ANALYZED_HVS_LS_KEY, JSON.stringify(data.analyzedHvs));
  }
  // Cabecera global
  if (data.docHeader) {
    window.localStorage.setItem(DOC_HEADER_LS_KEY, JSON.stringify(data.docHeader));
  }
  // Cronograma
  if (data.cronograma !== undefined) {
    window.localStorage.setItem(CRONOGRAMA_LS_KEY, JSON.stringify(data.cronograma));
  }
  // Notifica al resto de la app que los datos cambiaron.
  window.dispatchEvent(new CustomEvent("sigth-empresa-changed"));
  window.dispatchEvent(new CustomEvent("sigth-analyzed-hvs-changed"));
  window.dispatchEvent(new CustomEvent("sigth-doc-header-changed"));
  return {
    formats: formatsCount,
    hvs: Array.isArray(data.analyzedHvs) ? data.analyzedHvs.length : 0,
  };
}

/** Descarga el backup como archivo `.sigth`. */
export function downloadBackupFile(data: BackupData, empresaName: string) {
  const compressed = serializeBackup(data);
  const blob = new Blob([compressed], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = (empresaName || "mi_empresa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .slice(0, 40);
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `backup_th_${safeName}_${date}.sigth`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Lee un archivo `.sigth` (o `.json`) y devuelve el BackupData. */
export function readBackupFile(file: File): Promise<BackupData | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      // Intenta primero como lz-string
      let data = deserializeBackup(text);
      // Si no, intenta como JSON plano (exportación manual).
      if (!data) {
        try {
          const parsed = JSON.parse(text);
          if (parsed && parsed.version === 1) data = parsed as BackupData;
        } catch {}
      }
      resolve(data);
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}

/* ------------------------------------------------------------------ */
/*  IndexedDB — almacenamiento local de respaldos                     */
/* ------------------------------------------------------------------ */

const IDB_NAME = "sigth-backups";
const IDB_STORE = "backups";

function openBackupDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: "code" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Guarda un backup en IndexedDB bajo el código dado. */
export async function storeBackupIndexedDB(
  code: string,
  data: BackupData,
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const db = await openBackupDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      store.put({ code, data, savedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn("No se pudo guardar el backup en IndexedDB:", err);
  }
}

/** Recupera un backup desde IndexedDB por su código. */
export async function getBackupFromIndexedDB(
  code: string,
): Promise<BackupData | null> {
  if (typeof window === "undefined") return null;
  try {
    const db = await openBackupDB();
    const result = await new Promise<BackupData | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(code);
      req.onsuccess = () => resolve(req.result?.data || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

/** Lista todos los backups guardados localmente (más recientes primero). */
export async function listLocalBackups(): Promise<
  { code: string; savedAt: string }[]
> {
  if (typeof window === "undefined") return [];
  try {
    const db = await openBackupDB();
    const result = await new Promise<{ code: string; savedAt: string }[]>(
      (resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        const store = tx.objectStore(IDB_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          const rows = (req.result || []) as {
            code: string;
            savedAt: string;
          }[];
          rows.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
          resolve(rows);
        };
        req.onerror = () => reject(req.error);
      },
    );
    db.close();
    return result;
  } catch {
    return [];
  }
}

/** Convierte una EmpresaConfig en un parámetro URL codificado (base64). */
export function encodeEmpresaToUrl(cfg: EmpresaConfig): string {
  try {
    return LZString.compressToEncodedURIComponent(JSON.stringify(cfg));
  } catch {
    return "";
  }
}

/** Convierte un parámetro URL de vuelta a EmpresaConfig. */
export function decodeEmpresaFromUrl(s: string): EmpresaConfig | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(s);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.name === "string") {
      return parsed as EmpresaConfig;
    }
    return null;
  } catch {
    return null;
  }
}

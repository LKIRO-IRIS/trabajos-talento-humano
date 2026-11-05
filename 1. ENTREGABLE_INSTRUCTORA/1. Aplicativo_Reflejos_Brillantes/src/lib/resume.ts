/* ------------------------------------------------------------------ */
/*  SIGTH — Resume Builder types & helpers (Tab 1: "Crear Hoja de Vida") */
/* ------------------------------------------------------------------ */

import { MESES_ES, uid, COMPANY_THEMES, type CompanyId } from "./analysis";

// Re-export company themes so UI components can import everything from one place.
export { COMPANY_THEMES, type CompanyId };

export interface Experiencia {
  id: string;
  cargo: string;
  empresa: string;
  fechaInicioMes: string;
  fechaInicioAno: string;
  fechaFinMes: string;
  fechaFinAno: string;
  trabajoActual: boolean;
  funciones: string;
  logros: string;
}

export interface Educacion {
  id: string;
  titulo: string;
  institucion: string;
  fechaGradoMes: string;
  fechaGradoAno: string;
}

export interface Resume {
  id: string;
  name: string;
  nombre: string;
  cargo: string;
  correo: string;
  telefono: string;
  ciudad: string;
  enlace: string;
  foto: string | null;
  perfil: string;
  experiencias: Experiencia[];
  educacion: Educacion[];
  habilidades: string;
  createdAt: number;
  updatedAt: number;
}

export type FormTab = "A" | "B" | "C" | "D" | "E" | "F";

export const FORM_TABS: { id: FormTab; label: string; short: string }[] = [
  { id: "A", label: "Datos de contacto", short: "A · Contacto" },
  { id: "B", label: "Perfil profesional", short: "B · Perfil" },
  { id: "C", label: "Experiencia laboral", short: "C · Experiencia" },
  { id: "D", label: "Educación formal", short: "D · Educación" },
  { id: "E", label: "Habilidades", short: "E · Habilidades" },
  { id: "F", label: "Exportar", short: "F · Exportar" },
];

export const MONTH_OPTIONS = MESES_ES;

/** Builds current year options from 1970 → current year + 1. */
export function yearOptions(): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let y = now.getFullYear() + 1; y >= 1970; y--) {
    out.push(String(y));
  }
  return out;
}

/** Creates an empty resume with sensible defaults. */
export function createEmptyResume(name = "Mi hoja de vida"): Resume {
  const now = Date.now();
  return {
    id: uid(),
    name,
    nombre: "",
    cargo: "",
    correo: "",
    telefono: "",
    ciudad: "",
    enlace: "",
    foto: null,
    perfil: "",
    experiencias: [],
    educacion: [],
    habilidades: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function createEmptyExperiencia(): Experiencia {
  return {
    id: uid(),
    cargo: "",
    empresa: "",
    fechaInicioMes: "",
    fechaInicioAno: "",
    fechaFinMes: "",
    fechaFinAno: "",
    trabajoActual: false,
    funciones: "",
    logros: "",
  };
}

export function createEmptyEducacion(): Educacion {
  return {
    id: uid(),
    titulo: "",
    institucion: "",
    fechaGradoMes: "",
    fechaGradoAno: "",
  };
}

/** Builds the textual date range for a job, e.g. "marzo 2024 - Actualidad". */
export function formatDateRange(exp: Experiencia): string {
  const start = formatMonthYear(exp.fechaInicioMes, exp.fechaInicioAno);
  const end = exp.trabajoActual
    ? "Actualidad"
    : formatMonthYear(exp.fechaFinMes, exp.fechaFinAno);
  if (!start && !end) return "";
  if (!start) return end;
  if (!end) return start;
  return `${start} - ${end}`;
}

export function formatMonthYear(mes: string, ano: string): string {
  const m = (mes || "").trim();
  const y = (ano || "").trim();
  if (!m && !y) return "";
  if (!m) return y;
  if (!y) return m;
  return `${m} ${y}`;
}

/** Parses a multiline textarea into bullet items (split by new lines, dashes). */
export function parseBullets(text: string): string[] {
  if (!text || !text.trim()) return [];
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s•·\-*]+/, "").trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/*  LocalStorage persistence (try/catch — never throws)                */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "sigth-rb-resumes-v1";
const THEME_KEY = "sigth-rb-dark-mode";

export function loadResumesFromStorage(): Resume[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive filter — only entries that look like resumes.
    return parsed.filter((r) => r && typeof r === "object" && r.id);
  } catch {
    return [];
  }
}

export function saveResumesToStorage(resumes: Resume[]): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
  } catch {
    /* ignore quota / serialization errors */
  }
}

export function loadDarkModeFromStorage(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const raw = window.localStorage.getItem(THEME_KEY);
    return raw === "true";
  } catch {
    return false;
  }
}

export function saveDarkModeToStorage(dark: boolean): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(THEME_KEY, dark ? "true" : "false");
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/*  Photo upload — resize to max 300px via canvas (returns base64)      */
/* ------------------------------------------------------------------ */

/**
 * Reads an image File, resizes it so the largest side is at most `maxSize`
 * pixels (default 300), and returns a base64 JPEG data URL. Quality is
 * tuned to keep the payload small enough for LocalStorage.
 */
export function resizeImage(file: File, maxSize = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("El archivo no es una imagen válida."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo obtener el contexto 2D del canvas."));
          return;
        }
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        // PNG keeps the best quality for photos; if too large, fall back to JPEG.
        const pngUrl = canvas.toDataURL("image/png");
        if (pngUrl.length < 200_000) {
          resolve(pngUrl);
          return;
        }
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = () => reject(new Error("No se pudo cargar la imagen."));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

/* ------------------------------------------------------------------ */
/*  Render preview DOM → canvas → JPEG data URL                        */
/*  Used by the "Enviar al Análisis IA" button so the resume created    */
/*  in Tab 1 can be analysed by the VLM pipeline in Tab 2.              */
/* ------------------------------------------------------------------ */

/**
 * Renders an HTMLElement to a JPEG data URL via html2canvas-like approach.
 * We don't ship html2canvas here — instead we build a self-contained SVG
 * with a <foreignObject> that holds the rendered HTML, then draw that SVG
 * onto a canvas. This is a pure-DOM, dependency-free implementation.
 */
export function elementToJpeg(el: HTMLElement, scale = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const rect = el.getBoundingClientRect();
      const w = Math.ceil(rect.width);
      const h = Math.ceil(rect.height);
      if (w === 0 || h === 0) {
        reject(new Error("El elemento a renderizar está vacío."));
        return;
      }
      // Clone the node so we can inline the styles safely.
      const clone = el.cloneNode(true) as HTMLElement;
      // Build a string of inlined styles for the clone subtree.
      inlineStyles(el, clone);

      const xml = new XMLSerializer().serializeToString(clone);
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
        `<foreignObject width="100%" height="100%">` +
        `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;height:${h}px;background:#FFFFFF;">` +
        xml +
        `</div></foreignObject></svg>`;

      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(w * scale));
          canvas.height = Math.max(1, Math.round(h * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("No se pudo obtener el contexto 2D del canvas."));
            return;
          }
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL("image/jpeg", 0.92));
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo renderizar el elemento a imagen."));
      };
      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
}

/** Recursively copies computed styles from src → clone (needed by the SVG foreignObject trick). */
function inlineStyles(src: Element, clone: Element) {
  const srcStyle = window.getComputedStyle(src);
  const cloneEl = clone as HTMLElement;
  let css = "";
  for (let i = 0; i < srcStyle.length; i++) {
    const prop = srcStyle.item(i);
    css += `${prop}: ${srcStyle.getPropertyValue(prop)}; `;
  }
  cloneEl.setAttribute("style", css + "background:#FFFFFF;");
  const srcChildren = src.children;
  const cloneChildren = clone.children;
  for (let i = 0; i < srcChildren.length && i < cloneChildren.length; i++) {
    inlineStyles(srcChildren[i], cloneChildren[i]);
  }
}

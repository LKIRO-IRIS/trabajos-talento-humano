import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Calificacion } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea un número a 1 decimal con coma decimal (es-CO friendly). */
export function formatScore(n: number): string {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "0,0";
  return n.toFixed(1).replace(".", ",");
}

/** Genera un id corto y único. */
export function genId(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/** Devuelve las iniciales (máx 2) de un nombre completo. */
export function getIniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

/** Color de fondo del avatar según el nombre (determinístico). */
export function getAvatarColor(nombre: string): string {
  const palette = [
    "#0D9488", // teal
    "#9333EA", // purple
    "#DB2777", // pink
    "#EA580C", // orange
    "#16A34A", // green
    "#0891B2", // cyan
    "#CA8A04", // yellow-700
    "#DC2626", // red
    "#475569", // slate
  ];
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = (hash * 31 + nombre.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

/** Color asociado a cada calificación cualitativa. */
export function getColorCalificacion(cal: Calificacion): string {
  switch (cal) {
    case "Sobresaliente":
      return "#16A34A"; // verde
    case "Satisfactorio":
      return "#2563EB"; // azul
    case "Necesita Mejora":
      return "#F59E0B"; // ámbar
    case "Insatisfactorio":
      return "#DC2626"; // rojo
    default:
      return "#6B7280"; // gris
  }
}

/** Clases de Tailwind para un badge según calificación. */
export function badgeClassCalificacion(cal: Calificacion): string {
  switch (cal) {
    case "Sobresaliente":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300";
    case "Satisfactorio":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-300";
    case "Necesita Mejora":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300";
    case "Insatisfactorio":
      return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-300";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

/** Devuelve el periodo actual en formato "2026-Q4". */
export function getPeriodoActual(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  const quarter = Math.floor(month / 3) + 1;
  return `${year}-Q${quarter}`;
}

/** Suma 30 días a una fecha y devuelve ISO. */
export function fechaMas30dias(iso?: string): string {
  const base = iso ? new Date(iso) : new Date();
  base.setDate(base.getDate() + 30);
  return base.toISOString();
}

/** Formatea una fecha ISO a dd/mm/yyyy. */
export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Convierte un hex (#RRGGBB) a "r,g,b". */
export function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `${r}, ${g}, ${b}`;
}

/** Mezcla dos hex y devuelve uno nuevo (ratio 0..1 hacia b). */
export function mixHex(a: string, b: string, ratio = 0.5): string {
  const pa = hexToRgb(a).split(",").map((n) => parseInt(n.trim()));
  const pb = hexToRgb(b).split(",").map((n) => parseInt(n.trim()));
  const r = Math.round(pa[0] * (1 - ratio) + pb[0] * ratio);
  const g = Math.round(pa[1] * (1 - ratio) + pb[1] * ratio);
  const bl = Math.round(pa[2] * (1 - ratio) + pb[2] * ratio);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

/** Determina si un hex es claro (para elegir color de texto encima). */
export function isLightHex(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex).split(",").map((n) => parseInt(n.trim()));
  // luminancia relativa simplificada
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6;
}

/** Descarga un Blob con un nombre de archivo. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

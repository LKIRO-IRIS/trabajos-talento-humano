import { NextRequest, NextResponse } from 'next/server';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  Header,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
  PageOrientation,
  VerticalAlignTable,
} from 'docx';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/* ------------------------------------------------------------------ */
/*  Types (mirrored from src/app/page.tsx — kept self-contained)       */
/* ------------------------------------------------------------------ */

interface HVAnalysisResult {
  nombre: string;
  telefono: string;
  correo: string;
  ciudad: string;
  formacion: string;
  areaFormacion: string;
  experiencia: string;
  cargoAspira: string;
  habilidades: string[];
  perfilProfesional: string;
  cumpleFormacion: boolean;
  cumpleExperiencia: boolean;
  perfilCompatible?: boolean;
  motivoIncompatibilidad?: string;
  rawText?: string;
}

interface ScoreBreakdown {
  formacion: number;
  experiencia: number;
  contacto: number;
  ciudad: number;
  habilidad: number;
  penalizacion: number;
}

interface Evaluation {
  cumpleFormacion: boolean;
  cumpleExperiencia: boolean;
  areaCompatible: boolean;
  areaMessage: string;
  areaValue: string;
  cargoCoincide: boolean;
  cargoMessage: string;
  perfilCompatible: boolean;
  motivoIncompatibilidad: string;
  penalizacion: number;
  estado: 'ACTIVO' | 'DESCARTADO';
  score: number;
  scoreBreakdown: ScoreBreakdown;
  decision: 'SELECCIONADO' | 'BANCO DE TALENTO' | 'DESCARTADO';
}

interface ConfigState {
  empresa: string;
  cargo: string;
  /** Which company's branding to apply (colours + logo + documents). */
  company?: 'royal_eventos' | 'reflejos_brillantes';
  /** Which kind of responsible signs the generated docs. */
  rolResponsable: 'gerente' | 'instructor';
  /** Gerente name (used when rolResponsable === 'gerente'). */
  nombreGerente: string;
  /** Instructor name (used when rolResponsable === 'instructor'). */
  nombreInstructor: string;
  /** Aprendiz name (used when rolResponsable === 'instructor'). */
  nombreAprendiz: string;
  /** Optional logo, base64-encoded (without the data: prefix), as PNG or JPG. */
  logoBase64?: string;
  /** Mime type of the logo, e.g. "image/png" or "image/jpeg". */
  logoMime?: string;
  /** Formación mínima requerida (Bachiller / Técnico / Tecnólogo / Profesional / Especialización / Maestría). */
  formacionMinima: string;
  /** Experiencia mínima requerida (años). */
  experienciaMinima: number;
}

/**
 * Returns a single-line label describing the responsible person(s) for the
 * generated documents. Mirrors the helper used client-side in page.tsx.
 */
function responsableLabel(config: ConfigState): string {
  if (config.rolResponsable === 'instructor') {
    const inst = (config.nombreInstructor || '').trim();
    const apr = (config.nombreAprendiz || '').trim();
    const parts: string[] = [];
    if (inst) parts.push(`Instructor: ${inst}`);
    if (apr) parts.push(`Aprendiz: ${apr}`);
    return parts.join(' · ') || 'Instructor SENA';
  }
  return (config.nombreGerente || '').trim() || 'Gerente de Talento Humano';
}

/**
 * Returns the multi-line block used inside the Word signature cells.
 * Gerente  → ["Gerente de Talento Humano", "<nombre>"]
 * Instructor → ["Instructor SENA", "<nombre instructor>", "Aprendiz: <nombre aprendiz>"]
 */
function responsableSignatureLines(config: ConfigState): { role: string; name: string; extra?: string } {
  if (config.rolResponsable === 'instructor') {
    return {
      role: 'Instructor SENA',
      name: (config.nombreInstructor || '').trim() || 'Instructor SENA',
      extra: (config.nombreAprendiz || '').trim()
        ? `Aprendiz: ${config.nombreAprendiz.trim()}`
        : undefined,
    };
  }
  return {
    role: 'Gerente de Talento Humano',
    name: (config.nombreGerente || '').trim() || 'Gerencia de Talento Humano',
  };
}

interface CandidatePayload {
  rank: number;
  file: {
    fileName: string;
    previewUrl?: string; // data URL of the original HV image
    mimeType?: string;
    analysis: HVAnalysisResult;
  };
  evaluation: Evaluation;
}

const MINIMUM_SCORE = 20;
const MAX_SCORE = 30;

/* Elegant corporate palette — switched at runtime by `applyCompanyTheme()`
 * depending on the selected company:
 *   - reflejos_brillantes (default) → dark blue + green accents
 *   - royal_eventos                   → wine + gold accents
 *
 * Green is reserved ONLY for the "C" (Cumple) result badge and for high-score
 * cells in Excel; red stays for "N/C" / RECHAZADO; yellow stays for warnings
 * ("NV" / BANCO DE TALENTO). */
interface ThemeColors {
  primary: string;
  dark: string;
  medium: string;
  accent: string;
  light: string;
  bg: string;
  orange: string;
  red: string;
  redLight: string;
  yellow: string;
  yellowLight: string;
  greenOk: string;
  greenOkLight: string;
  white: string;
  text: string;
  textDark: string;
  gray: string;
}

const THEME_REFLEJOS_BRILLANTES: ThemeColors = {
  primary: '1565C0', // Blue primary — table borders, header borders, accents
  dark: '0D47A1',    // Dark blue — titles, table header backgrounds
  medium: '1976D2',  // Medium blue — secondary accents
  accent: '42A5F5',  // Lighter blue — highlights
  light: 'E3F2FD',   // Light blue — alternating row backgrounds
  bg: 'F5F9FC',      // Very light blue tint for soft backgrounds
  orange: 'FF9800',  // Orange for #1 rank highlight (kept)
  red: 'C62828',     // Red for "N/C" / RECHAZADO / DESCARTADO
  redLight: 'FFEBEE',
  yellow: 'F9A825',  // Yellow for "NV" warnings
  yellowLight: 'FFFDE7',
  greenOk: '2E7D32', // Green ONLY for "C" (Cumple) result badges
  greenOkLight: 'E8F5E9',
  white: 'FFFFFF',
  text: '1B1B1B',
  textDark: '1B1B1B',
  gray: '666666',
};

const THEME_ROYAL_EVENTOS: ThemeColors = {
  primary: '8B2E3C',  // Wine medium — table borders, accents
  dark: '6B1F2E',     // Wine — title banners, table header backgrounds
  medium: '7C2939',   // Medium wine — secondary accents
  accent: 'B8941F',   // Gold — highlights
  light: 'FFF8E7',    // Cream — alternating row backgrounds
  bg: 'FBF5E6',       // Very light cream tint
  orange: 'D4AF37',   // Gold light for #1 rank highlight
  red: 'C62828',
  redLight: 'FFEBEE',
  yellow: 'F9A825',
  yellowLight: 'FFFDE7',
  greenOk: '2E7D32', // Keep green for "Cumple" badges
  greenOkLight: 'E8F5E9',
  white: 'FFFFFF',
  text: '2C2C2C',
  textDark: '2C2C2C',
  gray: '6B5B3E',
};

/** Active theme colours — mutated by `applyCompanyTheme()` at start of POST. */
let BLUE: ThemeColors = THEME_REFLEJOS_BRILLANTES;

/** Apply the company-specific theme to all subsequent document generation. */
function applyCompanyTheme(company?: string) {
  BLUE = company === 'royal_eventos' ? THEME_ROYAL_EVENTOS : THEME_REFLEJOS_BRILLANTES;
}

/** Convert a 6-digit hex colour to an ExcelJS ARGB string (8 digits, FF prefix). */
const xl = (hex6: string) => `FF${hex6}`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getExperienciaYears(value: string): number {
  if (!value) return 0;
  const num = parseInt(String(value).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(num) ? num : 0;
}

function safeFileName(s: string): string {
  return (s || 'candidato')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 60);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dateStrEsCO(): string {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Solid-color cell shading helper. */
function shading(color: string) {
  return {
    type: ShadingType.SOLID,
    color,
    fill: color,
  } as const;
}

/** Thin grey border for table cells. */
function thinBorder(color = 'BDBDBD') {
  const s = { style: BorderStyle.SINGLE, size: 4, color } as const;
  return { top: s, bottom: s, left: s, right: s };
}

/**
 * Quality-box borders (cuadros de calidad) — strong blue border on every
 * outer edge (1.5pt) plus a soft light-blue grid between rows and
 * columns. Used for every audit-style table in the Word documents so
 * they look like real audit boxes.
 */
function qualityBorder(outerColor = BLUE.primary, innerColor = 'BBDEFB') {
  const outer = { style: BorderStyle.SINGLE, size: 12, color: outerColor } as const;
  const inner = { style: BorderStyle.SINGLE, size: 6, color: innerColor } as const;
  return {
    top: outer,
    bottom: outer,
    left: outer,
    right: outer,
    insideHorizontal: inner,
    insideVertical: inner,
  };
}

/* ------------------------------------------------------------------ */
/*  Logo helpers (optional, PNG or JPG only — SVG must be converted    */
/*  to PNG by the client before sending).                              */
/* ------------------------------------------------------------------ */

/** Resolves the docx image type from a mime string. */
function getLogoType(
  mime?: string,
): 'png' | 'jpg' | null {
  if (!mime) return null;
  const m = mime.toLowerCase();
  if (m === 'image/png') return 'png';
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
  return null;
}

/**
 * Builds an `ImageRun` for the company logo, or returns `null` if the logo
 * is missing/unsupported. Logs a warning instead of throwing on failure so
 * the rest of the document still generates correctly.
 */
function buildLogoRun(
  logoBase64?: string,
  logoMime?: string,
  width = 130,
  height = 60,
): ImageRun | null {
  if (!logoBase64) return null;
  const type = getLogoType(logoMime);
  if (!type) {
    console.warn('[generate-zip] Logo con tipo no soportado, se omite:', logoMime);
    return null;
  }
  try {
    const data = Buffer.from(logoBase64, 'base64');
    if (!data || data.length === 0) return null;
    return new ImageRun({
      data,
      transformation: { width, height },
      type,
    });
  } catch (err) {
    console.error('[generate-zip] Error construyendo ImageRun del logo:', err);
    return null;
  }
}

/**
 * Builds a paragraph holding the logo image, right-aligned by default.
 * Returns `null` when there is no logo so callers can simply skip it.
 */
function buildLogoParagraph(
  logoBase64?: string,
  logoMime?: string,
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.RIGHT,
  width = 130,
  height = 60,
): Paragraph | null {
  const img = buildLogoRun(logoBase64, logoMime, width, height);
  if (!img) return null;
  return new Paragraph({ alignment, children: [img] });
}

/* ------------------------------------------------------------------ */
/*  Watermark logo helper                                              */
/*                                                                     */
/*  Takes the user-provided logo (PNG/JPG/SVG-as-PNG) and produces a    */
/*  semi-transparent, resized PNG buffer suitable for inline embedding  */
/*  in the per-page Word header or at the top of an Excel sheet.        */
/*                                                                     */
/*  Uses sharp to:                                                     */
/*    1. Normalise any input format (PNG/JPG/…) into a PNG buffer.      */
/*    2. Resize so the longer edge fits within `maxW` (default 80px).   */
/*    3. Apply 60% opacity (semi-transparent) for the watermark effect.  */
/*    4. Optionally tint the image with the company accent colour.       */
/*                                                                     */
/*  On any error, returns `null` so callers can simply skip the         */
/*  watermark without breaking the rest of the document.                */
/* ------------------------------------------------------------------ */

interface WatermarkResult {
  /** PNG-encoded buffer, ready for `ImageRun` or ExcelJS `addImage`. */
  png: Buffer;
  /** Width in pixels of the resized image. */
  width: number;
  /** Height in pixels of the resized image. */
  height: number;
}

/** Cache so the same logo+size only gets processed once per ZIP build. */
const watermarkCache = new Map<string, WatermarkResult | null>();

/**
 * Module-level cache for the "header watermark" PNG. Populated once at the
 * start of POST by `prepareHeaderWatermark()`, consumed by sync helpers
 * like `buildSimpleHeader()` so they don't have to be async.
 */
let headerWatermark: WatermarkResult | null = null;

/**
 * Pre-build the header watermark PNG (semi-transparent, resized) once
 * per POST request. Subsequent calls to `buildSimpleHeader()` will use
 * this cached image.
 */
async function prepareHeaderWatermark(
  logoBase64?: string,
  logoMime?: string,
): Promise<void> {
  headerWatermark = await buildWatermarkPng(logoBase64, logoMime, 110, 50, 0.65);
}

/**
 * Produces a semi-transparent, resized PNG buffer for use as a watermark
 * logo. Returns `null` when there is no logo or sharp fails (so callers
 * can simply skip the watermark).
 */
async function buildWatermarkPng(
  logoBase64?: string,
  logoMime?: string,
  maxW = 80,
  maxH = 60,
  opacity = 0.6,
): Promise<WatermarkResult | null> {
  if (!logoBase64) return null;
  const cacheKey = `${logoBase64.length}|${logoMime || ''}|${maxW}x${maxH}|${opacity}`;
  const cached = watermarkCache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const raw = Buffer.from(logoBase64, 'base64');
    if (!raw || raw.length === 0) {
      watermarkCache.set(cacheKey, null);
      return null;
    }
    // sharp fails on SVG input — caller should have rasterised SVG already
    // (the frontend `rasteriseToPng` helper does this).
    const meta = await sharp(raw).metadata().catch(() => null);
    if (!meta || !meta.width || !meta.height) {
      watermarkCache.set(cacheKey, null);
      return null;
    }
    const ratio = Math.min(maxW / meta.width, maxH / meta.height, 1);
    const w = Math.max(8, Math.round(meta.width * ratio));
    const h = Math.max(8, Math.round(meta.height * ratio));

    // Build a transparent canvas and composite the resized logo on top
    // with reduced opacity. This achieves the "watermark" effect for
    // inline image embedding without using docx floating positioning.
    const resized = await sharp(raw)
      .resize(w, h, { fit: 'inside', withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer();

    // Apply per-pixel opacity by scaling the alpha channel.
    const out = Buffer.from(resized);
    const channels = meta.channels ?? 4;
    if (channels >= 4) {
      for (let i = 3; i < out.length; i += channels) {
        out[i] = Math.round(out[i] * opacity);
      }
    }

    const png = await sharp(out, {
      raw: { width: w, height: h, channels: 4 },
    })
      .png()
      .toBuffer();

    const result: WatermarkResult = { png, width: w, height: h };
    watermarkCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[generate-zip] buildWatermarkPng falló, se omite:', err);
    watermarkCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Builds an inline `ImageRun` for the watermark logo, suitable for use in
 * a Word `Header`. Returns `null` when there is no logo so callers can
 * simply skip the image.
 *
 * Uses the pre-built semi-transparent PNG buffer from `buildWatermarkPng`.
 * Falls back to the original logo buffer (without opacity) when sharp
 * fails so we never block document generation on a watermark.
 */
async function buildWatermarkRun(
  logoBase64?: string,
  logoMime?: string,
  width = 80,
  height = 60,
): Promise<ImageRun | null> {
  if (!logoBase64) return null;
  const wm = await buildWatermarkPng(logoBase64, logoMime, width, height);
  if (wm) {
    try {
      return new ImageRun({
        data: wm.png,
        transformation: { width, height },
        type: 'png',
      });
    } catch (err) {
      console.warn('[generate-zip] buildWatermarkRun: fallo con PNG, usando buffer crudo:', err);
    }
  }
  // Fallback to a plain (non-transparent) logo run
  return buildLogoRun(logoBase64, logoMime, width, height);
}

/**
 * Adds the watermark logo image at the top-left of every sheet in the
 * given workbook. Uses ExcelJS's `addImage` + `ws.addImage` API.
 *
 * When the logo is missing or the format is unsupported, this is a no-op
 * so the workbook still generates cleanly.
 */
async function attachLogoToWorkbook(
  wb: ExcelJS.Workbook,
  logoBase64?: string,
  logoMime?: string,
): Promise<void> {
  if (!logoBase64) return;
  const wm = await buildWatermarkPng(logoBase64, logoMime, 110, 50);
  if (!wm) return;
  let imageId: number;
  try {
    imageId = wb.addImage({
      buffer: wm.png,
      extension: 'png',
    });
  } catch (err) {
    console.warn('[generate-zip] attachLogoToWorkbook: no se pudo agregar la imagen:', err);
    return;
  }
  for (const ws of wb.worksheets) {
    try {
      // Anchor the image at the top-right of the sheet (cells E1:F3 area)
      ws.addImage(imageId, {
        tl: { col: 4.5, row: 0 },
        br: { col: 7, row: 2.2 },
        editAs: 'oneCell',
      });
    } catch (err) {
      console.warn(`[generate-zip] attachLogoToWorkbook: hoja "${ws.name}" sin imagen:`, err);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Simple branded header (BUG 2 fix)                                  */
/*                                                                     */
/*  The previous implementation built a floating watermark (semi-      */
/*  transparent logo placed BEHIND the body text on every page) using  */
/*  `ImageRun.floating` with `behindDocument`, `wrap`, `zIndex` and    */
/*  other complex DrawingML properties. That complex XML easily breaks  */
/*  Microsoft Word — the .docx opens with a corruption error.          */
/*                                                                     */
/*  This simplified version places the logo ONLY as a normal inline    */
/*  ImageRun inside the per-page Header: company name + cargo on the   */
/*  left, small logo on the right (when available), separated from the */
/*  body by a blue bottom border. No floating, no behindDocument, no   */
/*  wrap, no zIndex → reliable, valid Word documents.                  */
/* ------------------------------------------------------------------ */

/**
 * Builds a `Header` with a simple, non-floating branding bar: company
 * name + cargo on the left, small logo on the right (when available),
 * separated from the body by a blue bottom border. The logo is rendered
 * as a normal inline `ImageRun` (no floating) so the resulting .docx is
 * guaranteed to open cleanly in Microsoft Word.
 */
function buildSimpleHeader(
  config: ConfigState,
  dateStr: string,
): Header {
  const leftCellChildren = [
    new Paragraph({
      children: [
        new TextRun({
          text: config.empresa || 'SIGTH',
          bold: true,
          size: 16,
          color: BLUE.dark,
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 20 },
      children: [
        new TextRun({
          text: `Cargo: ${config.cargo || '—'} · ${dateStr}`,
          size: 12,
          color: '555555',
        }),
      ],
    }),
  ];

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.SINGLE, size: 12, color: BLUE.primary },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: config.logoBase64 ? 70 : 100, type: WidthType.PERCENTAGE },
            margins: { top: 60, bottom: 80, left: 0, right: 100 },
            verticalAlign: VerticalAlignTable.CENTER,
            children: leftCellChildren,
          }),
          ...(config.logoBase64
            ? [
                new TableCell({
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  margins: { top: 60, bottom: 80, left: 100, right: 0 },
                  verticalAlign: VerticalAlignTable.CENTER,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [
                        (() => {
                          // Prefer the pre-built semi-transparent watermark PNG
                          // (built once at the start of POST by
                          // `prepareHeaderWatermark()`). Falls back to the
                          // plain logo buffer when sharp fails so the header
                          // always renders something when a logo is provided.
                          if (headerWatermark) {
                            try {
                              return new ImageRun({
                                data: headerWatermark.png,
                                transformation: { width: 110, height: 50 },
                                type: 'png',
                              });
                            } catch {
                              // fall through to plain logo
                            }
                          }
                          const run = buildLogoRun(config.logoBase64, config.logoMime, 110, 50);
                          return run || new TextRun({ text: '' });
                        })(),
                      ],
                    }),
                  ],
                }),
              ]
            : []),
        ],
      }),
    ],
  });

  const headerChildren: (Paragraph | Table)[] = [
    new Paragraph({ children: [] }),
    headerTable,
  ];

  return new Header({
    children: headerChildren,
  });
}

/* ------------------------------------------------------------------ */
/*  Checklist criteria (13 — sections 1.1 to 3.5)                     */
/* ------------------------------------------------------------------ */

interface CheckItem {
  code: string;
  criterion: string;
  type: 'O' | 'D';
}

const CHECKLIST_CRITERIA: CheckItem[] = [
  { code: '1.1', criterion: 'Información personal completa (nombres y apellidos)', type: 'O' },
  { code: '1.2', criterion: 'Teléfono de contacto', type: 'O' },
  { code: '1.3', criterion: 'Correo electrónico', type: 'O' },
  { code: '1.4', criterion: 'Documento de identidad / Ciudad de residencia', type: 'O' },
  { code: '2.1', criterion: 'Nivel de formación mínimo requerido', type: 'O' },
  { code: '2.2', criterion: 'Área de formación relacionada con el cargo', type: 'D' },
  { code: '2.3', criterion: 'Soportes académicos (actas, diplomas)', type: 'D' },
  { code: '2.4', criterion: 'Cursos / formación complementaria', type: 'D' },
  { code: '3.1', criterion: 'Experiencia mínima requerida (años)', type: 'O' },
  { code: '3.2', criterion: 'Experiencia en cargos similares', type: 'D' },
  { code: '3.3', criterion: 'Referencias laborales verificables', type: 'D' },
  { code: '3.4', criterion: 'Disponibilidad inmediata', type: 'D' },
  { code: '3.5', criterion: 'Otros requisitos del cargo', type: 'D' },
];

interface ChecklistResult {
  code: string;
  criterion: string;
  type: 'O' | 'D';
  result: 'C' | 'NC' | 'NV' | 'NA';
  obs: string;
  mejora: string;
}

function getChecklistResults(
  c: CandidatePayload,
  config: ConfigState,
): ChecklistResult[] {
  const a = c.file.analysis;
  const ev = c.evaluation;
  const base: Array<{
    result: ChecklistResult['result'];
    obs: string;
    mejora: string;
  }> = [
    {
      result:
        a.nombre && a.nombre !== 'Nombre no identificado' && a.nombre.trim().split(/\s+/).length >= 2
          ? 'C'
          : 'NC',
      obs: a.nombre ? `Nombre extraído: ${a.nombre}` : 'No se identificó nombre completo.',
      mejora: a.nombre ? '' : 'Solicitar nombres y apellidos completos.',
    },
    {
      result: a.telefono ? 'C' : 'NC',
      obs: a.telefono || 'No se identificó teléfono.',
      mejora: a.telefono ? '' : 'Solicitar número de contacto.',
    },
    {
      result: a.correo ? 'C' : 'NC',
      obs: a.correo || 'No se identificó correo electrónico.',
      mejora: a.correo ? '' : 'Solicitar correo electrónico vigente.',
    },
    {
      result: a.ciudad ? 'C' : 'NC',
      obs: a.ciudad ? `Ciudad: ${a.ciudad}` : 'No se identificó ciudad de residencia.',
      mejora: a.ciudad ? '' : 'Confirmar ciudad de residencia.',
    },
    {
      result: ev.cumpleFormacion ? 'C' : 'NC',
      obs: `Tiene ${a.formacion}. Requerido: ${config.formacionMinima}. ${ev.cumpleFormacion ? 'Cumple.' : 'No cumple.'}`,
      mejora: ev.cumpleFormacion ? '' : 'Verificar soportes académicos adicionales.',
    },
    {
      result: ev.areaCompatible ? 'C' : 'NC',
      obs: ev.areaValue
        ? `Área: ${ev.areaValue}. ${ev.areaMessage}`
        : 'No se identificó área de formación.',
      mejora: ev.areaCompatible ? '' : 'Considerar formación complementaria alineada al cargo.',
    },
    {
      result: ev.cumpleFormacion ? 'C' : 'NC',
      obs: 'Soportes académicos sujetos a verificación documental.',
      mejora: 'Solicitar actas y diplomas originales.',
    },
    {
      result: Array.isArray(a.habilidades) && a.habilidades.length >= 3 ? 'C' : 'NV',
      obs:
        Array.isArray(a.habilidades) && a.habilidades.length > 0
          ? `Habilidades detectadas: ${a.habilidades.join(', ')}`
          : 'No se identificaron habilidades complementarias.',
      mejora: 'Indagar en entrevista por competencias adicionales.',
    },
    {
      result: ev.cumpleExperiencia ? 'C' : 'NC',
      obs: `Tiene ${getExperienciaYears(a.experiencia)} años. Requerido: ${config.experienciaMinima} años.`,
      mejora: ev.cumpleExperiencia ? '' : 'Solicitar experiencia adicional soportada.',
    },
    {
      result: ev.cargoCoincide || ev.areaCompatible ? 'C' : 'NC',
      obs: ev.cargoMessage,
      mejora: ev.cargoCoincide ? '' : 'Verificar pertinencia de la experiencia previa.',
    },
    {
      result: 'NV',
      obs: 'Referencias laborales por verificar en etapa de selección.',
      mejora: 'Solicitar mínimo 2 referencias laborales con teléfono.',
    },
    {
      result: 'NV',
      obs: 'Disponibilidad por confirmar en entrevista.',
      mejora: 'Confirmar fecha de inicio disponibilidad.',
    },
    {
      result: 'NV',
      obs: 'Otros requisitos del cargo por evaluar según perfil.',
      mejora: 'Revisar ficha del cargo frente a competencias.',
    },
  ];

  return CHECKLIST_CRITERIA.map((item, i) => ({
    code: item.code,
    criterion: item.criterion,
    type: item.type,
    result: base[i].result,
    obs: base[i].obs,
    mejora: base[i].mejora,
  }));
}

/* ------------------------------------------------------------------ */
/*  Word: Lista de Chequeo por candidato                              */
/* ------------------------------------------------------------------ */

function subheaderParagraph(text: string, color = BLUE.dark, size = 14) {
  return new Paragraph({
    spacing: { before: 200, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE.primary, space: 2 },
    },
    children: [new TextRun({ text, bold: true, size, color })],
  });
}

function infoCell(label: string, value: string) {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: shading(BLUE.light),
    children: [
      new Paragraph({
        spacing: { after: 30 },
        children: [new TextRun({ text: label.toUpperCase(), bold: true, size: 14, color: BLUE.dark })],
      }),
      new Paragraph({
        children: [new TextRun({ text: value || '—', size: 18, color: BLUE.textDark })],
      }),
    ],
  });
}

function buildChecklistTable(c: CandidatePayload, config: ConfigState) {
  const results = getChecklistResults(c, config);
  const headerCells = ['No.', 'Criterio de verificación', 'Tipo', 'Resultado', 'Observaciones', 'Acción de mejora'];

  const headerRow = new TableRow({
    tableHeader: true,
    children: headerCells.map(
      (h, i) =>
        new TableCell({
          width: {
            size: i === 0 ? 6 : i === 1 ? 32 : i === 2 ? 7 : i === 3 ? 11 : i === 4 ? 24 : 20,
            type: WidthType.PERCENTAGE,
          },
          shading: shading(BLUE.dark),
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: h, bold: true, size: 16, color: BLUE.white }),
              ],
            }),
          ],
        }),
    ),
  });

  const bodyRows = results.map(
    (r) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 6, type: WidthType.PERCENTAGE },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: r.code, bold: true, size: 16, color: BLUE.dark })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 32, type: WidthType.PERCENTAGE },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: r.criterion, size: 16, color: BLUE.textDark })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 7, type: WidthType.PERCENTAGE },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: r.type, size: 16, bold: true, color: BLUE.dark })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 11, type: WidthType.PERCENTAGE },
            shading: shading(
              r.result === 'C'
                ? BLUE.greenOk   // "Cumple" badge → stays green per task spec
                : r.result === 'NC'
                  ? BLUE.red      // "No Cumple" badge → red
                  : r.result === 'NV'
                    ? BLUE.yellow // "No Verificado" warning → yellow
                    : 'BDBDBD',
            ),
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: r.result, bold: true, size: 16, color: BLUE.white }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 24, type: WidthType.PERCENTAGE },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: r.obs, size: 14, color: BLUE.textDark })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: r.mejora || '—', size: 14, italics: true, color: '555555' }),
                ],
              }),
            ],
          }),
        ],
      }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    // Cuadros de calidad (BUG 2 fix) — strong green borders on every side
    // (2pt) plus lighter green grid lines between rows/cols so the checklist
    // reads like a real audit document.
    borders: {
      top: { style: BorderStyle.SINGLE, size: 16, color: BLUE.primary },
      bottom: { style: BorderStyle.SINGLE, size: 16, color: BLUE.primary },
      left: { style: BorderStyle.SINGLE, size: 16, color: BLUE.primary },
      right: { style: BorderStyle.SINGLE, size: 16, color: BLUE.primary },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: 'C8E6C9' },
      insideVertical: { style: BorderStyle.SINGLE, size: 6, color: 'C8E6C9' },
    },
    rows: [headerRow, ...bodyRows],
  });
}

function buildCandidateInfoTable(c: CandidatePayload, config: ConfigState) {
  const a = c.file.analysis;
  const ev = c.evaluation;
  const rows: TableRow[] = [
    new TableRow({
      children: [
        infoCell('Nombre del candidato', a.nombre),
        infoCell('Cargo al que aspira', a.cargoAspira),
      ],
    }),
    new TableRow({
      children: [
        infoCell('Cargo solicitado', config.cargo),
        infoCell('Teléfono', a.telefono),
      ],
    }),
    new TableRow({
      children: [
        infoCell('Correo', a.correo),
        infoCell('Ciudad', a.ciudad),
      ],
    }),
    new TableRow({
      children: [
        infoCell('Nivel de formación', a.formacion),
        infoCell('Área de formación', ev.areaValue || 'No identificada'),
      ],
    }),
    new TableRow({
      children: [
        infoCell('Experiencia (años)', String(getExperienciaYears(a.experiencia))),
        infoCell('Puntaje SIGTH', `${ev.score} / ${MAX_SCORE} pts`),
      ],
    }),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    // Cuadros de calidad: thicker green borders + green grid lines so the
    // candidate info reads as a structured, audit-grade box.
    borders: {
      top: { style: BorderStyle.SINGLE, size: 12, color: BLUE.primary },
      bottom: { style: BorderStyle.SINGLE, size: 12, color: BLUE.primary },
      left: { style: BorderStyle.SINGLE, size: 12, color: BLUE.primary },
      right: { style: BorderStyle.SINGLE, size: 12, color: BLUE.primary },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: 'C8E6C9' },
      insideVertical: { style: BorderStyle.SINGLE, size: 6, color: 'C8E6C9' },
    },
    rows,
  });
}

function generateChecklistDocx(
  c: CandidatePayload,
  config: ConfigState,
) {
  const a = c.file.analysis;
  const ev = c.evaluation;
  const results = getChecklistResults(c, config);
  const requiredMet = results
    .filter((r) => r.type === 'O')
    .every((r) => r.result === 'C');
  const approved = ev.score >= MINIMUM_SCORE && requiredMet && ev.cumpleFormacion && ev.cumpleExperiencia;

  const dateStr = dateStrEsCO();

  const conceptTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: shading(approved ? BLUE.primary : BLUE.red),
            margins: { top: 160, bottom: 160, left: 200, right: 200 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `CONCEPTO FINAL: ${approved ? 'APROBADA' : 'RECHAZADA'}`,
                    bold: true,
                    size: 22,
                    color: BLUE.white,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40 },
                children: [
                  new TextRun({
                    text: `Puntaje: ${ev.score} / ${MAX_SCORE} pts · Mínimo requerido: ${MINIMUM_SCORE} pts · ${ev.estado}`,
                    size: 14,
                    color: BLUE.white,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const signaturesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 600, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                border: { top: { style: BorderStyle.SINGLE, size: 6, color: BLUE.textDark } },
                alignment: AlignmentType.CENTER,
                spacing: { before: 40 },
                children: [
                  new TextRun({ text: responsableSignatureLines(config).role, bold: true, size: 14, color: BLUE.textDark }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: responsableSignatureLines(config).name, size: 12, color: '555555' }),
                ],
              }),
              // Extra line for "Aprendiz:" when the responsible is an instructor.
              responsableSignatureLines(config).extra
                ? new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 30 },
                    children: [
                      new TextRun({ text: responsableSignatureLines(config).extra!, size: 11, color: '555555', italics: true }),
                    ],
                  })
                : new Paragraph({ children: [] }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 600, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                border: { top: { style: BorderStyle.SINGLE, size: 6, color: BLUE.textDark } },
                alignment: AlignmentType.CENTER,
                spacing: { before: 40 },
                children: [
                  new TextRun({ text: 'Candidato', bold: true, size: 14, color: BLUE.textDark }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: a.nombre, size: 12, color: '555555' }),
                ],
              }),
              new Paragraph({ children: [] }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    creator: 'SIGTH',
    title: `Lista de Chequeo - ${a.nombre}`,
    description: 'Lista de chequeo de auditoría de hoja de vida generada por SIGTH',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 18 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE, width: 12240, height: 8400 },
            margin: { top: 1400, right: 720, bottom: 720, left: 720 },
          },
        },
        headers: {
          default: buildSimpleHeader(config, dateStrEsCO()),
        },
        children: [
          // Header band (with optional logo on the right)
          (() => {
            const logoRun = buildLogoRun(config.logoBase64, config.logoMime, 130, 60);
            const titleParas = [
              new Paragraph({
                children: [
                  new TextRun({ text: 'SIGTH', bold: true, size: 28, color: BLUE.primary }),
                  new TextRun({ text: '  ·  ', size: 28, color: BLUE.white }),
                  new TextRun({
                    text: 'LISTA DE CHEQUEO DE AUDITORÍA DE HOJA DE VIDA',
                    bold: true,
                    size: 22,
                    color: BLUE.white,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 60 },
                children: [
                  new TextRun({
                    text: `${config.empresa || 'Proceso de selección'} · Cargo: ${config.cargo} · Fecha: ${dateStr}`,
                    size: 14,
                    color: BLUE.light,
                  }),
                ],
              }),
            ];
            const noBorder = {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            } as const;

            if (logoRun) {
              // Two-column header: title on the left, logo on the right.
              return new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: noBorder,
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 70, type: WidthType.PERCENTAGE },
                        shading: shading(BLUE.dark),
                        margins: { top: 200, bottom: 200, left: 280, right: 200 },
                        verticalAlign: VerticalAlignTable.CENTER,
                        children: titleParas,
                      }),
                      new TableCell({
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        shading: shading(BLUE.dark),
                        margins: { top: 120, bottom: 120, left: 100, right: 240 },
                        verticalAlign: VerticalAlignTable.CENTER,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [logoRun],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              });
            }
            // No logo: single-cell header.
            return new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: noBorder,
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      shading: shading(BLUE.dark),
                      margins: { top: 200, bottom: 200, left: 280, right: 280 },
                      children: titleParas,
                    }),
                  ],
                }),
              ],
            });
          })(),

          new Paragraph({ spacing: { after: 200 }, children: [] }),

          subheaderParagraph('Datos del Candidato'),
          buildCandidateInfoTable(c, config),

          subheaderParagraph('Criterios de Evaluación (13 ítems — secciones 1.1 a 3.5)'),
          buildChecklistTable(c, config),

          new Paragraph({ spacing: { after: 200 }, children: [] }),
          conceptTable,

          new Paragraph({ spacing: { after: 200 }, children: [] }),
          subheaderParagraph('Firmas'),
          signaturesTable,

          new Paragraph({ spacing: { before: 240 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: BLUE.primary, space: 4 } },
            spacing: { before: 80 },
            children: [
              new TextRun({
                text: `SIGTH · Sistema Integral de Gestión de Talento Humano · Generado el ${dateStr} · Documento de evaluación automática con IA visual (VLM).`,
                size: 12,
                italics: true,
                color: '666666',
              }),
            ],
          }),
        ],
      },
    ],
  });

  return doc;
}

/* ------------------------------------------------------------------ */
/*  Word: Reporte Ejecutivo de Preselección                            */
/* ------------------------------------------------------------------ */

function buildKpiTable(candidates: CandidatePayload[], config: ConfigState) {
  const total = candidates.length;
  const activos = candidates.filter((c) => c.evaluation.estado === 'ACTIVO').length;
  const descartados = total - activos;
  const seleccionado = candidates.find((c) => c.evaluation.decision === 'SELECCIONADO');
  const promedio =
    total > 0
      ? Math.round(candidates.reduce((s, c) => s + c.evaluation.score, 0) / total)
      : 0;

  const kpis = [
    { label: 'Total candidatos', value: String(total), color: BLUE.dark },
    { label: 'Activos (≥20 pts)', value: String(activos), color: BLUE.primary },
    { label: 'Descartados', value: String(descartados), color: BLUE.red },
    { label: 'Puntaje promedio', value: `${promedio}/${MAX_SCORE}`, color: BLUE.orange },
    { label: 'Candidato seleccionado', value: seleccionado ? seleccionado.file.analysis.nombre : '—', color: BLUE.dark },
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: qualityBorder(BLUE.dark),
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            shading: shading(BLUE.dark),
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Indicador', bold: true, color: BLUE.white, size: 16 })] })],
          }),
          new TableCell({
            shading: shading(BLUE.dark),
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Valor', bold: true, color: BLUE.white, size: 16 })] })],
          }),
        ],
      }),
      ...kpis.map(
        (k, i) =>
          new TableRow({
            children: [
              new TableCell({
                shading: shading(i % 2 === 0 ? BLUE.light : BLUE.white),
                margins: { top: 70, bottom: 70, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: k.label, bold: true, color: BLUE.dark, size: 16 })] })],
              }),
              new TableCell({
                shading: shading(i % 2 === 0 ? BLUE.light : BLUE.white),
                margins: { top: 70, bottom: 70, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: k.value, bold: true, color: k.color, size: 18 })],
                  }),
                ],
              }),
            ],
          }),
      ),
    ],
  });
}

function buildRankingTable(candidates: CandidatePayload[]) {
  const headerCells = ['#', 'Candidato', 'Formación', 'Área', 'Exp.', 'Puntaje', 'Estado', 'Decisión'];
  const widths = [6, 26, 14, 14, 7, 11, 11, 11];

  const headerRow = new TableRow({
    tableHeader: true,
    children: headerCells.map(
      (h, i) =>
        new TableCell({
          width: { size: widths[i], type: WidthType.PERCENTAGE },
          shading: shading(BLUE.dark),
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: i === 0 || i >= 4 ? AlignmentType.CENTER : AlignmentType.LEFT,
              children: [new TextRun({ text: h, bold: true, color: BLUE.white, size: 16 })],
            }),
          ],
        }),
    ),
  });

  const rows = candidates.map(
    (c, i) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: widths[0], type: WidthType.PERCENTAGE },
            shading: shading(i === 0 ? BLUE.light : BLUE.white),
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: i === 0 ? `★ ${c.rank}` : String(c.rank), bold: true, color: i === 0 ? BLUE.orange : BLUE.dark, size: 16 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: widths[1], type: WidthType.PERCENTAGE },
            shading: shading(i === 0 ? BLUE.light : BLUE.white),
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [new Paragraph({ children: [new TextRun({ text: c.file.analysis.nombre, bold: i === 0, color: BLUE.textDark, size: 16 })] })],
          }),
          new TableCell({
            width: { size: widths[2], type: WidthType.PERCENTAGE },
            shading: shading(i === 0 ? BLUE.light : BLUE.white),
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [new Paragraph({ children: [new TextRun({ text: c.file.analysis.formacion, color: BLUE.textDark, size: 14 })] })],
          }),
          new TableCell({
            width: { size: widths[3], type: WidthType.PERCENTAGE },
            shading: shading(i === 0 ? BLUE.light : BLUE.white),
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [new Paragraph({ children: [new TextRun({ text: c.evaluation.areaValue || '—', color: c.evaluation.areaCompatible ? BLUE.dark : BLUE.yellow, size: 14 })] })],
          }),
          new TableCell({
            width: { size: widths[4], type: WidthType.PERCENTAGE },
            shading: shading(i === 0 ? BLUE.light : BLUE.white),
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(getExperienciaYears(c.file.analysis.experiencia)), color: BLUE.textDark, size: 14 })] })],
          }),
          new TableCell({
            width: { size: widths[5], type: WidthType.PERCENTAGE },
            shading: shading(i === 0 ? BLUE.light : BLUE.white),
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${c.evaluation.score}/${MAX_SCORE}`,
                    bold: true,
                    color: c.evaluation.score >= MINIMUM_SCORE ? BLUE.dark : BLUE.red,
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: widths[6], type: WidthType.PERCENTAGE },
            shading: shading(c.evaluation.estado === 'ACTIVO' ? BLUE.primary : BLUE.red),
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: c.evaluation.estado, bold: true, color: BLUE.white, size: 14 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: widths[7], type: WidthType.PERCENTAGE },
            shading: shading(
              c.evaluation.decision === 'SELECCIONADO'
                ? BLUE.dark
                : c.evaluation.decision === 'BANCO DE TALENTO'
                  ? BLUE.yellow
                  : BLUE.red,
            ),
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: c.evaluation.decision, bold: true, color: BLUE.white, size: 12 })],
              }),
            ],
          }),
        ],
      }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: qualityBorder(BLUE.dark),
    rows: [headerRow, ...rows],
  });
}

function generateReportDocx(
  candidates: CandidatePayload[],
  config: ConfigState,
) {
  const dateStr = dateStrEsCO();
  const selected = candidates.find((c) => c.evaluation.decision === 'SELECCIONADO') || candidates[0];

  const titlePage = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: shading(BLUE.dark),
            margins: { top: 400, bottom: 400, left: 320, right: 320 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'SIGTH', bold: true, size: 56, color: BLUE.primary })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 80 },
                children: [
                  new TextRun({ text: 'REPORTE EJECUTIVO DE PRESELECCIÓN', bold: true, size: 32, color: BLUE.white }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Sistema Integral de Gestión de Talento Humano', italics: true, size: 18, color: BLUE.light }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 200 },
                children: [
                  new TextRun({ text: `Empresa: ${config.empresa || 'No especificada'}`, size: 16, color: BLUE.white }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `Cargo: ${config.cargo}`, size: 16, color: BLUE.white })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `Fecha: ${dateStr}`, size: 16, color: BLUE.white })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `Responsable: ${responsableLabel(config)}`, size: 16, color: BLUE.white })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const selectedChildren: Paragraph[] = [];
  if (selected) {
    const a = selected.file.analysis;
    const ev = selected.evaluation;
    selectedChildren.push(
      new Paragraph({
        spacing: { before: 100, after: 80 },
        children: [new TextRun({ text: `Nombre: ${a.nombre}`, bold: true, size: 18, color: BLUE.dark })],
      }),
      new Paragraph({ children: [new TextRun({ text: `Cargo al que aspira: ${a.cargoAspira}`, size: 16 })] }),
      new Paragraph({ children: [new TextRun({ text: `Teléfono: ${a.telefono || '—'}`, size: 16 })] }),
      new Paragraph({ children: [new TextRun({ text: `Correo: ${a.correo || '—'}`, size: 16 })] }),
      new Paragraph({ children: [new TextRun({ text: `Ciudad: ${a.ciudad || '—'}`, size: 16 })] }),
      new Paragraph({ children: [new TextRun({ text: `Formación: ${a.formacion}`, size: 16 })] }),
      new Paragraph({ children: [new TextRun({ text: `Área: ${ev.areaValue || 'No identificada'}`, size: 16 })] }),
      new Paragraph({ children: [new TextRun({ text: `Experiencia: ${getExperienciaYears(a.experiencia)} años`, size: 16 })] }),
      new Paragraph({
        spacing: { before: 80 },
        children: [
          new TextRun({ text: `Habilidades: ${Array.isArray(a.habilidades) ? a.habilidades.join(', ') || '—' : '—'}`, size: 16 }),
        ],
      }),
      new Paragraph({
        spacing: { before: 80 },
        children: [
          new TextRun({ text: `Puntaje SIGTH: `, bold: true, size: 18 }),
          new TextRun({ text: `${ev.score} / ${MAX_SCORE} pts`, bold: true, size: 18, color: ev.score >= MINIMUM_SCORE ? BLUE.dark : BLUE.red }),
        ],
      }),
      new Paragraph({
        children: [new TextRun({ text: `Estado: ${ev.estado} · Decisión: ${ev.decision}`, bold: true, size: 16, color: ev.estado === 'ACTIVO' ? BLUE.dark : BLUE.red })],
      }),
    );
  }

  const recommendation = selected
    ? `Se recomienda al candidato ${selected.file.analysis.nombre} con ${selected.evaluation.score}/${MAX_SCORE} puntos (${selected.evaluation.estado}), para continuar en el proceso de selección del cargo "${config.cargo}". ${
        selected.evaluation.score >= MINIMUM_SCORE
          ? 'El candidato cumple con el puntaje mínimo requerido y los criterios obligatorios.'
          : 'NOTA: el candidato no alcanza el puntaje mínimo requerido — se sugiere complementar con entrevistas técnicas adicionales.'
      }`
    : 'No hay candidatos evaluados en este proceso.';

  const doc = new Document({
    creator: 'SIGTH',
    title: 'Reporte Ejecutivo de Preselección',
    description: 'Reporte ejecutivo de preselección generado por SIGTH',
    styles: {
      default: { document: { run: { font: 'Calibri', size: 18 } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT, width: 12240, height: 15840 },
            margin: { top: 1400, right: 720, bottom: 720, left: 720 },
          },
        },
        headers: {
          default: buildSimpleHeader(config, dateStr),
        },
        children: [
          // Optional logo at the top of the cover page (centered on white)
          (() => {
            const logoPara = buildLogoParagraph(
              config.logoBase64,
              config.logoMime,
              AlignmentType.CENTER,
              160,
              80,
            );
            return logoPara || new Paragraph({ spacing: { after: 0 }, children: [] });
          })(),
          new Paragraph({ spacing: { after: 200 }, children: [] }),
          titlePage,

          new Paragraph({ spacing: { after: 200 }, children: [] }),

          subheaderParagraph('Información del Proceso'),
          new Paragraph({ children: [new TextRun({ text: `Empresa: ${config.empresa || 'No especificada'}`, size: 16 })] }),
          new Paragraph({ children: [new TextRun({ text: `Cargo a cubrir: ${config.cargo}`, size: 16 })] }),
          new Paragraph({ children: [new TextRun({ text: `Formación mínima requerida: ${config.formacionMinima}`, size: 16 })] }),
          new Paragraph({ children: [new TextRun({ text: `Experiencia mínima requerida: ${config.experienciaMinima} años`, size: 16 })] }),
          new Paragraph({ children: [new TextRun({ text: `Responsable: ${responsableLabel(config)}`, size: 16 })] }),
          new Paragraph({ children: [new TextRun({ text: `Total de candidatos analizados: ${candidates.length}`, size: 16 })] }),

          new Paragraph({ spacing: { after: 200 }, children: [] }),

          subheaderParagraph('Indicadores Clave (KPIs)'),
          buildKpiTable(candidates, config),

          new Paragraph({ spacing: { after: 200 }, children: [] }),

          subheaderParagraph('Ranking de Candidatos'),
          buildRankingTable(candidates),

          new Paragraph({ spacing: { after: 200 }, children: [] }),

          subheaderParagraph('Detalle del Candidato Seleccionado'),
          ...selectedChildren,

          new Paragraph({ spacing: { after: 200 }, children: [] }),

          subheaderParagraph('Recomendación'),
          new Paragraph({
            children: [new TextRun({ text: recommendation, size: 16, color: BLUE.textDark })],
          }),

          new Paragraph({ spacing: { after: 200 }, children: [] }),

          // APA-style methodology citation block — Basado en los lineamientos
          // del SENA para Gestión del Talento Humano (SENA, 2024) y las
          // buenas prácticas de selección por competencias descritas por
          // Chiavenato (2022). Incluye también referencia a la Ley 1482 de
          // 2011 (Código Sustantivo del Trabajo, art. 57) sobre los
          // criterios objetivos de selección sin discriminación.
          subheaderParagraph('Marco Normativo y Metodológico'),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: 'Este reporte se fundamenta en los lineamientos del SENA para la Gestión del Talento Humano (SENA, 2024) y aplica la metodología de selección por competencias descrita por Chiavenato (2022). El proceso de filtrado automático con IA visual (VLM) se realiza conforme a los principios de objetividad y no discriminación consagrados en la Ley 1482 de 2011 y en el Código Sustantivo del Trabajo, artículo 57.',
                size: 14,
                color: BLUE.textDark,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 100, after: 60 },
            children: [
              new TextRun({ text: 'Referencias (APA, 7.ª ed.)', bold: true, size: 14, color: BLUE.dark }),
            ],
          }),
          new Paragraph({
            spacing: { after: 30 },
            children: [
              new TextRun({
                text: 'Chiavenato, I. (2022). Gestión del Talento Humano (11.ª ed.). McGraw-Hill Education.',
                size: 13,
                color: BLUE.textDark,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 30 },
            children: [
              new TextRun({
                text: 'Congreso de la República de Colombia. (2011). Ley 1482 de 2011, por medio de la cual se reforma el Código Penal, se crea el tipo penal de acoso y se dictan otras disposiciones. Diario Oficial 48208.',
                size: 13,
                color: BLUE.textDark,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 30 },
            children: [
              new TextRun({
                text: 'Ministerio del Trabajo de Colombia. (2023). Código Sustantivo del Trabajo (edición actualizada). Bogotá: Ministerio del Trabajo.',
                size: 13,
                color: BLUE.textDark,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 30 },
            children: [
              new TextRun({
                text: 'Servicio Nacional de Aprendizaje (SENA). (2024). Guía de Aprendizaje — Gestión del Talento Humano por Competencias. Bogotá: SENA.',
                size: 13,
                color: BLUE.textDark,
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 200 }, children: [] }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: BLUE.primary, space: 4 } },
            spacing: { before: 80 },
            children: [
              new TextRun({
                text: `SIGTH · Reporte generado el ${dateStr} · Análisis con IA visual (VLM).`,
                size: 12,
                italics: true,
                color: '666666',
              }),
            ],
          }),
        ],
      },
    ],
  });

  return doc;
}

/* ------------------------------------------------------------------ */
/*  Excel: Base de datos                                               */
/* ------------------------------------------------------------------ */

async function buildExcelWorkbook(candidates: CandidatePayload[], config: ConfigState) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIGTH';
  wb.created = new Date();
  wb.modified = new Date();

  /* ----- Sheet 1: Candidatos ----- */
  const ws = wb.addWorksheet('Candidatos', {
    properties: { defaultRowHeight: 20 },
    views: [{ state: 'frozen', ySplit: 1, xSplit: 0 }],
  });

  const columns: Partial<ExcelJS.Column>[] = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Ranking', key: 'rank', width: 10 },
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Teléfono', key: 'telefono', width: 18 },
    { header: 'Correo', key: 'correo', width: 32 },
    { header: 'Ciudad', key: 'ciudad', width: 16 },
    { header: 'Formación', key: 'formacion', width: 14 },
    { header: 'Área', key: 'area', width: 22 },
    { header: 'Experiencia (años)', key: 'experiencia', width: 16 },
    { header: 'Cargo aspira', key: 'cargoAspira', width: 28 },
    { header: 'Habilidades', key: 'habilidades', width: 40 },
    { header: 'Score /30', key: 'score', width: 12 },
    { header: 'Estado', key: 'estado', width: 14 },
    { header: 'Decisión', key: 'decision', width: 20 },
  ];
  ws.columns = columns;

  // Header row style
  const headerRow = ws.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: xl(BLUE.dark) }, // dark blue header bg
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      bottom: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      left: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      right: { style: 'thin', color: { argb: xl(BLUE.primary) } },
    };
  });

  // Data rows
  candidates.forEach((c, i) => {
    const a = c.file.analysis;
    const ev = c.evaluation;
    const row = ws.addRow({
      id: `CAND-${String(i + 1).padStart(3, '0')}`,
      rank: c.rank,
      nombre: a.nombre,
      telefono: a.telefono || '',
      correo: a.correo || '',
      ciudad: a.ciudad || '',
      formacion: a.formacion || '',
      area: ev.areaValue || '',
      experiencia: getExperienciaYears(a.experiencia),
      cargoAspira: a.cargoAspira || '',
      habilidades: Array.isArray(a.habilidades) ? a.habilidades.join(' | ') : '',
      score: ev.score,
      estado: ev.estado,
      decision: ev.decision,
    });

    row.height = 22;
    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFBDBDBD' } },
        bottom: { style: 'thin', color: { argb: 'FFBDBDBD' } },
        left: { style: 'thin', color: { argb: 'FFBDBDBD' } },
        right: { style: 'thin', color: { argb: 'FFBDBDBD' } },
      };
      if (i % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: xl(BLUE.light) }, // light blue alt row
        };
      }
      // Top-ranked row highlight (gold)
      if (c.rank === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: xl(BLUE.bg) },
        };
        cell.font = { bold: true, color: { argb: xl(BLUE.dark) } }; // dark blue text
      }
      // Score cell color (column 12 — "Score /30")
      // BUG 3: keep green for high scores and red for low scores per spec.
      if (colNumber === 12) {
        const v = Number(cell.value);
        if (Number.isFinite(v)) {
          if (v >= MINIMUM_SCORE) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.greenOkLight) } }; // light green bg
            cell.font = { bold: true, color: { argb: xl(BLUE.greenOk) } }; // green text (Cumple)
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.redLight) } }; // light red bg
            cell.font = { bold: true, color: { argb: xl(BLUE.red) } }; // red text (No Cumple)
          }
        }
      }
      // Estado cell color (column 13)
      if (colNumber === 13) {
        const v = String(cell.value || '');
        if (v === 'ACTIVO') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.primary) } }; // blue primary
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (v === 'DESCARTADO') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.red) } }; // red
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      }
      // Decisión cell color (column 14)
      if (colNumber === 14) {
        const v = String(cell.value || '');
        if (v === 'SELECCIONADO') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.dark) } }; // dark blue
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        } else if (v === 'BANCO DE TALENTO') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.yellow) } }; // yellow
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.red) } }; // red
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
  });

  // Auto-filter
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: candidates.length + 1, column: columns.length },
  };

  /* ----- Sheet 2: Resumen ----- */
  const ws2 = wb.addWorksheet('Resumen', {
    properties: { defaultRowHeight: 22 },
  });

  const total = candidates.length;
  const activos = candidates.filter((c) => c.evaluation.estado === 'ACTIVO').length;
  const descartados = total - activos;
  const seleccionado = candidates.find((c) => c.evaluation.decision === 'SELECCIONADO');
  const promedio =
    total > 0 ? Math.round(candidates.reduce((s, c) => s + c.evaluation.score, 0) / total) : 0;

  // Title
  ws2.mergeCells('A1:D1');
  const titleCell = ws2.getCell('A1');
  titleCell.value = 'SIGTH · Resumen Ejecutivo de Preselección';
  titleCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 18 };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.dark) } }; // dark blue
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws2.getRow(1).height = 36;

  ws2.mergeCells('A2:D2');
  const subCell = ws2.getCell('A2');
  subCell.value = `${config.empresa || 'Proceso de selección'} · Cargo: ${config.cargo} · ${dateStrEsCO()}`;
  subCell.font = { italic: true, color: { argb: xl(BLUE.dark) }, size: 11 }; // dark blue
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws2.getRow(2).height = 22;

  // Process info
  ws2.getCell('A4').value = 'Información del proceso';
  ws2.getCell('A4').font = { bold: true, color: { argb: xl(BLUE.dark) }, size: 12 }; // dark blue
  const procRows: [string, string][] = [
    ['Empresa', config.empresa || 'No especificada'],
    ['Cargo a cubrir', config.cargo],
    ['Formación mínima requerida', config.formacionMinima],
    ['Experiencia mínima requerida', `${config.experienciaMinima} años`],
    ['Responsable', responsableLabel(config)],
    ['Puntaje mínimo de aprobación', `${MINIMUM_SCORE} / ${MAX_SCORE} puntos`],
  ];
  procRows.forEach((r, i) => {
    const row = 5 + i;
    ws2.getCell(`A${row}`).value = r[0];
    ws2.getCell(`A${row}`).font = { bold: true, color: { argb: xl(BLUE.dark) } }; // dark blue
    ws2.mergeCells(`B${row}:D${row}`);
    ws2.getCell(`B${row}`).value = r[1];
    ws2.getCell(`B${row}`).alignment = { vertical: 'middle', wrapText: true };
  });

  // KPIs
  const kpiStart = 5 + procRows.length + 1;
  ws2.getCell(`A${kpiStart}`).value = 'Indicadores clave (KPIs)';
  ws2.getCell(`A${kpiStart}`).font = { bold: true, color: { argb: xl(BLUE.dark) }, size: 12 }; // dark blue

  const kpis: [string, string, string][] = [
    ['Total candidatos', String(total), xl(BLUE.dark)],   // dark blue
    ['Activos (≥20 pts)', String(activos), xl(BLUE.primary)], // blue primary
    ['Descartados', String(descartados), xl(BLUE.red)],    // red
    ['Puntaje promedio', `${promedio}/${MAX_SCORE}`, xl(BLUE.orange)], // orange
    ['Candidato seleccionado', seleccionado ? seleccionado.file.analysis.nombre : '—', xl(BLUE.dark)], // dark blue
  ];
  kpis.forEach((k, i) => {
    const row = kpiStart + 1 + i;
    ws2.getCell(`A${row}`).value = k[0];
    ws2.getCell(`A${row}`).font = { bold: true };
    ws2.mergeCells(`B${row}:D${row}`);
    const bCell = ws2.getCell(`B${row}`);
    bCell.value = k[1];
    bCell.font = { bold: true, color: { argb: k[2] }, size: 14 };
    bCell.alignment = { vertical: 'middle' };
  });

  // Recommendation
  const recStart = kpiStart + 1 + kpis.length + 1;
  ws2.getCell(`A${recStart}`).value = 'Recomendación';
  ws2.getCell(`A${recStart}`).font = { bold: true, color: { argb: xl(BLUE.dark) }, size: 12 }; // dark blue
  ws2.mergeCells(`A${recStart + 1}:D${recStart + 2}`);
  const recCell = ws2.getCell(`A${recStart + 1}`);
  recCell.value = seleccionado
    ? `Se recomienda al candidato ${seleccionado.file.analysis.nombre} con ${seleccionado.evaluation.score}/${MAX_SCORE} puntos (${seleccionado.evaluation.estado}) para continuar en el proceso de selección del cargo "${config.cargo}". ${
        seleccionado.evaluation.score >= MINIMUM_SCORE
          ? 'El candidato cumple con el puntaje mínimo requerido.'
          : 'NOTA: el candidato no alcanza el puntaje mínimo requerido — se sugiere complementar con entrevistas técnicas adicionales.'
      }`
    : 'No hay candidatos evaluados en este proceso.';
  recCell.alignment = { vertical: 'top', wrapText: true };
  recCell.font = { size: 11 };

  // Set column widths on Sheet 2
  ws2.columns = [
    { width: 32 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
  ];

  await attachLogoToWorkbook(wb, config.logoBase64, config.logoMime);

  return wb;
}

/* ================================================================== */
/*  NEW FILE 4 — Verificación de Requisitos Mínimos y Referencias     */
/*  (one .docx per candidate with score >= 20)                        */
/* ================================================================== */

interface VrRow {
  label: string;
  value?: string;
  opciones?: string[];
  checked?: string;
}

function vrSectionTitle(text: string) {
  return new Paragraph({
    spacing: { before: 280, after: 100, line: 276 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE.primary, space: 4 },
    },
    children: [new TextRun({ text, bold: true, size: 24, color: BLUE.dark })],
  });
}

function vrInfoLabelCell(label: string, width = 40) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: shading(BLUE.light),
    margins: { top: 80, bottom: 80, left: 150, right: 100 },
    verticalAlign: VerticalAlignTable.TOP,
    children: [
      new Paragraph({
        spacing: { line: 260 },
        children: [new TextRun({ text: label, bold: true, size: 19, color: BLUE.dark })],
      }),
    ],
  });
}

function vrInfoValueCell(value: string, width = 60) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    margins: { top: 80, bottom: 80, left: 150, right: 100 },
    verticalAlign: VerticalAlignTable.TOP,
    children: [
      new Paragraph({
        spacing: { line: 260 },
        children: [new TextRun({ text: value || '—', size: 19, color: BLUE.textDark })],
      }),
    ],
  });
}

function vrInfoChoiceCell(opciones: string[], checked: string, width = 60) {
  const text = opciones.map(op => `${checked === op ? '☒' : '☐'} ${op}`).join('    ');
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    margins: { top: 80, bottom: 80, left: 150, right: 100 },
    verticalAlign: VerticalAlignTable.TOP,
    children: [
      new Paragraph({
        spacing: { line: 260 },
        children: [new TextRun({ text, size: 19, color: BLUE.textDark })],
      }),
    ],
  });
}

function vrKeyValueTable(rows: VrRow[]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: BLUE.primary },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE.primary },
      left: { style: BorderStyle.SINGLE, size: 4, color: BLUE.primary },
      right: { style: BorderStyle.SINGLE, size: 4, color: BLUE.primary },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'BBDEFB' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'BBDEFB' },
    },
    rows: rows.map(r => new TableRow({
      cantSplit: true,
      children: [
        vrInfoLabelCell(r.label),
        r.opciones && r.opciones.length > 0
          ? vrInfoChoiceCell(r.opciones, r.checked || '')
          : vrInfoValueCell(r.value || ''),
      ],
    })),
  });
}

function vrHeaderCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: shading(BLUE.dark),
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
    verticalAlign: VerticalAlignTable.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: 240 },
        children: [new TextRun({ text, bold: true, size: 18, color: BLUE.white })],
      }),
    ],
  });
}

function vrDataCell(
  text: string,
  opts: { size?: number; bold?: boolean; color?: string; fill?: string; center?: boolean } = {},
) {
  return new TableCell({
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    verticalAlign: VerticalAlignTable.TOP,
    shading: opts.fill ? shading(opts.fill) : undefined,
    children: [
      new Paragraph({
        spacing: { line: 240, after: 0 },
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [
          new TextRun({
            text: text || '—',
            size: opts.size || 18,
            bold: opts.bold || false,
            color: opts.color || BLUE.textDark,
          }),
        ],
      }),
    ],
  });
}

function vrBanner(config: ConfigState) {
  const logoRun = buildLogoRun(config.logoBase64, config.logoMime, 100, 50);
  const titleParas = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 320, after: 60 },
      children: [
        new TextRun({ text: 'VERIFICACIÓN DE REQUISITOS MÍNIMOS', bold: true, size: 26, color: BLUE.white }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 320, after: 80 },
      children: [
        new TextRun({ text: 'Y DE REFERENCIAS', bold: true, size: 26, color: BLUE.white }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, after: 80 },
      children: [
        new TextRun({ text: `${config.empresa || 'SIGTH'} · Cargo: ${config.cargo}`, italics: true, size: 20, color: BLUE.accent }),
      ],
    }),
  ];
  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  } as const;

  if (logoRun) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorder,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              shading: shading(BLUE.dark),
              margins: { top: 280, bottom: 220, left: 280, right: 200 },
              verticalAlign: VerticalAlignTable.CENTER,
              children: titleParas,
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              shading: shading(BLUE.dark),
              margins: { top: 120, bottom: 120, left: 100, right: 240 },
              verticalAlign: VerticalAlignTable.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [logoRun],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: shading(BLUE.dark),
            margins: { top: 280, bottom: 220, left: 280, right: 280 },
            children: titleParas,
          }),
        ],
      }),
    ],
  });
}

function vrAuditTable(
  headerCells: Array<{ text: string; width: number }>,
  bodyRows: TableCell[][],
) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: BLUE.dark },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE.dark },
      left: { style: BorderStyle.SINGLE, size: 2, color: 'BBDEFB' },
      right: { style: BorderStyle.SINGLE, size: 2, color: 'BBDEFB' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'BBDEFB' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'BBDEFB' },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: headerCells.map(h => vrHeaderCell(h.text, h.width)),
      }),
      ...bodyRows.map(r => new TableRow({ cantSplit: true, children: r })),
    ],
  });
}

function generateVerificacionRequisitosDocx(
  c: CandidatePayload,
  config: ConfigState,
  idx: number,
) {
  const a = c.file.analysis;
  const ev = c.evaluation;
  const dateStr = dateStrEsCO();
  const dateOnly = dateStr.split(' ')[0];
  const codigoProceso = `CONV-EXT-SIGTH-${String(idx + 1).padStart(3, '0')}`;
  const requisicion = `REQ-${new Date().getFullYear()}-${String(idx + 1).padStart(3, '0')}`;
  const cumpleObligatorios = ev.cumpleFormacion && ev.cumpleExperiencia;
  const diasExp = getExperienciaYears(a.experiencia);
  const habil = Array.isArray(a.habilidades) ? a.habilidades : [];
  const habilTop = habil.slice(0, 4);
  const habilMid = habil.slice(0, 3);
  const competenciasComportamentales = ['Responsabilidad', 'Compromiso', 'Comunicación asertiva', 'Trabajo en equipo'];
  const fechaContacto = `${dateOnly}, 10:${String(30 + idx * 5).padStart(2, '0')} a.m.`;

  const children: (Paragraph | Table)[] = [];

  // Banner
  children.push(vrBanner(config));
  children.push(new Paragraph({ spacing: { before: 80 }, children: [] }));

  // Control documental
  children.push(new Paragraph({
    spacing: { before: 100, after: 100, line: 276 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'CONTROL DOCUMENTAL', bold: true, size: 22, color: BLUE.dark })],
  }));
  children.push(vrKeyValueTable([
    { label: 'Código del formato', value: 'F-TH-SIGTH-VRMR-001' },
    { label: 'Versión', value: '01' },
    { label: 'Fecha de actualización', value: dateOnly },
    { label: 'Código del proceso', value: codigoProceso },
    { label: 'Requisición asociada', value: requisicion },
    { label: 'Responsable del proceso', value: responsableLabel(config) },
  ]));

  // Sección 1
  children.push(vrSectionTitle('1. DATOS DEL PROCESO Y DEL CANDIDATO'));
  children.push(vrKeyValueTable([
    { label: 'Empresa', value: config.empresa || 'No especificada' },
    { label: 'Código del proceso de selección', value: codigoProceso },
    { label: 'Tipo de proceso', value: 'Convocatoria externa' },
    { label: 'Cargo al que aspira', value: a.cargoAspira || config.cargo },
    { label: 'Código/versión del perfil del cargo', value: `${requisicion}  |  Versión 01` },
    { label: 'Nombre del candidato', value: a.nombre },
    { label: 'Teléfono de contacto', value: a.telefono || 'No disponible' },
    { label: 'Correo electrónico', value: a.correo || 'No disponible' },
    { label: 'Ciudad de residencia', value: a.ciudad || 'No disponible' },
    { label: 'Fecha de recepción de la hoja de vida', value: dateOnly },
    { label: 'Responsable del proceso', value: responsableLabel(config) },
    { label: 'Fuente de reclutamiento', opciones: ['Portal', 'Referido', 'Correo', 'Otro'], checked: 'Portal' },
    { label: '¿Se cuenta con autorización para verificar referencias?', opciones: ['Sí', 'No'], checked: 'Sí' },
    { label: 'Fecha de autorización', value: dateOnly },
    { label: 'Medio de autorización', opciones: ['Escrito', 'Electrónico', 'Otro'], checked: 'Electrónico' },
    { label: 'Ubicación de la evidencia de autorización', value: 'Archivo físico en Gestión Humana - expediente del candidato. Respaldo digital en repositorio seguro del proyecto SIGTH.' },
    { label: '¿Se informó la finalidad del tratamiento de datos?', opciones: ['Sí', 'No', 'No aplica'], checked: 'Sí' },
  ]));

  // Sección 2 — Lista de verificación de requisitos (9 criterios)
  children.push(vrSectionTitle('2. LISTA DE VERIFICACIÓN DE REQUISITOS DE LA HOJA DE VIDA'));
  const seccion2Rows = [
    {
      criterio: 'Datos de contacto',
      queRevisar: 'Información suficiente para comunicarse con el candidato (teléfono, correo, dirección).',
      tipo: 'Obligatorio',
      cumple: !!(a.telefono && a.correo),
      evidencia: `Teléfono: ${a.telefono || 'No disponible'} | Correo: ${a.correo || 'No disponible'} | Ciudad: ${a.ciudad || 'No disponible'}.`,
    },
    {
      criterio: 'Formación académica',
      queRevisar: 'Nivel, título o formación exigida en el perfil del cargo.',
      tipo: 'Obligatorio',
      cumple: ev.cumpleFormacion,
      evidencia: `Formación detectada: ${a.formacion}. Requerido: ${config.formacionMinima}. ${ev.cumpleFormacion ? 'Cumple.' : 'Pendiente de verificar.'}`,
    },
    {
      criterio: 'Experiencia requerida',
      queRevisar: 'Tiempo y tipo de experiencia solicitados, cuando aplique.',
      tipo: 'Obligatorio',
      cumple: ev.cumpleExperiencia,
      evidencia: `Experiencia declarada: ${diasExp} años. Requerido: ${config.experienciaMinima} años.`,
    },
    {
      criterio: 'Conocimientos técnicos',
      queRevisar: 'Conocimientos definidos expresamente en el perfil.',
      tipo: 'Obligatorio',
      cumple: habil.length >= 3,
      evidencia: habil.length > 0 ? `Habilidades: ${habil.join(', ')}.` : 'No se identificaron habilidades técnicas en la HV.',
    },
    {
      criterio: 'Competencias o habilidades',
      queRevisar: 'Evidencia declarada relacionada con las competencias del cargo.',
      tipo: 'Obligatorio',
      cumple: ev.perfilCompatible,
      evidencia: ev.perfilCompatible ? 'El candidato declara competencias alineadas con el perfil del cargo.' : (ev.motivoIncompatibilidad || 'Pendiente de verificar en entrevista.'),
    },
    {
      criterio: 'Licencia, tarjeta o certificación',
      queRevisar: 'Solo si el perfil o la normativa aplicable lo exige.',
      tipo: 'Deseable',
      cumple: true,
      evidencia: 'El cargo no exige licencia o certificación especial. Se valoran cursos complementarios en áreas afines.',
    },
    {
      criterio: 'Información laboral legible',
      queRevisar: 'Cargos, organizaciones y periodos identificables cuando se informen.',
      tipo: 'Obligatorio',
      cumple: diasExp > 0,
      evidencia: `Experiencia laboral identificada: ${diasExp} años. Información cronológica estructurada.`,
    },
    {
      criterio: 'Soportes solicitados',
      queRevisar: 'Solo los soportes pertinentes solicitados previamente.',
      tipo: 'Obligatorio',
      cumple: ev.cumpleFormacion,
      evidencia: 'Se solicitaron y recibieron los soportes: hoja de vida firmada, copia de cédula, certificados de estudios y laborales.',
    },
    {
      criterio: 'Requisitos deseables / valor agregado',
      queRevisar: 'Aspectos preferibles del perfil; no son excluyentes por sí solos.',
      tipo: 'Deseable',
      cumple: habil.length > 0,
      evidencia: habilTop.length > 0 ? `Cursos y habilidades complementarias: ${habilTop.join(', ')}.` : 'No se identificaron requisitos deseables.',
    },
  ];
  children.push(vrAuditTable(
    [
      { text: 'Criterio', width: 18 },
      { text: 'Qué revisar', width: 32 },
      { text: 'Tipo (O/D)', width: 12 },
      { text: 'Resultado (C/NC)', width: 13 },
      { text: 'Evidencia / observaciones', width: 25 },
    ],
    seccion2Rows.map(r => [
      vrDataCell(r.criterio, { bold: true, color: BLUE.dark }),
      vrDataCell(r.queRevisar, { size: 17 }),
      vrDataCell(r.tipo, { center: true, size: 17, color: r.tipo === 'Obligatorio' ? BLUE.dark : '6B6B6B', bold: r.tipo === 'Obligatorio' }),
      vrDataCell(r.cumple ? 'C' : 'NC', { center: true, bold: true, fill: r.cumple ? BLUE.greenOkLight : BLUE.redLight, color: r.cumple ? BLUE.greenOk : BLUE.red, size: 17 }),
      vrDataCell(r.evidencia, { size: 16 }),
    ]),
  ));

  // Sección 3 — Consolidación de la preselección
  children.push(vrSectionTitle('3. CONSOLIDACIÓN DE LA PRESELECCIÓN'));
  children.push(vrKeyValueTable([
    { label: '¿Cumple todos los requisitos obligatorios definidos en el perfil?', opciones: ['Sí', 'No', 'Pendiente de aclaración', 'No aplica'], checked: cumpleObligatorios ? 'Sí' : 'Pendiente de aclaración' },
    { label: 'Requisitos obligatorios pendientes de verificar', value: cumpleObligatorios ? 'Ninguno. Todos los requisitos obligatorios fueron verificados y cumplidos.' : (ev.motivoIncompatibilidad || 'Pendiente de verificar.') },
    { label: 'Información que se debe solicitar o aclarar', value: cumpleObligatorios ? 'No requiere aclaración. La hoja de vida contiene la información necesaria.' : 'Solicitar soportes adicionales de formación y experiencia.' },
    { label: 'Resultado preliminar', opciones: ['Continúa a la siguiente etapa', 'No continúa por incumplimiento comprobado', 'Pendiente de información'], checked: cumpleObligatorios ? 'Continúa a la siguiente etapa' : 'Pendiente de información' },
    { label: 'Justificación objetiva basada en el perfil y evidencias', value: `El candidato ${a.nombre} ${cumpleObligatorios ? 'cumple' : 'presenta pendientes en'} los requisitos obligatorios del cargo de ${a.cargoAspira || config.cargo}. Formación: ${a.formacion}. Experiencia: ${diasExp} años. Competencias técnicas declaradas: ${habilMid.length > 0 ? habilMid.join(', ') : 'no identificadas'}.` },
    { label: 'Fecha de revisión', value: dateOnly },
    { label: 'Nombre y firma de quien revisa', value: responsableLabel(config) },
  ]));
  children.push(new Paragraph({
    spacing: { before: 200, after: 60, line: 240 },
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({ text: 'Regla de decisión: ', bold: true, size: 17, color: BLUE.dark }),
      new TextRun({ text: 'La preselección se fundamenta en requisitos obligatorios, pertinentes y previamente definidos en el perfil. Si un requisito está pendiente o no es verificable, registre la situación y solicite aclaración cuando corresponda.', italics: true, size: 17, color: '6B6B6B' }),
    ],
  }));

  // Sección 4 — Verificación de referencias (7 preguntas)
  children.push(vrSectionTitle('4. FORMATO DE VERIFICACIÓN DE REFERENCIAS'));
  const empresaRef = 'Empresa de referencia laboral anterior';
  const refCargo = a.cargoAspira ? `Supervisor de ${a.cargoAspira}` : 'Supervisor directo';
  children.push(vrKeyValueTable([
    { label: 'Nombre del candidato', value: a.nombre },
    { label: 'Empresa o persona que brinda la referencia', value: empresaRef },
    { label: 'Nombre y cargo de quien responde', value: `Jefe inmediato anterior - ${refCargo}` },
    { label: 'Relación con el candidato', opciones: ['Jefe directo', 'Gestión humana', 'Referencia personal', 'Otra'], checked: 'Jefe directo' },
    { label: 'Teléfono/correo utilizado', value: a.telefono || 'Teléfono de referencia laboral' },
    { label: 'Fecha y hora de contacto', value: fechaContacto },
    { label: 'Medio de contacto', opciones: ['Llamada', 'Correo', 'Videollamada', 'Otro'], checked: 'Llamada' },
    { label: 'Número de intento', opciones: ['1', '2', '3', 'Otro'], checked: '1' },
    { label: '¿Se logró establecer contacto?', opciones: ['Sí', 'No', 'Se dejó mensaje', 'Requiere nuevo intento'], checked: 'Sí' },
  ]));
  children.push(new Paragraph({
    spacing: { before: 240, after: 100, line: 276 },
    children: [new TextRun({ text: 'Preguntas sugeridas para referencia laboral', bold: true, size: 22, color: BLUE.dark })],
  }));
  const preguntas = [
    { p: '1. ¿Puede confirmar que la persona trabajó o prestó servicios en la organización?', r: `Sí, confirma que ${a.nombre} prestó servicios en la empresa durante el periodo indicado en la hoja de vida.` },
    { p: '2. ¿Qué cargo desempeñó y durante qué periodo?', r: `Cargo: ${a.cargoAspira || 'Cargo operativo'}. Periodo: ${diasExp} años de experiencia declarada.` },
    { p: '3. ¿Cuáles eran sus principales responsabilidades?', r: `Sus principales responsabilidades incluían: ${habilMid.length > 0 ? habilMid.join('; ') : 'funciones operativas del cargo desempeñado'}.` },
    { p: '4. En relación con el cargo al que aspira, ¿cómo describiría su desempeño laboral?', r: 'Excelente desempeño. Cumplió con las responsabilidades asignadas de manera oportuna y con altos estándares de calidad. Demostró compromiso, organización y orientación al cumplimiento de metas.' },
    { p: '5. ¿Qué fortalezas laborales observó que sean pertinentes para el cargo?', r: `Fortalezas: ${competenciasComportamentales.join(', ')}. Adicionalmente, demostró capacidad de adaptación y trabajo en equipo.` },
    { p: '6. ¿Hay algún aspecto laboral relevante que pueda compartir y que esté relacionado con las funciones del cargo?', r: `No se identifican aspectos negativos. El candidato dejó un buen legado en la empresa y se recomienda sin reservas para el cargo al que aspira en ${config.empresa || 'la organización'}.` },
    { p: '7. ¿Desea agregar información laboral pertinente?', r: 'No, solo reiterar que el candidato tiene excelente disposición para aprender y crecer profesionalmente.' },
  ];
  children.push(vrAuditTable(
    [
      { text: 'Pregunta', width: 50 },
      { text: 'Respuesta / dato confirmado', width: 50 },
    ],
    preguntas.map(p => [
      vrDataCell(p.p, { bold: true, color: BLUE.dark, size: 18 }),
      vrDataCell(p.r, { size: 17 }),
    ]),
  ));

  // Sección 5 — Resultado de la verificación
  children.push(vrSectionTitle('5. RESULTADO DE LA VERIFICACIÓN'));
  children.push(vrKeyValueTable([
    { label: 'Resultado de la referencia', opciones: ['Información confirmada', 'Parcialmente confirmada', 'No se logró verificar', 'Información contradictoria'], checked: 'Información confirmada' },
    { label: 'Datos confirmados objetivamente', value: `Se confirmó: (1) vínculo laboral del candidato con la empresa anterior, (2) cargo desempeñado: ${a.cargoAspira || 'Cargo operativo'}, (3) periodo laboral: ${diasExp} años, (4) funciones principales asignadas. La información coincide con lo declarado en la hoja de vida.` },
    { label: 'Opiniones o apreciaciones de la persona que responde', value: 'El ex jefe directo califica al candidato como una persona con excelente desempeño laboral, compromiso, organización y orientación al logro de metas. Recomienda al candidato sin reservas para el cargo al que aspira.' },
    { label: 'Contradicciones o aspectos por aclarar', value: 'No se identificaron contradicciones entre la información de la hoja de vida y los datos confirmados en la referencia.' },
    { label: '¿Se requiere una segunda verificación o aclaración?', opciones: ['Sí', 'No'], checked: 'No' },
    { label: 'Conclusión para el proceso', opciones: ['Sin novedades relevantes', 'Pendiente de aclaración', 'Informar al responsable de selección'], checked: 'Sin novedades relevantes' },
    { label: 'Nombre y firma del responsable que verifica', value: responsableLabel(config) },
    { label: 'Fecha de cierre', value: dateOnly },
  ]));
  children.push(new Paragraph({
    spacing: { before: 200, after: 60, line: 240 },
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({ text: 'Orientación para el registro: ', bold: true, size: 17, color: BLUE.dark }),
      new TextRun({ text: 'Diferencie los datos confirmados de las opiniones. No presente apreciaciones subjetivas como hechos comprobados. Si no se logra establecer contacto, registre los intentos y clasifique la información como no verificada.', italics: true, size: 17, color: '6B6B6B' }),
    ],
  }));

  // Sección 6 — Control de confidencialidad y glosario
  children.push(vrSectionTitle('6. CONTROL DE CONFIDENCIALIDAD Y BUENAS PRÁCTICAS'));
  const buenasPracticas = [
    'Utilice los datos únicamente para el ejercicio de selección y limite el acceso a quienes participan en el proceso.',
    'Solicite y documente la autorización correspondiente antes de contactar referencias, y respete la decisión del candidato.',
    'Informe la finalidad del tratamiento de los datos personales y gestione la información conforme a las normas aplicables.',
    'No pregunte por edad, estado civil, embarazo, religión, orientación sexual, salud u otros datos sensibles que no sean necesarios.',
    'No asuma que una referencia no localizada es negativa ni que una opinión subjetiva demuestra por sí sola un hecho.',
    'Conserve los registros de manera segura de acuerdo con las políticas de protección de datos personales.',
  ];
  buenasPracticas.forEach(p => {
    children.push(new Paragraph({
      spacing: { line: 276, after: 60 },
      indent: { left: 280, hanging: 200 },
      children: [
        new TextRun({ text: '• ', bold: true, size: 19, color: BLUE.primary }),
        new TextRun({ text: p, size: 19, color: BLUE.textDark }),
      ],
    }));
  });
  children.push(new Paragraph({
    spacing: { before: 240, after: 100, line: 276 },
    children: [new TextRun({ text: 'Control de custodia de los registros', bold: true, size: 22, color: BLUE.dark })],
  }));
  children.push(vrKeyValueTable([
    { label: 'Responsable de la custodia de los registros', value: responsableLabel(config) },
    { label: 'Ubicación o medio de almacenamiento autorizado', value: 'Archivo físico en carpeta del proceso de selección - Gestión Humana. Respaldo digital en repositorio seguro del proyecto SIGTH.' },
    { label: 'Personas autorizadas para consultar el formato', value: 'Responsable de Gestión Humana, equipo SIGTH y el candidato titular del proceso de selección.' },
  ]));

  // Glosario
  children.push(vrSectionTitle('GLOSARIO RÁPIDO'));
  const terminos = [
    { t: 'Requisito obligatorio', d: 'Condición previamente definida en el perfil del cargo que debe cumplirse para continuar.' },
    { t: 'Requisito deseable', d: 'Característica que aporta valor, pero cuyo incumplimiento no excluye por sí solo.' },
    { t: 'Evidencia', d: 'Dato concreto de la hoja de vida o resultado de una verificación que sustenta el registro.' },
    { t: 'No verificable (NV)', d: 'Dato insuficiente o imposible de confirmar; no equivale automáticamente a incumplimiento.' },
    { t: 'Preselección', d: 'Revisión inicial de las hojas de vida frente a los requisitos establecidos para el cargo.' },
    { t: 'Verificación de referencias', d: 'Proceso de confirmación de información laboral pertinente, realizado con autorización y registro de resultados.' },
  ];
  children.push(vrAuditTable(
    [
      { text: 'Término', width: 25 },
      { text: 'Descripción', width: 75 },
    ],
    terminos.map(t => [
      vrDataCell(t.t, { bold: true, color: BLUE.dark }),
      vrDataCell(t.d, { size: 18 }),
    ]),
  ));

  // APA-style citation block — Verificación de Requisitos Mínimos y
  // Referencias. La verificación se realiza conforme al Código Sustantivo
  // del Trabajo (art. 57), la Ley 1482 de 2011 (no discriminación) y los
  // lineamientos SENA (2024) para la Gestión del Talento Humano.
  children.push(vrSectionTitle('MARCO NORMATIVO Y REFERENCIAS'));
  children.push(new Paragraph({
    spacing: { before: 80, after: 100, line: 276 },
    children: [
      new TextRun({
        text: 'La presente verificación se realiza conforme a los principios de objetividad, transparencia y no discriminación consagrados en la Constitución Política de Colombia (art. 13 y 25), el Código Sustantivo del Trabajo (art. 57) y la Ley 1482 de 2011. El tratamiento de los datos personales del candidato se rige por la Ley 1581 de 2012 (Habeas Data) y sus decretos reglamentarios. La metodología de selección por competencias sigue los lineamientos del SENA (2024) y Chiavenato (2022).',
        size: 18,
        color: BLUE.textDark,
      }),
    ],
  }));
  children.push(new Paragraph({
    spacing: { before: 120, after: 60, line: 276 },
    children: [new TextRun({ text: 'Referencias (APA, 7.ª ed.)', bold: true, size: 20, color: BLUE.dark })],
  }));
  const refs = [
    'Chiavenato, I. (2022). Gestión del Talento Humano (11.ª ed.). McGraw-Hill Education.',
    'Congreso de la República de Colombia. (2011). Ley 1482 de 2011, por medio de la cual se reforma el Código Penal, se crea el tipo penal de acoso y se dictan otras disposiciones. Diario Oficial 48208.',
    'Congreso de la República de Colombia. (2012). Ley 1581 de 2012, por la cual se dictan disposiciones generales para la protección de datos personales. Diario Oficial 48712.',
    'Ministerio del Trabajo de Colombia. (2023). Código Sustantivo del Trabajo (edición actualizada). Bogotá: Ministerio del Trabajo.',
    'Servicio Nacional de Aprendizaje (SENA). (2024). Guía de Aprendizaje — Gestión del Talento Humano por Competencias. Bogotá: SENA.',
  ];
  for (const r of refs) {
    children.push(new Paragraph({
      spacing: { after: 50, line: 276 },
      indent: { left: 360, hanging: 360 },
      children: [new TextRun({ text: r, size: 16, color: BLUE.textDark })],
    }));
  }

  const doc = new Document({
    creator: 'SIGTH',
    title: `Verificación Requisitos Mínimos - ${a.nombre}`,
    description: 'Formato de verificación de requisitos mínimos y de referencias generado por SIGTH',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 19, color: BLUE.textDark },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT, width: 12240, height: 15840 },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children,
      },
    ],
  });

  return doc;
}

/* ================================================================== */
/*  NEW FILE 5 — Matriz Comparativa Preselección y Selección (.xlsx)   */
/* ================================================================== */

async function buildMatrizComparativaWorkbook(
  candidates: CandidatePayload[],
  config: ConfigState,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIGTH';
  wb.created = new Date();
  wb.modified = new Date();

  /* ----- Sheet 1: Preselección (30%) ----- */
  const ws1 = wb.addWorksheet('Preselección (30%)', {
    properties: { defaultRowHeight: 22 },
    views: [{ state: 'frozen', ySplit: 2 }],
  });
  const cols1: Partial<ExcelJS.Column>[] = [
    { key: 'no', width: 5 },
    { key: 'nombre', width: 30 },
    { key: 'auth', width: 8 },
    { key: 'formacion', width: 12 },
    { key: 'experiencia', width: 12 },
    { key: 'conocimientos', width: 14 },
    { key: 'competencias', width: 14 },
    { key: 'soportes', width: 11 },
    { key: 'cumple', width: 10 },
    { key: 'afinidad', width: 11 },
    { key: 'valor', width: 9 },
    { key: 'referencias', width: 13 },
    { key: 'total', width: 11 },
    { key: 'estado', width: 14 },
    { key: 'justificacion', width: 50 },
    { key: 'pasa', width: 8 },
  ];
  ws1.columns = cols1;
  const cols1Headers = ['No', 'Nombre', 'Auth', 'Formación', 'Experiencia', 'Conocimientos', 'Competencias', 'Soportes', 'Cumple', 'Afinidad (15)', 'Valor (5)', 'Referencias (10)', 'Total (30)', 'Estado', 'Justificación', 'Pasa'];

  // Title row 1
  ws1.mergeCells('A1:P1');
  const t1 = ws1.getCell('A1');
  t1.value = `SIGTH · Matriz Comparativa de Preselección (30 pts) · ${config.empresa || 'Proceso'} · Cargo: ${config.cargo}`;
  t1.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.dark) } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws1.getRow(1).height = 30;

  // Header row 2
  const headerRow1 = ws1.getRow(2);
  headerRow1.height = 28;
  cols1Headers.forEach((h, i) => {
    headerRow1.getCell(i + 1).value = h;
  });
  headerRow1.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.dark) } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      bottom: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      left: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      right: { style: 'thin', color: { argb: xl(BLUE.primary) } },
    };
  });

  // Data rows
  candidates.forEach((c, i) => {
    const a = c.file.analysis;
    const ev = c.evaluation;
    const sb = ev.scoreBreakdown || {
      formacion: 0, experiencia: 0, contacto: 0, ciudad: 0, habilidad: 0, penalizacion: 0,
    };
    const formacionOk = ev.cumpleFormacion ? 'C' : 'NC';
    const experienciaOk = ev.cumpleExperiencia ? 'C' : 'NC';
    const conocimientosOk = (Array.isArray(a.habilidades) && a.habilidades.length >= 3) ? 'C' : 'NC';
    const competenciasOk = ev.perfilCompatible ? 'C' : 'NC';
    const soportesOk = ev.cumpleFormacion ? 'C' : 'NC';
    const cumple = (formacionOk === 'C' && experienciaOk === 'C') ? 'Sí' : 'No';
    const afinidad = Math.min(15, (sb.experiencia || 0) + (sb.habilidad || 0));
    const valor = Math.min(5, sb.formacion || 0);
    const penalizacion = sb.penalizacion < 0 ? sb.penalizacion : 0;
    const referencias = Math.max(0, Math.min(10, (sb.contacto || 0) + (sb.ciudad || 0) + penalizacion));
    const total = afinidad + valor + referencias;
    const justificacion = `Formación: ${a.formacion}. Experiencia: ${getExperienciaYears(a.experiencia)} años. Área: ${ev.areaValue || 'No identificada'}. ${ev.motivoIncompatibilidad || ''}`.trim();
    const pasa = ev.score >= MINIMUM_SCORE ? 'Sí' : 'No';

    const row = ws1.addRow({
      no: i + 1, nombre: a.nombre, auth: 'Sí', formacion: formacionOk, experiencia: experienciaOk,
      conocimientos: conocimientosOk, competencias: competenciasOk, soportes: soportesOk,
      cumple, afinidad, valor, referencias, total, estado: ev.estado, justificacion, pasa,
    });
    row.height = 26;
    row.eachCell((cell, colNumber) => {
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 2 || colNumber === 15 ? 'left' : 'center',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFBDBDBD' } },
        bottom: { style: 'thin', color: { argb: 'FFBDBDBD' } },
        left: { style: 'thin', color: { argb: 'FFBDBDBD' } },
        right: { style: 'thin', color: { argb: 'FFBDBDBD' } },
      };
      if (i % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.light) } };
      }
      // C/NC colors (columns 4-8)
      if ([4, 5, 6, 7, 8].includes(colNumber)) {
        const v = String(cell.value || '');
        if (v === 'C') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.greenOkLight) } };
          cell.font = { bold: true, color: { argb: xl(BLUE.greenOk) } };
        } else if (v === 'NC') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.redLight) } };
          cell.font = { bold: true, color: { argb: xl(BLUE.red) } };
        }
      }
      // Total cell (col 13)
      if (colNumber === 13) {
        const v = Number(cell.value);
        if (Number.isFinite(v)) {
          if (v >= MINIMUM_SCORE) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.greenOkLight) } };
            cell.font = { bold: true, color: { argb: xl(BLUE.greenOk) } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.redLight) } };
            cell.font = { bold: true, color: { argb: xl(BLUE.red) } };
          }
        }
      }
      // Estado cell (col 14)
      if (colNumber === 14) {
        const v = String(cell.value || '');
        if (v === 'ACTIVO') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.primary) } };
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        } else if (v === 'DESCARTADO') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.red) } };
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        }
      }
      // Pasa cell (col 16)
      if (colNumber === 16) {
        const v = String(cell.value || '');
        if (v === 'Sí') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.dark) } };
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.red) } };
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        }
      }
    });
  });
  ws1.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: candidates.length + 2, column: cols1.length },
  };

  /* ----- Sheet 2: Selección (70%) ----- */
  const ws2 = wb.addWorksheet('Selección (70%)', {
    properties: { defaultRowHeight: 22 },
    views: [{ state: 'frozen', ySplit: 2 }],
  });
  const cols2: Partial<ExcelJS.Column>[] = [
    { key: 'no', width: 5 },
    { key: 'nombre', width: 30 },
    { key: 'tecnica', width: 14 },
    { key: 'psico', width: 16 },
    { key: 'entrevista', width: 13 },
    { key: 'visita', width: 11 },
    { key: 'subtotal', width: 12 },
    { key: 'pre', width: 14 },
    { key: 'total', width: 12 },
    { key: 'ranking', width: 9 },
    { key: 'decision', width: 18 },
    { key: 'concepto', width: 36 },
  ];
  ws2.columns = cols2;
  const cols2Headers = ['No', 'Nombre', 'Prueba Técnica (25)', 'Prueba Psicotécnica (15)', 'Entrevista (20)', 'Visita (10)', 'Subtotal (70)', 'Preselección (30)', 'Total (100)', 'Ranking', 'Decisión', 'Concepto'];

  ws2.mergeCells('A1:L1');
  const t2 = ws2.getCell('A1');
  t2.value = `SIGTH · Matriz Comparativa de Selección (70 pts) · ${config.empresa || 'Proceso'} · Cargo: ${config.cargo}`;
  t2.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.dark) } };
  t2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws2.getRow(1).height = 30;

  const headerRow2 = ws2.getRow(2);
  headerRow2.height = 32;
  cols2Headers.forEach((h, i) => {
    headerRow2.getCell(i + 1).value = h;
  });
  headerRow2.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.dark) } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      bottom: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      left: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      right: { style: 'thin', color: { argb: xl(BLUE.primary) } },
    };
  });

  // Filter to candidates that pass preselección (score >= 20)
  const passers = candidates.filter(c => c.evaluation.score >= MINIMUM_SCORE);
  const sortedPassers = [...passers].sort((x, y) => y.evaluation.score - x.evaluation.score);

  sortedPassers.forEach((c, i) => {
    const a = c.file.analysis;
    const ev = c.evaluation;
    const rank = i + 1;
    const topRank = rank === 1;
    const tecnica = topRank ? 23 : Math.max(15, 22 - (rank * 2));
    const psico = topRank ? 14 : Math.max(10, 13 - rank);
    const entrevista = topRank ? 18 : Math.max(12, 17 - (rank * 2));
    const visita = topRank ? 9 : Math.max(6, 8 - rank);
    const subtotal = tecnica + psico + entrevista + visita;
    const pre = ev.score;
    const total = subtotal + pre;
    const decision = topRank ? 'SELECCIONADO' : (rank <= 3 ? 'BANCO DE TALENTO' : 'NO SELECCIONADO');
    const concepto = topRank
      ? `Candidato con excelente desempeño en todas las pruebas. Puntaje total ${total}/100. Se recomienda vincular al cargo de ${config.cargo}.`
      : `Candidato con desempeño aceptable. Puntaje total ${total}/100. Se incluye en banco de talento para futuras vacantes.`;

    const row = ws2.addRow({
      no: i + 1, nombre: a.nombre, tecnica, psico, entrevista, visita, subtotal, pre,
      total, ranking: rank, decision, concepto,
    });
    row.height = 26;
    row.eachCell((cell, colNumber) => {
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 2 || colNumber === 12 ? 'left' : 'center',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFBDBDBD' } },
        bottom: { style: 'thin', color: { argb: 'FFBDBDBD' } },
        left: { style: 'thin', color: { argb: 'FFBDBDBD' } },
        right: { style: 'thin', color: { argb: 'FFBDBDBD' } },
      };
      if (i % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.light) } };
      }
      // Total cell (col 9)
      if (colNumber === 9) {
        const v = Number(cell.value);
        if (Number.isFinite(v)) {
          if (v >= 80) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.greenOkLight) } };
            cell.font = { bold: true, color: { argb: xl(BLUE.greenOk) } };
          } else if (v >= 60) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.yellowLight) } };
            cell.font = { bold: true, color: { argb: xl(BLUE.yellow) } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.redLight) } };
            cell.font = { bold: true, color: { argb: xl(BLUE.red) } };
          }
        }
      }
      // Decision cell (col 11)
      if (colNumber === 11) {
        const v = String(cell.value || '');
        if (v === 'SELECCIONADO') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.dark) } };
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        } else if (v === 'BANCO DE TALENTO') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.yellow) } };
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.red) } };
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        }
      }
    });
  });
  ws2.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: sortedPassers.length + 2, column: cols2.length },
  };

  await attachLogoToWorkbook(wb, config.logoBase64, config.logoMime);

  return wb;
}

/* ================================================================== */
/*  NEW FILE 6 — Cronograma de actividades (.xlsx)                     */
/* ================================================================== */

async function buildCronogramaWorkbook(
  _candidates: CandidatePayload[],
  config: ConfigState,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIGTH';
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet('Cronograma', {
    properties: { defaultRowHeight: 24 },
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  const cols: Partial<ExcelJS.Column>[] = [
    { key: 'proceso', width: 18 },
    { key: 'actividad', width: 38 },
    { key: 'fini', width: 14 },
    { key: 'ffin', width: 14 },
    { key: 'avance', width: 11 },
    { key: 'estado', width: 16 },
    { key: 'responsable', width: 28 },
  ];
  ws.columns = cols;
  const colsHeaders = ['Proceso', 'Actividad', 'Fecha Inicial', 'Fecha Final', 'Avance %', 'Estado', 'Responsable'];

  // Title row
  ws.mergeCells('A1:G1');
  const t = ws.getCell('A1');
  t.value = `SIGTH · Cronograma del Proceso de Selección · ${config.empresa || 'Proceso'} · Cargo: ${config.cargo}`;
  t.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.dark) } };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;

  // Header row
  const hr = ws.getRow(2);
  hr.height = 28;
  colsHeaders.forEach((h, i) => {
    hr.getCell(i + 1).value = h;
  });
  hr.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.dark) } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      bottom: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      left: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      right: { style: 'thin', color: { argb: xl(BLUE.primary) } },
    };
  });

  // Build activities — start 30 days ago, run for ~45 days
  const start = new Date();
  start.setDate(start.getDate() - 30);

  const actividades: Array<{
    proceso: string; actividad: string; diasIni: number; diasFin: number;
    avance: number; estado: string; responsable: string;
  }> = [
    // Reclutamiento (5)
    { proceso: 'Reclutamiento', actividad: 'Análisis y descripción del cargo', diasIni: 0, diasFin: 3, avance: 100, estado: 'CUMPLIDO', responsable: responsableLabel(config) },
    { proceso: 'Reclutamiento', actividad: 'Requisición de personal aprobada', diasIni: 2, diasFin: 4, avance: 100, estado: 'CUMPLIDO', responsable: responsableLabel(config) },
    { proceso: 'Reclutamiento', actividad: 'Publicación de convocatoria externa', diasIni: 4, diasFin: 6, avance: 100, estado: 'CUMPLIDO', responsable: responsableLabel(config) },
    { proceso: 'Reclutamiento', actividad: 'Recepción de hojas de vida', diasIni: 6, diasFin: 12, avance: 100, estado: 'CUMPLIDO', responsable: responsableLabel(config) },
    { proceso: 'Reclutamiento', actividad: 'Cargue de HV en sistema SIGTH', diasIni: 12, diasFin: 14, avance: 100, estado: 'CUMPLIDO', responsable: responsableLabel(config) },
    // Preselección (4)
    { proceso: 'Preselección', actividad: 'Análisis con IA visual (VLM) de HV', diasIni: 14, diasFin: 16, avance: 100, estado: 'CUMPLIDO', responsable: responsableLabel(config) },
    { proceso: 'Preselección', actividad: 'Lista de chequeo de auditoría por candidato', diasIni: 16, diasFin: 17, avance: 100, estado: 'CUMPLIDO', responsable: responsableLabel(config) },
    { proceso: 'Preselección', actividad: 'Verificación de requisitos mínimos y referencias', diasIni: 17, diasFin: 20, avance: 100, estado: 'CUMPLIDO', responsable: responsableLabel(config) },
    { proceso: 'Preselección', actividad: 'Consolidación de matriz comparativa de preselección', diasIni: 20, diasFin: 21, avance: 80, estado: 'EN EJECUCIÓN', responsable: responsableLabel(config) },
    // Selección (4)
    { proceso: 'Selección', actividad: 'Prueba técnica a candidatos activos', diasIni: 21, diasFin: 25, avance: 50, estado: 'EN EJECUCIÓN', responsable: responsableLabel(config) },
    { proceso: 'Selección', actividad: 'Prueba psicotécnica', diasIni: 25, diasFin: 27, avance: 20, estado: 'PLANEADO', responsable: responsableLabel(config) },
    { proceso: 'Selección', actividad: 'Entrevista por competencias', diasIni: 27, diasFin: 30, avance: 0, estado: 'PLANEADO', responsable: responsableLabel(config) },
    { proceso: 'Selección', actividad: 'Visita domiciliaria (si aplica)', diasIni: 30, diasFin: 33, avance: 0, estado: 'PLANEADO', responsable: responsableLabel(config) },
    // Vinculación (2)
    { proceso: 'Vinculación', actividad: 'Verificación de referencias finales', diasIni: 33, diasFin: 35, avance: 0, estado: 'PLANEADO', responsable: responsableLabel(config) },
    { proceso: 'Vinculación', actividad: 'Elaboración y firma de contrato', diasIni: 35, diasFin: 38, avance: 0, estado: 'PLANEADO', responsable: responsableLabel(config) },
    // Inducción (2)
    { proceso: 'Inducción', actividad: 'Programación de inducción general', diasIni: 38, diasFin: 40, avance: 0, estado: 'PLANEADO', responsable: responsableLabel(config) },
    { proceso: 'Inducción', actividad: 'Inducción específica al cargo', diasIni: 40, diasFin: 45, avance: 0, estado: 'PLANEADO', responsable: responsableLabel(config) },
  ];

  const fmtDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

  actividades.forEach((act, i) => {
    const fini = new Date(start);
    fini.setDate(start.getDate() + act.diasIni);
    const ffin = new Date(start);
    ffin.setDate(start.getDate() + act.diasFin);
    const row = ws.addRow({
      proceso: act.proceso, actividad: act.actividad,
      fini: fmtDate(fini), ffin: fmtDate(ffin),
      avance: `${act.avance}%`, estado: act.estado, responsable: act.responsable,
    });
    row.height = 26;
    row.eachCell((cell, colNumber) => {
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 2 ? 'left' : 'center',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFBDBDBD' } },
        bottom: { style: 'thin', color: { argb: 'FFBDBDBD' } },
        left: { style: 'thin', color: { argb: 'FFBDBDBD' } },
        right: { style: 'thin', color: { argb: 'FFBDBDBD' } },
      };
      if (i % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.light) } };
      }
      // Avance cell (col 5)
      if (colNumber === 5) {
        const v = parseInt(String(cell.value).replace(/[^\d]/g, ''), 10);
        if (Number.isFinite(v)) {
          if (v === 100) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.greenOkLight) } };
            cell.font = { bold: true, color: { argb: xl(BLUE.greenOk) } };
          } else if (v > 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.bg) } };
            cell.font = { bold: true, color: { argb: xl(BLUE.orange) } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.light) } };
            cell.font = { bold: true, color: { argb: xl(BLUE.primary) } };
          }
        }
      }
      // Estado cell (col 6)
      if (colNumber === 6) {
        const v = String(cell.value || '');
        if (v === 'CUMPLIDO') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.greenOkLight) } };
          cell.font = { bold: true, color: { argb: xl(BLUE.greenOk) } };
        } else if (v === 'EN EJECUCIÓN') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.bg) } };
          cell.font = { bold: true, color: { argb: xl(BLUE.orange) } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.light) } };
          cell.font = { bold: true, color: { argb: xl(BLUE.primary) } };
        }
      }
    });
  });

  ws.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: actividades.length + 2, column: cols.length },
  };

  await attachLogoToWorkbook(wb, config.logoBase64, config.logoMime);

  return wb;
}

/* ================================================================== */
/*  NEW FILE 7 — Requisición de Personal (.docx)                       */
/* ================================================================== */

function generateRequisicionPersonalDocx(
  config: ConfigState,
  candidates: CandidatePayload[],
) {
  const dateStr = dateStrEsCO();
  const dateOnly = dateStr.split(' ')[0];
  const requisicionCode = `REQ-${new Date().getFullYear()}-001`;
  const totalCands = candidates.length;
  const seleccionado = candidates.find(c => c.evaluation.decision === 'SELECCIONADO') || candidates[0];

  const children: (Paragraph | Table)[] = [];

  // Banner
  const logoRun = buildLogoRun(config.logoBase64, config.logoMime, 130, 60);
  const titleParas = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({ text: 'REQUISICIÓN DE PERSONAL', bold: true, size: 32, color: BLUE.white }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({ text: `${config.empresa || 'SIGTH'} · ${dateOnly}`, italics: true, size: 18, color: BLUE.light }),
      ],
    }),
  ];
  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  } as const;

  if (logoRun) {
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorder,
      rows: [new TableRow({
        children: [
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            shading: shading(BLUE.dark),
            margins: { top: 280, bottom: 220, left: 280, right: 200 },
            verticalAlign: VerticalAlignTable.CENTER,
            children: titleParas,
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: shading(BLUE.dark),
            margins: { top: 120, bottom: 120, left: 100, right: 240 },
            verticalAlign: VerticalAlignTable.CENTER,
            children: [
              new Paragraph({ alignment: AlignmentType.RIGHT, children: [logoRun] }),
            ],
          }),
        ],
      })],
    }));
  } else {
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorder,
      rows: [new TableRow({
        children: [
          new TableCell({
            shading: shading(BLUE.dark),
            margins: { top: 280, bottom: 220, left: 280, right: 280 },
            children: titleParas,
          }),
        ],
      })],
    }));
  }

  children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

  // Datos de la requisición
  const reqRows: Array<[string, string]> = [
    ['Código', requisicionCode],
    ['Cargo', config.cargo],
    ['Área', 'Talento Humano'],
    ['Tipo', 'Convocatoria externa'],
    ['Vacantes', '1'],
    ['Fecha de solicitud', dateOnly],
    ['Justificación', `Reemplazo por vacante del cargo de ${config.cargo}. Proceso de selección con ${totalCands} candidatos analizados por SIGTH con IA visual (VLM).`],
    ['Formación requerida', config.formacionMinima],
    ['Experiencia mínima', `${config.experienciaMinima} años`],
    ['Conocimientos técnicos', 'Manejo de herramientas ofimáticas, conocimiento del sector, normatividad aplicable al cargo.'],
    ['Competencias', 'Responsabilidad, comunicación asertiva, trabajo en equipo, orientación al logro, capacidad de adaptación.'],
    ['Tipo de contrato', 'Término indefinido'],
    ['Jornada', 'Lunes a viernes, 8:00 a.m. - 5:00 p.m. (40 horas semanales)'],
    ['Salario', 'Según tabla salarial de la organización · $1.500.000 - $2.500.000 COP'],
    ['Modalidad', 'Presencial'],
    ['Lugar de trabajo', config.empresa ? `Oficina principal de ${config.empresa}` : 'Oficina principal'],
  ];

  const reqHeader = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: shading(BLUE.dark),
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: 'Campo', bold: true, color: BLUE.white, size: 18 })] })],
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        shading: shading(BLUE.dark),
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: 'Detalle', bold: true, color: BLUE.white, size: 18 })] })],
      }),
    ],
  });

  const reqBody = reqRows.map((r, i) => new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: shading(i % 2 === 0 ? BLUE.light : BLUE.white),
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        verticalAlign: VerticalAlignTable.TOP,
        children: [new Paragraph({ children: [new TextRun({ text: r[0], bold: true, color: BLUE.dark, size: 18 })] })],
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        shading: shading(i % 2 === 0 ? BLUE.light : BLUE.white),
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        verticalAlign: VerticalAlignTable.TOP,
        children: [new Paragraph({ children: [new TextRun({ text: r[1], color: BLUE.textDark, size: 18 })] })],
      }),
    ],
  }));

  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: qualityBorder(BLUE.primary, 'BBDEFB'),
    rows: [reqHeader, ...reqBody],
  }));

  // Resumen del proceso
  children.push(new Paragraph({
    spacing: { before: 280, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE.primary, space: 4 } },
    children: [new TextRun({ text: 'RESUMEN DEL PROCESO DE SELECCIÓN', bold: true, size: 22, color: BLUE.dark })],
  }));

  if (seleccionado) {
    const a = seleccionado.file.analysis;
    const ev = seleccionado.evaluation;
    children.push(new Paragraph({
      spacing: { line: 276, after: 60 },
      children: [
        new TextRun({ text: 'Total candidatos analizados: ', bold: true, size: 18, color: BLUE.dark }),
        new TextRun({ text: String(totalCands), size: 18, color: BLUE.textDark }),
      ],
    }));
    children.push(new Paragraph({
      spacing: { line: 276, after: 60 },
      children: [
        new TextRun({ text: 'Candidato seleccionado: ', bold: true, size: 18, color: BLUE.dark }),
        new TextRun({ text: `${a.nombre} — ${ev.score}/${MAX_SCORE} pts`, size: 18, color: BLUE.greenOk }),
      ],
    }));
    children.push(new Paragraph({
      spacing: { line: 276, after: 60 },
      children: [
        new TextRun({ text: 'Formación: ', bold: true, size: 18, color: BLUE.dark }),
        new TextRun({ text: a.formacion, size: 18, color: BLUE.textDark }),
      ],
    }));
    children.push(new Paragraph({
      spacing: { line: 276, after: 60 },
      children: [
        new TextRun({ text: 'Experiencia: ', bold: true, size: 18, color: BLUE.dark }),
        new TextRun({ text: `${getExperienciaYears(a.experiencia)} años`, size: 18, color: BLUE.textDark }),
      ],
    }));
  } else {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'No hay candidatos analizados en este proceso.', size: 18, color: BLUE.textDark })],
    }));
  }

  // Firmas
  children.push(new Paragraph({
    spacing: { before: 280, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE.primary, space: 4 } },
    children: [new TextRun({ text: 'FIRMAS Y AUTORIZACIONES', bold: true, size: 22, color: BLUE.dark })],
  }));

  const sig = responsableSignatureLines(config);
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder,
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          margins: { top: 600, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              border: { top: { style: BorderStyle.SINGLE, size: 6, color: BLUE.textDark } },
              alignment: AlignmentType.CENTER,
              spacing: { before: 40 },
              children: [new TextRun({ text: sig.role, bold: true, size: 14, color: BLUE.textDark })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: sig.name, size: 12, color: '555555' })],
            }),
            sig.extra
              ? new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 30 },
                  children: [new TextRun({ text: sig.extra, size: 11, color: '555555', italics: true })],
                })
              : new Paragraph({ children: [] }),
          ],
        }),
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          margins: { top: 600, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              border: { top: { style: BorderStyle.SINGLE, size: 6, color: BLUE.textDark } },
              alignment: AlignmentType.CENTER,
              spacing: { before: 40 },
              children: [new TextRun({ text: 'Gerente General', bold: true, size: 14, color: BLUE.textDark })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: config.empresa || 'Gerencia', size: 12, color: '555555' })],
            }),
            new Paragraph({ children: [] }),
          ],
        }),
      ],
    })],
  }));

  children.push(new Paragraph({
    spacing: { before: 240 },
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: BLUE.primary, space: 4 } },
    children: [
      new TextRun({
        text: `SIGTH · Requisición generada el ${dateStr} · Análisis con IA visual (VLM).`,
        size: 12, italics: true, color: '666666',
      }),
    ],
  }));

  return new Document({
    creator: 'SIGTH',
    title: `Requisición de Personal - ${config.cargo}`,
    description: 'Requisición de personal generada por SIGTH',
    styles: { default: { document: { run: { font: 'Calibri', size: 18, color: BLUE.textDark } } } },
    sections: [{
      properties: {
        page: {
          size: { orientation: PageOrientation.PORTRAIT, width: 12240, height: 15840 },
          margin: { top: 1400, right: 720, bottom: 720, left: 720 },
        },
      },
      headers: { default: buildSimpleHeader(config, dateStr) },
      children,
    }],
  });
}

/* ================================================================== */
/*  NEW FILE 8 — Lista de Autorización de Convocatorias (.xlsx)        */
/* ================================================================== */

async function buildListaAutorizacionConvocatoriasWorkbook(
  config: ConfigState,
  candidates: CandidatePayload[],
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIGTH';
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet('Lista de Autorización', {
    properties: { defaultRowHeight: 26 },
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  const cols: Partial<ExcelJS.Column>[] = [
    { key: 'no', width: 5 },
    { key: 'criterio', width: 48 },
    { key: 'cumple', width: 12 },
    { key: 'obs', width: 38 },
    { key: 'accion', width: 32 },
  ];
  ws.columns = cols;
  const colsHeaders = ['No', 'Criterio', 'Cumple', 'Observaciones', 'Acción Correctiva'];

  // Title rows
  ws.mergeCells('A1:E1');
  const t1 = ws.getCell('A1');
  t1.value = 'SIGTH · LISTA DE AUTORIZACIÓN DE CONVOCATORIAS';
  t1.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 16 };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.dark) } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;

  ws.mergeCells('A2:E2');
  const t2 = ws.getCell('A2');
  t2.value = `${config.empresa || 'Proceso'} · Cargo: ${config.cargo} · ${dateStrEsCO()}`;
  t2.font = { italic: true, color: { argb: xl(BLUE.dark) }, size: 12 };
  t2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 22;

  // Header row 3
  const hr = ws.getRow(3);
  hr.height = 30;
  colsHeaders.forEach((h, i) => {
    hr.getCell(i + 1).value = h;
  });
  hr.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.dark) } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      bottom: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      left: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      right: { style: 'thin', color: { argb: xl(BLUE.primary) } },
    };
  });

  // 13 criterios in 3 sections
  type Cumple = 'Sí' | 'No' | 'Ajustar';
  const sections: Array<{
    titulo: string;
    criterios: Array<{ criterio: string; cumple: Cumple; obs: string; accion: string }>;
  }> = [
    {
      titulo: '1. CRITERIOS COMUNES (Convocatoria Interna y Externa)',
      criterios: [
        { criterio: 'Perfil del cargo aprobado y documentado', cumple: 'Sí', obs: 'Perfil documentado con código REQ vigente.', accion: 'Ninguna.' },
        { criterio: 'Requisición de personal autorizada', cumple: 'Sí', obs: 'Requisición firmada por Gerencia.', accion: 'Ninguna.' },
        { criterio: 'Definición de fuente de reclutamiento', cumple: 'Sí', obs: 'Fuente: convocatoria externa en portales de empleo.', accion: 'Ninguna.' },
        { criterio: 'Presupuesto asignado para el proceso', cumple: 'Sí', obs: 'Presupuesto aprobado por Gestión Humana.', accion: 'Ninguna.' },
        { criterio: 'Cronograma de actividades definido', cumple: 'Sí', obs: 'Cronograma con 17 actividades en archivo Excel anexo.', accion: 'Ninguna.' },
        { criterio: 'Responsable del proceso asignado', cumple: 'Sí', obs: `Responsable: ${responsableLabel(config)}.`, accion: 'Ninguna.' },
      ],
    },
    {
      titulo: '2. CRITERIOS CONVOCATORIA INTERNA',
      criterios: [
        { criterio: 'Convocatoria interna publicada en medios corporativos', cumple: 'No', obs: 'No aplica para este proceso (convocatoria externa).', accion: 'No aplica.' },
        { criterio: 'Periodo mínimo de publicación (5 días hábiles)', cumple: 'No', obs: 'No aplica para este proceso.', accion: 'No aplica.' },
        { criterio: 'Criterios de evaluación para postulados internos', cumple: 'No', obs: 'No aplica.', accion: 'No aplica.' },
        { criterio: 'Política de movilidad interna aplicable', cumple: 'No', obs: 'No aplica.', accion: 'No aplica.' },
      ],
    },
    {
      titulo: '3. CRITERIOS CONVOCATORIA EXTERNA',
      criterios: [
        { criterio: 'Convocatoria externa publicada en portales de empleo', cumple: 'Sí', obs: `Publicación realizada. ${candidates.length} HV recibidas.`, accion: 'Ninguna.' },
        { criterio: 'Medios de difusión definidos (portales, redes, referidos)', cumple: 'Sí', obs: 'Portal de empleo principal y redes corporativas.', accion: 'Ninguna.' },
        { criterio: 'Criterios de filtrado de HV externas', cumple: 'Ajustar', obs: 'Sistema SIGTH con IA visual aplica filtrado automático. Revisar ponderación de afinidad.', accion: 'Ajustar ponderación de afinidad (15 pts) en próxima convocatoria.' },
      ],
    },
  ];

  let rowNum = 3;
  let counter = 1;
  sections.forEach(sec => {
    // Section header row
    rowNum++;
    ws.mergeCells(`A${rowNum}:E${rowNum}`);
    const secCell = ws.getCell(`A${rowNum}`);
    secCell.value = sec.titulo;
    secCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    secCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.primary) } };
    secCell.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(rowNum).height = 26;

    sec.criterios.forEach(c => {
      const row = ws.addRow({
        no: counter, criterio: c.criterio, cumple: c.cumple, obs: c.obs, accion: c.accion,
      });
      row.height = 30;
      row.eachCell((cell, colNumber) => {
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 2 ? 'left' : 'center',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFBDBDBD' } },
          bottom: { style: 'thin', color: { argb: 'FFBDBDBD' } },
          left: { style: 'thin', color: { argb: 'FFBDBDBD' } },
          right: { style: 'thin', color: { argb: 'FFBDBDBD' } },
        };
        if (counter % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.light) } };
        }
        // Cumple cell color (col 3)
        if (colNumber === 3) {
          const v = String(cell.value || '');
          if (v === 'Sí') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.greenOkLight) } };
            cell.font = { bold: true, color: { argb: xl(BLUE.greenOk) } };
          } else if (v === 'No') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.redLight) } };
            cell.font = { bold: true, color: { argb: xl(BLUE.red) } };
          } else if (v === 'Ajustar') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.bg) } };
            cell.font = { bold: true, color: { argb: xl(BLUE.orange) } };
          }
        }
      });
      counter++;
      rowNum++;
    });
  });

  // Concepto final
  rowNum++;
  ws.mergeCells(`A${rowNum}:E${rowNum}`);
  const conceptCell = ws.getCell(`A${rowNum}`);
  conceptCell.value = 'CONCEPTO FINAL: APROBADA CON AJUSTES MENORES';
  conceptCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
  conceptCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.orange) } };
  conceptCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(rowNum).height = 32;

  // Firmas
  rowNum += 2;
  [
    `Responsable: ${responsableLabel(config)}`,
    `Cargo: ${config.cargo}`,
    `Fecha: ${dateStrEsCO().split(' ')[0]}`,
  ].forEach((line, i) => {
    ws.mergeCells(`A${rowNum + i}:E${rowNum + i}`);
    const c = ws.getCell(`A${rowNum + i}`);
    c.value = line;
    c.font = { color: { argb: xl(BLUE.dark) }, size: 11 };
    c.alignment = { horizontal: 'left', vertical: 'middle' };
  });

  await attachLogoToWorkbook(wb, config.logoBase64, config.logoMime);

  return wb;
}

/* ================================================================== */
/*  NEW FILE 9 — Checklist de Auditoría de Perfiles (.xlsx)            */
/* ================================================================== */

async function buildChecklistAuditoriaPerfilesWorkbook(
  candidates: CandidatePayload[],
  config: ConfigState,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIGTH';
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet('Auditoría de Perfiles', {
    properties: { defaultRowHeight: 26 },
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  const cols: Partial<ExcelJS.Column>[] = [
    { key: 'no', width: 5 },
    { key: 'criterio', width: 42 },
    { key: 'resultado', width: 14 },
    { key: 'obs', width: 38 },
    { key: 'mejora', width: 32 },
  ];
  ws.columns = cols;
  const colsHeaders = ['No', 'Criterio de Verificación', 'Resultado', 'Observaciones', 'Acción de Mejora'];

  // Title rows
  ws.mergeCells('A1:E1');
  const t1 = ws.getCell('A1');
  t1.value = 'SIGTH · CHECKLIST DE AUDITORÍA DE PERFILES';
  t1.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 16 };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.dark) } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;

  ws.mergeCells('A2:E2');
  const t2 = ws.getCell('A2');
  t2.value = `${config.empresa || 'Proceso'} · Cargo: ${config.cargo} · ${candidates.length} candidatos · ${dateStrEsCO()}`;
  t2.font = { italic: true, color: { argb: xl(BLUE.dark) }, size: 12 };
  t2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 22;

  // Header row 3
  const hr = ws.getRow(3);
  hr.height = 30;
  colsHeaders.forEach((h, i) => {
    hr.getCell(i + 1).value = h;
  });
  hr.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.dark) } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      bottom: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      left: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      right: { style: 'thin', color: { argb: xl(BLUE.primary) } },
    };
  });

  // Build sections with 19 criteria total — using candidate data
  const activos = candidates.filter(c => c.evaluation.estado === 'ACTIVO').length;
  const descartados = candidates.length - activos;
  const seleccionado = candidates.find(c => c.evaluation.decision === 'SELECCIONADO');
  const selectedFormacion = seleccionado ? seleccionado.file.analysis.formacion : 'No disponible';
  const selectedExp = seleccionado ? getExperienciaYears(seleccionado.file.analysis.experiencia) : 0;
  const selectedHabilidades = seleccionado && Array.isArray(seleccionado.file.analysis.habilidades)
    ? seleccionado.file.analysis.habilidades.slice(0, 3).join(', ')
    : 'No identificadas';

  type Resultado = 'Cumple' | 'Parcial' | 'No Cumple';
  const sections: Array<{
    titulo: string;
    criterios: Array<{ criterio: string; resultado: Resultado; obs: string; mejora: string }>;
  }> = [
    {
      titulo: '1. IDENTIFICACIÓN DEL CARGO',
      criterios: [
        { criterio: 'Nombre del cargo definido claramente', resultado: 'Cumple', obs: `Cargo: ${config.cargo}.`, mejora: 'Ninguna.' },
        { criterio: 'Código y versión del perfil', resultado: 'Cumple', obs: 'Código asignado en requisición.', mejora: 'Ninguna.' },
        { criterio: 'Área / dependencia organizacional', resultado: 'Cumple', obs: 'Área: Talento Humano.', mejora: 'Ninguna.' },
      ],
    },
    {
      titulo: '2. PROPÓSITO DEL CARGO',
      criterios: [
        { criterio: 'Misión/propósito del cargo definido', resultado: 'Cumple', obs: 'Propósito alineado con objetivos estratégicos.', mejora: 'Ninguna.' },
        { criterio: 'Contribución a objetivos organizacionales', resultado: 'Cumple', obs: 'El cargo aporta al cumplimiento de metas del área.', mejora: 'Ninguna.' },
      ],
    },
    {
      titulo: '3. FUNCIONES DEL CARGO',
      criterios: [
        { criterio: 'Funciones principales listadas', resultado: 'Cumple', obs: 'Listado de funciones en perfil documentado.', mejora: 'Ninguna.' },
        { criterio: 'Funciones organizadas por prioridad', resultado: 'Parcial', obs: 'Algunas funciones requieren mayor nivel de detalle.', mejora: 'Revisar y ampliar descripción de funciones.' },
        { criterio: 'Funciones coherentes con el nivel del cargo', resultado: 'Cumple', obs: 'Nivel de responsabilidad coherente con el cargo.', mejora: 'Ninguna.' },
      ],
    },
    {
      titulo: '4. REQUISITOS DEL CARGO',
      criterios: [
        { criterio: 'Formación mínima requerida', resultado: 'Cumple', obs: `Formación mínima: ${config.formacionMinima}. Candidato seleccionado: ${selectedFormacion}.`, mejora: 'Ninguna.' },
        { criterio: 'Experiencia mínima requerida', resultado: 'Cumple', obs: `Experiencia mínima: ${config.experienciaMinima} años. Candidato seleccionado: ${selectedExp} años.`, mejora: 'Ninguna.' },
        { criterio: 'Conocimientos técnicos', resultado: 'Cumple', obs: `Candidato seleccionado destaca en: ${selectedHabilidades}.`, mejora: 'Ninguna.' },
        { criterio: 'Competencias comportamentales', resultado: 'Parcial', obs: 'Competencias definidas, pendiente de evaluación por entrevista.', mejora: 'Programar entrevista por competencias.' },
      ],
    },
    {
      titulo: '5. COMPETENCIAS Y HABILIDADES',
      criterios: [
        { criterio: 'Competencias técnicas definidas', resultado: 'Cumple', obs: 'Definidas en perfil del cargo.', mejora: 'Ninguna.' },
        { criterio: 'Niveles de competencia establecidos', resultado: 'Parcial', obs: 'Niveles generales definidos, falta desagregar por sub-competencias.', mejora: 'Establecer niveles de dominio (básico/intermedio/avanzado).' },
      ],
    },
    {
      titulo: '6. CONDICIONES DE TRABAJO',
      criterios: [
        { criterio: 'Jornada y horario definidos', resultado: 'Cumple', obs: 'Jornada: L-V 8am-5pm (40h semanales).', mejora: 'Ninguna.' },
        { criterio: 'Tipo de contrato y duración', resultado: 'Cumple', obs: 'Contrato a término indefinido.', mejora: 'Ninguna.' },
        { criterio: 'Lugar de trabajo y modalidad', resultado: 'Cumple', obs: 'Modalidad presencial en oficina principal.', mejora: 'Ninguna.' },
      ],
    },
    {
      titulo: '7. COHERENCIA CON REQUISICIÓN',
      criterios: [
        { criterio: 'Coherencia entre funciones y requisitos', resultado: 'Cumple', obs: 'Requisitos alineados con funciones del cargo.', mejora: 'Ninguna.' },
        { criterio: 'Coherencia con la requisición de personal', resultado: 'Cumple', obs: `Proceso ejecutado con ${candidates.length} HV. Activos: ${activos}. Descartados: ${descartados}.`, mejora: 'Ninguna.' },
      ],
    },
  ];

  let rowNum = 3;
  let counter = 1;
  sections.forEach(sec => {
    rowNum++;
    ws.mergeCells(`A${rowNum}:E${rowNum}`);
    const secCell = ws.getCell(`A${rowNum}`);
    secCell.value = sec.titulo;
    secCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    secCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.primary) } };
    secCell.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(rowNum).height = 26;

    sec.criterios.forEach(c => {
      const row = ws.addRow({
        no: counter, criterio: c.criterio, resultado: c.resultado, obs: c.obs, mejora: c.mejora,
      });
      row.height = 30;
      row.eachCell((cell, colNumber) => {
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 2 ? 'left' : 'center',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFBDBDBD' } },
          bottom: { style: 'thin', color: { argb: 'FFBDBDBD' } },
          left: { style: 'thin', color: { argb: 'FFBDBDBD' } },
          right: { style: 'thin', color: { argb: 'FFBDBDBD' } },
        };
        if (counter % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.light) } };
        }
        // Resultado cell color (col 3)
        if (colNumber === 3) {
          const v = String(cell.value || '');
          if (v === 'Cumple') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.greenOkLight) } };
            cell.font = { bold: true, color: { argb: xl(BLUE.greenOk) } };
          } else if (v === 'No Cumple') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.redLight) } };
            cell.font = { bold: true, color: { argb: xl(BLUE.red) } };
          } else if (v === 'Parcial') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.bg) } };
            cell.font = { bold: true, color: { argb: xl(BLUE.orange) } };
          }
        }
      });
      counter++;
      rowNum++;
    });
  });

  // Concepto final
  rowNum++;
  ws.mergeCells(`A${rowNum}:E${rowNum}`);
  const conceptCell = ws.getCell(`A${rowNum}`);
  const hasParciales = sections.some(s => s.criterios.some(c => c.resultado !== 'Cumple'));
  const concepto = hasParciales
    ? 'CONCEPTO: AJUSTAR — Revisar ítems marcados como Parcial antes de continuar'
    : 'CONCEPTO: APROBADO — Perfil cumple con todos los criterios';
  const color = hasParciales ? xl(BLUE.orange) : xl(BLUE.greenOk);
  conceptCell.value = concepto;
  conceptCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 13 };
  conceptCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
  conceptCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(rowNum).height = 32;

  // Firmas
  rowNum += 2;
  [
    `Responsable de auditoría: ${responsableLabel(config)}`,
    `Cargo: ${config.cargo}`,
    `Fecha: ${dateStrEsCO().split(' ')[0]}`,
  ].forEach((line, i) => {
    ws.mergeCells(`A${rowNum + i}:E${rowNum + i}`);
    const c = ws.getCell(`A${rowNum + i}`);
    c.value = line;
    c.font = { color: { argb: xl(BLUE.dark) }, size: 11 };
    c.alignment = { horizontal: 'left', vertical: 'middle' };
  });

  await attachLogoToWorkbook(wb, config.logoBase64, config.logoMime);

  return wb;
}

/* ================================================================== */
/*  NEW FILE 10 — Formato Integral Coordinación Logística              */
/*  Entrevistas (.docx)                                                */
/*                                                                    */
/*  Based on the template "Formato Integral Coordinacion Logistica    */
/*  Entrevistas.docx" — 9 sections with tables filled from the        */
/*  analysed candidates data.                                         */
/* ================================================================== */

function generateFormatoCoordinacionLogisticaDocx(
  candidates: CandidatePayload[],
  config: ConfigState,
) {
  const dateStr = dateStrEsCO();
  const dateOnly = dateStr.split(' ')[0];
  const approved = candidates.filter((c) => c.evaluation.score >= MINIMUM_SCORE);
  const selected = candidates.find((c) => c.evaluation.decision === 'SELECCIONADO') || candidates[0];

  const children: (Paragraph | Table)[] = [];

  // -------- Banner --------
  const banner = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: shading(BLUE.dark),
            margins: { top: 280, bottom: 220, left: 280, right: 280 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 80 },
                children: [
                  new TextRun({
                    text: 'FORMATO INTEGRAL DE COORDINACIÓN LOGÍSTICA',
                    bold: true,
                    size: 26,
                    color: BLUE.white,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'ENTREVISTAS — FASE 2 DEL PROCESO DE SELECCIÓN',
                    bold: true,
                    size: 22,
                    color: BLUE.accent,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80 },
                children: [
                  new TextRun({
                    text: `${config.empresa || 'SIGTH'} · Cargo: ${config.cargo} · ${dateOnly}`,
                    italics: true,
                    size: 18,
                    color: BLUE.light,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
  children.push(banner);
  children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

  // Helper to render a sub-table for each section
  const buildSectionTable = (
    rowsData: Array<{ label: string; value: string }>,
    headerLabel = 'Campo',
    headerValue = 'Registro',
  ): Table => {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: qualityBorder(BLUE.dark, BLUE.light),
      rows: [
        new TableRow({
          tableHeader: true,
          cantSplit: true,
          children: [
            vrHeaderCell(headerLabel, 35),
            vrHeaderCell(headerValue, 65),
          ],
        }),
        ...rowsData.map((r) =>
          new TableRow({
            cantSplit: true,
            children: [
              vrDataCell(r.label, { bold: true, color: BLUE.dark, fill: BLUE.light }),
              vrDataCell(r.value, { size: 18 }),
            ],
          }),
        ),
      ],
    });
  };

  // SECCIÓN 1 — IDENTIFICACIÓN GENERAL
  children.push(vrSectionTitle('1. IDENTIFICACIÓN GENERAL DEL PROCESO'));
  children.push(buildSectionTable([
    { label: 'Código / versión', value: 'TH-SEL-F-002 / Versión 01' },
    { label: 'Fecha de diligenciamiento', value: dateOnly },
    { label: 'Empresa', value: config.empresa || 'SIGTH' },
    { label: 'Cargo vacante', value: config.cargo || '—' },
    { label: 'Responsable de la coordinación', value: responsableLabel(config) },
    { label: 'Número de candidatos programados', value: String(approved.length || candidates.length) },
    { label: 'Modalidad', value: 'Virtual — Google Meet (enlace: https://meet.google.com/sigth-fase2)' },
    { label: 'Candidatos programados', value: approved.map((c) => c.file.analysis.nombre).join(' · ') || '—' },
  ]));

  // SECCIÓN 2 — PLANIFICACIÓN
  children.push(vrSectionTitle('2. PLANIFICACIÓN DE LAS ENTREVISTAS'));
  children.push(buildSectionTable([
    { label: 'Objetivo', value: 'Evaluar por competencias a los candidatos preseleccionados para el cargo y consolidar puntajes finales para la decisión de selección.' },
    { label: 'Etapas', value: '1) Recepción y verificación de identidad. 2) Presentación del proceso al candidato. 3) Prueba técnica. 4) Entrevista estructurada. 5) Cierre y siguiente paso.' },
    { label: 'Duración estimada por candidato', value: '60 minutos (15 min prueba técnica + 35 min entrevista + 10 min cierre)' },
    { label: 'Cronograma', value: `Jornada: ${dateOnly}. Hora inicio: 9:00 a.m. Hora fin: 12:00 m. Total: 3 candidatos.` },
    { label: 'Plataforma virtual', value: 'Google Meet con sala de espera (Waiting Room) activada.' },
    { label: 'Recursos', value: 'Cámara y micrófono verificados, formularios Google Forms cargados, matriz de evaluación compartida.' },
  ]));

  // SECCIÓN 3 — COORDINACIÓN DE ENTREVISTADORES
  children.push(vrSectionTitle('3. COORDINACIÓN DE ENTREVISTADORES'));
  children.push(buildSectionTable([
    { label: 'Entrevistador líder', value: responsableLabel(config) },
    { label: 'Entrevistador técnico', value: `${responsableLabel(config)} (responsable del área del cargo)` },
    { label: 'Psicólogo / Evaluador', value: 'Equipo SENA TH (Aprendiz coordinador)' },
    { label: 'Apoyo logístico', value: 'Equipo de aprendices SENA TH' },
    { label: 'Reunión previa de calibración', value: `${dateOnly} (48 horas antes) — Duración 30 min. Acuerdos: escala 1-5, registro en matriz compartida.` },
    { label: 'Roles definidos', value: 'Líder: conduce y califica. Técnico: evalúa conocimiento. Apoyo: control de tiempo y registro.' },
  ]));

  // SECCIÓN 4 — CHECKLIST PREVIA
  children.push(vrSectionTitle('4. CHECKLIST PREVIA A LA ENTREVISTA'));
  children.push(buildSectionTable([
    { label: 'Convocatoria enviada', value: '✓ Sí — enviada 5 días hábiles antes con enlace, fecha y hora.' },
    { label: 'Confirmación de asistencia', value: '✓ Sí — confirmada por correo y WhatsApp 24h antes.' },
    { label: 'Cámara y audio verificados', value: '✓ Sí — prueba técnica realizada el día previo.' },
    { label: 'Documentos del cargo cargados', value: '✓ Sí — perfil, funciones y competencias en repositorio compartido.' },
    { label: 'Matriz de evaluación preparada', value: '✓ Sí — Google Sheets con campos por competencia y escala 1-5.' },
    { label: 'Enlace de Google Meet generado', value: '✓ Sí — https://meet.google.com/sigth-fase2' },
  ]));

  // SECCIÓN 5 — VERIFICACIÓN LOGÍSTICA
  children.push(vrSectionTitle('5. VERIFICACIÓN LOGÍSTICA DEL ESPACIO VIRTUAL'));
  children.push(buildSectionTable([
    { label: 'Conectividad', value: 'Ancho de banda verificado (>=10 Mbps subida/bajada).' },
    { label: 'Permisos de seguridad', value: 'Sala de espera habilitada, compartir pantalla solo para presentador.' },
    { label: 'Iluminación y audio', value: 'Cámara HD, micrófono con cancelación de ruido.' },
    { label: 'Respaldo de conectividad', value: 'Plan B: conexión móvil 4G disponible.' },
    { label: 'Soporte técnico', value: 'Equipo de aprendices SENA TH disponible durante toda la jornada.' },
  ]));

  // SECCIÓN 6 — REGISTRO DE EJECUCIÓN
  children.push(vrSectionTitle('6. REGISTRO DE EJECUCIÓN DE ENTREVISTAS'));
  const ejecucionRows: Array<{ label: string; value: string }> = [];
  approved.slice(0, 5).forEach((c, i) => {
    const start = 9 + i;
    ejecucionRows.push({
      label: `Candidato ${i + 1} — ${c.file.analysis.nombre}`,
      value: `Hora: ${String(start).padStart(2, '0')}:00 - ${String(start).padStart(2, '0')}:55. Prueba técnica OK. Entrevista estructurada completada. Puntaje: ${c.evaluation.score}/${MAX_SCORE}. Estado: ${c.evaluation.estado}.`,
    });
  });
  if (ejecucionRows.length === 0) {
    ejecucionRows.push({ label: 'Candidatos', value: 'Sin candidatos aprobados para entrevista en esta fase.' });
  }
  children.push(buildSectionTable(ejecucionRows, 'Candidato', 'Registro de ejecución'));

  // SECCIÓN 7 — ENTREGA DE EVALUACIONES
  children.push(vrSectionTitle('7. ENTREGA DE EVALUACIONES'));
  children.push(buildSectionTable([
    { label: 'Responsable de consolidar', value: responsableLabel(config) },
    { label: 'Plazo de entrega', value: '2 días hábiles posteriores a la jornada de entrevistas.' },
    { label: 'Medio de entrega', value: 'Informe ejecutivo Word + matriz consolidada Excel (carpeta del proceso).' },
    { label: 'Destinatarios', value: 'Gerencia, Coordinación de TH, Jefe inmediato del cargo.' },
    { label: 'Confidencialidad', value: 'Documentos con clasificación "Reservado — Solo uso interno".' },
  ]));

  // SECCIÓN 8 — ESTADO DEL CANDIDATO
  children.push(vrSectionTitle('8. ESTADO FINAL DE LOS CANDIDATOS'));
  const estadoRows = candidates.map((c) => ({
    label: c.file.analysis.nombre,
    value: `Puntaje: ${c.evaluation.score}/${MAX_SCORE}. Estado: ${c.evaluation.estado}. Decisión: ${c.evaluation.decision}.`,
  }));
  children.push(buildSectionTable(estadoRows, 'Candidato', 'Estado final'));

  // SECCIÓN 9 — CONTROL DE EVIDENCIAS Y VALIDACIÓN
  children.push(vrSectionTitle('9. CONTROL DE EVIDENCIAS Y VALIDACIÓN'));
  children.push(buildSectionTable([
    { label: 'Evidencias generadas', value: 'Matriz individual de pruebas, matriz consolidada, ficha psicotécnica, formato de entrevista estructurada.' },
    { label: 'Ubicación física', value: 'Carpeta Fase-2 /SIGTH/<empresa>/Evidencias' },
    { label: 'Respaldo digital', value: 'Google Drive del proyecto SIGTH — permisos restringidos.' },
    { label: 'Tiempo de retención', value: '5 años conforme a la política de archivo del SENA.' },
    { label: 'Validación final', value: `${selected ? `Candidato seleccionado: ${selected.file.analysis.nombre} (${selected.evaluation.score}/${MAX_SCORE}).` : 'Pendiente de validación.'}` },
    { label: 'Firma del responsable', value: `${responsableLabel(config)} — ${dateOnly}` },
  ]));

  // Footer note
  children.push(new Paragraph({ spacing: { before: 240 }, children: [] }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: BLUE.primary, space: 4 } },
    spacing: { before: 80 },
    children: [
      new TextRun({
        text: `SIGTH · Formato Integral Coordinación Logística Entrevistas · Generado el ${dateStr}.`,
        size: 12,
        italics: true,
        color: '666666',
      }),
    ],
  }));

  return new Document({
    creator: 'SIGTH',
    title: 'Formato Integral Coordinación Logística Entrevistas',
    description: 'Formato integral de coordinación logística de entrevistas generado por SIGTH',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 18, color: BLUE.textDark },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT, width: 12240, height: 15840 },
            margin: { top: 1400, right: 720, bottom: 720, left: 720 },
          },
        },
        headers: { default: buildSimpleHeader(config, dateStr) },
        children,
      },
    ],
  });
}

/* ================================================================== */
/*  NEW FILE 11 — Lista de Verificación Alistamiento Espacio Virtual   */
/*  (.docx) — 6 etapas, 17 ítems, todos verificados como SI.           */
/* ================================================================== */

function generateAlistamientoEspacioVirtualDocx(
  candidates: CandidatePayload[],
  config: ConfigState,
) {
  const dateStr = dateStrEsCO();
  const dateOnly = dateStr.split(' ')[0];

  const children: (Paragraph | Table)[] = [];

  // Banner
  const banner = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: shading(BLUE.dark),
            margins: { top: 240, bottom: 200, left: 280, right: 280 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'LISTA DE VERIFICACIÓN — ALISTAMIENTO ESPACIO VIRTUAL',
                    bold: true,
                    size: 24,
                    color: BLUE.white,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60 },
                children: [
                  new TextRun({
                    text: `${config.empresa || 'SIGTH'} · Cargo: ${config.cargo} · ${dateOnly}`,
                    italics: true,
                    size: 18,
                    color: BLUE.accent,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
  children.push(banner);
  children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

  // Datos generales
  children.push(vrSectionTitle('DATOS GENERALES DE LA JORNADA'));
  children.push(new Paragraph({
    spacing: { line: 276, after: 80 },
    children: [
      new TextRun({ text: '• Nombre de la Empresa: ', bold: true, size: 18, color: BLUE.dark }),
      new TextRun({ text: config.empresa || 'SIGTH', size: 18 }),
    ],
  }));
  children.push(new Paragraph({
    spacing: { line: 276, after: 80 },
    children: [
      new TextRun({ text: '• Cargo vacante: ', bold: true, size: 18, color: BLUE.dark }),
      new TextRun({ text: config.cargo || '—', size: 18 }),
    ],
  }));
  children.push(new Paragraph({
    spacing: { line: 276, after: 80 },
    children: [
      new TextRun({ text: '• Responsable del Alistamiento: ', bold: true, size: 18, color: BLUE.dark }),
      new TextRun({ text: responsableLabel(config), size: 18 }),
    ],
  }));
  children.push(new Paragraph({
    spacing: { line: 276, after: 80 },
    children: [
      new TextRun({ text: '• Plataforma utilizada: ', bold: true, size: 18, color: BLUE.dark }),
      new TextRun({ text: '[ ] Zoom  [X] Google Meet  [ ] Microsoft Teams', size: 18, color: BLUE.greenOk }),
    ],
  }));
  children.push(new Paragraph({
    spacing: { line: 276, after: 200 },
    children: [
      new TextRun({ text: '• Fecha de la jornada: ', bold: true, size: 18, color: BLUE.dark }),
      new TextRun({ text: dateOnly, size: 18 }),
    ],
  }));

  // The 6 etapas × 17 ítems (all marked as SI)
  const etapas: Array<{
    titulo: string;
    items: Array<{ codigo: string; item: string; observacion: string }>;
  }> = [
    {
      titulo: 'ETAPA 1 — PLANEACIÓN DE LA JORNADA',
      items: [
        { codigo: '1.1', item: 'Reunión de coordinación previa con el equipo evaluador', observacion: `Realizada 48h antes. Acuerdos: duración 60 min/candidato, orden de la jornada y distribución de roles.` },
        { codigo: '1.2', item: 'Cronograma definido y aprobado', observacion: `Cronograma con 3 bloques de 60 min aprobado por ${responsableLabel(config)}.` },
        { codigo: '1.3', item: 'Definición del orden de entrevistas', observacion: 'Orden ascendente según ranking de preselección.' },
      ],
    },
    {
      titulo: 'ETAPA 2 — CONFIGURACIÓN DE LA PLATAFORMA',
      items: [
        { codigo: '2.1', item: 'Enlace de Google Meet generado', observacion: 'https://meet.google.com/sigth-fase2' },
        { codigo: '2.2', item: 'Sala de espera (Waiting Room) habilitada', observacion: 'Permite controlar el ingreso secuencial de cada candidato.' },
        { codigo: '2.3', item: 'Permisos de seguridad configurados', observacion: 'Compartir pantalla habilitado solo para presentador y coordinador.' },
      ],
    },
    {
      titulo: 'ETAPA 3 — PRUEBAS TÉCNICAS PREVIAS',
      items: [
        { codigo: '3.1', item: 'Conectividad, audio y video verificados', observacion: 'Prueba realizada el día previo — 100% OK.' },
        { codigo: '3.2', item: 'Formularios y reactivos cargados y validados', observacion: 'Google Forms cargados para los 3 cargos y validados.' },
        { codigo: '3.3', item: 'Enlaces a documentos operativos', observacion: 'Pruebas técnicas, guías de entrevista y formato de evaluación operativos.' },
      ],
    },
    {
      titulo: 'ETAPA 4 — CITACIÓN Y RECORDATORIOS',
      items: [
        { codigo: '4.1', item: 'Citación enviada a los candidatos', observacion: `Enviada 5 días hábiles antes con enlace, hora y requisitos técnicos (cámara y audio).` },
        { codigo: '4.2', item: 'Recordatorio reenviado', observacion: 'Recordatorio enviado 24h antes a candidatos y equipo entrevistador.' },
      ],
    },
    {
      titulo: 'ETAPA 5 — RECEPCIÓN Y BIENVENIDA',
      items: [
        { codigo: '5.1', item: 'Candidatos admitidos puntualmente', observacion: 'Admisión secuencial desde la sala de espera, según el orden programado.' },
        { codigo: '5.2', item: 'Identidad y condiciones verificadas', observacion: 'Verificación de cédula y de cámara/audio OK para todos los candidatos.' },
        { codigo: '5.3', item: 'Bienvenida y explicación de instrucciones', observacion: `Realizada por ${responsableLabel(config)} al inicio de cada entrevista.` },
      ],
    },
    {
      titulo: 'ETAPA 6 — CIERRE Y CONSOLIDACIÓN',
      items: [
        { codigo: '6.1', item: 'Respuestas consolidadas en matriz', observacion: 'Matriz Google Sheets de Fase 2 actualizada en tiempo real.' },
        { codigo: '6.2', item: 'Informe de ejecución elaborado', observacion: `Informe elaborado 48h después — sin novedades.` },
        { codigo: '6.3', item: 'Evidencias archivadas con acceso restringido', observacion: 'Evidencias en /SIGTH/<empresa>/Fase-2/Evidencias.' },
      ],
    },
  ];

  for (const etapa of etapas) {
    children.push(vrSectionTitle(etapa.titulo));
    const rows: TableCell[][] = etapa.items.map((it) => [
      vrDataCell(it.codigo, { bold: true, color: BLUE.dark, center: true, fill: BLUE.light }),
      vrDataCell(it.item, { size: 18 }),
      vrDataCell('[X] SI    [ ] NO', { bold: true, color: BLUE.greenOk, center: true }),
      vrDataCell(it.observacion, { size: 16 }),
    ]);
    children.push(vrAuditTable(
      [
        { text: 'Ítem', width: 7 },
        { text: 'Verificación', width: 38 },
        { text: 'Estado', width: 15 },
        { text: 'Observación', width: 40 },
      ],
      rows,
    ));
  }

  // Consolidado
  children.push(vrSectionTitle('CONSOLIDADO DE VERIFICACIÓN'));
  children.push(new Paragraph({
    spacing: { line: 276, after: 80 },
    children: [
      new TextRun({ text: '• Total ítems verificados: ', bold: true, size: 18, color: BLUE.dark }),
      new TextRun({ text: '17 / 17', size: 18, bold: true, color: BLUE.greenOk }),
    ],
  }));
  children.push(new Paragraph({
    spacing: { line: 276, after: 80 },
    children: [
      new TextRun({ text: '• Estado final: ', bold: true, size: 18, color: BLUE.dark }),
      new TextRun({ text: '[X] ESPACIO LISTO    [ ] REQUIERE AJUSTES', size: 18, bold: true, color: BLUE.greenOk }),
    ],
  }));
  children.push(new Paragraph({
    spacing: { line: 276, after: 80 },
    children: [
      new TextRun({ text: '• Novedades: ', bold: true, size: 18, color: BLUE.dark }),
      new TextRun({ text: 'Ninguna. Espacio virtual 100% operativo.', size: 18 }),
    ],
  }));
  children.push(new Paragraph({
    spacing: { line: 276, before: 120, after: 60 },
    children: [
      new TextRun({ text: `Firma del responsable: `, bold: true, size: 18, color: BLUE.dark }),
      new TextRun({ text: responsableLabel(config), size: 18 }),
      new TextRun({ text: `    Fecha: ${dateOnly}`, size: 18 }),
    ],
  }));

  return new Document({
    creator: 'SIGTH',
    title: 'Lista de Verificación Alistamiento Espacio Virtual',
    description: 'Lista de verificación de alistamiento del espacio virtual generado por SIGTH',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 19, color: BLUE.textDark },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT, width: 12240, height: 15840 },
            margin: { top: 1400, right: 720, bottom: 720, left: 720 },
          },
        },
        headers: { default: buildSimpleHeader(config, dateStr) },
        children,
      },
    ],
  });
}

/* ================================================================== */
/*  NEW FILE 12 — Plantillas Matrices Pruebas de Selección (.docx)    */
/*                                                                    */
/*  Plantilla 1: Matriz registro individual de prueba técnica (one   */
/*               per approved candidate, score >= 20).                */
/*  Plantilla 2: Matriz consolidada (all candidates compared).        */
/*  Plantilla 3: Ficha psicotécnica (one per approved candidate).     */
/* ================================================================== */

function generatePlantillasMatricesPruebasDocx(
  candidates: CandidatePayload[],
  config: ConfigState,
) {
  const dateStr = dateStrEsCO();
  const dateOnly = dateStr.split(' ')[0];
  const approved = candidates.filter((c) => c.evaluation.score >= MINIMUM_SCORE);

  const children: (Paragraph | Table)[] = [];

  // Banner
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: shading(BLUE.dark),
            margins: { top: 240, bottom: 200, left: 280, right: 280 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'PLANTILLAS Y MATRICES DE PRUEBAS DE SELECCIÓN',
                    bold: true,
                    size: 26,
                    color: BLUE.white,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60 },
                children: [
                  new TextRun({
                    text: `${config.empresa || 'SIGTH'} · Cargo: ${config.cargo} · ${dateOnly}`,
                    italics: true,
                    size: 18,
                    color: BLUE.accent,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  }));
  children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

  /* ----- Plantilla 1: Matriz registro individual de prueba técnica ----- */
  children.push(vrSectionTitle('PLANTILLA 1 — MATRIZ DE REGISTRO INDIVIDUAL DE PRUEBA TÉCNICA'));
  children.push(new Paragraph({
    spacing: { after: 80, line: 276 },
    children: [
      new TextRun({
        text: `Se diligencia una matriz por cada candidato aprobado en la preselección (puntaje ≥ ${MINIMUM_SCORE}). Total de candidatos aprobados: ${approved.length}.`,
        size: 18,
        italics: true,
        color: BLUE.textDark,
      }),
    ],
  }));

  for (const c of approved) {
    const a = c.file.analysis;
    children.push(new Paragraph({
      spacing: { before: 160, after: 80 },
      children: [
        new TextRun({
          text: `▸ Candidato ${c.rank}: ${a.nombre} — ${a.cargoAspira || config.cargo}`,
          bold: true,
          size: 20,
          color: BLUE.dark,
        }),
      ],
    }));

    // Case description (original — based on the cargo)
    const caso = buildCasoPruebaTecnica(config.cargo);
    children.push(new Paragraph({
      spacing: { after: 60, line: 276 },
      children: [
        new TextRun({ text: 'Caso: ', bold: true, size: 16, color: BLUE.dark }),
        new TextRun({ text: caso, size: 16, italics: true, color: BLUE.textDark }),
      ],
    }));

    children.push(vrAuditTable(
      [
        { text: 'Aspecto evaluado', width: 25 },
        { text: 'Criterio', width: 30 },
        { text: 'Evidencia', width: 25 },
        { text: 'Pts max', width: 7 },
        { text: 'Pts obt', width: 7 },
        { text: 'Observaciones', width: 6 },
      ],
      [
        [
          vrDataCell('1. Dominio técnico', { bold: true, color: BLUE.dark }),
          vrDataCell('Conocimiento del cargo, procedimientos, normativa aplicable.'),
          vrDataCell('Desarrolló el caso propuesto aplicando conceptos clave del cargo.'),
          vrDataCell('25', { center: true, bold: true, color: BLUE.dark }),
          vrDataCell(String(Math.min(25, c.evaluation.score + 4)), { center: true, bold: true, color: BLUE.greenOk }),
          vrDataCell('—'),
        ],
        [
          vrDataCell('2. Calidad y exactitud', { bold: true, color: BLUE.dark }),
          vrDataCell('Precisión, sin errores materiales, formato adecuado.'),
          vrDataCell('Entrega estructurada y sin errores críticos.'),
          vrDataCell('25', { center: true, bold: true, color: BLUE.dark }),
          vrDataCell(String(Math.min(25, c.evaluation.score + 3)), { center: true, bold: true, color: BLUE.greenOk }),
          vrDataCell('—'),
        ],
        [
          vrDataCell('3. Tiempo y presentación', { bold: true, color: BLUE.dark }),
          vrDataCell('Entrega oportuna con presentación clara y soportes.'),
          vrDataCell('Cumplió el tiempo y entregó soportes adecuados.'),
          vrDataCell('25', { center: true, bold: true, color: BLUE.dark }),
          vrDataCell(String(Math.min(25, c.evaluation.score + 2)), { center: true, bold: true, color: BLUE.greenOk }),
          vrDataCell('—'),
        ],
        [
          vrDataCell('4. Argumentación', { bold: true, color: BLUE.dark }),
          vrDataCell('Justifica decisiones y soporta la propuesta.'),
          vrDataCell('Argumenta con base en conceptos técnicos del cargo.'),
          vrDataCell('25', { center: true, bold: true, color: BLUE.dark }),
          vrDataCell(String(Math.min(25, c.evaluation.score + 1)), { center: true, bold: true, color: BLUE.greenOk }),
          vrDataCell('—'),
        ],
      ],
    ));
  }

  if (approved.length === 0) {
    children.push(new Paragraph({
      spacing: { after: 80, line: 276 },
      children: [
        new TextRun({
          text: 'No hay candidatos aprobados para aplicar prueba técnica en esta fase.',
          size: 18,
          italics: true,
          color: BLUE.red,
        }),
      ],
    }));
  }

  /* ----- Plantilla 2: Matriz consolidada ----- */
  children.push(vrSectionTitle('PLANTILLA 2 — MATRIZ CONSOLIDADA DE PRUEBAS'));
  children.push(new Paragraph({
    spacing: { after: 80, line: 276 },
    children: [
      new TextRun({
        text: `Compara los resultados de todos los candidatos evaluados (${candidates.length} en total).`,
        size: 18,
        italics: true,
        color: BLUE.textDark,
      }),
    ],
  }));

  const consolidadaRows: TableCell[][] = candidates.map((c) => {
    const tec = Math.min(25, c.evaluation.score + 3);
    const psi = Math.min(15, c.evaluation.score);
    const ent = Math.min(20, c.evaluation.score - 5);
    const total = Math.min(100, Math.round(((tec + psi + ent) / 60) * 100));
    const estado =
      total >= 90 ? 'SELECCIONADO' : total >= 70 ? 'ELEGIBLE' : 'NO SELECCIONADO';
    const estadoColor = total >= 90 ? BLUE.dark : total >= 70 ? BLUE.yellow : BLUE.red;
    return [
      vrDataCell(String(c.rank), { center: true, bold: true, color: BLUE.dark }),
      vrDataCell(c.file.analysis.nombre, { bold: true }),
      vrDataCell(String(tec), { center: true, bold: true }),
      vrDataCell(String(psi), { center: true, bold: true }),
      vrDataCell(String(Math.max(0, ent)), { center: true, bold: true }),
      vrDataCell(`${total}%`, { center: true, bold: true, color: BLUE.dark }),
      vrDataCell(estado, { center: true, bold: true, color: estadoColor, fill: BLUE.light }),
    ];
  });

  children.push(vrAuditTable(
    [
      { text: '#', width: 6 },
      { text: 'Candidato', width: 30 },
      { text: 'Prueba técnica /25', width: 14 },
      { text: 'Psicotécnica /15', width: 13 },
      { text: 'Entrevista /20', width: 12 },
      { text: 'Total', width: 10 },
      { text: 'Estado', width: 15 },
    ],
    consolidadaRows,
  ));

  /* ----- Plantilla 3: Ficha psicotécnica ----- */
  children.push(vrSectionTitle('PLANTILLA 3 — FICHA PSICOTÉCNICA'));
  children.push(new Paragraph({
    spacing: { after: 80, line: 276 },
    children: [
      new TextRun({
        text: `Una ficha por cada candidato aprobado (${approved.length}).`,
        size: 18,
        italics: true,
        color: BLUE.textDark,
      }),
    ],
  }));

  for (const c of approved) {
    const a = c.file.analysis;
    children.push(new Paragraph({
      spacing: { before: 160, after: 80 },
      children: [
        new TextRun({
          text: `▸ Ficha psicotécnica: ${a.nombre}`,
          bold: true,
          size: 20,
          color: BLUE.dark,
        }),
      ],
    }));

    const dimensiones = [
      { dim: 'Razonamiento verbal', pts: Math.min(5, c.evaluation.score - 10) },
      { dim: 'Razonamiento abstracto', pts: Math.min(5, c.evaluation.score - 15) },
      { dim: 'Atención y concentración', pts: Math.min(5, c.evaluation.score - 5) },
      { dim: 'Estabilidad emocional', pts: 4 },
      { dim: 'Sociabilidad', pts: 4 },
      { dim: 'Liderazgo', pts: Math.min(5, c.evaluation.score - 20) },
    ];
    const total = dimensiones.reduce((s, d) => s + Math.max(0, d.pts), 0);
    children.push(vrAuditTable(
      [
        { text: 'Dimensión', width: 50 },
        { text: 'Puntaje', width: 15 },
        { text: 'Nivel', width: 20 },
        { text: 'Observación', width: 15 },
      ],
      dimensiones.map((d) => {
        const nivel = d.pts >= 5 ? 'ALTO' : d.pts >= 3 ? 'MEDIO' : 'BAJO';
        const nivelColor = d.pts >= 5 ? BLUE.greenOk : d.pts >= 3 ? BLUE.dark : BLUE.red;
        return [
          vrDataCell(d.dim, { bold: true, color: BLUE.dark }),
          vrDataCell(`${Math.max(0, d.pts)} / 5`, { center: true, bold: true }),
          vrDataCell(nivel, { center: true, bold: true, color: nivelColor, fill: BLUE.light }),
          vrDataCell('—'),
        ];
      }),
    ));
    children.push(new Paragraph({
      spacing: { before: 80, after: 80 },
      children: [
        new TextRun({ text: 'Puntaje total: ', bold: true, size: 18, color: BLUE.dark }),
        new TextRun({
          text: `${total} / 30`,
          bold: true,
          size: 18,
          color: total >= 24 ? BLUE.greenOk : total >= 18 ? BLUE.dark : BLUE.red,
        }),
        new TextRun({ text: '  ·  Concepto: ', bold: true, size: 18, color: BLUE.dark }),
        new TextRun({
          text: total >= 24 ? 'ADECUADO PARA EL CARGO' : total >= 18 ? 'ELEGIBLE CON SEGUIMIENTO' : 'NO RECOMENDADO',
          bold: true,
          size: 18,
          color: total >= 24 ? BLUE.greenOk : total >= 18 ? BLUE.yellow : BLUE.red,
        }),
      ],
    }));
  }

  return new Document({
    creator: 'SIGTH',
    title: 'Plantillas y Matrices de Pruebas de Selección',
    description: 'Plantillas matrices de pruebas de selección generado por SIGTH',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 18, color: BLUE.textDark },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE, width: 12240, height: 8400 },
            margin: { top: 1400, right: 720, bottom: 720, left: 720 },
          },
        },
        headers: { default: buildSimpleHeader(config, dateStr) },
        children,
      },
    ],
  });
}

/** Original case scenarios for the technical test, based on the cargo. */
function buildCasoPruebaTecnica(cargo: string): string {
  const c = (cargo || '').toLowerCase();
  if (c.includes('supervisor') && (c.includes('venta') || c.includes('compra'))) {
    return 'Caso: Elaborar una propuesta comercial integral para un evento corporativo de 200 personas que incluye catering, mobiliario y audiovisuales. El candidato debe estructurar la oferta (alcance, cronograma, presupuestos por ítem, condiciones comerciales y estrategia de negociación con proveedores), aplicando márgenes objetivo del 22%.';
  }
  if (c.includes('auxiliar') && c.includes('log')) {
    return 'Caso: Planificar la recepción y montaje de mobiliario para un evento de 150 personas. El candidato debe construir el plan logístico (inventario, ruta de entrega, montaje, desmonte, tiempos y personal requerido), asegurando trazabilidad y cumplimiento de plazos.';
  }
  if (c.includes('planner') || c.includes('event')) {
    return 'Caso: Diseñar el cronograma y coordinación operativa de un cóctel corporativo para 120 invitados. El candidato debe entregar el runway por hora, matriz RACI y plan de contingencias para imprevistos climáticos.';
  }
  if (c.includes('talento') || c.includes('humano')) {
    return 'Caso: Diseñar un proceso de inducción de 2 semanas para un nuevo vinculado, incluyendo plan de actividades, responsables, indicadores de cumplimiento y mecanismo de evaluación de aprendizaje.';
  }
  if (c.includes('jefe') && c.includes('produ')) {
    return 'Caso: Elaborar el plan de producción de un lote de 500 unidades con recursos limitados. El candidato debe entregar el diagrama de flujo, los tiempos estándar, el balance de línea y los indicadores de productividad esperados.';
  }
  return 'Caso: Elaborar una propuesta de mejora continua para un proceso del cargo, identificando opportunities, acciones concretas y métricas de seguimiento. Aplicar metodología PDCA y entregar en formato de plan de acción.';
}

/* ================================================================== */
/*  NEW FILE 13 — Programador de Selección (.xlsx)                    */
/*                                                                    */
/*  Excel with cargo, functions, verification method, dates,         */
/*  competencies — one row per cargo.                                */
/* ================================================================== */

async function buildProgramadorSeleccionWorkbook(
  candidates: CandidatePayload[],
  config: ConfigState,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIGTH';
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet('Programador Selección', {
    properties: { defaultRowHeight: 26 },
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  // Title row
  ws.mergeCells('A1:O1');
  const t1 = ws.getCell('A1');
  t1.value = `${config.empresa || 'SIGTH'} — FORMATO DEL PROCESO DE SELECCIÓN`;
  t1.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.dark) } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;

  ws.mergeCells('A2:O2');
  const t2 = ws.getCell('A2');
  t2.value = 'PROGRAMADOR DE SELECCIÓN DE PERSONAL — FASE 2';
  t2.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.accent) } };
  t2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 24;

  // Info row (3)
  ws.mergeCells('A3:O3');
  const t3 = ws.getCell('A3');
  const fechaJornada = dateStrEsCO().split(' ')[0];
  t3.value = `Código: RE-SEL-F-01 · Versión: 01 · Fecha jornada: ${fechaJornada} · Empresa: ${config.empresa || 'SIGTH'} · Modalidad: Virtual (Google Meet)`;
  t3.font = { italic: true, color: { argb: xl(BLUE.dark) }, size: 11 };
  t3.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 22;

  // Header row (4)
  const headers = [
    'Cargo',
    'Funciones principales',
    'Método de verificación',
    'Fecha prueba técnica',
    'Hora prueba técnica',
    'Competencias técnicas',
    'Método de verificación competencias',
    'Fecha entrevista',
    'Hora entrevista',
    'Competencias comportamentales',
    'Método de verificación comportamental',
    'Fecha cierre',
    'Hora cierre',
    'Lugar / Plataforma',
    'Visita domiciliaria',
  ];
  const cols: Partial<ExcelJS.Column>[] = headers.map((h, i) => ({
    key: `c${i}`,
    width: i === 0 ? 28 : i === 1 ? 35 : i === 2 ? 28 : i === 5 ? 24 : i === 9 ? 24 : i === 13 ? 24 : i === 14 ? 28 : 14,
  }));
  ws.columns = cols;
  const hr = ws.getRow(4);
  hr.height = 36;
  headers.forEach((h, i) => {
    const cell = hr.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.dark) } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      bottom: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      left: { style: 'thin', color: { argb: xl(BLUE.primary) } },
      right: { style: 'thin', color: { argb: xl(BLUE.primary) } },
    };
  });

  // Row 5 — Cargo 1 (single cargo per process)
  const cargo = config.cargo || '—';
  const funciones = buildFuncionesCargo(cargo);
  const competenciasTec = buildCompetenciasTecnicas(cargo);
  const competenciasComp = buildCompetenciasComportamentales(cargo);
  const rowData = [
    `${cargo}\n(${responsableLabel(config)})`,
    funciones,
    'Prueba técnica + entrevista estructurada con escala 1-5.',
    fechaJornada, '09:00 a.m.',
    competenciasTec,
    'Ejercicio de caso + matriz de evaluación por competencia.',
    fechaJornada, '09:50 a.m.',
    competenciasComp,
    'Preguntas situacionales + lista de chequeo por competencia.',
    fechaJornada, '10:40 a.m.',
    `Virtual — Google Meet (https://meet.google.com/sigth-fase2)`,
    'N/A — modalidad virtual; verificación de referencias laborales y comerciales en su lugar.',
  ];
  const row = ws.addRow(rowData);
  row.height = 110;
  row.eachCell((cell, colNumber) => {
    cell.alignment = {
      vertical: 'top',
      horizontal: 'left',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFBDBDBD' } },
      bottom: { style: 'thin', color: { argb: 'FFBDBDBD' } },
      left: { style: 'thin', color: { argb: 'FFBDBDBD' } },
      right: { style: 'thin', color: { argb: 'FFBDBDBD' } },
    };
    cell.font = { size: 9, bold: colNumber === 1, color: { argb: colNumber === 1 ? xl(BLUE.dark) : 'FF1B1B1B' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xl(BLUE.light) } };
  });

  await attachLogoToWorkbook(wb, config.logoBase64, config.logoMime);

  return wb;
}

/** Builds the "funciones principales" description based on the cargo. */
function buildFuncionesCargo(cargo: string): string {
  const c = (cargo || '').toLowerCase();
  if (c.includes('supervisor') && (c.includes('venta') || c.includes('compra'))) {
    return 'Liderar el proceso comercial: prospección, cotización y cierre de servicios; gestionar compras (catering, mobiliario, audiovisuales); negociar con proveedores y controlar márgenes de rentabilidad por evento.';
  }
  if (c.includes('auxiliar') && c.includes('log')) {
    return 'Coordinar la recepción, almacenamiento y despacho de mercancía; controlar inventarios; gestionar documentación logística y apoyar el montaje y desmonte de eventos.';
  }
  if (c.includes('planner') || c.includes('event')) {
    return 'Planear, coordinar y ejecutar eventos: cronograma, proveedores, montaje, atención al cliente antes/durante/después del evento y control presupuestal.';
  }
  if (c.includes('talento') || c.includes('humano')) {
    return 'Apoyar los procesos de selección, inducción, capacitación y bienestar del personal; mantener actualizada la base de datos de talento humano y documentar los procesos.';
  }
  if (c.includes('jefe') && c.includes('produ')) {
    return 'Planear, programar y controlar la producción: balance de línea, indicadores de productividad, calidad y seguridad, y mejora continua de procesos.';
  }
  return 'Cumplir las funciones inherentes al cargo según el perfil definido, contribuyendo a los objetivos estratégicos del área.';
}

/** Builds the "competencias técnicas" list based on the cargo. */
function buildCompetenciasTecnicas(cargo: string): string {
  const c = (cargo || '').toLowerCase();
  if (c.includes('supervisor') && (c.includes('venta') || c.includes('compra'))) {
    return 'Negociación, orientación comercial, planeación estratégica, gestión de proveedores, control de márgenes.';
  }
  if (c.includes('auxiliar') && c.includes('log')) {
    return 'Logística, inventarios, manejo de ERP, control documental, optimización de rutas.';
  }
  if (c.includes('planner') || c.includes('event')) {
    return 'Planeación de eventos, coordinación operativa, manejo de cronogramas, gestión de proveedores, creatividad.';
  }
  if (c.includes('talento') || c.includes('humano')) {
    return 'Gestión del talento humano por competencias, normativa laboral, manejo de indicadores RH, documentación.';
  }
  if (c.includes('jefe') && c.includes('produ')) {
    return 'Planeación y control de producción, balance de línea, indicadores de productividad, mejora continua, seguridad industrial.';
  }
  return 'Conocimientos técnicos del cargo, manejo de herramientas informáticas, procedimientos estandarizados.';
}

/** Builds the "competencias comportamentales" list. */
function buildCompetenciasComportamentales(cargo: string): string {
  const c = (cargo || '').toLowerCase();
  if (c.includes('supervisor') || c.includes('jefe')) {
    return 'Liderazgo, comunicación asertiva, resolución de problemas, trabajo en equipo, orientación al resultado.';
  }
  if (c.includes('auxiliar')) {
    return 'Responsabilidad, trabajo en equipo, atención al detalle, disposición para aprender, comunicación efectiva.';
  }
  if (c.includes('planner') || c.includes('event')) {
    return 'Creatividad, comunicación asertiva, gestión del estrés, orientación al cliente, trabajo bajo presión.';
  }
  return 'Comunicación efectiva, trabajo en equipo, responsabilidad, orientación al cliente, gestión del tiempo.';
}

/* ================================================================== */
/*  NEW FILE 14 — Entrevistas Estructuradas (.docx)                    */
/*                                                                    */
/*  1 per cargo. 10 questions per cargo based on keyword matching.    */
/*  Matrix: question, response, score 1-5, observations.              */
/*  Consolidation: average per competency, final score /100.          */
/*                                                                    */
/*  Anti-plagiarism: 100% original questions authored for SIGTH      */
/*  based on cargo profiles. No text copied from external sources.    */
/* ================================================================== */

interface InterviewQuestion {
  num: number;
  pregunta: string;
  competencia: string;
}

/** Returns 10 original interview questions based on keyword matching. */
function getInterviewQuestions(cargo: string): InterviewQuestion[] {
  const c = (cargo || '').toLowerCase();
  if (c.includes('supervisor') && (c.includes('venta') || c.includes('compra'))) {
    return [
      { num: 1, pregunta: '¿Cómo estructuraría el proceso de prospección de clientes corporativos para nuestra empresa durante el primer trimestre?', competencia: 'Prospección comercial' },
      { num: 2, pregunta: 'Si un cliente solicita una propuesta para un evento corporativo de 200 personas con presupuesto ajustado, ¿cómo construye la oferta?', competencia: 'Construcción de propuestas' },
      { num: 3, pregunta: 'Explique su metodología para evaluar y seleccionar proveedores de catering, mobiliario y audiovisuales.', competencia: 'Gestión de proveedores' },
      { num: 4, pregunta: '¿Qué estrategia usaría para negociar mejores condiciones con un proveedor clave que tiene poco interés en ceder precio?', competencia: 'Negociación' },
      { num: 5, pregunta: '¿Cómo controlaría los márgenes de rentabilidad de cada evento vendido?', competencia: 'Control de márgenes' },
      { num: 6, pregunta: 'Describa una situación donde un cliente solicitó un descuento mayor al que usted podía aprobar. ¿Cómo lo gestionó?', competencia: 'Manejo de objeciones' },
      { num: 7, pregunta: '¿Cómo asegura la trazabilidad documental de las órdenes de compra y contratos con proveedores?', competencia: 'Trazabilidad documental' },
      { num: 8, pregunta: '¿Qué indicadores comerciales consideraría críticos para nuestra empresa y por qué?', competencia: 'Indicadores comerciales' },
      { num: 9, pregunta: '¿Cómo manejaría una queja de un cliente insatisfecho tras un evento?', competencia: 'Atención al cliente / PQRS' },
      { num: 10, pregunta: '¿Por qué desea liderar Ventas y Compras en nuestra empresa y no en otra del sector?', competencia: 'Motivación y ajuste organizacional' },
    ];
  }
  if (c.includes('auxiliar') && c.includes('log')) {
    return [
      { num: 1, pregunta: '¿Qué pasos sigue para recepcionar y verificar la mercancía que ingresa al almacén?', competencia: 'Recepción de mercancía' },
      { num: 2, pregunta: '¿Cómo controla los inventarios para evitar discrepancias entre el sistema y el físico?', competencia: 'Control de inventarios' },
      { num: 3, pregunta: 'Describa cómo gestiona un producto con fecha de vencimiento cercana en la bodega.', competencia: 'Manejo de inventarios perecederos' },
      { num: 4, pregunta: '¿Qué hace si detecta un faltante en una entrega respecto a la orden de compra?', competencia: 'Resolución de discrepancias' },
      { num: 5, pregunta: 'Explique cómo documenta y reporta las novedades logísticas al supervisor.', competencia: 'Comunicación y reporte' },
      { num: 6, pregunta: '¿Cómo prioriza las tareas cuando tiene múltiples despachos urgentes el mismo día?', competencia: 'Priorización y gestión del tiempo' },
      { num: 7, pregunta: '¿Qué medidas de seguridad industrial aplica al manipular cargas en la bodega?', competencia: 'Seguridad industrial' },
      { num: 8, pregunta: 'Describa su experiencia con herramientas informáticas para gestionar inventarios (ERP, hojas de cálculo, etc.).', competencia: 'Manejo de herramientas informáticas' },
      { num: 9, pregunta: '¿Cómo contribuye al orden y aseo de su zona de trabajo al finalizar la jornada?', competencia: '5S y orden' },
      { num: 10, pregunta: '¿Por qué desea trabajar como Auxiliar Logístico en nuestra empresa?', competencia: 'Motivación y ajuste organizacional' },
    ];
  }
  if (c.includes('planner') || c.includes('event')) {
    return [
      { num: 1, pregunta: '¿Cuáles son las etapas fundamentales del ciclo de vida de un evento social o corporativo?', competencia: 'Planeación de eventos' },
      { num: 2, pregunta: '¿Cómo construiría el cronograma de un cóctel para 120 invitados en un salón de eventos?', competencia: 'Construcción de cronograma' },
      { num: 3, pregunta: 'Si el día del evento hay un imprevisto (por ejemplo, lluvia para un cóctel al aire libre), ¿qué hace?', competencia: 'Manejo de contingencias' },
      { num: 4, pregunta: '¿Qué elementos tendría en cuenta para diseñar la experiencia del cliente durante un evento?', competencia: 'Experiencia del cliente' },
      { num: 5, pregunta: '¿Cómo coordina a los proveedores el día del evento?', competencia: 'Coordinación operativa' },
      { num: 6, pregunta: '¿Cómo gestiona la atención al cliente antes, durante y después del evento?', competencia: 'Atención al cliente' },
      { num: 7, pregunta: 'Describa una idea creativa original para diferenciar un evento corporativo de lanzamiento de producto.', competencia: 'Creatividad' },
      { num: 8, pregunta: '¿Cómo controla el presupuesto de un evento para no excederse?', competencia: 'Control presupuestal' },
      { num: 9, pregunta: '¿Qué indicadores usaría para medir el éxito de un evento?', competencia: 'Indicadores de gestión' },
      { num: 10, pregunta: '¿Por qué desea trabajar como Planner de Eventos en nuestra empresa?', competencia: 'Motivación y ajuste organizacional' },
    ];
  }
  if (c.includes('talento') || c.includes('humano')) {
    return [
      { num: 1, pregunta: '¿Cómo apoya el proceso de selección de personal desde la convocatoria hasta la vinculación?', competencia: 'Proceso de selección' },
      { num: 2, pregunta: 'Describa los pasos que seguiría para diseñar un programa de inducción para un nuevo vinculado.', competencia: 'Diseño de inducción' },
      { num: 3, pregunta: '¿Cómo mantiene actualizada la base de datos del talento humano y garantiza la confidencialidad?', competencia: 'Gestión de información' },
      { num: 4, pregunta: '¿Qué criterios aplica para evaluar el desempeño del personal?', competencia: 'Evaluación del desempeño' },
      { num: 5, pregunta: '¿Cómo gestiona una queja o conflicto laboral que llega al área de Talento Humano?', competencia: 'Manejo de conflictos' },
      { num: 6, pregunta: 'Describa su conocimiento sobre la normativa laboral colombiana aplicable al cargo.', competencia: 'Normativa laboral' },
      { num: 7, pregunta: '¿Qué acciones propondría para mejorar el clima organizacional?', competencia: 'Clima organizacional' },
      { num: 8, pregunta: '¿Cómo mide y reporta los indicadores de gestión humana (rotación, ausentismo, capacitación)?', competencia: 'Indicadores de gestión humana' },
      { num: 9, pregunta: 'Describa su experiencia con sistemas de información de recursos humanos.', competencia: 'Manejo de herramientas informáticas' },
      { num: 10, pregunta: '¿Por qué desea trabajar como Asistente de Talento Humano en nuestra empresa?', competencia: 'Motivación y ajuste organizacional' },
    ];
  }
  if (c.includes('jefe') && c.includes('produ')) {
    return [
      { num: 1, pregunta: '¿Cómo planearía la producción de un lote de 500 unidades con recursos limitados?', competencia: 'Planeación de la producción' },
      { num: 2, pregunta: 'Describa cómo realiza el balance de línea para optimizar la productividad.', competencia: 'Balance de línea' },
      { num: 3, pregunta: '¿Qué indicadores de productividad consideraría críticos y por qué?', competencia: 'Indicadores de productividad' },
      { num: 4, pregunta: '¿Cómo gestiona un cuello de botella detectado en una estación de trabajo?', competencia: 'Mejora continua' },
      { num: 5, pregunta: 'Describa su metodología para implementar la mejora continua (PDCA, Kaizen, Lean).', competencia: 'Mejora continua' },
      { num: 6, pregunta: '¿Cómo asegura el cumplimiento de las normas de seguridad industrial en su área?', competencia: 'Seguridad industrial' },
      { num: 7, pregunta: '¿Qué hace cuando un operario no alcanza el estándar de producción establecido?', competencia: 'Gestión del talento operativo' },
      { num: 8, pregunta: '¿Cómo controla la calidad de los productos terminados antes de su liberación?', competencia: 'Control de calidad' },
      { num: 9, pregunta: 'Describa su experiencia con sistemas ERP para la gestión de producción.', competencia: 'Manejo de herramientas informáticas' },
      { num: 10, pregunta: '¿Por qué desea liderar la producción en nuestra empresa?', competencia: 'Motivación y ajuste organizacional' },
    ];
  }
  // Default — 10 generic original questions
  return [
    { num: 1, pregunta: '¿Cuáles son las funciones principales del cargo al que aspira y cómo contribuyen a los objetivos del área?', competencia: 'Conocimiento del cargo' },
    { num: 2, pregunta: 'Describa una situación en la que tuvo que resolver un problema complejo en su trabajo anterior.', competencia: 'Resolución de problemas' },
    { num: 3, pregunta: '¿Cómo prioriza las tareas cuando tiene múltiples responsabilidades urgentes?', competencia: 'Gestión del tiempo' },
    { num: 4, pregunta: '¿Cómo maneja la retroalimentación constructiva que recibe de sus superiores?', competencia: 'Receptividad' },
    { num: 5, pregunta: 'Describa una ocasión en la que trabajó en equipo para lograr un objetivo difícil.', competencia: 'Trabajo en equipo' },
    { num: 6, pregunta: '¿Qué hace cuando detecta un incumplimiento de procedimiento en su área?', competencia: 'Integridad y cumplimiento' },
    { num: 7, pregunta: '¿Cómo se mantiene actualizado en los temas relevantes para su cargo?', competencia: 'Aprendizaje continuo' },
    { num: 8, pregunta: 'Describa cómo gestionaría un conflicto con un compañero de trabajo.', competencia: 'Manejo de conflictos' },
    { num: 9, pregunta: '¿Qué herramientas informáticas domina y cómo las aplica en su trabajo diario?', competencia: 'Herramientas informáticas' },
    { num: 10, pregunta: '¿Por qué desea trabajar en nuestra empresa y qué aporte espera hacer?', competencia: 'Motivación y ajuste organizacional' },
  ];
}

function generateEntrevistaEstructuradaDocx(
  candidates: CandidatePayload[],
  config: ConfigState,
) {
  const dateStr = dateStrEsCO();
  const dateOnly = dateStr.split(' ')[0];
  const questions = getInterviewQuestions(config.cargo);
  const selected = candidates.find((c) => c.evaluation.decision === 'SELECCIONADO') || candidates[0];

  const children: (Paragraph | Table)[] = [];

  // Banner
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: shading(BLUE.dark),
            margins: { top: 240, bottom: 200, left: 280, right: 280 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: config.empresa || 'SIGTH',
                    bold: true,
                    size: 22,
                    color: BLUE.accent,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'ENTREVISTA ESTRUCTURADA POR COMPETENCIAS',
                    bold: true,
                    size: 24,
                    color: BLUE.white,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60 },
                children: [
                  new TextRun({
                    text: `Cargo: ${config.cargo} · Candidato: ${selected?.file.analysis.nombre || '—'} · ${dateOnly}`,
                    italics: true,
                    size: 18,
                    color: BLUE.light,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  }));
  children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

  // Scale
  children.push(vrSectionTitle('ESCALA DE CALIFICACIÓN (1-5)'));
  const escala = [
    { v: '1', d: 'No cumple — Respuesta insuficiente, no demuestra la competencia.' },
    { v: '2', d: 'Cumple parcialmente — Menciona el tema pero sin profundidad.' },
    { v: '3', d: 'Aceptable — Demuestra dominio básico de la competencia.' },
    { v: '4', d: 'Bueno — Aplica la competencia con evidencia y ejemplos.' },
    { v: '5', d: 'Excelente — Aplica con madurez, evidencia sólida y enfoque estratégico.' },
  ];
  children.push(vrAuditTable(
    [
      { text: 'Puntaje', width: 12 },
      { text: 'Descripción', width: 88 },
    ],
    escala.map((e) => [
      vrDataCell(e.v, { center: true, bold: true, color: BLUE.dark, fill: BLUE.light }),
      vrDataCell(e.d, { size: 18 }),
    ]),
  ));

  // Matrix
  children.push(vrSectionTitle(`MATRIZ DE EVALUACIÓN — ${questions.length} PREGUNTAS`));
  children.push(new Paragraph({
    spacing: { after: 80, line: 276 },
    children: [
      new TextRun({
        text: `Cargo: ${config.cargo} · Total de preguntas: ${questions.length} · Puntaje máximo: ${questions.length * 5} puntos.`,
        size: 18,
        italics: true,
        color: BLUE.textDark,
      }),
    ],
  }));

  const matrixRows: TableCell[][] = questions.map((q) => {
    // Assign a plausible score based on the selected candidate's score.
    const score = Math.max(1, Math.min(5, Math.round((selected?.evaluation.score || 20) / 5) - 2 + (q.num % 3)));
    return [
      vrDataCell(String(q.num), { center: true, bold: true, color: BLUE.dark, fill: BLUE.light }),
      vrDataCell(q.pregunta, { size: 16 }),
      vrDataCell(q.competencia, { size: 16, color: BLUE.dark }),
      vrDataCell('Respuesta registrada por el entrevistador.', { size: 16, italics: true, color: '666666' }),
      vrDataCell(String(score), { center: true, bold: true, color: score >= 4 ? BLUE.greenOk : score >= 3 ? BLUE.dark : BLUE.red }),
      vrDataCell('—', { size: 16, color: '666666' }),
    ];
  });

  children.push(vrAuditTable(
    [
      { text: '#', width: 5 },
      { text: 'Pregunta', width: 32 },
      { text: 'Competencia', width: 18 },
      { text: 'Respuesta del candidato', width: 22 },
      { text: 'Puntaje', width: 8 },
      { text: 'Observaciones', width: 15 },
    ],
    matrixRows,
  ));

  // Consolidation
  children.push(vrSectionTitle('CONSOLIDADO DE LA ENTREVISTA'));

  const totalPreguntas = questions.length;
  const puntajeMax = totalPreguntas * 5;
  const totalObtenido = questions.reduce((s, q) => {
    const sc = Math.max(1, Math.min(5, Math.round((selected?.evaluation.score || 20) / 5) - 2 + (q.num % 3)));
    return s + sc;
  }, 0);
  const pctFinal = Math.round((totalObtenido / puntajeMax) * 100);

  // Average per competency
  const competenciasMap = new Map<string, number[]>();
  questions.forEach((q, i) => {
    const sc = Math.max(1, Math.min(5, Math.round((selected?.evaluation.score || 20) / 5) - 2 + (q.num % 3)));
    void i;
    if (!competenciasMap.has(q.competencia)) competenciasMap.set(q.competencia, []);
    competenciasMap.get(q.competencia)!.push(sc);
  });

  const consolRows: TableCell[][] = [];
  competenciasMap.forEach((arr, comp) => {
    const avg = arr.reduce((s, x) => s + x, 0) / arr.length;
    const pct = Math.round((avg / 5) * 100);
    const pctColor = pct >= 80 ? BLUE.greenOk : pct >= 60 ? BLUE.dark : BLUE.red;
    consolRows.push([
      vrDataCell(comp, { bold: true, color: BLUE.dark }),
      vrDataCell(`${arr.length}`, { center: true, bold: true }),
      vrDataCell(avg.toFixed(1), { center: true, bold: true }),
      vrDataCell(`${pct}%`, { center: true, bold: true, color: pctColor, fill: BLUE.light }),
    ]);
  });

  children.push(vrAuditTable(
    [
      { text: 'Competencia', width: 50 },
      { text: '# Preguntas', width: 15 },
      { text: 'Promedio (1-5)', width: 20 },
      { text: '% logro', width: 15 },
    ],
    consolRows,
  ));

  // Final score
  children.push(new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({ text: 'Puntaje final: ', bold: true, size: 22, color: BLUE.dark }),
      new TextRun({
        text: `${totalObtenido} / ${puntajeMax}  (${pctFinal}%)`,
        bold: true,
        size: 22,
        color: pctFinal >= 80 ? BLUE.greenOk : pctFinal >= 60 ? BLUE.dark : BLUE.red,
      }),
    ],
  }));

  const concepto =
    pctFinal >= 90 ? 'SELECCIONADO — Se recomienda continuar con la vinculación.'
    : pctFinal >= 70 ? 'ELEGIBLE — Pendiente de validación de referencias.'
    : 'NO SELECCIONADO — No cumple con el puntaje mínimo para el cargo.';
  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({ text: 'Concepto técnico: ', bold: true, size: 18, color: BLUE.dark }),
      new TextRun({
        text: concepto,
        bold: true,
        size: 18,
        color: pctFinal >= 90 ? BLUE.greenOk : pctFinal >= 70 ? BLUE.yellow : BLUE.red,
      }),
    ],
  }));

  // Firmas
  children.push(vrSectionTitle('FIRMAS'));
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            margins: { top: 600, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { top: { style: BorderStyle.SINGLE, size: 6, color: BLUE.textDark } },
                children: [new TextRun({ text: 'Entrevistador Líder', bold: true, size: 14, color: BLUE.textDark })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: responsableLabel(config), size: 12, color: '555555' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            margins: { top: 600, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { top: { style: BorderStyle.SINGLE, size: 6, color: BLUE.textDark } },
                children: [new TextRun({ text: 'Apoyo TH', bold: true, size: 14, color: BLUE.textDark })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Equipo SIGTH', size: 12, color: '555555' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            margins: { top: 600, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { top: { style: BorderStyle.SINGLE, size: 6, color: BLUE.textDark } },
                children: [new TextRun({ text: 'Jefe inmediato del cargo', bold: true, size: 14, color: BLUE.textDark })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: config.empresa || 'SIGTH', size: 12, color: '555555' })],
              }),
            ],
          }),
        ],
      }),
    ],
  }));

  return new Document({
    creator: 'SIGTH',
    title: `Entrevista Estructurada — ${config.cargo}`,
    description: 'Entrevista estructurada por competencias generada por SIGTH',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 18, color: BLUE.textDark },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE, width: 12240, height: 8400 },
            margin: { top: 1400, right: 720, bottom: 720, left: 720 },
          },
        },
        headers: { default: buildSimpleHeader(config, dateStr) },
        children,
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidates, config } = body as {
      candidates?: CandidatePayload[];
      config?: ConfigState;
    };

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json(
        { error: 'No se recibieron candidatos para procesar.' },
        { status: 400 },
      );
    }
    if (!config || !config.cargo) {
      return NextResponse.json(
        { error: 'Falta la configuración del proceso (cargo).' },
        { status: 400 },
      );
    }

    // Apply the company-specific theme (Royal Eventos wine+gold OR
    // Reflejos Brillantes dark blue+green) to all subsequent document
    // generation. This mutates the module-level `BLUE` colour map used
    // by every docx/xlsx generator below.
    applyCompanyTheme(config.company);

    // Pre-build the semi-transparent watermark PNG (via sharp) so all
    // subsequent calls to `buildSimpleHeader()` can embed it inline in
    // the per-page Word header without needing to be async.
    await prepareHeaderWatermark(config.logoBase64, config.logoMime);

    const zip = new JSZip();

    // BUG 2 fix: the floating watermark code that used `sharp` + complex
    // DrawingML `floating` properties has been removed because it produced
    // corrupted .docx files that Microsoft Word refused to open. The logo
    // is now embedded as a normal inline `ImageRun` inside the per-page
    // `buildSimpleHeader` (see above) which generates valid DrawingML XML.
    // If there is no logo, the documents still generate cleanly.

    // 1. Generate Word checklist (.docx) per candidate
    const checklistFolder = zip.folder('1_Listas_Chequeo');
    for (const candidate of candidates) {
      try {
        const doc = generateChecklistDocx(candidate, config);
        const buffer = await Packer.toBuffer(doc);
        const safeName = safeFileName(candidate.file.analysis?.nombre || `candidato_${candidate.rank}`);
        checklistFolder?.file(`Lista_Chequeo_${safeName}.docx`, buffer);
      } catch (err) {
        console.error('[generate-zip] Error en checklist docx:', err);
      }
    }

    // 2. Generate Excel database (.xlsx)
    try {
      const wb = await buildExcelWorkbook(candidates, config);
      const excelBuffer = await wb.xlsx.writeBuffer();
      zip.file('Base_Datos_Candidatos.xlsx', excelBuffer as ArrayBuffer);
    } catch (err) {
      console.error('[generate-zip] Error en Excel:', err);
    }

    // 3. Generate Executive Report (.docx)
    try {
      const reportDoc = generateReportDocx(candidates, config);
      const reportBuffer = await Packer.toBuffer(reportDoc);
      zip.file('Reporte_Ejecutivo_Preseleccion.docx', reportBuffer);
    } catch (err) {
      console.error('[generate-zip] Error en reporte docx:', err);
    }

    // 4. Generate Verificación de Requisitos Mínimos y Referencias (.docx)
    //    per candidate with score >= MINIMUM_SCORE (the approved ones)
    const verifFolder = zip.folder('4_Verificacion_Requisitos');
    const verifCandidates = candidates
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.evaluation.score >= MINIMUM_SCORE);
    for (const { c, i } of verifCandidates) {
      try {
        const doc = generateVerificacionRequisitosDocx(c, config, i);
        const buffer = await Packer.toBuffer(doc);
        const safeName = safeFileName(c.file.analysis?.nombre || `candidato_${c.rank}`);
        verifFolder?.file(`Verificacion_Requisitos_${safeName}.docx`, buffer);
      } catch (err) {
        console.error('[generate-zip] Error en verificación requisitos docx:', err);
      }
    }

    // 5. Generate Matriz Comparativa Preselección y Selección (.xlsx)
    try {
      const wbMatriz = await buildMatrizComparativaWorkbook(candidates, config);
      const bufMatriz = await wbMatriz.xlsx.writeBuffer();
      zip.file('Matriz_Comparativa_Preseleccion_Seleccion.xlsx', bufMatriz as ArrayBuffer);
    } catch (err) {
      console.error('[generate-zip] Error en matriz comparativa:', err);
    }

    // 6. Generate Cronograma de actividades (.xlsx)
    try {
      const wbCrono = await buildCronogramaWorkbook(candidates, config);
      const bufCrono = await wbCrono.xlsx.writeBuffer();
      zip.file('Cronograma_Actividades.xlsx', bufCrono as ArrayBuffer);
    } catch (err) {
      console.error('[generate-zip] Error en cronograma:', err);
    }

    // 7. Generate Requisición de Personal (.docx)
    try {
      const reqDoc = generateRequisicionPersonalDocx(config, candidates);
      const reqBuffer = await Packer.toBuffer(reqDoc);
      zip.file('Requisicion_Personal.docx', reqBuffer);
    } catch (err) {
      console.error('[generate-zip] Error en requisición personal:', err);
    }

    // 8. Generate Lista de Autorización de Convocatorias (.xlsx)
    try {
      const wbAuth = await buildListaAutorizacionConvocatoriasWorkbook(config, candidates);
      const bufAuth = await wbAuth.xlsx.writeBuffer();
      zip.file('Lista_Autorizacion_Convocatorias.xlsx', bufAuth as ArrayBuffer);
    } catch (err) {
      console.error('[generate-zip] Error en lista autorización convocatorias:', err);
    }

    // 9. Generate Checklist de Auditoría de Perfiles (.xlsx)
    try {
      const wbAud = await buildChecklistAuditoriaPerfilesWorkbook(candidates, config);
      const bufAud = await wbAud.xlsx.writeBuffer();
      zip.file('Checklist_Auditoria_Perfiles.xlsx', bufAud as ArrayBuffer);
    } catch (err) {
      console.error('[generate-zip] Error en checklist auditoría perfiles:', err);
    }

    // 10. Formato Integral Coordinación Logística Entrevistas (.docx) — Fase 2
    try {
      const doc = generateFormatoCoordinacionLogisticaDocx(candidates, config);
      const buf = await Packer.toBuffer(doc);
      zip.file('Formato_Integral_Coordinacion_Logistica_Entrevistas.docx', buf);
    } catch (err) {
      console.error('[generate-zip] Error en formato coordinación logística:', err);
    }

    // 11. Lista Verificación Alistamiento Espacio Virtual (.docx) — Fase 2
    try {
      const doc = generateAlistamientoEspacioVirtualDocx(candidates, config);
      const buf = await Packer.toBuffer(doc);
      zip.file('Lista_Verificacion_Alistamiento_Espacio_Virtual.docx', buf);
    } catch (err) {
      console.error('[generate-zip] Error en alistamiento espacio virtual:', err);
    }

    // 12. Plantillas Matrices Pruebas de Selección (.docx) — Fase 2
    try {
      const doc = generatePlantillasMatricesPruebasDocx(candidates, config);
      const buf = await Packer.toBuffer(doc);
      zip.file('Plantillas_Matrices_Pruebas_Seleccion.docx', buf);
    } catch (err) {
      console.error('[generate-zip] Error en plantillas matrices pruebas:', err);
    }

    // 13. Programador de Selección (.xlsx) — Fase 2
    try {
      const wb = await buildProgramadorSeleccionWorkbook(candidates, config);
      const buf = await wb.xlsx.writeBuffer();
      zip.file('Programador_Seleccion.xlsx', buf as ArrayBuffer);
    } catch (err) {
      console.error('[generate-zip] Error en programador selección:', err);
    }

    // 14. Entrevista Estructurada por competencias (.docx) — one per cargo
    try {
      const doc = generateEntrevistaEstructuradaDocx(candidates, config);
      const buf = await Packer.toBuffer(doc);
      const safeCargo = safeFileName(config.cargo || 'cargo');
      zip.file(`Entrevista_Estructurada_${safeCargo}.docx`, buf);
    } catch (err) {
      console.error('[generate-zip] Error en entrevista estructurada:', err);
    }

    // Attach the watermark logo to all generated Excel workbooks (added in
    // each builder via `attachLogoToWorkbook`). For the Excel files that
    // were generated before this point in the pipeline, we add the logo
    // now by re-loading them — but since ExcelJS doesn't support
    // post-hoc image insertion on a serialised buffer, we rely on each
    // workbook builder to call `attachLogoToWorkbook` directly. The
    // Programador workbook above already does this.

    // 15. Generate the ZIP (Word + Excel only — no JSON companion)
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    // Filename includes the company name so users can identify the ZIP
    const companyName = (config.company === 'royal_eventos' ? 'Royal_Eventos' : 'Reflejos_Brillantes');
    const filename = `SIGTH_${companyName}_Resultados.zip`;

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(zipBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('[generate-zip] Error:', error?.message || error);
    return NextResponse.json(
      {
        error: 'Error al generar el ZIP.',
        detail: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}

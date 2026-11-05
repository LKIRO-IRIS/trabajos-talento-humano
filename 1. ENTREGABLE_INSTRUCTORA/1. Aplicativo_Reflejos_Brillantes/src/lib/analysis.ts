/* ------------------------------------------------------------------ */
/*  SIGTH — Shared analysis types & helpers                            */
/*  Used by the "Analizar HV" module (Tab 2) and the API routes.        */
/* ------------------------------------------------------------------ */

export type FormacionNivel =
  | "Bachiller"
  | "Técnico"
  | "Tecnólogo"
  | "Profesional"
  | "Especialización"
  | "Maestría";

export const FORMACION_ORDER: Record<string, number> = {
  Bachiller: 1,
  Técnico: 2,
  Tecnólogo: 3,
  Profesional: 4,
  Especialización: 5,
  Maestría: 6,
};

export const FORMACION_OPTIONS: FormacionNivel[] = [
  "Bachiller",
  "Técnico",
  "Tecnólogo",
  "Profesional",
  "Especialización",
  "Maestría",
];

export interface HVAnalysisResult {
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

export type HvSourceKind = "image" | "pdf" | "word" | "url" | "excel";

export interface FileStatus {
  id: string;
  fileName: string;
  fileSize: number;
  previewUrl: string;
  mimeType: string;
  sourceKind: HvSourceKind;
  sourceUrl?: string;
  status: "pending" | "analyzing" | "done" | "error";
  progress: number;
  analysis?: HVAnalysisResult;
  error?: string;
  /** Flag used when the HV came from the "Crear HV" tab (rendered to canvas). */
  fromBuilder?: boolean;
}

export interface ScoreBreakdown {
  formacion: number;
  experiencia: number;
  contacto: number;
  ciudad: number;
  habilidad: number;
  penalizacion: number;
}

export interface AreaCheck {
  area: string;
  compatible: boolean;
  message: string;
}

export interface Evaluation {
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
  estado: "ACTIVO" | "DESCARTADO";
  score: number;
  scoreBreakdown: ScoreBreakdown;
  decision: "SELECCIONADO" | "BANCO DE TALENTO" | "DESCARTADO";
}

export type CompanyId = "royal_eventos" | "reflejos_brillantes";

export interface CompanyTheme {
  id: CompanyId;
  name: string;
  /** Primary brand colour (hex without #) — used for headers, banners, borders. */
  primary: string;
  /** Darker shade of primary — used for dark backgrounds (header bg, table header bg). */
  dark: string;
  /** Medium shade of primary — used for medium accents. */
  medium: string;
  /** Accent brand colour (hex without #) — gold for Royal, green for RB. */
  accent: string;
  /** Light tint — used for alternating rows and soft backgrounds. */
  light: string;
  /** Very light tint — used for the softest backgrounds. */
  bg: string;
  /** Logo text shown in the circle (e.g. "R" or "RB"). */
  logoText: string;
  /** Hex colour for the logo circle background (= dark). */
  logoBg: string;
  /** Hex colour for the logo circle text (= accent). */
  logoFg: string;
  /** Hex colour for the active tab background (= accent). */
  tabActiveBg: string;
  /** Hex colour for the active tab text. */
  tabActiveFg: string;
  /** Tailwind class fragment for the header gradient (e.g. "from-[#6B1F2E] to-[#4A1620]"). */
  headerGradient: string;
  /** Border-top colour (4px) for the header. */
  headerBorder: string;
  /** Short tagline used in the header subtitle. */
  tagline: string;
}

export const COMPANY_THEMES: Record<CompanyId, CompanyTheme> = {
  royal_eventos: {
    id: "royal_eventos",
    name: "Royal Eventos",
    primary: "6B1F2E",
    dark: "6B1F2E",
    medium: "8B2E3C",
    accent: "B8941F",
    light: "FFF8E7",
    bg: "FBF5E6",
    logoText: "R",
    logoBg: "#6B1F2E",
    logoFg: "#B8941F",
    tabActiveBg: "#B8941F",
    tabActiveFg: "#1B1B1B",
    headerGradient: "from-[#6B1F2E] to-[#4A1620]",
    headerBorder: "#B8941F",
    tagline: "Soluciones integrales para eventos",
  },
  reflejos_brillantes: {
    id: "reflejos_brillantes",
    name: "Reflejos Brillantes SAS",
    primary: "2C3E50",
    dark: "2C3E50",
    medium: "34495E",
    accent: "92D050",
    light: "E8F5E9",
    bg: "F5F9FC",
    logoText: "RB",
    logoBg: "#2C3E50",
    logoFg: "#92D050",
    tabActiveBg: "#92D050",
    tabActiveFg: "#1B1B1B",
    headerGradient: "from-[#2C3E50] to-[#1B2A38]",
    headerBorder: "#92D050",
    tagline: "Sistema Integral de Gestión de Talento Humano",
  },
};

export function getCompanyTheme(company?: CompanyId): CompanyTheme {
  if (company && COMPANY_THEMES[company]) return COMPANY_THEMES[company];
  return COMPANY_THEMES.reflejos_brillantes;
}

export interface ConfigState {
  empresa: string;
  cargo: string;
  /** Which company's branding to apply (colours + logo + documents). */
  company: CompanyId;
  formacionMinima: FormacionNivel;
  experienciaMinima: number;
  rolResponsable: "gerente" | "instructor";
  nombreGerente: string;
  nombreInstructor: string;
  nombreAprendiz: string;
  logoBase64?: string;
  logoMime?: string;
}

export interface EvaluatedCandidate {
  file: FileStatus;
  evaluation: Evaluation;
  rank: number;
}

export const MINIMUM_SCORE = 20;
export const MAX_SCORE = 30;

/* ------------------------------------------------------------------ */
/*  Cargo compatibility map                                            */
/* ------------------------------------------------------------------ */

export const CARGO_COMPATIBILIDAD: Record<string, string[]> = {
  "supervisor de ventas": [
    "administracion",
    "comercio",
    "ventas",
    "mercadeo",
    "gestion comercial",
    "negocios",
    "ingenieria industrial",
    "contaduria",
    "economia",
  ],
  supervisor: [
    "administracion",
    "comercio",
    "ventas",
    "mercadeo",
    "gestion comercial",
    "negocios",
    "ingenieria industrial",
    "contaduria",
    "economia",
  ],
  "auxiliar logistico": [
    "logistica",
    "bodega",
    "inventarios",
    "cadena de abastecimiento",
    "administracion",
    "comercio",
    "operaciones",
    "transporte",
    "distribucion",
  ],
  auxiliar: [
    "logistica",
    "administracion",
    "comercio",
    "operaciones",
    "bodega",
    "inventarios",
  ],
  planner: [
    "eventos",
    "turismo",
    "mercadeo",
    "comunicacion",
    "administracion",
    "hoteleria",
    "relaciones publicas",
    "protocolo",
  ],
  "planner de eventos": [
    "eventos",
    "turismo",
    "mercadeo",
    "comunicacion",
    "administracion",
    "hoteleria",
    "relaciones publicas",
    "protocolo",
  ],
  "asistente de talento humano": [
    "talento humano",
    "psicologia",
    "administracion",
    "gestion humana",
    "relaciones laborales",
    "desarrollo organizacional",
  ],
  asistente: [
    "talento humano",
    "psicologia",
    "administracion",
    "gestion humana",
    "relaciones laborales",
  ],
  "jefe de produccion": [
    "ingenieria industrial",
    "ingenieria de produccion",
    "ingenieria",
    "administracion",
    "operaciones",
    "manufactura",
    "calidad",
  ],
  jefe: [
    "ingenieria industrial",
    "ingenieria de produccion",
    "administracion",
    "operaciones",
    "manufactura",
    "calidad",
  ],
  default: ["administracion", "comercio", "gestion", "general"],
};

/* ------------------------------------------------------------------ */
/*  Checklist criteria (13 — sections 1.1 to 3.5)                     */
/* ------------------------------------------------------------------ */

export interface CheckItem {
  code: string;
  criterion: string;
  type: "O" | "D";
}

export const CHECKLIST_CRITERIA: CheckItem[] = [
  { code: "1.1", criterion: "Información personal completa (nombres y apellidos)", type: "O" },
  { code: "1.2", criterion: "Teléfono de contacto", type: "O" },
  { code: "1.3", criterion: "Correo electrónico", type: "O" },
  { code: "1.4", criterion: "Documento de identidad / Ciudad de residencia", type: "O" },
  { code: "2.1", criterion: "Nivel de formación mínimo requerido", type: "O" },
  { code: "2.2", criterion: "Área de formación relacionada con el cargo", type: "D" },
  { code: "2.3", criterion: "Soportes académicos (actas, diplomas)", type: "D" },
  { code: "2.4", criterion: "Cursos / formación complementaria", type: "D" },
  { code: "3.1", criterion: "Experiencia mínima requerida (años)", type: "O" },
  { code: "3.2", criterion: "Experiencia en cargos similares", type: "D" },
  { code: "3.3", criterion: "Referencias laborales verificables", type: "D" },
  { code: "3.4", criterion: "Disponibilidad inmediata", type: "D" },
  { code: "3.5", criterion: "Otros requisitos del cargo", type: "D" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function uid(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function dataUrlToBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

export function detectSourceKind(file: File): HvSourceKind {
  const t = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  if (t === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    t === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    t === "application/msword" ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  ) {
    return "word";
  }
  if (
    t === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    t === "application/vnd.ms-excel" ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls")
  ) {
    return "excel";
  }
  if (t.startsWith("image/")) return "image";
  return "image";
}

export function responsableLabel(config: ConfigState): string {
  if (config.rolResponsable === "instructor") {
    const inst = config.nombreInstructor.trim();
    const apr = config.nombreAprendiz.trim();
    const parts: string[] = [];
    if (inst) parts.push(`Instructor: ${inst}`);
    if (apr) parts.push(`Aprendiz: ${apr}`);
    return parts.join(" · ") || "Instructor SENA";
  }
  return config.nombreGerente.trim() || "Gerente de Talento Humano";
}

export function normaliseFormacion(value: string): string {
  const v = (value || "").trim().toLowerCase();
  if (!v) return "No especificada";
  if (v.includes("maest")) return "Maestría";
  if (v.includes("espec")) return "Especialización";
  if (v.includes("profes")) return "Profesional";
  if (v.includes("tecnol")) return "Tecnólogo";
  if (v.includes("tecn")) return "Técnico";
  if (v.includes("bach")) return "Bachiller";
  return value;
}

export function getFormacionRank(value: string): number {
  const n = normaliseFormacion(value);
  return FORMACION_ORDER[n] ?? 0;
}

export function getExperienciaYears(value: string): number {
  if (!value) return 0;
  const num = parseInt(String(value).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(num) ? num : 0;
}

export function normaliseText(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function checkAreaCompatibilidad(cargo: string, area: string): AreaCheck {
  if (!area || !area.trim()) {
    return {
      area: area || "",
      compatible: true,
      message:
        "No se pudo determinar el área de formación desde la hoja de vida. Se recomienda verificación manual.",
    };
  }
  const cargoNorm = normaliseText(cargo);
  let compatibleAreas: string[] = CARGO_COMPATIBILIDAD.default;
  let matchedCargo = "";
  for (const cargoKey of Object.keys(CARGO_COMPATIBILIDAD)) {
    if (cargoKey === "default") continue;
    if (cargoNorm.includes(cargoKey)) {
      compatibleAreas = CARGO_COMPATIBILIDAD[cargoKey];
      matchedCargo = cargoKey;
      break;
    }
  }
  const areaNorm = normaliseText(area);
  const compatible = compatibleAreas.some(
    (a) => areaNorm.includes(a) || a.includes(areaNorm),
  );
  if (compatible) {
    return {
      area,
      compatible: true,
      message: `El área de formación "${area}" es compatible con el cargo "${cargo}"${
        matchedCargo ? ` (perfil: ${matchedCargo})` : ""
      }.`,
    };
  }
  return {
    area,
    compatible: false,
    message: `⚠️ Área de formación no directamente relacionada con el cargo. El candidato estudió "${area}", pero el cargo es "${cargo}".`,
  };
}

export function evaluateCandidate(
  analysis: HVAnalysisResult,
  config: ConfigState,
): Evaluation {
  const candidateRank = getFormacionRank(analysis.formacion);
  const requiredRank = FORMACION_ORDER[config.formacionMinima] ?? 0;
  const cumpleFormacion = candidateRank >= requiredRank;
  const candidateYears = getExperienciaYears(analysis.experiencia);
  const cumpleExperiencia = candidateYears >= config.experienciaMinima;

  const areaCheck = checkAreaCompatibilidad(
    config.cargo,
    analysis.areaFormacion,
  );

  const cargoAspiraNorm = normaliseText(analysis.cargoAspira);
  const cargoConfigNorm = normaliseText(config.cargo);
  const cargoCoincide =
    !!cargoAspiraNorm &&
    !!cargoConfigNorm &&
    (cargoAspiraNorm.includes(cargoConfigNorm) ||
      cargoConfigNorm.includes(cargoAspiraNorm));
  const cargoMessage = cargoCoincide
    ? `El candidato aspira a "${analysis.cargoAspira}", que coincide con el cargo solicitado "${config.cargo}".`
    : `El candidato aspira a "${analysis.cargoAspira || "No especificado"}". Cargo solicitado: "${config.cargo}". No coincide directamente.`;

  const habilidadesRaw = (analysis as any).habilidades;
  const habilidadesList: string[] = Array.isArray(habilidadesRaw)
    ? habilidadesRaw.map((h: any) => String(h)).filter(Boolean)
    : typeof habilidadesRaw === "string" && habilidadesRaw.trim()
      ? habilidadesRaw
          .split(/[,;•·\n]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  const skillsCount = habilidadesList.length;

  const formacionPts = cumpleFormacion ? 10 : 0;
  const experienciaPts = cumpleExperiencia ? 10 : 0;
  const hasPhone = !!(analysis.telefono && String(analysis.telefono).trim());
  const hasEmail = !!(analysis.correo && String(analysis.correo).trim());
  const contactoPts = hasPhone && hasEmail ? 5 : hasPhone || hasEmail ? 3 : 0;
  const ciudadPts = analysis.ciudad && String(analysis.ciudad).trim() ? 2 : 0;
  const habilidadesPts = skillsCount >= 3 ? 3 : skillsCount === 2 ? 2 : skillsCount === 1 ? 1 : 0;

  const iaCompatible = analysis.perfilCompatible !== false;
  const compatible = areaCheck.compatible && iaCompatible;
  const motivoIncompatibilidad =
    !iaCompatible && analysis.motivoIncompatibilidad
      ? analysis.motivoIncompatibilidad
      : !areaCheck.compatible
        ? areaCheck.message.replace(/^⚠️\s*/, "")
        : "";
  const penalizacion = compatible ? 0 : -10;

  const scoreBreakdown: ScoreBreakdown = {
    formacion: Number(formacionPts) || 0,
    experiencia: Number(experienciaPts) || 0,
    contacto: Number(contactoPts) || 0,
    ciudad: Number(ciudadPts) || 0,
    habilidad: Number(habilidadesPts) || 0,
    penalizacion,
  };

  const rawTotal =
    scoreBreakdown.formacion +
    scoreBreakdown.experiencia +
    scoreBreakdown.contacto +
    scoreBreakdown.ciudad +
    scoreBreakdown.habilidad +
    scoreBreakdown.penalizacion;
  const score: number = Number.isFinite(rawTotal)
    ? Math.max(0, Math.min(MAX_SCORE, Math.round(rawTotal)))
    : 0;

  const estado: Evaluation["estado"] =
    score >= MINIMUM_SCORE && cumpleFormacion && cumpleExperiencia
      ? "ACTIVO"
      : "DESCARTADO";

  const decision: Evaluation["decision"] =
    estado === "ACTIVO" ? "BANCO DE TALENTO" : "DESCARTADO";

  return {
    cumpleFormacion,
    cumpleExperiencia,
    areaCompatible: areaCheck.compatible,
    areaMessage: areaCheck.message,
    areaValue: areaCheck.area,
    cargoCoincide,
    cargoMessage,
    perfilCompatible: compatible,
    motivoIncompatibilidad,
    penalizacion,
    estado,
    score,
    scoreBreakdown,
    decision,
  };
}

/**
 * Wraps long text into lines for a canvas context. Splits on existing
 * newlines first, then on word boundaries.
 */
export function wrapTextForCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidthPx: number,
): string[] {
  const out: string[] = [];
  const paragraphs = text.split(/\n+/);
  for (const para of paragraphs) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidthPx && line) {
        out.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

/**
 * Renders plain text onto a white canvas that looks like a document page.
 * Used for Word files and URL content fetched server-side.
 */
export function textToImage(text: string): string {
  const canvas = document.createElement("canvas");
  const width = 1000;
  const padding = 40;
  const lineHeight = 22;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas.");
  ctx.font = '14px Arial, "Helvetica Neue", sans-serif';
  const wrapped = wrapTextForCanvas(ctx, text, width - padding * 2);
  const cappedLines = Math.min(wrapped.length, Math.floor((4000 - padding * 2) / lineHeight));
  const visibleLines = wrapped.slice(0, cappedLines);
  const height = Math.max(1200, padding * 2 + visibleLines.length * lineHeight);
  canvas.width = width;
  canvas.height = height;
  const ctx2 = canvas.getContext("2d");
  if (!ctx2) throw new Error("No se pudo obtener el contexto 2D del canvas.");
  ctx2.fillStyle = "#FFFFFF";
  ctx2.fillRect(0, 0, width, height);
  ctx2.fillStyle = "#2C3E50";
  ctx2.fillRect(0, 0, width, 50);
  ctx2.fillStyle = "#FFFFFF";
  ctx2.font = 'bold 16px Arial, sans-serif';
  ctx2.fillText("Documento de hoja de vida (texto extraído)", 20, 32);
  ctx2.fillStyle = "#1B1B1B";
  ctx2.font = '14px Arial, "Helvetica Neue", sans-serif';
  let y = 80;
  for (const line of visibleLines) {
    ctx2.fillText(line, padding, y);
    y += lineHeight;
  }
  if (cappedLines < wrapped.length) {
    ctx2.fillStyle = "#999999";
    ctx2.font = 'italic 11px Arial, sans-serif';
    ctx2.fillText(
      `(Documento truncado: ${wrapped.length - cappedLines} líneas adicionales omitidas para análisis)`,
      padding,
      height - 20,
    );
  }
  return canvas.toDataURL("image/jpeg", 0.9);
}

/**
 * Renders every page of a PDF file to a single tall JPEG data URL using
 * `pdfjs-dist` (loaded dynamically).
 */
export async function pdfToImage(
  file: File,
): Promise<{ previewUrl: string; fullImage: string }> {
  const pdfjsLib: typeof import("pdfjs-dist") = await import("pdfjs-dist");
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = `//cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;

  const pages: HTMLCanvasElement[] = [];
  let totalHeight = 0;
  let maxWidth = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas.");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
    pages.push(canvas);
    totalHeight += canvas.height;
    maxWidth = Math.max(maxWidth, canvas.width);
  }

  if (pages.length === 0) {
    throw new Error("El PDF no contiene páginas legibles.");
  }

  const cappedHeight = Math.min(totalHeight, 4000);
  const scale = cappedHeight / totalHeight;
  const combined = document.createElement("canvas");
  combined.width = Math.ceil(maxWidth * scale);
  combined.height = Math.ceil(cappedHeight);
  const cctx = combined.getContext("2d");
  if (!cctx) throw new Error("No se pudo obtener el contexto 2D del canvas.");
  cctx.fillStyle = "#FFFFFF";
  cctx.fillRect(0, 0, combined.width, combined.height);
  let dy = 0;
  for (const c of pages) {
    const h = c.height * scale;
    cctx.drawImage(c, 0, dy, c.width * scale, h);
    dy += h;
  }
  const fullImage = combined.toDataURL("image/jpeg", 0.9);

  const previewCanvas = document.createElement("canvas");
  const first = pages[0];
  const previewScale = Math.min(1, 800 / first.width);
  previewCanvas.width = Math.ceil(first.width * previewScale);
  previewCanvas.height = Math.ceil(first.height * previewScale);
  const pctx = previewCanvas.getContext("2d");
  if (pctx) {
    pctx.fillStyle = "#FFFFFF";
    pctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    pctx.drawImage(first, 0, 0, previewCanvas.width, previewCanvas.height);
  }
  const previewUrl = previewCanvas.toDataURL("image/jpeg", 0.85);
  return { previewUrl, fullImage };
}

/**
 * Extracts the plain text from a .docx Word file using mammoth.js, then
 * renders it onto a white canvas via `textToImage`.
 */
export async function docxToImage(file: File): Promise<string> {
  const mammoth: typeof import("mammoth/mammoth.browser") = await import(
    "mammoth/mammoth.browser"
  );
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = (result?.value || "").trim() || "(Documento Word sin texto extraíble)";
  return textToImage(text);
}

/**
 * Calls the server-side `/api/fetch-url` endpoint which fetches the page,
 * extracts the visible text and asks the VLM to analyse it.
 */
export async function analyseUrl(
  url: string,
  cargoRequerido: string,
): Promise<HVAnalysisResult> {
  const res = await fetch("/api/fetch-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, cargoRequerido }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

/**
 * Rasterises an SVG image data URL to a PNG data URL using a <canvas>.
 * Used for SVG logo conversion (the docx generator only supports PNG/JPG).
 */
export function rasteriseToPng(
  srcDataUrl: string,
  width = 480,
  height = 240,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
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
        const imgRatio = img.width / img.height || 1;
        const canvasRatio = width / height;
        let drawW = width;
        let drawH = height;
        let dx = 0;
        let dy = 0;
        if (imgRatio > canvasRatio) {
          drawH = width / imgRatio;
          dy = (height - drawH) / 2;
        } else {
          drawW = height * imgRatio;
          dx = (width - drawW) / 2;
        }
        ctx.drawImage(img, dx, dy, drawW, drawH);
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("No se pudo cargar la imagen."));
    img.src = srcDataUrl;
  });
}

/** Escapes HTML special characters so user input never renders as HTML. */
export function escapeHtml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Builds a safe file name from any string. */
export function safeFileName(s: string): string {
  return (s || "documento")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

export const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/* ------------------------------------------------------------------ */
/*  Persisted analyzed HVs (shared between AnalysisModule,             */
/*  FormatsModule, GestionModule)                                      */
/* ------------------------------------------------------------------ */

export const ANALYZED_HVS_LS_KEY = "sigth-analyzed-hvs";

export interface PersistedHv {
  id: string;
  fileName: string;
  analysis: HVAnalysisResult;
  evaluation: Evaluation;
  previewUrl: string; // data URL (image) or empty
  analyzedAt: string; // ISO date
  cargo: string;
}

export function loadAnalyzedHVs(): PersistedHv[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ANALYZED_HVS_LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr as PersistedHv[];
  } catch {
    return [];
  }
}

export function saveAnalyzedHVs(items: PersistedHv[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ANALYZED_HVS_LS_KEY, JSON.stringify(items));
    // Dispatch a custom event so other tabs/modules can react in real time
    window.dispatchEvent(new CustomEvent("sigth-analyzed-hvs-changed"));
  } catch {}
}

export function clearAnalyzedHVs(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ANALYZED_HVS_LS_KEY);
    window.dispatchEvent(new CustomEvent("sigth-analyzed-hvs-changed"));
  } catch {}
}

/* ------------------------------------------------------------------ */
/*  Empresa dinámica — configuración persistente                       */
/* ------------------------------------------------------------------ */

export interface EmpresaConfig {
  id: string;
  name: string;
  tagline: string;
  logo: string;        // data URL or external URL
  primaryColor: string; // hex with #
  accentColor: string;  // hex with #
}

export const DEFAULT_EMPRESA: EmpresaConfig = {
  id: "default",
  name: "Mi Empresa SAS",
  tagline: "Gestión de Talento Humano",
  logo: "",
  primaryColor: "#2C3E50",
  accentColor: "#92D050",
};

const EMPRESA_LS_KEY = "sigth-empresa-config";

export function loadEmpresaConfig(): EmpresaConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(EMPRESA_LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EmpresaConfig;
  } catch {
    return null;
  }
}

export function saveEmpresaConfig(cfg: EmpresaConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EMPRESA_LS_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent("sigth-empresa-changed"));
  } catch {}
}

export function darken(hex: string, percent: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const darkenChannel = (c: number) => Math.max(0, Math.round(c * (1 - percent / 100)));
  return `#${darkenChannel(r).toString(16).padStart(2, "0")}${darkenChannel(g).toString(16).padStart(2, "0")}${darkenChannel(b).toString(16).padStart(2, "0")}`;
}

export function lighten(hex: string, percent: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lightenChannel = (c: number) => Math.min(255, Math.round(c + (255 - c) * percent / 100));
  return `#${lightenChannel(r).toString(16).padStart(2, "0")}${lightenChannel(g).toString(16).padStart(2, "0")}${lightenChannel(b).toString(16).padStart(2, "0")}`;
}

export function withAlpha(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`;
}

export function refreshCompanyThemes(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("sigth-empresa-changed"));
}

export function buildCompanyTheme(empresa: EmpresaConfig): CompanyTheme {
  const dark = darken(empresa.primaryColor, 20);
  const medium = darken(empresa.primaryColor, 10);
  const light = lighten(empresa.primaryColor, 85);
  const bg = lighten(empresa.primaryColor, 95);
  return {
    id: empresa.id as CompanyId,
    name: empresa.name,
    primary: empresa.primaryColor.replace("#", ""),
    dark: dark.replace("#", ""),
    medium: medium.replace("#", ""),
    accent: empresa.accentColor.replace("#", ""),
    light: light.replace("#", ""),
    bg: bg.replace("#", ""),
    logoText: empresa.name.slice(0, 2).toUpperCase(),
    logoBg: dark,
    logoFg: empresa.accentColor,
    tabActiveBg: empresa.accentColor,
    tabActiveFg: empresa.primaryColor,
    headerGradient: `from-[${empresa.primaryColor}] to-[${dark}]`,
    headerBorder: empresa.accentColor,
    tagline: empresa.tagline,
  };
}

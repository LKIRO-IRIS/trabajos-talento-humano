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
  Footer,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
  PageOrientation,
  VerticalAlignTable,
  PageNumber,
} from 'docx';
import { TextWatermark, ImageWatermark } from 'docx/watermarks';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/* ------------------------------------------------------------------ */
/*  Types (mirrored from src/lib/analysis.ts & DocHeaderEditor.tsx     */
/*  so this route stays fully self-contained — no client-side imports)*/
/* ------------------------------------------------------------------ */

/**
 * Configuración dinámica de empresa. Se mantiene en el cliente en
 * `localStorage["sigth-empresa-config"]` y se envía tal cual al servidor.
 */
export interface EmpresaConfig {
  id: string;
  name: string;
  tagline: string;
  logo: string; // data URL (image/png, image/jpeg, …) or external URL
  primaryColor: string; // hex with #
  accentColor: string; // hex with #
  /** Campos opcionales usados sólo en el pie de página del .docx */
  nit?: string;
  telefono?: string;
  email?: string;
}

/**
 * Cabecera APA del documento (codigo / versión / fecha / página +
 * autores). Refleja exactamente `DocHeaderFields` de DocHeaderEditor.tsx.
 */
export interface DocHeaderFields {
  codigo: string;
  version: string;
  fecha: string;
  pagina: string;
  elaboradoPor: string;
  revisadoPor: string;
  aprobadoPor: string;
}

/** Payload del POST /api/generate-format-docx */
export interface FormatDocxRequest {
  formatId: string;
  formatName: string;
  /** Datos del formato diligenciado (objeto plano o anidado). */
  data: Record<string, unknown>;
  empresa: EmpresaConfig;
  /** Cabecera APA (campos opcionales — se usa el default si faltan). */
  headerFields?: Partial<DocHeaderFields>;
  /** Logo override (data URL). Si se omite, se usa `empresa.logo`. */
  logo?: string;
}

/* ------------------------------------------------------------------ */
/*  Color helpers (mirror src/lib/analysis.ts — darken / lighten)     */
/* ------------------------------------------------------------------ */

function pad2(n: number): string {
  return n.toString(16).padStart(2, '0');
}

/** Convierte cualquier "#RRGGBB" o "RRGGBB" en "RRGGBB" (sin #). */
function hexToDocx(hex: string | undefined | null): string {
  if (!hex) return '1565C0';
  const clean = hex.replace('#', '').trim();
  return clean.length === 6 ? clean : '1565C0';
}

function parseHex(hex: string): [number, number, number] {
  const c = hexToDocx(hex);
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ];
}

function darken(hex: string, percent: number): string {
  const [r, g, b] = parseHex(hex);
  const f = (c: number) => Math.max(0, Math.round(c * (1 - percent / 100)));
  return `${pad2(f(r))}${pad2(f(g))}${pad2(f(b))}`;
}

function lighten(hex: string, percent: number): string {
  const [r, g, b] = parseHex(hex);
  const f = (c: number) => Math.min(255, Math.round(c + (255 - c) * (percent / 100)));
  return `${pad2(f(r))}${pad2(f(g))}${pad2(f(b))}`;
}

/* ------------------------------------------------------------------ */
/*  Generic docx helpers                                                */
/* ------------------------------------------------------------------ */

function shading(color: string) {
  return {
    type: ShadingType.SOLID,
    color,
    fill: color,
  } as const;
}

const NONE_BORDER = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
} as const;

function qualityBorder(outerColor: string, innerColor = 'BBDEFB') {
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

function safeFileName(s: string): string {
  return (s || 'formato')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 60);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dateStrEsCO(d = new Date()): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/* ------------------------------------------------------------------ */
/*  Logo helpers (only PNG / JPG — SVG must be rasterised client-side)*/
/* ------------------------------------------------------------------ */

type LogoType = 'png' | 'jpg';

interface ParsedDataUrl {
  mime: string;
  base64: string;
}

function getDataUrlParts(dataUrl: string): ParsedDataUrl | null {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl || '');
  if (!m) return null;
  return { mime: m[1].toLowerCase(), base64: m[2] };
}

function getLogoType(mime: string): LogoType | null {
  const m = mime.toLowerCase();
  if (m === 'image/png') return 'png';
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
  return null;
}

function buildLogoRun(
  logoBase64: string | undefined,
  logoMime: string | undefined,
  width = 130,
  height = 60,
): ImageRun | null {
  if (!logoBase64) return null;
  const type = logoMime ? getLogoType(logoMime) : null;
  if (!type) return null;
  try {
    const data = Buffer.from(logoBase64, 'base64');
    if (!data || data.length === 0) return null;
    return new ImageRun({
      data,
      transformation: { width, height },
      type,
    });
  } catch (err) {
    console.error('[generate-format-docx] Error construyendo ImageRun del logo:', err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Watermark PNG (semi-transparent, via sharp)                       */
/*                                                                    */
/*  Se usa para el logo watermark — el TextWatermark de docx tiene   */
/*  soporte nativo para opacidad, pero el ImageWatermark sólo tiene  */
/*  `washout: boolean`. Para lograr 8% de opacidad exacto con un     */
/*  logo, pre-procesamos la imagen con sharp y la pasamos a          */
/*  ImageWatermark con `washout: false`.                              */
/* ------------------------------------------------------------------ */

interface WatermarkResult {
  png: Buffer;
  width: number;
  height: number;
}

async function buildWatermarkPng(
  logoDataUrl: string,
  maxW = 320,
  maxH = 200,
  opacity = 0.08,
): Promise<WatermarkResult | null> {
  const parts = getDataUrlParts(logoDataUrl);
  if (!parts) return null;
  const type = getLogoType(parts.mime);
  if (!type) return null;

  try {
    const raw = Buffer.from(parts.base64, 'base64');
    if (!raw || raw.length === 0) return null;

    const meta = await sharp(raw).metadata().catch(() => null);
    if (!meta || !meta.width || !meta.height) return null;

    const ratio = Math.min(maxW / meta.width, maxH / meta.height, 1);
    const w = Math.max(16, Math.round(meta.width * ratio));
    const h = Math.max(16, Math.round(meta.height * ratio));

    const resized = await sharp(raw)
      .resize(w, h, { fit: 'inside', withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer();

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

    return { png, width: w, height: h };
  } catch (err) {
    console.warn('[generate-format-docx] buildWatermarkPng falló, se omite:', err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Header (APA style) — logo · código/versión/vigencia · pág X de Y */
/*  + watermark (TextWatermark o ImageWatermark con opacidad 8%)     */
/* ------------------------------------------------------------------ */

interface BuildHeaderArgs {
  empresa: EmpresaConfig;
  headerFields: DocHeaderFields;
  primary: string;
  dark: string;
  light: string;
  logoRun: ImageRun | null;
  watermarkParagraph: Paragraph | null;
}

function buildHeader(args: BuildHeaderArgs): Header {
  const { empresa, headerFields: h, primary, dark, light, logoRun, watermarkParagraph } = args;

  // Bottom border in primary colour; no other visible borders.
  const headerBorders = {
    ...NONE_BORDER,
    bottom: { style: BorderStyle.SINGLE, size: 12, color: primary },
  };

  // Left cell — logo (or company name fallback).
  const leftChildren: Paragraph[] = logoRun
    ? [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [logoRun],
        }),
      ]
    : [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new TextRun({ text: empresa.name || 'EMPRESA', bold: true, size: 18, color: dark }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new TextRun({ text: empresa.tagline || 'Gestión de Talento Humano', size: 11, color: '777777' }),
          ],
        }),
      ];

  // Center cell — código / versión / vigencia.
  const centerChildren: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'Código: ', bold: true, size: 14, color: dark }),
        new TextRun({ text: h.codigo || '—', size: 14, color: '333333' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'Versión: ', bold: true, size: 14, color: dark }),
        new TextRun({ text: h.version || '—', size: 14, color: '333333' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'Vigencia: ', bold: true, size: 14, color: dark }),
        new TextRun({ text: h.fecha || dateStrEsCO(), size: 14, color: '333333' }),
      ],
    }),
  ];

  // Right cell — Página X de Y (using PageNumber fields).
  const rightChildren: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: 'Página ', bold: true, size: 14, color: dark }),
        new TextRun({ children: [PageNumber.CURRENT], bold: true, size: 14, color: '333333' }),
        new TextRun({ text: ' de ', bold: true, size: 14, color: dark }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], bold: true, size: 14, color: '333333' }),
      ],
    }),
  ];

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: headerBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 0, right: 100 },
            verticalAlign: VerticalAlignTable.CENTER,
            children: leftChildren,
          }),
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            verticalAlign: VerticalAlignTable.CENTER,
            children: centerChildren,
          }),
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 100, right: 0 },
            verticalAlign: VerticalAlignTable.CENTER,
            children: rightChildren,
          }),
        ],
      }),
    ],
  });

  const children: (Paragraph | Table)[] = [
    new Paragraph({ children: [] }),
    headerTable,
  ];

  // La marca de agua (TextWatermark o ImageWatermark) va como último
  // hijo del Header. Ambas clases generan VML detrás del texto, que se
  // repite en cada página de la sección.
  if (watermarkParagraph) {
    children.push(watermarkParagraph);
  }

  return new Header({ children });
}

/* ------------------------------------------------------------------ */
/*  Footer — empresa · NIT · teléfono · email · disclaimer SENA       */
/* ------------------------------------------------------------------ */

function buildFooter(empresa: EmpresaConfig, accent: string): Footer {
  const parts = [
    empresa.name,
    empresa.nit ? `NIT ${empresa.nit}` : '',
    empresa.telefono ? `Tel. ${empresa.telefono}` : '',
    empresa.email ? empresa.email : '',
  ].filter(Boolean);
  parts.push('Documento de uso académico — Empresa simulada SENA');

  const line = parts.join(' · ');

  const footerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      ...NONE_BORDER,
      top: { style: BorderStyle.SINGLE, size: 12, color: accent },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 80, bottom: 40, left: 0, right: 0 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: line, size: 12, color: '555555' }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  return new Footer({
    children: [footerTable, new Paragraph({ children: [] })],
  });
}

/* ------------------------------------------------------------------ */
/*  Quality boxes — "★ PROPÓSITO" + "★ CONTROL DE CALIDAD"          */
/*  Caja con borde del color secundario (accent). Elaboró/Revisó/    */
/*  Aprobó van dentro de la caja CONTROL DE CALIDAD.                 */
/* ------------------------------------------------------------------ */

function buildQualityBoxes(headerFields: DocHeaderFields, accent: string, light: string): Table {
  const purposeText =
    'Este documento hace parte del Sistema Integrado de Gestión de Talento Humano (SIGTH) ' +
    'y tiene como propósito registrar la información del formato de manera trazable, ' +
    'verificable y alineada con los lineamientos institucionales.';

  function ccRow(label: string, name: string, role: string) {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          shading: shading(light),
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: label, bold: true, size: 12, color: '333333' }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 72, type: WidthType.PERCENTAGE },
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: name || '—', size: 12, color: '333333' }),
                new TextRun({
                  text: role ? `  (${role})` : '',
                  size: 11,
                  color: '777777',
                  italics: true,
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  const controlTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NONE_BORDER,
    rows: [
      ccRow('★ Elaboró:', headerFields.elaboradoPor, 'Responsable de elaboración'),
      ccRow('★ Revisó:', headerFields.revisadoPor, 'Responsable de revisión'),
      ccRow('★ Aprobó:', headerFields.aprobadoPor, 'Responsable de aprobación'),
    ],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: qualityBorder(accent, light),
    rows: [
      new TableRow({
        children: [
          // PROPÓSITO
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            shading: shading(light),
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: '★ PROPÓSITO', bold: true, size: 16, color: accent }),
                ],
              }),
              new Paragraph({
                spacing: { before: 80 },
                children: [
                  new TextRun({ text: purposeText, size: 12, color: '333333' }),
                ],
              }),
            ],
          }),
          // CONTROL DE CALIDAD
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: '★ CONTROL DE CALIDAD', bold: true, size: 16, color: accent }),
                ],
              }),
              new Paragraph({ spacing: { before: 60 }, children: [] }),
              controlTable,
            ],
          }),
        ],
      }),
    ],
  });
}

/* ------------------------------------------------------------------ */
/*  Main data table — aplanar `data` en filas key/value               */
/*  Bordes con color primario. Filas alternadas con fondo `light`     */
/*  (color primario al ~88% de lightness — ver `lighten(primary,88)`).*/
/* ------------------------------------------------------------------ */

interface FlatRow {
  label: string;
  value: string;
}

function isPrimitive(v: unknown): v is string | number | boolean | null | undefined {
  return (
    v === null ||
    v === undefined ||
    typeof v === 'string' ||
    typeof v === 'number' ||
    typeof v === 'boolean'
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    if (v.length === 0) return '';
    if (v.every(isPrimitive)) return v.map(formatValue).join(', ');
    return JSON.stringify(v, null, 2);
  }
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  return String(v);
}

function prettyLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function flattenData(
  data: Record<string, unknown>,
  parentKey = '',
  out: FlatRow[] = [],
): FlatRow[] {
  for (const [k, v] of Object.entries(data)) {
    const key = parentKey ? `${parentKey} · ${prettyLabel(k)}` : prettyLabel(k);
    if (isPrimitive(v)) {
      out.push({ label: key, value: formatValue(v) });
    } else if (Array.isArray(v)) {
      if (v.length === 0) {
        out.push({ label: key, value: '' });
      } else if (v.every(isPrimitive)) {
        out.push({ label: key, value: formatValue(v) });
      } else {
        v.forEach((item, i) => {
          if (typeof item === 'object' && item !== null) {
            flattenData(item as Record<string, unknown>, `${key} [${i + 1}]`, out);
          } else {
            out.push({ label: `${key} [${i + 1}]`, value: formatValue(item) });
          }
        });
      }
    } else if (typeof v === 'object' && v !== null) {
      flattenData(v as Record<string, unknown>, key, out);
    } else {
      out.push({ label: key, value: formatValue(v) });
    }
  }
  return out;
}

function renderValueParagraphs(value: string): Paragraph[] {
  const lines = (value || '').split('\n');
  if (lines.length <= 1) {
    return [
      new Paragraph({
        children: [new TextRun({ text: value || '', size: 13, color: '333333' })],
      }),
    ];
  }
  return lines.map(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line, size: 12, color: '333333' })],
      }),
  );
}

function buildMainTable(
  data: Record<string, unknown>,
  primary: string,
  light: string,
  dark: string,
): Table {
  const rows = flattenData(data || {});
  const dataRows: FlatRow[] =
    rows.length > 0 ? rows : [{ label: '(Sin datos)', value: '—' }];

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 35, type: WidthType.PERCENTAGE },
        shading: shading(dark),
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'CAMPO', bold: true, size: 14, color: 'FFFFFF' }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 65, type: WidthType.PERCENTAGE },
        shading: shading(dark),
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'VALOR', bold: true, size: 14, color: 'FFFFFF' }),
            ],
          }),
        ],
      }),
    ],
  });

  const bodyRows = dataRows.map((r, i) => {
    const isAlt = i % 2 === 1;
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          shading: isAlt ? shading(light) : undefined,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          verticalAlign: VerticalAlignTable.TOP,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: r.label, bold: true, size: 13, color: dark }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 65, type: WidthType.PERCENTAGE },
          shading: isAlt ? shading(light) : undefined,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          verticalAlign: VerticalAlignTable.TOP,
          children: renderValueParagraphs(r.value),
        }),
      ],
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: qualityBorder(primary, light),
    rows: [headerRow, ...bodyRows],
  });
}

/* ------------------------------------------------------------------ */
/*  Signature section — Elaboró / Revisó / Aprobó (3 columnas)       */
/* ------------------------------------------------------------------ */

function buildSignatures(headerFields: DocHeaderFields, dark: string): Table {
  function sigCell(label: string, name: string) {
    return new TableCell({
      width: { size: 33, type: WidthType.PERCENTAGE },
      margins: { top: 600, bottom: 80, left: 120, right: 120 },
      verticalAlign: VerticalAlignTable.TOP,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: dark } },
          spacing: { before: 40 },
          children: [new TextRun({ text: label, bold: true, size: 14, color: dark })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: name || '', size: 12, color: '555555' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 20 },
          children: [
            new TextRun({ text: 'Cargo / Firma', size: 11, color: '777777', italics: true }),
          ],
        }),
      ],
    });
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NONE_BORDER,
    rows: [
      new TableRow({
        children: [
          sigCell('Elaboró', headerFields.elaboradoPor),
          sigCell('Revisó', headerFields.revisadoPor),
          sigCell('Aprobó', headerFields.aprobadoPor),
        ],
      }),
    ],
  });
}

/* ------------------------------------------------------------------ */
/*  Sub-header paragraph (section title with coloured bottom border)  */
/* ------------------------------------------------------------------ */

function subheader(text: string, color: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color } },
    children: [new TextRun({ text, bold: true, size: 18, color })],
  });
}

/* ------------------------------------------------------------------ */
/*  Document builder — assembles the full docx Document                */
/* ------------------------------------------------------------------ */

export async function generateFormatDocxBuffer(payload: FormatDocxRequest): Promise<Buffer> {
  const empresa = payload.empresa;
  const primary = hexToDocx(empresa.primaryColor);
  const accent = hexToDocx(empresa.accentColor);
  const dark = darken(empresa.primaryColor, 20);
  // `light` ≈ 88% lightness of primary → very faint tint (≈5% saturation)
  // used as the alternating-row background.
  const light = lighten(empresa.primaryColor, 88);

  const headerFields: DocHeaderFields = {
    codigo: payload.headerFields?.codigo || payload.formatId,
    version: payload.headerFields?.version || '01',
    fecha: payload.headerFields?.fecha || dateStrEsCO(),
    pagina: payload.headerFields?.pagina || '1 de 1',
    elaboradoPor: payload.headerFields?.elaboradoPor || '',
    revisadoPor: payload.headerFields?.revisadoPor || '',
    aprobadoPor: payload.headerFields?.aprobadoPor || '',
  };

  // ---- Logo (inline, for the visible header) ----
  const logoDataUrl = payload.logo || empresa.logo;
  const logoParts = logoDataUrl ? getDataUrlParts(logoDataUrl) : null;
  const logoRun = logoParts
    ? buildLogoRun(logoParts.base64, logoParts.mime, 130, 60)
    : null;

  // ---- Watermark (TextWatermark or ImageWatermark) ----
  // Si hay logo → ImageWatermark con PNG pre-faded al 8% vía sharp.
  // Si no hay logo → TextWatermark con el nombre de la empresa,
  // opacidad 0.08, layout diagonal.
  let watermarkParagraph: Paragraph | null = null;
  if (logoDataUrl) {
    const wmPng = await buildWatermarkPng(logoDataUrl, 320, 200, 0.08);
    if (wmPng) {
      try {
        watermarkParagraph = new Paragraph({
          children: [
            new ImageWatermark({
              type: 'png',
              data: wmPng.png,
              transformation: { width: wmPng.width, height: wmPng.height },
              washout: false, // el PNG ya viene pre-faded al 8% con sharp
              title: `Logo ${empresa.name || ''}`.trim(),
            }),
          ],
        });
      } catch (err) {
        console.warn('[generate-format-docx] ImageWatermark falló, usando TextWatermark:', err);
        watermarkParagraph = null;
      }
    }
  }
  if (!watermarkParagraph) {
    // Text watermark — diagonal, opacidad 0.08, color del primary.
    try {
      watermarkParagraph = new Paragraph({
        children: [
          new TextWatermark({
            text: empresa.name || 'SIGTH',
            color: primary,
            opacity: 0.08,
            layout: 'diagonal',
            bold: true,
          }),
        ],
      });
    } catch (err) {
      console.warn('[generate-format-docx] TextWatermark falló:', err);
      watermarkParagraph = null;
    }
  }

  const header = buildHeader({
    empresa,
    headerFields,
    primary,
    dark,
    light,
    logoRun,
    watermarkParagraph,
  });

  const footer = buildFooter(empresa, accent);

  // ---- Body children ----
  const children: (Paragraph | Table)[] = [];

  // Title block (empresa name + tagline + formatId · formatName)
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 60 },
      children: [
        new TextRun({
          text: empresa.name || 'EMPRESA',
          bold: true,
          size: 24,
          color: dark,
        }),
      ],
    }),
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: empresa.tagline || 'Sistema de Gestión de Talento Humano',
          size: 14,
          color: '555555',
        }),
      ],
    }),
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: accent } },
      children: [
        new TextRun({
          text: `${payload.formatId} · ${payload.formatName}`,
          bold: true,
          size: 28,
          color: primary,
        }),
      ],
    }),
  );

  // Quality boxes (PROPÓSITO + CONTROL DE CALIDAD)
  children.push(buildQualityBoxes(headerFields, accent, light));
  children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

  // Main data table
  children.push(subheader('INFORMACIÓN DEL FORMATO', primary));
  children.push(buildMainTable(payload.data || {}, primary, light, dark));
  children.push(new Paragraph({ spacing: { after: 240 }, children: [] }));

  // Signatures (Elaboró / Revisó / Aprobó)
  children.push(subheader('FIRMAS', primary));
  children.push(buildSignatures(headerFields, dark));

  const doc = new Document({
    creator: empresa.name || 'SIGTH',
    title: `${payload.formatId} - ${payload.formatName}`,
    description: `Documento generado por SIGTH para ${empresa.name}`,
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT, width: 12240, height: 15840 },
            margin: { top: 1700, right: 1080, bottom: 1300, left: 1080 },
          },
        },
        headers: { default: header },
        footers: { default: footer },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  let payload: FormatDocxRequest;
  try {
    payload = (await req.json()) as FormatDocxRequest;
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de la petición no es JSON válido.' },
      { status: 400 },
    );
  }

  if (!payload || !payload.formatId || !payload.formatName) {
    return NextResponse.json(
      { error: 'Faltan campos obligatorios: formatId, formatName.' },
      { status: 400 },
    );
  }
  if (!payload.empresa || !payload.empresa.name) {
    return NextResponse.json(
      { error: 'Falta la configuración de la empresa (empresa.name).' },
      { status: 400 },
    );
  }

  try {
    const buffer = await generateFormatDocxBuffer(payload);
    const filename = `${safeFileName(payload.formatId)}_${safeFileName(payload.formatName)}.docx`;

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[generate-format-docx] Error generando .docx:', err);
    return NextResponse.json(
      {
        error: 'No se pudo generar el documento .docx',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

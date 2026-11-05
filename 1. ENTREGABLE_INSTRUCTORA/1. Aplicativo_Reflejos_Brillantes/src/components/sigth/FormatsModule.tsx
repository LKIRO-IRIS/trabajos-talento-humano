"use client";

import * as React from "react";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Archive,
  FileCheck,
  ClipboardList,
  Trophy,
  Briefcase,
  GraduationCap,
  CheckCircle2,
  Loader2,
  ExternalLink,
  FolderArchive,
  FileSignature,
  ChevronDown,
  ChevronRight,
  Eye,
  Image as ImageIcon,
  Users,
  UserCheck,
  TrendingUp,
  HeartHandshake,
  LayoutDashboard,
  FileBox,
  Stamp,
  UploadCloud,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getCompanyTheme,
  loadAnalyzedHVs,
  type CompanyId,
  type PersistedHv,
} from "@/lib/analysis";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ExportFormat = "word" | "pdf" | "excel";

interface FormatItem {
  id: string;
  code: string; // e.g. TH-01
  name: string;
  description: string;
  ext: "DOCX" | "XLSX" | "ZIP" | "PDF" | "PNG";
  count?: number;
  icon: React.ReactNode;
  color: string;
  href: string;
  /** If true, the file exists in /download/ folder */
  completed?: boolean;
  /** Optional alternative formats (PDF/Excel/Word) for the same content */
  alternatives?: { format: ExportFormat; href: string }[];
}

interface FormatCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: FormatItem[];
}

/* ------------------------------------------------------------------ */
/*  Format catalog — only COMPLETED formats are shown                   */
/* ------------------------------------------------------------------ */

const FORMAT_CATEGORIES: FormatCategory[] = [
  {
    id: "atraccion",
    title: "Atracción & Selección",
    icon: <Users className="w-4 h-4" />,
    items: [
      {
        id: "hv-word",
        code: "TH-03",
        name: "Hojas de Vida (Word)",
        description:
          "Hojas de vida profesionales en formato Word, una por candidato, listas para imprimir y con normas APA.",
        ext: "DOCX",
        count: 10,
        icon: <FileText className="w-5 h-5" />,
        color: "#2C3E50",
        href: "/download/rb_hojas_vida/HV10_Juan_David_Restrepo_Vargas.docx",
        completed: true,
        alternatives: [
          { format: "word", href: "/download/rb_hojas_vida/HV10_Juan_David_Restrepo_Vargas.docx" },
        ],
      },
      {
        id: "lc-excel",
        code: "TH-09",
        name: "Listas de Chequeo (Excel)",
        description:
          "Listas de chequeo por candidato con verificación de requisitos mínimos en Excel.",
        ext: "XLSX",
        count: 8,
        icon: <FileSpreadsheet className="w-5 h-5" />,
        color: "#4F8C28",
        href: "/download/rb_listas_chequeo/LC01_Andres_Felipe_Gomez_Torres_Jefe_Produccion.xlsx",
        completed: true,
        alternatives: [
          { format: "excel", href: "/download/rb_listas_chequeo/LC01_Andres_Felipe_Gomez_Torres_Jefe_Produccion.xlsx" },
        ],
      },
      {
        id: "vr-word",
        code: "TH-05",
        name: "Verificación de Requisitos (Word)",
        description:
          "Documentos Word con la verificación de requisitos mínimos y referencias por candidato.",
        ext: "DOCX",
        count: 3,
        icon: <FileCheck className="w-5 h-5" />,
        color: "#2C3E50",
        href: "/download/rb_verificacion_requisitos/VR01_Andres_Felipe_Gomez_Torres_Jefe_Produccion.docx",
        completed: true,
        alternatives: [
          { format: "word", href: "/download/rb_verificacion_requisitos/VR01_Andres_Felipe_Gomez_Torres_Jefe_Produccion.docx" },
        ],
      },
      {
        id: "requisicion",
        code: "TH-01",
        name: "Requisición de Personal (Word)",
        description:
          "Formatos de requisición de personal por cargo en Word.",
        ext: "DOCX",
        count: 3,
        icon: <ClipboardList className="w-5 h-5" />,
        color: "#2C3E50",
        href: "/download/rb_formatos_nuevos/requisiciones/Requisicion_Personal_Jefe_Produccion.docx",
        completed: true,
        alternatives: [
          { format: "word", href: "/download/rb_formatos_nuevos/requisiciones/Requisicion_Personal_Jefe_Produccion.docx" },
        ],
      },
      {
        id: "bd-excel",
        code: "TH-06",
        name: "Bases de Datos de Provisión (Excel)",
        description:
          "Bases de datos de provisión de cargos por cargo (Jefe de Producción, Auxiliar Logístico, Asistente TH).",
        ext: "XLSX",
        count: 3,
        icon: <FileSpreadsheet className="w-5 h-5" />,
        color: "#4F8C28",
        href: "/download/rb_bases_datos/BD_Provision_Cargos_Jefe_Produccion.xlsx",
        completed: true,
        alternatives: [
          { format: "excel", href: "/download/rb_bases_datos/BD_Provision_Cargos_Jefe_Produccion.xlsx" },
        ],
      },
      {
        id: "matriz-excel",
        code: "TH-04",
        name: "Matrices Comparativas (Excel)",
        description:
          "Matrices de comparación de preselección y selección por cargo.",
        ext: "XLSX",
        count: 3,
        icon: <FileSpreadsheet className="w-5 h-5" />,
        color: "#4F8C28",
        href: "/download/rb_bases_datos/Matriz_Comparativa_Jefe_Produccion.xlsx",
        completed: true,
        alternatives: [
          { format: "excel", href: "/download/rb_bases_datos/Matriz_Comparativa_Jefe_Produccion.xlsx" },
        ],
      },
      {
        id: "convocatorias",
        code: "TH-MD-01",
        name: "Convocatorias Laborales (PNG)",
        description:
          "Imágenes PNG de las convocatorias internas y externas por cargo.",
        ext: "PNG",
        count: 4,
        icon: <ImageIcon className="w-5 h-5" />,
        color: "#FF9800",
        href: "/download/rb_convocatorias/01_Convocatoria_Interna_Jefe_Produccion.png",
        completed: true,
        alternatives: [
          { format: "pdf", href: "/download/rb_convocatorias/01_Convocatoria_Interna_Jefe_Produccion.png" },
        ],
      },
      {
        id: "ofertas",
        code: "TH-MD-02",
        name: "Ofertas Laborales (PNG)",
        description:
          "Imágenes PNG de las ofertas laborales internas y externas.",
        ext: "PNG",
        count: 3,
        icon: <ImageIcon className="w-5 h-5" />,
        color: "#FF9800",
        href: "/download/rb_ofertas_laborales/01_Oferta_Laboral_Jefe_Produccion.png",
        completed: true,
        alternatives: [
          { format: "pdf", href: "/download/rb_ofertas_laborales/01_Oferta_Laboral_Jefe_Produccion.png" },
        ],
      },
    ],
  },
  {
    id: "estrategia",
    title: "Estrategia & Coordinación",
    icon: <HeartHandshake className="w-4 h-4" />,
    items: [
      {
        id: "cronograma",
        code: "TH-22",
        name: "Cronograma de Selección (Excel)",
        description:
          "Cronograma del proceso de selección por etapas en Excel.",
        ext: "XLSX",
        count: 1,
        icon: <FileSpreadsheet className="w-5 h-5" />,
        color: "#4F8C28",
        href: "/download/rb_formatos_nuevos/Cronograma_Reflejos_Brillantes_SAS.xlsx",
        completed: true,
        alternatives: [
          { format: "excel", href: "/download/rb_formatos_nuevos/Cronograma_Reflejos_Brillantes_SAS.xlsx" },
        ],
      },
      {
        id: "lista-autorizacion",
        code: "TH-02",
        name: "Lista de Autorización de Convocatorias (Excel)",
        description:
          "Lista de autorización de convocatorias en Excel.",
        ext: "XLSX",
        count: 1,
        icon: <FileCheck className="w-5 h-5" />,
        color: "#4F8C28",
        href: "/download/rb_formatos_nuevos/Lista_Autorizacion_Convocatorias.xlsx",
        completed: true,
        alternatives: [
          { format: "excel", href: "/download/rb_formatos_nuevos/Lista_Autorizacion_Convocatorias.xlsx" },
        ],
      },
      {
        id: "checklist-auditoria",
        code: "TH-02",
        name: "Checklist Auditoría de Perfiles (Excel)",
        description:
          "Checklist de auditoría de perfiles en Excel.",
        ext: "XLSX",
        count: 1,
        icon: <FileCheck className="w-5 h-5" />,
        color: "#4F8C28",
        href: "/download/rb_formatos_nuevos/Checklist_Auditoria_Perfiles.xlsx",
        completed: true,
        alternatives: [
          { format: "excel", href: "/download/rb_formatos_nuevos/Checklist_Auditoria_Perfiles.xlsx" },
        ],
      },
      {
        id: "informe-ejecutivo",
        code: "TH-MD-03",
        name: "Informe Ejecutivo Multicargo (Word)",
        description:
          "Informe ejecutivo consolidado de todo el proceso de selección multicargo en Word con normas APA.",
        ext: "DOCX",
        count: 1,
        icon: <Trophy className="w-5 h-5" />,
        color: "#FF9800",
        href: "/download/rb_formatos_nuevos/Informe_Ejecutivo_Multicargo_Reflejos_Brillantes.docx",
        completed: true,
        alternatives: [
          { format: "word", href: "/download/rb_formatos_nuevos/Informe_Ejecutivo_Multicargo_Reflejos_Brillantes.docx" },
        ],
      },
    ],
  },
  {
    id: "fase2",
    title: "Fase 2 — Coordinación Logística & Pruebas",
    icon: <TrendingUp className="w-4 h-4" />,
    items: [
      {
        id: "entrevista-jefe",
        code: "TH-07",
        name: "Entrevista Estructurada — Jefe de Producción",
        description:
          "Formato de entrevista estructurada con calificación cuantitativa para Jefe de Producción (Word).",
        ext: "DOCX",
        count: 1,
        icon: <FileSignature className="w-5 h-5" />,
        color: "#2C3E50",
        href: "/download/rb_fase2/Entrevista_Estructurada_Jefe_Produccion.docx",
        completed: true,
        alternatives: [
          { format: "word", href: "/download/rb_fase2/Entrevista_Estructurada_Jefe_Produccion.docx" },
        ],
      },
      {
        id: "entrevista-asistente",
        code: "TH-07",
        name: "Entrevista Estructurada — Asistente TH",
        description:
          "Formato de entrevista estructurada con calificación cuantitativa para Asistente TH (Word).",
        ext: "DOCX",
        count: 1,
        icon: <FileSignature className="w-5 h-5" />,
        color: "#2C3E50",
        href: "/download/rb_fase2/Entrevista_Estructurada_Asistente_TH.docx",
        completed: true,
        alternatives: [
          { format: "word", href: "/download/rb_fase2/Entrevista_Estructurada_Asistente_TH.docx" },
        ],
      },
      {
        id: "entrevista-auxiliar",
        code: "TH-07",
        name: "Entrevista Estructurada — Auxiliar Logístico",
        description:
          "Formato de entrevista estructurada con calificación cuantitativa para Auxiliar Logístico (Word).",
        ext: "DOCX",
        count: 1,
        icon: <FileSignature className="w-5 h-5" />,
        color: "#2C3E50",
        href: "/download/rb_fase2/Entrevista_Estructurada_Auxiliar_Logistico.docx",
        completed: true,
        alternatives: [
          { format: "word", href: "/download/rb_fase2/Entrevista_Estructurada_Auxiliar_Logistico.docx" },
        ],
      },
      {
        id: "programador",
        code: "TH-22",
        name: "Programador de Selección (Excel)",
        description:
          "Programador de selección de personal con todas las actividades y responsables.",
        ext: "XLSX",
        count: 1,
        icon: <FileSpreadsheet className="w-5 h-5" />,
        color: "#4F8C28",
        href: "/download/rb_fase2/Programador_Seleccion_Reflejos_Brillantes.xlsx",
        completed: true,
        alternatives: [
          { format: "excel", href: "/download/rb_fase2/Programador_Seleccion_Reflejos_Brillantes.xlsx" },
        ],
      },
      {
        id: "plantillas-matrices",
        code: "TH-04",
        name: "Plantillas Matrices Pruebas Selección (Word)",
        description:
          "Plantillas matrices de pruebas de selección con valoración cuantitativa por competencia.",
        ext: "DOCX",
        count: 1,
        icon: <FileCheck className="w-5 h-5" />,
        color: "#2C3E50",
        href: "/download/rb_fase2/Plantillas_Matrices_Pruebas_Seleccion.docx",
        completed: true,
        alternatives: [
          { format: "word", href: "/download/rb_fase2/Plantillas_Matrices_Pruebas_Seleccion.docx" },
        ],
      },
      {
        id: "formato-integral",
        code: "TH-MD-09",
        name: "Formato Integral Coordinación Logística (Word)",
        description:
          "Formato integral de coordinación logística para entrevistas y pruebas.",
        ext: "DOCX",
        count: 1,
        icon: <FileSignature className="w-5 h-5" />,
        color: "#2C3E50",
        href: "/download/rb_fase2/Formato_Integral_Coordinacion_Logistica_Entrevistas.docx",
        completed: true,
        alternatives: [
          { format: "word", href: "/download/rb_fase2/Formato_Integral_Coordinacion_Logistica_Entrevistas.docx" },
        ],
      },
      {
        id: "lista-espacio-virtual",
        code: "TH-09",
        name: "Lista Verificación Alistamiento Espacio Virtual (Word)",
        description:
          "Lista de verificación de alistamiento de espacio virtual para entrevistas.",
        ext: "DOCX",
        count: 1,
        icon: <FileCheck className="w-5 h-5" />,
        color: "#4F8C28",
        href: "/download/rb_fase2/Lista_Verificacion_Alistamiento_Espacio_Virtual.docx",
        completed: true,
        alternatives: [
          { format: "word", href: "/download/rb_fase2/Lista_Verificacion_Alistamiento_Espacio_Virtual.docx" },
        ],
      },
    ],
  },
];

const ZIP_FILES = [
  {
    id: "zip-completo",
    name: "Reflejos_Brillantes_Formatos_Completos.zip",
    description:
      "Archivo ZIP con TODOS los formatos generados: hojas de vida Word, listas Excel, verificaciones, convocatorias, requisiciones, cronograma, matrices comparativas, informe ejecutivo y formatos de Fase 2 (Coordinación Logística, Espacio Virtual, Plantillas Matrices, Programador de Selección y Entrevistas Estructuradas por cargo).",
    href: "/download/Reflejos_Brillantes_SENA_Completo.zip",
    icon: <Archive className="w-6 h-6" />,
    color: "#2C3E50",
    badge: "Recomendado",
  },
  {
    id: "zip-paquete",
    name: "Reflejos_Brillantes_PAQUETE_COMPLETO.zip",
    description:
      "Paquete COMPLETO adicional con archivos adicionales del proceso (incluye imágenes, archivos Word/Excel individuales y PNG).",
    href: "/download/Reflejos_Brillantes_PAQUETE_COMPLETO.zip",
    icon: <FolderArchive className="w-6 h-6" />,
    color: "#FF9800",
    badge: "Completo",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FormatsModule({
  company = "reflejos_brillantes",
  onGoToGestion,
}: {
  company?: CompanyId;
  onGoToGestion?: () => void;
}) {
  const theme = getCompanyTheme(company);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [defaultFormat, setDefaultFormat] = React.useState<ExportFormat>("word");

  /* ---- Track analyzed HVs (so we know whether to show empty state) ---- */
  const [analyzedHvs, setAnalyzedHvs] = React.useState<PersistedHv[]>([]);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () => setAnalyzedHvs(loadAnalyzedHVs());
    refresh();
    window.addEventListener("sigth-analyzed-hvs-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("sigth-analyzed-hvs-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const hasAnalyzedOrAnalyzing = analyzedHvs.length > 0;

  const handleDownload = async (
    id: string,
    name: string,
    href: string,
    format?: ExportFormat,
  ) => {
    setDownloadingId(id);
    try {
      const res = await fetch(href, { method: "HEAD" });
      if (!res.ok) {
        window.open(href, "_blank");
        toast.info(`Abriendo "${name}" en nueva pestaña…`);
      } else {
        const a = document.createElement("a");
        a.href = href;
        a.download = name || href.split("/").pop() || "descarga";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        const fmtLabel = format === "pdf" ? "PDF" : format === "excel" ? "Excel" : format === "word" ? "Word" : "";
        toast.success(`Descargando "${name}"${fmtLabel ? ` (${fmtLabel})` : ""}…`);
      }
    } catch {
      window.open(href, "_blank");
      toast.info(`Abriendo "${name}" en nueva pestaña…`);
    } finally {
      setTimeout(() => setDownloadingId(null), 800);
    }
  };

  const handleDownloadAll = async () => {
    setDownloadingId("all");
    try {
      const item = ZIP_FILES[0];
      const res = await fetch(item.href, { method: "HEAD" });
      if (!res.ok) {
        window.open(item.href, "_blank");
        toast.info("Abriendo ZIP en nueva pestaña…");
      } else {
        const a = document.createElement("a");
        a.href = item.href;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Descargando ZIP completo…");
      }
    } finally {
      setTimeout(() => setDownloadingId(null), 1200);
    }
  };

  // Count total formats available
  const totalFormats = FORMAT_CATEGORIES.reduce(
    (sum, cat) => sum + cat.items.filter((i) => i.completed).length,
    0,
  );

  return (
    <div className="space-y-6 animate-rb-fade-up">
      {!hasAnalyzedOrAnalyzing ? (
        /* ============ Empty state — no HVs analyzed yet ============ */
        <Card className="border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <div
              className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: `linear-gradient(135deg, #${theme.accent}22, #${theme.dark}22)`,
              }}
            >
              <FolderArchive className="w-8 h-8" style={{ color: `#${theme.primary}` }} />
            </div>
            <h3 className="text-lg font-bold mb-1" style={{ color: `#${theme.primary}` }}>
              Archivador vacío
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Aún no has analizado hojas de vida. Cuando subas HVs en la pestaña{" "}
              <strong>Gestión → Archivador → Hojas de Vida</strong>, los formatos
              completados aparecerán aquí automáticamente.
            </p>
            <Button onClick={() => onGoToGestion?.()}>
              <UploadCloud className="w-4 h-4 mr-2" /> Ir a subir hojas de vida
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
      {/* ===================== Hero / Archivador ===================== */}
      <Card
        className="text-white shadow-lg border overflow-hidden"
        style={{
          borderColor: `#${theme.accent}80`,
          background: `linear-gradient(135deg, #${theme.dark} 0%, #${theme.medium} 100%)`,
        }}
      >
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 mb-5">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-md"
              style={{
                background: `#${theme.accent}`,
                color: `#${theme.dark}`,
              }}
            >
              <FileBox className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                Archivador de Formatos
                <span
                  className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                  style={{
                    background: `#${theme.accent}`,
                    color: `#${theme.dark}`,
                  }}
                >
                  {totalFormats} completados
                </span>
              </h2>
              <p className="text-sm text-white/85">
                Aquí se almacenan <strong>solo los formatos completados</strong>.
                Descarga cada formato en <strong>Word</strong>, <strong>PDF</strong> o <strong>Excel</strong> según
                tu preferencia. Todos incluyen <strong>logo como marca de agua</strong>, <strong>numeración de páginas</strong> y <strong>normas APA</strong>.
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleDownloadAll}
              disabled={downloadingId === "all"}
              className="rb-btn-primary shrink-0"
            >
              {downloadingId === "all" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Archive className="w-4 h-4 mr-2" />
              )}
              Descargar TODO (ZIP)
            </Button>
          </div>

          {/* Format selector */}
          <div
            className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex items-center gap-3 flex-wrap"
          >
            <span className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Formato preferido:
            </span>
            <div className="flex gap-1 bg-black/20 rounded-md p-0.5">
              {(["word", "pdf", "excel"] as ExportFormat[]).map((f) => {
                const active = defaultFormat === f;
                const label = f === "word" ? "Word" : f === "pdf" ? "PDF" : "Excel";
                const icon =
                  f === "word" ? <FileText className="w-3 h-3" /> :
                  f === "pdf" ? <FileSignature className="w-3 h-3" /> :
                  <FileSpreadsheet className="w-3 h-3" />;
                return (
                  <button
                    key={f}
                    onClick={() => setDefaultFormat(f)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors",
                      active ? "text-white shadow-sm" : "text-white/70 hover:text-white",
                    )}
                    style={active ? { background: `#${theme.accent}`, color: `#${theme.dark}` } : undefined}
                  >
                    {icon}
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex-1" />
            <span className="text-[10px] text-white/70 flex items-center gap-1">
              <Stamp className="w-3 h-3" />
              Marca de agua · APA · Numeración · Foto
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ===================== ZIP cards (full packages) ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ZIP_FILES.map((zip) => (
          <ZipCard
            key={zip.id}
            zip={zip}
            downloading={downloadingId === zip.id}
            onDownload={() => handleDownload(zip.id, zip.name, zip.href)}
            theme={theme}
          />
        ))}
      </div>

      {/* ===================== Individual formats — archivador collapsible ===================== */}
      <div className="space-y-3">
        {FORMAT_CATEGORIES.map((cat) => (
          <CollapsibleFormatCategory
            key={cat.id}
            category={cat}
            defaultFormat={defaultFormat}
            downloadingId={downloadingId}
            onDownload={handleDownload}
            theme={theme}
          />
        ))}
      </div>

      {/* ===================== Summary ===================== */}
      <Card className="bg-accent/15 border-accent/40">
        <CardContent className="pt-6 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: `#${theme.accent}` }} />
          <div className="text-sm">
            <p className="font-semibold mb-1" style={{ color: `#${theme.primary}` }}>
              Solo se muestran formatos completados
            </p>
            <p className="text-muted-foreground">
              Vuelve a la pestaña <strong>Gestión → Hojas de Vida</strong>, sube nuevas hojas de vida con análisis IA automático
              y descarga los formatos actualizados. Cada archivo incluye <strong>logo RB como marca de agua</strong>, <strong>normas APA</strong>, <strong>numeración de páginas</strong> y la <strong>foto del candidato</strong> cuando aplica.
            </p>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ZipCard({
  zip,
  downloading,
  onDownload,
  theme,
}: {
  zip: (typeof ZIP_FILES)[0];
  downloading: boolean;
  onDownload: () => void;
  theme: ReturnType<typeof getCompanyTheme>;
}) {
  return (
    <Card
      className="hover:shadow-md transition-all overflow-hidden border-2"
      style={{ borderColor: `#${zip.color}55` }}
    >
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ background: `#${zip.color}` }}
          >
            {zip.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-sm leading-tight" style={{ color: `#${theme.primary}` }}>
                {zip.name}
              </p>
              {zip.badge && (
                <Badge
                  className="text-[9px] font-bold uppercase tracking-wider"
                  style={{
                    background: `#${theme.accent}`,
                    color: `#${theme.dark}`,
                  }}
                >
                  {zip.badge}
                </Badge>
              )}
            </div>
            <Badge
              variant="outline"
              className="mt-1 text-[10px]"
              style={{
                borderColor: `#${theme.accent}66`,
                color: `#${theme.accent}`,
              }}
            >
              ZIP · Paquete completo
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{zip.description}</p>
        <Button
          size="sm"
          onClick={onDownload}
          disabled={downloading}
          className="w-full rb-btn-dark"
        >
          {downloading ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5 mr-1" />
          )}
          Descargar ZIP
        </Button>
      </CardContent>
    </Card>
  );
}

function CollapsibleFormatCategory({
  category,
  defaultFormat,
  downloadingId,
  onDownload,
  theme,
}: {
  category: FormatCategory;
  defaultFormat: ExportFormat;
  downloadingId: string | null;
  onDownload: (
    id: string,
    name: string,
    href: string,
    format?: ExportFormat,
  ) => void;
  theme: ReturnType<typeof getCompanyTheme>;
}) {
  const [open, setOpen] = React.useState(true);
  const completedItems = category.items.filter((i) => i.completed);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card
        className="overflow-hidden border shadow-sm"
        style={{ borderColor: `#${theme.primary}22` }}
      >
        <CollapsibleTrigger asChild>
          <button
            className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/40 transition-colors"
            style={{ background: `linear-gradient(90deg, #${theme.dark}08, transparent)` }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
              style={{ background: `#${theme.dark}` }}
            >
              {category.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="font-bold text-sm leading-tight"
                style={{ color: `#${theme.primary}` }}
              >
                {category.title}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {completedItems.length} formato(s) completado(s) · {category.items.length} total
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-[10px]"
                style={{
                  borderColor: `#${theme.accent}66`,
                  color: `#${theme.accent}`,
                  background: `#${theme.accent}15`,
                }}
              >
                {completedItems.length} listos
              </Badge>
              <div
                className="p-1 rounded-md"
                style={{ background: `#${theme.dark}15` }}
              >
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform",
                    open && "rotate-180",
                  )}
                  style={{ color: `#${theme.dark}` }}
                />
              </div>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t" style={{ borderColor: `#${theme.primary}11` }}>
            {category.items.map((item) => (
              <FormatCard
                key={item.id}
                item={item}
                defaultFormat={defaultFormat}
                downloading={downloadingId === item.id}
                onDownload={onDownload}
                theme={theme}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function FormatCard({
  item,
  defaultFormat,
  downloading,
  onDownload,
  theme,
}: {
  item: FormatItem;
  defaultFormat: ExportFormat;
  downloading: boolean;
  onDownload: (
    id: string,
    name: string,
    href: string,
    format?: ExportFormat,
  ) => void;
  theme: ReturnType<typeof getCompanyTheme>;
}) {
  const availableFormats: ExportFormat[] = item.alternatives
    ? item.alternatives.map((a) => a.format)
    : [item.ext === "DOCX" ? "word" : item.ext === "XLSX" ? "excel" : "pdf"];

  const getHrefForFormat = (fmt: ExportFormat): string => {
    if (item.alternatives) {
      const found = item.alternatives.find((a) => a.format === fmt);
      if (found) return found.href;
    }
    return item.href;
  };

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-all flex flex-col overflow-hidden",
        !item.completed && "opacity-60",
      )}
      style={{ borderColor: `#${theme.accent}55` }}
    >
      <CardContent className="pt-4 pb-3 flex-1 flex flex-col">
        <div className="flex items-start gap-2.5 mb-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
            style={{ background: `#${item.color}` }}
          >
            {item.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: `#${theme.dark}15`,
                  color: `#${theme.dark}`,
                }}
              >
                {item.code}
              </span>
              <p
                className="font-semibold text-sm leading-tight flex-1 min-w-0 truncate"
                style={{ color: `#${theme.primary}` }}
              >
                {item.name}
              </p>
            </div>
            <Badge
              variant="outline"
              className="mt-1 text-[10px]"
              style={{
                borderColor: `#${theme.accent}66`,
                color: `#${theme.accent}`,
              }}
            >
              {item.ext}
              {item.count ? ` · ${item.count} archivo(s)` : ""}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground flex-1 mb-3 line-clamp-3">
          {item.description}
        </p>

        {item.completed ? (
          <div className="space-y-2">
            {/* Format selector for this card */}
            {availableFormats.length > 1 ? (
              <div className="flex gap-1 bg-muted/40 rounded-md p-0.5">
                {(["word", "pdf", "excel"] as ExportFormat[]).map((f) => {
                  const isAvailable = availableFormats.includes(f);
                  if (!isAvailable) return null;
                  const active = defaultFormat === f;
                  const label = f === "word" ? "Word" : f === "pdf" ? "PDF" : "Excel";
                  return (
                    <button
                      key={f}
                      onClick={() =>
                        onDownload(item.id, item.name, getHrefForFormat(f), f)
                      }
                      disabled={downloading}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors",
                        active ? "text-white shadow-sm" : "hover:bg-muted",
                      )}
                      style={active ? { background: `#${theme.accent}`, color: `#${theme.dark}` } : undefined}
                    >
                      {downloading ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <>
                          {label}
                          <Download className="w-2.5 h-2.5" />
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    onDownload(item.id, item.name, item.href, availableFormats[0])
                  }
                  disabled={downloading}
                  className="rb-btn-primary flex-1"
                >
                  {downloading ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 mr-1" />
                  )}
                  Descargar {availableFormats[0] === "word" ? "Word" : availableFormats[0] === "pdf" ? "PDF" : "Excel"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  style={{
                    borderColor: `#${theme.accent}66`,
                    color: `#${theme.primary}`,
                  }}
                  onClick={() => window.open(item.href, "_blank")}
                  title="Abrir en nueva pestaña"
                >
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <Stamp className="w-2.5 h-2.5" />
              <span>Marca de agua · APA · Numeración</span>
            </div>
          </div>
        ) : (
          <div className="text-center text-xs text-muted-foreground py-3 border border-dashed rounded-md">
            <FileText className="w-4 h-4 mx-auto mb-1 opacity-50" />
            Formato pendiente
          </div>
        )}
      </CardContent>
    </Card>
  );
}

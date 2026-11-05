"use client";

import * as React from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  FileImage,
  Download,
  ChevronDown,
  ChevronRight,
  Users,
  CheckCircle2,
  Clock,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loadAnalyzedHVs, type PersistedHv, type CompanyId, getCompanyTheme } from "@/lib/analysis";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Archivador de documentos — vista por carpetas y candidatos         */
/* ------------------------------------------------------------------ */

interface DocumentoItem {
  codigo: string;
  nombre: string;
  tipo: "Word" | "Excel" | "PDF" | "PNG";
  href: string;
  candidato?: string;
}

interface CarpetaProceso {
  id: string;
  nombre: string;
  color: string;
  icon: React.ReactNode;
  documentos: DocumentoItem[];
}

const PROCESOS_ARCHIVADOR: CarpetaProceso[] = [
  {
    id: "seleccion",
    nombre: "Selección",
    color: "#92D050",
    icon: <Users className="w-5 h-5" />,
    documentos: [
      { codigo: "TH-FR-01", nombre: "Requisición de personal", tipo: "Word", href: "#", candidato: "" },
      { codigo: "TH-FR-02", nombre: "Perfil y descripción de cargo", tipo: "Word", href: "#", candidato: "" },
      { codigo: "TH-MD-01", nombre: "Convocatoria", tipo: "PNG", href: "#", candidato: "" },
      { codigo: "TH-FR-03", nombre: "Hoja de vida estandarizada", tipo: "Word", href: "#", candidato: "Andrés Gómez" },
      { codigo: "TH-FR-03", nombre: "Hoja de vida estandarizada", tipo: "Word", href: "#", candidato: "Daniel Rojas" },
      { codigo: "TH-FR-03", nombre: "Hoja de vida estandarizada", tipo: "Word", href: "#", candidato: "Santiago Rincón" },
      { codigo: "TH-FR-03", nombre: "Hoja de vida estandarizada", tipo: "Word", href: "#", candidato: "Valentina Torres" },
      { codigo: "TH-FR-03", nombre: "Hoja de vida estandarizada", tipo: "Word", href: "#", candidato: "Daniel Ramírez" },
      { codigo: "TH-FR-04", nombre: "Guía de entrevista estructurada", tipo: "Word", href: "#", candidato: "" },
      { codigo: "TH-FR-05", nombre: "Verificación de referencias", tipo: "Word", href: "#", candidato: "" },
    ],
  },
  {
    id: "contratacion",
    nombre: "Contratación",
    color: "#2C3E50",
    icon: <FileText className="w-5 h-5" />,
    documentos: [
      { codigo: "TH-FR-06", nombre: "Remisión a exámenes médicos", tipo: "Word", href: "#", candidato: "" },
      { codigo: "TH-FR-07", nombre: "Lista de chequeo de documentos", tipo: "Excel", href: "#", candidato: "Andrés Gómez" },
      { codigo: "TH-FR-07", nombre: "Lista de chequeo de documentos", tipo: "Excel", href: "#", candidato: "Daniel Ramírez" },
      { codigo: "TH-MD-02", nombre: "Contrato de trabajo", tipo: "Word", href: "#", candidato: "" },
    ],
  },
  {
    id: "induccion",
    nombre: "Inducción",
    color: "#B8941F",
    icon: <CheckCircle2 className="w-5 h-5" />,
    documentos: [
      { codigo: "TH-MD-03", nombre: "Programa de inducción", tipo: "Word", href: "#", candidato: "" },
      { codigo: "TH-FR-08", nombre: "Lista de chequeo de inducción", tipo: "Word", href: "#", candidato: "" },
      { codigo: "TH-FR-09", nombre: "Encuesta de satisfacción", tipo: "Word", href: "#", candidato: "" },
    ],
  },
  {
    id: "capacitacion",
    nombre: "Capacitación",
    color: "#7B2D8B",
    icon: <Clock className="w-5 h-5" />,
    documentos: [
      { codigo: "TH-FR-10", nombre: "Plan anual de capacitación", tipo: "Word", href: "#", candidato: "" },
      { codigo: "TH-FR-11", nombre: "Control de asistencia", tipo: "Excel", href: "#", candidato: "" },
    ],
  },
  {
    id: "desempeno",
    nombre: "Desempeño",
    color: "#FF9800",
    icon: <Archive className="w-5 h-5" />,
    documentos: [
      { codigo: "TH-FR-12", nombre: "Evaluación del desempeño", tipo: "Word", href: "#", candidato: "" },
      { codigo: "TH-FR-13", nombre: "Plan de mejoramiento", tipo: "Word", href: "#", candidato: "" },
    ],
  },
  {
    id: "bienestar",
    nombre: "Bienestar",
    color: "#6B1F2E",
    icon: <Users className="w-5 h-5" />,
    documentos: [
      { codigo: "TH-MD-04", nombre: "Plan de bienestar laboral", tipo: "Word", href: "#", candidato: "" },
    ],
  },
  {
    id: "retiro",
    nombre: "Retiro",
    color: "#7F8C8D",
    icon: <FileText className="w-5 h-5" />,
    documentos: [
      { codigo: "TH-MD-05", nombre: "Carta de terminación de contrato", tipo: "Word", href: "#", candidato: "" },
      { codigo: "TH-FR-14", nombre: "Paz y salvo", tipo: "Word", href: "#", candidato: "" },
      { codigo: "TH-FR-15", nombre: "Entrevista de retiro", tipo: "Word", href: "#", candidato: "" },
    ],
  },
];

function getIcon(tipo: string) {
  switch (tipo) {
    case "Excel":
      return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
    case "PDF":
      return <FileText className="w-4 h-4 text-red-600" />;
    case "PNG":
      return <FileImage className="w-4 h-4 text-blue-600" />;
    default:
      return <FileText className="w-4 h-4 text-blue-800" />;
  }
}

export function ArchivadorDocumentos({ company }: { company?: CompanyId }) {
  const [openFolders, setOpenFolders] = React.useState<Set<string>>(new Set(["seleccion"]));
  const [analyzedHvs, setAnalyzedHvs] = React.useState<PersistedHv[]>([]);

  React.useEffect(() => {
    const refresh = () => setAnalyzedHvs(loadAnalyzedHVs());
    refresh();
    window.addEventListener("sigth-analyzed-hvs-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("sigth-analyzed-hvs-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const toggleFolder = (id: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalDocs = PROCESOS_ARCHIVADOR.reduce((sum, p) => sum + p.documentos.length, 0);
  const candidatos = analyzedHvs.length;

  const handleDownload = (doc: DocumentoItem) => {
    toast.info(`Descargando ${doc.codigo} — ${doc.nombre}${doc.candidato ? ` (${doc.candidato})` : ""}...`);
  };

  return (
    <div className="space-y-4 animate-rb-fade-up">
      {/* Header del archivador */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-700 text-white">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Archivador de Documentos</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {totalDocs} documentos · {PROCESOS_ARCHIVADOR.length} procesos · {candidatos} candidato(s)
            </p>
          </div>
        </div>
      </div>

      {/* Carpetas por proceso */}
      <div className="space-y-2">
        {PROCESOS_ARCHIVADOR.map((proceso) => {
          const isOpen = openFolders.has(proceso.id);
          return (
            <div
              key={proceso.id}
              className="rounded-lg overflow-hidden border-2 transition-all"
              style={{ borderColor: `${proceso.color}40` }}
            >
              {/* Cabecera de la carpeta */}
              <button
                onClick={() => toggleFolder(proceso.id)}
                className="w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                style={{ background: `${proceso.color}10` }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
                  style={{ background: proceso.color }}
                >
                  {isOpen ? <FolderOpen className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm" style={{ color: proceso.color }}>
                    {proceso.nombre}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {proceso.documentos.length} documento(s)
                  </div>
                </div>
                <ChevronDown
                  className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")}
                  style={{ color: proceso.color }}
                />
              </button>

              {/* Documentos dentro de la carpeta */}
              {isOpen && (
                <div className="p-3 space-y-2 bg-white dark:bg-slate-900">
                  {proceso.documentos.map((doc, idx) => (
                    <div
                      key={`${doc.codigo}-${idx}`}
                      className="flex items-center gap-3 p-2 rounded-md border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {getIcon(doc.tipo)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {doc.codigo}
                          </span>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                            {doc.nombre}
                          </span>
                        </div>
                        {doc.candidato && (
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {doc.candidato}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[9px]">
                        {doc.tipo}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(doc)}
                        className="h-7 px-2"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}

                  {/* Candidatos analizados con IA (si hay) */}
                  {proceso.id === "seleccion" && candidatos > 0 && (
                    <div className="mt-3 p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <div className="text-[11px] font-bold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Candidatos analizados con IA ({candidatos})
                      </div>
                      <div className="space-y-1">
                        {analyzedHvs.map((hv, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {hv.analysis?.nombre || "Candidato"}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500">{hv.analysis?.cargoAspira || ""}</span>
                            {hv.evaluation && (
                              <Badge className="ml-auto text-[9px]" style={{
                                background: hv.evaluation.score >= 85 ? "#C6EFCE" : hv.evaluation.score >= 70 ? "#FFEB9C" : "#FFC7CE",
                                color: hv.evaluation.score >= 85 ? "#006100" : hv.evaluation.score >= 70 ? "#9C6500" : "#9C0006",
                              }}>
                                {hv.evaluation.score}/100
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

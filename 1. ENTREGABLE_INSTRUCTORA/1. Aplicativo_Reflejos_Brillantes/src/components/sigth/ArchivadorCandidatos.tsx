"use client";

import * as React from "react";
import {
  Users,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Circle,
  ChevronDown,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  FileImage,
  Download,
  Sparkles,
  TrendingUp,
  Award,
  FolderOpen,
  Folder,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loadAnalyzedHVs, type PersistedHv } from "@/lib/analysis";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */

type EstadoProceso = "pasado" | "no_paso" | "en_proceso" | "sin_iniciar";

interface DocumentoHistorial {
  codigo: string;
  nombre: string;
  tipo: "Word" | "Excel" | "PDF" | "PNG" | "Auto";
  estado: "completado" | "pendiente" | "no_aplica";
  href?: string;
}

interface ProcesoHistorial {
  id: string;
  nombre: string;
  color: string;
  estado: EstadoProceso;
  documentos: DocumentoHistorial[];
}

interface CandidatoHistorial {
  id: string;
  nombre: string;
  cargo: string;
  score: number;
  estadoGeneral: string;
  foto?: string;
  procesos: ProcesoHistorial[];
}

/* ------------------------------------------------------------------ */
/*  Configuración de procesos                                         */
/* ------------------------------------------------------------------ */

const PROCESOS_CONFIG = [
  { id: "seleccion", nombre: "Selección", color: "#92D050" },
  { id: "contratacion", nombre: "Contratación", color: "#2C3E50" },
  { id: "induccion", nombre: "Inducción", color: "#B8941F" },
  { id: "capacitacion", nombre: "Capacitación", color: "#7B2D8B" },
  { id: "desempeno", nombre: "Desempeño", color: "#FF9800" },
  { id: "bienestar", nombre: "Bienestar", color: "#6B1F2E" },
  { id: "retiro", nombre: "Retiro", color: "#7F8C8D" },
];

/* ------------------------------------------------------------------ */
/*  Funciones auxiliares                                              */
/* ------------------------------------------------------------------ */

function calcularEstadoProceso(
  procesoId: string,
  candidatoNombre: string,
): EstadoProceso {
  if (typeof window === "undefined") return "sin_iniciar";

  try {
    // Verificar si hay datos del candidato en cada formato
    const formatosPorProceso: Record<string, string[]> = {
      seleccion: ["sigth-gestion-format-TH-01", "sigth-gestion-format-TH-03", "sigth-gestion-format-TH-04", "sigth-gestion-format-TH-05"],
      contratacion: ["sigth-gestion-format-TH-CONTRATO", "sigth-gestion-format-TH-AFILIACIONES", "sigth-gestion-format-TH-08", "sigth-gestion-format-TH-09"],
      induccion: ["sigth-gestion-format-TH-11", "sigth-gestion-format-TH-13"],
      capacitacion: ["sigth-gestion-format-TH-14", "sigth-gestion-format-TH-16"],
      desempeno: ["sigth-gestion-format-TH-15"],
      bienestar: ["sigth-gestion-format-TH-18"],
      retiro: ["sigth-gestion-format-TH-22"],
    };

    const formatos = formatosPorProceso[procesoId] || [];
    let completados = 0;

    for (const fmt of formatos) {
      const raw = window.localStorage.getItem(fmt);
      if (raw && raw !== "{}" && raw !== "null") {
        const data = JSON.parse(raw);
        // Verificar si el candidato aparece en el formato
        if (data.nombresApellidos?.includes(candidatoNombre) ||
            data.nombre?.includes(candidatoNombre) ||
            data.nombreEmpleado?.includes(candidatoNombre) ||
            candidatoNombre === "") {
          completados++;
        } else if (completados === 0 && raw.length > 10) {
          // Si hay datos pero no del candidato específico, igual contar
          completados++;
        }
      }
    }

    if (completados === formatos.length) return "pasado";
    if (completados > 0) return "en_proceso";
    return "sin_iniciar";
  } catch {
    return "sin_iniciar";
  }
}

function construirDocumentos(procesoId: string, candidato: string): DocumentoHistorial[] {
  const docsPorProceso: Record<string, { codigo: string; nombre: string; tipo: DocumentoHistorial["tipo"]; lsKey: string }[]> = {
    seleccion: [
      { codigo: "TH-FR-01", nombre: "Requisición de personal", tipo: "Word", lsKey: "sigth-gestion-format-TH-01" },
      { codigo: "TH-FR-02", nombre: "Perfil y descripción de cargo", tipo: "Word", lsKey: "sigth-gestion-format-TH-02" },
      { codigo: "TH-FR-03", nombre: "Hoja de vida", tipo: "Word", lsKey: "sigth-gestion-format-TH-03" },
      { codigo: "TH-FR-04", nombre: "Guía de entrevista", tipo: "Word", lsKey: "sigth-gestion-format-TH-04" },
      { codigo: "TH-FR-05", nombre: "Verificación de referencias", tipo: "Word", lsKey: "sigth-gestion-format-TH-05" },
      { codigo: "TH-MD-01", nombre: "Convocatoria", tipo: "PNG", lsKey: "sigth-gestion-format-TH-MD-01" },
    ],
    contratacion: [
      { codigo: "TH-FR-06", nombre: "Exámenes médicos", tipo: "Word", lsKey: "sigth-gestion-format-TH-08" },
      { codigo: "TH-FR-07", nombre: "Chequeo de documentos", tipo: "Excel", lsKey: "sigth-gestion-format-TH-09" },
      { codigo: "TH-CONTRATO", nombre: "Contrato laboral (auto)", tipo: "Auto", lsKey: "sigth-gestion-format-TH-CONTRATO" },
      { codigo: "TH-AFILIACIONES", nombre: "Afiliaciones SS (auto)", tipo: "Auto", lsKey: "sigth-gestion-format-TH-AFILIACIONES" },
      { codigo: "TH-MD-02", nombre: "Contrato de trabajo", tipo: "Word", lsKey: "sigth-gestion-format-TH-MD-02" },
    ],
    induccion: [
      { codigo: "TH-MD-03", nombre: "Programa de inducción", tipo: "Word", lsKey: "sigth-gestion-format-TH-MD-03" },
      { codigo: "TH-FR-08", nombre: "Chequeo de inducción", tipo: "Word", lsKey: "sigth-gestion-format-TH-11" },
      { codigo: "TH-FR-09", nombre: "Satisfacción de inducción", tipo: "Word", lsKey: "sigth-gestion-format-TH-13" },
    ],
    capacitacion: [
      { codigo: "TH-FR-10", nombre: "Plan anual de capacitación", tipo: "Word", lsKey: "sigth-gestion-format-TH-14" },
      { codigo: "TH-FR-11", nombre: "Control de asistencia", tipo: "Excel", lsKey: "sigth-gestion-format-TH-16" },
    ],
    desempeno: [
      { codigo: "TH-FR-12", nombre: "Evaluación del desempeño", tipo: "Word", lsKey: "sigth-gestion-format-TH-15" },
      { codigo: "TH-FR-13", nombre: "Plan de mejoramiento", tipo: "Word", lsKey: "sigth-gestion-format-TH-17" },
    ],
    bienestar: [
      { codigo: "TH-MD-04", nombre: "Plan de bienestar laboral", tipo: "Word", lsKey: "sigth-gestion-format-TH-18" },
    ],
    retiro: [
      { codigo: "TH-MD-05", nombre: "Carta de terminación", tipo: "Word", lsKey: "sigth-gestion-format-TH-22" },
      { codigo: "TH-FR-14", nombre: "Paz y salvo", tipo: "Word", lsKey: "sigth-gestion-format-TH-21" },
      { codigo: "TH-FR-15", nombre: "Entrevista de retiro", tipo: "Word", lsKey: "sigth-gestion-format-TH-20" },
    ],
  };

  const docs = docsPorProceso[procesoId] || [];
  return docs.map((d) => {
    let estado: DocumentoHistorial["estado"] = "pendiente";
    try {
      const raw = window.localStorage.getItem(d.lsKey);
      if (raw && raw !== "{}" && raw !== "null" && raw.length > 5) {
        estado = "completado";
      }
    } catch {}
    return {
      codigo: d.codigo,
      nombre: d.nombre,
      tipo: d.tipo,
      estado,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Componente principal                                              */
/* ------------------------------------------------------------------ */

export function ArchivadorCandidatos() {
  const [candidatos, setCandidatos] = React.useState<CandidatoHistorial[]>([]);
  const [expandido, setExpandido] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(true);
  const [animando, setAnimando] = React.useState(false);

  const cargarCandidatos = React.useCallback(() => {
    setCargando(true);
    setAnimando(true);
    try {
      const hvs = loadAnalyzedHVs();
      const candidatosData: CandidatoHistorial[] = hvs.map((hv: PersistedHv) => {
        const nombre = hv.analysis?.nombre || "Candidato sin nombre";
        const cargo = hv.analysis?.cargoAspira || "Sin cargo";
        const score = hv.evaluation?.score || 0;
        const estadoGeneral = hv.evaluation?.decision || "En evaluación";

        const procesos: ProcesoHistorial[] = PROCESOS_CONFIG.map((proc) => {
          const estado = calcularEstadoProceso(proc.id, nombre);
          const documentos = construirDocumentos(proc.id, nombre);
          return {
            id: proc.id,
            nombre: proc.nombre,
            color: proc.color,
            estado,
            documentos,
          };
        });

        return {
          id: hv.id,
          nombre,
          cargo,
          score,
          estadoGeneral,
          foto: hv.previewUrl,
          procesos,
        };
      });
      setCandidatos(candidatosData);
      if (candidatosData.length > 0) {
        setExpandido(candidatosData[0].id);
      }
    } catch (e) {
      console.error("Error cargando candidatos:", e);
    }
    setTimeout(() => {
      setCargando(false);
      setAnimando(false);
    }, 600);
  }, []);

  React.useEffect(() => {
    cargarCandidatos();
    window.addEventListener("sigth-analyzed-hvs-changed", cargarCandidatos);
    window.addEventListener("storage", cargarCandidatos);
    return () => {
      window.removeEventListener("sigth-analyzed-hvs-changed", cargarCandidatos);
      window.removeEventListener("storage", cargarCandidatos);
    };
  }, [cargarCandidatos]);

  const toggleExpandido = (id: string) => {
    setExpandido((prev) => (prev === id ? null : id));
  };

  const getEstadoConfig = (estado: EstadoProceso) => {
    switch (estado) {
      case "pasado":
        return { icon: <CheckCircle2 className="w-4 h-4" />, color: "#16A34A", bg: "#C6EFCE", label: "Pasó" };
      case "no_paso":
        return { icon: <XCircle className="w-4 h-4" />, color: "#DC2626", bg: "#FFC7CE", label: "No pasó" };
      case "en_proceso":
        return { icon: <Clock className="w-4 h-4" />, color: "#D97706", bg: "#FFEB9C", label: "En proceso" };
      default:
        return { icon: <Circle className="w-4 h-4" />, color: "#9CA3AF", bg: "#F3F4F6", label: "Sin iniciar" };
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "Excel":
        return <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />;
      case "PDF":
        return <FileText className="w-3.5 h-3.5 text-red-600" />;
      case "PNG":
        return <FileImage className="w-3.5 h-3.5 text-blue-600" />;
      case "Auto":
        return <Sparkles className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-blue-800" />;
    }
  };

  // Contar progreso por candidato
  const getProgreso = (candidato: CandidatoHistorial) => {
    const total = candidato.procesos.length;
    const pasados = candidato.procesos.filter((p) => p.estado === "pasado").length;
    const enProceso = candidato.procesos.filter((p) => p.estado === "en_proceso").length;
    const docsTotal = candidato.procesos.reduce((s, p) => s + p.documentos.length, 0);
    const docsCompletados = candidato.procesos.reduce(
      (s, p) => s + p.documentos.filter((d) => d.estado === "completado").length,
      0,
    );
    return { total, pasados, enProceso, docsTotal, docsCompletados, pct: Math.round((docsCompletados / docsTotal) * 100) };
  };

  /* ----- Loading ----- */
  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-12 h-12 text-slate-400 animate-spin" />
        <p className="text-sm text-slate-500 animate-pulse">Cargando archivador de candidatos...</p>
      </div>
    );
  }

  /* ----- Vacío ----- */
  if (candidatos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 animate-rb-fade-up">
        <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Users className="w-12 h-12 text-slate-300" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">Sin candidatos cargados</h3>
          <p className="text-sm text-slate-400 mt-1">
            Sube hojas de vida en <strong>Gestión → TH-03</strong> para ver el historial aquí
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={cargarCandidatos}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Recargar
        </Button>
      </div>
    );
  }

  /* ----- Render ----- */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Archivador de Candidatos</h2>
            <p className="text-xs text-white/70">
              {candidatos.length} candidato(s) · Historial completo del proceso
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={cargarCandidatos} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Actualizar
        </Button>
      </div>

      {/* Tarjetas de candidatos */}
      <div className="space-y-3">
        {candidatos.map((cand, idx) => {
          const prog = getProgreso(cand);
          const isOpen = expandido === cand.id;
          return (
            <div
              key={cand.id}
              className={cn(
                "rounded-xl overflow-hidden border-2 transition-all duration-300 animate-rb-fade-up",
                isOpen ? "shadow-xl" : "shadow-sm hover:shadow-md",
              )}
              style={{
                borderColor: isOpen ? "#2C3E50" : "#E2E8F0",
                animationDelay: `${idx * 100}ms`,
              }}
            >
              {/* Cabecera del candidato */}
              <button
                onClick={() => toggleExpandido(cand.id)}
                className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {cand.foto ? (
                    <img src={cand.foto} alt={cand.nombre} className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-slate-200">
                      {cand.nombre.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                  )}
                  {/* Indicador de score */}
                  <div
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center text-white ring-2 ring-white"
                    style={{
                      background: cand.score >= 85 ? "#16A34A" : cand.score >= 70 ? "#D97706" : "#DC2626",
                    }}
                  >
                    {cand.score > 0 ? cand.score : "—"}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{cand.nombre}</span>
                    {cand.score >= 85 && (
                      <Badge className="bg-green-100 text-green-700 border-green-300 text-[9px]">
                        <Award className="w-2.5 h-2.5 mr-0.5" /> Seleccionado
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{cand.cargo}</div>

                  {/* Barra de progreso */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${prog.pct}%`,
                          background: "linear-gradient(90deg, #92D050, #4F8C28)",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 tabular-nums">{prog.docsCompletados}/{prog.docsTotal}</span>
                  </div>
                </div>

                {/* Estados rápidos */}
                <div className="hidden sm:flex items-center gap-1">
                  {cand.procesos.slice(0, 7).map((proc) => {
                    const cfg = getEstadoConfig(proc.estado);
                    return (
                      <div
                        key={proc.id}
                        className="w-6 h-6 rounded-md flex items-center justify-center transition-transform hover:scale-125"
                        style={{ background: cfg.bg, color: cfg.color }}
                        title={`${proc.nombre}: ${cfg.label}`}
                      >
                        {cfg.icon}
                      </div>
                    );
                  })}
                </div>

                {/* Chevron */}
                <div className="shrink-0">
                  <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} />
                </div>
              </button>

              {/* Contenido expandido */}
              {isOpen && (
                <div className="border-t-2 border-slate-100 dark:border-slate-800 p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50 animate-rb-fade-up">
                  {cand.procesos.map((proc) => {
                    const cfg = getEstadoConfig(proc.estado);
                    const docsCompletados = proc.documentos.filter((d) => d.estado === "completado").length;
                    const docsTotal = proc.documentos.length;
                    return (
                      <div
                        key={proc.id}
                        className="rounded-lg border-l-4 p-3 bg-white dark:bg-slate-800 shadow-sm transition-all hover:shadow-md"
                        style={{ borderColor: proc.color }}
                      >
                        {/* Cabecera del proceso */}
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-7 h-7 rounded-md flex items-center justify-center text-white shrink-0"
                            style={{ background: proc.color }}
                          >
                            {cfg.icon}
                          </div>
                          <span className="text-sm font-bold" style={{ color: proc.color }}>
                            {proc.nombre}
                          </span>
                          <Badge
                            className="text-[9px] ml-auto"
                            style={{ background: cfg.bg, color: cfg.color }}
                          >
                            {cfg.label}
                          </Badge>
                          <span className="text-[10px] text-slate-400">
                            {docsCompletados}/{docsTotal} docs
                          </span>
                        </div>

                        {/* Documentos */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {proc.documentos.map((doc, di) => (
                            <div
                              key={`${doc.codigo}-${di}`}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-md border text-xs transition-all hover:scale-[1.02]",
                                doc.estado === "completado"
                                  ? "border-green-200 bg-green-50 dark:bg-green-900/20"
                                  : "border-slate-200 bg-slate-50 dark:bg-slate-800/50",
                              )}
                            >
                              {getTipoIcon(doc.tipo)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-[9px] font-bold text-slate-500">{doc.codigo}</span>
                                </div>
                                <div className="truncate text-slate-600 dark:text-slate-300">{doc.nombre}</div>
                              </div>
                              {doc.estado === "completado" ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Resumen */}
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                      <span className="font-bold text-green-700">{prog.pasados}</span>
                      <span className="text-slate-500">pasaron</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span className="font-bold text-amber-700">{prog.enProceso}</span>
                      <span className="text-slate-500">en proceso</span>
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-slate-500">Progreso total:</span>
                      <span className="font-bold" style={{ color: prog.pct >= 50 ? "#16A34A" : "#D97706" }}>
                        {prog.pct}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

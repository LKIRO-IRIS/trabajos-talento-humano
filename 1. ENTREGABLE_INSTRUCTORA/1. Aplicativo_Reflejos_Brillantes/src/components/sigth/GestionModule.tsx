"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  TrendingUp,
  HeartHandshake,
  FileText,
  Menu,
  X,
  Building2,
  ChevronDown,
  ChevronRight,
  Archive,
  FolderOpen,
  Folder,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  DoorOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getCompanyTheme,
  loadAnalyzedHVs,
  type CompanyId,
  type PersistedHv,
} from "@/lib/analysis";
import {
  FORMAT_CATALOG,
  FORMAT_CATEGORIES,
  FORMAT_LS_PREFIX,
  type FormatId,
} from "@/components/sigth/gestion/formats-catalog";
import { Dashboard, useCronograma } from "@/components/sigth/gestion/Dashboard";
import { TH22Cronograma } from "@/components/sigth/gestion/formats/TH22-Cronograma";
import { TH01Requisicion } from "@/components/sigth/gestion/formats/TH01-Requisicion";
import { TH03HojaVida } from "@/components/sigth/gestion/formats/TH03-HojaVida";
import { TH04MatrizComparativa } from "@/components/sigth/gestion/formats/TH04-MatrizComparativa";
import { TH06Tracker } from "@/components/sigth/gestion/formats/TH06-Tracker";
import { TH07Entrevista } from "@/components/sigth/gestion/formats/TH07-Entrevista";
import { TH09ChequeoDocumentos } from "@/components/sigth/gestion/formats/TH09-ChequeoDocumentos";
import { TH11ChequeoInduccion } from "@/components/sigth/gestion/formats/TH11-ChequeoInduccion";
import { ContratoLaboral } from "@/components/sigth/gestion/formats/ContratoLaboral";
import { AfiliacionesSeguridadSocial } from "@/components/sigth/gestion/formats/AfiliacionesSeguridadSocial";
import { CartaRenuncia } from "@/components/sigth/gestion/formats/CartaRenuncia";
import { THMD01Convocatoria } from "@/components/sigth/gestion/formats/THMD01-Convocatoria";
import { THMD04ModeloContrato } from "@/components/sigth/gestion/formats/THMD04ModeloContrato";
import { GenericFormat } from "@/components/sigth/gestion/formats/GenericFormat";
import { FORMAT_CONFIGS } from "@/components/sigth/gestion/format-configs";
import { CRONOGRAMA_PROCESSES, CRONOGRAMA_ACTIVITIES } from "@/components/sigth/gestion/cronograma-data";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  UserCheck,
  TrendingUp,
  HeartHandshake,
  FileText,
  DoorOpen,
};

/** Process names mapped to TH categories for visual grouping */
const PROCESS_ACCORDION: {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  formats: FormatId[];
  processIdx?: number; // index in CRONOGRAMA_PROCESSES (for stats)
  defaultOpen?: boolean;
}[] = [
  {
    id: "tablero",
    name: "Tablero de Gestión",
    icon: <LayoutDashboard className="w-4 h-4" />,
    color: "#2C3E50",
    description: "KPIs globales del proceso de Talento Humano.",
    formats: ["TH-TB-01"],
    defaultOpen: false,
  },
  {
    id: "atraccion",
    name: "1 · Reclutamiento & Selección",
    icon: <Users className="w-4 h-4" />,
    color: "#6B1F2E",
    description: "Requisición, perfil, HV, matrices, verificación, entrevistas.",
    formats: ["TH-01", "TH-02", "TH-03", "TH-04", "TH-05", "TH-06", "TH-07"],
    processIdx: 0,
    defaultOpen: false,
  },
  {
    id: "contratacion",
    name: "2 · Contratación & Vinculación",
    icon: <UserCheck className="w-4 h-4" />,
    color: "#B8941F",
    description: "Documentos, contrato, EPP, dotación, inducción.",
    formats: ["TH-08", "TH-09", "TH-10", "TH-11", "TH-12", "TH-13", "TH-CONTRATO", "TH-AFILIACIONES"],
    processIdx: 2,
    defaultOpen: false,
  },
  {
    id: "desempeno",
    name: "3 · Desempeño & Capacitación",
    icon: <TrendingUp className="w-4 h-4" />,
    color: "#4F8C28",
    description: "Evaluación, mejoramiento, PAC, brechas, PID.",
    formats: ["TH-14", "TH-15", "TH-16", "TH-17", "TH-19", "TH-20"],
    processIdx: 4,
    defaultOpen: false,
  },
  {
    id: "estrategia",
    name: "4 · Estrategia & Bienestar",
    icon: <HeartHandshake className="w-4 h-4" />,
    color: "#FF9800",
    description: "Presupuesto anual, plan de bienestar, cronograma.",
    formats: ["TH-18", "TH-21", "TH-22"],
    processIdx: 7,
    defaultOpen: false,
  },
  {
    id: "modelos",
    name: "5 · Modelos de Documentos",
    icon: <FileText className="w-4 h-4" />,
    color: "#34495E",
    description: "Convocatorias, correos, informes, contratos, cartas, memorandos.",
    formats: ["TH-MD-01", "TH-MD-02", "TH-MD-03", "TH-MD-04", "TH-MD-05", "TH-MD-06", "TH-MD-07", "TH-MD-08", "TH-MD-09", "TH-MD-10"],
    defaultOpen: false,
  },
  {
    id: "retiro",
    name: "6 · Desvinculación & Retiro",
    icon: <DoorOpen className="w-4 h-4" />,
    color: "#7F8C8D",
    description: "Carta de renuncia, paz y salvo, desvinculación, fin de contrato.",
    formats: ["TH-RENUNCIA"],
    defaultOpen: false,
  },
];

const AUTOFILLED_FORMATS: FormatId[] = ["TH-03", "TH-04", "TH-06", "TH-09"];

export function GestionModule({
  company,
  injectedCronograma,
  injectedCandidates,
  onNavigate,
}: {
  company: CompanyId;
  /** Optional: cronograma rows preloaded from another tab (e.g. Tab 2 Subir HV). */
  injectedCronograma?: unknown;
  /** Optional: candidate data preloaded from Tab 2 to pre-fill TH-03/TH-04/TH-06. */
  injectedCandidates?: unknown;
  /** Future: hook for format-to-format navigation (e.g. TH-03 → TH-01). */
  onNavigate?: (formatId: FormatId) => void;
}) {
  const theme = getCompanyTheme(company);
  const [activeId, setActiveId] = React.useState<FormatId>("TH-03");
  const [sidebarOpen, setSidebarOpen] = React.useState(false); // mobile drawer
  const [cronogramaRows, setCronogramaRows] = useCronograma();
  const [openAccordions, setOpenAccordions] = React.useState<Record<string, boolean>>(
    () =>
      PROCESS_ACCORDION.reduce((acc, p) => {
        acc[p.id] = p.defaultOpen ?? false;
        return acc;
      }, {} as Record<string, boolean>),
  );

  // Acordeones cerrados por defecto — solo se abren cuando el usuario hace clic
  const prevActiveRef = React.useRef<FormatId>(activeId);
  React.useEffect(() => {
    if (activeId === prevActiveRef.current) return;
    prevActiveRef.current = activeId;
    // NO abrir automáticamente — todo cerrado hasta que el usuario haga clic
  }, [activeId]);

  /* ---- Track analyzed HVs (shared via localStorage) ---- */
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

  /* ---- Auto-fill downstream formats (TH-03, TH-04, TH-06, TH-09)
        whenever the analyzed HVs change. ---- */
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (analyzedHvs.length === 0) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const top = analyzedHvs[0];
      const uid = () => Math.random().toString(36).slice(2, 10);

      /* TH-03 — single HV object (top candidate) */
      const th03 = {
        nombresApellidos: top.analysis.nombre || "",
        tipoDocumento: "Cédula de ciudadanía",
        numeroDocumento: "",
        lugarExpedicion: "",
        fechaNacimiento: "",
        lugarNacimiento: top.analysis.ciudad || "",
        nacionalidad: "Colombiana",
        direccion: "",
        municipio: top.analysis.ciudad || "",
        telefono: top.analysis.telefono || "",
        correo: top.analysis.correo || "",
        estadoCivil: "",
        perfilProfesional: top.analysis.perfilProfesional || "",
        formacion: [
          {
            id: uid(),
            nivel: top.analysis.formacion || "",
            titulo: top.analysis.areaFormacion || "",
            institucion: "",
            fechaGrado: "",
            semestres: "",
          },
        ],
        experiencia: [
          {
            id: uid(),
            empresa: "",
            cargo: top.analysis.cargoAspira || "",
            telefono: "",
            fechaInicio: "",
            fechaFin: "",
            funciones: top.analysis.experiencia || "",
          },
        ],
        referencias: [
          { id: uid(), nombre: "", cargo: "", empresa: "", telefono: "", tipo: "Personal" },
        ],
      };
      window.localStorage.setItem(
        `${FORMAT_LS_PREFIX}TH-03`,
        JSON.stringify(th03),
      );

      /* TH-04 — Matriz Comparativa: rows for evaluated candidates */
      // 5 criteria × N candidates. Pre-fill only Formación académica (idx 0) and
      // Experiencia laboral (idx 1) based on the evaluation. Other criteria
      // remain 0 (pending manual scoring).
      const candidatos = analyzedHvs.map(
        (h) => h.analysis.nombre || `Candidato ${h.id.slice(0, 4)}`,
      );
      const scores = [0, 1].map((critIdx) =>
        analyzedHvs.map((h) => {
          if (critIdx === 0) return h.evaluation.cumpleFormacion ? 5 : 2;
          if (critIdx === 1) return h.evaluation.cumpleExperiencia ? 5 : 2;
          return 0;
        }),
      );
      // Pad remaining criteria (2,3,4) with zeros
      while (scores.length < 5) scores.push(analyzedHvs.map(() => 0));
      const th04 = {
        cargo: top.cargo || top.analysis.cargoAspira || "",
        fechaEvaluacion: today,
        candidatos,
        scores,
        observaciones:
          "Auto-llenado desde HVs analizadas con IA. Completa los puntajes de Prueba técnica, Entrevista y Aspiración salarial.",
      };
      window.localStorage.setItem(
        `${FORMAT_LS_PREFIX}TH-04`,
        JSON.stringify(th04),
      );

      /* TH-06 — Tracker: one row per analyzed candidate */
      const th06Rows = analyzedHvs.map((h) => ({
        id: uid(),
        fecha: (h.analyzedAt || "").slice(0, 10) || today,
        nombre: h.analysis.nombre || "",
        telefonoCorreo:
          [h.analysis.telefono, h.analysis.correo].filter(Boolean).join(" / ") ||
          "",
        cargoAspira: h.analysis.cargoAspira || h.cargo || "",
        etapa: "Recepción HV",
        estado:
          h.evaluation.estado === "ACTIVO" ? "En proceso" : "Descartado",
        observaciones: `Score IA: ${h.evaluation.score} · ${h.evaluation.decision}`,
      }));
      const th06 = {
        cargoBuscado: top.cargo || top.analysis.cargoAspira || "",
        rows: th06Rows,
      };
      window.localStorage.setItem(
        `${FORMAT_LS_PREFIX}TH-06`,
        JSON.stringify(th06),
      );

      /* TH-09 — Chequeo Documentos: top candidate + default checklist */
      const th09 = {
        nombresApellidos: top.analysis.nombre || "",
        documento: "",
        cargo: top.analysis.cargoAspira || top.cargo || "",
        fechaIngreso: "",
        documentos: [
          "Cédula de ciudadanía (copia)",
          "Certificado de estudios (título y actas)",
          "Certificado laboral (últimos 2 empleos)",
          "Certificado de pensiones / EPS",
          "Certificado de antecedentes disciplinarios (Procuraduría)",
          "Certificado de antecedentes judiciales (Policía Nacional)",
          "Referencias personales (mínimo 2)",
        ].map((nombre) => ({ nombre, recibido: false, observacion: "" })),
        observacionesGenerales:
          "Auto-llenado desde HV analizada. Verifica manualmente cada documento al recibirlo.",
        firmaGestor: { name: "", role: "Gestión Humana", signature: "" },
        firmaEmpleado: { name: top.analysis.nombre || "", role: "Empleado", signature: "" },
      };
      window.localStorage.setItem(
        `${FORMAT_LS_PREFIX}TH-09`,
        JSON.stringify(th09),
      );

      // Mark these formats as auto-filled so we can show the badge
      AUTOFILLED_FORMATS.forEach((fid) => {
        window.localStorage.setItem(
          `sigth-gestion-autofilled-${fid}`,
          "1",
        );
      });
      // Notify any listening components
      window.dispatchEvent(new CustomEvent("sigth-gestion-formats-autofilled"));
    } catch (err) {
      // Silent fail — auto-fill is best-effort
      console.warn("Auto-fill downstream formats failed:", err);
    }
  }, [analyzedHvs]);

  // Track which formats have been auto-filled (so the sidebar can show a badge)
  const [autoFilled, setAutoFilled] = React.useState<Set<string>>(new Set());
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () => {
      const next = new Set<string>();
      AUTOFILLED_FORMATS.forEach((fid) => {
        if (window.localStorage.getItem(`sigth-gestion-autofilled-${fid}`) === "1") {
          next.add(fid);
        }
      });
      setAutoFilled(next);
    };
    refresh();
    window.addEventListener("sigth-gestion-formats-autofilled", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("sigth-gestion-formats-autofilled", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Optional: when Tab 2 injects cronograma state, merge it in
  React.useEffect(() => {
    if (!injectedCronograma) return;
    try {
      const arr = injectedCronograma as { id: string; done?: boolean }[];
      if (Array.isArray(arr)) {
        setCronogramaRows((prev) =>
          prev.map((row) => {
            const inj = arr.find((r) => r.id === row.id);
            if (inj && typeof inj.done === "boolean") {
              return {
                ...row,
                done: inj.done,
                executedDate: inj.done ? new Date().toISOString().slice(0, 10) : row.executedDate,
              };
            }
            return row;
          }),
        );
      }
    } catch {}
  }, [injectedCronograma, setCronogramaRows]);

  // Scroll main area to top when activeId changes
  const mainRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeId]);

  const renderActiveFormat = () => {
    switch (activeId) {
      case "TH-TB-01":
        return (
          <Dashboard
            company={company}
            rows={cronogramaRows}
            onSelect={(pIdx) => {
              setActiveId("TH-22");
            }}
          />
        );
      case "TH-01":
        return <TH01Requisicion company={company} />;
      case "TH-03":
        return (
          <TH03HojaVida
            company={company}
            onNavigate={(id) => {
              setActiveId(id);
              onNavigate?.(id);
            }}
          />
        );
      case "TH-04":
        return <TH04MatrizComparativa company={company} />;
      case "TH-06":
        return <TH06Tracker company={company} />;
      case "TH-07":
        return <TH07Entrevista company={company} />;
      case "TH-09":
        return <TH09ChequeoDocumentos company={company} />;
      case "TH-11":
        return <TH11ChequeoInduccion company={company} />;
      case "TH-22":
        return <TH22Cronograma company={company} />;
      case "TH-MD-01":
        return <THMD01Convocatoria company={company} />;
      case "TH-MD-04":
        return <THMD04ModeloContrato company={company} />;
      case "TH-CONTRATO":
        return <ContratoLaboral />;
      case "TH-AFILIACIONES":
        return <AfiliacionesSeguridadSocial />;
      case "TH-RENUNCIA":
        return <CartaRenuncia />;
      default: {
        const cfg = FORMAT_CONFIGS[activeId];
        if (cfg) return <GenericFormat config={cfg} company={company} />;
        return (
          <div className="bg-card border border-border rounded-lg p-10 text-center">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground opacity-50" />
            <p className="mt-3 text-sm font-bold">{activeId}</p>
            <p className="text-xs text-muted-foreground">
              Este formato estará disponible próximamente.
            </p>
          </div>
        );
      }
    }
  };

  const activeEntry = FORMAT_CATALOG.find((e) => e.id === activeId);

  // Componente para minimizar/abrir el panel del formato
  function FormatPanelMinimizable({ activeId, activeEntry, children }: { activeId: string; activeEntry: any; children: React.ReactNode }) {
    const [minimizado, setMinimizado] = React.useState(false);

    return (
      <div className="space-y-2">
        {/* Barra de título con botón minimizar */}
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/40 border">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
              {activeId}
            </span>
            <span className="font-bold text-primary">{activeEntry?.name}</span>
          </div>
          <button
            onClick={() => setMinimizado(!minimizado)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold hover:bg-muted transition-colors"
            title={minimizado ? "Abrir panel" : "Minimizar panel"}
          >
            {minimizado ? (
              <><ChevronRight className="w-4 h-4" /> Abrir</>
            ) : (
              <><ChevronDown className="w-4 h-4" /> Minimizar</>
            )}
          </button>
        </div>
        {/* Contenido del formato */}
        {!minimizado && <div>{children}</div>}
      </div>
    );
  }

  const toggleAccordion = (id: string) => {
    setOpenAccordions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Count completed activities per process from cronograma
  const getProcessStats = (processIdx?: number) => {
    if (processIdx === undefined) return null;
    const activities = CRONOGRAMA_ACTIVITIES.filter((a) => a.process === processIdx);
    const completed = cronogramaRows.filter(
      (r) => activities.some((a) => a.id === r.id) && r.done,
    ).length;
    return { total: activities.length, completed };
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
      {/* ===== Sidebar ===== */}
      <aside
        className={cn(
          "rb-gestion-sidebar lg:sticky lg:top-2 lg:self-start lg:w-80 lg:max-h-[calc(100vh-1rem)] lg:overflow-y-auto shrink-0",
          "rounded-lg border shadow-sm bg-card text-card-foreground rb-chat-scroll",
        )}
        style={{ borderColor: "hsl(var(--border))" }}
      >
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-3 border-b">
          <span className="text-sm font-bold uppercase text-primary">
            Menú de formatos
          </span>
          <button onClick={() => setSidebarOpen(false)} className="p-1 rounded hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop header */}
        <div
          className="hidden lg:flex items-center gap-2 p-3 text-white sticky top-0 z-10"
          style={{ background: `linear-gradient(135deg, #${theme.dark}, #${theme.dark}cc)` }}
        >
          <Archive className="w-4 h-4" style={{ color: `#${theme.accent}` }} />
          <div className="flex-1">
            <div className="text-sm font-bold leading-tight" style={{ color: `#${theme.accent}` }}>
              Archivador de Procesos
            </div>
            <div className="text-[10px] opacity-80">
              {FORMAT_CATALOG.length} formatos · {PROCESS_ACCORDION.length} procesos
            </div>
          </div>
        </div>

        {/* Accordion of processes */}
        <nav className="p-2">
          {PROCESS_ACCORDION.map((proc) => {
            const isOpen = openAccordions[proc.id] ?? false;
            const stats = getProcessStats(proc.processIdx);
            const Icon = ICONS[proc.id] ?? FileText;
            const items = FORMAT_CATALOG.filter((e) =>
              proc.formats.includes(e.id),
            );
            const isAnyActive = items.some((e) => e.id === activeId);

            return (
              <Collapsible
                key={proc.id}
                open={isOpen}
                onOpenChange={(o) => setOpenAccordions((p) => ({ ...p, [proc.id]: o }))}
                className="mb-1.5 animate-rb-fade-up"
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-bold transition-all duration-300 text-left",
                      "hover:translate-x-1 hover:shadow-sm",
                    )}
                    style={{
                      background: isAnyActive
                        ? `linear-gradient(90deg, #${proc.color}25, #${proc.color}08)`
                        : `linear-gradient(90deg, #${proc.color}10, transparent)`,
                      borderLeft: `4px solid #${proc.color}`,
                    }}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center text-white shrink-0 transition-transform duration-300",
                        isOpen && "animate-pulse scale-110",
                      )}
                      style={{ background: `#${proc.color}` }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-primary">
                        {proc.name}
                      </div>
                      {stats && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${(stats.completed / stats.total) * 100}%`,
                                background: `#${proc.color}`,
                              }}
                            />
                          </div>
                          <span className="text-[9px] text-muted-foreground tabular-nums">
                            {stats.completed}/{stats.total}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 transition-transform duration-300 shrink-0",
                        isOpen && "rotate-180",
                      )}
                      style={{ color: `#${proc.color}` }}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div
                    className="mt-1 pl-2 border-l-2 ml-3 transition-all duration-300"
                    style={{ borderColor: `#${proc.color}33` }}
                  >
                    <p className="text-[10px] text-muted-foreground px-2 py-1 italic">
                      {proc.description}
                    </p>
                    <ul className="space-y-0.5 pb-1">
                      {items.map((e) => {
                        const isActive = e.id === activeId;
                        const isAutoFilled = autoFilled.has(e.id);
                        return (
                          <li key={e.id}>
                            <button
                              onClick={() => {
                                setActiveId(e.id);
                                setSidebarOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-all duration-300",
                                isActive
                                  ? "font-bold shadow-sm ring-1 ring-offset-0"
                                  : "hover:bg-muted hover:translate-x-0.5",
                              )}
                              style={
                                isActive
                                  ? {
                                      background: `#${theme.primary}`,
                                      color: "#fff",
                                      // Subtle shimmer/glow on active card
                                      boxShadow: `0 0 0 1px #${theme.accent}66, 0 4px 12px -2px #${theme.primary}55`,
                                    }
                                  : undefined
                              }
                              title={`${e.id}: ${e.name}`}
                            >
                              <span
                                className={cn(
                                  "text-[9px] font-mono px-1 py-0.5 rounded shrink-0",
                                  isActive
                                    ? "bg-white/20 text-white"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                {e.id}
                              </span>
                              <span className="truncate flex-1">{e.name}</span>
                              {isAutoFilled && (
                                <span
                                  className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1 py-0.5 rounded-full shrink-0"
                                  style={{
                                    background: "#16A34A",
                                    color: "#fff",
                                  }}
                                  title="Auto-llenado desde HV analizada"
                                >
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span className="hidden xl:inline">Auto</span>
                                </span>
                              )}
                              {isActive && (
                                <ChevronRight className="w-3 h-3 shrink-0" />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </nav>

        {/* Footer summary */}
        <div className="p-3 border-t" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="text-[10px] text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {(() => {
                try {
                  if (typeof window !== "undefined") {
                    const cfg = window.localStorage.getItem("sigth-empresa-config");
                    if (cfg) {
                      const parsed = JSON.parse(cfg);
                      if (parsed.name) return parsed.name;
                    }
                  }
                } catch {}
                return theme.name;
              })()}
            </span>
            <Badge
              variant="outline"
              className="text-[9px]"
              style={{
                borderColor: `#${theme.accent}66`,
                color: `#${theme.accent}`,
              }}
            >
              {FORMAT_CATALOG.length} formatos
            </Badge>
          </div>
        </div>
      </aside>

      {/* ===== Main content ===== */}
      <main className="flex-1 min-w-0 space-y-3" ref={mainRef}>
        {/* Breadcrumb / mobile menu toggle */}
        <div className="rb-no-print flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-md border border-border hover:bg-muted"
              aria-label="Abrir menú"
            >
              <Menu className="w-4 h-4" />
            </button>
            <FolderOpen className="w-4 h-4" style={{ color: `#${theme.accent}` }} />
            <span className="text-muted-foreground">Gestión /</span>
            <span className="font-bold text-primary">
              {activeEntry?.id} — {activeEntry?.name}
            </span>
            {analyzedHvs.length > 0 && (
              <span
                className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "#16A34A", color: "#fff" }}
                title={`${analyzedHvs.length} hoja(s) de vida analizada(s) disponibles`}
              >
                <Sparkles className="w-2.5 h-2.5" />
                {analyzedHvs.length} HV(s) analizada(s)
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Building2 className="w-3.5 h-3.5" />
            <span>{(() => {
              try {
                if (typeof window !== "undefined") {
                  const cfg = window.localStorage.getItem("sigth-empresa-config");
                  if (cfg) {
                    const parsed = JSON.parse(cfg);
                    if (parsed.name) return parsed.name;
                  }
                }
              } catch {}
              return theme.name;
            })()}</span>
          </div>
        </div>

        {/* Active format content — con opción de minimizar/abrir */}
        <FormatPanelMinimizable activeId={activeId} activeEntry={activeEntry}>
          {renderActiveFormat()}
        </FormatPanelMinimizable>
      </main>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 w-80 max-w-[85vw] bg-card border-r shadow-xl overflow-y-auto rb-chat-scroll">
            <div className="flex flex-col">
              <div className="flex items-center justify-between p-3 border-b sticky top-0 bg-card z-10">
                <span className="text-sm font-bold uppercase text-primary">
                  Menú de formatos
                </span>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="p-2">
                {PROCESS_ACCORDION.map((proc) => {
                  const isOpen = openAccordions[proc.id] ?? false;
                  const Icon = ICONS[proc.id] ?? FileText;
                  const items = FORMAT_CATALOG.filter((e) =>
                    proc.formats.includes(e.id),
                  );
                  const isAnyActive = items.some((e) => e.id === activeId);
                  return (
                    <Collapsible
                      key={proc.id}
                      open={isOpen}
                      onOpenChange={(o) => setOpenAccordions((p) => ({ ...p, [proc.id]: o }))}
                      className="mb-1.5"
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          className={cn(
                            "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-bold transition-all duration-300 text-left hover:translate-x-1",
                          )}
                          style={{
                            background: isAnyActive
                              ? `linear-gradient(90deg, #${proc.color}25, #${proc.color}08)`
                              : `linear-gradient(90deg, #${proc.color}10, transparent)`,
                            borderLeft: `4px solid #${proc.color}`,
                          }}
                        >
                          <div
                            className={cn(
                              "w-7 h-7 rounded-md flex items-center justify-center text-white shrink-0 transition-transform duration-300",
                              isOpen && "animate-pulse scale-110",
                            )}
                            style={{ background: `#${proc.color}` }}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span
                            className="truncate flex-1 text-primary"
                          >
                            {proc.name}
                          </span>
                          <ChevronDown
                            className={cn(
                              "w-3.5 h-3.5 transition-transform duration-300",
                              isOpen && "rotate-180",
                            )}
                            style={{ color: `#${proc.color}` }}
                          />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <ul
                          className="space-y-0.5 mt-1 pl-2 border-l-2 ml-3"
                          style={{ borderColor: `#${proc.color}33` }}
                        >
                          {items.map((e) => {
                            const isActive = e.id === activeId;
                            const isAutoFilled = autoFilled.has(e.id);
                            return (
                              <li key={e.id}>
                                <button
                                  onClick={() => {
                                    setActiveId(e.id);
                                    setSidebarOpen(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors",
                                    isActive
                                      ? "font-bold shadow-sm"
                                      : "hover:bg-muted",
                                  )}
                                  style={
                                    isActive
                                      ? { background: `#${theme.primary}`, color: "#fff" }
                                      : undefined
                                  }
                                >
                                  <span
                                    className={cn(
                                      "text-[9px] font-mono px-1 py-0.5 rounded shrink-0",
                                      isActive
                                        ? "bg-white/20 text-white"
                                        : "bg-muted text-muted-foreground",
                                    )}
                                  >
                                    {e.id}
                                  </span>
                                  <span className="truncate flex-1">{e.name}</span>
                                  {isAutoFilled && (
                                    <span
                                      className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1 py-0.5 rounded-full shrink-0"
                                      style={{ background: "#16A34A", color: "#fff" }}
                                      title="Auto-llenado desde HV analizada"
                                    >
                                      <CheckCircle2 className="w-2.5 h-2.5" />
                                    </span>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

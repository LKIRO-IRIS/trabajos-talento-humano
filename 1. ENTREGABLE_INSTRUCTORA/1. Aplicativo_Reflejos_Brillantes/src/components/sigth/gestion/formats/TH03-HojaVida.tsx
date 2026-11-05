"use client";

import * as React from "react";
import {
  FileText,
  Sparkles,
  UploadCloud,
  Users,
  Archive,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertTriangle,
  ClipboardList,
  Bot,
  Trophy,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Briefcase,
  Star,
  X,
  Plus,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  saveAnalyzedHVs,
  clearAnalyzedHVs,
  evaluateCandidate,
  uid,
  type CompanyId,
  type PersistedHv,
  type HVAnalysisResult,
  type ConfigState,
  type FormacionNivel,
  FORMACION_OPTIONS,
} from "@/lib/analysis";
import {
  FormatShell,
  SectionTitle,
} from "@/components/sigth/gestion/FormatShell";
import { ResumeBuilder } from "@/components/sigth/ResumeBuilder";
import { AnalysisModule } from "@/components/sigth/AnalysisModule";
import type { FormatId } from "@/components/sigth/gestion/formats-catalog";
import type { TH01Data } from "@/components/sigth/gestion/formats/TH01-Requisicion";

/* ------------------------------------------------------------------ */
/*  TH-03 shape — kept for the AI generator response & import/export.   */
/* ------------------------------------------------------------------ */

interface FormacionRow {
  id: string;
  nivel: string;
  titulo: string;
  institucion: string;
  fechaGrado: string;
  semestres: string;
}
interface ExperienciaRow {
  id: string;
  empresa: string;
  cargo: string;
  telefono: string;
  fechaInicio: string;
  fechaFin: string;
  funciones: string;
}
interface ReferenciaRow {
  id: string;
  nombre: string;
  cargo: string;
  empresa: string;
  telefono: string;
  tipo: string;
}

export interface TH03Data {
  nombresApellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  lugarExpedicion: string;
  fechaNacimiento: string;
  lugarNacimiento: string;
  nacionalidad: string;
  direccion: string;
  municipio: string;
  telefono: string;
  correo: string;
  estadoCivil: string;
  perfilProfesional: string;
  formacion: FormacionRow[];
  experiencia: ExperienciaRow[];
  referencias: ReferenciaRow[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type HvMode = "crear" | "ia" | "subir" | null;

interface AiForm {
  nombre: string;
  cargo: string;
  nivelFormacion: FormacionNivel;
  aniosExperiencia: number;
  ciudad: string;
  habilidadesClave: string;
}

const EMPTY_AI_FORM: AiForm = {
  nombre: "",
  cargo: "",
  nivelFormacion: "Profesional",
  aniosExperiencia: 3,
  ciudad: "Bogotá",
  habilidadesClave: "",
};

function initials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?";
}

function parseHabilidades(raw: string): string[] {
  return raw
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function deriveAreaFromCargo(cargo: string): string {
  const c = (cargo || "").toLowerCase();
  if (c.includes("produccion") || c.includes("jefe")) return "Ingeniería Industrial";
  if (c.includes("logistic") || c.includes("bodega")) return "Logística";
  if (c.includes("vent") || c.includes("comercial")) return "Comercio";
  if (c.includes("talento") || c.includes("humana")) return "Talento Humano";
  if (c.includes("contador") || c.includes("contabl")) return "Contaduría";
  if (c.includes("event") || c.includes("planner")) return "Eventos";
  if (c.includes("market") || c.includes("mercadeo")) return "Mercadeo";
  return "Administración";
}

function estadoColor(estado: string, decision: string): {
  bg: string;
  fg: string;
  label: string;
} {
  const d = (decision || "").toUpperCase();
  const e = (estado || "").toUpperCase();
  if (d === "SELECCIONADO")
    return { bg: "#16A34A", fg: "#fff", label: "SELECCIONADO" };
  if (d === "BANCO DE TALENTO")
    return { bg: "#0EA5E9", fg: "#fff", label: "BANCO DE TALENTO" };
  if (e === "ACTIVO") return { bg: "#16A34A", fg: "#fff", label: "ACTIVO" };
  return { bg: "#B91C1C", fg: "#fff", label: "DESCARTADO" };
}

function scoreColor(score: number): string {
  if (score >= 25) return "#16A34A";
  if (score >= 20) return "#0EA5E9";
  if (score >= 15) return "#F59E0B";
  return "#B91C1C";
}

/**
 * Convert an AI-generated HV (TH03Data) into a PersistedHv so it shows up in
 * the unified list. Uses a synthetic evaluation that defaults to ACTIVO +
 * BANCO DE TALENTO (the candidate is "ready for selection").
 */
function aiHvToPersisted(
  generated: Partial<TH03Data>,
  form: AiForm,
  company: CompanyId,
): PersistedHv {
  const theme = getCompanyTheme(company);
  const nombre = generated.nombresApellidos || form.nombre || "Candidato IA";
  const analysis: HVAnalysisResult = {
    nombre,
    telefono: generated.telefono || "",
    correo: generated.correo || "",
    ciudad: generated.municipio || form.ciudad || "",
    formacion: form.nivelFormacion || "Profesional",
    areaFormacion: deriveAreaFromCargo(form.cargo),
    experiencia: String(form.aniosExperiencia || 3),
    cargoAspira: form.cargo || generated.experiencia?.[0]?.cargo || "",
    habilidades: parseHabilidades(form.habilidadesClave),
    perfilProfesional: generated.perfilProfesional || "",
    cumpleFormacion: true,
    cumpleExperiencia: true,
    perfilCompatible: true,
    motivoIncompatibilidad: "",
  };
  const config: ConfigState = {
    empresa: theme.name,
    cargo: form.cargo,
    company,
    formacionMinima: form.nivelFormacion || "Profesional",
    experienciaMinima: form.aniosExperiencia || 3,
    rolResponsable: "gerente",
    nombreGerente: "",
    nombreInstructor: "",
    nombreAprendiz: "",
    logoBase64: undefined,
    logoMime: undefined,
  };
  const evaluation = evaluateCandidate(analysis, config);
  return {
    id: `ai-${uid()}`,
    fileName: `HV_IA_${nombre.replace(/\s+/g, "_")}.json`,
    analysis,
    evaluation: {
      ...evaluation,
      estado: "ACTIVO",
      decision: "BANCO DE TALENTO",
    },
    previewUrl: "",
    analyzedAt: new Date().toISOString(),
    cargo: form.cargo,
  };
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

interface TH03Props {
  company: CompanyId;
  onNavigate?: (id: FormatId) => void;
}

export function TH03HojaVida({ company, onNavigate }: TH03Props) {
  const theme = getCompanyTheme(company);
  const accent = `#${theme.accent}`;
  const primary = `#${theme.primary}`;

  const [mode, setMode] = React.useState<HvMode>(null);
  const [hvs, setHvs] = React.useState<PersistedHv[]>([]);
  const [requisition, setRequisition] = React.useState<TH01Data | null>(null);
  const [requisitionDismissed, setRequisitionDismissed] = React.useState(false);

  // AI generator state
  const [aiForm, setAiForm] = React.useState<AiForm>(EMPTY_AI_FORM);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [aiPreview, setAiPreview] = React.useState<Partial<TH03Data> | null>(
    null,
  );

  // ResumeBuilder → AnalysisModule bridge
  const [injectedImage, setInjectedImage] = React.useState<{
    image: string;
    name: string;
  } | null>(null);

  // Expanded HV detail row
  const [expandedHvId, setExpandedHvId] = React.useState<string | null>(null);

  // Banco de Talentos filters
  const [bancoCargoFilter, setBancoCargoFilter] = React.useState("");
  const [bancoFormacionFilter, setBancoFormacionFilter] = React.useState("");

  /* ---- Load requisition + analyzed HVs ---- */
  const refresh = React.useCallback(() => {
    setHvs(loadAnalyzedHVs());
    try {
      const raw = window.localStorage.getItem("sigth-gestion-format-TH-01");
      if (raw) {
        const parsed = JSON.parse(raw) as TH01Data;
        if (parsed && parsed.cargoSolicitado) setRequisition(parsed);
        else setRequisition(null);
      } else {
        setRequisition(null);
      }
    } catch {
      setRequisition(null);
    }
  }, []);

  React.useEffect(() => {
    refresh();
    window.addEventListener("sigth-analyzed-hvs-changed", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("sigth-gestion-formats-autofilled", refresh);
    return () => {
      window.removeEventListener("sigth-analyzed-hvs-changed", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("sigth-gestion-formats-autofilled", refresh);
    };
  }, [refresh]);

  /* ---- Pre-fill AI form when requisition becomes available ---- */
  React.useEffect(() => {
    if (!requisition) return;
    setAiForm((f) => ({
      ...f,
      cargo: f.cargo || requisition.cargoSolicitado || "",
      ciudad: f.ciudad || requisition.lugarTrabajo || "Bogotá",
    }));
  }, [requisition]);

  /* ---- Derived lists ---- */
  const activos = hvs.filter(
    (h) => h.evaluation.estado === "ACTIVO" || h.evaluation.decision !== "DESCARTADO",
  );
  const descartados = hvs.filter(
    (h) =>
      h.evaluation.estado === "DESCARTADO" &&
      h.evaluation.decision === "DESCARTADO",
  );

  const bancoFiltered = descartados.filter((h) => {
    if (
      bancoCargoFilter &&
      !(h.cargo || h.analysis.cargoAspira || "")
        .toLowerCase()
        .includes(bancoCargoFilter.toLowerCase())
    )
      return false;
    if (
      bancoFormacionFilter &&
      !(h.analysis.formacion || "")
        .toLowerCase()
        .includes(bancoFormacionFilter.toLowerCase())
    )
      return false;
    return true;
  });

  /* ---- Actions ---- */
  const handleGenerateAI = async () => {
    if (!aiForm.nombre.trim() || !aiForm.cargo.trim()) {
      toast.error("Nombre y cargo son obligatorios para generar la HV.");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiPreview(null);
    try {
      const res = await fetch("/api/generate-hv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: aiForm.nombre,
          cargo: aiForm.cargo,
          nivelFormacion: aiForm.nivelFormacion,
          aniosExperiencia: aiForm.aniosExperiencia,
          ciudad: aiForm.ciudad,
          habilidadesClave: parseHabilidades(aiForm.habilidadesClave),
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as Partial<TH03Data>;
      setAiPreview(data);
      toast.success("Hoja de vida generada con IA. Revisa el preview.");
    } catch (err: any) {
      setAiError(err?.message || "Error al generar la HV con IA.");
      toast.error("No se pudo generar la HV con IA.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAIPreview = () => {
    if (!aiPreview) return;
    const persisted = aiHvToPersisted(aiPreview, aiForm, company);
    saveAnalyzedHVs([...loadAnalyzedHVs(), persisted]);
    setAiPreview(null);
    setAiForm(EMPTY_AI_FORM);
    toast.success(`HV de ${persisted.analysis.nombre} guardada en la lista unificada.`);
  };

  const handleReactivate = (id: string) => {
    const next = loadAnalyzedHVs().map((h) =>
      h.id === id
        ? {
            ...h,
            evaluation: {
              ...h.evaluation,
              estado: "ACTIVO" as const,
              decision: "BANCO DE TALENTO" as const,
            },
          }
        : h,
    );
    saveAnalyzedHVs(next);
    toast.success("Candidato reactivado. Ahora figura como BANCO DE TALENTO en la lista unificada.");
  };

  const handleDeleteHv = (id: string) => {
    if (!window.confirm("¿Eliminar esta hoja de vida de la lista unificada?")) return;
    saveAnalyzedHVs(loadAnalyzedHVs().filter((h) => h.id !== id));
    toast.success("HV eliminada de la lista.");
  };

  /* ---- FormatShell callbacks ---- */
  const handleReset = () => {
    setMode(null);
    setAiForm(EMPTY_AI_FORM);
    setAiPreview(null);
    setAiError(null);
    setInjectedImage(null);
  };

  /* ---- Auto-scroll to active panel on mode change ---- */
  const panelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (mode && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [mode]);

  /* ================================================================== */
  /*  Render                                                            */
  /* ================================================================== */

  return (
    <FormatShell
      formatId="TH-03"
      formatName="Hoja de Vida"
      company={company}
      onReset={handleReset}
      exportData={hvs}
      onImport={(imported) => {
        if (!Array.isArray(imported)) {
          toast.error("El JSON importado no es una lista de HVs válida.");
          return;
        }
        saveAnalyzedHVs(imported as PersistedHv[]);
        toast.success(`Lista unificada actualizada con ${(imported as unknown[]).length} HV(s).`);
      }}
    >
      {/* ===== Requisition banner ===== */}
      {requisition && !requisitionDismissed ? (
        <div
          className="mb-4 rounded-md border-l-4 px-3 py-2.5 flex items-center gap-3 flex-wrap"
          style={{
            background: `${primary}12`,
            borderLeftColor: primary,
          }}
        >
          <ClipboardList
            className="w-4 h-4 shrink-0"
            style={{ color: primary }}
          />
          <div className="flex-1 min-w-[220px] text-xs sm:text-sm">
            <span className="font-bold" style={{ color: primary }}>
              Requisición activa:
            </span>{" "}
            <span className="font-semibold">
              {requisition.cargoSolicitado || "(sin cargo)"}
            </span>{" "}
            ·{" "}
            <span className="opacity-80">
              {requisition.numVacantes || "1"} vacante(s)
            </span>
            {requisition.tipoContrato && (
              <>
                {" "}
                ·{" "}
                <span className="opacity-80">
                  {requisition.tipoContrato}
                </span>
              </>
            )}
            {requisition.lugarTrabajo && (
              <>
                {" "}
                ·{" "}
                <span className="opacity-80">{requisition.lugarTrabajo}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={() => onNavigate?.("TH-01")}
            >
              <Eye className="w-3 h-3 mr-1" /> Ver requisición
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={() => {
                if (
                  window.confirm(
                    "¿Crear una nueva requisición? Se reemplazará la actual en TH-01.",
                  )
                ) {
                  window.localStorage.removeItem("sigth-gestion-format-TH-01");
                  setRequisition(null);
                  onNavigate?.("TH-01");
                }
              }}
            >
              <Plus className="w-3 h-3 mr-1" /> Nueva requisición
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px]"
              onClick={() => setRequisitionDismissed(true)}
              title="Cerrar aviso de requisición"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="mb-4 rounded-md border-l-4 px-3 py-2.5 flex items-center gap-3 flex-wrap"
          style={{
            background: "#FEF3C7",
            borderLeftColor: "#F59E0B",
          }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
          <div className="flex-1 min-w-[220px] text-xs sm:text-sm text-amber-900">
            No hay una requisición activa. Crea una en{" "}
            <strong>TH-01</strong> para vincularla con este proceso de
            selección y pre-llenar el cargo.
          </div>
          <Button
            size="sm"
            className="h-7 text-[11px] bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => onNavigate?.("TH-01")}
          >
            <ClipboardList className="w-3 h-3 mr-1" /> Crear requisición en TH-01
          </Button>
        </div>
      )}

      {/* ===== 3 action cards ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <ActionCard
          active={mode === "crear"}
          onClick={() => setMode(mode === "crear" ? null : "crear")}
          icon={<FileText className="w-6 h-6" />}
          title="Crear Hoja de Vida"
          subtitle="Plantilla ATS guiada"
          emoji="✍️"
          accent={accent}
          primary={primary}
        />
        <ActionCard
          active={mode === "ia"}
          onClick={() => setMode(mode === "ia" ? null : "ia")}
          icon={<Sparkles className="w-6 h-6" />}
          title="Crear con IA"
          subtitle="Genera una HV completa"
          emoji="🤖"
          accent={accent}
          primary={primary}
        />
        <ActionCard
          active={mode === "subir"}
          onClick={() => setMode(mode === "subir" ? null : "subir")}
          icon={<UploadCloud className="w-6 h-6" />}
          title="Subir Hojas de Vida"
          subtitle="Word, PDF, fotos, Excel"
          emoji="📤"
          accent={accent}
          primary={primary}
        />
      </div>

      {/* ===== Active panel ===== */}
      <div ref={panelRef}>
        {mode === "crear" && (
          <Card className="border" style={{ borderColor: `${primary}33` }}>
            <CardHeader className="pb-2">
              <CardTitle
                className="text-sm flex items-center gap-2"
                style={{ color: primary }}
              >
                <FileText className="w-4 h-4" /> Crear Hoja de Vida (ATS)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Diligencia la plantilla ATS. Al finalizar, pulsa{" "}
                <strong>“Enviar al Análisis IA”</strong> dentro del constructor
                para añadir la HV a la lista unificada.
              </p>
              <div className="rounded-md border bg-background">
                <ResumeBuilder
                  onSendToAnalysis={(image, name) => {
                    setInjectedImage({ image, name });
                    setMode("subir");
                    toast.info(
                      "HV enviada al panel “Subir Hojas de Vida” para análisis IA.",
                    );
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {mode === "ia" && (
          <Card className="border" style={{ borderColor: `${primary}33` }}>
            <CardHeader className="pb-2">
              <CardTitle
                className="text-sm flex items-center gap-2"
                style={{ color: primary }}
              >
                <Sparkles className="w-4 h-4" /> Crear Hoja de Vida con IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Indica los parámetros del cargo y la IA generará una hoja de
                vida ficticia, realista y profesional, en español (Colombia).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">
                    Nombre completo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={aiForm.nombre}
                    onChange={(e) =>
                      setAiForm((f) => ({ ...f, nombre: e.target.value }))
                    }
                    placeholder="Ej: María José Pérez"
                    className="h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">
                    Cargo objetivo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={aiForm.cargo}
                    onChange={(e) =>
                      setAiForm((f) => ({ ...f, cargo: e.target.value }))
                    }
                    placeholder="Ej: Jefe de Producción"
                    className="h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">
                    Nivel de formación
                  </Label>
                  <Select
                    value={aiForm.nivelFormacion}
                    onValueChange={(v) =>
                      setAiForm((f) => ({
                        ...f,
                        nivelFormacion: v as FormacionNivel,
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMACION_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">
                    Años de experiencia
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={40}
                    value={aiForm.aniosExperiencia}
                    onChange={(e) =>
                      setAiForm((f) => ({
                        ...f,
                        aniosExperiencia: Number(e.target.value) || 0,
                      }))
                    }
                    className="h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Ciudad</Label>
                  <Input
                    value={aiForm.ciudad}
                    onChange={(e) =>
                      setAiForm((f) => ({ ...f, ciudad: e.target.value }))
                    }
                    placeholder="Bogotá, Medellín, Cali…"
                    className="h-9 mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">
                    Habilidades clave (separadas por coma)
                  </Label>
                  <Textarea
                    value={aiForm.habilidadesClave}
                    onChange={(e) =>
                      setAiForm((f) => ({
                        ...f,
                        habilidadesClave: e.target.value,
                      }))
                    }
                    placeholder="Ej: Liderazgo, Lean Manufacturing, Excel avanzado"
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={handleGenerateAI}
                  disabled={aiLoading}
                  className="h-9"
                  style={{ background: primary, color: "#fff" }}
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />{" "}
                      Generando…
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4 mr-1" /> Generar HV con IA
                    </>
                  )}
                </Button>
                {aiPreview && (
                  <Button
                    onClick={handleSaveAIPreview}
                    className="h-9"
                    style={{ background: accent, color: "#1B1B1B" }}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Guardar en lista unificada
                  </Button>
                )}
                {aiPreview && (
                  <Button
                    variant="ghost"
                    onClick={() => setAiPreview(null)}
                    className="h-9"
                  >
                    <X className="w-4 h-4 mr-1" /> Descartar
                  </Button>
                )}
              </div>

              {aiError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <strong>Error:</strong> {aiError}
                </div>
              )}

              {aiPreview && (
                <AiPreviewCard data={aiPreview} accent={accent} primary={primary} />
              )}
            </CardContent>
          </Card>
        )}

        {mode === "subir" && (
          <Card className="border" style={{ borderColor: `${primary}33` }}>
            <CardHeader className="pb-2">
              <CardTitle
                className="text-sm flex items-center gap-2"
                style={{ color: primary }}
              >
                <UploadCloud className="w-4 h-4" /> Subir Hojas de Vida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Sube HVs en{" "}
                <strong>Word (.docx), PDF, imágenes (fotos) o Excel</strong>. La
                IA las analizará y las añadirá a la lista unificada.{" "}
                {requisition && (
                  <>
                    Cargo pre-llenado desde TH-01:{" "}
                    <strong>{requisition.cargoSolicitado}</strong>.
                  </>
                )}
              </p>
              <div className="rounded-md border bg-background">
                <AnalysisModule
                  company={company}
                  mergePersistence
                  defaultCargo={requisition?.cargoSolicitado || ""}
                  injectedImage={injectedImage}
                  onInjectedConsumed={() => setInjectedImage(null)}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ===== Lista unificada de HVs procesadas ===== */}
      <SectionTitle accent={primary}>
        <Users className="w-4 h-4 mr-1.5 inline" />
        Lista unificada de HVs procesadas
        <Badge
          variant="outline"
          className="ml-2 bg-white/20 border-white/30 text-white"
        >
          {activos.length} activa(s) · {descartados.length} en banco
        </Badge>
      </SectionTitle>

      {hvs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
          <Users className="w-8 h-8 mx-auto opacity-30 mb-2" />
          <p className="text-sm">
            Aún no hay hojas de vida procesadas. Usa los botones de arriba para{" "}
            <strong>crear</strong>, <strong>generar con IA</strong> o{" "}
            <strong>subir</strong> HVs.
          </p>
        </div>
      ) : (
        <div className="space-y-2 pr-1">
          {activos.map((hv) => (
            <HvRow
              key={hv.id}
              hv={hv}
              expanded={expandedHvId === hv.id}
              onToggle={() =>
                setExpandedHvId(expandedHvId === hv.id ? null : hv.id)
              }
              onReactivate={hv.evaluation.estado === "DESCARTADO" ? handleReactivate : undefined}
              onDelete={handleDeleteHv}
              accent={accent}
            />
          ))}
        </div>
      )}

      {/* ===== Banco de Talentos (descartados reactivables) ===== */}
      <div className="mt-6">
        <SectionTitle accent="#B91C1C">
          <Archive className="w-4 h-4 mr-1.5 inline" />
          Banco de Talentos
          <Badge
            variant="outline"
            className="ml-2 bg-white/20 border-white/30 text-white"
          >
            {descartados.length} descartado(s)
          </Badge>
        </SectionTitle>

        {descartados.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">
            <Archive className="w-7 h-7 mx-auto opacity-30 mb-2" />
            <p className="text-xs">
              No hay candidatos descartados. Cuando una HV no cumpla los
              requisitos mínimos del cargo, aparecerá aquí con la opción de{" "}
              <strong>reactivarla</strong>.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              <Input
                placeholder="Filtrar por cargo…"
                value={bancoCargoFilter}
                onChange={(e) => setBancoCargoFilter(e.target.value)}
                className="h-8 text-xs"
              />
              <Input
                placeholder="Filtrar por formación…"
                value={bancoFormacionFilter}
                onChange={(e) => setBancoFormacionFilter(e.target.value)}
                className="h-8 text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setBancoCargoFilter("");
                  setBancoFormacionFilter("");
                }}
              >
                <X className="w-3 h-3 mr-1" /> Limpiar filtros
              </Button>
            </div>

            <div className="space-y-2 pr-1">
              {bancoFiltered.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Ningún candidato coincide con los filtros.
                </p>
              ) : (
                bancoFiltered.map((hv) => (
                  <HvRow
                    key={hv.id}
                    hv={hv}
                    expanded={expandedHvId === hv.id}
                    onToggle={() =>
                      setExpandedHvId(expandedHvId === hv.id ? null : hv.id)
                    }
                    onReactivate={handleReactivate}
                    onDelete={handleDeleteHv}
                    accent={accent}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      <div className="rb-no-print mt-6 text-[10px] text-muted-foreground italic">
        Las hojas de vida creadas, generadas con IA o subidas se almacenan
        localmente en el navegador y se comparten con los formatos TH-04, TH-06
        y TH-09 para auto-llenado. Tratamiento de datos conforme a la Ley 1581
        de 2012 (Habeas Data).
      </div>
    </FormatShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ActionCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
  emoji,
  accent,
  primary,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  emoji: string;
  accent: string;
  primary: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative text-left rounded-lg border-2 p-4 transition-all duration-300 overflow-hidden",
        "hover:shadow-lg hover:-translate-y-0.5",
        active ? "ring-2 ring-offset-2" : "bg-card hover:bg-muted/40",
      )}
      style={{
        borderColor: active ? accent : `${primary}33`,
        background: active
          ? `linear-gradient(135deg, ${primary}10, ${accent}10)`
          : undefined,
        // @ts-expect-error CSS var for ring colour
        "--tw-ring-color": accent,
      }}
    >
      <div
        className="absolute top-0 right-0 text-3xl opacity-15 group-hover:opacity-30 transition-opacity"
        aria-hidden
      >
        {emoji}
      </div>
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-md flex items-center justify-center text-white shrink-0 transition-transform group-hover:scale-110"
          style={{ background: primary }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div
            className="text-sm font-bold leading-tight"
            style={{ color: primary }}
          >
            {title}
          </div>
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
      </div>
      {active && (
        <div className="mt-3 text-[11px] font-semibold flex items-center gap-1" style={{ color: accent }}>
          <Eye className="w-3 h-3" /> Panel abierto
        </div>
      )}
    </button>
  );
}

function HvRow({
  hv,
  expanded,
  onToggle,
  onReactivate,
  onDelete,
  accent,
}: {
  hv: PersistedHv;
  expanded: boolean;
  onToggle: () => void;
  onReactivate?: (id: string) => void;
  onDelete: (id: string) => void;
  accent: string;
}) {
  const { analysis, evaluation } = hv;
  const estado = estadoColor(evaluation.estado, evaluation.decision);
  const isDescartado = evaluation.estado === "DESCARTADO" && evaluation.decision === "DESCARTADO";
  const score = evaluation.score ?? 0;

  return (
    <div
      className="rounded-md border bg-card hover:shadow-sm transition-shadow"
      style={{ borderColor: `${accent}22` }}
    >
      <div className="flex items-center gap-3 p-2.5">
        {/* Avatar / photo */}
        <div className="shrink-0">
          {hv.previewUrl ? (
            <img
              src={hv.previewUrl}
              alt={analysis.nombre}
              className="w-10 h-10 rounded-full object-cover border"
              style={{ borderColor: `${accent}33` }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}aa)` }}
            >
              {initials(analysis.nombre)}
            </div>
          )}
        </div>

        {/* Name + cargo */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate flex items-center gap-1.5">
            {analysis.nombre || "Candidato"}
            {evaluation.decision === "SELECCIONADO" && (
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
            )}
          </div>
          <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
            <Briefcase className="w-3 h-3" />
            {hv.cargo || analysis.cargoAspira || "(cargo no especificado)"}
          </div>
        </div>

        {/* Score */}
        <div className="text-center shrink-0">
          <div
            className="text-xs font-bold tabular-nums px-1.5 py-0.5 rounded"
            style={{
              color: scoreColor(score),
              background: `${scoreColor(score)}15`,
            }}
            title="Puntaje de compatibilidad"
          >
            {score}
          </div>
          <div className="text-[8px] text-muted-foreground uppercase tracking-wider">
            score
          </div>
        </div>

        {/* Estado badge */}
        <Badge
          className="shrink-0 text-[10px]"
          style={{ background: estado.bg, color: estado.fg }}
        >
          {estado.label}
        </Badge>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isDescartado && onReactivate && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] px-2"
              onClick={() => onReactivate(hv.id)}
              title="Reactivar candidato"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Reactivar
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] px-2 text-destructive hover:text-destructive"
            onClick={() => onDelete(hv.id)}
            title="Eliminar HV"
          >
            <X className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={onToggle}
            title={expanded ? "Ocultar detalle" : "Ver detalle"}
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-3 py-2.5 bg-muted/20 text-xs space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
            <DetailRow
              icon={<Phone className="w-3 h-3" />}
              label="Teléfono"
              value={analysis.telefono}
            />
            <DetailRow
              icon={<Mail className="w-3 h-3" />}
              label="Correo"
              value={analysis.correo}
            />
            <DetailRow
              icon={<MapPin className="w-3 h-3" />}
              label="Ciudad"
              value={analysis.ciudad}
            />
            <DetailRow
              icon={<GraduationCap className="w-3 h-3" />}
              label="Formación"
              value={analysis.formacion}
            />
            <DetailRow
              icon={<Briefcase className="w-3 h-3" />}
              label="Cargo aspira"
              value={analysis.cargoAspira}
            />
            <DetailRow
              icon={<Star className="w-3 h-3" />}
              label="Experiencia"
              value={`${analysis.experiencia} año(s)`}
            />
          </div>

          {analysis.perfilProfesional && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                Perfil profesional
              </div>
              <p className="text-[11px] leading-relaxed">
                {analysis.perfilProfesional}
              </p>
            </div>
          )}

          {analysis.habilidades && analysis.habilidades.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                Habilidades
              </div>
              <div className="flex flex-wrap gap-1">
                {analysis.habilidades.map((h, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ background: `${accent}15`, color: "#1B1B1B" }}
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <MiniStat
              label="Formación"
              ok={evaluation.cumpleFormacion}
            />
            <MiniStat
              label="Experiencia"
              ok={evaluation.cumpleExperiencia}
            />
            <MiniStat
              label="Área"
              ok={evaluation.areaCompatible}
            />
            <MiniStat
              label="Perfil"
              ok={evaluation.perfilCompatible}
            />
          </div>

          {evaluation.motivoIncompatibilidad && (
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              <strong>Nota:</strong> {evaluation.motivoIncompatibilidad}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        {label}:
      </span>
      <span className="font-semibold truncate">{value || "—"}</span>
    </div>
  );
}

function MiniStat({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={cn(
        "text-center px-1.5 py-1 rounded text-[10px] font-bold",
        ok ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50",
      )}
    >
      {ok ? "✓" : "✗"} {label}
    </div>
  );
}

function AiPreviewCard({
  data,
  accent,
  primary,
}: {
  data: Partial<TH03Data>;
  accent: string;
  primary: string;
}) {
  const [openExp, setOpenExp] = React.useState(true);
  const [openForm, setOpenForm] = React.useState(true);
  const [openRef, setOpenRef] = React.useState(true);

  return (
    <div
      className="rounded-md border bg-card p-3 mt-2"
      style={{ borderColor: `${primary}33` }}
    >
      <div
        className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"
        style={{ color: primary }}
      >
        <Sparkles className="w-3.5 h-3.5" style={{ color: accent }} />
        Preview de la HV generada
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
        <div>
          <span className="text-muted-foreground">Nombre:</span>{" "}
          <strong>{data.nombresApellidos || "—"}</strong>
        </div>
        <div>
          <span className="text-muted-foreground">Documento:</span>{" "}
          <strong>
            {data.tipoDocumento} {data.numeroDocumento}
          </strong>
        </div>
        <div>
          <span className="text-muted-foreground">Teléfono:</span>{" "}
          <strong>{data.telefono || "—"}</strong>
        </div>
        <div>
          <span className="text-muted-foreground">Correo:</span>{" "}
          <strong>{data.correo || "—"}</strong>
        </div>
        <div>
          <span className="text-muted-foreground">Ciudad:</span>{" "}
          <strong>{data.municipio || "—"}</strong>
        </div>
        <div>
          <span className="text-muted-foreground">Nacionalidad:</span>{" "}
          <strong>{data.nacionalidad || "—"}</strong>
        </div>
      </div>

      {data.perfilProfesional && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            Perfil profesional
          </div>
          <p className="text-[11px] leading-relaxed">
            {data.perfilProfesional}
          </p>
        </div>
      )}

      {data.formacion && data.formacion.length > 0 && (
        <Collapsible open={openForm} onOpenChange={setOpenForm} className="mb-2">
          <CollapsibleTrigger className="flex items-center gap-1 text-[11px] font-bold w-full" style={{ color: primary }}>
            {openForm ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Formación académica ({data.formacion.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-1">
            {data.formacion.map((f, i) => (
              <div key={f.id || i} className="text-[11px] pl-3 border-l-2" style={{ borderColor: `${accent}33` }}>
                <div><strong>{f.titulo}</strong> — {f.nivel}</div>
                <div className="text-muted-foreground">
                  {f.institucion} · {f.fechaGrado}
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {data.experiencia && data.experiencia.length > 0 && (
        <Collapsible open={openExp} onOpenChange={setOpenExp} className="mb-2">
          <CollapsibleTrigger className="flex items-center gap-1 text-[11px] font-bold w-full" style={{ color: primary }}>
            {openExp ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Experiencia laboral ({data.experiencia.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-1.5">
            {data.experiencia.map((e, i) => (
              <div key={e.id || i} className="text-[11px] pl-3 border-l-2" style={{ borderColor: `${accent}33` }}>
                <div>
                  <strong>{e.cargo}</strong> · {e.empresa}
                </div>
                <div className="text-muted-foreground">
                  {e.fechaInicio} → {e.fechaFin || "actualidad"}
                </div>
                {e.funciones && (
                  <div className="text-muted-foreground mt-0.5 whitespace-pre-line">
                    {e.funciones.split(/[;\n]/).filter(Boolean).map((fn, j) => `• ${fn.trim()}`).join("\n")}
                  </div>
                )}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {data.referencias && data.referencias.length > 0 && (
        <Collapsible open={openRef} onOpenChange={setOpenRef}>
          <CollapsibleTrigger className="flex items-center gap-1 text-[11px] font-bold w-full" style={{ color: primary }}>
            {openRef ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Referencias ({data.referencias.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-1">
            {data.referencias.map((r, i) => (
              <div key={r.id || i} className="text-[11px] pl-3 border-l-2" style={{ borderColor: `${accent}33` }}>
                <strong>{r.nombre}</strong> — {r.cargo} · {r.empresa} ({r.tipo})
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

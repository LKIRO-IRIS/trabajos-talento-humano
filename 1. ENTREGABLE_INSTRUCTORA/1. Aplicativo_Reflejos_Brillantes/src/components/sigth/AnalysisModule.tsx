"use client";

import * as React from "react";
import {
  Users,
  UserCheck,
  Sparkles,
  Trophy,
  Star,
  FileText,
  Download,
  UploadCloud,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  XCircle,
  X,
  Loader2,
  ChevronRight,
  MapPin,
  Mail,
  Phone,
  Target,
  ClipboardList,
  Layers,
  Image as ImageIcon,
  Trash2,
  RotateCcw,
  FileSpreadsheet,
  Eye,
  TrendingUp,
  AlertTriangle,
  PartyPopper,
  ArrowUpDown,
  Filter,
  ScanLine,
  ShieldCheck,
  Maximize2,
  Link as LinkIcon,
  Globe,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  type ConfigState,
  type EvaluatedCandidate,
  type FileStatus,
  type FormacionNivel,
  type HvSourceKind,
  type HVAnalysisResult,
  type Evaluation,
  type CompanyId,
  COMPANY_THEMES,
  getCompanyTheme,
  FORMACION_OPTIONS,
  CHECKLIST_CRITERIA,
  MINIMUM_SCORE,
  MAX_SCORE,
  uid,
  formatBytes,
  readFileAsDataURL,
  dataUrlToBase64,
  detectSourceKind,
  responsableLabel,
  evaluateCandidate,
  rasteriseToPng,
  pdfToImage,
  docxToImage,
  textToImage,
  analyseUrl,
  safeFileName,
  loadAnalyzedHVs,
  saveAnalyzedHVs,
  clearAnalyzedHVs,
  type PersistedHv,
} from "@/lib/analysis";

type SortOption = "score" | "name" | "estado";
type FilterOption = "todos" | "activos" | "descartados";

interface AnalysisModuleProps {
  /** Externally injected HV image (e.g. from "Enviar al Análisis IA" button in Tab 1). */
  injectedImage?: { image: string; name: string } | null;
  /** Notifies the parent that the injected image has been queued. */
  onInjectedConsumed?: () => void;
  /** Currently selected company (drives theme + branding on this module). */
  company?: CompanyId;
  /** Fired when the user changes the company from inside this module. */
  onCompanyChange?: (c: CompanyId) => void;
  /**
   * When true (used when embedding inside TH-03), the module MERGES analyzed
   * files with the existing persisted HV list (instead of overwriting). This
   * keeps AI-generated and previously-analyzed HVs visible when the user
   * navigates away and comes back.
   */
  mergePersistence?: boolean;
  /**
   * Pre-fill the cargo field (e.g. from an active TH-01 requisition). Only
   * applied once on mount; the user can edit freely afterwards.
   */
  defaultCargo?: string;
}

export function AnalysisModule({
  injectedImage,
  onInjectedConsumed,
  company = "reflejos_brillantes",
  onCompanyChange,
  mergePersistence = false,
  defaultCargo = "",
}: AnalysisModuleProps) {
  /* ---- Config ---- */
  const [config, setConfig] = React.useState<ConfigState>({
    empresa: COMPANY_THEMES[company].name,
    cargo: defaultCargo || "",
    company,
    formacionMinima: "Tecnólogo",
    experienciaMinima: 2,
    rolResponsable: "gerente",
    nombreGerente: "",
    nombreInstructor: "",
    nombreAprendiz: "",
    logoBase64: undefined,
    logoMime: undefined,
  });

  /* ---- Sync `company` from parent (header selector) ---- */
  React.useEffect(() => {
    setConfig((c) => ({
      ...c,
      company,
      // If the user hasn't typed a custom empresa yet, mirror the company name.
      empresa:
        c.empresa === "" ||
        Object.values(COMPANY_THEMES).some((t) => t.name === c.empresa)
          ? COMPANY_THEMES[company].name
          : c.empresa,
    }));
  }, [company]);

  /* ---- Pre-fill cargo from defaultCargo (only once, if user hasn't typed) ---- */
  React.useEffect(() => {
    if (!defaultCargo) return;
    setConfig((c) => (c.cargo ? c : { ...c, cargo: defaultCargo }));
  }, [defaultCargo]);

  const theme = getCompanyTheme(config.company);

  const setCompanyLocal = React.useCallback(
    (c: CompanyId) => {
      setConfig((prev) => ({
        ...prev,
        company: c,
        empresa: COMPANY_THEMES[c].name,
      }));
      onCompanyChange?.(c);
    },
    [onCompanyChange],
  );

  const [configured, setConfigured] = React.useState(false);

  /* ---- Files & analysis ---- */
  const [files, setFiles] = React.useState<FileStatus[]>([]);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [currentIdx, setCurrentIdx] = React.useState(-1);
  const [dragActive, setDragActive] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [showDashboard, setShowDashboard] = React.useState(false);
  const [sortOption, setSortOption] = React.useState<SortOption>("score");
  const [filterOption, setFilterOption] = React.useState<FilterOption>("todos");
  const [lightboxFile, setLightboxFile] = React.useState<FileStatus | null>(
    null,
  );

  const [uploadTab, setUploadTab] = React.useState<"file" | "url">("file");
  const [urlInput, setUrlInput] = React.useState("");
  const [urlLoading, setUrlLoading] = React.useState(false);
  const [convertingFiles, setConvertingFiles] = React.useState(false);
  const [generatingZip, setGeneratingZip] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement | null>(null);

  /* ---- derived data ---- */
  const analyzed = React.useMemo(
    () => files.filter((f) => f.status === "done" && f.analysis),
    [files],
  );
  const errored = React.useMemo(
    () => files.filter((f) => f.status === "error"),
    [files],
  );

  const evaluatedAll = React.useMemo<EvaluatedCandidate[]>(() => {
    const ranked = analyzed
      .map((f) => {
        const ev = evaluateCandidate(f.analysis!, config);
        return { file: f, evaluation: ev, rank: 0 };
      })
      .sort((a, b) => b.evaluation.score - a.evaluation.score)
      .map((e, i) => ({ ...e, rank: i + 1 }));

    const firstActivoIdx = ranked.findIndex(
      (e) => e.evaluation.estado === "ACTIVO",
    );
    if (firstActivoIdx >= 0) {
      ranked[firstActivoIdx] = {
        ...ranked[firstActivoIdx],
        evaluation: {
          ...ranked[firstActivoIdx].evaluation,
          decision: "SELECCIONADO",
        },
      };
    }
    return ranked;
  }, [analyzed, config]);

  const evaluated = React.useMemo<EvaluatedCandidate[]>(() => {
    let arr = evaluatedAll;
    if (filterOption === "activos")
      arr = arr.filter((e) => e.evaluation.estado === "ACTIVO");
    if (filterOption === "descartados")
      arr = arr.filter((e) => e.evaluation.estado === "DESCARTADO");
    if (sortOption === "name") {
      arr = [...arr].sort((a, b) =>
        (a.file.analysis?.nombre || "").localeCompare(
          b.file.analysis?.nombre || "",
        ),
      );
    } else if (sortOption === "estado") {
      arr = [...arr].sort((a, b) =>
        a.evaluation.estado === "ACTIVO" ? -1 : 1,
      );
    }
    return arr;
  }, [evaluatedAll, sortOption, filterOption]);

  const kpis = React.useMemo(() => {
    const total = analyzed.length;
    const cumplenFormacion = evaluatedAll.filter(
      (e) => e.evaluation.cumpleFormacion,
    ).length;
    const cumplenExperiencia = evaluatedAll.filter(
      (e) => e.evaluation.cumpleExperiencia,
    ).length;
    const activos = evaluatedAll.filter(
      (e) => e.evaluation.estado === "ACTIVO",
    ).length;
    const descartados = total - activos;
    return { total, cumplenFormacion, cumplenExperiencia, activos, descartados };
  }, [analyzed, evaluatedAll]);

  const topCandidate = evaluatedAll[0];

  /* ---- Persist analyzed HVs to localStorage (shared with FormatsModule & GestionModule) ---- */
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    // Only persist files that have a finished analysis
    const done = files.filter((f) => f.status === "done" && f.analysis);
    if (done.length === 0) {
      // When mergePersistence is enabled (TH-03 embedding), we never wipe the
      // persisted list — the user might have AI-generated HVs there that we
      // want to preserve across navigation.
      if (mergePersistence) return;
      // Don't blindly wipe the list — only clear if there are NO files at all
      // (i.e. user clicked "Limpiar"). When the user is mid-upload or just
      // removed one file, we keep the existing persisted list.
      if (files.length === 0) {
        const existing = loadAnalyzedHVs();
        if (existing.length > 0) saveAnalyzedHVs([]);
      }
      return;
    }
    const items: PersistedHv[] = done.map((f) => {
      const ev = evaluateCandidate(f.analysis!, config);
      return {
        id: f.id,
        fileName: f.fileName,
        analysis: f.analysis!,
        evaluation: ev,
        previewUrl: f.previewUrl || "",
        analyzedAt: new Date().toISOString(),
        cargo: config.cargo || "",
      };
    });

    if (mergePersistence) {
      // Merge with existing persisted HVs: replace entries with the same id,
      // preserve others (AI-generated HVs, HVs from other uploads, etc.).
      const existing = loadAnalyzedHVs();
      const merged = [
        ...existing.filter((e) => !items.some((i) => i.id === e.id)),
        ...items,
      ];
      saveAnalyzedHVs(merged);
    } else {
      // Avoid writing if nothing changed (deep compare by id+analyzedAt not
      // stable; just write every time).
      saveAnalyzedHVs(items);
    }
  }, [files, config, mergePersistence]);

  /* ---- Injected image (from Resume Builder Tab 1) ---- */
  React.useEffect(() => {
    if (!injectedImage) return;
    const id = uid();
    const entry: FileStatus = {
      id,
      fileName: `HV_Creada_${safeFileName(injectedImage.name)}.jpg`,
      fileSize: 0,
      previewUrl: injectedImage.image,
      mimeType: "image/jpeg",
      sourceKind: "image",
      status: "pending",
      progress: 0,
      fromBuilder: true,
    };
    setFiles((prev) => [...prev, entry]);
    onInjectedConsumed?.();
    toast.success(
      `Hoja de vida "${injectedImage.name}" enviada desde el Creador. Lista para analizar.`,
    );
  }, [injectedImage, onInjectedConsumed]);

  /* ---- Logo handling ---- */
  const handleLogoSelect = React.useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      const accepted = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
      if (!accepted.includes(file.type) && !file.type.startsWith("image/")) {
        toast.error("Formato no soportado. Usa PNG, JPG o SVG.");
        return;
      }
      try {
        if (file.type === "image/svg+xml") {
          const dataUrl = await readFileAsDataURL(file);
          const pngDataUrl = await rasteriseToPng(dataUrl, 480, 240);
          const base64 = dataUrlToBase64(pngDataUrl);
          setConfig((c) => ({ ...c, logoBase64: base64, logoMime: "image/png" }));
          toast.success("Logo SVG cargado y convertido a PNG.");
        } else {
          const dataUrl = await readFileAsDataURL(file);
          const base64 = dataUrlToBase64(dataUrl);
          const mime = file.type === "image/jpg" ? "image/jpeg" : file.type;
          setConfig((c) => ({ ...c, logoBase64: base64, logoMime: mime }));
          toast.success("Logo cargado correctamente.");
        }
      } catch (err: any) {
        toast.error(`No se pudo cargar el logo: ${err?.message || err}`);
      }
    },
    [],
  );

  const removeLogo = React.useCallback(() => {
    setConfig((c) => ({ ...c, logoBase64: undefined, logoMime: undefined }));
    if (logoInputRef.current) logoInputRef.current.value = "";
  }, []);

  /* ---- File handling ---- */
  const handleFiles = React.useCallback(
    async (incoming: FileList | File[]) => {
      const arr = Array.from(incoming).filter((f) => f.size > 0);
      if (arr.length === 0) {
        toast.error("No se recibieron archivos válidos.");
        return;
      }
      if (arr.length > 50) {
        toast.warning("Se aceptan máximo 50 archivos. Se procesarán los primeros 50.");
      }
      const slice = arr.slice(0, 50);
      const placeholderEntries: FileStatus[] = slice.map((f) => ({
        id: uid(),
        fileName: f.name,
        fileSize: f.size,
        previewUrl: "",
        mimeType: f.type || "application/octet-stream",
        sourceKind: detectSourceKind(f),
        status: "pending" as const,
        progress: 0,
      }));
      setFiles((prev) => [...prev, ...placeholderEntries]);
      toast.info(`${slice.length} archivo(s) añadido(s). Convirtiendo a imagen…`);

      setConvertingFiles(true);
      try {
        await Promise.all(
          slice.map(async (f, idx) => {
            const entry = placeholderEntries[idx];
            try {
              if (entry.sourceKind === "pdf") {
                const { previewUrl, fullImage } = await pdfToImage(f);
                setFiles((prev) =>
                  prev.map((x) =>
                    x.id === entry.id
                      ? { ...x, previewUrl: fullImage, mimeType: "image/jpeg" }
                      : x,
                  ),
                );
                void previewUrl;
              } else if (entry.sourceKind === "word") {
                const dataUrl = await docxToImage(f);
                setFiles((prev) =>
                  prev.map((x) =>
                    x.id === entry.id
                      ? { ...x, previewUrl: dataUrl, mimeType: "image/jpeg" }
                      : x,
                  ),
                );
              } else if (entry.sourceKind === "image") {
                const dataUrl = await readFileAsDataURL(f);
                const mime = f.type === "image/jpg" ? "image/jpeg" : f.type;
                setFiles((prev) =>
                  prev.map((x) =>
                    x.id === entry.id
                      ? { ...x, previewUrl: dataUrl, mimeType: mime || "image/jpeg" }
                      : x,
                  ),
                );
              } else if (entry.sourceKind === "excel") {
                // Excel files: build a placeholder image so the user can still
                // trigger the IA analysis via the same flow.
                const placeholder = textToImage(
                  `Hoja de vida en Excel\n${f.name}\n\nCargo: ${config.cargo || "(no especificado)"}\n\n[Análisis IA disponible]`,
                );
                setFiles((prev) =>
                  prev.map((x) =>
                    x.id === entry.id
                      ? { ...x, previewUrl: placeholder, mimeType: "image/jpeg" }
                      : x,
                  ),
                );
              } else {
                throw new Error(
                  `Formato no soportado: ${f.name}. Usa imagen, PDF, Word o Excel.`,
                );
              }
            } catch (err: any) {
              setFiles((prev) =>
                prev.map((x) =>
                  x.id === entry.id
                    ? {
                        ...x,
                        status: "error",
                        progress: 100,
                        error: err?.message || "No se pudo convertir el archivo.",
                      }
                    : x,
                ),
              );
            }
          }),
        );
      } finally {
        setConvertingFiles(false);
      }

      toast.success(`${slice.length} hoja(s) de vida lista(s) para analizar.`);
    },
    [config.cargo],
  );

  /* ---- URL submit ---- */
  const handleUrlSubmit = React.useCallback(async () => {
    const url = urlInput.trim();
    if (!url) {
      toast.error("Pega un enlace de hoja de vida para analizar.");
      return;
    }
    if (!config.cargo.trim()) {
      toast.error("Configura el cargo antes de analizar el enlace.");
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      toast.error("El enlace debe comenzar con http:// o https://");
      return;
    }
    setUrlLoading(true);
    const entryId = uid();
    setFiles((prev) => [
      ...prev,
      {
        id: entryId,
        fileName: url,
        fileSize: 0,
        previewUrl: "",
        mimeType: "url",
        sourceKind: "url",
        sourceUrl: url,
        status: "analyzing",
        progress: 30,
      },
    ]);
    try {
      const data = await analyseUrl(url, config.cargo);
      const placeholder = textToImage(
        `Hoja de vida online\n${url}\n\nNombre detectado: ${data.nombre}\nCargo: ${data.cargoAspira || "No especificado"}`,
      );
      setFiles((prev) =>
        prev.map((x) =>
          x.id === entryId
            ? { ...x, status: "done", progress: 100, analysis: data, previewUrl: placeholder }
            : x,
        ),
      );
      toast.success("Hoja de vida online analizada correctamente.");
    } catch (err: any) {
      setFiles((prev) =>
        prev.map((x) =>
          x.id === entryId
            ? {
                ...x,
                status: "error",
                progress: 100,
                error: err?.message || "No se pudo analizar el enlace.",
              }
            : x,
        ),
      );
      toast.error(`No se pudo analizar el enlace: ${err?.message || err}`);
    } finally {
      setUrlLoading(false);
      setUrlInput("");
    }
  }, [urlInput, config.cargo]);

  const onDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        void handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    const currentIds = new Set(files.map((f) => f.id));
    setFiles([]);
    setShowDashboard(false);
    setExpanded(new Set());
    if (mergePersistence) {
      // In merge mode, "Limpiar" only removes the HVs uploaded in this
      // session — AI-generated HVs (and HVs from previous sessions) stay
      // in the unified list.
      const remaining = loadAnalyzedHVs().filter((h) => !currentIds.has(h.id));
      saveAnalyzedHVs(remaining);
      toast.info(
        "Hojas de vida de este panel eliminadas. Las HV generadas con IA y otras permanecen en la lista unificada.",
      );
    } else {
      clearAnalyzedHVs();
      toast.info("Resultados limpiados. Puedes subir nuevas hojas de vida.");
    }
  };

  /* ---- analysis runner ---- */
  const analyzeAll = async () => {
    const pending = files.filter((f) => f.status === "pending" && f.previewUrl);
    if (pending.length === 0) {
      toast.info(
        "No hay archivos pendientes por analizar. Si estás convirtiendo PDF/Word, espera un momento.",
      );
      return;
    }
    if (!config.cargo.trim()) {
      toast.error("Configura el cargo antes de analizar.");
      return;
    }
    setConfigured(true);
    setIsAnalyzing(true);
    setShowDashboard(false);
    toast.info(`Analizando ${pending.length} hoja(s) de vida con IA visual…`);

    for (let i = 0; i < pending.length; i++) {
      const file = pending[i];
      setCurrentIdx(files.findIndex((f) => f.id === file.id));
      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, status: "analyzing", progress: 30 } : f,
        ),
      );

      try {
        const base64 = dataUrlToBase64(file.previewUrl);
        const res = await fetch("/api/analyze-hv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: file.mimeType,
            cargoRequerido: config.cargo,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || `HTTP ${res.status}`);
        }
        const data: HVAnalysisResult = await res.json();
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: "done", progress: 100, analysis: data }
              : f,
          ),
        );
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  status: "error",
                  progress: 100,
                  error: err?.message || "Error desconocido",
                }
              : f,
          ),
        );
      }
    }

    setIsAnalyzing(false);
    setCurrentIdx(-1);
    setShowDashboard(true);
    toast.success("Análisis completo. Revisa los resultados y descargas.");
  };

  const retryErrors = async () => {
    const errIds = errored.map((f) => f.id);
    if (errIds.length === 0) return;
    setFiles((prev) =>
      prev.map((f) =>
        errIds.includes(f.id)
          ? { ...f, status: "pending", progress: 0, error: undefined }
          : f,
      ),
    );
    setTimeout(() => {
      void analyzeAll();
    }, 100);
  };

  /* ---- AUTO-ANALYZE: when files are uploaded and the cargo is configured,
        automatically kick off the analysis (no need to click the button) ---- */
  const autoAnalyzedRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (isAnalyzing) return;
    if (!config.cargo.trim()) return;
    const readyPending = files.filter(
      (f) =>
        f.status === "pending" &&
        f.previewUrl &&
        !autoAnalyzedRef.current.has(f.id),
    );
    if (readyPending.length === 0) return;
    readyPending.forEach((f) => autoAnalyzedRef.current.add(f.id));
    // Small delay to let UI settle before kicking off heavy work.
    const t = setTimeout(() => {
      void analyzeAll();
    }, 300);
    return () => clearTimeout(t);
  }, [files, config.cargo, isAnalyzing]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ---- ZIP download ---- */
  const downloadZip = async () => {
    if (evaluatedAll.length === 0) {
      toast.error("No hay resultados para descargar.");
      return;
    }
    setGeneratingZip(true);
    toast.info("Generando documentos Word/Excel en el servidor…");
    try {
      const payload = evaluatedAll.map((e) => ({
        rank: e.rank,
        file: {
          fileName: e.file.fileName,
          mimeType: e.file.mimeType,
          analysis: e.file.analysis!,
        },
        evaluation: e.evaluation,
      }));
      const response = await fetch("/api/generate-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: payload,
          config: {
            empresa: config.empresa,
            cargo: config.cargo,
            company: config.company,
            formacionMinima: config.formacionMinima,
            experienciaMinima: config.experienciaMinima,
            rolResponsable: config.rolResponsable,
            nombreGerente: config.nombreGerente,
            nombreInstructor: config.nombreInstructor,
            nombreAprendiz: config.nombreAprendiz,
            logoBase64: config.logoBase64,
            logoMime: config.logoMime,
          },
        }),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error || `HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SIGTH_Reflejos_Brillantes_Resultados.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(
        `ZIP descargado: ${evaluatedAll.length} listas de chequeo Word + Excel + reporte ejecutivo Word.`,
      );
    } catch (err: any) {
      toast.error(`No se pudo generar el ZIP: ${err?.message || err}`);
    } finally {
      setGeneratingZip(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ---------------- CONFIG ---------------- */}
      <Card className="border-accent/40 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-secondary to-transparent dark:from-primary/80 dark:to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-accent flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-primary dark:text-white">
                Configuración del proceso
              </CardTitle>
              <CardDescription>
                Define el cargo y los requisitos mínimos para evaluar a los candidatos.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Company brand selector — drives theme + colours + logo on documents */}
          <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
            <Label>Empresa / Marca</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(COMPANY_THEMES) as CompanyId[]).map((id) => {
                const t = COMPANY_THEMES[id];
                const active = config.company === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCompanyLocal(id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all",
                      active
                        ? "border-accent bg-accent/10 shadow-sm"
                        : "border-border bg-card hover:border-accent/50",
                    )}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0 ring-2"
                      style={{
                        background: `linear-gradient(135deg, #${t.dark}, #${t.dark}dd)`,
                        color: `#${t.accent}`,
                        // @ts-expect-error CSS var consumed by Tailwind ring colour
                        "--tw-ring-color": `#${t.accent}99`,
                      }}
                    >
                      {t.logoText}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {t.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {t.tagline}
                      </div>
                    </div>
                    {active && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: `#${t.accent}`,
                          color: `#${t.dark}`,
                        }}
                      >
                        ✓ ACTIVO
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground pt-1">
              Cambiar la empresa aplica colores, logo y branding a todos los
              documentos generados (Word, Excel, ZIP).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="empresa">Nombre de la empresa</Label>
            <Input
              id="empresa"
              placeholder="Ej: Reflejos Brillantes S.A.S."
              value={config.empresa}
              onChange={(e) =>
                setConfig((c) => ({ ...c, empresa: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cargo">Cargo a cubrir *</Label>
            <Input
              id="cargo"
              placeholder="Ej: Auxiliar Logístico"
              value={config.cargo}
              onChange={(e) =>
                setConfig((c) => ({ ...c, cargo: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="formacionMinima">Formación mínima</Label>
            <Select
              value={config.formacionMinima}
              onValueChange={(v) =>
                setConfig((c) => ({ ...c, formacionMinima: v as FormacionNivel }))
              }
            >
              <SelectTrigger id="formacionMinima">
                <SelectValue placeholder="Selecciona…" />
              </SelectTrigger>
              <SelectContent>
                {FORMACION_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="experienciaMinima">Experiencia mínima (años)</Label>
            <Input
              id="experienciaMinima"
              type="number"
              min={0}
              max={30}
              value={config.experienciaMinima}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  experienciaMinima: Number(e.target.value) || 0,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rolResponsable">Firma responsable</Label>
            <Select
              value={config.rolResponsable}
              onValueChange={(v) =>
                setConfig((c) => ({
                  ...c,
                  rolResponsable: v as "gerente" | "instructor",
                }))
              }
            >
              <SelectTrigger id="rolResponsable">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gerente">Gerente de Talento Humano</SelectItem>
                <SelectItem value="instructor">Instructor SENA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="logo-upload">Logo de la empresa (opcional)</Label>
            <input
              ref={logoInputRef}
              id="logo-upload"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleLogoSelect(f);
                e.target.value = "";
              }}
            />
            <div className="flex items-center gap-2">
              {config.logoBase64 ? (
                <div className="flex items-center gap-2 flex-1 min-w-0 rounded-md border border-accent/40 bg-secondary dark:bg-primary/80 p-1.5">
                  <img
                    src={`data:${config.logoMime || "image/png"};base64,${config.logoBase64}`}
                    alt="Logo"
                    className="h-8 w-auto object-contain"
                  />
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    Logo cargado
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeLogo}
                    className="h-7 px-2 text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  className="border-accent text-primary hover:bg-secondary dark:text-white dark:hover:bg-primary/80"
                >
                  <ImageIcon className="w-3.5 h-3.5 mr-1" /> Subir logo
                </Button>
              )}
            </div>
          </div>

          {config.rolResponsable === "gerente" ? (
            <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
              <Label htmlFor="nombreGerente">Nombre del gerente</Label>
              <Input
                id="nombreGerente"
                placeholder="Ej: Nombre Apellido"
                value={config.nombreGerente}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, nombreGerente: e.target.value }))
                }
              />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="nombreInstructor">Nombre del instructor</Label>
                <Input
                  id="nombreInstructor"
                  value={config.nombreInstructor}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, nombreInstructor: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nombreAprendiz">Nombre del aprendiz</Label>
                <Input
                  id="nombreAprendiz"
                  value={config.nombreAprendiz}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, nombreAprendiz: e.target.value }))
                  }
                />
              </div>
            </>
          )}
          <div className="md:col-span-2 lg:col-span-3 text-xs text-muted-foreground border-t border-border pt-2">
            Responsable actual: <strong>{responsableLabel(config)}</strong>
          </div>
        </CardContent>
      </Card>

      {/* ---------------- UPLOAD ---------------- */}
      <Card className="border-accent/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-primary dark:text-white flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-accent" />
            Subir hojas de vida
          </CardTitle>
          <CardDescription>
            Imágenes (PNG/JPG), PDF, Word (.docx) o pega un enlace público.
            La IA analizará automáticamente cada hoja de vida al subirla.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={uploadTab === "file" ? "default" : "outline"}
              onClick={() => setUploadTab("file")}
              className={
                uploadTab === "file"
                  ? "rb-btn-primary"
                  : "border-accent/40 text-primary dark:text-white"
              }
            >
              <ImageIcon className="w-3.5 h-3.5 mr-1" /> Archivos
            </Button>
            <Button
              type="button"
              size="sm"
              variant={uploadTab === "url" ? "default" : "outline"}
              onClick={() => setUploadTab("url")}
              className={
                uploadTab === "url"
                  ? "rb-btn-primary"
                  : "border-accent/40 text-primary dark:text-white"
              }
            >
              <Globe className="w-3.5 h-3.5 mr-1" /> Enlace
            </Button>
          </div>

          {uploadTab === "file" ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                dragActive
                  ? "border-[#FF9800] bg-[#FFF3E0]"
                  : "border-accent hover:bg-secondary dark:hover:bg-primary/80/50",
              )}
            >
              <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,.docx,.doc,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    void handleFiles(e.target.files);
                  }
                  e.target.value = "";
                }}
              />
              <UploadCloud className="w-10 h-10 mx-auto mb-2 text-accent" />
              <p className="text-sm font-semibold">
                Arrastra las hojas de vida aquí
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                o haz clic para seleccionar (PNG, JPG, PDF, DOCX, XLSX · hasta 50)
              </p>
              {convertingFiles && (
                <p className="mt-3 text-xs text-[#FF9800] flex items-center justify-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Convirtiendo PDF/Word a imagen…
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="url">Enlace de la hoja de vida</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  placeholder="https://ejemplo.com/mi-hoja-de-vida"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleUrlSubmit();
                  }}
                />
                <Button
                  type="button"
                  onClick={handleUrlSubmit}
                  disabled={urlLoading}
                  className="rb-btn-primary whitespace-nowrap"
                >
                  {urlLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4 mr-1" /> Analizar enlace
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Solo enlaces públicos (sin login). El contenido se procesa en el
                servidor y se envía a la IA visual.
              </p>
            </div>
          )}

          {files.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pr-1">
              {files.map((f) => (
                <FileCard
                  key={f.id}
                  file={f}
                  config={config}
                  onRemove={() => removeFile(f.id)}
                  onToggleExpand={() => toggleExpand(f.id)}
                  onViewHv={() => setLightboxFile(f)}
                  expanded={expanded.has(f.id)}
                  evaluation={
                    f.analysis ? evaluateCandidate(f.analysis, config) : undefined
                  }
                />
              ))}
            </div>
          )}

          {errored.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={retryErrors}
              className="border-[#FF9800] text-[#FF9800] hover:bg-[#FFF3E0]"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reintentar{" "}
              {errored.length} error(es)
            </Button>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <Button
              onClick={analyzeAll}
              disabled={isAnalyzing || !config.cargo.trim()}
              className="rb-btn-primary"
              title={!config.cargo.trim() ? "Primero define el cargo a cubrir" : undefined}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Analizando…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" /> Analizar ahora
                </>
              )}
            </Button>
            {!config.cargo.trim() && files.length > 0 && (
              <p className="text-xs text-[#FF9800] flex items-center gap-1 self-center">
                <AlertTriangle className="w-3.5 h-3.5" />
                Define el cargo para iniciar el análisis automático.
              </p>
            )}
            {config.cargo.trim() && files.some((f) => f.status === "pending" && f.previewUrl) && !isAnalyzing && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 self-center">
                <Loader2 className="w-3 h-3 animate-spin" />
                Iniciando análisis automático…
              </p>
            )}
            {files.length > 0 && (
              <Button
                variant="outline"
                onClick={clearAll}
                className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Limpiar todo
              </Button>
            )}
            {evaluatedAll.length > 0 && (
              <Button
                onClick={downloadZip}
                disabled={generatingZip}
                className="rb-btn-dark ml-auto"
              >
                {generatingZip ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-1" />
                )}
                Descargar ZIP ({evaluatedAll.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ---------------- DASHBOARD ---------------- */}
      {showDashboard && analyzed.length > 0 && (
        <div className="space-y-6 animate-rb-fade-up">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard
              icon={<Users className="w-4 h-4" />}
              label="Total"
              value={kpis.total}
              color="#2C3E50"
            />
            <KpiCard
              icon={<GraduationCap className="w-4 h-4" />}
              label="Cumplen formación"
              value={kpis.cumplenFormacion}
              color="#92D050"
            />
            <KpiCard
              icon={<Briefcase className="w-4 h-4" />}
              label="Cumplen experiencia"
              value={kpis.cumplenExperiencia}
              color="#4F8C28"
            />
            <KpiCard
              icon={<UserCheck className="w-4 h-4" />}
              label="Activos"
              value={kpis.activos}
              color="#FF9800"
            />
            <KpiCard
              icon={<XCircle className="w-4 h-4" />}
              label="Descartados"
              value={kpis.descartados}
              color="#C62828"
            />
          </div>

          {/* Top candidate */}
          {topCandidate && (
            <Card className="border-[#FF9800] shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#FF9800] to-[#FFB74D] text-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-8 h-8" />
                    <div>
                      <CardTitle className="text-white">
                        Candidato #1 · Seleccionado
                      </CardTitle>
                      <CardDescription className="text-white/90">
                        {topCandidate.file.analysis?.nombre} ·{" "}
                        {topCandidate.evaluation.score}/{MAX_SCORE} pts
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/95 border-white text-primary hover:bg-white"
                    onClick={() => setLightboxFile(topCandidate.file)}
                  >
                    <Maximize2 className="w-3.5 h-3.5 mr-1" /> Ver HV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 lg:grid-cols-[minmax(260px,360px)_1fr] gap-6">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Hoja de Vida
                  </p>
                  <div className="max-h-[400px] overflow-y-auto border-2 border-accent/40 rounded-lg bg-muted">
                    {topCandidate.file.previewUrl && (
                      <img
                        src={topCandidate.file.previewUrl}
                        alt="HV"
                        className="w-full h-auto block"
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <ScoreBar score={topCandidate.evaluation.score} />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <InfoRow
                      icon={<Mail className="w-3 h-3" />}
                      label="Correo"
                      value={topCandidate.file.analysis?.correo}
                    />
                    <InfoRow
                      icon={<Phone className="w-3 h-3" />}
                      label="Teléfono"
                      value={topCandidate.file.analysis?.telefono}
                    />
                    <InfoRow
                      icon={<MapPin className="w-3 h-3" />}
                      label="Ciudad"
                      value={topCandidate.file.analysis?.ciudad}
                    />
                    <InfoRow
                      icon={<GraduationCap className="w-3 h-3" />}
                      label="Formación"
                      value={topCandidate.file.analysis?.formacion}
                    />
                    <InfoRow
                      icon={<Briefcase className="w-3 h-3" />}
                      label="Experiencia"
                      value={`${topCandidate.file.analysis?.experiencia || "0"} años`}
                    />
                    <InfoRow
                      icon={<Target className="w-3 h-3" />}
                      label="Cargo aspira"
                      value={topCandidate.file.analysis?.cargoAspira}
                    />
                  </div>
                  {topCandidate.file.analysis?.perfilProfesional && (
                    <div className="text-sm">
                      <p className="font-semibold text-primary dark:text-white mb-1">
                        Perfil profesional
                      </p>
                      <p className="text-muted-foreground">
                        {topCandidate.file.analysis.perfilProfesional}
                      </p>
                    </div>
                  )}
                  {topCandidate.file.analysis?.habilidades?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {topCandidate.file.analysis.habilidades.map((h, i) => (
                        <Badge
                          key={i}
                          className="bg-accent/20 text-accent dark:text-accent"
                        >
                          {h}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Candidates table */}
          <Card className="border-accent/30">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base text-primary dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-accent" />
                  Candidatos analizados
                </CardTitle>
                <div className="flex gap-2 items-center">
                  <Select value={filterOption} onValueChange={(v) => setFilterOption(v as FilterOption)}>
                    <SelectTrigger className="w-[160px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="activos">Solo activos</SelectItem>
                      <SelectItem value="descartados">Solo descartados</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                    <SelectTrigger className="w-[160px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score">Por puntaje</SelectItem>
                      <SelectItem value="name">Por nombre</SelectItem>
                      <SelectItem value="estado">Por estado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary hover:bg-primary">
                      <TableHead className="text-white w-[40px]">#</TableHead>
                      <TableHead className="text-white">Candidato</TableHead>
                      <TableHead className="text-white">Cargo aspira</TableHead>
                      <TableHead className="text-white">Formación</TableHead>
                      <TableHead className="text-white text-center">Exp.</TableHead>
                      <TableHead className="text-white text-center">Puntaje</TableHead>
                      <TableHead className="text-white text-center">Estado</TableHead>
                      <TableHead className="text-white text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluated.map((e) => (
                      <TableRow key={e.file.id} className="hover:bg-muted/50">
                        <TableCell className="font-bold text-primary dark:text-white">
                          {e.rank}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{e.file.analysis?.nombre}</div>
                          <div className="text-xs text-muted-foreground">
                            {e.file.fileName}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {e.file.analysis?.cargoAspira || "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {e.file.analysis?.formacion || "—"}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {e.file.analysis?.experiencia || "0"}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              "inline-flex items-center justify-center w-12 h-7 rounded-md font-bold text-xs",
                              e.evaluation.score >= MINIMUM_SCORE
                                ? "bg-accent text-[#1B1B1B]"
                                : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
                            )}
                          >
                            {e.evaluation.score}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              e.evaluation.estado === "ACTIVO"
                                ? "bg-accent text-[#1B1B1B]"
                                : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                            }
                          >
                            {e.evaluation.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => toggleExpand(e.file.id)}
                              title="Ver detalle"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => setLightboxFile(e.file)}
                              title="Ver HV"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Expanded detail */}
              {evaluated.map(
                (e) =>
                  expanded.has(e.file.id) && (
                    <Collapsible key={e.file.id} open={true} onOpenChange={() => toggleExpand(e.file.id)}>
                      <CollapsibleContent>
                        <div className="mt-3 p-4 rounded-lg border border-accent/30 bg-muted/30 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-semibold mb-2 text-primary dark:text-white">
                              Evaluación
                            </p>
                            <ul className="space-y-1 text-xs">
                              <li>
                                Cumple formación:{" "}
                                <strong>
                                  {e.evaluation.cumpleFormacion ? "Sí" : "No"}
                                </strong>
                              </li>
                              <li>
                                Cumple experiencia:{" "}
                                <strong>
                                  {e.evaluation.cumpleExperiencia ? "Sí" : "No"}
                                </strong>
                              </li>
                              <li>
                                Área compatible:{" "}
                                <strong>
                                  {e.evaluation.areaCompatible ? "Sí" : "No"}
                                </strong>{" "}
                                <span className="text-muted-foreground">
                                  ({e.evaluation.areaValue || "—"})
                                </span>
                              </li>
                              <li>
                                Cargo coincide:{" "}
                                <strong>
                                  {e.evaluation.cargoCoincide ? "Sí" : "No"}
                                </strong>
                              </li>
                              <li>
                                Perfil compatible:{" "}
                                <strong>
                                  {e.evaluation.perfilCompatible ? "Sí" : "No"}
                                </strong>
                              </li>
                              {e.evaluation.motivoIncompatibilidad && (
                                <li className="text-[#FF9800]">
                                  ⚠️ {e.evaluation.motivoIncompatibilidad}
                                </li>
                              )}
                            </ul>
                          </div>
                          <div>
                            <p className="font-semibold mb-2 text-primary dark:text-white">
                              Desglose puntaje
                            </p>
                            <ul className="space-y-1 text-xs">
                              <li>Formación: +{e.evaluation.scoreBreakdown.formacion}</li>
                              <li>Experiencia: +{e.evaluation.scoreBreakdown.experiencia}</li>
                              <li>Contacto: +{e.evaluation.scoreBreakdown.contacto}</li>
                              <li>Ciudad: +{e.evaluation.scoreBreakdown.ciudad}</li>
                              <li>Habilidades: +{e.evaluation.scoreBreakdown.habilidad}</li>
                              <li>
                                Penalización: {e.evaluation.scoreBreakdown.penalizacion}
                              </li>
                            </ul>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ),
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------- LIGHTBOX ---------------- */}
      <Dialog
        open={!!lightboxFile}
        onOpenChange={(o) => !o && setLightboxFile(null)}
      >
        <DialogContent className="max-w-[90vw] w-full max-h-[90vh] overflow-hidden p-0">
          <DialogTitle className="sr-only">Hoja de vida</DialogTitle>
          <div className="flex items-center justify-between px-4 py-2 bg-primary text-white">
            <span className="text-sm font-semibold truncate">
              {lightboxFile?.fileName}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              onClick={() => setLightboxFile(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="overflow-auto max-h-[80vh] bg-black/5 dark:bg-black/40">
            {lightboxFile?.previewUrl && (
              <img
                src={lightboxFile.previewUrl}
                alt="HV"
                className="w-full h-auto"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================================================================== */
/*  Sub-components                                                    */
/* ================================================================== */
function FileCard({
  file,
  config,
  onRemove,
  onToggleExpand,
  onViewHv,
  expanded,
  evaluation,
}: {
  file: FileStatus;
  config: ConfigState;
  onRemove: () => void;
  onToggleExpand: () => void;
  onViewHv: () => void;
  expanded: boolean;
  evaluation?: Evaluation;
}) {
  const isFromBuilder = file.fromBuilder;
  return (
    <div className="rounded-lg border bg-card p-3 relative shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-md bg-accent/20 flex items-center justify-center shrink-0">
          {file.sourceKind === "pdf" ? (
            <FileText className="w-4 h-4 text-accent" />
          ) : file.sourceKind === "word" ? (
            <FileText className="w-4 h-4 text-primary" />
          ) : file.sourceKind === "url" ? (
            <Globe className="w-4 h-4 text-[#FF9800]" />
          ) : (
            <ImageIcon className="w-4 h-4 text-accent" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" title={file.fileName}>
            {file.fileName}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {file.fileSize > 0 ? formatBytes(file.fileSize) : "—"} ·{" "}
            {file.sourceKind}
            {isFromBuilder && (
              <Badge className="ml-1 bg-[#FF9800]/20 text-[#FF9800] py-0 px-1 text-[9px]">
                Creador HV
              </Badge>
            )}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-red-500"
          onClick={onRemove}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="relative w-full aspect-[3/4] bg-muted rounded-md overflow-hidden mb-2">
        {file.previewUrl ? (
          <img
            src={file.previewUrl}
            alt={file.fileName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {file.status === "analyzing" ? (
              <Loader2 className="w-6 h-6 text-accent animate-spin" />
            ) : (
              <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
            )}
          </div>
        )}
        {file.status === "analyzing" && (
          <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-primary/90 text-white text-[10px]">
            Analizando… {file.progress}%
          </div>
        )}
        {file.status === "done" && evaluation && (
          <div
            className={cn(
              "absolute top-1 right-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold",
              evaluation.score >= MINIMUM_SCORE
                ? "bg-accent text-[#1B1B1B]"
                : "bg-red-500 text-white",
            )}
          >
            {evaluation.score}/{MAX_SCORE}
          </div>
        )}
        {file.status === "error" && (
          <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center p-2 text-center">
            <span className="text-[10px] text-white">
              {file.error || "Error"}
            </span>
          </div>
        )}
      </div>

      {file.status === "done" && file.analysis && (
        <div className="space-y-1 text-xs">
          <p className="font-semibold truncate">{file.analysis.nombre}</p>
          <p className="text-muted-foreground truncate">
            {file.analysis.cargoAspira || "Cargo no especificado"}
          </p>
          <div className="flex gap-1 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="h-6 flex-1 text-[10px] border-accent/40"
              onClick={onToggleExpand}
            >
              Detalle
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 flex-1 text-[10px] border-accent/40"
              onClick={onViewHv}
            >
              Ver HV
            </Button>
          </div>
        </div>
      )}
      {file.status === "pending" && (
        <p className="text-[10px] text-muted-foreground text-center py-1">
          Listo para analizar
        </p>
      )}
      {file.status === "error" && (
        <Button
          size="sm"
          variant="ghost"
          className="w-full h-6 text-[10px] text-[#FF9800]"
          onClick={onToggleExpand}
        >
          Ver error
        </Button>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="border-accent/20">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-white"
            style={{ background: color }}
          >
            {icon}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="text-xl font-bold leading-none">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, (score / MAX_SCORE) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold">Puntaje global</span>
        <span className="text-sm font-bold text-primary dark:text-white">
          {score}/{MAX_SCORE}
        </span>
      </div>
      <Progress
        value={pct}
        className="h-2 bg-muted"
        style={
          {
            // Override the indicator color via CSS var
            ["--progress-foreground" as any]:
              score >= MINIMUM_SCORE ? "#92D050" : "#EF5350",
          } as React.CSSProperties
        }
      />
      <p
        className={cn(
          "text-xs mt-1",
          score >= MINIMUM_SCORE ? "text-accent" : "text-red-600",
        )}
      >
        {score >= MINIMUM_SCORE
          ? "Supera el puntaje mínimo (≥" + MINIMUM_SCORE + ")"
          : "Por debajo del mínimo (" + MINIMUM_SCORE + ")"}
      </p>
    </div>
  );
}

"use client";

import * as React from "react";
import {
  Plus,
  Trash2,
  Copy,
  Edit3,
  Check,
  X,
  Sun,
  Moon,
  FileText,
  Printer,
  Send,
  Eraser,
  AlertTriangle,
  ChevronRight,
  User,
  Briefcase,
  GraduationCap,
  Star,
  Settings2,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RBLogo } from "./RBLogo";
import { ResumePreview } from "./ResumePreview";
import {
  type Resume,
  type Experiencia,
  type Educacion,
  type FormTab,
  FORM_TABS,
  MONTH_OPTIONS,
  yearOptions,
  createEmptyResume,
  createEmptyExperiencia,
  createEmptyEducacion,
  loadResumesFromStorage,
  saveResumesToStorage,
  loadDarkModeFromStorage,
  saveDarkModeToStorage,
  resizeImage,
  elementToJpeg,
} from "@/lib/resume";

interface ResumeBuilderProps {
  /** Called when the user clicks "Enviar al Análisis IA". */
  onSendToAnalysis?: (imageDataUrl: string, name: string) => void;
  /** Controlled dark mode so the parent header toggle stays in sync. */
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export function ResumeBuilder({
  onSendToAnalysis,
  darkMode: darkModeProp,
  onToggleDarkMode: onToggleDarkModeProp,
}: ResumeBuilderProps) {
  /* Local fallback state so the builder can be embedded without a parent
     having to pass darkMode/onToggleDarkMode. */
  const [internalDark, setInternalDark] = React.useState(false);
  const darkMode = darkModeProp ?? internalDark;
  const onToggleDarkMode = React.useCallback(() => {
    if (onToggleDarkModeProp) onToggleDarkModeProp();
    else setInternalDark((v) => !v);
  }, [onToggleDarkModeProp]);

  const [resumes, setResumes] = React.useState<Resume[]>([]);
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [activeTab, setActiveTab] = React.useState<FormTab>("A");
  const [renamingId, setRenamingId] = React.useState<string>("");
  const [renameValue, setRenameValue] = React.useState<string>("");
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [sendingToAnalysis, setSendingToAnalysis] = React.useState(false);

  const previewRef = React.useRef<HTMLDivElement>(null);

  const years = React.useMemo(() => yearOptions(), []);

  /* ---- Load from LocalStorage on mount ---- */
  React.useEffect(() => {
    const loaded = loadResumesFromStorage();
    if (loaded.length === 0) {
      const initial = createEmptyResume("Mi primera hoja de vida");
      setResumes([initial]);
      setSelectedId(initial.id);
    } else {
      setResumes(loaded);
      setSelectedId(loaded[0].id);
    }
  }, []);

  /* ---- Persist to LocalStorage whenever resumes change ---- */
  React.useEffect(() => {
    if (resumes.length === 0) return;
    saveResumesToStorage(resumes);
  }, [resumes]);

  const selected = React.useMemo(
    () => resumes.find((r) => r.id === selectedId) || resumes[0],
    [resumes, selectedId],
  );

  /* ---- Mutators (immutable updates) ---- */
  const updateSelected = React.useCallback(
    (patch: Partial<Resume>) => {
      setResumes((prev) =>
        prev.map((r) =>
          r.id === selectedId
            ? { ...r, ...patch, updatedAt: Date.now() }
            : r,
        ),
      );
    },
    [selectedId],
  );

  const updateExperiencia = React.useCallback(
    (id: string, patch: Partial<Experiencia>) => {
      setResumes((prev) =>
        prev.map((r) =>
          r.id === selectedId
            ? {
                ...r,
                experiencias: r.experiencias.map((e) =>
                  e.id === id ? { ...e, ...patch } : e,
                ),
                updatedAt: Date.now(),
              }
            : r,
        ),
      );
    },
    [selectedId],
  );

  const updateEducacion = React.useCallback(
    (id: string, patch: Partial<Educacion>) => {
      setResumes((prev) =>
        prev.map((r) =>
          r.id === selectedId
            ? {
                ...r,
                educacion: r.educacion.map((e) =>
                  e.id === id ? { ...e, ...patch } : e,
                ),
                updatedAt: Date.now(),
              }
            : r,
        ),
      );
    },
    [selectedId],
  );

  const addExperiencia = () => {
    const e = createEmptyExperiencia();
    updateSelected({ experiencias: [...(selected?.experiencias || []), e] });
  };
  const removeExperiencia = (id: string) => {
    updateSelected({
      experiencias: (selected?.experiencias || []).filter((e) => e.id !== id),
    });
  };

  const addEducacion = () => {
    const e = createEmptyEducacion();
    updateSelected({ educacion: [...(selected?.educacion || []), e] });
  };
  const removeEducacion = (id: string) => {
    updateSelected({
      educacion: (selected?.educacion || []).filter((e) => e.id !== id),
    });
  };

  /* ---- Resume list management ---- */
  const createNew = () => {
    const r = createEmptyResume("Nueva hoja de vida");
    setResumes((prev) => [...prev, r]);
    setSelectedId(r.id);
    setActiveTab("A");
    toast.success("Nueva hoja de vida creada.");
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const copy: Resume = {
      ...selected,
      id: Math.random().toString(36).slice(2, 18),
      name: `${selected.name} (copia)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      experiencias: selected.experiencias.map((e) => ({ ...e, id: Math.random().toString(36).slice(2, 18) })),
      educacion: selected.educacion.map((e) => ({ ...e, id: Math.random().toString(36).slice(2, 18) })),
    };
    setResumes((prev) => [...prev, copy]);
    setSelectedId(copy.id);
    toast.success("Hoja de vida duplicada.");
  };

  const deleteSelected = () => {
    if (resumes.length <= 1) {
      toast.error("Debe existir al menos una hoja de vida.");
      return;
    }
    setResumes((prev) => {
      const next = prev.filter((r) => r.id !== selectedId);
      setSelectedId(next[0].id);
      return next;
    });
    toast.info("Hoja de vida eliminada.");
  };

  const startRename = (id: string, current: string) => {
    setRenamingId(id);
    setRenameValue(current);
  };
  const commitRename = () => {
    if (!renamingId) return;
    const name = renameValue.trim() || "Sin nombre";
    setResumes((prev) =>
      prev.map((r) => (r.id === renamingId ? { ...r, name } : r)),
    );
    setRenamingId("");
    setRenameValue("");
  };

  const clearCurrentData = () => {
    if (!selected) return;
    updateSelected({
      nombre: "",
      cargo: "",
      correo: "",
      telefono: "",
      ciudad: "",
      enlace: "",
      foto: null,
      perfil: "",
      experiencias: [],
      educacion: [],
      habilidades: "",
    });
    setConfirmClear(false);
    toast.success("Datos borrados. La hoja de vida quedó vacía.");
  };

  /* ---- Photo upload (resized to max 300px via canvas) ---- */
  const photoInputRef = React.useRef<HTMLInputElement | null>(null);
  const handlePhotoUpload = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file, 300);
      updateSelected({ foto: dataUrl });
      toast.success("Foto cargada (redimensionada a máx. 300px).");
    } catch (err: any) {
      toast.error(`No se pudo cargar la foto: ${err?.message || err}`);
    }
  };
  const removePhoto = () => {
    updateSelected({ foto: null });
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  /* ---- Export to PDF via browser print ---- */
  const exportPdf = () => {
    toast.info("Abriendo diálogo de impresión… usa 'Guardar como PDF'.");
    setTimeout(() => window.print(), 250);
  };

  /* ---- Enviar al Análisis IA ---- */
  const sendToAnalysis = async () => {
    if (!previewRef.current || !selected) {
      toast.error("No hay vista previa para enviar.");
      return;
    }
    if (!selected.nombre?.trim()) {
      toast.error("Completa al menos el nombre antes de enviar al análisis.");
      return;
    }
    if (!onSendToAnalysis) {
      toast.info("El envío al análisis IA no está disponible en este contexto.");
      return;
    }
    setSendingToAnalysis(true);
    try {
      const img = await elementToJpeg(previewRef.current, 2);
      onSendToAnalysis(img, selected.nombre);
      toast.success("Hoja de vida enviada al módulo de Análisis IA.");
    } catch (err: any) {
      // Fallback: send a synthetic image with the resume text.
      toast.error(`Render falló, enviando versión texto: ${err?.message || err}`);
      try {
        const text = renderResumeAsText(selected);
        onSendToAnalysis(textToImageDataUrl(text), selected.nombre);
      } catch (e) {
        toast.error(`No se pudo enviar al análisis: ${e}`);
      }
    } finally {
      setSendingToAnalysis(false);
    }
  };

  /* ---- Tab navigation ---- */
  const goNextTab = () => {
    const idx = FORM_TABS.findIndex((t) => t.id === activeTab);
    if (idx >= 0 && idx < FORM_TABS.length - 1) {
      setActiveTab(FORM_TABS[idx + 1].id);
    }
  };

  if (!selected) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 w-full">
      {/* ===================== LEFT: SIDEBAR ===================== */}
      <aside className="rb-no-print w-full lg:w-[250px] shrink-0 lg:self-stretch">
        <Card className="border-[#92D050]/30 bg-card sticky top-[80px]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#92D050]" />
              <CardTitle className="text-base text-[#2C3E50] dark:text-white">
                Hojas de vida
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={createNew}
              className="w-full rb-btn-primary"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" /> Nueva HV
            </Button>

            <div className="max-h-72 overflow-y-auto rb-chat-scroll space-y-1 pr-1">
              {resumes.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={cn(
                    "group px-3 py-2 rounded-md cursor-pointer text-sm transition-colors border",
                    r.id === selectedId
                      ? "bg-[#92D050] text-[#1B1B1B] border-[#6FB83A]"
                      : "bg-background hover:bg-muted border-transparent",
                  )}
                >
                  {renamingId === r.id ? (
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") {
                            setRenamingId("");
                            setRenameValue("");
                          }
                        }}
                        className="h-7 text-xs px-1.5"
                      />
                      <button
                        onClick={commitRename}
                        className="p-1 hover:bg-white/30 rounded"
                        title="Guardar"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          setRenamingId("");
                          setRenameValue("");
                        }}
                        className="p-1 hover:bg-white/30 rounded"
                        title="Cancelar"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate flex-1" title={r.name}>
                        {r.name || "Sin nombre"}
                      </span>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(r.id, r.name);
                          }}
                          className="p-1 hover:bg-black/10 rounded"
                          title="Renombrar"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={duplicateSelected}
                variant="outline"
                size="sm"
                className="flex-1 border-[#2C3E50]/30 hover:bg-[#E8F5E9] dark:hover:bg-[#34495E]"
              >
                <Copy className="w-3.5 h-3.5 mr-1" /> Duplicar
              </Button>
              <Button
                onClick={deleteSelected}
                variant="outline"
                size="sm"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Borrar
              </Button>
            </div>

            <div className="pt-2 border-t border-border">
              <Button
                onClick={onToggleDarkMode}
                variant="outline"
                size="sm"
                className="w-full border-[#2C3E50]/30 hover:bg-[#E8F5E9] dark:hover:bg-[#34495E]"
              >
                {darkMode ? (
                  <>
                    <Sun className="w-4 h-4 mr-2" /> Modo claro
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 mr-2" /> Modo oscuro
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* ===================== CENTER: FORM TABS ===================== */}
      <section className="rb-no-print flex-1 min-w-0">
        {/* Tab bar */}
        <div className="flex flex-wrap gap-1 mb-4 bg-card p-1 rounded-lg border border-[#92D050]/30">
          {FORM_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex-1 min-w-[100px]",
                activeTab === t.id
                  ? "bg-[#92D050] text-[#1B1B1B]"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t.short}
            </button>
          ))}
        </div>

        <Card className="border-[#92D050]/30 bg-card">
          <CardContent className="pt-6">
            {/* Force remount on resume change so uncontrolled inputs reset
                their defaultValue cleanly — avoids stale data bleed. */}
            <div key={selected.id}>
              {activeTab === "A" && (
                <TabContacto
                  resume={selected}
                  onChange={updateSelected}
                  onPhotoUpload={handlePhotoUpload}
                  onRemovePhoto={removePhoto}
                  photoInputRef={photoInputRef}
                  onNext={goNextTab}
                />
              )}
              {activeTab === "B" && (
                <TabPerfil
                  resume={selected}
                  onChange={updateSelected}
                  onNext={goNextTab}
                />
              )}
              {activeTab === "C" && (
                <TabExperiencia
                  resume={selected}
                  onAdd={addExperiencia}
                  onRemove={removeExperiencia}
                  onUpdate={updateExperiencia}
                  years={years}
                  onNext={goNextTab}
                />
              )}
              {activeTab === "D" && (
                <TabEducacion
                  resume={selected}
                  onAdd={addEducacion}
                  onRemove={removeEducacion}
                  onUpdate={updateEducacion}
                  years={years}
                  onNext={goNextTab}
                />
              )}
              {activeTab === "E" && (
                <TabHabilidades
                  resume={selected}
                  onChange={updateSelected}
                  onNext={goNextTab}
                />
              )}
              {activeTab === "F" && (
                <TabExportar
                  onExportPdf={exportPdf}
                  onClear={() => setConfirmClear(true)}
                  onSendToAnalysis={sendToAnalysis}
                  sendingToAnalysis={sendingToAnalysis}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ===================== RIGHT: LIVE PREVIEW ===================== */}
      <section className="flex-1 min-w-0 lg:max-w-[45%]">
        <div className="rb-no-print mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Vista previa ATS (A4)
          </h3>
          <span className="text-[10px] text-muted-foreground">
            Arial 11pt · 1 columna
          </span>
        </div>
        <div className="rb-no-print max-h-[calc(100vh-160px)] overflow-y-auto rb-chat-scroll pb-4">
          <ResumePreview ref={previewRef} resume={selected} />
        </div>

        {/* Hidden print-only area — what window.print() actually shows.
            IMPORTANT: only this element has the .rb-print-area class so the
            @media print rule shows ONLY the resume sheet (no panels). */}
        <div className="hidden print:block">
          <ResumePreview resume={selected} forPrint />
        </div>
      </section>

      {/* ===================== CLEAR CONFIRMATION ===================== */}
      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#FF9800]" />
              ¿Borrar todos los datos?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán los datos de esta hoja de vida ({selected.name}).
              Las demás hojas no se verán afectadas. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={clearCurrentData}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sí, borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ================================================================== */
/*  Tab A: Datos de contacto                                          */
/* ================================================================== */
function TabContacto({
  resume,
  onChange,
  onPhotoUpload,
  onRemovePhoto,
  photoInputRef,
  onNext,
}: {
  resume: Resume;
  onChange: (p: Partial<Resume>) => void;
  onPhotoUpload: (f: File | null | undefined) => void;
  onRemovePhoto: () => void;
  photoInputRef: React.RefObject<HTMLInputElement | null>;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <TabHeader
        icon={<User className="w-4 h-4" />}
        title="A · Datos de contacto"
        desc="Información básica del candidato y foto opcional."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nombre completo">
          <input
            type="text"
            defaultValue={resume.nombre}
            onChange={(e) => onChange({ nombre: e.target.value })}
            placeholder="Ej: María González Pérez"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Cargo al que aspira">
          <input
            type="text"
            defaultValue={resume.cargo}
            onChange={(e) => onChange({ cargo: e.target.value })}
            placeholder="Ej: Auxiliar Administrativo"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Correo electrónico">
          <input
            type="email"
            defaultValue={resume.correo}
            onChange={(e) => onChange({ correo: e.target.value })}
            placeholder="correo@dominio.com"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Teléfono">
          <input
            type="tel"
            defaultValue={resume.telefono}
            onChange={(e) => onChange({ telefono: e.target.value })}
            placeholder="+57 300 000 0000"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Ciudad">
          <input
            type="text"
            defaultValue={resume.ciudad}
            onChange={(e) => onChange({ ciudad: e.target.value })}
            placeholder="Ej: Medellín, Colombia"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Enlace (LinkedIn / portafolio)">
          <input
            type="url"
            defaultValue={resume.enlace}
            onChange={(e) => onChange({ enlace: e.target.value })}
            placeholder="https://linkedin.com/in/usuario"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <div className="pt-3 border-t border-border">
        <Label className="mb-2 block text-sm font-medium">Foto (opcional)</Label>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPhotoUpload(f);
            e.target.value = "";
          }}
        />
        <div className="flex items-center gap-4">
          <div className="w-20 h-24 rounded-md border-2 border-dashed border-[#92D050]/40 flex items-center justify-center overflow-hidden bg-muted/30">
            {resume.foto ? (
              <img
                src={resume.foto}
                alt="Foto"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-6 h-6 text-muted-foreground/60" />
            )}
          </div>
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => photoInputRef.current?.click()}
              className="border-[#92D050] text-[#2C3E50] hover:bg-[#E8F5E9] dark:text-white dark:hover:bg-[#34495E]"
            >
              <Upload className="w-3.5 h-3.5 mr-1" /> Subir foto
            </Button>
            {resume.foto && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemovePhoto}
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 block"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Quitar
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Se redimensiona a máx. 300px automáticamente.
            </p>
          </div>
        </div>
      </div>

      <NextButton onClick={onNext} />
    </div>
  );
}

/* ================================================================== */
/*  Tab B: Perfil profesional                                          */
/* ================================================================== */
function TabPerfil({
  resume,
  onChange,
  onNext,
}: {
  resume: Resume;
  onChange: (p: Partial<Resume>) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <TabHeader
        icon={<Star className="w-4 h-4" />}
        title="B · Perfil profesional"
        desc="Resumen breve (4 líneas) que describe tu perfil y tu valor."
      />
      <Field label="Perfil profesional">
        <Textarea
          defaultValue={resume.perfil}
          onChange={(e) => onChange({ perfil: e.target.value })}
          placeholder="Profesional en… con experiencia en… especializado en…"
          rows={6}
          className="resize-y"
        />
      </Field>
      <p className="text-xs text-muted-foreground">
        Consejo: mantén el resumen en 4 líneas para que entre en una sola
        página A4. Menciona tu área, años de experiencia y tu fortaleza
        principal.
      </p>
      <NextButton onClick={onNext} />
    </div>
  );
}

/* ================================================================== */
/*  Tab C: Experiencia laboral                                         */
/* ================================================================== */
function TabExperiencia({
  resume,
  onAdd,
  onRemove,
  onUpdate,
  years,
  onNext,
}: {
  resume: Resume;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, p: Partial<Experiencia>) => void;
  years: string[];
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <TabHeader
        icon={<Briefcase className="w-4 h-4" />}
        title="C · Experiencia laboral"
        desc="Agrega cada cargo. 'Funciones' y 'Logros' se combinan en una sola lista de viñetas en el preview."
      />
      <Button onClick={onAdd} size="sm" className="rb-btn-primary">
        <Plus className="w-4 h-4 mr-1" /> Agregar experiencia
      </Button>

      {resume.experiencias.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No hay experiencias. Agrega la primera con el botón de arriba.
        </p>
      )}

      <div className="space-y-4">
        {resume.experiencias.map((exp, idx) => (
          <div
            key={exp.id}
            className="rounded-lg border border-[#92D050]/30 p-4 bg-muted/30"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-[#2C3E50] dark:text-white">
                Experiencia #{idx + 1}
              </h4>
              <button
                onClick={() => onRemove(exp.id)}
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded-md"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Cargo">
                <input
                  type="text"
                  defaultValue={exp.cargo}
                  onChange={(e) => onUpdate(exp.id, { cargo: e.target.value })}
                  placeholder="Ej: Asistente administrativo"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Empresa">
                <input
                  type="text"
                  defaultValue={exp.empresa}
                  onChange={(e) => onUpdate(exp.id, { empresa: e.target.value })}
                  placeholder="Ej: Reflejos Brillantes SAS"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Fecha de inicio (mes)">
                <Select
                  value={exp.fechaInicioMes}
                  onValueChange={(v) => onUpdate(exp.id, { fechaInicioMes: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m} className="capitalize">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Fecha de inicio (año)">
                <Select
                  value={exp.fechaInicioAno}
                  onValueChange={(v) => onUpdate(exp.id, { fechaInicioAno: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Fecha de fin (mes)">
                <Select
                  value={exp.fechaFinMes}
                  onValueChange={(v) =>
                    onUpdate(exp.id, { fechaFinMes: v })
                  }
                  disabled={exp.trabajoActual}
                >
                  <SelectTrigger className="w-full" disabled={exp.trabajoActual}>
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {MONTH_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m} className="capitalize">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Fecha de fin (año)">
                <Select
                  value={exp.fechaFinAno}
                  onValueChange={(v) => onUpdate(exp.id, { fechaFinAno: v })}
                  disabled={exp.trabajoActual}
                >
                  <SelectTrigger className="w-full" disabled={exp.trabajoActual}>
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Checkbox
                id={`actual-${exp.id}`}
                checked={exp.trabajoActual}
                onCheckedChange={(v) =>
                  onUpdate(exp.id, { trabajoActual: v === true })
                }
              />
              <Label htmlFor={`actual-${exp.id}`} className="text-sm cursor-pointer">
                Trabajo actual
              </Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <Field label="Funciones (una por línea)">
                <Textarea
                  defaultValue={exp.funciones}
                  onChange={(e) =>
                    onUpdate(exp.id, { funciones: e.target.value })
                  }
                  placeholder={"Gestionar inventarios\nCoordinar proveedores"}
                  rows={5}
                  className="resize-y"
                />
              </Field>
              <Field label="Logros (una por línea)">
                <Textarea
                  defaultValue={exp.logros}
                  onChange={(e) => onUpdate(exp.id, { logros: e.target.value })}
                  placeholder={"Reduje mermas 15%\nLideré equipo de 5 personas"}
                  rows={5}
                  className="resize-y"
                />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <NextButton onClick={onNext} />
    </div>
  );
}

/* ================================================================== */
/*  Tab D: Educación formal                                            */
/* ================================================================== */
function TabEducacion({
  resume,
  onAdd,
  onRemove,
  onUpdate,
  years,
  onNext,
}: {
  resume: Resume;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, p: Partial<Educacion>) => void;
  years: string[];
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <TabHeader
        icon={<GraduationCap className="w-4 h-4" />}
        title="D · Educación formal"
        desc="Títulos obtenidos. Incluye institución y fecha de grado."
      />
      <Button onClick={onAdd} size="sm" className="rb-btn-primary">
        <Plus className="w-4 h-4 mr-1" /> Agregar estudio
      </Button>

      {resume.educacion.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No hay estudios registrados todavía.
        </p>
      )}

      <div className="space-y-4">
        {resume.educacion.map((edu, idx) => (
          <div
            key={edu.id}
            className="rounded-lg border border-[#92D050]/30 p-4 bg-muted/30"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-[#2C3E50] dark:text-white">
                Estudio #{idx + 1}
              </h4>
              <button
                onClick={() => onRemove(edu.id)}
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded-md"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Título obtenido">
                <input
                  type="text"
                  defaultValue={edu.titulo}
                  onChange={(e) => onUpdate(edu.id, { titulo: e.target.value })}
                  placeholder="Ej: Tecnólogo en Logística"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Institución">
                <input
                  type="text"
                  defaultValue={edu.institucion}
                  onChange={(e) =>
                    onUpdate(edu.id, { institucion: e.target.value })
                  }
                  placeholder="Ej: SENA - Centro de Servicios a la Logística"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Fecha de grado (mes)">
                <Select
                  value={edu.fechaGradoMes}
                  onValueChange={(v) =>
                    onUpdate(edu.id, { fechaGradoMes: v })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {MONTH_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m} className="capitalize">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Fecha de grado (año)">
                <Select
                  value={edu.fechaGradoAno}
                  onValueChange={(v) =>
                    onUpdate(edu.id, { fechaGradoAno: v })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
        ))}
      </div>

      <NextButton onClick={onNext} />
    </div>
  );
}

/* ================================================================== */
/*  Tab E: Habilidades                                                 */
/* ================================================================== */
function TabHabilidades({
  resume,
  onChange,
  onNext,
}: {
  resume: Resume;
  onChange: (p: Partial<Resume>) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <TabHeader
        icon={<Star className="w-4 h-4" />}
        title="E · Habilidades"
        desc="Lista de habilidades (una por línea) que se mostrarán como viñetas."
      />
      <Field label="Habilidades (una por línea)">
        <Textarea
          defaultValue={resume.habilidades}
          onChange={(e) => onChange({ habilidades: e.target.value })}
          placeholder={
            "Manejo de Office\nSAP\nGestión de inventarios\nTrabajo en equipo"
          }
          rows={8}
          className="resize-y"
        />
      </Field>
      <NextButton onClick={onNext} />
    </div>
  );
}

/* ================================================================== */
/*  Tab F: Exportar                                                    */
/* ================================================================== */
function TabExportar({
  onExportPdf,
  onClear,
  onSendToAnalysis,
  sendingToAnalysis,
}: {
  onExportPdf: () => void;
  onClear: () => void;
  onSendToAnalysis: () => void;
  sendingToAnalysis: boolean;
}) {
  return (
    <div className="space-y-4">
      <TabHeader
        icon={<Settings2 className="w-4 h-4" />}
        title="F · Exportar"
        desc="Genera PDF, envía al análisis IA o borra los datos actuales."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          onClick={onExportPdf}
          size="lg"
          className="rb-btn-primary h-auto py-4 flex flex-col gap-1"
        >
          <Printer className="w-5 h-5" />
          <span>Exportar a PDF</span>
          <span className="text-[10px] font-normal opacity-80">
            Abre el diálogo de impresión
          </span>
        </Button>
        <Button
          onClick={onSendToAnalysis}
          disabled={sendingToAnalysis}
          size="lg"
          className="rb-btn-dark h-auto py-4 flex flex-col gap-1"
        >
          {sendingToAnalysis ? (
            <Send className="w-5 h-5 animate-pulse" />
          ) : (
            <Send className="w-5 h-5" />
          )}
          <span>Enviar al Análisis IA</span>
          <span className="text-[10px] font-normal opacity-80">
            Pasa a la pestaña Analizar HV
          </span>
        </Button>
        <Button
          onClick={onClear}
          size="lg"
          variant="outline"
          className="border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 h-auto py-4 flex flex-col gap-1"
        >
          <Eraser className="w-5 h-5" />
          <span>Borrar datos</span>
          <span className="text-[10px] font-normal opacity-80">
            Vacía esta hoja de vida
          </span>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground pt-2">
        El PDF se genera con el diálogo de impresión del navegador. Selecciona
        "Guardar como PDF" como destino. Se imprime solo la hoja de vida
        (formato A4, sin paneles laterales).
      </p>
    </div>
  );
}

/* ================================================================== */
/*  Small helpers                                                      */
/* ================================================================== */
function TabHeader({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 pb-3 border-b border-border">
      <div className="w-9 h-9 rounded-md bg-[#92D050] text-[#1B1B1B] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-bold text-[#2C3E50] dark:text-white">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function NextButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="pt-3 flex justify-end">
      <Button onClick={onClick} className="rb-btn-dark">
        Siguiente Sección <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

/* ---- Tiny inline Card to avoid extra imports ---- */
function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>;
}
function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={cn("font-semibold leading-none tracking-tight", className)}>{children}</h3>;
}
function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-6 pt-0", className)}>{children}</div>;
}

/* ---- Fallback text renderer for analysis send ---- */
function renderResumeAsText(r: Resume): string {
  const lines: string[] = [];
  if (r.nombre) lines.push(`Nombre: ${r.nombre}`);
  if (r.cargo) lines.push(`Cargo: ${r.cargo}`);
  const contact = [r.correo, r.telefono, r.ciudad, r.enlace].filter(Boolean).join(" · ");
  if (contact) lines.push(contact);
  if (r.perfil) {
    lines.push("");
    lines.push("PERFIL PROFESIONAL");
    lines.push(r.perfil);
  }
  if (r.experiencias.length) {
    lines.push("");
    lines.push("EXPERIENCIA LABORAL");
    for (const e of r.experiencias) {
      lines.push(`${e.cargo} — ${e.empresa}`);
      const range = [
        e.fechaInicioMes,
        e.fechaInicioAno,
        e.trabajoActual ? "Actualidad" : [e.fechaFinMes, e.fechaFinAno].filter(Boolean).join(" "),
      ].filter(Boolean).join(" ");
      if (range) lines.push(range);
      if (e.funciones) lines.push("Funciones: " + e.funciones.replace(/\n/g, "; "));
      if (e.logros) lines.push("Logros: " + e.logros.replace(/\n/g, "; "));
    }
  }
  if (r.educacion.length) {
    lines.push("");
    lines.push("EDUCACIÓN");
    for (const e of r.educacion) {
      lines.push(`${e.titulo} — ${e.institucion} (${[e.fechaGradoMes, e.fechaGradoAno].filter(Boolean).join(" ")})`);
    }
  }
  if (r.habilidades) {
    lines.push("");
    lines.push("HABILIDADES");
    lines.push(r.habilidades);
  }
  return lines.join("\n");
}

function textToImageDataUrl(text: string): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = Math.max(1400, 60 + text.split("\n").length * 22 + 80);
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#2C3E50";
  ctx.fillRect(0, 0, canvas.width, 50);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.fillText("Hoja de vida (enviada desde Creador)", 20, 32);
  ctx.fillStyle = "#1B1B1B";
  ctx.font = '14px Arial, sans-serif';
  let y = 80;
  for (const line of text.split("\n")) {
    ctx.fillText(line, 40, y);
    y += 22;
  }
  return canvas.toDataURL("image/jpeg", 0.9);
}

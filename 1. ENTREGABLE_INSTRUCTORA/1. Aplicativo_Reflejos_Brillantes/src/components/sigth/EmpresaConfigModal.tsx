"use client";

import * as React from "react";
import {
  Building2,
  Globe,
  Upload,
  Link2,
  Sparkles,
  Loader2,
  Palette,
  Share2,
  Copy,
  Check,
  Trash2,
  ImagePlus,
  X,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  type EmpresaConfig,
  DEFAULT_EMPRESA,
  buildCompanyTheme,
  uid,
  lighten,
  darken,
} from "@/lib/analysis";
import { useEmpresa } from "@/components/sigth/EmpresaContext";
import {
  encodeEmpresaToUrl,
  decodeEmpresaFromUrl,
} from "@/lib/backup";
import { CompanyLogo } from "@/components/sigth/CompanyLogo";

interface EmpresaConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si true, el modal no se puede cerrar hasta que el usuario guarde. */
  forceConfigure?: boolean;
  /** Se dispara cuando el usuario guarda. El padre puede usar esto para
   *  resetear el flag forceConfigure y permitir el cierre. */
  onSaved?: () => void;
}

/** 8 paletas predefinidas para escoger rápido. */
const PRESET_PALETTES: { name: string; primary: string; accent: string }[] = [
  { name: "Verde corporativo", primary: "#2C3E50", accent: "#92D050" },
  { name: "Azul profesional", primary: "#1E3A8A", accent: "#60A5FA" },
  { name: "Borgoña & oro", primary: "#6B1F2E", accent: "#B8941F" },
  { name: "Naranja vibrante", primary: "#7C2D12", accent: "#FB923C" },
  { name: "Morado moderno", primary: "#4C1D95", accent: "#C4B5FD" },
  { name: "Teal fresco", primary: "#0F766E", accent: "#5EEAD4" },
  { name: "Gris ejecutivo", primary: "#1F2937", accent: "#F59E0B" },
  { name: "Rosa magenta", primary: "#831843", accent: "#F472B6" },
];

export function EmpresaConfigModal({
  open,
  onOpenChange,
  forceConfigure,
  onSaved,
}: EmpresaConfigModalProps) {
  const { empresa: currentEmpresa, setEmpresa } = useEmpresa();
  const [draft, setDraft] = React.useState<EmpresaConfig>(currentEmpresa);
  const [urlInput, setUrlInput] = React.useState("");
  const [analyzing, setAnalyzing] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const logoFileRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  // Tracks whether we just saved; lets us close the modal reliably even if
  // the parent's `forceConfigure` prop hasn't updated yet.
  const savedRef = React.useRef(false);

  // Sincroniza el draft cuando se abre el modal.
  // IMPORTANTE: no reseteamos savedRef aquí porque ese efecto se dispara
  // antes que el de cierre, y borraría el flag que necesitamos para cerrar.
  React.useEffect(() => {
    if (open) setDraft(currentEmpresa);
  }, [open, currentEmpresa]);

  // Close the modal reliably once `currentEmpresa` has been updated
  // by our `setEmpresa(finalCfg)` call in handleSave.
  React.useEffect(() => {
    if (!savedRef.current) return;
    if (currentEmpresa.id === draft.id && currentEmpresa.name === draft.name) {
      // Empresa context has accepted our save — safe to close now.
      savedRef.current = false;
      onSaved?.();
      // Defer the close so the parent's forceConfig state can update first,
      // otherwise the Dialog's onOpenChange guard would reject the close.
      window.setTimeout(() => onOpenChange(false), 50);
    }
  }, [currentEmpresa, draft.id, draft.name, onSaved, onOpenChange]);

  const update = (patch: Partial<EmpresaConfig>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const handleLogoFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo no es una imagen válida.");
      return;
    }
    if (file.size > 1_500_000) {
      toast.error("La imagen pesa más de 1.5 MB. Reduce su tamaño e inténtalo de nuevo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      update({ logo: String(reader.result || "") });
      toast.success("Logo cargado. No olvides guardar los cambios.");
    };
    reader.onerror = () => toast.error("No se pudo leer la imagen.");
    reader.readAsDataURL(file);
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleLogoFile(file);
  };

  const handleAnalyzeWeb = async () => {
    const url = urlInput.trim();
    if (!url) {
      toast.error("Escribe una URL primero.");
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      toast.error("La URL debe comenzar con http:// o https://");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) {
        throw new Error(
          (json && (json as { error?: string }).error) ||
            `No se pudo analizar (HTTP ${res.status})`,
        );
      }
      const data = json as {
        name?: string;
        tagline?: string;
        logo?: string;
        primaryColor?: string;
        accentColor?: string;
      };
      update({
        name: data.name || draft.name,
        tagline: data.tagline || draft.tagline,
        logo: data.logo || draft.logo,
        primaryColor: data.primaryColor || draft.primaryColor,
        accentColor: data.accentColor || draft.accentColor,
      });
      toast.success(
        `Sitio adaptado: ${data.name || "empresa detectada"}. Revisa los colores y guarda.`,
      );
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error al analizar el sitio web.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = () => {
    const name = draft.name.trim();
    if (!name) {
      toast.error("El nombre de la empresa es obligatorio.");
      return;
    }
    const finalCfg: EmpresaConfig = {
      ...draft,
      id: draft.id && draft.id !== "default" ? draft.id : uid(),
      name,
      tagline: draft.tagline.trim() || DEFAULT_EMPRESA.tagline,
      primaryColor: draft.primaryColor || DEFAULT_EMPRESA.primaryColor,
      accentColor: draft.accentColor || DEFAULT_EMPRESA.accentColor,
    };
    setEmpresa(finalCfg);
    setDraft(finalCfg);
    savedRef.current = true;
    toast.success(`Empresa "${finalCfg.name}" configurada correctamente.`);
    // The useEffect above will fire when `currentEmpresa` updates and will
    // call onSaved() + onOpenChange(false) at the right time.
  };

  const handleShare = async () => {
    try {
      const encoded = encodeEmpresaToUrl(draft);
      const shareUrl = `${window.location.origin}${window.location.pathname}?empresa=${encoded}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success("Link de empresa copiado al portapapeles.");
    } catch {
      toast.error("No se pudo copiar el link.");
    }
  };

  // Verifica si hay una empresa compartida en la URL al abrir
  React.useEffect(() => {
    if (!open) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const shared = params.get("empresa");
      if (shared) {
        const decoded = decodeEmpresaFromUrl(shared);
        if (decoded) {
          setDraft(decoded);
          toast.info(
            `Se cargó la empresa compartida: "${decoded.name}". Revisa y guarda.`,
          );
        }
      }
    } catch {}
  }, [open]);

  const theme = React.useMemo(() => buildCompanyTheme(draft), [draft]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && forceConfigure) {
          // No permitir cerrar si es configuración obligatoria
          return;
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rb-chat-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="w-5 h-5" style={{ color: `#${theme.primary}` }} />
            Configura tu empresa simulada
          </DialogTitle>
          <DialogDescription>
            Define el nombre, logo y colores de la empresa que usarás en todos
            los formatos. Esta información se guarda en este navegador.
          </DialogDescription>
        </DialogHeader>

        {/* Preview */}
        <div
          className="rounded-lg p-4 flex items-center gap-4 text-white shadow-inner"
          style={{
            background: `linear-gradient(135deg, ${theme.logoBg}, ${theme.logoBg}dd)`,
            border: `4px solid ${theme.logoFg}`,
          }}
        >
          <CompanyLogo empresa={draft} size={56} />
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-lg uppercase tracking-tight truncate">
              {draft.name || "Mi Empresa SAS"}
            </div>
            <div className="text-xs opacity-90 truncate">
              {draft.tagline || "Gestión de Talento Humano"}
            </div>
          </div>
          <div className="flex gap-1.5">
            <span
              className="w-7 h-7 rounded-full border-2 border-white/60"
              style={{ background: draft.primaryColor }}
              title="Color primario"
            />
            <span
              className="w-7 h-7 rounded-full border-2 border-white/60"
              style={{ background: draft.accentColor }}
              title="Color de acento"
            />
          </div>
        </div>

        {/* Datos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="emp-name">Nombre de la empresa *</Label>
            <Input
              id="emp-name"
              value={draft.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Ej: Reflejos Brillantes SAS"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emp-tagline">Eslogan</Label>
            <Input
              id="emp-tagline"
              value={draft.tagline}
              onChange={(e) => update({ tagline: e.target.value })}
              placeholder="Gestión de Talento Humano"
              className="h-10"
            />
          </div>
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <Label>Logo de la empresa</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleLogoDrop}
              className={cn(
                "sm:col-span-2 border-2 border-dashed rounded-lg p-4 flex items-center gap-3 transition-colors cursor-pointer",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 bg-muted/30",
              )}
              onClick={() => logoFileRef.current?.click()}
            >
              {draft.logo ? (
                <img
                  src={draft.logo}
                  alt="Logo actual"
                  className="w-16 h-16 object-contain bg-white border rounded p-1"
                />
              ) : (
                <div className="w-16 h-16 rounded bg-white border flex items-center justify-center">
                  <ImagePlus className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">
                  Arrastra una imagen o haz clic para subir
                </div>
                <div className="text-xs text-muted-foreground">
                  PNG o JPG · máx 1.5 MB
                </div>
                {draft.logo && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      update({ logo: "" });
                    }}
                    className="rb-no-print mt-1 text-[10px] text-destructive hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Quitar logo
                  </button>
                )}
              </div>
              <input
                ref={logoFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleLogoFile(e.target.files?.[0])}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-logo-url" className="text-xs">
                O pega la URL del logo
              </Label>
              <Input
                id="emp-logo-url"
                value={
                  draft.logo.startsWith("http")
                    ? draft.logo
                    : ""
                }
                onChange={(e) => update({ logo: e.target.value })}
                placeholder="https://..."
                className="h-10 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Colores */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Palette className="w-4 h-4" /> Colores de la empresa
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="emp-primary" className="text-xs">
                Color primario
              </Label>
              <div className="flex items-center gap-2">
                <input
                  id="emp-primary"
                  type="color"
                  value={draft.primaryColor}
                  onChange={(e) => update({ primaryColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border"
                />
                <Input
                  value={draft.primaryColor}
                  onChange={(e) => update({ primaryColor: e.target.value })}
                  className="h-10 flex-1 font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-accent" className="text-xs">
                Color de acento
              </Label>
              <div className="flex items-center gap-2">
                <input
                  id="emp-accent"
                  type="color"
                  value={draft.accentColor}
                  onChange={(e) => update({ accentColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border"
                />
                <Input
                  value={draft.accentColor}
                  onChange={(e) => update({ accentColor: e.target.value })}
                  className="h-10 flex-1 font-mono text-xs"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {PRESET_PALETTES.map((p) => {
              const active =
                draft.primaryColor.toLowerCase() === p.primary.toLowerCase() &&
                draft.accentColor.toLowerCase() === p.accent.toLowerCase();
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() =>
                    update({ primaryColor: p.primary, accentColor: p.accent })
                  }
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-semibold transition-all",
                    active
                      ? "border-foreground ring-1 ring-foreground"
                      : "border-border hover:border-primary/50",
                  )}
                  title={p.name}
                >
                  <span
                    className="w-3 h-3 rounded-full border"
                    style={{ background: p.primary }}
                  />
                  <span
                    className="w-3 h-3 rounded-full border"
                    style={{ background: p.accent }}
                  />
                  {p.name}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            {[
              { label: "Oscuro", color: darken(draft.primaryColor, 15) },
              { label: "Primario", color: draft.primaryColor },
              { label: "Claro", color: lighten(draft.primaryColor, 60) },
              { label: "Muy claro", color: lighten(draft.primaryColor, 90) },
              { label: "Acento", color: draft.accentColor },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded p-1 text-center border"
                style={{
                  background: c.color,
                  color: c.label === "Claro" || c.label === "Muy claro" ? "#1B1B1B" : "#FFF",
                }}
              >
                <div className="text-[9px] font-bold uppercase">{c.label}</div>
                <div className="text-[8px] font-mono opacity-80">{c.color}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Adaptar desde web */}
        <div className="space-y-2 border-t pt-4">
          <Label className="flex items-center gap-1.5">
            <Globe className="w-4 h-4" /> ¿Tienes una página web?
          </Label>
          <p className="text-xs text-muted-foreground">
            Pega la URL de la página de tu empresa y el sistema intentará
            extraer el nombre, logo y color dominante automáticamente.
          </p>
          <div className="flex gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://mi-empresa.com"
              className="h-10 flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAnalyzeWeb();
              }}
            />
            <Button
              type="button"
              onClick={handleAnalyzeWeb}
              disabled={analyzing}
              className="h-10"
            >
              {analyzing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-1" />
              )}
              Adaptar desde web
            </Button>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleShare}
            className="w-full sm:w-auto"
          >
            {copied ? (
              <Check className="w-4 h-4 mr-1" />
            ) : (
              <Share2 className="w-4 h-4 mr-1" />
            )}
            {copied ? "Link copiado" : "Compartir mi empresa"}
          </Button>
          <div className="text-[10px] text-muted-foreground flex-1 flex items-start gap-1 mt-2 sm:mt-0">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            <span>
              El link incluye el nombre, eslogan y colores (no el logo si es
              muy grande). Pégalo en otro navegador para replicar la
              configuración.
            </span>
          </div>
          <Button
            type="button"
            onClick={handleSave}
            className="w-full sm:w-auto"
            style={{
              background: `#${theme.accent}`,
              color: "#1B1B1B",
            }}
          >
            <Check className="w-4 h-4 mr-1" /> Guardar empresa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import {
  ImagePlus,
  Trash2,
  Printer,
  Download,
  Upload,
  Eraser,
  RotateCcw,
  Settings2,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getCompanyTheme, type CompanyId } from "@/lib/analysis";
import {
  LOGO_LS_KEY,
  COMPANY_NAME_LS_KEY,
} from "@/components/sigth/gestion/formats-catalog";
import { DocHeaderEditor } from "@/components/sigth/gestion/DocHeaderEditor";

/* ------------------------------------------------------------------ */
/*  Shared hooks for logo + company name persistence                  */
/* ------------------------------------------------------------------ */

export function useSharedLogo() {
  const [logo, setLogo] = React.useState<string>("");
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    try {
      const v = window.localStorage.getItem(LOGO_LS_KEY);
      if (v) setLogo(v);
    } catch {}
    setLoaded(true);
  }, []);

  const save = React.useCallback((value: string) => {
    setLogo(value);
    try {
      if (value) window.localStorage.setItem(LOGO_LS_KEY, value);
      else window.localStorage.removeItem(LOGO_LS_KEY);
    } catch {}
  }, []);

  const remove = React.useCallback(() => save(""), [save]);

  return { logo, save, remove, loaded };
}

export function useSharedCompanyName(defaultName: string) {
  const [name, setName] = React.useState<string>(defaultName);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    try {
      const v = window.localStorage.getItem(COMPANY_NAME_LS_KEY);
      if (v) setName(v);
      else setName(defaultName);
    } catch {
      setName(defaultName);
    }
    setLoaded(true);
  }, [defaultName]);

  const save = React.useCallback((value: string) => {
    setName(value);
    try {
      window.localStorage.setItem(COMPANY_NAME_LS_KEY, value);
    } catch {}
  }, []);

  return { name, save, loaded };
}

/* ------------------------------------------------------------------ */
/*  useFormatData hook — persists any JSON data per format            */
/* ------------------------------------------------------------------ */

export function useFormatData<T>(
  formatId: string,
  initial: T | (() => T),
): [T, (next: T | ((prev: T) => T)) => void, () => void, boolean] {
  const [data, setData] = React.useState<T>(() =>
    typeof initial === "function" ? (initial as () => T)() : initial,
  );
  const [loaded, setLoaded] = React.useState(false);

  // Load from LocalStorage on mount
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`sigth-gestion-format-${formatId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        setData(parsed as T);
      }
    } catch {}
    setLoaded(true);
  }, [formatId]);

  // Auto-save on change (after initial load)
  React.useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(
        `sigth-gestion-format-${formatId}`,
        JSON.stringify(data),
      );
    } catch {}
  }, [formatId, data, loaded]);

  const reset = React.useCallback(() => {
    const fresh = typeof initial === "function" ? (initial as () => T)() : initial;
    setData(fresh as T);
  }, [initial]);

  return [data, setData, reset, loaded];
}

/* ------------------------------------------------------------------ */
/*  FormatShell — shared layout for every interactive format          */
/* ------------------------------------------------------------------ */

export interface FormatShellProps {
  /** Format code, e.g. "TH-01" */
  formatId: string;
  /** Display title, e.g. "Requisición de Personal" */
  formatName: string;
  /** Document version, e.g. "02" */
  version?: string;
  /** Date shown in the header, e.g. "26/10/2025" */
  date?: string;
  company: CompanyId;
  /** Triggered when "Restablecer" is clicked. */
  onReset: () => void;
  /** Triggered when "Exportar" is clicked — by default downloads JSON of `exportData`. */
  exportData?: unknown;
  /** Triggered when "Importar" is clicked — receives the parsed JSON. */
  onImport?: (data: unknown) => void;
  children: React.ReactNode;
  className?: string;
}

export function FormatShell({
  formatId,
  formatName,
  version = "02",
  date = "26/10/2025",
  company,
  onReset,
  exportData,
  onImport,
  children,
  className,
}: FormatShellProps) {
  const theme = getCompanyTheme(company);
  const { logo, save: saveLogo, remove: removeLogo } = useSharedLogo();
  // Usar empresa dinámica del contexto si está disponible
  let empresaName = theme.name;
  let empresaTagline = "Sistema de Gestión de Talento Humano";
  try {
    // Intentar leer la empresa del localStorage
    if (typeof window !== "undefined") {
      const cfg = window.localStorage.getItem("sigth-empresa-config");
      if (cfg) {
        const parsed = JSON.parse(cfg);
        if (parsed.name) empresaName = parsed.name;
        if (parsed.tagline) empresaTagline = parsed.tagline;
      }
    }
  } catch {}
  const { name: companyName, save: saveCompanyName } = useSharedCompanyName(empresaName);
  const fileLogoRef = React.useRef<HTMLInputElement>(null);
  const fileImportRef = React.useRef<HTMLInputElement>(null);
  const [editingCompany, setEditingCompany] = React.useState(false);
  const [tempName, setTempName] = React.useState(companyName);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      toast.error("La imagen pesa más de 1.5 MB. Reduce el tamaño e inténtalo de nuevo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      saveLogo(String(reader.result || ""));
      toast.success("Logo cargado correctamente");
    };
    reader.onerror = () => toast.error("No se pudo leer la imagen.");
    reader.readAsDataURL(file);
    // reset input so the same file can be re-selected
    e.target.value = "";
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    try {
      const payload = exportData ?? {};
      const json = JSON.stringify(
        { formatId, formatName, version, date, exportedAt: new Date().toISOString(), data: payload },
        null,
        2,
      );
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${formatId}_${formatName.replace(/\s+/g, "_")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Datos exportados a ${a.download}`);
    } catch (err) {
      toast.error("Error al exportar los datos");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        if (parsed && typeof parsed === "object" && "data" in parsed) {
          onImport?.((parsed as { data: unknown }).data);
          toast.success(`Datos importados en ${formatId}`);
        } else {
          onImport?.(parsed);
          toast.success(`Datos importados en ${formatId}`);
        }
      } catch (err) {
        toast.error("El archivo JSON no es válido");
      }
    };
    reader.onerror = () => toast.error("No se pudo leer el archivo");
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleReset = () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `¿Restablecer el formato ${formatId}? Se perderán todos los datos cargados en este formulario.`,
      )
    )
      return;
    onReset();
    toast.success(`Formato ${formatId} restablecido`);
  };

  const applyCompanyName = () => {
    saveCompanyName(tempName.trim() || theme.name);
    setEditingCompany(false);
    toast.success("Nombre de empresa actualizado");
  };

  const headerBg = `linear-gradient(135deg, #${theme.dark}, #${theme.dark}cc)`;
  const accentColor = `#${theme.accent}`;

  return (
    <div
      className={cn(
        "rb-gestion-format bg-white text-foreground border rounded-lg overflow-hidden shadow-sm",
        className,
      )}
      style={{ borderColor: `#${theme.primary}33` }}
    >
      {/* ============ Header ============ */}
      <div
        className="rb-gestion-header px-4 sm:px-6 py-4 text-white flex flex-wrap items-start gap-4 justify-between"
        style={{ background: headerBg }}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Logo uploader / preview */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileLogoRef.current?.click()}
              className="rb-no-print group relative w-20 h-20 rounded-md bg-white/15 border-2 border-dashed border-white/40 flex items-center justify-center overflow-hidden hover:bg-white/25 transition-colors"
              title="Subir logo"
            >
              {logo ? (
                <img
                  src={logo}
                  alt="Logo empresa"
                  className="w-full h-full object-contain bg-white p-1"
                />
              ) : (
                <div className="flex flex-col items-center text-white/80">
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-[9px] mt-0.5 font-semibold">SUBIR LOGO</span>
                </div>
              )}
            </button>
            {logo && (
              <button
                type="button"
                onClick={removeLogo}
                className="rb-no-print text-[9px] text-white/80 hover:text-white flex items-center gap-0.5"
                title="Quitar logo"
              >
                <Trash2 className="w-3 h-3" /> Quitar
              </button>
            )}
            <input
              ref={fileLogoRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>

          {/* Company name + format title */}
          <div className="flex-1 min-w-0">
            {editingCompany ? (
              <div className="flex items-center gap-2 mb-1">
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="bg-white text-foreground h-7 text-sm max-w-[280px]"
                  placeholder="EMPRESA S.A.S."
                />
                <button onClick={applyCompanyName} className="p-1 rounded hover:bg-white/20">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setTempName(companyName);
                    setEditingCompany(false);
                  }}
                  className="p-1 rounded hover:bg-white/20"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                className="text-base sm:text-xl font-extrabold tracking-tight uppercase"
                style={{ color: accentColor }}
              >
                {companyName || theme.name}
              </div>
            )}
            <div className="text-xs sm:text-sm font-semibold opacity-90">
              {empresaTagline}
            </div>
            <div
              className="mt-2 text-sm sm:text-lg font-bold"
              style={{ color: accentColor }}
            >
              {formatId} · {formatName}
            </div>
          </div>
        </div>

        {/* Meta column (editable code/version/date/page + authors) */}
        <div className="text-right">
          <DocHeaderEditor formatId={formatId} defaultCodigo={formatId} />
        </div>
      </div>

      {/* ============ Body ============ */}
      <div className="px-4 sm:px-6 py-5 bg-white text-foreground">{children}</div>

      {/* ============ Action buttons ============ */}
      <div
        className="rb-no-print border-t px-4 sm:px-6 py-3 bg-muted/40 flex flex-wrap items-center gap-2"
        style={{ borderColor: `#${theme.primary}22` }}
      >
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setTempName(companyName);
            setEditingCompany((v) => !v);
          }}
        >
          <Settings2 className="w-3.5 h-3.5 mr-1" /> Personalizar
        </Button>
        <Button size="sm" variant="outline" onClick={handlePrint}>
          <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir
        </Button>
        <Button size="sm" variant="outline" onClick={handleExport}>
          <Download className="w-3.5 h-3.5 mr-1" /> Exportar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileImportRef.current?.click()}
        >
          <Upload className="w-3.5 h-3.5 mr-1" /> Importar
        </Button>
        <input
          ref={fileImportRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImport}
          className="hidden"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            onReset();
            toast.success(`Formulario ${formatId} limpiado`);
          }}
        >
          <Eraser className="w-3.5 h-3.5 mr-1" /> Limpiar
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleReset}
          className="ml-auto"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restablecer
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small reusable building blocks for formats                        */
/* ------------------------------------------------------------------ */

export function SectionTitle({
  children,
  n,
  accent,
}: {
  children: React.ReactNode;
  n?: number;
  accent?: string;
}) {
  return (
    <div
      className="flex items-center gap-2 mb-3 px-3 py-2 rounded text-white font-bold text-sm uppercase tracking-tight"
      style={{ background: accent ?? "#2C3E50" }}
    >
      {n != null && (
        <span className="bg-white/20 w-6 h-6 flex items-center justify-center rounded text-xs">
          {n}
        </span>
      )}
      <span>{children}</span>
    </div>
  );
}

export function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="text-xs font-semibold text-foreground/80 mb-1 block">
      {children} {required && <span className="text-destructive">*</span>}
    </Label>
  );
}

export function SignatureArea({
  label,
  data,
  onChange,
}: {
  label: string;
  data: { name: string; role: string; signature: string };
  onChange: (next: { name: string; role: string; signature: string }) => void;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800_000) {
      toast.error("La firma pesa más de 800 KB. Reduce el tamaño.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange({ ...data, signature: String(reader.result || "") });
    reader.onerror = () => toast.error("No se pudo leer la firma.");
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="border rounded p-3 text-center bg-background">
      <div className="text-xs font-bold text-foreground/70 mb-2 uppercase tracking-wide">{label}</div>
      <div className="h-16 flex items-center justify-center border-b border-dashed border-foreground/40 relative">
        {data.signature ? (
          <img
            src={data.signature}
            alt="Firma"
            className="max-h-14 max-w-[180px] object-contain"
          />
        ) : (
          <span className="text-[10px] text-muted-foreground italic">Espacio para firma</span>
        )}
      </div>
      <Input
        placeholder="Nombre completo"
        value={data.name}
        onChange={(e) => onChange({ ...data, name: e.target.value })}
        className="mt-2 h-8 text-xs"
      />
      <Input
        placeholder="Cargo"
        value={data.role}
        onChange={(e) => onChange({ ...data, role: e.target.value })}
        className="mt-1 h-8 text-xs"
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="rb-no-print mt-2 text-[10px] text-primary hover:underline flex items-center gap-1 mx-auto"
      >
        <ImagePlus className="w-3 h-3" /> Subir firma
      </button>
      {data.signature && (
        <button
          type="button"
          onClick={() => onChange({ ...data, signature: "" })}
          className="rb-no-print mt-1 text-[10px] text-destructive hover:underline flex items-center gap-1 mx-auto"
        >
          <Trash2 className="w-3 h-3" /> Quitar
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
}

export function DynamicTableButton({
  onAdd,
  label = "+ Fila",
  variant = "outline",
}: {
  onAdd: () => void;
  label?: string;
  variant?: "outline" | "default";
}) {
  return (
    <Button size="sm" variant={variant} onClick={onAdd} type="button" className="text-xs h-7">
      {label}
    </Button>
  );
}

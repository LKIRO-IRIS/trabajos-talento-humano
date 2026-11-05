"use client";

import * as React from "react";
import { Pencil, Check, X, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface DocHeaderFields {
  codigo: string;
  version: string;
  fecha: string;
  pagina: string;
  elaboradoPor: string;
  revisadoPor: string;
  aprobadoPor: string;
}

const GLOBAL_LS_KEY = "sigth-gestion-doc-header";
const PER_FORMAT_LS_PREFIX = "sigth-gestion-format-";
const PER_FORMAT_LS_SUFFIX = "-header";

const DEFAULT_FIELDS: DocHeaderFields = {
  codigo: "",
  version: "02",
  fecha: "26/10/2025",
  pagina: "1 de 1",
  elaboradoPor: "",
  revisadoPor: "",
  aprobadoPor: "",
};

/**
 * Hook: returns merged header fields + setters + per-format toggle.
 *
 * Storage layout:
 *  - Global:  `sigth-gestion-doc-header` → DocHeaderFields (full object)
 *  - Per-format: `sigth-gestion-format-{formatId}-header`
 *      → { fields: Partial<DocHeaderFields>, enabled: boolean }
 *
 * When `enabled` is true (per-format mode), the per-format `fields` overrides
 * the global ones (field-by-field). When false, only the global fields are
 * used (the per-format fields are preserved in localStorage for re-enabling
 * later but not shown).
 */
export function useDocHeader(formatId: string) {
  const [globalFields, setGlobalFields] =
    React.useState<DocHeaderFields>(DEFAULT_FIELDS);
  const [perFormatFields, setPerFormatFields] = React.useState<
    Partial<DocHeaderFields>
  >({});
  const [usePerFormat, setUsePerFormat] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    try {
      const g = window.localStorage.getItem(GLOBAL_LS_KEY);
      if (g) setGlobalFields({ ...DEFAULT_FIELDS, ...JSON.parse(g) });
      const p = window.localStorage.getItem(
        `${PER_FORMAT_LS_PREFIX}${formatId}${PER_FORMAT_LS_SUFFIX}`,
      );
      if (p) {
        const parsed = JSON.parse(p);
        setPerFormatFields(parsed.fields || {});
        setUsePerFormat(parsed.enabled === true);
      }
    } catch {}
    setLoaded(true);
  }, [formatId]);

  // Persist global (skip the dispatch to avoid loops with the listener below)
  React.useEffect(() => {
    if (!loaded) return;
    try {
      const current = window.localStorage.getItem(GLOBAL_LS_KEY);
      const next = JSON.stringify(globalFields);
      if (current !== next) {
        window.localStorage.setItem(GLOBAL_LS_KEY, next);
        window.dispatchEvent(new CustomEvent("sigth-doc-header-changed"));
      }
    } catch {}
  }, [globalFields, loaded]);

  // Persist per-format
  React.useEffect(() => {
    if (!loaded) return;
    try {
      const payload = JSON.stringify({ fields: perFormatFields, enabled: usePerFormat });
      const key = `${PER_FORMAT_LS_PREFIX}${formatId}${PER_FORMAT_LS_SUFFIX}`;
      if (window.localStorage.getItem(key) !== payload) {
        window.localStorage.setItem(key, payload);
      }
    } catch {}
  }, [formatId, perFormatFields, usePerFormat, loaded]);

  // Listen for global changes from other format instances.
  // IMPORTANT: only update if the JSON actually changed, to avoid loops.
  React.useEffect(() => {
    const refresh = () => {
      try {
        const g = window.localStorage.getItem(GLOBAL_LS_KEY);
        if (!g) return;
        const parsed = JSON.parse(g);
        setGlobalFields((prev) => {
          const same = JSON.stringify(prev) === JSON.stringify({ ...DEFAULT_FIELDS, ...parsed });
          return same ? prev : { ...DEFAULT_FIELDS, ...parsed };
        });
      } catch {}
    };
    window.addEventListener("sigth-doc-header-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("sigth-doc-header-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const merged: DocHeaderFields = usePerFormat
    ? { ...globalFields, ...perFormatFields }
    : globalFields;

  const updateField = (key: keyof DocHeaderFields, value: string) => {
    if (usePerFormat) {
      setPerFormatFields((p) => ({ ...p, [key]: value }));
    } else {
      setGlobalFields((g) => ({ ...g, [key]: value }));
    }
  };

  const resetPerFormat = () => {
    setPerFormatFields({});
    setUsePerFormat(false);
    toast.success("Este formato vuelve a usar la cabecera global");
  };

  return {
    fields: merged,
    updateField,
    usePerFormat,
    setUsePerFormat,
    resetPerFormat,
    setGlobalFields,
    loaded,
  };
}

/**
 * DocHeaderEditor — inline-editable document header shown at the top-right of
 * every FormatShell. Renders compact code/version/date/page fields plus the
 * author/reviewer/approver trio. A "Personalizar este formato" toggle
 * switches between global (shared across formats) and per-format overrides.
 */
export function DocHeaderEditor({
  formatId,
  defaultCodigo,
}: {
  formatId: string;
  defaultCodigo?: string;
}) {
  const {
    fields,
    updateField,
    usePerFormat,
    setUsePerFormat,
    resetPerFormat,
    setGlobalFields,
    loaded,
  } = useDocHeader(formatId);
  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => {
    // Only run once, after initial load, to ensure codigo has a sensible default
    if (!loaded) return;
    setGlobalFields((prev) => {
      if (prev.codigo) return prev;
      const fallback = defaultCodigo || formatId;
      if (prev.codigo === fallback) return prev;
      return { ...prev, codigo: fallback };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const display: DocHeaderFields = {
    ...fields,
    codigo: fields.codigo || defaultCodigo || formatId,
  };

  // Helper to render either an input (editing) or a static value
  const renderField = (
    key: keyof DocHeaderFields,
    label: string,
    value: string,
    wide = false,
  ) => (
    <div className={cn("flex items-center gap-1.5", wide && "col-span-2")}>
      <span className="opacity-70 text-[10px] uppercase tracking-wider whitespace-nowrap">
        {label}:
      </span>
      {editing ? (
        <Input
          value={value}
          onChange={(e) => updateField(key, e.target.value)}
          className="h-6 text-xs px-1.5 py-0 max-w-[180px]"
        />
      ) : (
        <span className="font-bold text-xs">{value || "—"}</span>
      )}
    </div>
  );

  return (
    <div className="bg-white/10 rounded px-3 py-2 border border-white/15 text-[11px] sm:text-xs">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span className="opacity-70 text-[10px] uppercase tracking-wider whitespace-nowrap">
          Cabecera del documento
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[10px] cursor-pointer whitespace-nowrap">
            <Switch
              checked={usePerFormat}
              onCheckedChange={setUsePerFormat}
              className="scale-75"
            />
            <span>Personalizar este formato</span>
          </label>
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="p-1 rounded hover:bg-white/20"
                title="Guardar"
                aria-label="Guardar cabecera"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  if (usePerFormat) resetPerFormat();
                }}
                className="p-1 rounded hover:bg-white/20"
                title="Cancelar y restaurar"
                aria-label="Cancelar edición"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="p-1 rounded hover:bg-white/20"
              title="Editar cabecera"
              aria-label="Editar cabecera"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
          {usePerFormat && (
            <button
              onClick={resetPerFormat}
              className="p-1 rounded hover:bg-white/20"
              title="Volver a cabecera global"
              aria-label="Restablecer al global"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1">
        {renderField("codigo", "Código", display.codigo)}
        {renderField("version", "Versión", display.version)}
        {renderField("fecha", "Fecha", display.fecha)}
        {renderField("pagina", "Página", display.pagina)}
        {renderField(
          "elaboradoPor",
          "Elaborado por",
          display.elaboradoPor,
          true,
        )}
        {renderField(
          "revisadoPor",
          "Revisado por",
          display.revisadoPor,
          true,
        )}
        {renderField(
          "aprobadoPor",
          "Aprobado por",
          display.aprobadoPor,
          true,
        )}
      </div>
    </div>
  );
}

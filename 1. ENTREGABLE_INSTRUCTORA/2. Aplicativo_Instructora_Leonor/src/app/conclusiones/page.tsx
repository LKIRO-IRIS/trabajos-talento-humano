"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  FileText,
  Lightbulb,
  BarChart3,
  Target,
  CalendarClock,
  CheckSquare,
  FileDown,
  PenLine,
  ChevronRight,
  Save,
  Trash2,
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuthContext } from "@/components/auth/auth-context";
import { useEvaluaciones } from "@/hooks/use-evaluaciones";
import { useConfig } from "@/hooks/use-config";
import { AREAS_ORGANIZACIONALES, type TipoCompetencia } from "@/lib/types";
import { analizarDatos } from "@/lib/evaluacion";
import {
  loadConclusiones,
  saveConclusiones,
} from "@/lib/storage";
import { downloadBlob, formatDate, formatScore } from "@/lib/utils";
import type { Conclusion } from "@/lib/types";

const AREA_IDS = ["analisis", "competencias", "plan", "finales"] as const;
type AreaId = (typeof AREA_IDS)[number];

const AREAS_CONFIG: Record<
  AreaId,
  {
    label: string;
    pregunta: string;
    placeholder: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    color: string;
  }
> = {
  analisis: {
    label: "Análisis por Área",
    pregunta: "¿Qué áreas están más fuertes y cuáles más débiles? ¿Por qué?",
    placeholder:
      "Describe aquí cuáles áreas tienen el mejor desempeño y cuáles necesitan atención. Explica las posibles causas (liderazgo, procesos, recursos, capacitación, etc.).",
    icon: BarChart3,
    color: "#0D9488",
  },
  competencias: {
    label: "Análisis de Competencias",
    pregunta:
      "¿Qué tipo de competencia es la más fuerte/débil? ¿Cómo se relacionan entre sí?",
    placeholder:
      "Analiza cuál competencia (técnicas, blandas u organizacionales) es la más fuerte y cuál la más débil. Explica cómo se relacionan entre sí.",
    icon: Target,
    color: "#9333EA",
  },
  plan: {
    label: "Plan de Mejora",
    pregunta:
      "¿Qué acciones recomiendas para mejorar las áreas/competencias más débiles?",
    placeholder:
      "Propón acciones concretas (capacitación, mentoría, reorganización, controles, etc.) para las áreas y competencias con bajo desempeño.",
    icon: CalendarClock,
    color: "#F59E0B",
  },
  finales: {
    label: "Conclusiones Finales",
    pregunta: "Síntesis del análisis completo",
    placeholder:
      "Sintetiza el análisis completo: hallazgos principales, recomendaciones estratégicas y proyección a futuro.",
    icon: CheckSquare,
    color: "#16A34A",
  },
};

export default function ConclusionesPage() {
  const { user, requireAuth } = useAuthContext();
  const { config } = useConfig();
  const { empleados, visibles } = useEvaluaciones(user, config?.criterios ?? []);
  const criterios = config?.criterios ?? [];

  // Cargar conclusiones desde localStorage
  const [conclusiones, setConclusiones] = useState<Record<string, Conclusion>>({});
  // Borrador local: lo que el usuario está escribiendo (no guardado aún)
  const [draft, setDraft] = useState<Record<AreaId, string>>({
    analisis: "",
    competencias: "",
    plan: "",
    finales: "",
  });
  const [savedHint, setSavedHint] = useState<Record<AreaId, string>>({
    analisis: "",
    competencias: "",
    plan: "",
    finales: "",
  });
  // Área actualmente abierta en el modal (null = modal cerrado)
  const [activeArea, setActiveArea] = useState<AreaId | null>(null);
  const [exporting, setExporting] = useState(false);

  // Cargar al montar
  useEffect(() => {
    const loaded = loadConclusiones();
    setConclusiones(loaded);
    setDraft({
      analisis: loaded.analisis?.texto ?? "",
      competencias: loaded.competencias?.texto ?? "",
      plan: loaded.plan?.texto ?? "",
      finales: loaded.finales?.texto ?? "",
    });
  }, []);

  // Escuchar cambios externos (otras tabs)
  useEffect(() => {
    const handler = () => {
      const loaded = loadConclusiones();
      setConclusiones(loaded);
    };
    window.addEventListener("app-leonor:conclusiones-changed", handler);
    return () =>
      window.removeEventListener("app-leonor:conclusiones-changed", handler);
  }, []);

  const analisis = useMemo(
    () =>
      analizarDatos(empleados, visibles, criterios, AREAS_ORGANIZACIONALES),
    [empleados, visibles, criterios]
  );

  const resumenes = useMemo(
    () => buildResumenesAutomaticos(analisis),
    [analisis]
  );

  // Debounce: guarda automáticamente 1.5s después del último cambio
  const saveTimers = useRef<Record<AreaId, ReturnType<typeof setTimeout> | null>>({
    analisis: null,
    competencias: null,
    plan: null,
    finales: null,
  });

  const saveNow = useCallback(
    (areaId: AreaId, texto: string) => {
      const persist = () => {
        const all = loadConclusiones();
        const nueva: Conclusion = {
          areaId,
          texto,
          ultimaEdicion: new Date().toISOString(),
        };
        all[areaId] = nueva;
        saveConclusiones(all);
        setConclusiones(all);
        setSavedHint((prev) => ({
          ...prev,
          [areaId]: `Guardado ${formatDate(nueva.ultimaEdicion)}`,
        }));
      };
      // requireAuth abre modal si no hay sesión; si la hay, persiste directamente
      requireAuth(persist);
    },
    [requireAuth]
  );

  const handleChange = (areaId: AreaId, value: string) => {
    setDraft((prev) => ({ ...prev, [areaId]: value }));
    setSavedHint((prev) => ({ ...prev, [areaId]: "Editando…" }));
    if (saveTimers.current[areaId]) {
      clearTimeout(saveTimers.current[areaId]!);
    }
    saveTimers.current[areaId] = setTimeout(() => {
      saveNow(areaId, value);
    }, 1500);
  };

  const handleManualSave = (areaId: AreaId) => {
    if (saveTimers.current[areaId]) {
      clearTimeout(saveTimers.current[areaId]!);
      saveTimers.current[areaId] = null;
    }
    saveNow(areaId, draft[areaId]);
    toast.success(`Sección "${AREAS_CONFIG[areaId].label}" guardada.`);
  };

  // Limpiar timers al desmontar
  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach((t) => t && clearTimeout(t));
    };
  }, []);

  // Insertar texto en el área indicada (modal)
  const insertText = (texto: string, areaId: AreaId) => {
    const current = draft[areaId];
    const next = current ? `${current}\n\n${texto}` : texto;
    handleChange(areaId, next);
    toast.success(`Texto insertado en "${AREAS_CONFIG[areaId].label}".`);
  };

  // Limpiar área indicada (modal)
  const clearArea = (areaId: AreaId) => {
    handleChange(areaId, "");
    toast.info(`Área "${AREAS_CONFIG[areaId].label}" vaciada.`);
  };

  // Word count
  const wordCount = (text: string): number => {
    const t = text.trim();
    if (!t) return 0;
    return t.split(/\s+/).length;
  };

  // Stats globales
  const totalPalabras = AREA_IDS.reduce(
    (a, id) => a + wordCount(draft[id]),
    0
  );
  const totalSecciones = AREA_IDS.filter((id) => draft[id].trim().length > 0)
    .length;

  // Exportar PDF
  const exportarPDF = async () => {
    if (totalSecciones === 0) {
      toast.error("Escribe al menos una conclusión antes de exportar.");
      return;
    }
    setExporting(true);
    try {
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "conclusiones",
          empresa: config?.nombre ?? "Evaluación de Desempeño",
          conclusiones: AREA_IDS.map((id) => ({
            areaId: id,
            areaLabel: AREAS_CONFIG[id].label,
            pregunta: AREAS_CONFIG[id].pregunta,
            texto: draft[id],
            ultimaEdicion: conclusiones[id]?.ultimaEdicion ?? "",
          })),
          analisis: {
            areaMejor: analisis.areaMejor?.area ?? "—",
            areaMejorPromedio: analisis.areaMejor?.promedioGeneral ?? 0,
            areaPeor: analisis.areaPeor?.area ?? "—",
            areaPeorPromedio: analisis.areaPeor?.promedioGeneral ?? 0,
            tipoMasFuerte: LABEL_TIPO[analisis.tipoMasFuerte],
            tipoMasDebil: LABEL_TIPO[analisis.tipoMasDebil],
            promedioGeneral: analisis.promedioGeneral,
            totalEvaluados: analisis.totalEvaluados,
            porArea: analisis.porArea.map((a) => ({
              area: a.area,
              tecnica: a.promedioPorTipo.tecnica,
              blanda: a.promedioPorTipo.blanda,
              organizacional: a.promedioPorTipo.organizacional,
              promedio: a.promedioGeneral,
              total: a.totalEmpleados,
            })),
          },
        }),
      });
      if (!res.ok) throw new Error("Error");
      const blob = await res.blob();
      downloadBlob(blob, "Informe_Conclusiones.pdf");
      toast.success("PDF generado correctamente.");
    } catch {
      toast.error("No se pudo generar el PDF.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10">
                  <FileText className="h-6 w-6 text-brand" />
                </span>
                Conclusiones
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground">
                Redacta tus conclusiones a partir del análisis. Cada sección se
                abre en su propio editor amplio, con sugerencias automáticas
                generadas desde la página de Análisis.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="gap-2">
                <Link href="/analisis">
                  <BarChart3 className="h-4 w-4" />
                  Ver Análisis
                </Link>
              </Button>
              <Button
                onClick={exportarPDF}
                disabled={exporting}
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                {exporting ? "Generando…" : "Exportar a PDF"}
              </Button>
            </div>
          </div>

          {/* Resumen global */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              <Save className="h-3.5 w-3.5" />
              {totalPalabras} palabras en total
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              {totalSecciones}/{AREA_IDS.length} secciones redactadas
            </Badge>
            <span className="text-xs text-muted-foreground">
              Auto-guardado activo · se requiere sesión para persistir
            </span>
          </div>
        </div>

        {/* Grid 2×2 de tarjetas */}
        <div className="grid gap-6 sm:grid-cols-2">
          {AREA_IDS.map((id) => {
            const Icon = AREAS_CONFIG[id].icon;
            const texto = draft[id];
            const wc = wordCount(texto);
            const trimmed = texto.trim();
            const preview = trimmed.slice(0, 160);
            const hasMore = trimmed.length > 160;
            return (
              <Card
                key={id}
                role="button"
                tabIndex={0}
                onClick={() => setActiveArea(id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveArea(id);
                  }
                }}
                className="group relative cursor-pointer overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {/* Banda superior de color */}
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: AREAS_CONFIG[id].color }}
                />
                <CardHeader className="space-y-4 p-6 pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: `${AREAS_CONFIG[id].color}1A`,
                      }}
                    >
                      <Icon
                        className="h-7 w-7"
                        style={{ color: AREAS_CONFIG[id].color }}
                      />
                    </div>
                    <Badge
                      variant={wc > 0 ? "default" : "outline"}
                      className="gap-1 px-2.5 py-1"
                    >
                      {wc} {wc === 1 ? "palabra" : "palabras"}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    <CardTitle className="text-xl leading-tight">
                      {AREAS_CONFIG[id].label}
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {AREAS_CONFIG[id].pregunta}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-6 pt-3">
                  <div className="min-h-[5rem] rounded-lg border bg-muted/30 p-3">
                    {preview ? (
                      <p className="line-clamp-3 text-sm leading-relaxed text-foreground/80">
                        {preview}
                        {hasMore ? "…" : ""}
                      </p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">
                        Sin redactar — haz clic para empezar a escribir.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{savedHint[id] || "Sin cambios"}</span>
                    <span className="flex items-center gap-1 font-medium text-foreground transition-colors group-hover:text-brand">
                      Abrir editor
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Estadísticas clave del análisis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-brand" />
              Estadísticas clave del análisis
            </CardTitle>
            <CardDescription>
              Datos contextuales generados desde la página de Análisis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-2.5 text-sm">
                <Row label="Promedio general">
                  <span className="font-bold">
                    {formatScore(analisis.promedioGeneral)}
                  </span>
                </Row>
                <Row label="Empleados evaluados">
                  <span className="font-bold">{analisis.totalEvaluados}</span>
                </Row>
                <Row label="Áreas analizadas">
                  <span className="font-bold">
                    {AREAS_ORGANIZACIONALES.length}
                  </span>
                </Row>
                <Separator className="my-3" />
                <Row label="Área más fuerte">
                  <span className="font-medium">
                    {analisis.areaMejor?.area ?? "—"}
                  </span>
                </Row>
                <Row label="Área a mejorar">
                  <span className="font-medium">
                    {analisis.areaPeor?.area ?? "—"}
                  </span>
                </Row>
                <Row label="Competencia más fuerte">
                  <span className="font-medium">
                    {LABEL_TIPO[analisis.tipoMasFuerte]}
                  </span>
                </Row>
                <Row label="Competencia más débil">
                  <span className="font-medium">
                    {LABEL_TIPO[analisis.tipoMasDebil]}
                  </span>
                </Row>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Distribución de competencias blandas
                </p>
                <div className="space-y-2.5">
                  <DistRow
                    label="Sobresaliente"
                    value={analisis.distribucionBlandas.sobresaliente}
                    total={analisis.totalEvaluados}
                    color="#16A34A"
                  />
                  <DistRow
                    label="Satisfactorio"
                    value={analisis.distribucionBlandas.satisfactorio}
                    total={analisis.totalEvaluados}
                    color="#2563EB"
                  />
                  <DistRow
                    label="Necesita Mejora"
                    value={analisis.distribucionBlandas.necesitaMejora}
                    total={analisis.totalEvaluados}
                    color="#F59E0B"
                  />
                  <DistRow
                    label="Insatisfactorio"
                    value={analisis.distribucionBlandas.insatisfactorio}
                    total={analisis.totalEvaluados}
                    color="#DC2626"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal de edición */}
        <Dialog
          open={activeArea !== null}
          onOpenChange={(open) => {
            if (!open) setActiveArea(null);
          }}
        >
          <DialogContent className="flex max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl max-h-[90vh]">
            {activeArea && (
              <>
                {/* Header del modal */}
                <DialogHeader className="shrink-0 gap-0 border-b p-6 pb-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: `${AREAS_CONFIG[activeArea].color}1A`,
                      }}
                    >
                      {(() => {
                        const Icon = AREAS_CONFIG[activeArea].icon;
                        return (
                          <Icon
                            className="h-6 w-6"
                            style={{ color: AREAS_CONFIG[activeArea].color }}
                          />
                        );
                      })()}
                    </div>
                    <div className="space-y-1">
                      <DialogTitle className="text-2xl leading-tight">
                        {AREAS_CONFIG[activeArea].label}
                      </DialogTitle>
                      <DialogDescription className="text-sm leading-relaxed">
                        {AREAS_CONFIG[activeArea].pregunta}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                {/* Cuerpo: 2 columnas (60% editor / 40% sugerencias) */}
                <div className="grid flex-1 gap-6 overflow-y-auto p-6 md:grid-cols-[3fr_2fr]">
                  {/* Columna izquierda: Editor */}
                  <div className="flex flex-col gap-3">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <PenLine className="h-4 w-4 text-brand" />
                      Tu redacción
                    </Label>
                    <Textarea
                      value={draft[activeArea]}
                      onChange={(e) =>
                        handleChange(activeArea, e.target.value)
                      }
                      placeholder={AREAS_CONFIG[activeArea].placeholder}
                      rows={14}
                      className="min-h-[18rem] flex-1 resize-y text-sm leading-relaxed"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      {wordCount(draft[activeArea])} palabras ·{" "}
                      {savedHint[activeArea] || "Sin cambios"}
                    </p>
                  </div>

                  {/* Columna derecha: Sugerencias automáticas */}
                  <div className="flex min-h-0 flex-col gap-3">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Sugerencias automáticas
                    </Label>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Pulsa &quot;Insertar&quot; para añadir la frase al final
                      de tu redacción.
                    </p>
                    <div className="flex flex-col gap-2.5 overflow-y-auto pr-1">
                      {resumenes.map((r, i) => (
                        <div
                          key={i}
                          className="rounded-lg border bg-muted/30 p-3 text-xs"
                        >
                          <p className="leading-relaxed">{r}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 h-7 gap-1 text-xs"
                            onClick={() => insertText(r, activeArea)}
                          >
                            <ChevronRight className="h-3 w-3" />
                            Insertar
                          </Button>
                        </div>
                      ))}
                      {resumenes.length === 0 && (
                        <p className="text-xs italic text-muted-foreground">
                          No hay sugerencias disponibles todavía.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer: contador + acciones */}
                <DialogFooter className="flex shrink-0 flex-row items-center justify-between gap-3 border-t p-6 pt-4 sm:justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => clearArea(activeArea)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Limpiar
                  </Button>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="gap-1 px-2.5 py-1">
                      {wordCount(draft[activeArea])} palabras
                    </Badge>
                    <Button
                      onClick={() => {
                        handleManualSave(activeArea);
                        setActiveArea(null);
                      }}
                      className="gap-1.5"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Guardar y cerrar
                    </Button>
                  </div>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

/* ===================== Helpers ===================== */

const LABEL_TIPO: Record<TipoCompetencia, string> = {
  tecnica: "Técnicas",
  blanda: "Blandas",
  organizacional: "Organizacionales",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function DistRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-sm"
        style={{ backgroundColor: color }}
      />
      <span className="flex-1">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground tabular-nums">({pct}%)</span>
    </div>
  );
}

function buildResumenesAutomaticos(analisis: ReturnType<typeof analizarDatos>): string[] {
  const out: string[] = [];
  const fmt = (n: number) => n.toFixed(1).replace(".", ",");
  const TIPO_LABEL_FULL: Record<TipoCompetencia, string> = {
    tecnica: "Competencias Técnicas",
    blanda: "Competencias Blandas",
    organizacional: "Competencias Organizacionales",
  };

  if (analisis.areaMejor) {
    out.push(
      `El área con mejor desempeño general es ${analisis.areaMejor.area}, con un promedio de ${fmt(
        analisis.areaMejor.promedioGeneral
      )} puntos.`
    );
  }
  if (analisis.areaPeor) {
    out.push(
      `El área que requiere más atención es ${analisis.areaPeor.area}, con un promedio de ${fmt(
        analisis.areaPeor.promedioGeneral
      )} puntos.`
    );
  }
  out.push(
    `La competencia más fuerte en general es ${TIPO_LABEL_FULL[analisis.tipoMasFuerte]} (promedio: ${fmt(
      analisis.promedioPorTipoGlobal[analisis.tipoMasFuerte]
    )}).`
  );
  out.push(
    `La competencia más débil en general es ${TIPO_LABEL_FULL[analisis.tipoMasDebil]} (promedio: ${fmt(
      analisis.promedioPorTipoGlobal[analisis.tipoMasDebil]
    )}).`
  );
  const sobresalientes = analisis.distribucionBlandas.sobresaliente;
  const necesitanMejora =
    analisis.distribucionBlandas.necesitaMejora +
    analisis.distribucionBlandas.insatisfactorio;
  const total = analisis.totalEvaluados;
  out.push(
    `${sobresalientes} empleado(s) están en nivel Sobresaliente en competencias blandas (${
      total > 0 ? Math.round((sobresalientes / total) * 100) : 0
    }%).`
  );
  out.push(
    `${necesitanMejora} empleado(s) requieren plan de mejora (${
      total > 0 ? Math.round((necesitanMejora / total) * 100) : 0
    }%).`
  );
  out.push(
    `El promedio general de toda la organización es ${fmt(
      analisis.promedioGeneral
    )} puntos sobre 100.`
  );
  return out;
}

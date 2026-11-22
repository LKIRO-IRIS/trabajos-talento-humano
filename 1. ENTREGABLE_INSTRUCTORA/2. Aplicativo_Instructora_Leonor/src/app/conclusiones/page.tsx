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
  Eye,
  FileDown,
  PenLine,
  ChevronRight,
  RefreshCw,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  const [activeTab, setActiveTab] = useState<AreaId>("analisis");
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

  // Insertar texto en el área activa
  const insertText = (texto: string) => {
    const current = draft[activeTab];
    const next = current ? `${current}\n\n${texto}` : texto;
    handleChange(activeTab, next);
    toast.success("Texto insertado en el área activa.");
  };

  // Limpiar área activa
  const clearArea = () => {
    handleChange(activeTab, "");
    toast.info(`Área "${AREAS_CONFIG[activeTab].label}" vaciada.`);
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <FileText className="h-6 w-6 text-brand" />
              Conclusiones
            </h1>
            <p className="text-sm text-muted-foreground">
              Redacta tus conclusiones a partir del análisis. Las sugerencias se generan
              automáticamente desde la página de Análisis.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/analisis">
                <BarChart3 className="h-4 w-4" />
                Ver Análisis
              </Link>
            </Button>
            <Button
              onClick={exportarPDF}
              disabled={exporting}
              className="gap-2"
              size="sm"
            >
              <FileDown className="h-4 w-4" />
              {exporting ? "Generando…" : "Exportar a PDF"}
            </Button>
          </div>
        </div>

        {/* Layout: 3 columnas */}
        <div className="grid gap-4 lg:grid-cols-[320px_1fr_360px]">
          {/* A. Panel de ayuda (izquierda) */}
          <div className="space-y-4 lg:order-1 order-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Sugerencias automáticas
                </CardTitle>
                <CardDescription>
                  Inserta estas frases en tu editor. Aparecerán en el área activa.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {resumenes.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-lg border bg-muted/30 p-2.5 text-xs"
                  >
                    <p>{r}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1.5 h-6 gap-1 px-2 text-[11px]"
                      onClick={() => insertText(r)}
                    >
                      <ChevronRight className="h-3 w-3" />
                      Insertar en &quot;{AREAS_CONFIG[activeTab].label}&quot;
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-brand" />
                  Estadísticas clave
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Promedio general">
                  <span className="font-bold">{formatScore(analisis.promedioGeneral)}</span>
                </Row>
                <Row label="Empleados evaluados">
                  <span className="font-bold">{analisis.totalEvaluados}</span>
                </Row>
                <Row label="Áreas analizadas">
                  <span className="font-bold">{AREAS_ORGANIZACIONALES.length}</span>
                </Row>
                <Separator className="my-2" />
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    Distribución de competencias blandas
                  </p>
                  <div className="space-y-1">
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
              </CardContent>
            </Card>
          </div>

          {/* B. Editor (centro) */}
          <div className="space-y-4 lg:order-2 order-1">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <PenLine className="h-4 w-4 text-brand" />
                      Editor de conclusiones
                    </CardTitle>
                    <CardDescription>
                      Auto-guardado activo. Para guardar necesitas iniciar sesión.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="gap-1">
                      <Save className="h-3 w-3" />
                      {totalPalabras} palabras
                    </Badge>
                    <Badge variant="outline">
                      {totalSecciones}/{AREA_IDS.length} secciones
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AreaId)}>
                  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                    {AREA_IDS.map((id) => {
                      const Icon = AREAS_CONFIG[id].icon;
                      return (
                        <TabsTrigger key={id} value={id} className="gap-1.5 text-xs">
                          <Icon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{AREAS_CONFIG[id].label}</span>
                          <span className="sm:hidden">{AREAS_CONFIG[id].label.split(" ")[0]}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {AREA_IDS.map((id) => {
                    const Icon = AREAS_CONFIG[id].icon;
                    return (
                      <TabsContent key={id} value={id} className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Icon
                            className="h-4 w-4"
                            style={{ color: AREAS_CONFIG[id].color }}
                          />
                          <Label className="text-sm font-semibold">
                            {AREAS_CONFIG[id].label}
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {AREAS_CONFIG[id].pregunta}
                        </p>
                        <Textarea
                          value={draft[id]}
                          onChange={(e) => handleChange(id, e.target.value)}
                          placeholder={AREAS_CONFIG[id].placeholder}
                          rows={10}
                          className="resize-y"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">
                            {wordCount(draft[id])} palabras ·{" "}
                            {savedHint[id] || "Sin cambios"}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 text-xs text-destructive"
                              onClick={clearArea}
                            >
                              <Trash2 className="h-3 w-3" />
                              Limpiar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              onClick={() => handleManualSave(id)}
                            >
                              <Save className="h-3 w-3" />
                              Guardar
                            </Button>
                          </div>
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* C. Vista previa (derecha) */}
          <div className="space-y-4 lg:order-3 order-3">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Eye className="h-4 w-4 text-brand" />
                    Vista previa
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={exportarPDF}
                    disabled={exporting}
                    aria-label="Actualizar vista previa"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${exporting ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                <CardDescription>
                  Informe final con las conclusiones escritas.
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[600px] overflow-y-auto pr-1">
                <article className="space-y-4 rounded-lg border bg-white p-4 text-sm dark:bg-zinc-950">
                  <header className="border-b pb-3">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      Informe de conclusiones
                    </p>
                    <h2 className="mt-1 text-lg font-bold">
                      {config?.nombre ?? "Evaluación de Desempeño"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Generado: {formatDate(new Date().toISOString())}
                    </p>
                  </header>

                  {totalSecciones === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      Escribe tus conclusiones para verlas aquí.
                    </p>
                  ) : (
                    AREA_IDS.map((id) => {
                      const Icon = AREAS_CONFIG[id].icon;
                      const texto = draft[id].trim();
                      if (!texto) return null;
                      return (
                        <section key={id} className="space-y-1">
                          <h3
                            className="flex items-center gap-2 text-sm font-semibold"
                            style={{ color: AREAS_CONFIG[id].color }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {AREAS_CONFIG[id].label}
                          </h3>
                          <p className="whitespace-pre-wrap text-xs leading-relaxed">
                            {texto}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Última edición:{" "}
                            {conclusiones[id]?.ultimaEdicion
                              ? formatDate(conclusiones[id]!.ultimaEdicion)
                              : "—"}
                          </p>
                        </section>
                      );
                    })
                  )}

                  <footer className="mt-4 border-t pt-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="font-semibold">Firma del evaluador</p>
                        <div className="mt-3 border-b border-dashed" />
                        <p className="mt-1 text-muted-foreground">
                          {user?.nombre ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold">Firma del responsable</p>
                        <div className="mt-3 border-b border-dashed" />
                        <p className="mt-1 text-muted-foreground">
                          ____________________
                        </p>
                      </div>
                    </div>
                  </footer>
                </article>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Resumen del análisis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs">
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
              </CardContent>
            </Card>
          </div>
        </div>
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

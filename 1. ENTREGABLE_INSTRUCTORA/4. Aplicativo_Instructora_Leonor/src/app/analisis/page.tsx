"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  Target,
  Users,
  ChevronDown,
  ChevronRight,
  X,
  Lightbulb,
  Trophy,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  type TooltipProps,
} from "recharts";
import { MainLayout } from "@/components/layout/main-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthContext } from "@/components/auth/auth-context";
import { useEvaluaciones } from "@/hooks/use-evaluaciones";
import { useConfig } from "@/hooks/use-config";
import {
  AREAS_ORGANIZACIONALES,
  type TipoCompetencia,
} from "@/lib/types";
import {
  analizarDatos,
  heatColor,
  heatHex,
  getPromedioPorTipo,
  ultimasEvaluaciones,
} from "@/lib/evaluacion";
import {
  badgeClassCalificacion,
  formatScore,
  getAvatarColor,
  getIniciales,
} from "@/lib/utils";

const TIPO_FULL_LABEL: Record<TipoCompetencia, string> = {
  tecnica: "Competencias Técnicas",
  blanda: "Competencias Blandas",
  organizacional: "Competencias Organizacionales",
};

const TIPO_COLOR: Record<TipoCompetencia, string> = {
  tecnica: "#0D9488",
  blanda: "#9333EA",
  organizacional: "#F59E0B",
};

const RANGOS = [
  { id: "sobresaliente", label: "Sobresaliente (90-100)", color: "#16A34A", min: 90, max: 100 },
  { id: "satisfactorio", label: "Satisfactorio (75-89)", color: "#2563EB", min: 75, max: 89 },
  { id: "necesita-mejora", label: "Necesita Mejora (60-74)", color: "#F59E0B", min: 60, max: 74 },
  { id: "insatisfactorio", label: "Insatisfactorio (<60)", color: "#DC2626", min: 0, max: 59 },
] as const;

export default function AnalisisPage() {
  const { user } = useAuthContext();
  const { config } = useConfig();
  const { empleados, visibles } = useEvaluaciones(user, config?.criterios ?? []);
  const criterios = config?.criterios ?? [];

  const analisis = useMemo(
    () =>
      analizarDatos(empleados, visibles, criterios, AREAS_ORGANIZACIONALES),
    [empleados, visibles, criterios]
  );

  // State para heat map cell click → mostrar detalle en dialog
  const [cellDetail, setCellDetail] = useState<{
    area: string;
    tipo: TipoCompetencia | null; // null = vista general del área
  } | null>(null);

  // State para filtro de área en la distribución de blandas
  const [areaFiltroBlandas, setAreaFiltroBlandas] = useState<string>("todas");

  // Datos de la distribución filtrable
  const distribucionBlandasData = useMemo(() => {
    const ultimas = ultimasEvaluaciones(visibles);
    const empleadoToArea = new Map(
      empleados.map((e) => [e.id, e.departamento])
    );
    const filtered =
      areaFiltroBlandas === "todas"
        ? ultimas
        : ultimas.filter((ev) => empleadoToArea.get(ev.empleadoId) === areaFiltroBlandas);

    const counts = {
      sobresaliente: 0,
      satisfactorio: 0,
      "necesita-mejora": 0,
      insatisfactorio: 0,
    };
    for (const ev of filtered) {
      const p = getPromedioPorTipo(ev, criterios, "blanda");
      if (p >= 90) counts.sobresaliente++;
      else if (p >= 75) counts.satisfactorio++;
      else if (p >= 60) counts["necesita-mejora"]++;
      else counts.insatisfactorio++;
    }
    const total = filtered.length;
    return RANGOS.map((r) => ({
      rango: r.label,
      cantidad: counts[r.id],
      porcentaje: total > 0 ? Math.round((counts[r.id] / total) * 100) : 0,
      color: r.color,
    }));
  }, [visibles, empleados, criterios, areaFiltroBlandas]);

  const totalBlandas = distribucionBlandasData.reduce(
    (a, b) => a + b.cantidad,
    0
  );

  // Radar comparativo: 3 áreas más fuertes vs 3 más débiles
  const radarData = useMemo(() => {
    const areasEvaluadas = analisis.porArea.filter(
      (a) => a.totalEmpleados > 0 && a.promedioGeneral > 0
    );
    const sorted = [...areasEvaluadas].sort(
      (a, b) => b.promedioGeneral - a.promedioGeneral
    );
    const top3 = sorted.slice(0, 3);
    const bottom3 = sorted.slice(-3).reverse();
    return {
      axis: ["Técnicas", "Blandas", "Organizacionales"],
      top: top3,
      bottom: bottom3,
    };
  }, [analisis]);

  const radarChartData = useMemo(() => {
    return [
      {
        tipo: "Técnicas",
        ...Object.fromEntries(
          radarData.top.map((a) => [a.area, Number(a.promedioPorTipo.tecnica.toFixed(1))])
        ),
      },
      {
        tipo: "Blandas",
        ...Object.fromEntries(
          radarData.top.map((a) => [a.area, Number(a.promedioPorTipo.blanda.toFixed(1))])
        ),
      },
      {
        tipo: "Organizacionales",
        ...Object.fromEntries(
          radarData.top.map((a) => [
            a.area,
            Number(a.promedioPorTipo.organizacional.toFixed(1)),
          ])
        ),
      },
    ];
  }, [radarData]);

  const radarChartDataBottom = useMemo(() => {
    return [
      {
        tipo: "Técnicas",
        ...Object.fromEntries(
          radarData.bottom.map((a) => [a.area, Number(a.promedioPorTipo.tecnica.toFixed(1))])
        ),
      },
      {
        tipo: "Blandas",
        ...Object.fromEntries(
          radarData.bottom.map((a) => [a.area, Number(a.promedioPorTipo.blanda.toFixed(1))])
        ),
      },
      {
        tipo: "Organizacionales",
        ...Object.fromEntries(
          radarData.bottom.map((a) => [
            a.area,
            Number(a.promedioPorTipo.organizacional.toFixed(1)),
          ])
        ),
      },
    ];
  }, [radarData]);

  // Textos del resumen automático (los mismos que verá el estudiante en Conclusiones)
  const resumenes = useMemo(() => buildResumenesAutomaticos(analisis), [analisis]);

  // Copiar resumen al portapapeles
  const copiarResumen = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Resumen copiado al portapapeles.", {
        description: "Pégalo en la página de Conclusiones.",
      });
    } catch {
      toast.error("No se pudo copiar al portapapeles.");
    }
  };

  // Detalle del área en el dialog
  const areaSeleccionada = cellDetail
    ? analisis.porArea.find((a) => a.area === cellDetail.area) ?? null
    : null;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <BarChart3 className="h-6 w-6 text-brand" />
              Análisis
            </h1>
            <p className="text-sm text-muted-foreground">
              Análisis comparativo por área organizacional y por tipo de competencia.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/conclusiones">
              Ir a Conclusiones
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* KPIs de análisis */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiAnalisis
            label="Promedio general"
            value={formatScore(analisis.promedioGeneral)}
            hint={`${analisis.totalEvaluados} empleado(s)`}
            icon={TrendingUp}
            color="#0D9488"
          />
          <KpiAnalisis
            label="Área más fuerte"
            value={analisis.areaMejor?.area ?? "—"}
            hint={
              analisis.areaMejor
                ? `Promedio: ${formatScore(analisis.areaMejor.promedioGeneral)}`
                : "Sin datos"
            }
            icon={Award}
            color="#16A34A"
          />
          <KpiAnalisis
            label="Área a mejorar"
            value={analisis.areaPeor?.area ?? "—"}
            hint={
              analisis.areaPeor
                ? `Promedio: ${formatScore(analisis.areaPeor.promedioGeneral)}`
                : "Sin datos"
            }
            icon={AlertTriangle}
            color="#DC2626"
          />
          <KpiAnalisis
            label="Competencia más fuerte"
            value={TIPO_FULL_LABEL[analisis.tipoMasFuerte]}
            hint={`Promedio: ${formatScore(
              analisis.promedioPorTipoGlobal[analisis.tipoMasFuerte]
            )}`}
            icon={Target}
            color={TIPO_COLOR[analisis.tipoMasFuerte]}
          />
        </div>

        {/* A. Heat Map por área y tipo de competencia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-brand" />
              Mapa de calor: Áreas × Tipos de Competencia
            </CardTitle>
            <CardDescription>
              Cada celda muestra el promedio del área en cada tipo de competencia.
              Haz clic en una celda para ver el detalle de empleados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="[&_td]:p-0 [&_th]:p-2">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Área</TableHead>
                    <TableHead className="text-center">Técnicas</TableHead>
                    <TableHead className="text-center">Blandas</TableHead>
                    <TableHead className="text-center">Organizacionales</TableHead>
                    <TableHead className="text-center">Promedio</TableHead>
                    <TableHead className="text-center w-12">Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analisis.porArea.map((a) => (
                    <TableRow key={a.area}>
                      <TableCell className="py-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{a.area}</span>
                          <span className="text-xs text-muted-foreground">
                            {a.totalEmpleados} empleado(s)
                          </span>
                        </div>
                      </TableCell>
                      {(["tecnica", "blanda", "organizacional"] as TipoCompetencia[]).map(
                        (tipo) => {
                          const score = a.promedioPorTipo[tipo];
                          return (
                            <TableCell key={tipo} className="p-1">
                              <button
                                type="button"
                                onClick={() =>
                                  a.totalEmpleados > 0 &&
                                  setCellDetail({ area: a.area, tipo })
                                }
                                className={`flex h-14 w-full items-center justify-center rounded-md text-sm font-bold transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-70 ${heatColor(
                                  score
                                )}`}
                                disabled={a.totalEmpleados === 0}
                                title={`Área: ${a.area} · ${TIPO_FULL_LABEL[tipo]} · Promedio: ${formatScore(
                                  score
                                )}`}
                              >
                                {a.totalEmpleados > 0 ? formatScore(score) : "—"}
                              </button>
                            </TableCell>
                          );
                        }
                      )}
                      <TableCell className="p-1">
                        <div
                          className={`mx-auto flex h-14 w-16 items-center justify-center rounded-md text-sm font-bold ${heatColor(
                            a.promedioGeneral
                          )}`}
                        >
                          {a.totalEmpleados > 0 ? formatScore(a.promedioGeneral) : "—"}
                        </div>
                      </TableCell>
                      <TableCell className="p-1 text-center">
                        {a.totalEmpleados > 0 ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCellDetail({ area: a.area, tipo: null })}
                            aria-label={`Ver detalle de ${a.area}`}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>Leyenda:</span>
              <LegendChip className="bg-emerald-500" label="≥ 90" />
              <LegendChip className="bg-lime-400" label="75-89" />
              <LegendChip className="bg-amber-400" label="60-74" />
              <LegendChip className="bg-red-500" label="< 60" />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* B. Distribución de Competencias Blandas */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    Distribución de Competencias Blandas
                  </CardTitle>
                  <CardDescription>
                    Cuántos empleados están en cada rango de calificación blanda.
                  </CardDescription>
                </div>
                <Select
                  value={areaFiltroBlandas}
                  onValueChange={setAreaFiltroBlandas}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las áreas</SelectItem>
                    {AREAS_ORGANIZACIONALES.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={distribucionBlandasData}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, Math.max(8, totalBlandas)]}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="rango"
                    width={170}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip content={<BlandasTooltip total={totalBlandas} />} />
                  <Bar dataKey="cantidad" radius={[0, 6, 6, 0]} maxBarSize={32}>
                    {distribucionBlandasData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <Separator className="my-3" />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">Total empleados</p>
                  <p className="text-lg font-bold">{totalBlandas}</p>
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">% Sobresaliente</p>
                  <p className="text-lg font-bold">
                    {totalBlandas > 0
                      ? Math.round(
                          (distribucionBlandasData[0].cantidad / totalBlandas) * 100
                        )
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* D. Resumen automático */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Resumen automático (sugerencias)
              </CardTitle>
              <CardDescription>
                Textos pre-generados que puedes usar como base para tus conclusiones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {resumenes.map((r, i) => (
                <div
                  key={i}
                  className="rounded-lg border bg-muted/30 p-3 text-sm"
                >
                  <p>{r}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 gap-1 px-2 text-xs"
                    onClick={() => copiarResumen(r)}
                  >
                    Copiar
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* C. Radar comparativo: top 3 vs bottom 3 */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4 text-emerald-500" />
                Top 3 áreas más fuertes
              </CardTitle>
              <CardDescription>
                Comparativo de las 3 áreas con mejor promedio general.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {radarData.top.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={radarChartData} cx="50%" cy="50%" outerRadius="72%">
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis
                      dataKey="tipo"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <PolarRadiusAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      angle={90}
                    />
                    {radarData.top.map((a, idx) => (
                      <Radar
                        key={a.area}
                        name={a.area}
                        dataKey={a.area}
                        stroke={TOPE_COLORS[idx]}
                        fill={TOPE_COLORS[idx]}
                        fillOpacity={0.18}
                      />
                    ))}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "var(--popover-foreground)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Sin datos suficientes.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Top 3 áreas a mejorar
              </CardTitle>
              <CardDescription>
                Comparativo de las 3 áreas con menor promedio general.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {radarData.bottom.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={radarChartDataBottom} cx="50%" cy="50%" outerRadius="72%">
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis
                      dataKey="tipo"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <PolarRadiusAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      angle={90}
                    />
                    {radarData.bottom.map((a, idx) => (
                      <Radar
                        key={a.area}
                        name={a.area}
                        dataKey={a.area}
                        stroke={BOTTOM_COLORS[idx]}
                        fill={BOTTOM_COLORS[idx]}
                        fillOpacity={0.18}
                      />
                    ))}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "var(--popover-foreground)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Sin datos suficientes.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabla resumen de promedios por área y tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-brand" />
              Resumen numérico por área
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Área</TableHead>
                    <TableHead className="text-center">Técnicas</TableHead>
                    <TableHead className="text-center">Blandas</TableHead>
                    <TableHead className="text-center">Organizac.</TableHead>
                    <TableHead className="text-center">Promedio</TableHead>
                    <TableHead className="text-center">Empleados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analisis.porArea.map((a) => (
                    <TableRow key={a.area}>
                      <TableCell className="font-medium">{a.area}</TableCell>
                      {(["tecnica", "blanda", "organizacional"] as TipoCompetencia[]).map(
                        (tipo) => (
                          <TableCell key={tipo} className="text-center">
                            {a.totalEmpleados > 0 ? (
                              <span
                                className="inline-flex min-w-[2.5rem] justify-center rounded-md px-2 py-0.5 text-xs font-bold"
                                style={{
                                  backgroundColor: heatHex(a.promedioPorTipo[tipo]),
                                  color: a.promedioPorTipo[tipo] >= 60 && a.promedioPorTipo[tipo] < 90
                                    ? "#1a2e05"
                                    : "#ffffff",
                                }}
                              >
                                {formatScore(a.promedioPorTipo[tipo])}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )
                      )}
                      <TableCell className="text-center font-bold">
                        {a.totalEmpleados > 0 ? formatScore(a.promedioGeneral) : "—"}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {a.totalEmpleados}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de detalle al hacer clic en una celda */}
      <Dialog
        open={cellDetail !== null}
        onOpenChange={(o) => !o && setCellDetail(null)}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                {cellDetail?.tipo ? (
                  <>
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: TIPO_COLOR[cellDetail.tipo] }}
                    />
                    {TIPO_FULL_LABEL[cellDetail.tipo]} — {cellDetail.area}
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    Detalle del área: {cellDetail?.area}
                  </>
                )}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCellDetail(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Empleados del área y su desempeño en cada tipo de competencia.
            </DialogDescription>
          </DialogHeader>

          {areaSeleccionada && areaSeleccionada.empleados.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-center">Técnicas</TableHead>
                    <TableHead className="text-center">Blandas</TableHead>
                    <TableHead className="text-center">Organiz.</TableHead>
                    <TableHead className="text-center">Final</TableHead>
                    <TableHead>Calificación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {areaSeleccionada.empleados.map((d) => (
                    <TableRow key={d.empleado.id}>
                      <TableCell>
                        <Link
                          href={`/empleado/${d.empleado.id}`}
                          className="flex items-center gap-2 font-medium hover:underline"
                        >
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{ backgroundColor: getAvatarColor(d.empleado.nombre) }}
                          >
                            {getIniciales(d.empleado.nombre)}
                          </span>
                          {d.empleado.nombre}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {d.empleado.cargo}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {d.evaluacion ? formatScore(d.promedioPorTipo.tecnica) : "—"}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {d.evaluacion ? formatScore(d.promedioPorTipo.blanda) : "—"}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {d.evaluacion
                          ? formatScore(d.promedioPorTipo.organizacional)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center font-bold tabular-nums">
                        {d.evaluacion ? formatScore(d.promedioGeneral) : "—"}
                      </TableCell>
                      <TableCell>
                        {d.evaluacion ? (
                          <Badge
                            variant="outline"
                            className={badgeClassCalificacion(d.evaluacion.calificacion)}
                          >
                            {d.evaluacion.calificacion}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Sin evaluar</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay empleados en esta área.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

/* ===================== Componentes auxiliares ===================== */

const TOPE_COLORS = ["#16A34A", "#0D9488", "#84CC16"];
const BOTTOM_COLORS = ["#DC2626", "#F59E0B", "#EF4444"];

function KpiAnalisis({
  label,
  value,
  hint,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-0.5 truncate text-xl font-bold" title={value}>
              {value}
            </p>
            {hint ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
            ) : null}
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: `${color}1A` }}
          >
            <Icon className="h-5 w-5" />
            <span
              className="absolute h-10 w-10 scale-0 rounded-md transition-transform group-hover:scale-100"
              style={{ backgroundColor: color }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LegendChip({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-3 w-3 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

function BlandasTooltip({ active, payload, total }: TooltipProps<number, string> & { total: number }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload as { rango: string; cantidad: number; porcentaje: number };
  return (
    <div className="rounded-md border bg-popover p-2 text-xs shadow-md">
      <p className="font-medium">{d.rango}</p>
      <p className="text-muted-foreground">
        {d.cantidad} empleado(s) · {d.porcentaje}%
      </p>
      <p className="mt-1 text-muted-foreground">Total: {total}</p>
    </div>
  );
}

/* ===================== Resumen automático ===================== */

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

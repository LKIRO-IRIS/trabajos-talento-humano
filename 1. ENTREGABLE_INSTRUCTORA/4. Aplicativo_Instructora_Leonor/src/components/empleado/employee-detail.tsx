"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileDown,
  MessageSquare,
  ClipboardList,
  Briefcase,
  Building2,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  badgeClassCalificacion,
  formatScore,
  formatDate,
  getAvatarColor,
  getColorCalificacion,
  getIniciales,
  downloadBlob,
} from "@/lib/utils";
import { RadarChartCard } from "@/components/dashboard/radar-chart";
import { ImprovementPlan } from "./improvement-plan";
import { useConfig } from "@/hooks/use-config";
import type { Criterio, Empleado, Evaluacion, PlanMejora } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  empleado: Empleado;
  evaluaciones: Evaluacion[];
  configCriterios: Criterio[];
  onPlanEstadoChange?: (evalId: string, estado: "Pendiente" | "En curso" | "Completado") => void;
  onPlanSave?: (evalId: string, plan: PlanMejora) => void;
}

export function EmployeeDetail({
  empleado,
  evaluaciones,
  configCriterios,
  onPlanEstadoChange,
  onPlanSave,
}: Props) {
  const { config } = useConfig();
  const [tab, setTab] = useState("resumen");

  const ultima = evaluaciones[evaluaciones.length - 1] ?? null;
  const promedio =
    evaluaciones.length > 0
      ? evaluaciones.reduce((a, e) => a + e.puntuacionFinal, 0) /
        evaluaciones.length
      : 0;

  // Radar: promedio por criterio a partir de todas las evaluaciones
  const radarData = useMemo(() => {
    return configCriterios.map((c) => {
      const puntajes = evaluaciones
        .flatMap((e) => e.criterios.filter((p) => p.criterioId === c.id))
        .map((p) => p.puntaje);
      const prom =
        puntajes.length > 0
          ? puntajes.reduce((a, b) => a + b, 0) / puntajes.length
          : 0;
      return { criterio: c.nombre, puntaje: Number(prom.toFixed(1)) };
    });
  }, [configCriterios, evaluaciones]);

  const color = getAvatarColor(empleado.nombre);

  const exportarPDF = async () => {
    try {
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "empleado",
          empresa: config?.nombre ?? "Evaluación de Desempeño",
          empleado,
          evaluaciones,
          criterios: configCriterios,
        }),
      });
      if (!res.ok) throw new Error("Error al generar PDF");
      const blob = await res.blob();
      downloadBlob(
        blob,
        `Ficha_${empleado.nombre.replace(/\s+/g, "_")}.pdf`
      );
      toast.success("PDF generado correctamente.");
    } catch {
      toast.error("No se pudo generar el PDF.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb / back */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/empleados">
            <ArrowLeft className="h-4 w-4" />
            Volver a empleados
          </Link>
        </Button>
        <Button onClick={exportarPDF} variant="outline" size="sm" className="gap-2">
          <FileDown className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Cabecera del empleado */}
      <Card className="overflow-hidden">
        <div className="bg-brand-gradient px-6 py-6 text-brand-foreground" style={{ backgroundImage: `linear-gradient(135deg, ${config?.primaryColor ?? "#0D9488"}, ${config?.secondaryColor ?? "#F59E0B"})` }}>
          <div className="flex flex-wrap items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white ring-4 ring-white/30"
              style={{ backgroundColor: color }}
            >
              {getIniciales(empleado.nombre)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {empleado.nombre}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90">
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" /> {empleado.cargo}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> {empleado.departamento}
                </span>
                <span className="flex items-center gap-1 font-mono text-xs">
                  <Hash className="h-3.5 w-3.5" /> {empleado.id}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-white/80">
                Promedio general
              </p>
              <p className="text-3xl font-bold text-white">
                {evaluaciones.length > 0 ? formatScore(promedio) : "—"}
              </p>
              {ultima ? (
                <Badge
                  className="mt-1 border-0 bg-white/25 text-white backdrop-blur"
                  variant="outline"
                >
                  {ultima.calificacion}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="historial">
            Historial ({evaluaciones.length})
          </TabsTrigger>
          <TabsTrigger value="plan">Plan de mejora</TabsTrigger>
        </TabsList>

        {/* Resumen */}
        <TabsContent value="resumen" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Promedio por criterio</CardTitle>
              </CardHeader>
              <CardContent>
                {evaluaciones.length > 0 ? (
                  <RadarChartCard data={radarData} height={300} />
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    Sin evaluaciones registradas.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Información</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Departamento</span>
                  <span className="font-medium">{empleado.departamento}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cargo</span>
                  <span className="font-medium">{empleado.cargo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Evaluaciones</span>
                  <span className="font-medium">{evaluaciones.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Promedio</span>
                  <span className="font-bold" style={{ color: getColorCalificacion(ultima?.calificacion ?? "Satisfactorio") }}>
                    {evaluaciones.length > 0 ? formatScore(promedio) : "—"}
                  </span>
                </div>
                {ultima ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Última evaluación</span>
                      <span className="font-medium">{formatDate(ultima.fecha)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Último periodo</span>
                      <span className="font-medium">{ultima.periodo}</span>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Historial */}
        <TabsContent value="historial" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4" />
                Evaluaciones registradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {evaluaciones.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Este empleado aún no tiene evaluaciones.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Periodo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Puntuación</TableHead>
                        <TableHead>Calificación</TableHead>
                        <TableHead>Evaluador</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...evaluaciones]
                        .reverse()
                        .map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="font-medium">{e.periodo}</TableCell>
                            <TableCell>{formatDate(e.fecha)}</TableCell>
                            <TableCell className="font-bold tabular-nums">
                              {formatScore(e.puntuacionFinal)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={badgeClassCalificacion(e.calificacion)}
                              >
                                {e.calificacion}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {e.evaluadorNombre}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comentarios */}
          {evaluaciones.some((e) => e.comentarios) ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4" />
                  Comentarios del evaluador
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...evaluaciones]
                  .filter((e) => e.comentarios.trim())
                  .reverse()
                  .map((e) => (
                    <div key={e.id} className="rounded-lg border bg-muted/30 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium">
                          {e.periodo} · {formatDate(e.fecha)}
                        </span>
                        <Badge
                          variant="outline"
                          className={badgeClassCalificacion(e.calificacion)}
                        >
                          {formatScore(e.puntuacionFinal)}
                        </Badge>
                      </div>
                      <p className="text-sm">{e.comentarios}</p>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* Plan de mejora */}
        <TabsContent value="plan" className="mt-4">
          {ultima?.planMejora ? (
            <ImprovementPlan
              plan={ultima.planMejora}
              empleado={empleado}
              ultima={ultima}
              configCriterios={configCriterios}
              onSave={(plan) => onPlanSave?.(ultima.id, plan)}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No hay plan de mejora activo. Los planes se generan automáticamente
                cuando un empleado obtiene una calificación de{" "}
                <span className="font-medium text-amber-600">Necesita Mejora</span> o{" "}
                <span className="font-medium text-red-600">Insatisfactorio</span>.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

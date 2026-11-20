"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Award,
  ThumbsUp,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Trophy,
  TrendingDown,
  Users,
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { BarChartCard } from "@/components/dashboard/bar-chart";
import { PieChartCard } from "@/components/dashboard/pie-chart";
import { RadarChartCard } from "@/components/dashboard/radar-chart";
import { useAuthContext } from "@/components/auth/auth-context";
import { useEvaluaciones } from "@/hooks/use-evaluaciones";
import { useConfig } from "@/hooks/use-config";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  badgeClassCalificacion,
  formatScore,
  getAvatarColor,
  getIniciales,
} from "@/lib/utils";
import { getCalificacion } from "@/lib/evaluacion";
import type { Calificacion } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuthContext();
  const { config } = useConfig();
  const { visibles, empleados } = useEvaluaciones(user, config?.criterios ?? []);

  // Última evaluación por empleado
  const ultimasPorEmpleado = useMemo(() => {
    const map = new Map<string, (typeof visibles)[number]>();
    for (const ev of visibles) {
      const prev = map.get(ev.empleadoId);
      if (!prev || new Date(ev.fecha) > new Date(prev.fecha)) {
        map.set(ev.empleadoId, ev);
      }
    }
    return map;
  }, [visibles]);

  const ultimas = Array.from(ultimasPorEmpleado.values());

  // KPIs
  const promedioGeneral =
    ultimas.length > 0
      ? ultimas.reduce((a, e) => a + e.puntuacionFinal, 0) / ultimas.length
      : 0;

  const conteo = useMemo(() => {
    const c: Record<Calificacion, number> = {
      Sobresaliente: 0,
      Satisfactorio: 0,
      "Necesita Mejora": 0,
      Insatisfactorio: 0,
    };
    for (const e of ultimas) c[e.calificacion]++;
    return c;
  }, [ultimas]);

  // Datos para gráfico de barras
  const barData = useMemo(
    () =>
      ultimas
        .map((e) => {
          const emp = empleados.find((x) => x.id === e.empleadoId);
          return {
            nombre: emp?.nombre.split(" ")[0] ?? "—",
            puntuacion: Number(e.puntuacionFinal.toFixed(1)),
          };
        })
        .sort((a, b) => b.puntuacion - a.puntuacion),
    [ultimas, empleados]
  );

  // Datos para pie
  const pieData = (Object.keys(conteo) as Calificacion[])
    .map((name) => ({ name, value: conteo[name] }))
    .filter((d) => d.value > 0);

  // Radar promedio por criterio
  const radarData = useMemo(() => {
    const criterios = config?.criterios ?? [];
    return criterios.map((c) => {
      const puntajes = visibles
        .flatMap((e) => e.criterios.filter((p) => p.criterioId === c.id))
        .map((p) => p.puntaje);
      const prom =
        puntajes.length > 0
          ? puntajes.reduce((a, b) => a + b, 0) / puntajes.length
          : 0;
      return { criterio: c.nombre, puntaje: Number(prom.toFixed(1)) };
    });
  }, [config, visibles]);

  // Mejores y peores
  const ordenados = [...ultimas].sort(
    (a, b) => b.puntuacionFinal - a.puntuacionFinal
  );
  const mejores = ordenados.slice(0, 5);
  const peores = [...ordenados].reverse().slice(0, 5);

  const getEmp = (empId: string) => empleados.find((x) => x.id === empId);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {user?.role === "admin"
                ? "Visión global de todas las evaluaciones registradas."
                : "Resumen de tus evaluaciones registradas."}
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link href="/evaluar">
              <ClipboardList className="h-4 w-4" />
              Nueva Evaluación
            </Link>
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Promedio general"
            value={formatScore(promedioGeneral)}
            hint={`${ultimas.length} empleado(s) evaluado(s)`}
            icon={TrendingUp}
            color="#0D9488"
          />
          <KpiCard
            label="Sobresalientes"
            value={conteo.Sobresaliente}
            hint="90-100"
            icon={Award}
            color="#16A34A"
          />
          <KpiCard
            label="Satisfactorios"
            value={conteo.Satisfactorio}
            hint="75-89"
            icon={ThumbsUp}
            color="#2563EB"
          />
          <KpiCard
            label="Necesitan mejora"
            value={conteo["Necesita Mejora"] + conteo.Insatisfactorio}
            hint="< 75"
            icon={AlertTriangle}
            color="#F59E0B"
          />
        </div>

        {/* Gráficos */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Puntuaciones por empleado
              </CardTitle>
            </CardHeader>
            <CardContent>
              {barData.length > 0 ? (
                <BarChartCard data={barData} height={300} />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Sin evaluaciones para mostrar.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Distribución de calificaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <PieChartCard data={pieData} height={300} />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Sin evaluaciones para mostrar.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Radar + mejores/peores */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Promedio por criterio
              </CardTitle>
            </CardHeader>
            <CardContent>
              {radarData.length > 0 ? (
                <RadarChartCard data={radarData} height={300} />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Sin criterios configurados.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Ranking de empleados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordenados.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Aún no hay evaluaciones.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Depto</TableHead>
                        <TableHead className="text-right">Puntaje</TableHead>
                        <TableHead>Calificación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordenados.slice(0, 8).map((e, i) => {
                        const emp = getEmp(e.empleadoId);
                        return (
                          <TableRow key={e.id}>
                            <TableCell>
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold">
                                {i + 1}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/empleado/${e.empleadoId}`}
                                className="flex items-center gap-2 font-medium hover:underline"
                              >
                                <span
                                  className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                  style={{
                                    backgroundColor: getAvatarColor(
                                      emp?.nombre ?? "?"
                                    ),
                                  }}
                                >
                                  {getIniciales(emp?.nombre ?? "?")}
                                </span>
                                {emp?.nombre ?? "—"}
                              </Link>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {emp?.departamento ?? "—"}
                            </TableCell>
                            <TableCell className="text-right font-bold tabular-nums">
                              {formatScore(e.puntuacionFinal)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={badgeClassCalificacion(
                                  e.calificacion
                                )}
                              >
                                {e.calificacion}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="mt-3 flex justify-end">
                <Button asChild variant="ghost" size="sm" className="gap-1">
                  <Link href="/empleados">
                    Ver todos
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mejores y peores */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4 text-amber-500" />
                Mejores desempeños
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {mejores.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Sin datos.
                </p>
              ) : (
                mejores.map((e) => {
                  const emp = getEmp(e.empleadoId);
                  return (
                    <Link
                      key={e.id}
                      href={`/empleado/${e.empleadoId}`}
                      className="flex items-center gap-3 rounded-lg border bg-card p-2.5 transition-colors hover:bg-muted"
                    >
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{
                          backgroundColor: getAvatarColor(emp?.nombre ?? "?"),
                        }}
                      >
                        {getIniciales(emp?.nombre ?? "?")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {emp?.nombre}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {emp?.departamento}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">
                          {formatScore(e.puntuacionFinal)}
                        </p>
                        <Badge
                          variant="outline"
                          className={badgeClassCalificacion(e.calificacion)}
                        >
                          {e.calificacion}
                        </Badge>
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Requieren atención
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {peores.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Sin datos.
                </p>
              ) : (
                peores.map((e) => {
                  const emp = getEmp(e.empleadoId);
                  return (
                    <Link
                      key={e.id}
                      href={`/empleado/${e.empleadoId}`}
                      className="flex items-center gap-3 rounded-lg border bg-card p-2.5 transition-colors hover:bg-muted"
                    >
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{
                          backgroundColor: getAvatarColor(emp?.nombre ?? "?"),
                        }}
                      >
                        {getIniciales(emp?.nombre ?? "?")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {emp?.nombre}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {emp?.departamento}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">
                          {formatScore(e.puntuacionFinal)}
                        </p>
                        <Badge
                          variant="outline"
                          className={badgeClassCalificacion(e.calificacion)}
                        >
                          {e.calificacion}
                        </Badge>
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resumen de empleados */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Empleados registrados ({empleados.length})
              </CardTitle>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href="/empleados">
                  Ver tabla completa
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {empleados.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hay empleados registrados.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {empleados.slice(0, 6).map((emp) => {
                  const ev = ultimasPorEmpleado.get(emp.id);
                  return (
                    <Link
                      key={emp.id}
                      href={`/empleado/${emp.id}`}
                      className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-shadow hover:shadow-md"
                    >
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{
                          backgroundColor: getAvatarColor(emp.nombre),
                        }}
                      >
                        {getIniciales(emp.nombre)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {emp.nombre}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {emp.departamento}
                        </p>
                      </div>
                      {ev ? (
                        <span className="text-sm font-bold">
                          {formatScore(ev.puntuacionFinal)}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

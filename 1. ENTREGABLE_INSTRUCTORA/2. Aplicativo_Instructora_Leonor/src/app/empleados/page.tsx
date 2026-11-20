"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  FileDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useAuthContext } from "@/components/auth/auth-context";
import { useEvaluaciones } from "@/hooks/use-evaluaciones";
import { useConfig } from "@/hooks/use-config";
import {
  badgeClassCalificacion,
  downloadBlob,
  formatScore,
  getAvatarColor,
  getIniciales,
} from "@/lib/utils";
import type { Calificacion, Empleado, Evaluacion } from "@/lib/types";

type SortKey = "nombre" | "departamento" | "cargo" | "puntuacion" | "calificacion";
type SortDir = "asc" | "desc";

const CALIFICACIONES: (Calificacion | "todas")[] = [
  "todas",
  "Sobresaliente",
  "Satisfactorio",
  "Necesita Mejora",
  "Insatisfactorio",
];

interface Fila {
  empleado: Empleado;
  ultima: Evaluacion | null;
  promedio: number;
  count: number;
}

export default function EmpleadosPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { config } = useConfig();
  const { empleados, visibles } = useEvaluaciones(
    user,
    config?.criterios ?? []
  );

  const [busqueda, setBusqueda] = useState("");
  const [deptoFiltro, setDeptoFiltro] = useState("todos");
  const [calFiltro, setCalFiltro] = useState<string>("todas");
  const [sortKey, setSortKey] = useState<SortKey>("puntuacion");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const departamentos = useMemo(() => {
    const set = new Set(empleados.map((e) => e.departamento));
    return Array.from(set).sort();
  }, [empleados]);

  const evaluacionesPorEmpleado = useMemo(() => {
    const map = new Map<string, Evaluacion[]>();
    for (const e of visibles) {
      const arr = map.get(e.empleadoId) ?? [];
      arr.push(e);
      map.set(e.empleadoId, arr);
    }
    return map;
  }, [visibles]);

  const filas: Fila[] = useMemo(() => {
    return empleados
      .map((empleado) => {
        const evals = evaluacionesPorEmpleado.get(empleado.id) ?? [];
        const ordenadas = [...evals].sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        const ultima = ordenadas[0] ?? null;
        const promedio =
          evals.length > 0
            ? evals.reduce((a, e) => a + e.puntuacionFinal, 0) / evals.length
            : 0;
        return { empleado, ultima, promedio, count: evals.length };
      })
      .filter((f) => {
        if (busqueda.trim()) {
          const q = busqueda.toLowerCase();
          if (
            !f.empleado.nombre.toLowerCase().includes(q) &&
            !f.empleado.cargo.toLowerCase().includes(q) &&
            !f.empleado.departamento.toLowerCase().includes(q)
          )
            return false;
        }
        if (deptoFiltro !== "todos" && f.empleado.departamento !== deptoFiltro)
          return false;
        if (calFiltro !== "todas" && f.ultima?.calificacion !== calFiltro)
          return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case "nombre":
            cmp = a.empleado.nombre.localeCompare(b.empleado.nombre);
            break;
          case "departamento":
            cmp = a.empleado.departamento.localeCompare(b.empleado.departamento);
            break;
          case "cargo":
            cmp = a.empleado.cargo.localeCompare(b.empleado.cargo);
            break;
          case "puntuacion":
            cmp = a.promedio - b.promedio;
            break;
          case "calificacion":
            cmp = (a.ultima?.puntuacionFinal ?? 0) - (b.ultima?.puntuacionFinal ?? 0);
            break;
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [
    empleados,
    evaluacionesPorEmpleado,
    busqueda,
    deptoFiltro,
    calFiltro,
    sortKey,
    sortDir,
  ]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "puntuacion" || key === "calificacion" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronRight className="h-3 w-3 opacity-20" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5" />
    );
  };

  const exportarExcel = async () => {
    try {
      const res = await fetch("/api/export-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa: config?.nombre ?? "Evaluación",
          filas: filas.map((f) => ({
            id: f.empleado.id,
            nombre: f.empleado.nombre,
            departamento: f.empleado.departamento,
            cargo: f.empleado.cargo,
            promedio: Number(f.promedio.toFixed(2)),
            ultimaCalificacion: f.ultima?.calificacion ?? "Sin evaluar",
            ultimaPuntuacion: f.ultima
              ? Number(f.ultima.puntuacionFinal.toFixed(2))
              : null,
            evaluaciones: f.count,
            periodo: f.ultima?.periodo ?? "",
          })),
        }),
      });
      if (!res.ok) throw new Error("Error");
      const blob = await res.blob();
      downloadBlob(blob, "Evaluaciones_Empleados.xlsx");
      toast.success("Excel generado correctamente.");
    } catch {
      toast.error("No se pudo generar el Excel.");
    }
  };

  const exportarPDF = async () => {
    try {
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "comparativo",
          empresa: config?.nombre ?? "Evaluación de Desempeño",
          filas: filas.map((f) => ({
            nombre: f.empleado.nombre,
            departamento: f.empleado.departamento,
            cargo: f.empleado.cargo,
            promedio: Number(f.promedio.toFixed(2)),
            calificacion: f.ultima?.calificacion ?? "Sin evaluar",
            count: f.count,
          })),
        }),
      });
      if (!res.ok) throw new Error("Error");
      const blob = await res.blob();
      downloadBlob(blob, "Reporte_Comparativo.pdf");
      toast.success("PDF generado correctamente.");
    } catch {
      toast.error("No se pudo generar el PDF.");
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Empleados</h1>
            <p className="text-sm text-muted-foreground">
              Tabla comparativa de evaluaciones ({filas.length} de {empleados.length})
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={exportarExcel}>
              <FileDown className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={exportarPDF}>
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Nombre, cargo…"
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Departamento</Label>
                <Select value={deptoFiltro} onValueChange={setDeptoFiltro}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {departamentos.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Calificación</Label>
                <Select value={calFiltro} onValueChange={setCalFiltro}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CALIFICACIONES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c === "todas" ? "Todas" : c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setBusqueda("");
                    setDeptoFiltro("todos");
                    setCalFiltro("todas");
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Empleados evaluados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filas.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No se encontraron empleados con los filtros aplicados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button
                          className="flex items-center gap-1 font-medium hover:text-foreground"
                          onClick={() => toggleSort("nombre")}
                        >
                          Empleado <SortIcon k="nombre" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          className="flex items-center gap-1 font-medium hover:text-foreground"
                          onClick={() => toggleSort("departamento")}
                        >
                          Departamento <SortIcon k="departamento" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          className="flex items-center gap-1 font-medium hover:text-foreground"
                          onClick={() => toggleSort("cargo")}
                        >
                          Cargo <SortIcon k="cargo" />
                        </button>
                      </TableHead>
                      <TableHead className="text-center">Eval.</TableHead>
                      <TableHead className="text-right">
                        <button
                          className="flex items-center gap-1 font-medium hover:text-foreground"
                          onClick={() => toggleSort("puntuacion")}
                        >
                          Promedio <SortIcon k="puntuacion" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          className="flex items-center gap-1 font-medium hover:text-foreground"
                          onClick={() => toggleSort("calificacion")}
                        >
                          Calificación <SortIcon k="calificacion" />
                        </button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filas.map((f) => (
                      <TableRow
                        key={f.empleado.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/empleado/${f.empleado.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white"
                              style={{
                                backgroundColor: getAvatarColor(f.empleado.nombre),
                              }}
                            >
                              {getIniciales(f.empleado.nombre)}
                            </span>
                            <span className="font-medium">{f.empleado.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {f.empleado.departamento}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {f.empleado.cargo}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {f.count}
                        </TableCell>
                        <TableCell className="text-right font-bold tabular-nums">
                          {f.count > 0 ? formatScore(f.promedio) : "—"}
                        </TableCell>
                        <TableCell>
                          {f.ultima ? (
                            <Badge
                              variant="outline"
                              className={badgeClassCalificacion(f.ultima.calificacion)}
                            >
                              {f.ultima.calificacion}
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
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Haz clic en un empleado para ver su ficha individual.
        </p>
      </div>
    </MainLayout>
  );
}

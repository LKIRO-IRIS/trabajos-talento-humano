"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  CalendarClock,
  UserCog,
  CheckCircle2,
  Circle,
  Loader2,
  Save,
  Plus,
  Trash2,
  Lightbulb,
  Pencil,
  Check,
  X,
  RotateCcw,
} from "lucide-react";
import { formatDate, formatScore } from "@/lib/utils";
import type { EstadoPlan, PlanMejora, Empleado, Criterio } from "@/lib/types";
import {
  getPromedioPorTipo,
  getCriterioMasBajo,
  accionesRecomendadas,
} from "@/lib/evaluacion";
import type { Evaluacion } from "@/lib/types";
import type { TipoCompetencia } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  plan: PlanMejora;
  empleado: Empleado;
  ultima: Evaluacion;
  configCriterios: Criterio[];
  onSave?: (plan: PlanMejora) => void;
}

const ESTADOS: EstadoPlan[] = ["Pendiente", "En curso", "Completado"];

/**
 * Componente editable del plan de mejora.
 * El estudiante puede editar acciones, fechas, responsable, estado
 * y agregar observaciones. Las sugerencias se generan en base al
 * criterio más bajo, el área del empleado y el tipo de competencia débil.
 */
export function ImprovementPlan({
  plan,
  empleado,
  ultima,
  configCriterios,
  onSave,
}: Props) {
  const [acciones, setAcciones] = useState<string[]>(plan.acciones ?? []);
  const [nuevaAccion, setNuevaAccion] = useState("");
  const [fechaSeguimiento, setFechaSeguimiento] = useState(
    toInputDate(plan.fechaSeguimiento)
  );
  const [responsable, setResponsable] = useState(plan.responsable);
  const [estado, setEstado] = useState<EstadoPlan>(plan.estado);
  const [observaciones, setObservaciones] = useState(
    plan.observacionesEstudiante ?? ""
  );
  const [editando, setEditando] = useState(false);

  // Sincroniza cuando cambia el plan (por ejemplo al cargar otra evaluación)
  useEffect(() => {
    setAcciones(plan.acciones ?? []);
    setFechaSeguimiento(toInputDate(plan.fechaSeguimiento));
    setResponsable(plan.responsable);
    setEstado(plan.estado);
    setObservaciones(plan.observacionesEstudiante ?? "");
    setEditando(false);
  }, [plan]);

  // Genera sugerencias dinámicas
  const sugerencias = useMemo(
    () => generarSugerencias(empleado, ultima, configCriterios),
    [empleado, ultima, configCriterios]
  );

  // ¿Cuáles sugerencias NO están ya en la lista de acciones?
  const sugerenciasDisponibles = sugerencias.filter(
    (s) => !acciones.some((a) => a.trim() === s.trim())
  );

  const handleAddAccion = () => {
    const v = nuevaAccion.trim();
    if (!v) return;
    setAcciones((prev) => [...prev, v]);
    setNuevaAccion("");
  };

  const handleRemoveAccion = (idx: number) => {
    setAcciones((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEditAccion = (idx: number, value: string) => {
    setAcciones((prev) => prev.map((a, i) => (i === idx ? value : a)));
  };

  const handleAceptarSugerencia = (sugerencia: string) => {
    setAcciones((prev) => [...prev, sugerencia]);
    toast.success("Sugerencia añadida al plan.");
  };

  const handleGuardar = () => {
    const nuevoPlan: PlanMejora = {
      generado: true,
      criterioMasBajo: plan.criterioMasBajo,
      acciones: acciones.filter((a) => a.trim().length > 0),
      fechaSeguimiento: new Date(fechaSeguimiento).toISOString(),
      responsable: responsable.trim() || plan.responsable,
      estado,
      observacionesEstudiante: observaciones,
    };
    onSave?.(nuevoPlan);
    setEditando(false);
  };

  const handleCancelar = () => {
    setAcciones(plan.acciones ?? []);
    setFechaSeguimiento(toInputDate(plan.fechaSeguimiento));
    setResponsable(plan.responsable);
    setEstado(plan.estado);
    setObservaciones(plan.observacionesEstudiante ?? "");
    setEditando(false);
  };

  const handleRestaurarSugerencias = () => {
    // Restaura las sugerencias automáticas en base al criterio más bajo
    const masBajo = getCriterioMasBajo(ultima.criterios, configCriterios);
    const base = masBajo
      ? accionesRecomendadas(masBajo.nombre, masBajo.puntaje)
      : accionesRecomendadas("desempeño general", ultima.puntuacionFinal);
    setAcciones(base);
    toast.info("Acciones restauradas a las sugerencias automáticas.");
  };

  const Icon =
    estado === "Completado" ? CheckCircle2 : estado === "En curso" ? Loader2 : Circle;

  const estadoColor =
    estado === "Completado"
      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
      : estado === "En curso"
      ? "bg-blue-100 text-blue-700 border-blue-300"
      : "bg-amber-100 text-amber-700 border-amber-300";

  return (
    <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-5 w-5 text-amber-600" />
            Plan de Mejora
            {editando ? (
              <Badge className="bg-amber-200 text-amber-800" variant="outline">
                Editando
              </Badge>
            ) : null}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={estadoColor} variant="outline">
              <Icon className="mr-1 h-3.5 w-3.5" />
              {estado}
            </Badge>
            {!editando ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => setEditando(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar plan
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1"
                  onClick={handleCancelar}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancelar
                </Button>
                <Button size="sm" className="gap-1" onClick={handleGuardar}>
                  <Save className="h-3.5 w-3.5" />
                  Guardar plan
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Datos del plan: criterio bajo, seguimiento, responsable, estado */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserCog className="h-3.5 w-3.5" /> Criterio más bajo
            </p>
            <p className="mt-1 text-sm font-semibold">{plan.criterioMasBajo}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" /> Seguimiento
            </p>
            {editando ? (
              <Input
                type="date"
                value={fechaSeguimiento}
                onChange={(e) => setFechaSeguimiento(e.target.value)}
                className="mt-1 h-8 text-sm"
              />
            ) : (
              <p className="mt-1 text-sm font-semibold">
                {formatDate(new Date(fechaSeguimiento).toISOString())}
              </p>
            )}
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserCog className="h-3.5 w-3.5" /> Responsable
            </p>
            {editando ? (
              <Input
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="mt-1 h-8 text-sm"
              />
            ) : (
              <p className="mt-1 text-sm font-semibold">{responsable}</p>
            )}
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" /> Estado
            </p>
            {editando ? (
              <Select
                value={estado}
                onValueChange={(v) => setEstado(v as EstadoPlan)}
              >
                <SelectTrigger className="mt-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="mt-1 text-sm font-semibold">{estado}</p>
            )}
          </div>
        </div>

        {/* Acciones recomendadas (editables) */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Acciones recomendadas ({acciones.length})
            </p>
            {editando && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={handleRestaurarSugerencias}
                title="Restaurar a las acciones automáticas sugeridas"
              >
                <RotateCcw className="h-3 w-3" />
                Restaurar sugerencias
              </Button>
            )}
          </div>

          {acciones.length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/30 p-3 text-center text-xs text-muted-foreground">
              No hay acciones en el plan.{" "}
              {editando
                ? "Agrega una nueva acción o acepta una sugerencia abajo."
                : "Edita el plan para agregar acciones."}
            </p>
          ) : (
            <ul className="space-y-2">
              {acciones.map((a, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-md border bg-card p-2.5 text-sm"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">
                    {i + 1}
                  </span>
                  {editando ? (
                    <Textarea
                      value={a}
                      onChange={(e) => handleEditAccion(i, e.target.value)}
                      rows={2}
                      className="flex-1 resize-y text-sm"
                    />
                  ) : (
                    <span className="flex-1">{a}</span>
                  )}
                  {editando && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-destructive"
                      onClick={() => handleRemoveAccion(i)}
                      aria-label="Eliminar acción"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {editando && (
            <div className="mt-2 flex gap-2">
              <Input
                value={nuevaAccion}
                onChange={(e) => setNuevaAccion(e.target.value)}
                placeholder="Escribe una nueva acción y pulsa +"
                className="h-9 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddAccion();
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddAccion}
                className="gap-1"
                disabled={!nuevaAccion.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </Button>
            </div>
          )}
        </div>

        {/* Sugerencias de la app */}
        {editando && sugerenciasDisponibles.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:bg-amber-950/30">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <Lightbulb className="h-3.5 w-3.5" />
              Sugerencias automáticas (basadas en el criterio más bajo, el área y
              el tipo de competencia débil)
            </p>
            <ul className="space-y-1.5">
              {sugerenciasDisponibles.map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-md border bg-card p-2 text-xs"
                >
                  <span className="flex-1">{s}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 shrink-0 gap-1 text-[11px] text-emerald-600"
                    onClick={() => handleAceptarSugerencia(s)}
                  >
                    <Check className="h-3 w-3" />
                    Aceptar
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Observaciones del estudiante */}
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Observaciones del estudiante
          </p>
          {editando ? (
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas, justificaciones o compromisos adicionales del estudiante…"
              rows={3}
              className="resize-y text-sm"
            />
          ) : (
            <p className="rounded-md border bg-card p-2.5 text-sm">
              {observaciones.trim() || (
                <span className="text-muted-foreground">
                  Sin observaciones del estudiante.
                </span>
              )}
            </p>
          )}
        </div>

        {/* Contexto del plan */}
        <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">
            Contexto del plan
          </p>
          <p>
            Empleado: <span className="font-medium">{empleado.nombre}</span> · Área:{" "}
            <span className="font-medium">{empleado.departamento}</span> · Cargo:{" "}
            <span className="font-medium">{empleado.cargo}</span>
          </p>
          <p>
            Calificación final:{" "}
            <span className="font-medium">{ultima.calificacion}</span> ·{" "}
            Puntuación:{" "}
            <span className="font-medium">{formatScore(ultima.puntuacionFinal)}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ===================== Helpers ===================== */

function toInputDate(iso?: string): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/**
 * Genera sugerencias de acciones basadas en:
 * 1. El criterio más bajo del empleado (acciones específicas del criterio).
 * 2. El área del empleado (acciones orientadas al área).
 * 3. El tipo de competencia más débil (acciones de mejora por tipo).
 */
function generarSugerencias(
  empleado: Empleado,
  ultima: Evaluacion,
  configCriterios: Criterio[]
): string[] {
  const out: string[] = [];

  // 1. Acciones específicas para el criterio más bajo
  const masBajo = getCriterioMasBajo(ultima.criterios, configCriterios);
  if (masBajo) {
    const accionesCriterio = accionesRecomendadas(masBajo.nombre, masBajo.puntaje);
    out.push(...accionesCriterio.slice(0, 2));
  }

  // 2. Acciones orientadas al área
  const area = empleado.departamento;
  out.push(
    `Coordinar con el área de ${area} un cronograma de seguimiento quincenal para verificar avances.`
  );

  // 3. Acciones por tipo de competencia más débil
  const tipos: TipoCompetencia[] = ["tecnica", "blanda", "organizacional"];
  let peorTipo: TipoCompetencia = "tecnica";
  let peorValor = 101;
  for (const t of tipos) {
    const v = getPromedioPorTipo(ultima, configCriterios, t);
    if (v < peorValor) {
      peorValor = v;
      peorTipo = t;
    }
  }
  const sugerenciasPorTipo: Record<TipoCompetencia, string> = {
    tecnica:
      "Programar capacitación técnica específica del cargo durante el próximo mes.",
    blanda:
      "Inscribir al empleado en taller de habilidades blandas (comunicación y trabajo en equipo).",
    organizacional:
      "Definir compromisos por escrito sobre asistencia y puntualidad, con seguimiento semanal.",
  };
  out.push(sugerenciasPorTipo[peorTipo]);

  // Eliminar duplicados manteniendo el orden
  return Array.from(new Set(out));
}

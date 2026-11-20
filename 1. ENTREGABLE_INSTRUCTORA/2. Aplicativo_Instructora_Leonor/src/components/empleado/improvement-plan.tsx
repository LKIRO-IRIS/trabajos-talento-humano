"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarClock, UserCog, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { EstadoPlan } from "@/lib/types";
import { useState } from "react";
import { toast } from "sonner";

interface PlanData {
  generado: boolean;
  criterioMasBajo: string;
  acciones: string[];
  fechaSeguimiento: string;
  responsable: string;
  estado: EstadoPlan;
}

interface Props {
  plan: PlanData;
  onEstadoChange?: (estado: EstadoPlan) => void;
}

const ESTADOS: EstadoPlan[] = ["Pendiente", "En curso", "Completado"];

export function ImprovementPlan({ plan, onEstadoChange }: Props) {
  const [estado, setEstado] = useState<planData["estado"]>(plan.estado);

  const handleEstado = (v: EstadoPlan) => {
    setEstado(v);
    onEstadoChange?.(v);
    toast.success(`Plan marcado como "${v}".`);
  };

  const Icon =
    estado === "Completado"
      ? CheckCircle2
      : estado === "En curso"
      ? Loader2
      : Circle;

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
            Plan de Mejora Automático
          </CardTitle>
          <Badge className={estadoColor} variant="outline">
            <Icon className="mr-1 h-3.5 w-3.5" />
            {estado}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
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
            <p className="mt-1 text-sm font-semibold">
              {formatDate(plan.fechaSeguimiento)}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserCog className="h-3.5 w-3.5" /> Responsable
            </p>
            <p className="mt-1 text-sm font-semibold">{plan.responsable}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Acciones recomendadas
          </p>
          <ul className="space-y-2">
            {plan.acciones.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">
                  {i + 1}
                </span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-xs text-muted-foreground">Actualizar estado:</span>
          <Select value={estado} onValueChange={(v) => handleEstado(v as EstadoPlan)}>
            <SelectTrigger className="w-40">
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
          {onEstadoChange ? (
            <Button size="sm" variant="outline" onClick={() => handleEstado(estado)}>
              Guardar
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

type planData = { estado: EstadoPlan };

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  badgeClassCalificacion,
  formatScore,
  getColorCalificacion,
} from "@/lib/utils";
import type { Calificacion, Criterio, PuntajeCriterio } from "@/lib/types";
import { getCalificacion } from "@/lib/evaluacion";

interface Props {
  puntuacionFinal: number;
  calificacion: Calificacion;
  criterios: PuntajeCriterio[];
  configCriterios: Criterio[];
}

export function ResultadoPreview({
  puntuacionFinal,
  calificacion,
  criterios,
  configCriterios,
}: Props) {
  const color = getColorCalificacion(calificacion);

  return (
    <Card className="overflow-hidden border-2" style={{ borderColor: color }}>
      <div
        className="px-5 py-4 text-white"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
      >
        <p className="text-xs font-medium uppercase tracking-wider opacity-90">
          Resultado Final
        </p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <div>
            <span className="text-4xl font-bold tracking-tight">
              {formatScore(puntuacionFinal)}
            </span>
            <span className="ml-1 text-lg opacity-80">/ 100</span>
          </div>
          <Badge
            className="border-0 bg-white/20 text-white backdrop-blur"
            variant="outline"
          >
            {calificacion}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Desglose por criterio
        </p>
        <div className="space-y-2.5">
          {configCriterios.map((cfg) => {
            const puntaje =
              criterios.find((c) => c.criterioId === cfg.id)?.puntaje ?? 0;
            const aporte = (puntaje * cfg.peso) / 100;
            return (
              <div key={cfg.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {cfg.nombre}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatScore(puntaje)} × {cfg.peso}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${puntaje}%`,
                        backgroundColor: getColorCalificacion(
                          getCalificacion(puntaje)
                        ),
                      }}
                    />
                  </div>
                </div>
                <div className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">
                  {formatScore(aporte)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <span className="text-sm font-semibold">Puntuación final</span>
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color }}
          >
            {formatScore(puntuacionFinal)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

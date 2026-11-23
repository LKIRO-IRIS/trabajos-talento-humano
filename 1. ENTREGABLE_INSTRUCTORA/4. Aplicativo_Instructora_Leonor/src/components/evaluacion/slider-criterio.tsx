"use client";

import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn, formatScore } from "@/lib/utils";
import type { Criterio } from "@/lib/types";

interface Props {
  criterio: Criterio;
  value: number;
  onChange: (v: number) => void;
}

export function SliderCriterio({ criterio, value, onChange }: Props) {
  // Color de la barra según puntaje
  const barColor =
    value >= 90 ? "#16A34A" : value >= 75 ? "#2563EB" : value >= 60 ? "#F59E0B" : "#DC2626";

  return (
    <div className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">{criterio.nombre}</h4>
            <Badge variant="secondary" className="text-[10px]">
              Peso {criterio.peso}%
            </Badge>
          </div>
          {criterio.descripcion ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {criterio.descripcion}
            </p>
          ) : null}
        </div>
        <div
          className="flex h-12 min-w-[3.5rem] items-center justify-center rounded-lg px-2 text-lg font-bold tabular-nums"
          style={{ backgroundColor: `${barColor}1A`, color: barColor }}
        >
          {formatScore(value)}
        </div>
      </div>

      <div className="mt-4 px-1">
        <Slider
          value={[value]}
          min={1}
          max={100}
          step={1}
          onValueChange={(v) => onChange(v[0])}
          aria-label={criterio.nombre}
        />
        <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
          <span>1</span>
          <span>60</span>
          <span>75</span>
          <span>90</span>
          <span>100</span>
        </div>
      </div>

      {/* Barra de progreso visual */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-200")}
          style={{ width: `${value}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

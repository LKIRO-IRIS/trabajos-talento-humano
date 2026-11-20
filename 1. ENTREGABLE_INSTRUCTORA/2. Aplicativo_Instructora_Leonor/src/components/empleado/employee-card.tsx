"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  badgeClassCalificacion,
  formatScore,
  getAvatarColor,
  getIniciales,
} from "@/lib/utils";
import type { Empleado, Evaluacion } from "@/lib/types";

interface Props {
  empleado: Empleado;
  ultima: Evaluacion | null;
  promedio: number;
  evaluacionesCount: number;
}

export function EmployeeCard({
  empleado,
  ultima,
  promedio,
  evaluacionesCount,
}: Props) {
  const color = getAvatarColor(empleado.nombre);
  return (
    <Link href={`/empleado/${empleado.id}`} className="block">
      <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: color }}
            >
              {getIniciales(empleado.nombre)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{empleado.nombre}</p>
              <p className="truncate text-xs text-muted-foreground">
                {empleado.cargo} · {empleado.departamento}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold tracking-tight">
                {ultima ? formatScore(promedio) : "—"}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Promedio · {evaluacionesCount} eval.
              </p>
            </div>
            {ultima ? (
              <Badge
                variant="outline"
                className={badgeClassCalificacion(ultima.calificacion)}
              >
                {ultima.calificacion}
              </Badge>
            ) : (
              <Badge variant="secondary">Sin evaluar</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

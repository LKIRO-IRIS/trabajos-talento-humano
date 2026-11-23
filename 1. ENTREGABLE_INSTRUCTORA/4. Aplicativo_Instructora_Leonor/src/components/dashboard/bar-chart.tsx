"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { getColorCalificacion } from "@/lib/utils";
import { getCalificacion } from "@/lib/evaluacion";

interface BarDatum {
  nombre: string;
  puntuacion: number;
}

interface Props {
  data: BarDatum[];
  height?: number;
}

export function BarChartCard({ data, height = 320 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="nombre"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          interval={0}
          angle={-15}
          textAnchor="end"
          height={60}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <Tooltip
          cursor={{ fill: "rgba(var(--brand-primary-rgb), 0.08)" }}
          contentStyle={{
            backgroundColor: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--popover-foreground)",
          }}
          formatter={(v: number) => [v.toFixed(1), "Puntuación"]}
        />
        <Bar dataKey="puntuacion" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {data.map((d, i) => (
            <Cell key={i} fill={getColorCalificacion(getCalificacion(d.puntuacion))} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

"use client";

import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
} from "recharts";

interface RadarDatum {
  criterio: string;
  puntaje: number;
  promedio?: number;
}

interface Props {
  data: RadarDatum[];
  height?: number;
}

export function RadarChartCard({ data, height = 320 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey="criterio"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <PolarRadiusAxis
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          angle={90}
        />
        <Radar
          name="Promedio"
          dataKey="puntaje"
          stroke="var(--brand-primary)"
          fill="var(--brand-primary)"
          fillOpacity={0.4}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--popover-foreground)",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

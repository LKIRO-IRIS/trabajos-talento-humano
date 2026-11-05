"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCompanyTheme, type CompanyId } from "@/lib/analysis";
import { FormatShell, SectionTitle } from "@/components/sigth/gestion/FormatShell";
import { useCronograma } from "@/components/sigth/gestion/Dashboard";
import {
  CRONOGRAMA_PROCESSES,
  type CronogramaRow,
} from "@/components/sigth/gestion/cronograma-data";

export function TH22Cronograma({ company }: { company: CompanyId }) {
  const theme = getCompanyTheme(company);
  const accent = `#${theme.accent}`;
  const [rows, setRows] = useCronograma();
  const [collapsed, setCollapsed] = React.useState<Set<number>>(new Set());

  const toggleCollapse = (idx: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

  const updateRow = (id: string, patch: Partial<CronogramaRow>) =>
    setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const total = rows.length;
  const done = rows.filter((r) => r.done).length;
  const pct = Math.round((done / total) * 100);

  return (
    <FormatShell
      formatId="TH-22"
      formatName="Cronograma de Actividades de Talento Humano"
      company={company}
      onReset={() => {
        if (
          typeof window !== "undefined" &&
          !window.confirm("¿Restablecer el cronograma? Se perderán todas las marcas y observaciones.")
        )
          return;
        setRows(
          rows.map((r) => ({
            ...r,
            done: false,
            executedDate: "",
            observations: "",
            responsible: r.responsible, // keep default responsible
          })),
        );
      }}
      exportData={{ rows }}
      onImport={(imported) => {
        if (imported && typeof imported === "object" && "rows" in imported) {
          const arr = (imported as { rows: CronogramaRow[] }).rows;
          if (Array.isArray(arr)) setRows(arr);
        }
      }}
    >
      {/* Summary */}
      <div
        className="rounded-md p-4 mb-4 flex items-center justify-between gap-3"
        style={{ background: `linear-gradient(135deg, #${theme.dark}, #${theme.dark}cc)`, color: "#fff" }}
      >
        <div>
          <div className="text-xs uppercase tracking-wide opacity-80">Resumen general</div>
          <div className="text-2xl font-extrabold" style={{ color: accent }}>
            {done} / {total} actividades
          </div>
          <div className="text-xs opacity-80">
            8 procesos · {CRONOGRAMA_PROCESSES.length} categorías
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black" style={{ color: accent }}>
            {pct}%
          </div>
          <div className="text-[10px] opacity-70 uppercase tracking-wide">Avance</div>
        </div>
      </div>

      <Progress value={pct} className="h-3 mb-5" />

      {/* Process sections */}
      <SectionTitle accent={accent}>Detalle por Proceso</SectionTitle>
      <div className="space-y-3">
        {CRONOGRAMA_PROCESSES.map((proc, idx) => {
          const pRows = rows.filter((r) => r.process === idx);
          const pDone = pRows.filter((r) => r.done).length;
          const pPct = Math.round((pDone / pRows.length) * 100);
          const isCollapsed = collapsed.has(idx);
          return (
            <div key={idx} className="border border-border rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCollapse(idx)}
                className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 text-white"
                style={{ background: proc.color }}
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  <span className="font-bold text-xs sm:text-sm uppercase tracking-wide">
                    {String(idx + 1).padStart(2, "0")}. {proc.name}
                  </span>
                  <Badge className="text-[10px] py-0 px-1.5 bg-white/20 text-white">
                    {pDone}/{pRows.length}
                  </Badge>
                </div>
                <span className="text-xs font-bold opacity-90">{pPct}%</span>
              </button>
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse min-w-[920px]">
                    <thead style={{ background: `${proc.color}22`, color: proc.color }}>
                      <tr className="border-b border-border">
                        <th className="p-2 text-left w-8 text-center">✓</th>
                        <th className="p-2 text-left w-8">#</th>
                        <th className="p-2 text-left">Actividad</th>
                        <th className="p-2 text-left w-24">Formato</th>
                        <th className="p-2 text-left w-32">Fecha planeada</th>
                        <th className="p-2 text-left w-32">Fecha ejecutada</th>
                        <th className="p-2 text-left w-36">Responsable</th>
                        <th className="p-2 text-left">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pRows.map((r) => (
                        <tr
                          key={r.id}
                          className={cn(
                            "border-b border-border",
                            r.done ? "bg-green-50" : "bg-background",
                          )}
                        >
                          <td className="p-2 text-center">
                            <Checkbox
                              checked={r.done}
                              onCheckedChange={(c) =>
                                updateRow(r.id, {
                                  done: Boolean(c),
                                  executedDate: Boolean(c)
                                    ? new Date().toISOString().slice(0, 10)
                                    : r.executedDate,
                                })
                              }
                            />
                          </td>
                          <td className="p-2 text-center font-bold text-muted-foreground">
                            {r.number}
                          </td>
                          <td className="p-2">
                            <span className={cn("font-medium", r.done && "line-through text-muted-foreground")}>
                              {r.name}
                            </span>
                          </td>
                          <td className="p-2">
                            {r.format ? (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                {r.format}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-1">
                            <Input
                              type="date"
                              value={r.plannedDate}
                              onChange={(e) =>
                                updateRow(r.id, { plannedDate: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="p-1">
                            <Input
                              type="date"
                              value={r.executedDate}
                              onChange={(e) =>
                                updateRow(r.id, { executedDate: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="p-1">
                            <Input
                              value={r.responsible}
                              onChange={(e) =>
                                updateRow(r.id, { responsible: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="p-1">
                            <Input
                              value={r.observations}
                              onChange={(e) =>
                                updateRow(r.id, { observations: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rb-no-print mt-4 text-[10px] text-muted-foreground italic">
        Total: {total} actividades distribuidas en 8 procesos del ciclo PHVA (Planear, Hacer,
        Verificar, Actuar) de gestión de talento humano. Marca el check ✓ para registrar el avance.
      </div>
    </FormatShell>
  );
}

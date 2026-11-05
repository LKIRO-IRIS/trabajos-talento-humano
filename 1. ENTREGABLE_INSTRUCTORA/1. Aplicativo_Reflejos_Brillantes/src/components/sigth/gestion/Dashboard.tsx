"use client";

import * as React from "react";
import { CheckCircle2, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCompanyTheme, type CompanyId } from "@/lib/analysis";
import {
  CRONOGRAMA_PROCESSES,
  CRONOGRAMA_ACTIVITIES,
  buildInitialCronograma,
  type CronogramaRow,
} from "@/components/sigth/gestion/cronograma-data";
import { CRONOGRAMA_LS_KEY } from "@/components/sigth/gestion/formats-catalog";

/** Hook used by both TH-TB-01 (Dashboard) and TH-22 (Cronograma). */
export function useCronograma(): [CronogramaRow[], (rows: CronogramaRow[]) => void] {
  const [rows, setRows] = React.useState<CronogramaRow[]>(() => buildInitialCronograma());
  const [loaded, setLoaded] = React.useState(false);

  // Load from LocalStorage on mount
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CRONOGRAMA_LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CronogramaRow[];
        // Merge with current defaults to handle new activities
        const base = buildInitialCronograma();
        const merged = base.map((b) => {
          const saved = parsed.find((p) => p.id === b.id);
          return saved ?? b;
        });
        setRows(merged);
      }
    } catch {}
    setLoaded(true);
  }, []);

  // Auto-save on change (after initial load) + broadcast a custom event so
  // other instances of this hook (Dashboard + Cronograma) stay in sync.
  React.useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(CRONOGRAMA_LS_KEY, JSON.stringify(rows));
      window.dispatchEvent(
        new CustomEvent("sigth-cronograma-change", { detail: rows }),
      );
    } catch {}
  }, [rows, loaded]);

  // Listen for changes from other instances of this hook in the same document
  React.useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as CronogramaRow[] | undefined;
        if (Array.isArray(detail)) {
          setRows(detail);
          return;
        }
        // Fallback: read from localStorage
        const raw = window.localStorage.getItem(CRONOGRAMA_LS_KEY);
        if (raw) setRows(JSON.parse(raw) as CronogramaRow[]);
      } catch {}
    };
    window.addEventListener("sigth-cronograma-change", handler);
    return () => window.removeEventListener("sigth-cronograma-change", handler);
  }, []);

  return [rows, setRows];
}

function isOverdue(row: CronogramaRow): boolean {
  if (row.done) return false;
  if (!row.plannedDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const planned = new Date(row.plannedDate + "T00:00:00");
  return planned < today;
}

function isDueInNextDays(row: CronogramaRow, days: number): boolean {
  if (row.done) return false;
  if (!row.plannedDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const planned = new Date(row.plannedDate + "T00:00:00");
  const diff = (planned.getTime() - today.getTime()) / (24 * 60 * 60 * 1000);
  return diff >= 0 && diff <= days;
}

export function Dashboard({
  company,
  rows,
  onSelect,
}: {
  company: CompanyId;
  rows: CronogramaRow[];
  onSelect?: (processId: number) => void;
}) {
  const theme = getCompanyTheme(company);
  const total = rows.length;
  const done = rows.filter((r) => r.done).length;
  const overdue = rows.filter(isOverdue).length;
  const dueSoon = rows.filter((r) => isDueInNextDays(r, 14)).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const kpis = [
    {
      label: "Avance general",
      value: `${pct}%`,
      sub: `${done} de ${total} actividades`,
      icon: <TrendingUp className="w-5 h-5" />,
      color: `#${theme.accent}`,
      bg: `#${theme.accent}22`,
    },
    {
      label: "Actividades hechas",
      value: String(done),
      sub: `de ${total} totales`,
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: "#2E7D32",
      bg: "#E8F5E9",
    },
    {
      label: "Atrasadas",
      value: String(overdue),
      sub: "fecha planeada vencida",
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "#C62828",
      bg: "#FFEBEE",
    },
    {
      label: "Vencen en 14 días",
      value: String(dueSoon),
      sub: "próximas a vencer",
      icon: <Clock className="w-5 h-5" />,
      color: "#F9A825",
      bg: "#FFF8E1",
    },
  ];

  // Process-level stats
  const processStats = CRONOGRAMA_PROCESSES.map((p, idx) => {
    const pRows = rows.filter((r) => r.process === idx);
    const pDone = pRows.filter((r) => r.done).length;
    const pTotal = pRows.length || p.count;
    const pPct = pTotal > 0 ? Math.round((pDone / pTotal) * 100) : 0;
    const pOverdue = pRows.filter(isOverdue).length;
    return { ...p, idx, done: pDone, total: pTotal, pct: pPct, overdue: pOverdue };
  });

  return (
    <div className="space-y-5">
      {/* === Header === */}
      <div
        className="rounded-lg p-5 text-white"
        style={{
          background: `linear-gradient(135deg, #${theme.dark}, #${theme.dark}cc)`,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              className="text-xl sm:text-2xl font-extrabold tracking-tight"
              style={{ color: `#${theme.accent}` }}
            >
              Tablero de Control · TH-TB-01
            </h2>
            <p className="text-xs sm:text-sm opacity-80 mt-0.5">
              Avance por proceso del ciclo de gestión del talento humano · 8 procesos · 61 actividades
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl sm:text-5xl font-black" style={{ color: `#${theme.accent}` }}>
              {pct}%
            </div>
            <div className="text-[10px] opacity-70 uppercase tracking-wide">
              Avance global
            </div>
          </div>
        </div>
      </div>

      {/* === KPI cards === */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="overflow-hidden">
            <CardContent className="p-4 flex items-start gap-3">
              <div
                className="rounded-lg p-2 shrink-0"
                style={{ background: k.bg, color: k.color }}
              >
                {k.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {k.label}
                </div>
                <div
                  className="text-2xl font-extrabold leading-tight"
                  style={{ color: k.color }}
                >
                  {k.value}
                </div>
                <div className="text-[10px] text-muted-foreground">{k.sub}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* === Process progress bars === */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground/80">
              Avance por proceso
            </h3>
            <Badge variant="outline" className="text-xs">
              {processStats.reduce((s, p) => s + p.done, 0)} /{" "}
              {processStats.reduce((s, p) => s + p.total, 0)} actividades
            </Badge>
          </div>
          <div className="space-y-3">
            {processStats.map((p) => {
              const isComplete = p.pct === 100;
              const isOverdue = p.overdue > 0;
              return (
                <button
                  key={p.idx}
                  type="button"
                  onClick={() => onSelect?.(p.idx)}
                  className="w-full text-left rounded-lg border border-border bg-background hover:bg-muted/40 transition-colors p-3"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: p.color }}
                      />
                      <span className="text-xs sm:text-sm font-bold uppercase tracking-wide truncate">
                        {String(p.idx + 1).padStart(2, "0")}. {p.name}
                      </span>
                      {isComplete && (
                        <Badge className="text-[9px] py-0 px-1.5 bg-green-600 text-white">
                          ✓ COMPLETO
                        </Badge>
                      )}
                      {isOverdue && (
                        <Badge className="text-[9px] py-0 px-1.5 bg-red-600 text-white">
                          {p.overdue} ATRASADA{p.overdue !== 1 ? "S" : ""}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs font-bold whitespace-nowrap">
                      {p.done} / {p.total} · {p.pct}%
                    </span>
                  </div>
                  <div
                    className="relative h-3 w-full overflow-hidden rounded-full"
                    style={{ background: `${p.color}22` }}
                  >
                    <div
                      className={cn(
                        "h-full transition-all",
                        isComplete ? "bg-green-600" : isOverdue ? "bg-red-500" : "",
                      )}
                      style={{
                        width: `${p.pct}%`,
                        background: isComplete
                          ? "#2E7D32"
                          : isOverdue
                          ? `linear-gradient(90deg, ${p.color}, #C62828)`
                          : p.color,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* === Activities quick view === */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground/80 mb-3">
            Próximas actividades (14 días)
          </h3>
          <div className="max-h-72 overflow-y-auto rb-chat-scroll space-y-1.5">
            {rows.filter((r) => isDueInNextDays(r, 14)).length === 0 && (
              <div className="text-xs text-muted-foreground italic py-2">
                No hay actividades planeadas para los próximos 14 días.
              </div>
            )}
            {rows
              .filter((r) => isDueInNextDays(r, 14) || isOverdue(r))
              .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate))
              .map((r) => {
                const overdue = isOverdue(r);
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "flex items-center justify-between gap-2 text-xs px-2.5 py-1.5 rounded border",
                      overdue
                        ? "border-red-300 bg-red-50"
                        : "border-border bg-muted/40",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                        style={{ background: CRONOGRAMA_PROCESSES[r.process].color }}
                      >
                        {String(r.number).padStart(2, "0")}
                      </span>
                      <span className="truncate font-medium">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {r.responsible || "—"}
                      </span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-bold",
                          overdue ? "bg-red-600 text-white" : "bg-yellow-500 text-white",
                        )}
                      >
                        {overdue ? "VENCIDA" : r.plannedDate}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { CRONOGRAMA_ACTIVITIES };

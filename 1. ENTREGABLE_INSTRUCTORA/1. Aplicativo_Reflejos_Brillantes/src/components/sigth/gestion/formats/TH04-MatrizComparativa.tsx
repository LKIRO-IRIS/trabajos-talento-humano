"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCompanyTheme, type CompanyId } from "@/lib/analysis";
import {
  FormatShell,
  useFormatData,
  SectionTitle,
  FieldLabel,
} from "@/components/sigth/gestion/FormatShell";

const CRITERIA = [
  "Formación académica",
  "Experiencia laboral",
  "Prueba técnica",
  "Entrevista estructurada",
  "Aspiración salarial",
] as const;

export interface TH04Data {
  cargo: string;
  fechaEvaluacion: string;
  candidatos: string[]; // candidate names
  scores: number[][]; // [criteriaIndex][candIndex] = 1-5 (or 0 if empty)
  observaciones: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const initialData: TH04Data = {
  cargo: "",
  fechaEvaluacion: "",
  candidatos: ["Candidato 1", "Candidato 2", "Candidato 3"],
  scores: CRITERIA.map(() => [0, 0, 0]),
  observaciones: "",
};

export function TH04MatrizComparativa({ company }: { company: CompanyId }) {
  const theme = getCompanyTheme(company);
  const accent = `#${theme.accent}`;
  const [data, setData, reset] = useFormatData<TH04Data>("TH-04", initialData);

  const set = <K extends keyof TH04Data>(key: K, value: TH04Data[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const setCandidate = (idx: number, value: string) => {
    const next = [...data.candidatos];
    next[idx] = value;
    set("candidatos", next);
  };

  const setScore = (critIdx: number, candIdx: number, value: number) => {
    const next = data.scores.map((row) => [...row]);
    next[critIdx][candIdx] = value;
    set("scores", next);
  };

  const addCandidate = () => {
    const n = data.candidatos.length + 1;
    set("candidatos", [...data.candidatos, `Candidato ${n}`]);
    set(
      "scores",
      data.scores.map((row) => [...row, 0]),
    );
  };
  const removeCandidate = (idx: number) => {
    if (data.candidatos.length <= 1) return;
    set(
      "candidatos",
      data.candidatos.filter((_, i) => i !== idx),
    );
    set(
      "scores",
      data.scores.map((row) => row.filter((_, i) => i !== idx)),
    );
  };

  // Calculate averages per candidate (avg of all criteria, multiplied by 20 to get a 0-100 scale)
  const averages = data.candidatos.map((_, cIdx) => {
    const sum = data.scores.reduce((s, row) => s + (row[cIdx] || 0), 0);
    const count = data.scores.filter((row) => (row[cIdx] || 0) > 0).length;
    return count > 0 ? (sum / count).toFixed(2) : "—";
  });

  // Determine winner
  const winnerIdx = (() => {
    let max = -1;
    let idx = -1;
    averages.forEach((a, i) => {
      const n = parseFloat(a);
      if (!isNaN(n) && n > max) {
        max = n;
        idx = i;
      }
    });
    return idx;
  })();

  return (
    <FormatShell
      formatId="TH-04"
      formatName="Matriz Comparativa de Candidatos"
      company={company}
      onReset={reset}
      exportData={data}
      onImport={(imported) => {
        if (imported && typeof imported === "object") {
          setData({ ...initialData, ...(imported as Partial<TH04Data>) });
        }
      }}
    >
      <SectionTitle n={1} accent={accent}>
        Datos de la Evaluación
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div>
          <FieldLabel>Cargo a proveer</FieldLabel>
          <Input
            value={data.cargo}
            onChange={(e) => set("cargo", e.target.value)}
            placeholder="Ej: Auxiliar Logístico"
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Fecha de evaluación</FieldLabel>
          <Input
            type="date"
            value={data.fechaEvaluacion}
            onChange={(e) => set("fechaEvaluacion", e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <SectionTitle n={2} accent={accent}>
        Matriz de Calificación (1-5)
      </SectionTitle>
      <div className="overflow-x-auto mb-3">
        <Table className="text-xs">
          <TableHeader>
            <TableRow style={{ background: accent }}>
              <TableHead className="text-white font-bold p-2 w-44">Criterio</TableHead>
              {data.candidatos.map((c, idx) => (
                <TableHead key={idx} className="text-white font-bold p-2 min-w-[120px]">
                  <Input
                    value={c}
                    onChange={(e) => setCandidate(idx, e.target.value)}
                    className="bg-white/15 text-white border-white/30 h-8 text-xs font-bold"
                  />
                </TableHead>
              ))}
              <TableHead className="rb-no-print text-white p-2 w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CRITERIA.map((crit, critIdx) => (
              <TableRow key={critIdx} className="border-b border-border">
                <TableCell className="p-2 font-semibold bg-muted/30">{crit}</TableCell>
                {data.candidatos.map((_, cIdx) => (
                  <TableCell key={cIdx} className="p-1 text-center">
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      value={data.scores[critIdx][cIdx] || ""}
                      onChange={(e) => {
                        let v = parseInt(e.target.value, 10);
                        if (isNaN(v)) v = 0;
                        if (v < 0) v = 0;
                        if (v > 5) v = 5;
                        setScore(critIdx, cIdx, v);
                      }}
                      className="h-8 w-16 mx-auto text-center"
                    />
                  </TableCell>
                ))}
                <TableCell className="rb-no-print p-1"></TableCell>
              </TableRow>
            ))}
            {/* Averages row */}
            <TableRow className="bg-muted/50 font-bold">
              <TableCell className="p-2 text-right uppercase text-[11px]">Promedio →</TableCell>
              {averages.map((avg, i) => (
                <TableCell
                  key={i}
                  className="p-2 text-center text-sm"
                  style={{
                    color: i === winnerIdx && avg !== "—" ? "#2E7D32" : undefined,
                  }}
                >
                  {avg}
                  {i === winnerIdx && avg !== "—" && (
                    <span className="ml-1 text-[9px] bg-green-600 text-white px-1 rounded">
                      GANADOR
                    </span>
                  )}
                </TableCell>
              ))}
              <TableCell className="rb-no-print"></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div className="mb-5">
        <Button size="sm" variant="outline" type="button" onClick={addCandidate} className="text-xs h-7">
          <Plus className="w-3 h-3 mr-1" /> Agregar candidato
        </Button>
        {data.candidatos.length > 1 && (
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={() => removeCandidate(data.candidatos.length - 1)}
            className="text-xs h-7 text-destructive ml-2"
          >
            <Trash2 className="w-3 h-3 mr-1" /> Quitar último
          </Button>
        )}
      </div>

      <SectionTitle n={3} accent={accent}>
        Observaciones y Recomendación
      </SectionTitle>
      <div className="mb-3">
        <Label className="text-xs font-semibold text-foreground/80 mb-1 block">
          Observaciones del comité de selección
        </Label>
        <textarea
          value={data.observaciones}
          onChange={(e) => set("observaciones", e.target.value)}
          placeholder="Documento el análisis comparativo, fortalezas/debilidades por candidato y recomendación final."
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {winnerIdx >= 0 && (
        <div
          className="mt-3 p-3 rounded-md text-sm"
          style={{ background: "#E8F5E9", border: "1px solid #2E7D32" }}
        >
          <strong style={{ color: "#2E7D32" }}>Candidato seleccionado:</strong>{" "}
          {data.candidatos[winnerIdx]} — promedio {averages[winnerIdx]}
        </div>
      )}
    </FormatShell>
  );
}

export { uid };

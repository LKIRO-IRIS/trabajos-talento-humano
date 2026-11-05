"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getCompanyTheme, type CompanyId } from "@/lib/analysis";
import {
  FormatShell,
  useFormatData,
  SectionTitle,
  FieldLabel,
  SignatureArea,
} from "@/components/sigth/gestion/FormatShell";

const COMPETENCIAS_SUG = [
  "Liderazgo",
  "Comunicación efectiva",
  "Trabajo en equipo",
  "Orientación al cliente",
  "Resolución de problemas",
  "Planificación y organización",
  "Responsabilidad",
  "Adaptabilidad",
  "Iniciativa",
  "Conocimiento técnico",
] as const;

export interface TH07Row {
  id: string;
  competencia: string;
  pregunta: string;
  respuesta: string;
  puntaje: number; // 1-5, 0 if empty
}

export interface TH07Data {
  candidatoNombre: string;
  candidatoDocumento: string;
  cargoAspira: string;
  fechaEntrevista: string;
  entrevistador: string;
  modalidad: string;
  rows: TH07Row[];
  fortalezas: string;
  mejoras: string;
  concepto: string;
  firmaEntrevistador: { name: string; role: string; signature: string };
  firmaJefe: { name: string; role: string; signature: string };
  firmaTH: { name: string; role: string; signature: string };
}

const uid = () => Math.random().toString(36).slice(2, 10);

const initialData: TH07Data = {
  candidatoNombre: "",
  candidatoDocumento: "",
  cargoAspira: "",
  fechaEntrevista: "",
  entrevistador: "",
  modalidad: "Presencial",
  rows: COMPETENCIAS_SUG.slice(0, 5).map((comp) => ({
    id: uid(),
    competencia: comp,
    pregunta: "",
    respuesta: "",
    puntaje: 0,
  })),
  fortalezas: "",
  mejoras: "",
  concepto: "",
  firmaEntrevistador: { name: "", role: "Entrevistador líder", signature: "" },
  firmaJefe: { name: "", role: "Jefe inmediato", signature: "" },
  firmaTH: { name: "", role: "Gestión Humana", signature: "" },
};

export function TH07Entrevista({ company }: { company: CompanyId }) {
  const theme = getCompanyTheme(company);
  const accent = `#${theme.accent}`;
  const [data, setData, reset] = useFormatData<TH07Data>("TH-07", initialData);

  const set = <K extends keyof TH07Data>(key: K, value: TH07Data[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const addRow = () =>
    set("rows", [
      ...data.rows,
      { id: uid(), competencia: "", pregunta: "", respuesta: "", puntaje: 0 },
    ]);
  const removeRow = (id: string) => set("rows", data.rows.filter((r) => r.id !== id));
  const updateRow = (id: string, field: keyof TH07Row, value: string | number) =>
    set(
      "rows",
      data.rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );

  // Compute averages per competency
  const byComp = new Map<string, number[]>();
  data.rows.forEach((r) => {
    if (r.competencia && r.puntaje > 0) {
      const arr = byComp.get(r.competencia) ?? [];
      arr.push(r.puntaje);
      byComp.set(r.competencia, arr);
    }
  });

  const totalScore = (() => {
    const all = data.rows.filter((r) => r.puntaje > 0);
    if (all.length === 0) return 0;
    const sum = all.reduce((s, r) => s + r.puntaje, 0);
    return Math.round((sum / all.length) * 20); // avg 1-5 * 20 = 0-100
  })();

  const scoreLabel = (() => {
    if (totalScore >= 85) return { txt: "SELECCIONADO", color: "bg-green-600 text-white" };
    if (totalScore >= 70) return { txt: "ELEGIBLE", color: "bg-yellow-500 text-white" };
    return { txt: "NO SELECCIONADO", color: "bg-red-500 text-white" };
  })();

  return (
    <FormatShell
      formatId="TH-07"
      formatName="Entrevista Estructurada"
      company={company}
      onReset={reset}
      exportData={data}
      onImport={(imported) => {
        if (imported && typeof imported === "object") {
          setData({ ...initialData, ...(imported as Partial<TH07Data>) });
        }
      }}
    >
      {/* === Datos === */}
      <SectionTitle n={1} accent={accent}>
        Datos de la Entrevista
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div>
          <FieldLabel>Nombre del candidato</FieldLabel>
          <Input
            value={data.candidatoNombre}
            onChange={(e) => set("candidatoNombre", e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Documento</FieldLabel>
          <Input
            value={data.candidatoDocumento}
            onChange={(e) => set("candidatoDocumento", e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Cargo al que aspira</FieldLabel>
          <Input
            value={data.cargoAspira}
            onChange={(e) => set("cargoAspira", e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Fecha de entrevista</FieldLabel>
          <Input
            type="date"
            value={data.fechaEntrevista}
            onChange={(e) => set("fechaEntrevista", e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Entrevistador</FieldLabel>
          <Input
            value={data.entrevistador}
            onChange={(e) => set("entrevistador", e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Modalidad</FieldLabel>
          <Select value={data.modalidad} onValueChange={(v) => set("modalidad", v)}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Presencial">Presencial</SelectItem>
              <SelectItem value="Virtual">Virtual</SelectItem>
              <SelectItem value="Telefónica">Telefónica</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* === Matriz === */}
      <SectionTitle n={2} accent={accent}>
        Matriz de Preguntas · Escala 1-5
      </SectionTitle>
      <div className="overflow-x-auto mb-3">
        <table className="w-full text-xs border border-border min-w-[760px]">
          <thead style={{ background: accent, color: "#fff" }}>
            <tr>
              <th className="p-2 text-left w-44">Competencia</th>
              <th className="p-2 text-left">Pregunta (situación STAR)</th>
              <th className="p-2 text-left">Respuesta del candidato</th>
              <th className="p-2 text-center w-20">Puntaje</th>
              <th className="rb-no-print p-2 text-center w-10"></th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id} className="border-b border-border">
                <td className="p-1">
                  <Select
                    value={row.competencia}
                    onValueChange={(v) => updateRow(row.id, "competencia", v)}
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPETENCIAS_SUG.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                      <SelectItem value="Otra">Otra</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-1">
                  <Textarea
                    value={row.pregunta}
                    onChange={(e) => updateRow(row.id, "pregunta", e.target.value)}
                    placeholder="Cuéntame de una situación en la que..."
                    rows={2}
                    className="text-xs"
                  />
                </td>
                <td className="p-1">
                  <Textarea
                    value={row.respuesta}
                    onChange={(e) => updateRow(row.id, "respuesta", e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                </td>
                <td className="p-1 text-center">
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={row.puntaje || ""}
                    onChange={(e) => {
                      let v = parseInt(e.target.value, 10);
                      if (isNaN(v)) v = 0;
                      if (v < 0) v = 0;
                      if (v > 5) v = 5;
                      updateRow(row.id, "puntaje", v);
                    }}
                    className="h-8 w-14 mx-auto text-center"
                  />
                </td>
                <td className="rb-no-print p-1 text-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="text-destructive h-7 px-2"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 mb-5">
        <Button size="sm" variant="outline" type="button" onClick={addRow} className="text-xs h-7">
          <Plus className="w-3 h-3 mr-1" /> Agregar pregunta
        </Button>
      </div>

      {/* === Consolidado === */}
      <SectionTitle n={3} accent={accent}>
        Consolidado de Resultados
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <FieldLabel>Promedio por competencia</FieldLabel>
          <div className="border rounded p-2 bg-muted/30 text-xs space-y-1 max-h-40 overflow-y-auto">
            {byComp.size === 0 && (
              <div className="text-muted-foreground italic">Sin datos suficientes</div>
            )}
            {Array.from(byComp.entries()).map(([comp, arr]) => {
              const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
              return (
                <div key={comp} className="flex justify-between items-center">
                  <span>{comp}</span>
                  <Badge variant="outline" className="text-xs">
                    {avg.toFixed(1)}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <FieldLabel>Puntaje final</FieldLabel>
          <div
            className={`rounded-md p-3 text-center font-bold ${scoreLabel.color}`}
          >
            <div className="text-3xl">{totalScore}/100</div>
            <div className="text-xs uppercase tracking-wide mt-1">{scoreLabel.txt}</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <FieldLabel>Fortalezas identificadas</FieldLabel>
          <Textarea
            value={data.fortalezas}
            onChange={(e) => set("fortalezas", e.target.value)}
            rows={3}
          />
        </div>
        <div>
          <FieldLabel>Aspectos a mejorar</FieldLabel>
          <Textarea
            value={data.mejoras}
            onChange={(e) => set("mejoras", e.target.value)}
            rows={3}
          />
        </div>
      </div>
      <div className="mb-5">
        <FieldLabel>Concepto técnico del entrevistador</FieldLabel>
        <Textarea
          value={data.concepto}
          onChange={(e) => set("concepto", e.target.value)}
          rows={3}
          placeholder="Resumen del desempeño general del candidato y recomendación..."
        />
      </div>

      {/* === Firmas === */}
      <SectionTitle accent={accent}>Firmas</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SignatureArea
          label="Entrevistador líder"
          data={data.firmaEntrevistador}
          onChange={(next) => set("firmaEntrevistador", next)}
        />
        <SignatureArea
          label="Jefe inmediato"
          data={data.firmaJefe}
          onChange={(next) => set("firmaJefe", next)}
        />
        <SignatureArea
          label="Gestión Humana"
          data={data.firmaTH}
          onChange={(next) => set("firmaTH", next)}
        />
      </div>
    </FormatShell>
  );
}

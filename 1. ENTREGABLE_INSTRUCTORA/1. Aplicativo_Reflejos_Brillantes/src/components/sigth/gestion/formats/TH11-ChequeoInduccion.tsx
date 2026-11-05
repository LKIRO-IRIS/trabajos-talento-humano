"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getCompanyTheme, type CompanyId } from "@/lib/analysis";
import {
  FormatShell,
  useFormatData,
  SectionTitle,
  FieldLabel,
} from "@/components/sigth/gestion/FormatShell";

export interface TH11Row {
  id: string;
  modulo: string;
  responsable: string;
  fecha: string;
  estado: string; // Completado / Pendiente / N/A
  observacion: string;
}

export interface TH11Data {
  nombresApellidos: string;
  documento: string;
  cargo: string;
  fechaIngreso: string;
  rows: TH11Row[];
  observacionesGenerales: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_ROWS: TH11Row[] = [
  { id: uid(), modulo: "Misión, Visión y Valores", responsable: "Gerencia", fecha: "", estado: "Pendiente", observacion: "" },
  { id: uid(), modulo: "Reglamento Interno de Trabajo", responsable: "Gestión Humana", fecha: "", estado: "Pendiente", observacion: "" },
  { id: uid(), modulo: "Seguridad y Salud en el Trabajo (SST)", responsable: "Coordinador SST", fecha: "", estado: "Pendiente", observacion: "" },
  { id: uid(), modulo: "Política de Calidad", responsable: "Coordinador de Calidad", fecha: "", estado: "Pendiente", observacion: "" },
  { id: uid(), modulo: "Entrega del puesto de trabajo", responsable: "Jefe inmediato", fecha: "", estado: "Pendiente", observacion: "" },
  { id: uid(), modulo: "Sistemas de información", responsable: "TI", fecha: "", estado: "Pendiente", observacion: "" },
];

const initialData: TH11Data = {
  nombresApellidos: "",
  documento: "",
  cargo: "",
  fechaIngreso: "",
  rows: DEFAULT_ROWS,
  observacionesGenerales: "",
};

const estadoColor = (e: string) => {
  switch (e) {
    case "Completado":
      return "bg-green-600 text-white";
    case "Pendiente":
      return "bg-yellow-500 text-white";
    default:
      return "bg-gray-400 text-white";
  }
};

export function TH11ChequeoInduccion({ company }: { company: CompanyId }) {
  const theme = getCompanyTheme(company);
  const accent = `#${theme.accent}`;
  const [data, setData, reset] = useFormatData<TH11Data>("TH-11", initialData);

  const set = <K extends keyof TH11Data>(key: K, value: TH11Data[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const updateRow = (id: string, field: keyof TH11Row, value: string) =>
    set("rows", data.rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const completed = data.rows.filter((r) => r.estado === "Completado").length;
  const pct = Math.round((completed / data.rows.length) * 100);

  return (
    <FormatShell
      formatId="TH-11"
      formatName="Chequeo de Inducción"
      company={company}
      onReset={reset}
      exportData={data}
      onImport={(imported) => {
        if (imported && typeof imported === "object") {
          setData({ ...initialData, ...(imported as Partial<TH11Data>) });
        }
      }}
    >
      <SectionTitle n={1} accent={accent}>
        Datos del Empleado
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
        <div className="sm:col-span-2">
          <FieldLabel>Nombres y apellidos</FieldLabel>
          <Input
            value={data.nombresApellidos}
            onChange={(e) => set("nombresApellidos", e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Documento</FieldLabel>
          <Input
            value={data.documento}
            onChange={(e) => set("documento", e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Cargo</FieldLabel>
          <Input
            value={data.cargo}
            onChange={(e) => set("cargo", e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Fecha de ingreso</FieldLabel>
          <Input
            type="date"
            value={data.fechaIngreso}
            onChange={(e) => set("fechaIngreso", e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <SectionTitle n={2} accent={accent}>
        Módulos de Inducción
      </SectionTitle>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5 text-xs">
          <span className="font-bold">Progreso: {completed} de {data.rows.length}</span>
          <span className="font-bold" style={{ color: pct === 100 ? "#2E7D32" : accent }}>
            {pct}%
          </span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>
      <div className="overflow-x-auto mb-5">
        <table className="w-full text-xs border border-border">
          <thead style={{ background: accent, color: "#fff" }}>
            <tr>
              <th className="p-2 text-left">Módulo</th>
              <th className="p-2 text-left w-44">Responsable</th>
              <th className="p-2 text-left w-32">Fecha</th>
              <th className="p-2 text-left w-28">Estado</th>
              <th className="p-2 text-left">Observación</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id} className="border-b border-border">
                <td className="p-2 font-semibold">{r.modulo}</td>
                <td className="p-1">
                  <Input
                    value={r.responsable}
                    onChange={(e) => updateRow(r.id, "responsable", e.target.value)}
                    className="h-8"
                  />
                </td>
                <td className="p-1">
                  <Input
                    type="date"
                    value={r.fecha}
                    onChange={(e) => updateRow(r.id, "fecha", e.target.value)}
                    className="h-8"
                  />
                </td>
                <td className="p-1">
                  <Select
                    value={r.estado}
                    onValueChange={(v) => updateRow(r.id, "estado", v)}
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Completado">Completado</SelectItem>
                      <SelectItem value="Pendiente">Pendiente</SelectItem>
                      <SelectItem value="N/A">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-1">
                  <Input
                    value={r.observacion}
                    onChange={(e) => updateRow(r.id, "observacion", e.target.value)}
                    className="h-8"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 mb-5">
        <Badge className={estadoColor("Completado")}>Completado: {data.rows.filter((r) => r.estado === "Completado").length}</Badge>
        <Badge className={estadoColor("Pendiente")}>Pendiente: {data.rows.filter((r) => r.estado === "Pendiente").length}</Badge>
        <Badge className={estadoColor("N/A")}>N/A: {data.rows.filter((r) => r.estado === "N/A").length}</Badge>
      </div>

      <SectionTitle n={3} accent={accent}>
        Observaciones
      </SectionTitle>
      <div className="mb-3">
        <Textarea
          value={data.observacionesGenerales}
          onChange={(e) => set("observacionesGenerales", e.target.value)}
          rows={3}
          placeholder="Actividades pendientes, compromisos, observaciones sobre la inducción..."
        />
      </div>
    </FormatShell>
  );
}

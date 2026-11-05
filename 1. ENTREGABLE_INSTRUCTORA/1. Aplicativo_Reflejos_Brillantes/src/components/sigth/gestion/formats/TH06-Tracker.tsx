"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
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
} from "@/components/sigth/gestion/FormatShell";

const ETAPAS = [
  "Recepción HV",
  "Filtro HV",
  "Prueba técnica",
  "Entrevista",
  "Exámenes médicos",
  "Verificación referencias",
  "Selección final",
];

const ESTADOS = ["En proceso", "Contratado", "Descartado", "En reserva"];

export interface TH06Row {
  id: string;
  fecha: string;
  nombre: string;
  telefonoCorreo: string;
  cargoAspira: string;
  etapa: string;
  estado: string;
  observaciones: string;
}

export interface TH06Data {
  cargoBuscado: string;
  rows: TH06Row[];
}

const uid = () => Math.random().toString(36).slice(2, 10);

const initialData: TH06Data = {
  cargoBuscado: "",
  rows: [
    { id: uid(), fecha: "", nombre: "", telefonoCorreo: "", cargoAspira: "", etapa: "Recepción HV", estado: "En proceso", observaciones: "" },
    { id: uid(), fecha: "", nombre: "", telefonoCorreo: "", cargoAspira: "", etapa: "Recepción HV", estado: "En proceso", observaciones: "" },
    { id: uid(), fecha: "", nombre: "", telefonoCorreo: "", cargoAspira: "", etapa: "Recepción HV", estado: "En proceso", observaciones: "" },
  ],
};

const estadoColor = (e: string) => {
  switch (e) {
    case "Contratado":
      return "bg-green-600 text-white";
    case "Descartado":
      return "bg-red-500 text-white";
    case "En reserva":
      return "bg-yellow-500 text-white";
    default:
      return "bg-blue-500 text-white";
  }
};

export function TH06Tracker({ company }: { company: CompanyId }) {
  const theme = getCompanyTheme(company);
  const accent = `#${theme.accent}`;
  const [data, setData, reset] = useFormatData<TH06Data>("TH-06", initialData);

  const addRow = () =>
    setData((d) => ({
      ...d,
      rows: [
        ...d.rows,
        { id: uid(), fecha: "", nombre: "", telefonoCorreo: "", cargoAspira: "", etapa: "Recepción HV", estado: "En proceso", observaciones: "" },
      ],
    }));
  const removeRow = (id: string) =>
    setData((d) => ({ ...d, rows: d.rows.filter((r) => r.id !== id) }));
  const updateRow = (id: string, field: keyof TH06Row, value: string) =>
    setData((d) => ({
      ...d,
      rows: d.rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }));

  const counters = {
    total: data.rows.length,
    contratados: data.rows.filter((r) => r.estado === "Contratado").length,
    descartados: data.rows.filter((r) => r.estado === "Descartado").length,
    proceso: data.rows.filter((r) => r.estado === "En proceso").length,
    reserva: data.rows.filter((r) => r.estado === "En reserva").length,
  };

  return (
    <FormatShell
      formatId="TH-06"
      formatName="Base de Datos / Tracker de Candidatos"
      company={company}
      onReset={reset}
      exportData={data}
      onImport={(imported) => {
        if (imported && typeof imported === "object") {
          setData({ ...initialData, ...(imported as Partial<TH06Data>) });
        }
      }}
    >
      <SectionTitle n={1} accent={accent}>
        Resumen
      </SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
        <div className="rounded-md border border-border p-2 text-center">
          <div className="text-[10px] uppercase text-muted-foreground">Total</div>
          <div className="text-lg font-bold" style={{ color: accent }}>{counters.total}</div>
        </div>
        <div className="rounded-md border border-green-300 bg-green-50 p-2 text-center">
          <div className="text-[10px] uppercase text-muted-foreground">Contratados</div>
          <div className="text-lg font-bold text-green-700">{counters.contratados}</div>
        </div>
        <div className="rounded-md border border-yellow-300 bg-yellow-50 p-2 text-center">
          <div className="text-[10px] uppercase text-muted-foreground">En reserva</div>
          <div className="text-lg font-bold text-yellow-700">{counters.reserva}</div>
        </div>
        <div className="rounded-md border border-blue-300 bg-blue-50 p-2 text-center">
          <div className="text-[10px] uppercase text-muted-foreground">En proceso</div>
          <div className="text-lg font-bold text-blue-700">{counters.proceso}</div>
        </div>
        <div className="rounded-md border border-red-300 bg-red-50 p-2 text-center">
          <div className="text-[10px] uppercase text-muted-foreground">Descartados</div>
          <div className="text-lg font-bold text-red-700">{counters.descartados}</div>
        </div>
      </div>

      <SectionTitle n={2} accent={accent}>
        Tracker de Candidatos
      </SectionTitle>
      <div className="overflow-x-auto mb-2">
        <table className="w-full text-xs border border-border min-w-[920px]">
          <thead style={{ background: accent, color: "#fff" }}>
            <tr>
              <th className="p-2 text-left w-28">Fecha</th>
              <th className="p-2 text-left w-40">Nombre completo</th>
              <th className="p-2 text-left w-40">Teléfono / Correo</th>
              <th className="p-2 text-left w-32">Cargo aspira</th>
              <th className="p-2 text-left w-32">Etapa</th>
              <th className="p-2 text-left w-28">Estado</th>
              <th className="p-2 text-left">Observaciones</th>
              <th className="rb-no-print p-2 text-center w-10"></th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id} className="border-b border-border">
                <td className="p-1">
                  <Input
                    type="date"
                    value={row.fecha}
                    onChange={(e) => updateRow(row.id, "fecha", e.target.value)}
                    className="h-8"
                  />
                </td>
                <td className="p-1">
                  <Input
                    value={row.nombre}
                    onChange={(e) => updateRow(row.id, "nombre", e.target.value)}
                    className="h-8"
                  />
                </td>
                <td className="p-1">
                  <Input
                    value={row.telefonoCorreo}
                    onChange={(e) => updateRow(row.id, "telefonoCorreo", e.target.value)}
                    className="h-8"
                    placeholder="300 000 0000 / corr@eo.com"
                  />
                </td>
                <td className="p-1">
                  <Input
                    value={row.cargoAspira}
                    onChange={(e) => updateRow(row.id, "cargoAspira", e.target.value)}
                    className="h-8"
                  />
                </td>
                <td className="p-1">
                  <Select
                    value={row.etapa}
                    onValueChange={(v) => updateRow(row.id, "etapa", v)}
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ETAPAS.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-1">
                  <Select
                    value={row.estado}
                    onValueChange={(v) => updateRow(row.id, "estado", v)}
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-1">
                  <Input
                    value={row.observaciones}
                    onChange={(e) => updateRow(row.id, "observaciones", e.target.value)}
                    className="h-8"
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
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" type="button" onClick={addRow} className="text-xs h-7">
          <Plus className="w-3 h-3 mr-1" /> Agregar candidato
        </Button>
        <Badge variant="outline" className="text-xs">
          {data.rows.length} registro{data.rows.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="mt-5 text-[10px] text-muted-foreground italic">
        Esta base de datos consolida el pipeline de candidatos en todas las etapas del proceso de
        selección. El tratamiento de datos personales cumple con la Ley 1581 de 2012.
      </div>
    </FormatShell>
  );
}

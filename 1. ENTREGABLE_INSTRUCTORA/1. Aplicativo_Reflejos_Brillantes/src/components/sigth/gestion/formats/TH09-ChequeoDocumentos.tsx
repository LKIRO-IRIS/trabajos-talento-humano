"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { getCompanyTheme, type CompanyId } from "@/lib/analysis";
import {
  FormatShell,
  useFormatData,
  SectionTitle,
  FieldLabel,
  SignatureArea,
} from "@/components/sigth/gestion/FormatShell";

const DOCS = [
  "Cédula de ciudadanía (copia)",
  "Certificado de estudios (título y actas)",
  "Certificado laboral (últimos 2 empleos)",
  "Certificado de pensiones / EPS",
  "Certificado de antecedentes disciplinarios (Procuraduría)",
  "Certificado de antecedentes judiciales (Policía Nacional)",
  "Referencias personales (mínimo 2)",
] as const;

export interface TH09Data {
  nombresApellidos: string;
  documento: string;
  cargo: string;
  fechaIngreso: string;
  documentos: { nombre: string; recibido: boolean; observacion: string }[];
  observacionesGenerales: string;
  firmaGestor: { name: string; role: string; signature: string };
  firmaEmpleado: { name: string; role: string; signature: string };
}

const initialData: TH09Data = {
  nombresApellidos: "",
  documento: "",
  cargo: "",
  fechaIngreso: "",
  documentos: DOCS.map((nombre) => ({ nombre, recibido: false, observacion: "" })),
  observacionesGenerales: "",
  firmaGestor: { name: "", role: "Gestión Humana", signature: "" },
  firmaEmpleado: { name: "", role: "Empleado", signature: "" },
};

export function TH09ChequeoDocumentos({ company }: { company: CompanyId }) {
  const theme = getCompanyTheme(company);
  const accent = `#${theme.accent}`;
  const [data, setData, reset] = useFormatData<TH09Data>("TH-09", initialData);

  const set = <K extends keyof TH09Data>(key: K, value: TH09Data[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const toggleDoc = (idx: number, value: boolean) =>
    set(
      "documentos",
      data.documentos.map((d, i) => (i === idx ? { ...d, recibido: value } : d)),
    );
  const setObs = (idx: number, value: string) =>
    set(
      "documentos",
      data.documentos.map((d, i) => (i === idx ? { ...d, observacion: value } : d)),
    );

  const count = data.documentos.filter((d) => d.recibido).length;
  const pct = Math.round((count / DOCS.length) * 100);

  return (
    <FormatShell
      formatId="TH-09"
      formatName="Chequeo de Documentos"
      company={company}
      onReset={reset}
      exportData={data}
      onImport={(imported) => {
        if (imported && typeof imported === "object") {
          setData({ ...initialData, ...(imported as Partial<TH09Data>) });
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
        Lista de Documentos Requeridos
      </SectionTitle>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5 text-xs">
          <span className="font-bold">Progreso: {count} de {DOCS.length}</span>
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
              <th className="p-2 text-left w-6">#</th>
              <th className="p-2 text-left">Documento</th>
              <th className="p-2 text-center w-24">Recibido</th>
              <th className="p-2 text-left">Observación</th>
            </tr>
          </thead>
          <tbody>
            {data.documentos.map((d, idx) => (
              <tr key={idx} className="border-b border-border">
                <td className="p-2 text-center font-bold">{idx + 1}</td>
                <td className="p-2">{d.nombre}</td>
                <td className="p-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <Checkbox
                        checked={d.recibido}
                        onCheckedChange={(c) => toggleDoc(idx, Boolean(c))}
                      />
                      <span className={d.recibido ? "text-green-700 font-bold" : "text-muted-foreground"}>
                        {d.recibido ? "Sí" : "—"}
                      </span>
                    </label>
                  </div>
                </td>
                <td className="p-1">
                  <Input
                    value={d.observacion}
                    onChange={(e) => setObs(idx, e.target.value)}
                    className="h-8"
                    placeholder="Observaciones..."
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionTitle n={3} accent={accent}>
        Observaciones Generales
      </SectionTitle>
      <div className="mb-5">
        <Textarea
          value={data.observacionesGenerales}
          onChange={(e) => set("observacionesGenerales", e.target.value)}
          rows={3}
          placeholder="Documentos pendientes, fecha de compromiso, observaciones especiales..."
        />
      </div>

      <SectionTitle accent={accent}>Firmas</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SignatureArea
          label="Gestión Humana"
          data={data.firmaGestor}
          onChange={(next) => set("firmaGestor", next)}
        />
        <SignatureArea
          label="Empleado"
          data={data.firmaEmpleado}
          onChange={(next) => set("firmaEmpleado", next)}
        />
      </div>
    </FormatShell>
  );
}

"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input as TextInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getCompanyTheme, type CompanyId } from "@/lib/analysis";
import {
  FormatShell,
  useFormatData,
  SectionTitle,
  FieldLabel,
} from "@/components/sigth/gestion/FormatShell";

export interface THMD01Data {
  // Variables
  empresa: string;
  cargo: string;
  area: string;
  salario: string;
  horario: string;
  lugarTrabajo: string;
  fechaCierre: string;
  // Encabezado
  tituloConvocatoria: string;
  // Párrafos editables
  parrafos: { id: string; texto: string }[];
}

const uid = () => Math.random().toString(36).slice(2, 10);

const buildDefaultParagraphs = (): { id: string; texto: string }[] => [
  {
    id: uid(),
    texto:
      "[EMPRESA] requiere contratar un profesional para el cargo de [CARGO] en el área de [ÁREA], con el objetivo de fortalecer el equipo de trabajo y contribuir al cumplimiento de los objetivos estratégicos de la organización.",
  },
  {
    id: uid(),
    texto:
      "Requisitos mínimos: formación profesional en área afín, experiencia mínima de 2 años en cargos similares, conocimiento en ofimática y manejo de herramientas digitales de gestión.",
  },
  {
    id: uid(),
    texto:
      "Condiciones: salario [SALARIO] mensual, jornada [HORARIO], lugar de trabajo [LUGAR]. Contrato a término indefinido con periodo de prueba según ley.",
  },
  {
    id: uid(),
    texto:
      "Los candidatos interesados deben enviar hoja de vida al correo recursos@empresa.com indicando en el asunto el cargo al que aspiran, antes del [FECHA_CIERRE].",
  },
];

const initialData: THMD01Data = {
  empresa: "",
  cargo: "",
  area: "",
  salario: "",
  horario: "",
  lugarTrabajo: "",
  fechaCierre: "",
  tituloConvocatoria: "CONVOCATORIA PÚBLICA DE EMPLEO",
  parrafos: buildDefaultParagraphs(),
};

function replaceVars(text: string, vars: THMD01Data): string {
  return text
    .replace(/\[EMPRESA\]/g, vars.empresa || "[EMPRESA]")
    .replace(/\[CARGO\]/g, vars.cargo || "[CARGO]")
    .replace(/\[ÁREA\]/g, vars.area || "[ÁREA]")
    .replace(/\[AREA\]/g, vars.area || "[ÁREA]")
    .replace(/\[SALARIO\]/g, vars.salario || "[SALARIO]")
    .replace(/\[HORARIO\]/g, vars.horario || "[HORARIO]")
    .replace(/\[LUGAR\]/g, vars.lugarTrabajo || "[LUGAR]")
    .replace(/\[FECHA_CIERRE\]/g, vars.fechaCierre || "[FECHA_CIERRE]");
}

export function THMD01Convocatoria({ company }: { company: CompanyId }) {
  const theme = getCompanyTheme(company);
  const accent = `#${theme.accent}`;
  const [data, setData, reset] = useFormatData<THMD01Data>("TH-MD-01", initialData);

  const set = <K extends keyof THMD01Data>(key: K, value: THMD01Data[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const addParagraph = () =>
    set("parrafos", [...data.parrafos, { id: uid(), texto: "" }]);
  const removeParagraph = (id: string) =>
    set("parrafos", data.parrafos.filter((p) => p.id !== id));
  const updateParagraph = (id: string, value: string) =>
    set("parrafos", data.parrafos.map((p) => (p.id === id ? { ...p, texto: value } : p)));

  return (
    <FormatShell
      formatId="TH-MD-01"
      formatName="Modelo de Convocatoria"
      company={company}
      onReset={reset}
      exportData={data}
      onImport={(imported) => {
        if (imported && typeof imported === "object") {
          setData({ ...initialData, ...(imported as Partial<THMD01Data>) });
        }
      }}
    >
      {/* === Variables === */}
      <SectionTitle n={1} accent={accent}>
        Variables del Modelo
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div>
          <FieldLabel>Empresa</FieldLabel>
          <TextInput
            value={data.empresa}
            onChange={(e) => set("empresa", e.target.value)}
            placeholder="Ej: Royal Eventos SAS"
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Cargo</FieldLabel>
          <TextInput
            value={data.cargo}
            onChange={(e) => set("cargo", e.target.value)}
            placeholder="Ej: Auxiliar Logístico"
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Área</FieldLabel>
          <TextInput
            value={data.area}
            onChange={(e) => set("area", e.target.value)}
            placeholder="Ej: Operaciones"
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Salario</FieldLabel>
          <TextInput
            value={data.salario}
            onChange={(e) => set("salario", e.target.value)}
            placeholder="Ej: $1.500.000"
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Horario</FieldLabel>
          <TextInput
            value={data.horario}
            onChange={(e) => set("horario", e.target.value)}
            placeholder="Ej: L-V 8am-5pm"
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Lugar de trabajo</FieldLabel>
          <TextInput
            value={data.lugarTrabajo}
            onChange={(e) => set("lugarTrabajo", e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Fecha de cierre</FieldLabel>
          <TextInput
            value={data.fechaCierre}
            onChange={(e) => set("fechaCierre", e.target.value)}
            placeholder="Ej: 30 de noviembre de 2025"
            className="h-9"
          />
        </div>
      </div>

      {/* === Título === */}
      <SectionTitle n={2} accent={accent}>
        Título de la Convocatoria
      </SectionTitle>
      <div className="mb-5">
        <TextInput
          value={data.tituloConvocatoria}
          onChange={(e) => set("tituloConvocatoria", e.target.value)}
          className="h-9 font-bold uppercase"
        />
      </div>

      {/* === Párrafos === */}
      <SectionTitle n={3} accent={accent}>
        Cuerpo de la Convocatoria (editable)
      </SectionTitle>
      <div className="space-y-2 mb-3">
        {data.parrafos.map((p, idx) => (
          <div key={p.id} className="border border-border rounded p-2 bg-muted/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                Párrafo {idx + 1}
              </span>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => removeParagraph(p.id)}
                className="text-destructive h-6 px-2"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
            <Textarea
              value={p.texto}
              onChange={(e) => updateParagraph(p.id, e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" type="button" onClick={addParagraph} className="text-xs h-7 mb-5">
        <Plus className="w-3 h-3 mr-1" /> Agregar párrafo
      </Button>

      {/* === Preview === */}
      <SectionTitle n={4} accent={accent}>
        Vista Previa (con variables reemplazadas)
      </SectionTitle>
      <div
        className="rb-print-area border-2 rounded-md p-4 bg-white"
        style={{ borderColor: `${accent}55` }}
      >
        <div className="text-center mb-3">
          <h2
            className="text-lg font-extrabold uppercase tracking-wide"
            style={{ color: accent }}
          >
            {data.tituloConvocatoria}
          </h2>
          {data.empresa && (
            <div className="text-sm text-muted-foreground">{data.empresa}</div>
          )}
        </div>
        <div className="space-y-2 text-sm leading-relaxed">
          {data.parrafos.map((p) => (
            <p key={p.id}>{replaceVars(p.texto, data)}</p>
          ))}
        </div>
        <div className="mt-4 text-xs text-muted-foreground italic">
          Cordialmente,
          <br />
          <strong>Departamento de Gestión Humana</strong>
          <br />
          {data.empresa || "[EMPRESA]"}
        </div>
      </div>
    </FormatShell>
  );
}

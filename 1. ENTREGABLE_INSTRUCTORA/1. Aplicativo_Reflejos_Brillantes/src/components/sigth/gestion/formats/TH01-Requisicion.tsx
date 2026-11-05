"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getCompanyTheme, type CompanyId } from "@/lib/analysis";
import {
  FormatShell,
  useFormatData,
  SectionTitle,
  FieldLabel,
  SignatureArea,
} from "@/components/sigth/gestion/FormatShell";

interface SignatureData {
  name: string;
  role: string;
  signature: string;
}

export interface TH01Data {
  // Section 1 — Datos generales
  fechaSolicitud: string;
  areaSolicitante: string;
  cargoSolicitado: string;
  numVacantes: string;
  tipoVacante: string;
  jefeInmediato: string;
  centroTrabajo: string;
  // Section 2 — Motivo
  motivoPrincipal: string;
  personaReemplazar: string;
  detalleMotivo: string;
  // Section 3 — Condiciones contractuales
  tipoContrato: string;
  duracionContrato: string;
  salario: string;
  jornadaTrabajo: string;
  horarioTrabajo: string;
  lugarTrabajo: string;
  beneficios: string;
  // Section 4 — Justificación
  justificacion: string;
  observaciones: string;
  // Firmas
  firmas: {
    solicitante: SignatureData;
    gestionHumana: SignatureData;
    gerencia: SignatureData;
  };
}

const initialData: TH01Data = {
  fechaSolicitud: "",
  areaSolicitante: "",
  cargoSolicitado: "",
  numVacantes: "1",
  tipoVacante: "Nueva",
  jefeInmediato: "",
  centroTrabajo: "",
  motivoPrincipal: "",
  personaReemplazar: "",
  detalleMotivo: "",
  tipoContrato: "",
  duracionContrato: "",
  salario: "",
  jornadaTrabajo: "",
  horarioTrabajo: "",
  lugarTrabajo: "",
  beneficios: "",
  justificacion: "",
  observaciones: "",
  firmas: {
    solicitante: { name: "", role: "Solicitante", signature: "" },
    gestionHumana: { name: "", role: "Gestión Humana", signature: "" },
    gerencia: { name: "", role: "Gerencia", signature: "" },
  },
};

export function TH01Requisicion({ company }: { company: CompanyId }) {
  const theme = getCompanyTheme(company);
  const accent = `#${theme.accent}`;
  const [data, setData, reset] = useFormatData<TH01Data>("TH-01", initialData);

  const set = <K extends keyof TH01Data>(key: K, value: TH01Data[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  return (
    <FormatShell
      formatId="TH-01"
      formatName="Requisición de Personal"
      company={company}
      onReset={reset}
      exportData={data}
      onImport={(imported) => {
        if (imported && typeof imported === "object") {
          setData({ ...initialData, ...(imported as Partial<TH01Data>) });
        }
      }}
    >
      {/* Section 1 */}
      <SectionTitle n={1} accent={accent}>
        Datos Generales
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div>
          <FieldLabel>Fecha de solicitud</FieldLabel>
          <Input
            type="date"
            value={data.fechaSolicitud}
            onChange={(e) => set("fechaSolicitud", e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Área solicitante</FieldLabel>
          <Input
            value={data.areaSolicitante}
            onChange={(e) => set("areaSolicitante", e.target.value)}
            placeholder="Ej: Producción, Ventas, Logística"
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Cargo solicitado</FieldLabel>
          <Input
            value={data.cargoSolicitado}
            onChange={(e) => set("cargoSolicitado", e.target.value)}
            placeholder="Ej: Auxiliar Logístico"
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>N° de vacantes</FieldLabel>
          <Input
            type="number"
            min="1"
            value={data.numVacantes}
            onChange={(e) => set("numVacantes", e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Tipo de vacante</FieldLabel>
          <Select
            value={data.tipoVacante}
            onValueChange={(v) => set("tipoVacante", v)}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Nueva">Nueva creación</SelectItem>
              <SelectItem value="Reemplazo">Reemplazo</SelectItem>
              <SelectItem value="Reestructuracion">Reestructuración</SelectItem>
              <SelectItem value="Promocion">Promoción interna</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Jefe inmediato</FieldLabel>
          <Input
            value={data.jefeInmediato}
            onChange={(e) => set("jefeInmediato", e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Centro de trabajo</FieldLabel>
          <Input
            value={data.centroTrabajo}
            onChange={(e) => set("centroTrabajo", e.target.value)}
            placeholder="Ej: Planta Bogotá, Oficina principal"
            className="h-9"
          />
        </div>
      </div>

      {/* Section 2 */}
      <SectionTitle n={2} accent={accent}>
        Motivo de la Solicitud
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div>
          <FieldLabel>Causa principal</FieldLabel>
          <Select
            value={data.motivoPrincipal}
            onValueChange={(v) => set("motivoPrincipal", v)}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Seleccionar causa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Crecimiento">Crecimiento / expansión</SelectItem>
              <SelectItem value="Renuncia">Renuncia</SelectItem>
              <SelectItem value="Despido">Despido justificado</SelectItem>
              <SelectItem value="Retiro">Retiro voluntario</SelectItem>
              <SelectItem value="Jubilacion">Jubilación / pensión</SelectItem>
              <SelectItem value="Licencia">Licencia / incapacidad prolongada</SelectItem>
              <SelectItem value="Reemplazo">Reemplazo por promoción</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Persona a reemplazar (si aplica)</FieldLabel>
          <Input
            value={data.personaReemplazar}
            onChange={(e) => set("personaReemplazar", e.target.value)}
            placeholder="Nombre completo del funcionario saliente"
            className="h-9"
          />
        </div>
      </div>
      <div className="mb-5">
        <FieldLabel>Detalle del motivo</FieldLabel>
        <Textarea
          value={data.detalleMotivo}
          onChange={(e) => set("detalleMotivo", e.target.value)}
          placeholder="Explique brevemente las razones de la solicitud..."
          rows={3}
        />
      </div>

      {/* Section 3 */}
      <SectionTitle n={3} accent={accent}>
        Condiciones Contractuales
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div>
          <FieldLabel>Tipo de contrato</FieldLabel>
          <Select
            value={data.tipoContrato}
            onValueChange={(v) => set("tipoContrato", v)}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Indefinido">Término indefinido</SelectItem>
              <SelectItem value="Fijo">Término fijo</SelectItem>
              <SelectItem value="ObraLabor">Obra o labor</SelectItem>
              <SelectItem value="Prestacion">Prestación de servicios</SelectItem>
              <SelectItem value="Aprendizaje">Contrato de aprendizaje</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Duración (meses)</FieldLabel>
          <Input
            value={data.duracionContrato}
            onChange={(e) => set("duracionContrato", e.target.value)}
            placeholder="Ej: 6, 12, indefinido"
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Salario mensual (COP)</FieldLabel>
          <Input
            value={data.salario}
            onChange={(e) => set("salario", e.target.value)}
            placeholder="Ej: 1.500.000"
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Jornada de trabajo</FieldLabel>
          <Select
            value={data.jornadaTrabajo}
            onValueChange={(v) => set("jornadaTrabajo", v)}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Seleccionar jornada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Diurna">Diurna</SelectItem>
              <SelectItem value="Nocturna">Nocturna</SelectItem>
              <SelectItem value="Mixta">Mixta</SelectItem>
              <SelectItem value="Turnos">Por turnos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Horario de trabajo</FieldLabel>
          <Input
            value={data.horarioTrabajo}
            onChange={(e) => set("horarioTrabajo", e.target.value)}
            placeholder="Ej: L-V 8:00 a.m. - 5:00 p.m."
            className="h-9"
          />
        </div>
        <div>
          <FieldLabel>Lugar de trabajo</FieldLabel>
          <Input
            value={data.lugarTrabajo}
            onChange={(e) => set("lugarTrabajo", e.target.value)}
            className="h-9"
          />
        </div>
      </div>
      <div className="mb-5">
        <FieldLabel>Beneficios adicionales</FieldLabel>
        <Textarea
          value={data.beneficios}
          onChange={(e) => set("beneficios", e.target.value)}
          placeholder="Auxilio de transporte, bonificaciones, dotación, alimentación..."
          rows={2}
        />
      </div>

      {/* Section 4 */}
      <SectionTitle n={4} accent={accent}>
        Justificación y Observaciones
      </SectionTitle>
      <div className="mb-3">
        <FieldLabel>Justificación de la necesidad</FieldLabel>
        <Textarea
          value={data.justificacion}
          onChange={(e) => set("justificacion", e.target.value)}
          placeholder="Explique por qué es necesario cubrir este cargo..."
          rows={3}
        />
      </div>
      <div className="mb-5">
        <FieldLabel>Observaciones adicionales</FieldLabel>
        <Textarea
          value={data.observaciones}
          onChange={(e) => set("observaciones", e.target.value)}
          rows={2}
        />
      </div>

      {/* Signatures */}
      <SectionTitle accent={accent}>Autorizaciones</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SignatureArea
          label="Solicitante"
          data={data.firmas.solicitante}
          onChange={(next) =>
            setData((d) => ({
              ...d,
              firmas: { ...d.firmas, solicitante: next },
            }))
          }
        />
        <SignatureArea
          label="Gestión Humana"
          data={data.firmas.gestionHumana}
          onChange={(next) =>
            setData((d) => ({
              ...d,
              firmas: { ...d.firmas, gestionHumana: next },
            }))
          }
        />
        <SignatureArea
          label="Gerencia"
          data={data.firmas.gerencia}
          onChange={(next) =>
            setData((d) => ({
              ...d,
              firmas: { ...d.firmas, gerencia: next },
            }))
          }
        />
      </div>
    </FormatShell>
  );
}

/* Helper buttons re-exported for convenience */
export function AddRowButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" type="button" onClick={onClick} className="text-xs h-7">
      <Plus className="w-3 h-3 mr-1" /> Agregar fila
    </Button>
  );
}

export function RemoveRowButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      type="button"
      onClick={onClick}
      className="text-xs h-7 text-destructive hover:text-destructive px-2"
    >
      <Trash2 className="w-3 h-3" />
    </Button>
  );
}

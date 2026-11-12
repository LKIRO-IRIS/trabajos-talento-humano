"use client";

import * as React from "react";
import {
  FileText,
  Save,
  Printer,
  RefreshCw,
  User,
  Building2,
  Calendar,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Carta de Renuncia Voluntaria — TH-RENUNCIA                         */
/*  Auto-generada con datos del empleado (de TH-03 + TH-CONTRATO)      */
/* ------------------------------------------------------------------ */

interface RenunciaData {
  // Datos del empleado
  nombreEmpleado: string;
  tipoDocumento: string;
  numeroDocumento: string;
  lugarExpedicion: string;
  direccionEmpleado: string;
  telefonoEmpleado: string;
  correoEmpleado: string;
  cargo: string;
  area: string;
  fechaIngreso: string;
  // Datos de la empresa
  empresa: string;
  nit: string;
  direccionEmpresa: string;
  // Datos de la renuncia
  fechaRenuncia: string;
  fechaUltimoDia: string;
  motivoRenuncia: string;
  // Datos del recibido
  quienRecibe: string;
  cargoQuienRecibe: string;
}

const RENUNCIA_VACIA: RenunciaData = {
  nombreEmpleado: "",
  tipoDocumento: "Cédula de ciudadanía",
  numeroDocumento: "",
  lugarExpedicion: "",
  direccionEmpleado: "",
  telefonoEmpleado: "",
  correoEmpleado: "",
  cargo: "",
  area: "",
  fechaIngreso: "",
  empresa: "",
  nit: "",
  direccionEmpresa: "",
  fechaRenuncia: new Date().toISOString().slice(0, 10),
  fechaUltimoDia: "",
  motivoRenuncia: "",
  quienRecibe: "",
  cargoQuienRecibe: "Director(a) de Talento Humano",
};

// Motivos predefinidos (también se puede escribir uno personalizado)
const MOTIVOS_PREDEFINIDOS: { id: string; label: string; texto: string }[] = [
  {
    id: "oportunidad",
    label: "Oportunidad laboral",
    texto:
      "Por haber recibido una oferta laboral que se ajusta a mis expectativas profesionales y de crecimiento personal.",
  },
  {
    id: "personal",
    label: "Razones personales",
    texto:
      "Por razones personales y familiares que requieren mi atención prioritaria.",
  },
  {
    id: "estudios",
    label: "Continuar estudios",
    texto:
      "Por decisión de continuar mis estudios superiores, lo cual requiere dedicación exclusiva.",
  },
  {
    id: "salud",
    label: "Razones de salud",
    texto:
      "Por razones de salud que me impiden continuar con mis funciones actuales.",
  },
  {
    id: "reubicacion",
    label: "Reubicación / cambio de ciudad",
    texto:
      "Por traslado de residencia a otra ciudad, lo cual me imposibilita continuar prestando mis servicios.",
  },
  {
    id: "personalizado",
    label: "Otro (escribir)",
    texto: "",
  },
];

function cargarDatosDesdeFormatos(): RenunciaData {
  const data = { ...RENUNCIA_VACIA };

  try {
    // Leer TH-03 (hoja de vida del empleado)
    const th03 = JSON.parse(
      window.localStorage.getItem("sigth-gestion-format-TH-03") || "{}",
    );
    if (th03.nombresApellidos) data.nombreEmpleado = th03.nombresApellidos;
    if (th03.numeroDocumento) data.numeroDocumento = th03.numeroDocumento;
    if (th03.lugarExpedicion) data.lugarExpedicion = th03.lugarExpedicion;
    if (th03.direccion) data.direccionEmpleado = th03.direccion;
    if (th03.telefono) data.telefonoEmpleado = th03.telefono;
    if (th03.correo) data.correoEmpleado = th03.correo;
    if (th03.municipio) data.direccionEmpresa = th03.municipio;

    // Leer TH-CONTRATO (datos del contrato firmado)
    const contrato = JSON.parse(
      window.localStorage.getItem("sigth-gestion-format-TH-CONTRATO") || "{}",
    );
    if (contrato.cargo) data.cargo = contrato.cargo;
    if (contrato.area) data.area = contrato.area;
    if (contrato.empresa) data.empresa = contrato.empresa;
    if (contrato.nit) data.nit = contrato.nit;
    if (contrato.fechaContrato) data.fechaIngreso = contrato.fechaContrato;
    if (contrato.direccionEmpresa) data.direccionEmpresa = contrato.direccionEmpresa;

    // Leer TH-09 (chequeo de documentos) — tiene nombre + cargo
    const th09 = JSON.parse(
      window.localStorage.getItem("sigth-gestion-format-TH-09") || "{}",
    );
    if (th09.nombresApellidos && !data.nombreEmpleado)
      data.nombreEmpleado = th09.nombresApellidos;
    if (th09.cargo && !data.cargo) data.cargo = th09.cargo;

    // Leer candidatos analizados (HV analizada con IA)
    const hvs = JSON.parse(
      window.localStorage.getItem("sigth-analyzed-hvs") || "[]",
    );
    if (hvs.length > 0 && !data.nombreEmpleado) {
      const seleccionado =
        hvs.find((h: any) => h.evaluation?.decision === "SELECCIONADO") ||
        hvs[0];
      if (seleccionado.analysis?.nombre)
        data.nombreEmpleado = seleccionado.analysis.nombre;
      if (seleccionado.analysis?.telefono && !data.telefonoEmpleado)
        data.telefonoEmpleado = seleccionado.analysis.telefono;
      if (seleccionado.analysis?.correo && !data.correoEmpleado)
        data.correoEmpleado = seleccionado.analysis.correo;
      if (seleccionado.analysis?.cargoAspira && !data.cargo)
        data.cargo = seleccionado.analysis.cargoAspira;
    }

    // Leer empresa configurada
    const empresaCfg = JSON.parse(
      window.localStorage.getItem("sigth-empresa-config") || "{}",
    );
    if (empresaCfg.name) data.empresa = empresaCfg.name;
    if (empresaCfg.name && !data.nit)
      data.nit = "NIT " + (empresaCfg.id || "000.000.000-0");

    // Fecha último día: por defecto, 30 días después de la renuncia
    if (!data.fechaUltimoDia) {
      const fecha = new Date(data.fechaRenuncia);
      fecha.setDate(fecha.getDate() + 30);
      data.fechaUltimoDia = fecha.toISOString().slice(0, 10);
    }
  } catch {}

  return data;
}

export function CartaRenuncia() {
  const [data, setData] = React.useState<RenunciaData>(RENUNCIA_VACIA);
  const [cargado, setCargado] = React.useState(false);
  const [motivoSel, setMotivoSel] = React.useState<string>("oportunidad");

  React.useEffect(() => {
    const loaded = cargarDatosDesdeFormatos();
    setData(loaded);
    setCargado(true);
    if (loaded.nombreEmpleado) {
      toast.success(`Carta de renuncia auto-generada para: ${loaded.nombreEmpleado}`);
    } else {
      toast.info(
        "Carta vacía — diligencie TH-03 (hoja de vida) y TH-CONTRATO para auto-generar",
      );
    }
  }, []);

  const set = <K extends keyof RenunciaData>(key: K, value: RenunciaData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const recargar = () => {
    const loaded = cargarDatosDesdeFormatos();
    setData(loaded);
    toast.success("Datos recargados desde TH-03 y TH-CONTRATO");
  };

  const guardar = () => {
    window.localStorage.setItem(
      "sigth-gestion-format-TH-RENUNCIA",
      JSON.stringify(data),
    );
    toast.success("Carta de renuncia guardada correctamente");
  };

  const imprimir = () => {
    window.print();
  };

  const aplicarMotivo = (motivoId: string) => {
    setMotivoSel(motivoId);
    const motivo = MOTIVOS_PREDEFINIDOS.find((m) => m.id === motivoId);
    if (motivo && motivo.texto) {
      set("motivoRenuncia", motivo.texto);
    }
  };

  const Field = ({
    label,
    value,
    onChange,
    type = "text",
    wide = false,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    wide?: boolean;
  }) => (
    <div className={wide ? "col-span-2" : ""}>
      <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
      />
    </div>
  );

  const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded bg-slate-100 dark:bg-slate-800">
      {icon}
      <span className="font-bold text-sm uppercase tracking-tight text-slate-700 dark:text-slate-200">
        {title}
      </span>
    </div>
  );

  // Calcular días preaviso
  const diasPreaviso = (() => {
    if (!data.fechaRenuncia || !data.fechaUltimoDia) return 0;
    const diff = new Date(data.fechaUltimoDia).getTime() - new Date(data.fechaRenuncia).getTime();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  })();

  return (
    <div className="space-y-4 pb-8">
      {/* Barra de acciones */}
      <div className="flex items-center gap-2 flex-wrap rb-no-print">
        <Button size="sm" variant="outline" onClick={recargar}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Recargar desde TH-03 + TH-CONTRATO
        </Button>
        <Button size="sm" variant="outline" onClick={guardar}>
          <Save className="w-3.5 h-3.5 mr-1" /> Guardar
        </Button>
        <Button size="sm" variant="outline" onClick={imprimir}>
          <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir / PDF
        </Button>
        {cargado && data.nombreEmpleado && (
          <Badge className="bg-orange-100 text-orange-700 border-orange-300">
            ✓ Renuncia de: {data.nombreEmpleado}
          </Badge>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border-2 border-slate-200 dark:border-slate-700 p-6 space-y-6">
        {/* Título */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            CARTA DE RENUNCIA VOLUNTARIA
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Código: TH-RENUNCIA-001 · Versión: 01 · Fecha: {data.fechaRenuncia}
          </p>
        </div>

        {/* Sección 1: Datos del empleado */}
        <div>
          <SectionTitle
            icon={<User className="w-4 h-4 text-green-600" />}
            title="1. Datos del Empleado (auto-cargado desde TH-03)"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field
              label="Nombres y Apellidos"
              value={data.nombreEmpleado}
              onChange={(v) => set("nombreEmpleado", v)}
              wide
            />
            <Field
              label="Tipo de Documento"
              value={data.tipoDocumento}
              onChange={(v) => set("tipoDocumento", v)}
            />
            <Field
              label="N° Documento"
              value={data.numeroDocumento}
              onChange={(v) => set("numeroDocumento", v)}
            />
            <Field
              label="Lugar de Expedición"
              value={data.lugarExpedicion}
              onChange={(v) => set("lugarExpedicion", v)}
            />
            <Field
              label="Dirección"
              value={data.direccionEmpleado}
              onChange={(v) => set("direccionEmpleado", v)}
            />
            <Field
              label="Teléfono"
              value={data.telefonoEmpleado}
              onChange={(v) => set("telefonoEmpleado", v)}
            />
            <Field
              label="Correo"
              value={data.correoEmpleado}
              onChange={(v) => set("correoEmpleado", v)}
            />
          </div>
        </div>

        {/* Sección 2: Datos del cargo y empresa */}
        <div>
          <SectionTitle
            icon={<Building2 className="w-4 h-4 text-blue-600" />}
            title="2. Datos del Cargo y Empresa (auto-cargado desde TH-CONTRATO)"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field
              label="Cargo Actual"
              value={data.cargo}
              onChange={(v) => set("cargo", v)}
            />
            <Field
              label="Área / Departamento"
              value={data.area}
              onChange={(v) => set("area", v)}
            />
            <Field
              label="Fecha de Ingreso"
              value={data.fechaIngreso}
              onChange={(v) => set("fechaIngreso", v)}
              type="date"
            />
            <Field
              label="Empresa"
              value={data.empresa}
              onChange={(v) => set("empresa", v)}
            />
            <Field
              label="NIT"
              value={data.nit}
              onChange={(v) => set("nit", v)}
            />
            <Field
              label="Dirección de la Empresa"
              value={data.direccionEmpresa}
              onChange={(v) => set("direccionEmpresa", v)}
            />
          </div>
        </div>

        {/* Sección 3: Datos de la renuncia */}
        <div>
          <SectionTitle
            icon={<Calendar className="w-4 h-4 text-amber-600" />}
            title="3. Datos de la Renuncia"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field
              label="Fecha de Presentación"
              value={data.fechaRenuncia}
              onChange={(v) => set("fechaRenuncia", v)}
              type="date"
            />
            <Field
              label="Último Día de Trabajo"
              value={data.fechaUltimoDia}
              onChange={(v) => set("fechaUltimoDia", v)}
              type="date"
            />
            <div className="flex items-end">
              <div className="text-xs">
                <strong className="text-slate-700 dark:text-slate-300">
                  Días de preaviso:
                </strong>{" "}
                <span
                  className={
                    diasPreaviso >= 30
                      ? "text-green-600 font-bold"
                      : diasPreaviso >= 15
                        ? "text-amber-600 font-bold"
                        : "text-red-600 font-bold"
                  }
                >
                  {diasPreaviso} días
                </span>
                <p className="text-[10px] text-slate-500 mt-1">
                  {diasPreaviso >= 30
                    ? "✓ Cumple preaviso mínimo de 30 días (recomendado)"
                    : diasPreaviso >= 15
                      ? "⚠ Preaviso corto — verificar si la empresa lo acepta"
                      : "⚠ Sin preaviso — puede generar descuentos"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sección 4: Motivo de la renuncia */}
        <div>
          <SectionTitle
            icon={<FileText className="w-4 h-4 text-purple-600" />}
            title="4. Motivo de la Renuncia"
          />
          <div className="flex flex-wrap gap-1.5 mb-3 rb-no-print">
            {MOTIVOS_PREDEFINIDOS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => aplicarMotivo(m.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  motivoSel === m.id
                    ? "bg-[#6B1F2E] text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <Textarea
            value={data.motivoRenuncia}
            onChange={(e) => set("motivoRenuncia", e.target.value)}
            placeholder="Selecciona un motivo predefinido arriba o escribe uno personalizado..."
            rows={3}
            className="text-sm"
          />
        </div>

        {/* Sección 5: Texto de la carta (vista previa imprimible) */}
        <div>
          <SectionTitle
            icon={<FileText className="w-4 h-4 text-slate-600" />}
            title="5. Texto de la Carta (vista previa)"
          />
          <div className="border-2 border-slate-200 dark:border-slate-700 rounded-md p-4 bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-3">
            <p className="text-right text-xs text-slate-500">
              {data.direccionEmpresa || "[Ciudad]"}, {data.fechaRenuncia || "[Fecha]"}
            </p>

            <p>
              Señores
              <br />
              <strong>{data.empresa || "[EMPRESA]"}</strong>
              <br />
              NIT {data.nit || "[NIT]"}
              <br />
              Atención: {data.cargoQuienRecibe || "[Cargo de quien recibe]"}
            </p>

            <p>
              <strong>Ref: Carta de renuncia voluntaria</strong>
            </p>

            <p>
              Cordial saludo. Por medio de la presente, yo,{" "}
              <strong>{data.nombreEmpleado || "[NOMBRE DEL EMPLEADO]"}</strong>,
              mayor de edad, identificado(a) con {data.tipoDocumento} No.{" "}
              <strong>{data.numeroDocumento || "[N° DOCUMENTO]"}</strong> expedida en{" "}
              {data.lugarExpedicion || "[LUGAR DE EXPEDICIÓN]"}, actuando en mi
              condición de empleado(a) en el cargo de{" "}
              <strong>{data.cargo || "[CARGO]"}</strong> del área de{" "}
              {data.area || "[ÁREA]"}, con fecha de ingreso del{" "}
              {data.fechaIngreso || "[FECHA DE INGRESO]"}, me dirijo a ustedes con el
              fin de presentar formalmente mi renuncia voluntaria al cargo que
              actualmente ocupo en {data.empresa || "[EMPRESA]"}.
            </p>

            <p>
              La presente renuncia se motiva en:{" "}
              {data.motivoRenuncia ||
                "[MOTIVO DE LA RENUNCIA — selecciona o escribe en el campo de arriba]"}.
            </p>

            <p>
              Mi último día de trabajo será el{" "}
              <strong>{data.fechaUltimoDia || "[ÚLTIMO DÍA]"}</strong>, fecha hasta la
              cual me comprometo a continuar con mis labores habituales y a
              colaborar con la entrega del cargo y la transmisión de la información
              necesaria para el reemplazo, así como con la devolución de los equipos,
              documentos y credenciales que la empresa me haya entregado durante mi
              vinculación.
            </p>

            <p>
              Agradezco a {data.empresa || "[EMPRESA]"} por la oportunidad brindada
              durante mi vinculación y manifiesto mi disposición para gestionar el paz
              y salvo, la liquidación de mis prestaciones sociales y la devolución de
              los documentos que reposan en mi expediente laboral, conforme al
              artículo 57 del Código Sustantivo del Trabajo.
            </p>

            <p>
              Atentamente,
            </p>

            <div className="mt-6 grid grid-cols-2 gap-8">
              <div className="text-center">
                <div className="border-b-2 border-slate-400 dark:border-slate-500 mb-2 pb-1">
                  <p className="text-xs text-slate-500">Firma del Empleado</p>
                </div>
                <p className="text-sm font-bold">
                  {data.nombreEmpleado || "________________"}
                </p>
                <p className="text-xs text-slate-500">
                  C.C. {data.numeroDocumento || "________________"}
                </p>
              </div>
              <div className="text-center">
                <div className="border-b-2 border-slate-400 dark:border-slate-500 mb-2 pb-1">
                  <p className="text-xs text-slate-500">Recibido por</p>
                </div>
                <p className="text-sm font-bold">
                  {data.quienRecibe || "________________"}
                </p>
                <p className="text-xs text-slate-500">
                  {data.cargoQuienRecibe || "Talento Humano"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sección 6: Datos de quien recibe */}
        <div>
          <SectionTitle
            icon={<Building2 className="w-4 h-4 text-slate-600" />}
            title="6. Quien Recibe la Renuncia"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="Nombre de quien recibe"
              value={data.quienRecibe}
              onChange={(v) => set("quienRecibe", v)}
              wide
            />
            <Field
              label="Cargo de quien recibe"
              value={data.cargoQuienRecibe}
              onChange={(v) => set("cargoQuienRecibe", v)}
            />
          </div>
        </div>

        {/* Sección 7: Checklist de desvinculación */}
        <div>
          <SectionTitle
            icon={<RotateCcw className="w-4 h-4 text-red-600" />}
            title="7. Checklist de Desvinculación (para TH)"
          />
          <div className="space-y-2 rb-no-print">
            {[
              "Carta de renuncia presentada y firmada",
              "Aceptación de la renuncia por parte de la empresa",
              "Entrega de equipos (laptop, mouse, credencial)",
              "Paz y salvo firmado por todas las áreas",
              "Entrega de carpetas y documentos del cargo",
              "Deshabilitar correos y accesos (TI)",
              "Liquidación de prestaciones sociales (cesantías, vacaciones, prima)",
              "Informar a EPS, AFP, ARL sobre la desafiliación",
              "Entrega de certificado laboral al empleado",
              "Copia de la carta archivada en el expediente laboral",
            ].map((item, idx) => (
              <label
                key={idx}
                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 px-2 py-1 rounded"
              >
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-slate-700 dark:text-slate-300">{item}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Pie */}
        <div className="text-center text-[10px] text-slate-400 mt-4">
          Carta de renuncia generada desde TH-03 (Hoja de Vida) y TH-CONTRATO ·
          Documento de uso académico — empresa simulada SENA
        </div>
      </div>
    </div>
  );
}

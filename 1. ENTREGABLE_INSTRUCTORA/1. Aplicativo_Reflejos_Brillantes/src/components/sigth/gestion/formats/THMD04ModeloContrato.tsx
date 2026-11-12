"use client";

import * as React from "react";
import {
  FileSignature,
  Save,
  Printer,
  Download,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Building2,
  User,
  Calendar,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FormatShell } from "@/components/sigth/gestion/FormatShell";
import { getCompanyTheme, type CompanyId } from "@/lib/analysis";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  TH-MD-04 · Modelo de Contrato (MEJORADO)                          */
/*  - Modelos .docx de referencia descargables (indefinido, fijo,     */
/*    prompts para IA)                                                */
/*  - Editor completo con cláusulas editables                          */
/*  - Auto-llenado desde TH-01 + TH-03 + TH-CONTRATO                  */
/* ------------------------------------------------------------------ */

/* Modelos de contrato de referencia */
const MODELOS_REFERENCIA: {
  id: string;
  nombre: string;
  descripcion: string;
  archivo: string;
  tipo: "contrato" | "guia";
  color: string;
}[] = [
  {
    id: "indefinido",
    nombre: "Contrato a Término Indefinido",
    descripcion:
      "Modelo académico para empresa simulada — Colombia. Basado en CST, Ley 2466 de 2025 y Ley 2101 de 2021.",
    archivo: "/download/contratos/Contrato_indefinido_modelo_academico_Colombia.docx",
    tipo: "contrato",
    color: "#2C3E50",
  },
  {
    id: "fijo",
    nombre: "Contrato a Término Fijo",
    descripcion:
      "Modelo académico para empresa simulada — Colombia. Debe constar por escrito e indicar fechas de inicio y terminación.",
    archivo: "/download/contratos/Contrato_termino_fijo_modelo_academico_Colombia.docx",
    tipo: "contrato",
    color: "#B8941F",
  },
  {
    id: "prompts",
    nombre: "Prompts para elaboración de contratos laborales",
    descripcion:
      "Guía de apoyo con 4 prompts (elaborar contrato, funciones del cargo, revisión y formato en Word) — para uso con ChatGPT u otra IA.",
    archivo: "/download/contratos/Prompts_para_elaboracion_de_contratos_laborales.docx",
    tipo: "guia",
    color: "#7B2D8B",
  },
];

interface ContratoModeloData {
  // Datos del contrato
  numero: string;
  lugar: string;
  fecha: string;
  // Datos del empleador
  empresa: string;
  nit: string;
  representanteLegal: string;
  direccionEmpresa: string;
  telefonoEmpresa: string;
  // Datos del empleado
  empleado: string;
  tipoDocumento: string;
  documento: string;
  lugarExpedicion: string;
  direccionEmpleado: string;
  telefonoEmpleado: string;
  correoEmpleado: string;
  // Datos del cargo
  cargo: string;
  area: string;
  tipoContrato: string;
  duracion: string;
  salario: string;
  jornada: string;
  horario: string;
  lugarTrabajo: string;
  jefeInmediato: string;
  periodoPrueba: string;
  // Seguridad social
  eps: string;
  afp: string;
  arl: string;
  cesantias: string;
  cajaCompensacion: string;
  // Cláusulas (texto editable)
  clausulaObjeto: string;
  clausulaFunciones: string;
  clausulaDuracion: string;
  clausulaPeriodoPrueba: string;
  clausulaLugar: string;
  clausulaJornada: string;
  clausulaRemuneracion: string;
  clausulaSeguridadSocial: string;
  clausulaPrestaciones: string;
  clausulaObligaciones: string;
  clausulaTerminacion: string;
  clausulaConfidencialidad: string;
  clausulaDatos: string;
}

const DATA_VACIA: ContratoModeloData = {
  numero: "",
  lugar: "Bogotá D.C.",
  fecha: new Date().toISOString().slice(0, 10),
  empresa: "",
  nit: "",
  representanteLegal: "",
  direccionEmpresa: "",
  telefonoEmpresa: "",
  empleado: "",
  tipoDocumento: "Cédula de ciudadanía",
  documento: "",
  lugarExpedicion: "",
  direccionEmpleado: "",
  telefonoEmpleado: "",
  correoEmpleado: "",
  cargo: "",
  area: "",
  tipoContrato: "Contrato a Término Indefinido",
  duracion: "Indefinida",
  salario: "",
  jornada: "42 horas semanales",
  horario: "Lunes a viernes, 8:00 a.m. — 5:00 p.m.",
  lugarTrabajo: "",
  jefeInmediato: "",
  periodoPrueba: "60 días",
  eps: "",
  afp: "",
  arl: "",
  cesantias: "",
  cajaCompensacion: "",
  clausulaObjeto: "",
  clausulaFunciones: "",
  clausulaDuracion: "",
  clausulaPeriodoPrueba: "",
  clausulaLugar: "",
  clausulaJornada: "",
  clausulaRemuneracion: "",
  clausulaSeguridadSocial: "",
  clausulaPrestaciones: "",
  clausulaObligaciones: "",
  clausulaTerminacion: "",
  clausulaConfidencialidad: "",
  clausulaDatos: "",
};

// Auto-llenar campos desde TH-01, TH-03 y TH-CONTRATO (localStorage)
function cargarDesdeFormatos(): ContratoModeloData {
  const data = { ...DATA_VACIA };

  try {
    // TH-01 (requisición)
    const th01 = JSON.parse(
      window.localStorage.getItem("sigth-gestion-format-TH-01") || "{}",
    );
    if (th01.empresa) data.empresa = th01.empresa;
    if (th01.cargoSolicitado) data.cargo = th01.cargoSolicitado;
    if (th01.areaSolicitante) data.area = th01.areaSolicitante;
    if (th01.tipoContrato) data.tipoContrato = th01.tipoContrato;
    if (th01.duracionContrato) data.duracion = th01.duracionContrato;
    if (th01.salario) data.salario = th01.salario;
    if (th01.jornadaTrabajo) data.jornada = th01.jornadaTrabajo;
    if (th01.horarioTrabajo) data.horario = th01.horarioTrabajo;
    if (th01.lugarTrabajo) data.lugarTrabajo = th01.lugarTrabajo;
    if (th01.jefeInmediato) data.jefeInmediato = th01.jefeInmediato;

    // TH-03 (hoja de vida del empleado)
    const th03 = JSON.parse(
      window.localStorage.getItem("sigth-gestion-format-TH-03") || "{}",
    );
    if (th03.nombresApellidos) data.empleado = th03.nombresApellidos;
    if (th03.numeroDocumento) data.documento = th03.numeroDocumento;
    if (th03.lugarExpedicion) data.lugarExpedicion = th03.lugarExpedicion;
    if (th03.direccion) data.direccionEmpleado = th03.direccion;
    if (th03.telefono) data.telefonoEmpleado = th03.telefono;
    if (th03.correo) data.correoEmpleado = th03.correo;

    // TH-CONTRATO (datos ya guardados del contrato auto-generado)
    const contrato = JSON.parse(
      window.localStorage.getItem("sigth-gestion-format-TH-CONTRATO") || "{}",
    );
    if (contrato.eps) data.eps = contrato.eps;
    if (contrato.afp) data.afp = contrato.afp;
    if (contrato.arl) data.arl = contrato.arl;
    if (contrato.cesantias) data.cesantias = contrato.cesantias;
    if (contrato.cajaCompensacion)
      data.cajaCompensacion = contrato.cajaCompensacion;
    if (contrato.funciones) data.clausulaFunciones = contrato.funciones;

    // Empresa configurada
    const empresaCfg = JSON.parse(
      window.localStorage.getItem("sigth-empresa-config") || "{}",
    );
    if (empresaCfg.name) data.empresa = empresaCfg.name;
    if (empresaCfg.name) data.nit = "NIT " + (empresaCfg.id || "000.000.000-0");

    // Generar número de contrato automático
    if (!data.numero) {
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 9000) + 1000;
      data.numero = `TH-MD-04-${year}-${random}`;
    }

    // Auto-generar texto de las cláusulas si están vacías
    if (!data.clausulaObjeto) {
      data.clausulaObjeto = `El presente contrato tiene por objeto la prestación de servicios por parte de ${data.empleado || "[EMPLEADO]"} (en adelante EL EMPLEADO) a ${data.empresa || "[EMPRESA]"}, desempeñando el cargo de ${data.cargo || "[CARGO]"}, bajo continua subordinación o dependencia y a cambio de la remuneración pactada, conforme a los artículos 22 y siguientes del Código Sustantivo del Trabajo (CST).`;
    }
    if (!data.clausulaDuracion) {
      data.clausulaDuracion =
        data.tipoContrato === "Contrato a Término Indefinido"
          ? `El presente contrato es de ${data.tipoContrato}, regido por el artículo 47 del CST (modificado por la Ley 2466 de 2025), y su vigencia se mantendrá mientras subsistan las causas que le dieron origen y la materia del trabajo.`
          : `El presente contrato es de ${data.tipoContrato}, con una duración de ${data.duracion || "[DURACIÓN]"}, contados a partir del ${data.fecha}.`;
    }
    if (!data.clausulaPeriodoPrueba) {
      data.clausulaPeriodoPrueba = `Las partes acuerdan un período de prueba de ${data.periodoPrueba}, conforme a los artículos 76 al 80 del CST. Durante este período, cualquiera de las partes podrá terminar el contrato sin previo aviso.`;
    }
    if (!data.clausulaLugar) {
      data.clausulaLugar = `El EMPLEADO prestará sus servicios en ${data.lugarTrabajo || "[LUGAR]"}, bajo modalidad presencial.`;
    }
    if (!data.clausulaJornada) {
      data.clausulaJornada = `La jornada ordinaria será de ${data.jornada}, distribuida en el horario de ${data.horario}, conforme a la implementación gradual de la Ley 2101 de 2021.`;
    }
    if (!data.clausulaRemuneracion) {
      data.clausulaRemuneracion = `${data.empresa || "[EMPRESA]"} pagará al EMPLEADO un salario mensual de ${data.salario || "[SALARIO]"}, mediante transferencia bancaria en las fechas establecidas.`;
    }
    if (!data.clausulaSeguridadSocial) {
      data.clausulaSeguridadSocial = `${data.empresa || "[EMPRESA]"} afiliará al EMPLEADO al Sistema de Seguridad Social Integral: EPS (${data.eps || "[EPS]"}), AFP (${data.afp || "[AFP]"}), ARL (${data.arl || "[ARL]"}), Fondo de Cesantías (${data.cesantias || "[CESANTÍAS]"}) y Caja de Compensación (${data.cajaCompensacion || "[CAJA]"}), conforme a la Ley 100 de 1993.`;
    }
    if (!data.clausulaPrestaciones) {
      data.clausulaPrestaciones = `El EMPLEADO tendrá derecho a prima de servicios, cesantías, intereses a las cesantías, vacaciones, dotación y auxilio de transporte (cuando cumpla los requisitos legales), conforme al CST.`;
    }
    if (!data.clausulaObligaciones) {
      data.clausulaObligaciones = `El EMPLEADO deberá: (a) realizar las tareas del cargo con diligencia y buena fe; (b) atender instrucciones legítimas; (c) cuidar equipos y recursos entregados; (d) cumplir el Reglamento Interno de Trabajo y las medidas de SST.`;
    }
    if (!data.clausulaTerminacion) {
      data.clausulaTerminacion = `El contrato podrá terminar por las causales establecidas en el artículo 61 del CST${data.tipoContrato === "Contrato a Término Fijo" ? ", o por expiración del plazo pactado" : ""}, con las indemnizaciones que correspondan.`;
    }
    if (!data.clausulaConfidencialidad) {
      data.clausulaConfidencialidad = `El EMPLEADO se obliga a mantener confidencialidad sobre la información sensible de ${data.empresa || "[EMPRESA]"} y sus clientes, conforme a la Ley 1581 de 2012.`;
    }
    if (!data.clausulaDatos) {
      data.clausulaDatos = `Los datos personales del EMPLEADO recolectados en este contrato serán tratados conforme a la Ley 1581 de 2012 (protección de datos personales) y exclusivamente para fines laborales.`;
    }
  } catch {}

  return data;
}

export function THMD04ModeloContrato({ company }: { company: CompanyId }) {
  const theme = getCompanyTheme(company);
  const [data, setData] = React.useState<ContratoModeloData>(DATA_VACIA);
  const [loaded, setLoaded] = React.useState(false);
  const [modelosAbierto, setModelosAbierto] = React.useState(false);

  React.useEffect(() => {
    const loaded = cargarDesdeFormatos();
    setData(loaded);
    setLoaded(true);
    if (loaded.empleado) {
      toast.success(`Modelo de contrato auto-generado para: ${loaded.empleado}`);
    }
  }, []);

  const set = <K extends keyof ContratoModeloData>(
    key: K,
    value: ContratoModeloData[K],
  ) => setData((d) => ({ ...d, [key]: value }));

  const recargar = () => {
    const loaded = cargarDesdeFormatos();
    setData(loaded);
    toast.success("Datos recargados desde TH-01, TH-03 y TH-CONTRATO");
  };

  const exportData = React.useMemo(() => data, [data]);

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

  const ClauseField = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div>
      <Label className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1 block">
        {label}
      </Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="text-xs"
      />
    </div>
  );

  const SectionTitle = ({
    icon,
    title,
  }: {
    icon: React.ReactNode;
    title: string;
  }) => (
    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded bg-slate-100 dark:bg-slate-800">
      {icon}
      <span className="font-bold text-sm uppercase tracking-tight text-slate-700 dark:text-slate-200">
        {title}
      </span>
    </div>
  );

  return (
    <FormatShell
      formatId="TH-MD-04"
      formatName="Modelo de Contrato"
      version="02"
      date="12/11/2026"
      company={company}
      onReset={() => setData(DATA_VACIA)}
      exportData={exportData}
      onImport={(d) => d && setData({ ...DATA_VACIA, ...(d as ContratoModeloData) })}
    >
      <div className="space-y-6">
        {/* Barra de acciones */}
        <div className="flex items-center gap-2 flex-wrap rb-no-print">
          <Button size="sm" variant="outline" onClick={recargar}>
            <Calendar className="w-3.5 h-3.5 mr-1" /> Recargar desde TH-01 + TH-03
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.localStorage.setItem(
                "sigth-gestion-format-TH-MD-04",
                JSON.stringify(data),
              );
              toast.success("Modelo de contrato guardado");
            }}
          >
            <Save className="w-3.5 h-3.5 mr-1" /> Guardar
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir / PDF
          </Button>
          {loaded && data.empleado && (
            <Badge className="bg-green-100 text-green-700 border-green-300">
              ✓ Auto-generado para: {data.empleado}
            </Badge>
          )}
        </div>

        {/* ============ Modelos de contrato de referencia ============ */}
        <div className="rb-no-print rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setModelosAbierto((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-expanded={modelosAbierto}
          >
            <div className="flex items-center gap-3 text-left">
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center text-white shrink-0"
                style={{
                  background: "linear-gradient(135deg, #2C3E50, #7B2D8B)",
                }}
              >
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Modelos de Contrato de Referencia (.docx descargables)
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  2 contratos académicos (indefinido + término fijo) y 1 guía de
                  prompts para IA ·{" "}
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                    {modelosAbierto ? "Ocultar" : "Ver"} modelos
                  </span>
                </div>
              </div>
            </div>
            {modelosAbierto ? (
              <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
            )}
          </button>

          {modelosAbierto && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 bg-white dark:bg-slate-900 animate-rb-fade-up">
              {MODELOS_REFERENCIA.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border-2 overflow-hidden flex flex-col"
                  style={{ borderColor: `${m.color}40` }}
                >
                  <div
                    className="px-3 py-2 flex items-center gap-2 text-white"
                    style={{
                      background: `linear-gradient(135deg, ${m.color}, ${m.color}cc)`,
                    }}
                  >
                    {m.tipo === "contrato" ? (
                      <FileSignature className="w-4 h-4 shrink-0" />
                    ) : (
                      <BookOpen className="w-4 h-4 shrink-0" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-tight truncate">
                      {m.tipo === "contrato"
                        ? "Modelo de contrato"
                        : "Guía de prompts"}
                    </span>
                  </div>
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    <div className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                      {m.nombre}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed flex-1">
                      {m.descripcion}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <a
                        href={m.archivo}
                        download
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-white transition-transform hover:scale-105"
                        style={{ background: m.color }}
                        onClick={() => toast.success(`Descargando: ${m.nombre}`)}
                      >
                        <Download className="w-3 h-3" /> Descargar .docx
                      </a>
                      <a
                        href={m.archivo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <ExternalLink className="w-3 h-3" /> Ver
                      </a>
                    </div>
                  </div>
                </div>
              ))}
              <div className="md:col-span-3 mt-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                <strong>Nota:</strong> Estos modelos son plantillas pedagógicas
                SENA. Los campos entre corchetes{" "}
                <code className="px-1 rounded bg-amber-100 dark:bg-amber-900/50">
                  [ ]
                </code>{" "}
                deben diligenciarse. Antes de usarlos en una relación laboral
                real, solicita revisión jurídica.
              </div>
            </div>
          )}
        </div>

        {/* ============ Formulario editable ============ */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border-2 border-slate-200 dark:border-slate-700 p-6 space-y-6">
          {/* Encabezado del documento */}
          <div className="text-center border-b-2 border-slate-200 dark:border-slate-700 pb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              CONTRATO INDIVIDUAL DE TRABAJO
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Modelo TH-MD-04 · N.º {data.numero} · {data.lugar},{" "}
              {data.fecha}
            </p>
          </div>

          {/* Sección 1: Datos del empleador */}
          <div>
            <SectionTitle
              icon={<Building2 className="w-4 h-4 text-blue-600" />}
              title="1. Datos del Empleador"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field
                label="Razón Social"
                value={data.empresa}
                onChange={(v) => set("empresa", v)}
                wide
              />
              <Field
                label="NIT"
                value={data.nit}
                onChange={(v) => set("nit", v)}
              />
              <Field
                label="Representante Legal"
                value={data.representanteLegal}
                onChange={(v) => set("representanteLegal", v)}
              />
              <Field
                label="Dirección"
                value={data.direccionEmpresa}
                onChange={(v) => set("direccionEmpresa", v)}
              />
              <Field
                label="Teléfono"
                value={data.telefonoEmpresa}
                onChange={(v) => set("telefonoEmpresa", v)}
              />
            </div>
          </div>

          {/* Sección 2: Datos del empleado */}
          <div>
            <SectionTitle
              icon={<User className="w-4 h-4 text-green-600" />}
              title="2. Datos del Empleado (auto-cargado desde TH-03)"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field
                label="Nombres y Apellidos"
                value={data.empleado}
                onChange={(v) => set("empleado", v)}
                wide
              />
              <Field
                label="Tipo de Documento"
                value={data.tipoDocumento}
                onChange={(v) => set("tipoDocumento", v)}
              />
              <Field
                label="N° Documento"
                value={data.documento}
                onChange={(v) => set("documento", v)}
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

          {/* Sección 3: Datos del cargo */}
          <div>
            <SectionTitle
              icon={<FileSignature className="w-4 h-4 text-amber-600" />}
              title="3. Datos del Cargo"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field
                label="Cargo"
                value={data.cargo}
                onChange={(v) => set("cargo", v)}
              />
              <Field
                label="Área / Departamento"
                value={data.area}
                onChange={(v) => set("area", v)}
              />
              <Field
                label="Tipo de Contrato"
                value={data.tipoContrato}
                onChange={(v) => set("tipoContrato", v)}
              />
              <Field
                label="Duración"
                value={data.duracion}
                onChange={(v) => set("duracion", v)}
              />
              <Field
                label="Salario Mensual"
                value={data.salario}
                onChange={(v) => set("salario", v)}
              />
              <Field
                label="Jornada de Trabajo"
                value={data.jornada}
                onChange={(v) => set("jornada", v)}
              />
              <Field
                label="Horario"
                value={data.horario}
                onChange={(v) => set("horario", v)}
              />
              <Field
                label="Lugar de Trabajo"
                value={data.lugarTrabajo}
                onChange={(v) => set("lugarTrabajo", v)}
              />
              <Field
                label="Jefe Inmediato"
                value={data.jefeInmediato}
                onChange={(v) => set("jefeInmediato", v)}
              />
              <Field
                label="Período de Prueba"
                value={data.periodoPrueba}
                onChange={(v) => set("periodoPrueba", v)}
              />
            </div>
          </div>

          {/* Sección 4: Seguridad social */}
          <div>
            <SectionTitle
              icon={<Shield className="w-4 h-4 text-red-600" />}
              title="4. Seguridad Social (auto-cargado desde TH-CONTRATO)"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field
                label="EPS (Salud)"
                value={data.eps}
                onChange={(v) => set("eps", v)}
              />
              <Field
                label="AFP (Pensiones)"
                value={data.afp}
                onChange={(v) => set("afp", v)}
              />
              <Field
                label="ARL (Riesgos Laborales)"
                value={data.arl}
                onChange={(v) => set("arl", v)}
              />
              <Field
                label="Fondo de Cesantías"
                value={data.cesantias}
                onChange={(v) => set("cesantias", v)}
              />
              <Field
                label="Caja de Compensación"
                value={data.cajaCompensacion}
                onChange={(v) => set("cajaCompensacion", v)}
              />
            </div>
          </div>

          {/* Sección 5: Cláusulas (editables) */}
          <div>
            <SectionTitle
              icon={<FileSignature className="w-4 h-4 text-purple-600" />}
              title="5. Cláusulas del Contrato (texto editable)"
            />
            <div className="space-y-3">
              <ClauseField
                label="Cláusula 1 — Objeto"
                value={data.clausulaObjeto}
                onChange={(v) => set("clausulaObjeto", v)}
              />
              <ClauseField
                label="Cláusula 2 — Funciones"
                value={data.clausulaFunciones}
                onChange={(v) => set("clausulaFunciones", v)}
              />
              <ClauseField
                label="Cláusula 3 — Duración e inicio"
                value={data.clausulaDuracion}
                onChange={(v) => set("clausulaDuracion", v)}
              />
              <ClauseField
                label="Cláusula 4 — Período de prueba"
                value={data.clausulaPeriodoPrueba}
                onChange={(v) => set("clausulaPeriodoPrueba", v)}
              />
              <ClauseField
                label="Cláusula 5 — Lugar de trabajo"
                value={data.clausulaLugar}
                onChange={(v) => set("clausulaLugar", v)}
              />
              <ClauseField
                label="Cláusula 6 — Jornada y horario"
                value={data.clausulaJornada}
                onChange={(v) => set("clausulaJornada", v)}
              />
              <ClauseField
                label="Cláusula 7 — Remuneración"
                value={data.clausulaRemuneracion}
                onChange={(v) => set("clausulaRemuneracion", v)}
              />
              <ClauseField
                label="Cláusula 8 — Seguridad social"
                value={data.clausulaSeguridadSocial}
                onChange={(v) => set("clausulaSeguridadSocial", v)}
              />
              <ClauseField
                label="Cláusula 9 — Prestaciones sociales"
                value={data.clausulaPrestaciones}
                onChange={(v) => set("clausulaPrestaciones", v)}
              />
              <ClauseField
                label="Cláusula 10 — Obligaciones del empleado"
                value={data.clausulaObligaciones}
                onChange={(v) => set("clausulaObligaciones", v)}
              />
              <ClauseField
                label="Cláusula 11 — Terminación"
                value={data.clausulaTerminacion}
                onChange={(v) => set("clausulaTerminacion", v)}
              />
              <ClauseField
                label="Cláusula 12 — Confidencialidad"
                value={data.clausulaConfidencialidad}
                onChange={(v) => set("clausulaConfidencialidad", v)}
              />
              <ClauseField
                label="Cláusula 13 — Protección de datos"
                value={data.clausulaDatos}
                onChange={(v) => set("clausulaDatos", v)}
              />
            </div>
          </div>

          {/* Sección 6: Firmas */}
          <div className="grid grid-cols-2 gap-8 mt-8 pt-8 border-t-2 border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <div className="border-b-2 border-slate-300 dark:border-slate-600 mb-2 pb-1">
                <p className="text-xs text-slate-500">El Empleador</p>
              </div>
              <p className="text-sm font-bold">
                {data.empresa || "________________"}
              </p>
              <p className="text-xs text-slate-500">
                NIT {data.nit || "________________"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {data.representanteLegal || "Representante legal"}
              </p>
            </div>
            <div className="text-center">
              <div className="border-b-2 border-slate-300 dark:border-slate-600 mb-2 pb-1">
                <p className="text-xs text-slate-500">El Empleado</p>
              </div>
              <p className="text-sm font-bold">
                {data.empleado || "________________"}
              </p>
              <p className="text-xs text-slate-500">
                C.C. {data.documento || "________________"}
              </p>
            </div>
          </div>

          {/* Pie */}
          <div className="text-center text-[10px] text-slate-400 mt-4">
            Modelo de contrato TH-MD-04 — auto-generado desde TH-01 (Requisición)
            y TH-03 (Hoja de Vida) · Documento de uso académico — empresa
            simulada SENA
          </div>
        </div>
      </div>
    </FormatShell>
  );
}

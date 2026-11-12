"use client";

import * as React from "react";
import { FileSignature, Save, Printer, RefreshCw, Building2, User, Shield, FileText, Download, BookOpen, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Contrato Laboral — Auto-generado desde TH-01 + TH-03              */
/* ------------------------------------------------------------------ */

/* Modelos de contrato de referencia (subidos a GitHub)
 * Archivos .docx alojados en /public/download/contratos/ */
const MODELOS_CONTRATO_REFERENCIA: {
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

interface ContratoData {
  // Datos de la empresa (de la requisición TH-01)
  empresa: string;
  nit: string;
  direccionEmpresa: string;
  telefonoEmpresa: string;
  // Datos del cargo (de la requisición TH-01)
  cargo: string;
  area: string;
  tipoContrato: string;
  duracionContrato: string;
  salario: string;
  jornadaTrabajo: string;
  horarioTrabajo: string;
  lugarTrabajo: string;
  jefeInmediato: string;
  // Datos del empleado (de la hoja de vida TH-03)
  nombreEmpleado: string;
  tipoDocumento: string;
  numeroDocumento: string;
  lugarExpedicion: string;
  direccionEmpleado: string;
  telefonoEmpleado: string;
  correoEmpleado: string;
  fechaNacimiento: string;
  lugarNacimiento: string;
  estadoCivil: string;
  // Datos del contrato (generados)
  fechaContrato: string;
  ciudadContrato: string;
  // Seguridad social
  eps: string;
  arl: string;
  afp: string;
  cesantias: string;
  cajaCompensacion: string;
  // Cláusulas
  funciones: string;
  observaciones: string;
}

const CONTRATO_VACIO: ContratoData = {
  empresa: "",
  nit: "",
  direccionEmpresa: "",
  telefonoEmpresa: "",
  cargo: "",
  area: "",
  tipoContrato: "",
  duracionContrato: "",
  salario: "",
  jornadaTrabajo: "",
  horarioTrabajo: "",
  lugarTrabajo: "",
  jefeInmediato: "",
  nombreEmpleado: "",
  tipoDocumento: "Cédula de ciudadanía",
  numeroDocumento: "",
  lugarExpedicion: "",
  direccionEmpleado: "",
  telefonoEmpleado: "",
  correoEmpleado: "",
  fechaNacimiento: "",
  lugarNacimiento: "",
  estadoCivil: "",
  fechaContrato: new Date().toISOString().slice(0, 10),
  ciudadContrato: "Bogotá D.C.",
  eps: "",
  arl: "",
  afp: "",
  cesantias: "",
  cajaCompensacion: "",
  funciones: "",
  observaciones: "",
};

// Cargar datos desde localStorage (TH-01 requisición + TH-03 hoja de vida)
function cargarDatosDesdeFormatos(): ContratoData {
  const data = { ...CONTRATO_VACIO };

  try {
    // Leer requisición TH-01
    const th01 = JSON.parse(window.localStorage.getItem("sigth-gestion-format-TH-01") || "{}");
    if (th01.empresa) data.empresa = th01.empresa;
    if (th01.cargoSolicitado) data.cargo = th01.cargoSolicitado;
    if (th01.areaSolicitante) data.area = th01.areaSolicitante;
    if (th01.tipoContrato) data.tipoContrato = th01.tipoContrato;
    if (th01.duracionContrato) data.duracionContrato = th01.duracionContrato;
    if (th01.salario) data.salario = th01.salario;
    if (th01.jornadaTrabajo) data.jornadaTrabajo = th01.jornadaTrabajo;
    if (th01.horarioTrabajo) data.horarioTrabajo = th01.horarioTrabajo;
    if (th01.lugarTrabajo) data.lugarTrabajo = th01.lugarTrabajo;
    if (th01.jefeInmediato) data.jefeInmediato = th01.jefeInmediato;

    // Leer hoja de vida TH-03 (candidato seleccionado)
    const th03 = JSON.parse(window.localStorage.getItem("sigth-gestion-format-TH-03") || "{}");
    if (th03.nombresApellidos) data.nombreEmpleado = th03.nombresApellidos;
    if (th03.numeroDocumento) data.numeroDocumento = th03.numeroDocumento;
    if (th03.lugarExpedicion) data.lugarExpedicion = th03.lugarExpedicion;
    if (th03.direccion) data.direccionEmpleado = th03.direccion;
    if (th03.municipio) data.lugarTrabajo = th03.municipio;
    if (th03.telefono) data.telefonoEmpleado = th03.telefono;
    if (th03.correo) data.correoEmpleado = th03.correo;
    if (th03.fechaNacimiento) data.fechaNacimiento = th03.fechaNacimiento;
    if (th03.lugarNacimiento) data.lugarNacimiento = th03.lugarNacimiento;
    if (th03.estadoCivil) data.estadoCivil = th03.estadoCivil;

    // Leer candidatos analizados
    const hvs = JSON.parse(window.localStorage.getItem("sigth-analyzed-hvs") || "[]");
    if (hvs.length > 0) {
      const seleccionado = hvs.find((h: any) => h.evaluation?.decision === "SELECCIONADO") || hvs[0];
      if (seleccionado.analysis?.nombre) data.nombreEmpleado = seleccionado.analysis.nombre;
      if (seleccionado.analysis?.telefono) data.telefonoEmpleado = seleccionado.analysis.telefono;
      if (seleccionado.analysis?.correo) data.correoEmpleado = seleccionado.analysis.correo;
      if (seleccionado.analysis?.cargoAspira) data.cargo = seleccionado.analysis.cargoAspira;
    }

    // Leer empresa configurada
    const empresaCfg = JSON.parse(window.localStorage.getItem("sigth-empresa-config") || "{}");
    if (empresaCfg.name) data.empresa = empresaCfg.name;
    if (empresaCfg.name) data.nit = "NIT " + (empresaCfg.id || "000.000.000-0");
  } catch {}

  return data;
}

export function ContratoLaboral() {
  const [data, setData] = React.useState<ContratoData>(CONTRATO_VACIO);
  const [cargado, setCargado] = React.useState(false);
  // Acordeón de modelos de referencia — cerrado por defecto, se abre al hacer clic
  const [modelosAbierto, setModelosAbierto] = React.useState(false);
  // Tipo de contrato seleccionado (indefinido o fijo) — controla el texto de cláusulas
  const [tipoSeleccionado, setTipoSeleccionado] = React.useState<"indefinido" | "fijo">("indefinido");
  // Período de prueba (en días) — editable por el usuario
  const [periodoPrueba, setPeriodoPrueba] = React.useState<string>("60");

  React.useEffect(() => {
    const loaded = cargarDatosDesdeFormatos();
    setData(loaded);
    setCargado(true);
    if (loaded.nombreEmpleado) {
      toast.success(`Contrato auto-generado para: ${loaded.nombreEmpleado}`);
    } else {
      toast.info("Contrato vacío — diligencie TH-01 (requisición) y TH-03 (hoja de vida) para auto-generar");
    }
  }, []);

  const set = <K extends keyof ContratoData>(key: K, value: ContratoData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const recargar = () => {
    const loaded = cargarDatosDesdeFormatos();
    setData(loaded);
    toast.success("Datos recargados desde TH-01 y TH-03");
  };

  const guardar = () => {
    window.localStorage.setItem("sigth-gestion-format-TH-CONTRATO", JSON.stringify(data));
    toast.success("Contrato guardado correctamente");
  };

  const imprimir = () => {
    window.print();
  };

  const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded bg-slate-100 dark:bg-slate-800">
      {icon}
      <span className="font-bold text-sm uppercase tracking-tight text-slate-700 dark:text-slate-200">{title}</span>
    </div>
  );

  const Field = ({ label, value, onChange, type = "text", wide = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; wide?: boolean }) => (
    <div className={wide ? "col-span-2" : ""}>
      <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
    </div>
  );

  return (
    <div className="space-y-4 pb-8">
      {/* Barra de acciones */}
      <div className="flex items-center gap-2 flex-wrap rb-no-print">
        <Button size="sm" variant="outline" onClick={recargar}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Recargar desde TH-01 + TH-03
        </Button>
        <Button size="sm" variant="outline" onClick={guardar}>
          <Save className="w-3.5 h-3.5 mr-1" /> Guardar
        </Button>
        <Button size="sm" variant="outline" onClick={imprimir}>
          <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir / PDF
        </Button>
        {cargado && data.nombreEmpleado && (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            ✓ Auto-generado para: {data.nombreEmpleado}
          </Badge>
        )}
      </div>

      {/* Selector de tipo de contrato — controla el texto legal que se genera abajo */}
      <div className="rb-no-print flex flex-wrap items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
          Tipo de contrato:
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => {
              setTipoSeleccionado("indefinido");
              set("tipoContrato", "Contrato a Término Indefinido");
              set("duracionContrato", "Indefinida (sin fecha de vencimiento)");
              toast.info("Plantilla: Contrato a Término Indefinido (Ley 2466 de 2025)");
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tipoSeleccionado === "indefinido"
                ? "bg-[#2C3E50] text-white shadow"
                : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
            }`}
          >
            📄 Término Indefinido
          </button>
          <button
            type="button"
            onClick={() => {
              setTipoSeleccionado("fijo");
              set("tipoContrato", "Contrato a Término Fijo");
              set("duracionContrato", "12 meses (prorrogable)");
              toast.info("Plantilla: Contrato a Término Fijo (art. 46 CST)");
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tipoSeleccionado === "fijo"
                ? "bg-[#B8941F] text-white shadow"
                : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
            }`}
          >
            📄 Término Fijo
          </button>
        </div>
        <a
          href={tipoSeleccionado === "indefinido"
            ? "/download/contratos/Contrato_indefinido_modelo_academico_Colombia.docx"
            : "/download/contratos/Contrato_termino_fijo_modelo_academico_Colombia.docx"}
          download
          className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors"
          onClick={() => toast.success(`Descargando modelo a término ${tipoSeleccionado === "indefinido" ? "indefinido" : "fijo"}`)}
        >
          <Download className="w-3 h-3" /> Descargar plantilla .docx
        </a>
      </div>

      {/* Período de prueba (editable) */}
      <div className="rb-no-print flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
        <Label className="text-xs font-bold text-amber-800 dark:text-amber-300 whitespace-nowrap">
          Período de prueba:
        </Label>
        <Input
          type="number"
          value={periodoPrueba}
          onChange={(e) => setPeriodoPrueba(e.target.value)}
          className="h-7 w-20 text-xs"
          min={0}
          max={120}
        />
        <span className="text-xs text-amber-700 dark:text-amber-400">
          días calendario (máx. 2 meses = 60 días, según art. 76-80 CST).{" "}
          {parseInt(periodoPrueba) > 60
            ? "⚠ Excede el máximo legal."
            : parseInt(periodoPrueba) === 0
            ? "Sin período de prueba."
            : `✓ Válido (${periodoPrueba} días).`}
        </span>
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
            <div className="w-9 h-9 rounded-md flex items-center justify-center text-white shrink-0" style={{ background: "linear-gradient(135deg, #2C3E50, #7B2D8B)" }}>
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Modelos de Contrato de Referencia
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                2 contratos académicos (indefinido + término fijo) y 1 guía de prompts para IA ·{" "}
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
            {MODELOS_CONTRATO_REFERENCIA.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border-2 overflow-hidden flex flex-col"
                style={{ borderColor: `${m.color}40` }}
              >
                <div
                  className="px-3 py-2 flex items-center gap-2 text-white"
                  style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}cc)` }}
                >
                  {m.tipo === "contrato" ? (
                    <FileSignature className="w-4 h-4 shrink-0" />
                  ) : (
                    <BookOpen className="w-4 h-4 shrink-0" />
                  )}
                  <span className="text-xs font-bold uppercase tracking-tight truncate">
                    {m.tipo === "contrato" ? "Modelo de contrato" : "Guía de prompts"}
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
              <strong>Nota importante:</strong> Estos modelos son plantillas
              pedagógicas para empresas simuladas SENA. Los campos entre
              corchetes <code className="px-1 rounded bg-amber-100 dark:bg-amber-900/50">[ ]</code>{" "}
              deben diligenciarse con la información real de la empresa y el
              trabajador. Antes de usarlos en una relación laboral real,
              solicita revisión jurídica y verifica la normativa vigente.
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border-2 border-slate-200 dark:border-slate-700 p-6 space-y-6">
        {/* Título */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">CONTRATO INDIVIDUAL DE TRABAJO</h2>
          <p className="text-xs text-slate-500 mt-1">Código: TH-CONTRATO-001 · Versión: 01 · Fecha: {data.fechaContrato}</p>
        </div>

        {/* Sección 1: Datos de la empresa */}
        <div>
          <SectionTitle icon={<Building2 className="w-4 h-4 text-blue-600" />} title="1. Datos de la Empresa" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Razón Social" value={data.empresa} onChange={(v) => set("empresa", v)} wide />
            <Field label="NIT" value={data.nit} onChange={(v) => set("nit", v)} />
            <Field label="Dirección" value={data.direccionEmpresa} onChange={(v) => set("direccionEmpresa", v)} />
            <Field label="Teléfono" value={data.telefonoEmpresa} onChange={(v) => set("telefonoEmpresa", v)} />
          </div>
        </div>

        {/* Sección 2: Datos del empleado */}
        <div>
          <SectionTitle icon={<User className="w-4 h-4 text-green-600" />} title="2. Datos del Empleado" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Nombres y Apellidos" value={data.nombreEmpleado} onChange={(v) => set("nombreEmpleado", v)} wide />
            <Field label="Tipo de Documento" value={data.tipoDocumento} onChange={(v) => set("tipoDocumento", v)} />
            <Field label="N° Documento" value={data.numeroDocumento} onChange={(v) => set("numeroDocumento", v)} />
            <Field label="Lugar de Expedición" value={data.lugarExpedicion} onChange={(v) => set("lugarExpedicion", v)} />
            <Field label="Fecha de Nacimiento" value={data.fechaNacimiento} onChange={(v) => set("fechaNacimiento", v)} type="date" />
            <Field label="Lugar de Nacimiento" value={data.lugarNacimiento} onChange={(v) => set("lugarNacimiento", v)} />
            <Field label="Dirección" value={data.direccionEmpleado} onChange={(v) => set("direccionEmpleado", v)} />
            <Field label="Teléfono" value={data.telefonoEmpleado} onChange={(v) => set("telefonoEmpleado", v)} />
            <Field label="Correo" value={data.correoEmpleado} onChange={(v) => set("correoEmpleado", v)} />
            <Field label="Estado Civil" value={data.estadoCivil} onChange={(v) => set("estadoCivil", v)} />
          </div>
        </div>

        {/* Sección 3: Datos del cargo (de requisición TH-01) */}
        <div>
          <SectionTitle icon={<FileSignature className="w-4 h-4 text-amber-600" />} title="3. Datos del Cargo (auto-cargado desde TH-01)" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Cargo" value={data.cargo} onChange={(v) => set("cargo", v)} />
            <Field label="Área / Departamento" value={data.area} onChange={(v) => set("area", v)} />
            <Field label="Tipo de Contrato" value={data.tipoContrato} onChange={(v) => set("tipoContrato", v)} />
            <Field label="Duración" value={data.duracionContrato} onChange={(v) => set("duracionContrato", v)} />
            <Field label="Salario" value={data.salario} onChange={(v) => set("salario", v)} />
            <Field label="Jornada de Trabajo" value={data.jornadaTrabajo} onChange={(v) => set("jornadaTrabajo", v)} />
            <Field label="Horario" value={data.horarioTrabajo} onChange={(v) => set("horarioTrabajo", v)} />
            <Field label="Lugar de Trabajo" value={data.lugarTrabajo} onChange={(v) => set("lugarTrabajo", v)} />
            <Field label="Jefe Inmediato" value={data.jefeInmediato} onChange={(v) => set("jefeInmediato", v)} />
          </div>
        </div>

        {/* Sección 4: Seguridad Social */}
        <div>
          <SectionTitle icon={<Shield className="w-4 h-4 text-red-600" />} title="4. Afiliación a Seguridad Social" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="EPS (Salud)" value={data.eps} onChange={(v) => set("eps", v)} />
            <Field label="AFP (Pensiones)" value={data.afp} onChange={(v) => set("afp", v)} />
            <Field label="ARL (Riesgos Laborales)" value={data.arl} onChange={(v) => set("arl", v)} />
            <Field label="Fondo de Cesantías" value={data.cesantias} onChange={(v) => set("cesantias", v)} />
            <Field label="Caja de Compensación" value={data.cajaCompensacion} onChange={(v) => set("cajaCompensacion", v)} />
          </div>
        </div>

        {/* Sección 5: Funciones del cargo */}
        <div>
          <SectionTitle icon={<FileSignature className="w-4 h-4 text-purple-600" />} title="5. Funciones del Cargo" />
          <Textarea
            value={data.funciones}
            onChange={(e) => set("funciones", e.target.value)}
            placeholder="Las funciones se cargan automáticamente desde la requisición TH-01..."
            rows={5}
            className="text-sm"
          />
        </div>

        {/* Sección 6: Cláusulas del contrato — adaptadas al tipo seleccionado */}
        <div>
          <SectionTitle icon={<FileSignature className="w-4 h-4 text-slate-600" />} title="6. Cláusulas del Contrato" />
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <p><strong>Cláusula 1 — Objeto:</strong> El presente contrato tiene por objeto la prestación de servicios por parte de <strong>{data.nombreEmpleado || "[EMPLEADO]"}</strong> (en adelante EL EMPLEADO) a <strong>{data.empresa || "[EMPRESA]"}</strong>, desempeñando el cargo de <strong>{data.cargo || "[CARGO]"}</strong>, bajo continua subordinación o dependencia y a cambio de la remuneración pactada, conforme a los artículos 22 y siguientes del Código Sustantivo del Trabajo (CST).</p>

            <p><strong>Cláusula 2 — Funciones:</strong> El EMPLEADO ejecutará las labores propias del cargo de {data.cargo || "[CARGO]"}{data.funciones ? `, entre las cuales se incluyen: ${data.funciones}` : ""}. Así mismo, cumplirá las funciones conexas y complementarias que le asigne su jefe inmediato ({data.jefeInmediato || "[JEFE]"}), sin desmejora de sus condiciones esenciales.</p>

            <p><strong>Cláusula 3 — Duración e inicio:</strong> El presente contrato es de <strong>{data.tipoContrato || "[TIPO]"}</strong>{tipoSeleccionado === "indefinido"
              ? ", regido por el artículo 47 del CST (modificado por el artículo 5 de la Ley 2466 de 2025), y su vigencia se mantendrá mientras subsistan las causas que le dieron origen y la materia del trabajo"
              : `, con una duración de ${data.duracionContrato || "[DURACIÓN]"}, contados a partir del ${data.fechaContrato}`}.</p>

            {parseInt(periodoPrueba) > 0 && (
              <p><strong>Cláusula 4 — Período de prueba:</strong> Las partes acuerdan un período de prueba de <strong>{periodoPrueba} días calendario</strong>, conforme a los artículos 76 al 80 del CST. Durante este período, cualquiera de las partes podrá terminar el contrato sin previo aviso. Desde el primer día se causan salario, afiliaciones y demás derechos laborales.</p>
            )}

            <p><strong>Cláusula {parseInt(periodoPrueba) > 0 ? 5 : 4} — Lugar de trabajo:</strong> El EMPLEADO prestará sus servicios en <strong>{data.lugarTrabajo || "[LUGAR]"}</strong>, bajo modalidad presencial, conforme al artículo 57 del CST.</p>

            <p><strong>Cláusula {parseInt(periodoPrueba) > 0 ? 6 : 5} — Jornada y horario:</strong> La jornada ordinaria será de <strong>{data.jornadaTrabajo || "[JORNADA]"}</strong> horas semanales, distribuida de lunes a viernes en el horario de <strong>{data.horarioTrabajo || "[HORARIO]"}</strong>, conforme a la implementación gradual de la Ley 2101 de 2021 (jornada máxima de 42 horas semanales a partir de 2026), con descanso dominical.</p>

            <p><strong>Cláusula {parseInt(periodoPrueba) > 0 ? 7 : 6} — Remuneración:</strong> {data.empresa || "[EMPRESA]"} pagará al EMPLEADO un salario mensual de <strong>{data.salario || "[SALARIO]"}</strong>, mediante transferencia bancaria en las fechas establecidas (último día hábil del mes). El salario respeta el mínimo legal vigente y será proporcional cuando legalmente corresponda.</p>

            <p><strong>Cláusula {parseInt(periodoPrueba) > 0 ? 8 : 7} — Seguridad Social:</strong> {data.empresa || "[EMPRESA]"} afiliará al EMPLEADO al Sistema de Seguridad Social Integral: EPS ({data.eps || "[EPS]"}), AFP ({data.afp || "[AFP]"}), ARL ({data.arl || "[ARL]"}), Fondo de Cesantías ({data.cesantias || "[CESANTÍAS]"}) y Caja de Compensación ({data.cajaCompensacion || "[CAJA]"}), conforme a la Ley 100 de 1993.</p>

            <p><strong>Cláusula {parseInt(periodoPrueba) > 0 ? 9 : 8} — Prestaciones sociales:</strong> El EMPLEADO tendrá derecho a prima de servicios, cesantías, intereses a las cesantías, vacaciones, dotación y auxilio de transporte (cuando cumpla los requisitos legales), conforme al CST.</p>

            <p><strong>Cláusula {parseInt(periodoPrueba) > 0 ? 10 : 9} — Obligaciones del EMPLEADO:</strong> El EMPLEADO deberá: (a) realizar las tareas del cargo con diligencia y buena fe; (b) atender instrucciones legítimas; (c) cuidar equipos y recursos entregados; (d) cumplir el Reglamento Interno de Trabajo y las medidas de Seguridad y Salud en el Trabajo (SST).</p>

            <p><strong>Cláusula {parseInt(periodoPrueba) > 0 ? 11 : 10} — Terminación:</strong> El contrato podrá terminar por las causales establecidas en el artículo 61 del CST{tipoSeleccionado === "fijo" ? ", o por expiración del plazo pactado" : ""}, con las indemnizaciones que correspondan según los artículos 64 y siguientes del CST.</p>

            <p><strong>Cláusula {parseInt(periodoPrueba) > 0 ? 12 : 11} — Confidencialidad y protección de datos:</strong> El EMPLEADO se obliga a mantener confidencialidad sobre la información sensible de {data.empresa || "[EMPRESA]"} y sus clientes, conforme a la Ley 1581 de 2012 (protección de datos personales).</p>
          </div>
        </div>

        {/* Sección 7: Firmas */}
        <div className="grid grid-cols-2 gap-8 mt-8 pt-8 border-t-2 border-slate-200 dark:border-slate-700">
          <div className="text-center">
            <div className="border-b-2 border-slate-300 dark:border-slate-600 mb-2 pb-1">
              <p className="text-xs text-slate-500">Firma del Empleado</p>
            </div>
            <p className="text-sm font-bold">{data.nombreEmpleado || "________________"}</p>
            <p className="text-xs text-slate-500">C.C. {data.numeroDocumento || "________________"}</p>
          </div>
          <div className="text-center">
            <div className="border-b-2 border-slate-300 dark:border-slate-600 mb-2 pb-1">
              <p className="text-xs text-slate-500">Firma del Representante</p>
            </div>
            <p className="text-sm font-bold">{data.empresa || "________________"}</p>
            <p className="text-xs text-slate-500">NIT {data.nit || "________________"}</p>
          </div>
        </div>

        {/* Pie */}
        <div className="text-center text-[10px] text-slate-400 mt-4">
          Contrato generado automáticamente desde TH-01 (Requisición) y TH-03 (Hoja de Vida) ·
          Documento de uso académico — empresa simulada SENA
        </div>
      </div>
    </div>
  );
}

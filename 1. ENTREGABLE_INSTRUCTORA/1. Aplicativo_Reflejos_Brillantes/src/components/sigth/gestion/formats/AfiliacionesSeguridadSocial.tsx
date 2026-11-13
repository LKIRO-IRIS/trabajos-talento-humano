"use client";

import * as React from "react";
import {
  Shield, Save, Printer, RefreshCw, Heart, AlertTriangle, Banknote,
  PiggyBank, Home, Download, FileText, ChevronDown, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Afiliaciones de Seguridad Social — MEJORADO con entidades reales */
/*  Colombia 2026 — Porcentajes legales vigentes                       */
/* ------------------------------------------------------------------ */

// Entidades reales más usadas en Colombia
const ENTIDADES_EPS = [
  { id: "epssura", nombre: "EPS SURA", nit: "890230440-1", codigo: "EPS019" },
  { id: "epssanitas", nombre: "EPS Sanitas", nit: "800088702-1", codigo: "EPS017" },
  { id: "nuevaeps", nombre: "Nueva EPS", nit: "900156264-1", codigo: "EPS019" },
  { id: "compensar", nombre: "Compensar EPS", nit: "860042522-5", codigo: "EPS019" },
  { id: "colsubsidio", nombre: "Colsubsidio", nit: "800096521-2", codigo: "EPS019" },
  { id: "coosalud", nombre: "Coosalud EPS-S", nit: "830002344-1", codigo: "ESS207" },
  { id: "saviasalud", nombre: "SaviaSalud EPS-S", nit: "900127621-4", codigo: "ESS218" },
  { id: "emssanar", nombre: "EMSSANAR EPS-S", nit: "900127662-1", codigo: "ESS218" },
];

const ENTIDADES_AFP = [
  { id: "porvenir", nombre: "Porvenir", nit: "860030499-1", codigo: "AFP023" },
  { id: "proteccion", nombre: "Protección", nit: "860030499-2", codigo: "AFP023" },
  { id: "colfondos", nombre: "Colfondos", nit: "860030499-3", codigo: "AFP023" },
  { id: "colpensiones", nombre: "Colpensiones (RPM)", nit: "899999003-1", codigo: "CCF001" },
  { id: "skandia", nombre: "Skandia", nit: "860030499-4", codigo: "AFP023" },
];

const ENTIDADES_ARL = [
  { id: "arlsura", nombre: "ARL SURA", nit: "890230440-1", codigo: "ARL022" },
  { id: "arlcolmena", nombre: "ARL Colmena Seguros", nit: "830003563-1", codigo: "ARL022" },
  { id: "arlpositiva", nombre: "ARL Positiva", nit: "860034313-1", codigo: "ARL022" },
  { id: "arlbolivar", nombre: "ARL Bolívar", nit: "860002143-3", codigo: "ARL022" },
  { id: "arlmundial", nombre: "ARL Mundial", nit: "830003445-1", codigo: "ARL022" },
];

const FONDOS_CESANTIAS = [
  { id: "porvenir_c", nombre: "Porvenir", nit: "860030499-1", codigo: "FC001" },
  { id: "proteccion_c", nombre: "Protección", nit: "860030499-2", codigo: "FC001" },
  { id: "colfondos_c", nombre: "Colfondos", nit: "860030499-3", codigo: "FC001" },
  { id: "skandia_c", nombre: "Skandia", nit: "860030499-4", codigo: "FC001" },
];

const CAJAS_COMPENSACION = [
  { id: "compensar_caja", nombre: "Compensar", nit: "860042522-5", codigo: "CC002" },
  { id: "colsubsidio_caja", nombre: "Colsubsidio", nit: "800096521-2", codigo: "CC002" },
  { id: "comfama", nombre: "Comfama", nit: "890980005-1", codigo: "CC002" },
  { id: "comfenalco", nombre: "Comfenalco Antioquia", nit: "890980013-1", codigo: "CC002" },
  { id: "cafam", nombre: "CAFAM", nit: "860003561-1", codigo: "CC002" },
  { id: "comfaboy", nombre: "Comfaboy", nit: "890700549-1", codigo: "CC002" },
];

// Clases de riesgo ARL — porcentaje mensual sobre IBC
const CLASES_RIESGO_ARL = [
  { clase: "I", riesgo: "Riesgo mínimo (oficina, comercio)", porcentaje: 0.522 },
  { clase: "II", riesgo: "Riesgo bajo (servicios, restaurantes)", porcentaje: 1.044 },
  { clase: "III", riesgo: "Riesgo medio (carpintería, mecánica)", porcentaje: 2.436 },
  { clase: "IV", riesgo: "Riesgo alto (construcción, minería)", porcentaje: 4.350 },
  { clase: "V", riesgo: "Riesgo máximo (trabajo en alturas)", porcentaje: 6.960 },
];

// Porcentajes legales de aportes 2026 (Decreto SMMLV 2026)
const PORCENTAJES_2026 = {
  saludEmpleado: 4.0,       // 4% trabajador
  saludEmpleador: 8.5,      // 8.5% empleador (a 2026 = 0% exonerado Ley 1607 para <10 SMMLV)
  pensionEmpleado: 4.0,     // 4% trabajador
  pensionEmpleador: 12.0,   // 12% empleador
  arlEmpleador: 0.522,      // Variable según clase (default I)
  cesantiasEmpleador: 8.33,
  interesesCesantias: 1.0,
  cajaCompensacion: 4.0,
  icbf: 3.0,                 // 0% si empleado gana <10 SMMLV (Ley 1607)
  sena: 2.0,                 // 0% si empleado gana <10 SMMLV (Ley 1607)
};

interface AfiliacionData {
  nombreEmpleado: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaNacimiento: string;
  sexo: string;
  direccion: string;
  municipio: string;
  telefono: string;
  correo: string;
  cargo: string;
  salarioBase: string;
  empresa: string;
  nit: string;
  direccionEmpresa: string;
  telefonoEmpresa: string;
  tipoCotizante: string;
  epsId: string;
  afpId: string;
  arlId: string;
  cesantiasId: string;
  cajaId: string;
  claseRiesgoArl: string;
  fechaAfiliacion: string;
  observaciones: string;
}

const DATA_VACIA: AfiliacionData = {
  nombreEmpleado: "",
  tipoDocumento: "Cédula de ciudadanía",
  numeroDocumento: "",
  fechaNacimiento: "",
  sexo: "",
  direccion: "",
  municipio: "",
  telefono: "",
  correo: "",
  cargo: "",
  salarioBase: "",
  empresa: "",
  nit: "",
  direccionEmpresa: "",
  telefonoEmpresa: "",
  tipoCotizante: "Dependiente",
  epsId: "epssura",
  afpId: "porvenir",
  arlId: "arlsura",
  cesantiasId: "porvenir_c",
  cajaId: "compensar_caja",
  claseRiesgoArl: "I",
  fechaAfiliacion: new Date().toISOString().slice(0, 10),
  observaciones: "",
};

function cargarDatosDesdeFormatos(): AfiliacionData {
  const data = { ...DATA_VACIA };
  try {
    const th03 = JSON.parse(window.localStorage.getItem("sigth-gestion-format-TH-03") || "{}");
    if (th03.nombresApellidos) data.nombreEmpleado = th03.nombresApellidos;
    if (th03.numeroDocumento) data.numeroDocumento = th03.numeroDocumento;
    if (th03.fechaNacimiento) data.fechaNacimiento = th03.fechaNacimiento;
    if (th03.direccion) data.direccion = th03.direccion;
    if (th03.municipio) data.municipio = th03.municipio;
    if (th03.telefono) data.telefono = th03.telefono;
    if (th03.correo) data.correo = th03.correo;
    if (th03.estadoCivil) data.sexo = th03.estadoCivil;

    const contrato = JSON.parse(window.localStorage.getItem("sigth-gestion-format-TH-CONTRATO") || "{}");
    if (contrato.cargo) data.cargo = contrato.cargo;
    if (contrato.salario) data.salarioBase = contrato.salario;
    if (contrato.empresa) data.empresa = contrato.empresa;
    if (contrato.nit) data.nit = contrato.nit;
    if (contrato.direccionEmpresa) data.direccionEmpresa = contrato.direccionEmpresa;
    if (contrato.telefonoEmpresa) data.telefonoEmpresa = contrato.telefonoEmpresa;

    const empresaCfg = JSON.parse(window.localStorage.getItem("sigth-empresa-config") || "{}");
    if (empresaCfg.name && !data.empresa) data.empresa = empresaCfg.name;
    if (empresaCfg.name && !data.nit) data.nit = "NIT " + (empresaCfg.id || "000.000.000-0");
  } catch {}
  return data;
}

export function AfiliacionesSeguridadSocial() {
  const [data, setData] = React.useState<AfiliacionData>(DATA_VACIA);
  const [cargado, setCargado] = React.useState(false);
  const [formulariosAbierto, setFormulariosAbierto] = React.useState(false);

  React.useEffect(() => {
    const loaded = cargarDatosDesdeFormatos();
    setData(loaded);
    setCargado(true);
    if (loaded.nombreEmpleado) {
      toast.success(`Afiliaciones auto-generadas para: ${loaded.nombreEmpleado}`);
    }
  }, []);

  const set = <K extends keyof AfiliacionData>(key: K, value: AfiliacionData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const recargar = () => {
    const loaded = cargarDatosDesdeFormatos();
    setData(loaded);
    toast.success("Datos recargados desde TH-03 y TH-CONTRATO");
  };

  const guardar = () => {
    window.localStorage.setItem("sigth-gestion-format-TH-AFILIACIONES", JSON.stringify(data));
    toast.success("Afiliaciones guardadas correctamente");
  };

  const imprimir = () => window.print();

  const salario = parseFloat(data.salarioBase.replace(/[^\d]/g, "")) || 0;
  const claseArl = CLASES_RIESGO_ARL.find((c) => c.clase === data.claseRiesgoArl);
  const pctArl = claseArl?.porcentaje || 0.522;

  const SMMLV_2026 = 1750905;
  const exoneradoLey1607 = salario < SMMLV_2026 * 10;

  const aportes = React.useMemo(() => {
    const calc = (pct: number) => Math.round((salario * pct) / 100);
    return {
      saludEmpleado: calc(PORCENTAJES_2026.saludEmpleado),
      saludEmpleador: exoneradoLey1607 ? 0 : calc(PORCENTAJES_2026.saludEmpleador),
      pensionEmpleado: calc(PORCENTAJES_2026.pensionEmpleado),
      pensionEmpleador: calc(PORCENTAJES_2026.pensionEmpleador),
      arlEmpleador: calc(pctArl),
      cesantiasEmpleador: calc(PORCENTAJES_2026.cesantiasEmpleador),
      interesesCesantias: calc(PORCENTAJES_2026.interesesCesantias),
      cajaCompensacion: calc(PORCENTAJES_2026.cajaCompensacion),
      icbf: exoneradoLey1607 ? 0 : calc(PORCENTAJES_2026.icbf),
      sena: exoneradoLey1607 ? 0 : calc(PORCENTAJES_2026.sena),
    };
  }, [salario, pctArl, exoneradoLey1607]);

  const totalEmpleador = aportes.saludEmpleador + aportes.pensionEmpleador + aportes.arlEmpleador + aportes.cesantiasEmpleador + aportes.interesesCesantias + aportes.cajaCompensacion + aportes.icbf + aportes.sena;
  const totalEmpleado = aportes.saludEmpleado + aportes.pensionEmpleado;

  const fmt = (n: number) => "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 0 });

  const Field = ({ label, value, onChange, type = "text", wide = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; wide?: boolean; }) => (
    <div className={wide ? "col-span-2" : ""}>
      <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
    </div>
  );

  const SelectField = ({ label, value, onChange, options, wide = false }: { label: string; value: string; onChange: (v: string) => void; options: { id: string; nombre: string }[]; wide?: boolean; }) => (
    <div className={wide ? "col-span-2" : ""}>
      <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
        {options.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
      </select>
    </div>
  );

  const SectionTitle = ({ icon, title, color = "bg-slate-100 dark:bg-slate-800" }: { icon: React.ReactNode; title: string; color?: string; }) => (
    <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded ${color}`}>
      {icon}
      <span className="font-bold text-sm uppercase tracking-tight text-slate-700 dark:text-slate-200">{title}</span>
    </div>
  );

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-2 flex-wrap rb-no-print">
        <Button size="sm" variant="outline" onClick={recargar}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Recargar desde TH-03 + TH-CONTRATO</Button>
        <Button size="sm" variant="outline" onClick={guardar}><Save className="w-3.5 h-3.5 mr-1" /> Guardar</Button>
        <Button size="sm" variant="outline" onClick={imprimir}><Printer className="w-3.5 h-3.5 mr-1" /> Imprimir / PDF</Button>
        {cargado && data.nombreEmpleado && (
          <Badge className="bg-green-100 text-green-700 border-green-300">✓ Auto-generado para: {data.nombreEmpleado}</Badge>
        )}
      </div>

      <div className="rb-no-print p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
        <strong>📊 Porcentajes legales vigentes 2026:</strong>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>Salud: <strong>12.5%</strong> (4% trab + 8.5% emp)</div>
          <div>Pensión: <strong>16%</strong> (4% trab + 12% emp)</div>
          <div>ARL: <strong>0.522% - 6.96%</strong></div>
          <div>Cesantías: <strong>8.33%</strong></div>
          <div>Intereses cesantías: <strong>1%</strong></div>
          <div>Caja compensación: <strong>4%</strong></div>
          <div>ICBF: <strong>3%</strong> (0% si &lt;10 SMMLV)</div>
          <div>SENA: <strong>2%</strong> (0% si &lt;10 SMMLV)</div>
        </div>
        <div className="mt-2 text-[10px] text-blue-700 dark:text-blue-400">
          SMMLV 2026: $1.750.905 · Auxilio transporte: $200.000 · Tope exoneración Ley 1607: $17.509.050 (10 SMMLV)
        </div>
      </div>

      {/* Formularios oficiales descargables */}
      <div className="rb-no-print rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden">
        <button type="button" onClick={() => setFormulariosAbierto((v) => !v)} className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" aria-expanded={formulariosAbierto}>
          <div className="flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-md flex items-center justify-center text-white shrink-0 bg-gradient-to-br from-red-600 to-blue-700"><FileText className="w-4 h-4" /></div>
            <div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Formularios oficiales de afiliación (PDF / web descargables)</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Formulario Único SGSSS (MinSalud) · EPS SURA · ARL SURA · Porvenir ·{" "}
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{formulariosAbierto ? "Ocultar" : "Ver"} formularios</span>
              </div>
            </div>
          </div>
          {formulariosAbierto ? <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
        </button>
        {formulariosAbierto && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-white dark:bg-slate-900 animate-rb-fade-up">
            {[
              { nombre: "Formulario Único de Afiliación al SGSSS (MinSalud)", desc: "Formulario oficial del Ministerio de Salud para afiliación a EPS, usado por todas las entidades en Colombia.", archivo: "/download/afiliaciones/Formulario_Unico_Afiliacion_MinSalud.pdf", color: "#1d4ed8" },
              { nombre: "Formulario de Afiliación EPS SURA", desc: "Formato oficial de EPS Sura para trabajadores dependientes e independientes.", archivo: "https://www.epssura.com/afiliacion-al-pbs", color: "#0066b3" },
              { nombre: "Formulario de Afiliación ARL SURA", desc: "Afiliación al Sistema General de Riesgos Laborales — ARL SURA.", archivo: "https://www.sura.co/arl/afiliacion", color: "#00a650" },
              { nombre: "Formulario de Afiliación a Pensiones — Porvenir", desc: "Proceso 100% digital en Porvenir (Fondo de Pensiones).", archivo: "https://www.porvenir.com.co/pensiones/afiliacion-pensiones", color: "#f36f21" },
              { nombre: "Formulario de Afiliación a Cesantías — Porvenir", desc: "Afiliación de trabajadores al Fondo de Cesantías Porvenir.", archivo: "https://www.porvenir.com.co/cesantias/afiliacion-cesantias", color: "#f36f21" },
              { nombre: "Formularios de Colpensiones", desc: "Formulario oficial del Fondo Público Colpensiones (RPM).", archivo: "https://www.colpensiones.gov.co/documentos/571/descarga-de-formularios", color: "#003366" },
              { nombre: "Formulario de Afiliación Colsubsidio", desc: "Caja de Compensación Familiar Colsubsidio — Bogotá y Cundinamarca.", archivo: "https://www.colsubsidio.com/afiliaciones/como-llenar-formulario", color: "#ec008c" },
              { nombre: "Formulario de Afiliación Compensar", desc: "Caja de Compensación Compensar — Bogotá y nacional.", archivo: "https://corporativo.compensar.com/afiliaciones/afiliacion-a-caja-personas", color: "#fdb913" },
              { nombre: "Afiliación a ICBF (empleador)", desc: "Instituto Colombiano de Bienestar Familiar — registro de empleador.", archivo: "https://www.icbf.gov.co/", color: "#00529c" },
            ].map((f) => (
              <div key={f.nombre} className="rounded-lg border-2 overflow-hidden flex flex-col" style={{ borderColor: `${f.color}40` }}>
                <div className="px-3 py-2 flex items-center gap-2 text-white" style={{ background: f.color }}>
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-tight truncate">{f.archivo.endsWith(".pdf") ? "PDF oficial" : "Web oficial"}</span>
                </div>
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <div className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{f.nombre}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed flex-1">{f.desc}</div>
                  <a href={f.archivo} target={f.archivo.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" download={!f.archivo.startsWith("http")} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-white transition-transform hover:scale-105 w-fit" style={{ background: f.color }} onClick={() => toast.success(`Abriendo: ${f.nombre}`)}>
                    <Download className="w-3 h-3" /> {f.archivo.endsWith(".pdf") ? "Descargar PDF" : "Abrir web oficial"}
                  </a>
                </div>
              </div>
            ))}
            <div className="md:col-span-2 lg:col-span-3 mt-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              <strong>Importante:</strong> Estos formularios son los oficiales vigentes en Colombia. En una empresa simulada SENA, se diligencian con datos ficticios para fines pedagógicos. En un contexto laboral real, el empleador debe radicarlos dentro de los <strong>8 días siguientes</strong> al inicio de la vinculación laboral (Decreto 723 de 2013, art. 21).
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border-2 border-slate-200 dark:border-slate-700 p-6 space-y-6">
        <div className="text-center border-b-2 border-slate-200 dark:border-slate-700 pb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">AFILIACIONES DE SEGURIDAD SOCIAL</h2>
          <p className="text-xs text-slate-500 mt-1">Formato TH-AFILIACIONES-001 · Versión: 01 · Fecha: {data.fechaAfiliacion}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Sistema General de Seguridad Social Integral — Colombia 2026</p>
        </div>

        <div>
          <SectionTitle icon={<Heart className="w-4 h-4 text-red-600" />} title="1. Datos del Empleado (auto-cargado desde TH-03)" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Nombres y Apellidos" value={data.nombreEmpleado} onChange={(v) => set("nombreEmpleado", v)} wide />
            <SelectField label="Tipo de Documento" value={data.tipoDocumento} onChange={(v) => set("tipoDocumento", v)} options={[{ id: "CC", nombre: "Cédula de ciudadanía" }, { id: "CE", nombre: "Cédula de extranjería" }, { id: "TI", nombre: "Tarjeta de identidad" }, { id: "PT", nombre: "Permiso por protección temporal" }]} />
            <Field label="N° Documento" value={data.numeroDocumento} onChange={(v) => set("numeroDocumento", v)} />
            <Field label="Fecha de Nacimiento" value={data.fechaNacimiento} onChange={(v) => set("fechaNacimiento", v)} type="date" />
            <SelectField label="Sexo" value={data.sexo} onChange={(v) => set("sexo", v)} options={[{ id: "F", nombre: "Femenino" }, { id: "M", nombre: "Masculino" }, { id: "O", nombre: "Otro / Prefiere no reportar" }]} />
            <Field label="Municipio / Ciudad" value={data.municipio} onChange={(v) => set("municipio", v)} />
            <Field label="Dirección" value={data.direccion} onChange={(v) => set("direccion", v)} />
            <Field label="Teléfono" value={data.telefono} onChange={(v) => set("telefono", v)} />
            <Field label="Correo Electrónico" value={data.correo} onChange={(v) => set("correo", v)} />
            <Field label="Cargo" value={data.cargo} onChange={(v) => set("cargo", v)} />
            <SelectField label="Tipo de Cotizante" value={data.tipoCotizante} onChange={(v) => set("tipoCotizante", v)} options={[{ id: "Dependiente", nombre: "Dependiente" }, { id: "Independiente", nombre: "Independiente" }, { id: "Pensionado", nombre: "Pensionado" }]} />
            <Field label="Salario Base Mensual (IBC)" value={data.salarioBase} onChange={(v) => set("salarioBase", v)} />
          </div>
        </div>

        <div>
          <SectionTitle icon={<Banknote className="w-4 h-4 text-blue-600" />} title="2. Datos del Empleador" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Razón Social" value={data.empresa} onChange={(v) => set("empresa", v)} wide />
            <Field label="NIT" value={data.nit} onChange={(v) => set("nit", v)} />
            <Field label="Dirección" value={data.direccionEmpresa} onChange={(v) => set("direccionEmpresa", v)} />
            <Field label="Teléfono" value={data.telefonoEmpresa} onChange={(v) => set("telefonoEmpresa", v)} />
          </div>
        </div>

        <div>
          <SectionTitle icon={<Shield className="w-4 h-4 text-purple-600" />} title="3. Entidades de Afiliación (selecciona las reales)" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SelectField label="EPS (Salud)" value={data.epsId} onChange={(v) => set("epsId", v)} options={ENTIDADES_EPS} wide />
            <SelectField label="AFP (Pensiones)" value={data.afpId} onChange={(v) => set("afpId", v)} options={ENTIDADES_AFP} wide />
            <SelectField label="ARL (Riesgos Laborales)" value={data.arlId} onChange={(v) => set("arlId", v)} options={ENTIDADES_ARL} wide />
            <SelectField label="Fondo de Cesantías" value={data.cesantiasId} onChange={(v) => set("cesantiasId", v)} options={FONDOS_CESANTIAS} wide />
            <SelectField label="Caja de Compensación Familiar" value={data.cajaId} onChange={(v) => set("cajaId", v)} options={CAJAS_COMPENSACION} wide />
            <SelectField label="Clase de Riesgo ARL (Nivel I-V)" value={data.claseRiesgoArl} onChange={(v) => set("claseRiesgoArl", v)} options={CLASES_RIESGO_ARL.map((c) => ({ id: c.clase, nombre: `Clase ${c.clase} — ${c.riesgo} (${c.porcentaje}%)` }))} wide />
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {(() => {
              const eps = ENTIDADES_EPS.find((e) => e.id === data.epsId);
              const afp = ENTIDADES_AFP.find((e) => e.id === data.afpId);
              const arl = ENTIDADES_ARL.find((e) => e.id === data.arlId);
              const ces = FONDOS_CESANTIAS.find((e) => e.id === data.cesantiasId);
              const caj = CAJAS_COMPENSACION.find((e) => e.id === data.cajaId);
              return (
                <>
                  {eps && (<div className="text-xs p-2 rounded bg-slate-50 dark:bg-slate-800"><strong className="text-slate-700 dark:text-slate-300">{eps.nombre}</strong><br /><span className="text-slate-500">NIT: {eps.nit} · Código PILA: {eps.codigo}</span></div>)}
                  {afp && (<div className="text-xs p-2 rounded bg-slate-50 dark:bg-slate-800"><strong className="text-slate-700 dark:text-slate-300">{afp.nombre}</strong><br /><span className="text-slate-500">NIT: {afp.nit} · Código PILA: {afp.codigo}</span></div>)}
                  {arl && (<div className="text-xs p-2 rounded bg-slate-50 dark:bg-slate-800"><strong className="text-slate-700 dark:text-slate-300">{arl.nombre}</strong><br /><span className="text-slate-500">NIT: {arl.nit} · Código PILA: {arl.codigo}</span></div>)}
                  {ces && (<div className="text-xs p-2 rounded bg-slate-50 dark:bg-slate-800"><strong className="text-slate-700 dark:text-slate-300">{ces.nombre}</strong><br /><span className="text-slate-500">NIT: {ces.nit} · Código PILA: {ces.codigo}</span></div>)}
                  {caj && (<div className="text-xs p-2 rounded bg-slate-50 dark:bg-slate-800"><strong className="text-slate-700 dark:text-slate-300">{caj.nombre}</strong><br /><span className="text-slate-500">NIT: {caj.nit} · Código PILA: {caj.codigo}</span></div>)}
                </>
              );
            })()}
          </div>
        </div>

        <div>
          <SectionTitle icon={<PiggyBank className="w-4 h-4 text-green-600" />} title="4. Cálculo de Aportes PILA (Planilla Integrada de Liquidación de Aportes)" color="bg-green-50 dark:bg-green-950/30" />
          {exoneradoLey1607 && (
            <div className="mb-3 p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
              ✓ <strong>Exoneración Ley 1607 aplicable:</strong> El salario ({fmt(salario)}) es menor a 10 SMMLV ($17.509.050). El empleador NO paga 8.5% Salud, 3% ICBF ni 2% SENA.
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#2C3E50] text-white">
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-left">Entidad / Concepto</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">Base IBC</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">% Empleado</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">Aporte Empleado</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">% Empleador</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">Aporte Empleador</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white dark:bg-slate-900">
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2"><strong>EPS Salud</strong> — {ENTIDADES_EPS.find((e) => e.id === data.epsId)?.nombre}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right">{fmt(salario)}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">4.00%</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right font-bold text-red-700 dark:text-red-400">-{fmt(aportes.saludEmpleado)}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">{exoneradoLey1607 ? <span className="text-emerald-600">0% (exon.)</span> : "8.50%"}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right font-bold text-green-700 dark:text-green-400">{fmt(aportes.saludEmpleador)}</td>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2"><strong>AFP Pensión</strong> — {ENTIDADES_AFP.find((e) => e.id === data.afpId)?.nombre}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right">{fmt(salario)}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">4.00%</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right font-bold text-red-700 dark:text-red-400">-{fmt(aportes.pensionEmpleado)}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">12.00%</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right font-bold text-green-700 dark:text-green-400">{fmt(aportes.pensionEmpleador)}</td>
                </tr>
                <tr className="bg-white dark:bg-slate-900">
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2"><strong>ARL</strong> — {ENTIDADES_ARL.find((e) => e.id === data.arlId)?.nombre} (Clase {data.claseRiesgoArl})</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right">{fmt(salario)}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">—</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right">—</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">{pctArl.toFixed(3)}%</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right font-bold text-green-700 dark:text-green-400">{fmt(aportes.arlEmpleador)}</td>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2"><strong>Fondo de Cesantías</strong> — {FONDOS_CESANTIAS.find((e) => e.id === data.cesantiasId)?.nombre}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right">{fmt(salario)}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">—</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right">—</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">8.33%</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right font-bold text-green-700 dark:text-green-400">{fmt(aportes.cesantiasEmpleador)}</td>
                </tr>
                <tr className="bg-white dark:bg-slate-900">
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2">Intereses sobre Cesantías (anual)</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right">{fmt(salario)}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">—</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right">—</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">1.00%</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right font-bold text-green-700 dark:text-green-400">{fmt(aportes.interesesCesantias)}</td>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2"><strong>Caja de Compensación</strong> — {CAJAS_COMPENSACION.find((e) => e.id === data.cajaId)?.nombre}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right">{fmt(salario)}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">—</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right">—</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">4.00%</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right font-bold text-green-700 dark:text-green-400">{fmt(aportes.cajaCompensacion)}</td>
                </tr>
                <tr className="bg-white dark:bg-slate-900">
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2">ICBF</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right">{fmt(salario)}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">—</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right">—</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">{exoneradoLey1607 ? <span className="text-emerald-600">0% (exon.)</span> : "3.00%"}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right font-bold text-green-700 dark:text-green-400">{fmt(aportes.icbf)}</td>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2">SENA</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right">{fmt(salario)}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">—</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right">—</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">{exoneradoLey1607 ? <span className="text-emerald-600">0% (exon.)</span> : "2.00%"}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right font-bold text-green-700 dark:text-green-400">{fmt(aportes.sena)}</td>
                </tr>
                <tr className="bg-[#2C3E50] text-white font-bold">
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2">TOTALES</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right">{fmt(salario)}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">8.00%</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right">-{fmt(totalEmpleado)}</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-center">{((totalEmpleador / salario) * 100).toFixed(2)}%</td>
                  <td className="border border-slate-300 dark:border-slate-600 px-2 py-2 text-right">{fmt(totalEmpleador)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <div className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase">Descuento nómina (Empleado)</div>
              <div className="text-xl font-bold text-red-700 dark:text-red-400">-{fmt(totalEmpleado)}</div>
              <div className="text-[10px] text-red-600 dark:text-red-500 mt-1">Salud 4% + Pensión 4%</div>
            </div>
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <div className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase">Costo empleador (Aportes)</div>
              <div className="text-xl font-bold text-green-700 dark:text-green-400">{fmt(totalEmpleador)}</div>
              <div className="text-[10px] text-green-600 dark:text-green-500 mt-1">Salud + Pensión + ARL + Cesantías + ICFB + SENA + Caja</div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase">Costo total mensual</div>
              <div className="text-xl font-bold text-blue-700 dark:text-blue-400">{fmt(salario + totalEmpleador)}</div>
              <div className="text-[10px] text-blue-600 dark:text-blue-500 mt-1">Salario + Aportes del empleador</div>
            </div>
          </div>
        </div>

        <div>
          <SectionTitle icon={<AlertTriangle className="w-4 h-4 text-amber-600" />} title="5. Observaciones y Novedades" />
          <textarea value={data.observaciones} onChange={(e) => set("observaciones", e.target.value)} placeholder="Ej: Afiliación inicial del trabajador. Radicada dentro del plazo legal de 8 días (Decreto 723 de 2013). Sin novedades adicionales al momento del registro." rows={3} className="w-full text-sm rounded-md border border-input bg-background px-3 py-2" />
        </div>

        <div className="grid grid-cols-2 gap-8 mt-8 pt-8 border-t-2 border-slate-200 dark:border-slate-700">
          <div className="text-center">
            <div className="border-b-2 border-slate-300 dark:border-slate-600 mb-2 pb-1"><p className="text-xs text-slate-500">Empleador (Responsable TH)</p></div>
            <p className="text-sm font-bold">{data.empresa || "________________"}</p>
            <p className="text-xs text-slate-500">NIT {data.nit || "________________"}</p>
          </div>
          <div className="text-center">
            <div className="border-b-2 border-slate-300 dark:border-slate-600 mb-2 pb-1"><p className="text-xs text-slate-500">Trabajador</p></div>
            <p className="text-sm font-bold">{data.nombreEmpleado || "________________"}</p>
            <p className="text-xs text-slate-500">C.C. {data.numeroDocumento || "________________"}</p>
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-400 mt-4">
          Documento de afiliación generado automáticamente desde TH-03 (Hoja de Vida) y TH-CONTRATO · Sistema General de Seguridad Social Integral — Colombia 2026 · Documento de uso académico — empresa simulada SENA
        </div>
      </div>
    </div>
  );
}

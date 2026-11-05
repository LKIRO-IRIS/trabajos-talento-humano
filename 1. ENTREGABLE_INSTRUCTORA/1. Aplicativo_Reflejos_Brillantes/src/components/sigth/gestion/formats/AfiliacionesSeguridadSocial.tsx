"use client";

import * as React from "react";
import { Shield, Save, Printer, RefreshCw, Heart, AlertTriangle, Banknote, PiggyBank, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Afiliaciones de Seguridad Social — Auto-generado desde Contrato   */
/* ------------------------------------------------------------------ */

interface AfiliacionData {
  nombreEmpleado: string;
  numeroDocumento: string;
  cargo: string;
  empresa: string;
  nit: string;
  fechaAfiliacion: string;
  // Afiliaciones
  eps: string;
  arl: string;
  afp: string;
  cesantias: string;
  cajaCompensacion: string;
  // Aportes (porcentajes legales 2026)
  epsEmpleado: string;
  epsEmpleador: string;
  afpEmpleado: string;
  afpEmpleador: string;
  arlEmpleador: string;
  cesantiasEmpleador: string;
  interesesCesantias: string;
  cajaCompensacion: string;
  icbf: string;
  sena: string;
  salarioBase: string;
}

const AFILIACION_VACIA: AfiliacionData = {
  nombreEmpleado: "",
  numeroDocumento: "",
  cargo: "",
  empresa: "",
  nit: "",
  fechaAfiliacion: new Date().toISOString().slice(0, 10),
  eps: "",
  arl: "",
  afp: "",
  cesantias: "",
  cajaCompensacion: "",
  epsEmpleado: "4%",
  epsEmpleador: "8.5%",
  afpEmpleado: "4%",
  afpEmpleador: "12%",
  arlEmpleador: "0.522%",
  cesantiasEmpleador: "8.33%",
  interesesCesantias: "1%",
  cajaCompensacion: "4%",
  icbf: "3%",
  sena: "2%",
  salarioBase: "",
};

function cargarDesdeContrato(): AfiliacionData {
  const data = { ...AFILIACION_VACIA };
  try {
    const contrato = JSON.parse(window.localStorage.getItem("sigth-gestion-format-TH-CONTRATO") || "{}");
    if (contrato.nombreEmpleado) data.nombreEmpleado = contrato.nombreEmpleado;
    if (contrato.numeroDocumento) data.numeroDocumento = contrato.numeroDocumento;
    if (contrato.cargo) data.cargo = contrato.cargo;
    if (contrato.empresa) data.empresa = contrato.empresa;
    if (contrato.nit) data.nit = contrato.nit;
    if (contrato.eps) data.eps = contrato.eps;
    if (contrato.arl) data.arl = contrato.arl;
    if (contrato.afp) data.afp = contrato.afp;
    if (contrato.cesantias) data.cesantias = contrato.cesantias;
    if (contrato.cajaCompensacion) data.cajaCompensacion = contrato.cajaCompensacion;
    if (contrato.salario) data.salarioBase = contrato.salario;

    // También leer empresa configurada
    const empresaCfg = JSON.parse(window.localStorage.getItem("sigth-empresa-config") || "{}");
    if (empresaCfg.name && !data.empresa) data.empresa = empresaCfg.name;
  } catch {}
  return data;
}

export function AfiliacionesSeguridadSocial() {
  const [data, setData] = React.useState<AfiliacionData>(AFILIACION_VACIA);

  React.useEffect(() => {
    const loaded = cargarDesdeContrato();
    setData(loaded);
    if (loaded.nombreEmpleado) {
      toast.success(`Afiliaciones cargadas para: ${loaded.nombreEmpleado}`);
    }
  }, []);

  const set = <K extends keyof AfiliacionData>(key: K, value: AfiliacionData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const recargar = () => {
    const loaded = cargarDesdeContrato();
    setData(loaded);
    toast.success("Datos recargados desde el contrato");
  };

  const guardar = () => {
    window.localStorage.setItem("sigth-gestion-format-TH-AFILIACIONES", JSON.stringify(data));
    toast.success("Afiliaciones guardadas correctamente");
  };

  const Field = ({ label, value, onChange, wide = false }: { label: string; value: string; onChange: (v: string) => void; wide?: boolean }) => (
    <div className={wide ? "col-span-2 sm:col-span-3" : ""}>
      <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
    </div>
  );

  const AfiliacionCard = ({ icon, title, entidad, pctEmpleado, pctEmpleador, color }: { icon: React.ReactNode; title: string; entidad: string; pctEmpleado: string; pctEmpleador: string; color: string }) => (
    <div className="rounded-lg border-2 p-3" style={{ borderColor: `${color}30` }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: color }}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color }}>{title}</p>
          <p className="text-xs text-slate-500">{entidad || "Sin asignar"}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded bg-slate-50 dark:bg-slate-800 p-2">
          <p className="font-bold text-slate-600 dark:text-slate-300">Empleado</p>
          <p className="text-slate-500">{pctEmpleado}</p>
        </div>
        <div className="rounded bg-slate-50 dark:bg-slate-800 p-2">
          <p className="font-bold text-slate-600 dark:text-slate-300">Empleador</p>
          <p className="text-slate-500">{pctEmpleador}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-8">
      {/* Barra de acciones */}
      <div className="flex items-center gap-2 flex-wrap rb-no-print">
        <Button size="sm" variant="outline" onClick={recargar}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Recargar desde Contrato
        </Button>
        <Button size="sm" variant="outline" onClick={guardar}>
          <Save className="w-3.5 h-3.5 mr-1" /> Guardar
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir / PDF
        </Button>
        {data.nombreEmpleado && (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            ✓ Afiliaciones para: {data.nombreEmpleado}
          </Badge>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border-2 border-slate-200 dark:border-slate-700 p-6 space-y-6">
        {/* Título */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">AFILIACIONES DE SEGURIDAD SOCIAL</h2>
          <p className="text-xs text-slate-500 mt-1">Código: TH-AFILIACION-001 · Versión: 01 · Fecha: {data.fechaAfiliacion}</p>
        </div>

        {/* Datos del empleado */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Empleado" value={data.nombreEmpleado} onChange={(v) => set("nombreEmpleado", v)} wide />
          <Field label="C.C." value={data.numeroDocumento} onChange={(v) => set("numeroDocumento", v)} />
          <Field label="Cargo" value={data.cargo} onChange={(v) => set("cargo", v)} />
          <Field label="Empresa" value={data.empresa} onChange={(v) => set("empresa", v)} />
          <Field label="NIT" value={data.nit} onChange={(v) => set("nit", v)} />
          <Field label="Salario Base" value={data.salarioBase} onChange={(v) => set("salarioBase", v)} />
        </div>

        {/* Tarjetas de afiliación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AfiliacionCard
            icon={<Heart className="w-4 h-4" />}
            title="EPS (Salud)"
            entidad={data.eps}
            pctEmpleado={data.epsEmpleado}
            pctEmpleador={data.epsEmpleador}
            color="#E91E63"
          />
          <AfiliacionCard
            icon={<Banknote className="w-4 h-4" />}
            title="AFP (Pensiones)"
            entidad={data.afp}
            pctEmpleado={data.afpEmpleado}
            pctEmpleador={data.afpEmpleador}
            color="#2196F3"
          />
          <AfiliacionCard
            icon={<AlertTriangle className="w-4 h-4" />}
            title="ARL (Riesgos)"
            entidad={data.arl}
            pctEmpleado="0%"
            pctEmpleador={data.arlEmpleador}
            color="#FF9800"
          />
          <AfiliacionCard
            icon={<PiggyBank className="w-4 h-4" />}
            title="Cesantías"
            entidad={data.cesantias}
            pctEmpleado="0%"
            pctEmpleador={data.cesantiasEmpleador}
            color="#4CAF50"
          />
          <AfiliacionCard
            icon={<Home className="w-4 h-4" />}
            title="Caja Compensación"
            entidad={data.cajaCompensacion}
            pctEmpleado="0%"
            pctEmpleador={data.cajaCompensacion}
            color="#9C27B0"
          />
          <AfiliacionCard
            icon={<Shield className="w-4 h-4" />}
            title="ICBF"
            entidad="Instituto Colombiano de Bienestar Familiar"
            pctEmpleado="0%"
            pctEmpleador={data.icbf}
            color="#795548"
          />
        </div>

        {/* Tabla de aportes */}
        <div>
          <h3 className="text-sm font-bold mb-2 text-slate-700 dark:text-slate-200">Resumen de Aportes Parafiscales</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-200 dark:border-slate-700">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="p-2 text-left">Concepto</th>
                  <th className="p-2 text-center">Empleado</th>
                  <th className="p-2 text-center">Empleador</th>
                  <th className="p-2 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <td className="p-2">EPS (Salud)</td>
                  <td className="p-2 text-center text-pink-600">{data.epsEmpleado}</td>
                  <td className="p-2 text-center text-pink-600">{data.epsEmpleador}</td>
                  <td className="p-2 text-center font-bold">12.5%</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <td className="p-2">AFP (Pensiones)</td>
                  <td className="p-2 text-center text-blue-600">{data.afpEmpleado}</td>
                  <td className="p-2 text-center text-blue-600">{data.afpEmpleador}</td>
                  <td className="p-2 text-center font-bold">16%</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <td className="p-2">ARL</td>
                  <td className="p-2 text-center">0%</td>
                  <td className="p-2 text-center text-orange-600">{data.arlEmpleador}</td>
                  <td className="p-2 text-center font-bold">{data.arlEmpleador}</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <td className="p-2">Cesantías</td>
                  <td className="p-2 text-center">0%</td>
                  <td className="p-2 text-center text-green-600">{data.cesantiasEmpleador}</td>
                  <td className="p-2 text-center font-bold">{data.cesantiasEmpleador}</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <td className="p-2">Intereses Cesantías</td>
                  <td className="p-2 text-center">0%</td>
                  <td className="p-2 text-center text-green-600">{data.interesesCesantias}</td>
                  <td className="p-2 text-center font-bold">{data.interesesCesantias}</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <td className="p-2">Caja Compensación</td>
                  <td className="p-2 text-center">0%</td>
                  <td className="p-2 text-center text-purple-600">{data.cajaCompensacion}</td>
                  <td className="p-2 text-center font-bold">{data.cajaCompensacion}</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <td className="p-2">ICBF</td>
                  <td className="p-2 text-center">0%</td>
                  <td className="p-2 text-center text-brown-600">{data.icbf}</td>
                  <td className="p-2 text-center font-bold">{data.icbf}</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <td className="p-2">SENA</td>
                  <td className="p-2 text-center">0%</td>
                  <td className="p-2 text-center">{data.sena}</td>
                  <td className="p-2 text-center font-bold">{data.sena}</td>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-800 font-bold">
                  <td className="p-2">TOTAL</td>
                  <td className="p-2 text-center">8%</td>
                  <td className="p-2 text-center">~51%</td>
                  <td className="p-2 text-center">~59%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Firmas */}
        <div className="grid grid-cols-2 gap-8 mt-8 pt-8 border-t-2 border-slate-200 dark:border-slate-700">
          <div className="text-center">
            <div className="border-b-2 border-slate-300 mb-2 pb-1">
              <p className="text-xs text-slate-500">Firma del Empleado</p>
            </div>
            <p className="text-sm font-bold">{data.nombreEmpleado || "________________"}</p>
            <p className="text-xs text-slate-500">C.C. {data.numeroDocumento || "________________"}</p>
          </div>
          <div className="text-center">
            <div className="border-b-2 border-slate-300 mb-2 pb-1">
              <p className="text-xs text-slate-500">Representante de la Empresa</p>
            </div>
            <p className="text-sm font-bold">{data.empresa || "________________"}</p>
            <p className="text-xs text-slate-500">NIT {data.nit || "________________"}</p>
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-400 mt-4">
          Formato auto-generado desde TH-CONTRATO · Ley 100 de 1993 (Sistema de Seguridad Social Integral) ·
          Documento de uso académico — empresa simulada SENA
        </div>
      </div>
    </div>
  );
}

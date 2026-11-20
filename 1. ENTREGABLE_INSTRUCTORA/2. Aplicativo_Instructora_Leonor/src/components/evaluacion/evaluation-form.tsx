"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, UserPlus, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SliderCriterio } from "./slider-criterio";
import { ResultadoPreview } from "./resultado-preview";
import { useAuthContext } from "@/components/auth/auth-context";
import { useEvaluaciones } from "@/hooks/use-evaluaciones";
import { useConfig } from "@/hooks/use-config";
import {
  calcularPuntuacionFinal,
  getCalificacion,
} from "@/lib/evaluacion";
import { getPeriodoActual } from "@/lib/utils";
import type { Empleado } from "@/lib/types";

interface Props {
  empleadoIdInicial?: string;
  onGuardado?: () => void;
}

export function EvaluationForm({ empleadoIdInicial, onGuardado }: Props) {
  const { user, requireAuth } = useAuthContext();
  const { config } = useConfig();
  const router = useRouter();
  const { empleados, addEmpleado, crearEvaluacion, reload } = useEvaluaciones(
    user,
    config?.criterios ?? []
  );

  const [empleadoId, setEmpleadoId] = useState(empleadoIdInicial ?? "");
  const [puntajes, setPuntajes] = useState<Record<string, number>>({});
  const [comentarios, setComentarios] = useState("");
  const [periodo, setPeriodo] = useState(getPeriodoActual());
  const [nuevoEmpDialog, setNuevoEmpDialog] = useState(false);
  const [nuevoEmp, setNuevoEmp] = useState({
    nombre: "",
    departamento: "",
    cargo: "",
  });

  const criterios = config?.criterios ?? [];

  // Inicializa puntajes en 70 por defecto para cada criterio
  useEffect(() => {
    if (criterios.length === 0) return;
    setPuntajes((prev) => {
      const next = { ...prev };
      for (const c of criterios) {
        if (next[c.id] === undefined) next[c.id] = 70;
      }
      return next;
    });
  }, [criterios]);

  const empleadosOrdenados = useMemo(
    () => [...empleados].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [empleados]
  );

  const empleadoSeleccionado = empleados.find((e) => e.id === empleadoId) ?? null;

  const puntajesArray = useMemo(
    () =>
      criterios.map((c) => ({
        criterioId: c.id,
        puntaje: puntajes[c.id] ?? 0,
      })),
    [criterios, puntajes]
  );

  const puntuacionFinal = useMemo(
    () => calcularPuntuacionFinal(puntajesArray, criterios),
    [puntajesArray, criterios]
  );
  const calificacion = getCalificacion(puntuacionFinal);

  const validar = () => {
    if (!empleadoId) {
      toast.error("Selecciona un empleado para evaluar.");
      return false;
    }
    if (criterios.length === 0) {
      toast.error("No hay criterios configurados.");
      return false;
    }
    return true;
  };

  const handleGuardar = () => {
    if (!validar()) return;
    // Si no hay sesión, abre el modal de login. Tras un login exitoso,
    // la acción se completa automáticamente (crearEvaluacion lee el usuario
    // actual desde la sesión en el momento de ejecutarse).
    requireAuth(() => {
      const nueva = crearEvaluacion({
        empleadoId,
        criterios: puntajesArray,
        periodo,
        comentarios,
      });
      if (nueva) {
        toast.success("Evaluación guardada correctamente.", {
          description: `${empleadoSeleccionado?.nombre} — ${calificacion} (${nueva.puntuacionFinal.toFixed(1)})`,
        });
        if (nueva.planMejora) {
          toast.info("Se generó un plan de mejora automático.", {
            description: `Criterio más bajo: ${nueva.planMejora.criterioMasBajo}`,
          });
        }
        onGuardado?.();
        router.push(`/empleado/${empleadoId}`);
      } else {
        toast.error("No se pudo guardar la evaluación.");
      }
    });
  };

  const handleAddEmpleado = () => {
    if (!nuevoEmp.nombre.trim() || !nuevoEmp.departamento.trim() || !nuevoEmp.cargo.trim()) {
      toast.error("Completa todos los datos del empleado.");
      return;
    }
    const emp = addEmpleado(nuevoEmp);
    setEmpleadoId(emp.id);
    setNuevoEmpDialog(false);
    setNuevoEmp({ nombre: "", departamento: "", cargo: "" });
    toast.success(`Empleado "${emp.nombre}" creado.`);
    reload();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Columna principal */}
      <div className="space-y-6">
        {/* Datos del empleado */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-brand" />
            <h3 className="text-base font-semibold">Datos del empleado</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="empleado">Empleado</Label>
              <Select value={empleadoId} onValueChange={setEmpleadoId}>
                <SelectTrigger id="empleado">
                  <SelectValue placeholder="Selecciona un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {empleadosOrdenados.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre} — {e.departamento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="periodo">Periodo</Label>
              <Input
                id="periodo"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                placeholder="2026-Q4"
              />
            </div>
            {empleadoSeleccionado ? (
              <div className="space-y-1.5 sm:col-span-2">
                <div className="grid gap-3 rounded-lg bg-muted/50 p-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Departamento</p>
                    <p className="font-medium">{empleadoSeleccionado.departamento}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cargo</p>
                    <p className="font-medium">{empleadoSeleccionado.cargo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ID</p>
                    <p className="font-mono text-xs">{empleadoSeleccionado.id}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="mt-3">
            <Dialog open={nuevoEmpDialog} onOpenChange={setNuevoEmpDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Registrar nuevo empleado
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo empleado</DialogTitle>
                  <DialogDescription>
                    Registra un empleado para poder evaluarlo.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ne-nombre">Nombre completo</Label>
                    <Input
                      id="ne-nombre"
                      value={nuevoEmp.nombre}
                      onChange={(e) =>
                        setNuevoEmp((s) => ({ ...s, nombre: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ne-dep">Departamento</Label>
                      <Input
                        id="ne-dep"
                        value={nuevoEmp.departamento}
                        onChange={(e) =>
                          setNuevoEmp((s) => ({ ...s, departamento: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ne-cargo">Cargo</Label>
                      <Input
                        id="ne-cargo"
                        value={nuevoEmp.cargo}
                        onChange={(e) =>
                          setNuevoEmp((s) => ({ ...s, cargo: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNuevoEmpDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddEmpleado}>Crear empleado</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Sliders por criterio */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold">Calificación por criterio</h3>
            <p className="text-sm text-muted-foreground">
              Desliza cada control para asignar la puntuación (1-100).
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {criterios.map((c) => (
              <SliderCriterio
                key={c.id}
                criterio={c}
                value={puntajes[c.id] ?? 0}
                onChange={(v) => setPuntajes((s) => ({ ...s, [c.id]: v }))}
              />
            ))}
          </div>
        </div>

        {/* Comentarios */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-3 text-base font-semibold">Comentarios del evaluador</h3>
          <Textarea
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            placeholder="Escribe observaciones, fortalezas, oportunidades de mejora…"
            rows={5}
            className="resize-y"
          />
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} className="gap-2">
            <Save className="h-4 w-4" />
            Guardar evaluación
          </Button>
        </div>
      </div>

      {/* Columna lateral: vista previa del resultado */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <ResultadoPreview
          puntuacionFinal={puntuacionFinal}
          calificacion={calificacion}
          criterios={puntajesArray}
          configCriterios={criterios}
        />
        <div className="mt-3 rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Escala de calificación</p>
          <ul className="mt-1 space-y-0.5">
            <li><span className="font-semibold text-emerald-600">90-100</span> Sobresaliente</li>
            <li><span className="font-semibold text-blue-600">75-89</span> Satisfactorio</li>
            <li><span className="font-semibold text-amber-600">60-74</span> Necesita Mejora</li>
            <li><span className="font-semibold text-red-600">&lt; 60</span> Insatisfactorio</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

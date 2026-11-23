"use client";

import { useCallback, useEffect, useState } from "react";
import type { Empleado, Evaluacion, PlanMejora, User } from "@/lib/types";
import {
  getEmpleados,
  getEvaluaciones,
  saveEmpleados,
  saveEvaluaciones,
  updatePlanMejora as updatePlanMejoraStorage,
} from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth";
import { construirEvaluacion } from "@/lib/evaluacion";
import type { Criterio } from "@/lib/types";
import type { PuntajeCriterio } from "@/lib/types";
import { genId } from "@/lib/utils";

export function useEvaluaciones(
  currentUser: User | null,
  configCriterios: Criterio[]
) {
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setEvaluaciones(getEvaluaciones());
    setEmpleados(getEmpleados());
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    const handler = () => reload();
    window.addEventListener("app-leonor:changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("app-leonor:changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, [reload]);

  /**
   * Si es admin ve todas; si es evaluador solo las suyas.
   * Si no hay sesión (usuario anónimo en modo consulta), ve todas las
   * evaluaciones (solo lectura). Esto permite navegar el dashboard,
   * empleados y ficha individual sin login.
   */
  const visibles = useCallback(() => {
    if (!currentUser) return evaluaciones;
    if (currentUser.role === "admin") return evaluaciones;
    return evaluaciones.filter((e) => e.evaluadorId === currentUser.id);
  }, [evaluaciones, currentUser]);

  const addEmpleado = useCallback(
    (emp: Omit<Empleado, "id">) => {
      const nuevo: Empleado = { ...emp, id: genId("emp") };
      const all = getEmpleados();
      all.push(nuevo);
      saveEmpleados(all);
      setEmpleados(all);
      window.dispatchEvent(new Event("app-leonor:changed"));
      return nuevo;
    },
    []
  );

  const updateEmpleado = useCallback((emp: Empleado) => {
    const all = getEmpleados();
    const idx = all.findIndex((e) => e.id === emp.id);
    if (idx >= 0) {
      all[idx] = emp;
      saveEmpleados(all);
      setEmpleados(all);
      window.dispatchEvent(new Event("app-leonor:changed"));
    }
  }, []);

  const deleteEmpleado = useCallback((id: string) => {
    const all = getEmpleados().filter((e) => e.id !== id);
    const evals = getEvaluaciones().filter((e) => e.empleadoId !== id);
    saveEmpleados(all);
    saveEvaluaciones(evals);
    setEmpleados(all);
    setEvaluaciones(evals);
    window.dispatchEvent(new Event("app-leonor:changed"));
  }, []);

  const crearEvaluacion = useCallback(
    (params: {
      empleadoId: string;
      criterios: PuntajeCriterio[];
      periodo: string;
      comentarios: string;
    }) => {
      // Lee el usuario ACTUAL desde la sesión en cada llamada, en lugar de
      // depender del `currentUser` capturado en el closure. Esto permite que
      // la acción se ejecute correctamente tras un login diferido (modal).
      const user = getCurrentUser();
      if (!user) return null;
      const nueva = construirEvaluacion({
        empleadoId: params.empleadoId,
        evaluadorId: user.id,
        evaluadorNombre: user.nombre,
        periodo: params.periodo,
        criterios: params.criterios,
        configCriterios,
        comentarios: params.comentarios,
      });
      const all = getEvaluaciones();
      all.push(nueva);
      saveEvaluaciones(all);
      setEvaluaciones(all);
      window.dispatchEvent(new Event("app-leonor:changed"));
      return nueva;
    },
    [configCriterios]
  );

  const updateEvaluacion = useCallback(
    (evaluacion: Evaluacion) => {
      const all = getEvaluaciones();
      const idx = all.findIndex((e) => e.id === evaluacion.id);
      if (idx >= 0) {
        all[idx] = evaluacion;
        saveEvaluaciones(all);
        setEvaluaciones(all);
        window.dispatchEvent(new Event("app-leonor:changed"));
      }
    },
    []
  );

  const deleteEvaluacion = useCallback((id: string) => {
    const all = getEvaluaciones().filter((e) => e.id !== id);
    saveEvaluaciones(all);
    setEvaluaciones(all);
    window.dispatchEvent(new Event("app-leonor:changed"));
  }, []);

  const setPlanEstado = useCallback(
    (evalId: string, estado: Evaluacion["planMejora"] extends infer T
      ? T extends { estado: infer E }
        ? E
        : never
      : never) => {
      const all = getEvaluaciones();
      const idx = all.findIndex((e) => e.id === evalId);
      if (idx >= 0 && all[idx].planMejora) {
        all[idx].planMejora!.estado = estado;
        saveEvaluaciones(all);
        setEvaluaciones(all);
        window.dispatchEvent(new Event("app-leonor:changed"));
      }
    },
    []
  );

  /**
   * Sustituye por completo el plan de mejora de una evaluación.
   * Lo usa el estudiante para editar acciones, fechas, responsable, etc.
   */
  const updatePlan = useCallback((evalId: string, plan: PlanMejora) => {
    updatePlanMejoraStorage(evalId, plan);
    setEvaluaciones(getEvaluaciones());
  }, []);

  return {
    evaluaciones,
    empleados,
    loading,
    visibles: visibles(),
    addEmpleado,
    updateEmpleado,
    deleteEmpleado,
    crearEvaluacion,
    updateEvaluacion,
    deleteEvaluacion,
    setPlanEstado,
    updatePlan,
    reload,
  };
}

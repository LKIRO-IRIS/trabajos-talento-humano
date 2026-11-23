"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { EmployeeDetail } from "@/components/empleado/employee-detail";
import { useAuthContext } from "@/components/auth/auth-context";
import { useEvaluaciones } from "@/hooks/use-evaluaciones";
import { useConfig } from "@/hooks/use-config";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { getEvaluaciones, saveEvaluaciones } from "@/lib/storage";
import type { Empleado, Evaluacion, PlanMejora } from "@/lib/types";

export default function EmpleadoDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { user, requireAuth } = useAuthContext();
  const { config } = useConfig();
  const criterios = config?.criterios ?? [];
  const { visibles, empleados, reload, updatePlan } = useEvaluaciones(
    user,
    criterios
  );

  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);

  useEffect(() => {
    if (!id) return;
    const emp = empleados.find((e) => e.id === id) ?? null;
    setEmpleado(emp);
    const evals = visibles.filter((e) => e.empleadoId === id);
    setEvaluaciones(
      [...evals].sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      )
    );
  }, [id, empleados, visibles]);

  // Estado del plan en vivo (para reflejar ediciones inmediatamente)
  const evaluacionesVivas = useMemo(() => evaluaciones, [evaluaciones]);

  const handlePlanEstado = (
    evalId: string,
    estado: "Pendiente" | "En curso" | "Completado"
  ) => {
    // Cambiar el estado del plan es una mutación: requiere autenticación.
    requireAuth(() => {
      const all = getEvaluaciones();
      const idx = all.findIndex((e) => e.id === evalId);
      if (idx >= 0 && all[idx].planMejora) {
        all[idx].planMejora!.estado = estado;
        saveEvaluaciones(all);
        reload();
        setEvaluaciones((prev) =>
          prev.map((e) =>
            e.id === evalId && e.planMejora
              ? { ...e, planMejora: { ...e.planMejora, estado } }
              : e
          )
        );
      }
    });
  };

  const handlePlanSave = (evalId: string, plan: PlanMejora) => {
    // Guardar el plan editado es una mutación: requiere autenticación.
    requireAuth(() => {
      updatePlan(evalId, plan);
      setEvaluaciones((prev) =>
        prev.map((e) =>
          e.id === evalId ? { ...e, planMejora: plan } : e
        )
      );
      toast.success("Plan de mejora actualizado.", {
        description: `${plan.acciones.length} acción(es) · ${plan.estado}`,
      });
    });
  };

  if (!empleado) {
    return (
      <MainLayout>
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Empleado no encontrado o no tienes acceso a sus evaluaciones.
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <EmployeeDetail
        empleado={empleado}
        evaluaciones={evaluacionesVivas}
        configCriterios={criterios}
        onPlanEstadoChange={handlePlanEstado}
        onPlanSave={handlePlanSave}
      />
    </MainLayout>
  );
}

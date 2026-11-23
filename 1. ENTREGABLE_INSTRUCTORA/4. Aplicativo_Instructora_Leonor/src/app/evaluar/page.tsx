"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { EvaluationForm } from "@/components/evaluacion/evaluation-form";

export default function EvaluarPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva Evaluación</h1>
          <p className="text-sm text-muted-foreground">
            Diligencia los criterios y observa el resultado en tiempo real.
          </p>
        </div>
        <EvaluationForm />
      </div>
    </MainLayout>
  );
}

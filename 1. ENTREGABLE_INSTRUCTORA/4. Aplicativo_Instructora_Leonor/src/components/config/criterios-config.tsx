"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { genId } from "@/lib/utils";
import { validarPesos } from "@/lib/evaluacion";
import type { Criterio } from "@/lib/types";

interface Props {
  criterios: Criterio[];
  onChange: (criterios: Criterio[]) => void;
}

export function CriteriosConfig({ criterios, onChange }: Props) {
  const [nuevo, setNuevo] = useState({ nombre: "", descripcion: "", peso: "" });

  const validation = validarPesos(criterios);

  const updateCriterio = (id: string, patch: Partial<Criterio>) => {
    onChange(criterios.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const addCriterio = () => {
    const nombre = nuevo.nombre.trim();
    const peso = Number(nuevo.peso);
    if (!nombre) {
      toast.error("El nombre del criterio es obligatorio.");
      return;
    }
    if (!peso || peso <= 0) {
      toast.error("El peso debe ser mayor a 0.");
      return;
    }
    const c: Criterio = {
      id: genId("crit"),
      nombre,
      descripcion: nuevo.descripcion.trim(),
      peso,
    };
    onChange([...criterios, c]);
    setNuevo({ nombre: "", descripcion: "", peso: "" });
    toast.success(`Criterio "${nombre}" agregado.`);
  };

  const removeCriterio = (id: string) => {
    const c = criterios.find((x) => x.id === id);
    onChange(criterios.filter((x) => x.id !== id));
    if (c) toast.info(`Criterio "${c.nombre}" eliminado.`);
  };

  const normalizarPesos = () => {
    if (criterios.length === 0) return;
    const partes = Math.floor(100 / criterios.length);
    const resto = 100 - partes * criterios.length;
    const next = criterios.map((c, i) => ({
      ...c,
      peso: i === 0 ? partes + resto : partes,
    }));
    onChange(next);
    toast.success("Pesos distribuidos proporcionalmente (suman 100%).");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Criterios de evaluación</CardTitle>
            <p className="text-sm text-muted-foreground">
              Define los criterios y sus pesos. La suma debe ser 100%.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={normalizarPesos}>
            Distribuir 100%
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de criterios */}
        <div className="space-y-3">
          {criterios.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No hay criterios. Agrega al menos uno.
            </p>
          ) : (
            criterios.map((c, idx) => (
              <div
                key={c.id}
                className="rounded-lg border bg-card p-3"
              >
                <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nombre</Label>
                    <Input
                      value={c.nombre}
                      onChange={(e) =>
                        updateCriterio(c.id, { nombre: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Peso (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={c.peso}
                      onChange={(e) =>
                        updateCriterio(c.id, { peso: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCriterio(c.id)}
                      className="text-destructive hover:bg-destructive/10"
                      aria-label="Eliminar criterio"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 space-y-1.5">
                  <Label className="text-xs">Descripción</Label>
                  <Textarea
                    value={c.descripcion}
                    rows={2}
                    onChange={(e) =>
                      updateCriterio(c.id, { descripcion: e.target.value })
                    }
                    placeholder="Breve descripción del criterio…"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Criterio #{idx + 1}</span>
                  <span>Aporte: {c.peso}% del total</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Barra de suma de pesos */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              {validation.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
              Suma de pesos
            </span>
            <span
              className={
                validation.ok ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"
              }
            >
              {validation.total.toFixed(1)} / 100%
            </span>
          </div>
          <Progress
            value={validation.total}
            className={
              validation.ok ? "[&>div]:bg-emerald-500" : "[&>div]:bg-amber-500"
            }
          />
          {!validation.ok ? (
            <p className="text-xs text-amber-600">{validation.mensaje}</p>
          ) : (
            <p className="text-xs text-emerald-600">{validation.mensaje}</p>
          )}
        </div>

        {/* Agregar nuevo criterio */}
        <div className="rounded-lg border border-dashed p-4">
          <p className="mb-3 text-sm font-medium">Agregar nuevo criterio</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre</Label>
              <Input
                value={nuevo.nombre}
                onChange={(e) =>
                  setNuevo((s) => ({ ...s, nombre: e.target.value }))
                }
                placeholder="Ej: Liderazgo"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Peso (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={nuevo.peso}
                onChange={(e) =>
                  setNuevo((s) => ({ ...s, peso: e.target.value }))
                }
                placeholder="20"
              />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <Label className="text-xs">Descripción (opcional)</Label>
            <Textarea
              value={nuevo.descripcion}
              rows={2}
              onChange={(e) =>
                setNuevo((s) => ({ ...s, descripcion: e.target.value }))
              }
              placeholder="Describe el criterio…"
            />
          </div>
          <Button onClick={addCriterio} className="mt-3 gap-2" size="sm">
            <Plus className="h-4 w-4" />
            Agregar criterio
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

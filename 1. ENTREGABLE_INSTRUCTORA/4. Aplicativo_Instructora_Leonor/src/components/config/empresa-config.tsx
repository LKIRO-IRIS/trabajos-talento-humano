"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EmpresaConfig } from "@/lib/types";

interface Props {
  config: EmpresaConfig;
  onChange: (config: EmpresaConfig) => void;
}

const PRESET_COLORS = [
  { primary: "#0D9488", secondary: "#F59E0B", label: "Teal + Ámbar" },
  { primary: "#7C3AED", secondary: "#EC4899", label: "Púrpura + Rosa" },
  { primary: "#059669", secondary: "#0891B2", label: "Esmeralda + Cyan" },
  { primary: "#DC2626", secondary: "#CA8A04", label: "Rojo + Oro" },
  { primary: "#475569", secondary: "#64748B", label: "Pizarra" },
  { primary: "#9333EA", secondary: "#14B8A6", label: "Violeta + Teal" },
];

export function EmpresaConfigPanel({ config, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState(config.logo);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen.");
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error("La imagen no debe superar 1MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoPreview(dataUrl);
      onChange({ ...config, logo: dataUrl });
      toast.success("Logo actualizado.");
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUrl = (url: string) => {
    setLogoPreview(url);
    onChange({ ...config, logo: url });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Datos de empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de la empresa</CardTitle>
          <CardDescription>
            Nombre y logo que se muestran en la aplicación.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="empresa-nombre">Nombre de la empresa</Label>
            <Input
              id="empresa-nombre"
              value={config.nombre}
              onChange={(e) => onChange({ ...config, nombre: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Subir imagen
                </Button>
                {logoPreview ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLogoUrl("")}
                  >
                    Quitar logo
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="mt-2 space-y-1.5">
              <Label htmlFor="logo-url" className="text-xs">
                O pega una URL
              </Label>
              <Input
                id="logo-url"
                value={config.logo}
                placeholder="https://…"
                onChange={(e) => handleLogoUrl(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Colores de la empresa</CardTitle>
          <CardDescription>
            Personaliza el color primario y secundario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="color-primary">Color primario</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="color-primary"
                  value={config.primaryColor}
                  onChange={(e) =>
                    onChange({ ...config, primaryColor: e.target.value })
                  }
                  className="h-9 w-12 cursor-pointer rounded border"
                />
                <Input
                  value={config.primaryColor}
                  onChange={(e) =>
                    onChange({ ...config, primaryColor: e.target.value })
                  }
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="color-secondary">Color secundario</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="color-secondary"
                  value={config.secondaryColor}
                  onChange={(e) =>
                    onChange({ ...config, secondaryColor: e.target.value })
                  }
                  className="h-9 w-12 cursor-pointer rounded border"
                />
                <Input
                  value={config.secondaryColor}
                  onChange={(e) =>
                    onChange({ ...config, secondaryColor: e.target.value })
                  }
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="overflow-hidden rounded-lg border">
            <div
              className="px-4 py-3 text-white"
              style={{
                background: `linear-gradient(135deg, ${config.primaryColor}, ${config.secondaryColor})`,
              }}
            >
              <p className="text-sm font-semibold">Vista previa del tema</p>
              <p className="text-xs opacity-90">
                Asi se verán los botones y encabezados de marca.
              </p>
            </div>
            <div className="flex gap-2 p-3">
              <span
                className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
                style={{ backgroundColor: config.primaryColor }}
              >
                Primario
              </span>
              <span
                className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
                style={{ backgroundColor: config.secondaryColor }}
              >
                Secundario
              </span>
            </div>
          </div>

          {/* Presets */}
          <div>
            <Label className="mb-2 block text-xs">Paletas sugeridas</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PRESET_COLORS.map((p) => (
                <button
                  key={p.label}
                  onClick={() =>
                    onChange({
                      ...config,
                      primaryColor: p.primary,
                      secondaryColor: p.secondary,
                    })
                  }
                  className="flex items-center gap-2 rounded-lg border bg-card p-2 text-left transition-colors hover:bg-muted"
                >
                  <span className="flex">
                    <span
                      className="h-5 w-5 rounded-l-full"
                      style={{ backgroundColor: p.primary }}
                    />
                    <span
                      className="h-5 w-5 rounded-r-full"
                      style={{ backgroundColor: p.secondary }}
                    />
                  </span>
                  <span className="text-[11px] leading-tight">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { EmpresaConfig } from "@/lib/types";
import { getConfig, saveConfig } from "@/lib/storage";
import { hexToRgb, isLightHex } from "@/lib/utils";

function applyTheme(config: EmpresaConfig) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", config.primaryColor);
  root.style.setProperty("--brand-secondary", config.secondaryColor);
  root.style.setProperty(
    "--brand-primary-rgb",
    hexToRgb(config.primaryColor)
  );
  root.style.setProperty(
    "--brand-secondary-rgb",
    hexToRgb(config.secondaryColor)
  );
  const primaryFg = isLightHex(config.primaryColor) ? "#1B1B1B" : "#FFFFFF";
  const secondaryFg = isLightHex(config.secondaryColor) ? "#1B1B1B" : "#FFFFFF";
  root.style.setProperty("--brand-primary-foreground", primaryFg);
  root.style.setProperty("--brand-secondary-foreground", secondaryFg);
}

export function useConfig() {
  const [config, setConfig] = useState<EmpresaConfig | null>(null);

  useEffect(() => {
    const c = getConfig();
    setConfig(c);
    applyTheme(c);
  }, []);

  const update = useCallback((next: EmpresaConfig) => {
    saveConfig(next);
    setConfig(next);
    applyTheme(next);
    window.dispatchEvent(new Event("app-leonor:config-changed"));
  }, []);

  return { config, update };
}

"use client";

import * as React from "react";
import {
  EmpresaConfig,
  DEFAULT_EMPRESA,
  loadEmpresaConfig,
  saveEmpresaConfig,
  refreshCompanyThemes,
  buildCompanyTheme,
  type CompanyTheme,
} from "@/lib/analysis";

interface EmpresaContextValue {
  empresa: EmpresaConfig;
  /** Tema derivado de la empresa actual (se recalcula cuando cambia). */
  theme: CompanyTheme;
  /** Guarda una nueva configuración y la persiste. */
  setEmpresa: (cfg: EmpresaConfig) => void;
  /** Recarga la configuración desde localStorage (por si otro módulo la cambió). */
  refresh: () => void;
  /** Indica que ya se intentó cargar desde localStorage (para evitar flasheos). */
  loaded: boolean;
}

const EmpresaContext = React.createContext<EmpresaContextValue>({
  empresa: DEFAULT_EMPRESA,
  theme: buildCompanyTheme(DEFAULT_EMPRESA),
  setEmpresa: () => {},
  refresh: () => {},
  loaded: false,
});

export function EmpresaProvider({ children }: { children: React.ReactNode }) {
  const [empresa, setEmpresaState] = React.useState<EmpresaConfig>(DEFAULT_EMPRESA);
  const [loaded, setLoaded] = React.useState(false);

  const applyConfig = React.useCallback((cfg: EmpresaConfig) => {
    setEmpresaState(cfg);
    refreshCompanyThemes();
    // Aplica variables CSS en <html> para que los estilos hereden los colores.
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.style.setProperty("--rb-primary", cfg.primaryColor);
      root.style.setProperty("--rb-accent", cfg.accentColor);
      root.setAttribute("data-empresa", cfg.id);
    }
  }, []);

  // Carga inicial desde localStorage (sólo en cliente)
  React.useEffect(() => {
    const cfg = loadEmpresaConfig();
    if (cfg) {
      applyConfig(cfg);
    } else {
      applyConfig(DEFAULT_EMPRESA);
    }
    setLoaded(true);

    // Escucha cambios desde otras pestañas o desde otros módulos.
    const onChange = () => {
      const next = loadEmpresaConfig();
      if (next) applyConfig(next);
    };
    window.addEventListener("sigth-empresa-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("sigth-empresa-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [applyConfig]);

  const setEmpresa = React.useCallback(
    (cfg: EmpresaConfig) => {
      applyConfig(cfg);
      saveEmpresaConfig(cfg);
    },
    [applyConfig],
  );

  const refresh = React.useCallback(() => {
    const cfg = loadEmpresaConfig();
    if (cfg) applyConfig(cfg);
  }, [applyConfig]);

  const theme = React.useMemo(() => buildCompanyTheme(empresa), [empresa]);

  const value = React.useMemo<EmpresaContextValue>(
    () => ({ empresa, theme, setEmpresa, refresh, loaded }),
    [empresa, theme, setEmpresa, refresh, loaded],
  );

  return <EmpresaContext.Provider value={value}>{children}</EmpresaContext.Provider>;
}

export function useEmpresa() {
  return React.useContext(EmpresaContext);
}

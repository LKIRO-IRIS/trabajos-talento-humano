"use client";

import * as React from "react";
import {
  Download,
  Sun,
  Moon,
  Building2,
  LayoutDashboard,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GestionModule } from "@/components/sigth/GestionModule";
import { ArchivadorCandidatos } from "@/components/sigth/ArchivadorCandidatos";
import { BackupBar } from "@/components/sigth/BackupBar";
import { EmpresaConfigModal } from "@/components/sigth/EmpresaConfigModal";
import { EmpresaProvider, useEmpresa } from "@/components/sigth/EmpresaContext";
import {
  loadDarkModeFromStorage,
  saveDarkModeToStorage,
} from "@/lib/resume";

type ActiveTab = "formatos" | "gestion";

const TABS: { id: ActiveTab; label: string; icon: React.ReactNode; short: string }[] = [
  { id: "formatos", label: "Formatos Descargables", icon: <Download className="w-4 h-4" />, short: "Formatos" },
  { id: "gestion", label: "Gestión de Procesos", icon: <LayoutDashboard className="w-4 h-4" />, short: "Gestión" },
];

function SIGTHPage() {
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("gestion");
  const [darkMode, setDarkMode] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [empresaModalOpen, setEmpresaModalOpen] = React.useState(false);
  const [forceConfig, setForceConfig] = React.useState(false);
  const { empresa } = useEmpresa();

  // Colores dinámicos desde la empresa configurada
  const primaryColor = empresa.primaryColor || "#2C3E50";
  const accentColor = empresa.accentColor || "#92D050";

  /* ---- Initialise dark mode + check empresa ---- */
  React.useEffect(() => {
    const stored = loadDarkModeFromStorage();
    setDarkMode(stored);

    try {
      const cfg = window.localStorage.getItem("sigth-empresa-config");
      if (!cfg) {
        setForceConfig(true);
        setEmpresaModalOpen(true);
      }
    } catch {}
  }, []);

  /* ---- Listen for "open empresa modal" events ---- */
  React.useEffect(() => {
    const handler = () => setEmpresaModalOpen(true);
    window.addEventListener("sigth-open-empresa-modal", handler);
    return () => window.removeEventListener("sigth-open-empresa-modal", handler);
  }, []);

  /* ---- Apply dark mode class to <html> + persist ---- */
  React.useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
    saveDarkModeToStorage(darkMode);
  }, [darkMode]);

  /* ---- Apply CSS vars from empresa ---- */
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--rb-primary", primaryColor);
    root.style.setProperty("--rb-accent", accentColor);
    root.style.setProperty("--primary", accentColor);
    root.style.setProperty("--ring", accentColor);
    root.setAttribute("data-company", "reflejos_brillantes");
  }, [primaryColor, accentColor]);

  const toggleDarkMode = React.useCallback(() => {
    setDarkMode((v) => !v);
  }, []);

  const headerGradient = `from-[${primaryColor}] to-[${primaryColor}cc]`;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground rb-paper">
      {/* ===================== HEADER ===================== */}
      <header
        className={cn(
          "rb-no-print sticky top-0 z-40 text-white border-b-4 shadow-md bg-gradient-to-r",
          headerGradient,
        )}
        style={{ borderColor: accentColor, background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
      >
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          {/* Left: logo + nombre empresa dinámica */}
          <button
            className="flex items-center gap-3 min-w-0 group"
            onClick={() => setActiveTab("gestion")}
            title={empresa.name}
          >
            {empresa.logo ? (
              <img src={empresa.logo} alt={empresa.name} className="w-10 h-10 rounded-md object-contain bg-white p-1" />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0"
                style={{ background: primaryColor, color: accentColor, border: `2px solid ${accentColor}` }}
              >
                {empresa.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="leading-tight min-w-0 text-left">
              <div className="font-display text-base sm:text-lg font-extrabold tracking-tight">
                {empresa.name}
              </div>
              <div className="text-[10px] sm:text-xs text-white/85 truncate flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" style={{ color: accentColor }} />
                {empresa.tagline}
              </div>
            </div>
          </button>

          {/* Right: tabs + respaldo + configurar + dark/light */}
          <div className="flex items-center gap-2">
            <nav className="hidden md:flex items-center gap-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs lg:text-sm font-semibold transition-colors",
                    activeTab === t.id
                      ? "rb-tab-active"
                      : "rb-tab-inactive",
                  )}
                  title={t.label}
                >
                  {t.icon}
                  <span className="hidden lg:inline">{t.short}</span>
                  <span className="lg:hidden">{t.short.split(" ")[0]}</span>
                </button>
              ))}
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="md:hidden p-2 rounded-md hover:bg-white/10 transition-colors"
              aria-label="Abrir menú"
            >
              <ChevronDown className={cn("w-4 h-4 transition-transform", mobileMenuOpen && "rotate-180")} />
            </button>

            <BackupBar />
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-md hover:bg-white/10 transition-colors"
              title={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              aria-label="Cambiar modo claro/oscuro"
            >
              {darkMode ? (
                <Sun className="w-4 h-4" style={{ color: accentColor }} />
              ) : (
                <Moon className="w-4 h-4" style={{ color: accentColor }} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile tabs */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-black/20 animate-rb-fade-up">
            <div className="max-w-[1600px] mx-auto px-2 py-2 grid grid-cols-2 gap-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTab(t.id);
                    setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-semibold transition-colors",
                    activeTab === t.id ? "rb-tab-active" : "rb-tab-inactive",
                  )}
                >
                  {t.icon}
                  <span className="truncate">{t.short}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ===================== MAIN ===================== */}
      <main
        className={cn(
          "flex-1 w-full mx-auto px-3 sm:px-6 py-6 space-y-4",
          "max-w-[1600px]",
        )}
      >
        <div className="rb-no-print flex items-center gap-2 text-sm">
          {React.createElement(
            TABS.find((t) => t.id === activeTab)!.icon.type,
            { className: "w-4 h-4", style: { color: accentColor } },
          )}
          <h1
            className="font-display text-lg sm:text-xl font-bold"
            style={{ color: primaryColor }}
          >
            {TABS.find((t) => t.id === activeTab)!.label}
          </h1>
        </div>

        {activeTab === "formatos" && <ArchivadorCandidatos />}
        {activeTab === "gestion" && <GestionModule company="reflejos_brillantes" />}
      </main>

      {/* Modal de configuración de empresa */}
      <EmpresaConfigModal
        open={empresaModalOpen}
        onOpenChange={(v) => {
          if (!v && forceConfig && empresa.id === "default") return;
          setEmpresaModalOpen(v);
          if (!v) setForceConfig(false);
        }}
        forceConfigure={forceConfig && empresa.id === "default"}
        onSaved={() => setForceConfig(false)}
      />
    </div>
  );
}

export default function SIGTHPageWrapper() {
  return (
    <EmpresaProvider>
      <SIGTHPage />
    </EmpresaProvider>
  );
}

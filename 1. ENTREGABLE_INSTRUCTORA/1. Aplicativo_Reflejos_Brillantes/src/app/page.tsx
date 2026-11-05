"use client";

import * as React from "react";
import {
  Download,
  Sun,
  Moon,
  Building2,
  LayoutDashboard,
  UploadCloud,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RBLogo } from "@/components/sigth/RBLogo";
import { FormatsModule } from "@/components/sigth/FormatsModule";
import { GestionModule } from "@/components/sigth/GestionModule";
import {
  loadDarkModeFromStorage,
  saveDarkModeToStorage,
  COMPANY_THEMES,
  type CompanyId,
} from "@/lib/resume";

type ActiveTab = "formatos" | "gestion";

const TABS: { id: ActiveTab; label: string; icon: React.ReactNode; short: string }[] = [
  { id: "formatos", label: "Formatos Descargables", icon: <Download className="w-4 h-4" />, short: "Formatos" },
  { id: "gestion", label: "Gestión de Procesos", icon: <LayoutDashboard className="w-4 h-4" />, short: "Gestión" },
];

const COMPANY_IDS: CompanyId[] = ["royal_eventos", "reflejos_brillantes"];

const COMPANY_STORAGE_KEY = "sigth-company";

function loadCompanyFromStorage(): CompanyId {
  if (typeof window === "undefined") return "reflejos_brillantes";
  try {
    const v = window.localStorage.getItem(COMPANY_STORAGE_KEY);
    if (v === "royal_eventos" || v === "reflejos_brillantes") return v;
  } catch {}
  return "reflejos_brillantes";
}

function saveCompanyToStorage(c: CompanyId) {
  try {
    window.localStorage.setItem(COMPANY_STORAGE_KEY, c);
  } catch {}
}

export default function SIGTHPage() {
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("gestion");
  const [darkMode, setDarkMode] = React.useState(false);
  const [company, setCompany] = React.useState<CompanyId>("reflejos_brillantes");
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  /* ---- Initialise dark mode + company from LocalStorage ---- */
  React.useEffect(() => {
    const stored = loadDarkModeFromStorage();
    setDarkMode(stored);
    setCompany(loadCompanyFromStorage());
  }, []);

  /* ---- Apply dark mode class to <html> + persist ---- */
  React.useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
    saveDarkModeToStorage(darkMode);
  }, [darkMode]);

  /* ---- Apply data-company attribute to <html> ---- */
  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-company", company);
    saveCompanyToStorage(company);
  }, [company]);

  const toggleDarkMode = React.useCallback(() => {
    setDarkMode((v) => !v);
  }, []);

  const selectCompany = React.useCallback((c: CompanyId) => {
    setCompany(c);
  }, []);

  const theme = COMPANY_THEMES[company];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground rb-paper">
      {/* ===================== HEADER (sticky, theme-driven) ===================== */}
      <header
        className={cn(
          "rb-no-print sticky top-0 z-40 text-white border-b-4 shadow-md bg-gradient-to-r",
          theme.headerGradient,
        )}
        style={{ borderColor: theme.headerBorder }}
      >
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          {/* Left: logo + Reflejos Brillantes name */}
          <button
            className="flex items-center gap-3 min-w-0 group"
            onClick={() => setActiveTab("gestion")}
            title="Reflejos Brillantes SAS — Inicio"
          >
            <RBLogo size={42} company={company} />
            <div className="leading-tight min-w-0 text-left">
              <div className="font-display text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-1.5">
                Reflejos Brillantes
                <span
                  className="hidden sm:inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider"
                  style={{
                    background: `#${theme.accent}`,
                    color: `#${theme.dark}`,
                  }}
                >
                  SAS
                </span>
              </div>
              <div className="text-[10px] sm:text-xs text-white/85 truncate flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" style={{ color: `#${theme.accent}` }} />
                Gestión de Talento Humano
              </div>
            </div>
          </button>

          {/* Right: tabs (desktop) + dark/light toggle */}
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

            <CompanySelector value={company} onChange={selectCompany} />
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-md hover:bg-white/10 transition-colors"
              title={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              aria-label="Cambiar modo claro/oscuro"
            >
              {darkMode ? (
                <Sun className="w-4 h-4" style={{ color: theme.headerBorder }} />
              ) : (
                <Moon className="w-4 h-4" style={{ color: theme.headerBorder }} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile tabs (below header, collapsible) */}
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
                    activeTab === t.id
                      ? "rb-tab-active"
                      : "rb-tab-inactive",
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
        {/* Tab subtitle (the long label of the current tab) */}
        <div className="rb-no-print flex items-center gap-2 text-sm">
          {React.createElement(
            TABS.find((t) => t.id === activeTab)!.icon.type,
            { className: "w-4 h-4", style: { color: theme.headerBorder } },
          )}
          <h1
            className="font-display text-lg sm:text-xl font-bold"
            style={{ color: `#${theme.primary}` }}
          >
            {TABS.find((t) => t.id === activeTab)!.label}
          </h1>
        </div>

        {activeTab === "formatos" && (
          <FormatsModule company={company} onGoToGestion={() => setActiveTab("gestion")} />
        )}
        {activeTab === "gestion" && <GestionModule company={company} />}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Company selector (used in header)                                  */
/* ------------------------------------------------------------------ */

function CompanySelector({
  value,
  onChange,
}: {
  value: CompanyId;
  onChange: (c: CompanyId) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = COMPANY_THEMES[value];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors"
        title={`Empresa: ${current.name}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Building2 className="w-3.5 h-3.5" style={{ color: current.headerBorder ? `#${current.accent}` : undefined }} />
        <span className="hidden sm:inline truncate max-w-[120px]">{current.name}</span>
        <span className="sm:hidden">{current.logoText}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-72 rounded-lg shadow-xl overflow-hidden z-50 border border-border bg-card text-card-foreground"
          role="listbox"
        >
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/40">
            Selecciona la empresa
          </div>
          {COMPANY_IDS.map((id) => {
            const t = COMPANY_THEMES[id];
            const active = id === value;
            return (
              <button
                key={id}
                onClick={() => {
                  onChange(id);
                  setOpen(false);
                }}
                role="option"
                aria-selected={active}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  active
                    ? "bg-accent/15"
                    : "hover:bg-muted/50",
                )}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0 ring-2"
                  style={{
                    background: `linear-gradient(135deg, #${t.dark}, #${t.dark}dd)`,
                    color: `#${t.accent}`,
                    // @ts-expect-error CSS var for ring colour
                    "--tw-ring-color": `#${t.accent}99`,
                  }}
                >
                  {t.logoText}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: `#${t.primary}` }}
                    />
                    <span>{t.tagline}</span>
                  </div>
                </div>
                {active && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: `#${t.accent}`, color: `#${t.dark}` }}
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

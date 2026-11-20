"use client";

import { useEffect, type ReactNode } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { useConfig } from "@/hooks/use-config";

export function MainLayout({ children }: { children: ReactNode }) {
  const { config } = useConfig();

  // Aplica el nombre de la empresa al título del documento
  useEffect(() => {
    if (config?.nombre) {
      document.title = `${config.nombre} — Evaluación de Desempeño`;
    }
  }, [config?.nombre]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Sidebar />
      <main className="md:pl-60">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

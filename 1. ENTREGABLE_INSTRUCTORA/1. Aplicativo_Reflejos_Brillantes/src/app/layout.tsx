import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Sistema de Gestión de Talento Humano",
  description:
    "Sistema Integral de Gestión de Talento Humano. Crear hojas de vida ATS, subir hojas de vida con análisis IA automático y descargar formatos en Word, PDF y Excel con normas APA.",
  keywords: [
    "Talento Humano",
    "Hoja de Vida ATS",
    "Análisis de Hojas de Vida",
    "IA Visual",
    "Automatización",
    "SENA",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

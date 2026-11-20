"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useConfig } from "@/hooks/use-config";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/evaluar", label: "Nueva Evaluación", icon: ClipboardList, adminOnly: false },
  { href: "/empleados", label: "Empleados", icon: Users, adminOnly: false },
  { href: "/configuracion", label: "Configuración", icon: Settings, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { config } = useConfig();
  // Mostrar TODOS los items de navegación. La configuración es visible
  // para todos; el guardado se restringe a admin dentro de la propia página.
  const items = NAV_ITEMS;

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 md:top-16 md:border-r bg-sidebar">
      <div className="flex flex-1 flex-col gap-1 p-4 overflow-y-auto">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Navegación
        </p>
        {items.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-auto pt-4">
          <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">
              {config?.nombre ?? "Evaluación"}
            </p>
            <p>Sistema de Evaluación de Desempeño Laboral v1.0</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

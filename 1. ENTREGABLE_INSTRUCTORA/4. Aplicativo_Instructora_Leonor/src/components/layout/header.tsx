"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  LogIn,
  Menu,
  Moon,
  Sun,
  UserCircle2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetHeader,
} from "@/components/ui/sheet";
import { useState } from "react";
import { useAuthContext } from "@/components/auth/auth-context";
import { useConfig } from "@/hooks/use-config";
import { getIniciales } from "@/lib/utils";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/evaluar", label: "Nueva Evaluación", icon: ClipboardList, adminOnly: false },
  { href: "/empleados", label: "Empleados", icon: Users, adminOnly: false },
  { href: "/analisis", label: "Análisis", icon: BarChart3, adminOnly: false },
  { href: "/conclusiones", label: "Conclusiones", icon: FileText, adminOnly: false },
  { href: "/configuracion", label: "Configuración", icon: Settings, adminOnly: true },
];

function BrandLogo() {
  const { config } = useConfig();
  if (config?.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={config.logo}
        alt={config?.nombre ?? "Logo"}
        className="h-8 w-8 rounded-md object-cover"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-gradient text-white font-bold text-sm">
      {config?.nombre?.charAt(0) ?? "E"}
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Cambiar tema"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}

export function Header() {
  const { user, logout, setLoginModalOpen } = useAuthContext();
  const { config } = useConfig();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Mostrar TODOS los items de navegación, sin filtrar por rol.
  // La configuración es visible para todos; el guardado se restringe a admin.
  const items = NAV_ITEMS;

  const handleLogout = () => {
    logout();
    router.push("/dashboard");
  };

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {items.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-soft text-brand"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-3">
          {/* Botón menú móvil */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <BrandLogo />
                  <span>{config?.nombre ?? "Evaluación"}</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                <NavLinks onNavigate={() => setMobileOpen(false)} />
              </nav>
            </SheetContent>
          </Sheet>

          <Link href="/dashboard" className="flex items-center gap-2">
            <BrandLogo />
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-sm font-bold tracking-tight">
                {config?.nombre ?? "Evaluación de Desempeño"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {!user
                  ? "Modo consulta"
                  : user.role === "admin"
                  ? "Panel de Administrador"
                  : "Panel de Evaluador"}
              </span>
            </div>
          </Link>
        </div>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-brand text-brand-foreground text-xs font-semibold">
                      {getIniciales(user.nombre)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start leading-none">
                    <span className="text-sm font-medium">{user.nombre}</span>
                    <span className="text-[11px] text-muted-foreground capitalize">
                      {user.role}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <UserCircle2 className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user.nombre}</span>
                    <span className="text-xs text-muted-foreground">
                      @{user.username}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => setLoginModalOpen(true)}
              className="gap-2"
              size="sm"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Iniciar sesión</span>
              <span className="sm:hidden">Entrar</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

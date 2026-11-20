"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ClipboardCheck,
  LayoutDashboard,
  ShieldCheck,
  Target,
  Users,
  Moon,
  Sun,
  Loader2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuthContext } from "@/components/auth/auth-context";
import { useConfig } from "@/hooks/use-config";

export default function Page() {
  const router = useRouter();
  const { user, loading, login, register } = useAuthContext();
  const { config } = useConfig();
  const { theme, setTheme } = useTheme();

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    nombre: "",
    username: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) {
      toast.error("Completa usuario y contraseña.");
      return;
    }
    setSubmitting(true);
    const res = login(loginForm.username, loginForm.password);
    setSubmitting(false);
    if (res.ok) {
      toast.success(`Bienvenido(a), ${res.user.nombre}.`);
      router.push("/dashboard");
    } else {
      toast.error(res.error);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const res = register({
      nombre: registerForm.nombre,
      username: registerForm.username,
      password: registerForm.password,
      role: "evaluador",
    });
    if (res.ok) {
      toast.success("Usuario registrado. Ahora puedes iniciar sesión.");
      setRegisterForm({ nombre: "", username: "", password: "" });
      // autologin
      const lres = login(registerForm.username, registerForm.password);
      if (lres.ok) {
        router.push("/dashboard");
      }
    } else {
      toast.error(res.error);
    }
  };

  const llenarAdmin = () => {
    setLoginForm({ username: "admin", password: "admin123" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Fondo decorativo */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: config?.primaryColor ?? "#0D9488" }}
        />
        <div
          className="absolute -right-32 top-1/3 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: config?.secondaryColor ?? "#F59E0B" }}
        />
      </div>

      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-8 px-4 py-8 lg:grid-cols-2 lg:gap-12 lg:px-8">
        {/* Columna izquierda: hero / info */}
        <div className="order-2 lg:order-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-white">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {config?.nombre ?? "Evaluación de Desempeño"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Sistema integral de evaluación laboral
              </p>
            </div>
          </div>

          <h2 className="mt-8 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Gestiona el{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">
              desempeño
            </span>{" "}
            de tu equipo con datos claros.
          </h2>
          <p className="mt-3 max-w-md text-muted-foreground">
            Evalúa empleados con criterios ponderados, visualiza resultados con
            gráficos interactivos y genera planes de mejora automáticos.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Target,
                title: "Criterios configurables",
                desc: "Pesos y nombres editables",
              },
              {
                icon: LayoutDashboard,
                title: "Dashboard visual",
                desc: "KPIs y gráficos en tiempo real",
              },
              {
                icon: ShieldCheck,
                title: "Multi-usuario",
                desc: "Roles admin y evaluador",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
              >
                <f.icon
                  className="h-5 w-5"
                  style={{ color: config?.primaryColor ?? "#0D9488" }}
                />
                <p className="mt-2 text-sm font-semibold">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" /> Multi-usuario
            </Badge>
            <Badge variant="secondary">Escala 1-100</Badge>
            <Badge variant="secondary">Planes de mejora automáticos</Badge>
            <Badge variant="secondary">Exportar PDF / Excel</Badge>
          </div>
        </div>

        {/* Columna derecha: auth card */}
        <div className="order-1 lg:order-2">
          <div className="mb-4 flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cambiar tema"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </div>

          <Card className="border-2 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Acceso al sistema</CardTitle>
              <CardDescription>
                Inicia sesión o crea una cuenta de evaluador.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                  <TabsTrigger value="register">Registrarse</TabsTrigger>
                </TabsList>

                {/* LOGIN */}
                <TabsContent value="login" className="mt-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="login-user">Usuario</Label>
                      <Input
                        id="login-user"
                        autoComplete="username"
                        value={loginForm.username}
                        onChange={(e) =>
                          setLoginForm((s) => ({ ...s, username: e.target.value }))
                        }
                        placeholder="admin"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="login-pass">Contraseña</Label>
                      <Input
                        id="login-pass"
                        type="password"
                        autoComplete="current-password"
                        value={loginForm.password}
                        onChange={(e) =>
                          setLoginForm((s) => ({ ...s, password: e.target.value }))
                        }
                        placeholder="••••••••"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full gap-2"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Entrar
                    </Button>
                  </form>
                  <button
                    onClick={llenarAdmin}
                    className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Usar credenciales de administrador (admin / admin123)
                  </button>
                </TabsContent>

                {/* REGISTER */}
                <TabsContent value="register" className="mt-4">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-nombre">Nombre completo</Label>
                      <Input
                        id="reg-nombre"
                        value={registerForm.nombre}
                        onChange={(e) =>
                          setRegisterForm((s) => ({ ...s, nombre: e.target.value }))
                        }
                        placeholder="Ej: Leonor Martínez"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-user">Usuario</Label>
                      <Input
                        id="reg-user"
                        value={registerForm.username}
                        onChange={(e) =>
                          setRegisterForm((s) => ({ ...s, username: e.target.value }))
                        }
                        placeholder="leonor.m"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-pass">Contraseña</Label>
                      <Input
                        id="reg-pass"
                        type="password"
                        value={registerForm.password}
                        onChange={(e) =>
                          setRegisterForm((s) => ({ ...s, password: e.target.value }))
                        }
                        placeholder="Mínimo 4 caracteres"
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Crear cuenta de evaluador
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Las cuentas nuevas tienen rol <strong>Evaluador</strong>.
                      Solo el admin puede configurar el sistema.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex flex-col gap-1 text-center">
              <p className="text-xs text-muted-foreground">
                Los datos se guardan localmente en este navegador (localStorage).
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

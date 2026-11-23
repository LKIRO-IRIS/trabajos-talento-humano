"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAuthContext } from "@/components/auth/auth-context";
import { useConfig } from "@/hooks/use-config";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function LoginModal({ open, onOpenChange, onSuccess }: LoginModalProps) {
  const { login, register } = useAuthContext();
  const { config } = useConfig();

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    nombre: "",
    username: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"login" | "register">("login");

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
      setLoginForm({ username: "", password: "" });
      onSuccess?.();
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
      // autologin tras registro
      const lres = login(registerForm.username, registerForm.password);
      if (lres.ok) {
        toast.success(`Cuenta creada. ¡Bienvenido(a), ${lres.user.nombre}!`);
        setRegisterForm({ nombre: "", username: "", password: "" });
        onSuccess?.();
      } else {
        toast.error(lres.error);
      }
    } else {
      toast.error(res.error);
    }
  };

  const llenarAdmin = () => {
    setLoginForm({ username: "admin", password: "admin123" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck
              className="h-5 w-5"
              style={{ color: config?.primaryColor ?? "#0D9488" }}
            />
            Inicio de sesión requerido
          </DialogTitle>
          <DialogDescription>
            Para realizar esta acción necesitas iniciar sesión o crear una
            cuenta de evaluador.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "login" | "register")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
            <TabsTrigger value="register">Registrarse</TabsTrigger>
          </TabsList>

          {/* LOGIN */}
          <TabsContent value="login" className="mt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-user-modal">Usuario</Label>
                <Input
                  id="login-user-modal"
                  autoComplete="username"
                  value={loginForm.username}
                  onChange={(e) =>
                    setLoginForm((s) => ({ ...s, username: e.target.value }))
                  }
                  placeholder="admin"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-pass-modal">Contraseña</Label>
                <Input
                  id="login-pass-modal"
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
              type="button"
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
                <Label htmlFor="reg-nombre-modal">Nombre completo</Label>
                <Input
                  id="reg-nombre-modal"
                  value={registerForm.nombre}
                  onChange={(e) =>
                    setRegisterForm((s) => ({ ...s, nombre: e.target.value }))
                  }
                  placeholder="Ej: Leonor Martínez"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-user-modal">Usuario</Label>
                <Input
                  id="reg-user-modal"
                  value={registerForm.username}
                  onChange={(e) =>
                    setRegisterForm((s) => ({ ...s, username: e.target.value }))
                  }
                  placeholder="leonor.m"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-pass-modal">Contraseña</Label>
                <Input
                  id="reg-pass-modal"
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
                Las cuentas nuevas tienen rol <strong>Evaluador</strong>. Solo
                el admin puede configurar el sistema.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

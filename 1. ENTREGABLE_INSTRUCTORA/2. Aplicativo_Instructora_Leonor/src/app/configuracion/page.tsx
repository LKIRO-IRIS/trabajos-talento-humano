"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Settings,
  Save,
  Download,
  Upload,
  Users,
  Trash2,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { CriteriosConfig } from "@/components/config/criterios-config";
import { EmpresaConfigPanel } from "@/components/config/empresa-config";
import { useAuthContext } from "@/components/auth/auth-context";
import { useConfig } from "@/hooks/use-config";
import { exportData, importData, resetData } from "@/lib/storage";
import { deleteUser, listUsers } from "@/lib/auth";
import { formatDate, getIniciales } from "@/lib/utils";
import type { EmpresaConfig, User } from "@/lib/types";

export default function ConfiguracionPage() {
  const router = useRouter();
  const { user, isAdmin, refresh } = useAuthContext();
  const { config, update } = useConfig();
  const [draft, setDraft] = useState<EmpresaConfig | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (config) setDraft(config);
  }, [config]);

  useEffect(() => {
    if (!isAdmin) {
      toast.error("Solo el administrador puede acceder a la configuración.");
      router.replace("/dashboard");
    }
  }, [isAdmin, router]);

  useEffect(() => {
    setUsers(listUsers());
  }, []);

  if (!isAdmin || !draft) {
    return (
      <MainLayout>
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Redirigiendo…
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  const guardarTodo = () => {
    update(draft);
    toast.success("Configuración guardada correctamente.");
  };

  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-evaluacion-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Datos exportados.");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importData(reader.result as string);
        toast.success("Datos importados correctamente. Recargando…");
        setTimeout(() => window.location.reload(), 800);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Error al importar el archivo."
        );
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleReset = () => {
    resetData(false);
    toast.success("Datos reiniciados a los valores por defecto. Recargando…");
    setTimeout(() => window.location.reload(), 800);
  };

  const handleDeleteUser = (id: string) => {
    const res = deleteUser(id);
    if (res.ok) {
      setUsers(listUsers());
      toast.success("Usuario eliminado.");
    } else {
      toast.error(res.error ?? "No se pudo eliminar.");
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Settings className="h-6 w-6 text-brand" />
              Configuración
            </h1>
            <p className="text-sm text-muted-foreground">
              Personaliza el sistema de evaluación.
            </p>
          </div>
          <Button onClick={guardarTodo} className="gap-2">
            <Save className="h-4 w-4" />
            Guardar cambios
          </Button>
        </div>

        <Tabs defaultValue="empresa">
          <TabsList className="grid w-full max-w-2xl grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="empresa">Empresa</TabsTrigger>
            <TabsTrigger value="criterios">Criterios</TabsTrigger>
            <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
            <TabsTrigger value="datos">Datos</TabsTrigger>
          </TabsList>

          {/* Empresa */}
          <TabsContent value="empresa" className="mt-4">
            <EmpresaConfigPanel
              config={draft}
              onChange={(c) => setDraft(c)}
            />
          </TabsContent>

          {/* Criterios */}
          <TabsContent value="criterios" className="mt-4">
            <CriteriosConfig
              criterios={draft.criterios}
              onChange={(criterios) => setDraft({ ...draft, criterios })}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Recuerda hacer clic en <strong>Guardar cambios</strong> para aplicar
              la configuración de criterios.
            </p>
          </TabsContent>

          {/* Usuarios */}
          <TabsContent value="usuarios" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  Usuarios registrados ({users.length})
                </CardTitle>
                <CardDescription>
                  Lista de usuarios con acceso al sistema.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Creado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground">
                                {getIniciales(u.nombre)}
                              </span>
                              <span className="font-medium">@{u.username}</span>
                            </div>
                          </TableCell>
                          <TableCell>{u.nombre}</TableCell>
                          <TableCell>
                            <Badge
                              variant={u.role === "admin" ? "default" : "secondary"}
                            >
                              {u.role === "admin" ? "Administrador" : "Evaluador"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(u.creadoEn)}
                          </TableCell>
                          <TableCell className="text-right">
                            {u.username !== "admin" ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      ¿Eliminar usuario?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Se eliminará a <strong>@{u.username}</strong>.
                                      Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(u.id)}
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Protegido
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Datos */}
          <TabsContent value="datos" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Download className="h-4 w-4" />
                  Exportar / Importar datos
                </CardTitle>
                <CardDescription>
                  Realiza copias de seguridad o transfiere datos entre dispositivos.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button onClick={handleExport} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar JSON
                </Button>
                <label>
                  <input
                    type="file"
                    accept="application/json"
                    onChange={handleImport}
                    className="hidden"
                  />
                  <Button variant="outline" className="gap-2 cursor-pointer" asChild>
                    <span>
                      <Upload className="h-4 w-4" />
                      Importar JSON
                    </span>
                  </Button>
                </label>
              </CardContent>
            </Card>

            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-destructive">
                  <ShieldAlert className="h-4 w-4" />
                  Zona de peligro
                </CardTitle>
                <CardDescription>
                  Reinicia todos los datos a los valores por defecto. Se perderán
                  los empleados y evaluaciones registrados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Reiniciar datos
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        ¿Reiniciar todos los datos?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Se restaurarán los 3 empleados de ejemplo y la configuración
                        por defecto. Se eliminarán todos los empleados, evaluaciones y
                        usuarios registrados (excepto el admin). Esta acción no se puede
                        deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReset}>
                        Sí, reiniciar todo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

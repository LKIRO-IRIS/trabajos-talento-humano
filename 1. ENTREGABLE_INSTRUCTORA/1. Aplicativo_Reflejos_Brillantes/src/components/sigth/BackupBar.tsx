"use client";

import * as React from "react";
import {
  Download,
  Upload,
  Building2,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  QrCode,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useEmpresa } from "@/components/sigth/EmpresaContext";
import {
  collectBackup,
  downloadBackupFile,
  readBackupFile,
  restoreBackup,
  storeBackupIndexedDB,
  getBackupFromIndexedDB,
  listLocalBackups,
  generateBackupCode,
  type BackupData,
} from "@/lib/backup";

interface BackupBarProps {
  /** Si true, muestra también el botón "Configurar empresa". */
  showConfigEmpresa?: boolean;
  /** Tamaño compacto (para header pegajoso). */
  compact?: boolean;
}

/**
 * Barra con los botones de respaldo: descargar, restaurar, código corto
 * y configurar empresa. Se usa dentro del header.
 */
export function BackupBar({ showConfigEmpresa = true, compact }: BackupBarProps) {
  const { empresa, setEmpresa, refresh } = useEmpresa();
  const [busy, setBusy] = React.useState<"download" | "restore" | null>(null);
  const [codeModal, setCodeModal] = React.useState<{
    open: boolean;
    code: string;
    formats: number;
    hvs: number;
  }>({ open: false, code: "", formats: 0, hvs: 0 });
  const [restoreOpen, setRestoreOpen] = React.useState(false);
  const [localBackups, setLocalBackups] = React.useState<
    { code: string; savedAt: string }[]
  >([]);
  const [restoreCode, setRestoreCode] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const restoreFileRef = React.useRef<HTMLInputElement>(null);

  const handleDownload = async () => {
    setBusy("download");
    try {
      const data = collectBackup(empresa);
      const code = generateBackupCode();
      data.backupCode = code;
      // Guardar en IndexedDB con el código
      await storeBackupIndexedDB(code, data);
      await storeBackupIndexedDB("last-session", data);
      // Descargar archivo
      downloadBackupFile(data, empresa.name);
      setCodeModal({
        open: true,
        code,
        formats: Object.keys(data.formats || {}).length,
        hvs: Array.isArray(data.analyzedHvs) ? data.analyzedHvs.length : 0,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo generar el respaldo.",
      );
    } finally {
      setBusy(null);
    }
  };

  const handleRestoreFile = async (file: File | undefined | null) => {
    if (!file) return;
    setBusy("restore");
    try {
      const data = await readBackupFile(file);
      if (!data) {
        toast.error(
          "No se pudo leer el archivo. Verifica que sea un respaldo .sigth o .json válido.",
        );
        return;
      }
      const result = restoreBackup(data);
      refresh();
      // También sincroniza la empresa desde el backup restaurado
      if (data.empresa) {
        setEmpresa(data.empresa);
      }
      toast.success(
        `Respaldo restaurado: ${result.formats} formatos, ${result.hvs} HVs analizadas.`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo restaurar el respaldo.",
      );
    } finally {
      setBusy(null);
      setRestoreOpen(false);
    }
  };

  const handleRestoreByCode = async () => {
    const code = restoreCode.trim().toUpperCase();
    if (!code) {
      toast.error("Escribe el código de 8 caracteres.");
      return;
    }
    setBusy("restore");
    try {
      const data = await getBackupFromIndexedDB(code);
      if (!data) {
        toast.error(
          `No se encontró un respaldo con el código ${code} en este navegador.`,
        );
        return;
      }
      const result = restoreBackup(data);
      refresh();
      if (data.empresa) setEmpresa(data.empresa);
      toast.success(
        `Respaldo restaurado: ${result.formats} formatos, ${result.hvs} HVs.`,
      );
      setRestoreOpen(false);
      setRestoreCode("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo restaurar por código.",
      );
    } finally {
      setBusy(null);
    }
  };

  const openRestore = async () => {
    setRestoreOpen(true);
    const list = await listLocalBackups();
    setLocalBackups(list);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(codeModal.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("No se pudo copiar el código.");
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {showConfigEmpresa && (
          <Button
            variant="ghost"
            size={compact ? "icon" : "sm"}
            className="text-white hover:bg-white/10 h-8"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("sigth-open-empresa-modal"));
            }}
            title="Configurar empresa"
            aria-label="Configurar empresa"
          >
            <Building2 className="w-4 h-4" />
            {!compact && (
              <span className="hidden lg:inline ml-1 text-xs">Empresa</span>
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className="text-white hover:bg-white/10 h-8"
          onClick={handleDownload}
          disabled={busy !== null}
          title="Descargar respaldo (.sigth)"
          aria-label="Descargar respaldo"
        >
          {busy === "download" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {!compact && (
            <span className="hidden lg:inline ml-1 text-xs">Respaldo</span>
          )}
        </Button>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className="text-white hover:bg-white/10 h-8"
          onClick={openRestore}
          disabled={busy !== null}
          title="Restaurar respaldo"
          aria-label="Restaurar respaldo"
        >
          <Upload className="w-4 h-4" />
          {!compact && (
            <span className="hidden lg:inline ml-1 text-xs">Restaurar</span>
          )}
        </Button>
        {/* Botón "Generar código de respaldo" eliminado — era redundante con el
            botón "Respaldo" (ambos llamaban a handleDownload y abrían el mismo
            modal con el código de 8 caracteres). */}
        <input
          ref={restoreFileRef}
          type="file"
          accept=".sigth,.json,application/json"
          className="hidden"
          onChange={(e) => handleRestoreFile(e.target.files?.[0])}
        />
      </div>

      {/* Modal con el código de respaldo */}
      <Dialog
        open={codeModal.open}
        onOpenChange={(v) => setCodeModal((s) => ({ ...s, open: v }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              ¡Respaldo descargado!
            </DialogTitle>
            <DialogDescription>
              Guarda este código para recuperar tu trabajo rápidamente en este
              navegador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Código de respaldo
              </div>
              <div className="text-3xl font-extrabold font-mono tracking-wider">
                {codeModal.code}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={copyCode}
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 mr-1" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1" /> Copiar código
                  </>
                )}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-green-600" />
                <span>{codeModal.formats} formatos guardados</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-green-600" />
                <span>{codeModal.hvs} hojas de vida analizadas</span>
              </div>
              <div className="flex items-start gap-1.5 pt-1 border-t mt-2">
                <QrCode className="w-3 h-3 mt-0.5 shrink-0" />
                <span>
                  Este código solo funciona en <strong>este navegador</strong>.
                  Para transferir a otro PC, usa el archivo{" "}
                  <code className="bg-muted px-1 rounded">.sigth</code> descargado
                  y súbelo con el botón <strong>Restaurar</strong>.
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCodeModal((s) => ({ ...s, open: false }))}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para restaurar (archivo o código) */}
      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Restaurar respaldo
            </DialogTitle>
            <DialogDescription>
              Sube un archivo <code>.sigth</code> descargado anteriormente o
              ingresa un código guardado en este navegador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <Button
                variant="outline"
                onClick={() => restoreFileRef.current?.click()}
                disabled={busy !== null}
                className="w-full"
              >
                {busy === "restore" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Seleccionar archivo .sigth o .json
              </Button>
            </div>
            <div className="text-center text-xs text-muted-foreground">— o —</div>
            <div className="space-y-1.5">
              <Label htmlFor="restore-code" className="text-xs">
                Restaurar por código
              </Label>
              <div className="flex gap-2">
                <Input
                  id="restore-code"
                  value={restoreCode}
                  onChange={(e) => setRestoreCode(e.target.value)}
                  placeholder="TH-XXXX-XXXX"
                  className="font-mono"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRestoreByCode();
                  }}
                />
                <Button
                  onClick={handleRestoreByCode}
                  disabled={busy !== null || !restoreCode.trim()}
                >
                  Restaurar
                </Button>
              </div>
              {localBackups.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Respaldos guardados en este navegador
                  </div>
                  <div className="max-h-32 overflow-y-auto rb-chat-scroll space-y-1">
                    {localBackups.slice(0, 8).map((b) => (
                      <button
                        key={b.code}
                        onClick={() => setRestoreCode(b.code)}
                        className="w-full text-left text-xs px-2 py-1.5 rounded border hover:border-primary/50 flex justify-between items-center"
                      >
                        <span className="font-mono font-bold">{b.code}</span>
                        <span className="text-muted-foreground">
                          {new Date(b.savedAt).toLocaleString("es-CO")}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded flex items-start gap-1">
              <ShieldCheck className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                Restaurar <strong>reemplaza</strong> todos los datos actuales.
                Si quieres conservar tu trabajo actual, descarga un respaldo
                primero con el botón <Download className="inline w-2.5 h-2.5" />.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreOpen(false)}
              disabled={busy !== null}
            >
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

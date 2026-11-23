"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import { LoginModal } from "./login-modal";

type PendingAction = (() => void) | null;

interface AuthContextValue extends ReturnType<typeof useAuth> {
  pendingAction: PendingAction;
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  requireAuth: (action: () => void) => void;
  onLoginSuccess: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  /**
   * Si hay sesión: ejecuta la acción directamente.
   * Si no hay sesión: guarda la acción como pendiente y abre el modal de login.
   * Tras un login exitoso, `onLoginSuccess` se encarga de ejecutarla.
   */
  const requireAuth = useCallback(
    (action: () => void) => {
      if (auth.user) {
        action();
      } else {
        // Envolver en otra función para que React no interprete `action`
        // como un updater de estado.
        setPendingAction(() => action);
        setLoginModalOpen(true);
      }
    },
    [auth.user]
  );

  /**
   * Cierra el modal y, si hay una acción pendiente, la ejecuta
   * (diferida para asegurar que el estado de auth ya está actualizado).
   */
  const onLoginSuccess = useCallback(() => {
    setLoginModalOpen(false);
    setPendingAction((prev) => {
      if (prev) {
        const fn = prev;
        // Diferir a la siguiente macrotarea para que React ya haya
        // propagado el nuevo `user` a todos los componentes.
        setTimeout(fn, 0);
      }
      return null;
    });
  }, []);

  /**
   * Maneja los cambios de apertura del modal desde la UI (overlay, X, Esc).
   * Si se cierra sin login exitoso, descarta la acción pendiente.
   */
  const handleOpenChange = useCallback((open: boolean) => {
    setLoginModalOpen(open);
    if (!open) {
      setPendingAction(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...auth,
      pendingAction,
      loginModalOpen,
      setLoginModalOpen: handleOpenChange,
      requireAuth,
      onLoginSuccess,
    }),
    [auth, pendingAction, loginModalOpen, handleOpenChange, requireAuth, onLoginSuccess]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoginModal
        open={loginModalOpen}
        onOpenChange={handleOpenChange}
        onSuccess={onLoginSuccess}
      />
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}

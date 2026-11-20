import type { User } from "./types";
import { genId } from "./utils";
import { loadData, saveUsers } from "./storage";

const SESSION_KEY = "app-leonor:session:v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export interface Session {
  userId: string;
  username: string;
  role: User["role"];
  nombre: string;
}

/** Intenta login por username/password. */
export function login(
  username: string,
  password: string
): { ok: true; user: User } | { ok: false; error: string } {
  const data = loadData();
  const user = data.users.find(
    (u) =>
      u.username.toLowerCase() === username.trim().toLowerCase() &&
      u.password === password
  );
  if (!user) {
    return { ok: false, error: "Usuario o contraseña incorrectos." };
  }
  const session: Session = {
    userId: user.id,
    username: user.username,
    role: user.role,
    nombre: user.nombre,
  };
  if (isBrowser()) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return { ok: true, user };
}

/** Registra un nuevo usuario. Solo rol "evaluador" se auto-registra. */
export function register(params: {
  nombre: string;
  username: string;
  password: string;
  role?: User["role"];
}): { ok: true; user: User } | { ok: false; error: string } {
  const data = loadData();
  const username = params.username.trim();
  if (username.length < 3) {
    return { ok: false, error: "El usuario debe tener al menos 3 caracteres." };
  }
  if (params.password.length < 4) {
    return { ok: false, error: "La contraseña debe tener al menos 4 caracteres." };
  }
  const exists = data.users.some(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (exists) {
    return { ok: false, error: "Ya existe un usuario con ese nombre." };
  }
  const user: User = {
    id: genId("user"),
    username,
    password: params.password,
    role: params.role ?? "evaluador",
    nombre: params.nombre.trim() || username,
    creadoEn: new Date().toISOString(),
  };
  data.users.push(user);
  saveUsers(data.users);
  return { ok: true, user };
}

/** Cierra la sesión actual. */
export function logout(): void {
  if (isBrowser()) localStorage.removeItem(SESSION_KEY);
}

/** Devuelve la sesión activa o null. */
export function getSession(): Session | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

/** Devuelve el usuario completo de la sesión o null. */
export function getCurrentUser(): User | null {
  const session = getSession();
  if (!session) return null;
  const data = loadData();
  return data.users.find((u) => u.id === session.userId) ?? null;
}

/** Lista usuarios registrados (solo para admin). */
export function listUsers(): User[] {
  return loadData().users;
}

/** Elimina un usuario por id (no se puede eliminar a sí mismo el admin por defecto). */
export function deleteUser(id: string): { ok: boolean; error?: string } {
  const data = loadData();
  const user = data.users.find((u) => u.id === id);
  if (!user) return { ok: false, error: "Usuario no encontrado." };
  if (user.username === "admin") {
    return { ok: false, error: "No se puede eliminar el usuario admin por defecto." };
  }
  data.users = data.users.filter((u) => u.id !== id);
  saveUsers(data.users);
  return { ok: true };
}

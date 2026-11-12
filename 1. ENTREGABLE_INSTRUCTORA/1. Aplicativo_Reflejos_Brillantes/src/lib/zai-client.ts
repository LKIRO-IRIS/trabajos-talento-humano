/**
 * Helper para crear el cliente ZAI.
 *
 * En el sandbox de desarrollo: usa el archivo `.z-ai-config` (en /etc, home o cwd)
 * que carga automáticamente `ZAI.create()`.
 *
 * En producción (Netlify, Vercel, etc.): usa variables de entorno si están
 * definidas, para no depender del archivo `.z-ai-config` (que es específico
 * del sandbox y no se debe commitear).
 *
 * Variables de entorno necesarias en producción:
 *   - ZAI_API_KEY   → API key de Z.ai
 *   - ZAI_BASE_URL  → URL base (ej: https://api.z.ai/api/v2)
 *
 * Opcionales:
 *   - ZAI_CHAT_ID   → ID del chat (sesión)
 *   - ZAI_USER_ID   → ID del usuario
 *   - ZAI_TOKEN     → Token JWT de sesión
 *
 * Si las variables no están definidas, las funciones de IA (analizar HV,
 * generar HV, fetch URL) fallarán con un mensaje claro — el resto del
 * aplicativo (33 formatos, archivador, respaldos, etc.) seguirá funcionando.
 */

import ZAI, { type ZAIConfig } from "z-ai-web-dev-sdk";

/**
 * Crea una instancia del cliente ZAI.
 * - Si hay variables de entorno ZAI_*, las usa.
 * - Si no, cae al comportamiento por defecto (`ZAI.create()`), que lee
 *   `.z-ai-config` del sistema de archivos (sandbox de desarrollo).
 */
export async function getZai(): Promise<ZAI> {
  const envApiKey = process.env.ZAI_API_KEY;
  const envBaseUrl = process.env.ZAI_BASE_URL;

  if (envApiKey && envBaseUrl) {
    const config: ZAIConfig = {
      baseUrl: envBaseUrl,
      apiKey: envApiKey,
      chatId: process.env.ZAI_CHAT_ID || "",
      userId: process.env.ZAI_USER_ID || "",
      token: process.env.ZAI_TOKEN || "",
    };
    return new ZAI(config);
  }

  // Fallback: comportamiento por defecto (lee .z-ai-config)
  return await ZAI.create();
}

/**
 * Comprueba si el cliente ZAI está configurado (ya sea por env vars o por
 * archivo .z-ai-config). Útil para mostrar un aviso en el UI si las
 * funciones de IA no van a funcionar.
 */
export function isZaiConfigured(): boolean {
  if (typeof process !== "undefined" && process.env) {
    if (process.env.ZAI_API_KEY && process.env.ZAI_BASE_URL) return true;
  }
  // No podemos comprobar el archivo .z-ai-config de forma síncrona sin
  // importar 'fs', así que devolvemos true y dejamos que el error se maneje
  // en runtime si las llamadas fallan.
  return true;
}

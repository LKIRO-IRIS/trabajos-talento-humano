# 🚀 SIGTH — Sistema Integral de Gestión de Talento Humano

Aplicativo web educativo para aprendices **SENA** de Gestión de Talento Humano.
Permite diligenciar **33 formatos TH**, analizar hojas de vida con **IA visual**,
generar HV desde cero, adaptar el branding a cualquier empresa simulada, y
visualizar el proceso completo en un **árbol 3D interactivo**.

> **Aprendiz:** Félix Daniel Perdomo Palomino
> **Repositorio:** https://github.com/LKIRO-IRIS/trabajos-talento-humano

---

## ✨ Características principales

### 📋 Gestión de Procesos (módulo principal)
- **33 formatos TH** organizados en 6 procesos: Tablero, Atracción & Selección,
  Contratación, Desempeño, Estrategia y Modelos de Documentos.
- **Acordeones colapsables** (cerrados por defecto, se abren al hacer clic).
- **Panel minimizable** para cada formato (botón ▼/▶).
- **Auto-llenado** de TH-03, TH-04, TH-06 y TH-09 desde las HV analizadas con IA.
- **TH-CONTRATO**: contrato laboral auto-generado desde TH-01 (requisición) +
  TH-03 (hoja de vida). Incluye **Modelos de Contrato de Referencia**
  descargables (.docx) y guía de prompts para IA.
- **TH-AFILIACIONES**: afiliaciones a seguridad social auto-generadas desde el
  contrato (EPS, ARL, AFP, cesantías, caja de compensación).

### 🤖 IA Visual (VLM)
- **Análisis de HV** con IA: sube una imagen o PDF de la hoja de vida y la IA
  extrae automáticamente nombre, contacto, formación, experiencia, habilidades
  y evaluación de compatibilidad con el cargo.
- **Generación de HV** con IA: a partir del nombre + cargo objetivo, la IA
  redacta una hoja de vida profesional lista para descargar en Word.
- **Fetch-URL**: pega la URL de la HV web de un candidato y la IA la analiza.

### 🏢 Multi-empresa dinámica
- **Modal de configuración de empresa**: define nombre, NIT, colores, logo y
  tagline de la empresa simulada. Todo el aplicativo se adapta automáticamente.
- **Empresas precargadas**: Reflejos Brillantes SAS, Royal Eventos, Detallitos
  con Amor.
- **Página de adaptación web**: `/api/analyze-website` adapta el branding
  desde la URL de la empresa real.

### 💾 Respaldo y recuperación
- Botón **Respaldo**: descarga un archivo `.sigth` con todos los datos
  (formatos, HVs analizadas, configuración de empresa).
- Botón **Restaurar**: sube un archivo `.sigth` o `.json` para restaurar.
- **Código de 8 caracteres** (ej. `TH-FRZ6-U4Z4`) para recuperación rápida
  en el mismo navegador (vía IndexedDB).

### 📄 Archivador de candidatos
- Lista todos los candidatos analizados con su estado (activo/descartado).
- Historial de evaluaciones por candidato.

### 🌳 Árbol 3D interactivo (ruta `/arbol`)
- Escena 3D con **7 ramas de colores** representando los procesos de TH.
- **20 botellas reciclables** colgando, cada una con un código TH-FR-XX o
  TH-MD-XX.
- Al hacer clic en una botella, entras **DENTRO** de ella y ves los productos
  ecológicos de Reflejos Brillantes S.A.S. flotando (limpiador, detergente,
  desinfectante, limpiavidrios, pasta limpiadora, jabón de manos).
- Lluvia con 2000 partículas, cascada, niebla volumétrica y sonido ambiental.

---

## 🛠️ Stack tecnológico

- **Next.js 16** (App Router, Turbopack)
- **React 19** + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui**
- **React Three Fiber** + **@react-three/drei** + **Three.js** (para el árbol 3D)
- **z-ai-web-dev-sdk** (IA visual, chat y generación)
- **Prisma ORM** (opcional, para persistencia en BD)
- **Sonner** (notificaciones toast)

---

## 🏁 Cómo correr el aplicativo localmente

### Opción 1: Con bun (recomendado)

```bash
# 1. Instalar dependencias
bun install

# 2. (Opcional) Configurar variables de entorno para IA
cp .env.example .env
# Edita .env con tu ZAI_API_KEY y ZAI_BASE_URL

# 3. Correr en modo desarrollo
bun run dev

# 4. Abrir en el navegador
# http://localhost:3000          ← Aplicativo principal
# http://localhost:3000/arbol    ← Árbol 3D
```

### Opción 2: Con npm

```bash
npm install
npm run dev
```

### Opción 3: Build de producción

```bash
bun run build
node .next/standalone/server.js
```

---

## 🌐 Despliegue en Netlify

El aplicativo está configurado para desplegarse en Netlify de forma
automática. Hay dos archivos de configuración:

- **`netlify.toml`**: define el build command (`next build`), el directorio
  publish (`.next`), la versión de Node (20) y el plugin
  `@netlify/plugin-nextjs` (que Netlify instala automáticamente).
- **`.nvmrc`**: fija la versión de Node.js a 20 LTS.

### Pasos para desplegar

1. **Conectar el repositorio** en Netlify:
   - Ve a https://app.netlify.com/start
   - "Import an existing project" → GitHub → `LKIRO-IRIS/trabajos-talento-humano`
   - **Base directory**: `1. ENTREGABLE_INSTRUCTORA/1. Aplicativo_Reflejos_Brillantes`
   - **Build command**: se autodetecta desde `netlify.toml` → `next build`
   - **Publish directory**: se autodetecta → `.next`

2. **Configurar variables de entorno** (opcional, para IA):
   - Site settings → Environment variables
   - Agregar:
     - `ZAI_API_KEY` = tu API key de Z.ai
     - `ZAI_BASE_URL` = `https://api.z.ai/api/v2`
   - Sin estas variables, el aplicativo funciona pero las 3 funciones de IA
     (analizar HV, generar HV, fetch-URL) devolverán un error claro.

3. **Deploy**:
   - Netlify detectará el framework Next.js automáticamente.
   - El build tarda ~1-2 minutos.
   - La URL será `https://<nombre-del-site>.netlify.app`.

4. **Activar Next.js Runtime** (si no se activa solo):
   - Site settings → Integrations → Next.js Runtime → Enable

### Notas sobre las funciones de IA en producción

- Las 3 API routes que usan IA (`/api/analyze-hv`, `/api/generate-hv`,
  `/api/fetch-url`) se convierten en **serverless functions** en Netlify.
- El helper `src/lib/zai-client.ts` usa variables de entorno si están
  definidas, y si no, cae al comportamiento por defecto (`ZAI.create()` que
  lee `.z-ai-config` del sandbox — no disponible en Netlify).
- **Sin API key**, estas funciones fallan con un error 500 claro, pero el
  resto del aplicativo (33 formatos, archivador, respaldos, etc.) funciona
  con normalidad.

---

## 🔑 Variables de entorno

Copia `.env.example` a `.env` (desarrollo) o configúralas en el panel de
Netlify (producción):

| Variable | Obligatoria | Descripción |
|---|---|---|
| `ZAI_API_KEY` | No (sí para IA) | API key de Z.ai |
| `ZAI_BASE_URL` | No (sí para IA) | URL base de la API (`https://api.z.ai/api/v2`) |
| `ZAI_CHAT_ID` | No | ID de sesión de chat (opcional) |
| `ZAI_USER_ID` | No | ID de usuario (opcional) |
| `ZAI_TOKEN` | No | Token JWT (opcional) |
| `DATABASE_URL` | No | Solo si activas Prisma |

**Sin API key**, el aplicativo sigue funcionando para todo excepto:
- Análisis de HV con IA (VLM)
- Generación de HV con IA (LLM)
- Fetch-URL con IA

Los 33 formatos manuales, descargas Word/Excel/PDF, archivador, respaldos y
todas las demás funciones siguen operando sin API key.

---

## 📁 Estructura del proyecto

```
1. Aplicativo_Reflejos_Brillantes/
├── src/
│   ├── app/
│   │   ├── page.tsx                      ← Página principal (SIGTH)
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── arbol/page.tsx                ← Página del árbol 3D
│   │   └── api/
│   │       ├── analyze-hv/route.ts       ← IA: analizar HV (VLM)
│   │       ├── analyze-website/route.ts  ← Adaptar branding web
│   │       ├── fetch-url/route.ts        ← IA: analizar HV desde URL
│   │       ├── generate-hv/route.ts      ← IA: generar HV
│   │       └── generate-zip/route.ts     ← Generar ZIP de formatos
│   ├── components/
│   │   ├── sigth/
│   │   │   ├── GestionModule.tsx         ← Módulo principal de formatos
│   │   │   ├── BackupBar.tsx             ← Barra de respaldo
│   │   │   ├── EmpresaConfigModal.tsx    ← Modal de configurar empresa
│   │   │   ├── EmpresaContext.tsx        ← Context de empresa
│   │   │   ├── AnalysisModule.tsx        ← Módulo de análisis IA
│   │   │   ├── ArchivadorCandidatos.tsx  ← Archivador de candidatos
│   │   │   ├── Arbol3DScene.tsx          ← Escena 3D del árbol
│   │   │   └── gestion/
│   │   │       ├── FormatShell.tsx       ← Layout común de formatos
│   │   │       ├── DocHeaderEditor.tsx   ← Editor de encabezado APA
│   │   │       ├── formats-catalog.ts    ← Catálogo de 33 formatos
│   │   │       └── formats/
│   │   │           ├── ContratoLaboral.tsx       ← TH-CONTRATO
│   │   │           ├── AfiliacionesSeguridadSocial.tsx  ← TH-AFILIACIONES
│   │   │           ├── TH01-Requisicion.tsx     ← TH-01
│   │   │           ├── TH03-HojaVida.tsx        ← TH-03
│   │   │           └── ... (más formatos)
│   │   └── ui/                            ← shadcn/ui components
│   └── lib/
│       ├── analysis.ts                    ← Lógica de análisis y empresas
│       ├── backup.ts                      ← Sistema de respaldo
│       ├── zai-client.ts                  ← Helper de ZAI SDK (env vars)
│       └── ...
├── public/
│   ├── download/
│   │   └── contratos/                    ← Modelos de contrato .docx
│   │       ├── Contrato_indefinido_modelo_academico_Colombia.docx
│   │       ├── Contrato_termino_fijo_modelo_academico_Colombia.docx
│   │       └── Prompts_para_elaboracion_de_contratos_laborales.docx
│   └── logo.svg
├── prisma/                                ← Schema de BD (opcional)
├── netlify.toml                           ← Config de Netlify
├── .nvmrc                                 ← Node 20 LTS
├── .env.example                           ← Variables de entorno
├── next.config.ts
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## 💾 Respaldo y recuperación

### Descargar respaldo
- Botón **"Respaldo"** en el header (icono de descarga)
- Genera un archivo `.sigth` con todos tus datos
- Muestra un **código de 8 caracteres** (ej. `TH-FRZ6-U4Z4`) para
  recuperación rápida

### Restaurar respaldo
- Botón **"Restaurar"** en el header (icono de upload)
- Selecciona tu archivo `.sigth` o `.json`
- Todos tus datos se restauran automáticamente

### Recuperación por código
- Solo funciona en el mismo navegador donde se generó (IndexedDB)
- Para transferir a otro PC, usa el archivo `.sigth` descargado

---

## 🏢 Configurar empresa simulada

Al abrir el aplicativo por primera vez, aparece un modal para configurar la
empresa simulada. Puedes:

1. **Seleccionar una empresa precargada**: Reflejos Brillantes, Royal Eventos
   o Detallitos con Amor.
2. **Crear una empresa personalizada**: nombre, NIT, colores, logo y tagline.
3. **Adaptar desde la web**: ingresa la URL de la empresa real y la IA
   adaptará el branding automáticamente.

Toda la configuración se guarda en `localStorage` y se incluye en los
respaldos `.sigth`.

---

## 📌 Nota

Empresa simulada con fines pedagógicos SENA. Los modelos de contrato y
formatos son plantillas académicas que deben revisarse frente a la normativa
colombiana vigente antes de utilizarse en una relación laboral real.

**Reflejos Brillantes S.A.S.** — Productos ecológicos de limpieza.
**Aprendiz:** Félix Daniel Perdomo Palomino.

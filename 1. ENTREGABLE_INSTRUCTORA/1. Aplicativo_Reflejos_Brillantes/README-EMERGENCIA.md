# 🚀 SIGTH — Sistema de Gestión de Talento Humano

Aplicativo web educativo para aprendices SENA de Gestión de Talento Humano.
Permite diligenciar 33 formatos TH, analizar hojas de vida con IA, generar HV
desde cero, y adaptar el branding a cualquier empresa simulada.

---

## 📦 Requisitos

- **Node.js 18+** (recomendado 20+) — https://nodejs.org
- **bun** (opcional pero recomendado) — https://bun.sh
- **Conexión a Internet** (para análisis IA y descarga de dependencias)

---

## 🏁 Cómo correr el aplicativo

### Opción 1: Con bun (recomendado)

```bash
# 1. Descomprimir el ZIP
unzip SIGTH-Source-v1.zip
cd SIGTH-Source-v1

# 2. Instalar dependencias
bun install

# 3. Correr en modo desarrollo
bun run dev

# 4. Abrir en el navegador
# http://localhost:3000
```

### Opción 2: Con npm

```bash
# 1. Descomprimir el ZIP
unzip SIGTH-Source-v1.zip
cd SIGTH-Source-v1

# 2. Instalar dependencias
npm install

# 3. Correr en modo desarrollo
npm run dev

# 4. Abrir en el navegador
# http://localhost:3000
```

### Opción 3: Build de producción

```bash
bun run build
node .next/standalone/server.js
# Abre http://localhost:3000
```

---

## 🔑 Variables de entorno

Crea un archivo `.env` (puedes copiar `.env.example`) con:

```env
# Necesario para que el análisis de HV con IA funcione
ZAI_API_KEY=tu_api_key_aqui
```

**Si no tienes API key**, el aplicativo sigue funcionando para todo excepto:
- Análisis de HV con IA (VLM)
- Generación de HV con IA (LLM)

Los 33 formatos manuales, descargas Word/Excel/PDF, archivador, y todas las
demás funciones siguen operando sin API key.

---

## 💾 Respaldo y recuperación

### Descargar respaldo
- Botón **"Descargar respaldo"** en el header (icono de descarga)
- Genera un archivo `.sigth` con todos tus datos
- Muestra un código de 8 caracteres (ej. `TH-FRZ6-U4Z4`) para recuperación rápida

### Restaurar respaldo
- Botón **"Restaurar respaldo"** en el header (icono de upload)
- Selecciona tu archivo `.sigth` o `.json`
- Todos tus datos se restauran automáticamente

### Recuperación por código
- Solo funciona en el mismo navegador donde se generó
- Para transferir a otro PC, usa el archivo `.sigth`

---

## 🏢 Configurar empresa simulada

1. Al entrar por primera vez, aparece un modal "Configura tu empresa simulada"
2. Ingresa: nombre, eslogan, logo (upload o URL), color primario, color secundario
3. Opcional: pega la URL de una página web y el sistema extrae automáticamente
   el nombre, logo y color dominante
4. Botón **"Guardar empresa"** — la config se aplica a todos los formatos
5. Para cambiarla después: botón **"Configurar empresa"** en el header

### Compartir empresa con otro aprendiz
- Botón **"Compartir mi empresa"** en el modal
- Copia un link con la config embebida
- El otro aprendiz pega el link y la empresa se aplica automáticamente

---

## 📂 Estructura del proyecto

```
SIGTH-Source-v1/
├── src/
│   ├── app/                          # Páginas y APIs Next.js
│   │   ├── page.tsx                  # Página principal
│   │   ├── api/
│   │   │   ├── analyze-hv/           # Endpoint análisis HV (VLM)
│   │   │   ├── analyze-website/     # Adaptador de páginas web
│   │   │   ├── generate-hv/         # Generador HV con IA (LLM)
│   │   │   └── generate-zip/        # Generador de formatos en ZIP
│   │   └── globals.css               # Estilos globales
│   ├── components/
│   │   ├── ui/                       # Componentes shadcn/ui
│   │   └── sigth/                    # Componentes del aplicativo
│   │       ├── EmpresaContext.tsx    # Context de empresa dinámica
│   │       ├── EmpresaConfigModal.tsx
│   │       ├── AnalysisModule.tsx   # Subir HV
│   │       ├── ResumeBuilder.tsx    # Crear HV
│   │       ├── FormatsModule.tsx     # Tab Formatos
│   │       ├── GestionModule.tsx    # Tab Gestión (archivador)
│   │       └── gestion/
│   │           ├── FormatShell.tsx  # Layout de formatos
│   │           ├── DocHeaderEditor.tsx
│   │           ├── Dashboard.tsx
│   │           └── formats/          # 33 formatos TH
│   └── lib/
│       ├── analysis.ts               # Lógica de análisis
│       ├── backup.ts                 # Sistema de respaldo
│       └── resume.ts                 # Utilidades de HV
├── public/                            # Archivos públicos
├── download/                          # 50+ formatos Word/Excel/PNG pre-generados
├── scripts/                           # Scripts generadores (Python/Node)
├── prisma/                            # Schema de base de datos
├── package.json
├── next.config.ts
├── tsconfig.json
└── tailwind.config.ts
```

---

## 🎯 Funcionalidades principales

### Tab "Gestión" (archivador de procesos)
- 6 secciones: Tablero, Reclutamiento, Contratación, Desempeño, Estrategia, Modelos
- 33 formatos TH interactivos
- Auto-llenado en cascada: cuando analizas HVs, se llenan automáticamente
  TH-03 (HV), TH-04 (Matriz), TH-06 (Tracker), TH-09 (Chequeo Documentos)
- Banco de Talentos para candidatos descartados
- Cabecera editable con normas APA (Código, Versión, Fecha, Página,
  Elaborado por, Revisado por, Aprobado por)

### TH-03 Hoja de Vida (3 botones)
1. **✍️ Crear Hoja de Vida** — formulario ATS guiado
2. **🤖 Crear con IA** — la IA genera una HV completa desde cero
3. **📤 Subir Hojas de Vida** — acepta Word, PDF, fotos, Excel
   (análisis IA automático)

### Tab "Formatos" (descargas)
- 19 formatos completados listos para descargar
- Formato preferido: Word / PDF / Excel
- Todos incluyen: logo como marca de agua, normas APA, numeración de páginas
- Descarga individual o ZIP completo

---

## 🛠️ Solución de problemas

### "Error: Cannot find module 'sharp'"
```bash
bun add sharp
# o
npm install sharp
```

### "Error: ZAI_API_KEY not set"
El análisis de HV con IA requiere una API key de Z.ai.
Sin ella, el resto del aplicativo funciona normalmente.

### Los datos se perdieron
1. Si tienes un archivo `.sigth` → botón "Restaurar respaldo"
2. Si tienes el código `TH-XXXX-XXXX` → solo funciona en el mismo navegador
3. Si no tienes nada → los datos se perdieron (por eso es importante descargar
   el respaldo frecuentemente)

### El modal de empresa no se cierra
- Llena el campo "Nombre de la empresa *" (es obligatorio)
- Click en "Guardar empresa"

---

## 🌐 Despliegue en Netlify

El aplicativo incluye `netlify.toml` y `.nvmrc` ya configurados.

### Pasos
1. https://app.netlify.com/start → "Import an existing project" → GitHub
2. Selecciona el repo `LKIRO-IRIS/trabajos-talento-humano`
3. **Base directory**: `1. ENTREGABLE_INSTRUCTORA/1. Aplicativo_Reflejos_Brillantes`
4. Build command y publish directory se autodetectan desde `netlify.toml`
5. (Opcional) Configura las variables de entorno `ZAI_API_KEY` y
   `ZAI_BASE_URL` en Site settings → Environment variables
6. Deploy → URL final: `https://<nombre>.netlify.app`

### Sin API key en Netlify
Las funciones de IA fallarán con error claro, pero los 33 formatos,
archivador, respaldos, multi-empresa y árbol 3D siguen funcionando.

---

## 📞 Soporte

Este aplicativo fue construido como proyecto educativo SENA.
Para modificaciones, contacta al desarrollador.

---

## 📜 Versión

**v1.0** — Octubre 2025
- 33 formatos TH sistematizados
- Análisis HV con IA visual (VLM)
- Generador HV con IA (LLM)
- Sistema de respaldo anti-pérdida
- Adaptador de páginas web
- Multi-empresa dinámica
- Cabecera editable con normas APA
- Banco de Talentos
- Auto-llenado en cascada

---

¡Listo para usar! 🎉

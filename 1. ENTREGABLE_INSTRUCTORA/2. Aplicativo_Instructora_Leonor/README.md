# App Leonor — Evaluación de Desempeño Laboral

Aplicativo web independiente (Next.js 16) para la gestión y evaluación del
desempeño laboral, con persistencia en `localStorage` (sin base de datos).

Diseñado para la instructora **Leonor**. Permite evaluar empleados con criterios
ponderados, visualizar resultados con gráficos interactivos, generar planes de
mejora automáticos y exportar reportes a PDF / Excel.

---

## Características principales

- **Multi-usuario** con login/registro y dos roles:
  - `Administrador`: configura criterios, colores, logo, usuarios y datos.
  - `Evaluador`: crea evaluaciones; ve únicamente las suyas.
- **Criterios modificables**: agregar, eliminar, renombrar y cambiar pesos.
  Validación de que los pesos sumen 100%.
- **Escala 1-100** con calificación cualitativa automática:
  - 90-100 → **Sobresaliente** (verde)
  - 75-89 → **Satisfactorio** (azul)
  - 60-74 → **Necesita Mejora** (ámbar)
  - < 60 → **Insatisfactorio** (rojo)
- **Dashboard** con KPIs, gráfico de barras, gráfico circular, gráfico radar y
  ranking de mejores/peores empleados.
- **Formulario de evaluación** con sliders visuales y auto-cálculo en tiempo real.
- **Tabla comparativa** con búsqueda, filtros por departamento/calificación y
  ordenamiento por columna.
- **Ficha individual del empleado** con avatar, radar personal, historial y
  comentarios.
- **Plan de mejora automático** cuando el empleado queda en *Necesita Mejora* o
  *Insatisfactorio*, con acciones recomendadas según el criterio más bajo,
  fecha de seguimiento a 30 días y estado (Pendiente / En curso / Completado).
- **Configuración de empresa**: nombre, logo (upload o URL) y colores
  primario/secundario personalizables (aplicados a toda la app en vivo).
- **Modo claro/oscuro**.
- **Exportación** a PDF (ficha individual y reporte comparativo) y Excel.
- **Backup/Restore** de datos en JSON.
- **Responsive**: móvil, tablet y escritorio.
- **Datos de ejemplo precargados** (3 empleados) en el primer inicio.

---

## Instalación y ejecución

Requisitos: **Node.js 20+** y **npm**.

```bash
cd /home/z/my-project/scripts/app-leonor

# Instalar dependencias
npm install --legacy-peer-deps

# Levantar el servidor de desarrollo (http://localhost:3000)
npm run dev

# Compilar para producción
npm run build

# Iniciar en modo producción
npm start
```

> **Importante:** este proyecto es **independiente** del proyecto principal
> ubicado en `/home/z/my-project`. No usa `bun`, no usa Prisma ni bases de
> datos: toda la información se guarda en el `localStorage` del navegador.

---

## Usuario administrador por defecto

```
Usuario:  admin
Clave:    admin123
```

Los usuarios que se registran desde la pantalla de login obtienen el rol
**Evaluador**. Solo el administrador puede acceder a la configuración del
sistema.

---

## Datos de ejemplo precargados

Al primer inicio se cargan automáticamente 3 empleados con sus evaluaciones:

| Empleado         | Departamento | Puntuación | Calificación       |
|------------------|--------------|------------|--------------------|
| Carlos Pérez     | Ventas       | 88.5       | Satisfactorio      |
| María Gómez      | Finanzas     | 90.5       | Sobresaliente      |
| Juan Rodríguez   | Operaciones  | 69.5       | Necesita Mejora    |

Juan Rodríguez incluye un **plan de mejora automático** generado por estar en
el rango de "Necesita Mejora".

---

## Estructura del proyecto

```
src/
├── app/
│   ├── layout.tsx              ← Layout raíz (ThemeProvider, AuthProvider, Toaster)
│   ├── page.tsx                ← Landing / Login / Registro
│   ├── globals.css             ← Tema claro/oscuro + variables de marca
│   ├── dashboard/page.tsx      ← Dashboard principal
│   ├── evaluar/page.tsx        ← Formulario de evaluación
│   ├── empleados/page.tsx      ← Tabla comparativa
│   ├── empleado/[id]/page.tsx  ← Ficha individual del empleado
│   ├── configuracion/page.tsx  ← Configuración (solo admin)
│   └── api/
│       ├── export-pdf/route.ts   ← Genera PDF (ficha + comparativo)
│       └── export-excel/route.ts ← Genera Excel comparativo
├── components/
│   ├── ui/                     ← Componentes shadcn/ui (New York)
│   ├── auth/auth-context.tsx
│   ├── layout/                 ← header, sidebar, main-layout
│   ├── dashboard/              ← kpi-card, bar/pie/radar charts
│   ├── evaluacion/             ← evaluation-form, slider-criterio, resultado-preview
│   ├── empleado/               ← employee-card, employee-detail, improvement-plan
│   └── config/                 ← criterios-config, empresa-config
├── lib/
│   ├── types.ts                ← Tipos TypeScript
│   ├── evaluacion.ts           ← Cálculos (puntuación, calificación, plan)
│   ├── storage.ts              ← Persistencia localStorage
│   ├── auth.ts                 ← Login/registro/usuarios
│   ├── default-data.ts         ← Datos de ejemplo + config por defecto
│   └── utils.ts                ← Helpers (cn, formatScore, colores, etc.)
└── hooks/
    ├── use-auth.ts
    ├── use-evaluaciones.ts
    ├── use-config.ts
    ├── use-mobile.ts
    └── use-toast.ts
```

---

## Configuración de criterios

Desde **Configuración → Criterios** (solo admin) puedes:

1. Editar el nombre y la descripción de cada criterio.
2. Cambiar el peso (porcentaje) de cada criterio.
3. Agregar nuevos criterios.
4. Eliminar criterios existentes.
5. Usar el botón **"Distribuir 100%"** para repartir los pesos proporcionalmente.

La barra de validación muestra si los pesos suman 100%. Recuerda hacer clic en
**Guardar cambios** para aplicar la configuración.

Los criterios por defecto son:

| Criterio                        | Peso |
|---------------------------------|------|
| Evaluación de Objetivos         | 50%  |
| Competencias Blandas            | 30%  |
| Asistencia y Puntualidad        | 20%  |

---

## Configuración de colores y logo

Desde **Configuración → Empresa** (solo admin):

- **Nombre de la empresa**: se muestra en el header y el título del documento.
- **Logo**: sube una imagen (hasta 1MB) o pega una URL.
- **Color primario** y **secundario**: se aplican en vivo a botones, encabezados
  y gradientes de toda la aplicación.
- **Paletas sugeridas**: selección rápida de combinaciones predefinidas.

Los cambios se guardan al hacer clic en **Guardar cambios** y se reflejan
inmediatamente en toda la app.

---

## Lógica de cálculo

```
puntuacionFinal = Σ(puntaje_criterio × peso_criterio) / Σ(pesos)
```

La calificación cualitativa se asigna según los rangos definidos. Cuando la
calificación es **Necesita Mejora** o **Insatisfactorio**, se genera un plan de
mejora con:

- Acciones recomendadas según el criterio más bajo.
- Fecha de seguimiento a 30 días.
- Responsable del acompañamiento (el evaluador por defecto).
- Estado inicial: *Pendiente*.

---

## Exportación

- **Excel** (`/api/export-excel`): tabla comparativa de empleados con promedio,
  última calificación y número de evaluaciones.
- **PDF individual** (`/api/export-pdf` con `tipo: "empleado"`): ficha del
  empleado con historial, desglose por criterio, comentarios y plan de mejora.
- **PDF comparativo** (`/api/export-pdf` con `tipo: "comparativo"`): reporte
  general de todos los empleados.

Las rutas API reciben los datos por `POST` (pues `localStorage` solo existe en
el navegador) y devuelven el archivo generado.

---

## Backup y restore

Desde **Configuración → Datos**:

- **Exportar JSON**: descarga un backup completo de usuarios, empleados,
  evaluaciones y configuración.
- **Importar JSON**: restaura los datos desde un archivo de backup.
- **Reiniciar datos**: restaura los 3 empleados de ejemplo y la configuración
  por defecto (zona de peligro).

---

## Despliegue en Netlify

El archivo `netlify.toml` está configurado para desplegar con el plugin oficial
`@netlify/plugin-nextjs`. No se usa `output: "standalone"` para evitar
problemas de compatibilidad.

```bash
npm run build
# El directorio .next se publica automáticamente
```

---

## Limitaciones

- La persistencia es **por navegador** (`localStorage`): los datos no se sincronizan
  entre dispositivos. Usa Exportar/Importar JSON para transferir datos.
- Las contraseñas se guardan en texto plano (solo para fines académicos; en
  producción se debería usar un hash + backend).
- Los reportes PDF/Excel se generan a partir de los datos enviados por el cliente
  (no acceden a `localStorage` desde el servidor).

---

## Stack tecnológico

- **Next.js 16** (App Router, Turbopack)
- **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui** (estilo New York)
- **Recharts** (gráficos)
- **lucide-react** (iconos)
- **next-themes** (modo claro/oscuro)
- **sonner** (notificaciones toast)
- **jsPDF** + **jspdf-autotable** (generación de PDF)
- **SheetJS (xlsx)** (generación de Excel)
- **localStorage** (persistencia, sin base de datos)

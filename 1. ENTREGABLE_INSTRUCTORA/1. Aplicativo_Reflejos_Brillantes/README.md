# 🌳 Aplicativo Reflejos Brillantes 3D — Árbol de Talento Humano

## 📋 Descripción

Aplicativo web con escena 3D interactiva que representa los 7 procesos de Talento Humano
como ramas de un árbol, con botellas reciclables colgando que contienen los documentos.

Al hacer clic en una botella, entras DENTRO de ella y ves los productos ecológicos
de Reflejos Brillantes S.A.S. flotando (limpiador, detergente, desinfectante, etc.).

## 🎨 Características

- 🌳 Árbol 3D realista con 7 ramas de colores
- 🍼 20 botellas transparentes con códigos TH-FR-XX y TH-MD-XX
- 🔍 Buscador integrado en el tronco del árbol
- 🌧️ Lluvia con 2000 partículas azules
- 💧 Cascada de fondo con efectos brillantes
- 🌫️ Niebla volumétrica suave
- 🔊 Sonido ambiental de lluvia (Web Audio API) con botón mute
- 🍼 Vista dentro de la botella: 6 productos ecológicos flotando
- 🎥 Cámara fija (no se mueve con mouse)

## 🚀 Cómo ejecutar

```bash
# Instalar dependencias
bun install

# Ejecutar en modo desarrollo
bun run dev

# Abrir en el navegador
# http://localhost:3000/arbol
```

## 📁 Estructura

```
Aplicativo_Reflejos_Brillantes_3D/
├── src/
│   ├── app/
│   │   └── arbol/
│   │       └── page.tsx          ← Página del árbol 3D
│   └── components/
│       └── sigth/
│           └── Arbol3DScene.tsx  ← Escena 3D principal
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

## 🎯 7 Procesos con colores

| Proceso | Color | Documentos |
|---|---|---|
| Selección | 🟢 Verde lima (#92D050) | 6 botellas |
| Contratación | 🔵 Azul oscuro (#2C3E50) | 3 botellas |
| Inducción | 🟡 Dorado (#B8941F) | 3 botellas |
| Capacitación | 🟣 Morado (#7B2D8B) | 2 botellas |
| Desempeño | 🟠 Naranja (#FF9800) | 2 botellas |
| Bienestar | 🔴 Vino (#6B1F2E) | 1 botella |
| Retiro | ⚪ Gris (#7F8C8D) | 3 botellas |

## 🌿 Productos ecológicos dentro de la botella

Del catálogo oficial de Reflejos Brillantes S.A.S.:

1. Limpiador Multiusos (500ml) — Verde
2. Detergente Líquido (1L) — Amarillo
3. Desinfectante Natural (2L) — Verde claro
4. Limpiavidrios Ecológico (500ml) — Azul
5. Pasta Limpiadora (500g) — Gris/Blanco
6. Jabón Líquido Manos (500ml) — Naranja

## 🛠️ Tecnologías

- Next.js 16
- React Three Fiber (Three.js para React)
- @react-three/drei (componentes 3D)
- TypeScript
- Tailwind CSS

## 📌 Estado

✅ Fase 1 completada: Escena 3D base con árbol, ramas, botellas, lluvia, cascada, niebla
✅ Fase 2 completada: Vista dentro de la botella con productos ecológicos
⏳ Fase 3 pendiente: Clic directo en botellas 3D (sin botón demo)
⏳ Fase 4 pendiente: Conectar documentos reales a cada botella

## 📝 Nota

Empresa simulada con fines pedagógicos SENA.
Reflejos Brillantes S.A.S. — Productos ecológicos de limpieza.

"use client";

import dynamic from "next/dynamic";

// Cargar la escena 3D solo en el cliente (Three.js requiere window)
const Arbol3DScene = dynamic(
  () => import("@/components/sigth/Arbol3DScene").then((m) => m.Arbol3DScene),
  { ssr: false, loading: () => <div style={{ width: "100vw", height: "100vh", background: "#0a1520", display: "flex", alignItems: "center", justifyContent: "center", color: "#92D050" }}>Cargando árbol 3D...</div> }
);

export default function ArbolPage() {
  return <Arbol3DScene />;
}

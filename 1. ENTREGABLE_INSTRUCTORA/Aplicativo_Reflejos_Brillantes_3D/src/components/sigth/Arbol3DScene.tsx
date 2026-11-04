"use client";

import * as React from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Text,
  Sphere,
  Cylinder,
  Cone,
  Torus,
  Sparkles,
  Cloud,
  Clouds,
  Float,
  Environment,
  Lightformer,
  Html,
} from "@react-three/drei";
import * as THREE from "three";

// ============ CONFIGURACIÓN ============
const PROCESOS = [
  {
    id: "seleccion",
    nombre: "Selección",
    color: "#92D050",
    colorRama: "#4F8C28",
    angulo: 0,
    documentos: [
      { codigo: "TH-FR-01", nombre: "Requisición de personal", tipo: "Formato" },
      { codigo: "TH-FR-02", nombre: "Perfil y descripción de cargo", tipo: "Formato" },
      { codigo: "TH-MD-01", nombre: "Convocatoria", tipo: "Documento" },
      { codigo: "TH-FR-03", nombre: "Hoja de vida estandarizada", tipo: "Formato" },
      { codigo: "TH-FR-04", nombre: "Guía de entrevista estructurada", tipo: "Formato" },
      { codigo: "TH-FR-05", nombre: "Verificación de referencias", tipo: "Formato" },
    ],
  },
  {
    id: "contratacion",
    nombre: "Contratación",
    color: "#2C3E50",
    colorRama: "#1B2A38",
    angulo: 51.4,
    documentos: [
      { codigo: "TH-FR-06", nombre: "Remisión a exámenes médicos", tipo: "Formato" },
      { codigo: "TH-FR-07", nombre: "Lista de chequeo de documentos", tipo: "Formato" },
      { codigo: "TH-MD-02", nombre: "Contrato de trabajo", tipo: "Documento" },
    ],
  },
  {
    id: "induccion",
    nombre: "Inducción",
    color: "#B8941F",
    colorRama: "#8B6914",
    angulo: 102.8,
    documentos: [
      { codigo: "TH-MD-03", nombre: "Programa de inducción", tipo: "Documento" },
      { codigo: "TH-FR-08", nombre: "Lista de chequeo de inducción", tipo: "Formato" },
      { codigo: "TH-FR-09", nombre: "Encuesta de satisfacción", tipo: "Formato" },
    ],
  },
  {
    id: "capacitacion",
    nombre: "Capacitación",
    color: "#7B2D8B",
    colorRama: "#5A1F66",
    angulo: 154.2,
    documentos: [
      { codigo: "TH-FR-10", nombre: "Plan anual de capacitación", tipo: "Formato" },
      { codigo: "TH-FR-11", nombre: "Control de asistencia", tipo: "Formato" },
    ],
  },
  {
    id: "desempeno",
    nombre: "Desempeño",
    color: "#FF9800",
    colorRama: "#E65100",
    angulo: 205.7,
    documentos: [
      { codigo: "TH-FR-12", nombre: "Evaluación del desempeño", tipo: "Formato" },
      { codigo: "TH-FR-13", nombre: "Plan de mejoramiento", tipo: "Formato" },
    ],
  },
  {
    id: "bienestar",
    nombre: "Bienestar",
    color: "#6B1F2E",
    colorRama: "#4A1520",
    angulo: 257.1,
    documentos: [
      { codigo: "TH-MD-04", nombre: "Plan de bienestar laboral", tipo: "Documento" },
    ],
  },
  {
    id: "retiro",
    nombre: "Retiro",
    color: "#7F8C8D",
    colorRama: "#5A6566",
    angulo: 308.5,
    documentos: [
      { codigo: "TH-MD-05", nombre: "Carta de terminación", tipo: "Documento" },
      { codigo: "TH-FR-14", nombre: "Paz y salvo", tipo: "Formato" },
      { codigo: "TH-FR-15", nombre: "Entrevista de retiro", tipo: "Formato" },
    ],
  },
];

// Productos ecológicos de Reflejos Brillantes (del catálogo oficial)
const PRODUCTOS_ECOLOGICOS = [
  { nombre: "Limpiador Multiusos", color: "#4CAF50", forma: "botella", descripcion: "500 ml · Desinfecta todas las superficies" },
  { nombre: "Detergente Líquido", color: "#FFC107", forma: "botella_grande", descripcion: "1 Litro · Biodegradable para ropa" },
  { nombre: "Desinfectante Natural", color: "#8BC34A", forma: "galon", descripcion: "2 Litros · Elimina bacterias" },
  { nombre: "Limpiavidrios Ecológico", color: "#03A9F4", forma: "botella", descripcion: "500 ml · Vidrios sin manchas" },
  { nombre: "Pasta Limpiadora", color: "#E0E0E0", forma: "tubo", descripcion: "500 g · Superficies difíciles" },
  { nombre: "Jabón Líquido Manos", color: "#FF9800", forma: "botella", descripcion: "500 ml · Hidrata e ilumina" },
];

// ============ UTIL: verifica si una botella coincide con la búsqueda ============
function coincideBusqueda(doc: any, busqueda: string): boolean {
  if (!busqueda.trim()) return true;
  const q = busqueda.toLowerCase().trim();
  return (
    doc.codigo.toLowerCase().includes(q) ||
    doc.nombre.toLowerCase().includes(q) ||
    doc.tipo.toLowerCase().includes(q)
  );
}

// Cuenta total de coincidencias para mostrar en el buscador
function contarCoincidencias(busqueda: string): number {
  if (!busqueda.trim()) return 0;
  let count = 0;
  PROCESOS.forEach((p) => p.documentos.forEach((d) => {
    if (coincideBusqueda(d, busqueda)) count++;
  }));
  return count;
}

// ============ VISTA DENTRO DE LA BOTELLA ============

function ProductoEcologico({ producto, posicion, idx }: { producto: any; posicion: [number, number, number]; idx: number }) {
  const ref = React.useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ref.current) {
      // Flotar suavemente
      ref.current.position.y = posicion[1] + Math.sin(state.clock.elapsedTime * 0.5 + idx) * 0.3;
      ref.current.rotation.y = state.clock.elapsedTime * 0.2;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3 + idx) * 0.1;
    }
  });

  return (
    <group ref={ref} position={posicion}>
      {/* Cuerpo del producto (botella) */}
      <Cylinder args={[0.3, 0.3, 0.8, 16]}>
        <meshPhysicalMaterial
          color={producto.color}
          transparent
          opacity={0.7}
          transmission={0.5}
          roughness={0.2}
          metalness={0.1}
          emissive={producto.color}
          emissiveIntensity={0.2}
        />
      </Cylinder>

      {/* Tapón */}
      <Cylinder args={[0.15, 0.15, 0.12, 12]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color={producto.color} metalness={0.5} roughness={0.3} />
      </Cylinder>

      {/* Etiqueta con el nombre */}
      <Html position={[0, 0, 0.32]} center distanceFactor={6}>
        <div
          style={{
            background: `${producto.color}DD`,
            color: "#fff",
            padding: "3px 8px",
            borderRadius: "6px",
            fontSize: "10px",
            fontFamily: "system-ui",
            whiteSpace: "nowrap",
            boxShadow: `0 0 12px ${producto.color}88`,
            border: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          {producto.nombre}
        </div>
      </Html>

      {/* Etiqueta con descripción */}
      <Html position={[0, -0.6, 0]} center distanceFactor={8}>
        <div
          style={{
            color: "#A5D6FF",
            fontSize: "8px",
            fontFamily: "system-ui",
            whiteSpace: "nowrap",
            opacity: 0.7,
          }}
        >
          {producto.descripcion}
        </div>
      </Html>
    </group>
  );
}

// ============ ANIMACIÓN FLY-IN DE CÁMARA ============
// Animación suave desde la posición actual hacia el centro de la botella.
function CameraFlyIn({ posicionBotella, onComplete }: { posicionBotella: [number, number, number]; onComplete: () => void }) {
  const { camera } = useThree();
  const completado = React.useRef(false);

  // Objetivo: posición ligeramente desplazada de la botella, mirando hacia ella
  const targetPos = React.useMemo(() => {
    return new THREE.Vector3(posicionBotella[0] * 0.4, posicionBotella[1] + 0.3, posicionBotella[2] * 0.4 + 4);
  }, [posicionBotella]);

  // Posición inicial de la cámara al iniciar la animación (la del árbol)
  const startPos = React.useMemo(() => new THREE.Vector3(0, 2, 12), []);

  useFrame(() => {
    if (completado.current) return;

    // Lerp suave de la cámara hacia el objetivo
    camera.position.lerp(targetPos, 0.06);

    // Mirar hacia la botella
    const lookAt = new THREE.Vector3(posicionBotella[0], posicionBotella[1], posicionBotella[2]);
    camera.lookAt(lookAt);

    // Cuando estemos suficientemente cerca, completar
    if (camera.position.distanceTo(targetPos) < 0.4) {
      completado.current = true;
      onComplete();
    }
  });

  return null;
}

function VistaDentroBotella({ documento, posicionBotella, onVolver }: { documento: any; posicionBotella: [number, number, number]; onVolver: () => void }) {
  const [animacionLista, setAnimacionLista] = React.useState(false);

  return (
    <>
      {/* Animación fly-in de la cámara */}
      {!animacionLista && (
        <CameraFlyIn posicionBotella={posicionBotella} onComplete={() => setAnimacionLista(true)} />
      )}

      {/* Iluminación interior */}
      <ambientLight intensity={0.6} color="#92D050" />
      <pointLight position={[0, 5, 0]} intensity={2} color="#4FC3F7" />
      <pointLight position={[3, 0, 3]} intensity={1} color="#92D050" />
      <pointLight position={[-3, 0, -3]} intensity={1} color="#B8941F" />

      {/* Fondo dentro de la botella — verde ecológico */}
      <color attach="background" args={["#0a1f0a"]} />
      <fog attach="fog" args={["#0a1f0a", 5, 20]} />

      {/* Paredes de la botella (efecto de estar dentro) */}
      <Cylinder args={[3, 3, 8, 32]} position={[0, 0, 0]}>
        <meshPhysicalMaterial
          color="#E0F7FA"
          transparent
          opacity={0.15}
          transmission={0.9}
          roughness={0.1}
          side={THREE.BackSide}
        />
      </Cylinder>

      {/* Productos ecológicos flotando */}
      {PRODUCTOS_ECOLOGICOS.map((prod, idx) => {
        const angle = (idx / PRODUCTOS_ECOLOGICOS.length) * Math.PI * 2;
        const radius = 1.8;
        return (
          <ProductoEcologico
            key={idx}
            producto={prod}
            posicion={[
              Math.cos(angle) * radius,
              Math.sin(idx * 0.8) * 0.8,
              Math.sin(angle) * radius,
            ]}
            idx={idx}
          />
        );
      })}

      {/* Burbujas flotando hacia arriba */}
      <Sparkles count={60} scale={[5, 5, 5]} size={4} speed={0.5} color="#4FC3F7" opacity={0.6} />

      {/* Partículas verdes (eco) */}
      <Sparkles count={40} scale={[4, 4, 4]} size={2} speed={0.3} color="#92D050" opacity={0.4} />

      {/* Información del documento seleccionado */}
      <Html position={[0, 3.5, 0]} center>
        <div
          style={{
            background: "rgba(10, 31, 10, 0.9)",
            border: "2px solid #92D050",
            borderRadius: "16px",
            padding: "16px 24px",
            textAlign: "center",
            backdropFilter: "blur(8px)",
            boxShadow: "0 0 30px rgba(146, 208, 80, 0.4)",
            maxWidth: "400px",
            opacity: animacionLista ? 1 : 0,
            transition: "opacity 0.6s ease-in",
          }}
        >
          <div style={{ color: "#92D050", fontSize: "12px", fontFamily: "monospace", marginBottom: "4px" }}>
            {documento.codigo}
          </div>
          <div style={{ color: "#fff", fontSize: "18px", fontWeight: "bold", marginBottom: "4px" }}>
            {documento.nombre}
          </div>
          <div style={{ color: "#A5D6FF", fontSize: "12px", marginBottom: "12px" }}>
            Tipo: {documento.tipo} · Estado: Disponible
          </div>
          <div style={{ color: "#92D050", fontSize: "11px", marginBottom: "12px" }}>
            🌿 Reflejos Brillantes S.A.S. — Productos ecológicos de limpieza
          </div>
          <button
            onClick={onVolver}
            style={{
              background: "#92D050",
              color: "#1B1B1B",
              border: "none",
              padding: "8px 20px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "bold",
              fontFamily: "system-ui",
            }}
          >
            ← Volver al árbol
          </button>
        </div>
      </Html>
    </>
  );
}

// ============ ESCENA PRINCIPAL ============

function TroncoArbol({ busqueda, setBusqueda }: { busqueda: string; setBusqueda: (s: string) => void }) {
  const coincidencias = contarCoincidencias(busqueda);
  const totalDocs = PROCESOS.reduce((acc, p) => acc + p.documentos.length, 0);

  return (
    <group position={[0, -2, 0]}>
      {/* Tronco principal */}
      <Cylinder args={[0.8, 1.2, 6, 12]} position={[0, 1, 0]}>
        <meshStandardMaterial color="#5D4037" roughness={0.9} />
      </Cylinder>

      {/* Base del tronco (raíces) */}
      <Cylinder args={[1.3, 1.5, 0.8, 12]} position={[0, -2.2, 0]}>
        <meshStandardMaterial color="#4E342E" roughness={0.95} />
      </Cylinder>

      {/* Buscador FUNCIONAL en el tronco */}
      <Html position={[0, 1.5, 0.85]} center>
        <div
          style={{
            background: "rgba(62, 39, 35, 0.85)",
            border: `2px solid ${busqueda ? "#FFC107" : "#92D050"}`,
            borderRadius: "12px",
            padding: "10px 16px",
            backdropFilter: "blur(4px)",
            boxShadow: busqueda
              ? "0 0 20px rgba(255, 193, 7, 0.5)"
              : "0 0 20px rgba(146, 208, 80, 0.4)",
            minWidth: "220px",
          }}
        >
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar documento (TH-FR-01, convocatoria...)"
            style={{
              background: "transparent",
              border: "none",
              color: busqueda ? "#FFC107" : "#92D050",
              fontSize: "13px",
              fontFamily: "monospace",
              outline: "none",
              width: "100%",
              caretColor: busqueda ? "#FFC107" : "#92D050",
            }}
          />
          {/* Indicador de coincidencias */}
          {busqueda && (
            <div
              style={{
                marginTop: "6px",
                paddingTop: "6px",
                borderTop: "1px solid rgba(146, 208, 80, 0.3)",
                color: "#FFC107",
                fontSize: "10px",
                fontFamily: "system-ui",
              }}
            >
              {coincidencias > 0
                ? `🔍 ${coincidencias} de ${totalDocs} botellas coinciden`
                : "❌ Sin resultados — prueba otro término"}
            </div>
          )}
          {/* Botón limpiar */}
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                background: "transparent",
                border: "none",
                color: "#FFC107",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
              title="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>
      </Html>
    </group>
  );
}

function Rama({ proceso, angulo, onBotellaClick, busqueda }: { proceso: any; angulo: number; onBotellaClick: (doc: any, pos: [number, number, number]) => void; busqueda: string }) {
  const rad = (angulo * Math.PI) / 180;
  const longitudRama = 3.5;

  // Posición donde termina la rama
  const endX = Math.cos(rad) * longitudRama;
  const endY = 2.5;
  const endZ = Math.sin(rad) * longitudRama;

  return (
    <group>
      {/* Rama principal */}
      <Cylinder
        args={[0.15, 0.25, longitudRama, 8]}
        position={[endX / 2, endY, endZ / 2]}
        rotation={[0, -rad, Math.PI / 2 - 0.3]}
      >
        <meshStandardMaterial color={proceso.colorRama} roughness={0.8} />
      </Cylinder>

      {/* Pequeñas ramitas */}
      {proceso.documentos.map((doc: any, idx: number) => {
        const offset = (idx - (proceso.documentos.length - 1) / 2) * 0.4;
        const pos: [number, number, number] = [
          endX + Math.cos(rad) * offset,
          endY + 0.2 - idx * 0.15,
          endZ + Math.sin(rad) * offset,
        ];
        return (
          <Botella
            key={doc.codigo}
            doc={doc}
            posicion={pos}
            color={proceso.color}
            onClick={() => onBotellaClick(doc, pos)}
            busqueda={busqueda}
          />
        );
      })}

      {/* Hoja de la rama */}
      <Sphere args={[0.3, 8, 8]} position={[endX, endY + 0.3, endZ]}>
        <meshStandardMaterial color={proceso.color} transparent opacity={0.3} emissive={proceso.color} emissiveIntensity={0.2} />
      </Sphere>

      {/* Etiqueta del proceso */}
      <Text
        position={[endX * 1.3, endY + 0.8, endZ * 1.3]}
        fontSize={0.35}
        color={proceso.color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {proceso.nombre}
      </Text>
    </group>
  );
}

function Botella({ doc, posicion, color, onClick, busqueda }: { doc: any; posicion: [number, number, number]; color: string; onClick: () => void; busqueda: string }) {
  const [hovered, setHovered] = React.useState(false);
  const ref = React.useRef<THREE.Group>(null);

  // Estado de coincidencia con la búsqueda
  const hayBusqueda = busqueda.trim().length > 0;
  const coincide = coincideBusqueda(doc, busqueda);

  useFrame((state) => {
    if (ref.current) {
      // Movimiento sutil de las botellas (viento)
      if (!hovered) {
        ref.current.rotation.z = Math.sin(state.clock.elapsedTime + posicion[0]) * 0.05;
      }

      // Si coincide con la búsqueda, pulse suave para llamar atención
      if (hayBusqueda && coincide) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.08;
        ref.current.scale.setScalar(pulse);
      } else if (hayBusqueda && !coincide) {
        // Atenuar las que no coinciden
        ref.current.scale.setScalar(0.85);
      } else {
        ref.current.scale.setScalar(hovered ? 1.15 : 1);
      }
    }
  });

  return (
    <group
      ref={ref}
      position={posicion}
      onClick={(e) => {
        e.stopPropagation();
        // Solo permitir clic si coincide con la búsqueda (o no hay búsqueda)
        if (!hayBusqueda || coincide) {
          onClick();
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!hayBusqueda || coincide) {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      {/* Cuerpo de la botella (transparente) */}
      <Cylinder args={[0.15, 0.15, 0.5, 16]}>
        <meshPhysicalMaterial
          color="white"
          transparent
          opacity={
            hayBusqueda && !coincide
              ? 0.08 // casi invisible si no coincide
              : hovered
              ? 0.6
              : 0.3
          }
          roughness={0.1}
          transmission={0.9}
          thickness={0.5}
          ior={1.5}
          emissive={
            hayBusqueda && coincide
              ? "#FFC107" // amarillo destacado si coincide
              : hovered
              ? color
              : "#000000"
          }
          emissiveIntensity={
            hayBusqueda && coincide ? 0.5 : hovered ? 0.3 : 0
          }
        />
      </Cylinder>

      {/* Cuello de la botella */}
      <Cylinder args={[0.08, 0.12, 0.15, 12]} position={[0, 0.32, 0]}>
        <meshPhysicalMaterial
          color="white"
          transparent
          opacity={hayBusqueda && !coincide ? 0.05 : 0.3}
          transmission={0.9}
          roughness={0.1}
        />
      </Cylinder>

      {/* Tapón */}
      <Cylinder args={[0.09, 0.09, 0.08, 12]} position={[0, 0.42, 0]}>
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.5}
          emissive={hayBusqueda && coincide ? "#FFC107" : "#000000"}
          emissiveIntensity={hayBusqueda && coincide ? 0.4 : 0}
        />
      </Cylinder>

      {/* Etiqueta con el código */}
      <Html position={[0, 0, 0.16]} center distanceFactor={8} pointerEvents="none">
        <div
          style={{
            background:
              hayBusqueda && coincide
                ? "#FFC107"
                : hovered
                ? color
                : "rgba(0,0,0,0.7)",
            color:
              hayBusqueda && coincide
                ? "#1B1B1B"
                : hovered
                ? "#000"
                : "#fff",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "9px",
            fontFamily: "monospace",
            whiteSpace: "nowrap",
            border: `1px solid ${hayBusqueda && coincide ? "#FFC107" : color}`,
            cursor: "pointer",
            transition: "all 0.2s",
            pointerEvents: "none",
            opacity: hayBusqueda && !coincide ? 0.3 : 1,
            boxShadow:
              hayBusqueda && coincide
                ? "0 0 12px rgba(255, 193, 7, 0.8)"
                : "none",
          }}
        >
          {doc.codigo}
        </div>
      </Html>
    </group>
  );
}

function Lluvia() {
  const ref = React.useRef<THREE.Points>(null);
  const count = 2000;

  const positions = React.useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 50;
      arr[i * 3 + 1] = Math.random() * 25;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return arr;
  }, []);

  useFrame(() => {
    if (ref.current) {
      const positions = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] -= 0.35;
        if (positions[i * 3 + 1] < -3) {
          positions[i * 3 + 1] = 22;
        }
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#4FC3F7" size={0.25} transparent opacity={0.9} sizeAttenuation />
    </points>
  );
}

function Cascada() {
  const ref = React.useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      // Mover la textura para simular caída de agua
      ref.current.position.y = 3 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });
  return (
    <group position={[0, 3, -8]}>
      {/* Plano principal de la cascada */}
      <mesh ref={ref}>
        <planeGeometry args={[8, 14]} />
        <meshStandardMaterial
          color="#4FC3F7"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          emissive="#0288D1"
          emissiveIntensity={0.5}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>
      {/* Brillos de agua */}
      <Sparkles count={50} scale={[8, 14, 0.5]} size={2} speed={0.8} color="#B3E5FC" />
    </group>
  );
}

function AudioControls() {
  const [muted, setMuted] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    // Audio generado con Web Audio API (lluvia + cascada)
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const bufferSize = 4096;
    const whiteNoise = audioContext.createScriptProcessor(bufferSize, 1, 1);

    whiteNoise.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.1; // ruido blanco suave
      }
    };

    const filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = muted ? 0 : 0.3;

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    return () => {
      whiteNoise.disconnect();
      filter.disconnect();
      gainNode.disconnect();
      audioContext.close();
    };
  }, [muted]);

  return (
    <Html position={[0, 0, 0]}>
      <button
        onClick={() => setMuted(!muted)}
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          background: "rgba(44, 62, 80, 0.9)",
          color: "#92D050",
          border: "2px solid #92D050",
          borderRadius: "50%",
          width: "48px",
          height: "48px",
          cursor: "pointer",
          fontSize: "20px",
          zIndex: 1000,
          backdropFilter: "blur(8px)",
        }}
        title={muted ? "Activar sonido" : "Silenciar"}
      >
        {muted ? "🔇" : "🔊"}
      </button>
    </Html>
  );
}

function EscenaArbol({
  documentoSeleccionado,
  setDocumentoSeleccionado,
  busqueda,
  setBusqueda,
  posicionBotellaSeleccionada,
  setPosicionBotellaSeleccionada,
}: {
  documentoSeleccionado: any;
  setDocumentoSeleccionado: (d: any) => void;
  busqueda: string;
  setBusqueda: (s: string) => void;
  posicionBotellaSeleccionada: [number, number, number] | null;
  setPosicionBotellaSeleccionada: (p: [number, number, number] | null) => void;
}) {
  // Si hay un documento seleccionado, mostrar la vista dentro de la botella
  if (documentoSeleccionado && posicionBotellaSeleccionada) {
    return (
      <VistaDentroBotella
        documento={documentoSeleccionado}
        posicionBotella={posicionBotellaSeleccionada}
        onVolver={() => {
          setDocumentoSeleccionado(null);
          setPosicionBotellaSeleccionada(null);
        }}
      />
    );
  }
  return (
    <>
      {/* Iluminación */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#92D050" />

      {/* Niebla */}
      <fog attach="fog" args={["#1a2332", 10, 30]} />

      {/* Fondo */}
      <color attach="background" args={["#0a1520"]} />

      {/* Tronco del árbol (con buscador funcional) */}
      <TroncoArbol busqueda={busqueda} setBusqueda={setBusqueda} />

      {/* 7 ramas con botellas */}
      {PROCESOS.map((proc) => (
        <Rama
          key={proc.id}
          proceso={proc}
          angulo={proc.angulo}
          onBotellaClick={(doc, pos) => {
            setPosicionBotellaSeleccionada(pos);
            setDocumentoSeleccionado(doc);
          }}
          busqueda={busqueda}
        />
      ))}

      {/* Cascada de fondo */}
      <Cascada />

      {/* Lluvia */}
      <Lluvia />

      {/* Nievebla suave */}
      <Sparkles count={80} scale={20} size={3} speed={0.3} color="#A5D6FF" opacity={0.4} />

      {/* Niebla volumétrica */}
      <Clouds material={THREE.MeshBasicMaterial}>
        <Cloud seed={1} segments={20} bounds={[10, 2, 10]} volume={8} color="#2C3E50" opacity={0.3} position={[0, 2, -5]} />
        <Cloud seed={2} segments={15} bounds={[8, 2, 8]} volume={6} color="#1B2A38" opacity={0.2} position={[-3, 5, -3]} />
      </Clouds>

      {/* Controles de audio */}
      <AudioControls />
    </>
  );
}

export function Arbol3DScene() {
  const [documentoSeleccionado, setDocumentoSeleccionado] = React.useState<any>(null);
  const [busqueda, setBusqueda] = React.useState("");
  const [posicionBotella, setPosicionBotella] = React.useState<[number, number, number] | null>(null);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
      <Canvas
        camera={{ position: [0, 2, 12], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <EscenaArbol
          documentoSeleccionado={documentoSeleccionado}
          setDocumentoSeleccionado={setDocumentoSeleccionado}
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          posicionBotellaSeleccionada={posicionBotella}
          setPosicionBotellaSeleccionada={setPosicionBotella}
        />
      </Canvas>

      {/* Overlay de título */}
      <div
        style={{
          position: "absolute",
          top: "30px",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          color: "#92D050",
          textShadow: "0 0 20px rgba(146, 208, 80, 0.5)",
          pointerEvents: "none",
          zIndex: 100,
        }}
      >
        <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0, letterSpacing: "0.05em" }}>
          Árbol de Talento Humano
        </h1>
        <p style={{ fontSize: "14px", color: "#A5D6FF", margin: "4px 0 0 0", opacity: 0.8 }}>
          Reflejos Brillantes SAS · Haz clic en una botella para explorar
        </p>
      </div>

      {/* Indicador de procesos */}
      <div
        style={{
          position: "absolute",
          bottom: "30px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: "800px",
          pointerEvents: "none",
          zIndex: 100,
        }}
      >
        {PROCESOS.map((proc) => {
          // Calcula cuántas botellas de este proceso coinciden con la búsqueda
          const totalProc = proc.documentos.length;
          const coincidenProc = busqueda.trim()
            ? proc.documentos.filter((d) => coincideBusqueda(d, busqueda)).length
            : totalProc;
          const activo = !busqueda.trim() || coincidenProc > 0;

          return (
            <div
              key={proc.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: activo ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.3)",
                padding: "4px 10px",
                borderRadius: "20px",
                backdropFilter: "blur(4px)",
                opacity: activo ? 1 : 0.4,
                transition: "all 0.3s",
              }}
            >
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: proc.color }} />
              <span style={{ color: "#fff", fontSize: "11px" }}>{proc.nombre}</span>
              <span style={{ color: "#999", fontSize: "10px" }}>
                ({coincidenProc}/{totalProc})
              </span>
            </div>
          );
        })}
      </div>

      {/* Botón de ayuda flotante (solo cuando no hay documento seleccionado) */}
      {!documentoSeleccionado && (
        <div
          style={{
            position: "absolute",
            top: "80px",
            right: "20px",
            background: "rgba(10, 21, 32, 0.85)",
            border: "1px solid #92D050",
            borderRadius: "12px",
            padding: "10px 14px",
            backdropFilter: "blur(8px)",
            color: "#92D050",
            fontSize: "11px",
            fontFamily: "system-ui",
            maxWidth: "220px",
            boxShadow: "0 0 15px rgba(146, 208, 80, 0.2)",
            zIndex: 100,
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "4px", fontSize: "12px" }}>💡 Cómo usar</div>
          <div style={{ color: "#A5D6FF", lineHeight: 1.4 }}>
            • <b>Clic</b> en una botella para entrar<br/>
            • <b>Buscador</b> en el tronco filtra por código o nombre<br/>
            • <b>Hover</b> resalta cada botella
          </div>
        </div>
      )}
    </div>
  );
}

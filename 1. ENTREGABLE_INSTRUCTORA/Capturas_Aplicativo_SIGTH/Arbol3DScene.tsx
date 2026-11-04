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

// Productos cosméticos de Reflejos Brillantes (ficticios)
const PRODUCTOS_COSMETICOS = [
  { nombre: "Crema Hidratante", color: "#F5E6D3", forma: "cilindro" },
  { nombre: "Labial Rosado", color: "#E91E63", forma: "cilindro_largo" },
  { nombre: "Jabón Artesanal", color: "#8BC34A", forma: "cubo" },
  { nombre: "Shampoo Natural", color: "#03A9F4", forma: "botella" },
  { nombre: "Mascarilla Facial", color: "#9C27B0", forma: "tubo" },
  { nombre: "Perfume Floral", color: "#FFC107", forma: "esfera" },
];

// ============ COMPONENTES 3D ============

function TroncoArbol() {
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

      {/* Textura del buscador en el tronco */}
      <Html position={[0, 1.5, 0.85]} center>
        <div
          style={{
            background: "rgba(62, 39, 35, 0.85)",
            border: "2px solid #92D050",
            borderRadius: "12px",
            padding: "10px 16px",
            backdropFilter: "blur(4px)",
            boxShadow: "0 0 20px rgba(146, 208, 80, 0.4)",
          }}
        >
          <input
            type="text"
            placeholder="Buscar documento..."
            style={{
              background: "transparent",
              border: "none",
              color: "#92D050",
              fontSize: "14px",
              fontFamily: "monospace",
              outline: "none",
              width: "180px",
            }}
          />
        </div>
      </Html>
    </group>
  );
}

function Rama({ proceso, angulo }: { proceso: any; angulo: number }) {
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
        const pos = [
          endX + Math.cos(rad) * offset,
          endY + 0.2 - idx * 0.15,
          endZ + Math.sin(rad) * offset,
        ];
        return <Botella key={doc.codigo} doc={doc} posicion={pos} color={proceso.color} />;
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

function Botella({ doc, posicion, color }: { doc: any; posicion: [number, number, number]; color: string }) {
  const [hovered, setHovered] = React.useState(false);
  const ref = React.useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ref.current && !hovered) {
      // Movimiento sutil de las botellas (viento)
      ref.current.rotation.z = Math.sin(state.clock.elapsedTime + posicion[0]) * 0.05;
    }
  });

  return (
    <group
      ref={ref}
      position={posicion}
      onClick={(e) => {
        e.stopPropagation();
        console.log("Click en botella:", doc.codigo);
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Cuerpo de la botella (transparente) */}
      <Cylinder args={[0.15, 0.15, 0.5, 16]}>
        <meshPhysicalMaterial
          color="white"
          transparent
          opacity={hovered ? 0.6 : 0.3}
          roughness={0.1}
          transmission={0.9}
          thickness={0.5}
          ior={1.5}
          emissive={hovered ? color : "#000000"}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </Cylinder>

      {/* Cuello de la botella */}
      <Cylinder args={[0.08, 0.12, 0.15, 12]} position={[0, 0.32, 0]}>
        <meshPhysicalMaterial
          color="white"
          transparent
          opacity={0.3}
          transmission={0.9}
          roughness={0.1}
        />
      </Cylinder>

      {/* Tapón */}
      <Cylinder args={[0.09, 0.09, 0.08, 12]} position={[0, 0.42, 0]}>
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
      </Cylinder>

      {/* Etiqueta con el código */}
      <Html position={[0, 0, 0.16]} center distanceFactor={8}>
        <div
          style={{
            background: hovered ? color : "rgba(0,0,0,0.7)",
            color: hovered ? "#000" : "#fff",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "9px",
            fontFamily: "monospace",
            whiteSpace: "nowrap",
            border: `1px solid ${color}`,
            cursor: "pointer",
            transition: "all 0.2s",
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

function EscenaArbol() {
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

      {/* Tronco del árbol */}
      <TroncoArbol />

      {/* 7 ramas con botellas */}
      {PROCESOS.map((proc) => (
        <Rama key={proc.id} proceso={proc} angulo={proc.angulo} />
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
  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
      <Canvas
        camera={{ position: [0, 2, 12], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <EscenaArbol />
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
        {PROCESOS.map((proc) => (
          <div
            key={proc.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(0,0,0,0.6)",
              padding: "4px 10px",
              borderRadius: "20px",
              backdropFilter: "blur(4px)",
            }}
          >
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: proc.color }} />
            <span style={{ color: "#fff", fontSize: "11px" }}>{proc.nombre}</span>
            <span style={{ color: "#999", fontSize: "10px" }}>({proc.documentos.length})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

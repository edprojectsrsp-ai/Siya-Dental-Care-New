"use client";
// ────────────────────────────────────────────────────────────────
// DentalArch3D — real Three.js 3D dental chart (premium dark theme)
//
// Anatomy-first rebuild:
//  • Crowns are lathe-turned profiles (cervical constriction → bulge →
//    rounded occlusal) squashed per tooth type: blade-like incisors,
//    pointed canines, twin-cusp premolars, four-cusp molars.
//  • Teeth emerge from a continuous pink gum arch (no floating roots —
//    a mouth never shows roots).
//  • Wet-enamel look: physical material with clearcoat + studio env.
//  • Click a tooth → pops out of the row + blue glow. Camera presets.
// ────────────────────────────────────────────────────────────────
import React, { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Html } from "@react-three/drei";
import * as THREE from "three";
import { ADULT_Q, CHILD_Q } from "@/components/ToothWidget";

type Variant = "incisor" | "canine" | "premolar" | "molar";
function toothVariant(n: number): Variant {
  const pos = n % 10;
  if (pos <= 2) return "incisor";
  if (pos === 3) return "canine";
  if (pos <= 5) return "premolar";
  return "molar";
}

const ENAMEL = "#EFE9DC";
const GUM = "#C96F66";

// ── Crown geometry: lathe profile (radius, height 0→1) per type ──
// Radii are relative; real size comes from per-variant scale below.
const PROFILES: Record<Variant, [number, number][]> = {
  // blade: strong bulge low, tapers to a thin edge
  incisor:  [[0.34, 0], [0.46, 0.12], [0.52, 0.36], [0.48, 0.62], [0.38, 0.84], [0.20, 0.96], [0.02, 1]],
  // spear: bulge then taper to near-point
  canine:   [[0.36, 0], [0.48, 0.14], [0.54, 0.4], [0.44, 0.68], [0.26, 0.88], [0.03, 1]],
  // barrel with slightly flattened top (cusps added separately)
  premolar: [[0.40, 0], [0.52, 0.16], [0.58, 0.45], [0.54, 0.75], [0.40, 0.94], [0.10, 1]],
  molar:    [[0.46, 0], [0.58, 0.14], [0.64, 0.42], [0.60, 0.74], [0.46, 0.94], [0.12, 1]],
};

// Non-uniform squash: [bucco-lingual X, height Y, mesio-distal Z]
const SCALES: Record<Variant, [number, number, number]> = {
  incisor:  [1.0, 1.15, 0.48],
  canine:   [0.95, 1.25, 0.66],
  premolar: [1.0, 0.95, 0.92],
  molar:    [1.28, 0.85, 1.12],
};

// Cusp bumps sitting on the occlusal surface (local x/z on unit crown)
const CUSPS: Record<Variant, [number, number][]> = {
  incisor: [], canine: [],
  premolar: [[-0.22, 0], [0.22, 0]],
  molar: [[-0.26, -0.24], [0.26, -0.24], [-0.26, 0.24], [0.26, 0.24]],
};

const geoCache = new Map<string, THREE.BufferGeometry>();
function crownGeometry(variant: Variant): THREE.BufferGeometry {
  let g = geoCache.get(variant);
  if (!g) {
    const pts = PROFILES[variant].map(([r, y]) => new THREE.Vector2(r, y));
    g = new THREE.LatheGeometry(pts, 28);
    g.computeVertexNormals();
    geoCache.set(variant, g);
  }
  return g;
}
let cuspGeo: THREE.SphereGeometry | null = null;
function getCuspGeo() {
  if (!cuspGeo) cuspGeo = new THREE.SphereGeometry(0.16, 14, 12);
  return cuspGeo;
}

// ── One tooth: crown emerging from the gum, popping out on select ──
function Tooth({
  n, position, rotationY, upper, color, selected, onSelect, onHover, hovered,
}: {
  n: number; position: [number, number, number]; rotationY: number; upper: boolean;
  color: string; selected: boolean; hovered: boolean;
  onSelect: (n: number) => void; onHover: (n: number | null) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const variant = toothVariant(n);
  const [sx, sy, sz] = SCALES[variant];
  const h = 1.05 * sy; // crown height after scale

  // Pop out of the row: lower teeth rise, upper teeth drop (toward the viewer's gaze line)
  const lift = selected ? 0.5 : hovered ? 0.2 : 0;
  useFrame(() => {
    if (!group.current) return;
    const targetY = position[1] + lift * (upper ? -1 : 1);
    group.current.position.y += (targetY - group.current.position.y) * 0.16;
    const ts = selected ? 1.14 : hovered ? 1.05 : 1;
    const s = group.current.scale.x + (ts - group.current.scale.x) * 0.16;
    group.current.scale.setScalar(s);
  });

  const crownColor = selected ? "#C7E4FF" : color;
  const emissive = selected ? "#2F6BFF" : hovered ? "#17335e" : "#000000";
  const emissiveI = selected ? 0.5 : hovered ? 0.22 : 0;

  return (
    <group ref={group} position={position} rotation={[0, rotationY, upper ? Math.PI : 0]}>
      {/* Crown — lathe profile squashed per type. Origin at neck, grows +Y. */}
      <mesh
        geometry={crownGeometry(variant)}
        scale={[sx, sy, sz]}
        position={[0, -0.12, 0]}
        castShadow receiveShadow
        onPointerOver={(e) => { e.stopPropagation(); onHover(n); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { onHover(null); document.body.style.cursor = "auto"; }}
        onClick={(e) => { e.stopPropagation(); onSelect(n); }}
      >
        <meshPhysicalMaterial
          color={crownColor} roughness={0.16} metalness={0}
          clearcoat={0.65} clearcoatRoughness={0.3} envMapIntensity={1.05}
          emissive={emissive} emissiveIntensity={emissiveI}
        />
      </mesh>

      {/* Cusps on the chewing surface */}
      {CUSPS[variant].map(([cx, cz], i) => (
        <mesh key={i} geometry={getCuspGeo()} position={[cx * sx, h - 0.16, cz * sz]} scale={[1, 0.7, 1]}>
          <meshPhysicalMaterial color={crownColor} roughness={0.18} metalness={0}
            clearcoat={0.65} clearcoatRoughness={0.3} envMapIntensity={1.05}
            emissive={emissive} emissiveIntensity={emissiveI * 0.85} />
        </mesh>
      ))}

      {/* Gum collar hugging the neck */}
      <mesh position={[0, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42 * Math.max(sx, sz), 0.13, 10, 26]} />
        <meshStandardMaterial color={GUM} roughness={0.55} metalness={0} />
      </mesh>

      {/* FDI number chip — only when it matters (hover / selected) */}
      {(hovered || selected) && (
        <Html position={[0, upper ? -h - 0.55 : h + 0.55, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <div style={{
            background: selected ? "#3B82F6" : "#0F2038", color: "#fff", borderRadius: 999,
            padding: "3px 10px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap",
            boxShadow: "0 4px 14px rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.18)",
          }}>{n}</div>
        </Html>
      )}
    </group>
  );
}

// ── Continuous gum arch the teeth grow out of ──
function GumArch({ points, upper }: { points: THREE.Vector3[]; upper: boolean }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, 64, 0.52, 16, false);
  }, [points]);
  return (
    <mesh geometry={geo} position={[0, upper ? 0.18 : -0.18, 0]} receiveShadow castShadow>
      <meshPhysicalMaterial color={GUM} roughness={0.5} clearcoat={0.25} clearcoatRoughness={0.5} />
    </mesh>
  );
}

// Camera preset driver
function CameraRig({ preset }: { preset: string }) {
  const { camera } = useThree();
  const target = useMemo(() => {
    switch (preset) {
      case "top":    return new THREE.Vector3(0, 14, 0.01);
      case "front":  return new THREE.Vector3(0, 2, 15);
      case "left":   return new THREE.Vector3(-15, 3, 2);
      case "right":  return new THREE.Vector3(15, 3, 2);
      case "bottom": return new THREE.Vector3(0, -14, 0.01);
      default:       return new THREE.Vector3(0, 8.5, 11); // 3D
    }
  }, [preset]);
  useFrame(() => {
    camera.position.lerp(target, 0.08);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// Arch positions: teeth along a parabola-ish ellipse, facing outward
function archLayout(order: number[], upper: boolean) {
  const N = order.length;
  const archW = 5.2;
  const archD = 3.5;
  const gap = 1.5;
  return order.map((n, i) => {
    const frac = N > 1 ? i / (N - 1) : 0.5;
    const angle = Math.PI * frac;
    const x = -Math.cos(angle) * archW;
    const depth = Math.sin(angle) * archD;
    const z = upper ? -(depth + gap) : (depth + gap);
    const rotationY = upper ? -angle + Math.PI / 2 : angle - Math.PI / 2;
    return { n, position: [x, upper ? 1.7 : -1.7, z] as [number, number, number], rotationY };
  });
}

export function DentalArch3D({
  child = false, selected = [], onSelectTooth, toothColor, arch = "both", preset = "3d",
}: {
  child?: boolean;
  selected?: number[];
  onSelectTooth?: (n: number) => void;
  toothColor?: (n: number) => { done?: boolean; prog?: boolean; planned?: boolean; hasDiag?: boolean; hasExam?: boolean };
  arch?: "both" | "upper" | "lower";
  preset?: string;
}) {
  const Q = child ? CHILD_Q : ADULT_Q;
  const upperOrder = [...Q[0], ...Q[1]];
  const lowerOrder = [...Q[2], ...Q[3]];
  const [hover, setHover] = useState<number | null>(null);

  const upperTeeth = useMemo(() => archLayout(upperOrder, true), [child]); // eslint-disable-line
  const lowerTeeth = useMemo(() => archLayout(lowerOrder, false), [child]); // eslint-disable-line
  const upperGumPts = useMemo(() => upperTeeth.map(t => new THREE.Vector3(...t.position)), [upperTeeth]);
  const lowerGumPts = useMemo(() => lowerTeeth.map(t => new THREE.Vector3(...t.position)), [lowerTeeth]);

  const colorFor = (n: number) => {
    const tc = toothColor?.(n);
    if (!tc) return ENAMEL;
    if (tc.done) return "#4ADE9F";
    if (tc.prog) return "#FBBF24";
    if (tc.planned) return "#5EE0D0";
    if (tc.hasDiag) return "#FB923C";
    if (tc.hasExam) return "#F5E3A0";
    return ENAMEL;
  };

  const showUpper = arch !== "lower";
  const showLower = arch !== "upper";

  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 8.5, 11], fov: 42 }} style={{ width: "100%", height: "100%" }}>
      <color attach="background" args={["#0A1628"]} />
      <fog attach="fog" args={["#0A1628", 20, 38]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 11, 8]} intensity={1.15} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-8, 5, -6]} intensity={0.35} color="#6ea8ff" />
      <Environment preset="studio" />
      <CameraRig preset={preset} />

      {showUpper && (
        <group>
          <GumArch points={upperGumPts} upper />
          {upperTeeth.map(t => (
            <Tooth key={t.n} n={t.n} position={t.position} rotationY={t.rotationY} upper
              color={colorFor(t.n)} selected={selected.includes(t.n)} hovered={hover === t.n}
              onSelect={(n) => onSelectTooth?.(n)} onHover={setHover} />
          ))}
        </group>
      )}
      {showLower && (
        <group>
          <GumArch points={lowerGumPts} upper={false} />
          {lowerTeeth.map(t => (
            <Tooth key={t.n} n={t.n} position={t.position} rotationY={t.rotationY} upper={false}
              color={colorFor(t.n)} selected={selected.includes(t.n)} hovered={hover === t.n}
              onSelect={(n) => onSelectTooth?.(n)} onHover={setHover} />
          ))}
        </group>
      )}

      <ContactShadows position={[0, -3.4, 0]} opacity={0.35} scale={24} blur={2.6} far={7} color="#000000" />
      <OrbitControls enablePan={false} minDistance={7} maxDistance={22} enableDamping dampingFactor={0.1} />
    </Canvas>
  );
}

export default DentalArch3D;

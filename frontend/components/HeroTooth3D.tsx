"use client";

/**
 * HeroTooth3D — game-grade animated hero visual.
 *
 * A glossy ceramic tooth (extruded from a hand-drawn bezier silhouette so it
 * reads unmistakably as the classic dental mark), lit like a product shot with
 * local Lightformers (no network HDRIs — CSP/offline safe), floating and
 * slowly turning, tilting toward the visitor's cursor, with two orbiting
 * brand-colored rings and a field of soft sparkles.
 *
 * Loaded client-side only (next/dynamic ssr:false) after the page settles, so
 * it never competes with the static poster image for LCP.
 */

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles, ContactShadows, Environment, Lightformer } from "@react-three/drei";

const TEAL = "#0EA5B5";
const LIME = "#8BC53F";

/** Classic tooth silhouette: two crown lobes, waist, two rounded roots. */
function buildToothGeometry(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 1.02);
  // right crown lobe → shoulder
  s.bezierCurveTo(0.3, 1.18, 0.72, 1.16, 0.92, 0.88);
  // right side bulge → waist
  s.bezierCurveTo(1.1, 0.6, 1.02, 0.18, 0.8, -0.18);
  // right root, outer edge
  s.bezierCurveTo(0.68, -0.42, 0.6, -0.78, 0.46, -1.05);
  // rounded root tip
  s.quadraticCurveTo(0.38, -1.2, 0.3, -1.04);
  // inner edge up to the notch between roots
  s.bezierCurveTo(0.22, -0.78, 0.14, -0.5, 0, -0.4);
  // mirrored left half
  s.bezierCurveTo(-0.14, -0.5, -0.22, -0.78, -0.3, -1.04);
  s.quadraticCurveTo(-0.38, -1.2, -0.46, -1.05);
  s.bezierCurveTo(-0.6, -0.78, -0.68, -0.42, -0.8, -0.18);
  s.bezierCurveTo(-1.02, 0.18, -1.1, 0.6, -0.92, 0.88);
  s.bezierCurveTo(-0.72, 1.16, -0.3, 1.18, 0, 1.02);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.5,
    curveSegments: 48,
    bevelEnabled: true,
    bevelThickness: 0.3,
    bevelSize: 0.24,
    bevelSegments: 12,
  });
  geo.center();
  return geo;
}

function Tooth() {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(buildToothGeometry, []);
  const target = useRef({ x: 0, y: 0 });

  useFrame(({ pointer, clock }, delta) => {
    const g = group.current;
    if (!g) return;
    // Ease toward the cursor (parallax), plus a slow perpetual turn.
    target.current.x = THREE.MathUtils.lerp(target.current.x, pointer.y * -0.25, delta * 2.5);
    target.current.y = THREE.MathUtils.lerp(target.current.y, pointer.x * 0.45, delta * 2.5);
    g.rotation.x = target.current.x + Math.sin(clock.elapsedTime * 0.4) * 0.04;
    g.rotation.y = target.current.y + Math.sin(clock.elapsedTime * 0.25) * 0.22;
  });

  return (
    <group ref={group}>
      <mesh geometry={geometry} castShadow>
        {/* Bright, glossy enamel: pure white with a hint of cool tint in shadow,
            hard clearcoat for wet-look highlights, subtle sheen for the ceramic feel. */}
        <meshPhysicalMaterial
          color="#ffffff"
          emissive={new THREE.Color("#eafcff")}
          emissiveIntensity={0.14}
          roughness={0.06}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.04}
          reflectivity={1}
          sheen={0.6}
          sheenColor={new THREE.Color("#dffcff")}
          specularIntensity={1}
          specularColor={new THREE.Color("#ffffff")}
          envMapIntensity={1.6}
        />
      </mesh>
    </group>
  );
}

function OrbitRing({ radius, color, speed, tilt }: { radius: number; color: string; speed: number; tilt: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    m.rotation.z = clock.elapsedTime * speed;
    m.rotation.x = tilt + Math.sin(clock.elapsedTime * 0.3) * 0.08;
  });
  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]}>
      <torusGeometry args={[radius, 0.012, 16, 128]} />
      <meshBasicMaterial color={color} transparent opacity={0.55} />
    </mesh>
  );
}

/** Tiny satellite dot riding one of the rings — the "game" touch. */
function RingSatellite({ radius, color, speed, tilt }: { radius: number; color: string; speed: number; tilt: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime * speed;
    const x = Math.cos(t) * radius;
    const y = Math.sin(t) * radius;
    m.position.set(x, y * Math.cos(tilt), y * Math.sin(tilt));
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.05, 16, 16]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

export default function HeroTooth3D({ onReady }: { onReady?: () => void }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 5.2], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }}
      onCreated={() => onReady?.()}
      eventSource={typeof document !== "undefined" ? document.body : undefined}
      eventPrefix="client"
    >
      <ambientLight intensity={0.65} />
      {/* Bright key light for the gleaming white highlight */}
      <directionalLight position={[3, 5, 6]} intensity={2.2} color="#ffffff" />
      {/* Cool rim light to separate the tooth from the dark stage */}
      <directionalLight position={[-5, 2, -4]} intensity={1.4} color="#bfefff" />
      <pointLight position={[-4, 1.5, -3]} intensity={5} color={TEAL} />
      <pointLight position={[4, -2, -2]} intensity={2.5} color={LIME} />
      <pointLight position={[0, 3, 4]} intensity={3} color="#ffffff" />

      {/* Local studio reflections — no external HDRI download */}
      <Environment resolution={128}>
        <Lightformer position={[0, 4, 3]} scale={[7, 4, 1]} intensity={3.4} color="#ffffff" />
        <Lightformer position={[-4, 1, 2]} scale={[3, 5, 1]} intensity={2.2} color="#eaffff" />
        <Lightformer position={[4, -1, 2]} scale={[3, 4, 1]} intensity={1.6} color={TEAL} />
        <Lightformer position={[0, -3, 2]} scale={[5, 2, 1]} intensity={1} color="#dffcf1" />
      </Environment>

      <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.9} floatingRange={[-0.12, 0.14]}>
        <Tooth />
        <OrbitRing radius={1.72} color={TEAL} speed={0.22} tilt={1.25} />
        <OrbitRing radius={2.0} color={LIME} speed={-0.14} tilt={1.05} />
        <RingSatellite radius={1.72} color="#7fe3ee" speed={0.5} tilt={1.25} />
      </Float>

      <Sparkles count={42} scale={[4.2, 4.2, 2.5]} size={2.6} speed={0.35} opacity={0.65} color="#aef0f6" />
      <ContactShadows position={[0, -1.85, 0]} opacity={0.4} scale={6} blur={2.6} far={2.2} color="#04222b" />
    </Canvas>
  );
}

import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Studio } from '@/components/game/Studio';

/**
 * Two dice. The server already rolled: these only show it, tumbling while `rolling`, then turning
 * to rest with the right face up. One world unit is one die, so the camera is set for that.
 */
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

// Opposite faces add to 7. [face value, outward normal, rotation that turns a +z face onto that normal]
export const FACES: [number, [number, number, number], [number, number, number]][] = [
  [1, [0, 0, 1], [0, 0, 0]],
  [6, [0, 0, -1], [Math.PI, 0, 0]],
  [3, [1, 0, 0], [0, Math.PI / 2, 0]],
  [4, [-1, 0, 0], [0, -Math.PI / 2, 0]],
  [2, [0, 1, 0], [-Math.PI / 2, 0, 0]],
  [5, [0, -1, 0], [Math.PI / 2, 0, 0]],
];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const Z = new THREE.Vector3(0, 0, 1);

/** Orientation that puts `value` on top (toward the camera), with a random turn so no two rolls look alike. */
export function faceUp(value: number): THREE.Quaternion {
  const n = FACES.find((f) => f[0] === value)?.[1] ?? [0, 0, 1];
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...n), Z);
  return new THREE.Quaternion().setFromAxisAngle(Z, rand(0, Math.PI * 2)).multiply(q);
}

const body = <meshPhysicalMaterial color="#f3efe4" roughness={0.3} clearcoat={0.6} clearcoatRoughness={0.2} />;
const pip = <meshBasicMaterial color="#12151b" />;

function Die({ x, value, rolling }: { x: number; value: number; rolling: boolean }) {
  const group = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const geometry = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 4, 0.13), []);
  const st = useRef({ rolling, from: new THREE.Quaternion(), target: faceUp(value), settle: 1, w: new THREE.Vector3(), t: 0 });

  useLayoutEffect(() => {
    group.current?.quaternion.copy(st.current.target);
    group.current?.position.set(x, 0, 0);
  }, [x]);

  const mounted = useRef(false);
  useEffect(() => {
    const s = st.current;
    s.rolling = rolling;
    // The first pass only shows the starting face; spinning to it would look like a glitch
    if (!mounted.current) {
      mounted.current = true;
      if (!rolling) return;
    }
    if (rolling) {
      s.w.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(10, 15));
    } else {
      s.from.copy(group.current!.quaternion);
      s.target = faceUp(value);
      s.settle = 0;
    }
    invalidate();
  }, [rolling, value, invalidate]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const s = st.current;
    const dt = Math.min(delta, 0.05);
    s.t += dt;
    if (s.rolling) {
      g.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(s.w.clone().normalize(), s.w.length() * dt));
      g.position.z = Math.abs(Math.sin(s.t * 9 + x * 3)) * 0.7;
      invalidate();
    } else if (s.settle < 1) {
      s.settle = Math.min(1, s.settle + dt / 0.55);
      const k = 1 - (1 - s.settle) ** 3;
      g.quaternion.slerpQuaternions(s.from, s.target, k);
      g.position.z = (1 - k) * 0.6 * Math.abs(Math.cos(s.settle * Math.PI * 2.5));
      invalidate();
    } else {
      g.position.z = 0;
    }
  });

  return (
    <group ref={group}>
      <mesh geometry={geometry}>{body}</mesh>
      {FACES.map(([v, , rot]) => (
        <group key={v} rotation={rot}>
          {PIPS[v].map((i) => (
            <mesh key={i} position={[((i % 3) - 1) * 0.27, (1 - Math.floor(i / 3)) * 0.27, 0.502]}>
              <circleGeometry args={[v === 1 ? 0.12 : 0.085, 20]} />
              {pip}
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

interface Dice3DProps {
  values: [number, number] | null;
  rolling: boolean;
}

const Dice3D: React.FC<Dice3DProps> = ({ values, rolling }) => {
  const [a, b] = values ?? [1, 1];
  return (
    <Canvas
      aria-hidden
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 30, position: [0, -1.4, 5.4] }}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <Studio lights={false} reflections={0.6} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, -4, 8]} intensity={2} color="#fff1d8" />
      <Die x={-0.62} value={a} rolling={rolling} />
      <Die x={0.62} value={b} rolling={rolling} />
    </Canvas>
  );
};

export default Dice3D;

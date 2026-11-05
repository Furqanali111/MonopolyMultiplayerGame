import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SHAPES } from '@/components/game/tokenShapes';
import { IsoRig } from '@/components/game/IsoRig';

/** The six pieces in a row on the home table: they rise in one by one, turn slowly, and lift when pointed at. */
const GAP = 5.6;
const WIDTH_UNITS = GAP * 6 + 3; // six pieces and a margin

function Piece({ index, color }: { index: number; color: string }) {
  const group = useRef<THREE.Group>(null);
  const t = useRef(0);
  const lift = useRef(0);
  const hovered = useRef(false);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    t.current += dt;
    lift.current += ((hovered.current ? 1.6 : 0) - lift.current) * Math.min(1, dt * 10);
    // Rise from below with a small overshoot, staggered by seat
    const k = Math.min(1, Math.max(0, (t.current - 0.25 - index * 0.08) / 0.6));
    const rise = 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2; // ease out back
    g.position.set((index - 2.5) * GAP, 0, (rise - 1) * 6 + Math.sin(t.current * 1.6 + index) * 0.25 + lift.current);
    g.rotation.z = t.current * 0.6 + index;
    g.scale.setScalar(Math.max(0.001, rise));
  });

  return (
    <group ref={group} onPointerOver={() => (hovered.current = true)} onPointerOut={() => (hovered.current = false)}>
      {SHAPES[index % SHAPES.length](<meshStandardMaterial color={color} roughness={0.38} metalness={0.15} />)}
    </group>
  );
}

const PieceShowcase: React.FC<{ colors: readonly string[] }> = ({ colors }) => (
  <Canvas aria-hidden orthographic dpr={[1, 2]} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} style={{ position: 'absolute', inset: 0 }}>
    <IsoRig units={WIDTH_UNITS} lookAtZ={2} />
    <ambientLight intensity={1.1} />
    <directionalLight position={[-25, -20, 50]} intensity={2.4} />
    {colors.slice(0, 6).map((c, i) => (
      <Piece key={c} index={i} color={c} />
    ))}
  </Canvas>
);

export default PieceShowcase;

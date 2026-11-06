import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SHAPES } from '@/components/game/tokenShapes';
import { IsoRig } from '@/components/game/IsoRig';
import { Studio, lacquer } from '@/components/game/Studio';

const GOLD = '#E8B84A';

/** The winner's piece, big, turning slowly on a gold ring: it drops in from above and settles. */
function Piece({ index, color }: { index: number; color: string }) {
  const group = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    t.current += Math.min(delta, 0.05);
    const k = Math.min(1, t.current / 0.7);
    const drop = (1 - k) ** 2 * 14;
    g.position.z = drop + Math.sin(t.current * 1.8) * 0.2;
    g.rotation.z = t.current * 0.9;
    g.scale.setScalar(1.3);
  });
  return (
    <>
      <mesh position={[0, 0, 0.02]}>
        <ringGeometry args={[3.4, 4.2, 48]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.9} />
      </mesh>
      <group ref={group}>{SHAPES[index % SHAPES.length](lacquer(color))}</group>
    </>
  );
}

const WinnerPiece: React.FC<{ index: number; color: string }> = ({ index, color }) => (
  <Canvas aria-hidden orthographic dpr={[1, 2]} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} style={{ position: 'absolute', inset: 0 }}>
    <IsoRig units={11} lookAtZ={3} />
    <Studio />
    <Piece index={index} color={color} />
  </Canvas>
);

export default WinnerPiece;

import React, { useLayoutEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SHAPES } from '@/components/game/tokenShapes';
import { VIEW_TILT_DEG } from '@/lib/boardTilt';

const TILT = (VIEW_TILT_DEG * Math.PI) / 180;
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
      <group ref={group}>{SHAPES[index % SHAPES.length](<meshStandardMaterial color={color} roughness={0.38} metalness={0.15} />)}</group>
    </>
  );
}

function Rig() {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.zoom = size.width / 11;
    cam.position.set(0, -60 * Math.sin(TILT), 60 * Math.cos(TILT) + 3);
    cam.up.set(0, 1, 0);
    cam.lookAt(0, 0, 3);
    cam.near = 0.1;
    cam.far = 300;
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

const WinnerPiece: React.FC<{ index: number; color: string }> = ({ index, color }) => (
  <Canvas aria-hidden orthographic dpr={[1, 2]} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} style={{ position: 'absolute', inset: 0 }}>
    <Rig />
    <ambientLight intensity={1.1} />
    <directionalLight position={[-25, -20, 50]} intensity={2.4} />
    <Piece index={index} color={color} />
  </Canvas>
);

export default WinnerPiece;

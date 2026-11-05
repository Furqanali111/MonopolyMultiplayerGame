import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type * as THREE from 'three';
import { centerOf } from '@/components/game/GameBoard';

/**
 * Houses and hotels standing on each tile's coloured band. Units are board percent, like the pieces.
 * The tile is 8.3 wide and 12.5 deep; the band is the inner 27% of the depth, so its centre sits
 * 4.56 from the tile centre toward the middle of the board.
 */
const BAND_OFFSET = 4.56;
const DROP = 0.45; // seconds a new building takes to fall into place

type Pt = { x: number; y: number };
export type Toward = (x: number, y: number) => Pt;

/** Inward direction and the direction along the tile's edge, in board percent (y grows downward). */
function frame(position: number): { inward: Pt; along: Pt } {
  if (position < 10) return { inward: { x: 0, y: -1 }, along: { x: 1, y: 0 } };
  if (position < 20) return { inward: { x: 1, y: 0 }, along: { x: 0, y: 1 } };
  if (position < 30) return { inward: { x: 0, y: 1 }, along: { x: 1, y: 0 } };
  return { inward: { x: -1, y: 0 }, along: { x: 0, y: 1 } };
}

const wall = <meshStandardMaterial color="#3DD68C" roughness={0.45} />;
const roof = <meshStandardMaterial color="#1f9d63" roughness={0.5} />;
const hotelWall = <meshStandardMaterial color="#E5566D" roughness={0.45} />;
const hotelRoof = <meshStandardMaterial color="#E3B341" roughness={0.4} />;

/** Wraps one building so it can fall in. Buildings present at first draw just stand there. */
function Drop({ animate, children, at }: { animate: boolean; children: React.ReactNode; at: [number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const born = useRef(performance.now());
  const play = useRef(animate).current; // decided once, at mount: later re-renders must not replay the fall
  useEffect(() => invalidate(), [invalidate]);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const k = play ?Math.min(1, (performance.now() - born.current) / 1000 / DROP) : 1;
    g.position.set(at[0], at[1], 9 * (1 - k) ** 2);
    const land = k >= 1 ? 0 : k > 0.85 ? Math.sin(((k - 0.85) / 0.15) * Math.PI) * 0.12 : 0;
    g.scale.set(1 + land * 0.4, 1 + land * 0.4, 1 - land);
    if (k < 1) invalidate();
  });
  return <group ref={ref}>{children}</group>;
}

const House = () => (
  <>
    <mesh position={[0, 0, 0.6]}>
      <boxGeometry args={[1.5, 1.5, 1.2]} />
      {wall}
    </mesh>
    <mesh position={[0, 0, 1.6]} rotation={[Math.PI / 2, Math.PI / 4, 0]}>
      <coneGeometry args={[1.15, 0.9, 4]} />
      {roof}
    </mesh>
  </>
);

const Hotel = () => (
  <>
    <mesh position={[0, 0, 1.1]}>
      <boxGeometry args={[5.2, 2.4, 2.2]} />
      {hotelWall}
    </mesh>
    <mesh position={[0, 0, 2.4]}>
      <boxGeometry args={[5.5, 2.7, 0.45]} />
      {hotelRoof}
    </mesh>
  </>
);

/** All buildings on the board. `toWorld` turns board percent into scene ground coordinates. */
export function Buildings3D({ lots, toWorld }: { lots: { position: number; houses: number }[]; toWorld: Toward }) {
  const settled = useRef(false);
  useEffect(() => {
    settled.current = true;
  }, []);

  return (
    <>
      {lots.map(({ position, houses }) => {
        const c = centerOf(position);
        const { inward, along } = frame(position);
        const cx = c.x + inward.x * BAND_OFFSET;
        const cy = c.y + inward.y * BAND_OFFSET;
        const spot = (k: number): [number, number] => {
          const p = toWorld(cx + along.x * k, cy + along.y * k);
          return [p.x, p.y];
        };
        // Wide tiles run along x; on the left and right columns the building is turned a quarter
        const turn = along.x === 0 ? Math.PI / 2 : 0;
        return (
          <group key={position}>
            {houses >= 5 ? (
              <Drop key="hotel" animate={settled.current} at={spot(0)}>
                <group rotation={[0, 0, turn]}>
                  <Hotel />
                </group>
              </Drop>
            ) : (
              Array.from({ length: houses }, (_, i) => (
                <Drop key={i} animate={settled.current} at={spot((i - (houses - 1) / 2) * 2)}>
                  <group rotation={[0, 0, turn]}>
                    <House />
                  </group>
                </Drop>
              ))
            )}
          </group>
        );
      })}
    </>
  );
}

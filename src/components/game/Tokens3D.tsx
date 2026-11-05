import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SHAPES } from '@/components/game/tokenShapes';
import type { Player } from '@/game/types';
import { centerOf, restingOffset, walkTrack } from '@/components/game/GameBoard';

/**
 * Pawns as 3D pieces over the flat board. One world unit is 1% of the board, origin at the centre.
 * The camera looks down at a tilt, and ground positions are stretched by 1/cos(tilt) in depth so a
 * piece's footprint lands exactly where the 2D pawn would stand. Only the piece itself is seen at an angle.
 */
const TILT = (38 * Math.PI) / 180;
const COS = Math.cos(TILT);
const STEP_SECONDS = 0.11; // same walk speed as the 2D pawn and the step sounds
const SLIDE_SECONDS = 0.4;
const HOP = 2.2;

type Offset = { dx: number; dy: number };
type Pt = { x: number; y: number };

/** Board percent to world ground position */
const toWorld = (x: number, y: number): Pt => ({ x: x - 50, y: -(y - 50) / COS });
const restPoint = (position: number, o: Offset): Pt => {
  const c = centerOf(position);
  const r = restingOffset(position);
  return toWorld(c.x + r.dx + o.dx, c.y + r.dy + o.dy);
};

function Token({ player, index, offset, active }: { player: Player; index: number; offset: Offset; active: boolean }) {
  const group = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const last = useRef(player.position);
  const now = () => performance.now() / 1000;
  const start = useMemo(() => restPoint(player.position, offset), []); // eslint-disable-line react-hooks/exhaustive-deps
  const at = useRef<Pt>(start);
  const run = useRef({ pts: [start], t0: 0, walk: false, done: true });

  // A new position or a new resting spot starts a walk (tile by tile) or a slide
  useEffect(() => {
    const track = walkTrack(last.current, player.position, player.inJail, false);
    last.current = player.position;
    const rest = (i: number) => (i === track.length - 1 ? restPoint(track[i], offset) : toWorld(centerOf(track[i]).x, centerOf(track[i]).y));
    const walk = track.length > 1;
    run.current = { pts: [at.current, ...track.map((_, i) => rest(i))], t0: now(), walk, done: false };
    invalidate();
  }, [player.position, player.inJail, offset.dx, offset.dy]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const r = run.current;
    const t = now() - r.t0;
    const n = r.pts.length - 1;
    let z = 0;
    let squash = 0;
    if (!r.done && n > 0) {
      const total = r.walk ? n * STEP_SECONDS : SLIDE_SECONDS;
      if (t >= total) {
        at.current = r.pts[n];
        r.done = true;
      } else if (r.walk) {
        const i = Math.min(n - 1, Math.floor(t / STEP_SECONDS));
        const f = (t - i * STEP_SECONDS) / STEP_SECONDS;
        at.current = { x: r.pts[i].x + (r.pts[i + 1].x - r.pts[i].x) * f, y: r.pts[i].y + (r.pts[i + 1].y - r.pts[i].y) * f };
        z = Math.sin(Math.PI * f) * HOP;
      } else {
        const f = 1 - (1 - t / SLIDE_SECONDS) ** 3;
        at.current = { x: r.pts[0].x + (r.pts[n].x - r.pts[0].x) * f, y: r.pts[0].y + (r.pts[n].y - r.pts[0].y) * f };
        z = Math.sin(Math.PI * f) * HOP * 0.8;
      }
    } else if (r.done && n > 0) {
      // A brief squash as it lands
      const since = t - (r.walk ? n * STEP_SECONDS : SLIDE_SECONDS);
      if (since < 0.2) squash = Math.sin((Math.PI * since) / 0.2) * 0.16;
    }
    g.position.set(at.current.x, at.current.y, z);
    g.scale.set(1 + squash * 0.5, 1 + squash * 0.5, 1 - squash);
    if (shadow.current) {
      const k = 1 - Math.min(z / (HOP * 1.6), 0.6);
      shadow.current.scale.set(k, k, 1);
      (shadow.current.material as THREE.MeshBasicMaterial).opacity = 0.32 * k;
    }
    if (!r.done || (r.done && n > 0 && t - (r.walk ? n * STEP_SECONDS : SLIDE_SECONDS) < 0.25)) invalidate();
  });

  const material = <meshStandardMaterial color={player.color} roughness={0.38} metalness={0.15} />;

  return (
    <group ref={group} position={[start.x, start.y, 0]}>
      <mesh ref={shadow} position={[0, 0, 0.02]}>
        <circleGeometry args={[2.7, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.32} depthWrite={false} />
      </mesh>
      {active && (
        <mesh position={[0, 0, 0.03]}>
          <ringGeometry args={[2.9, 3.5, 32]} />
          <meshBasicMaterial color="#E8B84A" transparent opacity={0.9} depthWrite={false} />
        </mesh>
      )}
      {SHAPES[index % SHAPES.length](material)}
    </group>
  );
}

/** Keeps the camera matched to the canvas: 100 world units always span the board width. */
function Rig() {
  const { camera, size, invalidate } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.zoom = size.width / 100;
    cam.position.set(0, -60 * Math.sin(TILT), 60 * Math.cos(TILT));
    cam.up.set(0, 1, 0);
    cam.lookAt(0, 0, 0);
    cam.near = 0.1;
    cam.far = 200;
    cam.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  return null;
}

interface Tokens3DProps {
  players: Player[];
  offsets: Map<string, Offset>;
  activeId?: string;
}

const Tokens3D: React.FC<Tokens3DProps> = ({ players, offsets, activeId }) => (
  <Canvas
    aria-hidden
    orthographic
    frameloop="demand"
    dpr={[1, 2]}
    gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
  >
    <Rig />
    <ambientLight intensity={1.1} />
    <directionalLight position={[-25, -20, 50]} intensity={2.4} />
    {players.map((p, i) => (
      <Token key={p.id} player={p} index={i} offset={offsets.get(p.id) ?? { dx: 0, dy: 0 }} active={activeId === p.id} />
    ))}
  </Canvas>
);

export default Tokens3D;

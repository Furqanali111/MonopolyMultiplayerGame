import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SHAPES } from '@/components/game/tokenShapes';
import { IsoRig } from '@/components/game/IsoRig';
import type { Player } from '@/game/types';
import { centerOf, restingOffset, walkTrack } from '@/components/game/GameBoard';
import { CANVAS_EXTEND, VIEW_TILT_DEG } from '@/lib/boardTilt';

/**
 * Pawns as 3D pieces over the flat board. One world unit is 1% of the board width,
 * origin at the board centre. The camera looks down at a tilt, and ground positions are stretched by
 * 1/cos(tilt) in depth, so a piece's footprint lands exactly on its tile while the piece itself is
 * seen at an angle.
 */
const TILT = (VIEW_TILT_DEG * Math.PI) / 180;
const COS = Math.cos(TILT);
const CANVAS_UNITS = 100 * (1 + 2 * CANVAS_EXTEND);
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
  // 0 while in play, rising to 1 when the player goes bankrupt: the piece spins and shrinks away
  const vanish = useRef(player.isBankrupt ? 1 : 0);

  // A new position or a new resting spot starts a walk (tile by tile) or a slide
  useEffect(() => {
    const track = walkTrack(last.current, player.position, player.inJail, false);
    last.current = player.position;
    const rest = (i: number) => (i === track.length - 1 ? restPoint(track[i], offset) : toWorld(centerOf(track[i]).x, centerOf(track[i]).y));
    const walk = track.length > 1;
    run.current = { pts: [at.current, ...track.map((_, i) => rest(i))], t0: now(), walk, done: false };
    invalidate();
  }, [player.position, player.inJail, offset.dx, offset.dy]); // eslint-disable-line react-hooks/exhaustive-deps

  // The layer only redraws on request, and nothing else changes on screen when a player goes bankrupt
  useEffect(() => invalidate(), [player.isBankrupt, invalidate]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
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
    if (player.isBankrupt && vanish.current < 1) vanish.current = Math.min(1, vanish.current + dt / 0.6);
    const keep = 1 - vanish.current;
    g.scale.set((1 + squash * 0.5) * keep, (1 + squash * 0.5) * keep, (1 - squash) * keep);
    g.rotation.z = vanish.current * 7;
    g.visible = keep > 0;
    if (player.isBankrupt && vanish.current < 1) invalidate();
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

interface Tokens3DProps {
  players: Player[];
  offsets: Map<string, Offset>;
  activeId?: string;
  /** Called once the layer has mounted, so the flat pieces can step aside */
  onReady?: () => void;
  /** The browser dropped the WebGL context (GPU reset, too many contexts): the board shows flat pawns again */
  onLost?: () => void;
}

const Tokens3D: React.FC<Tokens3DProps> = ({ players, offsets, activeId, onReady, onLost }) => {
  useEffect(() => onReady?.(), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Canvas
      aria-hidden
      orthographic
      frameloop="demand"
      dpr={[1, 2]}
      onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', () => onLost?.())}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <IsoRig units={CANVAS_UNITS} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[-25, -20, 50]} intensity={2.4} />
      {players.map((p, i) => (
        <Token key={p.id} player={p} index={i} offset={offsets.get(p.id) ?? { dx: 0, dy: 0 }} active={activeId === p.id} />
      ))}
    </Canvas>
  );
};

export default Tokens3D;

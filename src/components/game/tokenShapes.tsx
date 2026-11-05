import React from 'react';
import * as THREE from 'three';

/**
 * Six heraldic game pieces, built from plain geometry so there is no model file to license:
 * crown, sword, dragon egg, raven, throne and trident. Each stands on a dark base at z = 0, up is +z.
 * `m` is the player's colour material.
 */
// Low metalness on purpose: with no environment map to reflect, real metal renders near black
const STEEL = <meshStandardMaterial color="#e3e7ee" roughness={0.35} metalness={0.2} />;
const IRON = <meshStandardMaterial color="#5a606e" roughness={0.5} metalness={0.2} />;
const GOLD = <meshStandardMaterial color="#f0c25a" roughness={0.35} metalness={0.25} />;

/** Pieces are modelled with y up, then turned so up is the board's +z. Stretched a little taller because the camera looks down at them. */
const Upright: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <group rotation={[Math.PI / 2, 0, 0]} scale={[1.1, 1.45, 1.1]}>
    <mesh position={[0, 0.15, 0]}>
      <cylinderGeometry args={[1.7, 1.8, 0.3, 32]} />
      {IRON}
    </mesh>
    {children}
  </group>
);

const spikes = (n: number, r: number) => Array.from({ length: n }, (_, i) => (i / n) * Math.PI * 2).map((a) => [Math.cos(a) * r, Math.sin(a) * r] as const);
const EGG = [[0, 0.3], [1.1, 0.4], [1.5, 1.1], [1.45, 2], [1.05, 3], [0.55, 3.6], [0, 3.85]].map(([r, h]) => new THREE.Vector2(r, h));

export const SHAPES: ((m: React.ReactNode) => React.ReactNode)[] = [
  // Crown
  (m) => (
    <Upright>
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[1.25, 1.35, 1, 32]} />
        {m}
      </mesh>
      {spikes(5, 1.1).map(([x, z], i) => (
        <mesh key={i} position={[x, 2.05, z]}>
          <coneGeometry args={[0.32, 1.5, 8]} />
          {GOLD}
        </mesh>
      ))}
      {spikes(5, 1.1).map(([x, z], i) => (
        <mesh key={i} position={[x, 2.85, z]}>
          <sphereGeometry args={[0.2, 10, 8]} />
          {m}
        </mesh>
      ))}
    </Upright>
  ),
  // Sword, point up
  (m) => (
    <Upright>
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.9, 10]} />
        {IRON}
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <sphereGeometry args={[0.28, 12, 10]} />
        {m}
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <boxGeometry args={[2, 0.24, 0.34]} />
        {m}
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[0.5, 3.6, 0.1]} />
        {STEEL}
      </mesh>
      <mesh position={[0, 5.2, 0]} scale={[1, 1, 0.2]}>
        <coneGeometry args={[0.35, 0.6, 4]} />
        {STEEL}
      </mesh>
    </Upright>
  ),
  // Dragon egg with scale ridges
  (m) => (
    <Upright>
      <mesh>
        <latheGeometry args={[EGG, 32]} />
        {m}
      </mesh>
      {[[1.1, 1.5], [2, 1.45], [2.9, 1.1]].map(([h, r]) => (
        <mesh key={h} position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.09, 8, 32]} />
          {GOLD}
        </mesh>
      ))}
    </Upright>
  ),
  // Raven
  (m) => (
    <Upright>
      <mesh position={[0, 1.5, -0.1]} scale={[0.95, 1.1, 1.5]}>
        <sphereGeometry args={[1, 20, 16]} />
        {m}
      </mesh>
      <mesh position={[0, 2.8, 0.7]}>
        <sphereGeometry args={[0.6, 16, 12]} />
        {m}
      </mesh>
      <mesh position={[0, 2.75, 1.45]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.2, 0.8, 8]} />
        {GOLD}
      </mesh>
      <mesh position={[0, 1.2, -1.7]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.7, 0.12, 1.5]} />
        {m}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1, 1.6, -0.3]} rotation={[0, 0, s * -0.35]} scale={[0.18, 1, 1.2]}>
          <sphereGeometry args={[1, 12, 10]} />
          {m}
        </mesh>
      ))}
    </Upright>
  ),
  // Throne of blades
  (m) => (
    <Upright>
      <mesh position={[0, 0.9, 0.1]}>
        <boxGeometry args={[1.9, 1.2, 1.7]} />
        {m}
      </mesh>
      {[-0.95, -0.63, -0.32, 0, 0.32, 0.63, 0.95].map((a) => (
        <group key={a} position={[0, 1.4, -0.6]} rotation={[0, 0, a]}>
          <mesh position={[0, 1.4, 0]} scale={[1, 1, 0.5]}>
            <boxGeometry args={[0.2, 2.8, 0.2]} />
            {STEEL}
          </mesh>
        </group>
      ))}
    </Upright>
  ),
  // Trident
  (m) => (
    <Upright>
      <mesh position={[0, 2.1, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 3.6, 10]} />
        {m}
      </mesh>
      <mesh position={[0, 3.7, 0]}>
        <boxGeometry args={[1.7, 0.16, 0.16]} />
        {m}
      </mesh>
      {[-0.8, 0, 0.8].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, x === 0 ? 4.5 : 4.2, 0]}>
            <cylinderGeometry args={[0.08, 0.08, x === 0 ? 1.6 : 1, 8]} />
            {m}
          </mesh>
          <mesh position={[0, x === 0 ? 5.5 : 4.9, 0]}>
            <coneGeometry args={[0.22, 0.5, 8]} />
            {m}
          </mesh>
        </group>
      ))}
    </Upright>
  ),
];

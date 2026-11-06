import React, { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * The light rig every 3D scene shares. A small studio room is baked once into a reflection map, so
 * metal and lacquer have something to reflect (without one, metal renders near black). A warm key,
 * a cool rim from behind and a low ambient give the pieces form.
 * `lights={false}` keeps only the reflections, for scenes that place their own lights.
 */
export const Studio: React.FC<{ lights?: boolean; reflections?: number }> = ({ lights = true, reflections = 0.85 }) => {
  const { gl, scene, invalidate } = useThree();
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    scene.environment = target.texture;
    scene.environmentIntensity = reflections;
    invalidate();
    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, invalidate, reflections]);

  return lights ? (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[-25, -20, 50]} intensity={2} color="#fff1d8" />
      <directionalLight position={[30, 25, 20]} intensity={0.7} color="#bcd4ff" />
    </>
  ) : null;
};

/** Piece colour as glossy lacquer: a clear coat over the player colour. */
export const lacquer = (color: string) => (
  <meshPhysicalMaterial color={color} roughness={0.42} metalness={0.1} clearcoat={0.9} clearcoatRoughness={0.12} />
);

let shadowMap: THREE.CanvasTexture | null = null;
/** A soft round falloff for contact shadows (made once, shared by every piece). */
export function softShadow(): THREE.CanvasTexture {
  if (shadowMap) return shadowMap;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(0.45, 'rgba(0,0,0,0.5)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  shadowMap = new THREE.CanvasTexture(c);
  return shadowMap;
}

import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type * as THREE from 'three';
import { VIEW_TILT_DEG } from '@/lib/boardTilt';

const TILT = (VIEW_TILT_DEG * Math.PI) / 180;

/**
 * The angled camera every 3D layer shares: it looks down at the flat board from VIEW_TILT_DEG, and
 * `units` world units always span the canvas width. `lookAtZ` raises the target for layers that frame
 * a standing piece instead of the board.
 */
export function IsoRig({ units, lookAtZ = 0 }: { units: number; lookAtZ?: number }) {
  const { camera, size, invalidate } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.zoom = size.width / units;
    cam.position.set(0, -60 * Math.sin(TILT), 60 * Math.cos(TILT) + lookAtZ);
    cam.up.set(0, 1, 0);
    cam.lookAt(0, 0, lookAtZ);
    cam.near = 0.1;
    cam.far = 300;
    cam.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, units, lookAtZ, invalidate]);
  return null;
}

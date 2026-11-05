import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { FACES, faceUp } from './Dice3D';

describe('dice faces', () => {
  it('turns every value so that face points at the camera', () => {
    for (let v = 1; v <= 6; v++) {
      const [, n] = FACES.find((f) => f[0] === v)!;
      const out = new THREE.Vector3(...n).applyQuaternion(faceUp(v));
      expect(out.z).toBeCloseTo(1, 5);
    }
  });

  it('puts opposite faces 7 apart and draws each pip face on its own side', () => {
    for (const [v, n, rot] of FACES) {
      const opposite = FACES.find((f) => f[0] === 7 - v)!;
      expect(new THREE.Vector3(...n).dot(new THREE.Vector3(...opposite[1]))).toBe(-1);
      // the pips are drawn on +z of a group rotated by `rot`: that must land on the face normal
      const drawn = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(...rot));
      expect(drawn.distanceTo(new THREE.Vector3(...n))).toBeLessThan(1e-6);
    }
  });
});

let ok: boolean | undefined;

/** 3D needs WebGL. `?2d` in the address forces the flat visuals, handy for comparing and for slow machines. */
export function webglAvailable(): boolean {
  if (ok === undefined) {
    try {
      const canvas = document.createElement('canvas');
      ok = !!(canvas.getContext('webgl2') || canvas.getContext('webgl')) && !new URLSearchParams(window.location.search).has('2d');
    } catch {
      ok = false;
    }
  }
  return ok;
}

import type { Texture, TextureLoader } from 'three';

/** Loads a texture, trying again twice when it fails: a dev-server reload or a busy connection should not leave a blank globe. */
export function loadTexture(loader: TextureLoader, url: string, onLoad: (t: Texture) => void, onError: () => void, tries = 3): void {
  loader.load(url, onLoad, undefined, () => {
    if (tries > 1) window.setTimeout(() => loadTexture(loader, url, onLoad, onError, tries - 1), 600);
    else onError();
  });
}

let probed: boolean | null = null;

/**
 * True when this browser can create a WebGL context. Probed once. `?nogl` in the address forces false, to check the
 * flat-map path on a machine that does have graphics acceleration.
 */
export function webglOk(): boolean {
  if (probed !== null) return probed;
  try {
    if (new URLSearchParams(window.location.search).has('nogl')) return (probed = false);
    const c = document.createElement('canvas');
    probed = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    probed = false;
  }
  return probed;
}

/** Called when a WebGL view failed to start although the probe passed, so later views go straight to their flat version. */
export function markWebglBroken(): void {
  probed = false;
}

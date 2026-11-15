import type { Texture, TextureLoader } from 'three';

/** Loads a texture, trying again twice when it fails: a dev-server reload or a busy connection should not leave a blank globe. */
export function loadTexture(loader: TextureLoader, url: string, onLoad: (t: Texture) => void, onError: () => void, tries = 3): void {
  loader.load(url, onLoad, undefined, () => {
    if (tries > 1) window.setTimeout(() => loadTexture(loader, url, onLoad, onError, tries - 1), 600);
    else onError();
  });
}

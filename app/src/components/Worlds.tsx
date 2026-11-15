import { loadTexture, webglOk } from '../lib/gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Color, Mesh, MeshBasicMaterial, OrthographicCamera, SRGBColorSpace, Scene, SphereGeometry, TextureLoader, WebGLRenderer } from 'three';

import { WORLD_NAME, WORLD_RADIUS_KM, type WorldId } from './worldInfo';
export { WORLD_CREDIT, WORLD_NAME, WORLD_RADIUS_KM, type WorldId } from './worldInfo';

const TEXTURE: Record<WorldId, string> = { earth: 'blue-marble-2048', moon: 'moon-wac-2048', mars: 'mars-viking-2048' };

interface Props {
  worlds: WorldId[];
  /** Text under each world's name. */
  caption: (w: WorldId) => string;
  /** Accessible name of each world's button. */
  action: (w: WorldId) => string;
  onPick: (w: WorldId) => void;
  selected?: WorldId | null;
  /** Fill the height of the parent instead of a fixed band. */
  tall?: boolean;
}

const STILL: Record<string, string> = { earth: 'blue-marble-2048', moon: 'moon-wac-2048', mars: 'mars-viking-2048' };

/**
 * The worlds as slowly turning globes in one row, drawn at true relative size in one WebGL canvas.
 * Each column is a real button.
 */
export function Worlds({ worlds, caption, action, onPick, selected = null, tall = false }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const key = worlds.join(',');

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    let alive = true;
    let frame = 0;
    let renderer: WebGLRenderer;
    if (!webglOk()) {
      setState('error');
      return;
    }
    try {
      renderer = new WebGLRenderer({ antialias: true });
    } catch {
      setState('error');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = 'absolute inset-0 h-full w-full';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    el.prepend(renderer.domElement);
    const scene = new Scene();
    scene.background = new Color('#0B0D0F');
    const camera = new OrthographicCamera(-1, 1, 1, -1, -2000, 2000);
    const geometry = new SphereGeometry(1, 72, 36);
    const loader = new TextureLoader();
    let pending = worlds.length;
    const meshes = worlds.map((w) => {
      // Unlit and slightly darkened, like the other globes in the app.
      const material = new MeshBasicMaterial({ color: new Color(0.82, 0.82, 0.82) });
      loadTexture(
        loader,
        `${import.meta.env.BASE_URL}textures/${TEXTURE[w]}.jpg`,
        (tex) => {
          if (!alive) return;
          tex.colorSpace = SRGBColorSpace;
          tex.anisotropy = 4;
          material.map = tex;
          material.needsUpdate = true;
          if (--pending === 0) setState('ready');
          draw();
        },
        () => alive && setState('error'),
      );
      const mesh = new Mesh(geometry, material);
      mesh.rotation.y = w === 'earth' ? -2.2 : 0.4;
      scene.add(mesh);
      return mesh;
    });

    const largest = Math.max(...worlds.map((w) => WORLD_RADIUS_KM[w]));
    const layout = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      const col = w / worlds.length;
      const big = Math.min(h * 0.4, col * 0.44);
      meshes.forEach((m, i) => {
        const r = (big * WORLD_RADIUS_KM[worlds[i]]) / largest;
        m.scale.setScalar(r);
        m.position.set(-w / 2 + col * (i + 0.5), h * 0.06, 0);
      });
    };
    const draw = () => renderer.render(scene, camera);
    let last = performance.now();
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      for (const m of meshes) m.rotation.y += dt * 0.05; // one turn in about two minutes
      draw();
    };
    const ro = new ResizeObserver(() => {
      layout();
      draw();
    });
    ro.observe(el);
    if (!reduced) frame = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      ro.disconnect();
      geometry.dispose();
      meshes.forEach((m) => {
        const mat = m.material as MeshBasicMaterial;
        mat.map?.dispose();
        mat.dispose();
      });
      renderer.forceContextLoss();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced]);

  return (
    <div ref={holder} className={`relative w-full bg-bg ${tall ? 'h-full min-h-[320px]' : 'h-[46vw] max-h-[420px] min-h-[220px]'}`}>
      {state !== 'ready' && (
        <p className="label absolute left-4 top-4" role="status">
          {state === 'loading' ? 'Loading globes' : 'Still images: this device cannot draw 3D globes'}
        </p>
      )}
      {state === 'error' && (
        <div className="pointer-events-none absolute inset-0 grid items-center" style={{ gridTemplateColumns: `repeat(${worlds.length}, minmax(0, 1fr))` }} aria-hidden="true">
          {worlds.map((w) => (
            <div key={w} className="flex justify-center">
              <span
                className="block aspect-square w-[min(60%,200px)] rounded-full bg-panel"
                style={{
                  backgroundImage: `url(${import.meta.env.BASE_URL}textures/${STILL[w] ?? 'moon-wac-2048'}.jpg)`,
                  backgroundSize: '300% 150%',
                  backgroundPosition: '50% 50%',
                }}
              />
            </div>
          ))}
        </div>
      )}
      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${worlds.length}, minmax(0, 1fr))` }}>
        {worlds.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => onPick(w)}
            aria-label={action(w)}
            aria-pressed={selected === null ? undefined : selected === w}
            className="world group flex flex-col justify-end px-3 pb-3 text-left sm:px-4 sm:pb-4"
          >
            <span className={`border-l-2 pl-2.5 ${selected === w ? 'border-accent' : 'border-line group-hover:border-accent'}`}>
              <span className="block text-[14px] font-semibold text-text sm:text-[17px]">{WORLD_NAME[w]}</span>
              <span className="num block text-[10px] text-muted sm:text-[11px]">{caption(w)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  TextureLoader,
  WebGLRenderer,
} from 'three';
import { Pause, Play } from 'lucide-react';
import { dataUrl, loadElevation, type ExtractItem } from '../data/sites';
import type { ModuleType, PlacedModule } from '../lib/simAdapter';
import { shownLayer, type GroundLayer } from './Ground';
import { SourceBadge } from './Badges';

// BOOTS: two places as terrain, side by side at one scale, with the base on each.
// Horizontal and vertical units are kilometres on both, with no vertical exaggeration.

/** Largest number of height samples per side. Coarser grids (Moon 250, Mars 43) are used as they are. */
const MAX_SAMPLES = 256;
/** Modules are drawn far larger than life: a 9 m habitat would be a tenth of a pixel at this scale. */
const MODULE_KM = 0.45;

interface Side {
  item: ExtractItem;
  /** Modules to stand on this terrain. Empty before the layout is deployed there. */
  modules: PlacedModule[];
  note?: string;
}

interface Props {
  earth: Side;
  target: Side;
  windowKm: number;
  layer: GroundLayer;
  /** Layout grid size, to place modules over the middle band of the terrain as in the plan view. */
  cols: number;
  rows: number;
}

interface Built {
  scene: Scene;
  modules: Group;
  heightAt: (xKm: number, zKm: number) => number;
  reliefKm: number;
  dispose: () => void;
}

function moduleGeometry(type: ModuleType): BufferGeometry {
  const s = MODULE_KM;
  switch (type) {
    case 'habitat':
      return new CylinderGeometry(s * 0.5, s * 0.5, s * 0.7, 8).translate(0, s * 0.35, 0);
    case 'solar':
      return new BoxGeometry(s, s * 0.06, s * 0.6).rotateX(-0.5).translate(0, s * 0.3, 0);
    case 'battery':
      return new BoxGeometry(s * 0.5, s * 0.4, s * 0.5).translate(0, s * 0.2, 0);
    case 'greenhouse':
      return new CylinderGeometry(s * 0.35, s * 0.35, s, 6, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2);
    case 'iceMiner':
      return new ConeGeometry(s * 0.4, s * 0.9, 5).translate(0, s * 0.45, 0);
    case 'landingPad':
      return new CylinderGeometry(s * 0.7, s * 0.7, s * 0.06, 12).translate(0, s * 0.03, 0);
  }
}

function build(item: ExtractItem, heights: Float32Array, windowKm: number, layer: GroundLayer, onTexture: () => void): Built {
  const el = item.elevation!;
  const step = Math.max(1, Math.ceil(el.size / MAX_SAMPLES));
  const n = Math.floor((el.size - 1) / step) + 1;
  let min = Infinity;
  let max = -Infinity;
  for (const h of heights)
    if (!Number.isNaN(h)) {
      if (h < min) min = h;
      if (h > max) max = h;
    }
  if (!(max >= min)) {
    min = 0;
    max = 0;
  }
  const sample = (col: number, row: number) => {
    const h = heights[Math.min(el.size - 1, row * step) * el.size + Math.min(el.size - 1, col * step)];
    return ((Number.isNaN(h) ? min : h) - min) / 1000;
  };
  const geo = new PlaneGeometry(windowKm, windowKm, n - 1, n - 1).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) pos.setY(r * n + c, sample(c, r));
  geo.computeVertexNormals();

  const scene = new Scene();
  scene.background = new Color('#0B0D0F');
  // The same light on every body: from the north-west, 45 degrees up, as in the shaded relief.
  const sun = new DirectionalLight(0xffffff, 2.4);
  sun.position.set(-1, 1.4, -1);
  scene.add(sun, new AmbientLight(0xffffff, 0.9));

  const material = new MeshLambertMaterial({ color: 0x6b737b, flatShading: n < 100 });
  const shown = shownLayer(item, layer);
  if (shown === 'image' && item.image) {
    new TextureLoader().load(dataUrl(item.image.file), (tex) => {
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = 4;
      material.map = tex;
      material.color.set(0xffffff);
      material.needsUpdate = true;
      onTexture();
    });
  }
  scene.add(new Mesh(geo, material));
  const modules = new Group();
  scene.add(modules);

  const half = windowKm / 2;
  const heightAt = (xKm: number, zKm: number) => {
    const c = Math.round(((xKm + half) / windowKm) * (n - 1));
    const r = Math.round(((zKm + half) / windowKm) * (n - 1));
    return sample(Math.max(0, Math.min(n - 1, c)), Math.max(0, Math.min(n - 1, r)));
  };
  return {
    scene,
    modules,
    heightAt,
    reliefKm: (max - min) / 1000,
    dispose: () => {
      geo.dispose();
      material.map?.dispose();
      material.dispose();
    },
  };
}

export function Terrain3D({ earth, target, windowKm, layer, cols, rows }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const [orbit, setOrbit] = useState(!reduced);
  const orbitRef = useRef(orbit);
  orbitRef.current = orbit;
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const built = useRef<[Built, Built] | null>(null);
  const redraw = useRef<() => void>(() => {});
  const sides = [earth, target] as const;
  const ready = earth.item.elevation !== null && target.item.elevation !== null;

  // Terrain: rebuilt when a place or the layer changes.
  useEffect(() => {
    const el = holder.current;
    if (!el || !ready) return;
    let alive = true;
    let frame = 0;
    setState('loading');
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setScissorTest(true);
    el.prepend(renderer.domElement);
    renderer.domElement.className = 'absolute inset-0 h-full w-full';
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', `Terrain of ${earth.item.name} and ${target.item.name} side by side at one scale`);
    const camera = new PerspectiveCamera(32, 1, 0.5, 1000);
    let angle = 0.6;
    let last = performance.now();

    const draw = () => {
      const b = built.current;
      if (!b) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) return;
      const stacked = w < 640;
      const vw = stacked ? w : Math.floor(w / 2);
      const vh = stacked ? Math.floor(h / 2) : h;
      // One camera path for both, so the two are always seen from the same place.
      const lift = Math.max(b[0].reliefKm, b[1].reliefKm) * 0.4;
      // Far enough back that the whole square, corner to corner, fits the narrower side of the viewport.
      const aspect = vw / vh;
      const halfFov = Math.tan(((camera.fov / 2) * Math.PI) / 180);
      const distance = (windowKm * 0.7) / (halfFov * Math.min(1, aspect));
      camera.aspect = aspect;
      camera.position.set(Math.sin(angle) * distance * 0.88, distance * 0.47 + lift, Math.cos(angle) * distance * 0.88);
      camera.lookAt(0, lift, 0);
      camera.updateProjectionMatrix();
      b.forEach((side, i) => {
        // WebGL viewports count from the bottom: Earth is on the left, or on top when stacked.
        const x = stacked ? 0 : i * vw;
        const y = stacked ? (1 - i) * vh : 0;
        renderer.setViewport(x, y, vw, vh);
        renderer.setScissor(x, y, vw, vh);
        renderer.render(side.scene, camera);
      });
    };
    redraw.current = draw;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!orbitRef.current) return;
      angle += dt * 0.12; // one turn in about 52 seconds
      draw();
    };
    const ro = new ResizeObserver(() => {
      renderer.setSize(el.clientWidth, el.clientHeight, false);
      draw();
    });

    Promise.all([loadElevation(earth.item.elevation!), loadElevation(target.item.elevation!)]).then(
      ([he, ht]) => {
        if (!alive) return;
        built.current = [build(earth.item, he, windowKm, layer, () => draw()), build(target.item, ht, windowKm, layer, () => draw())];
        setState('ready');
        ro.observe(el);
        frame = requestAnimationFrame(loop);
      },
      () => alive && setState('error'),
    );
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      ro.disconnect();
      built.current?.forEach((b) => b.dispose());
      built.current = null;
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [earth.item, target.item, windowKm, layer, ready]);

  // Modules: replaced when the layout changes, without rebuilding the terrain.
  useEffect(() => {
    const b = built.current;
    if (!b || state !== 'ready') return;
    const material = new MeshBasicMaterial({ color: 0xd7dde3 });
    const geometries: BufferGeometry[] = [];
    b.forEach((side, i) => {
      side.modules.clear();
      for (const m of sides[i].modules) {
        if (m.x >= cols || m.y >= rows) continue;
        const x = ((m.x + 0.5) / cols - 0.5) * windowKm;
        const z = ((m.y + 0.5) / rows - 0.5) * (windowKm / 2);
        const g = moduleGeometry(m.type);
        geometries.push(g);
        const mesh = new Mesh(g, material);
        mesh.position.set(x, side.heightAt(x, z), z);
        side.modules.add(mesh);
      }
    });
    redraw.current();
    return () => {
      geometries.forEach((g) => g.dispose());
      material.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earth.modules, target.modules, state, cols, rows, windowKm]);

  if (!ready) return <p className="p-3 text-[13px] text-muted">No data. A terrain extract is missing for one of the two places.</p>;

  return (
    <div>
      <div ref={holder} className="relative h-[70vw] max-h-[460px] min-h-[320px] w-full bg-bg sm:h-[38vw]">
        {state !== 'ready' && (
          <p className="label absolute inset-0 flex items-center px-3" role="status">
            {state === 'loading' ? 'Loading terrain' : 'Terrain could not be loaded'}
          </p>
        )}
        {state === 'ready' &&
          sides.map((s, i) => (
            <p key={s.item.id} className={`label pointer-events-none absolute left-3 bg-bg px-1.5 py-1 !text-text ${i === 0 ? 'top-3' : 'top-[calc(50%+12px)] sm:left-[calc(50%+12px)] sm:top-3'}`}>
              {s.item.name.split(',')[0]}
              {s.note ? <span className="ml-2 text-muted">{s.note}</span> : null}
            </p>
          ))}
        <button
          type="button"
          onClick={() => setOrbit((o) => !o)}
          aria-pressed={orbit}
          className="btn absolute bottom-3 right-3 !bg-panel"
        >
          {orbit ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />} {orbit ? 'Pause orbit' : 'Orbit'}
        </button>
      </div>
      <div className="grid gap-px border-t border-line bg-line sm:grid-cols-2">
        {sides.map((s) => {
          const el = s.item.elevation!;
          const img = shownLayer(s.item, layer) === 'image' ? s.item.image : null;
          return (
            <p key={s.item.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 bg-bg px-3 py-2 text-[11px] text-muted">
              <span className="num text-text">
                {windowKm} km × {windowKm} km · {(el.max - el.min).toLocaleString('en-US', { maximumFractionDigits: 0 })} m of relief · {el.pixelM.toFixed(0)} m posts
              </span>
              <SourceBadge badge={el.badge} source={el.product} />
              <span className="basis-full">
                {el.attribution}
                {img ? ` Image: ${img.attribution}` : ''}
              </span>
            </p>
          );
        })}
      </div>
      <p className="border-t border-line px-3 py-2 text-[11px] text-muted" role="note">
        Same horizontal and vertical scale on both, no vertical exaggeration, same camera and light. Heights are measured from each place's own
        lowest point. Modules are drawn about 50 times larger than life so they can be seen.
      </p>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AmbientLight,
  CircleGeometry,
  RingGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  Quaternion,
  Raycaster,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { WORLD_NAME, WORLD_RADIUS_KM, type WorldId } from './Worlds';

export interface HeroPlace {
  id: string;
  name: string;
  body: 'moon' | 'mars';
  lat: number;
  lon: number;
  /** True when measured values exist for the place, so it can be matched. */
  hasValues: boolean;
  /** Mission and date, or status. */
  sub: string;
}

interface Props {
  places: HeroPlace[];
  /** Number of scored Earth cells, for the caption under Earth. */
  cells: number;
  onPlace: (id: string) => void;
  onWorld: (w: WorldId) => void;
}

const ORDER: WorldId[] = ['mars', 'earth', 'moon'];
const TEXTURE: Record<WorldId, string> = { earth: 'blue-marble-2048', moon: 'moon-wac-2048', mars: 'mars-viking-2048' };
// Resting turn rate, radians per second: one turn in about two minutes. The Moon is slowest.
const SPIN: Record<WorldId, number> = { earth: 0.05, mars: 0.058, moon: 0.04 };
// Initial tilt. The Moon is tipped to show its south pole, where most base candidates are.
const TILT: Record<WorldId, number> = { earth: 0.28, mars: 0.2, moon: -0.7 };

interface Slot {
  world: WorldId;
  cx: number;
  cy: number;
  r: number;
}

/** Where each globe sits, in canvas pixels from the top left. One function for the canvas and the labels. */
export function layoutGlobes(w: number, h: number): Slot[] {
  // The transparent navigation bar lies over the top of the canvas: keep the globes below it.
  const nav = w < 640 ? 56 : 72;
  const uh = h - nav;
  if (w < 640) {
    const rE = Math.min(w * 0.27, uh * 0.225);
    return [
      { world: 'earth', cx: w * 0.5, cy: nav + uh * 0.25, r: rE },
      { world: 'mars', cx: w * 0.27, cy: nav + uh * 0.73, r: rE * 0.62 },
      { world: 'moon', cx: w * 0.73, cy: nav + uh * 0.73, r: rE * 0.5 },
    ];
  }
  const col = w / 3;
  const rE = Math.min(uh * 0.37, col * 0.5);
  const cy = nav + uh * 0.45;
  return [
    { world: 'mars', cx: col * 0.5, cy, r: rE * 0.74 },
    { world: 'earth', cx: col * 1.5, cy, r: rE },
    { world: 'moon', cx: col * 2.5, cy, r: rE * 0.62 },
  ];
}

const toVec = (lat: number, lon: number): Vector3 => {
  // Matches the texture mapping of three's SphereGeometry: u = 0 is longitude -180, and x = -cos(phi).
  const phi = ((lon + 180) * Math.PI) / 180;
  const la = (lat * Math.PI) / 180;
  return new Vector3(-Math.cos(phi) * Math.cos(la), Math.sin(la), Math.sin(phi) * Math.cos(la));
};

/**
 * Mars, Earth and the Moon as three globes in one WebGL canvas. Each turns slowly and can be dragged.
 * Mars and the Moon carry a pin for every named place. Sizes are not to scale: Earth is drawn larger
 * than its real ratio so the pins on the other two stay usable, and the radii are printed instead.
 */
export function HeroGlobes({ places, cells, onPlace, onWorld }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const placesRef = useRef(places);
  placesRef.current = places;
  const onPlaceRef = useRef(onPlace);
  onPlaceRef.current = onPlace;
  const slots = useMemo(() => (size.w > 0 ? layoutGlobes(size.w, size.h) : []), [size]);
  const placeKey = places.map((p) => p.id).join('|');

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    let alive = true;
    let frame = 0;
    let visible = true;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true });
    } catch {
      setState('error');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const canvas = renderer.domElement;
    canvas.className = 'absolute inset-0 h-full w-full';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.touchAction = 'pan-y';
    el.prepend(canvas);

    const scene = new Scene();
    scene.background = new Color('#0B0D0F');
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 5000);
    camera.position.z = 2000;
    scene.add(new AmbientLight(0xffffff, 0.62));
    const sun = new DirectionalLight(0xffffff, 2.3);
    sun.position.set(-1.2, 0.7, 1.6);
    scene.add(sun);

    const geo = new SphereGeometry(1, 96, 48);
    // A base marker: a flat ring on the ground, and for a place with measured values a small habitat
    // dome in the middle. Drawn in pixel units, so the size on screen is the same on every globe.
    const ringBig = new RingGeometry(8.6, 10.4, 40).rotateX(-Math.PI / 2);
    const ringSmall = new RingGeometry(4.4, 5.8, 32).rotateX(-Math.PI / 2);
    const dome = new SphereGeometry(5.6, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const dot = new CircleGeometry(1.8, 16).rotateX(-Math.PI / 2);
    const hit = new SphereGeometry(0.05, 8, 6);
    const off = { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 };
    const white = new MeshBasicMaterial({ color: 0xd7dde3, ...off });
    const amber = new MeshBasicMaterial({ color: 0xffb000, ...off });
    const amberDome = new MeshStandardMaterial({ color: 0xffb000, roughness: 0.55, metalness: 0, emissive: 0x6b4a00, ...off });
    const ghost = new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const loader = new TextureLoader();

    interface Globe {
      world: WorldId;
      group: Group;
      vx: number; // spin velocity, rad/s
      vy: number; // pitch velocity
      slot: Slot;
    }
    const globes: Globe[] = ORDER.map((world) => {
      const group = new Group();
      group.rotation.order = 'YXZ';
      group.rotation.x = TILT[world];
      group.rotation.y = world === 'earth' ? -2.0 : world === 'moon' ? 0.2 : 2.2;
      const mat = new MeshStandardMaterial({ roughness: 0.95, metalness: 0, color: new Color(0.92, 0.92, 0.92) });
      const sphere = new Mesh(geo, mat);
      group.add(sphere);
      loader.load(
        `${import.meta.env.BASE_URL}textures/${TEXTURE[world]}.jpg`,
        (tex) => {
          if (!alive) return;
          tex.colorSpace = SRGBColorSpace;
          tex.anisotropy = 8;
          mat.map = tex;
          mat.needsUpdate = true;
          loaded += 1;
          if (loaded === ORDER.length) setState('ready');
        },
        undefined,
        () => alive && setState('error'),
      );
      scene.add(group);
      return { world, group, vx: SPIN[world], vy: 0, slot: { world, cx: 0, cy: 0, r: 1 } };
    });
    let loaded = 0;

    // One marker per named place on Mars and the Moon.
    const up = new Vector3(0, 1, 0);
    const hits: { mesh: Mesh; g: Globe }[] = [];
    const markers: { group: Group; g: Globe }[] = [];
    for (const p of placesRef.current) {
      const g = globes.find((x) => x.world === p.body);
      if (!g) continue;
      const n = toVec(p.lat, p.lon);
      const pin = new Group();
      pin.position.copy(n.clone().multiplyScalar(1.002));
      pin.quaternion.copy(new Quaternion().setFromUnitVectors(up, n));
      const m = new Group();
      if (p.hasValues) {
        m.add(new Mesh(ringBig, amber), new Mesh(dome, amberDome));
      } else {
        m.add(new Mesh(ringSmall, white), new Mesh(dot, white));
      }
      const t = new Mesh(hit, ghost);
      t.userData.placeId = p.id;
      hits.push({ mesh: t, g });
      markers.push({ group: m, g });
      pin.add(m, t);
      g.group.add(pin);
    }

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
      const ss = layoutGlobes(w, h);
      for (const g of globes) {
        const s = ss.find((x) => x.world === g.world)!;
        g.slot = s;
        g.group.scale.setScalar(s.r);
        g.group.position.set(s.cx - w / 2, h / 2 - s.cy, 0);
      }
      // A pin can be hit within 14 px whatever the size of its globe (the hit mesh has radius 0.05).
      for (const { mesh, g } of hits) mesh.scale.setScalar(Math.max(1, 14 / (g.slot.r * 0.05)));
      // Markers are drawn in pixel units: one unit on a marker is one pixel on screen.
      for (const { group, g } of markers) group.scale.setScalar(1 / g.slot.r);
      setSize({ w, h });
      draw();
    };
    const draw = () => renderer.render(scene, camera);

    // Pointer: drag a globe to turn it, hover a pin to read it, click a pin to open that place.
    const ray = new Raycaster();
    const ndc = new Vector2();
    let drag: { g: Globe; x: number; y: number; px: number; py: number; moved: number; t: number } | null = null;
    let hovered: string | null = null;
    const local = (ev: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      return { x: ev.clientX - b.left, y: ev.clientY - b.top, w: b.width, h: b.height };
    };
    const globeAt = (x: number, y: number) =>
      globes.find((g) => Math.hypot(x - g.slot.cx, y - g.slot.cy) <= g.slot.r) ?? null;
    const pinAt = (x: number, y: number, w: number, h: number): string | null => {
      ndc.set((x / w) * 2 - 1, -(y / h) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const first = ray.intersectObjects(
        globes.map((g) => g.group),
        true,
      )[0];
      const id = first?.object.userData.placeId;
      return typeof id === 'string' ? id : null;
    };
    const showTip = (id: string | null, x: number, y: number) => {
      const t = tip.current;
      if (!t) return;
      const p = id ? placesRef.current.find((q) => q.id === id) : null;
      if (!p) {
        t.style.opacity = '0';
        return;
      }
      t.querySelector('[data-n]')!.textContent = p.name;
      t.querySelector('[data-s]')!.textContent = `${p.sub}${p.sub ? ' · ' : ''}${p.hasValues ? 'measured values' : 'no measured values yet'}`;
      t.style.opacity = '1';
      t.style.transform = `translate(${Math.round(x + 14)}px, ${Math.round(y - 12)}px)`;
    };
    const onDown = (ev: PointerEvent) => {
      const { x, y, w, h } = local(ev);
      // A pin stands out of the globe, so a press on one counts even just outside the disc.
      const pin = pinAt(x, y, w, h);
      const g = globeAt(x, y) ?? (pin ? globes.find((q) => q.world === placesRef.current.find((p) => p.id === pin)?.body) : null) ?? null;
      if (!g) return;
      drag = { g, x, y, px: x, py: y, moved: 0, t: performance.now() };
      g.vx = 0;
      g.vy = 0;
      canvas.setPointerCapture(ev.pointerId);
    };
    const onMove = (ev: PointerEvent) => {
      const { x, y, w, h } = local(ev);
      if (drag) {
        const dx = x - drag.px;
        const dy = y - drag.py;
        const now = performance.now();
        const dt = Math.max(0.008, (now - drag.t) / 1000);
        drag.moved += Math.hypot(dx, dy);
        drag.t = now;
        drag.px = x;
        drag.py = y;
        const k = 1 / drag.g.slot.r; // radians per pixel at the globe's centre
        drag.g.group.rotation.y += dx * k;
        drag.g.group.rotation.x = Math.max(-1.45, Math.min(1.45, drag.g.group.rotation.x + dy * k));
        drag.g.vx = (dx * k) / dt;
        drag.g.vy = (dy * k) / dt;
        showTip(null, 0, 0);
        draw();
        return;
      }
      const id = pinAt(x, y, w, h);
      if (id !== hovered) hovered = id;
      showTip(id, x, y);
      canvas.style.cursor = id ? 'pointer' : globeAt(x, y) ? 'grab' : 'default';
    };
    const onUp = (ev: PointerEvent) => {
      const d = drag;
      drag = null;
      if (!d) return;
      const { x, y, w, h } = local(ev);
      if (d.moved < 5) {
        const id = pinAt(x, y, w, h);
        if (id) onPlaceRef.current(id);
        d.g.vx = SPIN[d.g.world];
        return;
      }
      // Fling: keep the speed of the release, capped, and let it settle back to the resting turn.
      d.g.vx = Math.max(-3, Math.min(3, d.g.vx));
    };
    const onLeave = () => showTip(null, 0, 0);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointerleave', onLeave);

    let last = performance.now();
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (!visible || document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      for (const g of globes) {
        if (drag?.g === g) continue;
        const rest = reduced ? 0 : SPIN[g.world];
        // A hovered pin holds its globe still so it can be clicked.
        const hold = hovered && placesRef.current.find((p) => p.id === hovered)?.body === g.world;
        g.group.rotation.y += (hold ? 0 : g.vx) * dt;
        g.group.rotation.x = Math.max(-1.45, Math.min(1.45, g.group.rotation.x + g.vy * dt));
        // Ease the speed back to rest and the pitch back to its tilt.
        g.vx += (rest - g.vx) * Math.min(1, dt * 1.6);
        g.vy *= Math.max(0, 1 - dt * 4);
      }
      draw();
    };
    const ro = new ResizeObserver(layout);
    ro.observe(el);
    const io = new IntersectionObserver((e) => (visible = e[0]?.isIntersecting ?? true));
    io.observe(el);
    layout();
    frame = requestAnimationFrame(loop);

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      geo.dispose();
      ringBig.dispose();
      ringSmall.dispose();
      dome.dispose();
      dot.dispose();
      amberDome.dispose();
      hit.dispose();
      white.dispose();
      amber.dispose();
      ghost.dispose();
      for (const g of globes) {
        const m = (g.group.children[0] as Mesh).material as MeshStandardMaterial;
        m.map?.dispose();
        m.dispose();
      }
      renderer.dispose();
      canvas.remove();
    };
    // The pins are built once per set of places.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKey, reduced]);

  const count = (b: 'moon' | 'mars') => places.filter((p) => p.body === b).length;
  const caption = (w: WorldId) => (w === 'earth' ? `${cells.toLocaleString('en-US')} cells scored` : `${count(w)} named places`);

  return (
    <div ref={holder} className="relative h-full min-h-[340px] w-full touch-pan-y overflow-hidden bg-bg">
      {state !== 'ready' && (
        <p className="readout absolute left-4 top-20" role="status">
          {state === 'loading' ? 'Loading globes' : 'Globes could not be drawn on this device'}
        </p>
      )}
      <div
        ref={tip}
        className="pointer-events-none absolute left-0 top-0 z-10 max-w-[260px] bg-bg px-2.5 py-1.5 opacity-0"
        style={{ transition: 'opacity 120ms' }}
        role="status"
      >
        <p data-n className="text-[13px] font-medium leading-4 text-text" />
        <p data-s className="num mt-0.5 text-[10px] leading-4 text-muted" />
      </div>
      {slots.map((s) => (
        <button
          key={s.world}
          type="button"
          onClick={() => onWorld(s.world)}
          className="world-name absolute -translate-x-1/2 text-center"
          style={{ left: s.cx, top: s.cy + s.r + (size.w < 640 ? 8 : 18), maxWidth: size.w < 640 ? size.w * 0.44 : size.w / 3 - 24 }}
        >
          <span className="display block text-[17px] text-text sm:text-[22px]">{WORLD_NAME[s.world]}</span>
          <span className="num block text-[10px] text-muted sm:text-[11px]">
            {caption(s.world)}
            {size.w >= 640 && <span className="block">radius {WORLD_RADIUS_KM[s.world].toLocaleString('en-US')} km</span>}
          </span>
        </button>
      ))}
      <div className="absolute bottom-4 left-4 hidden max-w-[80%] flex-wrap items-center gap-x-6 gap-y-1 text-[12px] text-muted sm:flex sm:left-8">
        <span className="inline-flex items-center gap-2">
          <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
            <ellipse cx="11" cy="9" rx="10" ry="4" fill="none" stroke="#FFB000" strokeWidth="1.6" />
            <path d="M5.5 9 A5.5 5.5 0 0 1 16.5 9 Z" fill="#FFB000" />
          </svg>
          Base site with measured values
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
            <ellipse cx="11" cy="7" rx="6" ry="3" fill="none" stroke="#D7DDE3" strokeWidth="1.4" />
            <circle cx="11" cy="7" r="1.4" fill="#D7DDE3" />
          </svg>
          Landing site or candidate region, no values yet
        </span>
        <span>Drag a globe. Not to scale.</span>
      </div>
    </div>
  );
}

import { loadTexture } from '../lib/gl';
import { flags } from '../flags';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Points,
  PointsMaterial,
  CanvasTexture,
  PlaneGeometry,
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

/** A named Earth site that can be pinned on the Earth globe. */
export interface HeroSite {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** A site proposed by the team, drawn amber. */
  proposed: boolean;
}

/** A link from the selected place to an Earth cell, strongest first. */
export interface HeroLink {
  lat: number;
  lon: number;
  score: number | null;
}

/** What is selected: a place on the Moon or Mars, or a site on Earth. */
export type HeroPick = { kind: 'place' | 'site'; id: string } | null;

interface Props {
  places: HeroPlace[];
  sites: HeroSite[];
  /** Number of scored Earth cells, for the caption under Earth. */
  cells: number;
  /** A pin was pressed. */
  onPick: (kind: 'place' | 'site', id: string) => void;
  onWorld: (w: WorldId) => void;
  pick: HeroPick;
  /** Up to five links drawn from the selected place to Earth cells, or from a selected site to the target it most resembles. */
  links: HeroLink[];
  /** For a selected Earth site: the place on the Moon or Mars it most resembles. */
  reverse: { place: string; score: number | null } | null;
  /** The link shown in the strip. */
  active: number;
  /** The strip under the globes. */
  children?: React.ReactNode;
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
export function layoutGlobes(w: number, h: number, reserve = 0): Slot[] {
  // The transparent navigation bar lies over the top of the canvas: keep the globes below it.
  // The navigation lies over the top of the canvas; below 1280 px it is a second row.
  const wide = typeof window !== 'undefined' && window.innerWidth >= 1280;
  const nav = (w < 640 ? 56 : 72) + (wide ? 0 : 44);
  const uh = h - nav - reserve;
  if (w < 640) {
    const rE = Math.min(w * 0.27, uh * 0.225);
    return [
      { world: 'earth', cx: w * 0.5, cy: nav + uh * 0.25, r: rE },
      { world: 'mars', cx: w * 0.27, cy: nav + uh * 0.73, r: rE * 0.62 },
      { world: 'moon', cx: w * 0.73, cy: nav + uh * 0.73, r: rE * 0.5 },
    ];
  }
  // Earth is the largest and sits a little right of centre; Mars and the Moon stand either side, off the line,
  // so the arcs between them have room to rise.
  const rE = Math.min(uh * 0.38, w * 0.165);
  const cy = nav + uh * 0.46;
  return [
    { world: 'mars', cx: w * 0.17, cy: cy - uh * 0.06, r: rE * 0.74 },
    { world: 'earth', cx: w * 0.5, cy, r: rE },
    { world: 'moon', cx: w * 0.84, cy: cy + uh * 0.05, r: rE * 0.62 },
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
export function HeroGlobes({ places, sites, cells, onPick, onWorld, pick, links, reverse, active, children }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  // Show the globes after a moment even if a texture is slow: an empty hero is worse than a plain one.
  const [late, setLate] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setLate(true), 1000);
    return () => window.clearTimeout(t);
  }, []);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const placesRef = useRef(places);
  placesRef.current = places;
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const sitesRef = useRef(sites);
  sitesRef.current = sites;
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const linksRef = useRef(links);
  linksRef.current = links;
  const reverseRef = useRef(reverse);
  reverseRef.current = reverse;
  const activeRef = useRef(active);
  activeRef.current = active;
  // SVG nodes of the links, moved every frame with the globes they join.
  const linkEls = useRef<(SVGGElement | null)[]>([]);
  const markEl = useRef<SVGCircleElement>(null);
  // When the current pair was picked: the rocket leaves then.
  const launchAt = useRef(0);
  const pairKey = `${pick?.kind}:${pick?.id}|${links.map((l) => `${l.lat},${l.lon}`).join(';')}|${reverse?.place ?? ''}`;
  useEffect(() => {
    launchAt.current = performance.now();
  }, [pairKey]);
  // Set by the effect below: turns a globe to face a point, or lets it spin again.
  const focusApi = useRef<{ focus: (updates: { world: WorldId; lat: number; lon: number }[]) => void; release: () => void } | null>(null);
  // On a wide screen the pair strip lies over the bottom of the canvas: the globes make room for it.
  const reserve = pick && size.w >= 1024 ? 190 : 0;
  const reserveRef = useRef(0);
  reserveRef.current = reserve;
  const relayout = useRef<() => void>(() => {});
  const slots = useMemo(() => (size.w > 0 ? layoutGlobes(size.w, size.h, reserve) : []), [size, reserve]);
  const placeKey = `${places.map((p) => p.id).join('|')}#${sites.map((p) => p.id).join('|')}`;

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    let alive = true;
    let frame = 0;
    let visible = true;
    // `?nogl` shows the still-image fallback, to check it without a device that cannot draw WebGL.
    if (new URLSearchParams(window.location.search).has('nogl')) {
      setState('error');
      return;
    }
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
      /** Rotation the globe is easing towards, set while a pair is selected. */
      focus: { x: number; y: number } | null;
    }
    const globes: Globe[] = ORDER.map((world) => {
      const group = new Group();
      group.rotation.order = 'XYZ';
      group.rotation.x = TILT[world];
      group.rotation.y = world === 'earth' ? -2.0 : world === 'moon' ? 0.2 : 2.2;
      const mat = new MeshStandardMaterial({ roughness: 0.95, metalness: 0, color: new Color(0.92, 0.92, 0.92) });
      const sphere = new Mesh(geo, mat);
      group.add(sphere);
      loadTexture(
        loader,
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
        () => alive && setState('error'),
      );
      scene.add(group);
      return { world, group, vx: SPIN[world], vy: 0, slot: { world, cx: 0, cy: 0, r: 1 }, focus: null };
    });
    let loaded = 0;

    // An experiment (flags.stars): a faint starfield in three layers that twinkle slowly out of step.
    const starLayers = flags.stars
      ? [0, 1, 2].map((k) => {
          const n = [100, 60, 24][k];
          const pts = new Float32Array(n * 3);
          // A fixed seed, so the sky is the same on every visit.
          let seed = 7919 * (k + 1);
          const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
          const unit = new Float32Array(n * 2);
          for (let i = 0; i < n; i++) {
            unit[i * 2] = rnd();
            unit[i * 2 + 1] = rnd();
          }
          const geoS = new BufferGeometry();
          geoS.setAttribute('position', new BufferAttribute(pts, 3));
          const mat = new PointsMaterial({ color: 0xffffff, size: [1.1, 1.5, 2][k], sizeAttenuation: false, transparent: true, opacity: [0.26, 0.38, 0.52][k], depthWrite: false });
          const obj = new Points(geoS, mat);
          obj.renderOrder = -2;
          obj.frustumCulled = false;
          scene.add(obj);
          return { obj, geoS, mat, unit, pts, base: [0.26, 0.38, 0.52][k], phase: k * 2.1 };
        })
      : [];

    // A soft white halo behind each world, so it stands out from the page. It is the one glow on the home page.
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = haloCanvas.height = 256;
    {
      const g = haloCanvas.getContext('2d')!;
      const grad = g.createRadialGradient(128, 128, 128 * 0.77, 128, 128, 128);
      grad.addColorStop(0, 'rgba(255,255,255,0.09)');
      grad.addColorStop(0.35, 'rgba(255,255,255,0.03)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 256);
    }
    const haloTex = new CanvasTexture(haloCanvas);
    const haloGeo = new PlaneGeometry(1, 1);
    const haloMat = new MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false });
    const halos = globes.map((g) => {
      const m = new Mesh(haloGeo, haloMat);
      m.renderOrder = -1;
      scene.add(m);
      return { m, g };
    });

    // One marker per named place on Mars and the Moon, and one per featured site on Earth.
    const up = new Vector3(0, 1, 0);
    const hits: { mesh: Mesh; g: Globe }[] = [];
    const markers: { group: Group; g: Globe }[] = [];
    const pins = [
      ...placesRef.current.map((p) => ({ key: `place:${p.id}`, world: p.body as WorldId, lat: p.lat, lon: p.lon, strong: p.hasValues })),
      ...sitesRef.current.map((p) => ({ key: `site:${p.id}`, world: 'earth' as WorldId, lat: p.lat, lon: p.lon, strong: p.proposed })),
    ];
    for (const p of pins) {
      const g = globes.find((x) => x.world === p.world);
      if (!g) continue;
      const n = toVec(p.lat, p.lon);
      const pin = new Group();
      pin.position.copy(n.clone().multiplyScalar(1.002));
      pin.quaternion.copy(new Quaternion().setFromUnitVectors(up, n));
      const m = new Group();
      if (p.strong) {
        m.add(new Mesh(ringBig, amber), new Mesh(dome, amberDome));
      } else {
        m.add(new Mesh(ringSmall, white), new Mesh(dot, white));
      }
      const t = new Mesh(hit, ghost);
      t.userData.pinKey = p.key;
      hits.push({ mesh: t, g });
      markers.push({ group: m, g });
      pin.add(m, t);
      g.group.add(pin);
    }
    const pinInfo = (key: string | null) => {
      if (!key) return null;
      const [kind, ...rest] = key.split(':');
      const id = rest.join(':');
      if (kind === 'place') {
        const p = placesRef.current.find((q) => q.id === id);
        return p ? { world: p.body as WorldId, name: p.name, line: `${p.sub}${p.sub ? ' · ' : ''}${p.hasValues ? 'measured values' : 'no measured values yet'}` } : null;
      }
      const q = sitesRef.current.find((x) => x.id === id);
      return q ? { world: 'earth' as WorldId, name: q.name.split(',')[0], line: q.proposed ? 'Proposed by the team' : 'Established analog site' } : null;
    };

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
      const ss = layoutGlobes(w, h, reserveRef.current);
      for (const g of globes) {
        const s = ss.find((x) => x.world === g.world)!;
        g.slot = s;
        g.group.scale.setScalar(s.r);
        g.group.position.set(s.cx - w / 2, h / 2 - s.cy, 0);
      }
      for (const L of starLayers) {
        for (let i = 0; i < L.unit.length / 2; i++) {
          L.pts[i * 3] = (L.unit[i * 2] - 0.5) * w;
          L.pts[i * 3 + 1] = (L.unit[i * 2 + 1] - 0.5) * h;
          L.pts[i * 3 + 2] = -1500;
        }
        L.geoS.attributes.position.needsUpdate = true;
      }
      for (const { m, g } of halos) {
        m.scale.setScalar(g.slot.r * 2.6);
        m.position.set(g.group.position.x, g.group.position.y, -g.slot.r * 1.2);
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
      const id = first?.object.userData.pinKey;
      return typeof id === 'string' ? id : null;
    };
    const showTip = (id: string | null, x: number, y: number) => {
      const t = tip.current;
      if (!t) return;
      const p = pinInfo(id);
      if (!p) {
        t.style.opacity = '0';
        return;
      }
      t.querySelector('[data-n]')!.textContent = p.name;
      t.querySelector('[data-s]')!.textContent = p.line;
      t.style.opacity = '1';
      t.style.transform = `translate(${Math.round(x + 14)}px, ${Math.round(y - 12)}px)`;
    };
    const onDown = (ev: PointerEvent) => {
      const { x, y, w, h } = local(ev);
      // A pin stands out of the globe, so a press on one counts even just outside the disc.
      const pin = pinAt(x, y, w, h);
      const g = globeAt(x, y) ?? (pin ? globes.find((q) => q.world === pinInfo(pin)?.world) : null) ?? null;
      if (!g) return;
      drag = { g, x, y, px: x, py: y, moved: 0, t: performance.now() };
      g.vx = 0;
      g.vy = 0;
      g.focus = null;
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
        if (id) {
          const [kind, ...rest] = id.split(':');
          onPickRef.current(kind === 'site' ? 'site' : 'place', rest.join(':'));
        }
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

    // Where a point of a globe is on screen right now, and whether it faces the viewer.
    const project = (world: WorldId, lat: number, lon: number) => {
      const g = globes.find((q) => q.world === world)!;
      const v = toVec(lat, lon).applyEuler(g.group.rotation);
      return { x: g.slot.cx + v.x * g.slot.r, y: g.slot.cy - v.y * g.slot.r, front: v.z > 0.05 };
    };
    const pinWorld = (): WorldId | null => (pickRef.current ? (pickRef.current.kind === 'site' ? 'earth' : (placesRef.current.find((p) => p.id === pickRef.current!.id)?.body ?? null)) : null);
    const placeLinks = (now: number) => {
      const pk = pickRef.current;
      const els = linkEls.current;
      const hideAll = () =>
        els.forEach((e) => {
          if (!e) return;
          e.style.opacity = '0';
          e.querySelector('path')?.style.setProperty('stroke-dashoffset', '100');
        });
      if (!pk) {
        hideAll();
        if (markEl.current) markEl.current.style.opacity = '0';
        return;
      }
      // The selected pin and the other end of each link.
      const home = pk.kind === 'place' ? placesRef.current.find((p) => p.id === pk.id) : sitesRef.current.find((p) => p.id === pk.id);
      if (!home) return hideAll();
      const homeWorld = pinWorld()!;
      const a = project(homeWorld, home.lat, home.lon);
      if (markEl.current) {
        markEl.current.setAttribute('cx', String(a.x));
        markEl.current.setAttribute('cy', String(a.y));
        markEl.current.style.opacity = a.front ? '1' : '0';
      }
      const ends: { lat: number; lon: number; world: WorldId }[] =
        pk.kind === 'place'
          ? linksRef.current.map((l) => ({ lat: l.lat, lon: l.lon, world: 'earth' as WorldId }))
          : reverseRef.current
            ? (() => {
                const t = placesRef.current.find((p) => p.id === reverseRef.current!.place);
                return t ? [{ lat: t.lat, lon: t.lon, world: t.body as WorldId }] : [];
              })()
            : [];
      els.forEach((el, i) => {
        if (!el) return;
        const e = ends[i];
        if (!e) {
          el.style.opacity = '0';
          el.querySelector('path')?.style.setProperty('stroke-dashoffset', '100');
          return;
        }
        const b = project(e.world, e.lat, e.lon);
        if (!a.front || !b.front) {
          el.style.opacity = '0';
          el.querySelector('path')?.style.setProperty('stroke-dashoffset', '100');
          return;
        }
        // An arc that bows upward, higher the longer the link.
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2 - Math.hypot(b.x - a.x, b.y - a.y) * 0.28;
        const path = el.querySelector('path');
        path?.setAttribute('d', `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
        // The launch: a rocket flies the arc from one world to the other, drawing it as it goes, then the label lands.
        const FLIGHT = 1700;
        const t0 = launchAt.current + i * 180;
        const p = reduced ? 1 : Math.max(0, Math.min(1, (now - t0) / FLIGHT));
        const k = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        path?.style.setProperty('stroke-dashoffset', String(100 * (1 - k)));
        const at = (u: number) => [(1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * mx + u * u * b.x, (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * my + u * u * b.y];
        const rocket = el.querySelector<SVGGElement>('[data-rocket]');
        if (rocket) {
          const [rx, ry] = at(k);
          const dx = 2 * (1 - k) * (mx - a.x) + 2 * k * (b.x - mx);
          const dy = 2 * (1 - k) * (my - a.y) + 2 * k * (b.y - my);
          const ang = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
          rocket.setAttribute('transform', `translate(${rx.toFixed(1)} ${ry.toFixed(1)}) rotate(${ang.toFixed(1)})`);
          rocket.style.opacity = k > 0.01 && p < 1 ? '1' : '0';
          const flame = rocket.querySelector('[data-flame]');
          flame?.setAttribute('transform', `scale(1 ${(0.8 + 0.5 * Math.abs(Math.sin(now / 55))).toFixed(2)})`);
        }
        const tag = el.querySelector<SVGGElement>('[data-tag]');
        // The label sits on the curve, a little short of the far end.
        const t = ends.length > 1 ? 0.86 - i * 0.11 : 0.82;
        const [lx, ly] = at(t);
        tag?.setAttribute('transform', `translate(${lx.toFixed(1)} ${ly.toFixed(1)})`);
        if (tag) tag.style.opacity = p >= 1 ? '1' : '0';
        const end = el.querySelector('[data-end]');
        end?.setAttribute('cx', b.x.toFixed(1));
        end?.setAttribute('cy', b.y.toFixed(1));
        end?.setAttribute('opacity', p >= 1 ? '1' : '0');
        // A ring spreads from the landing point.
        const ring = el.querySelector<SVGCircleElement>('[data-ring]');
        if (ring) {
          const pr = Math.max(0, Math.min(1, (now - (t0 + FLIGHT)) / 1000));
          ring.setAttribute('cx', b.x.toFixed(1));
          ring.setAttribute('cy', b.y.toFixed(1));
          ring.setAttribute('r', (4 + 18 * pr).toFixed(1));
          ring.setAttribute('opacity', p >= 1 && pr < 1 ? String(0.9 * (1 - pr)) : '0');
        }
        el.style.opacity = String(i === activeRef.current ? 1 : Math.max(0.3, 0.85 - i * 0.14));
      });
    };
    // Facing a point: spin about the poles, then tilt towards the viewer.
    const faceOf = (lat: number, lon: number) => {
      const v = toVec(lat, lon);
      const rho = Math.hypot(v.x, v.z);
      return { x: Math.max(-1.4, Math.min(1.4, Math.atan2(v.y, rho))), y: Math.atan2(-v.x, v.z) };
    };
    focusApi.current = {
      focus: (updates) => {
        for (const g of globes) {
          const u = updates.find((x) => x.world === g.world);
          g.focus = u ? faceOf(u.lat, u.lon) : null;
          if (!u) g.vx = SPIN[g.world];
        }
      },
      release: () => {
        for (const g of globes) {
          g.focus = null;
          g.vx = SPIN[g.world];
        }
      },
    };
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
        const hold = (hovered && pinInfo(hovered)?.world === g.world) || g.focus !== null;
        g.group.rotation.y += (hold ? 0 : g.vx) * dt;
        g.group.rotation.x = Math.max(-1.45, Math.min(1.45, g.group.rotation.x + g.vy * dt));
        // Ease the speed back to rest and the pitch back to its tilt.
        g.vx += (rest - g.vx) * Math.min(1, dt * 1.6);
        g.vy *= Math.max(0, 1 - dt * 4);
        if (g.focus) {
          // Turn the short way round to the focus, easing out.
          const dy = Math.atan2(Math.sin(g.focus.y - g.group.rotation.y), Math.cos(g.focus.y - g.group.rotation.y));
          const k = reduced ? 1 : Math.min(1, dt * 4);
          g.group.rotation.y += dy * k;
          g.group.rotation.x += (g.focus.x - g.group.rotation.x) * k;
          g.vx = 0;
          g.vy = 0;
        }
      }
      for (const L of starLayers) L.mat.opacity = reduced ? L.base : L.base * (0.7 + 0.3 * Math.sin(now / 1800 + L.phase));
      placeLinks(now);
      draw();
    };
    relayout.current = layout;
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
      haloGeo.dispose();
      haloMat.dispose();
      haloTex.dispose();
      for (const L of starLayers) {
        L.geoS.dispose();
        L.mat.dispose();
      }
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
      focusApi.current = null;
      renderer.forceContextLoss();
      renderer.dispose();
      canvas.remove();
    };
    // The pins are built once per set of places.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKey, reduced]);

  // Turn the globes to face the selected pair; let them spin again when nothing is selected.
  useEffect(() => {
    const api = focusApi.current;
    if (!api) return;
    if (!pick) return api.release();
    const ups: { world: WorldId; lat: number; lon: number }[] = [];
    if (pick.kind === 'place') {
      const home = places.find((p) => p.id === pick.id);
      if (home) ups.push({ world: home.body, lat: home.lat, lon: home.lon });
      const l = links[Math.min(active, links.length - 1)];
      if (l) ups.push({ world: 'earth', lat: l.lat, lon: l.lon });
    } else {
      const home = sites.find((p) => p.id === pick.id);
      if (home) ups.push({ world: 'earth', lat: home.lat, lon: home.lon });
      const t = reverse ? places.find((p) => p.id === reverse.place) : null;
      if (t) ups.push({ world: t.body, lat: t.lat, lon: t.lon });
    }
    api.focus(ups);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pick, links, reverse, active, placeKey, state]);
  useEffect(() => relayout.current(), [reserve]);

  const drawn: { score: number | null }[] = pick?.kind === 'place' ? links : pick?.kind === 'site' && reverse ? [reverse] : [];
  linkEls.current.length = drawn.length;
  const count = (b: 'moon' | 'mars') => places.filter((p) => p.body === b).length;
  const caption = (w: WorldId) => (w === 'earth' ? `${cells.toLocaleString('en-US')} cells scored` : `${count(w)} named places`);

  return (
    <div ref={holder} className="relative h-full min-h-[340px] w-full touch-pan-y overflow-hidden bg-bg transition-opacity duration-700" style={{ opacity: state === 'loading' && !late ? 0 : 1 }}>
      {state === 'error' && (
        <div className="absolute inset-0 z-[6] flex flex-col items-center justify-center gap-6 px-4 pt-28 text-center" role="status">
          <div className="flex items-center justify-center gap-5 sm:gap-10" aria-hidden="true">
            {[
              ['mars', 'mars-viking-2048', 'h-24 w-24 sm:h-36 sm:w-36'],
              ['earth', 'blue-marble-2048', 'h-32 w-32 sm:h-52 sm:w-52'],
              ['moon', 'moon-wac-2048', 'h-20 w-20 sm:h-28 sm:w-28'],
            ].map(([w, tex, size]) => (
              <span key={w} className={`block rounded-full bg-panel bg-cover bg-center ${size}`} style={{ backgroundImage: `url(${import.meta.env.BASE_URL}textures/${tex}.jpg)`, backgroundSize: '300% 150%', backgroundPosition: '40% 50%' }} />
            ))}
          </div>
          <p className="max-w-[44ch] text-[14px] leading-5 text-muted">The 3D globes could not be drawn on this device. Mars, Earth and the Moon are shown as still images; everything else works.</p>
        </div>
      )}
      <svg className="pointer-events-none absolute inset-0 z-[5] h-full w-full" aria-hidden="true">
        <circle ref={markEl} className="hero-link" r="15" fill="none" stroke="#FFB000" strokeWidth="2" style={{ opacity: 0 }} />
        {drawn.map((l, i) => (
          <g
            key={i}
            className="hero-link"
            ref={(el) => {
              linkEls.current[i] = el;
            }}
            style={{ opacity: 0 }}
          >
            <path className="hero-arc" pathLength={100} fill="none" stroke="#FFB000" strokeWidth={i === active ? 2.4 : 1.4} strokeLinecap="round" />
            <circle data-ring="" r="4" fill="none" stroke="#FFB000" strokeWidth="1.5" opacity="0" />
            <g data-rocket="" style={{ opacity: 0 }}>
              <g data-flame="">
                <path d="M-1.9 5.2 Q0 13 1.9 5.2 Z" fill="#FFB000" />
              </g>
              <path d="M-2.4 2 L-5.4 7 L-2.4 5.6 Z M2.4 2 L5.4 7 L2.4 5.6 Z" fill="#FFB000" />
              <path d="M0 -8.5 C3.4 -4.5 3.4 1.5 2.6 5.6 H-2.6 C-3.4 1.5 -3.4 -4.5 0 -8.5 Z" fill="#D7DDE3" />
              <circle cx="0" cy="-2.2" r="1.3" fill="#0B0D0F" />
            </g>
            <circle data-end="" r="4" fill="#FFB000" />
            <g data-tag="">
              <rect x="-17" y="-10" width="34" height="20" rx="3" fill="#0B0D0F" stroke="#FFB000" strokeWidth="1" />
              <text textAnchor="middle" dominantBaseline="central" fill="#D7DDE3" fontSize="13" fontWeight="600" fontFamily="Inter Variable, Inter, sans-serif">
                {l.score === null ? '-' : l.score.toFixed(0)}
              </text>
            </g>
          </g>
        ))}
      </svg>
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
      <div className={`absolute bottom-4 right-4 hidden max-w-[70%] flex-wrap items-center justify-end gap-x-6 gap-y-1 text-right text-[12px] text-muted sm:right-8 ${pick ? '' : 'sm:flex'}`}>
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
        <span>Click a pin to see its best matches. Drag a globe. Not to scale.</span>
      </div>
      {children}
    </div>
  );
}

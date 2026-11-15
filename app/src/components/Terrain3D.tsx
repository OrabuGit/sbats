import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  LineBasicMaterial,
  LineSegments,
  Raycaster,
  Vector2,
  Vector3,
  Color,
  DoubleSide,
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
import { webglOk } from '../lib/gl';
import { GlGuard } from './GlGuard';
import { dataUrl, loadElevation, type ExtractItem } from '../data/sites';
import type { ModuleType, PlacedModule } from '../lib/simAdapter';
import { shownLayer, type GroundLayer } from './Ground';
import { SourceBadge } from './Badges';
import { contourPositions, niceInterval, rampIndex, HEIGHT_RAMP, SUN_DEFAULT } from './TerrainScale';

// BOOTS: two places as terrain, side by side at one scale, with the base on each.
// Horizontal and vertical units are kilometres on both. The vertical exaggeration is 1x unless the page sets it, and then it is printed.

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
  /** Colour the surface by slope class instead of the image or plain grey. */
  slope?: boolean;
  /** Colour the surface by height above each window's own lowest point, with one fixed ramp. */
  height?: boolean;
  /** Draw contour lines on the surface. */
  contours?: boolean;
  /** Vertical exaggeration, 1 to 5. Defaults to 1 (none). */
  exaggeration?: number;
  /** Sun elevation above the horizon in degrees, from the north-west. Defaults to 45. */
  sunElevation?: number;
  /** Route waypoints in km from the centre of the square (x east, z south). Drawn on both terrains. */
  route?: { x: number; z: number }[];
  /** Optional per-side routes (Earth, target) that replace `route`: each its own path, with steepness per segment. */
  routes?: [RouteDraw | null, RouteDraw | null];
  /** Position of the rover along the route, 0 to 1, or null for no rover. */
  rover?: number | null;
  /** Called with the ground point under a click on the Earth terrain. */
  onPoint?: (xKm: number, zKm: number) => void;
  /** Called with true once both terrains are built and drawn, and with false while one is being rebuilt. */
  onReady?: (ready: boolean) => void;
}

export { SLOPE_CLASSES, type RouteDraw } from './terrainTypes';
import { SLOPE_CLASSES, type RouteDraw } from './terrainTypes';

interface Built {
  scene: Scene;
  modules: Group;
  routeGroup: Group;
  terrain: Mesh;
  /** Height of the drawn surface at a point, with the current exaggeration applied. */
  heightAt: (xKm: number, zKm: number) => number;
  reliefKm: number;
  view: { exag: number };
  sun: DirectionalLight;
  ambient: AmbientLight;
  contourLines: LineSegments | null;
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

/** Triangles of a flat ribbon along a path, `w` km wide, optionally dashed as [on, off] km along the ground plan. */
function ribbon(pts: Vector3[], w: number, dash: [number, number] | null): BufferGeometry {
  const pos: number[] = [];
  const quad = (a: Vector3, b: Vector3) => {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l = Math.hypot(dx, dz);
    if (l === 0) return;
    const nx = (-dz / l) * (w / 2);
    const nz = (dx / l) * (w / 2);
    pos.push(a.x + nx, a.y, a.z + nz, a.x - nx, a.y, a.z - nz, b.x + nx, b.y, b.z + nz, a.x - nx, a.y, a.z - nz, b.x - nx, b.y, b.z - nz, b.x + nx, b.y, b.z + nz);
  };
  let s = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k];
    const b = pts[k + 1];
    const l = Math.hypot(b.x - a.x, b.z - a.z);
    if (!dash || l === 0) {
      quad(a, b);
      s += l;
      continue;
    }
    const period = dash[0] + dash[1];
    // Walk the segment in km; every step advances at least 0.1 m, so rounding can never stall the loop.
    let d = 0;
    while (d < l) {
      const phase = (s + d) % period;
      const on = phase < dash[0];
      const d1 = Math.min(l, d + Math.max(1e-4, on ? dash[0] - phase : period - phase));
      if (on) quad(a.clone().lerp(b, d / l), a.clone().lerp(b, d1 / l));
      d = d1;
    }
    s += l;
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  return geo;
}

/** Lights and vertical scale for a sun elevation and an exaggeration. The sun stays in the north-west. */
function applyView(b: Built, exag: number, sunDeg: number) {
  b.view.exag = exag;
  b.terrain.scale.y = exag;
  const e = (Math.max(1, Math.min(89, sunDeg)) * Math.PI) / 180;
  const flat = Math.cos(e) / Math.SQRT2;
  b.sun.position.set(-flat * 10, Math.sin(e) * 10, -flat * 10);
  // Less fill light when the sun is low, so the shadowed sides are dark and the relief reads.
  b.ambient.intensity = 0.3 + 0.6 * Math.max(0, Math.min(1, (sunDeg - 10) / 35));
}

function build(
  item: ExtractItem,
  heights: Float32Array,
  windowKm: number,
  layer: GroundLayer,
  slope: boolean,
  height: boolean,
  view: { exag: number; sunDeg: number; contours: boolean },
  onTexture: () => void,
): Built {
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
  // The same light on every body: from the north-west, at the sun elevation the page sets (45 degrees by default).
  const sun = new DirectionalLight(0xffffff, 2.4);
  const ambient = new AmbientLight(0xffffff, 0.9);
  scene.add(sun, ambient);

  const coloured = slope || height;
  // Polygon offset keeps the contour lines from flickering against the surface they lie on.
  const material = new MeshLambertMaterial({ color: coloured ? 0xffffff : 0x6b737b, flatShading: n < 100, vertexColors: coloured, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  if (height) {
    // One ramp for both places: the colour class is the share of this window's own relief above its lowest point.
    const colors = new Float32Array(n * n * 3);
    const palette = HEIGHT_RAMP.map((c) => new Color(c));
    const span = Math.max(1e-9, (max - min) / 1000);
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        const col = palette[rampIndex(sample(c, r) / span)];
        colors.set([col.r, col.g, col.b], (r * n + c) * 3);
      }
    geo.setAttribute('color', new BufferAttribute(colors, 3));
  }
  if (slope) {
    // Slope at each sample from its four neighbours, in the same horizontal and vertical unit (km).
    const spacing = windowKm / (n - 1);
    const colors = new Float32Array(n * n * 3);
    const palette = SLOPE_CLASSES.map((c) => new Color(c.color));
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        const dx = (sample(Math.min(n - 1, c + 1), r) - sample(Math.max(0, c - 1), r)) / (2 * spacing);
        const dz = (sample(c, Math.min(n - 1, r + 1)) - sample(c, Math.max(0, r - 1))) / (2 * spacing);
        const deg = (Math.atan(Math.hypot(dx, dz)) * 180) / Math.PI;
        const col = palette[SLOPE_CLASSES.findIndex((k) => deg < k.upTo)];
        colors.set([col.r, col.g, col.b], (r * n + c) * 3);
      }
    geo.setAttribute('color', new BufferAttribute(colors, 3));
  }
  const shown = shownLayer(item, layer);
  if (!coloured && shown === 'image' && item.image) {
    new TextureLoader().load(dataUrl(item.image.file), (tex) => {
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = 4;
      material.map = tex;
      material.color.set(0xffffff);
      material.needsUpdate = true;
      onTexture();
    });
  }
  const terrain = new Mesh(geo, material);
  scene.add(terrain);
  // Contour lines are children of the terrain, so they take its vertical exaggeration with it.
  let contourLines: LineSegments | null = null;
  const interval = niceInterval(max - min);
  const contourGeo = new BufferGeometry();
  const contourMat = new LineBasicMaterial({ color: 0xd7dde3, transparent: true, opacity: 0.75 });
  if (interval !== null) {
    const grid = new Float32Array(n * n);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) grid[r * n + c] = sample(c, r);
    contourGeo.setAttribute('position', new BufferAttribute(contourPositions(grid, n, windowKm, interval, 0.003), 3));
    contourLines = new LineSegments(contourGeo, contourMat);
    contourLines.visible = view.contours;
    terrain.add(contourLines);
  }
  const modules = new Group();
  const routeGroup = new Group();
  scene.add(modules, routeGroup);

  const half = windowKm / 2;
  const state = { exag: view.exag };
  const heightAt = (xKm: number, zKm: number) => {
    const c = Math.round(((xKm + half) / windowKm) * (n - 1));
    const r = Math.round(((zKm + half) / windowKm) * (n - 1));
    return sample(Math.max(0, Math.min(n - 1, c)), Math.max(0, Math.min(n - 1, r))) * state.exag;
  };
  const built: Built = {
    scene,
    modules,
    routeGroup,
    terrain,
    heightAt,
    reliefKm: (max - min) / 1000,
    view: state,
    sun,
    ambient,
    contourLines,
    dispose: () => {
      contourGeo.dispose();
      contourMat.dispose();
      geo.dispose();
      material.map?.dispose();
      material.dispose();
    },
  };
  applyView(built, view.exag, view.sunDeg);
  return built;
}

function Terrain3DView({ earth, target, windowKm, layer, cols, rows, slope = false, height = false, contours = false, exaggeration = 1, sunElevation = SUN_DEFAULT, route, routes, rover = null, onPoint, onReady }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const [orbit, setOrbit] = useState(!reduced);
  const orbitRef = useRef(orbit);
  orbitRef.current = orbit;
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  // Counts terrain builds, so the route, modules and view are put back on a rebuilt terrain even when `state` stays 'ready' across a batched rebuild.
  const [buildNo, setBuildNo] = useState(0);
  const built = useRef<[Built, Built] | null>(null);
  const redraw = useRef<() => void>(() => {});
  const viewRef = useRef({ exag: exaggeration, sunDeg: sunElevation, contours });
  viewRef.current = { exag: exaggeration, sunDeg: sunElevation, contours };
  const onPointRef = useRef(onPoint);
  onPointRef.current = onPoint;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  useEffect(() => {
    onReadyRef.current?.(state === 'ready');
  }, [state]);
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
    // Drag turns both terrains. A press that does not move is a click on the ground.
    const canvas = renderer.domElement;
    canvas.style.touchAction = 'pan-y';
    let down: { x: number; angle: number; moved: boolean } | null = null;
    const onDown = (ev: PointerEvent) => {
      down = { x: ev.clientX, angle, moved: false };
      canvas.setPointerCapture(ev.pointerId);
    };
    const onMove = (ev: PointerEvent) => {
      if (!down) return;
      const dx = ev.clientX - down.x;
      if (Math.abs(dx) > 4) down.moved = true;
      if (down.moved) {
        angle = down.angle - dx * 0.008;
        draw();
      }
    };
    const onUp = (ev: PointerEvent) => {
      const press = down;
      down = null;
      if (!press || press.moved || !onPointRef.current || !built.current) return;
      const box = canvas.getBoundingClientRect();
      const stacked = box.width < 640;
      const vw = stacked ? box.width : box.width / 2;
      const vh = stacked ? box.height / 2 : box.height;
      const x = ev.clientX - box.left;
      const y = ev.clientY - box.top;
      if (x > vw || y > vh) return; // only the Earth terrain takes waypoints
      draw(); // leaves the camera as both viewports use it
      const ray = new Raycaster();
      ray.setFromCamera(new Vector2((x / vw) * 2 - 1, -(y / vh) * 2 + 1), camera);
      const hit = ray.intersectObject(built.current[0].terrain, false)[0];
      if (hit) onPointRef.current(hit.point.x, hit.point.z);
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);

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
      const lift = Math.max(b[0].reliefKm * b[0].view.exag, b[1].reliefKm * b[1].view.exag) * 0.4;
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
        built.current = [build(earth.item, he, windowKm, layer, slope, height, viewRef.current, () => draw()), build(target.item, ht, windowKm, layer, slope, height, viewRef.current, () => draw())];
        setState('ready');
        setBuildNo((k) => k + 1);
        ro.observe(el);
        frame = requestAnimationFrame(loop);
      },
      () => alive && setState('error'),
    );
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      built.current?.forEach((b) => b.dispose());
      built.current = null;
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [earth.item, target.item, windowKm, layer, slope, height, ready]);

  // Contours, exaggeration and sun: changed in place, without rebuilding the terrain.
  useEffect(() => {
    const b = built.current;
    if (!b || state !== 'ready') return;
    b.forEach((side) => {
      applyView(side, exaggeration, sunElevation);
      if (side.contourLines) side.contourLines.visible = contours;
    });
    redraw.current();
  }, [exaggeration, sunElevation, contours, state, buildNo]);

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
  }, [earth.modules, target.modules, state, cols, rows, windowKm, exaggeration, buildNo]);

  // Route and rover: the same path, in km from the centre, draped on both terrains.
  useEffect(() => {
    const b = built.current;
    if (!b || state !== 'ready') return;
    const disposables: { dispose: () => void }[] = [];
    b.forEach((side, i) => {
      side.routeGroup.clear();
      const draw: RouteDraw | null = routes ? routes[i] : route && route.length > 0 ? { points: route } : null;
      const pts = draw?.points ?? [];
      if (pts.length === 0 && !draw?.waypoints?.length) return;
      // Sample the path every 100 m so the line follows the ground; each sample keeps its segment's steepness class.
      const dense: { x: number; z: number; cls: number }[] = [];
      for (let k = 0; k < pts.length - 1; k++) {
        const len = Math.hypot(pts[k + 1].x - pts[k].x, pts[k + 1].z - pts[k].z);
        const steps = Math.max(1, Math.ceil(len / 0.1));
        const cls = draw?.steep?.[k] ?? 0;
        for (let s = 0; s < steps; s++) dense.push({ x: pts[k].x + ((pts[k + 1].x - pts[k].x) * s) / steps, z: pts[k].z + ((pts[k + 1].z - pts[k].z) * s) / steps, cls });
      }
      if (pts.length > 0) dense.push({ ...pts[pts.length - 1], cls: dense[dense.length - 1]?.cls ?? 0 });
      const lift = 0.06;
      const base = routes ? (draw?.straight ? 0x7c8894 : 0xd7dde3) : i === 0 ? 0xd7dde3 : 0xffb000;
      // One line per run of samples with the same class: amber over 75% of the limit, red and dashed over it.
      let startK = 0;
      for (let k = 1; k <= dense.length; k++) {
        if (k < dense.length && dense[k].cls === dense[startK].cls && k < dense.length - 1) continue;
        const run = dense.slice(startK, Math.min(dense.length, k + 1));
        const cls = dense[startK].cls;
        if (run.length > 1) {
          // A flat ribbon a little wider than a pixel, so the colour reads on the satellite image; WebGL lines are always 1 px.
          const geo = ribbon(
            run.map((p) => new Vector3(p.x, side.heightAt(p.x, p.z) + lift, p.z)),
            cls === 0 && !draw?.straight ? 0.07 : 0.1,
            cls === 2 ? [0.16, 0.1] : null,
          );
          const mat = new MeshBasicMaterial({ color: cls === 2 ? 0xff4d4d : cls === 1 ? 0xffb000 : base, side: DoubleSide });
          disposables.push(geo, mat);
          side.routeGroup.add(new Mesh(geo, mat));
        }
        startK = k;
      }
      const dotGeo = new BoxGeometry(0.22, 0.22, 0.22);
      const dotMat = new MeshBasicMaterial({ color: base });
      disposables.push(dotGeo, dotMat);
      for (const p of draw?.waypoints ?? pts) {
        const m = new Mesh(dotGeo, dotMat);
        m.position.set(p.x, side.heightAt(p.x, p.z) + lift, p.z);
        side.routeGroup.add(m);
      }
      if (rover !== null && dense.length > 1 && !draw?.straight) {
        const ri = Math.max(0, Math.min(dense.length - 1, Math.round(rover * (dense.length - 1))));
        const at = dense[ri];
        const next = dense[Math.min(dense.length - 1, ri + 1)];
        // A box on a wider box: a rover drawn far larger than life, like the modules.
        const body = new BoxGeometry(0.5, 0.16, 0.34).translate(0, 0.16, 0);
        const mast = new BoxGeometry(0.12, 0.26, 0.12).translate(0.1, 0.36, 0);
        const mat = new MeshBasicMaterial({ color: 0xffffff });
        disposables.push(body, mast, mat);
        const g = new Group();
        g.add(new Mesh(body, mat), new Mesh(mast, mat));
        g.position.set(at.x, side.heightAt(at.x, at.z), at.z);
        g.rotation.y = Math.atan2(-(next.z - at.z), next.x - at.x);
        side.routeGroup.add(g);
      }
    });
    redraw.current();
    return () => disposables.forEach((d) => d.dispose());
  }, [route, routes, rover, state, exaggeration, buildNo]);

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
        Same horizontal and vertical scale on both, {exaggeration === 1 ? 'no vertical exaggeration (1x)' : `vertical exaggeration ${exaggeration}x, so slopes look steeper than they are`}, same
        camera and light (sun {sunElevation}° above the horizon, from the north-west). Heights are measured from each place's own lowest point. Modules are drawn
        about 50 times larger than life so they can be seen.
      </p>
    </div>
  );
}

/** The terrain in 3D. Without WebGL it says so, and the 2D images and the route profile stay on the page. */
export function Terrain3D(props: Parameters<typeof Terrain3DView>[0]) {
  const none = <NoTerrain onReady={props.onReady} />;
  if (!webglOk()) return none;
  return (
    <GlGuard fallback={none}>
      <Terrain3DView {...props} />
    </GlGuard>
  );
}

function NoTerrain({ onReady }: { onReady?: (ready: boolean) => void }) {
  useEffect(() => {
    // The route planner waits for the terrain; without 3D it plans from the elevation grid alone.
    onReady?.(true);
  }, [onReady]);
  return (
    <div className="flex h-[320px] w-full flex-col items-start justify-center gap-2 bg-panel px-5 sm:px-8" role="status">
      <p className="label">3D terrain</p>
      <p className="text-[18px] font-medium text-text">3D needs graphics acceleration on this device.</p>
      <p className="max-w-[56ch] text-[14px] leading-6 text-muted">
        Turn hardware acceleration on in the browser settings, or open SBATS on another device, to see the terrain in 3D. The route profile and the example route do not need it, and the match page has the 2D side-by-side views.
      </p>
    </div>
  );
}

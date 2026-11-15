import { useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeInstance } from 'globe.gl';
import { PerspectiveCamera, AdditiveBlending, CanvasTexture, Mesh, MeshBasicMaterial, NearestFilter, SRGBColorSpace, SphereGeometry, type Object3D, type Texture } from 'three';
import SlippyMap from 'three-slippy-map-globe';
import { feature } from 'topojson-client';
import type { MultiPolygon, Polygon } from 'geojson';
import { Minus, Plus } from 'lucide-react';
import landTopo from 'world-atlas/land-110m.json';
import type { Analog, EarthFile, CellSummary } from '../types';
import type { CellIndex } from '../lib/geo';
import type { Candidate } from '../lib/rank';

// Match strength is shown by brightness. This is data, not decoration: a cell's light is a function of its
// score, and the legend below prints the same function. The best cells also glow. Nothing else on the
// map glows. Cells are added to the imagery (additive blending), so a higher score is simply more light.
const AMBER = '255,176,0';
/** Share of full brightness for a score from 0 to 100. */
export const brightness = (score: number) => Math.pow(Math.max(0, Math.min(100, score)) / 100, 1.1);
/** Cells from this score up carry a halo. The halo grows with the score. */
export const GLOW_FROM = 35;
export const SCORE_CLASSES = [0, 20, 35, 50, 65, 80, 100].map((min) => ({ min, label: String(min), b: brightness(min) }));
const NO_DATA = '#2B333B';
// Over the imagery the cells are slightly see-through, so relief and coastlines stay readable.
// Cells below the first score step get only a thin dark veil.
const NO_DATA_ALPHA = 0.8;
const cellAlpha = (score: number) => 0.035 + 0.93 * brightness(score);
/** Closest the camera comes, in globe radii above the surface: about 500 km, where the level 7 tiles are in use. */
const MIN_ALTITUDE = 0.08;
const OCEAN = '#0F1418';
const LAND_FILL = '#161B20';
const LAND_LINE = '#39434D';
const GRATICULE = '#1A2128';

type Ring = number[][];

/** Land rings from Natural Earth, with any ring that crosses the antimeridian made continuous. */
function landRings(): { ring: Ring; wraps: boolean }[] {
  const land = feature(landTopo, landTopo.objects.land) as unknown as {
    features?: { geometry: Polygon | MultiPolygon }[];
    geometry?: Polygon | MultiPolygon;
  };
  const geoms = land.features ? land.features.map((f) => f.geometry) : land.geometry ? [land.geometry] : [];
  const out: { ring: Ring; wraps: boolean }[] = [];
  for (const geom of geoms) {
    const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    for (const poly of polys)
      for (const ring of poly) {
        let shift = 0;
        let wraps = false;
        const fixed: Ring = ring.map(([lon, lat], i) => {
          if (i > 0) {
            const d = lon - ring[i - 1][0];
            if (d > 180) shift -= 360;
            else if (d < -180) shift += 360;
            if (shift !== 0) wraps = true;
          }
          return [lon + shift, lat];
        });
        out.push({ ring: fixed, wraps });
      }
  }
  return out;
}

function drawBase(w: number, h: number): { canvas: HTMLCanvasElement; rings: { ring: Ring; wraps: boolean }[] } {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d')!;
  const x = (lon: number) => ((lon + 180) / 360) * w;
  const y = (lat: number) => ((90 - lat) / 180) * h;
  g.fillStyle = OCEAN;
  g.fillRect(0, 0, w, h);
  const rings = landRings();
  g.fillStyle = LAND_FILL;
  for (const { ring, wraps } of rings) {
    for (const off of wraps ? [-360, 0, 360] : [0]) {
      g.beginPath();
      ring.forEach(([lon, lat], i) => (i === 0 ? g.moveTo(x(lon + off), y(lat)) : g.lineTo(x(lon + off), y(lat))));
      g.closePath();
      g.fill();
    }
  }
  return { canvas: cv, rings };
}

/**
 * NASA Blue Marble (shaded relief and bathymetry), served from the app's own files so the globe
 * never waits on a live service. Drawn slightly desaturated and darkened, so the one accent
 * colour of the heatmap stays the brightest thing on the map.
 */
function drawImagery(base: HTMLCanvasElement, img: HTMLImageElement) {
  const g = base.getContext('2d')!;
  const { width: w, height: h } = base;
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.drawImage(img, 0, 0, w, h);
  g.globalCompositeOperation = 'saturation';
  g.globalAlpha = 0.6;
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 0.32;
  g.fillStyle = '#0B0D0F';
  g.fillRect(0, 0, w, h);
  g.globalAlpha = 1;
}

/**
 * NASA GIBS Blue Marble tiles (Web Mercator, levels 0 to 8, 500 m at the deepest). They sharpen
 * the globe as the camera comes closer. A tile that does not arrive is simply not drawn, and the
 * bundled Blue Marble texture underneath stays visible, so the map never waits on the network.
 */
const GIBS_TILE = (x: number, y: number, level: number) =>
  `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/2004-08/GoogleMapsCompatible_Level8/${level}/${y}/${x}.jpeg`;
const GIBS_MAX_LEVEL = 8;
const GLOBE_RADIUS = 100;

/** Tile material with the same treatment as the bundled texture: less saturation, darker, unlit. */
function tileMaterial(map: Texture): MeshBasicMaterial {
  const m = new MeshBasicMaterial({ map });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
      float sbatsLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(sbatsLuma), 0.6) * 0.45;`,
    );
  };
  m.customProgramCacheKey = () => 'sbats-tile';
  return m;
}

function drawOutlines(g: CanvasRenderingContext2D, w: number, h: number, rings: { ring: Ring; wraps: boolean }[]) {
  const x = (lon: number) => ((lon + 180) / 360) * w;
  const y = (lat: number) => ((90 - lat) / 180) * h;
  g.strokeStyle = GRATICULE;
  g.lineWidth = Math.max(1, w / 2048);
  g.beginPath();
  for (let lon = -180; lon <= 180; lon += 30) {
    g.moveTo(x(lon), 0);
    g.lineTo(x(lon), h);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    g.moveTo(0, y(lat));
    g.lineTo(w, y(lat));
  }
  g.stroke();
  g.strokeStyle = LAND_LINE;
  g.lineWidth = Math.max(1, w / 1600);
  g.beginPath();
  for (const { ring, wraps } of rings) {
    for (const off of wraps ? [-360, 0, 360] : [0]) {
      ring.forEach(([lon, lat], i) => {
        // Skip the artificial edges along the antimeridian and the south pole.
        const prev = ring[i - 1];
        const edge = prev && ((Math.abs(lon) > 179.9 && Math.abs(prev[0]) > 179.9) || (lat < -89.9 && prev[1] < -89.9));
        if (i === 0 || edge) g.moveTo(x(lon + off), y(lat));
        else g.lineTo(x(lon + off), y(lat));
      });
    }
  }
  g.stroke();
}

export interface SiteMarker {
  analog: Analog;
  index: number;
}

interface Props {
  earth: EarthFile;
  results: CellSummary[];
  index: CellIndex;
  selected: number | null;
  candidates: Candidate[];
  sites: SiteMarker[];
  onSelect: (index: number) => void;
  /** Change `seq` to fly the camera to a point. `arrive` starts far out and comes in, as when arriving from another world. */
  focus: { lat: number; lon: number; seq: number; arrive?: boolean } | null;
  /** False while another view covers the globe, so it stops drawing. */
  active: boolean;
}

type Marker =
  | { kind: 'selected'; lat: number; lng: number }
  | { kind: 'rank'; lat: number; lng: number; index: number; rank: number }
  | { kind: 'site'; lat: number; lng: number; index: number; name: string };

export function GlobeView({ earth, results, index, selected, candidates, sites, onSelect, focus, active }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const texRef = useRef<{ canvas: HTMLCanvasElement; texture: CanvasTexture; rings: { ring: Ring; wraps: boolean }[] } | null>(null);
  const onSelectRef = useRef(onSelect);
  const indexRef = useRef(index);
  onSelectRef.current = onSelect;
  indexRef.current = index;

  // Bumped when the imagery has been drawn into the base canvas, to repaint the heatmap over it.
  const [imagery, setImagery] = useState(0);

  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  // Create the globe once.
  useEffect(() => {
    const el = holder.current!;
    const small = window.innerWidth < 768;
    const w = small ? 2048 : 4096;
    const h = w / 2;
    const { canvas: base, rings } = drawBase(w, h);
    const baseTexture = new CanvasTexture(base);
    baseTexture.colorSpace = SRGBColorSpace;
    baseTexture.anisotropy = 8;
    // The heatmap is its own see-through layer above the imagery, so imagery can sharpen under it.
    const canvas = document.createElement('canvas');
    canvas.width = 4096;
    canvas.height = 2048;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.magFilter = NearestFilter;
    texRef.current = { canvas, texture, rings };

    // The coastline base shows first. The imagery replaces it when it has loaded.
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      drawImagery(base, img);
      baseTexture.needsUpdate = true;
      setImagery((n) => n + 1);
    };
    img.src = `${import.meta.env.BASE_URL}textures/blue-marble-${w}.jpg`;

    const globe = new Globe(el, { animateIn: false, waitForGlobeReady: false })
      .backgroundColor('#0B0D0F')
      .showAtmosphere(false)
      .showGraticules(false)
      .globeMaterial(new MeshBasicMaterial({ map: baseTexture }))
      .width(el.clientWidth || 300)
      .height(el.clientHeight || 300)
      .htmlLat('lat')
      .htmlLng('lng')
      .htmlAltitude(0.012)
      .htmlTransitionDuration(0)
      .htmlElement((d: object) => {
        const m = d as Marker;
        if (m.kind === 'selected') {
          const s = document.createElement('div');
          s.className = 'gm gm-selected';
          s.setAttribute('aria-hidden', 'true');
          return s;
        }
        const b = document.createElement('button');
        b.type = 'button';
        b.tabIndex = -1; // the candidates list is the keyboard path to the same sites
        if (m.kind === 'rank') {
          b.className = 'gm gm-rank';
          b.textContent = String(m.rank);
          b.setAttribute('aria-label', `Open candidate ${m.rank}`);
        } else {
          b.className = 'gm gm-site';
          b.appendChild(document.createElement('span'));
          b.title = m.name;
          b.setAttribute('aria-label', `Open ${m.name}`);
        }
        b.addEventListener('click', (ev) => {
          ev.stopPropagation();
          onSelectRef.current(m.index);
        });
        return b;
      })
      .htmlElementVisibilityModifier((elm: HTMLElement, visible: boolean) => {
        elm.style.visibility = visible ? 'visible' : 'hidden';
      })
      .onGlobeClick(({ lat, lng }: { lat: number; lng: number }) => {
        const i = indexRef.current.nearest(lat, lng, 1);
        if (i >= 0) onSelectRef.current(i);
      });

    const controls = globe.controls();
    controls.autoRotate = false;
    controls.enableDamping = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    controls.minDistance = GLOBE_RADIUS * (1 + MIN_ALTITUDE);
    controls.maxDistance = 600;

    const tiles = new SlippyMap(GLOBE_RADIUS * 1.003, { tileUrl: GIBS_TILE, maxLevel: GIBS_MAX_LEVEL });
    // Tiles and the heat layer are flat-faced spheres: the finer the faces, the smaller the dip between
    // vertices. A dip deeper than the gap to the layer below lets that layer show through and flicker.
    tiles.curvatureResolution = 1.5;
    // One level deeper than the library's default at each distance on a large screen, for sharpness.
    if (!small) tiles.thresholds = tiles.thresholds.map((t) => t * 2);
    const addTile = tiles.add.bind(tiles);
    tiles.add = (...objs: Object3D[]) => {
      for (const o of objs) {
        const mesh = o as Mesh;
        const old = mesh.material as MeshBasicMaterial | undefined;
        if (old?.map) {
          mesh.material = tileMaterial(old.map);
          old.dispose();
        }
        mesh.raycast = () => {};
      }
      return addTile(...objs);
    };
    const overlay = new Mesh(
      new SphereGeometry(GLOBE_RADIUS * 1.006, 240, 120),
      new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, blending: AdditiveBlending }),
    );
    overlay.rotation.y = -Math.PI / 2; // same orientation as the library's globe
    overlay.raycast = () => {};
    overlay.renderOrder = 1;
    globe.scene().add(tiles, overlay);
    const camera = globe.camera();
    // A nearer near-plane gives the depth buffer ten times the precision for the thin layers on the globe.
    if ('near' in camera && 'updateProjectionMatrix' in camera) {
      (camera as PerspectiveCamera).near = 1;
      (camera as PerspectiveCamera).updateProjectionMatrix();
    }
    const updateTiles = () => {
      tiles.updatePov(camera);
    };
    controls.addEventListener('change', updateTiles);
    globe.pointOfView({ lat: 5, lng: 105, altitude: small ? 2.3 : 2.2 }, 0);
    globeRef.current = globe;
    updateTiles();

    const ro = new ResizeObserver(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) globe.width(el.clientWidth).height(el.clientHeight);
    });
    ro.observe(el);
    return () => {
      alive = false;
      img.onload = null;
      ro.disconnect();
      controls.removeEventListener('change', updateTiles);
      tiles.clearTiles();
      overlay.geometry.dispose();
      (overlay.material as MeshBasicMaterial).dispose();
      globe._destructor();
      texture.dispose();
      baseTexture.dispose();
      el.replaceChildren();
      globeRef.current = null;
      texRef.current = null;
    };
  }, []);

  // Repaint the heatmap texture when scores change.
  useEffect(() => {
    const t = texRef.current;
    if (!t) return;
    const { canvas, texture, rings } = t;
    const g = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;
    g.clearRect(0, 0, w, h);
    const res = earth.meta.resolutionDeg;
    const cw = (res / 360) * w;
    const ch = (res / 180) * h;
    const pad = 0.35;
    const glow: { x: number; y: number; score: number }[] = [];
    earth.cells.forEach((c, i) => {
      const r = results[i];
      const score = r ? r.score : null;
      const x = ((c.lon - res / 2 + 180) / 360) * w - pad;
      const y = ((90 - c.lat - res / 2) / 180) * h - pad;
      if (score === null) {
        g.fillStyle = NO_DATA;
        g.globalAlpha = imagery === 0 ? 1 : NO_DATA_ALPHA * 0.5;
        g.fillRect(x, y, cw + pad * 2, ch + pad * 2);
        return;
      }
      g.fillStyle = `rgb(${AMBER})`;
      g.globalAlpha = imagery === 0 ? 0.35 + 0.6 * brightness(score) : cellAlpha(score);
      g.fillRect(x, y, cw + pad * 2, ch + pad * 2);
      if (score >= GLOW_FROM) glow.push({ x, y, score });
    });
    // Halos, brightest last. A blurred copy of the cell, so a strong cell spills a little light on its neighbours.
    glow.sort((a, b) => a.score - b.score);
    g.save();
    g.globalAlpha = 1;
    for (const c of glow) {
      const t = (c.score - GLOW_FROM) / (100 - GLOW_FROM);
      g.shadowColor = `rgba(${AMBER},${(0.35 + 0.5 * t).toFixed(2)})`;
      g.shadowBlur = 6 + 16 * t;
      g.fillStyle = `rgba(${AMBER},${(0.5 + 0.45 * brightness(c.score)).toFixed(2)})`;
      g.fillRect(c.x, c.y, cw + pad * 2, ch + pad * 2);
    }
    g.restore();
    g.globalAlpha = 1;
    // The drawn coastline is only needed until the imagery, which has its own coasts, is in place.
    if (imagery === 0) drawOutlines(g, w, h, rings);
    texture.needsUpdate = true;
  }, [earth, results, imagery]);

  // Markers: ranked candidates, named sites, and the selected cell.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const markers: Marker[] = [];
    const ranked = new Set(candidates.map((c) => c.index));
    for (const s of sites) {
      if (ranked.has(s.index)) continue;
      markers.push({ kind: 'site', lat: s.analog.lat, lng: s.analog.lon, index: s.index, name: s.analog.name });
    }
    for (const c of candidates) {
      const cell = earth.cells[c.index];
      markers.push({ kind: 'rank', lat: cell.lat, lng: cell.lon, index: c.index, rank: c.rank });
    }
    if (selected !== null) {
      const cell = earth.cells[selected];
      markers.push({ kind: 'selected', lat: cell.lat, lng: cell.lon });
    }
    globe.htmlElementsData(markers);
  }, [earth, candidates, sites, selected]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !focus) return;
    if (focus.arrive && !reduced) {
      globe.pointOfView({ lat: focus.lat, lng: focus.lon - 50, altitude: 4.5 }, 0);
      globe.pointOfView({ lat: focus.lat, lng: focus.lon, altitude: 1.9 }, 1800);
      return;
    }
    const current = globe.pointOfView();
    globe.pointOfView({ lat: focus.lat, lng: focus.lon, altitude: Math.min(current.altitude, 1.9) }, reduced ? 0 : 1100);
  }, [focus, reduced]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    if (active) globe.resumeAnimation();
    else globe.pauseAnimation();
  }, [active]);

  const zoom = (factor: number) => {
    const globe = globeRef.current;
    if (!globe) return;
    const pov = globe.pointOfView();
    globe.pointOfView({ ...pov, altitude: Math.min(5, Math.max(MIN_ALTITUDE, pov.altitude * factor)) }, reduced ? 0 : 300);
  };

  return (
    <section className="relative h-full min-h-0 w-full overflow-hidden bg-bg" aria-label="Globe with match score heatmap">
      <div ref={holder} className="absolute inset-0" />
      <div className="absolute bottom-3 left-3 bg-bg px-2 py-2">
        <p className="label mb-1.5">Match score, 0 to 100</p>
        <div className="flex items-end gap-px" aria-hidden="true">
          {SCORE_CLASSES.map((c) => (
            <div key={c.min} className="w-7">
              <div
                className="h-3"
                style={{
                  background: `rgba(${AMBER},${(0.035 + 0.93 * c.b).toFixed(2)})`,
                  // The same halo the map gives a cell of that score.
                  boxShadow: c.min >= GLOW_FROM ? `0 0 ${Math.round(4 + 10 * ((c.min - GLOW_FROM) / (100 - GLOW_FROM)))}px rgba(${AMBER},${(0.35 + 0.5 * ((c.min - GLOW_FROM) / (100 - GLOW_FROM))).toFixed(2)})` : undefined,
                }}
              />
              <div className="num mt-1 text-[10px] leading-3 text-muted">{c.label}</div>
            </div>
          ))}
          <div className="ml-2 w-14">
            <div className="h-3" style={{ background: NO_DATA }} />
            <div className="num mt-1 text-[10px] leading-3 text-muted">no data</div>
          </div>
        </div>
        <p className="mt-1.5 hidden text-[11px] text-muted sm:block">A cell&rsquo;s brightness is its match score. The best cells glow.</p>
        <p className="sr-only">Seven steps from 0 to 100. Brighter, glowing amber is a closer match. Grey cells have no score.</p>
        <p className="readout mt-1.5 hidden !text-[10px] sm:block">Imagery: NASA Blue Marble, GIBS</p>
      </div>
      <div className="absolute bottom-3 right-3 flex flex-col border border-line bg-panel">
        <button type="button" onClick={() => zoom(0.7)} aria-label="Zoom in" className="tool !px-0">
          <Plus size={16} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => zoom(1.4)} aria-label="Zoom out" className="tool !px-0 border-t border-line">
          <Minus size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

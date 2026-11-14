import { useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeInstance } from 'globe.gl';
import { CanvasTexture, MeshBasicMaterial, SRGBColorSpace } from 'three';
import { feature } from 'topojson-client';
import type { MultiPolygon, Polygon } from 'geojson';
import { Minus, Plus } from 'lucide-react';
import landTopo from 'world-atlas/land-110m.json';
import type { Analog, EarthFile, CellSummary } from '../types';
import type { CellIndex } from '../lib/geo';
import type { Candidate } from '../lib/rank';

// Score classes. Six flat steps of the one accent colour over the land colour, so the map and
// its legend use solid fills only (no gradients).
const LAND = [26, 32, 38];
const ACCENT = [255, 176, 0];
const mix = (t: number) => `rgb(${LAND.map((l, i) => Math.round(l + (ACCENT[i] - l) * t)).join(',')})`;
export const SCORE_CLASSES = [
  { min: 0, label: '0', color: '#1E252C' },
  { min: 20, label: '20', color: mix(0.26) },
  { min: 35, label: '35', color: mix(0.42) },
  { min: 50, label: '50', color: mix(0.6) },
  { min: 65, label: '65', color: mix(0.8) },
  { min: 80, label: '80', color: mix(1) },
];
const NO_DATA = '#2B333B';
// Over the imagery the cells are slightly see-through, so relief and coastlines stay readable.
// Cells below the first score step get only a thin dark veil.
const CELL_ALPHA = 0.9;
const LOW_ALPHA = 0.2;
const NO_DATA_ALPHA = 0.8;
const OCEAN = '#0F1418';
const LAND_FILL = '#161B20';
const LAND_LINE = '#39434D';
const GRATICULE = '#1A2128';

function classColor(score: number): string {
  for (let i = SCORE_CLASSES.length - 1; i >= 0; i--) if (score >= SCORE_CLASSES[i].min) return SCORE_CLASSES[i].color;
  return SCORE_CLASSES[0].color;
}

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
  /** Change `seq` to fly the camera to a point. */
  focus: { lat: number; lon: number; seq: number } | null;
}

type Marker =
  | { kind: 'selected'; lat: number; lng: number }
  | { kind: 'rank'; lat: number; lng: number; index: number; rank: number }
  | { kind: 'site'; lat: number; lng: number; index: number; name: string };

export function GlobeView({ earth, results, index, selected, candidates, sites, onSelect, focus }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const texRef = useRef<{ canvas: HTMLCanvasElement; texture: CanvasTexture; base: HTMLCanvasElement; rings: { ring: Ring; wraps: boolean }[] } | null>(null);
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
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    texRef.current = { canvas, texture, base, rings };

    // The coastline base shows first. The imagery replaces it when it has loaded.
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      drawImagery(base, img);
      setImagery((n) => n + 1);
    };
    img.src = `${import.meta.env.BASE_URL}textures/blue-marble-${w}.jpg`;

    const globe = new Globe(el, { animateIn: false, waitForGlobeReady: false })
      .backgroundColor('#0B0D0F')
      .showAtmosphere(false)
      .showGraticules(false)
      .globeMaterial(new MeshBasicMaterial({ map: texture }))
      .width(el.clientWidth || 300)
      .height(el.clientHeight || 300)
      .htmlLat('lat')
      .htmlLng('lng')
      .htmlAltitude(0.005)
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
    controls.minDistance = 130;
    controls.maxDistance = 600;
    globe.pointOfView({ lat: 5, lng: 105, altitude: small ? 2.3 : 2.2 }, 0);
    globeRef.current = globe;

    const ro = new ResizeObserver(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) globe.width(el.clientWidth).height(el.clientHeight);
    });
    ro.observe(el);
    return () => {
      alive = false;
      img.onload = null;
      ro.disconnect();
      globe._destructor();
      texture.dispose();
      el.replaceChildren();
      globeRef.current = null;
      texRef.current = null;
    };
  }, []);

  // Repaint the heatmap texture when scores change.
  useEffect(() => {
    const t = texRef.current;
    if (!t) return;
    const { canvas, texture, base, rings } = t;
    const g = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;
    g.drawImage(base, 0, 0);
    const res = earth.meta.resolutionDeg;
    const cw = (res / 360) * w;
    const ch = (res / 180) * h;
    const pad = 0.35;
    earth.cells.forEach((c, i) => {
      const r = results[i];
      const score = r ? r.score : null;
      g.fillStyle = score === null ? NO_DATA : classColor(score);
      g.globalAlpha = imagery === 0 ? 1 : score === null ? NO_DATA_ALPHA : score < SCORE_CLASSES[1].min ? LOW_ALPHA : CELL_ALPHA;
      g.fillRect(((c.lon - res / 2 + 180) / 360) * w - pad, ((90 - c.lat - res / 2) / 180) * h - pad, cw + pad * 2, ch + pad * 2);
    });
    g.globalAlpha = 1;
    drawOutlines(g, w, h, rings);
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
    const current = globe.pointOfView();
    globe.pointOfView({ lat: focus.lat, lng: focus.lon, altitude: Math.min(current.altitude, 1.9) }, reduced ? 0 : 1100);
  }, [focus, reduced]);

  const zoom = (factor: number) => {
    const globe = globeRef.current;
    if (!globe) return;
    const pov = globe.pointOfView();
    globe.pointOfView({ ...pov, altitude: Math.min(5, Math.max(0.35, pov.altitude * factor)) }, reduced ? 0 : 300);
  };

  return (
    <section className="relative h-full min-h-0 w-full overflow-hidden bg-bg" aria-label="Globe with match score heatmap">
      <div ref={holder} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-3 top-3 hidden sm:block">
        <p className="label">Drag to rotate. Click land to inspect a cell.</p>
      </div>
      <div className="absolute bottom-3 left-3 border border-line bg-panel px-3 py-2">
        <p className="label mb-1.5">Match score</p>
        <div className="flex items-end gap-px" aria-hidden="true">
          {SCORE_CLASSES.map((c) => (
            <div key={c.min} className="w-7">
              <div className="h-2.5" style={{ background: c.color }} />
              <div className="num mt-1 text-[10px] leading-3 text-muted">{c.label}</div>
            </div>
          ))}
          <div className="ml-2 w-14">
            <div className="h-2.5" style={{ background: NO_DATA }} />
            <div className="num mt-1 text-[10px] leading-3 text-muted">no data</div>
          </div>
        </div>
        <p className="sr-only">Six steps from 0 to 100. Brighter amber is a closer match. Grey cells have no score.</p>
      </div>
      <div className="absolute bottom-3 right-3 flex flex-col border border-line bg-panel">
        <button type="button" onClick={() => zoom(0.7)} aria-label="Zoom in" className="flex h-11 w-11 items-center justify-center text-text hover:text-accent">
          <Plus size={16} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => zoom(1.4)} aria-label="Zoom out" className="flex h-11 w-11 items-center justify-center border-t border-line text-text hover:text-accent">
          <Minus size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

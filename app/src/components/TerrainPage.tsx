import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Pause, Play, RotateCcw, Undo2 } from 'lucide-react';
import { loadElevation, type ExtractItem } from '../data/sites';
import { getLastLayout, routeKey, setRoutes } from '../lib/layoutStore';
import { measureRoute, type ElevationTile, type RouteResult } from '../lib/matchAdapter';
import { useAsync } from '../lib/useAsync';
import { ComputedBadge } from './Badges';
import { SLOPE_CLASSES } from './Terrain3D';

const Terrain3D = lazy(() => import('./Terrain3D').then((m) => ({ default: m.Terrain3D })));

interface Props {
  earth: ExtractItem;
  target: ExtractItem;
  windowKm: number;
  earthName: string;
  targetName: string;
  /** Steepest slope a landing pad accepts in modules.json, used as the reference line for a route. null when unknown. */
  slopeLimitDeg: number | null;
  onBack: () => void;
  onBase: (() => void) | null;
}

type Surface = 'image' | 'relief' | 'slope';
interface RoutePoint {
  x: number;
  z: number;
}
/** Distance and height along a route, for the chart. Height is above the lowest point of the route's own square. */
interface RouteProfile {
  distKm: number[];
  heightM: number[];
}
const profileOf = (r: RouteResult, floor: number): RouteProfile => {
  const s = r.samples.filter((x) => x.elevationM !== null);
  return { distKm: s.map((x) => x.distanceM / 1000), heightM: s.map((x) => (x.elevationM as number) - floor) };
};
const DRIVE_SECONDS = 12;
const fx = (v: number | null | undefined, d: number) => (v === null || v === undefined ? 'no data' : v.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }));

/** Elevation along the route on both terrains, on one pair of axes. */
function ProfileChart({ a, b, at }: { a: RouteProfile; b: RouteProfile; at: number | null }) {
  const w = 640;
  const h = 200;
  const pad = { l: 52, r: 12, t: 10, b: 28 };
  const maxD = Math.max(a.distKm[a.distKm.length - 1] ?? 0, 0.1);
  const all = [...a.heightM, ...b.heightM];
  const lo = Math.min(...all);
  const hi = Math.max(...all, lo + 1);
  const x = (d: number) => pad.l + (d / maxD) * (w - pad.l - pad.r);
  const y = (v: number) => h - pad.b - ((v - lo) / (hi - lo)) * (h - pad.t - pad.b);
  const line = (p: RouteProfile) => p.distKm.map((d, i) => `${x(d).toFixed(1)},${y(p.heightM[i]).toFixed(1)}`).join(' ');
  const yTicks = [lo, (lo + hi) / 2, hi];
  const xTicks = [0, maxD / 2, maxD];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full max-w-[640px]" role="img" aria-label={`Elevation along the route. Earth from ${fx(Math.min(...a.heightM), 0)} to ${fx(Math.max(...a.heightM), 0)} m, target from ${fx(Math.min(...b.heightM), 0)} to ${fx(Math.max(...b.heightM), 0)} m, over ${fx(maxD, 1)} km.`}>
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="#2A3138" strokeWidth="1" />
          <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#7C8894" fontFamily="IBM Plex Mono, monospace">
            {fx(v, 0)}
          </text>
        </g>
      ))}
      {xTicks.map((d) => (
        <text key={d} x={x(d)} y={h - 8} textAnchor={d === 0 ? 'start' : d === maxD ? 'end' : 'middle'} fontSize="11" fill="#7C8894" fontFamily="IBM Plex Mono, monospace">
          {fx(d, 1)} km
        </text>
      ))}
      <polyline points={line(b)} fill="none" stroke="#FFB000" strokeWidth="1.5" />
      <polyline points={line(a)} fill="none" stroke="#D7DDE3" strokeWidth="1.5" />
      {at !== null && <line x1={x(at * maxD)} x2={x(at * maxD)} y1={pad.t} y2={h - pad.b} stroke="#D7DDE3" strokeWidth="1" strokeDasharray="2 3" />}
    </svg>
  );
}

/** Step 5, "Open 3D terrain": the Earth place and the target as terrain at one scale, with a route driven on both. */
export function TerrainPage({ earth, target, windowKm, earthName, targetName, slopeLimitDeg, onBack, onBase }: Props) {
  const [surface, setSurface] = useState<Surface>('image');
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [rover, setRover] = useState<number | null>(null);
  const [driving, setDriving] = useState(false);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const heights = useAsync(() => Promise.all([loadElevation(earth.elevation!), loadElevation(target.elevation!)]), `${earth.id}|${target.id}`);
  const layout = getLastLayout();

  // Session C's route library measures the same waypoints on each elevation tile.
  const measured = useMemo(() => {
    if (heights.status !== 'ready' || route.length < 2) return null;
    const items = [earth, target];
    return heights.value.map((data, i) => {
      const el = items[i].elevation!;
      const tile: ElevationTile = { size: el.size, pixelM: el.pixelM, data };
      const toTile = (p: RoutePoint) => ({ col: ((p.x + windowKm / 2) / windowKm) * (el.size - 1), row: ((p.z + windowKm / 2) / windowKm) * (el.size - 1) });
      try {
        return measureRoute(tile, route.map(toTile), { limit: slopeLimitDeg === null ? null : { rover: 'Landing pad limit', limitDeg: slopeLimitDeg, kind: 'landing pad slope limit in data/modules.json', source: 'data/modules.json, landingPad.maxSlopeDeg' } });
      } catch {
        return null;
      }
    }) as [RouteResult | null, RouteResult | null];
  }, [heights, route, earth, target, windowKm, slopeLimitDeg]);
  const profiles = useMemo(
    () => (measured && measured[0] && measured[1] ? ([profileOf(measured[0], earth.elevation!.min), profileOf(measured[1], target.elevation!.min)] as const) : null),
    [measured, earth, target],
  );
  const figures = measured;
  // Keep the measured routes for the report of this pair.
  useEffect(() => {
    const list: { label: string; result: RouteResult }[] = [];
    if (measured?.[0]) list.push({ label: `Route on ${earthName} (Earth)`, result: measured[0] });
    if (measured?.[1]) list.push({ label: `The same route laid on ${targetName}`, result: measured[1] });
    setRoutes(routeKey(earth.id, target.id), list);
  }, [measured, earth, target, earthName, targetName]);

  // The rover drives the route once in a fixed time, then stops at the end.
  const start = useRef(0);
  useEffect(() => {
    if (!driving) return;
    if (reduced) {
      setRover(1);
      setDriving(false);
      return;
    }
    let frame = 0;
    start.current = performance.now() - (rover ?? 0) * DRIVE_SECONDS * 1000;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start.current) / (DRIVE_SECONDS * 1000));
      setRover(t);
      if (t < 1) frame = requestAnimationFrame(tick);
      else setDriving(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driving, reduced]);

  const change = (next: RoutePoint[]) => {
    setRoute(next);
    setRover(null);
    setDriving(false);
  };
  const row = (label: string, get: (f: RouteResult) => string) => (
    <tr className="border-b border-line">
      <th scope="row" className="py-2 pr-4 text-left text-[12px] font-normal text-muted">
        {label}
      </th>
      {[0, 1].map((i) => (
        <td key={i} className={`num py-2 pl-4 text-right text-[13px] ${figures?.[i] ? 'text-text' : 'text-muted'}`}>
          {figures?.[i] ? get(figures[i] as RouteResult) : 'no data'}
        </td>
      ))}
    </tr>
  );

  return (
    <main className="scroll min-h-0 flex-1 bg-panel" aria-labelledby="h-terrain">
      <div className="flex flex-wrap items-stretch border-b border-line [&_.tab]:-mb-px">
        <button type="button" onClick={onBack} className="tool border-r border-line">
          <ArrowLeft size={14} aria-hidden="true" /> Match
        </button>
        <div className="flex px-1" role="group" aria-label="Surface">
          {(['image', 'relief', 'slope'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={surface === s} onClick={() => setSurface(s)} className="tab">
              {s === 'image' ? 'Image' : s === 'relief' ? 'Relief' : 'Slope'}
            </button>
          ))}
        </div>
        <span className="flex-1" />
        <button type="button" onClick={() => change(route.slice(0, -1))} disabled={route.length === 0} className="tool border-l border-line">
          <Undo2 size={14} aria-hidden="true" /> <span className="hidden sm:inline">Undo point</span>
        </button>
        <button type="button" onClick={() => change([])} disabled={route.length === 0} className="tool border-l border-line">
          <RotateCcw size={14} aria-hidden="true" /> <span className="hidden sm:inline">Clear route</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (!driving && (rover === null || rover >= 1)) setRover(0);
            setDriving((d) => !d);
          }}
          disabled={route.length < 2}
          aria-pressed={driving}
          className="btn btn-primary !rounded-none"
        >
          {driving ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />} {driving ? 'Pause' : 'Drive the route'}
        </button>
      </div>

      <header className="border-b border-line px-4 py-4 sm:px-6">
        <p className="label">3D terrain · {windowKm} km × {windowKm} km · no vertical exaggeration</p>
        <h2 id="h-terrain" className="mt-1 text-[17px] font-semibold leading-6 text-text">
          {earthName} and {targetName} at one scale
        </h2>
        <p className="mt-1 max-w-[72ch] text-[13px] text-muted">
          Click the Earth terrain, on the left, to add waypoints. The same route is laid on the target at the same positions, so the two can be
          compared. Drag to turn both.
        </p>
      </header>

      <Suspense
        fallback={
          <p className="label p-4" role="status">
            Loading terrain
          </p>
        }
      >
        <Terrain3D
          earth={{ item: earth, modules: layout?.modules ?? [] }}
          target={{ item: target, modules: layout?.modules ?? [] }}
          windowKm={windowKm}
          layer={surface === 'relief' ? 'relief' : 'image'}
          slope={surface === 'slope'}
          cols={24}
          rows={12}
          route={route}
          rover={rover}
          onPoint={(x, z) => change([...route, { x, z }])}
        />
      </Suspense>

      {surface === 'slope' && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-2 sm:px-6">
          <span className="label">Slope</span>
          {SLOPE_CLASSES.map((c) => (
            <span key={c.label} className="num flex items-center gap-1.5 text-[11px] text-muted">
              <span className="block h-2.5 w-5" style={{ background: c.color }} aria-hidden="true" /> {c.label}
            </span>
          ))}
          <span className="text-[11px] text-muted">Computed from the elevation grid of each body at its own pixel size, so a coarser grid reads smoother.</span>
        </div>
      )}

      <section className="grid gap-x-10 gap-y-6 border-b border-line px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" aria-labelledby="h-route">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 id="h-route" className="text-[14px] font-semibold text-text">
              Elevation along the route
            </h3>
            <span className="num flex items-center gap-1.5 text-[11px] text-muted">
              <span className="block h-0.5 w-4 bg-text" aria-hidden="true" /> Earth
            </span>
            <span className="num flex items-center gap-1.5 text-[11px] text-muted">
              <span className="block h-0.5 w-4 bg-accent" aria-hidden="true" /> Target
            </span>
          </div>
          <div className="mt-3 min-h-[200px]">
            {heights.status === 'loading' ? (
              <p className="label" role="status">
                Loading elevation
              </p>
            ) : heights.status === 'error' ? (
              <p className="text-[13px] text-muted">The elevation grids could not be loaded: {heights.message}</p>
            ) : profiles ? (
              <ProfileChart a={profiles[0]} b={profiles[1]} at={rover} />
            ) : (
              <p className="text-[13px] text-muted">
                No route yet. {route.length === 1 ? 'One waypoint is placed. Add a second.' : 'Click the Earth terrain to place the first waypoint.'}
              </p>
            )}
          </div>
          <p className="mt-2 text-[11px] text-muted">Height in metres above each square's own lowest point. Distance along the ground plan.</p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14px] font-semibold text-text">Route figures</h3>
            <ComputedBadge title="Computed in the browser by the route library from the elevation grids, sampled at each grid's own pixel size." />

          </div>
          <table className="mt-2 w-full max-w-[460px] border-collapse">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="label py-1.5 text-left font-normal">
                  {route.length} waypoints
                </th>
                <th scope="col" className="label py-1.5 pl-4 text-right font-normal">
                  Earth
                </th>
                <th scope="col" className="label py-1.5 pl-4 text-right font-normal">
                  Target
                </th>
              </tr>
            </thead>
            <tbody>
              {row('Length on the map', (f) => `${fx(f.distanceM / 1000, 2)} km`)}
              {row('Length on the surface', (f) => (f.surfaceDistanceM === null ? 'no data' : `${fx(f.surfaceDistanceM / 1000, 2)} km`))}
              {row('Total climb', (f) => `${fx(f.ascentM, 0)} m`)}
              {row('Total descent', (f) => `${fx(f.descentM, 0)} m`)}
              {row('Steepest climb on the route', (f) => (f.maxUphillDeg === null ? 'no data' : `${fx(f.maxUphillDeg, 1)}°`))}
              {row('Steepest ground crossed', (f) => (f.maxTerrainSlopeDeg === null ? 'no data' : `${fx(f.maxTerrainSlopeDeg, 1)}°`))}
              {row(slopeLimitDeg === null ? 'Share above a slope limit' : `Share on ground steeper than ${slopeLimitDeg}°`, (f) => (f.shareAboveLimit === null ? 'no data' : `${fx(f.shareAboveLimit * 100, 0)}%`))}
              {row('Slope measured over', (f) => `${fx(f.baselineM, 0)} m`)}
            </tbody>
          </table>
          <ul className="mt-2 max-w-[60ch] space-y-1">
            {[...new Set([...(figures?.[0]?.notes ?? []), ...(figures?.[1]?.notes ?? [])])].map((n) => (
              <li key={n} className="text-[11px] text-muted">
                {n}
              </li>
            ))}
            <li className="text-[11px] text-muted">
              No driving time or energy is shown: data/rovers.json, with cited rover speeds and slope limits, is not published yet.{' '}
              {slopeLimitDeg === null ? 'No slope limit is set.' : `The ${slopeLimitDeg}° limit is the landing pad slope limit in modules.json, used as a stand-in.`}
            </li>
          </ul>
        </div>
      </section>

      <section className="px-4 py-6 sm:px-6" aria-labelledby="h-terrain-base">
        <h3 id="h-terrain-base" className="text-[14px] font-semibold text-text">
          Base on the terrain
        </h3>
        <p className="mt-1 max-w-[72ch] text-[13px] text-muted">
          {layout && layout.modules.length > 0
            ? `${layout.modules.length} modules from the current layout stand on both terrains.`
            : 'No modules placed. Place a base to see its modules on both terrains.'}{' '}
          Modules and the rover are drawn about 50 times larger than life.
        </p>
        <button type="button" onClick={onBase ?? undefined} disabled={!onBase} className="btn mt-3">
          {layout && layout.modules.length > 0 ? 'Edit the base' : 'Place a base'}
        </button>
      </section>
    </main>
  );
}

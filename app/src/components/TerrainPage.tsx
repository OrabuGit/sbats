import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { loadElevation, type ExtractItem } from '../data/sites';
import { getLastLayout, routeKey, setRoutes } from '../lib/layoutStore';
import { measureRoute, type ElevationTile, type RouteResult } from '../lib/matchAdapter';
import { planRoute, steepClass, type PlanResult } from '../lib/routePlan';
import { useAsync } from '../lib/useAsync';
import { RouteFigures, hoursText, metresPerHour, type Sourced } from './RouteFigures';
import { RouteProfile, RouteSteepKey, type ProfilePoint } from './RouteProfile';
import { SLOPE_CLASSES, type RouteDraw } from './Terrain3D';
import { TerrainLegend, TerrainPanel, type Surface } from './TerrainControls';
import { heightRange, niceInterval, SUN_DEFAULT } from './TerrainScale';

const Terrain3D = lazy(() => import('./Terrain3D').then((m) => ({ default: m.Terrain3D })));

interface Props {
  earth: ExtractItem;
  target: ExtractItem;
  windowKm: number;
  earthName: string;
  targetName: string;
  /** Steepest slope a landing pad accepts in modules.json, used as the reference line for a route. null when unknown. */
  /** data/rovers.json: published slope limits and speeds, each with its source. null when not published. */
  rovers: RoversFile | null;
  targetBody: 'moon' | 'mars';
  onBack: () => void;
  onBase: (() => void) | null;
}

export interface RoversFile {
  meta: { note: string; energyNote?: string };
  rovers: { id: string; name: string; body: 'moon' | 'mars'; crewed: boolean; slopeLimit: Sourced | null; speed: Sourced | null }[];
}
interface RoutePoint {
  x: number;
  z: number;
}
const DRIVE_SECONDS = 12;
/** Where the example route starts and ends, as a share of the window from its centre, and the north-south offsets tried. */
const EXAMPLE_X = 0.4;
const EXAMPLE_Z = [0, -0.1, 0.1, -0.2, 0.2, -0.3, 0.3];

/** Plans one route on one terrain. The points are km from the centre; the same offsets are used on both places. */
function planOn(data: Float32Array, el: { size: number; pixelM: number }, windowKm: number, pts: RoutePoint[], limitDeg: number): PlanResult | null {
  const toTile = (p: RoutePoint) => ({ col: ((p.x + windowKm / 2) / windowKm) * (el.size - 1), row: ((p.z + windowKm / 2) / windowKm) * (el.size - 1) });
  try {
    return planRoute({ size: el.size, pixelM: el.pixelM, data }, pts.map(toTile), { limitDeg });
  } catch {
    return null;
  }
}

const fx = (v: number, d: number) => v.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });

/** Step 5, "Open 3D terrain": the Earth place and the target as terrain at one scale, with a route driven on both. */
export function TerrainPage({ earth, target, windowKm, earthName, targetName, rovers, targetBody, onBack, onBase }: Props) {
  const all = rovers?.rovers ?? [];
  const [roverId, setRoverId] = useState<string | null>(null);
  const roverSpec = all.find((r) => r.id === roverId) ?? all.find((r) => r.body === targetBody && r.slopeLimit?.value != null) ?? all[0] ?? null;
  const slopeLimitDeg = roverSpec?.slopeLimit?.value ?? null;
  const speedMph = metresPerHour(roverSpec?.speed);
  const [surface, setSurface] = useState<Surface>('image');
  const [contours, setContours] = useState(false);
  const [exaggeration, setExaggeration] = useState(1);
  const [sun, setSun] = useState(SUN_DEFAULT);
  // null: the ready-made example route is shown. A list: the visitor's own points, planned only when Plan is pressed.
  const [own, setOwn] = useState<RoutePoint[] | null>(null);
  const [committed, setCommitted] = useState<RoutePoint[] | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [terrainReady, setTerrainReady] = useState(false);
  const [rover, setRover] = useState<number | null>(null);
  const [driving, setDriving] = useState(false);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const heights = useAsync(() => Promise.all([loadElevation(earth.elevation!), loadElevation(target.elevation!)]), `${earth.id}|${target.id}`);
  const layout = getLastLayout();
  // Relief and contour interval of each window, by the same rule on both.
  const places = useMemo(() => {
    const names = [earthName, targetName];
    return [0, 1].map((i) => {
      const range = heights.status === 'ready' ? heightRange(heights.value[i]) : null;
      return { name: names[i], reliefM: range?.reliefM ?? null, intervalM: range ? niceInterval(range.reliefM) : null };
    });
  }, [heights, earthName, targetName]);

  const items = useMemo(() => [earth, target] as const, [earth, target]);
  const pairKey = `${earth.id}|${target.id}`;

  // The example: from near the west edge to near the east edge, through the middle. Of a few north-south offsets,
  // the first that can be driven on both places is used, then the first that can be driven on Earth, then the straight middle line,
  // whose blocked result is then shown as it is.
  const example = useMemo(() => {
    if (heights.status !== 'ready' || slopeLimitDeg === null) return null;
    const offsets = EXAMPLE_Z.flatMap((a) => EXAMPLE_Z.map((b) => [a, b] as const)).sort((p, q) => Math.abs(p[0]) + Math.abs(p[1]) - Math.abs(q[0]) - Math.abs(q[1]));
    const make = (a: number, b: number): RoutePoint[] => [
      { x: -EXAMPLE_X * windowKm, z: a * windowKm },
      { x: EXAMPLE_X * windowKm, z: b * windowKm },
    ];
    let earthOnly: RoutePoint[] | null = null;
    for (const [a, b] of offsets) {
      const pts = make(a, b);
      const ok = [0, 1].map((i) => !!planOn(heights.value[i], items[i].elevation!, windowKm, pts, slopeLimitDeg)?.ok);
      if (ok[0] && ok[1]) return pts;
      if (ok[0] && !earthOnly) earthOnly = pts;
    }
    return earthOnly ?? make(0, 0);
  }, [heights, items, windowKm, slopeLimitDeg]);
  const route = own ?? example ?? [];
  const planned = own === null ? example : committed;

  // Plan the route on each terrain: the same start, waypoints and end, at the same offsets from the centre, under the same limit.
  const plans = useMemo(() => {
    if (heights.status !== 'ready' || !planned || planned.length < 2 || slopeLimitDeg === null) return null;
    return heights.value.map((data, i) => planOn(data, items[i].elevation!, windowKm, planned, slopeLimitDeg)) as [PlanResult | null, PlanResult | null];
  }, [heights, planned, items, windowKm, slopeLimitDeg]);

  // Tile pixels back to km from the centre, for the 3D view.
  const toKm = (i: number, col: number, row: number) => {
    const n = items[i].elevation!.size - 1;
    return { x: (col / n) * windowKm - windowKm / 2, z: (row / n) * windowKm - windowKm / 2 };
  };
  // What each side draws: the planned path, or, when it is blocked, the straight line of the blocked leg.
  const sides = useMemo(() => {
    if (!plans || slopeLimitDeg === null) return null;
    return plans.map((p, i) => {
      if (!p) return null;
      const floor = items[i].elevation!.min;
      if (p.ok) {
        const points: ProfilePoint[] = p.samples.map((s, k) => ({ distanceM: s.distanceM, heightM: s.elevationM - floor, slopeDeg: k === 0 ? null : s.slopeDeg }));
        const draw: RouteDraw = { points: p.samples.map((s) => toKm(i, s.col, s.row)), steep: p.samples.slice(1).map((s) => steepClass(s.slopeDeg, slopeLimitDeg)), waypoints: planned ?? [] };
        return { plan: p, points, draw, straight: false };
      }
      const st = p.blocked!.straight;
      const points: ProfilePoint[] = st.map((s) => ({ distanceM: s.distanceM, heightM: s.elevationM === null ? null : s.elevationM - floor, slopeDeg: s.slopeDeg }));
      const draw: RouteDraw = { points: st.map((s) => toKm(i, s.col, s.row)), steep: st.slice(1).map((s) => steepClass(s.slopeDeg, slopeLimitDeg)), straight: true, waypoints: planned ?? [] };
      return { plan: p, points, draw, straight: true };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, items, planned, windowKm, slopeLimitDeg]);
  const drivable = !!sides?.some((s) => s && !s.straight);
  // Without a plan (no slope limit, one point, or still loading) only the waypoints are marked: no line is drawn through ground that was not checked.
  const draws = useMemo(() => [0, 1].map((i) => sides?.[i]?.draw ?? { points: [], waypoints: route }) as [RouteDraw, RouteDraw], [sides, route]);

  // Session C's route library measures each planned path, for the report of this pair. A blocked side is not reported as a route.
  const measured = useMemo(() => {
    if (heights.status !== 'ready' || !plans) return null;
    return plans.map((p, i) => {
      if (!p || !p.ok || p.samples.length < 2) return null;
      const el = items[i].elevation!;
      const tile: ElevationTile = { size: el.size, pixelM: el.pixelM, data: heights.value[i] };
      try {
        return measureRoute(
          tile,
          p.samples.map((s) => ({ col: s.col, row: s.row })),
          {
            limit: roverSpec?.slopeLimit && slopeLimitDeg !== null ? { rover: roverSpec.name, limitDeg: slopeLimitDeg, kind: roverSpec.slopeLimit.kind, source: roverSpec.slopeLimit.source } : null,
            speed: roverSpec?.speed && speedMph !== null ? { rover: roverSpec.name, metresPerHour: speedMph, kind: roverSpec.speed.kind, source: roverSpec.speed.source } : null,
          },
        );
      } catch {
        return null;
      }
    }) as [RouteResult | null, RouteResult | null];
  }, [heights, plans, items, roverSpec, slopeLimitDeg, speedMph]);
  useEffect(() => {
    const list: { label: string; result: RouteResult }[] = [];
    if (measured?.[0]) list.push({ label: `Planned route on ${earthName} (Earth)`, result: measured[0] });
    if (measured?.[1]) list.push({ label: `The same start and end planned on ${targetName}`, result: measured[1] });
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

  const stopRover = () => {
    setRover(null);
    setDriving(false);
  };
  /** Starts the rover from the start, or, under reduced motion, puts it at the end. */
  const startDrive = () => {
    if (reduced) {
      setRover(1);
      setDriving(false);
    } else {
      setRover(0);
      setDriving(true);
    }
  };
  // The example drives once the terrain has loaded, once for each place pair.
  const autoFor = useRef<string | null>(null);
  const exampleDrivable = own === null && !!plans?.some((p) => p?.ok);
  useEffect(() => {
    if (!terrainReady || !exampleDrivable || autoFor.current === pairKey) return;
    autoFor.current = pairKey;
    startDrive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terrainReady, exampleDrivable, pairKey, example]);

  const edit = (next: RoutePoint[]) => {
    setOwn(next);
    setCommitted(null);
    stopRover();
  };
  const drawOwn = () => {
    edit([]);
    setPlanOpen(true);
  };
  const showExample = () => {
    setOwn(null);
    setCommitted(null);
    autoFor.current = null;
    stopRover();
  };
  const plan = () => {
    if (!own || own.length < 2) return;
    setCommitted(own);
    startDrive();
  };
  const chooseRover = (id: string) => {
    setRoverId(id);
    if (own === null) showExample();
    else stopRover();
  };
  const toggleDrive = () => {
    if (!driving && (rover === null || rover >= 1)) setRover(0);
    setDriving((d) => !d);
  };
  const pointName = (k: number, n: number) => (k === 0 ? 'the start' : k === n - 1 ? 'the end' : `waypoint ${k}`);
  /** A plain sentence for a side with no route under the limit. */
  const blockedText = (name: string, p: PlanResult) => {
    const bl = p.blocked!;
    const from = pointName(bl.leg, planned?.length ?? 0);
    const to = pointName(bl.leg + 1, planned?.length ?? 0);
    if (bl.reason === 'no data') return `No route on ${name}: ${from} or ${to} lies on a post with no elevation data.`;
    const lead = `No route on ${name} keeps every step at or under ${p.limitDeg}°: nothing connects ${from} to ${to}.`;
    const cross =
      bl.sections.length > 0
        ? ` The straight line between them crosses ${bl.sections.length} section${bl.sections.length === 1 ? '' : 's'} steeper than the limit, ${fx(bl.overLimitM, 0)} m in all, up to ${fx(bl.maxSlopeDeg ?? 0, 1)}° (red, dashed).`
        : ' The straight line between them has no single step over the limit at this spacing, but every path on the grid does.';
    return `${lead}${cross} The search reached no closer than ${fx(bl.closestToEndM / 1000, 2)} km to ${to}.`;
  };
  const names = [earthName, targetName];

  const status =
    own === null
      ? 'The example route is planned. Press Draw your own to place a start and an end yourself.'
      : own.length === 0
        ? 'Click the Earth terrain (left, or top on a phone) to place the start.'
        : own.length === 1
          ? 'The start is placed. Click again to place the end.'
          : committed
            ? `Planned. Clicking the terrain again adds a point and clears the plan; Reset starts over.`
            : `${own.length === 2 ? 'Start and end placed' : `Start, ${own.length - 2} waypoint${own.length === 3 ? '' : 's'} and end placed`}. Click for more waypoints, then press Plan.`;

  return (
    <main className="scroll min-h-0 flex-1 bg-bg" aria-labelledby="h-terrain">
      <div className="flex flex-wrap items-stretch border-b border-line">
        <button type="button" onClick={onBack} className="tool">
          <ArrowLeft size={14} aria-hidden="true" /> Match
        </button>
      </div>

      <header className="px-4 py-4 sm:px-6">
        <p className="label">3D terrain · {windowKm} km × {windowKm} km · {exaggeration === 1 ? 'no vertical exaggeration (1x)' : `${exaggeration}x vertical exaggeration`}</p>
        <h2 id="h-terrain" className="mt-1 text-[20px] text-text">
          {earthName} and {targetName} at one scale
        </h2>
        <p className="mt-1 max-w-[72ch] text-[13px] text-muted">Drag to turn both. Routes are planned over the real elevation grid and never step steeper than the chosen rover's slope limit.</p>
      </header>

      <div className="grid border-t border-line lg:grid-cols-[320px_minmax(0,1fr)]">
        <TerrainPanel
          surface={surface}
          onSurface={setSurface}
          contours={contours}
          onContours={setContours}
          exaggeration={exaggeration}
          onExaggeration={setExaggeration}
          sun={sun}
          onSun={setSun}
          planner={{
            open: planOpen,
            onOpen: setPlanOpen,
            rovers: all,
            rover: roverSpec,
            onRover: chooseRover,
            status,
            canPlan: own !== null && own.length >= 2 && committed === null,
            onPlan: plan,
            canUndo: own !== null && own.length > 0,
            onUndo: () => own && edit(own.slice(0, -1)),
            canReset: own === null || own.length > 0,
            onReset: () => edit([]),
            canDrive: drivable,
            driving,
            onDrive: toggleDrive,
          }}
        />
        <div className="min-w-0">
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
              height={surface === 'height'}
              contours={contours}
              exaggeration={exaggeration}
              sunElevation={sun}
              cols={24}
              rows={12}
              route={route}
              routes={draws}
              rover={rover}
              onPoint={(x, z) => {
                edit([...(own ?? []), { x, z }]);
                setPlanOpen(true);
              }}
              onReady={setTerrainReady}
            />
          </Suspense>
          <TerrainLegend height={surface === 'height'} contours={contours} places={places} />
        </div>
      </div>

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

      <section className="grid gap-x-10 gap-y-6 border-t border-line px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" aria-labelledby="h-route">
        <div className="min-w-0 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <h3 id="h-route" className="display text-[17px] text-text">
              {own === null ? 'Example route' : 'Your route'}
            </h3>
            {own === null ? (
              <button type="button" onClick={drawOwn} className="btn btn-accent">
                Draw your own
              </button>
            ) : (
              <button type="button" onClick={showExample} className="btn btn-ghost !pl-0">
                Show the example route
              </button>
            )}
          </div>
          <p className="mt-1 max-w-[72ch] text-[13px] text-muted">
            {own === null
              ? `${roverSpec ? `${roverSpec.name}, ` : ''}from near the west edge to near the east edge of the window, through the middle, the same positions on both places.`
              : 'Start, waypoints and end are placed by clicking the Earth terrain. The same positions are used on the target.'}
          </p>
        </div>
        <div className="min-w-0">
          {slopeLimitDeg !== null && sides && (
            <div className="mb-3">
              <RouteSteepKey limitDeg={slopeLimitDeg} />
            </div>
          )}
          <div className="min-h-[200px] space-y-5">
            {heights.status === 'loading' ? (
              <p className="label" role="status">
                Loading elevation
              </p>
            ) : heights.status === 'error' ? (
              <p className="text-[13px] text-muted">The elevation grids could not be loaded: {heights.message}</p>
            ) : slopeLimitDeg === null ? (
              <p className="text-[13px] text-muted">No data: {roverSpec ? `${roverSpec.name} has no published slope limit in data/rovers.json` : 'data/rovers.json is not loaded'}, so no route is planned.</p>
            ) : !planned || planned.length < 2 ? (
              <p className="text-[13px] text-muted">{status}</p>
            ) : (
              sides?.map((side, i) =>
                side ? (
                  <figure key={names[i]}>
                    <figcaption className="mb-1 text-[12px] text-text">
                      {names[i]}
                      <span className="text-muted">{side.straight ? ': no route; the straight line of the blocked leg' : ': the planned route'}</span>
                    </figcaption>
                    <RouteProfile id={`p${i}`} points={side.points} limitDeg={slopeLimitDeg} at={side.straight ? null : rover} straight={side.straight} title={`${names[i]}, ${side.straight ? 'straight line' : 'planned route'}`} />
                    {side.straight && (
                      <p className="mt-1 max-w-[72ch] text-[13px] text-text" role="status">
                        {blockedText(names[i], side.plan)}
                      </p>
                    )}
                  </figure>
                ) : (
                  <p key={names[i]} className="text-[13px] text-muted">
                    {names[i]}: no data
                  </p>
                ),
              )
            )}
          </div>
          <p className="mt-2 text-[11px] text-muted">Height in metres above each square's own lowest point. Distance along the ground plan.</p>
        </div>

        <div className="min-w-0">
          <RouteFigures
            sides={[
              { name: earthName, plan: plans?.[0] ?? null, pixelM: earth.elevation!.pixelM },
              { name: targetName, plan: plans?.[1] ?? null, pixelM: target.elevation!.pixelM },
            ]}
            limitDeg={slopeLimitDeg}
            speedMph={speedMph}
            waypoints={planned?.length ?? 0}
          />
          <ul className="mt-2 max-w-[62ch] space-y-1">
            <li className="text-[11px] text-muted">
              {speedMph !== null && roverSpec?.speed
                ? `Drive time is the distance divided by ${fx(roverSpec.speed.value ?? 0, 0)} ${roverSpec.speed.unit} (${roverSpec.speed.kind}; ${roverSpec.speed.source}). It excludes stops and terrain effects${plans?.[0]?.ok ? `: at that speed the Earth route takes ${hoursText(plans[0].distanceM / speedMph)}` : ''}.`
                : 'Drive time: no data, because this rover has no published speed in data/rovers.json.'}
            </li>
            <li className="text-[11px] text-muted">No energy figure is shown: no citable model of rover energy against slope was found.</li>
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

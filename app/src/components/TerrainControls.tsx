import { ChevronDown, ChevronUp, Pause, Play, RotateCcw, Undo2 } from 'lucide-react';
import { ComputedBadge } from './Badges';
import { RoverFigure, type Sourced } from './RouteFigures';
import { EXAGGERATION_MAX, EXAGGERATION_MIN, HEIGHT_RAMP, SUN_DEFAULT, SUN_LOW } from './TerrainScale';

export type Surface = 'image' | 'relief' | 'slope' | 'height';
export interface RoverOption {
  id: string;
  name: string;
  body: 'moon' | 'mars';
  slopeLimit: Sourced | null;
  speed: Sourced | null;
}

interface PanelProps {
  surface: Surface;
  onSurface: (s: Surface) => void;
  contours: boolean;
  onContours: (on: boolean) => void;
  exaggeration: number;
  onExaggeration: (x: number) => void;
  sun: number;
  onSun: (deg: number) => void;
  planner: {
    open: boolean;
    onOpen: (open: boolean) => void;
    rovers: RoverOption[];
    rover: RoverOption | null;
    onRover: (id: string) => void;
    /** Plain sentence on what the clicks have placed so far. */
    status: string;
    canPlan: boolean;
    onPlan: () => void;
    canUndo: boolean;
    onUndo: () => void;
    canReset: boolean;
    onReset: () => void;
    canDrive: boolean;
    driving: boolean;
    onDrive: () => void;
  };
}

const SURFACES: [Surface, string][] = [
  ['image', 'Satellite'],
  ['relief', 'Relief'],
  ['slope', 'Slope'],
  ['height', 'Height'],
];

const Section = ({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) => (
  <section aria-label={title} className={`min-w-0 ${wide ? 'col-span-2 lg:col-span-1' : ''}`}>
    <h4 className="label">{title}</h4>
    <div className="mt-1">{children}</div>
  </section>
);

/**
 * The one control panel of the 3D terrain, titled View: surface, contour lines, height exaggeration, sun and the route planner.
 * Sections are set apart by whitespace and a small heading. Every target is at least 44 px.
 */
export function TerrainPanel({ surface, onSurface, contours, onContours, exaggeration, onExaggeration, sun, onSun, planner }: PanelProps) {
  const r = planner.rover;
  return (
    <aside aria-labelledby="h-view" className="px-4 py-4 sm:px-6 lg:border-r lg:border-line lg:py-5">
      <h3 id="h-view" className="display text-[17px] text-text">
        View
      </h3>
      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 lg:mt-3 lg:grid-cols-1 lg:gap-y-5">
        <Section title="Surface" wide>
          <div className="-ml-2.5 flex flex-wrap" role="group" aria-label="Surface">
            {SURFACES.map(([id, label]) => (
              <button key={id} type="button" aria-pressed={surface === id} onClick={() => onSurface(id)} className="tab !px-2.5">
                {label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Lines">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[13px] text-text">
            <input type="checkbox" className="check" checked={contours} onChange={(e) => onContours(e.target.checked)} />
            Contours
          </label>
        </Section>

        <Section title="Height">
          <label className="block text-[13px] text-text">
            <span className="flex items-baseline justify-between gap-3">
              <span>Exaggeration</span>
              <output className="num text-[13px] text-text">{exaggeration}x</output>
            </span>
            <input
              type="range"
              className="slider"
              min={EXAGGERATION_MIN}
              max={EXAGGERATION_MAX}
              step={1}
              value={exaggeration}
              onChange={(e) => onExaggeration(Number(e.target.value))}
              aria-valuetext={exaggeration === 1 ? 'no exaggeration, 1x' : `${exaggeration}x exaggeration`}
            />
          </label>
        </Section>

        <Section title="Sun" wide>
          <div className="-ml-2.5 flex flex-wrap" role="group" aria-label="Sun position">
            <button type="button" aria-pressed={sun === SUN_DEFAULT} onClick={() => onSun(SUN_DEFAULT)} className="tab !px-2.5">
              Default {SUN_DEFAULT}°
            </button>
            <button type="button" aria-pressed={sun === SUN_LOW} onClick={() => onSun(SUN_LOW)} className="tab !px-2.5">
              Low sun {SUN_LOW}°
            </button>
          </div>
          <p className="num text-[12px] text-muted" role="status">
            {sun}° above the horizon, from the north-west
          </p>
        </Section>

        <div className="col-span-2 min-w-0 lg:col-span-1">
          <Section title="Route">
            <button type="button" className="btn btn-accent" aria-expanded={planner.open} aria-controls="route-planner" onClick={() => planner.onOpen(!planner.open)}>
              Plan route {planner.open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
            </button>
          </Section>
          {planner.open && (
            <div id="route-planner" className="mt-4 max-w-[460px] space-y-4">
              <label className="block text-[13px] text-text">
                <span className="label block">Rover</span>
                <select
                  value={r?.id ?? ''}
                  onChange={(e) => planner.onRover(e.target.value)}
                  disabled={planner.rovers.length === 0}
                  className="mt-1 h-11 w-full min-w-0 border border-line bg-panel px-2 text-[13px] text-text"
                >
                  {planner.rovers.length === 0 && <option value="">no data</option>}
                  {planner.rovers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name.replace(/\s*\(.*\)/, '')}, {o.body === 'moon' ? 'Moon' : 'Mars'}, limit {o.slopeLimit?.value != null ? `${o.slopeLimit.value}°` : 'no data'}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <RoverFigure label="Slope limit" fig={r?.slopeLimit} unit="°" />
                <RoverFigure label="Speed" fig={r?.speed} unit={r?.speed ? ` ${r.speed.unit}` : ''} />
              </div>
              <p className="text-[13px] text-muted" role="status">
                {planner.status}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <button type="button" onClick={planner.onPlan} disabled={!planner.canPlan} className="btn">
                  Plan
                </button>
                <button type="button" onClick={planner.onDrive} disabled={!planner.canDrive} aria-pressed={planner.driving} className="btn btn-primary">
                  {planner.driving ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />} {planner.driving ? 'Pause' : 'Drive'}
                </button>
                <button type="button" onClick={planner.onUndo} disabled={!planner.canUndo} className="tool">
                  <Undo2 size={14} aria-hidden="true" /> Undo
                </button>
                <button type="button" onClick={planner.onReset} disabled={!planner.canReset} className="tool">
                  <RotateCcw size={14} aria-hidden="true" /> Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export interface PlaceRange {
  name: string;
  /** Highest minus lowest point, metres. null when the grid has no valid value. */
  reliefM: number | null;
  intervalM: number | null;
}

/** Legend for the height colours and the contour lines: one ramp, the metre range of each place, the contour interval of each. */
export function TerrainLegend({ height, contours, places }: { height: boolean; contours: boolean; places: PlaceRange[] }) {
  if (!height && !contours) return null;
  const fm = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return (
    <div className="space-y-2 border-b border-line px-4 py-3 sm:px-6">
      {height && (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="label">Height above the lowest point of each window</span>
            <ComputedBadge title="Computed in the browser from the elevation grid: each window's own lowest point to its own highest point, split into eight equal steps." />
          </div>
          <ul className="mt-1 space-y-1">
            {places.map((p) => (
              <li key={p.name} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted">
                <span className="w-[120px] shrink-0 truncate text-text">{p.name}</span>
                <span className="num">0 m</span>
                <span className="flex" aria-hidden="true">
                  {HEIGHT_RAMP.map((c) => (
                    <span key={c} className="block h-2.5 w-5" style={{ background: c }} />
                  ))}
                </span>
                <span className="num">{p.reliefM === null ? 'no data' : `${fm(p.reliefM)} m`}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11px] text-muted">One colour ramp for both places. Each window is coloured over its own range, so the same colour is not the same height on the two.</p>
        </div>
      )}
      {contours && (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="label">Contour lines</span>
            <ComputedBadge title="Computed in the browser from the elevation grid, on the same triangles the surface is drawn with." />
          </div>
          <ul className="mt-1 space-y-1">
            {places.map((p) => (
              <li key={p.name} className="flex flex-wrap items-center gap-x-3 text-[11px] text-muted">
                <span className="w-[120px] shrink-0 truncate text-text">{p.name}</span>
                <span className="block h-0.5 w-5 bg-text" aria-hidden="true" />
                <span className="num text-text">{p.intervalM === null ? 'no data' : `every ${fm(p.intervalM)} m`}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11px] text-muted">
            Interval is the window's relief divided by about 10, rounded to 1, 2 or 5 times a power of ten (never under 1 m): the same rule on both. Lines count from each window's lowest point.
          </p>
        </div>
      )}
    </div>
  );
}

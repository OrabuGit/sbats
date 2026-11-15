import { ComputedBadge } from './Badges';
import { EXAGGERATION_MAX, EXAGGERATION_MIN, HEIGHT_RAMP, SUN_DEFAULT, SUN_LOW } from './TerrainScale';

interface ControlProps {
  contours: boolean;
  onContours: (on: boolean) => void;
  exaggeration: number;
  onExaggeration: (x: number) => void;
  sun: number;
  onSun: (deg: number) => void;
}

/** Display controls for the 3D terrain: contours, vertical exaggeration and the sun. Every target is at least 44 px. */
export function TerrainControls({ contours, onContours, exaggeration, onExaggeration, sun, onSun }: ControlProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-line px-4 py-1 sm:px-6" role="group" aria-label="Terrain display">
      <button type="button" aria-pressed={contours} onClick={() => onContours(!contours)} className="btn btn-ghost !px-0">
        <span className="block h-0.5 w-4 bg-current" aria-hidden="true" /> {contours ? 'Contours on' : 'Contours off'}
      </button>

      <label className="flex min-h-11 items-center gap-3 text-[13px] text-text">
        <span className="label">Vertical exaggeration</span>
        <input
          type="range"
          className="slider !w-[140px]"
          min={EXAGGERATION_MIN}
          max={EXAGGERATION_MAX}
          step={1}
          value={exaggeration}
          onChange={(e) => onExaggeration(Number(e.target.value))}
          aria-valuetext={`${exaggeration}x exaggeration`}
        />
        <output className="num min-w-[116px] text-[12px] text-text">{exaggeration}x exaggeration</output>
      </label>

      <div className="flex flex-wrap items-center gap-x-3" role="group" aria-label="Sun elevation">
        <span className="label">Sun</span>
        <button type="button" aria-pressed={sun === SUN_DEFAULT} onClick={() => onSun(SUN_DEFAULT)} className="tab">
          Default sun {SUN_DEFAULT}°
        </button>
        <button type="button" aria-pressed={sun === SUN_LOW} onClick={() => onSun(SUN_LOW)} className="tab">
          Low sun {SUN_LOW}°
        </button>
        <span className="num text-[12px] text-muted" role="status">
          Sun {sun}° above the horizon, from the north-west
        </span>
      </div>
    </div>
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

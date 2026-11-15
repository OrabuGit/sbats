import { steepClass } from '../lib/routePlan';

export interface ProfilePoint {
  distanceM: number;
  /** Height above the square's own lowest point, metres. null where there is no data. */
  heightM: number | null;
  /** Slope of the step arriving at this point, degrees. null for the first point or next to no data. */
  slopeDeg: number | null;
}

const RED = '#FF4D4D';
const AMBER = '#FFB000';
const fx = (v: number, d: number) => v.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });

/**
 * Elevation along one planned route (or, when there is none, along the straight line that is blocked), with
 * the steep steps coloured: amber over 75% of the slope limit, red, dashed and hatched over it.
 */
export function RouteProfile({ id, points, limitDeg, at, straight, title }: { id: string; points: ProfilePoint[]; limitDeg: number; at: number | null; straight: boolean; title: string }) {
  const valid = points.filter((p) => p.heightM !== null) as (ProfilePoint & { heightM: number })[];
  if (valid.length < 2) return <p className="text-[13px] text-muted">no data</p>;
  const w = 640;
  const h = 210;
  const pad = { l: 58, r: 12, t: 10, b: 44 };
  const maxD = Math.max(points[points.length - 1].distanceM / 1000, 0.01);
  const lo = Math.min(...valid.map((p) => p.heightM));
  const hi = Math.max(...valid.map((p) => p.heightM), lo + 1);
  const x = (dKm: number) => pad.l + (dKm / maxD) * (w - pad.l - pad.r);
  const y = (v: number) => h - pad.b - ((v - lo) / (hi - lo)) * (h - pad.t - pad.b);
  const base = straight ? '#7C8894' : '#D7DDE3';
  // Runs of steps with the same class, each drawn as one polyline.
  const runs: { cls: 0 | 1 | 2; pts: string[]; from: number; to: number }[] = [];
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1];
    const b = points[k];
    if (a.heightM === null || b.heightM === null) continue;
    const cls = steepClass(b.slopeDeg, limitDeg);
    const last = runs[runs.length - 1];
    const pa = `${x(a.distanceM / 1000).toFixed(1)},${y(a.heightM).toFixed(1)}`;
    const pb = `${x(b.distanceM / 1000).toFixed(1)},${y(b.heightM).toFixed(1)}`;
    if (last && last.cls === cls && last.to === a.distanceM) {
      last.pts.push(pb);
      last.to = b.distanceM;
    } else runs.push({ cls, pts: [pa, pb], from: a.distanceM, to: b.distanceM });
  }
  const over = runs.filter((r) => r.cls === 2);
  const amber = runs.filter((r) => r.cls === 1);
  const yTicks = [lo, (lo + hi) / 2, hi];
  const xTicks = [0, maxD / 2, maxD];
  const idx = at === null ? null : Math.min(points.length - 1, Math.round(at * (points.length - 1)));
  const label = `${title}. Height from ${fx(lo, 0)} to ${fx(hi, 0)} m over ${fx(maxD, 2)} km. ${over.length} section${over.length === 1 ? '' : 's'} over the ${limitDeg} degree limit, ${amber.length} over 75 percent of it.`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full max-w-[640px]" role="img" aria-label={label}>
      <defs>
        <pattern id={`hatch-${id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={RED} strokeWidth="1.5" strokeOpacity="0.35" />
        </pattern>
      </defs>
      {over.map((r) => (
        <rect key={`h${r.from}`} x={x(r.from / 1000)} y={pad.t} width={Math.max(1, x(r.to / 1000) - x(r.from / 1000))} height={h - pad.t - pad.b} fill={`url(#hatch-${id})`} />
      ))}
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="#2A3138" strokeWidth="1" />
          <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#7C8894" fontFamily="IBM Plex Mono, monospace">
            {fx(v, 0)}
          </text>
        </g>
      ))}
      {xTicks.map((d) => (
        <text key={d} x={x(d)} y={h - 26} textAnchor={d === 0 ? 'start' : d === maxD ? 'end' : 'middle'} fontSize="11" fill="#7C8894" fontFamily="IBM Plex Mono, monospace">
          {fx(d, 1)}
        </text>
      ))}
      <text x={pad.l + (w - pad.l - pad.r) / 2} y={h - 6} textAnchor="middle" fontSize="11" fill="#7C8894">
        Distance along the {straight ? 'straight line' : 'route'}, km
      </text>
      <text x={12} y={pad.t + (h - pad.t - pad.b) / 2} textAnchor="middle" fontSize="11" fill="#7C8894" transform={`rotate(-90 12 ${pad.t + (h - pad.t - pad.b) / 2})`}>
        Height, m
      </text>
      {runs.map((r) => (
        <polyline
          key={`l${r.from}`}
          points={r.pts.join(' ')}
          fill="none"
          stroke={r.cls === 2 ? RED : r.cls === 1 ? AMBER : base}
          strokeWidth={r.cls === 0 ? 1.5 : 2}
          strokeDasharray={r.cls === 2 ? '5 3' : undefined}
        />
      ))}
      {idx !== null && <line x1={x(points[idx].distanceM / 1000)} x2={x(points[idx].distanceM / 1000)} y1={pad.t} y2={h - pad.b} stroke="#D7DDE3" strokeWidth="1" strokeDasharray="2 3" />}
    </svg>
  );
}

/** Key for the steepness colours, used under the profiles. */
export function RouteSteepKey({ limitDeg }: { limitDeg: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
      <span className="num flex items-center gap-1.5">
        <span className="block h-0.5 w-4 bg-text" aria-hidden="true" /> up to {fx(0.75 * limitDeg, 1)}°
      </span>
      <span className="num flex items-center gap-1.5">
        <span className="block h-0.5 w-4" style={{ background: AMBER }} aria-hidden="true" /> {fx(0.75 * limitDeg, 1)}° to {limitDeg}° (over 75% of the limit)
      </span>
      <span className="num flex items-center gap-1.5">
        <span className="block h-0 w-4 border-t-2 border-dashed" style={{ borderColor: RED }} aria-hidden="true" /> over {limitDeg}° (over the limit)
      </span>
    </div>
  );
}

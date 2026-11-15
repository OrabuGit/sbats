import type { PlanResult } from '../lib/routePlan';
import { strideWords } from '../lib/routePlan';
import { ComputedBadge, SourceBadge } from './Badges';

export interface Sourced {
  value: number | null;
  unit: string;
  kind: string;
  source: string;
  url?: string;
  badge?: 'Measured' | 'Mission' | 'Literature';
}

const fx = (v: number, d: number) => v.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });

/** Speed in metres per hour from a rovers.json figure, or null when the unit is not one this reads. */
export function metresPerHour(s: Sourced | null | undefined): number | null {
  if (!s || s.value === null || !(s.value > 0)) return null;
  const u = s.unit.toLowerCase();
  if (u === 'm per hour' || u === 'm/h') return s.value;
  if (u === 'km per hour' || u === 'km/h') return s.value * 1000;
  return null;
}

export const hoursText = (h: number) => (h < 1 ? `${fx(h * 60, 0)} min` : `${fx(h, 1)} h`);

/** One published rover figure with its unit, kind and source badge, or "no data". */
export function RoverFigure({ label, fig, unit }: { label: string; fig: Sourced | null | undefined; unit: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-line py-2">
      <span className="label w-[92px] shrink-0">{label}</span>
      {fig && fig.value !== null ? (
        <>
          <span className="num text-[13px] text-text">
            {fx(fig.value, 0)}
            {unit}
          </span>
          <SourceBadge badge={fig.badge ?? null} source={fig.source} />
          <span className="basis-full text-[11px] text-muted">
            {fig.kind}. {fig.url ? (
              <a href={fig.url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-2 hover:text-text">
                {fig.source}
              </a>
            ) : (
              fig.source
            )}
          </span>
        </>
      ) : (
        <span className="num text-[13px] text-muted">no data</span>
      )}
    </div>
  );
}

interface Side {
  name: string;
  plan: PlanResult | null;
  pixelM: number;
}

/** Planned route figures for Earth and the target, side by side. */
export function RouteFigures({ sides, limitDeg, speedMph, waypoints }: { sides: [Side, Side]; limitDeg: number | null; speedMph: number | null; waypoints: number }) {
  const cell = (p: PlanResult | null, get: (p: PlanResult) => string) => (p === null ? 'no data' : p.ok ? get(p) : 'no route');
  const rows: [string, (p: PlanResult | null) => string][] = [
    ['Result', (p) => (p === null ? 'no data' : p.ok ? 'Route found' : `No route under ${p.limitDeg}°`)],
    ['Distance', (p) => cell(p, (q) => `${fx(q.distanceM / 1000, 2)} km`)],
    ['Total climb', (p) => cell(p, (q) => `${fx(q.climbM, 0)} m`)],
    ['Total descent', (p) => cell(p, (q) => `${fx(q.descentM, 0)} m`)],
    ['Steepest step', (p) => cell(p, (q) => `${fx(q.maxSlopeDeg, 1)}° of ${q.limitDeg}°`)],
    ['Drive time', (p) => cell(p, (q) => (speedMph === null ? 'no data' : hoursText(q.distanceM / speedMph)))],
    ['Grid used', (p) => (p === null ? 'no data' : `${fx(p.spacingM, 0)} m steps`)],
  ];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[14px] font-semibold text-text">Planned route</h3>
        <ComputedBadge title="Computed in the browser: a shortest-path search over the elevation grid that refuses any step steeper than the rover's slope limit." />
      </div>
      <table className="mt-2 w-full max-w-[460px] border-collapse">
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="label py-1.5 text-left font-normal">
              {waypoints} waypoint{waypoints === 1 ? '' : 's'}
            </th>
            {sides.map((s) => (
              <th key={s.name} scope="col" className="label max-w-[120px] truncate py-1.5 pl-4 text-right font-normal">
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, get]) => (
            <tr key={label} className="border-b border-line">
              <th scope="row" className="py-2 pr-4 text-left text-[12px] font-normal text-muted">
                {label}
              </th>
              {sides.map((s) => {
                const v = get(s.plan);
                const bad = v === 'no data' || v === 'no route';
                return (
                  <td key={s.name} className={`num py-2 pl-4 text-right text-[13px] ${bad ? 'text-muted' : s.plan && !s.plan.ok && label === 'Result' ? 'text-[#FF4D4D]' : 'text-text'}`}>
                    {v}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="mt-2 max-w-[62ch] space-y-1">
        {sides.map((s) =>
          s.plan ? (
            <li key={s.name} className="text-[11px] text-muted">
              {s.name}: {fx(s.pixelM, 0)} m posts, route computed on {strideWords(s.plan.stride)}, not survey-grade.
            </li>
          ) : null,
        )}
        {limitDeg !== null && (
          <li className="text-[11px] text-muted">
            Every step of a planned route is at most {limitDeg}° between two posts. Steps go in eight directions only, so a length can read up to about 8% longer than a free path, and a
            coarser grid reads gentler slopes, so the two places are not compared by slope.
          </li>
        )}
      </ul>
    </div>
  );
}

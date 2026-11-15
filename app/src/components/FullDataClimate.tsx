import type { SiteClimate } from '../data/sandbox';
import { shortName } from '../lib/format';
import { niceTicks, tickText } from './ExploreStats';
import { SourceBadge } from './Badges';
import { ACCENT, DASH, GREY, INK, LINE, Legend, MONO, MUTED } from './FullDataCharts';
import { MONTHS, climateReading, fmtN } from './FullDataCalc';

const L = 66;
const PW = 560;
const R = 16;
const W = L + PW + R;
const PH = 96;
const GAP = 40;
const TOP = 14;

type Num = number | null;

function line(vals: Num[], x: (i: number) => number, y: (v: number) => number): string {
  let d = '';
  let pen = false;
  vals.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

const span = (vals: Num[], zero: boolean) => {
  const v = vals.filter((q): q is number => q !== null);
  if (v.length === 0) return null;
  return { lo: zero ? Math.min(0, ...v) : Math.min(...v), hi: Math.max(...v) };
};

/** Monthly climate of the Earth site: only what data/site_climate.json holds, which is temperature, precipitation and sunlight. */
export function ClimateSection({ climate, siteId, name }: { climate: SiteClimate | null; siteId: string | null; name: string }) {
  if (!siteId) return <p className="text-[14px] leading-[22px] text-muted">No data: monthly climate exists for named sites only.</p>;
  if (!climate) return <p className="text-[14px] leading-[22px] text-muted">No data: the monthly climate file was not loaded.</p>;
  const site = climate.sites.find((s) => s.id === siteId);
  if (!site || site.months.length === 0) return <p className="text-[14px] leading-[22px] text-muted">No data: monthly climate was not built for this site.</p>;

  const months = [...site.months].sort((a, b) => a.month - b.month);
  const at = (m: number) => months.find((r) => r.month === m) ?? null;
  const series = (k: 'tempMean' | 'tempRange' | 'precip' | 'solar'): Num[] => MONTHS.map((_, i) => at(i + 1)?.[k] ?? null);
  const tm = series('tempMean');
  const tr = series('tempRange');
  const pr = series('precip');
  const so = series('solar');
  const x = (i: number) => L + ((i + 0.5) / 12) * PW;
  const field = (k: string) => climate.meta.fields.find((f) => f.key === k);

  const panels = [
    { id: 'temp', title: 'Temperature (°C)', ...span([...tm, ...tr], true) },
    { id: 'precip', title: 'Precip. (mm/month)', ...span(pr, true) },
    { id: 'solar', title: 'Sunlight (W/m²)', ...span(so, true) },
  ].filter((p): p is typeof p & { lo: number; hi: number } => 'lo' in p && p.lo !== undefined);

  if (panels.length === 0) return <p className="text-[14px] leading-[22px] text-muted">No data: this site has no monthly values.</p>;

  const H = TOP + panels.length * (PH + GAP) + 6;
  const reading = climateReading(months, shortName(name));
  const label = `Monthly climate of ${name}: temperature, precipitation and sunlight by month. ${reading}`;

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[520px] max-w-[760px]" role="img" aria-label={label}>
          {panels.map((p, n) => {
            const top = TOP + n * (PH + GAP);
            const t = niceTicks(p.lo, p.hi * 1.05, 3);
            const hi = Math.max(p.hi, t.ticks[t.ticks.length - 1] ?? p.hi);
            const lo = Math.min(p.lo, t.ticks[0] ?? p.lo);
            const y = (v: number) => top + PH - ((v - lo) / (hi - lo || 1)) * PH;
            const last = n === panels.length - 1;
            return (
              <g key={p.id}>
                {t.ticks.map((v) => (
                  <g key={v}>
                    <line x1={L} x2={L + PW} y1={y(v)} y2={y(v)} stroke={LINE} strokeWidth="1" />
                    <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fontFamily={MONO} fill={MUTED}>
                      {tickText(v, t.step)}
                    </text>
                  </g>
                ))}
                <text transform={`translate(14 ${top + PH / 2}) rotate(-90)`} textAnchor="middle" fontSize="11" fill={INK}>
                  {p.title}
                </text>
                {p.id === 'temp' && (
                  <>
                    <path d={line(tr, x, y)} fill="none" stroke={GREY} strokeWidth="2.5" strokeDasharray={DASH} strokeLinejoin="round" />
                    <path d={line(tm, x, y)} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinejoin="round" />
                  </>
                )}
                {p.id === 'precip' &&
                  pr.map((v, i) => (v === null ? null : <rect key={i} x={x(i) - 13} y={Math.min(y(v), y(0))} width="26" height={Math.abs(y(0) - y(v))} fill={ACCENT} />))}
                {p.id === 'solar' && <path d={line(so, x, y)} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinejoin="round" />}
                <line x1={L} x2={L + PW} y1={y(Math.max(lo, 0))} y2={y(Math.max(lo, 0))} stroke={MUTED} strokeWidth="1" />
                {last &&
                  MONTHS.map((m, i) => (
                    <text key={m} x={x(i)} y={top + PH + 18} textAnchor="middle" fontSize="12" fontFamily={MONO} fill={MUTED}>
                      {m.slice(0, 3)}
                    </text>
                  ))}
                {last && (
                  <text x={L + PW / 2} y={top + PH + 36} textAnchor="middle" fontSize="12" fill={INK}>
                    Month of the year, 2001 to 2020 average
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <Legend
        items={[
          { label: 'Mean temperature', color: ACCENT },
          { label: 'Day-night temperature range', color: GREY, dash: DASH },
          { label: 'Precipitation (bars)', color: ACCENT, bar: true },
          { label: 'Sunlight', color: ACCENT },
        ]}
      />
      <p className="mt-3 max-w-[72ch] text-[14px] leading-[22px] text-text">{reading}</p>
      <p className="mt-2 max-w-[72ch] text-[14px] leading-[22px] text-muted">Wind: no data. The monthly climate file holds temperature, precipitation and sunlight only.</p>
      <ul className="mt-3 max-w-[90ch] space-y-1 text-[12px] leading-4 text-muted">
        {(['tempMean', 'tempRange', 'precip', 'solar'] as const).map((k) => {
          const f = field(k);
          return f ? (
            <li key={k} className="flex flex-wrap items-center gap-x-2">
              <span className="text-text">{f.label}, {f.unit}</span>
              <SourceBadge badge={f.badge} source={f.source} />
              <span>{f.source}</span>
            </li>
          ) : null;
        })}
        <li>Each value is that of the source grid cell containing the site, not a measurement at the site. Months with no value are left blank ({fmtN(months.length)} of 12 months held).</li>
      </ul>
    </div>
  );
}

// Sunlight, side by side. Everything shown is read from the match record's "sunlight" dimension (the
// "sunElevation" row) or computed here from it; nothing is typed in per place.
//
// RULES
//  1. The figure is the annual mean noon Sun elevation (lib/scoring/sunlight.ts): for each day of the year the
//     highest elevation of the Sun, from latitude and the body's axial tilt, averaged over the year. Polar
//     night counts as 0. It is Computed in the browser; the tilts are Literature (NASA NSSDCA, PIA13720).
//  2. Each diagram is a half-circle horizon with the Sun drawn at that angle above it, at one scale for both.
//  3. The one reading is by rule from the record's own similarity and verdict (same cut-offs everywhere: 0.75
//     and 0.30) and the difference of the two angles. A lower Sun casts longer shadows: that is geometry.
//  4. When the target is beyond anything Earth offers, the record's own sentence is quoted and the score is
//     said to use Earth's closest value.
//  5. The closing line about relief is fixed; the target's own "Light:" note from the record is reused as is.

import type { MatchRecord } from '../lib/matchAdapter';
import { SUN_ELEVATION_SIGMA_DEG } from '../lib/scoringAdapter';
import { fromRecord } from '../lib/verdict';
import { ComputedBadge } from './Badges';
import { Reveal } from './HomeStory';

const R = 100;
const CX = 130;
const CY = 118;

function Horizon({ deg, name, who }: { deg: number | null; name: string; who: string }) {
  const rad = ((deg ?? 0) * Math.PI) / 180;
  const sx = CX + R * Math.cos(rad);
  const sy = CY - R * Math.sin(rad);
  return (
    <figure>
      <svg
        viewBox="0 0 260 150"
        role="img"
        aria-label={deg === null ? `${name}: no Sun elevation` : `${name}: the Sun stands ${deg.toFixed(0)} degrees above the horizon at noon, on average`}
        className="h-auto w-full max-w-[360px] text-text"
      >
        <path d={`M${CX - R} ${CY}A${R} ${R} 0 0 1 ${CX + R} ${CY}`} fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth={1.5} />
        <path d={`M${CX - R - 18} ${CY}H${CX + R + 18}`} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
        {deg !== null && (
          <>
            <path d={`M${CX} ${CY}L${sx.toFixed(1)} ${sy.toFixed(1)}`} stroke="#FFB000" strokeWidth={1.2} strokeDasharray="3 4" />
            {deg > 0.5 && (
              <path d={`M${CX + 40} ${CY}A40 40 0 0 0 ${(CX + 40 * Math.cos(rad)).toFixed(1)} ${(CY - 40 * Math.sin(rad)).toFixed(1)}`} fill="none" stroke="currentColor" strokeWidth={1.2} />
            )}
            <circle cx={sx.toFixed(1)} cy={sy.toFixed(1)} r={9} fill="#FFB000" />
            <text x={CX + 48} y={CY - 6} fontSize={13} fill="currentColor" className="num">
              {deg.toFixed(deg < 10 ? 1 : 0)}°
            </text>
          </>
        )}
        <text x={CX} y={CY + 22} textAnchor="middle" fontSize={10} fill="currentColor" fillOpacity={0.7} letterSpacing={1.2}>
          {who}
        </text>
      </svg>
      <figcaption className="mt-1 text-[14px] leading-6 text-text">{name}</figcaption>
    </figure>
  );
}

/** Noon Sun elevation of the Earth place and the target, as two horizons at one scale, with a one-sentence reading. */
export function SunlightCompare({ record, earthName, targetName }: { record: MatchRecord; earthName: string; targetName: string }) {
  const dim = record.dimensions.find((d) => d.id === 'sunlight');
  const row = dim?.rows.find((r) => r.key === 'sunElevation');
  const e = typeof row?.earth.value === 'number' ? row.earth.value : null;
  const t = typeof row?.target.value === 'number' ? row.target.value : null;
  const sim = dim?.similarity ?? null;
  const v = dim ? fromRecord(dim.verdict) : 'none';
  const beyond = record.beyondEarth.find((b) => b.key === 'sunElevation');
  const light = record.cannotCopy.find((s) => s.startsWith('Light:'));

  let reading: string;
  if (e === null || t === null || sim === null) {
    reading = 'Sunlight was not compared for this pair, because one of the two Sun elevations is missing.';
  } else {
    const d = e - t;
    const diff = Math.abs(d);
    const rel =
      diff < 0.5
        ? `At noon, on average, the Sun stands at the same height in ${earthName} and at ${targetName}.`
        : `At noon, on average, the Sun stands ${diff.toFixed(0)}° ${d > 0 ? 'higher' : 'lower'} in ${earthName} than at ${targetName}.`;
    const shadow = diff < 0.5 ? '' : d > 0 ? ' Shadows at the target are longer than here.' : ' Shadows at the target are shorter than here.';
    const verdict = v === 'match' ? 'a match' : v === 'partial' ? 'a partial match' : 'not a match';
    reading = `${rel}${shadow} That counts as ${verdict} (similarity ${sim.toFixed(2)}, tolerance ${SUN_ELEVATION_SIGMA_DEG}°).`;
  }

  return (
    <section className="border-t border-line" aria-labelledby="h-sun">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-10 sm:px-10">
        <Reveal>
          <h3 id="h-sun" className="display text-[24px] leading-8 text-text">
            Sunlight, side by side
          </h3>
          <p className="mt-1 max-w-[60ch] text-[14px] leading-[22px] text-muted">
            The mean noon height of the Sun over the year, from each place&apos;s latitude and its world&apos;s axial tilt. Both are drawn at the same scale.
          </p>
          <div className="mt-8 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            <Horizon deg={e} name={earthName} who="EARTH" />
            <Horizon deg={t} name={targetName} who={record.target.body === 'moon' ? 'MOON' : 'MARS'} />
          </div>
          <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] leading-5 text-muted">
            <span>Degrees above the horizon, annual mean of the noon Sun. Polar night counts as 0.</span>
            <ComputedBadge title={row?.earth.source ?? 'Computed in the browser from latitude and axial tilt.'} />
          </p>
          <p className="display mt-6 max-w-[48ch] text-[20px] leading-[28px] text-text">{reading}</p>
          {beyond && (
            <p className="mt-3 max-w-[64ch] text-[13px] leading-5 text-muted">{beyond.text} The score uses Earth&apos;s closest value.</p>
          )}
          <p className="mt-6 max-w-[64ch] text-[13px] leading-5 text-muted">
            Illumination at the poles also depends on local relief and long shadows, which this single number does not capture.
            {light ? ` ${light}` : ''}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

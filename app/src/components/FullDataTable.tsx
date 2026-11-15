import type { MatchSide } from '../lib/matchAdapter';
import { ComputedBadge, SourceBadge } from './Badges';
import { fmt, fmtN, fmtSigned, percentileWord, tableReading, type FactorLine } from './FullDataCalc';

function Source({ who, side }: { who: string; side: MatchSide }) {
  if (side.value === null) return <p className="text-[12px] leading-4 text-muted">{who}: no data</p>;
  return (
    <p className="text-[12px] leading-4 text-muted" title={side.source ?? undefined}>
      <span className="mr-1.5">{who}</span>
      {side.scale === 'computed' ? <ComputedBadge /> : <SourceBadge badge={side.badge} source={side.source} />}
      {side.source && <span className="mt-0.5 block max-w-[280px] truncate">{side.source}</span>}
    </p>
  );
}

function Value({ line, side, v }: { line: FactorLine; side: MatchSide; v: number | null }) {
  if (side.value === null) return <span className="text-muted">no data</span>;
  // Rock class and minerals are words; the bare-ground fallback has its own wording.
  if (v === null || line.key === 'lithology' || (line.barren && side === line.earth)) return <span className="text-text">{side.text}</span>;
  return <span className="num text-text">{fmt(line.key, v)}</span>;
}

/** Where the Earth value sits among all Earth cells: a short line from the lowest to the highest value, a mark, and the words. */
function Placement({ line, haveEarth }: { line: FactorLine; haveEarth: boolean }) {
  const p = line.placement;
  if (!haveEarth) return <span className="text-muted">no data</span>;
  if (p.sameClass !== null) return <span className="num text-text">{fmtN(p.sameClass, 1)}% of Earth cells share this rock class</span>;
  if (p.percentile === null || p.min === null || p.max === null) return <span className="text-muted">{line.earthValue === null ? 'no data' : 'not ranked'}</span>;
  return (
    <span className="block" title={`Earth cells range from ${fmt(line.key, p.min)} to ${fmt(line.key, p.max)} (${fmtN(p.cells)} cells)`}>
      <span className="num text-text">{percentileWord(p.percentile)}</span>
      <span className="relative mt-1.5 block h-[2px] w-[110px] bg-line" role="img" aria-label={`${percentileWord(p.percentile)} of Earth cells`}>
        <span className="absolute -top-[4px] h-[10px] w-[2px] bg-accent" style={{ left: `calc(${p.percentile}% - 1px)` }} />
      </span>
      <span className="num mt-1 block text-[11px] text-muted">
        {fmt(line.key, p.min)} to {fmt(line.key, p.max)}
      </span>
    </span>
  );
}

const TH = 'label whitespace-nowrap px-3 py-2 text-left align-bottom font-normal';
const TD = 'px-3 py-3 align-top';

/** One row per measurement: both values, the gap, the similarity, where the Earth value sits, the sources and the resolution. */
export function FullDataTable({ lines, targetName, haveEarth }: { lines: FactorLine[]; targetName: string; haveEarth: boolean }) {
  return (
    <div>
      <div className="max-w-full overflow-x-auto" role="region" aria-label="Table of every measurement; scrolls sideways" tabIndex={0}>
        <table className="w-full min-w-[1240px] border-collapse text-left text-[13px]">
          <caption className="sr-only">Every measurement of the pair: Earth value, target value, unit, difference, similarity, place in Earth's range, source, resolution and clamping.</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className={`${TH} sticky left-0 z-10 w-[130px] bg-bg sm:w-[190px]`}>
                Measurement
              </th>
              <th scope="col" className={TH}>Earth value</th>
              <th scope="col" className={TH}>{targetName}</th>
              <th scope="col" className={TH}>Unit</th>
              <th scope="col" className={TH}>Earth minus target</th>
              <th scope="col" className={TH}>Similarity</th>
              <th scope="col" className={TH}>Earth value in Earth&rsquo;s range</th>
              <th scope="col" className={TH}>Source</th>
              <th scope="col" className={TH}>Resolution</th>
              <th scope="col" className={TH}>Target clamped</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={`${l.dimension}-${l.key}`} className="border-b border-line/60">
                <th scope="row" className={`${TD} sticky left-0 z-10 bg-bg pr-4 text-left font-normal`}>
                  <span className="block text-[14px] font-semibold leading-5 text-text">{l.label}</span>
                  <span className="block text-[11px] leading-4 text-muted">{l.dimension}{l.inScore ? '' : ', not in the score'}</span>
                </th>
                <td className={TD}>
                  <Value line={l} side={l.earth} v={l.earthValue} />
                </td>
                <td className={TD}>
                  <Value line={l} side={l.target} v={l.targetValue} />
                </td>
                <td className={`${TD} max-w-[150px] text-[12px] leading-4 text-muted`}>{l.unit || (l.key === 'lithology' ? 'class' : l.key === 'minerals' ? 'families' : 'index')}</td>
                <td className={TD}>
                  {l.diff === null ? (
                    <span className="text-muted">{l.earth.value === null || l.target.value === null ? 'no data' : l.key === 'lithology' ? 'a class, not a number' : 'not a number'}</span>
                  ) : (
                    <span className="num text-text">
                      {fmtSigned(l.key, l.diff)}
                      {l.diffClamped !== null && <span className="block text-[11px] text-muted">{fmtSigned(l.key, l.diffClamped)} to Earth&rsquo;s closest</span>}
                    </span>
                  )}
                </td>
                <td className={TD}>
                  {l.similarity === null ? (
                    <span className="text-muted">no data</span>
                  ) : (
                    <span className="num block text-text">
                      {l.similarity.toFixed(2)}
                      <span className="mt-1.5 block h-[3px] w-[64px] bg-line" aria-hidden="true">
                        <span className="block h-full bg-accent" style={{ width: `${Math.max(0, Math.min(1, l.similarity)) * 100}%` }} />
                      </span>
                    </span>
                  )}
                </td>
                <td className={`${TD} min-w-[190px]`}>
                  <Placement line={l} haveEarth={haveEarth} />
                </td>
                <td className={`${TD} min-w-[230px] space-y-1`}>
                  <Source who="Earth" side={l.earth} />
                  <Source who="Target" side={l.target} />
                </td>
                <td className={`${TD} min-w-[170px] text-[12px] leading-4 text-muted`}>
                  <span className="block">Earth: {l.resolution}</span>
                  <span className="block">Target: {l.target.value === null ? 'no data' : l.target.scale === 'computed' ? 'computed' : 'as published'}</span>
                </td>
                <td className={`${TD} min-w-[170px]`}>
                  {l.clampedTo === null ? (
                    <span className="text-muted">{l.target.value === null ? 'no data' : 'No'}</span>
                  ) : (
                    <span className="num text-text">
                      Yes
                      <span className="block text-[11px] leading-4 text-muted">
                        real {fmt(l.key, l.targetValue)}, used {fmt(l.key, l.clampedTo)}
                      </span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-[72ch] text-[14px] leading-[22px] text-text">{tableReading(lines)}</p>
      <p className="mt-2 max-w-[72ch] text-[12px] leading-4 text-muted">
        Similarity is the Gaussian of the gap over the key&rsquo;s tolerance; rock class uses the lookup table. Percentile counts Earth cells with a lower value, ties half.
        A target value beyond Earth&rsquo;s observed range is clamped to its nearest end before scoring.
      </p>
    </div>
  );
}

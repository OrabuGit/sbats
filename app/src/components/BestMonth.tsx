import type { BestMonth as Result } from '../lib/bestMonth';
import { MONTH_NAMES, MONTH_SHORT } from '../lib/bestMonth';
import { ComputedBadge, SourceBadge } from './Badges';
import { DataTable, Td } from './InfoParts';

const KEY_WORD = { precip: 'precipitation', tempMean: 'mean temperature', tempRange: 'day-night temperature range' } as const;
const fx = (v: number | null, d: number) => (v === null ? 'no data' : v.toFixed(d).replace('-', '−'));

/** Twelve bars of monthly precipitation with the best month marked. */
function Bars({ result }: { result: Result }) {
  const max = Math.max(1, ...result.months.map((m) => m.precip ?? 0));
  return (
    <div className="mt-2 grid grid-cols-12 gap-px" role="img" aria-label={`Precipitation by month. Largest: ${max.toFixed(0)} mm.`}>
      {result.months.map((m) => {
        const on = m.month === result.best;
        return (
          <div key={m.month} className="flex flex-col">
            <div className="flex h-10 items-end border-b border-line">
              {m.precip !== null && <div className={`w-full ${on ? 'bg-accent' : 'bg-muted'}`} style={{ height: `${Math.max(2, (m.precip / max) * 100)}%` }} />}
            </div>
            <span className={`num mt-1 text-center text-[10px] leading-3 ${on ? 'text-accent' : 'text-muted'}`}>{MONTH_SHORT[m.month - 1][0]}</span>
          </div>
        );
      })}
    </div>
  );
}

export function BestMonthSummary({ result, targetName, source }: { result: Result; targetName: string; source: string }) {
  const best = result.months.find((m) => m.month === result.best);
  if (!best) return <p className="mt-1 text-[13px] text-muted">No data. The target has no published climate value to compare a month with.</p>;
  const max = Math.max(1, ...result.months.map((m) => m.precip ?? 0));
  return (
    <>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="text-[14px] font-semibold text-accent">{MONTH_NAMES[best.month - 1]}</span>
        <span className="num text-[12px] text-text">
          {fx(best.precip, 0)} mm · mean {fx(best.tempMean, 1)} °C · day-night range {fx(best.tempRange, 1)} °C
        </span>
        <SourceBadge badge="Measured" source={source} />
      </p>
      <Bars result={result} />
      <p className="mt-2 text-[11px] text-muted">
        Bars: precipitation, 0 to {max.toFixed(0)} mm per month. The marked month is closest to {targetName} on{' '}
        {result.keys.map((k) => KEY_WORD[k]).join(', ')}, by the comparison the match score uses. Values are for the 0.5° grid cell around the
        site, not measured at the site.
      </p>
    </>
  );
}

export function BestMonthTable({ result, source, period }: { result: Result; source: string; period: string }) {
  return (
    <DataTable caption={`Monthly climate normals, ${period}`} headers={['Month', 'Precipitation, mm', 'Mean temperature, °C', 'Day-night range, °C', 'Sunlight, W/m²', 'Climate similarity']} numeric={[1, 2, 3, 4, 5]} minWidth={620}>
      {result.months.map((m) => {
        const on = m.month === result.best;
        return (
          <tr key={m.month} className="border-b border-line">
            <Td>
              <span className={on ? 'font-semibold text-accent' : ''}>{MONTH_NAMES[m.month - 1]}</span>
              {on && <span className="label ml-2 !text-accent">Best</span>}
            </Td>
            <Td num muted={m.precip === null}>{fx(m.precip, 0)}</Td>
            <Td num muted={m.tempMean === null}>{fx(m.tempMean, 1)}</Td>
            <Td num muted={m.tempRange === null}>{fx(m.tempRange, 1)}</Td>
            <Td num muted={m.solar === null}>{fx(m.solar, 0)}</Td>
            <Td num muted={m.match === null}>{m.match === null ? 'no data' : m.match.toFixed(2)}</Td>
          </tr>
        );
      })}
      <tr>
        <td colSpan={6} className="pt-2 text-[11px] text-muted">
          <SourceBadge badge="Measured" source={source} /> {source}. Climate similarity{' '}
          <ComputedBadge title="Computed in the browser from the monthly normals and the target values." /> runs from 0 to 1.
        </td>
      </tr>
    </DataTable>
  );
}

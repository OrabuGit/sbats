import type { ReactNode } from 'react';
import { ElementIcon, type ElementId } from './ElementIcon';
import { AiMark } from './AiMark';
import { CountUp, Meter, Rv, useSeen } from './ValidationParts';
import { MATCH, MISS, VERDICT_WORD, verdictOf } from '../lib/verdict';

// Pieces of the Sites page: dimension strip, footprint-to-scale squares, monthly sparklines, match ledger.

export interface DimTile {
  id: ElementId;
  name: string;
  /** 0 to 1 at the footprint, or null. */
  site: number | null;
  /** 0 to 1 at the grid cell, or null. */
  cell: number | null;
  measures: string;
}

const sim = (v: number | null) => (v === null ? 'no data' : v.toFixed(2));

/** The five dimensions as five tiles: icon, similarity, a bar with the two cut-offs, the verdict in a word. */
export function DimensionStrip({ tiles }: { tiles: DimTile[] }) {
  return (
    <>
    <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
      {tiles.map((t, k) => (
        <li key={t.id}>
          <Rv i={k}>
            <DimensionTile tile={t} />
          </Rv>
        </li>
      ))}
    </ul>
    <AiMark className="mt-4" />
    </>
  );
}

function DimensionTile({ tile: t }: { tile: DimTile }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const v = verdictOf(t.site);
  return (
    <div ref={ref} className="h-full border-t border-line pt-4">
      <div className="flex items-center gap-3 text-text">
        <ElementIcon id={t.id} size={40} />
        <div>
          <p className="text-[15px] font-semibold text-text">{t.name}</p>
          <p className="text-[12px] leading-4 text-muted lg:min-h-12">{t.measures}</p>
        </div>
      </div>
      <p className="display mt-5 text-[52px] leading-none text-text">
        <CountUp value={t.site} decimals={2} play={seen} />
      </p>
      <div className="relative mt-4">
        <Meter value={t.site} label={`${t.name}, similarity at the footprint`} height={8} />
        {[MISS, MATCH].map((c) => (
          <span key={c} className="absolute -bottom-1.5 -top-1.5 w-px bg-muted" style={{ left: `${c * 100}%` }} aria-hidden="true" />
        ))}
      </div>
      <p className="mt-3 text-[14px] font-medium text-text">{VERDICT_WORD[v]}</p>
      <p className="num mt-1 text-[12px] text-muted">grid cell {sim(t.cell)}</p>
    </div>
  );
}

/** Footprint, the picture window and the grid cell, as squares at one scale. */
export function ScaleSquares({ footprintKm, windowKm, cellKm = 55 }: { footprintKm: number; windowKm: number | null; cellKm?: number }) {
  const S = 320;
  const k = S / cellKm;
  const fp = Math.max(8, footprintKm * k);
  const win = windowKm === null ? null : windowKm * k;
  const lab = (x: number, y: number, t: string, anchor: 'start' | 'end' = 'start') => (
    <text x={x} y={y} textAnchor={anchor} className="num" fontSize={12} fill="currentColor">
      {t}
    </text>
  );
  return (
    <svg viewBox={`0 0 ${S + 2} ${S + 2}`} className="w-full max-w-[420px] text-text" role="img" aria-label={`A ${footprintKm} km footprint drawn to scale inside a ${cellKm} km grid cell${windowKm === null ? '' : ` and a ${windowKm} km picture window`}`}>
      <rect x={1} y={1} width={S} height={S} fill="none" stroke="currentColor" strokeWidth={1.5} opacity={0.5} />
      {lab(8, 18, `${cellKm} km grid cell`)}
      {win !== null && (
        <>
          <rect x={1 + (S - win) / 2} y={1 + (S - win) / 2} width={win} height={win} fill="none" stroke="currentColor" strokeWidth={1} strokeDasharray="4 4" opacity={0.7} />
          {lab(1 + (S - win) / 2 + 6, 1 + (S - win) / 2 + 16, `${windowKm} km picture`)}
        </>
      )}
      <rect x={1 + (S - fp) / 2} y={1 + (S - fp) / 2} width={fp} height={fp} fill="#FFB000" />
      <text x={1 + S / 2} y={1 + (S + fp) / 2 + 18} textAnchor="middle" className="num" fontSize={12} fill="#FFB000">
        {footprintKm} km footprint
      </text>
    </svg>
  );
}

export interface MonthPoint {
  month: number;
  value: number | null;
}

const MONTH_INITIAL = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

/** Twelve months as a small chart. The best month is amber. Bars for rain, a line for the rest. */
export function Spark({ title, unit, points, best, kind, digits = 0 }: { title: string; unit: string; points: MonthPoint[]; best: number | null; kind: 'bars' | 'line'; digits?: number }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const vals = points.map((p) => p.value).filter((v): v is number => v !== null);
  const W = 240;
  const H = 84;
  const lo = kind === 'bars' ? 0 : Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const x = (i: number) => 10 + (i * (W - 20)) / 11;
  const y = (v: number) => H - 6 - ((v - lo) / span) * (H - 16);
  const fmt = (v: number) => v.toFixed(digits).replace('-', '−');
  const path = points
    .map((p, i) => (p.value === null ? null : `${i === 0 || points[i - 1].value === null ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`))
    .filter(Boolean)
    .join(' ');
  return (
    <div ref={ref}>
      <p className="label">{title}</p>
      {vals.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted">No data</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H + 14}`} className="mt-2 w-full text-muted" role="img" aria-label={`${title}, by month, ${fmt(lo)} to ${fmt(hi)} ${unit}`}>
            <path d={`M10 ${H - 5} H${W - 10}`} stroke="currentColor" strokeWidth={1} opacity={0.4} />
            {kind === 'bars'
              ? points.map((p, i) =>
                  p.value === null ? null : (
                    <rect
                      key={p.month}
                      x={x(i) - 7}
                      y={y(p.value)}
                      width={14}
                      height={Math.max(2, H - 5 - y(p.value))}
                      fill={p.month === best ? '#FFB000' : 'currentColor'}
                      style={{ transformOrigin: `${x(i)}px ${H - 5}px`, transform: seen ? 'none' : 'scaleY(0)', transition: `transform 700ms cubic-bezier(0.2, 0.7, 0.2, 1) ${i * 40}ms` }}
                    />
                  ),
                )
              : (
                <>
                  <path
                    d={path}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    pathLength={1}
                    strokeDasharray={1}
                    strokeDashoffset={seen ? 0 : 1}
                    style={{ transition: 'stroke-dashoffset 1300ms cubic-bezier(0.2, 0.7, 0.2, 1)' }}
                  />
                  {points.map((p, i) =>
                    p.value === null ? null : (
                      <circle key={p.month} cx={x(i)} cy={y(p.value)} r={p.month === best ? 4.5 : 2.5} fill={p.month === best ? '#FFB000' : 'currentColor'} style={{ opacity: seen ? 1 : 0, transition: `opacity 400ms ${600 + i * 40}ms` }} />
                    ),
                  )}
                </>
              )}
            {points.map((p, i) => (
              <text key={p.month} x={x(i)} y={H + 10} textAnchor="middle" fontSize={9} className="num" fill={p.month === best ? '#FFB000' : 'currentColor'}>
                {MONTH_INITIAL[i]}
              </text>
            ))}
          </svg>
          <p className="num mt-1 flex justify-between text-[12px] text-muted">
            <span>
              {fmt(lo)} {unit}
            </span>
            <span>
              {fmt(hi)} {unit}
            </span>
          </p>
        </>
      )}
    </div>
  );
}

/** One row of the match ledger: what is here, what the target has, and how close that is. */
export function LedgerRow({ name, here, there, similarity, extra }: { name: string; here: string; there: string; similarity: number | null; extra?: ReactNode }) {
  const v = verdictOf(similarity);
  return (
    <li className="grid items-center gap-x-6 gap-y-1 border-t border-line py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_200px]">
      <div>
        <p className="text-[15px] font-medium text-text">{name}</p>
        <p className="text-[12px] text-muted">{VERDICT_WORD[v]}</p>
        {extra}
      </div>
      <p className="num text-[13px] text-muted">
        <span className="text-text">{here}</span> here, <span className="text-text">{there}</span> at the target
      </p>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Meter value={similarity} label={`${name} similarity`} height={6} tone={v === 'miss' ? 'muted' : 'accent'} />
        </div>
        <span className="num w-10 text-right text-[13px] text-text">{similarity === null ? 'no data' : similarity.toFixed(2)}</span>
      </div>
    </li>
  );
}

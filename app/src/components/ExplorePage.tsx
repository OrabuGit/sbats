import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowLeftRight } from 'lucide-react';
import type { Analog, EarthFile, FactorKey, Target } from '../types';
import { formatCoords, siteCode } from '../lib/geo';
import { formatValue, keyLabel, metaByKey } from '../lib/format';
import { ComputedBadge, SourceBadge } from './Badges';
import { ExploreChart, MarkGlyph, type Mark, type MarkKind, type Sel } from './ExploreChart';
import { availableKeys, defaultAxes, keyStats, noun, pairSentence, unitOf } from './ExploreStats';
import { MChip } from './MethodParts';

export interface ExplorePageProps {
  earth: EarthFile;
  target: Target;
  /** The ranked matches: index into earth.cells and rank (1 is best). */
  candidates: { index: number; rank: number }[];
  /** Known and proposed sites, each with the index of its nearest cell. */
  analogs: { analog: Analog; index: number }[];
  onOpenCell: (index: number) => void;
  onBack: () => void;
}

const pad = 'mx-auto w-full max-w-[1320px] px-5 sm:px-10';
const KIND_WORD: Record<MarkKind, string> = {
  target: 'Target',
  match: 'Top match',
  known: 'Known analog',
  candidate: 'Proposed site',
  negative: 'Negative control',
};
const SITE_KINDS: MarkKind[] = ['known', 'candidate', 'negative'];

/** A button in the list of marked points. Real button, 44 px, the mark's own shape in front. */
function PointButton({ mark, on, onClick }: { mark: Mark; on: boolean; onClick: () => void }) {
  const round = mark.kind === 'match';
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      aria-label={`${KIND_WORD[mark.kind]}: ${mark.name}`}
      className={`inline-flex min-h-11 items-center gap-2 border px-2.5 text-[13px] ${round ? 'min-w-11 justify-center' : ''} ${on ? 'border-accent text-accent' : 'border-line text-text hover:border-muted'}`}
    >
      {!round && (
        <svg width="18" height="18" viewBox="-10 -10 20 20" aria-hidden="true" className="shrink-0">
          <MarkGlyph kind={mark.kind} r={mark.kind === 'target' ? 0.9 : 1} />
        </svg>
      )}
      <span className={round ? 'num' : ''}>{round ? mark.label : mark.name}</span>
    </button>
  );
}

/** What the readout shows: one named point or one cell, with its values on the two axes. */
interface Readout {
  title: string;
  kind: string;
  coords: string | null;
  code: string | null;
  index: number | null;
  rows: { key: FactorKey; value: string; note: string | null; badge: React.ReactNode }[];
}

export function ExplorePage({ earth, target, candidates, analogs, onOpenCell, onBack }: ExplorePageProps) {
  const meta = useMemo(() => metaByKey(earth), [earth]);
  const keys = useMemo(() => availableKeys(earth), [earth]);
  const def = useMemo(() => defaultAxes(earth, target), [earth, target]);
  const [chosen, setChosen] = useState<{ tid: string; x: FactorKey; y: FactorKey } | null>(null);
  const axes = chosen && chosen.tid === target.id ? chosen : { tid: target.id, x: def[0], y: def[1] };
  const [stretch, setStretch] = useState(true);
  const [selected, setSelected] = useState<Sel>({ type: 'mark', id: 'target' });
  useEffect(() => setSelected({ type: 'mark', id: 'target' }), [target.id]);

  const setAxis = (which: 'x' | 'y', k: FactorKey) => {
    const other = which === 'x' ? axes.y : axes.x;
    // Choosing the factor the other axis already shows swaps the two.
    const mine = which === 'x' ? axes.x : axes.y;
    const o = k === other ? mine : other;
    setChosen({ tid: target.id, x: which === 'x' ? k : o, y: which === 'y' ? k : o });
  };

  const { x: xKey, y: yKey } = axes;
  const sx = keyStats(earth, xKey);
  const sy = keyStats(earth, yKey);

  const marks = useMemo(() => {
    const tv = (k: FactorKey) => target.values[k]?.value ?? null;
    const cv = (i: number, k: FactorKey) => earth.cells[i]?.[k] ?? null;
    const out: Mark[] = [{ id: 'target', kind: 'target', label: '', name: target.name, index: null, x: tv(xKey), y: tv(yKey) }];
    for (const c of candidates) {
      if (c.index < 0 || c.index >= earth.cells.length) continue;
      out.push({ id: `m${c.rank}`, kind: 'match', label: String(c.rank), name: `Match ${c.rank}`, index: c.index, x: cv(c.index, xKey), y: cv(c.index, yKey) });
    }
    for (const a of analogs) {
      if (a.index < 0 || a.index >= earth.cells.length) continue;
      out.push({ id: `a:${a.analog.id}`, kind: a.analog.kind, label: '', name: a.analog.name, index: a.index, x: cv(a.index, xKey), y: cv(a.index, yKey) });
    }
    return out;
  }, [earth, target, candidates, analogs, xKey, yKey]);

  const placeable = (m: Mark) => m.x !== null && m.y !== null && (!(sx.categorical) || sx.codes.includes(m.x)) && (!sy.categorical || sy.codes.includes(m.y));
  const targetMark = marks[0];
  const targetPlaced = placeable(targetMark);
  const matchMarks = marks.filter((m) => m.kind === 'match');
  const siteMarks = marks.filter((m) => SITE_KINDS.includes(m.kind));
  const matchesPlaced = matchMarks.filter(placeable);
  const sitesPlaced = siteMarks.filter(placeable);

  const sentence = useMemo(() => pairSentence(earth, target, xKey, yKey, meta), [earth, target, xKey, yKey, meta]);

  // Target values outside Earth's range on a shown axis: the scoring compares against the edge value.
  const off = [xKey, yKey]
    .map((k) => {
      const v = target.values[k]?.value;
      const s = keyStats(earth, k);
      if (s.categorical || v === null || v === undefined || (v >= s.min && v <= s.max)) return null;
      return { key: k, real: v, edge: v < s.min ? s.min : s.max, low: v < s.min };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const readout = useMemo<Readout | null>(() => {
    if (!selected) return null;
    const values = (cellIndex: number) =>
      [xKey, yKey].map((k) => {
        const f = meta[k];
        return {
          key: k,
          value: formatValue(k, earth.cells[cellIndex][k], meta),
          note: null,
          badge: f ? <SourceBadge badge={f.badge} source={f.source} /> : null,
        };
      });
    if (selected.type === 'cell') {
      const c = earth.cells[selected.index];
      if (!c) return null;
      return { title: 'Nearest cell', kind: 'Earth cell', coords: formatCoords(c.lat, c.lon), code: siteCode(c), index: selected.index, rows: values(selected.index) };
    }
    const m = marks.find((x) => x.id === selected.id);
    if (!m) return null;
    if (m.kind === 'target') {
      return {
        title: target.name,
        kind: `Target on ${target.body === 'moon' ? 'the Moon' : 'Mars'}`,
        coords: formatCoords(target.lat, target.lon),
        code: null,
        index: null,
        rows: [xKey, yKey].map((k) => {
          const tvv = target.values[k];
          const s = keyStats(earth, k);
          const v = tvv?.value ?? null;
          let note: string | null = null;
          if (v === null) note = 'The target cannot be placed on this axis.';
          else if (!s.categorical && (v < s.min || v > s.max)) {
            const edge = v < s.min ? s.min : s.max;
            note = `Beyond Earth's ${v < s.min ? 'lowest' : 'highest'} value, ${formatValue(k, edge, meta)}. The chart and the score use ${formatValue(k, edge, meta)}.`;
          }
          return { key: k, value: formatValue(k, v, meta), note, badge: tvv?.badge ? <SourceBadge badge={tvv.badge} source={tvv.source} /> : null };
        }),
      };
    }
    if (m.index === null) return null;
    const c = earth.cells[m.index];
    return {
      title: m.name,
      kind: m.kind === 'match' ? 'Top match, cell values' : `${KIND_WORD[m.kind]}, values of its nearest cell`,
      coords: formatCoords(c.lat, c.lon),
      code: siteCode(c),
      index: m.index,
      rows: values(m.index),
    };
  }, [selected, marks, earth, meta, target, xKey, yKey]);

  const isOn = (m: Mark) => selected?.type === 'mark' && selected.id === m.id;
  const lithClasses = meta.lithology?.classes ?? [];
  const optionText = (k: FactorKey) => {
    const u = unitOf(k, meta);
    return `${keyLabel(k, meta)}${u ? ` (${u})` : ''}`;
  };
  const skewShown = [sx, sy].some((s) => s.skewed);
  const shortName = target.name.split(',')[0];
  const legend: { kind: MarkKind; text: string }[] = [
    { kind: 'target', text: 'Target' },
    ...(matchesPlaced.length ? [{ kind: 'match' as const, text: 'Top match, by rank' }] : []),
    ...(['known', 'candidate', 'negative'] as const).filter((k) => sitesPlaced.some((m) => m.kind === k)).map((k) => ({ kind: k, text: KIND_WORD[k] })),
  ];

  const select = (which: 'x' | 'y', label: string, value: FactorKey) => (
    <div className="min-w-0">
      <label className="label block" htmlFor={`explore-${which}`}>
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <select
          id={`explore-${which}`}
          value={value}
          onChange={(e) => setAxis(which, e.target.value as FactorKey)}
          className="min-h-11 min-w-0 flex-1 border border-line bg-panel px-3 text-[14px] text-text hover:border-muted"
          style={{ colorScheme: 'dark' }}
        >
          {keys.map((k) => (
            <option key={k} value={k}>
              {optionText(k)}
            </option>
          ))}
        </select>
        {meta[value] && <SourceBadge badge={meta[value]!.badge} source={meta[value]!.source} />}
      </div>
    </div>
  );

  return (
    <main className="scroll min-h-0 flex-1 bg-bg pb-16" aria-labelledby="h-explore">
      <div className={`${pad} flex items-center pt-3`}>
        <button type="button" onClick={onBack} className="btn btn-ghost !pl-0">
          <ArrowLeft size={15} aria-hidden="true" /> Back
        </button>
      </div>

      <header className={`${pad} pb-8 pt-4`}>
        <p className="label">Explore</p>
        <h2 id="h-explore" className="display-l mt-2 max-w-[22ch] text-[34px] sm:text-[48px]">
          {shortName} against every Earth cell
        </h2>
        <p className="mt-4 max-w-[62ch] text-[16px] leading-6 text-text">
          Each dot is one <span className="num">{earth.meta.resolutionDeg}°</span> land cell. Choose two measurements to see where the target sits among them, and where the best matches and known sites fall.
        </p>
      </header>

      <div className={`${pad} grid items-end gap-4 pb-6 sm:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)]`}>
        {select('x', 'Across', xKey)}
        <button
          type="button"
          onClick={() => setChosen({ tid: target.id, x: yKey, y: xKey })}
          className="btn btn-ghost !px-0 justify-self-start sm:justify-self-center"
          aria-label="Swap the two axes"
          title="Swap the two axes"
        >
          <ArrowLeftRight size={16} aria-hidden="true" />
        </button>
        {select('y', 'Up', yKey)}
      </div>

      <div className={`${pad} grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_340px]`}>
        <div className="min-w-0">
          <ExploreChart
            earth={earth}
            meta={meta}
            xKey={xKey}
            yKey={yKey}
            stretch={stretch}
            marks={marks.filter(placeable)}
            selected={selected}
            onSelect={setSelected}
            onOpenCell={onOpenCell}
            targetName={shortName}
            describedBy="explore-sentence"
          />

          <p id="explore-sentence" className="mt-5 max-w-[62ch] text-[16px] leading-6 text-text">
            {sentence} <ComputedBadge title="Computed in the browser from the Earth cells and the target value. Not read from a dataset." />
          </p>
          {off.length > 0 && (
            <p className="mt-3 max-w-[62ch] text-[13px] leading-5 text-muted">
              The arrow on the target marks a value beyond Earth&apos;s observed range, so it sits at the edge of the chart. The score compares against the edge value:{' '}
              {off.map((o, i) => (
                <span key={o.key}>
                  {i > 0 && '; '}
                  {noun(o.key, meta)} <span className="num">{formatValue(o.key, o.real, meta)}</span> becomes <span className="num">{formatValue(o.key, o.edge, meta)}</span>
                </span>
              ))}
              .
            </p>
          )}
          {skewShown && (
            <div className="mt-4">
              <MChip on={stretch} onClick={() => setStretch((s) => !s)}>
                Square-root scale on skewed axes
              </MChip>
              <p className="mt-2 max-w-[62ch] text-[12px] leading-4 text-muted">
                On, the axis is stretched near zero so the many low values can be told apart. Tick values stay real.
              </p>
            </div>
          )}

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2" aria-label="Legend">
            <li className="flex items-center gap-2 text-[12px] text-muted">
              <svg width="18" height="18" viewBox="-9 -9 18 18" aria-hidden="true">
                <rect x="-1.5" y="-1.5" width="3" height="3" fill="#A0ACB8" fillOpacity="0.6" />
              </svg>
              Earth cell
            </li>
            {legend.map((l) => (
              <li key={l.kind} className="flex items-center gap-2 text-[12px] text-muted">
                <svg width="20" height="20" viewBox="-10 -10 20 20" aria-hidden="true">
                  <MarkGlyph kind={l.kind} label={l.kind === 'match' ? '1' : undefined} r={l.kind === 'match' ? 0.85 : l.kind === 'target' ? 0.9 : 1} />
                </svg>
                {l.text}
              </li>
            ))}
          </ul>

          {(sx.key === 'lithology' || sy.key === 'lithology') && lithClasses.length > 0 && (
            <p className="num mt-4 max-w-[80ch] text-[12px] leading-5 text-muted">
              Rock classes: {lithClasses.filter((c) => (sx.key === 'lithology' ? sx : sy).codes.includes(c.code)).map((c) => `${c.code} ${c.label}`).join(' · ')}
            </p>
          )}
        </div>

        <aside className="min-w-0 lg:pt-0" aria-label="Selected point">
          <div aria-live="polite" className="min-h-[190px]">
            {readout ? (
              <div>
                <p className="label">{readout.kind}</p>
                <p className="display mt-1 text-[22px] leading-7">{readout.title}</p>
                {(readout.coords || readout.code) && (
                  <p className="num mt-1 text-[12px] text-muted">
                    {readout.coords}
                    {readout.code && (
                      <>
                        {' · '}
                        <span className="code">{readout.code}</span>
                      </>
                    )}
                  </p>
                )}
                <dl className="mt-4">
                  {readout.rows.map((r) => (
                    <div key={r.key} className="border-t border-line py-3">
                      <dt className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
                        <span>{keyLabel(r.key, meta)}</span>
                        {r.badge}
                      </dt>
                      <dd className={`num mt-1 text-[18px] font-medium leading-6 ${r.value === 'no data' ? 'text-muted' : 'text-text'}`}>{r.value}</dd>
                      {r.note && <dd className="mt-1 text-[12px] leading-4 text-muted">{r.note}</dd>}
                    </div>
                  ))}
                </dl>
                {readout.index !== null && (
                  <button type="button" onClick={() => onOpenCell(readout.index as number)} className="btn btn-accent mt-2">
                    Open this cell
                  </button>
                )}
              </div>
            ) : (
              <p className="text-[14px] text-muted">Point at the chart, or use the arrow keys on it, to read a cell.</p>
            )}
          </div>

          <div className="mt-8">
            <p className="label">Marked on this chart</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {targetPlaced ? (
                <PointButton mark={targetMark} on={isOn(targetMark)} onClick={() => setSelected({ type: 'mark', id: targetMark.id })} />
              ) : (
                <p className="text-[13px] leading-5 text-muted">The target has no value on one of these axes and cannot be placed.</p>
              )}
            </div>
            {matchesPlaced.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Top matches">
                {matchesPlaced.map((m) => (
                  <PointButton key={m.id} mark={m} on={isOn(m)} onClick={() => setSelected({ type: 'mark', id: m.id })} />
                ))}
              </div>
            )}
            {matchMarks.length > matchesPlaced.length && (
              <p className="mt-2 text-[12px] text-muted">
                <span className="num">{matchMarks.length - matchesPlaced.length}</span> of {matchMarks.length} matches have no value on these axes.
              </p>
            )}
            {sitesPlaced.length > 0 && (
              <details className="group mt-3 border-t border-line">
                <summary className="label flex min-h-11 cursor-pointer items-center justify-between gap-4 !text-text hover:text-accent">
                  <span>Sites on this chart</span>
                  <span className="num text-muted">{sitesPlaced.length}</span>
                </summary>
                <div className="flex flex-wrap gap-2 pb-4 pt-1" role="group" aria-label="Sites">
                  {sitesPlaced.map((m) => (
                    <PointButton key={m.id} mark={m} on={isOn(m)} onClick={() => setSelected({ type: 'mark', id: m.id })} />
                  ))}
                </div>
              </details>
            )}
            {siteMarks.length > sitesPlaced.length && (
              <p className="mt-2 text-[12px] text-muted">
                <span className="num">{siteMarks.length - sitesPlaced.length}</span> of {siteMarks.length} sites have no value on these axes.
              </p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

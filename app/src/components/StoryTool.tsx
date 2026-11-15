import type { ReactNode } from 'react';
import { ArrowRight, Check, Minus, X } from 'lucide-react';
import type { Badge } from '../types';
import type { StoryPair } from '../lib/storyPairs';
import { VERDICT_WORD, type Verdict } from '../lib/verdict';
import { SourceBadge } from './Badges';

// "Computed by the tool" under a featured pair. It leads with the comparison measured inside the
// site's own footprint (lib/storyPairs.ts siteScale); the all-round score of the whole grid square
// follows in smaller type and is never shown without those rows above it. A pair whose target has no
// measurements shows the Earth site's own measured values instead, each with its source badge.

const ICON: Record<Verdict, ReactNode> = {
  match: <Check size={14} strokeWidth={2.5} aria-hidden="true" />,
  partial: <Minus size={14} strokeWidth={2.5} aria-hidden="true" />,
  miss: <X size={14} strokeWidth={2.5} aria-hidden="true" />,
  none: null,
};
const TONE: Record<Verdict, string> = { match: 'text-text', partial: 'text-text/80', miss: 'text-muted', none: 'text-muted' };

function Mark({ v }: { v: Verdict }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold ${TONE[v]}`}>
      {ICON[v]}
      {VERDICT_WORD[v]}
    </span>
  );
}

const conf = (c: string | null) => (c ? `${c} confidence` : 'confidence not known');

export function StoryTool({
  pair,
  earthName,
  targetName,
  cellKm,
  maxRows,
  onSite,
  wide = false,
}: {
  pair: StoryPair | null;
  earthName: string;
  targetName: string;
  /** Width of the scoring grid square in km, from earth.json meta. */
  cellKm: number;
  maxRows: number;
  onSite: () => void;
  /** Rows in two columns on wide screens (the lead pair). */
  wide?: boolean;
}) {
  const head = <p className="label text-[11px]">Computed by the tool</p>;
  if (!pair) {
    return (
      <div>
        {head}
        <p className="mt-2 text-[14px] leading-[22px] text-muted">No data. The comparison is not computed on this page.</p>
      </div>
    );
  }

  const ss = pair.siteScale;
  if (!ss && !pair.verdict) {
    return (
      <div>
        {head}
        <p className="mt-2 text-[14px] leading-[22px] text-text">The tool has no measurements for this target yet, so it gives no score.</p>
        <p className="mt-3 text-[12px] text-muted">Measured at {earthName}</p>
        {pair.earthOwn.length === 0 ? (
          <p className="mt-1 text-[13px] text-muted">No data.</p>
        ) : (
          <dl className={`mt-1 grid gap-y-1.5 ${wide ? 'sm:grid-cols-2 sm:gap-x-10' : ''}`}>
            {pair.earthOwn.map((o) => (
              <div key={o.label} className="flex flex-wrap items-baseline gap-x-2">
                <dt className="text-[13px] text-muted">{o.label}</dt>
                <dd className="num text-[13px] text-text">{o.text}</dd>
                <dd>
                  <SourceBadge badge={(o.badge as Badge | null) ?? null} />
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    );
  }

  const rows = ss?.rows ?? [];
  if (rows.length === 0) {
    return (
      <div>
        {head}
        <p className="mt-2 text-[14px] leading-[22px] text-muted">No data. No measurements inside the site&rsquo;s footprint against {targetName}.</p>
      </div>
    );
  }
  const shown = rows.slice(0, maxRows);
  const fk = ss?.footprintKm ?? null;
  const v = pair.verdict;
  return (
    <div>
      {head}
      <p className="mt-1 text-[12px] text-muted">
        Measured inside the {fk !== null ? <span className="num">{fk} km</span> : 'site'} footprint, against {targetName}
      </p>
      <ul className={`mt-3 grid gap-y-2.5 ${wide ? 'md:grid-cols-2 md:gap-x-12' : ''}`}>
        {shown.map((r) => (
          <li key={r.label} className="min-w-0">
            <p className="text-[14px] leading-5 text-text">
              <span className="text-muted">{r.label}:</span> Earth <span className="num">{r.earth}</span> against target <span className="num">{r.target}</span>
            </p>
            <Mark v={r.verdict} />
          </li>
        ))}
      </ul>
      {rows.length > shown.length && (
        <button type="button" onClick={onSite} className="link-rule mt-2 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-medium text-text">
          See all {rows.length} on the site page <ArrowRight size={14} aria-hidden="true" />
        </button>
      )}
      <div className="mt-3 space-y-1.5 text-[12px] leading-[18px] text-muted">
        {ss && (
          <p>
            Inside the {fk !== null ? <span className="num">{fk} km</span> : 'site'} footprint:{' '}
            {ss.score !== null ? (
              <>
                <span className="num text-text">{ss.score.toFixed(0)} / 100</span>, {ss.word.toLowerCase()} match, {conf(ss.confidence)}
              </>
            ) : (
              'no data'
            )}
          </p>
        )}
        {v && (
          <p>
            Grid score{' '}
            {v.score !== null ? (
              <>
                <span className="num text-text">{v.score.toFixed(0)} / 100</span>, {v.word.toLowerCase()} match, {conf(v.confidence)}
              </>
            ) : (
              'no data'
            )}
            . This describes the whole <span className="num">{cellKm} km</span> square around the site, not the site itself.
          </p>
        )}
      </div>
    </div>
  );
}

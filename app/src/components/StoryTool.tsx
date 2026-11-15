import { ArrowRight } from 'lucide-react';
import type { Badge } from '../types';
import type { StoryPair } from '../lib/storyPairs';
import { SourceBadge } from './Badges';
import { AnalogProfile } from './AnalogProfile';
import { scoreSentence } from '../lib/profile';

// "Computed by the tool" under a featured pair. It leads with the comparison measured inside the
// site's own footprint (lib/storyPairs.ts siteScale); the all-round score of the whole grid square
// follows in smaller type and is never shown without those rows above it. A pair whose target has no
// measurements shows the Earth site's own measured values instead, each with its source badge.

const conf = (c: string | null) => (c ? `${c} confidence` : 'confidence not known');

export function StoryTool({
  pair,
  earthName,
  targetName,
  cellKm,
  onSite,
  wide = false,
}: {
  pair: StoryPair | null;
  earthName: string;
  targetName: string;
  /** Width of the scoring grid square in km, from earth.json meta. */
  cellKm: number;
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
  if (rows.length === 0 || !ss) {
    return (
      <div>
        {head}
        <p className="mt-2 text-[14px] leading-[22px] text-muted">No data. No measurements inside the site&rsquo;s footprint against {targetName}.</p>
      </div>
    );
  }
  const fk = ss.footprintKm;
  const v = pair.verdict;
  return (
    <div>
      {head}
      <p className="mt-1 text-[12px] text-muted">
        Measured inside the {fk !== null ? <span className="num">{fk} km</span> : 'site'} footprint, against {targetName}
      </p>
      {pair.afterFreeze && <p className="mt-1 text-[12px] text-muted">This target was added after the freeze of 2026-11-14. It is in no validation number.</p>}
      <div className="mt-3">
        <AnalogProfile profile={ss.profile} compact wide={wide} />
      </div>
      <button type="button" onClick={onSite} className="link-rule mt-2 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-medium text-text">
        Every value on the site page <ArrowRight size={14} aria-hidden="true" />
      </button>
      <div className="mt-2 space-y-1.5 text-[12px] leading-[18px] text-muted">
        <p>
          {scoreSentence(ss.score, ss.profile.dims)} {conf(ss.confidence)}.
        </p>
        {v && v.score !== null && (
          <p>
            The <span className="num">{cellKm} km</span> square around the site reads <span className="num text-text">{v.score.toFixed(0)} / 100</span>. That describes the square, not the site.
          </p>
        )}
      </div>
    </div>
  );
}

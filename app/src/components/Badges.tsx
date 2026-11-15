import type { Badge, Confidence } from '../types';

/** Source badge. Every data value in the UI carries one. */
export function SourceBadge({ badge, source }: { badge: Badge | null; source?: string | null }) {
  if (!badge) return null;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] leading-[18px] text-muted" title={source ? `${badge}: ${source}` : badge}>
      <span aria-hidden="true" className={`block h-1.5 w-1.5 ${badge === 'Measured' ? 'rounded-full bg-muted' : badge === 'Mission' ? 'rounded-full border border-muted' : 'border border-muted bg-muted'}`} />
      {badge}
    </span>
  );
}

/** For the one value computed in the browser from latitude rather than read from a data file. */
export function ComputedBadge({ title = 'Computed in the browser from latitude. Not read from a dataset.' }: { title?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] leading-[18px] text-muted" title={title}>
      <span aria-hidden="true" className="block h-1.5 w-1.5 rounded-full border border-dashed border-muted" />
      Computed
    </span>
  );
}

const LEVEL: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };

/** Confidence badge: three pips plus the word. Neutral colour, since green and red mean readiness. */
export function ConfidenceBadge({ confidence, coverage }: { confidence: Confidence | null; coverage?: number }) {
  if (!confidence) {
    return <span className="text-[12px] leading-[18px] text-muted">No data</span>;
  }
  const n = LEVEL[confidence];
  const title =
    coverage === undefined
      ? `Confidence ${confidence}`
      : `Confidence ${confidence}: factors with data cover ${(coverage * 100).toFixed(0)}% of the mission weight`;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium leading-4 text-muted" title={title}>
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`block h-2 w-1 ${i <= n ? 'bg-text' : 'bg-line'}`} />
        ))}
      </span>
      <span className={confidence === 'low' ? 'text-muted' : 'text-text'}>{confidence}</span>
    </span>
  );
}

export function Tag({ children, title, tone = 'muted' }: { children: React.ReactNode; title?: string; tone?: 'muted' | 'accent' }) {
  return (
    <span title={title} className={`inline-block text-[13px] leading-[18px] ${tone === 'accent' ? 'font-semibold text-accent' : 'text-muted'}`}>
      {children}
    </span>
  );
}

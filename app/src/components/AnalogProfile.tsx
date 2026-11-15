import { Check, Minus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Profile } from '../lib/profile';
import { short } from '../lib/profile';
import { VERDICT_WORD, type Verdict } from '../lib/verdict';

const ICON: Record<Verdict, ReactNode> = {
  match: <Check size={14} strokeWidth={2.5} aria-hidden="true" />,
  partial: <Minus size={14} strokeWidth={2.5} aria-hidden="true" />,
  miss: <X size={14} strokeWidth={2.5} aria-hidden="true" />,
  none: <Minus size={14} strokeWidth={2.5} aria-hidden="true" />,
};

const TONE: Record<Verdict, string> = { match: 'text-text', partial: 'text-text', miss: 'text-muted', none: 'text-muted' };

/**
 * The analog profile: one line per dimension with the verdict and both values, then the one-sentence verdict.
 * `compact` shows the first value pair of each dimension, for cards; otherwise every pair is shown.
 */
export function AnalogProfile({ profile, compact = false, wide = false, showLine = true }: { profile: Profile; compact?: boolean; wide?: boolean; showLine?: boolean }) {
  return (
    <div>
      <ul className={`grid gap-y-2.5 ${wide ? 'md:grid-cols-2 md:gap-x-12' : ''}`}>
        {profile.dims.map((d) => {
          const rows = compact ? d.rows.slice(0, 1) : d.rows;
          return (
            <li key={d.id} className="min-w-0">
              <p className="flex items-baseline gap-2 text-[14px] leading-5">
                <span className={`inline-flex translate-y-[2px] items-center ${TONE[d.verdict]}`}>{ICON[d.verdict]}</span>
                <span className="font-medium text-text">{d.label}</span>
                <span className={`text-[13px] ${TONE[d.verdict]}`}>{VERDICT_WORD[d.verdict]}</span>
              </p>
              {rows.length === 0 ? (
                <p className="ml-[22px] text-[13px] leading-5 text-muted">No value on one side.</p>
              ) : (
                rows.map((r) => (
                  <p key={r.label} className="ml-[22px] text-[13px] leading-5 text-muted">
                    {r.label}: Earth <span className="num text-text">{short(r.earth)}</span>, target <span className="num text-text">{short(r.target)}</span>
                  </p>
                ))
              )}
            </li>
          );
        })}
      </ul>
      {showLine && <p className="mt-3 text-[15px] font-medium leading-6 text-text">{profile.line}</p>}
    </div>
  );
}

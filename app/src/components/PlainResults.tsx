import { Check, Minus, X } from 'lucide-react';
import type { MatchRecord } from '../lib/matchAdapter';
import { STATUS_WORD, plainResults, type Capability, type CapabilityId, type PurposeStatus } from '../lib/plainResults';
import { ActivityArt } from './ActivityArt';
import { ElementIcon, type ElementId } from './ElementIcon';
import { Reveal } from './HomeStory';
import { ComputedBadge } from './Badges';

const ICON: Record<PurposeStatus, React.ReactNode> = {
  ready: <Check size={13} strokeWidth={2.5} aria-hidden="true" />,
  partial: <Minus size={13} strokeWidth={2.5} aria-hidden="true" />,
  'not-suited': <X size={13} strokeWidth={2.5} aria-hidden="true" />,
  'no-data': null,
  'not-assessed': null,
};
// Weight and the word carry the status as well as the icon.
const CHIP: Record<PurposeStatus, string> = {
  ready: 'text-accent',
  partial: 'text-text/80',
  'not-suited': 'text-muted',
  'no-data': 'text-muted',
  'not-assessed': 'text-muted',
};

/** One small drawing per kind of work, from the existing element icons and activity line art. */
function CapabilityIcon({ id }: { id: CapabilityId }) {
  const el: Partial<Record<CapabilityId, ElementId>> = { landing: 'terrain', navigation: 'sunlight', robotics: 'dust', construction: 'geology', resources: 'ice' };
  const e = el[id];
  if (e) return <ElementIcon id={e} size={34} still className="text-text" />;
  return <ActivityArt kind={id === 'mobility' ? 'rover' : 'base'} className="h-9 w-auto text-text" />;
}

function CapabilityCard({ c }: { c: Capability }) {
  const dim = c.status === 'not-assessed';
  return (
    <li className={`pt-3 ${dim ? 'border-t-2 border-dashed border-line' : `border-t-2 ${c.status === 'ready' ? 'border-accent' : 'border-line'}`}`}>
      <div className="flex items-start justify-between gap-3">
        <span className={dim ? 'opacity-50' : ''}>
          <CapabilityIcon id={c.id} />
        </span>
        <span className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold ${CHIP[c.status]}`}>
          {ICON[c.status]}
          {STATUS_WORD[c.status]}
        </span>
      </div>
      <h4 className="mt-3 text-[16px] font-semibold leading-6 text-text">{c.label}</h4>
      <p className="mt-1 text-[13px] leading-5 text-muted">{c.reason}</p>
      {c.basis && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[12px] leading-5 text-muted">
          <span>
            {c.score !== null ? `${c.score.toFixed(0)} / 100, rated` : 'Rated'} from {c.basis}
          </span>
          <ComputedBadge title="Computed in the browser from the match record's dimension similarities, by the fixed rules in lib/plainResults.ts." />
        </p>
      )}
    </li>
  );
}

/** The result in plain words, by fixed rules (lib/plainResults.ts): verdict sentence, good for, not for, tags and what could be tested. */
export function PlainResults({ record, score, placeName }: { record: MatchRecord; score: number | null; placeName: string }) {
  const r = plainResults(record, score, placeName);
  return (
    <section className="border-t border-line" aria-labelledby="h-plain">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-10 sm:px-10">
        <Reveal>
          <h3 id="h-plain" className="sr-only">
            The result in plain words
          </h3>
          <p className="display max-w-[40ch] text-[22px] leading-[30px] text-text sm:text-[32px] sm:leading-[40px]">{r.headline}</p>
          <dl className="mt-6 grid max-w-[900px] gap-x-10 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="label">Good for</dt>
              <dd className="mt-1 text-[15px] leading-6 text-text">{r.goodFor.length > 0 ? r.goodFor.join(', ') : 'Nothing matches closely enough to count.'}</dd>
            </div>
            <div>
              <dt className="label">Not for</dt>
              <dd className="mt-1 text-[15px] leading-6 text-text">{r.notFor.length > 0 ? r.notFor.join(', ') : 'No dimension fails outright.'}</dd>
            </div>
          </dl>
          {r.tags.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1" aria-label="Testing tags">
              {r.tags.map((t) => (
                <li key={t.label} className={`text-[14px] ${t.verdict === 'match' ? 'font-semibold text-text' : 'text-muted'}`}>
                  {t.label}
                  {t.verdict === 'partial' ? ', partly' : ''}
                </li>
              ))}
            </ul>
          )}
        </Reveal>

        <Reveal className="mt-12">
          <h3 className="display text-[24px] leading-8 text-text">What could be tested here</h3>
          <p className="mt-1 max-w-[60ch] text-[14px] leading-[22px] text-muted">One card for each of seven kinds of work, rated by fixed rules from how well this place matches the target. Where our data cannot judge, the card says Not assessed and why.</p>
          <ul className="mt-6 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {r.capabilities.map((c) => (
              <CapabilityCard key={c.id} c={c} />
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

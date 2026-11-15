import { Check, Minus, X } from 'lucide-react';
import type { MatchRecord } from '../lib/matchAdapter';
import { STATUS_WORD, plainResults, type PlainPurpose, type PurposeStatus } from '../lib/plainResults';
import { activityOf, ActivityArt } from './ActivityArt';
import { ElementIcon, type ElementId } from './ElementIcon';
import { Reveal } from './HomeStory';
import { ComputedBadge } from './Badges';

const ICON: Record<PurposeStatus, React.ReactNode> = {
  ready: <Check size={13} strokeWidth={2.5} aria-hidden="true" />,
  partial: <Minus size={13} strokeWidth={2.5} aria-hidden="true" />,
  'not-suited': <X size={13} strokeWidth={2.5} aria-hidden="true" />,
  'no-data': null,
};
// Solid, outlined, hollow: shape and weight carry the status as well as the word.
const CHIP: Record<PurposeStatus, string> = {
  ready: 'bg-text text-bg border-text',
  partial: 'text-text border-text',
  'not-suited': 'text-muted border-muted',
  'no-data': 'text-muted border-line border-dashed',
};

/** Icon per purpose: an element drawing where one fits, else the activity line art. */
function PurposeIcon({ id }: { id: string }) {
  const el: Partial<Record<string, ElementId>> = { geology: 'geology', ice: 'ice' };
  const e = el[id];
  return e ? <ElementIcon id={e} size={34} still className="text-text" /> : <ActivityArt kind={activityOf(null, id)} className="h-9 w-auto text-text" />;
}

function PurposeCard({ p }: { p: PlainPurpose }) {
  return (
    <li className={`border-t-2 pt-3 ${p.status === 'ready' ? 'border-accent' : 'border-line'}`}>
      <div className="flex items-start justify-between gap-3">
        <PurposeIcon id={p.id} />
        <span className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap border px-2 text-[12px] font-semibold ${CHIP[p.status]}`}>
          {ICON[p.status]}
          {STATUS_WORD[p.status]}
        </span>
      </div>
      <h4 className="mt-3 text-[16px] font-semibold leading-6 text-text">{p.label}</h4>
      <p className="mt-1 text-[13px] leading-5 text-muted">{p.why}</p>
      {p.heldBack.length > 0 && p.status !== 'no-data' && <p className="mt-2 text-[13px] leading-5 text-text">Held back by {p.heldBack.join(', ')}.</p>}
      <p className="num mt-2 flex items-center gap-2 text-[12px] text-muted">
        {p.score === null ? 'no data' : `${p.score.toFixed(0)} / 100`}
        {p.score !== null && <ComputedBadge title="Computed in the browser by the scoring library." />}
      </p>
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
            <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Testing tags">
              {r.tags.map((t) => (
                <li key={t.label} className={`border px-2 py-0.5 text-[12px] font-semibold ${t.verdict === 'match' ? 'border-text bg-text text-bg' : 'border-text text-text'}`}>
                  {t.label}
                  {t.verdict === 'partial' ? ', partly' : ''}
                </li>
              ))}
            </ul>
          )}
        </Reveal>

        <Reveal className="mt-12">
          <h3 className="display text-[24px] leading-8 text-text">What could be tested here</h3>
          <p className="mt-1 max-w-[60ch] text-[14px] leading-[22px] text-muted">One card for each kind of work, marked by the match score for that work.</p>
          <ul className="mt-6 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {r.purposes.map((p) => (
              <PurposeCard key={p.id} p={p} />
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

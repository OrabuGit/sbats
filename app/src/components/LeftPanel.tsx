import { useState } from 'react';
import { Search } from 'lucide-react';
import { flags } from '../flags';
import { FACTOR_IDS, FACTOR_KEYS, type FactorId, type Preset, type Target, type Weights } from '../types';
import { DIMENSIONS, FACTOR_LABELS, PURPOSES, type PurposeId } from '../lib/scoringAdapter';
import { formatLat, formatLon } from '../lib/geo';
import { formatValue, keyLabel, type MetaByKey } from '../lib/format';
import { SourceBadge } from './Badges';

interface Props {
  targets: Target[];
  targetId: string;
  onTarget: (id: string) => void;
  presets: Preset[];
  presetId: string | null;
  onPreset: (id: string) => void;
  weights: Weights;
  onWeight: (id: FactorId, value: number) => void;
  meta: MetaByKey;
  /** "all" ranks by the all-round score, "purpose" by what a site would be used for. */
  mode: MatchMode;
  onMode: (m: MatchMode) => void;
  purposeId: PurposeId;
  onPurpose: (id: PurposeId) => void;
  /** 2: pick a place (list, search, optional purpose). 3: the chosen place, ranking and weights. */
  step: 2 | 3;
  onChangePlace: () => void;
}

export type MatchMode = 'all' | 'purpose';
const MODES: { id: MatchMode; label: string }[] = [
  { id: 'all', label: 'All-round match' },
  { id: 'purpose', label: 'Match by purpose' },
];

const dimensionLabel = (id: string) => DIMENSIONS.find((d) => d.id === id)?.label ?? id;

const BODY_LABEL = { moon: 'Moon', mars: 'Mars' } as const;

export function LeftPanel({ targets, targetId, onTarget, presets, presetId, onPreset, weights, onWeight, meta, mode, onMode, purposeId, onPurpose, step, onChangePlace }: Props) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const listed = targets.filter((t) => t.body === targets.find((x) => x.id === targetId)?.body && (q === '' || t.name.toLowerCase().includes(q)));
  const target = targets.find((t) => t.id === targetId) ?? targets[0];
  const total = FACTOR_IDS.reduce((a, id) => a + weights[id], 0) || 1;
  const unpublished = FACTOR_KEYS.filter((k) => target.values[k]?.value === null || target.values[k]?.value === undefined);
  const activePreset = presets.find((p) => p.id === presetId);
  const purpose = PURPOSES.find((p) => p.id === purposeId) ?? PURPOSES[0];

  return (
    <div className="flex flex-col">
      {step === 2 ? (
        <section className="border-b border-line" aria-labelledby="h-target">
          <h2 id="h-target" className="label px-4 pb-2 pt-4">
            02 Place on {BODY_LABEL[target.body] === 'Moon' ? 'the Moon' : 'Mars'}
          </h2>
          <label className="flex items-center gap-2 border-y border-line bg-bg px-4">
            <Search size={14} className="shrink-0 text-muted" aria-hidden="true" />
            <span className="sr-only">Search places</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search places"
              className="h-11 min-w-0 flex-1 bg-transparent text-[14px] text-text placeholder:text-muted focus:outline-none"
            />
            <span className="num text-[11px] text-muted">
              {listed.length} of {targets.filter((t) => t.body === target.body).length}
            </span>
          </label>
          <fieldset>
            <legend className="sr-only">Known base sites</legend>
            {listed.map((t) => {
              const on = t.id === target.id;
              return (
                <label key={t.id} className={`row last:border-b-0 ${on ? 'row-on' : ''}`}>
                  <input type="radio" name="target" value={t.id} checked={on} onChange={() => onTarget(t.id)} className="sr-only" />
                  <span className={`flex-1 text-[14px] ${on ? 'font-medium' : ''}`}>{t.name}</span>
                  <span className="num text-[11px] text-muted">
                    {formatLat(t.lat, 1)} {formatLon(t.lon, 1)}
                  </span>
                </label>
              );
            })}
            {listed.length === 0 && <p className="px-4 py-3 text-[13px] text-muted">No place matches "{query}".</p>}
          </fieldset>
          <p className="border-t border-line px-4 py-3 text-[12px] text-muted">
            {flags.anyPoint
              ? 'Or click any point on the globe.'
              : 'Only listed places can be picked. Measured values for an arbitrary point are not in the data yet.'}
          </p>
        </section>
      ) : (
        <section className="flex items-center justify-between gap-3 border-b border-line py-2 pl-4 pr-2" aria-labelledby="h-target">
          <div className="min-w-0">
            <h2 id="h-target" className="label">
              Place
            </h2>
            <p className="text-[14px] font-medium text-text">{target.name}</p>
          </div>
          <button type="button" onClick={onChangePlace} className="tool">
            Change
          </button>
        </section>
      )}

      <section className="border-b border-line p-4" aria-label={`${target.name}: values`}>
        <p className="text-[13px] leading-5 text-text">{target.summary}</p>
        <dl className="kv mt-3">
          {FACTOR_KEYS.map((k) => {
            const v = target.values[k];
            const none = v?.value === null || v?.value === undefined;
            return (
              <div key={k}>
                <dt>{keyLabel(k, meta)}</dt>
                <dd className="flex items-baseline justify-end gap-2">
                  <span className={none ? '!text-muted' : ''}>{formatValue(k, v?.value ?? null, meta)}</span>
                  <SourceBadge badge={v?.badge ?? null} source={v?.source} />
                </dd>
              </div>
            );
          })}
        </dl>
        {unpublished.length > 0 && (
          <p className="mt-3 text-[12px] text-muted" role="note">
            No published value for {unpublished.map((k) => keyLabel(k, meta).toLowerCase()).join(', ')}. Left out of every score for this target,
            which lowers confidence.
          </p>
        )}
      </section>

      <section className="border-b border-line" aria-labelledby="h-mode">
        <h2 id="h-mode" className="label px-4 pb-1 pt-4">
          {step === 2 ? 'Purpose, optional' : 'Ranking'}
        </h2>
        <div className="tabs tabs-fill px-4" role="group" aria-label="Ranking">
          {MODES.map((m) => (
            <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => onMode(m.id)} className="tab">
              {m.label}
            </button>
          ))}
        </div>
        <p className="px-4 py-3 text-[12px] text-muted">
          {mode === 'all'
            ? 'All six factors, weighted. One factor near 0 pulls the score near 0.'
            : 'Only the factors the selected purpose depends on, at their Base weights.'}
        </p>
      </section>

      {mode === 'purpose' && (
        <section aria-labelledby="h-purpose" id="purpose-section">
          <fieldset className="border-b border-line">
            <legend id="h-purpose" className="label px-4 pb-2 pt-4">
              Purpose
            </legend>
            <div className="border-t border-line">
              {PURPOSES.map((p) => {
                const on = p.id === purpose.id;
                return (
                  <label key={p.id} className={`row last:border-b-0 ${on ? 'row-on' : ''}`}>
                    <input type="radio" name="purpose" value={p.id} checked={on} onChange={() => onPurpose(p.id)} className="sr-only" />
                    <span className="flex-1">
                      <span className={`block text-[14px] ${on ? 'font-medium' : ''}`}>{p.label}</span>
                      <span className="num block text-[10px] uppercase tracking-wider text-muted">{p.dimensions.map(dimensionLabel).join(' · ')}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="p-4">
            <p className="text-[13px] leading-5 text-text">{purpose.why}</p>
            <dl className="kv mt-3">
              {FACTOR_IDS.map((id) => (
                <div key={id}>
                  <dt className={weights[id] > 0 ? '!text-text' : ''}>{FACTOR_LABELS[id]}</dt>
                  <dd className={weights[id] > 0 ? '' : '!text-muted'}>{weights[id] > 0 ? (weights[id] / total).toFixed(2) : 'not used'}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[12px] text-muted">
              A purpose score is the match score with only these factors, at their frozen Base weights. The purposes were defined after the
              validation results were known, so these rankings are a second view and not evidence.
            </p>
          </div>
        </section>
      )}

      {mode === 'all' && step === 3 && (
        <section className="p-4" aria-labelledby="h-weights">
          <div className="flex items-baseline justify-between">
            <h2 id="h-weights" className="label">
              Weights
            </h2>
            <span className="num text-[10px] uppercase tracking-wider text-muted">{presetId === null ? 'custom' : 'shares of 1'}</span>
          </div>
          <div className="tabs tabs-fill mt-1" role="group" aria-label="Mission preset">
            {presets.map((p) => (
              <button key={p.id} type="button" aria-pressed={p.id === presetId} onClick={() => onPreset(p.id)} className="tab">
                {p.label}
              </button>
            ))}
          </div>
          <p className="mb-2 mt-3 min-h-8 text-[12px] text-muted">
            {activePreset?.description ?? 'Custom weights. Pick a preset to reset them.'} A preset changes the weights only.
          </p>
          {FACTOR_IDS.map((id) => {
            const share = weights[id] / total;
            return (
              <div key={id} className="grid grid-cols-[1fr_auto] items-center gap-x-3">
                <label htmlFor={`w-${id}`} className="text-[13px] text-text">
                  {FACTOR_LABELS[id]}
                </label>
                <output htmlFor={`w-${id}`} className="num text-[13px] text-text">
                  {share.toFixed(2)}
                </output>
                <input
                  id={`w-${id}`}
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(weights[id] * 100)}
                  onChange={(e) => onWeight(id, Number(e.target.value) / 100)}
                  aria-valuetext={`${share.toFixed(2)} of total weight`}
                  className="slider col-span-2 -mt-2"
                />
              </div>
            );
          })}
          <p className="text-[12px] text-muted">Gravity, vacuum and radiation are never scored.</p>
        </section>
      )}
    </div>
  );
}

import { RotateCcw } from 'lucide-react';
import { FACTOR_IDS, FACTOR_KEYS, type FactorId, type Preset, type Target, type Weights } from '../types';
import { FACTOR_LABELS } from '../lib/scoringAdapter';
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
}

const BODY_LABEL = { moon: 'Moon', mars: 'Mars' } as const;

export function LeftPanel({ targets, targetId, onTarget, presets, presetId, onPreset, weights, onWeight, meta }: Props) {
  const target = targets.find((t) => t.id === targetId) ?? targets[0];
  const total = FACTOR_IDS.reduce((a, id) => a + weights[id], 0) || 1;
  const unpublished = FACTOR_KEYS.filter((k) => target.values[k]?.value === null || target.values[k]?.value === undefined);
  const activePreset = presets.find((p) => p.id === presetId);

  return (
    <div className="flex flex-col">
      <section className="border-b border-line p-4" aria-labelledby="h-target">
        <h2 id="h-target" className="label mb-3">
          01 Target site
        </h2>
        {(['moon', 'mars'] as const).map((body) => {
          const group = targets.filter((t) => t.body === body);
          if (group.length === 0) return null;
          return (
            <fieldset key={body} className="mb-3 last:mb-0">
              <legend className="label mb-1 text-[10px]">{BODY_LABEL[body]}</legend>
              <div className="border border-line">
                {group.map((t) => {
                  const on = t.id === target.id;
                  return (
                    <label
                      key={t.id}
                      className={`flex min-h-11 cursor-pointer items-center gap-3 border-b border-line px-3 last:border-b-0 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-accent ${
                        on ? 'bg-bg text-accent' : 'text-text hover:bg-bg'
                      }`}
                    >
                      <input type="radio" name="target" value={t.id} checked={on} onChange={() => onTarget(t.id)} className="sr-only" />
                      <span className={`block h-2.5 w-2.5 shrink-0 border ${on ? 'border-accent bg-accent' : 'border-muted'}`} aria-hidden="true" />
                      <span className="flex-1 text-[14px] font-medium">{t.name}</span>
                      <span className="num text-[11px] text-muted">
                        {formatLat(t.lat, 1)} {formatLon(t.lon, 1)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        <div className="mt-3 border border-line bg-bg p-3">
          <p className="text-[13px] text-text">{target.summary}</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            {FACTOR_KEYS.map((k) => {
              const v = target.values[k];
              return (
                <div key={k} className="col-span-2 grid grid-cols-subgrid items-baseline">
                  <dt className="text-[12px] text-muted">{keyLabel(k, meta)}</dt>
                  <dd className="flex flex-wrap items-baseline justify-end gap-x-2 text-right">
                    <span className={`num text-[12px] ${v?.value === null || v?.value === undefined ? 'text-muted' : 'text-text'}`}>
                      {formatValue(k, v?.value ?? null, meta)}
                    </span>
                    <SourceBadge badge={v?.badge ?? null} source={v?.source} />
                  </dd>
                </div>
              );
            })}
          </dl>
          {unpublished.length > 0 && (
            <p className="mt-3 border-t border-line pt-3 text-[12px] text-text" role="note">
              <span className="label mr-1 text-[10px]">No published value:</span>
              {unpublished.map((k) => keyLabel(k, meta).toLowerCase()).join(', ')}. {unpublished.length > 1 ? 'These are' : 'This is'} left out of
              every score for this target, which lowers confidence.
            </p>
          )}
        </div>
      </section>

      <section className="border-b border-line p-4" aria-labelledby="h-mission">
        <h2 id="h-mission" className="label mb-3">
          Mission preset
        </h2>
        <div className="grid grid-cols-2 gap-px border border-line bg-line">
          {presets.map((p) => {
            const on = p.id === presetId;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => onPreset(p.id)}
                className={`min-h-11 px-3 text-left text-[13px] font-medium ${on ? 'bg-accent text-bg' : 'bg-panel text-text hover:bg-bg'}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[12px] text-muted">
          {activePreset?.description ? `${activePreset.description} ` : ''}Presets change the weights only. The formula stays the same.
        </p>
      </section>

      <section className="p-4" aria-labelledby="h-weights">
        <div className="mb-1 flex min-h-11 items-center justify-between">
          <h2 id="h-weights" className="label">
            Weights {presetId === null && <span className="text-accent">· custom</span>}
          </h2>
          {presetId === null && (
            <button
              type="button"
              onClick={() => onPreset(presets[0].id)}
              className="label flex min-h-11 items-center gap-1.5 px-2 text-text hover:text-accent"
            >
              <RotateCcw size={12} aria-hidden="true" /> Reset
            </button>
          )}
        </div>
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
        <p className="text-[12px] text-muted">
          Shown as shares of 1. Gravity, vacuum and radiation are never part of the score.
        </p>
      </section>
    </div>
  );
}

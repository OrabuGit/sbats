import { useState } from 'react';
import { FACTORS, MEDIUM_CONFIDENCE_COVERAGE, MIN_COVERAGE, PRESETS, REQUIRED_KEYS, KEY_INFO } from '../lib/scoringAdapter';
import type { Confidence } from '../types';
import { ConfidenceBadge } from './Badges';
import { MChip, pct } from './MethodParts';

const base = PRESETS[0];
// Weight of each measurement: a factor's weight split equally between its measurements.
const KEYS = FACTORS.flatMap((f) => f.keys.map((k) => ({ key: k as string, factor: f.label, weight: base.weights[f.id] / f.keys.length })));

/** Switch measurements off and watch the coverage and confidence change. Uses the Base weights and the library's own limits. */
export function MethodCoverage() {
  const [off, setOff] = useState<Set<string>>(new Set(['roughness']));
  const toggle = (k: string) =>
    setOff((o) => {
      const n = new Set(o);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const total = KEYS.reduce((a, k) => a + k.weight, 0);
  const have = KEYS.filter((k) => !off.has(k.key)).reduce((a, k) => a + k.weight, 0);
  const coverage = Math.round((have / total) * 1e9) / 1e9;
  const missingRequired = REQUIRED_KEYS.filter((k) => off.has(k));
  const confidence: Confidence | null =
    missingRequired.length > 0 || coverage < MIN_COVERAGE ? null : coverage === 1 ? 'high' : coverage >= MEDIUM_CONFIDENCE_COVERAGE ? 'medium' : 'low';

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
      <div>
        <p className="label">Base weights, one segment per measurement</p>
        <div className="mt-3 flex h-6 gap-[2px]" aria-hidden="true">
          {KEYS.map((k) => (
            <div key={k.key} className={off.has(k.key) ? 'border border-dashed border-muted' : 'bg-accent'} style={{ flexGrow: k.weight, flexBasis: 0 }} />
          ))}
        </div>

        <p className="label mt-8">Coverage and what it means</p>
        <div className="relative mt-3" aria-hidden="true">
          <div className="flex h-[6px] gap-[2px]">
            <div className="bg-line" style={{ flexGrow: MIN_COVERAGE, flexBasis: 0 }} />
            <div className="bg-muted" style={{ flexGrow: MEDIUM_CONFIDENCE_COVERAGE - MIN_COVERAGE, flexBasis: 0 }} />
            <div className="bg-text" style={{ flexGrow: 1 - MEDIUM_CONFIDENCE_COVERAGE, flexBasis: 0 }} />
          </div>
          <div className="absolute -top-2 h-[22px] w-[2px] bg-accent" style={{ left: `${coverage * 100}%`, transform: 'translateX(-1px)' }} />
        </div>
        <div className="relative mt-3 h-5 text-[12px] text-text" aria-hidden="true">
          <span className="absolute" style={{ left: `${(MIN_COVERAGE / 2) * 100}%`, transform: 'translateX(-50%)' }}>
            no score
          </span>
          <span className="absolute" style={{ left: `${((MIN_COVERAGE + MEDIUM_CONFIDENCE_COVERAGE) / 2) * 100}%`, transform: 'translateX(-50%)' }}>
            low
          </span>
          <span className="absolute right-0">medium</span>
        </div>
        <div className="num relative h-5 text-[12px] text-muted" aria-hidden="true">
          <span className="absolute left-0">0%</span>
          <span className="absolute" style={{ left: `${MIN_COVERAGE * 100}%`, transform: 'translateX(-50%)' }}>
            {pct(MIN_COVERAGE)}
          </span>
          <span className="absolute" style={{ left: `${MEDIUM_CONFIDENCE_COVERAGE * 100}%`, transform: 'translateX(-50%)' }}>
            {pct(MEDIUM_CONFIDENCE_COVERAGE)}
          </span>
          <span className="absolute right-0">100%</span>
        </div>
        <p className="mt-1 text-[13px] text-muted">High confidence means every measurement had data: exactly 100%.</p>

        <p className="label mt-6">Switch a measurement off</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {KEYS.map((k) => (
            <MChip key={k.key} on={!off.has(k.key)} onClick={() => toggle(k.key)}>
              <span className="block">{KEY_INFO[k.key as keyof typeof KEY_INFO]?.label ?? k.key}</span>
              <span className="num block text-[11px] text-muted">
                {(k.weight * 100).toFixed(1).replace(/\.0$/, '')}%{(REQUIRED_KEYS as readonly string[]).includes(k.key) ? ' · required' : ''}
              </span>
            </MChip>
          ))}
        </div>
      </div>

      <div>
        <p className="label">Coverage</p>
        <p className="num mt-1 text-[64px] font-medium leading-[64px] text-accent">{pct(coverage)}</p>
        <div className="mt-4 min-h-6">
          {confidence ? (
            <ConfidenceBadge confidence={confidence} coverage={coverage} />
          ) : (
            <p className="text-[14px] font-medium text-text">No score</p>
          )}
        </div>
        <p className="mt-3 text-[13px] leading-5 text-muted">
          {missingRequired.length > 0
            ? 'Bare ground and Dryness are required: they carry the veto. A cell without both has no score.'
            : coverage < MIN_COVERAGE
              ? `Below ${pct(MIN_COVERAGE)} the cell has no score and shows as "no data" with the reason.`
              : 'The other weights are scaled up to fill the gap. Low confidence is left out of the candidates list unless you ask for it.'}
        </p>
      </div>
    </div>
  );
}

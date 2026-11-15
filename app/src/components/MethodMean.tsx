import { useMemo, useState } from 'react';
import { FACTORS, PRESETS } from '../lib/scoringAdapter';
import { weightedGeometricMean } from '../lib/scoringAdapter';
import type { FactorId } from '../types';
import { MChip, pct, s2 } from './MethodParts';

type Sims = Record<FactorId, number>;

// Illustration values chosen to show the veto: they are not data and not any real cell.
const EXAMPLE: Sims = { terrain: 0.9, bareGround: 0.9, dryness: 0.05, temperature: 0.9, sunlight: 0.9, rockType: 0.9 };

/** Weighted geometric mean against the plain weighted average, with the real library function. One bad factor drags the whole score. */
export function MethodMean() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [sims, setSims] = useState<Sims>(EXAMPLE);
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];

  const { geo, avg, low } = useMemo(() => {
    const entries = FACTORS.map((f) => ({ similarity: sims[f.id], weight: preset.weights[f.id] }));
    const geo = weightedGeometricMean(entries);
    const avg = (100 * entries.reduce((a, e) => a + e.similarity * e.weight, 0)) / entries.reduce((a, e) => a + e.weight, 0);
    const low = FACTORS.reduce((a, f) => (sims[f.id] < sims[a.id] ? f : a), FACTORS[0]);
    return { geo, avg, low };
  }, [sims, presetId]);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
      <div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Mission preset for the weights">
          <span className="label mr-1">Weights of</span>
          {PRESETS.map((p) => (
            <MChip key={p.id} on={p.id === presetId} onClick={() => setPresetId(p.id)}>
              {p.label}
            </MChip>
          ))}
          <button type="button" onClick={() => setSims(EXAMPLE)} className="ml-auto min-h-11 px-2 text-[13px] text-muted underline decoration-line underline-offset-2 hover:text-accent">
            Reset the example
          </button>
        </div>
        <ul className="mt-4">
          {FACTORS.map((f) => {
            const v = sims[f.id];
            return (
              <li key={f.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 sm:grid-cols-[150px_minmax(0,1fr)_44px] sm:gap-x-5">
                <div className="min-w-0">
                  <label htmlFor={`m-sim-${f.id}`} className="block text-[14px] font-medium text-text">
                    {f.label}
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-[3px] w-16 bg-line" aria-hidden="true">
                      <div className="h-full bg-muted" style={{ width: `${(preset.weights[f.id] / 0.4) * 100}%` }} />
                    </div>
                    <span className="num text-[12px] text-muted">weight {pct(preset.weights[f.id])}</span>
                  </div>
                </div>
                <span className="num text-right text-[15px] text-text sm:order-3">{s2(v)}</span>
                <div className="relative col-span-2 sm:col-span-1 sm:order-2">
                  <div className="pointer-events-none absolute left-0 top-1/2 h-[2px] -translate-y-1/2 bg-accent" style={{ width: `calc(5px + (100% - 10px) * ${v})` }} aria-hidden="true" />
                  <input
                    id={`m-sim-${f.id}`}
                    type="range"
                    className="slider relative"
                    min={0}
                    max={1}
                    step={0.01}
                    value={v}
                    onChange={(e) => setSims((s) => ({ ...s, [f.id]: Number(e.target.value) }))}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <p className="label">Match score, weighted geometric mean</p>
        <p className="num mt-1 text-[64px] font-medium leading-[64px] text-accent">{geo.toFixed(0)}</p>
        <Track value={geo} accent />
        <p className="label mt-6">A plain weighted average would give</p>
        <p className="num mt-1 text-[32px] font-medium leading-9 text-muted">{avg.toFixed(0)}</p>
        <Track value={avg} />
        <p className="mt-5 text-[13px] leading-5 text-muted">
          Drag one factor down. The average falls a little, the score falls far more, because {low.label.toLowerCase()} is at{' '}
          <span className="num">{s2(sims[low.id])}</span>. At zero the score is zero: the veto. These sliders are an example, not data.
        </p>
      </div>
    </div>
  );
}

/** A 0 to 100 track with a filled part. */
function Track({ value, accent }: { value: number; accent?: boolean }) {
  return (
    <div className="mt-3" aria-hidden="true">
      <div className="h-[6px] bg-line">
        <div className={`h-full ${accent ? 'bg-accent' : 'bg-muted'}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <div className="num mt-1 flex justify-between text-[11px] text-muted">
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  );
}

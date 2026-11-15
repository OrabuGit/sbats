import type { FactorId, Preset, Weights } from '../types';
import { FACTOR_IDS } from '../types';
import { FACTOR_LABELS, PURPOSES, type PurposeId } from '../lib/scoringAdapter';
import type { MatchMode } from './LeftPanel';

/** What each mission preset means in plain words. The weights themselves are in lib/scoring/presets.ts. */
const PRESET_WORDS: Record<string, { label: string; line: string }> = {
  base: { label: 'Whole base', line: 'Every factor, balanced.' },
  rover: { label: 'Rover driving', line: 'Terrain counts most.' },
  ice: { label: 'Ice and cold work', line: 'Temperature and rock type count most.' },
  astrobiology: { label: 'Life detection', line: 'Dryness and rock type count most.' },
};

interface Props {
  presets: Preset[];
  presetId: string | null;
  onPreset: (id: string) => void;
  mode: MatchMode;
  onMode: (m: MatchMode) => void;
  purposeId: PurposeId;
  onPurpose: (id: PurposeId) => void;
  weights: Weights;
  onWeight: (id: FactorId, v: number) => void;
}

/** One question, "what is the match for?", and everything else behind "more options". */
export function MatchControls({ presets, presetId, onPreset, mode, onMode, purposeId, onPurpose, weights, onWeight }: Props) {
  const total = FACTOR_IDS.reduce((a, id) => a + weights[id], 0) || 1;
  const custom = presetId === null;
  return (
    <div className="px-5 sm:px-6">
      <h2 className="text-[14px] font-semibold text-text">What is the match for?</h2>
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1" role="radiogroup" aria-label="What the match is for">
        {presets.map((p) => {
          const w = PRESET_WORDS[p.id] ?? { label: p.label, line: p.description };
          const on = mode === 'all' && p.id === presetId;
          return (
            <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => onPreset(p.id)} className={`border-l-2 py-2 pl-3 text-left transition-colors ${on ? 'border-accent' : 'border-line hover:border-muted'}`}>
              <span className={`block text-[15px] leading-5 ${on ? 'font-medium text-text' : 'text-text/80'}`}>{w.label}</span>
              <span className="block text-[12px] leading-4 text-muted">{w.line}</span>
            </button>
          );
        })}
      </div>

      <details className="group mt-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[13px] font-medium text-muted hover:text-text [&::-webkit-details-marker]:hidden">
          <span className="inline-block w-3 text-center transition-transform group-open:rotate-90" aria-hidden="true">
            ›
          </span>
          More options{mode === 'purpose' ? ': ranking by one purpose' : custom ? ': custom weights' : ''}
        </summary>

        <div className="pb-2 pl-5">
          <h3 className="text-[13px] font-semibold text-text">Rank by one purpose instead</h3>
          <p className="mt-0.5 text-[12px] leading-[18px] text-muted">Uses only the factors that purpose depends on.</p>
          <div className="mt-2" role="radiogroup" aria-label="Purpose">
            <button type="button" role="radio" aria-checked={mode === 'all'} onClick={() => onMode('all')} className={`block w-full border-l-2 py-1.5 pl-3 text-left text-[14px] ${mode === 'all' ? 'border-accent text-text' : 'border-line text-muted hover:text-text'}`}>
              None: use the choice above
            </button>
            {PURPOSES.map((pu) => {
              const on = mode === 'purpose' && pu.id === purposeId;
              return (
                <button
                  key={pu.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    onPurpose(pu.id);
                    onMode('purpose');
                  }}
                  className={`block w-full border-l-2 py-1.5 pl-3 text-left text-[14px] ${on ? 'border-accent text-text' : 'border-line text-muted hover:text-text'}`}
                >
                  {pu.label}
                </button>
              );
            })}
          </div>

          <h3 className="mt-5 text-[13px] font-semibold text-text">Set the weights yourself</h3>
          <p className="mt-0.5 text-[12px] leading-[18px] text-muted">How much each factor counts. They always add up to 100%.</p>
          <div className="mt-2">
            {FACTOR_IDS.map((id) => {
              const share = weights[id] / total;
              return (
                <div key={id} className="grid grid-cols-[1fr_auto] items-center gap-x-3">
                  <label htmlFor={`w-${id}`} className="text-[13px] text-text">
                    {FACTOR_LABELS[id]}
                  </label>
                  <output htmlFor={`w-${id}`} className="num text-[13px] text-text">
                    {Math.round(share * 100)}%
                  </output>
                  <input
                    id={`w-${id}`}
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(weights[id] * 100)}
                    disabled={mode === 'purpose'}
                    onChange={(e) => onWeight(id, Number(e.target.value) / 100)}
                    aria-valuetext={`${Math.round(share * 100)} percent of the total`}
                    className="slider col-span-2 -mt-2 disabled:opacity-40"
                  />
                </div>
              );
            })}
          </div>
          {mode === 'purpose' && <p className="text-[12px] text-muted">A purpose has fixed weights. Choose &ldquo;None&rdquo; above to set them yourself.</p>}
        </div>
      </details>
    </div>
  );
}

import { FACTORS, PRESETS } from '../lib/scoringAdapter';
import { Reveal } from './HomeStory';
import { pct } from './MethodParts';

/** Six factors, four sets of weights: one bar per preset under each factor. Same scale on every bar. */
export function MethodWeights() {
  const top = Math.max(...PRESETS.flatMap((p) => FACTORS.map((f) => p.weights[f.id])));
  return (
    <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {FACTORS.map((f, fi) => (
        <Reveal key={f.id} i={fi % 3}>
          <h4 className="display text-[20px] text-text">{f.label}</h4>
          <p className="mt-1 min-h-10 text-[13px] leading-5 text-muted">{f.measures}</p>
          <ul className="mt-3 space-y-1.5">
            {PRESETS.map((p) => (
              <li key={p.id} className="grid grid-cols-[84px_minmax(0,1fr)_40px] items-center gap-3">
                <span className="text-[12px] text-muted">{p.label}</span>
                <span className="block h-[6px] bg-line" aria-hidden="true">
                  <span className={`bar-grow block h-full ${p.id === PRESETS[0].id ? 'bg-accent' : 'bg-muted'}`} style={{ ['--to' as string]: p.weights[f.id] / top, ['--i' as string]: fi }} />
                </span>
                <span className="num text-right text-[13px] text-text">{pct(p.weights[f.id])}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      ))}
    </div>
  );
}

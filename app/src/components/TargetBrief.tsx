import { ArrowRight } from 'lucide-react';
import type { Target } from '../types';
import type { ExtractItem } from '../data/sites';
import { formatCoords } from '../lib/geo';
import { Ground } from './Ground';

const BODY_LABEL = { moon: 'Moon', mars: 'Mars' } as const;

/** Step 1, right panel: the chosen target, its terrain, and the way on to Earth. */
export function TargetBrief({
  target,
  extract,
  extractsState,
  windowKm,
  onFind,
}: {
  target: Target;
  extract: ExtractItem | null;
  extractsState: 'loading' | 'ready' | 'error';
  windowKm: number;
  onFind: () => void;
}) {
  return (
    <article aria-labelledby="h-target-brief">
      <header className="border-b border-line p-4">
        <p className="label">01 Target</p>
        <h2 id="h-target-brief" className="mt-1 text-[17px] font-semibold leading-6 text-text">
          {target.name}
        </h2>
        <p className="num mt-0.5 text-[12px] text-muted">
          {BODY_LABEL[target.body]} · {formatCoords(target.lat, target.lon)}
        </p>
        <button type="button" onClick={onFind} className="label mt-4 flex min-h-11 w-full items-center justify-center gap-2 bg-accent font-semibold !text-bg hover:bg-text">
          Find analogs on Earth <ArrowRight size={14} aria-hidden="true" />
        </button>
      </header>

      <section className="border-b border-line p-4" aria-labelledby="h-target-ground">
        <h3 id="h-target-ground" className="label mb-2">
          Terrain, {windowKm} km across
        </h3>
        {extract ? (
          <Ground item={extract} layer="relief" windowKm={windowKm} />
        ) : (
          <p className="text-[13px] text-muted">
            {extractsState === 'loading' ? 'Loading terrain' : extractsState === 'error' ? 'Terrain could not be loaded.' : 'No data. No terrain extract was built for this target.'}
          </p>
        )}
      </section>

      <section className="p-4" aria-labelledby="h-target-cannot">
        <h3 id="h-target-cannot" className="label">
          What Earth cannot copy
        </h3>
        <p className="mt-1 text-[12px] text-muted">Never part of the score.</p>
        <ul className="mt-2 space-y-2">
          {target.cannotCopy.map((s, i) => (
            <li key={i} className="border-l-2 border-line pl-3 text-[13px] text-text">
              {s}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

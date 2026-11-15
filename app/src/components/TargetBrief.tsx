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
  place,
}: {
  target: Target;
  extract: ExtractItem | null;
  extractsState: 'loading' | 'ready' | 'error';
  windowKm: number;
  onFind: () => void;
  /** The named place picked in step 2, when it is not the target itself. */
  place: { name: string; lat: number; lon: number; line: string; source: string; url: string | null; hasValues: boolean } | null;
}) {
  if (place && !place.hasValues)
    return (
      <article aria-labelledby="h-target-brief">
        <header className="border-b border-line p-4">
          <p className="label">02 Place</p>
          <h2 id="h-target-brief" className="mt-1 text-[17px] font-semibold leading-6 text-text">
            {place.name}
          </h2>
          <p className="num mt-0.5 text-[12px] text-muted">{formatCoords(place.lat, place.lon)}</p>
          <p className="mt-3 text-[13px] leading-5 text-text">{place.line}</p>
          <button type="button" disabled className="btn mt-4 w-full">
            No data to match yet
          </button>
          <p className="mt-2 text-[12px] text-muted">
            This place is real and its coordinates are cited, but no terrain, temperature or rock values exist for it in the data. A match needs
            the global Moon and Mars grids, which are not published yet. Places with values are listed first.
          </p>
        </header>
        <section className="p-4">
          <h3 className="label">Source of the coordinates</h3>
          <p className="mt-1.5 text-[12px] leading-[18px] text-muted">{place.source}</p>
          {place.url && (
            <a href={place.url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-[12px] text-text underline decoration-line underline-offset-2">
              {place.url}
            </a>
          )}
        </section>
      </article>
    );

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
        {place && place.name !== target.name && (
          <p className="mt-2 text-[12px] text-muted">
            Picked as "{place.name}". {place.line} Its values are those of {target.name}, the measured target that covers it.
          </p>
        )}
        <button type="button" onClick={onFind} className="btn btn-primary mt-4 w-full">
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

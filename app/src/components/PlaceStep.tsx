import { Suspense, lazy, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import type { Target } from '../types';
import type { ExtractItem } from '../data/sites';
import type { TargetProfile } from '../lib/matchAdapter';
import { formatCoords } from '../lib/geo';
import { Ground } from './Ground';
import type { GlobePlace } from './WorldGlobe';

const WorldGlobe = lazy(() => import('./WorldGlobe').then((m) => ({ default: m.WorldGlobe })));

export interface PlaceRow extends GlobePlace {
  sub: string;
  /** The curated target of data/targets.json that covers this place, if any. */
  targetId: string | null;
  line: string;
  source: string;
  url: string | null;
}

interface Props {
  body: 'moon' | 'mars';
  onBody: (b: 'moon' | 'mars') => void;
  places: PlaceRow[];
  placeId: string | null;
  onPlace: (id: string) => void;
  /** Click anywhere on the globe. null when points cannot be picked on this world yet. */
  onPoint: ((lat: number, lon: number) => void) | null;
  targets: Target[];
  /** The target in use: curated, or built from the place. */
  target: Target;
  profile: TargetProfile | null;
  extract: ExtractItem | null;
  windowKm: number;
  onFind: () => void;
  hidden?: boolean;
}

/** Step 2: the world as a big globe with its places pinned, a list to search, and one button to go on. */
export function PlaceStep({ body, onBody, places, placeId, onPlace, onPoint, targets, target, profile, extract, windowKm, onFind, hidden = false }: Props) {
  const [query, setQuery] = useState('');
  const here = places.filter((p) => p.body === body);
  const q = query.trim().toLowerCase();
  const listed = here.filter((p) => q === '' || `${p.name} ${p.sub}`.toLowerCase().includes(q));
  const place = places.find((p) => p.id === placeId) ?? null;
  const picked = place && place.body === body ? place : null;
  const ready = !!picked && picked.hasValues && profile?.origin !== 'none';
  const world = body === 'moon' ? 'the Moon' : 'Mars';
  return (
    <main className={`min-h-0 flex-1 flex-col bg-bg lg:flex-row ${hidden ? 'hidden' : 'flex'}`} aria-labelledby="h-place">
      <div className="flex shrink-0 flex-col lg:relative lg:min-h-0 lg:flex-1">
        <div className="bg-bg px-5 pb-3 pt-4 sm:px-10 sm:pt-6 lg:pointer-events-none lg:absolute lg:left-0 lg:top-0 lg:z-10 lg:max-w-[calc(100%-1rem)] lg:px-16 lg:pb-4">
          <h1 id="h-place" className="display-l text-[30px] sm:text-[48px]">
            Pick a place on {world}
          </h1>
          <p className="mt-1 max-w-[34ch] text-[14px] leading-5 text-muted">Click a pin{onPoint ? ' or any point' : ''}, or choose from the list.</p>
        </div>
        <div className="relative h-[44svh] min-h-[280px] lg:h-full">
          <Suspense
            fallback={
              <p className="absolute left-5 top-5 text-[13px] text-muted" role="status">
                Loading globe
              </p>
            }
          >
            <WorldGlobe
              targets={targets}
              targetId={target.id}
              places={places}
              placeId={placeId}
              onTarget={onPlace}
              onPick={onPlace}
              onPoint={onPoint}
              active={!hidden}
              showTabs={false}
            />
          </Suspense>
        </div>
      </div>

      <aside aria-label="Places" className="scroll flex min-h-0 flex-1 flex-col bg-bg lg:w-[420px] lg:flex-none lg:border-l lg:border-line">
        <div className="px-5 pt-5 sm:px-6">
          <div className="flex gap-6" role="group" aria-label="World">
            {(['moon', 'mars'] as const).map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={b === body}
                onClick={() => onBody(b)}
                className={`border-b-2 pb-1 text-[16px] font-medium transition-colors ${b === body ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'}`}
              >
                {b === 'moon' ? 'Moon' : 'Mars'}
              </button>
            ))}
          </div>

          {picked && (
            <section className="mt-6" aria-labelledby="h-picked">
              <h2 id="h-picked" className="display text-[22px] leading-7 text-text">
                {picked.name}
              </h2>
              <p className="mt-1 text-[13px] leading-5 text-muted">
                {picked.sub ? `${picked.sub}. ` : ''}
                <span className="num">{formatCoords(picked.lat, picked.lon)}</span>
              </p>
              {ready && <p className="mt-3 text-[14px] leading-[22px] text-text">{profile ? profile.target.summary : target.summary}</p>}
              {profile?.notes.map((n) => (
                <p key={n} className="mt-2 border-l-2 border-accent pl-3 text-[12px] leading-[18px] text-text" role="note">
                  {n}
                </p>
              ))}
              {ready && extract && (
                <div className="mt-4 max-w-[260px]">
                  <Ground item={extract} layer="relief" windowKm={windowKm} />
                </div>
              )}
              <button type="button" onClick={onFind} disabled={!ready} className="btn btn-primary mt-5 !h-12 w-full !justify-between !px-5 !text-[16px] disabled:opacity-60">
                {ready ? 'Find analogs on Earth' : 'No values for this place yet'} {ready && <ArrowRight size={17} aria-hidden="true" />}
              </button>
              {!ready && (
                <p className="mt-2 text-[12px] leading-[18px] text-muted">
                  {picked.line || 'No terrain, temperature or rock values exist for this place in the data.'} Places with values are listed first.
                </p>
              )}
            </section>
          )}
        </div>

        <div className="mt-6 flex items-center gap-2 px-5 sm:px-6">
          <Search size={15} className="shrink-0 text-muted" aria-hidden="true" />
          <label className="sr-only" htmlFor="place-search">
            Search places
          </label>
          <input
            id="place-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${here.length} places on ${world}`}
            className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-text placeholder:text-muted focus:outline-none"
          />
        </div>
        <fieldset className="mt-1 min-h-0 flex-1 pb-6">
          <legend className="sr-only">Places on {world}</legend>
          {listed.map((p) => {
            const on = p.id === placeId;
            return (
              <label
                key={p.id}
                className={`flex min-h-12 cursor-pointer items-center gap-3 border-l-2 px-[18px] py-2 hover:bg-bg sm:px-[22px] ${on ? 'border-accent bg-bg' : 'border-transparent'} has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-accent`}
              >
                <input type="radio" name="place" value={p.id} checked={on} onChange={() => onPlace(p.id)} className="sr-only" />
                <span className="min-w-0 flex-1">
                  <span className={`block text-[14px] leading-5 ${p.hasValues ? 'text-text' : 'text-muted'} ${on ? 'font-medium' : ''}`}>{p.name}</span>
                  {p.sub && <span className="block truncate text-[12px] text-muted">{p.sub}</span>}
                </span>
                {p.hasValues && <span className="shrink-0 text-[11px] font-medium text-accent">Measured</span>}
              </label>
            );
          })}
          {listed.length === 0 && <p className="px-6 py-3 text-[14px] text-muted">No place matches &ldquo;{query}&rdquo;.</p>}
        </fieldset>
      </aside>
    </main>
  );
}

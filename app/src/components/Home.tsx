import { ArrowRight, X } from 'lucide-react';
import type { Target } from '../types';
import type { ExtractIndex, SitesFile } from '../data/sites';
import { dataUrl } from '../data/sites';
import type { SavedLocation } from '../lib/saved';
import { formatCoords } from '../lib/geo';
import { WORLD_CREDIT, WORLD_RADIUS_KM, Worlds, type WorldId } from './Worlds';

interface Props {
  targets: Target[];
  cells: number;
  siteCount: number;
  sites: SitesFile | null;
  extracts: ExtractIndex | null;
  saved: SavedLocation[];
  onFind: () => void;
  onWorld: (w: WorldId) => void;
  onWorldPage: (w: WorldId) => void;
  onFeatured: (id?: string) => void;
  onOpenSaved: (s: SavedLocation) => void;
  onRemoveSaved: (id: string) => void;
}

const WORLDS: WorldId[] = ['earth', 'moon', 'mars'];

/** Home: the three worlds, the one way in, and the featured sites. */
export function Home({ targets, cells, siteCount, sites, extracts, saved, onFind, onWorld, onWorldPage, onFeatured, onOpenSaved, onRemoveSaved }: Props) {
  const count = (b: 'moon' | 'mars') => targets.filter((t) => t.body === b).length;
  const featured = (sites?.sites ?? []).filter((s) => s.kind === 'candidate' && extracts?.items.some((i) => i.id === s.id && i.image));
  return (
    <main className="scroll min-h-0 flex-1 bg-panel" aria-labelledby="h-home">
      <section className="border-b border-line bg-bg" aria-label="Earth, the Moon and Mars at true relative size">
        <Worlds
          worlds={WORLDS}
          caption={(w) => (w === 'earth' ? `${cells.toLocaleString('en-US')} cells scored` : `${count(w)} base sites`)}
          action={(w) => (w === 'earth' ? 'About Earth' : `Find an analog for a site on ${w === 'moon' ? 'the Moon' : 'Mars'}`)}
          onPick={(w) => (w === 'earth' ? onWorldPage(w) : onWorld(w))}
        />
        <p className="readout border-t border-line px-4 py-2 sm:px-6">
          True relative size. Radius <b>{WORLD_RADIUS_KM.earth.toLocaleString('en-US')} km</b>, <b>{WORLD_RADIUS_KM.moon.toLocaleString('en-US')} km</b>,{' '}
          <b>{WORLD_RADIUS_KM.mars.toLocaleString('en-US')} km</b> (NASA NSSDCA fact sheets). {WORLD_CREDIT}
        </p>
      </section>

      <section className="grid gap-x-10 gap-y-6 border-b border-line px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h2 id="h-home" className="max-w-[24ch] text-[22px] font-semibold leading-7 text-text">
            Where on Earth can a Moon or Mars base be rehearsed?
          </h2>
          <p className="mt-3 max-w-[58ch] text-[14px] leading-[22px] text-text">
            SBATS compares every 0.5° cell of Earth's land with a base site on the Moon or Mars on terrain, bare ground, dryness, temperature,
            sunlight and rock type. It ranks the cells, shows where each match holds and where it fails, and says what no place on Earth can copy.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={onFind} className="btn btn-primary">
              Find an analog <ArrowRight size={14} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onFeatured()} className="btn">
              Featured sites
            </button>
          </div>
        </div>
        <dl className="kv max-w-[420px] self-start">
          <div>
            <dt>Earth cells scored</dt>
            <dd>{cells.toLocaleString('en-US')}</dd>
          </div>
          <div>
            <dt>Base sites, Moon</dt>
            <dd>{count('moon')}</dd>
          </div>
          <div>
            <dt>Base sites, Mars</dt>
            <dd>{count('mars')}</dd>
          </div>
          <div>
            <dt>Named Earth sites</dt>
            <dd>{siteCount}</dd>
          </div>
          <div>
            <dt>About each world</dt>
            <dd className="flex justify-end gap-3">
              {WORLDS.map((w) => (
                <button key={w} type="button" onClick={() => onWorldPage(w)} className="text-text underline decoration-line underline-offset-4 hover:text-accent">
                  {w === 'earth' ? 'Earth' : w === 'moon' ? 'Moon' : 'Mars'}
                </button>
              ))}
            </dd>
          </div>
        </dl>
      </section>

      <section className="border-b border-line px-4 py-8 sm:px-6" aria-labelledby="h-home-featured">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="h-home-featured" className="text-[14px] font-semibold text-text">
            Featured sites
          </h2>
          <button type="button" onClick={() => onFeatured()} className="text-[13px] text-muted underline decoration-line underline-offset-4 hover:text-text">
            All featured sites
          </button>
        </div>
        {featured.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted">{sites === null ? 'No data. data/sites.json is not published with this build.' : 'No data. No featured site has an image yet.'}</p>
        ) : (
          <ul className="mt-4 grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.slice(0, 4).map((s) => {
              const img = extracts?.items.find((i) => i.id === s.id)?.image;
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => onFeatured(s.id)} className="group block w-full text-left">
                    <span className="block aspect-[4/3] overflow-hidden border border-line bg-bg">
                      {img && <img src={dataUrl(img.file)} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    </span>
                    <span className="mt-2 block text-[14px] font-medium text-text group-hover:text-accent">{s.name.split(',')[0]}</span>
                    <span className="num block text-[11px] text-muted">
                      {formatCoords(s.lat, s.lon)} · {s.footprintKm} km footprint
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {featured.length > 0 && <p className="readout mt-4">Images: Sentinel-2, contains modified Copernicus Sentinel data 2025.</p>}
      </section>

      <section className="px-4 py-8 sm:px-6" aria-labelledby="h-home-saved">
        <h2 id="h-home-saved" className="text-[14px] font-semibold text-text">
          Saved locations
        </h2>
        {saved.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted">None yet. Open a match and press Save. Saved locations stay in this browser.</p>
        ) : (
          <ul className="mt-3 max-w-[720px] border-t border-line">
            {saved.map((s) => (
              <li key={s.id} className="flex items-stretch border-b border-line">
                <button type="button" onClick={() => onOpenSaved(s)} className="row flex-1 !border-b-0">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] text-text">{s.name}</span>
                    <span className="num block text-[11px] text-muted">
                      {formatCoords(s.lat, s.lon)} · for {s.targetName}
                    </span>
                  </span>
                  <span className={`num ${s.score === null ? 'text-[11px] uppercase text-muted' : 'text-[17px] font-semibold text-text'}`}>{s.score === null ? 'no data' : s.score.toFixed(0)}</span>
                </button>
                <button type="button" onClick={() => onRemoveSaved(s.id)} aria-label={`Remove ${s.name} from saved locations`} className="tool !px-0 border-l border-line">
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

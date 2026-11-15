import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Play, Square, X } from 'lucide-react';
import type { EarthFile } from '../types';
import { dataUrl, loadFindings, type ExtractIndex, type FeaturedSite, type Findings, type SitesFile } from '../data/sites';
import { useAsync } from '../lib/useAsync';
import type { SavedLocation } from '../lib/saved';
import { formatCoords } from '../lib/geo';
import { HeroGlobes, type HeroPlace } from './HeroGlobes';
import { HomeStory, Reveal } from './HomeStory';
import { Wordmark } from './Wordmark';
import type { WorldId } from './Worlds';

interface Props {
  earth: EarthFile;
  places: HeroPlace[];
  sites: SitesFile | null;
  extracts: ExtractIndex | null;
  saved: SavedLocation[];
  demo: string | null;
  onDemo: () => void;
  onFind: () => void;
  onWorld: (w: WorldId) => void;
  onPlace: (id: string) => void;
  onFeatured: (id?: string) => void;
  onMethod: () => void;
  onValidation: () => void;
  onOpenSaved: (s: SavedLocation) => void;
  onRemoveSaved: (id: string) => void;
}

const LEAD = ['tambora', 'batur'];
const short = (n: string) => n.split(',')[0];
const region = (n: string) => n.split(',').slice(1).join(',').trim();
const claimOf = (f: Findings | null) => {
  const raw = f?.claim?.replace(/^.*?narrow:\s*/, '') ?? null;
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : null;
};

/** Transparent navigation: no bar, no border. It takes a solid background only once the page has moved under it. */
function HomeNav({ solid, demo, onDemo, onFeatured, onMethod }: { solid: boolean; demo: string | null; onDemo: () => void; onFeatured: () => void; onMethod: () => void }) {
  const item = 'min-h-11 px-2 text-[14px] font-medium text-text/80 hover:text-text sm:px-4 sm:text-[15px]';
  return (
    <header className={`absolute inset-x-0 top-0 z-30 flex h-14 items-center justify-between px-4 transition-colors duration-300 sm:h-[72px] sm:px-8 ${solid ? 'bg-bg' : 'bg-transparent'}`}>
      <h1 className="m-0 text-[22px]">
        <span className="sr-only">SBATS-26</span>
        <Wordmark size={24} />
      </h1>
      <nav aria-label="Main" className="flex items-center">
        {demo && <span className="num mr-3 hidden max-w-[220px] truncate text-[11px] text-muted md:inline">{demo}</span>}
        <button type="button" onClick={onFeatured} className={item}>
          Featured<span className="hidden sm:inline"> sites</span>
        </button>
        <button type="button" onClick={onMethod} className={item}>
          Method
        </button>
        <button type="button" onClick={onDemo} aria-pressed={demo !== null} aria-label={demo ? 'Stop demo' : 'Run demo'} className={`${item} inline-flex items-center gap-2`}>
          {demo ? <Square size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
          <span className="hidden sm:inline">{demo ? 'Stop demo' : 'Run demo'}</span>
        </button>
      </nav>
    </header>
  );
}

function Tile({ site, extracts, onOpen }: { site: FeaturedSite; extracts: ExtractIndex | null; onOpen: () => void }) {
  const img = extracts?.items.find((i) => i.id === site.id)?.image;
  return (
    <button type="button" onClick={onOpen} className="group block w-full text-left">
      <span className="block aspect-[4/3] overflow-hidden bg-panel">
        {img && <img src={dataUrl(img.file)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]" />}
      </span>
      <span className="display mt-3 block text-[20px] text-text group-hover:text-accent">{short(site.name)}</span>
      <span className="mt-0.5 block text-[13px] text-muted">
        {region(site.name)} · <span className="num">{site.footprintKm}</span> km footprint
      </span>
    </button>
  );
}

/** The home page: three globes, the two ways in, the featured sites, then how it works. */
export function Home(p: Props) {
  const scroller = useRef<HTMLElement>(null);
  const [solid, setSolid] = useState(false);
  const findings = useAsync(loadFindings, 'home-findings');
  const claim = claimOf(findings.status === 'ready' ? findings.value : null);

  const proposed = useMemo(() => {
    const all = (p.sites?.sites ?? []).filter((s) => s.kind === 'candidate' && p.extracts?.items.some((i) => i.id === s.id && i.image));
    const rank = (s: FeaturedSite) => {
      const i = LEAD.findIndex((k) => s.id.includes(k));
      return i < 0 ? LEAD.length : i;
    };
    return [...all].sort((a, b) => rank(a) - rank(b));
  }, [p.sites, p.extracts]);
  const lead = proposed[0] ?? null;
  const rest = proposed.slice(1);
  const leadImage = lead ? p.extracts?.items.find((i) => i.id === lead.id)?.image : null;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const on = () => setSolid(el.scrollTop > 48);
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-bg">
      <HomeNav solid={solid} demo={p.demo} onDemo={p.onDemo} onFeatured={() => p.onFeatured()} onMethod={p.onMethod} />
      <main ref={scroller} className="scroll min-h-0 flex-1 bg-bg" aria-label="SBATS-26 home">
        {/* 1. Hero: three globes on the left three quarters, the two actions on the right. */}
        <section className="flex min-h-[100svh] flex-col lg:grid lg:min-h-[100svh] lg:grid-cols-[3fr_1fr]" aria-label="Earth, the Moon and Mars">
          <div className="h-[60svh] min-h-[380px] lg:h-auto lg:min-h-[640px]">
            <HeroGlobes places={p.places} cells={p.earth.cells.length} onPlace={p.onPlace} onWorld={p.onWorld} />
          </div>
          <div className="flex flex-col justify-center px-5 pb-10 pt-2 sm:px-10 lg:pb-0 lg:pl-4 lg:pr-12 lg:pt-14">
            <h2 className="display-l text-[28px] sm:text-[34px] lg:text-[38px]">Rehearse a Moon or Mars base on Earth.</h2>
            <p className="mt-3 max-w-[40ch] text-[14px] leading-[22px] text-muted lg:mt-4">
              SBATS scores every {p.earth.meta.resolutionDeg}° cell of Earth&rsquo;s land against a base site on another world, and shows where each match holds and where it fails.
            </p>
            <div className="mt-6 flex flex-col items-start gap-5 lg:mt-9">
              <button type="button" onClick={p.onFind} className="btn btn-primary !h-14 !min-h-14 w-full max-w-[320px] !justify-between !px-6 !text-[17px] !font-semibold">
                Find analog <ArrowRight size={18} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => p.onFeatured()} className="link-rule text-[17px] font-medium text-text">
                Featured sites
              </button>
            </div>
          </div>
        </section>

        {/* 2. Featured sites, the team's candidates first. */}
        <section aria-labelledby="h-home-featured" className="pb-8">
          {lead && leadImage && (
            <div className="relative min-h-[460px] overflow-hidden bg-panel sm:min-h-[72svh]">
              <img src={dataUrl(leadImage.file)} alt={`${short(lead.name)} from Sentinel-2, 20 km across, north up`} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-bg/55" aria-hidden="true" />
              <div className="relative flex min-h-[460px] flex-col justify-end px-5 pb-10 pt-24 sm:min-h-[72svh] sm:px-10 lg:px-16 lg:pb-16">
                <Reveal>
                  <p className="num text-[12px] text-text/80">Featured sites · proposed by the team</p>
                </Reveal>
                <Reveal i={1}>
                  <h2 id="h-home-featured" className="display-xl mt-3 max-w-[16ch] text-[44px] text-text sm:text-[76px] lg:text-[96px]">
                    {short(lead.name)}
                  </h2>
                </Reveal>
                <Reveal i={2}>
                  <p className="mt-3 max-w-[58ch] text-[15px] leading-[24px] text-text sm:text-[17px] sm:leading-7">
                    {region(lead.name)}. {claim ?? lead.footprintNote}
                  </p>
                </Reveal>
                <Reveal i={3}>
                  <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
                    <button type="button" onClick={() => p.onFeatured(lead.id)} className="btn btn-primary !px-6">
                      Open {short(lead.name)}
                    </button>
                    <button type="button" onClick={() => p.onFeatured()} className="link-rule text-[16px] font-medium text-text">
                      All featured sites
                    </button>
                  </div>
                </Reveal>
                <p className="readout absolute bottom-3 right-4 hidden text-text/70 sm:block">Sentinel-2, contains modified Copernicus Sentinel data 2025</p>
              </div>
            </div>
          )}
          {!lead && (
            <div className="px-5 py-24 sm:px-10 lg:px-16">
              <h2 id="h-home-featured" className="display-l text-[34px]">Featured sites</h2>
              <p className="mt-3 text-[14px] text-muted">{p.sites === null ? 'No data. data/sites.json is not published with this build.' : 'No data. No featured site has an image yet.'}</p>
            </div>
          )}
          {rest.length > 0 && (
            <div className="mt-14 px-5 sm:px-10 lg:px-16">
              <ul className="-mx-5 flex scroll-pl-5 snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-12 sm:overflow-visible sm:px-0 lg:grid-cols-4">
                {rest.map((s, i) => (
                  <li key={s.id} className="w-[74vw] shrink-0 snap-start sm:w-auto">
                    <Reveal i={i % 4}>
                      <Tile site={s} extracts={p.extracts} onOpen={() => p.onFeatured(s.id)} />
                    </Reveal>
                  </li>
                ))}
              </ul>
              <Reveal className="mt-12">
                <p className="max-w-[60ch] text-[14px] leading-[22px] text-muted">
                  The established analog sites, shown as benchmarks, and the best three cells of the global scan are on the featured sites page.
                </p>
                <button type="button" onClick={() => p.onFeatured()} className="link-rule mt-3 text-[16px] font-medium text-text">
                  All featured sites
                </button>
              </Reveal>
            </div>
          )}
        </section>

        {/* 3. How it works, the data, the method and its limits. */}
        <HomeStory earth={p.earth} placeCount={p.places.length} onMethod={p.onMethod} onValidation={p.onValidation} onFind={p.onFind} />

        {/* 4. Saved locations. */}
        <section className="px-5 pb-24 sm:px-10 lg:px-16" aria-labelledby="h-home-saved">
          <h2 id="h-home-saved" className="display text-[24px] text-text">
            Saved locations
          </h2>
          {p.saved.length === 0 ? (
            <p className="mt-2 text-[14px] text-muted">None yet. Open a match and press Save. They stay in this browser.</p>
          ) : (
            <ul className="mt-4 max-w-[720px]">
              {p.saved.map((s) => (
                <li key={s.id} className="flex items-stretch border-b border-line first:border-t">
                  <button type="button" onClick={() => p.onOpenSaved(s)} className="flex min-h-14 flex-1 items-center gap-4 py-2 text-left hover:text-accent">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] text-text">{s.name}</span>
                      <span className="num block text-[11px] text-muted">
                        {formatCoords(s.lat, s.lon)} · for {s.targetName}
                      </span>
                    </span>
                    {s.comparable === false ? (
                      <span className="num max-w-[150px] text-right text-[11px] text-muted" title="This target has no temperature value, so its scores run high and cannot be set beside the others.">
                        {s.score === null ? 'no data' : s.score.toFixed(0)}, not comparable
                      </span>
                    ) : (
                      <span className={`num ${s.score === null ? 'text-[11px] text-muted' : 'text-[20px] font-semibold text-text'}`}>{s.score === null ? 'no data' : s.score.toFixed(0)}</span>
                    )}
                  </button>
                  <button type="button" onClick={() => p.onRemoveSaved(s.id)} aria-label={`Remove ${s.name} from saved locations`} className="tool !px-0">
                    <X size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

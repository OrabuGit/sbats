import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { CellSummary, EarthFile } from '../types';
import { loadExtra } from '../data/access';
import { formatCoords } from '../lib/geo';
import { ConfidenceBadge } from './Badges';
import { dataUrl, loadFindings, type ExtractIndex, type FeaturedSite, type Findings, type SitesFile } from '../data/sites';
import { useAsync } from '../lib/useAsync';
import { countryKey, useCountries } from '../lib/where';
import { HeroGlobes, type HeroLink, type HeroPick, type HeroPlace, type HeroSite } from './HeroGlobes';
import { HomePair, type PairInfo } from './HomePair';
import { HomeStory, Reveal } from './HomeStory';
import { Logo } from './Logo';
import { NavRight } from './Chrome';
import type { WorldId } from './Worlds';

interface Props {
  earth: EarthFile;
  /** Scores of every Earth cell for the current target. */
  results: CellSummary[];
  target: { id: string; name: string };
  /** Opens the match page of the Earth cell at a point, against a target. */
  onOpenMatch: (lat: number, lon: number, targetId: string) => void;
  places: HeroPlace[];
  sites: SitesFile | null;
  extracts: ExtractIndex | null;
  savedCount: number;
  onSaved: () => void;
  demo: string | null;
  onDemo: () => void;
  onFind: () => void;
  onWorld: (w: WorldId) => void;
  /** A pin on a globe was pressed. */
  onPick: (kind: 'place' | 'site', id: string) => void;
  pick: HeroPick;
  earthPins: HeroSite[];
  links: HeroLink[];
  reverse: { place: string; score: number | null } | null;
  active: number;
  onActive: (i: number) => void;
  pair: PairInfo | null;
  /** True while the hero is choosing pairs by itself: only a title is shown, so the buttons stay the focus. */
  auto: boolean;
  chips: { label: string; score: number | null }[];
  presets: { id: string }[];
  presetId: string | null;
  onPreset: (id: string) => void;
  onOpenPair: () => void;
  onAllMatches: (() => void) | null;
  onClearPick: () => void;
  onFeatured: (id?: string) => void;
  onMethod: () => void;
  onLearn: () => void;
  onValidation: () => void;
}

const LEAD = ['tambora', 'batur'];
const short = (n: string) => n.split(',')[0];
const region = (n: string) => n.split(',').slice(1).join(',').trim();
const claimOf = (f: Findings | null) => {
  const raw = f?.claim?.replace(/^.*?narrow:\s*/, '') ?? null;
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : null;
};

/** Transparent navigation: no bar, no border. It takes a solid background only once the page has moved under it. */
/** Transparent navigation: no bar, no border. It takes a solid background only once the page has moved under it. */
function HomeNav({ solid, nav }: { solid: boolean; nav: Parameters<typeof NavRight>[0] }) {
  return (
    <header className={`absolute inset-x-0 top-0 z-30 flex h-14 items-center justify-between px-3 transition-colors duration-300 sm:h-[72px] sm:px-8 ${solid ? 'bg-bg' : 'bg-transparent'}`}>
      <h1 className="m-0 flex items-center">
        <span className="sr-only">SBATS-26</span>
        <Logo height={28} />
      </h1>
      <NavRight {...nav} />
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

interface DiscPick {
  lat: number;
  lon: number;
  score: number;
  rank: number;
  confidence: 'high' | 'medium' | 'low';
  isNew: boolean;
  nearestKnown: { name: string; km: number } | null;
  stability: { rankP05: number; rankP95: number; shareInTop10: number } | null;
}
interface Discoveries {
  targets: { target: string; name: string; top: DiscPick[] }[];
}

/** The three best-scoring Earth places for the current target, from data/discoveries.json. */
function TopScan({ target, onOpen }: { target: { id: string; name: string }; onOpen: (lat: number, lon: number, id: string) => void }) {
  const disc = useAsync(() => loadExtra<Discoveries>('discoveries.json'), 'home-top-scan');
  const picks = disc.status === 'ready' ? (disc.value?.targets.find((t) => t.target === target.id)?.top.slice(0, 3) ?? []) : [];
  const names = useCountries(picks);
  if (disc.status === 'ready' && picks.length === 0) return null;
  return (
    <section aria-labelledby="h-top-scan" className="mt-24 px-5 sm:px-10 lg:px-16">
      <Reveal>
        <h2 id="h-top-scan" className="display-l text-[30px] sm:text-[44px]">
          Top of the global scan for {target.name}
        </h2>
      </Reveal>
      <ol className="mt-10 grid gap-x-10 gap-y-10 md:grid-cols-3">
        {disc.status === 'loading' &&
          [0, 1, 2].map((k) => (
            <li key={k} className="min-h-[250px] animate-pulse" aria-hidden="true">
              <div className="h-3 w-16 bg-line" />
              <div className="mt-3 h-14 w-28 bg-line" />
              <div className="mt-4 h-4 w-32 bg-line" />
              <div className="mt-2 h-3 w-44 bg-line" />
              <div className="mt-5 h-3 w-full bg-line" />
            </li>
          ))}
        {picks.map((p, i) => (
          <li key={`${p.lat},${p.lon}`}>
            <Reveal i={i}>
              <p className="text-[13px] text-muted">Rank {p.rank.toLocaleString('en-US')}</p>
              <p className="display-xl mt-1 text-[64px] text-text">
                {p.score.toFixed(0)}
                <span className="ml-2 text-[15px] font-normal text-muted">/ 100</span>
              </p>
              <p className="mt-2 text-[16px] font-medium text-text">{names.get(countryKey(p.lat, p.lon)) ?? 'Open land'}</p>
              <p className="text-[13px] text-muted">{formatCoords(p.lat, p.lon)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <ConfidenceBadge confidence={p.confidence} />
                {p.isNew && (
                  <span className="border border-accent px-1.5 text-[11px] font-semibold leading-[18px] text-accent" title={p.nearestKnown ? `${Math.round(p.nearestKnown.km).toLocaleString('en-US')} km from ${p.nearestKnown.name}` : undefined}>
                    New{p.nearestKnown ? `, ${Math.round(p.nearestKnown.km).toLocaleString('en-US')} km from any known analog` : ''}
                  </span>
                )}
              </div>
              <p className="mt-2 text-[13px] leading-5 text-muted">
                {p.stability
                  ? `Stable: rank ${p.stability.rankP05} to ${p.stability.rankP95} in nine of ten redraws of the weights, in the top 10 in ${Math.round(p.stability.shareInTop10 * 100)}% of them.`
                  : 'No stability figure for this place.'}
              </p>
              <button type="button" onClick={() => onOpen(p.lat, p.lon, target.id)} className="link-rule mt-4 text-[15px] font-medium text-text">
                Open the match
              </button>
            </Reveal>
          </li>
        ))}
      </ol>
      <Reveal className="mt-10">
        <p className="max-w-[72ch] text-[14px] leading-[22px] text-muted">
          These are the tool&rsquo;s own all-round picks. Our Indonesian candidates above are offered for specific properties, such as rock type and landform, not as all-round matches.
        </p>
      </Reveal>
    </section>
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
    <div className="arrive relative flex min-h-0 flex-1 flex-col bg-bg">
      <HomeNav
        solid={solid}
        nav={{
          homeOpen: true,
          onHome: () => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' }),
          featuredOpen: false,
          onFeatured: () => p.onFeatured(),
          methodOpen: false,
          onMethod: p.onMethod,
          learnOpen: false,
          onLearn: p.onLearn,
          savedCount: p.savedCount,
          savedOpen: false,
          onSaved: p.onSaved,
          demoRunning: p.demo !== null,
          demoLabel: p.demo,
          onDemo: p.onDemo,
        }}
      />
      <main ref={scroller} className="scroll min-h-0 flex-1 bg-bg" aria-label="SBATS-26 home">
        {/* 1. Hero: three globes on the left three quarters, the two actions on the right. */}
        <section className="relative flex min-h-[100svh] flex-col lg:grid lg:min-h-[100svh] lg:grid-cols-[minmax(420px,1fr)_3fr]" aria-label="Earth, the Moon and Mars">
          <div className="h-[60svh] min-h-[380px] lg:order-2 lg:h-auto lg:min-h-[640px]">
            <HeroGlobes places={p.places} sites={p.earthPins} cells={p.earth.cells.length} onPick={p.onPick} onWorld={p.onWorld} pick={p.pick} links={p.links} reverse={p.reverse} active={p.active}>
              {p.pair && p.auto && (
                <p className="pointer-events-none absolute inset-x-0 bottom-1 z-10 flex items-center justify-center gap-2 px-4 sm:bottom-5 text-center text-[14px] text-muted" aria-live="polite">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                  {p.pair.mode === 'place' ? 'Best matches for' : 'Best match for'} <span className="text-text">{p.pair.from}</span>
                </p>
              )}
              {p.pair && !p.auto && (
                <div className="hidden lg:block">
                  <HomePair pair={p.pair} chips={p.chips} active={p.active} onActive={p.onActive} presets={p.presets} presetId={p.presetId} onPreset={p.onPreset} onOpen={p.onOpenPair} onAll={p.onAllMatches} onClose={p.onClearPick} />
                </div>
              )}
            </HeroGlobes>
          </div>
          {p.pair && !p.auto && (
            <div className="lg:hidden">
              <HomePair pair={p.pair} chips={p.chips} active={p.active} onActive={p.onActive} presets={p.presets} presetId={p.presetId} onPreset={p.onPreset} onOpen={p.onOpenPair} onAll={p.onAllMatches} onClose={p.onClearPick} />
            </div>
          )}
          <div className="flex flex-col justify-center px-5 pb-10 pt-2 sm:px-10 lg:order-1 lg:pb-0 lg:pl-16 lg:pr-6 lg:pt-14">
            <h2 className="display-l text-[28px] sm:text-[34px] lg:text-[46px] lg:leading-[1.05]">Find where on Earth to rehearse a Moon or Mars base.</h2>
            <p className="mt-3 max-w-[42ch] text-[15px] leading-[24px] text-muted lg:mt-5">
              Pick a landing site or a planned base on the Moon or Mars. SBATS ranks every {p.earth.meta.resolutionDeg}° cell of Earth&rsquo;s land by how well it stands in for it, and shows where the match fails.
            </p>
            <div className="mt-6 flex flex-col items-start gap-5 lg:mt-9">
              <button type="button" onClick={p.onFind} className="btn btn-primary !h-14 !min-h-14 w-full max-w-[320px] !justify-between !px-6 !text-[17px] !font-semibold">
                Find analog <ArrowRight size={18} aria-hidden="true" />
              </button>
              <p className="text-[14px] leading-5 text-muted">Pick a place. See where on Earth. Open the match.</p>
              <button type="button" onClick={() => p.onFeatured()} className="link-rule text-[17px] font-medium text-text">
                Featured sites
              </button>
            </div>
          </div>
          <dl className="pointer-events-none absolute bottom-7 left-16 z-10 hidden gap-9 lg:flex">
            {[
              [p.earth.cells.length.toLocaleString('en-US'), 'land cells scored'],
              [String(p.places.length), 'places on the Moon and Mars'],
              [String(p.presets.length), 'ways to rank'],
            ].map(([n, t]) => (
              <div key={t}>
                <dt className="display text-[26px] leading-none text-text">{n}</dt>
                <dd className="mt-1 text-[12px] text-muted">{t}</dd>
              </div>
            ))}
          </dl>
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

        <TopScan target={p.target} onOpen={p.onOpenMatch} />

        {/* 3. How it works, the data, the method and its limits. */}
        <HomeStory
          earth={p.earth}
          results={p.results}
          targetName={p.target.name}
          targetId={p.target.id}
          places={p.places}
          placeCount={p.places.length}
          extracts={p.extracts}
          leadImage={leadImage ? dataUrl(leadImage.file) : null}
          onMethod={p.onMethod}
          onValidation={p.onValidation}
          onFind={p.onFind}
        />

      </main>
    </div>
  );
}

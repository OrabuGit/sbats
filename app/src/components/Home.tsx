import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChartScatter, Layers, Mountain, Route, Search } from 'lucide-react';
import type { CellSummary, EarthFile } from '../types';
import { loadExtra } from '../data/access';
import { formatCoords } from '../lib/geo';
import { ConfidenceBadge } from './Badges';
import { dataUrl, type ExtractIndex, type SitesFile } from '../data/sites';
import type { StoryPair } from '../lib/storyPairs';
import { StoryPairs } from './StoryPairs';
import { useAsync } from '../lib/useAsync';
import { countryKey, useCountries } from '../lib/where';
import { HeroGlobes, type HeroLink, type HeroPick, type HeroPlace, type HeroSite } from './HeroGlobes';
import { HomePair, type PairInfo } from './HomePair';
import { HomeStory, Reveal } from './HomeStory';
import { SiteFooter } from './SiteFooter';
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
  onTour: () => void;
  onExplore: () => void;
  /** Opens a feature straight away on the Tambora and Shackleton pair. */
  onFeature: (kind: 'matches' | 'compare' | 'terrain' | 'route' | 'explore') => void;
  onCustom: () => void;
  onAiUse: () => void;
  onValidation: () => void;
  /** The tool's verdict for each team story pair, from pairVerdict() in lib/storyPairs.ts. */
  pairs?: StoryPair[];
  /** Opens the site page of a featured site. Falls back to onFeatured(id). */
  onSitePair?: (siteId: string) => void;
  /** The best Earth cell overall for Shackleton rim, and the known analog it sits beside (App.tsx). */
  scanNote?: { lat: number; lon: number; score: number; near: { name: string; km: number } | null; excluded: boolean } | null;
}

/** The scan section always shows Shackleton rim, the target of the lead pair, whatever target is selected. */
const SCAN_TARGET = 'moon-shackleton-rim';

/** Transparent navigation: no bar, no border. It takes a solid background only once the page has moved under it. */
function HomeNav({ solid, nav }: { solid: boolean; nav: Parameters<typeof NavRight>[0] }) {
  return (
    <header className={`absolute inset-x-0 top-0 z-30 flex flex-wrap items-center justify-between gap-x-3 px-3 transition-colors duration-300 sm:px-8 ${solid ? 'bg-bg' : 'bg-transparent'}`}>
      <h1 className="m-0 flex h-14 items-center sm:h-[72px]">
        <span className="sr-only">SBATS</span>
        <Logo height={28} />
      </h1>
      <div className="w-full min-w-0 xl:w-auto">
        <NavRight {...nav} />
      </div>
    </header>
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

/** The three best new Earth places for Shackleton rim, from data/discoveries.json. */
function TopScan({ note, onOpen }: { note: Props['scanNote']; onOpen: (lat: number, lon: number, id: string) => void }) {
  const disc = useAsync(() => loadExtra<Discoveries>('discoveries.json'), 'home-top-scan');
  const entry = disc.status === 'ready' ? (disc.value?.targets.find((t) => t.target === SCAN_TARGET) ?? null) : null;
  const picks = entry?.top.filter((x) => x.isNew).slice(0, 3) ?? [];
  const targetName = entry?.name ?? 'Shackleton rim';
  const names = useCountries(picks);
  if (disc.status === 'ready' && picks.length === 0) return null;
  return (
    <section aria-labelledby="h-top-scan" className="mt-16 px-5 sm:px-10 lg:px-16">
      <Reveal>
        <h2 id="h-top-scan" className="display text-[19px] leading-6 sm:text-[21px] sm:leading-7">
          Best new places: far from any known analog
        </h2>
        <p className="mt-1 max-w-[72ch] text-[13px] leading-5 text-muted">
          Against {targetName}, Base weights. Ranks skip numbers because only high and medium confidence places count, only one place is kept in any 250 km, and only places more than 500 km from every known analog are listed here.
          {note?.excluded && note.near && (
            <>
              {' '}
              The top-scoring place, <span className="num">{formatCoords(note.lat, note.lon)}</span> (score <span className="num">{Math.round(note.score)}</span>), is left out: it lies about{' '}
              <span className="num">{Math.round(note.near.km).toLocaleString('en-US')}</span> km from {note.near.name}, a known analog.
            </>
          )}
        </p>
      </Reveal>
      <ol className="mt-5 grid gap-x-10 gap-y-7 md:grid-cols-3">
        {disc.status === 'loading' &&
          [0, 1, 2].map((k) => (
            <li key={k} className="min-h-[200px] animate-pulse motion-reduce:animate-none" aria-hidden="true">
              <div className="h-3 w-16 bg-line" />
              <div className="mt-3 h-10 w-24 bg-line" />
              <div className="mt-4 h-4 w-32 bg-line" />
              <div className="mt-2 h-3 w-44 bg-line" />
              <div className="mt-5 h-3 w-full bg-line" />
            </li>
          ))}
        {picks.map((p, i) => (
          <li key={`${p.lat},${p.lon}`}>
            <Reveal i={i}>
              <p className="text-[12px] text-muted">Rank {p.rank.toLocaleString('en-US')}</p>
              <p className="display mt-1 text-[28px] leading-none text-text">
                {p.score.toFixed(0)}
                <span className="ml-1.5 text-[12px] font-normal text-muted">/ 100</span>
              </p>
              <p className="mt-2 text-[14px] font-medium text-text">{names.get(countryKey(p.lat, p.lon)) ?? 'Open land'}</p>
              <p className="text-[13px] text-muted">{formatCoords(p.lat, p.lon)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <ConfidenceBadge confidence={p.confidence} />
                {p.isNew && (
                  <span className="text-[13px] font-semibold leading-[18px] text-accent" title={p.nearestKnown ? `${Math.round(p.nearestKnown.km).toLocaleString('en-US')} km from ${p.nearestKnown.name}` : undefined}>
                    New{p.nearestKnown ? `, ${Math.round(p.nearestKnown.km).toLocaleString('en-US')} km from any known analog` : ''}
                  </span>
                )}
              </div>
              <p className="mt-2 text-[13px] leading-5 text-muted">
                {p.stability
                  ? `Stable: rank ${p.stability.rankP05} to ${p.stability.rankP95} in nine of ten redraws of the weights, in the top 10 in ${Math.round(p.stability.shareInTop10 * 100)}% of them.`
                  : 'No stability figure for this place.'}
              </p>
              <button type="button" onClick={() => onOpen(p.lat, p.lon, SCAN_TARGET)} className="link-rule mt-3 inline-flex min-h-11 items-center text-[14px] font-medium text-text">
                Open the match
              </button>
            </Reveal>
          </li>
        ))}
      </ol>
      <Reveal className="mt-8">
        <p className="max-w-[72ch] text-[13px] leading-5 text-muted">
          These are the tool&rsquo;s own all-round picks. The team&rsquo;s sites above are offered for specific properties, such as rock type and landform, not as all-round matches.
        </p>
      </Reveal>
    </section>
  );
}

/** The home page: three globes, the two ways in, the featured sites, then how it works. */
export function Home(p: Props) {
  const scroller = useRef<HTMLElement>(null);
  const [solid, setSolid] = useState(false);
  // Width of one scoring grid square in km (0.5 degree of latitude is about 55 km).
  const cellKm = Math.floor(p.earth.meta.resolutionDeg * 111);
  // The Tambora image is the backdrop of the story section further down.
  const leadImage = p.extracts?.items.find((i) => i.id === 'id-tambora-caldera')?.image ?? p.extracts?.items.find((i) => i.image && p.sites?.sites.some((x) => x.id === i.id && x.kind === 'candidate'))?.image ?? null;

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
          onTour: p.onTour,
          onFind: p.onFind,
          onExplore: p.onExplore,
          onCustom: p.onCustom,
          onValidation: p.onValidation,
          savedCount: p.savedCount,
          savedOpen: false,
          onSaved: p.onSaved,
          demoRunning: p.demo !== null,
          demoLabel: p.demo,
          onDemo: p.onDemo,
        }}
      />
      <main ref={scroller} className="scroll min-h-0 flex-1 bg-bg" aria-label="SBATS home">
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
              Pick a landing site or a planned base on the Moon or Mars. SBATS ranks {`every ${cellKm} km square`} of Earth&rsquo;s land by how well it stands in for it, and shows where the match fails.
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

        {/* 1b. What you can do: each card opens the feature on the Tambora and Shackleton pair. */}
        <section aria-labelledby="h-can" className="px-5 pb-6 pt-20 sm:px-10 lg:px-16">
          <Reveal>
            <h2 id="h-can" className="display-l text-[30px] sm:text-[44px]">
              What you can do
            </h2>
            <p className="mt-2 max-w-[56ch] text-[15px] leading-6 text-muted">Each one opens on a real pair: Mount Tambora in Indonesia against Shackleton rim on the Moon.</p>
          </Reveal>
          <ul className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
            {(
              [
                ['matches', Search, 'Find matches', 'Every land square of Earth scored against a Moon or Mars place, as a map and a ranked list.'],
                ['compare', Layers, 'Compare factor by factor', 'Rock, terrain, climate, bare ground and sunlight, each with both values and a verdict.'],
                ['terrain', Mountain, 'Fly the terrain', 'Both places as 3D terrain at one scale, with surfaces, contours and a low sun.'],
                ['route', Route, 'Plan a rover route', 'A route over the real elevation grid that avoids slopes the rover cannot climb.'],
                ['explore', ChartScatter, 'Explore the data', 'Every Earth square on any two factors, with the target and the best matches marked.'],
              ] as const
            ).map(([kind, Icon, title, line], i) => (
              <li key={kind}>
                <Reveal i={i}>
                  <button type="button" onClick={() => p.onFeature(kind)} className="group block text-left">
                    <span className="block border-t-2 border-line pt-4 transition-colors group-hover:border-accent">
                      <Icon size={28} strokeWidth={1.5} aria-hidden="true" className="mb-3 text-muted transition-colors group-hover:text-accent motion-reduce:transition-none" />
                      <span className="display block text-[22px] leading-7 text-text">{title}</span>
                      <span className="mt-2 block text-[14px] leading-[22px] text-muted">{line}</span>
                      <span className="link-rule mt-4 inline-block text-[14px] font-medium text-text">Try it</span>
                    </span>
                  </button>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        {/* 2. Featured sites: the team's five pairs, each with the tool's own verdict. */}
        <StoryPairs pairs={p.pairs} sites={p.sites} extracts={p.extracts} cellKm={cellKm} onSite={(id) => (p.onSitePair ? p.onSitePair(id) : p.onFeatured(id))} onAll={() => p.onFeatured()} />

        <TopScan note={p.scanNote ?? null} onOpen={p.onOpenMatch} />

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
        <SiteFooter onAiUse={p.onAiUse} />
      </main>
    </div>
  );
}

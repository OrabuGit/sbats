import { flushSync } from 'react-dom';
import { Suspense, lazy, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { loadData, loadExtra, onEarthProgress, type DataBundle } from './data/access';
import { FACTOR_IDS, FACTOR_KEYS, type FactorId, type Target, type Weights } from './types';
import { PRESETS, PURPOSES, createScorer, purposeWeights, type PurposeId } from './lib/scoringAdapter';
import { buildIndex, distanceKm, formatCoords, siteCode } from './lib/geo';
import { keyLabel, metaByKey, reasonLine, shortName } from './lib/format';
import { NEW_DISTANCE_KM, isNewSite, percentile, tally, topCandidates } from './lib/rank';
import { TopBar, type Step } from './components/Chrome';
import type { MatchMode } from './components/LeftPanel';
import { activityOf } from './components/ActivityArt';
import type { Tool } from './components/MatchDetail';
import { MatchesStep } from './components/MatchesStep';
import { DEFAULT_TARGET_ID } from './lib/defaults';
import { rankOf, stabilityWord } from './lib/rankText';
import { profileOf, type Profile } from './lib/profile';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PickWorld } from './components/PickWorld';
import { CustomStep } from './components/CustomStep';
import { AiUsePage } from './components/AiUsePage';
import { ExplorePage } from './components/ExplorePage';
import { PlaceStep } from './components/PlaceStep';
import type { ListMode } from './components/CandidateList';
import { Dossier } from './components/Dossier';
import { MethodPage } from './components/MethodPage';
import { ValidationPage } from './components/ValidationPage';
import { Absent, InfoShell, Loading } from './components/InfoParts';
import { SitePage } from './components/SitePage';
import { loadExtracts, loadSites, type FeaturedSite } from './data/sites';
import { bestMonth } from './lib/bestMonth';
import { flags } from './flags';
import { Sandbox, type SandboxHandle } from './components/Sandbox';
import type { HeroLink, HeroPick, HeroSite } from './components/HeroGlobes';
import { HomePair, type PairInfo } from './components/HomePair';
import { countryKey, useCountries } from './lib/where';
import { storiesFor, useStories } from './data/stories';
import { pairVerdict } from './lib/storyPairs';
import { GuidedTour } from './components/GuidedTour';
import { Home } from './components/Home';
import { SavedPage } from './components/SavedPage';
import { Logo } from './components/Logo';
import { WorldPage } from './components/WorldPage';
import { TerrainPage, type RoversFile } from './components/TerrainPage';
import { Report } from './components/Report';
import { FeaturedPage } from './components/FeaturedPage';
import { MatchDetail } from './components/MatchDetail';
import type { WorldId } from './components/worldInfo';
import { savedId, useSaved, type SavedLocation } from './lib/saved';
import { targetFromKnownSite, targetFromPoint, type BodyGrid, type KnownSitesFile, type TargetProfile } from './lib/matchAdapter';
import { getRoutes, routeKey } from './lib/layoutStore';
import { loadTargetEnvironment, loadTargetMinerals, loadTargetWindows, matchRecord, stability as rankStability, type StabilityResult } from './lib/matchAdapter';
import { annualSolar, loadModules, loadSiteClimate } from './data/sandbox';
import { useAsync } from './lib/useAsync';
import { decodeLayout, layoutFromJson, type SavedLayout } from './lib/simAdapter';

// The globe (three.js and globe.gl) is by far the largest part of the app. It is its own chunk. It starts
// downloading when the browser is idle after the home page has drawn, so it never competes with the first screen.
let globeModuleP: Promise<typeof import('./components/GlobeView')> | null = null;
const globeModule = { then: <T,>(f: (m: typeof import('./components/GlobeView')) => T) => (globeModuleP ??= import('./components/GlobeView')).then(f) };
const prefetchGlobe = () => void (globeModuleP ??= import('./components/GlobeView'));
const learnModule = () => import('./components/LearnPage').then((m) => ({ default: m.LearnPage }));
const LearnPage = lazy(learnModule);
// Once the first screen is drawn, fetch the globe and the Learn page while the browser is idle, so opening them is not a wait.
const prefetchLater = () => (window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 2500)))(() => { prefetchGlobe(); void learnModule(); }, { timeout: 8000 });
const GlobeView = lazy(() => globeModule.then((m) => ({ default: m.GlobeView })));

const PAGE_HASH: Partial<Record<View, string>> = { explore: 'explore', validation: 'validation', method: 'method', learn: 'learn', saved: 'saved', featured: 'featured', custom: 'custom', aiuse: 'ai-assistance', orbit: 'find' };
/** The page named by the address, or home. Pages that need a chosen match or site are not restorable and open home. */
function viewFromHash(): View {
  const h = window.location.hash.replace(/^#\/?/, '');
  const hit = (Object.entries(PAGE_HASH) as [View, string][]).find(([, v]) => v === h);
  return hit ? hit[0] : 'home';
}

type View = 'home' | 'custom' | 'aiuse' | 'explore' | 'saved' | 'orbit' | 'match' | 'recon' | 'method' | 'validation' | 'site' | 'featured' | 'world' | 'report' | 'terrain' | 'learn';
const KIND_LABEL = { candidate: 'Proposed site', known: 'Known analog', negative: 'Negative control' } as const;

const LIST_LIMIT = 15;
const MAP_MARKERS = 10;

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: DataBundle };

/** The loading screen: the logo, a bar that fills as the Earth data arrives, and the share received. */
function Splash() {
  const [p, setP] = useState<number | null>(null);
  useEffect(() => onEarthProgress(setP), []);
  const pct = p === null ? null : Math.round(p * 100);
  return (
    <div className="splash" role="status" aria-label="Loading">
      <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="SBATS" />
      <i style={pct === null ? undefined : ({ '--p': `${pct}%` } as React.CSSProperties)} data-det={pct === null ? undefined : ''} />
      <p>{pct === null ? 'Loading Earth data' : `Loading Earth data ${pct}%`}</p>
    </div>
  );
}

export default function App() {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    loadData().then(
      (data) => alive && setLoad({ status: 'ready', data }),
      (e) => alive && setLoad({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (load.status === 'ready') prefetchLater();
  }, [load.status]);

  // While the data loads: the same splash as the page ships with (see index.html), so nothing is drawn in pieces.
  if (load.status !== 'ready') {
    if (load.status === 'error')
      return (
        <div className="flex h-full items-center justify-center bg-bg px-6">
          <div role="alert" className="max-w-[60ch]">
            <Logo height={26} />
            <p className="mt-6 text-[16px] font-medium text-text">The data could not be loaded</p>
            <p className="mt-2 text-[14px] text-muted">{load.message}</p>
            <p className="mt-2 text-[13px] text-muted">The app reads its data files from the data folder next to this page. Check the connection and try again.</p>
            <button type="button" onClick={() => window.location.reload()} className="btn mt-5">
              Reload
            </button>
          </div>
        </div>
      );
    return <Splash />;
  }
  return <Orbit data={load.data} />;
}

/** Runs a state change inside a view transition, so the screens cross-fade instead of jumping. */
function transition(fn: () => void) {
  type VT = { ready?: Promise<void>; finished?: Promise<void>; updateCallbackDone?: Promise<void>; skipTransition?: () => void };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => VT };
  // A hidden page never finishes a transition: change the screen directly.
  if (!doc.startViewTransition || document.visibilityState !== 'visible' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return fn();
  const t = doc.startViewTransition(() => flushSync(fn));
  // However slow the new screen is to draw, never leave the old one frozen over it.
  window.setTimeout(() => t.skipTransition?.(), 900);
  // A transition skipped because another began is normal, not an error.
  t.ready?.catch(() => {});
  t.finished?.catch(() => {});
  t.updateCallbackDone?.catch(() => {});
}

function Orbit({ data }: { data: DataBundle }) {
  const { earth, targets, analogs, lithology } = data;

  const [targetId, setTargetIdRaw] = useState((targets.find((t) => t.id === DEFAULT_TARGET_ID) ?? targets[0]).id);
  // A target built from a clicked point or a named place with no curated target (lib/targets).
  const [pointProfile, setPointProfile] = useState<TargetProfile | null>(null);
  // Conditions the person set by hand (the Custom option beside the Moon and Mars). Any other target replaces it.
  const [customTarget, setCustomTarget] = useState<Target | null>(null);
  // Choosing a listed base site always leaves any picked point.
  const setTargetId = useCallback((id: string) => {
    setPointProfile(null);
    setCustomTarget(null);
    setTargetIdRaw(id);
  }, []);
  const [presetId, setPresetId] = useState<string | null>(PRESETS[0].id);
  const [sliderWeights, setWeights] = useState<Weights>(PRESETS[0].weights);
  const [matchMode, setMatchMode] = useState<MatchMode>('all');
  const [purposeId, setPurposeId] = useState<PurposeId>(PURPOSES[0].id);
  // In purpose mode the weights are fixed by the purpose. The sliders keep their own values for the way back.
  // Sunlight needs a place on a body, which a custom search does not have: it is left out.
  const baseWeights = matchMode === 'purpose' ? purposeWeights(purposeId) : sliderWeights;
  const weights = customTarget ? { ...baseWeights, sunlight: 0 } : baseWeights;
  const purpose = matchMode === 'purpose' ? (PURPOSES.find((p) => p.id === purposeId) ?? null) : null;
  const choosePreset = useCallback((id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    setWeights(p.weights);
    setMatchMode('all');
  }, []);
  const [selected, setSelected] = useState<number | null>(null);
  const [includeLow, setIncludeLow] = useState(false);
  const [mode, setMode] = useState<ListMode>('ranked');
  // The pair picked on the home globes, and which of its links is shown in the strip.
  const [homePick, setHomePick] = useState<HeroPick>(null);
  const [homeActive, setHomeActive] = useState(0);
  // During a fast scroll every transition snaps (class on <html>), so nothing is caught half-way when the page stops.
  useEffect(() => {
    const root = document.documentElement;
    const last = new WeakMap<EventTarget, { y: number; t: number }>();
    let timer = 0;
    const on = (e: Event) => {
      const el = e.target as HTMLElement | Document;
      const y = el instanceof Document ? window.scrollY : el.scrollTop;
      const now = performance.now();
      const prev = last.get(el);
      last.set(el, { y, t: now });
      if (prev && now - prev.t > 0 && Math.abs(y - prev.y) / (now - prev.t) > 2.2) {
        root.classList.add('scroll-fast');
        window.clearTimeout(timer);
        timer = window.setTimeout(() => root.classList.remove('scroll-fast'), 180);
      }
    };
    window.addEventListener('scroll', on, { capture: true, passive: true });
    return () => {
      window.removeEventListener('scroll', on, true);
      window.clearTimeout(timer);
      root.classList.remove('scroll-fast');
    };
  }, []);

  // While nobody is using the globes, the hero walks through the pairs by itself. A touch pauses it for half a minute.
  const [homeAuto, setHomeAuto] = useState(true);
  const resumeTimer = useRef<number>(0);
  const userTouch = useCallback(() => {
    setHomeAuto(false);
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setHomeAuto(true), 30000);
  }, []);
  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);
  // On the Matches step: the Earth cell previewed in the strip, before it is opened.
  const [preview, setPreview] = useState<number | null>(null);
  const [tab, setTab] = useState<'setup' | 'results'>('setup');
  const [focus, setFocus] = useState<{ lat: number; lon: number; seq: number; arrive?: boolean; close?: boolean } | null>(null);
  const [demo, setDemo] = useState<string | null>(null);
  // Steps: 1 world, 2 place, 3 matches, 4 match. Home and the reference pages are views outside the steps.
  const [step, setStep] = useState<Step>(1);
  const [view, setView] = useState<View>(() => viewFromHash());
  // Page-level state lives in the address (#/explore, #/validation ...), so Back moves within the app and a reload stays on the page.
  useEffect(() => {
    const h = view === 'home' ? '' : (PAGE_HASH[view] ?? null);
    if (h === null) return;
    const want = h === '' ? `${window.location.pathname}${window.location.search}` : `#/${h}`;
    const have = window.location.hash;
    if ((h === '' && have === '') || (h !== '' && have === `#/${h}`)) return;
    try {
      window.history.pushState(null, '', want);
    } catch {
      /* the address cannot be changed here; the app still works */
    }
  }, [view]);
  useEffect(() => {
    const on = () => setView(viewFromHash());
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [worldPage, setWorldPage] = useState<WorldId>('moon');
  const [sharedLayout, setSharedLayout] = useState<SavedLayout | null>(null);
  const sandboxRef = useRef<SandboxHandle>(null);
  const modules = useAsync(loadModules, 'modules');
  const climate = useAsync(loadSiteClimate, 'climate');
  const sitesFile = useAsync(loadSites, 'sites');
  const extracts = useAsync(loadExtracts, 'extracts');
  const saved = useSaved();
  const targetWindows = useAsync(loadTargetWindows, 'target-windows');
  const knownSites = useAsync(() => loadExtra<KnownSitesFile>('known_sites.json'), 'known-sites');
  const [placeId, setPlaceId] = useState<string | null>(null);
  // Global grids of the Moon and Mars, fetched when step 2 first opens. null for a body whose grid is not published.
  const gridsWanted = flags.anyPoint && ((view === 'orbit' && step >= 2) || view === 'match') ? 'yes' : 'no';
  const gridsLoaded = useRef(false);
  if (gridsWanted === 'yes') gridsLoaded.current = true;
  const grids = useAsync(
    async () => (gridsLoaded.current ? { moon: await loadExtra<BodyGrid>('moon.json'), mars: await loadExtra<BodyGrid>('mars.json') } : { moon: null, mars: null }),
    `grids-${gridsLoaded.current}`,
  );
  const gridOf = useCallback((b: 'moon' | 'mars') => (grids.status === 'ready' ? grids.value[b] : null), [grids]);
  const rockClasses = useMemo(() => (earth.meta.factors.find((f) => f.key === 'lithology')?.classes ?? []).map((c) => c.code), [earth]);
  const rovers = useAsync(() => loadExtra<RoversFile>('rovers.json'), 'rovers');
  const targetMinerals = useAsync(loadTargetMinerals, 'target-minerals');
  const targetEnv = useAsync(loadTargetEnvironment, 'target-environment');
  const [scale, setScale] = useState<'grid' | 'site'>('grid');
  const [stab, setStab] = useState<{ key: string; result: StabilityResult } | null>(null);
  const fixtureAllowed = !import.meta.env.PROD || new URLSearchParams(window.location.search).has('sandbox');
  const reconReady = flags.recon && modules.status === 'ready' && (!modules.value.fixture || fixtureAllowed);

  useEffect(() => {
    if (pointProfile) setCustomTarget(null);
  }, [pointProfile]);
  const target = pointProfile?.target ?? customTarget ?? targets.find((t) => t.id === targetId) ?? targets.find((t) => t.id === DEFAULT_TARGET_ID) ?? targets[0];
  const meta = useMemo(() => metaByKey(earth), [earth]);
  const index = useMemo(() => buildIndex(earth), [earth]);
  const scorer = useMemo(() => createScorer(earth, lithology), [earth, lithology]);

  const ts = useMemo(() => scorer.forTarget(target), [scorer, target]);

  const liveWeights = useDeferredValue(weights);
  const results = useMemo(() => ts.scoreAll(liveWeights), [ts, liveWeights]);
  const counts = useMemo(() => tally(results), [results]);
  const candidates = useMemo(
    () => topCandidates(earth, results, analogs, { includeLow, limit: LIST_LIMIT }),
    [earth, results, analogs, includeLow],
  );
  // When nothing can be scored, say exactly which input is holding it back.
  const emptyReason = useMemo(() => {
    if (counts.high + counts.medium > 0) return null;
    const unbuilt = FACTOR_KEYS.filter((k) => earth.cells.every((c) => c[k] === null || c[k] === undefined));
    if (counts.scored > 0) {
      const names = unbuilt.map((k) => keyLabel(k, meta));
      const noTarget = FACTOR_KEYS.filter((k) => target.values[k]?.value == null && !unbuilt.includes(k)).map((k) => keyLabel(k, meta));
      const why = [
        names.length > 0 ? `${names.join(', ')} ${names.length > 1 ? 'are' : 'is'} not in the Earth grid yet` : '',
        noTarget.length > 0 ? `${target.name} has no published value for ${noTarget.join(', ')}` : '',
      ].filter(Boolean);
      return `All ${counts.scored.toLocaleString('en-US')} scored cells are low confidence${why.length > 0 ? `: ${why.join(', and ')}` : ''}. Tick "Include low confidence cells" to list them.`;
    }
    // Bare ground can come from NDVI or, where NDVI is null, from the barren share of land cover.
    const noBare = unbuilt.includes('ndvi') && earth.cells.every((c) => c.barrenFrac == null);
    const requiredUnbuilt = unbuilt.filter((k) => (k === 'ndvi' && noBare) || k === 'precip').map((k) => keyLabel(k, meta));
    const requiredNoTarget = (['ndvi', 'precip'] as const).filter((k) => target.values[k]?.value == null).map((k) => keyLabel(k, meta));
    const parts = ['No cell can be scored yet.'];
    if (requiredUnbuilt.length > 0)
      parts.push(
        `${requiredUnbuilt.join(' and ')} ${requiredUnbuilt.length > 1 ? 'have' : 'has'} no data in any cell of the Earth grid, and bare ground and precipitation are both required before a cell gets a score.`,
      );
    if (requiredNoTarget.length > 0) parts.push(`${target.name} has no published value for ${requiredNoTarget.join(' and ')}, which is required.`);
    if (requiredUnbuilt.length === 0 && requiredNoTarget.length === 0)
      parts.push('The factors with data cover less than 60% of the weight for every cell. Try another preset or target.');
    const others = unbuilt.filter((k) => k !== 'ndvi' && k !== 'precip').map((k) => keyLabel(k, meta));
    if (others.length > 0) parts.push(`Also not built yet: ${others.join(', ')}.`);
    return parts.join(' ');
  }, [counts, earth, meta, target]);

  const mapCandidates = useMemo(() => candidates.slice(0, MAP_MARKERS), [candidates]);
  const sites = useMemo(
    () => analogs.map((analog) => ({ analog, index: index.nearest(analog.lat, analog.lon, 2) })),
    [analogs, index],
  );
  const mapSites = useMemo(() => sites.filter((s) => s.index >= 0), [sites]);
  const explain = useCallback((i: number) => ts.explain(earth.cells[i], liveWeights), [ts, earth, liveWeights]);

  const leftRef = useRef<HTMLElement>(null);
  const seq = useRef(0);

  // Opening a cell is step 4: the match page.
  const select = useCallback(
    (i: number, fly = true) => {
      if (i < 0) return;
      transition(() => {
        setSelected(i);
        setStep(4);
        setView('match');
      });
      if (fly) setFocus({ lat: earth.cells[i].lat, lon: earth.cells[i].lon, seq: ++seq.current });
    },
    [earth],
  );
  // A pin on the Earth globe: compare it in the strip first, and open it from there.
  const previewFromGlobe = useCallback(
    (i: number) => {
      if (i < 0) return;
      setPreview(i);
      setFocus({ lat: earth.cells[i].lat, lon: earth.cells[i].lon, seq: ++seq.current });
    },
    [earth],
  );
  // Choosing a match on the Earth globe: fly down to it first, then cross-fade to its page.
  const openFromGlobe = useCallback(
    (i: number) => {
      if (i < 0) return;
      const cell = earth.cells[i];
      setSelected(i);
      setFocus({ lat: cell.lat, lon: cell.lon, seq: ++seq.current, close: true });
      window.setTimeout(() => select(i, false), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1000);
    },
    [earth, select],
  );

  // Step 2 to step 3: leave the Moon or Mars globe and arrive over the best-matching part of Earth.
  const arriving = useRef(false);
  const goToEarth = useCallback((id?: string) => {
    if (id) setTargetId(id);
    arriving.current = true;
    setPreview(null);
    transition(() => {
      setSelected(null);
      setView('orbit');
      setStep(3);
      setTab('results');
    });
  }, []);
  useEffect(() => {
    if (!arriving.current || step !== 3) return;
    arriving.current = false;
    const top = candidates[0] ? earth.cells[candidates[0].index] : null;
    setFocus({ lat: top?.lat ?? 5, lon: top?.lon ?? 105, seq: ++seq.current, arrive: true });
  }, [step, candidates, earth]);

  // Open the grid cell nearest to a point, against the given target.
  const openSite = useCallback(
    (lat: number, lon: number, id: string) => {
      const i = index.nearest(lat, lon, 2);
      if (i < 0) return;
      setTargetId(id);
      select(i);
    },
    [index, select, setTargetId],
  );

  // Step 2 places: the named places of known_sites.json, those with measured values first, then any
  // target no named place points at. Until that file is published the targets themselves are the places.
  const places = useMemo(() => {
    const known = knownSites.status === 'ready' && knownSites.value ? knownSites.value.sites : [];
    const linked = new Set(known.map((k) => k.targetId).filter(Boolean));
    const rows = [
      ...known.map((k) => ({
        id: k.id,
        name: k.name,
        body: k.body,
        lat: k.lat,
        lon: k.lon,
        hasValues: (!!k.targetId && targets.some((t) => t.id === k.targetId)) || gridOf(k.body) !== null,
        targetId: k.targetId ?? null,
        sub: [k.mission ?? k.status, k.date].filter(Boolean).join(' · '),
        line: `${k.status.charAt(0).toUpperCase()}${k.status.slice(1)}${k.mission ? `, ${k.mission}` : ''}${k.date ? `, ${k.date}` : ''}.`,
        source: k.source,
        url: k.url || null,
      })),
      ...targets
        .filter((t) => !linked.has(t.id))
        .map((t) => ({ id: t.id, name: t.name, body: t.body, lat: t.lat, lon: t.lon, hasValues: true, targetId: t.id as string | null, sub: 'Base site in the data', line: '', source: '', url: null as string | null })),
    ];
    // A clicked point is a place of its own while it is the target.
    if (pointProfile && !known.some((k) => k.id === placeId))
      rows.push({
        id: pointProfile.target.id,
        name: pointProfile.target.name,
        body: pointProfile.target.body,
        lat: pointProfile.target.lat,
        lon: pointProfile.target.lon,
        hasValues: pointProfile.origin !== 'none',
        targetId: null,
        sub: 'Picked on the globe',
        line: '',
        source: '',
        url: null,
      });
    // Places linked to a measured base site first, then the rest in file order.
    return rows.sort((a, b) => Number(!!b.targetId) - Number(!!a.targetId));
  }, [knownSites, targets, gridOf, pointProfile, placeId]);
  const place = places.find((p) => p.id === placeId) ?? (pointProfile ? places.find((p) => p.id === pointProfile.target.id) : places.find((p) => p.targetId === targetId)) ?? null;
  const profileOptions = useCallback(
    (b: 'moon' | 'mars') => ({ grid: gridOf(b), curated: targets, knownSites: knownSites.status === 'ready' && knownSites.value ? knownSites.value.sites : [], rockClasses }),
    [gridOf, targets, knownSites, rockClasses],
  );
  const pickPlace = useCallback(
    (id: string) => {
      const p = places.find((x) => x.id === id);
      if (!p) return;
      setPlaceId(id);
      if (p.targetId && targets.some((t) => t.id === p.targetId)) return setTargetId(p.targetId);
      // A named place with no curated target: build its target from the body's grid, when there is one.
      const site = knownSites.status === 'ready' ? knownSites.value?.sites.find((k) => k.id === id) : undefined;
      if (!site || gridOf(site.body) === null) return;
      try {
        setPointProfile(targetFromKnownSite(site, profileOptions(site.body)));
      } catch {
        setPointProfile(null);
      }
    },
    [places, targets, knownSites, gridOf, profileOptions, setTargetId],
  );
  // Any point on the Moon or Mars: a target from the grid cell that holds it.
  const pickPoint = useCallback(
    (b: 'moon' | 'mars', lat: number, lon: number) => {
      if (!flags.anyPoint || gridOf(b) === null) return false;
      try {
        const profile = targetFromPoint(b, lat, lon, profileOptions(b));
        if (profile.origin === 'curated') {
          setPlaceId(null);
          setTargetId(profile.target.id);
        } else {
          setPlaceId(null);
          setPointProfile(profile);
        }
        return true;
      } catch {
        return false;
      }
    },
    [gridOf, profileOptions, setTargetId],
  );

  const pickWorld = useCallback(
    (w: WorldId) => {
      if (w === 'earth') return;
      if (target.body !== w || (place && place.body !== w)) {
        const first = places.find((p) => p.body === w && p.hasValues && (p.targetId === DEFAULT_TARGET_ID || p.id === DEFAULT_TARGET_ID)) ?? places.find((p) => p.body === w && p.hasValues);
        if (first) pickPlace(first.id);
      }
      transition(() => {
        setSelected(null);
        setView('orbit');
        setStep(2);
        setTab('setup');
      });
    },
    [target, place, places, pickPlace],
  );

  const timers = useRef<number[]>([]);
  const stopDemo = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setDemo(null);
  }, []);
  useEffect(() => stopDemo, [stopDemo]);

  // The site the demo falls back to: a proposed site, with a terrain extract if one exists.
  const extractIndex = extracts.status === 'ready' ? extracts.value : null;
  const extractIds = useMemo(() => new Set(extractIndex ? extractIndex.items.map((x) => x.id) : []), [extractIndex]);
  const featuredSite = useMemo(() => {
    const cands = sites.filter((s) => s.analog.kind === 'candidate' && s.index >= 0);
    return cands.find((s) => extractIds.has(s.analog.id)) ?? cands[0] ?? null;
  }, [sites, extractIds]);
  const featured = featuredSite?.index ?? candidates[0]?.index ?? null;
  const candidatesRef = useRef(candidates);
  candidatesRef.current = candidates;

  const openRecon = useCallback(
    (i?: number) => {
      if (!reconReady) return;
      const cellIndex = i ?? selected ?? featured;
      if (cellIndex === null) return;
      setSelected(cellIndex);
      setStep(4);
      setTab('results');
      setView('recon');
    },
    [reconReady, selected, featured],
  );

  // The guided tour: the first visit starts it, the Tour button replays it. Each step moves the app to what it is about.
  const storiesFile = useStories();
  const [tour, setTour] = useState<number | null>(null);
  const tourGo = (n: number) => {
    setTour(n);
    const shackleton = places.find((p) => p.id === 'moon-shackleton-crater') ?? places.find((p) => /shackleton/i.test(p.name) && !!p.targetId);
    const tambora = featuredSites?.sites.find((x) => x.id === 'id-tambora-caldera') ?? null;
    if (n === 0) {
      transition(() => setView('home'));
      setHomePick(null);
    } else if (n === 1) {
      if (shackleton) pickPlace(shackleton.id);
      transition(() => {
        setView('orbit');
        setStep(2);
        setTab('setup');
      });
    } else if (n === 2) {
      goToEarth();
    } else if (n === 3) {
      if (tambora) openSite(tambora.lat, tambora.lon, 'moon-shackleton-rim');
    } else if (n === 4) {
      window.setTimeout(() => document.getElementById('h-why')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
    } else if (n === 5) {
      window.setTimeout(() => document.getElementById('sec-data')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    } else if (n === 6) {
      window.setTimeout(() => document.getElementById('sec-tests')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    } else if (n === 7) {
      window.setTimeout(() => document.getElementById('sec-3d')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    } else if (n === 8) {
      if (tambora) {
        const i = index.nearest(tambora.lat, tambora.lon, 2);
        if (i >= 0) {
          setSelected(i);
          setStep(4);
          transition(() => setView('terrain'));
        }
      }
    } else {
      transition(() => setView('home'));
    }
  };
  const closeTour = useCallback(() => {
    try {
      localStorage.setItem('sbats-tour-seen', '1');
    } catch {
      // Without storage the tour simply offers itself again next visit.
    }
    setTour(null);
  }, []);
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem('sbats-tour-seen') === '1';
    } catch {
      seen = false;
    }
    if (seen || new URLSearchParams(window.location.search).has('base')) return;
    const t = window.setTimeout(() => {
      userTouch();
      setTour(0);
    }, 2600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The full 3D view of a cell against the current target. Only offered where both places have an elevation extract.
  const openTerrainFor = (i: number) => {
    const cell = earth.cells[i];
    const named = sites.find((s) => s.index === i)?.analog.id;
    const eItem = extractIndex?.items.find((x) => x.id === (named ?? siteCode(cell)));
    const tItem = extractIndex?.items.find((x) => x.id === target.id);
    if (!eItem?.elevation || !tItem?.elevation) {
      setSelected(i);
      setStep(4);
      setView('match');
      return;
    }
    setSelected(i);
    setStep(4);
    transition(() => setView('terrain'));
  };

  const runDemo = () => {
    if (demo) return stopDemo();
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    // The demo runs against the target its site is proposed for, so the comparison means something.
    const demoTarget = targets.find((t) => t.id === featuredSite?.analog.analogFor[0]) ?? target;
    setTargetId(demoTarget.id);
    setSelected(null);
    setHomePick(null);
    setMode('ranked');
    setPresetId(PRESETS[0].id);
    setWeights(PRESETS[0].weights);
    setMatchMode('all');
    setTab('setup');
    setView('home');
    setDemo('Demo: three worlds');
    at(2500, () => {
      setDemo(`Demo: a place on ${demoTarget.body === 'moon' ? 'the Moon' : 'Mars'}, ${demoTarget.name}`);
      setView('orbit');
      setStep(2);
    });
    at(5500, () => {
      setDemo('Demo: every Earth cell ranked');
      goToEarth();
    });
    at(9000, () => {
      setDemo('Demo: the top match, factor by factor');
      const top = candidatesRef.current[0]?.index;
      if (top !== undefined) select(top);
    });
    if (featured !== null) {
      at(13000, () => {
        setDemo(featuredSite ? `Demo: ${featuredSite.analog.name.split(',')[0]}, a proposed site` : 'Demo: a second match');
        select(featured);
      });
    }
    if (reconReady && featured !== null) {
      const has3d = flags.boots && !!featuredSite && extractIds.has(featuredSite.analog.id) && extractIds.has(demoTarget.id);
      at(17500, () => {
        setDemo('Demo: a base at the site');
        openRecon(featured);
      });
      at(18300, () => sandboxRef.current?.loadExample());
      at(20000, () => {
        setDemo(`Demo: the same base at ${demoTarget.name}`);
        sandboxRef.current?.deploy();
      });
      if (has3d) {
        at(21500, () => {
          setDemo('Demo: both sites as terrain, one scale');
          sandboxRef.current?.setMode('3d');
        });
      }
      at(25500, () => {
        setDemo('Demo: 30 days, day by day');
        sandboxRef.current?.setMode('plan');
        sandboxRef.current?.setDay(1);
        document.getElementById('h-time')?.scrollIntoView({ block: 'start' });
      });
      for (let i = 1; i <= 10; i++) at(25500 + i * 400, () => sandboxRef.current?.setDay(i * 3));
    }
    at(30000, () => {
      timers.current = [];
      setDemo(null);
    });
  };

  // A share link carries a layout, a target and an Earth cell. Apply it once, when the sandbox can open.
  const linkDone = useRef(false);
  useEffect(() => {
    if (linkDone.current || !reconReady) return;
    linkDone.current = true;
    const q = new URLSearchParams(window.location.search);
    const base = q.get('base');
    if (!base) return;
    try {
      const layout = decodeLayout(base);
      const t = targets.find((x) => x.id === q.get('target'));
      const [lat, lon] = (q.get('site') ?? '').split(',').map(Number);
      const i = Number.isFinite(lat) && Number.isFinite(lon) ? index.nearest(lat, lon, 1) : -1;
      if (t) setTargetId(t.id);
      setSharedLayout(layout);
      setSelected(i >= 0 ? i : featured);
      setStep(4);
      setView('recon');
    } catch {
      // A link that cannot be read opens the app as usual.
    }
  }, [reconReady, targets, index, featured]);

  // Back to the Earth globe: fly to the cell that was open, or to the best match.
  const backToEarth = useCallback(() => {
    transition(() => {
      setView('orbit');
      setStep(3);
      setTab('results');
    });
    const cell = selected !== null ? earth.cells[selected] : candidates[0] ? earth.cells[candidates[0].index] : null;
    if (cell) setFocus({ lat: cell.lat, lon: cell.lon, seq: ++seq.current, close: selected !== null });
  }, [selected, candidates, earth]);

  const onStep = (s: Step) => transition(() => onStepNow(s));
  const onStepNow = (s: Step) => {
    if (s === 4) {
      if (selected !== null) setView('match');
      return;
    }
    if (s === 3) {
      if (view === 'orbit' && step === 3) return;
      if (step < 3 || view === 'home') return goToEarth();
      return backToEarth();
    }
    if (s === 2 && customTarget) {
      setView('custom');
      setStep(2);
      return;
    }
    setView('orbit');
    setStep(s);
    setTab('setup');
    if (s === 2) leftRef.current?.querySelector<HTMLElement>('input[name="target"]:checked')?.focus();
  };

  // The two big globes are created the first time step 2 or 3 opens, not on the home screen.
  const globesNeeded = useRef(false);
  if (view === 'orbit' && step >= 2) globesNeeded.current = true;

  const selectedCell = selected !== null ? earth.cells[selected] : null;
  const explained = useMemo(() => (selected !== null ? explain(selected) : null), [selected, explain]);
  const profile = useMemo(() => (selected !== null ? ts.profile(earth.cells[selected]) : null), [selected, ts, earth]);
  const purposeScores = useMemo(() => (selected !== null ? ts.purposeScores(earth.cells[selected]) : null), [selected, ts, earth]);
  const named = selected !== null ? (sites.find((s) => s.index === selected)?.analog ?? null) : null;
  const rank = selected !== null ? (candidates.find((c) => c.index === selected)?.rank ?? null) : null;
  const pct = useMemo(
    () => (explained && explained.score !== null ? percentile(results, explained.score) : null),
    [explained, results],
  );

  const climateFile = climate.status === 'ready' ? climate.value : null;
  const featuredSites = flags.sitePages && sitesFile.status === 'ready' ? sitesFile.value : null;
  // For the home page's "Best new places": the best Earth cell for Shackleton rim overall, and the known analog it sits beside.
  // The list skips ranks because places near a known analog are left out of it.
  const scanNote = useMemo(() => {
    const t = targets.find((x) => x.id === 'moon-shackleton-rim');
    if (!t) return null;
    const res = scorer.forTarget(t).scoreAll(PRESETS[0].weights);
    let best = -1;
    let bestScore = -1;
    res.forEach((r, i) => {
      if (r.score !== null && r.confidence !== 'low' && r.score > bestScore) {
        bestScore = r.score;
        best = i;
      }
    });
    if (best < 0) return null;
    const c = earth.cells[best];
    let near: { name: string; km: number } | null = null;
    for (const a of analogs) {
      if (a.kind !== 'known') continue;
      const km = distanceKm(c.lat, c.lon, a.lat, a.lon);
      if (!near || km < near.km) near = { name: a.name.split(',')[0], km };
    }
    return { lat: c.lat, lon: c.lon, score: bestScore, near, excluded: !!near && near.km <= NEW_DISTANCE_KM };
  }, [earth, scorer, targets, analogs]);
  // The site-scale comparison of one featured site with one target: the analog profile and the match record behind it.
  const siteRecord = useCallback(
    (site: FeaturedSite, t: Target) => {
      const i = index.nearest(site.lat, site.lon, 2);
      if (i < 0) return null;
      return matchRecord({
        earth,
        lithology,
        target: t,
        cell: earth.cells[i],
        name: site.name,
        site: site as unknown as Parameters<typeof matchRecord>[0]['site'],
        targetWindows: targetWindows.status === 'ready' ? targetWindows.value : null,
        minerals: targetMinerals.status === 'ready' ? targetMinerals.value : null,
        environment: targetEnv.status === 'ready' ? targetEnv.value : null,
        profile: null,
      }).record;
    },
    [earth, lithology, index, targetWindows, targetMinerals, targetEnv],
  );
  const storyPairs = useMemo(() => pairVerdict(earth, scorer, targets, featuredSites, storiesFile, siteRecord), [earth, scorer, targets, featuredSites, storiesFile, siteRecord]);
  // The analog profile of a named place (a known analog or a team site) against the current target, for the result cards.
  const profileCache = useRef(new Map<string, Profile | null>());
  useEffect(() => {
    profileCache.current.clear();
  }, [siteRecord, target]);
  const profileOfAnalog = useCallback(
    (analogId: string, cellIndex: number): Profile | null => {
      const key = `${target.id}|${analogId}`;
      const hit = profileCache.current.get(key);
      if (hit !== undefined) return hit;
      let out: Profile | null = null;
      try {
        const analog = analogs.find((a) => a.id === analogId);
        const feat = featuredSites?.sites.find((x) => x.id === analogId) ?? null;
        if (analog && cellIndex >= 0 && target.id !== 'custom-conditions') {
          out = profileOf(
            matchRecord({
              earth,
              lithology,
              target,
              cell: earth.cells[cellIndex],
              name: analog.name,
              site: feat ? (feat as unknown as Parameters<typeof matchRecord>[0]['site']) : null,
              targetWindows: targetWindows.status === 'ready' ? targetWindows.value : null,
              minerals: targetMinerals.status === 'ready' ? targetMinerals.value : null,
              environment: targetEnv.status === 'ready' ? targetEnv.value : null,
              profile: pointProfile,
            }).record,
          );
        }
      } catch {
        out = null;
      }
      profileCache.current.set(key, out);
      return out;
    },
    [analogs, featuredSites, earth, lithology, target, targetWindows, targetMinerals, targetEnv, pointProfile],
  );
  const month = useMemo(() => {
    const months = named ? climateFile?.sites.find((x) => x.id === named.id)?.months : undefined;
    if (!months || !explained || !climateFile) return null;
    return { result: bestMonth(months, explained), source: `NASA POWER monthly climatology ${climateFile.meta.period}` };
  }, [named, climateFile, explained]);
  const namedHasPage = !!named && !!featuredSites?.sites.some((x) => x.id === named.id);
  const infoOpen = view === 'method' || view === 'validation' || view === 'site';
  const showWorld = view === 'orbit' && step === 2;
  const showEarth = view === 'orbit' && step === 3;
  const windowKm = extractIndex?.meta.windowKm ?? 20;
  // A named site has its own extract; any other cell uses the one built for it under its cell code.
  const earthExtract = extractIndex?.items.find((x) => x.id === (named?.id ?? (selectedCell ? siteCode(selectedCell) : ''))) ?? null;
  const targetExtract = extractIndex?.items.find((x) => x.id === target.id) ?? null;

  // A site page opens against the target the site is proposed for, when it has one.
  const openSitePage = useCallback(
    (id: string) => {
      const a = analogs.find((x) => x.id === id);
      if (a && a.analogFor.length > 0 && !a.analogFor.includes(targetId) && targets.some((t) => t.id === a.analogFor[0])) setTargetId(a.analogFor[0]);
      setSiteId(id);
      setView('site');
    },
    [analogs, targetId, targets],
  );

  // The match record (Session C's library): at footprint scale for a featured site, else for the grid cell.
  const siteEntry = named ? (featuredSites?.sites.find((x) => x.id === named.id) ?? null) : null;
  useEffect(() => setScale(siteEntry ? 'site' : 'grid'), [siteEntry]);
  const match = useMemo(
    () =>
      selectedCell
        ? matchRecord({
            earth,
            lithology,
            target,
            cell: selectedCell,
            name: named?.name ?? siteCode(selectedCell),
            site: scale === 'site' && siteEntry ? (siteEntry as unknown as Parameters<typeof matchRecord>[0]['site']) : null,
            targetWindows: targetWindows.status === 'ready' ? targetWindows.value : null,
            minerals: targetMinerals.status === 'ready' ? targetMinerals.value : null,
            environment: targetEnv.status === 'ready' ? targetEnv.value : null,
            profile: pointProfile,
          })
        : null,
    [selectedCell, earth, lithology, target, named, scale, siteEntry, targetWindows, targetMinerals, targetEnv, pointProfile],
  );

  // Rank stability: 200 redraws of the weights, computed after the screen has settled (about 0.7 s).
  const stabKey = `${target.id}|${FACTOR_IDS.map((k) => liveWeights[k].toFixed(3)).join(',')}|${candidates.map((c) => c.index).join(',')}|${selected ?? ''}`;
  useEffect(() => {
    if (!flags.stability || !(view === 'match' || (view === 'orbit' && step === 3))) return;
    if (stab?.key === stabKey) return;
    const timer = window.setTimeout(() => {
      try {
        const follow = [...new Set([...candidates.map((c) => c.index), ...(selected !== null ? [selected] : [])])];
        setStab({ key: stabKey, result: rankStability(earth, lithology, target, liveWeights, follow) });
      } catch {
        setStab(null);
      }
    }, 500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stabKey, view, step]);
  const stabNow = stab?.key === stabKey ? stab.result : null;
  const stabOf = (i: number) => stabNow?.followed.find((f) => f.index === i) ?? null;
  const stabSelected = selected !== null ? stabOf(selected) : null;

  // Open something from the Saved page: a match, or a base layout in the sandbox.
  const openSavedItem = useCallback(
    (s: SavedLocation) => {
      const i = index.nearest(s.lat, s.lon, 2);
      if (i < 0) return;
      const go = () => {
        if (s.kind === 'base' && s.layout) {
          try {
            setSharedLayout(layoutFromJson(s.layout));
          } catch {
            return;
          }
          setSelected(i);
          setStep(4);
          setTab('results');
          setView('recon');
        } else select(i);
      };
      if (s.targetPoint) {
        loadExtra<BodyGrid>(`${s.targetPoint.body}.json`).then((grid) => {
          if (!grid || !s.targetPoint) return;
          try {
            setPlaceId(null);
            setPointProfile(targetFromPoint(s.targetPoint.body, s.targetPoint.lat, s.targetPoint.lon, { ...profileOptions(s.targetPoint.body), grid }));
            go();
          } catch {
            // The point can no longer be built: leave the saved entry as it is.
          }
        });
      } else {
        setTargetId(s.targetId);
        go();
      }
    },
    [index, select, profileOptions, setTargetId],
  );
  const saveBase = useCallback(
    (layout: unknown, moduleCount: number) => {
      if (!selectedCell) return false;
      saved.add({
        id: `base:${Date.now()}`,
        kind: 'base',
        targetId: target.id,
        targetName: target.name,
        ...(pointProfile ? { targetPoint: { body: target.body, lat: target.lat, lon: target.lon } } : {}),
        lat: selectedCell.lat,
        lon: selectedCell.lon,
        name: `Base at ${(named?.name ?? siteCode(selectedCell)).split(',')[0]}`,
        score: null,
        savedAt: new Date().toISOString(),
        layout,
        moduleCount,
      });
      return true;
    },
    [saved, selectedCell, target, pointProfile, named],
  );
  const activity = activityOf(presetId, matchMode === 'purpose' ? purposeId : null);
  const savedBases = saved.list.filter((x) => x.kind === 'base').length;

  const selectedSavedId = selectedCell ? savedId(target.id, selectedCell.lat, selectedCell.lon) : null;
  const isSaved = !!selectedSavedId && saved.list.some((x) => x.id === selectedSavedId);
  const toggleSaved = () => {
    if (!selectedCell || !selectedSavedId || !explained) return;
    if (isSaved) return saved.remove(selectedSavedId);
    saved.add({
      id: selectedSavedId,
      targetId: target.id,
      targetName: target.name,
      ...(pointProfile ? { targetPoint: { body: target.body, lat: target.lat, lon: target.lon } } : {}),
      lat: selectedCell.lat,
      lon: selectedCell.lon,
      name: named?.name ?? siteCode(selectedCell),
      score: explained.score,
      ...(pointProfile && !pointProfile.scoresComparable ? { comparable: false } : {}),
      savedAt: new Date().toISOString(),
    });
  };

  // Matches step: arcs from the target to the five best Earth places, and a strip for the one previewed.
  const topCells = candidates.slice(0, 5).map((c) => earth.cells[c.index]);
  const topIdx = candidates.slice(0, 5).map((c) => c.index);
  const stepCountries = useCountries(preview !== null ? [...topCells, earth.cells[preview]] : topCells);
  const placeName = (i: number) => sites.find((x) => x.index === i)?.analog.name.split(',')[0] ?? stepCountries.get(countryKey(earth.cells[i].lat, earth.cells[i].lon)) ?? 'Open land';
  const topLinks = topIdx.map((i) => ({ lat: earth.cells[i].lat, lon: earth.cells[i].lon, label: results[i].score === null ? '-' : results[i].score!.toFixed(0) }));
  const previewChips = topIdx.map((i) => ({ label: placeName(i), score: results[i].score }));
  const previewPair: PairInfo | null =
    preview !== null && step === 3 && view === 'orbit'
      ? {
          mode: 'place',
          from: shortName(target.name),
          to: placeName(preview),
          toSub: `${formatCoords(earth.cells[preview].lat, earth.cells[preview].lon)} on Earth`,
          score: results[preview].score,
          confidence: results[preview].confidence,
          dims: ts.profile(earth.cells[preview]).map((d) => ({ id: d.id, label: d.label, similarity: d.similarity })),
          note: null,
        }
      : null;

  // Linked pairs on the home globes. A Moon or Mars pick links to its best Earth cells for the current purpose;
  // an Earth site links to the target it most resembles.
  const earthPins = useMemo<HeroSite[]>(
    () => (featuredSites?.sites ?? []).filter((x) => x.kind !== 'negative').map((x) => ({ id: x.id, name: x.name, lat: x.lat, lon: x.lon, proposed: x.kind === 'candidate' })),
    [featuredSites],
  );
  const homePlace = homePick?.kind === 'place' ? (places.find((p) => p.id === homePick.id) ?? null) : null;
  // The target is set by picking the place; until it is, the list belongs to another place.
  const homeReady = !!homePlace && place?.id === homePlace.id && !(pointProfile && pointProfile.origin === 'none');
  const homeLinks = useMemo(() => (homeReady ? candidates.slice(0, 5) : []), [homeReady, candidates]);
  const homeCells = homeLinks.map((c) => earth.cells[c.index]);
  const homeCountries = useCountries(homeCells);
  const homeSite = homePick?.kind === 'site' ? (earthPins.find((x) => x.id === homePick.id) ?? null) : null;
  const siteBest = useMemo(() => {
    if (!homeSite) return null;
    const i = index.nearest(homeSite.lat, homeSite.lon, 2);
    if (i < 0) return null;
    const cell = earth.cells[i];
    let best: { target: Target; score: number | null; confidence: 'high' | 'medium' | 'low' | null; dims: { id: string; label: string; similarity: number | null }[] } | null = null;
    for (const t of targets) {
      const sc = scorer.forTarget(t);
      const e = sc.explain(cell, liveWeights);
      if (e.score !== null && (!best || e.score > (best.score ?? -1)))
        best = { target: t, score: e.score, confidence: e.confidence, dims: sc.profile(cell).map((d) => ({ id: d.id, label: d.label, similarity: d.similarity })) };
    }
    return best ? { ...best, index: i } : null;
  }, [homeSite, index, earth, targets, scorer, liveWeights]);
  const homeLinkList: HeroLink[] = homeLinks.map((c) => ({ lat: earth.cells[c.index].lat, lon: earth.cells[c.index].lon, score: results[c.index].score }));
  const homeReverse = siteBest ? { place: places.find((p) => p.targetId === siteBest.target.id)?.id ?? '', score: siteBest.score } : null;
  const homeActiveIdx = Math.min(homeActive, Math.max(0, homeLinks.length - 1));
  const homePair: PairInfo | null = (() => {
    if (homePlace) {
      const c = homeLinks[homeActiveIdx];
      const cell = c ? earth.cells[c.index] : null;
      const r = c ? results[c.index] : null;
      return {
        mode: 'place',
        from: shortName(homePlace.name),
        to: cell ? (homeCountries.get(countryKey(cell.lat, cell.lon)) ?? 'Open land') : 'no Earth place yet',
        toSub: cell ? `${formatCoords(cell.lat, cell.lon)} on Earth` : '',
        score: r?.score ?? null,
        confidence: r?.confidence ?? null,
        dims: cell ? ts.profile(cell).map((d) => ({ id: d.id, label: d.label, similarity: d.similarity })) : [],
        note: homeReady ? (cell ? null : 'No Earth cell has a score for this place with these weights.') : place?.id === homePlace.id ? 'No measured values exist for this place yet, so nothing can be matched. Places with an amber marker have values.' : 'Working out the matches',
      };
    }
    if (homeSite && siteBest)
      return {
        mode: 'site',
        from: homeSite.name.split(',')[0],
        to: siteBest.target.name,
        toSub: `${siteBest.target.body === 'moon' ? 'Moon' : 'Mars'}, the closest of the ${targets.length} base sites with measured values`,
        score: siteBest.score,
        confidence: siteBest.confidence,
        dims: siteBest.dims,
        note: null,
      };
    if (homeSite) return { mode: 'site', from: homeSite.name.split(',')[0], to: 'no target', toSub: '', score: null, confidence: null, dims: [], note: 'No Moon or Mars site can be scored against this Earth place.' };
    return null;
  })();
  const homeChips = homeLinks.map((c) => {
    const cell = earth.cells[c.index];
    return { label: homeCountries.get(countryKey(cell.lat, cell.lon)) ?? 'Open land', score: results[c.index].score };
  });
  useEffect(() => {
    if (view !== 'home' || !homeAuto || demo !== null) return;
    const withValues = places.filter((p) => p.targetId && targets.some((t) => t.id === p.targetId));
    if (withValues.length === 0) return;
    // The first one shown is the default target; after that it varies.
    let firstPick = withValues.find((p) => p.targetId === DEFAULT_TARGET_ID || p.id === DEFAULT_TARGET_ID) ?? null;
    let tick = Math.floor(Math.random() * 1000);
    const timers: number[] = [];
    const step = () => {
      tick += 1;
      if (firstPick) {
        const p = firstPick;
        firstPick = null;
        pickPlace(p.id);
        setHomePick({ kind: 'place', id: p.id });
        setHomeActive(0);
        timers.push(window.setTimeout(() => setHomeActive(1), 4200));
        return;
      }
      // Mostly a Moon or Mars place linked out to Earth; now and then an Earth site linked back to its target.
      if (tick % 3 === 0 && earthPins.length > 0) {
        const x = earthPins[Math.floor(Math.random() * earthPins.length)];
        setHomePick({ kind: 'site', id: x.id });
        setHomeActive(0);
      } else {
        const p = withValues[Math.floor(Math.random() * withValues.length)];
        pickPlace(p.id);
        setHomePick({ kind: 'place', id: p.id });
        setHomeActive(0);
        timers.push(window.setTimeout(() => setHomeActive(1), 4200));
      }
    };
    timers.push(window.setTimeout(step, 2200));
    const iv = window.setInterval(step, 8600);
    return () => {
      window.clearInterval(iv);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [view, homeAuto, demo, places, targets, earthPins, pickPlace]);

  // Development only: lets a test script pick a pin without chasing a turning globe.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __pick?: (kind: 'place' | 'site', id: string) => void }).__pick = (kind, id) => {
      if (kind === 'place') pickPlace(id);
      setHomePick({ kind, id });
      setHomeActive(0);
    };
  }, [pickPlace]);
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __preview?: (i: number | null) => void }).__preview = (i) => setPreview(i === null ? null : (topIdx[i] ?? null));
  });
  const openHomePair = () => {
    if (homePlace && homeLinks[homeActiveIdx]) select(homeLinks[homeActiveIdx].index);
    else if (homeSite && siteBest) openSite(homeSite.lat, homeSite.lon, siteBest.target.id);
  };

  // The two tools, ordered by what the match is for.
  const terrainReady = flags.terrain && !!earthExtract?.elevation && !!targetExtract?.elevation;
    const baseTool: Tool = {
    title: 'Plan a base here',
    line: `Place modules on this ground, then run the same layout at ${target.name} and read the gap report.`,
    cta: 'Open the base planner',
    art: 'base',
    onClick: reconReady ? () => openRecon() : null,
    why: 'The base planner needs the module numbers, which are not published with this build.',
  };
  const roverTool: Tool = {
    title: 'Drive a rover in 3D',
    line: `Draw a route over this terrain and over ${target.name}, and compare the slopes and distance of each.`,
    cta: 'Open 3D terrain',
    art: 'rover',
    onClick: terrainReady ? () => transition(() => setView('terrain')) : null,
    why: 'No ground-level 3D terrain was built for this pair. Only the featured sites and the listed targets have it.',
  };
  const groundTool: Tool = terrainReady
    ? {
        title: 'See the ground in 3D',
        line: `Turn both places around as terrain at one scale: ${target.name} and this place.`,
        cta: 'Open 3D terrain',
        art: activity,
        onClick: () => transition(() => setView('terrain')),
      }
    : {
        title: 'See where it is in 3D',
        line: 'The Earth globe, turned and brought down to this place. Ground-level terrain was not built for it.',
        cta: 'Show on the globe',
        art: activity,
        onClick: () => backToEarth(),
        why: roverTool.why,
      };
  const matchTools = activity === 'rover' ? { primary: roverTool, secondary: baseTool } : activity === 'base' ? { primary: baseTool, secondary: { ...groundTool, title: 'See the ground in 3D', art: 'rover' as const } } : { primary: groundTool, secondary: baseTool };

  // Pins for the home globes: every named place on the Moon and Mars.
  const heroPlaces = useMemo(
    () => places.map((p) => ({ id: p.id, name: p.name, body: p.body, lat: p.lat, lon: p.lon, hasValues: !!p.targetId && targets.some((t) => t.id === p.targetId), sub: p.sub })),
    [places, targets],
  );
  // A place picked on the home globes before the body grid had loaded gets its target as soon as the grid arrives.
  useEffect(() => {
    if (!placeId || pointProfile) return;
    const p = places.find((x) => x.id === placeId);
    if (p && !(p.targetId && targets.some((t) => t.id === p.targetId)) && gridOf(p.body) !== null) pickPlace(placeId);
  }, [placeId, pointProfile, places, targets, gridOf, pickPlace]);

  useEffect(() => {
    const where = view === 'home' ? '' : view === 'match' && selectedCell ? `${named?.name.split(',')[0] ?? siteCode(selectedCell)} and ${target.name} · ` : view === 'orbit' && step >= 2 ? `${(step === 2 && place ? place.name : target.name)} · ` : '';
    document.title = `${where}SBATS`;
  }, [view, step, target, named, selectedCell]);

  return (
    <div className={view === 'home' ? 'flex h-full flex-col' : 'flex min-h-full flex-col lg:h-full'}>
      {view !== 'home' && (
      <TopBar
        step={view === 'orbit' || view === 'match' || view === 'custom' ? step : null}
        onStep={onStep}
        canMatch={selected !== null}
        onHome={() => transition(() => setView('home'))}
        featuredOpen={view === 'featured'}
        onFeatured={() => setView('featured')}
        savedCount={saved.list.length}
        savedOpen={view === 'saved'}
        onSaved={() => setView('saved')}
        demoRunning={demo !== null}
        demoLabel={demo}
        onDemo={runDemo}
        methodOpen={view === 'method'}
        onMethod={() => setView('method')}
        onFind={() => onStep(1)}
        findOpen={view === 'orbit' && step <= 2}
        onExplore={() => transition(() => setView('explore'))}
        exploreOpen={view === 'explore'}
        onCustom={() => transition(() => { setView('custom'); setStep(2); })}
        customOpen={view === 'custom'}
        onValidation={() => setView('validation')}
        validationOpen={view === 'validation'}
        onTour={() => {
          userTouch();
          tourGo(0);
        }}
        learnOpen={view === 'learn'}
        onLearn={() => setView('learn')}
      />
      )}

      {(data.warnings.length > 0 || saved.error || data.fixtureFiles.length > 0 || (view === 'recon' && modules.status === 'ready' && modules.value.fixture)) && (
        <div className="bg-bg px-4 py-2 text-[12px] text-accent" role="alert">
          {[
            ...data.warnings,
            saved.error,
            data.fixtureFiles.length > 0 ? `Fixture data, not real: ${data.fixtureFiles.map((f) => f).join(', ')}.` : null,
            view === 'recon' && modules.status === 'ready' && modules.value.fixture ? 'Fixture module numbers, not real.' : null,
          ]
            .filter(Boolean)
            .join(' ')}
        </div>
      )}

      <ErrorBoundary what="This page" resetKey={`${view}:${step}`} onHome={() => setView('home')}>
      {view === 'home' && (
        <Home
          earth={earth}
          results={results}
          target={{ id: target.id, name: target.name }}
          onOpenMatch={openSite}
          places={heroPlaces}
          sites={featuredSites}
          extracts={extractIndex}
          savedCount={saved.list.length}
          onSaved={() => setView('saved')}
          demo={demo}
          onDemo={runDemo}
          onFind={() => {
            setView('orbit');
            setStep(1);
          }}
          onWorld={(w: WorldId) => {
            setWorldPage(w);
            setView('world');
          }}
          onPick={(kind, id) => {
            userTouch();
            if (kind === 'place') pickPlace(id);
            setHomePick({ kind, id });
            setHomeActive(0);
          }}
          pick={homePick}
          earthPins={earthPins}
          links={homeLinkList}
          reverse={homeReverse && homeReverse.place ? homeReverse : null}
          active={homeActiveIdx}
          onActive={(i) => {
            userTouch();
            setHomeActive(i);
          }}
          pair={homePair}
          auto={homeAuto}
          chips={homeChips}
          presets={PRESETS}
          presetId={presetId}
          onPreset={(id) => {
            userTouch();
            choosePreset(id);
          }}
          onOpenPair={openHomePair}
          onAllMatches={homePlace && homeReady ? () => goToEarth() : null}
          pairs={storyPairs}
          scanNote={scanNote}
          onSitePair={openSitePage}
          onTour={() => {
            userTouch();
            tourGo(0);
          }}
          onAiUse={() => setView('aiuse')}
          onFeature={(kind) => {
            userTouch();
            const tambora = featuredSites?.sites.find((x) => x.id === 'id-tambora-caldera');
            setTargetId('moon-shackleton-rim');
            if (kind === 'matches') return goToEarth();
            if (kind === 'explore') return transition(() => setView('explore'));
            if (!tambora) return goToEarth();
            const i = index.nearest(tambora.lat, tambora.lon, 2);
            if (i < 0) return goToEarth();
            if (kind === 'compare') {
              select(i);
              window.setTimeout(() => document.getElementById('sec-data')?.scrollIntoView({ behavior: 'smooth' }), 700);
              return;
            }
            setSelected(i);
            setStep(4);
            transition(() => setView('terrain'));
          }}
          onExplore={() => transition(() => setView('explore'))}
          onCustom={() => transition(() => { setView('custom'); setStep(2); })}
          onClearPick={() => {
            userTouch();
            setHomePick(null);
          }}
          onFeatured={(id) => (id ? openSitePage(id) : setView('featured'))}
          onMethod={() => setView('method')}
          onLearn={() => setView('learn')}
          onValidation={() => setView('validation')}
        />
      )}

      {view === 'learn' && (
        <Suspense fallback={<div className="min-h-0 flex-1 bg-bg px-5 py-16 sm:px-10" aria-busy="true" />}>
          <LearnPage onAiUse={() => setView('aiuse')} onFind={() => onStep(1)} onWorld={(w) => { setWorldPage(w); setView('world'); }} />
        </Suspense>
      )}

      {view === 'saved' && <SavedPage saved={saved.list} onOpen={openSavedItem} onRemove={saved.remove} onFind={() => { setView('orbit'); setStep(1); }} />}

      {view === 'orbit' && step === 1 && (
        <PickWorld moonPlaces={places.filter((p) => p.body === 'moon').length} marsPlaces={places.filter((p) => p.body === 'mars').length} onPick={pickWorld} onCustom={() => transition(() => { setView('custom'); setStep(2); })} />
      )}

      {view === 'explore' && <ExplorePage earth={earth} target={target} candidates={candidates} analogs={sites} onOpenCell={(i) => select(i)} onBack={backToEarth} />}

      {view === 'aiuse' && <AiUsePage onBack={() => setView('home')} />}

      {view === 'custom' && (
        <CustomStep
          earth={earth}
          targets={targets}
          onSearch={(t) => {
            setPointProfile(null);
            setCustomTarget(t);
            setPresetId(null);
            setMatchMode('all');
            setSelected(null);
            goToEarth();
          }}
        />
      )}

      {view === 'featured' && (
        <FeaturedPage
          sites={featuredSites}
          sitesState={sitesFile.status}
          extracts={extractIndex}
          analogs={analogs}
          targets={targets}
          target={target}
          earth={earth}
          results={results}
          top={candidates}
          reason={(i) => reasonLine(explain(i))}
          warnings={pointProfile?.notes ?? []}
          onSitePage={openSitePage}
          onMatch={openSite}
          onCell={(i) => select(i)}
        />
      )}

      {view === 'report' && selectedCell && match && (
        <Report
          cell={selectedCell}
          target={target}
          earth={earth}
          record={match.record}
          stability={stabNow ? { result: stabNow, cell: stabSelected } : null}
          routes={earthExtract ? getRoutes(routeKey(earthExtract.id, target.id)) : []}
          minerals={match.minerals}
          knownSite={(knownSites.status === 'ready' && knownSites.value?.sites.find((k) => k.id === place?.id)) || null}
          results={results}
          onBack={() => setView('match')}
        />
      )}

      {view === 'terrain' && earthExtract?.elevation && targetExtract?.elevation && selectedCell && (
        <TerrainPage
          earth={earthExtract}
          target={targetExtract}
          windowKm={windowKm}
          earthName={(named?.name ?? siteCode(selectedCell)).split(',')[0]}
          targetName={target.name}
          rovers={rovers.status === 'ready' ? rovers.value : null}
          targetBody={target.body}
          onBack={() => setView('match')}
          onBase={reconReady ? () => openRecon() : null}
        />
      )}

      {view === 'world' && (
        <WorldPage
          world={worldPage}
          onWorld={setWorldPage}
          targets={targets}
          onPlace={(id) => {
            setTargetId(id);
            setSelected(null);
            setView('orbit');
            setStep(2);
            setTab('setup');
          }}
          onFind={() => pickWorld(worldPage)}
        />
      )}

      {view === 'match' && selectedCell && explained && match && (
        <MatchDetail
          cell={selectedCell}
          placeName={named?.name ?? null}
          kindLabel={named ? KIND_LABEL[named.kind] : null}
          target={target}
          explained={explained}
          meta={meta}
          purpose={purpose}
          record={match!.record}
          scale={scale === 'site' && siteEntry ? 'site' : 'grid'}
          onScale={siteEntry ? setScale : null}
          stability={
            stabSelected && stabNow && stabSelected.baseRank !== null
              ? {
                  text: `${rankOf(stabSelected.baseRank, stabNow.scoredCells)} squares. ${stabilityWord(stabSelected.shareInTopN)}: change every weight by up to ${Math.round(stabNow.spread * 100)}% and the rank ${Math.round(stabSelected.rankP05 ?? 0) === Math.round(stabSelected.rankP95 ?? 0) ? `stays at ${Math.round(stabSelected.rankP05 ?? 0).toLocaleString('en-US')}` : `runs from ${Math.round(stabSelected.rankP05 ?? 0).toLocaleString('en-US')} to ${Math.round(stabSelected.rankP95 ?? 0).toLocaleString('en-US')}`}. It is in the top ${stabNow.topN} in ${Math.round(stabSelected.shareInTopN * 100)}% of ${stabNow.draws} redraws.`
                }
              : null
          }
          notes={[...(pointProfile && !pointProfile.scoresComparable ? pointProfile.notes.slice(-1) : []), ...ts.notes, ...(match?.note ? [match.note] : [])]}
          rank={rank}
          ground={{ earth: earthExtract, target: targetExtract, windowKm, state: extracts.status }}
          saved={isSaved}
          onSave={toggleSaved}
          onBack={backToEarth}
          tools={matchTools}
          earth={earth}
          climate={climateFile}
          minerals={match.minerals}
          terrain={terrainReady && earthExtract && targetExtract ? { earth: earthExtract, target: targetExtract, windowKm, onOpen: () => transition(() => setView('terrain')) } : null}
          actions={[
            { label: 'View report', onClick: flags.report ? () => setView('report') : null, why: 'not built yet' },
            {
              label: 'Download report',
              onClick: flags.report
                ? () => {
                    setView('report');
                    window.setTimeout(() => window.print(), 400);
                  }
                : null,
              why: 'not built yet',
            },
            ...(namedHasPage && named ? [{ label: 'Site page', onClick: () => openSitePage(named.id) }] : []),
          ]}
        >
          <Dossier
            embedded
            cell={selectedCell}
            target={target}
            explained={explained}
            meta={meta}
            landCover={earth.meta.landCover ?? null}
            purpose={purpose}
            profile={profile}
            purposeScores={purposeScores}
            onPurpose={(id) => {
              setPurposeId(id);
              setMatchMode('purpose');
            }}
            named={named}
            isNew={isNewSite(selectedCell, analogs)}
            rank={rank}
            percentile={pct}
            gaps={ts.prepared.gaps}
            notes={ts.notes}
            onBack={() => setView('orbit')}
            onBuild={null}
            month={month}
            onSitePage={null}
          />
        </MatchDetail>
      )}

      {flags.methodPage && infoOpen && (
        <InfoShell
          onAiUse={() => setView('aiuse')}
          view={view}
          title={
            view === 'method'
              ? 'How a match score is made, with what data, and where it stops being reliable'
              : view === 'validation'
                ? 'Do known analog sites score high and wrong places score low? The numbers, including the weak ones'
                : (featuredSites?.sites.find((x) => x.id === siteId) ?? featuredSites?.sites[0])?.name ?? 'Site pages'
          }
        >
          {view === 'method' ? (
            <MethodPage earth={earth} targets={targets} lithology={lithology} listLimit={LIST_LIMIT} siteCount={analogs.length} />
          ) : view === 'validation' ? (
            <ValidationPage earth={earth} targets={targets} onOpenSite={openSite} />
          ) : sitesFile.status === 'loading' ? (
            <Loading what="site pages" />
          ) : featuredSites && featuredSites.sites.length > 0 ? (
            <SitePage
              sites={featuredSites}
              siteId={siteId ?? featuredSites.sites[0].id}
              onSite={openSitePage}
              earth={earth}
              index={index}
              meta={meta}
              targets={targets}
              target={target}
              onTarget={setTargetId}
              scorer={ts}
              analogs={analogs}
              climate={climateFile}
              extracts={extractIndex}
              onDossier={(i) => select(i)}
              onBuild={reconReady ? (i) => openRecon(i) : null}
              onTerrain={flags.terrain ? openTerrainFor : null}
              recordFor={siteRecord}
            />
          ) : (
            <Absent what={sitesFile.status === 'error' ? `The site data could not be read: ${sitesFile.message}` : 'The site data is not published with this build.'} />
          )}
        </InfoShell>
      )}

      {view === 'recon' && reconReady && selectedCell && modules.status === 'ready' && (
        <Sandbox
          ref={sandboxRef}
          cell={selectedCell}
          siteName={named?.name ?? siteCode(selectedCell)}
          siteCode={siteCode(selectedCell)}
          target={target}
          modules={modules.value}
          solar={annualSolar(climateFile, named?.id ?? null)}
          ground={{ earth: earthExtract, target: targetExtract, windowKm }}
          initial={sharedLayout}
          tab={tab}
          onTab={setTab}
          onBack={() => setView('match')}
          onSaveBase={saveBase}
          onOpenSaved={() => setView('saved')}
          savedBases={savedBases}
        />
      )}

      {/* Both steps stay mounted once opened, so coming back is instant. */}
      {globesNeeded.current && (
        <>
          <PlaceStep
            hidden={!showWorld}
            body={target.body === 'mars' ? 'mars' : 'moon'}
            onBody={pickWorld}
            places={places}
            placeId={place?.id ?? null}
            onPlace={pickPlace}
            onPoint={flags.anyPoint && gridOf(target.body) !== null ? (lat, lon) => void pickPoint(target.body, lat, lon) : null}
            targets={targets}
            target={target}
            profile={pointProfile}
            extract={targetExtract}
            windowKm={windowKm}
            meta={meta}
            onFind={() => goToEarth()}
          />
          <MatchesStep
            hidden={!showEarth}
            body={target.body}
            custom={target.id === 'custom-conditions'}
            onExplore={() => transition(() => setView('explore'))}
            globe={
              <Suspense fallback={<p className="absolute left-5 top-5 text-[13px] text-muted" role="status">Loading globe</p>}>
                <GlobeView earth={earth} results={results} index={index} selected={selected} candidates={mapCandidates} sites={mapSites} onSelect={previewFromGlobe} focus={focus} links={topLinks} anchor={target.id !== 'custom-conditions' && (target.body === 'moon' || target.body === 'mars') ? { name: shortName(target.name), body: target.body } : undefined} activeLink={Math.max(-1, topIdx.indexOf(preview ?? -1))} active={showEarth} />
              </Suspense>
            }
            controls={{
              presets: PRESETS,
              presetId,
              onPreset: choosePreset,
              mode: matchMode,
              onMode: setMatchMode,
              purposeId,
              onPurpose: setPurposeId,
              weights,
              onWeight: (id: FactorId, v: number) => {
                // The library needs at least one weight above zero, so the last one cannot reach 0.
                const next = { ...sliderWeights, [id]: v };
                if (FACTOR_IDS.reduce((a, k) => a + next[k], 0) <= 0) return;
                setPresetId(null);
                setWeights(next);
              },
            }}
            presets={PRESETS}
            listMode={mode}
            onListMode={setMode}
            earth={earth}
            target={target}
            purpose={purpose}
            results={results}
            candidates={candidates}
            explain={explain}
            sites={sites}
            tally={counts}
            emptyReason={emptyReason}
            includeLow={includeLow}
            onIncludeLow={setIncludeLow}
            stability={stabNow}
            warnings={pointProfile?.notes ?? []}
            onSelect={openFromGlobe}
            profileOf={profileOfAnalog}
            available={(i) => {
              const cell = earth.cells[i];
              const named = sites.find((s) => s.index === i)?.analog;
              const hasEarth = extractIndex?.items.some((x) => x.id === (named?.id ?? siteCode(cell)) && x.elevation);
              const hasTarget = extractIndex?.items.some((x) => x.id === target.id && x.elevation);
              const out: string[] = [];
              if (flags.terrain && hasEarth && hasTarget) out.push('3D terrain', 'Route planner');
              if (named && storiesFor(storiesFile, named.id).length > 0) out.push('Site story');
              // Minerals: a mineral list read from orbit (NASA EMIT) at this site, and minerals reported at the target to compare it with.
              if (named && targetMinerals.status === 'ready' && (targetMinerals.value?.targets[target.id]?.minerals.length ?? 0) > 0) {
                const m = (featuredSites?.sites.find((x) => x.id === named.id) as { mineralogy?: { value: { group1?: { top: unknown[] } | null; group2?: { top: unknown[] } | null } | null } | null } | undefined)?.mineralogy?.value;
                if (m && ((m.group1?.top.length ?? 0) > 0 || (m.group2?.top.length ?? 0) > 0)) out.push('Minerals');
              }
              return out;
            }}
            strip={previewPair ? <HomePair pair={previewPair} chips={previewChips} active={Math.max(-1, topIdx.indexOf(preview ?? -1))} onActive={(i) => previewFromGlobe(topIdx[i])} presets={PRESETS} presetId={presetId} onPreset={choosePreset} onOpen={() => preview !== null && select(preview)} onAll={null} onClose={() => setPreview(null)} /> : undefined}
          />
        </>
      )}
      </ErrorBoundary>

      {tour !== null && <GuidedTour step={tour} onStep={tourGo} onClose={closeTour} />}
    </div>
  );
}

import { Suspense, lazy, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { loadData, loadExtra, type DataBundle } from './data/access';
import { FACTOR_IDS, FACTOR_KEYS, type FactorId, type Weights } from './types';
import { PRESETS, PURPOSES, createScorer, purposeWeights, type PurposeId } from './lib/scoringAdapter';
import { buildIndex, formatCoords, siteCode } from './lib/geo';
import { keyLabel, metaByKey, reasonLine } from './lib/format';
import { isNewSite, percentile, tally, topCandidates } from './lib/rank';
import { StatusStrip, TopBar, type Step } from './components/Chrome';
import { LeftPanel, type MatchMode } from './components/LeftPanel';
import { CandidateList, type ListMode } from './components/CandidateList';
import { Dossier } from './components/Dossier';
import { MethodPage } from './components/MethodPage';
import { ValidationPage } from './components/ValidationPage';
import { Absent, InfoShell, Loading } from './components/InfoParts';
import { SitePage } from './components/SitePage';
import { TargetBrief } from './components/TargetBrief';
import { loadExtracts, loadSites } from './data/sites';
import { bestMonth } from './lib/bestMonth';
import { flags } from './flags';
import { Sandbox, type SandboxHandle } from './components/Sandbox';
import { Home } from './components/Home';
import { WorldPage } from './components/WorldPage';
import { TerrainPage, type RoversFile } from './components/TerrainPage';
import { Report } from './components/Report';
import { FeaturedPage } from './components/FeaturedPage';
import { MatchDetail } from './components/MatchDetail';
import { WORLD_CREDIT, Worlds, type WorldId } from './components/Worlds';
import { savedId, useSaved } from './lib/saved';
import type { KnownSitesFile } from './lib/matchAdapter';
import { getRoutes, routeKey } from './lib/layoutStore';
import { loadTargetEnvironment, loadTargetMinerals, loadTargetWindows, matchRecord, stability as rankStability, type StabilityResult } from './lib/matchAdapter';
import { annualSolar, loadModules, loadSiteClimate } from './data/sandbox';
import { useAsync } from './lib/useAsync';
import { decodeLayout, type SavedLayout } from './lib/simAdapter';

// The globe (three.js and globe.gl) is by far the largest part of the app. It is fetched as its
// own chunk, starting now and in parallel with the data, so the panels never wait for it.
const globeModule = import('./components/GlobeView');
const GlobeView = lazy(() => globeModule.then((m) => ({ default: m.GlobeView })));
const worldModule = import('./components/WorldGlobe');
const WorldGlobe = lazy(() => worldModule.then((m) => ({ default: m.WorldGlobe })));

type View = 'home' | 'orbit' | 'match' | 'recon' | 'method' | 'validation' | 'site' | 'featured' | 'world' | 'report' | 'terrain';
const KIND_LABEL = { candidate: 'Proposed site', known: 'Known analog', negative: 'Negative control' } as const;

const LIST_LIMIT = 15;
const MAP_MARKERS = 10;

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: DataBundle };

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

  // While the data loads, and if it fails, the frame of the app is already in place: nothing jumps when it arrives.
  if (load.status !== 'ready') {
    const failed = load.status === 'error';
    const cell = (text: string, extra = '') => (
      <div className={`bg-panel p-4 ${extra}`}>
        <p className="label" role={failed ? undefined : 'status'}>
          {failed ? 'No data' : text}
        </p>
      </div>
    );
    return (
      <div className="flex min-h-full flex-col lg:h-full">
        <header className="flex h-12 shrink-0 items-stretch border-b border-line bg-panel">
          <div className="flex items-center gap-2 border-r border-line px-3 sm:px-4">
            <span className="block h-3 w-3 bg-accent" aria-hidden="true" />
            <h1 className="num text-[14px] font-semibold tracking-[0.08em] text-text">SBATS-26</h1>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-px bg-line lg:grid lg:grid-cols-[320px_minmax(0,1fr)_380px]">
          {cell('Loading targets', 'order-2 lg:order-1')}
          <div className="order-1 h-[46vh] min-h-[280px] bg-bg p-4 lg:order-2 lg:h-auto">
            {failed ? (
              <div role="alert" className="max-w-[60ch]">
                <p className="label !text-fail">Data could not be loaded</p>
                <p className="mt-2 text-[14px] text-text">{load.message}</p>
                <p className="mt-2 text-[13px] text-muted">The app reads its data files from the data folder next to this page. Check the connection and try again.</p>
                <button type="button" onClick={() => window.location.reload()} className="btn mt-4">
                  Reload
                </button>
              </div>
            ) : (
              <p className="label" role="status">
                Loading the Earth grid, 1.9 MB
              </p>
            )}
          </div>
          {cell('Loading sites', 'order-3')}
        </div>
        <footer className="num flex min-h-8 shrink-0 items-center border-t border-line bg-panel px-3 text-[11px] uppercase tracking-wider text-muted sm:px-4">
          {failed ? 'Stopped' : 'Loading'}
        </footer>
      </div>
    );
  }
  return <Orbit data={load.data} />;
}

function Orbit({ data }: { data: DataBundle }) {
  const { earth, targets, analogs, lithology } = data;

  const [targetId, setTargetId] = useState(targets[0].id);
  const [presetId, setPresetId] = useState<string | null>(PRESETS[0].id);
  const [sliderWeights, setWeights] = useState<Weights>(PRESETS[0].weights);
  const [matchMode, setMatchMode] = useState<MatchMode>('all');
  const [purposeId, setPurposeId] = useState<PurposeId>(PURPOSES[0].id);
  // In purpose mode the weights are fixed by the purpose. The sliders keep their own values for the way back.
  const weights = matchMode === 'purpose' ? purposeWeights(purposeId) : sliderWeights;
  const purpose = matchMode === 'purpose' ? (PURPOSES.find((p) => p.id === purposeId) ?? null) : null;
  const [selected, setSelected] = useState<number | null>(null);
  const [includeLow, setIncludeLow] = useState(false);
  const [mode, setMode] = useState<ListMode>('ranked');
  const [tab, setTab] = useState<'setup' | 'results'>('setup');
  const [focus, setFocus] = useState<{ lat: number; lon: number; seq: number; arrive?: boolean } | null>(null);
  const [demo, setDemo] = useState<string | null>(null);
  // Steps: 1 world, 2 place, 3 matches, 4 match. Home and the reference pages are views outside the steps.
  const [step, setStep] = useState<Step>(1);
  const [view, setView] = useState<View>('home');
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
  const rovers = useAsync(() => loadExtra<RoversFile>('rovers.json'), 'rovers');
  const targetMinerals = useAsync(loadTargetMinerals, 'target-minerals');
  const targetEnv = useAsync(loadTargetEnvironment, 'target-environment');
  const [scale, setScale] = useState<'grid' | 'site'>('grid');
  const [stab, setStab] = useState<{ key: string; result: StabilityResult } | null>(null);
  const fixtureAllowed = !import.meta.env.PROD || new URLSearchParams(window.location.search).has('sandbox');
  const reconReady = flags.recon && modules.status === 'ready' && (!modules.value.fixture || fixtureAllowed);

  const target = targets.find((t) => t.id === targetId) ?? targets[0];
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
        names.length > 0 ? `${names.join(', ')} ${names.length > 1 ? 'are' : 'is'} not in earth.json yet` : '',
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
        `${requiredUnbuilt.join(' and ')} ${requiredUnbuilt.length > 1 ? 'have' : 'has'} no data in any cell of earth.json, and bare ground and precipitation are both required before a cell gets a score.`,
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

  const rightRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLElement>(null);
  const seq = useRef(0);

  // Opening a cell is step 4: the match page.
  const select = useCallback(
    (i: number, fly = true) => {
      if (i < 0) return;
      setSelected(i);
      setStep(4);
      setView('match');
      if (fly) setFocus({ lat: earth.cells[i].lat, lon: earth.cells[i].lon, seq: ++seq.current });
    },
    [earth],
  );

  // Step 2 to step 3: leave the Moon or Mars globe and arrive over the best-matching part of Earth.
  const arriving = useRef(false);
  const goToEarth = useCallback((id?: string) => {
    if (id) setTargetId(id);
    arriving.current = true;
    setSelected(null);
    setView('orbit');
    setStep(3);
    setTab('results');
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
    [index, select],
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
        hasValues: !!k.targetId && targets.some((t) => t.id === k.targetId),
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
    return rows.sort((a, b) => Number(b.hasValues) - Number(a.hasValues));
  }, [knownSites, targets]);
  const place = places.find((p) => p.id === placeId) ?? places.find((p) => p.targetId === targetId) ?? null;
  const pickPlace = useCallback(
    (id: string) => {
      const p = places.find((x) => x.id === id);
      if (!p) return;
      setPlaceId(id);
      if (p.targetId && p.hasValues) setTargetId(p.targetId);
    },
    [places],
  );

  const pickWorld = useCallback(
    (w: WorldId) => {
      if (w === 'earth') return;
      if (target.body !== w || (place && place.body !== w)) {
        const first = places.find((p) => p.body === w && p.hasValues);
        if (first) pickPlace(first.id);
      }
      setSelected(null);
      setView('orbit');
      setStep(2);
      setTab('setup');
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

  const runDemo = () => {
    if (demo) return stopDemo();
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    // The demo runs against the target its site is proposed for, so the comparison means something.
    const demoTarget = targets.find((t) => t.id === featuredSite?.analog.analogFor[0]) ?? target;
    setTargetId(demoTarget.id);
    setSelected(null);
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

  const onStep = (s: Step) => {
    if (s === 4) {
      if (selected !== null) setView('match');
      return;
    }
    if (s === 3) {
      if (view === 'orbit' && step === 3) return;
      if (step < 3 || view === 'home') return goToEarth();
      setView('orbit');
      setStep(3);
      setTab('results');
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
  const earthExtract = extractIndex?.items.find((x) => x.id === named?.id) ?? null;
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
          })
        : null,
    [selectedCell, earth, lithology, target, named, scale, siteEntry, targetWindows, targetMinerals, targetEnv],
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

  const selectedSavedId = selectedCell ? savedId(target.id, selectedCell.lat, selectedCell.lon) : null;
  const isSaved = !!selectedSavedId && saved.list.some((x) => x.id === selectedSavedId);
  const toggleSaved = () => {
    if (!selectedCell || !selectedSavedId || !explained) return;
    if (isSaved) return saved.remove(selectedSavedId);
    saved.add({
      id: selectedSavedId,
      targetId: target.id,
      targetName: target.name,
      lat: selectedCell.lat,
      lon: selectedCell.lon,
      name: named?.name ?? siteCode(selectedCell),
      score: explained.score,
      savedAt: new Date().toISOString(),
    });
  };

  const status =
    demo ??
    (view === 'home'
      ? 'Home'
      : view === 'match'
        ? 'Match open'
        : view === 'recon'
          ? 'Sandbox'
          : view === 'orbit'
            ? weights !== liveWeights
              ? 'Scoring'
              : step === 1
                ? 'Pick a world'
                : step === 2
                  ? 'Pick a place'
                  : 'Ready'
            : 'Reading');

  useEffect(() => {
    const where = view === 'home' ? '' : view === 'match' && selectedCell ? `${named?.name.split(',')[0] ?? siteCode(selectedCell)} and ${target.name} · ` : view === 'orbit' && step >= 2 ? `${target.name} · ` : '';
    document.title = `${where}SBATS-26`;
  }, [view, step, target, named, selectedCell]);

  return (
    <div className="flex min-h-full flex-col lg:h-full">
      <TopBar
        step={view === 'orbit' || view === 'match' ? step : null}
        onStep={onStep}
        canMatch={selected !== null}
        onHome={() => setView('home')}
        featuredOpen={view === 'featured'}
        onFeatured={() => setView('featured')}
        demoRunning={demo !== null}
        onDemo={runDemo}
        methodOpen={infoOpen}
        onMethod={() => setView((v) => (v === 'method' || v === 'validation' || v === 'site' ? 'orbit' : 'method'))}
      />

      {(data.warnings.length > 0 || saved.error) && (
        <div className="border-b border-line bg-panel px-4 py-2 text-[12px] text-accent" role="alert">
          {[...data.warnings, saved.error].filter(Boolean).join(' ')}
        </div>
      )}

      {view === 'home' && (
        <Home
          targets={targets}
          cells={earth.cells.length}
          siteCount={analogs.length}
          sites={featuredSites}
          extracts={extractIndex}
          saved={saved.list}
          onFind={() => {
            setView('orbit');
            setStep(1);
          }}
          onWorld={pickWorld}
          onWorldPage={(w) => {
            setWorldPage(w);
            setView('world');
          }}
          onFeatured={(id) => (id ? openSitePage(id) : setView('featured'))}
          onOpenSaved={(s) => openSite(s.lat, s.lon, s.targetId)}
          onRemoveSaved={saved.remove}
        />
      )}

      {view === 'orbit' && step === 1 && (
        <main className="scroll min-h-0 flex-1 bg-panel" aria-labelledby="h-world">
          <header className="border-b border-line px-4 py-6 sm:px-6">
            <p className="label">01 World</p>
            <h2 id="h-world" className="mt-1 text-[22px] font-semibold leading-7 text-text">
              Which world is the base on?
            </h2>
          </header>
          <div className="border-b border-line bg-bg">
            <Worlds
              worlds={['moon', 'mars']}
              caption={(w) => `${targets.filter((t) => t.body === w).length} base sites`}
              action={(w) => `Pick ${w === 'moon' ? 'the Moon' : 'Mars'}`}
              onPick={pickWorld}
              selected={target.body}
            />
          </div>
          <p className="readout px-4 py-3 sm:px-6">True relative size. {WORLD_CREDIT}</p>
        </main>
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
                  text: `Grid cell rank ${stabSelected.baseRank.toLocaleString('en-US')} of ${stabNow.scoredCells.toLocaleString('en-US')} cells with these weights. With each weight redrawn within ±${Math.round(stabNow.spread * 100)}% (${stabNow.draws} times), nine in ten ranks fall between ${Math.round(stabSelected.rankP05 ?? 0).toLocaleString('en-US')} and ${Math.round(stabSelected.rankP95 ?? 0).toLocaleString('en-US')}, and it is in the top ${stabNow.topN} in ${Math.round(stabSelected.shareInTopN * 100)}% of them.`,
                }
              : null
          }
          notes={[...ts.notes, ...(match?.note ? [match.note] : [])]}
          rank={rank}
          ground={{ earth: earthExtract, target: targetExtract, windowKm, state: extracts.status }}
          saved={isSaved}
          onSave={toggleSaved}
          onBack={() => {
            setView('orbit');
            setStep(3);
            setTab('results');
          }}
          actions={[
            { label: 'View report', primary: true, onClick: flags.report ? () => setView('report') : null, why: 'not built yet' },
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
            {
              label: 'Open 3D terrain',
              onClick: flags.terrain && earthExtract?.elevation && targetExtract?.elevation ? () => setView('terrain') : null,
              why: !flags.terrain ? 'not built yet' : 'no terrain extract was built for one of the two places',
            },
            { label: 'Place a base', onClick: reconReady ? () => openRecon() : null, why: 'data/modules.json is not published with this build' },
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
          view={view}
          onView={(v) => (v === 'site' ? openSitePage(siteId ?? featuredSites?.sites[0]?.id ?? '') : setView(v))}
          onBack={() => setView('home')}
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
            />
          ) : (
            <Absent what={sitesFile.status === 'error' ? `data/sites.json could not be read: ${sitesFile.message}` : 'data/sites.json is not published with this build.'} />
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
        />
      )}

      {/* The globes stay mounted once step 2 or 3 has been opened, so coming back is instant. */}
      {globesNeeded.current && (
      <div className={`min-h-0 flex-1 flex-col lg:grid-cols-[320px_minmax(0,1fr)_380px] ${showWorld || showEarth ? 'flex lg:grid' : 'hidden'}`}>
        <aside
          ref={leftRef}
          aria-label={step === 2 ? 'Places' : 'Target and weights'}
          className={`scroll order-3 bg-panel lg:order-1 lg:block lg:min-h-0 lg:border-r lg:border-line ${tab === 'setup' ? 'block' : 'hidden'}`}
        >
          <LeftPanel
            step={step === 2 ? 2 : 3}
            onChangePlace={() => onStep(2)}
            targets={targets}
            targetId={target.id}
            places={places}
            placeId={place?.id ?? null}
            onPlace={pickPlace}
            presets={PRESETS}
            presetId={presetId}
            onPreset={(id) => {
              const p = PRESETS.find((x) => x.id === id);
              if (!p) return;
              setPresetId(id);
              setWeights(p.weights);
            }}
            mode={matchMode}
            onMode={setMatchMode}
            purposeId={purposeId}
            onPurpose={setPurposeId}
            weights={weights}
            onWeight={(id: FactorId, v: number) => {
              // The library needs at least one weight above zero, so the last one cannot reach 0.
              const next = { ...sliderWeights, [id]: v };
              if (FACTOR_IDS.reduce((a, k) => a + next[k], 0) <= 0) return;
              setPresetId(null);
              setWeights(next);
            }}
            meta={meta}
          />
        </aside>

        <div className="order-1 h-[46vh] min-h-[280px] shrink-0 border-b border-line lg:order-2 lg:h-auto lg:min-h-0 lg:border-b-0">
          <Suspense
            fallback={
              <div className="flex h-full items-start bg-bg p-4">
                <p className="label" role="status">
                  Loading globe
                </p>
              </div>
            }
          >
            <div className={showEarth ? 'hidden' : 'h-full'}>
              <WorldGlobe
                targets={targets}
                targetId={target.id}
                places={places}
                placeId={place?.id ?? null}
                onTarget={pickPlace}
                onPick={(id) => {
                  const p = places.find((x) => x.id === id);
                  pickPlace(id);
                  if (p?.hasValues && p.targetId) goToEarth(p.targetId);
                }}
                active={showWorld}
              />
            </div>
            <div className={showEarth ? 'h-full' : 'hidden'}>
              <GlobeView
                earth={earth}
                results={results}
                index={index}
                selected={selected}
                candidates={mapCandidates}
                sites={mapSites}
                onSelect={select}
                focus={focus}
                active={showEarth}
              />
            </div>
          </Suspense>
        </div>

        <div className="tabs tabs-fill order-2 shrink-0 bg-panel lg:hidden" role="group" aria-label="Panel">
          {(['setup', 'results'] as const).map((t) => (
            <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)} className="tab">
              {t === 'setup' ? (step === 2 ? 'Places' : 'Target and weights') : step === 2 ? 'This place' : 'Matches'}
            </button>
          ))}
        </div>

        <aside
          ref={rightRef}
          aria-label={step === 2 ? 'This place' : 'Matches'}
          className={`scroll order-3 bg-panel lg:order-3 lg:block lg:min-h-0 lg:border-l lg:border-line ${tab === 'results' ? 'block' : 'hidden'}`}
        >
          {step === 2 ? (
            <TargetBrief target={target} extract={targetExtract} extractsState={extracts.status} windowKm={windowKm} onFind={() => goToEarth()} place={place && place.id !== target.id ? place : null} />
          ) : (
            <CandidateList
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
              mode={mode}
              onMode={setMode}
              onSelect={select}
            />
          )}
        </aside>
      </div>
      )}

      <StatusStrip
        coords={selectedCell && view !== 'home' ? formatCoords(selectedCell.lat, selectedCell.lon) : null}
        code={selectedCell && view !== 'home' ? siteCode(selectedCell) : null}
        cells={earth.cells.length}
        resolutionDeg={earth.meta.resolutionDeg}
        fixtureFiles={[...data.fixtureFiles.map((f) => `${f}.json`), ...(view === 'recon' && modules.status === 'ready' && modules.value.fixture ? ['modules.json'] : [])]}
        view={view}
        status={status}
      />
    </div>
  );
}

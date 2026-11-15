import { Suspense, lazy, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { loadData, type DataBundle } from './data/access';
import { FACTOR_IDS, FACTOR_KEYS, type FactorId, type Weights } from './types';
import { PRESETS, PURPOSES, createScorer, purposeWeights, type PurposeId } from './lib/scoringAdapter';
import { buildIndex, formatCoords, siteCode } from './lib/geo';
import { keyLabel, metaByKey } from './lib/format';
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
import { annualSolar, loadModules, loadSiteClimate } from './data/sandbox';
import { useAsync } from './lib/useAsync';
import { decodeLayout, type SavedLayout } from './lib/simAdapter';

// The globe (three.js and globe.gl) is by far the largest part of the app. It is fetched as its
// own chunk, starting now and in parallel with the data, so the panels never wait for it.
const globeModule = import('./components/GlobeView');
const GlobeView = lazy(() => globeModule.then((m) => ({ default: m.GlobeView })));
const worldModule = import('./components/WorldGlobe');
const WorldGlobe = lazy(() => worldModule.then((m) => ({ default: m.WorldGlobe })));

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

  if (load.status === 'loading')
    return (
      <div className="flex h-full items-center p-6">
        <p className="label" role="status">
          Loading data
        </p>
      </div>
    );
  if (load.status === 'error')
    return (
      <div className="p-6">
        <p className="label mb-2">Data could not be loaded</p>
        <p className="text-text">{load.message}</p>
      </div>
    );
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
  const [step, setStep] = useState<Step>(1);
  const [view, setView] = useState<'orbit' | 'method' | 'validation' | 'site' | 'recon'>('orbit');
  const [siteId, setSiteId] = useState<string | null>(null);
  const [sharedLayout, setSharedLayout] = useState<SavedLayout | null>(null);
  const sandboxRef = useRef<SandboxHandle>(null);
  const modules = useAsync(loadModules, 'modules');
  const climate = useAsync(loadSiteClimate, 'climate');
  const sitesFile = useAsync(loadSites, 'sites');
  const extracts = useAsync(loadExtracts, 'extracts');
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
      return `All ${counts.scored.toLocaleString('en-US')} scored cells are low confidence${why.length > 0 ? `: ${why.join(', and ')}` : ''}. Tick "Include low confidence cells" to list them anyway.`;
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

  const select = useCallback(
    (i: number, fly = true) => {
      if (i < 0) return;
      setView('orbit');
      setSelected(i);
      setStep(2);
      setTab('results');
      if (fly) setFocus({ lat: earth.cells[i].lat, lon: earth.cells[i].lon, seq: ++seq.current });
      rightRef.current?.scrollTo({ top: 0 });
    },
    [earth],
  );

  // Step 1 to step 2: leave the Moon or Mars globe and arrive over the best-matching part of Earth.
  const arriving = useRef(false);
  const goToEarth = useCallback((id?: string) => {
    if (id) setTargetId(id);
    arriving.current = true;
    setSelected(null);
    setView('orbit');
    setStep(2);
    setTab('results');
  }, []);
  useEffect(() => {
    if (!arriving.current || step !== 2) return;
    arriving.current = false;
    const top = candidates[0] ? earth.cells[candidates[0].index] : null;
    setFocus({ lat: top?.lat ?? 5, lon: top?.lon ?? 105, seq: ++seq.current, arrive: true });
  }, [step, candidates, earth]);

  // From the Validation page: open the grid cell nearest to a site, against the given target.
  const openSite = useCallback(
    (lat: number, lon: number, id: string) => {
      const i = index.nearest(lat, lon, 2);
      if (i < 0) return;
      setTargetId(id);
      select(i);
    },
    [index, select],
  );

  // Demo: plays the ORBIT part of the flow. Later steps join when their flags are on.
  const timers = useRef<number[]>([]);
  const stopDemo = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setDemo(null);
  }, []);
  useEffect(() => stopDemo, [stopDemo]);

  // The site the demo and step 3 fall back to: an SBATS candidate, with a terrain extract if one exists.
  const extractIds = useMemo(() => new Set(extracts.status === 'ready' && extracts.value ? extracts.value.items.map((x) => x.id) : []), [extracts]);
  const featuredSite = useMemo(() => {
    const cands = sites.filter((s) => s.analog.kind === 'candidate' && s.index >= 0);
    return cands.find((s) => extractIds.has(s.analog.id)) ?? cands[0] ?? null;
  }, [sites, extractIds]);
  const featured = featuredSite?.index ?? candidates[0]?.index ?? null;
  const candidatesRef = useRef(candidates);
  candidatesRef.current = candidates;

  const runDemo = () => {
    if (demo) return stopDemo();
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    // The demo runs against the target its site is proposed for, so the comparison means something.
    const demoTarget = targets.find((t) => t.id === featuredSite?.analog.analogFor[0]) ?? target;
    setTargetId(demoTarget.id);
    setView('orbit');
    setSelected(null);
    setMode('ranked');
    setPresetId(PRESETS[0].id);
    setWeights(PRESETS[0].weights);
    setMatchMode('all');
    setTab('setup');
    setStep(1);
    setDemo(`Demo: target ${demoTarget.name}`);
    at(3000, () => {
      setDemo('Demo: ranking Earth cells');
      goToEarth();
    });
    at(6500, () => {
      setDemo('Demo: the top candidate');
      const top = candidatesRef.current[0]?.index;
      if (top !== undefined) select(top);
    });
    if (featured !== null) {
      at(11000, () => {
        setDemo(featuredSite ? `Demo: ${featuredSite.analog.name.split(',')[0]}, an SBATS candidate` : 'Demo: a second site');
        select(featured);
      });
    }
    if (reconReady && featured !== null) {
      const has3d = flags.boots && !!featuredSite && extractIds.has(featuredSite.analog.id) && extractIds.has(demoTarget.id);
      at(15500, () => {
        setDemo('Demo: a base at the site');
        setSelected(featured);
        setStep(3);
        setTab('results');
        setView('recon');
      });
      at(16300, () => sandboxRef.current?.loadExample());
      at(18500, () => {
        setDemo(`Demo: the same base at ${demoTarget.name}`);
        sandboxRef.current?.deploy();
      });
      if (has3d) {
        at(20500, () => {
          setDemo('Demo: both sites as terrain, one scale');
          sandboxRef.current?.setMode('3d');
        });
      }
      at(25000, () => {
        setDemo('Demo: 30 days, day by day');
        sandboxRef.current?.setMode('plan');
        sandboxRef.current?.setDay(1);
        document.getElementById('h-time')?.scrollIntoView({ block: 'start' });
      });
      for (let i = 1; i <= 10; i++) at(25000 + i * 420, () => sandboxRef.current?.setDay(i * 3));
      at(30000, () => {
        timers.current = [];
        setDemo(null);
      });
    } else {
      at(16000, () => {
        timers.current = [];
        setDemo(null);
      });
    }
  };

  const openRecon = useCallback(() => {
    if (!reconReady) return;
    // Step 3 needs an Earth site. With none open, take the featured candidate site or the top cell.
    const i = selected ?? featured;
    if (i === null) return;
    if (selected === null) setSelected(i);
    setStep(3);
    setTab('results');
    setView('recon');
  }, [reconReady, selected, featured]);

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
      setStep(3);
      setView('recon');
    } catch {
      // A link that cannot be read opens the app as usual.
    }
  }, [reconReady, targets, index, featured]);

  const onStep = (s: Step) => {
    if (s === 3) return openRecon();
    setView('orbit');
    setStep(s);
    if (s === 1) {
      setSelected(null);
      setTab('setup');
      leftRef.current?.querySelector<HTMLElement>('input[name="target"]:checked')?.focus();
    } else if (s === 2) {
      if (step === 1) return goToEarth();
      setTab('results');
      rightRef.current?.querySelector<HTMLElement>('button')?.focus();
    }
  };

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
  const extractIndex = extracts.status === 'ready' ? extracts.value : null;
  const month = useMemo(() => {
    const months = named ? climateFile?.sites.find((x) => x.id === named.id)?.months : undefined;
    if (!months || !explained || !climateFile) return null;
    return { result: bestMonth(months, explained), source: `NASA POWER monthly climatology ${climateFile.meta.period}` };
  }, [named, climateFile, explained]);
  const namedHasPage = !!named && !!featuredSites?.sites.some((x) => x.id === named.id);
  const infoOpen = view === 'method' || view === 'validation' || view === 'site';
  const showWorld = view === 'orbit' && step === 1;

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

  const status = demo ?? (weights !== liveWeights ? 'Scoring' : selected !== null ? 'Dossier open' : 'Ready');

  return (
    <div className="flex min-h-full flex-col lg:h-full">
      <TopBar
        step={step}
        onStep={onStep}
        demoRunning={demo !== null}
        onDemo={runDemo}
        methodOpen={infoOpen}
        onMethod={() => setView((v) => (v === 'method' || v === 'validation' || v === 'site' ? 'orbit' : 'method'))}
        reconLocked={!reconReady}
      />

      {data.warnings.length > 0 && (
        <div className="border-b border-line bg-panel px-4 py-2 text-[12px] text-accent" role="alert">
          {data.warnings.join(' ')}
        </div>
      )}

      {flags.methodPage && infoOpen && (
        <InfoShell
          view={view}
          onView={(v) => (v === 'site' ? openSitePage(siteId ?? featuredSites?.sites[0]?.id ?? '') : setView(v))}
          onBack={() => setView('orbit')}
          title={
            view === 'method'
              ? 'How a match score is made, with what data, and where it stops being reliable'
              : view === 'validation'
                ? 'Do known analog sites score high and wrong places score low? The numbers, including the weak ones'
                : (featuredSites?.sites.find((x) => x.id === siteId) ?? featuredSites?.sites[0])?.name ?? 'Featured sites'
          }
        >
          {view === 'method' ? (
            <MethodPage earth={earth} targets={targets} lithology={lithology} listLimit={LIST_LIMIT} />
          ) : view === 'validation' ? (
            <ValidationPage earth={earth} targets={targets} onOpenSite={openSite} />
          ) : sitesFile.status === 'loading' ? (
            <Loading what="featured sites" />
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
              onBuild={
                reconReady
                  ? (i) => {
                      setSelected(i);
                      setStep(3);
                      setTab('results');
                      setView('recon');
                    }
                  : null
              }
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
          ground={{
            earth: extractIndex?.items.find((x) => x.id === named?.id) ?? null,
            target: extractIndex?.items.find((x) => x.id === target.id) ?? null,
            windowKm: extractIndex?.meta.windowKm ?? 20,
          }}
          initial={sharedLayout}
          tab={tab}
          onTab={setTab}
          onBack={() => {
            setView('orbit');
            setStep(2);
          }}
        />
      )}

      {/* The globe stays mounted behind the Method page, so coming back is instant. */}
      <div className={`min-h-0 flex-1 flex-col lg:grid-cols-[320px_minmax(0,1fr)_380px] ${view !== 'orbit' ? 'hidden' : 'flex lg:grid'}`}>
        <aside
          ref={leftRef}
          aria-label="Target and mission controls"
          className={`scroll order-3 bg-panel lg:order-1 lg:block lg:min-h-0 lg:border-r lg:border-line ${tab === 'setup' ? 'block' : 'hidden'}`}
        >
          <LeftPanel
            targets={targets}
            targetId={target.id}
            onTarget={setTargetId}
            presets={PRESETS}
            presetId={presetId}
            onPreset={(id) => {
              const p = PRESETS.find((x) => x.id === id);
              if (!p) return;
              setPresetId(id);
              setWeights(p.weights);
            }}
            mode={matchMode}
            onMode={(m) => {
              setMatchMode(m);
              // The purpose list sits below the target card: bring it into view when it appears.
              if (m === 'purpose') window.setTimeout(() => document.getElementById('purpose-section')?.scrollIntoView({ block: 'nearest' }), 0);
            }}
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

        <div className="h-[46vh] min-h-[280px] shrink-0 order-1 border-b border-line lg:order-2 lg:h-auto lg:min-h-0 lg:border-b-0">
          <Suspense
            fallback={
              <div className="flex h-full items-center bg-bg px-4">
                <p className="label" role="status">
                  Loading globe
                </p>
              </div>
            }
          >
            <div className={showWorld ? 'h-full' : 'hidden'}>
              <WorldGlobe targets={targets} targetId={target.id} onTarget={setTargetId} onPick={goToEarth} active={showWorld} />
            </div>
            <div className={showWorld ? 'hidden' : 'h-full'}>
            <GlobeView
              earth={earth}
              results={results}
              index={index}
              selected={selected}
              candidates={mapCandidates}
              sites={mapSites}
              onSelect={select}
              focus={focus}
              active={view === 'orbit' && !showWorld}
            />
            </div>
          </Suspense>
        </div>

        <div className="order-2 grid shrink-0 grid-cols-2 border-b border-line bg-panel lg:hidden" role="group" aria-label="Panel">
          {(['setup', 'results'] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={`label min-h-11 border-r border-line last:border-r-0 ${tab === t ? 'bg-bg !text-accent' : '!text-text'}`}
            >
              {t === 'setup' ? (step === 1 ? 'Targets' : 'Target and weights') : step === 1 ? 'This target' : selected !== null ? 'Dossier' : 'Candidates'}
            </button>
          ))}
        </div>

        <aside
          ref={rightRef}
          aria-label={step === 1 ? 'Target' : selected !== null ? 'Site dossier' : 'Analog candidates'}
          className={`scroll order-3 bg-panel lg:order-3 lg:block lg:min-h-0 lg:border-l lg:border-line ${tab === 'results' ? 'block' : 'hidden'}`}
        >
          {showWorld ? (
            <TargetBrief
              target={target}
              extract={extractIndex?.items.find((x) => x.id === target.id) ?? null}
              extractsState={extracts.status}
              windowKm={extractIndex?.meta.windowKm ?? 20}
              onFind={() => goToEarth()}
            />
          ) : selectedCell && explained ? (
            <Dossier
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
              onBack={() => setSelected(null)}
              onBuild={reconReady ? openRecon : null}
              month={month}
              onSitePage={
namedHasPage && named ? () => openSitePage(named.id) : null
              }
            />
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
              mode={mode}
              onMode={setMode}
              onSelect={select}
            />
          )}
        </aside>
      </div>

      <StatusStrip
        coords={selectedCell ? formatCoords(selectedCell.lat, selectedCell.lon) : null}
        code={selectedCell ? siteCode(selectedCell) : null}
        cells={earth.cells.length}
        resolutionDeg={earth.meta.resolutionDeg}
        fixtureFiles={[...data.fixtureFiles.map((f) => `${f}.json`), ...(view === 'recon' && modules.status === 'ready' && modules.value.fixture ? ['modules.json'] : [])]}
        view={view}
        status={view === 'orbit' ? status : view === 'recon' ? (demo ?? 'Sandbox') : view === 'site' ? 'Site page' : 'Reading'}
      />
    </div>
  );
}

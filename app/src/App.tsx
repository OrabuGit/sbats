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
import { InfoShell } from './components/InfoParts';
import { flags } from './flags';
import { Sandbox, type SandboxHandle } from './components/Sandbox';
import { annualSolar, loadModules, loadSiteClimate } from './data/sandbox';
import { useAsync } from './lib/useAsync';
import { decodeLayout, type SavedLayout } from './lib/simAdapter';

// The globe (three.js and globe.gl) is by far the largest part of the app. It is fetched as its
// own chunk, starting now and in parallel with the data, so the panels never wait for it.
const globeModule = import('./components/GlobeView');
const GlobeView = lazy(() => globeModule.then((m) => ({ default: m.GlobeView })));

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
  const [tab, setTab] = useState<'setup' | 'results'>('results');
  const [focus, setFocus] = useState<{ lat: number; lon: number; seq: number } | null>(null);
  const [demo, setDemo] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [view, setView] = useState<'orbit' | 'method' | 'validation' | 'recon'>('orbit');
  const [sharedLayout, setSharedLayout] = useState<SavedLayout | null>(null);
  const sandboxRef = useRef<SandboxHandle>(null);
  const modules = useAsync(loadModules, 'modules');
  const climate = useAsync(loadSiteClimate, 'climate');
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

  const featured = useMemo(() => {
    const cand = sites.find((s) => s.analog.kind === 'candidate' && s.index >= 0 && results[s.index]?.score !== null);
    return cand?.index ?? candidates[0]?.index ?? null;
  }, [sites, results, candidates]);

  const runDemo = () => {
    if (demo) return stopDemo();
    setView('orbit');
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    setSelected(null);
    setMode('ranked');
    setPresetId(PRESETS[0].id);
    setWeights(PRESETS[0].weights);
    setMatchMode('all');
    setTab('setup');
    setStep(1);
    setDemo(`Demo: target ${target.name}`);
    const top = candidates[0]?.index ?? null;
    at(2500, () => {
      setTab('results');
      setStep(2);
      setDemo('Demo: ranking Earth cells');
      if (top !== null) setFocus({ lat: earth.cells[top].lat, lon: earth.cells[top].lon, seq: ++seq.current });
    });
    at(6000, () => {
      setDemo('Demo: opening the top candidate');
      if (top !== null) select(top);
    });
    if (featured !== null && featured !== top) {
      at(11000, () => {
        setDemo('Demo: an SBATS candidate site');
        select(featured);
      });
    }
    at(16000, () => {
      timers.current = [];
      setDemo(null);
    });
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

  const status = demo ?? (weights !== liveWeights ? 'Scoring' : selected !== null ? 'Dossier open' : 'Ready');

  return (
    <div className="flex min-h-full flex-col lg:h-full">
      <TopBar
        step={step}
        onStep={onStep}
        demoRunning={demo !== null}
        onDemo={runDemo}
        methodOpen={view === 'method' || view === 'validation'}
        onMethod={() => setView((v) => (v === 'method' || v === 'validation' ? 'orbit' : 'method'))}
        reconLocked={!reconReady}
      />

      {data.warnings.length > 0 && (
        <div className="border-b border-line bg-panel px-4 py-2 text-[12px] text-accent" role="alert">
          {data.warnings.join(' ')}
        </div>
      )}

      {flags.methodPage && (view === 'method' || view === 'validation') && (
        <InfoShell
          view={view}
          onView={setView}
          onBack={() => setView('orbit')}
          title={
            view === 'method'
              ? 'How a match score is made, with what data, and where it stops being reliable'
              : 'Do known analog sites score high and wrong places score low? The numbers, including the weak ones'
          }
        >
          {view === 'method' ? (
            <MethodPage earth={earth} targets={targets} lithology={lithology} listLimit={LIST_LIMIT} />
          ) : (
            <ValidationPage earth={earth} targets={targets} onOpenSite={openSite} />
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
          solar={annualSolar(climate.status === 'ready' ? climate.value : null, named?.id ?? null)}
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
              <div className="flex h-full items-center justify-center bg-bg">
                <p className="label" role="status">
                  Loading globe
                </p>
              </div>
            }
          >
            <GlobeView
              earth={earth}
              results={results}
              index={index}
              selected={selected}
              candidates={mapCandidates}
              sites={mapSites}
              onSelect={select}
              focus={focus}
            />
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
              {t === 'setup' ? 'Target and weights' : selected !== null ? 'Dossier' : 'Candidates'}
            </button>
          ))}
        </div>

        <aside
          ref={rightRef}
          aria-label={selected !== null ? 'Site dossier' : 'Analog candidates'}
          className={`scroll order-3 bg-panel lg:order-3 lg:block lg:min-h-0 lg:border-l lg:border-line ${tab === 'results' ? 'block' : 'hidden'}`}
        >
          {selectedCell && explained ? (
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
        status={view === 'orbit' ? status : view === 'recon' ? (demo ?? 'Sandbox') : 'Reading'}
      />
    </div>
  );
}

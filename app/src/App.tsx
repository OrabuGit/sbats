import { Suspense, lazy, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { loadData, type DataBundle } from './data/access';
import { FACTOR_IDS, FACTOR_KEYS, type FactorId, type Weights } from './types';
import { PRESETS, createScorer } from './lib/scoringAdapter';
import { buildIndex, formatCoords, siteCode } from './lib/geo';
import { keyLabel, metaByKey } from './lib/format';
import { isNewSite, percentile, tally, topCandidates } from './lib/rank';
import { StatusStrip, TopBar, type Step } from './components/Chrome';
import { LeftPanel } from './components/LeftPanel';
import { CandidateList, type ListMode } from './components/CandidateList';
import { Dossier } from './components/Dossier';
import { MethodPage } from './components/MethodPage';
import { flags } from './flags';

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
  const [weights, setWeights] = useState<Weights>(PRESETS[0].weights);
  const [selected, setSelected] = useState<number | null>(null);
  const [includeLow, setIncludeLow] = useState(false);
  const [mode, setMode] = useState<ListMode>('ranked');
  const [tab, setTab] = useState<'setup' | 'results'>('results');
  const [focus, setFocus] = useState<{ lat: number; lon: number; seq: number } | null>(null);
  const [demo, setDemo] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [view, setView] = useState<'orbit' | 'method'>('orbit');

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
    const requiredUnbuilt = unbuilt.filter((k) => k === 'ndvi' || k === 'precip').map((k) => keyLabel(k, meta));
    const requiredNoTarget = (['ndvi', 'precip'] as const).filter((k) => target.values[k]?.value == null).map((k) => keyLabel(k, meta));
    const parts = ['No cell can be scored yet.'];
    if (requiredUnbuilt.length > 0)
      parts.push(
        `${requiredUnbuilt.join(' and ')} ${requiredUnbuilt.length > 1 ? 'have' : 'has'} no data in any cell of earth.json, and vegetation and precipitation are both required before a cell gets a score.`,
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

  const onStep = (s: Step) => {
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
        methodOpen={view === 'method'}
        onMethod={() => setView((v) => (v === 'method' ? 'orbit' : 'method'))}
      />

      {data.warnings.length > 0 && (
        <div className="border-b border-line bg-panel px-4 py-2 text-[12px] text-accent" role="alert">
          {data.warnings.join(' ')}
        </div>
      )}

      {flags.methodPage && view === 'method' && (
        <MethodPage earth={earth} lithology={lithology} listLimit={LIST_LIMIT} onBack={() => setView('orbit')} />
      )}

      {/* The globe stays mounted behind the Method page, so coming back is instant. */}
      <div className={`min-h-0 flex-1 flex-col lg:grid-cols-[320px_minmax(0,1fr)_380px] ${view === 'method' ? 'hidden' : 'flex lg:grid'}`}>
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
            weights={weights}
            onWeight={(id: FactorId, v: number) => {
              // The library needs at least one weight above zero, so the last one cannot reach 0.
              const next = { ...weights, [id]: v };
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
              named={named}
              isNew={isNewSite(selectedCell, analogs)}
              rank={rank}
              percentile={pct}
              gaps={ts.prepared.gaps}
              notes={ts.notes}
              onBack={() => setSelected(null)}
            />
          ) : (
            <CandidateList
              earth={earth}
              target={target}
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
        fixtureFiles={data.fixtureFiles.map((f) => `${f}.json`)}
        view={view === 'method' ? 'Method' : 'Orbit'}
        status={view === 'method' ? 'Method' : status}
      />
    </div>
  );
}

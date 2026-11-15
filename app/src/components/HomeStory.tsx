import { useEffect, useRef, useState } from 'react';
import type { CellSummary, EarthFile } from '../types';
import { FACTOR_LABELS, PRESETS } from '../lib/scoringAdapter';
import { FACTOR_IDS } from '../types';
import { useAsync } from '../lib/useAsync';
import { loadExtra } from '../data/access';
import { loadFrozen, loadReport, loadSources } from '../data/validation';
import type { ExtractIndex } from '../data/sites';
import { verdictOf, VERDICT_WORD } from '../lib/verdict';

/** Fades and lifts its children once, the first time they come into view. */
export function Reveal({ children, i = 0, className = '' }: { children: React.ReactNode; i?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || on) return;
    const io = new IntersectionObserver(
      (e) => {
        if (e[0]?.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [on]);
  return (
    <div ref={ref} className={`reveal ${on ? 'in' : ''} ${className}`} style={{ ['--i' as string]: i }}>
      {children}
    </div>
  );
}

/** The Earth, one pixel pair per 0.5 degree cell, lit by match score: the same data the globe shows. */
function MiniHeat({ earth, results, shown }: { earth: EarthFile; results: CellSummary[]; shown: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const res = earth.meta.resolutionDeg;
    const cols = Math.round(360 / res);
    const rows = Math.round(180 / res);
    cv.width = cols;
    cv.height = rows;
    const g = cv.getContext('2d')!;
    const img = g.createImageData(cols, rows);
    // Brightness is relative to the best cell for this target, so the pattern shows even when every score is low.
    let top = 1;
    for (const r of results) if (r.score !== null && r.score > top) top = r.score;
    earth.cells.forEach((c, i) => {
      const col = Math.min(cols - 1, Math.floor((c.lon + 180) / res));
      const row = Math.min(rows - 1, Math.floor((90 - c.lat) / res));
      const o = (row * cols + col) * 4;
      const sc = results[i]?.score;
      if (sc === null || sc === undefined) {
        img.data.set([43, 51, 59, 150], o);
      } else {
        img.data.set([255, 176, 0, Math.round(255 * (0.06 + 0.94 * Math.pow(sc / top, 1.5)))], o);
      }
    });
    g.putImageData(img, 0, 0);
  }, [earth, results]);
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label="Every land cell of Earth, brighter where the match score is higher"
      className="block w-full"
      style={{
        imageRendering: 'auto',
        clipPath: shown ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
        transition: 'clip-path 2200ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    />
  );
}

interface Pick {
  lat: number;
  lon: number;
  score: number;
  dimensions: Record<string, { similarity: number | null; verdict: string }>;
}
interface Discoveries {
  targets: { target: string; name: string; top: Pick[] }[];
}

const DIMS = [
  ['geology', 'Rock'],
  ['terrain', 'Terrain'],
  ['climate', 'Climate'],
  ['bareGround', 'Bare ground'],
  ['sunlight', 'Sunlight'],
] as const;
const toVerdict = (v: string) => (v === 'matches' ? 'match' : v === 'partly' ? 'partial' : v === 'does-not-match' ? 'miss' : 'none');

const STEPS = [
  { h: 'Pick a place on another world.', t: (n: number) => `${n} landing sites and candidate base regions on the Moon and Mars are pinned on their globes. Pick one, or any point.` },
  { h: 'Every land cell of Earth is scored against it.', t: (n: number) => `${n.toLocaleString('en-US')} cells, scored in your browser on terrain, bare ground, dryness, temperature, sunlight and rock. Brighter means closer.` },
  { h: 'Open a match and see why.', t: () => 'Both places side by side, each dimension with both values and a verdict, and what no place on Earth can copy.' },
  { h: 'Then act on it.', t: () => 'A cited report you can print, 3D terrain of both places with a route driven on each, and a base layout run at both.' },
];

const LIMITS = [
  'A score describes a whole 0.5° cell, about 55 km on a side. A small site inside a different landscape is scored as its surroundings. Featured sites are also measured inside their own footprint, 2 to 7.4 km.',
  'Gravity, vacuum, thin atmosphere and radiation cannot be matched anywhere on Earth. They are never scored; every match lists them.',
  'The Moon and Mars are colder than anywhere on Earth. A target temperature is compared with Earth’s coldest cell, and the real value is shown beside it.',
  'Absolute scores are low, and known Moon analogs rank mid-table. The validation numbers, weak ones included, are on the Validation page.',
  'There is no factor for caves, lava tubes, lakes or water chemistry. Whether a site is a good lava tube analog rests on the feature, not on a score.',
  'A missing value reads “no data”. Nothing is filled in.',
];

interface Props {
  earth: EarthFile;
  results: CellSummary[];
  targetName: string;
  targetId: string;
  placeNames: string[];
  placeCount: number;
  extracts: ExtractIndex | null;
  leadImage: string | null;
  onMethod: () => void;
  onValidation: () => void;
  onFind: () => void;
}

/** How it works: text on the left, a stage on the right that shows the step with real data. Then why to trust it. */
export function HomeStory({ earth, results, targetName, targetId, placeNames, placeCount, leadImage, onMethod, onValidation, onFind }: Props) {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const sources = useAsync(loadSources, 'home-sources');
  const report = useAsync(() => loadReport('base'), 'home-report');
  const frozen = useAsync(loadFrozen, 'home-frozen');
  const disc = useAsync(() => loadExtra<Discoveries>('discoveries.json'), 'home-disc');
  const pick = disc.status === 'ready' ? (disc.value?.targets.find((t) => t.target === targetId)?.top[0] ?? null) : null;

  // The step whose text is nearest the middle of the screen is the active one, so the stage never shows a step
  // that is not the one being read. Scroll events do not bubble, so listen in the capture phase.
  useEffect(() => {
    let frame = 0;
    const pick = () => {
      frame = 0;
      const mid = window.innerHeight / 2;
      let best = 0;
      let bestD = Infinity;
      stepRefs.current.forEach((el, n) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const d = Math.abs((r.top + r.bottom) / 2 - mid);
        if (d < bestD) {
          bestD = d;
          best = n;
        }
      });
      setActive(best);
    };
    const on = () => {
      if (!frame) frame = requestAnimationFrame(pick);
    };
    window.addEventListener('scroll', on, true);
    window.addEventListener('resize', on);
    pick();
    return () => {
      window.removeEventListener('scroll', on, true);
      window.removeEventListener('resize', on);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const datasets = sources.status === 'ready' && sources.value ? (sources.value.find((t) => t.headers[0] === 'Dataset')?.rows.length ?? null) : null;
  const hold = report.status === 'ready' ? report.value?.sets.holdout : null;
  const pct = (v: number | null | undefined) => (v === null || v === undefined ? 'no data' : `${(v * 100).toFixed(0)}%`);
  const base = PRESETS[0];

  const stage = [
    // 1. Pick a place
    <div key="s1" className="flex h-full flex-col justify-center gap-3">
      <p className="text-[13px] text-muted">Places on Mars and the Moon</p>
      {placeNames.slice(0, 6).map((n, i) => (
        <div key={n} className={`flex items-center gap-4 border-l-2 py-2.5 pl-4 text-[17px] ${i === 1 ? 'border-accent text-text' : 'border-line text-muted'}`}>
          <span className="inline-block h-3 w-3 rounded-full border-2 border-current" aria-hidden="true" />
          {n}
        </div>
      ))}
      <p className="mt-2 text-[13px] text-muted">…and {Math.max(0, placeCount - 6)} more</p>
    </div>,
    // 2. Scored
    <div key="s2" className="flex h-full flex-col justify-center">
      <MiniHeat earth={earth} results={results} shown={active === 1} />
      <p className="mt-3 text-[13px] text-muted">
        Every land cell, scored for <span className="text-text">{targetName}</span>. Brighter is closer, relative to the best cell. Real scores, computed in your browser.
      </p>
    </div>,
    // 3. Match
    <div key="s3" className="flex h-full flex-col justify-center">
      <p className="text-[13px] text-muted">The best cell for {targetName}</p>
      <p className="display-l mt-1 text-[56px] text-text">{pick ? pick.score.toFixed(0) : 'no data'}<span className="ml-2 text-[16px] font-normal text-muted">/ 100</span></p>
      <ul className="mt-6 divide-y divide-line">
        {DIMS.map(([id, label]) => {
          const d = pick?.dimensions[id];
          const v = toVerdict(d?.verdict ?? '');
          const sim = d?.similarity ?? null;
          return (
            <li key={id} className="flex items-center gap-4 py-3">
              <span className="w-[110px] text-[15px] text-text">{label}</span>
              <span className="relative block h-2 flex-1 bg-line" aria-hidden="true">
                <span className="absolute inset-y-0 left-[30%] w-px bg-bg" />
                <span className="absolute inset-y-0 left-[75%] w-px bg-bg" />
                <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${(sim ?? 0) * 100}%` }} />
              </span>
              <span className={`w-[110px] text-right text-[13px] ${v === 'match' ? 'font-semibold text-text' : 'text-muted'}`}>{VERDICT_WORD[verdictOf(sim)] ?? 'No data'}</span>
            </li>
          );
        })}
      </ul>
    </div>,
    // 4. Act
    <div key="s4" className="flex h-full flex-col justify-center">
      <div className="relative aspect-[4/3] overflow-hidden bg-panel">
        {leadImage && <img src={leadImage} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
      </div>
      <ul className="mt-5 grid grid-cols-3 gap-4 text-[15px] text-text">
        {['Report', '3D terrain', 'Base layout'].map((t) => (
          <li key={t} className="border-t border-line pt-3">
            {t}
          </li>
        ))}
      </ul>
    </div>,
  ];

  return (
    <>
      <section aria-labelledby="h-how" className="px-5 pb-10 pt-28 sm:px-10 lg:px-16">
        <Reveal>
          <h2 id="h-how" className="display-l max-w-[18ch] text-[40px] sm:text-[64px]">
            How it works
          </h2>
        </Reveal>
        <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-20">
          <ol>
            {STEPS.map((s, n) => (
              <li
                key={s.h}
                ref={(el) => {
                  stepRefs.current[n] = el;
                }}
                data-n={n}
                className="py-10 lg:flex lg:min-h-[60vh] lg:flex-col lg:justify-center lg:py-0"
              >
                <Reveal>
                  <p className={`num text-[14px] transition-colors duration-500 ${active === n ? 'text-accent' : 'text-muted'}`}>{n + 1}</p>
                  <h3 className="display-l mt-2 max-w-[16ch] text-[30px] sm:text-[44px]">{s.h}</h3>
                  <p className="mt-4 max-w-[46ch] text-[16px] leading-[26px] text-muted">{s.t(n === 1 ? earth.cells.length : placeCount)}</p>
                </Reveal>
                <div className="mt-8 h-[400px] lg:hidden">{stage[n]}</div>
              </li>
            ))}
          </ol>
          <div className="hidden lg:block">
            <div className="sticky top-28 h-[calc(100vh-9rem)] max-h-[640px]">
              {stage.map((v, n) => (
                <div key={n} className="absolute inset-0 transition-all duration-700 ease-out" style={{ opacity: active === n ? 1 : 0, transform: active === n ? 'none' : 'translateY(18px)', pointerEvents: active === n ? 'auto' : 'none' }} aria-hidden={active !== n}>
                  {v}
                </div>
              ))}
            </div>
          </div>
        </div>
        <Reveal className="mt-6">
          <button type="button" onClick={onFind} className="btn btn-primary !px-6">
            Find an analog
          </button>
        </Reveal>
      </section>

      <section aria-labelledby="h-trust" className="px-5 pb-28 pt-24 sm:px-10 lg:px-16">
        <Reveal>
          <h2 id="h-trust" className="display-l max-w-[20ch] text-[34px] sm:text-[52px]">
            Why the numbers can be trusted, and where they stop.
          </h2>
        </Reveal>
        <div className="mt-16 grid gap-x-16 gap-y-16 lg:grid-cols-3">
          <Reveal>
            <h3 className="display text-[22px] text-text">The data</h3>
            <dl className="mt-6 space-y-5">
              {[
                [earth.cells.length.toLocaleString('en-US'), `land cells at ${earth.meta.resolutionDeg}°, about ${Math.round(earth.meta.resolutionDeg * 111)} km`],
                [String(earth.meta.factors.length), 'measurements per cell, from NASA and ESA datasets'],
                [datasets === null ? 'no data' : String(datasets), 'datasets in SOURCES.md, each with provider, licence and date'],
              ].map(([n, t]) => (
                <div key={t} className="flex items-baseline gap-4">
                  <dt className="num display w-[92px] shrink-0 text-[28px] text-text">{n}</dt>
                  <dd className="text-[14px] leading-5 text-muted">{t}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-[14px] leading-[22px] text-muted">Every number in the app carries its source: Measured, Mission, Literature or Computed.</p>
          </Reveal>

          <Reveal i={1}>
            <h3 className="display text-[22px] text-text">The method</h3>
            <p className="num mt-6 text-[13px] leading-6 text-text">similarity = exp(−½ × ((earth − target) / tolerance)²)</p>
            <p className="num text-[13px] leading-6 text-text">score = 100 × weighted geometric mean</p>
            <ul className="mt-5 space-y-2">
              {FACTOR_IDS.map((id, k) => (
                <li key={id} className="grid grid-cols-[100px_1fr_34px] items-center gap-3">
                  <span className="text-[13px] text-text">{FACTOR_LABELS[id]}</span>
                  <span className="block h-1 bg-line" aria-hidden="true">
                    <span className="bar-grow block h-full bg-text" style={{ ['--to' as string]: base.weights[id] / 0.25, ['--i' as string]: k }} />
                  </span>
                  <span className="num text-right text-[12px] text-muted">{Math.round(base.weights[id] * 100)}%</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-muted">
              Weights frozen{frozen.status === 'ready' && frozen.value ? ` on ${frozen.value.frozenAt}` : ''}, before the test below.
            </p>
            {hold ? (
              <p className="mt-6 text-[14px] leading-[22px] text-text">
                On sites never used to set a weight, <span className="num">{pct(hold.overall.top10Share)}</span> of known analogs reach the top 10% of Earth cells:{' '}
                <span className="num">{pct(hold.mars.top10Share)}</span> for Mars targets and <span className="num">{pct(hold.moon.top10Share)}</span> for Moon targets. The Moon is the weak result.
              </p>
            ) : (
              <p className="mt-6 text-[13px] text-muted">{report.status === 'loading' ? 'Loading validation' : 'No data. The validation report was not published with this build.'}</p>
            )}
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
              <button type="button" onClick={onMethod} className="link-rule text-[15px] font-medium text-text">
                Read the method
              </button>
              <button type="button" onClick={onValidation} className="link-rule text-[15px] font-medium text-text">
                All validation numbers
              </button>
            </div>
          </Reveal>

          <Reveal i={2}>
            <h3 className="display text-[22px] text-text">Its limits</h3>
            <ul className="mt-6 space-y-4">
              {LIMITS.map((t) => (
                <li key={t} className="text-[14px] leading-[22px] text-muted">
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>
    </>
  );
}


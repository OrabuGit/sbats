import { useEffect, useRef, useState } from 'react';
import type { CellSummary, EarthFile } from '../types';
import { FACTOR_LABELS, PRESETS } from '../lib/scoringAdapter';
import { FACTOR_IDS } from '../types';
import { useAsync } from '../lib/useAsync';
import { loadExtra } from '../data/access';
import { loadFrozen, loadReport, loadSources } from '../data/validation';
import type { ExtractIndex } from '../data/sites';
import { verdictOf, VERDICT_WORD } from '../lib/verdict';
import { ActivityArt } from './ActivityArt';
import { ElementIcon, isElement } from './ElementIcon';
import type { HeroPlace } from './HeroGlobes';
import { countryAt } from '../lib/where';

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

const TEX = (name: string) => `${import.meta.env.BASE_URL}textures/${name}.jpg`;

/** Counts up to a number once `on` turns true. */
function useCount(to: number, on: boolean, ms = 1800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!on) return setV(0);
    const t0 = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, on, ms]);
  return v;
}

/** A world's real imagery as a flat map with its named places pinned at their true positions. */
function PinMap({ body, places, chosen, on }: { body: 'moon' | 'mars'; places: HeroPlace[]; chosen: string | null; on: boolean }) {
  const here = places.filter((p) => p.body === body);
  return (
    <figure className="m-0">
      <div className="relative aspect-[2.6/1] overflow-hidden bg-panel" style={{ backgroundImage: `url(${TEX(body === 'moon' ? 'moon-wac-2048' : 'mars-viking-2048')})`, backgroundSize: '100% 100%' }}>
        <span className="absolute inset-0 bg-bg/35" aria-hidden="true" />
        {here.map((p, i) => {
          const strong = p.hasValues;
          const isChosen = p.id === chosen;
          return (
            <span
              key={p.id}
              className={`absolute block -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${isChosen ? 'z-10 h-4 w-4 border-accent bg-accent' : strong ? 'h-2.5 w-2.5 border-accent bg-bg' : 'h-2 w-2 border-text bg-bg'}`}
              style={{ left: `${((p.lon + 180) / 360) * 100}%`, top: `${((90 - p.lat) / 180) * 100}%`, opacity: on ? 1 : 0, transform: `translate(-50%, -50%) scale(${on ? 1 : 0.2})`, transition: `opacity 500ms ease ${Math.min(i * 40, 900)}ms, transform 500ms ease ${Math.min(i * 40, 900)}ms` }}
              aria-hidden="true"
            />
          );
        })}
      </div>
      <figcaption className="mt-1.5 flex items-baseline justify-between text-[13px] text-muted">
        <span className="text-text">{body === 'moon' ? 'The Moon' : 'Mars'}</span>
        <span>{here.length} places pinned, amber where values exist</span>
      </figcaption>
    </figure>
  );
}

/** A round window onto a world's imagery, centred on a point. */
function Disc({ tex, lat, lon, size = 132 }: { tex: string; lat: number; lon: number; size?: number }) {
  const w = size * 4;
  const x = ((lon + 180) / 360) * w - size / 2;
  const y = ((90 - lat) / 180) * (w / 2) - size / 2;
  return (
    <span
      className="relative block shrink-0 overflow-hidden rounded-full bg-panel"
      style={{ width: size, height: size, backgroundImage: `url(${TEX(tex)})`, backgroundSize: `${w}px ${w / 2}px`, backgroundPosition: `${-x}px ${-y}px` }}
      aria-hidden="true"
    >
      <span className="absolute left-1/2 top-1/2 block h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent" />
    </span>
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
  places: HeroPlace[];
  placeCount: number;
  extracts: ExtractIndex | null;
  leadImage: string | null;
  onMethod: () => void;
  onValidation: () => void;
  onFind: () => void;
}

/** How it works: text on the left, a stage on the right that shows the step with real data. Then why to trust it. */
export function HomeStory({ earth, results, targetName, targetId, places, placeCount, leadImage, onMethod, onValidation, onFind }: Props) {
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

  const counted = useCount(earth.cells.length, active === 1);
  const moonChosen = places.find((p) => p.body === 'moon' && targetName && p.name.includes(targetName))?.id ?? places.find((p) => p.body === 'moon' && p.hasValues)?.id ?? null;
  const marsChosen = places.find((p) => p.body === 'mars' && p.hasValues)?.id ?? null;
  const targetPos = places.find((p) => targetName && p.name.includes(targetName)) ?? null;
  const [where, setWhere] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (pick) countryAt(pick.lat, pick.lon).then((c) => alive && setWhere(c));
    return () => {
      alive = false;
    };
  }, [pick]);

  const stage = [
    // 1. Pick a place: the real imagery with every place at its true position
    <div key="s1" className="flex h-full flex-col justify-center gap-6">
      <PinMap body="moon" places={places} chosen={moonChosen} on={active === 0} />
      <PinMap body="mars" places={places} chosen={marsChosen} on={active === 0} />
    </div>,
    // 2. Scored: a scan sweeps across the Earth and lights each cell
    <div key="s2" className="flex h-full flex-col justify-center">
      <div className="relative aspect-[2/1] overflow-hidden bg-panel" style={{ backgroundImage: `url(${TEX('blue-marble-2048')})`, backgroundSize: '100% 100%' }}>
        <span className="absolute inset-0 bg-bg/70" aria-hidden="true" />
        <div className="absolute inset-0">
          <MiniHeat earth={earth} results={results} shown={active === 1} />
        </div>
        <span
          className="absolute inset-y-0 w-0.5 bg-accent"
          style={{ left: active === 1 ? '100%' : '0%', opacity: active === 1 ? 1 : 0, transition: 'left 2200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 400ms ease 2100ms' }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-5 flex items-baseline gap-4">
        <p className="display text-[44px] leading-none text-text">{counted.toLocaleString('en-US')}</p>
        <p className="text-[14px] leading-5 text-muted">
          land cells scored for <span className="text-text">{targetName}</span>, in your browser. Brighter is closer.
        </p>
      </div>
    </div>,
    // 3. Match: the two places, the score, and the verdict of each dimension
    <div key="s3" className="flex h-full flex-col justify-center">
      <div className="flex items-center gap-4">
        {pick ? <Disc tex="blue-marble-2048" lat={pick.lat} lon={pick.lon} /> : <span className="block h-[132px] w-[132px]" />}
        <svg viewBox="0 0 120 40" className="h-10 min-w-0 flex-1" preserveAspectRatio="none" aria-hidden="true">
          <path d="M2 30 Q60 -12 118 30" fill="none" stroke="#FFB000" strokeWidth="2" strokeDasharray="130" strokeDashoffset={active === 2 ? 0 : 130} style={{ transition: 'stroke-dashoffset 1200ms ease 200ms' }} />
        </svg>
        {targetPos ? <Disc tex={targetPos.body === 'moon' ? 'moon-wac-2048' : 'mars-viking-2048'} lat={targetPos.lat} lon={targetPos.lon} /> : <span className="block h-[132px] w-[132px]" />}
      </div>
      <div className="mt-2 flex justify-between text-[13px] text-muted">
        <span className="text-text">{where ?? 'Open land'}</span>
        <span className="text-text">{targetName}</span>
      </div>
      <p className="display-l mt-4 text-[56px] leading-none text-text">
        {pick ? pick.score.toFixed(0) : 'no data'}
        <span className="ml-2 text-[16px] font-normal text-muted">out of 100</span>
      </p>
      <ul className="mt-4 divide-y divide-line">
        {DIMS.map(([id, label], k) => {
          const d = pick?.dimensions[id];
          const v = toVerdict(d?.verdict ?? '');
          const sim = d?.similarity ?? null;
          return (
            <li key={id} className="flex items-center gap-4 py-2.5">
              <span className="flex w-[116px] items-center gap-2 text-[15px] text-text">
                {isElement(id) && <ElementIcon id={id} size={20} className={active === 2 && sim !== null && sim >= 0.75 ? 'text-accent' : 'text-muted'} />}
                {label}
              </span>
              <span className="relative block h-2 flex-1 bg-line" aria-hidden="true">
                <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: active === 2 ? `${(sim ?? 0) * 100}%` : '0%', transition: `width 900ms cubic-bezier(0.4, 0, 0.2, 1) ${300 + k * 120}ms` }} />
                <span className="absolute inset-y-0 left-[30%] w-px bg-bg" />
                <span className="absolute inset-y-0 left-[75%] w-px bg-bg" />
              </span>
              <span className={`w-[100px] text-right text-[13px] ${v === 'match' ? 'font-semibold text-text' : 'text-muted'}`}>{VERDICT_WORD[verdictOf(sim)] ?? 'No data'}</span>
            </li>
          );
        })}
      </ul>
    </div>,
    // 4. Act: the three things to do with a match
    <div key="s4" className="flex h-full flex-col justify-center">
      <div className="relative aspect-[16/9] overflow-hidden bg-panel">{leadImage && <img src={leadImage} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}</div>
      <ul className="mt-6 grid grid-cols-3 gap-5">
        {([
          ['base', 'Plan a base', 'Modules, power, water, 30 days'],
          ['rover', 'Drive a rover', '3D terrain of both places'],
          ['life', 'Print the report', 'Cited, to PDF'],
        ] as const).map(([kind, t, line], k) => (
          <li key={t} className="border-t-2 border-accent pt-3" style={{ opacity: active === 3 ? 1 : 0, transform: active === 3 ? 'none' : 'translateY(14px)', transition: `opacity 600ms ease ${200 + k * 150}ms, transform 600ms ease ${200 + k * 150}ms` }}>
            <ActivityArt kind={kind} className="h-9 w-auto text-accent" />
            <p className="display mt-2 text-[18px] leading-6 text-text">{t}</p>
            <p className="text-[13px] leading-5 text-muted">{line}</p>
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


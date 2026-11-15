import { useEffect, useRef, useState } from 'react';
import type { EarthFile } from '../types';
import { FACTOR_LABELS, PRESETS } from '../lib/scoringAdapter';
import { FACTOR_IDS } from '../types';
import { useAsync } from '../lib/useAsync';
import { loadFrozen, loadReport, loadSources } from '../data/validation';
import { SourceBadge } from './Badges';

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

const CHAPTERS = [
  { id: 'how', label: 'How it works' },
  { id: 'data', label: 'The data' },
  { id: 'method', label: 'The method' },
  { id: 'limits', label: 'Its limits' },
] as const;

const LIMITS = [
  'A score describes a whole 0.5° cell, about 55 km on a side. A small site inside a different landscape is scored as its surroundings. Featured sites are also measured inside their own footprint, 2 to 7.4 km.',
  'Gravity, vacuum, thin atmosphere and radiation cannot be matched anywhere on Earth. They are never scored. Every match lists them as what Earth cannot copy.',
  'The Moon and Mars are colder than anywhere on Earth. A target temperature is compared with Earth’s coldest cell, and the real value is shown beside it.',
  'Absolute scores are low and known Moon analogs rank mid-table. The validation numbers, including the weak ones, are on the Validation page.',
  'There is no factor for caves, lava tubes, lakes or water chemistry. Whether a site is a good lava tube analog rests on the feature, not on a score.',
  'A missing value is shown as “no data”. Nothing is filled in.',
];

interface Props {
  earth: EarthFile;
  placeCount: number;
  onMethod: () => void;
  onValidation: () => void;
  onFind: () => void;
}

/** How it works, the data, the method and its limits, each section animating in as it is reached. */
export function HomeStory({ earth, placeCount, onMethod, onValidation, onFind }: Props) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const sources = useAsync(loadSources, 'home-sources');
  const report = useAsync(() => loadReport('base'), 'home-report');
  const frozen = useAsync(loadFrozen, 'home-frozen');

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.n));
      },
      { rootMargin: '-35% 0px -55% 0px' },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const datasets = sources.status === 'ready' && sources.value ? (sources.value.find((t) => t.headers[0] === 'Dataset')?.rows.length ?? null) : null;
  const hold = report.status === 'ready' ? report.value?.sets.holdout : null;
  const pct = (v: number | null | undefined) => (v === null || v === undefined ? 'no data' : `${(v * 100).toFixed(0)}%`);
  const base = PRESETS[0];
  const go = (n: number) => refs.current[n]?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });

  const chapter = (n: number) => ({
    ref: (el: HTMLElement | null) => {
      refs.current[n] = el;
    },
    'data-n': n,
    id: `ch-${CHAPTERS[n].id}`,
    'aria-labelledby': `h-ch-${CHAPTERS[n].id}`,
  });

  return (
    <div className="px-5 pb-24 pt-24 sm:px-10 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16 lg:px-16">
      <nav aria-label="Chapters" className="hidden lg:block">
        <ol className="sticky top-28 space-y-4">
          {CHAPTERS.map((c, n) => (
            <li key={c.id}>
              <button type="button" onClick={() => go(n)} aria-current={active === n ? 'true' : undefined} className="group flex items-center gap-3 text-left">
                <span className={`block h-px transition-all duration-500 ${active === n ? 'w-10 bg-accent' : 'w-4 bg-muted group-hover:w-6'}`} aria-hidden="true" />
                <span className={`text-[14px] transition-colors ${active === n ? 'font-medium text-text' : 'text-muted group-hover:text-text'}`}>
                  <span className="num mr-2 text-[11px]">0{n + 1}</span>
                  {c.label}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-40 lg:space-y-56">
        <section {...chapter(0)} className="max-w-[760px]">
          <Reveal>
            <p className="num text-[12px] text-muted">01 · How it works</p>
          </Reveal>
          <Reveal i={1}>
            <h2 id="h-ch-how" className="display-l mt-4 text-[34px] sm:text-[52px]">
              Pick a place on another world. Earth is ranked against it.
            </h2>
          </Reveal>
          <ol className="mt-14 space-y-9">
            {[
              [`Pick a place.`, `${placeCount} named places on the Moon and Mars (landing sites, candidate regions and base sites), or any point on either globe.`],
              [`Every land cell of Earth is scored against it.`, `${earth.cells.length.toLocaleString('en-US')} cells, scored in your browser from the published data files. Nothing waits on a live service.`],
              [`Open a match.`, `Both places at one scale, every dimension side by side with its values, a verdict and a source badge, and what Earth cannot copy.`],
              [`Act on it.`, `A cited report you can print, 3D terrain of both places with a route driven on each, and a base layout run at both.`],
            ].map(([h, t], k) => (
              <li key={h}>
                <Reveal i={k}>
                  <div className="grid grid-cols-[44px_1fr] gap-x-2">
                    <span className="num pt-1 text-[13px] text-accent">0{k + 1}</span>
                    <div>
                      <h3 className="display text-[20px] text-text sm:text-[24px]">{h}</h3>
                      <p className="mt-2 max-w-[56ch] text-[15px] leading-[24px] text-muted">{t}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
          <Reveal i={2} className="mt-12">
            <button type="button" onClick={onFind} className="link-rule text-[17px] font-medium text-text">
              Find an analog
            </button>
          </Reveal>
        </section>

        <section {...chapter(1)} className="max-w-[860px]">
          <Reveal>
            <p className="num text-[12px] text-muted">02 · The data</p>
          </Reveal>
          <Reveal i={1}>
            <h2 id="h-ch-data" className="display-l mt-4 text-[34px] sm:text-[52px]">
              Every value has a named source.
            </h2>
          </Reveal>
          <Reveal i={2}>
            <dl className="mt-14 grid gap-x-12 gap-y-8 sm:grid-cols-3">
              {[
                [earth.cells.length.toLocaleString('en-US'), `land cells at ${earth.meta.resolutionDeg}°, about ${Math.round(earth.meta.resolutionDeg * 111)} km`],
                [String(earth.meta.factors.length), 'measurements per cell: climate, vegetation, terrain, rock'],
                [datasets === null ? 'no data' : String(datasets), 'datasets in SOURCES.md, each with provider, licence and access date'],
              ].map(([n, t]) => (
                <div key={t}>
                  <dt className="num display-l text-[44px] text-text sm:text-[56px]">{n}</dt>
                  <dd className="mt-2 text-[14px] leading-[22px] text-muted">{t}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <ul className="mt-16 divide-y divide-line">
            {earth.meta.factors.map((f) => (
              <li key={f.key}>
                <Reveal i={0}>
                  <div className="grid gap-x-6 gap-y-1 py-4 sm:grid-cols-[170px_1fr_auto]">
                    <p className="text-[14px] font-medium text-text">{f.label.replace(/ \(.*\)$/, '')}</p>
                    <p className="text-[13px] leading-5 text-muted">{f.source}</p>
                    <div className="sm:text-right">
                      <SourceBadge badge={f.badge} source={f.source} />
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
          <Reveal className="mt-8">
            <p className="max-w-[62ch] text-[14px] leading-[22px] text-muted">
              <span className="text-text">Measured</span> is from a gridded dataset, <span className="text-text">Mission</span> from a spacecraft or rover,{' '}
              <span className="text-text">Literature</span> from a paper, and <span className="text-text">Computed</span> worked out in the browser. Every number in the app
              carries one.
            </p>
          </Reveal>
        </section>

        <section {...chapter(2)} className="max-w-[860px]">
          <Reveal>
            <p className="num text-[12px] text-muted">03 · The method</p>
          </Reveal>
          <Reveal i={1}>
            <h2 id="h-ch-method" className="display-l mt-4 text-[34px] sm:text-[52px]">
              Six factors, one formula, weights frozen before the test.
            </h2>
          </Reveal>
          <Reveal i={2}>
            <div className="mt-12 space-y-3 border-l border-line pl-5">
              <p className="num text-[13px] leading-6 text-text sm:text-[15px]">similarity = exp(−½ × ((earth − target) / tolerance)²)</p>
              <p className="num text-[13px] leading-6 text-text sm:text-[15px]">score = 100 × weighted geometric mean of the similarities</p>
              <p className="text-[14px] text-muted">One factor near zero pulls the score near zero: good terrain does not offset forest or heavy rain.</p>
            </div>
          </Reveal>
          <ul className="mt-14 space-y-3">
            {FACTOR_IDS.map((id, k) => (
              <li key={id}>
                <Reveal i={k}>
                  <div className="grid grid-cols-[110px_1fr_46px] items-center gap-4 sm:grid-cols-[150px_1fr_52px]">
                    <span className="text-[14px] text-text">{FACTOR_LABELS[id]}</span>
                    <span className="block h-1.5 bg-line" aria-hidden="true">
                      <span className="bar-grow block h-full bg-text" style={{ ['--to' as string]: base.weights[id] / 0.25 }} />
                    </span>
                    <span className="num text-right text-[13px] text-text">{Math.round(base.weights[id] * 100)}%</span>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
          <Reveal className="mt-3">
            <p className="text-[12px] text-muted">Weights of the Base preset. A mission preset changes the weights only.</p>
          </Reveal>

          <Reveal className="mt-16">
            <h3 className="display text-[22px] text-text sm:text-[28px]">Tested on sites already known as analogs.</h3>
            <p className="mt-2 max-w-[60ch] text-[14px] leading-[22px] text-muted">
              Hold-out set: sites never used to choose a tolerance or a weight
              {frozen.status === 'ready' && frozen.value ? `, frozen on ${frozen.value.frozenAt}` : ''}.
            </p>
          </Reveal>
          <Reveal i={1}>
            {hold ? (
              <dl className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-4">
                {[
                  [hold.overall.rocAuc === null ? 'no data' : hold.overall.rocAuc.toFixed(3), 'ROC AUC against rainforests and cities. 0.5 is chance.'],
                  [pct(hold.overall.top10Share), 'of known analogs in the top 10% of Earth cells'],
                  [pct(hold.mars.top10Share), 'for Mars targets'],
                  [pct(hold.moon.top10Share), 'for Moon targets: the weak result'],
                ].map(([n, t]) => (
                  <div key={t}>
                    <dt className="num display text-[30px] text-text">{n}</dt>
                    <dd className="mt-1 text-[13px] leading-5 text-muted">{t}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-6 text-[13px] text-muted">{report.status === 'loading' ? 'Loading validation' : 'No data. The validation report was not published with this build.'}</p>
            )}
          </Reveal>
          <Reveal className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            <button type="button" onClick={onMethod} className="link-rule text-[16px] font-medium text-text">
              Read the method
            </button>
            <button type="button" onClick={onValidation} className="link-rule text-[16px] font-medium text-text">
              All validation numbers
            </button>
          </Reveal>
        </section>

        <section {...chapter(3)} className="max-w-[760px]">
          <Reveal>
            <p className="num text-[12px] text-muted">04 · Its limits</p>
          </Reveal>
          <Reveal i={1}>
            <h2 id="h-ch-limits" className="display-l mt-4 text-[34px] sm:text-[52px]">
              Where it stops being reliable.
            </h2>
          </Reveal>
          <ol className="mt-14 space-y-7">
            {LIMITS.map((t, k) => (
              <li key={t}>
                <Reveal i={k % 3}>
                  <div className="grid grid-cols-[44px_1fr]">
                    <span className="num pt-0.5 text-[12px] text-muted">0{k + 1}</span>
                    <p className="max-w-[60ch] text-[15px] leading-[24px] text-text">{t}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

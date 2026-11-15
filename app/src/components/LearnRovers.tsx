import { useEffect, useMemo, useRef, useState } from 'react';
import { loadExtra } from '../data/access';
import { useAsync } from '../lib/useAsync';
import type { Badge } from '../types';
import { ComputedBadge } from './Badges';
import { ChapterHead, Counter, LearnReveal, SourceLine, WorldDisc, reducedMotion, useSeen } from './LearnParts';
import { LearnRoverArt } from './LearnRoverArt';
import { AiMark } from './AiMark';
import { WORLD_TEX } from './LearnData';

interface Fig {
  value: number;
  unit: string;
  kind: string;
  source: string;
  url?: string;
  badge: Badge;
}
interface Rover {
  id: string;
  name: string;
  body: 'moon' | 'mars';
  crewed: boolean;
  slopeLimit: Fig | null;
  speed: Fig | null;
}
interface RoversFile {
  rovers: Rover[];
}

/** When and where each rover went. Same facts and sources as the History chapter. */
const FLOWN: Record<string, { text: string; source: string; url?: string; badge: Badge }> = {
  perseverance: { text: 'Landed in Jezero Crater, Mars, 18 February 2021.', source: 'NASA Science, Mars 2020: Perseverance', url: 'https://science.nasa.gov/mission/mars-2020-perseverance/', badge: 'Mission' },
  curiosity: { text: 'Landed in Gale Crater, Mars, 6 August 2012.', source: 'NASA Science, Mars Science Laboratory: Curiosity', url: 'https://science.nasa.gov/mission/msl-curiosity/', badge: 'Mission' },
  mer: { text: 'Twin rovers, landed on Mars in January 2004.', source: 'NASA Science, Mars Exploration Rovers', badge: 'Mission' },
  sojourner: { text: 'Landed on Mars with Mars Pathfinder in July 1997. The first rover on Mars.', source: 'NASA NSSDCA, Master Catalog', url: 'https://nssdc.gsfc.nasa.gov/nmc/', badge: 'Mission' },
  viper: { text: 'Built to look for water ice near the lunar South Pole. Not yet flown.', source: 'NASA 2025, VIPER updated technical briefing', badge: 'Mission' },
  lrv: { text: 'Driven by astronauts on Apollo 15, 16 and 17, 1971 to 1972.', source: 'NASA, Apollo program mission pages', url: 'https://www.nasa.gov/the-apollo-program/', badge: 'Mission' },
};

const shortName = (n: string) => n.replace(/\s*\(.*\)$/, '');

/** A slope drawn at the rover's limit. The ground tips up to the angle when the card comes into view. */
function SlopeGauge({ deg }: { deg: number | null }) {
  const [ref, seen] = useSeen<HTMLDivElement>(0.85);
  const a = deg ?? 0;
  const r = 66;
  const rad = (a * Math.PI) / 180;
  return (
    <div ref={ref}>
      <svg viewBox="0 0 150 84" className="h-[84px] w-[150px]" aria-hidden="true">
        <path d="M8 76H146" stroke="#2A3138" strokeWidth="1" />
        {deg !== null && (
          <>
            <path d={`M8 76 L${8 + r} 76 A${r} ${r} 0 0 0 ${8 + r * Math.cos(rad)} ${76 - r * Math.sin(rad)}`} fill="none" stroke="#7C8894" strokeWidth="1" strokeDasharray="2 3" />
            <g className="learn-tilt" style={{ transformOrigin: '8px 76px', transform: `rotate(${seen ? -a : 0}deg)` }}>
              <path d="M8 76H142" stroke="#FFB000" strokeWidth="2" />
              <rect x="70" y="64" width="26" height="8" fill="none" stroke="#D7DDE3" strokeWidth="1.4" />
              <circle cx="74" cy="74" r="2.5" fill="#0B0D0F" stroke="#D7DDE3" strokeWidth="1.2" />
              <circle cx="92" cy="74" r="2.5" fill="#0B0D0F" stroke="#D7DDE3" strokeWidth="1.2" />
            </g>
          </>
        )}
      </svg>
    </div>
  );
}

function hoursFor(metres: number, perHour: number) {
  const h = metres / perHour;
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${h.toFixed(1)} h`;
}

function RoverCard({ r, k }: { r: Rover; k: number }) {
  const flown = FLOWN[r.id];
  return (
    <LearnReveal as="li" i={k % 3}>
      <article className="flex h-full flex-col border-t border-line pt-6" aria-labelledby={`rv-${r.id}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label">{r.crewed ? 'Driven by astronauts' : 'Driven from Earth'}</p>
            <h3 id={`rv-${r.id}`} className="display mt-1 text-[26px] text-text">
              {shortName(r.name)}
            </h3>
          </div>
          <WorldDisc tex={WORLD_TEX[r.body]} size={36} spin={r.body === 'moon' ? 90 : 70} className="mt-1" />
        </div>
        <LearnRoverArt id={r.id} className="mt-4 h-auto w-full max-w-[320px] text-text" />
        {flown && (
          <div className="mt-4">
            <p className="text-[15px] leading-6 text-text">{flown.text}</p>
            <SourceLine className="mt-1" badge={flown.badge} source={flown.source} url={flown.url} />
          </div>
        )}
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4">
          <div>
            <dt className="label">Steepest slope</dt>
            <dd className="mt-1">
              {r.slopeLimit ? (
                <span className="display text-[36px] leading-none text-text">
                  <Counter value={r.slopeLimit.value} />
                  <span className="text-[18px] text-muted">°</span>
                </span>
              ) : (
                <span className="text-[15px] text-muted">no data</span>
              )}
              <SlopeGauge deg={r.slopeLimit?.value ?? null} />
              {r.slopeLimit && <p className="text-[12px] leading-[18px] text-muted">{r.slopeLimit.kind}</p>}
            </dd>
          </div>
          <div>
            <dt className="label">Speed</dt>
            <dd className="mt-1">
              {r.speed ? (
                <>
                  <span className="display text-[36px] leading-none text-text">
                    <Counter value={r.speed.value} />
                    <span className="ml-1 text-[14px] font-normal text-muted">m/h</span>
                  </span>
                  <p className="mt-2 text-[12px] leading-[18px] text-muted">{r.speed.kind}</p>
                  <p className="mt-3 text-[13px] leading-5 text-text">
                    1 km takes <span className="num font-semibold">{hoursFor(1000, r.speed.value)}</span>
                  </p>
                  <ComputedBadge title="Computed in the browser: 1,000 m divided by the speed. A lower bound: stops are not counted." />
                </>
              ) : (
                <span className="text-[15px] text-muted">no data</span>
              )}
            </dd>
          </div>
        </dl>
        <div className="mt-auto space-y-1 pt-4">
          {r.slopeLimit && <SourceLine badge={r.slopeLimit.badge} source={`Slope: ${r.slopeLimit.source}`} url={r.slopeLimit.url} />}
          {r.speed && <SourceLine badge={r.speed.badge} source={`Speed: ${r.speed.source}`} url={r.speed.url} />}
        </div>
      </article>
    </LearnReveal>
  );
}

const TRACK_M = 50;
const SPEEDUP = 10;

/** Every rover drives 50 m at its own published speed, with time sped up ten times. Restarts every 30 s. */
function Race({ rovers }: { rovers: Rover[] }) {
  const racers = useMemo(() => rovers.filter((r) => r.speed).sort((a, b) => b.speed!.value - a.speed!.value), [rovers]);
  const [ref, seen] = useSeen<HTMLDivElement>(0.8);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const [still] = useState(reducedMotion);

  useEffect(() => {
    if (!seen) return;
    const set = (t: number) => {
      racers.forEach((r, i) => {
        const m = Math.min(TRACK_M, ((r.speed!.value / 3600) * t * SPEEDUP));
        const bar = bars.current[i];
        const lab = labels.current[i];
        if (bar) bar.style.transform = `scaleX(${m / TRACK_M})`;
        if (lab) lab.textContent = `${m.toFixed(1)} m`;
      });
    };
    if (still) {
      set(30);
      return;
    }
    const t0 = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      set(((now - t0) / 1000) % 30);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [seen, still, racers]);

  return (
    <div ref={ref} className="mt-20">
      <LearnReveal className="max-w-[760px]">
        <h3 className="display-l text-[32px] text-text sm:text-[44px]">A 50 m race</h3>
        <p className="mt-4 text-[16px] leading-7 text-muted">
          Each bar drives 50 m at its rover's published speed. Time runs ten times faster than real life, and the race starts again every 30 seconds. Rovers driven from Earth move slowly and carefully: nobody can come to free a stuck wheel.
        </p>
      </LearnReveal>
      <ol className="mt-8 space-y-4">
        {racers.map((r, i) => (
          <li key={r.id} className="grid grid-cols-[minmax(0,110px)_minmax(0,1fr)_64px] items-center gap-3 sm:grid-cols-[180px_minmax(0,1fr)_80px] sm:gap-5">
            <span className="truncate text-[14px] text-text">{r.id === 'lrv' ? 'Apollo rover' : r.id === 'mer' ? 'Spirit, Opportunity' : shortName(r.name)}</span>
            <span className="relative block h-3 bg-panel" aria-hidden="true">
              <span
                ref={(el) => {
                  bars.current[i] = el;
                }}
                className="absolute inset-y-0 left-0 w-full origin-left bg-accent"
                style={{ transform: 'scaleX(0)' }}
              />
              <span className="absolute inset-y-[-4px] right-0 w-px bg-muted" />
            </span>
            <span
              ref={(el) => {
                labels.current[i] = el;
              }}
              className="num text-right text-[13px] text-muted"
              aria-hidden="true"
            >
              0.0 m
            </span>
          </li>
        ))}
      </ol>
      <p className="sr-only">
        {racers.map((r) => `${shortName(r.name)}: ${r.speed!.value} metres per hour.`).join(' ')}
      </p>
      <p className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-muted">
        <ComputedBadge title="Computed in the browser from the speeds in data/rovers.json." /> Distance = speed × time. Speeds and their sources are on the cards above.
      </p>
    </div>
  );
}

/** Chapter 2: the rovers in data/rovers.json with their slope limits and speeds, each with its source. */
export function LearnRovers() {
  const data = useAsync(() => loadExtra<RoversFile>('rovers.json'), 'learn-rovers');
  const rovers = data.status === 'ready' && data.value ? data.value.rovers : [];

  return (
    <section id="learn-rovers" aria-labelledby="h-learn-rovers" className="scroll-mt-16 px-5 py-20 sm:px-10 lg:py-28">
      <ChapterHead
        id="h-learn-rovers"
        n="02"
        kicker="Rovers"
        title="Wheels on other worlds"
        lead="A rover is a car for another world. Some are driven by astronauts, most by teams on Earth. Two numbers decide where one can go: how steep a slope it can climb, and how fast it moves."
      />
      <AiMark className="mt-6" />
      {data.status === 'loading' && <p className="mt-10 text-[14px] text-muted">Loading rover data…</p>}
      {data.status !== 'loading' && rovers.length === 0 && <p className="mt-10 text-[14px] text-muted">No data: the rover figures are not available.</p>}
      {rovers.length > 0 && (
        <>
          <ul className="mt-14 grid gap-x-10 gap-y-14 md:grid-cols-2 xl:grid-cols-3">
            {rovers.map((r, k) => (
              <RoverCard key={r.id} r={r} k={k} />
            ))}
          </ul>
          <Race rovers={rovers} />
        </>
      )}
    </section>
  );
}

import { useEffect, useState } from 'react';
import type { CellScore, EarthCell, FactorBreakdown, FactorKey, KeyBreakdown, PreparedTarget, Preset, Target } from '../types';
import type { MetaByKey } from '../lib/format';

type LithologyLevels = NonNullable<PreparedTarget['lithology']>['levels'];

/** Everything the walkthrough shows, taken from the app's own scorer for one real pair. */
export interface FlowData {
  target: Target;
  cell: EarthCell;
  cs: CellScore;
  preset: Preset;
  meta: MetaByKey;
  keys: KeyBreakdown[];
  factors: FactorBreakdown[];
  lithLevels: LithologyLevels | null;
  missingTarget: FactorKey[];
  where: string | null;
}

export interface StageProps {
  d: FlowData;
  /** True while this step is the one being read (or already read, on a phone). The stage animates when it turns true. */
  on: boolean;
  /** Reduced motion: the final state straight away. */
  rm: boolean;
}

export function useMedia(query: string): boolean {
  const [m, setM] = useState(() => (typeof window === 'undefined' ? false : window.matchMedia(query).matches));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const f = () => setM(mq.matches);
    mq.addEventListener('change', f);
    f();
    return () => mq.removeEventListener('change', f);
  }, [query]);
  return m;
}

/** 0 to 1 over `ms` once `on` is true, back to 0 at once when it turns false. The same animation plays on every return to the step. */
export function useProgress(on: boolean, rm: boolean, ms = 800): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!on) return setP(0);
    if (rm) return setP(1);
    const t0 = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setP(1 - Math.pow(1 - k, 3));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [on, rm, ms]);
  return p;
}

/** Style of an element that fades in and rises when its step turns on. The stagger stays short so nothing waits. */
export function fade(on: boolean, rm: boolean, i = 0): React.CSSProperties {
  if (rm) return {};
  return {
    opacity: on ? 1 : 0,
    transform: on ? 'none' : 'translateY(8px)',
    transition: 'opacity 300ms ease, transform 300ms ease',
    transitionDelay: on ? `${Math.min(i * 45, 360)}ms` : '0ms',
  };
}

/** A transition for one property, with no motion when reduced. */
export const move = (rm: boolean, prop: string, ms: number, delay = 0) => (rm ? 'none' : `${prop} ${ms}ms cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}ms`);

/** The frame of one stage: a flat panel with the step number and a short title. */
export function StageFrame({ n, total, title, children }: { n: number; total: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col border border-line bg-panel p-4 sm:p-5 lg:h-full">
      <div className="flex items-center justify-between gap-4">
        <p className="label">
          Step {n + 1} of {total} · {title}
        </p>
        <span className="flex gap-1" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`block h-1 w-4 ${i === n ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </span>
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

/** The gap in tolerances for one measurement, or null when it has none (a lookup, or a value is missing). */
export function gapOf(k: KeyBreakdown): number | null {
  if (k.earthValue === null || k.targetClamped === null || k.sigma === null || k.key === 'lithology') return null;
  if (k.key === 'ndvi' && k.bareGround?.source === 'landCover') return null;
  return (k.earthValue - k.targetClamped) / k.sigma;
}

import { useEffect, useMemo, useRef, useState } from 'react';
import type { EarthFile, LithologySimilarity, Target } from '../types';
import { PRESETS, createScorer, gaussianSimilarity } from '../lib/scoringAdapter';
import { metaByKey } from '../lib/format';
import { countryAt } from '../lib/where';
import { useMedia, type FlowData } from './MethodFlowParts';
import { StageCoverage, StageGap, StageMean, StageResult, StageSimilarity, StageTwoPlaces, StageWeights } from './MethodFlowStages';

/** The pair walked through. Malapert Massif is a curated target with values for every factor. */
const TARGET_ID = 'moon-malapert-massif';

interface Props {
  earth: EarthFile;
  targets: Target[];
  lithology: LithologySimilarity;
}

/** The real pair: the target and the best Earth cell for it under the Base weights, scored by the app's own scorer. */
function usePair(earth: EarthFile, targets: Target[], lithology: LithologySimilarity): Omit<FlowData, 'where'> | null {
  return useMemo(() => {
    const target = targets.find((t) => t.id === TARGET_ID) ?? targets.find((t) => t.body === 'moon') ?? null;
    if (!target) return null;
    const preset = PRESETS[0];
    const ts = createScorer(earth, lithology).forTarget(target);
    const results = ts.scoreAll(preset.weights);
    // The same pick as the candidates list: the highest score, low confidence left out.
    let best = -1;
    results.forEach((r, i) => {
      if (r.score === null || r.confidence === 'low') return;
      if (best < 0 || r.score > (results[best].score as number)) best = i;
    });
    if (best < 0) return null;
    const cell = earth.cells[best];
    const cs = ts.explain(cell, preset.weights);
    return {
      target,
      cell,
      cs,
      preset,
      meta: metaByKey(earth),
      keys: cs.breakdown.flatMap((f) => f.keys),
      factors: cs.breakdown,
      lithLevels: ts.prepared.lithology?.levels ?? null,
      missingTarget: ts.prepared.missingTargetKeys,
    };
  }, [earth, targets, lithology]);
}

/** One line of text per step, with numbers from the pair. */
function stepText(d: FlowData) {
  const one = gaussianSimilarity(1, 0, 1).toFixed(2);
  const two = gaussianSimilarity(2, 0, 1).toFixed(2);
  const score = d.cs.score === null ? 'no data' : d.cs.score.toFixed(0);
  return [
    { h: 'Take two real places.', t: `${d.target.name}, and the Earth cell that scores best for it. Each is described by the same measurements, and each value shows its source.` },
    { h: 'Measure the gap.', t: 'For each measurement, the gap is the Earth value minus the target value, counted in tolerances. A tolerance is a difference that still counts as close.' },
    { h: 'Turn each gap into a similarity.', t: `No gap gives 1. One tolerance gives ${one}, two give ${two}. Rock type is a class, so it uses a lookup table.` },
    { h: 'Weigh the factors.', t: `The ${d.preset.label} preset sets how much each of the six factors counts. Terrain and Temperature each have two measurements that share their weight.` },
    { h: 'Multiply them into one number.', t: 'The score is the weighted geometric mean: each similarity raised to its weight, then multiplied. One low factor pulls it down.' },
    { h: 'Check what data was there.', t: 'A measurement with no value is left out and the other weights scale up. The share of weight with data is the coverage, and it sets the confidence.' },
    { h: `The score is ${score}.`, t: 'It covers six factors only. Gravity, vacuum and radiation cannot be matched on Earth, so they are never in the score.' },
  ];
}

/**
 * The scoring walkthrough: one real pair, followed through every step of the computation.
 * Text on the left, a sticky stage on the right (inline under each text on a phone). Same pattern as the home page.
 */
export function MethodFlow({ earth, targets, lithology }: Props) {
  const base = usePair(earth, targets, lithology);
  const [where, setWhere] = useState<string | null>(null);
  useEffect(() => {
    if (!base) return;
    let alive = true;
    countryAt(base.cell.lat, base.cell.lon).then((c) => alive && setWhere(c));
    return () => {
      alive = false;
    };
  }, [base]);
  const d = useMemo<FlowData | null>(() => (base ? { ...base, where } : null), [base, where]);

  const wide = useMedia('(min-width: 1024px)');
  const rm = useMedia('(prefers-reduced-motion: reduce)');
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  // The step whose text is nearest the middle of the screen is the active one, picked again on every scroll frame, so
  // the stage never shows a step that is not the one being read. The scroll container is main.scroll, not the window,
  // and scroll events do not bubble: listen in the capture phase.
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
        const dist = Math.abs((r.top + r.bottom) / 2 - mid);
        if (dist < bestD) {
          bestD = dist;
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
  }, [d]);

  const header = (
    <div>
      <p className="label">Walkthrough</p>
      <h3 id="m-flow" className="display-l mt-2 max-w-[22ch] text-[34px] text-text sm:text-[52px]">
        One score, step by step
      </h3>
      <p className="mt-4 max-w-[62ch] text-[16px] leading-6 text-text">
        {d ? `Follow ${d.target.name} and its best Earth cell through the whole computation, with the app's own numbers.` : 'Follow one pair through the whole computation.'}
      </p>
    </div>
  );

  if (!d) {
    return (
      <section aria-labelledby="m-flow" className="px-4 pb-12 pt-12 sm:px-6 sm:pt-16">
        <div className="max-w-[1320px]">
          {header}
          <p className="mt-6 text-[14px] text-muted">No data. No target or scored Earth cell was published with this build.</p>
        </div>
      </section>
    );
  }

  const text = stepText(d);
  const stages = [StageTwoPlaces, StageGap, StageSimilarity, StageWeights, StageMean, StageCoverage, StageResult];
  // On a wide screen only the active step is on. Inline on a phone, a step stays on once reached, so a step scrolled past is never blank.
  const isOn = (n: number) => (wide ? active === n : active >= n);

  return (
    <section aria-labelledby="m-flow" className="px-4 pb-8 pt-12 sm:px-6 sm:pt-16">
      <div className="max-w-[1320px]">
        {header}
        <div className="mt-8 lg:mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          <ol>
            {text.map((s, n) => {
              const Stage = stages[n];
              return (
                <li
                  key={s.h}
                  ref={(el) => {
                    stepRefs.current[n] = el;
                  }}
                  className="border-t border-line py-8 lg:flex lg:min-h-[68vh] lg:flex-col lg:justify-center lg:py-0"
                >
                  <p className={`num text-[14px] ${active === n ? 'text-accent' : 'text-muted'}`} style={{ transition: 'color 300ms ease' }}>
                    {n + 1}
                  </p>
                  <h4 className="display-l mt-2 max-w-[18ch] text-[28px] text-text sm:text-[40px]">{s.h}</h4>
                  <p className="mt-4 max-w-[46ch] text-[16px] leading-[26px] text-muted">{s.t}</p>
                  {!wide && (
                    <div className="mt-6" >
                      <Stage d={d} on={isOn(n)} rm={rm} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          {wide && (
            <div>
              <div className="sticky top-6 h-[min(640px,calc(100vh-7rem))]">
                {stages.map((Stage, n) => (
                  <div
                    key={n}
                    className="absolute inset-0"
                    style={{ opacity: active === n ? 1 : 0, transition: rm ? 'none' : 'opacity 300ms ease', pointerEvents: active === n ? 'auto' : 'none' }}
                    aria-hidden={active !== n}
                  >
                    <Stage d={d} on={isOn(n)} rm={rm} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

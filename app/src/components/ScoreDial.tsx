import { useEffect, useRef, useState } from 'react';
import type { MatchDimension } from '../lib/matchAdapter';
import { fromRecord } from '../lib/verdict';
import { ElementIcon, isElement } from './ElementIcon';

interface Props {
  dims: MatchDimension[];
  /** 0 to 100, or null when the cell has no score. */
  score: number | null;
  selected: number;
  onSelect: (i: number) => void;
}

const CX = 50;
const STEP = 6.3;
const R_OUT = 45;
const WIDTH = 5;

/** A point on a ring, at a fraction of the way round clockwise from the top. */
const on = (r: number, f: number) => {
  const a = -Math.PI / 2 + f * 2 * Math.PI;
  return [CX + r * Math.cos(a), CX + r * Math.sin(a)] as const;
};

/**
 * The score as concentric rings, one per dimension. A ring fills clockwise from its icon to the similarity, 0 to 1.
 * The small breaks on each ring mark the cut-offs: before the first it does not match, past the second it does.
 * The overall score is in the middle.
 */
export function ScoreDial({ dims, score, selected, onSelect }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [go, setGo] = useState(false);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && (setGo(true), io.disconnect()), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!go || score === null) return setShown(score ?? 0);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setShown(score);
    const t0 = performance.now() + 300;
    let frame = 0;
    const tick = (now: number) => {
      const k = Math.max(0, Math.min(1, (now - t0) / 1500));
      setShown(score * (1 - Math.pow(1 - k, 3)));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [go, score]);

  return (
    <div ref={box} className="relative mx-auto aspect-square w-full max-w-[440px] [container-type:inline-size]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" role="img" aria-label={score === null ? 'No score' : `Score ${score.toFixed(0)} out of 100, from ${dims.length} dimensions`}>
        {dims.map((d, i) => {
          const r = R_OUT - i * STEP;
          const C = 2 * Math.PI * r;
          const sim = Math.max(0, Math.min(1, d.similarity ?? 0));
          const v = fromRecord(d.verdict);
          const colour = v === 'miss' || v === 'none' ? 'var(--color-muted)' : 'var(--color-accent)';
          const isSel = i === selected;
          const [bx, by] = on(r, 0);
          const dim = isSel ? 1 : 0.5;
          return (
            <g key={d.id} style={{ opacity: dim, transition: 'opacity 250ms ease', cursor: 'pointer' }} onClick={() => onSelect(i)}>
              {/* The track and the fill. */}
              <circle cx={CX} cy={CX} r={r} fill="none" stroke="var(--color-line)" strokeWidth={WIDTH} />
              <circle
                cx={CX}
                cy={CX}
                r={r}
                fill="none"
                stroke={colour}
                strokeWidth={isSel ? WIDTH + 0.8 : WIDTH}
                strokeDasharray={`${C} ${C}`}
                strokeDashoffset={C * (1 - (go ? sim : 0))}
                transform={`rotate(-90 ${CX} ${CX})`}
                style={{ transition: `stroke-dashoffset 1300ms cubic-bezier(0.2, 0.8, 0.2, 1) ${i * 160}ms, stroke-width 200ms ease` }}
              />
              {/* The cut-offs. */}
              {[0.3, 0.75].map((f) => {
                const [x1, y1] = on(r - WIDTH / 2 - 0.4, f);
                const [x2, y2] = on(r + WIDTH / 2 + 0.4, f);
                return <line key={f} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-bg)" strokeWidth={0.7} />;
              })}
              {/* The icon, where the ring starts. */}
              <circle cx={bx} cy={by} r={WIDTH / 2 + 0.7} fill={colour} stroke="var(--color-bg)" strokeWidth={0.8} />
              {isElement(d.id) && (
                <g transform={`translate(${bx - 2.3} ${by - 2.3})`} style={{ color: 'var(--color-bg)' }}>
                  <ElementIcon id={d.id} size={4.6} still />
                </g>
              )}
              {/* A wide invisible target for the pointer. */}
              <circle cx={CX} cy={CX} r={r} fill="none" stroke="transparent" strokeWidth={STEP} />
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <p className="display text-[13cqw] leading-none text-text">{score === null ? '-' : Math.round(shown)}</p>
        <p className="mt-[1cqw] text-[3.2cqw] leading-none text-muted">{score === null ? 'no score' : 'out of 100'}</p>
      </div>
    </div>
  );
}

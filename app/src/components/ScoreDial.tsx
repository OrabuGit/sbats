import { useEffect, useRef, useState } from 'react';
import type { MatchDimension } from '../lib/matchAdapter';
import { fromRecord, type Verdict } from '../lib/verdict';
import { ELEMENT_NAME, ElementIcon, isElement } from './ElementIcon';

interface Props {
  dims: MatchDimension[];
  /** 0 to 100, or null when the cell has no score. */
  score: number | null;
  selected: number;
  onSelect: (i: number) => void;
}

const R = 34; // distance of the icons from the middle, in % of the dial
const R0 = 9; // radius of a similarity of 0
const SPAN = R - R0;
const point = (i: number, r: number) => {
  const a = ((-90 + 72 * i) * Math.PI) / 180;
  return [50 + r * Math.cos(a), 50 + r * Math.sin(a)] as const;
};
const poly = (r: (i: number) => number, n: number) => Array.from({ length: n }, (_, i) => point(i, r(i)).map((v) => v.toFixed(2)).join(',')).join(' ');

const NODE: Record<Verdict, string> = {
  match: 'border-accent bg-accent text-bg',
  partial: 'border-accent bg-bg text-accent',
  miss: 'border-line bg-bg text-muted',
  none: 'border-dashed border-line bg-bg text-muted',
};

/**
 * The score as one picture. Each dimension sits on a spoke, and the amber shape reaches further out the closer
 * the match is. The dashed rings mark the two cut-offs: inside the inner ring a dimension does not match, past
 * the outer one it does. The ring in the middle fills to the overall score.
 */
export function ScoreDial({ dims, score, selected, onSelect }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && (setOn(true), io.disconnect()), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // The number counts up with the ring.
  useEffect(() => {
    if (!on || score === null) return setShown(score ?? 0);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setShown(score);
    const t0 = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / 1400);
      setShown(score * (1 - Math.pow(1 - k, 3)));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [on, score]);

  const n = dims.length;
  const sim = (i: number) => dims[i]?.similarity ?? null;
  const r = (i: number) => R0 + SPAN * Math.max(0, Math.min(1, sim(i) ?? 0));
  const circ = 2 * Math.PI * 7.2;

  return (
    <div ref={box} className="relative mx-auto aspect-square w-full max-w-[480px] [container-type:inline-size]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {/* The two cut-offs and the outer edge. */}
        {[0.3, 0.75, 1].map((s, k) => (
          <polygon key={s} points={poly(() => R0 + SPAN * s, n)} fill="none" stroke="var(--color-line)" strokeWidth={k === 2 ? 0.35 : 0.3} strokeDasharray={k === 2 ? undefined : '1.2 1.2'} />
        ))}
        {/* Spokes. */}
        {dims.map((_, i) => {
          const [x0, y0] = point(i, R0);
          const [x1, y1] = point(i, R);
          const [x2, y2] = point(i, r(i));
          return (
            <g key={i}>
              <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--color-line)" strokeWidth={0.3} />
              <line x1={x0} y1={y0} x2={x2} y2={y2} stroke="var(--color-accent)" strokeWidth={i === selected ? 1.1 : 0.6} style={{ opacity: on ? 1 : 0, transition: `opacity 400ms ease ${400 + i * 90}ms` }} />
            </g>
          );
        })}
        {/* The shape. It grows out of the middle. */}
        <g style={{ transformOrigin: '50px 50px', transform: on ? 'scale(1)' : 'scale(0.15)', opacity: on ? 1 : 0, transition: 'transform 1100ms cubic-bezier(0.2, 0.8, 0.2, 1) 150ms, opacity 500ms ease 150ms' }}>
          <polygon points={poly(r, n)} fill="var(--color-accent)" fillOpacity={0.16} stroke="var(--color-accent)" strokeWidth={0.7} strokeLinejoin="round" />
          {dims.map((_, i) => {
            const [x, y] = point(i, r(i));
            return <circle key={i} cx={x} cy={y} r={i === selected ? 1.7 : 1.1} fill="var(--color-accent)" />;
          })}
        </g>
        {/* The overall score. */}
        <circle cx="50" cy="50" r="7.2" fill="var(--color-bg)" stroke="var(--color-line)" strokeWidth="1.4" />
        {score !== null && (
          <circle
            cx="50"
            cy="50"
            r="7.2"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1.4"
            strokeLinecap="butt"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - (on ? score : 0) / 100)}
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dashoffset 1400ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}
          />
        )}
      </svg>
      <p className="display absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[8.5cqw] leading-none text-text" aria-label={score === null ? 'No score' : `Score ${score.toFixed(0)} out of 100`}>
        {score === null ? '-' : Math.round(shown)}
      </p>

      {dims.map((d, i) => {
        const [x, y] = point(i, R);
        const v = fromRecord(d.verdict);
        const above = i === 0;
        const id = isElement(d.id) ? d.id : null;
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelect(i)}
            aria-pressed={i === selected}
            aria-label={`${d.label}: ${d.similarity === null ? 'no data' : d.similarity.toFixed(2)}`}
            className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${x}%`, top: `${y}%`, opacity: on ? 1 : 0, transform: `translate(-50%, -50%) scale(${on ? 1 : 0.6})`, transition: `opacity 500ms ease ${500 + i * 110}ms, transform 500ms cubic-bezier(0.2, 0.9, 0.3, 1.3) ${500 + i * 110}ms` }}
          >
            <span className={`order-2 flex h-14 w-14 items-center justify-center rounded-full border-2 transition-transform group-hover:scale-110 ${NODE[v]} ${i === selected ? 'scale-110 outline outline-2 outline-offset-4 outline-text' : ''}`}>
              {id && <ElementIcon id={id} size={34} still={v === 'none'} />}
            </span>
            <span className={`absolute whitespace-nowrap bg-bg px-1 text-center text-[12px] font-medium leading-4 ${i === selected ? 'text-text' : 'text-muted'} ${above ? 'bottom-[calc(100%+10px)]' : 'top-[calc(100%+8px)]'}`}>
              {id ? ELEMENT_NAME[id] : d.label}
              <span className="num ml-1.5 text-text">{d.similarity === null ? 'no data' : d.similarity.toFixed(2)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

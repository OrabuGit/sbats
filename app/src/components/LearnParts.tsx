import { useEffect, useRef, useState } from 'react';
import type { Badge } from '../types';
import { SourceBadge } from './Badges';

export const TEX = (name: string) => `${import.meta.env.BASE_URL}textures/${name}.jpg`;

/**
 * The box the page scrolls in: the main element from 1024 px up (the app frame fixes its height there), the
 * document below that. Sticky parts and scroll progress are measured against it.
 */
export function scrollFrame(el: Element | null): { top: number; h: number; el: HTMLElement } {
  const m = el?.closest('main') as HTMLElement | null | undefined;
  if (m && getComputedStyle(m).overflowY !== 'visible' && m.scrollHeight > m.clientHeight + 1) {
    return { top: m.getBoundingClientRect().top, h: m.clientHeight, el: m };
  }
  return { top: 0, h: window.innerHeight, el: (document.scrollingElement as HTMLElement) ?? document.documentElement };
}

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * True once the element has come into view, or has been scrolled past (fast scrolling or a jump from the chapter
 * rail can carry an element from below the screen to above it between two frames, so "seen" means "top above the
 * bottom of the screen", not "intersecting"). Always true under reduced motion.
 */
export function useSeen<T extends HTMLElement>(margin = 0.9) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(reducedMotion);
  useEffect(() => {
    if (seen) return;
    let frame = 0;
    const check = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      if (el.getBoundingClientRect().top < window.innerHeight * margin) setSeen(true);
    };
    const on = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    window.addEventListener('scroll', on, true);
    window.addEventListener('resize', on);
    check();
    return () => {
      window.removeEventListener('scroll', on, true);
      window.removeEventListener('resize', on);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [seen, margin]);
  return [ref, seen] as const;
}

/** Fades and lifts its children once, when they come into view or are scrolled past. */
export function LearnReveal({ children, i = 0, className = '', as = 'div' }: { children: React.ReactNode; i?: number; className?: string; as?: 'div' | 'li' }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const Tag = as as 'div';
  return (
    <Tag ref={ref} className={`reveal ${seen ? 'in' : ''} ${className}`} style={{ ['--i' as string]: i }}>
      {children}
    </Tag>
  );
}

/** Counts from 0 to `to` once `on` turns true. Lands exactly on `to`. */
export function useCount(to: number, on: boolean, ms = 1400) {
  const [v, setV] = useState(() => (reducedMotion() ? to : 0));
  useEffect(() => {
    if (!on) return;
    if (reducedMotion()) return setV(to);
    const t0 = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setV(k >= 1 ? to : to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, on, ms]);
  return v;
}

/** A number that counts up when it comes into view. The final text is in the accessible name from the start. */
export function Counter({ value, digits = 0, className = '', group = true }: { value: number; digits?: number; className?: string; group?: boolean }) {
  const [ref, seen] = useSeen<HTMLSpanElement>();
  const v = useCount(value, seen);
  const fmt = (x: number) => x.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: group });
  return (
    <span ref={ref} className={`num ${className}`} aria-label={fmt(value)}>
      <span aria-hidden="true">{fmt(v)}</span>
    </span>
  );
}

/** The line under every fact block: its badge and where it comes from. */
export function SourceLine({ badge, source, url, className = '' }: { badge: Badge; source: string; url?: string; className?: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-[18px] text-muted ${className}`}>
      <SourceBadge badge={badge} source={source} />
      <span>
        Source:{' '}
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-2 hover:text-text">
            {source}
          </a>
        ) : (
          source
        )}
      </span>
    </p>
  );
}

/** A chapter heading: small kicker, large display line, a short lead. */
export function ChapterHead({ id, n, kicker, title, lead }: { id: string; n: string; kicker: string; title: string; lead: string }) {
  return (
    <LearnReveal className="max-w-[860px]">
      <p className="label flex items-center gap-3">
        <span className="num text-accent">{n}</span>
        <span className="h-px w-10 bg-line" aria-hidden="true" />
        <span>{kicker}</span>
      </p>
      <h2 id={id} className="display-l mt-4 text-[40px] text-text sm:text-[60px]">
        {title}
      </h2>
      <p className="mt-5 max-w-[62ch] text-[17px] leading-7 text-muted">{lead}</p>
    </LearnReveal>
  );
}

/**
 * A world's real imagery in a disc, slowly turning (the map slides sideways under a round window).
 * Off under reduced motion.
 */
export function WorldDisc({ tex, size, spin = 60, className = '', still = false }: { tex: string; size: number | string; spin?: number; className?: string; still?: boolean }) {
  const d = typeof size === 'number' ? `${size}px` : size;
  // One full turn moves the map (twice as wide as it is tall) by two heights to the right. In percent units the
  // offset is p × (box − image) = p × (−height), so −200% is the same move.
  const to = typeof size === 'number' ? `${2 * size}px` : '-200%';
  return (
    <span
      aria-hidden="true"
      className={`learn-disc block shrink-0 rounded-full bg-panel ${still ? '' : 'learn-spin'} ${className}`}
      style={{ width: d, height: d, backgroundImage: `url(${TEX(tex)})`, ['--to' as string]: to, ['--spin' as string]: `${spin}s` }}
    />
  );
}

/** Styles this page needs beyond index.css. Kept here so the page is self-contained. */
export const LEARN_CSS = `
.learn-disc { background-size: auto 100%; background-repeat: repeat-x; background-position: 0 0; }
.learn-spin { animation: learn-spin var(--spin, 60s) linear infinite; }
@keyframes learn-spin { to { background-position: var(--to) 0; } }
.learn-ping { animation: learn-ping 2.4s ease-out infinite; }
@keyframes learn-ping { 0% { transform: scale(1); opacity: .9; } 100% { transform: scale(3.2); opacity: 0; } }
.learn-fall { animation: learn-fall var(--t) cubic-bezier(.45,0,1,1) infinite; }
@keyframes learn-fall { 0% { transform: translateY(0); } 70% { transform: translateY(var(--h)); } 100% { transform: translateY(var(--h)); } }
.learn-draw { stroke-dasharray: var(--len, 400); stroke-dashoffset: var(--len, 400); transition: stroke-dashoffset 1600ms cubic-bezier(.2,.7,.2,1); }
.in .learn-draw, .learn-draw.in { stroke-dashoffset: 0; }
.learn-tilt { transition: transform 1400ms cubic-bezier(.2,.7,.2,1) 250ms; }
.learn-grow { transition: transform 1200ms cubic-bezier(.2,.7,.2,1); }
.learn-rail::-webkit-scrollbar { display: none; }
.learn-rail { scrollbar-width: none; }
@media (prefers-reduced-motion: reduce) {
  .learn-spin, .learn-ping, .learn-fall { animation: none !important; }
  .learn-draw { stroke-dashoffset: 0 !important; transition: none !important; }
  .learn-tilt, .learn-grow { transition: none !important; }
}
`;

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ChevronDown } from 'lucide-react';

// Small pieces shared by the Validation and Sites pages: a scroll reveal that cannot leave content hidden,
// a count-up number, flat meters and the three marks used on the percentile charts.

const calm = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * True once the element has been on screen or has been scrolled past. It checks on every scroll frame as well as
 * through an IntersectionObserver, so a fast scroll or a jump to an anchor never leaves it hidden.
 */
export function useSeen<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (calm() || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    let raf = 0;
    const check = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      // On screen, or already above the screen.
      if (r.top < window.innerHeight * 0.94) setSeen(true);
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    const io = new IntersectionObserver(queue, { threshold: [0, 0.1] });
    io.observe(el);
    document.addEventListener('scroll', queue, { capture: true, passive: true });
    window.addEventListener('resize', queue);
    check();
    return () => {
      io.disconnect();
      document.removeEventListener('scroll', queue, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', queue);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [seen]);
  return [ref, seen];
}

/** Fades and lifts its children once. `.in` also starts the `.bar-grow` bars inside. */
export function Rv({ children, i = 0, className = '' }: { children: ReactNode; i?: number; className?: string }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal ${seen ? 'in' : ''} ${className}`} style={{ ['--i' as string]: i }}>
      {children}
    </div>
  );
}

/** A number that counts up from zero once `play` is true. Always ends on the exact value, also if the tab is hidden. */
export function CountUp({ value, decimals = 0, play, ms = 1100, suffix = '' }: { value: number | null; decimals?: number; play: boolean; ms?: number; suffix?: string }) {
  const [v, setV] = useState<number | null>(value === null || calm() ? value : 0);
  useEffect(() => {
    if (value === null) {
      setV(null);
      return;
    }
    if (!play || calm()) {
      setV(calm() || play ? value : 0);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setV(value * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const done = window.setTimeout(() => setV(value), ms + 120);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
  }, [value, play, ms]);
  if (value === null) return <span className="num">no data</span>;
  return (
    <span className="num">
      {(v ?? 0).toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** Marks used on the charts. Shape carries the meaning, so colour never has to. */
export type MarkKind = 'tuning' | 'holdout' | 'negative' | 'other';
export function Mark({ kind, size = 12, className = '' }: { kind: MarkKind; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} className={className} aria-hidden="true">
      {kind === 'tuning' && <circle cx="6" cy="6" r="4.6" fill="currentColor" />}
      {kind === 'holdout' && <path d="M6 0.6 L11.4 6 L6 11.4 L0.6 6 Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="miter" />}
      {kind === 'negative' && <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="1.8" fill="none" />}
      {kind === 'other' && <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.8" />}
    </svg>
  );
}

/** A flat meter, 0 to 1, with an optional tick (chance, a second value). The fill grows once its block is revealed. */
export function Meter({ value, tick, tickLabel, height = 8, tone = 'accent', label }: { value: number | null; tick?: number; tickLabel?: string; height?: number; tone?: 'accent' | 'text' | 'muted'; label: string }) {
  const fill = tone === 'accent' ? 'bg-accent' : tone === 'text' ? 'bg-text' : 'bg-muted';
  return (
    <div className="relative" style={{ height }} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={1} aria-valuenow={value ?? 0} aria-valuetext={value === null ? 'no data' : value.toFixed(3)}>
      <div className="absolute inset-0 bg-line" />
      {value !== null && <div className={`bar-grow absolute inset-y-0 left-0 ${fill}`} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />}
      {tick !== undefined && (
        <span className="absolute -inset-y-1.5 w-px bg-text" style={{ left: `${tick * 100}%` }} title={tickLabel}>
          <span className="sr-only">{tickLabel}</span>
        </span>
      )}
    </div>
  );
}

/** A collapsed block for tables and long lists. A real details element, so it is keyboard reachable. */
export function More({ title, children, className = '', id }: { title: string; children: ReactNode; className?: string; id?: string }) {
  return (
    <details id={id} className={`group border-t border-line ${className}`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-2 text-[14px] text-text hover:text-accent [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 pb-5 pt-2">{children}</div>
    </details>
  );
}

/** A page section in the house style: a small label, a large heading, one sentence, then the figure. */
export function Block({ id, label, title, lead, children, size = 'l' }: { id: string; label: string; title: string; lead?: ReactNode; children: ReactNode; size?: 'l' | 'm' }) {
  return (
    <section aria-labelledby={id} className="px-5 py-16 sm:px-10 sm:py-20 lg:px-16">
      <Rv>
        <p className="label">{label}</p>
        <h3 id={id} className={`display-l mt-2 max-w-[22ch] ${size === 'l' ? 'text-[34px] sm:text-[52px]' : 'text-[28px] sm:text-[40px]'}`}>
          {title}
        </h3>
        {lead && <p className="mt-4 max-w-[60ch] text-[16px] leading-[26px] text-muted">{lead}</p>}
      </Rv>
      <div className="mt-10">{children}</div>
    </section>
  );
}

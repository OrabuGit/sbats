import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChapterHead, SourceLine, WorldDisc, scrollFrame } from './LearnParts';
import { EVENTS, LANE_NAME, LANE_TEX, type Lane } from './LearnData';

/** Height of the sticky chapter rail above, in px. The pinned timeline sits just under it. */
export const RAIL_H = 52;
const LANES: (Lane | 'all')[] = ['all', 'moon', 'mars', 'earth'];

/**
 * Chapter 4: a horizontal timeline that is pinned while the page scrolls past it, and slides sideways with the scroll.
 * Position follows the scroll exactly, so fast scrolling can never leave it half-way through an animation.
 */
export function LearnTimeline() {
  const [lane, setLane] = useState<Lane | 'all'>('all');
  const events = EVENTS.filter((e) => lane === 'all' || e.lane === lane);
  const outer = useRef<HTMLDivElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const [dims, setDims] = useState({ h: 640, extra: 0 });
  const [active, setActive] = useState(0);
  const [shown, setShown] = useState(1);
  const dimsRef = useRef(dims);
  dimsRef.current = dims;

  // Measure the scrolling box and how far the track is wider than the screen.
  useLayoutEffect(() => {
    const measure = () => {
      const h = Math.max(420, Math.min(scrollFrame(outer.current).h, window.innerHeight) - RAIL_H);
      const extra = Math.max(0, (track.current?.scrollWidth ?? 0) - (view.current?.clientWidth ?? 0));
      setDims((d) => (d.h === h && d.extra === extra ? d : { h, extra }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (track.current) ro.observe(track.current);
    if (view.current) ro.observe(view.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [lane]);

  useEffect(() => {
    let frame = 0;
    const n = events.length;
    const update = () => {
      frame = 0;
      const o = outer.current;
      const v = view.current;
      if (!o || !v) return;
      const top = scrollFrame(o).top + RAIL_H;
      const { extra } = dimsRef.current;
      const dist = top - o.getBoundingClientRect().top;
      const p = extra > 0 ? Math.min(1, Math.max(0, dist / extra)) : dist > 0 ? 1 : 0;
      if (track.current) track.current.style.transform = `translate3d(${-p * extra}px,0,0)`;
      if (fill.current) fill.current.style.transform = `scaleX(${p})`;
      // The active event is the one under the reading line, a third of the way across the screen.
      const line = v.getBoundingClientRect().left + v.clientWidth * 0.36;
      let a = 0;
      let s = 0;
      const right = v.getBoundingClientRect().right;
      track.current?.querySelectorAll<HTMLElement>('[data-ev]').forEach((el, i) => {
        const r = el.getBoundingClientRect();
        if (r.left <= line) a = i;
        if (r.left < right - 40) s = i + 1;
      });
      if (p >= 0.999) a = n - 1;
      // An event further left than the screen was already passed, so it counts as shown.
      setActive(a);
      setShown(Math.max(s, a + 1));
    };
    const on = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', on, true);
    window.addEventListener('resize', on);
    update();
    return () => {
      window.removeEventListener('scroll', on, true);
      window.removeEventListener('resize', on);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [events.length, dims]);

  const cur = events[Math.min(active, events.length - 1)];

  return (
    <section id="learn-history" aria-labelledby="h-learn-history" className="scroll-mt-16">
      <div className="px-5 pb-10 pt-20 sm:px-10 lg:pt-28">
        <ChapterHead
          id="h-learn-history"
          n="04"
          kicker="History"
          title="Sixty-five years of going there"
          lead="Landings on the Moon and Mars, and the stations on Earth where crews practise. Keep scrolling: the timeline moves sideways as you go down."
        />
        <div className="tabs mt-8 max-w-full overflow-x-auto learn-rail" role="group" aria-label="Show events for">
          {LANES.map((l) => (
            <button key={l} type="button" className="tab" aria-pressed={lane === l} onClick={() => setLane(l)}>
              {l === 'all' ? 'Everything' : LANE_NAME[l]}
            </button>
          ))}
        </div>
      </div>

      <div ref={outer} style={{ height: dims.h + dims.extra }}>
        <div ref={view} className="sticky flex flex-col overflow-hidden" style={{ top: RAIL_H, height: dims.h }}>
          <div className="flex items-end justify-between gap-6 px-5 pt-4 sm:px-10">
            <div aria-live="off">
              <p className="label">{cur ? LANE_NAME[cur.lane] : ''}</p>
              <p className="display-xl num text-[64px] text-text sm:text-[112px]">{cur?.year ?? ''}</p>
            </div>
            <p className="num pb-3 text-[13px] text-muted">
              {Math.min(active + 1, events.length)} / {events.length}
            </p>
          </div>
          <div className="relative mx-5 mt-4 h-0.5 bg-line sm:mx-10" aria-hidden="true">
            <span ref={fill} className="absolute inset-0 origin-left bg-accent" style={{ transform: 'scaleX(0)' }} />
          </div>

          <div className="relative min-h-0 flex-1">
            <div ref={track} className="absolute inset-y-0 left-0 flex w-max items-start pl-5 pr-[40vw] pt-8 will-change-transform sm:pl-10 lg:pt-16">
              <span className="absolute left-0 right-0 top-[44px] h-px bg-line lg:top-[76px]" aria-hidden="true" />
              <ol className="flex items-start" aria-label="Timeline of exploration and analog missions">
                {events.map((e, i) => {
                  const on = i < shown;
                  const now = i === active;
                  return (
                    <li key={e.title + e.year} data-ev="" className="relative w-[248px] shrink-0 pr-8 sm:w-[320px] sm:pr-12 lg:w-[400px]">
                      <span
                        className={`relative z-[1] block h-6 w-6 rounded-full border-2 transition-colors duration-300 ${now ? 'border-accent bg-accent' : i < active ? 'border-accent bg-bg' : 'border-line bg-bg'}`}
                        aria-hidden="true"
                      />
                      <div
                        className="mt-6 transition-[opacity,transform] duration-500"
                        style={{ opacity: on ? 1 : 0, transform: on ? 'none' : 'translate3d(0,24px,0)' }}
                      >
                        <div className="flex items-center gap-2">
                          <WorldDisc tex={LANE_TEX[e.lane]} size={20} still />
                          <span className="num text-[13px] text-muted">{e.when}</span>
                        </div>
                        <h3 className={`display mt-2 text-[24px] sm:text-[30px] lg:text-[40px] ${now ? 'text-accent' : 'text-text'}`}>{e.title}</h3>
                        <p className="mt-2 text-[15px] leading-6 text-text lg:text-[17px] lg:leading-7">{e.text}</p>
                        <SourceLine className="mt-3" badge={e.badge} source={e.src.name} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

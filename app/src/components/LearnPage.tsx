import { SiteFooter } from './SiteFooter';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Crosshair, Layers, Mountain } from 'lucide-react';
import type { WorldId } from './Worlds';
import { WORLD_CREDIT, WORLD_RADIUS_KM } from './Worlds';
import { ChapterHead, Counter, LEARN_CSS, LearnReveal, SourceLine, WorldDisc, reducedMotion, scrollFrame } from './LearnParts';
import { EVENTS, STATIONS, WORLD_TEX } from './LearnData';
import { LearnBases } from './LearnBases';
import { LearnRovers } from './LearnRovers';
import { LearnWorlds } from './LearnWorlds';
import { LearnTimeline, RAIL_H } from './LearnTimeline';

const CHAPTERS = [
  { id: 'learn-bases', name: 'Bases' },
  { id: 'learn-rovers', name: 'Rovers' },
  { id: 'learn-worlds', name: 'Worlds' },
  { id: 'learn-history', name: 'History' },
  { id: 'learn-why', name: 'Why analogs' },
];

/** The Learn page: space bases, rovers, the three worlds, a history timeline, and why analogs matter. */
export function LearnPage({ onFind, onWorld, onAiUse }: { onFind: () => void; onWorld: (w: WorldId) => void; onAiUse?: () => void }) {
  const main = useRef<HTMLElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const [chapter, setChapter] = useState(-1);

  // Which chapter is being read, and how far down the page the reader is.
  useEffect(() => {
    const m = main.current;
    if (!m) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const f = scrollFrame(m);
      const top = f.top + RAIL_H + 120;
      let c = -1;
      CHAPTERS.forEach((ch, i) => {
        const el = document.getElementById(ch.id);
        if (el && el.getBoundingClientRect().top <= top) c = i;
      });
      setChapter(c);
      const sc = f.el;
      const p = sc.scrollHeight > sc.clientHeight ? Math.min(1, sc.scrollTop / (sc.scrollHeight - sc.clientHeight)) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    };
    const on = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // Scroll events do not bubble; the capture phase sees both the main element and the document scrolling.
    window.addEventListener('scroll', on, { capture: true, passive: true });
    window.addEventListener('resize', on);
    update();
    return () => {
      window.removeEventListener('scroll', on, { capture: true });
      window.removeEventListener('resize', on);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  const firstYear = Math.min(...EVENTS.map((e) => e.year));

  return (
    <main
      ref={main}
      className="relative min-h-0 flex-1 overflow-x-clip bg-bg lg:overflow-y-auto"
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A3138 transparent' }}
      aria-labelledby="h-learn"
    >
      <style>{LEARN_CSS}</style>

      {/* Hero */}
      <header className="grid gap-12 px-5 pb-16 pt-14 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:pb-24 lg:pt-20">
        <LearnReveal>
          <p className="label">Learn</p>
          <h1 id="h-learn" className="display-xl mt-4 text-[52px] text-text sm:text-[88px]">
            Bases, rovers and three worlds
          </h1>
          <p className="mt-6 max-w-[52ch] text-[18px] leading-8 text-muted">
            How people get ready to live on the Moon and Mars, the machines that drive there, and why the practice happens on Earth first.
          </p>
          <dl className="mt-10 grid max-w-[520px] grid-cols-3 gap-6">
            <div>
              <dt className="label">Analog stations</dt>
              <dd className="display mt-1 text-[40px] text-text">
                <Counter value={STATIONS.length} />
              </dd>
            </div>
            <div>
              <dt className="label">Milestones</dt>
              <dd className="display mt-1 text-[40px] text-text">
                <Counter value={EVENTS.length} />
              </dd>
            </div>
            <div>
              <dt className="label">Since</dt>
              <dd className="display mt-1 text-[40px] text-text">
                <Counter value={firstYear} group={false} />
              </dd>
            </div>
          </dl>
        </LearnReveal>
        <LearnReveal i={1}>
          <figure className="m-0">
            <div className="flex items-end gap-[4%]" aria-hidden="true">
              {(['earth', 'mars', 'moon'] as WorldId[]).map((w) => (
                <div key={w} className="min-w-0" style={{ flex: `${WORLD_RADIUS_KM[w]} 1 0` }}>
                  <WorldDisc tex={WORLD_TEX[w]} size="100%" spin={w === 'moon' ? 110 : w === 'mars' ? 70 : 80} className="aspect-square !h-auto" />
                </div>
              ))}
            </div>
            <figcaption className="readout mt-3">Earth, Mars and the Moon at true relative size. {WORLD_CREDIT}</figcaption>
          </figure>
        </LearnReveal>
      </header>

      {/* Chapter rail */}
      <nav className="sticky top-0 z-20 border-b border-line bg-bg" style={{ height: RAIL_H }} aria-label="Chapters">
        <div className="learn-rail flex h-full items-stretch overflow-x-auto px-2 sm:px-8">
          {CHAPTERS.map((c, i) => (
            <button key={c.id} type="button" className="tab shrink-0" aria-pressed={chapter === i} onClick={() => go(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
        <span ref={bar} className="absolute bottom-[-1px] left-0 h-0.5 w-full origin-left bg-accent" style={{ transform: 'scaleX(0)' }} aria-hidden="true" />
      </nav>

      <LearnBases />
      <div className="mx-5 h-px bg-line sm:mx-10" aria-hidden="true" />
      <LearnRovers />
      <div className="mx-5 h-px bg-line sm:mx-10" aria-hidden="true" />
      <LearnWorlds onWorld={onWorld} />
      <div className="mx-5 h-px bg-line sm:mx-10" aria-hidden="true" />
      <LearnTimeline />

      {/* Why analogs */}
      <section id="learn-why" aria-labelledby="h-learn-why" className="scroll-mt-16 border-t border-line px-5 py-20 sm:px-10 lg:py-28">
        <ChapterHead
          id="h-learn-why"
          n="05"
          kicker="Why analogs matter"
          title="Practise where you can still walk home"
          lead="Every base and rover on this page was tried out on Earth first. NASA uses analog sites to test systems, plans and people before crews are sent to space. The hard part is finding the right ground."
        />
        <LearnReveal className="mt-4">
          <SourceLine badge="Literature" source="NASA, Analog Missions" url="https://www.nasa.gov/analog-missions/" />
        </LearnReveal>
        <ol className="mt-14 grid gap-10 md:grid-cols-3">
          {[
            { icon: Crosshair, title: 'Pick a place', text: 'Choose a base site on the Moon or Mars, such as a crater near the lunar South Pole or Jezero on Mars.' },
            { icon: Layers, title: 'Compare every cell', text: 'SBATS scores open land on Earth for rock type, terrain, climate, bare ground and sunlight, and shows what is missing.' },
            { icon: Mountain, title: 'Find new ground', text: 'The famous sites are deserts, Antarctica and Hawaii. SBATS looks for places not tried yet, with Indonesia as its first deep dive.' },
          ].map((s, k) => (
            <LearnReveal key={s.title} as="li" i={k}>
              <div className="border-t border-line pt-6">
                <s.icon size={28} className="text-accent" aria-hidden="true" />
                <h3 className="display mt-4 text-[26px] text-text">{s.title}</h3>
                <p className="mt-3 max-w-[40ch] text-[15px] leading-6 text-text">{s.text}</p>
              </div>
            </LearnReveal>
          ))}
        </ol>
        <LearnReveal className="mt-14">
          <p className="max-w-[60ch] text-[15px] leading-6 text-muted">
            Gravity, vacuum and space radiation cannot be copied on open ground. SBATS never scores them and lists them as what Earth cannot copy.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button type="button" onClick={onFind} className="btn btn-primary !min-h-[52px] !px-6 !text-[15px]">
              Find an analog
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onWorld('moon')} className="btn">
              Read about the Moon
            </button>
            <button type="button" onClick={() => onWorld('mars')} className="btn">
              Read about Mars
            </button>
          </div>
        </LearnReveal>
      </section>
      {onAiUse && <SiteFooter onAiUse={onAiUse} />}
    </main>
  );
}

import { ArrowRight } from 'lucide-react';
import { WORLD_PAGES, WORLD_SOURCES } from '../data/worlds';
import { ComputedBadge } from './Badges';
import { ChapterHead, Counter, LearnReveal, SourceLine, WorldDisc, useSeen } from './LearnParts';
import { WORLD_TEX } from './LearnData';
import { WORLD_CREDIT, WORLD_NAME, WORLD_RADIUS_KM, type WorldId } from './worldInfo';

const ORDER: WorldId[] = ['earth', 'mars', 'moon'];
const DROP_M = 2;

/** Mean surface gravity, read from the same cited fact rows the world pages show. */
const gravityOf = (w: WorldId): number | null => {
  const f = WORLD_PAGES[w].facts.find((x) => x.label.startsWith('Surface gravity'));
  const v = f ? parseFloat(f.value) : NaN;
  return Number.isFinite(v) ? v : null;
};
const factSource = (w: WorldId) => WORLD_SOURCES.find((s) => s.id === `${w}fact`) ?? null;
/** Every source behind a world card: the lead sentence and the fact rows shown. */
const cardSources = (w: WorldId, labels: string[]) => {
  const p = WORLD_PAGES[w];
  const ids = [...p.lead.src, ...p.facts.filter((f) => labels.includes(f.label)).map((f) => f.src)];
  return [...new Set(ids)].map((id) => WORLD_SOURCES.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s);
};
/** The rows shown per world here: size, gravity, day, air, temperature. The full list is on the world page. */
const PICK = /^(Surface gravity|Length of day|Synodic|Surface pressure|Average temperature|Temperature range)/;

/** Chapter 3: the three worlds drawn to true relative size, their gravity, and a few cited facts. */
export function LearnWorlds({ onWorld }: { onWorld: (w: WorldId) => void }) {
  const [stageRef, stageSeen] = useSeen<HTMLDivElement>(0.85);
  const g: Record<WorldId, number | null> = { earth: gravityOf('earth'), moon: gravityOf('moon'), mars: gravityOf('mars') };
  const gEarth = g.earth;

  return (
    <section id="learn-worlds" aria-labelledby="h-learn-worlds" className="scroll-mt-16 px-5 py-20 sm:px-10 lg:py-28">
      <ChapterHead
        id="h-learn-worlds"
        n="03"
        kicker="Three worlds"
        title="Earth, Mars and the Moon, to scale"
        lead="The discs below are drawn at their true sizes compared with each other. Mars is about half as wide as Earth, and the Moon about a quarter."
      />

      <div ref={stageRef} className="mt-14 grid max-w-[980px] items-end gap-[3%]" style={{ gridTemplateColumns: ORDER.map((w) => `${WORLD_RADIUS_KM[w]}fr`).join(' ') }}>
        {ORDER.map((w, k) => (
          <div key={w} className="min-w-0">
            <div className="learn-grow origin-bottom" style={{ transform: stageSeen ? 'none' : 'scale(0.15)', transitionDelay: `${k * 180}ms` }}>
              <WorldDisc tex={WORLD_TEX[w]} size="100%" spin={w === 'earth' ? 80 : w === 'mars' ? 70 : 110} className="aspect-square !h-auto" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid max-w-[980px] gap-[3%]" style={{ gridTemplateColumns: ORDER.map((w) => `${WORLD_RADIUS_KM[w]}fr`).join(' ') }}>
        {ORDER.map((w) => (
          <div key={w} className="min-w-0">
            <p className="display text-[18px] text-text sm:text-[28px]">{WORLD_NAME[w]}</p>
            <p className="mt-1 text-[12px] text-muted sm:text-[14px]">
              <Counter value={WORLD_RADIUS_KM[w]} digits={1} className="text-text" /> km
            </p>
          </div>
        ))}
      </div>
      <SourceLine className="mt-4" badge="Literature" source="NASA NSSDCA planetary fact sheets: volumetric mean radius" url="https://nssdc.gsfc.nasa.gov/planetary/factsheet/" />
      <p className="readout mt-1">Imagery: {WORLD_CREDIT}</p>

      <LearnReveal className="mt-24 max-w-[860px]">
        <h3 className="display-l text-[32px] text-text sm:text-[44px]">Drop a ball from 2 m</h3>
        <p className="mt-4 max-w-[60ch] text-[16px] leading-7 text-muted">
          Gravity is the one thing no place on Earth can copy. Each ball falls at the real speed for its world, using the surface gravity from the NASA fact sheets.
        </p>
      </LearnReveal>
      <ul className="mt-10 grid grid-cols-3 gap-3 sm:gap-8">
        {ORDER.map((w, k) => {
          const gv = g[w];
          const t = gv ? Math.sqrt((2 * DROP_M) / gv) : null;
          const pack = gv && gEarth ? (100 * gv) / gEarth : null;
          const src = factSource(w);
          return (
            <LearnReveal key={w} as="li" i={k}>
              <div className="relative h-[200px] border-b border-line" aria-hidden="true">
                <span className="absolute left-0 top-0 w-full border-t border-dashed border-line" />
                {t !== null && (
                  <span
                    className="learn-fall absolute left-1/2 top-0 -ml-3 block h-6 w-6 rounded-full bg-accent"
                    style={{ ['--t' as string]: `${(t / 0.7).toFixed(3)}s`, ['--h' as string]: 'calc(200px - 24px)' }}
                  />
                )}
              </div>
              <p className="display mt-4 text-[16px] text-text sm:text-[24px]">{WORLD_NAME[w]}</p>
              <dl className="mt-2 space-y-3">
                <div>
                  <dt className="label">Gravity</dt>
                  <dd className="text-[14px] text-text sm:text-[18px]">{gv !== null ? <><Counter value={gv} digits={2} /> m/s²</> : 'no data'}</dd>
                </div>
                <div>
                  <dt className="label">2 m fall takes</dt>
                  <dd className="text-[14px] text-text sm:text-[18px]">{t !== null ? <><Counter value={t} digits={2} /> s</> : 'no data'}</dd>
                </div>
                <div>
                  <dt className="label">A 100 kg pack feels like</dt>
                  <dd className="text-[14px] text-text sm:text-[18px]">{pack !== null ? <><Counter value={pack} digits={0} /> kg on Earth</> : 'no data'}</dd>
                </div>
              </dl>
              {src && <SourceLine className="mt-3" badge="Literature" source={src.publisher + ', ' + src.title.replace(/ \(.*\)$/, '')} url={src.url} />}
            </LearnReveal>
          );
        })}
      </ul>
      <p className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-muted">
        <ComputedBadge title="Computed in the browser: fall time = √(2 × 2 m ÷ g); felt weight = 100 kg × g ÷ Earth's g. Air drag ignored." />
        Fall time = √(2 × height ÷ gravity), air ignored. Felt weight = 100 kg × gravity ÷ Earth's gravity.
      </p>

      <ul className="mt-24 grid gap-12 lg:grid-cols-3">
        {(['earth', 'moon', 'mars'] as WorldId[]).map((w, k) => {
          const facts = WORLD_PAGES[w].facts.filter((f) => PICK.test(f.label));
          const srcs = cardSources(w, facts.map((f) => f.label));
          return (
            <LearnReveal key={w} as="li" i={k}>
              <article className="border-t border-line pt-6" aria-labelledby={`wf-${w}`}>
                <div className="flex items-center gap-4">
                  <WorldDisc tex={WORLD_TEX[w]} size={56} spin={80} />
                  <h3 id={`wf-${w}`} className="display text-[28px] text-text">
                    {w === 'moon' ? 'The Moon' : WORLD_NAME[w]}
                  </h3>
                </div>
                <p className="mt-4 text-[15px] leading-6 text-text">{WORLD_PAGES[w].lead.text}</p>
                <dl className="mt-5 divide-y divide-line border-y border-line">
                  {facts.map((f) => (
                    <div key={f.label} className="flex items-baseline justify-between gap-4 py-2.5">
                      <dt className="text-[13px] text-muted">{f.label}</dt>
                      <dd className="num text-right text-[14px] text-text">{f.value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 space-y-1">
                  {srcs.map((s) => (
                    <SourceLine key={s.id} badge={s.id.endsWith('fact') ? 'Literature' : 'Mission'} source={`${s.publisher}, ${s.title}`} url={s.url} />
                  ))}
                </div>
                <button type="button" onClick={() => onWorld(w)} className="btn mt-5">
                  All facts about {w === 'moon' ? 'the Moon' : WORLD_NAME[w]}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </article>
            </LearnReveal>
          );
        })}
      </ul>
    </section>
  );
}

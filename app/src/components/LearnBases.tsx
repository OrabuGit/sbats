import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { ChapterHead, LearnReveal, SourceLine, TEX, WorldDisc, useSeen } from './LearnParts';
import { PLANNED, STATIONS, WORLD_TEX } from './LearnData';
import { WORLD_CREDIT } from './worldInfo';
import { ActivityArt } from './ActivityArt';
import { AiMark } from './AiMark';

/** Equirectangular position on a 2:1 map, in percent. */
const pos = (lat: number, lon: number) => ({ left: `${((lon + 180) / 360) * 100}%`, top: `${((90 - lat) / 180) * 100}%` });

/** Chapter 1: the analog stations on Earth on a real world map, then the bases planned on the Moon and Mars. */
export function LearnBases() {
  const [hot, setHot] = useState<string | null>(null);
  const [mapRef, mapSeen] = useSeen<HTMLDivElement>(0.8);

  return (
    <section id="learn-bases" aria-labelledby="h-learn-bases" className="scroll-mt-16 px-5 py-20 sm:px-10 lg:py-28">
      <ChapterHead
        id="h-learn-bases"
        n="01"
        kicker="Space bases"
        title="Rehearsing a base, on Earth"
        lead="Before anyone lives on the Moon or Mars, crews practise here. NASA calls a place used this way an analog: somewhere on Earth that is like a place in space in some ways, used to test gear, plans and people first."
      />
      <LearnReveal className="mt-4">
        <SourceLine badge="Literature" source="NASA, Analog Missions" url="https://www.nasa.gov/analog-missions/" />
      </LearnReveal>

      <div className="mt-14 grid gap-10 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <LearnReveal>
          <figure className="m-0 xl:sticky xl:top-20">
            <div
              ref={mapRef}
              className="relative aspect-[2/1] overflow-hidden bg-panel"
              style={{ backgroundImage: `url(${TEX('blue-marble-2048')})`, backgroundSize: '100% 100%' }}
            >
              <span className="absolute inset-0 bg-bg/45" aria-hidden="true" />
              {STATIONS.map((s, k) => {
                const on = hot === s.id;
                return (
                  <span
                    key={s.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500"
                    style={{ ...pos(s.lat, s.lon), opacity: mapSeen ? 1 : 0, transitionDelay: `${k * 140}ms` }}
                    aria-hidden="true"
                  >
                    <span className="learn-ping absolute inset-0 rounded-full border border-accent" style={{ animationDelay: `${k * 300}ms` }} />
                    <span className={`relative block rounded-full border-2 border-bg transition-all ${on ? 'h-4 w-4 bg-text' : 'h-3 w-3 bg-accent'}`} />
                    <span
                      className={`num absolute top-1/2 ${s.id === 'chapea' || s.id === 'hiseas' ? 'right-4' : 'left-4'} -translate-y-1/2 whitespace-nowrap bg-bg px-1 text-[11px] leading-4 ${on ? 'text-text' : 'text-muted'} ${k % 2 ? 'hidden sm:block' : ''}`}
                    >
                      {s.name}
                    </span>
                  </span>
                );
              })}
            </div>
            <figcaption className="readout mt-2">
              Approximate positions of the stations below on the Blue Marble, NASA Earth Observatory.
            </figcaption>
          </figure>
        </LearnReveal>

        <ol className="grid gap-x-8 sm:grid-cols-2 xl:grid-cols-1">
          {STATIONS.map((s, k) => (
            <LearnReveal key={s.id} as="li" i={k % 3}>
              <article
                className={`border-t py-6 transition-colors ${hot === s.id ? 'border-accent' : 'border-line'}`}
                onMouseEnter={() => setHot(s.id)}
                onMouseLeave={() => setHot(null)}
                aria-labelledby={`st-${s.id}`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 id={`st-${s.id}`} className="display text-[26px] text-text">
                    {s.name}
                  </h3>
                  <span className="num shrink-0 text-[13px] text-muted">since {s.since}</span>
                </div>
                <p className="mt-1 text-[13px] text-muted">{s.full}</p>
                <p className="mt-3 flex items-center gap-2 text-[14px] text-text">
                  <MapPin size={15} className="shrink-0 text-accent" aria-hidden="true" />
                  {s.where}
                </p>
                <p className="mt-3 max-w-[56ch] text-[15px] leading-6 text-text">{s.text}</p>
                <p className="mt-3 text-[13px] text-muted">
                  Practice for: <span className="text-text">{s.analogOf}</span>
                </p>
                <SourceLine className="mt-3" badge={s.badge} source={s.src.map((x) => x.name).join('; ')} url={s.src[0].url} />
              </article>
            </LearnReveal>
          ))}
        </ol>
      </div>

      <LearnReveal className="mt-24 max-w-[860px]">
        <h3 className="display-l text-[32px] text-text sm:text-[44px]">And the real ones, still to come</h3>
        <p className="mt-4 max-w-[60ch] text-[16px] leading-7 text-muted">
          Nobody lives on another world yet. These are the bases that space agencies have announced.
        </p>
      </LearnReveal>
      <ul className="mt-10 grid gap-6 md:grid-cols-3">
        {PLANNED.map((p, k) => (
          <LearnReveal key={p.id} as="li" i={k}>
            <article className="flex h-full flex-col border-t border-line pt-6" aria-labelledby={`pl-${p.id}`}>
              <div className="flex items-center gap-4">
                <WorldDisc tex={WORLD_TEX[p.body]} size={64} spin={p.body === 'moon' ? 90 : 70} />
                <ActivityArt kind="base" className="h-11 w-[72px] text-muted" />
              </div>
              <p className="label mt-5">{p.status}</p>
              <h4 id={`pl-${p.id}`} className="display mt-1 text-[24px] text-text">
                {p.name}
              </h4>
              <p className="mt-1 text-[13px] text-muted">
                {p.who} · {p.body === 'moon' ? 'the Moon' : 'Mars'}
              </p>
              <p className="mt-3 flex-1 text-[15px] leading-6 text-text">{p.text}</p>
              <SourceLine className="mt-4" badge={p.badge} source={p.src[0].name} url={p.src[0].url} />
            </article>
          </LearnReveal>
        ))}
      </ul>
      <AiMark className="mt-4" />
      <p className="readout mt-2">Imagery: {WORLD_CREDIT}</p>
    </section>
  );
}

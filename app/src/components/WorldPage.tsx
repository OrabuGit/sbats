import type { Target } from '../types';
import { formatCoords } from '../lib/geo';
import { WORLD_PAGES, WORLD_SOURCES, WORLD_SOURCES_ACCESSED } from '../data/worlds';
import { SourceBadge } from './Badges';
import { WORLD_NAME, type WorldId } from './worldInfo';

interface Props {
  world: WorldId;
  onWorld: (w: WorldId) => void;
  targets: Target[];
  onPlace: (targetId: string) => void;
  onFind: () => void;
}

const WORLDS: WorldId[] = ['earth', 'moon', 'mars'];

/** A world page: what the world is, what has been done there, and why it matters for analogs. Every fact is cited. */
export function WorldPage({ world, onWorld, targets, onPlace, onFind }: Props) {
  const page = WORLD_PAGES[world];
  // Sources are numbered in the order this page first uses them.
  const used: string[] = [];
  const n = (id: string) => {
    let i = used.indexOf(id);
    if (i < 0) i = used.push(id) - 1;
    return i + 1;
  };
  // Called while this component renders, not as a child component, so the numbers exist before the list is drawn.
  const cite = (ids: string[]) => <sup className="num ml-0.5 text-[10px] text-muted">{ids.map((id) => `[${n(id)}]`).join('')}</sup>;
  const here = world === 'earth' ? [] : targets.filter((t) => t.body === world);

  return (
    <main className="scroll min-h-0 flex-1 bg-bg" aria-labelledby="h-worldpage">
      <div className="tabs px-2 sm:px-3" role="group" aria-label="World">
        {WORLDS.map((w) => (
          <button key={w} type="button" aria-pressed={w === world} onClick={() => onWorld(w)} className="tab sm:!px-5">
            {WORLD_NAME[w]}
          </button>
        ))}
      </div>

      <header className="grid gap-x-10 gap-y-6 border-b border-line px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <p className="label">World</p>
          <h2 id="h-worldpage" className="mt-1 text-[32px] font-semibold leading-9 text-text">
            {WORLD_NAME[world] === 'Moon' ? 'The Moon' : WORLD_NAME[world]}
          </h2>
          <p className="mt-4 max-w-[58ch] text-[17px] leading-7 text-text">
            {page.lead.text}
            {cite(page.lead.src)}
          </p>
          {world !== 'earth' && (
            <button type="button" onClick={onFind} className="btn btn-primary mt-5">
              Find an analog for a place on {world === 'moon' ? 'the Moon' : 'Mars'}
            </button>
          )}
        </div>
        <figure className="m-0">
          <div className="aspect-[2/1] overflow-hidden border border-line bg-bg">
            <img src={`${import.meta.env.BASE_URL}textures/${page.image.file}`} alt={page.image.alt} className="h-full w-full object-cover" />
          </div>
          <figcaption className="readout mt-1.5">
            {page.image.credit}. Equirectangular, longitude −180° to 180°. <SourceBadge badge="Mission" source={page.image.credit} />
          </figcaption>
        </figure>
      </header>

      <div className="grid border-b border-line lg:grid-cols-2">
        <section className="border-b border-line px-4 py-8 sm:px-6 lg:border-b-0 lg:border-r" aria-labelledby="h-facts">
          <h3 id="h-facts" className="text-[14px] font-semibold text-text">
            Key facts
          </h3>
          <dl className="kv mt-3 max-w-[520px]">
            {page.facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>
                  {f.value}
                  {cite([f.src])}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="px-4 py-8 sm:px-6" aria-labelledby="h-history">
          <h3 id="h-history" className="text-[14px] font-semibold text-text">
            {page.historyTitle}
          </h3>
          <ol className="mt-3 max-w-[60ch]">
            {page.history.map((h) => (
              <li key={h.when + h.what} className="grid grid-cols-[124px_1fr] gap-x-4 border-b border-line py-2.5 last:border-b-0">
                <span className="num text-[12px] text-muted">{h.when}</span>
                <span className="text-[13px] leading-5 text-text">
                  {h.what}
                  {cite([h.src])}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="border-b border-line px-4 py-8 sm:px-6" aria-labelledby="h-why">
        <h3 id="h-why" className="text-[14px] font-semibold text-text">
          Why it matters for analogs
        </h3>
        <div className="mt-3 grid max-w-[1100px] gap-x-8 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
          {page.why.map((w) => (
            <p key={w.text} className="border-t border-line pt-3 text-[13px] leading-5 text-text">
              {w.text}
              {cite(w.src)}
            </p>
          ))}
        </div>
      </section>

      {here.length > 0 && (
        <section className="border-b border-line px-4 py-8 sm:px-6" aria-labelledby="h-places">
          <h3 id="h-places" className="text-[14px] font-semibold text-text">
            Base sites on {world === 'moon' ? 'the Moon' : 'Mars'} in the data · {here.length}
          </h3>
          <ul className="mt-3 max-w-[720px] border-t border-line">
            {here.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => onPlace(t.id)} className="row w-full">
                  <span className="min-w-0 flex-1 text-[14px]">{t.name}</span>
                  <span className="num text-[11px] text-muted">{formatCoords(t.lat, t.lon)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="px-4 py-8 sm:px-6" aria-labelledby="h-wsources">
        <h3 id="h-wsources" className="text-[14px] font-semibold text-text">
          Sources
        </h3>
        <ol className="mt-3 max-w-[820px] space-y-1.5">
          {used.map((id, i) => {
            const s = WORLD_SOURCES.find((x) => x.id === id);
            if (!s) return null;
            return (
              <li key={id} className="grid grid-cols-[36px_1fr] text-[12px] leading-[18px] text-text">
                <span className="num text-muted">[{i + 1}]</span>
                <span>
                  {s.publisher}. {s.title}.{' '}
                  <a href={s.url} target="_blank" rel="noreferrer" className="break-all underline decoration-line underline-offset-2">
                    {s.url}
                  </a>
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[11px] text-muted">All pages read on {WORLD_SOURCES_ACCESSED}. The text is written for this project; the numbers and dates are as printed in the sources.</p>
      </section>
    </main>
  );
}

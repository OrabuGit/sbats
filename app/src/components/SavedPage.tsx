import { X } from 'lucide-react';
import type { SavedLocation } from '../lib/saved';
import { formatCoords } from '../lib/geo';

interface Props {
  saved: SavedLocation[];
  onOpen: (s: SavedLocation) => void;
  onRemove: (id: string) => void;
  onFind: () => void;
}

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

function Row({ s, onOpen, onRemove }: { s: SavedLocation; onOpen: () => void; onRemove: () => void }) {
  const base = s.kind === 'base';
  return (
    <li className="flex items-stretch border-b border-line">
      <button type="button" onClick={onOpen} className="flex min-h-16 flex-1 items-center gap-5 py-3 text-left hover:text-accent">
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] text-text">{s.name}</span>
          <span className="mt-0.5 block text-[13px] text-muted">
            {base ? `${s.moduleCount ?? 0} modules at ` : ''}
            <span className="num">{formatCoords(s.lat, s.lon)}</span> · {base ? 'tested against' : 'for'} {s.targetName} · {when(s.savedAt)}
          </span>
        </span>
        {!base &&
          (s.comparable === false ? (
            <span className="max-w-[140px] text-right text-[12px] text-muted" title="This target has no temperature value, so its scores run high and cannot be set beside the others.">
              <span className="num">{s.score === null ? 'no data' : s.score.toFixed(0)}</span>, not comparable
            </span>
          ) : (
            <span className={`num ${s.score === null ? 'text-[12px] text-muted' : 'display text-[26px] text-text'}`}>{s.score === null ? 'no data' : s.score.toFixed(0)}</span>
          ))}
      </button>
      <button type="button" onClick={onRemove} aria-label={`Remove ${s.name}`} className="tool !px-3">
        <X size={15} aria-hidden="true" />
      </button>
    </li>
  );
}

/** Everything the user saved in this browser: matches and base layouts. Nothing is sent anywhere. */
export function SavedPage({ saved, onOpen, onRemove, onFind }: Props) {
  const matches = saved.filter((s) => s.kind !== 'base');
  const bases = saved.filter((s) => s.kind === 'base');
  const group = (title: string, list: SavedLocation[], empty: string) => (
    <section className="mt-14" aria-label={title}>
      <h2 className="display text-[24px] text-text">{title}</h2>
      {list.length === 0 ? (
        <p className="mt-3 text-[15px] text-muted">{empty}</p>
      ) : (
        <ul className="mt-4 border-t border-line">
          {list.map((s) => (
            <Row key={s.id} s={s} onOpen={() => onOpen(s)} onRemove={() => onRemove(s.id)} />
          ))}
        </ul>
      )}
    </section>
  );
  return (
    <main className="scroll min-h-0 flex-1 bg-bg px-5 pb-24 pt-10 sm:px-10 lg:px-16" aria-labelledby="h-saved">
      <div className="mx-0 max-w-[860px]">
        <h1 id="h-saved" className="display-l text-[40px] sm:text-[56px]">
          Saved
        </h1>
        <p className="mt-3 max-w-[56ch] text-[15px] leading-6 text-muted">Kept in this browser only. Nothing is sent to a server, and clearing the site&rsquo;s data removes it.</p>
        {group('Matches', matches, 'No saved matches. Open a match and press Save.')}
        {group('Bases', bases, 'No saved bases. Place a base, then press Save base.')}
        {saved.length === 0 && (
          <button type="button" onClick={onFind} className="btn btn-primary mt-12 !px-6">
            Find an analog
          </button>
        )}
      </div>
    </main>
  );
}

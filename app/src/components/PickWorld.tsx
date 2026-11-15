import { Worlds, type WorldId } from './Worlds';

/** Step 1: an empty page, one question at the top, and the two worlds. Picking one goes straight on. */
export function PickWorld({ moonPlaces, marsPlaces, onPick }: { moonPlaces: number; marsPlaces: number; onPick: (w: WorldId) => void }) {
  return (
    <main className="flex min-h-0 flex-1 flex-col bg-bg" aria-labelledby="h-world">
      <header className="px-5 pb-2 pt-6 sm:px-10 lg:px-16">
        <h1 id="h-world" className="display-l text-[36px] sm:text-[56px]">
          Pick a world
        </h1>
        <p className="mt-2 max-w-[50ch] text-[16px] leading-6 text-muted">Where is the base? Pick the Moon or Mars, then the place on it.</p>
      </header>
      <div className="min-h-0 flex-1">
        <Worlds
          tall
          worlds={['moon', 'mars']}
          caption={(w) => `${w === 'moon' ? moonPlaces : marsPlaces} places`}
          action={(w) => `Pick ${w === 'moon' ? 'the Moon' : 'Mars'}`}
          onPick={onPick}
        />
      </div>
    </main>
  );
}

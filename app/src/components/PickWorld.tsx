import { SlidersHorizontal } from 'lucide-react';
import { Suspense, lazy } from 'react';
import type { WorldId } from './worldInfo';

const Worlds = lazy(() => import('./Worlds').then((m) => ({ default: m.Worlds })));

/** Step 1: an empty page, one question at the top, and the two worlds. Picking one goes straight on. */
export function PickWorld({ moonPlaces, marsPlaces, onPick, onCustom }: { moonPlaces: number; marsPlaces: number; onPick: (w: WorldId) => void; onCustom: () => void }) {
  return (
    <main className="flex min-h-0 flex-1 flex-col bg-bg" aria-labelledby="h-world">
      <header className="px-5 pb-2 pt-6 sm:px-10 lg:px-16">
        <h1 id="h-world" className="display-l text-[36px] sm:text-[56px]">
          Pick a world
        </h1>
        <p className="mt-2 max-w-[50ch] text-[16px] leading-6 text-muted">Where is the base? Pick the Moon or Mars, then the place on it.</p>
      </header>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-h-0">
          <Suspense
            fallback={
              <div className="grid h-full min-h-[320px] grid-cols-2 items-end">
                {(['moon', 'mars'] as const).map((w) => (
                  <button key={w} type="button" onClick={() => onPick(w)} aria-label={`Pick ${w === 'moon' ? 'the Moon' : 'Mars'}`} className="px-4 pb-4 text-left">
                    <span className="block border-l-2 border-line pl-2.5 text-[17px] font-semibold text-text">{w === 'moon' ? 'Moon' : 'Mars'}</span>
                  </button>
                ))}
              </div>
            }
          >
            <Worlds
              tall
              worlds={['moon', 'mars']}
              caption={(w) => `${w === 'moon' ? moonPlaces : marsPlaces} places`}
              action={(w) => `Pick ${w === 'moon' ? 'the Moon' : 'Mars'}`}
              onPick={onPick}
            />
          </Suspense>
        </div>
        <div className="flex items-center px-5 pb-8 sm:px-10 lg:px-4 lg:pb-0 lg:pr-12">
          <button type="button" onClick={onCustom} className="group flex w-full flex-col items-start gap-3 border-t-2 border-line pt-4 text-left transition-colors hover:border-accent">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-line text-muted transition-colors group-hover:border-accent group-hover:text-accent">
              <SlidersHorizontal size={26} aria-hidden="true" />
            </span>
            <span>
              <span className="display block text-[22px] leading-6 text-text">Custom</span>
              <span className="mt-1 block text-[13px] leading-5 text-muted">Set the ground and climate yourself, then search Earth. Advanced and exploratory.</span>
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}

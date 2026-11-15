import { Bookmark, BookOpen, MapPin, Play, Square } from 'lucide-react';
import { flags } from '../flags';
import { Logo } from './Logo';

export type Step = 1 | 2 | 3 | 4;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'World' },
  { n: 2, label: 'Place' },
  { n: 3, label: 'Matches' },
  { n: 4, label: 'Match' },
];

const NAV = 'inline-flex min-h-11 whitespace-nowrap items-center gap-2 px-2.5 text-[14px] font-medium transition-colors sm:px-3.5 sm:text-[15px]';

/** The right-hand navigation, the same on every page. Text only: no bar, no border. */
export function NavRight({
  featuredOpen,
  onFeatured,
  methodOpen,
  onMethod,
  savedCount,
  savedOpen,
  onSaved,
  demoRunning,
  demoLabel,
  onDemo,
}: {
  featuredOpen: boolean;
  onFeatured: () => void;
  methodOpen: boolean;
  onMethod: () => void;
  savedCount: number;
  savedOpen: boolean;
  onSaved: () => void;
  demoRunning: boolean;
  demoLabel: string | null;
  onDemo: () => void;
}) {
  const tone = (on: boolean) => (on ? 'text-text' : 'text-text/70 hover:text-text');
  return (
    <nav aria-label="Main" className="flex items-center">
      {demoLabel && <span className="mr-3 hidden max-w-[240px] truncate text-[12px] text-muted xl:inline">{demoLabel}</span>}
      <button type="button" onClick={onFeatured} aria-pressed={featuredOpen} aria-label="Featured sites" className={`${NAV} ${tone(featuredOpen)}`}>
        <MapPin size={15} aria-hidden="true" className="sm:hidden" />
        <span className="hidden sm:inline">Featured sites</span>
      </button>
      {flags.methodPage && (
        <button type="button" onClick={onMethod} aria-pressed={methodOpen} aria-label="Method" className={`${NAV} ${tone(methodOpen)}`}>
          <BookOpen size={15} aria-hidden="true" className="sm:hidden" />
          <span className="hidden sm:inline">Method</span>
        </button>
      )}
      <button type="button" onClick={onSaved} aria-pressed={savedOpen} aria-label={`Saved, ${savedCount}`} className={`${NAV} ${tone(savedOpen)}`}>
        <Bookmark size={15} aria-hidden="true" />
        <span className="hidden sm:inline">Saved</span>
        {savedCount > 0 && <span className="num text-[12px] text-accent">{savedCount}</span>}
      </button>
      <button type="button" onClick={onDemo} aria-pressed={demoRunning} aria-label={demoRunning ? 'Stop demo' : 'Run demo'} className={`${NAV} ${tone(demoRunning)}`}>
        {demoRunning ? <Square size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
        <span className="hidden lg:inline">{demoRunning ? 'Stop demo' : 'Run demo'}</span>
      </button>
    </nav>
  );
}

export function TopBar({
  step,
  onStep,
  canMatch,
  onHome,
  ...right
}: {
  /** The current step, or null on a page outside the steps. */
  step: Step | null;
  onStep: (s: Step) => void;
  /** True once a match is open, so step 4 can be returned to. */
  canMatch: boolean;
  onHome: () => void;
} & Parameters<typeof NavRight>[0]) {
  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-3 bg-bg px-3 sm:px-8">
      <button type="button" onClick={onHome} aria-label="SBATS, home" className="flex min-h-11 items-center">
        <Logo height={26} />
      </button>
      {step !== null && (
        <nav aria-label="Steps" className="mr-auto hidden items-center md:ml-2 md:flex xl:absolute xl:left-1/2 xl:m-0 xl:-translate-x-1/2">
          <ol className="flex items-center gap-1">
            {STEPS.map(({ n, label }) => {
              const locked = n === 4 && !canMatch;
              const active = step === n;
              return (
                <li key={n}>
                  <button
                    type="button"
                    aria-current={active ? 'step' : undefined}
                    aria-disabled={locked || undefined}
                    title={locked ? 'Open a match from the list first' : undefined}
                    onClick={() => !locked && onStep(n)}
                    className={`inline-flex min-h-11 items-center border-b-2 px-2 text-[14px] font-medium lg:px-3 ${
                      active ? 'border-accent text-text' : locked ? 'border-transparent text-text/25' : 'border-transparent text-text/60 hover:text-text'
                    }`}
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <NavRight {...right} />
    </header>
  );
}

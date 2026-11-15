import { flags } from '../flags';
import { Logo } from './Logo';

export type Step = 1 | 2 | 3 | 4;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'World' },
  { n: 2, label: 'Place' },
  { n: 3, label: 'Matches' },
  { n: 4, label: 'Match' },
];

const NAV = 'inline-flex min-h-11 whitespace-nowrap items-center gap-2 px-2.5 text-[14px] font-medium transition-colors lg:px-3 xl:text-[15px]';

export interface NavProps {
  /** Goes to the landing page. */
  onHome?: () => void;
  homeOpen?: boolean;
  onFind?: () => void;
  findOpen?: boolean;
  featuredOpen: boolean;
  onFeatured: () => void;
  onExplore?: () => void;
  exploreOpen?: boolean;
  onCustom?: () => void;
  customOpen?: boolean;
  validationOpen?: boolean;
  onValidation?: () => void;
  methodOpen: boolean;
  onMethod: () => void;
  learnOpen: boolean;
  onLearn: () => void;
  /** Replays the guided tour. */
  onTour?: () => void;
  savedCount: number;
  savedOpen: boolean;
  onSaved: () => void;
  demoRunning: boolean;
  demoLabel: string | null;
  onDemo: () => void;
}

/**
 * The navigation, the same on every page. Every place a person may want is a word in this row: nothing waits
 * behind an icon or a menu. Below 1280 px it is its own row under the logo and scrolls sideways if it must.
 */
export function NavRight(p: NavProps) {
  const tone = (on: boolean) => (on ? 'text-text' : 'text-text/70 hover:text-text');
  const items: { label: string; on: boolean; go?: () => void; extra?: React.ReactNode }[] = [
    { label: 'Home', on: !!p.homeOpen, go: p.onHome },
    { label: 'Find analog', on: !!p.findOpen, go: p.onFind },
    { label: 'Featured sites', on: p.featuredOpen, go: p.onFeatured },
    { label: 'Explore data', on: !!p.exploreOpen, go: p.onExplore },
    { label: 'Custom conditions', on: !!p.customOpen, go: p.onCustom },
    { label: 'Validation', on: !!p.validationOpen, go: p.onValidation },
    ...(flags.methodPage ? [{ label: 'Method', on: p.methodOpen, go: p.onMethod }] : []),
    { label: 'Learn', on: p.learnOpen, go: p.onLearn },
    { label: 'Tour', on: false, go: p.onTour },
    { label: 'Saved', on: p.savedOpen, go: p.onSaved, extra: p.savedCount > 0 ? <span className="num text-[12px] text-accent">{p.savedCount}</span> : null },
  ];
  return (
    <nav aria-label="Main" className="-mx-1 flex min-w-0 items-center overflow-x-auto xl:mx-0 xl:overflow-visible">
      {p.demoLabel && <span className="mr-3 hidden max-w-[240px] truncate text-[12px] text-muted xl:inline">{p.demoLabel}</span>}
      {items
        .filter((i) => i.go)
        .map((i) => (
          <button key={i.label} type="button" onClick={i.go} aria-pressed={i.on} className={`${NAV} ${tone(i.on)}`}>
            {i.label}
            {i.extra}
          </button>
        ))}
      {flags.demoButton && (
        <button type="button" onClick={p.onDemo} aria-pressed={p.demoRunning} className={`${NAV} ${tone(p.demoRunning)}`}>
          {p.demoRunning ? 'Stop demo' : 'Run demo'}
        </button>
      )}
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
} & NavProps) {
  return (
    <header className="sticky top-0 z-30 flex shrink-0 flex-wrap items-center justify-between gap-x-3 bg-bg px-3 sm:px-8">
      <button type="button" onClick={onHome} aria-label="SBATS, home" className="flex h-14 items-center">
        <Logo height={26} />
      </button>
      <div className="order-3 w-full min-w-0 xl:order-2 xl:w-auto">
        <NavRight {...right} onHome={onHome} />
      </div>
      {step !== null && (
        <nav aria-label="Steps" className="order-4 hidden w-full items-center md:flex">
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
                    className={`inline-flex min-h-10 items-center border-b-2 px-3 text-[14px] font-medium ${
                      active ? 'border-accent text-text' : locked ? 'border-transparent text-text/25' : 'border-transparent text-text/60 hover:text-text'
                    }`}
                  >
                    {n}. {label}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      )}
    </header>
  );
}

import { BookOpen, MapPin, Play, Square } from 'lucide-react';
import { flags } from '../flags';
import { Wordmark } from './Wordmark';

export type Step = 1 | 2 | 3 | 4;

interface TopBarProps {
  /** The current step, or null on a page outside the steps (home, reference pages). */
  step: Step | null;
  onStep: (s: Step) => void;
  /** True once a match is open, so step 4 can be returned to. */
  canMatch: boolean;
  onHome: () => void;
  featuredOpen: boolean;
  onFeatured: () => void;
  demoRunning: boolean;
  /** What the demo is showing now, or null. */
  demoLabel: string | null;
  onDemo: () => void;
  /** True while a reference page (Method, Validation, Sites) is open. */
  methodOpen: boolean;
  onMethod: () => void;
}

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'World' },
  { n: 2, label: 'Place' },
  { n: 3, label: 'Matches' },
  { n: 4, label: 'Match' },
];

export function TopBar({ step, onStep, canMatch, onHome, featuredOpen, onFeatured, demoRunning, demoLabel, onDemo, methodOpen, onMethod }: TopBarProps) {
  return (
    <header className="flex h-12 shrink-0 items-stretch border-b border-line bg-panel">
      <h1 className="flex items-stretch border-r border-line">
        <button type="button" onClick={onHome} aria-label="SBATS-26, home" className="flex items-center px-3 hover:bg-bg sm:px-4">
          <Wordmark size={18} suffix={false} />
        </button>
      </h1>
      <nav aria-label="Steps" className="flex min-w-0 flex-1 items-stretch">
        <ol className="flex items-stretch">
          {STEPS.map(({ n, label }) => {
            const locked = n === 4 && !canMatch;
            const active = step === n;
            return (
              <li key={n} className="flex items-stretch">
                <button
                  type="button"
                  aria-current={active ? 'step' : undefined}
                  aria-disabled={locked || undefined}
                  title={locked ? 'Open a match from the list first' : undefined}
                  onClick={() => !locked && onStep(n)}
                  className={`flex min-w-10 items-center justify-center gap-2 border-b-2 px-2 pt-0.5 sm:min-w-11 sm:px-4 ${
                    active ? 'border-accent text-text' : locked ? 'border-transparent text-line' : 'border-transparent text-muted hover:text-text'
                  }`}
                >
                  <span className={`num text-[11px] ${active ? 'text-accent' : ''}`}>0{n}</span>
                  <span className="hidden text-[13px] font-medium md:inline">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <button type="button" onClick={onFeatured} aria-pressed={featuredOpen} aria-label="Featured sites" className={`tool hidden border-b-2 pt-0.5 !px-3 sm:inline-flex ${featuredOpen ? 'border-accent !text-text' : 'border-transparent'}`}>
        <MapPin size={14} aria-hidden="true" />
        <span className="hidden lg:inline">Featured sites</span>
      </button>
      {flags.methodPage && (
        <button type="button" onClick={onMethod} aria-pressed={methodOpen} aria-label="Method and validation" className={`tool border-b-2 pt-0.5 !px-3 ${methodOpen ? 'border-accent !text-text' : 'border-transparent'}`}>
          <BookOpen size={14} aria-hidden="true" />
          <span className="hidden lg:inline">Method</span>
        </button>
      )}
      {demoLabel && <span className="mr-3 hidden max-w-[240px] items-center truncate text-[12px] text-muted lg:flex">{demoLabel}</span>}
      <button type="button" onClick={onDemo} aria-pressed={demoRunning} aria-label={demoRunning ? 'Stop demo' : 'Run demo'} className="btn btn-primary h-full min-w-11 !rounded-none !px-3 sm:!px-4">
        {demoRunning ? <Square size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
        <span className="hidden whitespace-nowrap sm:inline">{demoRunning ? 'Stop demo' : 'Run demo'}</span>
      </button>
    </header>
  );
}

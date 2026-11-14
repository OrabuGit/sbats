import { BookOpen, Play, Square } from 'lucide-react';
import { flags } from '../flags';

export type Step = 1 | 2 | 3;

interface TopBarProps {
  step: Step;
  onStep: (s: Step) => void;
  demoRunning: boolean;
  onDemo: () => void;
  /** True while the Method page is open. */
  methodOpen: boolean;
  onMethod: () => void;
  /** True while step 3 cannot be opened. */
  reconLocked: boolean;
}

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'Pick target' },
  { n: 2, label: 'Find analog' },
  { n: 3, label: 'Build base' },
];

export function TopBar({ step, onStep, demoRunning, onDemo, methodOpen, onMethod, reconLocked }: TopBarProps) {
  return (
    <header className="flex h-12 shrink-0 items-stretch border-b border-line bg-panel">
      <div className="flex items-center gap-2 border-r border-line px-3 sm:px-4">
        <span className="block h-3 w-3 bg-accent" aria-hidden="true" />
        <h1 className="num text-[14px] font-semibold tracking-[0.08em] text-text">SBATS-26</h1>
      </div>
      <nav aria-label="Steps" className="flex min-w-0 flex-1 items-stretch">
        <ol className="flex items-stretch">
          {STEPS.map(({ n, label }) => {
            const locked = n === 3 && reconLocked;
            const active = step === n && !methodOpen;
            return (
              <li key={n} className="flex items-stretch border-r border-line">
                <button
                  type="button"
                  aria-current={active ? 'step' : undefined}
                  aria-disabled={locked || undefined}
                  title={locked ? 'The base sandbox is not available yet' : undefined}
                  onClick={() => !locked && onStep(n)}
                  className={`flex min-w-11 items-center gap-2 px-3 sm:px-4 ${
                    active ? 'bg-bg text-accent' : locked ? 'text-muted' : 'text-text hover:bg-bg'
                  }`}
                >
                  <span className={`num text-[12px] font-semibold ${active ? 'text-accent' : 'text-muted'}`}>0{n}</span>
                  <span className="label hidden !text-inherit md:inline">{label}</span>
                  {locked && <span className="label hidden text-[10px] lg:inline">soon</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      {flags.methodPage && (
        <button
          type="button"
          onClick={onMethod}
          aria-pressed={methodOpen}
          aria-label="Method and validation"
          className={`label flex min-w-11 items-center justify-center gap-2 border-l border-line px-3 sm:px-4 ${
            methodOpen ? 'bg-bg !text-accent' : '!text-text hover:bg-bg'
          }`}
        >
          <BookOpen size={14} aria-hidden="true" />
          <span className="hidden sm:inline">Method</span>
        </button>
      )}
      <button
        type="button"
        onClick={onDemo}
        aria-pressed={demoRunning}
        aria-label={demoRunning ? 'Stop demo' : 'Run demo'}
        className="label flex min-w-11 items-center justify-center gap-2 bg-accent px-3 font-semibold !text-bg hover:bg-text sm:px-4"
      >
        {demoRunning ? <Square size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
        <span className="hidden whitespace-nowrap sm:inline">{demoRunning ? 'Stop demo' : 'Run demo'}</span>
      </button>
    </header>
  );
}

interface StatusProps {
  coords: string | null;
  code: string | null;
  cells: number;
  resolutionDeg: number;
  fixtureFiles: string[];
  view: string;
  status: string;
}

export function StatusStrip({ coords, code, cells, resolutionDeg, fixtureFiles, view, status }: StatusProps) {
  const cellText = `${cells.toLocaleString('en-US')} cells at ${resolutionDeg}°`;
  return (
    <footer className="num flex min-h-8 shrink-0 flex-wrap items-center gap-x-5 gap-y-0.5 border-t border-line bg-panel px-3 py-1 text-[11px] uppercase tracking-wider text-muted sm:px-4">
      <span>View {view}</span>
      <span className="text-text">{coords ?? 'No site selected'}</span>
      {code && <span className="text-text">{code}</span>}
      <span>{cellText}</span>
      {fixtureFiles.length > 0 && (
        <span className="text-accent" title="These files are synthetic fixtures from app/src/mocks, not real data.">
          Fixture data, not real: {fixtureFiles.join(', ')}
        </span>
      )}
      <span className="ml-auto text-text" role="status" aria-live="polite">
        {status}
      </span>
    </footer>
  );
}

import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';

/** One sentence per step. The app moves to the screen each sentence is about. */
export const TOUR_STEPS = [
  { title: 'What SBATS does', text: 'SBATS scores every land square on Earth by how well it stands in for a base on the Moon or Mars.' },
  { title: 'Pick a place', text: 'Choose a landing site on the Moon or Mars. Here it is Shackleton rim, near the lunar south pole.' },
  { title: 'See where on Earth', text: 'Every Earth square is scored against it in your browser. The brightest ones are the closest.' },
  { title: 'Open a match', text: 'Tambora, a volcano in Indonesia, against Shackleton rim. The tabs at the top jump between the parts of a match.' },
  { title: 'Read the score', text: 'Each ring is one thing compared. The weakest ring holds the whole score down.' },
  { title: 'Full data', text: 'Every measurement with both values, units, difference, similarity and source, then the charts behind them.' },
  { title: 'What to test here', text: 'Seven kinds of testing, each marked Ready, Partial, Not suited or Not assessed from our data.' },
  { title: '3D terrain', text: 'Both places as live 3D terrain at one scale. Open it to change the surface, add contours and set the sun.' },
  { title: 'Plan a rover route', text: 'In the 3D view a rover drives an example route. Draw your own, and see where the slopes block it.' },
  { title: 'That is the tour', text: 'Pick any place and try it. You can replay this tour from the Tour button in the top bar.' },
] as const;

/**
 * A small card, not a dialog: the page behind stays usable. Next, Back and Skip are real buttons and the
 * card announces each step politely.
 */
export function GuidedTour({ step, onStep, onClose }: { step: number; onStep: (n: number) => void; onClose: () => void }) {
  const last = step === TOUR_STEPS.length - 1;
  const next = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    next.current?.focus({ preventScroll: true });
  }, [step]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [onClose]);
  const s = TOUR_STEPS[step];
  return (
    <section aria-label="Guided tour" className="fixed inset-x-3 bottom-3 z-50 max-w-[calc(100vw-1.5rem)] overflow-hidden border border-line bg-panel p-4 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[360px]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] text-muted">
          Step {step + 1} of {TOUR_STEPS.length}
        </p>
        <button type="button" onClick={onClose} className="tool !min-h-8 !px-2" aria-label="Skip the tour">
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <div aria-live="polite">
        <h2 className="display mt-1 text-[20px] leading-6 text-text">{s.title}</h2>
        <p className="mt-1.5 text-[14px] leading-[22px] text-text">{s.text}</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
        <div className="flex gap-1" aria-hidden="true">
          {TOUR_STEPS.map((_, i) => (
            <span key={i} className={`h-1 w-3 ${i === step ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {step > 0 && (
            <button type="button" onClick={() => onStep(step - 1)} className="btn !px-3">
              <ArrowLeft size={14} aria-hidden="true" /> Back
            </button>
          )}
          <button ref={next} type="button" onClick={() => (last ? onClose() : onStep(step + 1))} className="btn btn-primary !px-4">
            {last ? 'Done' : 'Next'} {!last && <ArrowRight size={14} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {!last && (
        <button type="button" onClick={onClose} className="link-rule mt-3 text-[13px] text-muted">
          Skip the tour
        </button>
      )}
    </section>
  );
}

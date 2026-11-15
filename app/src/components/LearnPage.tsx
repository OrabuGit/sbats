import type { WorldId } from './Worlds';

/** Placeholder: filled in by the Learn page work. */
export function LearnPage({ onFind }: { onFind: () => void; onWorld: (w: WorldId) => void }) {
  return (
    <main className="scroll min-h-0 flex-1 bg-bg px-5 py-16 sm:px-10" aria-labelledby="h-learn">
      <h1 id="h-learn" className="display-l text-[48px]">Learn</h1>
      <button type="button" onClick={onFind} className="btn mt-6">Find an analog</button>
    </main>
  );
}

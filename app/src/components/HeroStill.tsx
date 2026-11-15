/** What the hero shows while the 3D globes are still arriving: three quiet discs where the worlds will be, and the same text and buttons. */
export function HeroStill({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative h-full min-h-[340px] w-full overflow-hidden bg-bg">
      <div className="absolute inset-0 flex items-center justify-center gap-5 px-4 pt-28 sm:gap-10" aria-hidden="true">
        {[
          ['mars', 'h-24 w-24 sm:h-36 sm:w-36'],
          ['earth', 'h-32 w-32 sm:h-52 sm:w-52'],
          ['moon', 'h-20 w-20 sm:h-28 sm:w-28'],
        ].map(([w, size]) => (
          <span key={w} className={`block rounded-full bg-panel opacity-40 ${size}`} />
        ))}
      </div>
      {children}
    </div>
  );
}

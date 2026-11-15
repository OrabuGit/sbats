import { Reveal } from './HomeStory';

// Building blocks of the Method page: same look as the home page (display type, one hairline between sections, few boxes).

export const WIDTH = 'max-w-[1320px]';

/** One chapter of the Method page. A small label, a display heading, one lead sentence, then the graphic. */
export function MSection({
  id,
  kicker,
  title,
  lead,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  lead?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="border-t border-line px-4 py-12 sm:px-6 sm:py-16">
      <div className={WIDTH}>
        <Reveal>
          <p className="label">{kicker}</p>
          <h3 id={id} className="display-l mt-2 max-w-[24ch] text-[28px] text-text sm:text-[38px]">
            {title}
          </h3>
          {lead && <p className="mt-4 max-w-[62ch] text-[16px] leading-6 text-text">{lead}</p>}
        </Reveal>
        <div className="mt-8 sm:mt-10">{children}</div>
      </div>
    </section>
  );
}

/** A named rule with its value in large mono numbers. No box: a hairline above is enough. */
export function MRule({ name, value, children }: { name: string; value: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line pt-3">
      <p className="label">{name}</p>
      <p className="num mt-1 text-[26px] font-medium leading-8 text-text">{value}</p>
      <p className="mt-2 text-[13px] leading-5 text-muted">{children}</p>
    </div>
  );
}

/** A formula in mono on a flat panel strip. */
export const MFormula = ({ children }: { children: React.ReactNode }) => (
  <p className="num block w-fit max-w-full overflow-x-auto bg-panel px-4 py-3 text-[13px] text-text">{children}</p>
);

/** Reference material that is long (tables, glossary): a real details element with a 44 px summary. */
export function MDetails({ id, title, count, open, children }: { id?: string; title: string; count?: number | string; open?: boolean; children: React.ReactNode }) {
  return (
    <details id={id} open={open} className="group border-t border-line">
      <summary className="label flex min-h-11 cursor-pointer items-center justify-between gap-4 !text-text hover:text-accent">
        <span>{title}</span>
        {count !== undefined && <span className="num text-muted">{count}</span>}
      </summary>
      <div className="pb-6 pt-2">{children}</div>
    </details>
  );
}

/** A toggle in the Method graphics. A real button; amber when on. */
export function MChip({
  on,
  onClick,
  children,
  className = '',
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-11 border px-3 text-left text-[13px] ${on ? 'border-accent text-accent' : 'border-line text-text hover:border-muted'} ${className}`}
    >
      {children}
    </button>
  );
}

/** Two-decimal similarity, one way everywhere. */
export const s2 = (v: number) => v.toFixed(2);
export const pct = (v: number) => `${Math.round(v * 100)}%`;

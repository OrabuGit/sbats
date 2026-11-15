import { Reveal } from './HomeStory';

export interface BarItem {
  label: string;
  /** Bar length as a share of the scale, 0 to 1. */
  share: number;
  text: string;
  note?: string;
}

/** A plain list of horizontal bars that grow in once. Every length is a real number from the data or the lookup table. */
export function MethodBars({ items, label }: { items: BarItem[]; label: string }) {
  return (
    <ul className="space-y-4" aria-label={label}>
      {items.map((b, i) => (
        <li key={b.label}>
          <Reveal i={i}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[14px] font-medium text-text">{b.label}</span>
              <span className="num text-[14px] text-text">{b.text}</span>
            </div>
            <div className="mt-2 h-[8px] bg-line" aria-hidden="true">
              <div className="bar-grow h-full w-full bg-accent" style={{ ['--to' as string]: Math.max(0, Math.min(1, b.share)), ['--i' as string]: i }} />
            </div>
            {b.note && <p className="mt-1 text-[12px] text-muted">{b.note}</p>}
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

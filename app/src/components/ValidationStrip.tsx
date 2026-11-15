import { Mark, useSeen, type MarkKind } from './ValidationParts';

/** One dot on a 0 to 100 percentile axis. */
export interface StripItem {
  key: string;
  kind: MarkKind;
  /** 0 to 100: the share of Earth cells the site scores above or ties. */
  pct: number;
  /** Read by screen readers and shown on hover. */
  title: string;
}

export interface StripRowData {
  id: string;
  label: string;
  sub?: string;
  items: StripItem[];
  /** Short text at the end of the row, for example the mean. */
  end?: string;
}

const LANE = 15;
const CLOSE = 3.4;

/** Stacks dots that would overlap into lanes, so none hides another. */
function lanes(items: StripItem[]): { item: StripItem; lane: number }[] {
  const ends: number[] = [];
  return [...items]
    .sort((a, b) => a.pct - b.pct)
    .map((item) => {
      let lane = ends.findIndex((x) => item.pct - x >= CLOSE);
      if (lane < 0) lane = ends.length;
      ends[lane] = item.pct;
      return { item, lane };
    });
}

const COLOR: Record<MarkKind, string> = { holdout: 'text-accent', tuning: 'text-text', negative: 'text-muted', other: 'text-muted' };

export function StripLegend({ kinds }: { kinds: { kind: MarkKind; text: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted" aria-label="Legend">
      {kinds.map((k) => (
        <li key={k.kind} className="flex items-center gap-2">
          <Mark kind={k.kind} className={COLOR[k.kind]} />
          {k.text}
        </li>
      ))}
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="block h-3.5 w-0 border-l border-dashed border-text" />
        Chance, 50
      </li>
    </ul>
  );
}

/** The axis under a stack of rows. The first and last column match the rows' layout. */
export function StripAxis() {
  return (
    <div className="grid sm:grid-cols-[170px_minmax(0,1fr)_64px] sm:gap-x-4" aria-hidden="true">
      <span className="hidden sm:block" />
      <div className="relative mx-[6px] h-5 text-[11px] text-muted">
        {[0, 25, 50, 75, 100].map((t) => (
          <span key={t} className="num absolute top-0 -translate-x-1/2" style={{ left: `${t}%` }}>
            {t}
            {t === 0 ? ' worse' : t === 100 ? ' better' : ''}
          </span>
        ))}
      </div>
      <span className="hidden sm:block" />
    </div>
  );
}

/** Rows of dots on the percentile axis. Dots settle into place once the chart is on screen. */
export function PercentileStrips({ rows, label }: { rows: StripRowData[]; label: string }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  let n = 0;
  return (
    <div ref={ref} role="img" aria-label={label}>
      {rows.map((row) => {
        const placed = lanes(row.items);
        const depth = Math.max(1, ...placed.map((p) => p.lane + 1));
        return (
          <div key={row.id} className="grid items-center gap-x-4 border-t border-line py-3 sm:grid-cols-[170px_minmax(0,1fr)_64px]">
            <div className="flex items-baseline justify-between gap-3 sm:block">
              <p className="text-[14px] font-medium text-text">{row.label}</p>
              {row.sub && <p className="num text-[12px] text-muted">{row.sub}</p>}
              <p className="num text-[13px] text-text sm:hidden">{row.end}</p>
            </div>
            <div className="relative mx-[6px] mt-2 sm:mt-0" style={{ height: depth * LANE + 6 }}>
              {[0, 25, 75, 100].map((t) => (
                <span key={t} className="absolute inset-y-0 w-px bg-line" style={{ left: `${t}%` }} aria-hidden="true" />
              ))}
              <span className="absolute inset-y-0 border-l border-dashed border-text opacity-60" style={{ left: '50%' }} aria-hidden="true" />
              {placed.map(({ item, lane }) => {
                const d = (n++ % 12) * 35;
                return (
                  <span
                    key={item.key}
                    title={item.title}
                    className={`absolute ${COLOR[item.kind]}`}
                    style={{
                      left: `${item.pct}%`,
                      top: 3 + lane * LANE,
                      marginLeft: -6,
                      opacity: seen ? 1 : 0,
                      transform: seen ? 'none' : 'translateY(10px)',
                      transition: `opacity 500ms ease-out ${d}ms, transform 600ms cubic-bezier(0.2, 0.7, 0.2, 1) ${d}ms`,
                    }}
                  >
                    <Mark kind={item.kind} />
                  </span>
                );
              })}
            </div>
            <p className="num hidden text-right text-[13px] text-text sm:block">{row.end}</p>
          </div>
        );
      })}
    </div>
  );
}

import { ArrowLeft } from 'lucide-react';

// Shared pieces of the Method and Validation pages.

export type InfoView = 'method' | 'validation' | 'site';

const TABS: { id: InfoView; label: string }[] = [
  { id: 'method', label: 'Method' },
  { id: 'validation', label: 'Validation' },
  { id: 'site', label: 'Sites' },
];

export function InfoShell({
  view,
  onView,
  onBack,
  title,
  children,
}: {
  view: InfoView;
  onView: (v: InfoView) => void;
  onBack: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="scroll min-h-0 flex-1 bg-panel" aria-labelledby="h-info">
      <header className="border-b border-line">
        <div className="flex items-stretch border-b border-line [&_.tab]:-mb-px">
          <button type="button" onClick={onBack} className="tool border-r border-line sm:!px-6">
            <ArrowLeft size={14} aria-hidden="true" /> <span className="hidden sm:inline">Back to the globe</span>
            <span className="sm:hidden">Globe</span>
          </button>
          <div className="flex pl-2" role="group" aria-label="Page">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={view === t.id}
                onClick={() => onView(t.id)}
                className="tab sm:!px-5"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 pb-5 pt-6 sm:px-6">
          <p className="label">{view === 'method' ? 'Method' : view === 'validation' ? 'Validation' : 'Featured site'}</p>
          <h2 id="h-info" className="mt-1 max-w-[60ch] text-[22px] font-semibold leading-7 text-text">
            {title}
          </h2>
        </div>
      </header>
      {children}
    </main>
  );
}

export function Section({ id, title, wide, children }: { id: string; title: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-b border-line px-4 py-6 sm:px-6">
      <h3 id={id} className="mb-3 text-[14px] font-semibold text-text">
        {title}
      </h3>
      <div className={`${wide ? 'max-w-[1100px]' : 'max-w-[72ch]'} space-y-2 text-[14px] text-text`}>{children}</div>
    </section>
  );
}

export function Rule({ name, value, children }: { name: string; value: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <span className="text-[13px] font-medium text-text">{name}</span>
        <span className="num text-[14px] font-semibold text-text">{value}</span>
      </div>
      <p className="mt-1.5 text-[13px] text-muted">{children}</p>
    </div>
  );
}

export const Formula = ({ children }: { children: React.ReactNode }) => (
  <p className="num overflow-x-auto border-l border-line pl-3 text-[13px] text-text">{children}</p>
);

export const Prose = ({ children }: { children: React.ReactNode }) => <div className="max-w-[72ch] space-y-2">{children}</div>;

/** A plain data table that scrolls sideways on a phone instead of breaking the page. */
export function DataTable({
  caption,
  headers,
  numeric = [],
  minWidth = 560,
  children,
}: {
  caption: string;
  headers: string[];
  /** Column indexes that hold numbers and are right-aligned. */
  numeric?: number[];
  minWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={caption}>
      <table className="w-full border-collapse text-left text-[13px]" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line">
            {headers.map((h, i) => (
              <th key={h + i} scope="col" className={`label whitespace-nowrap py-2 pr-4 font-normal ${numeric.includes(i) ? 'text-right' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const Td = ({ children, num, muted }: { children: React.ReactNode; num?: boolean; muted?: boolean }) => (
  <td className={`py-2 pr-4 align-top ${num ? 'num whitespace-nowrap text-right' : ''} ${muted ? 'text-muted' : 'text-text'}`}>{children}</td>
);

export const Loading = ({ what }: { what: string }) => (
  <p className="label px-4 py-5 sm:px-6" role="status">
    Loading {what}
  </p>
);

export const Absent = ({ what }: { what: string }) => (
  <p className="px-4 py-5 text-[13px] text-text sm:px-6">
    <span className="label mr-2">No data</span>
    {what}
  </p>
);

/** Turns the URLs inside a SOURCES.md cell into links and drops the Markdown backticks. */
export function Linked({ text }: { text: string }) {
  const parts = text.replace(/`/g, '').split(/(https?:\/\/[^\s)|]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noreferrer" className="break-all text-text underline decoration-line underline-offset-2 hover:text-accent">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

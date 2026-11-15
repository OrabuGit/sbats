import aiUse from '../../../AI_USE.md?raw';

interface Row {
  date: string;
  tool: string;
  what: string;
  files: string;
}

/** The project's AI_USE.md, shown as it is written: the table of every use, then its notes. */
function parse(md: string): { intro: string; rows: Row[]; notes: string[] } {
  const lines = md.split('\n');
  const rows: Row[] = [];
  const notes: string[] = [];
  const intro: string[] = [];
  let inNotes = false;
  for (const line of lines) {
    if (/^\s*\|/.test(line)) {
      const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      if (cells.length >= 4 && cells[0] !== 'Date' && !/^-+$/.test(cells[0])) rows.push({ date: cells[0], tool: cells[1], what: cells[2], files: cells.slice(3).join(' | ') });
    } else if (/^Notes:/i.test(line)) {
      inNotes = true;
    } else if (inNotes && line.startsWith('- ')) {
      notes.push(line.slice(2));
    } else if (!inNotes && line.trim() && !line.startsWith('#')) {
      intro.push(line.trim());
    }
  }
  return { intro: intro.join(' '), rows, notes };
}

export function AiUsePage({ onBack }: { onBack: () => void }) {
  const { intro, rows, notes } = parse(aiUse);
  return (
    <main className="scroll min-h-0 flex-1 bg-bg" aria-labelledby="h-ai">
      <div className="mx-auto max-w-[1000px] px-5 pb-20 pt-8 sm:px-10 sm:pt-12">
        <button type="button" onClick={onBack} className="btn btn-ghost !pl-0">
          Back
        </button>
        <h1 id="h-ai" className="display-l mt-4 text-[40px] sm:text-[64px]">
          AI assistance
        </h1>
        <p className="mt-3 max-w-[62ch] text-[16px] leading-7 text-muted">{intro}</p>
        <ul className="mt-6 max-w-[70ch] space-y-2">
          {notes.map((n) => (
            <li key={n} className="border-l-2 border-accent pl-3 text-[14px] leading-6 text-text">
              {n}
            </li>
          ))}
        </ul>
        <p className="mt-10 text-[14px] text-muted">{rows.length} uses, oldest first. This is the text of AI_USE.md in the project repository.</p>
        <ol className="mt-4">
          {rows.map((r, i) => (
            <li key={i} className="grid gap-x-8 gap-y-1 border-t border-line py-4 md:grid-cols-[120px_minmax(0,1fr)]">
              <p className="text-[13px] text-muted">
                {r.date}
                <span className="block text-text">{r.tool}</span>
              </p>
              <div>
                <p className="text-[14px] leading-6 text-text">{r.what}</p>
                <p className="mt-1 break-words text-[12px] leading-5 text-muted">{r.files}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}

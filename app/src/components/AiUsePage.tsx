import aiUse from '../../../AI_USE.md?raw';

const LOG_URL = 'https://github.com/OrabuGit/sbats/blob/main/AI_USE.md';

// The page is a short summary. The complete log, with every dated entry and its files, is AI_USE.md in the repository.
// Every statement under "What the team did" is one the repository supports (README, the team's rules in the code,
// the team's own site stories); nothing else is claimed.
const TEAM = [
  'Set the concept: search all of Earth for places that stand in for Moon and Mars base sites.',
  'Sketched the home page layout, and directed the product flow, the navigation and each round of changes through written briefs.',
  'Proposed the featured sites and wrote their stories.',
  'Set the scoring rules: no value is invented, and any change to the weights or the factor list needs the team’s approval.',
  'Directed and reviewed the work.',
];
const AI = [
  'Wrote the application and the pipeline code under that direction.',
  'Compiled data from cited public sources.',
  'Drafted interface text and documentation.',
  'Drew the line icons and drawings in code.',
];
const NOT = [
  'No data value comes from an AI model. Every value traces to a source in SOURCES.md.',
  'No AI-generated photographs, images or video are used.',
  'The featured site ideas and descriptions are the team’s.',
];

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mt-10" aria-label={title}>
      <h2 className="display text-[24px] leading-8 text-text sm:text-[28px]">{title}</h2>
      <ul className="mt-3 max-w-[68ch] space-y-2">
        {items.map((t) => (
          <li key={t} className="border-l-2 border-line pl-3 text-[16px] leading-7 text-text">
            {t}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AiUsePage({ onBack }: { onBack: () => void }) {
  const entries = (aiUse.match(/^\| 20/gm) ?? []).length;
  return (
    <main className="scroll min-h-0 flex-1 bg-bg" aria-labelledby="h-ai">
      <div className="mx-auto max-w-[1000px] px-5 pb-20 pt-8 sm:px-10 sm:pt-12">
        <button type="button" onClick={onBack} className="btn btn-ghost !pl-0">
          Back
        </button>
        <h1 id="h-ai" className="display-l mt-4 text-[40px] sm:text-[64px]">
          AI assistance
        </h1>
        <Block title="What the team did" items={TEAM} />
        <Block title="What AI did" items={AI} />
        <Block title="What AI did not do" items={NOT} />
        <p className="mt-12 max-w-[68ch] border-t border-line pt-6 text-[16px] leading-7 text-text">
          The complete log, {entries} entries with files, is in{' '}
          <a href={LOG_URL} target="_blank" rel="noreferrer" className="link-rule font-medium text-text">
            AI_USE.md
          </a>
          .
        </p>
      </div>
    </main>
  );
}

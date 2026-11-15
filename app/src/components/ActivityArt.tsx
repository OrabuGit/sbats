export type Activity = 'base' | 'rover' | 'ice' | 'life';

/** Line drawings of what each kind of work looks like on the ground. They carry no data. */
export function ActivityArt({ kind, className = '' }: { kind: Activity; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <svg viewBox="0 0 72 44" className={className} aria-hidden="true" {...common}>
      <path d="M2 38H70" />
      {kind === 'base' && (
        <>
          <path d="M8 38a15 15 0 0 1 30 0" />
          <path d="M14 38a9 9 0 0 1 18 0" />
          <path d="M38 38v-7h15v7" />
          <path d="M53 38v-4h8v4" />
          <path d="M23 23V13" />
          <circle cx="23" cy="11" r="2" />
          <path d="M46 31v-6M43 25h6" />
        </>
      )}
      {kind === 'rover' && (
        <>
          <path d="M16 24h34l4 6H12z" />
          <circle cx="20" cy="34" r="4" />
          <circle cx="33" cy="34" r="4" />
          <circle cx="46" cy="34" r="4" />
          <path d="M44 24V12h10" />
          <rect x="52" y="8" width="9" height="6" />
          <path d="M16 26L7 21" />
          <path d="M58 38l3-3 3 3M64 38l3-2" />
        </>
      )}
      {kind === 'ice' && (
        <>
          <path d="M36 6v30M23 13l26 16M49 13L23 29" />
          <path d="M31 8l5 4 5-4M31 34l5-4 5 4" />
          <path d="M6 38c4-5 9-5 13 0M53 38c4-5 9-5 13 0" />
        </>
      )}
      {kind === 'life' && (
        <>
          <path d="M30 5h12M32 5v12L21 34a3 3 0 0 0 2.6 4.5h24.8A3 3 0 0 0 51 34L40 17V5" />
          <path d="M26 28h20" />
          <circle cx="33" cy="32" r="1.4" />
          <circle cx="41" cy="31" r="1" />
          <path d="M58 38V26M58 30c-4 0-6-2-6-5 4 0 6 2 6 5zM58 32c4 0 6-2 6-5-4 0-6 2-6 5z" />
        </>
      )}
    </svg>
  );
}

/** Which kind of work a preset or a purpose stands for. */
export function activityOf(presetId: string | null, purposeId: string | null): Activity {
  const id = purposeId ?? presetId;
  if (id === 'rover' || id === 'mobility') return 'rover';
  if (id === 'ice') return 'ice';
  if (id === 'astrobiology') return 'life';
  return 'base';
}

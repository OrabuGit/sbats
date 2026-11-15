// One reading of a similarity, used on the match page, the site pages and the report.
export type Verdict = 'match' | 'partial' | 'miss' | 'none';

/** At or above this a similarity counts as a match. */
export const MATCH = 0.6;
/** Below this it counts as no match. Between the two it is a partial match. */
export const MISS = 0.3;

export function verdictOf(similarity: number | null | undefined): Verdict {
  if (similarity === null || similarity === undefined) return 'none';
  return similarity >= MATCH ? 'match' : similarity >= MISS ? 'partial' : 'miss';
}

export const VERDICT_WORD: Record<Verdict, string> = { match: 'Matches', partial: 'Partly', miss: 'Does not match', none: 'No data' };

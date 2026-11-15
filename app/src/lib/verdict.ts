// One reading of a similarity, used on the match page, the site pages and the report.
// The cut-offs are Session C's (lib/match): they put same, related and unrelated rock class on
// the three verdicts.
import { MATCH_AT, PARTLY_AT } from './matchAdapter';

export type Verdict = 'match' | 'partial' | 'miss' | 'none';

/** At or above this a similarity counts as a match. */
export const MATCH = MATCH_AT;
/** Below this it counts as no match. Between the two it is a partial match. */
export const MISS = PARTLY_AT;

export function verdictOf(similarity: number | null | undefined): Verdict {
  if (similarity === null || similarity === undefined) return 'none';
  return similarity >= MATCH ? 'match' : similarity >= MISS ? 'partial' : 'miss';
}

/** Session C's verdict names mapped to the app's. */
export const fromRecord = (v: 'matches' | 'partly' | 'does-not-match' | 'no-data'): Verdict =>
  v === 'matches' ? 'match' : v === 'partly' ? 'partial' : v === 'does-not-match' ? 'miss' : 'none';

export const VERDICT_WORD: Record<Verdict, string> = { match: 'Matches', partial: 'Partly', miss: 'Does not match', none: 'No data' };

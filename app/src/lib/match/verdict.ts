// The three-level verdict. A display rule: it reads a similarity and changes no number.

import type { Verdict } from './types';

/**
 * At or above this similarity a comparison "matches". For a measured value that is within about
 * three quarters of one tolerance of the target. For rock class it is "same class" (1.0).
 */
export const MATCH_AT = 0.75;
/**
 * At or above this similarity a comparison "partly" matches: within about one and a half tolerances.
 * For rock class it is "related class" (0.6). Below it, "does not match" (unrelated class is 0.15).
 */
export const PARTLY_AT = 0.3;

export function verdictOf(similarity: number | null): Verdict {
  if (similarity === null || !Number.isFinite(similarity)) return 'no-data';
  if (similarity >= MATCH_AT) return 'matches';
  return similarity >= PARTLY_AT ? 'partly' : 'does-not-match';
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  matches: 'Matches',
  partly: 'Partly matches',
  'does-not-match': 'Does not match',
  'no-data': 'No data',
};

/** Verdict for a 0 to 100 score, on the same thresholds. */
export function verdictOfScore(score: number | null): Verdict {
  return verdictOf(score === null ? null : score / 100);
}

// How ranks are worded. "Rank N of M" is the position among all scored squares. "No. N in this list" is the position
// in a filtered and spaced list. Stability is shown in whole numbers, and "Stable" only when the place stays in the
// top 10 in at least 80% of the redraws of the weights.
const n = (v: number) => Math.round(v).toLocaleString('en-US');

export const STABLE_AT = 0.8;

/** "Stable" or "Rank varies", from the share of redraws in which the place stays in the top group. */
export const stabilityWord = (shareInTop: number) => (shareInTop >= STABLE_AT ? 'Stable' : 'Rank varies');

/** For a card: "Stable: rank 2 to 11 in nine of ten redraws of the weights, in the top 10 in 95% of them." */
export function stabilityLine(rankP05: number, rankP95: number, shareInTop: number, topN = 10): string {
  const lo = Math.round(rankP05);
  const hi = Math.round(rankP95);
  const range = lo === hi ? `rank ${n(lo)}` : `rank ${n(lo)} to ${n(hi)}`;
  return `${stabilityWord(shareInTop)}: ${range} in nine of ten redraws of the weights, in the top ${topN} in ${Math.round(shareInTop * 100)}% of them.`;
}

export const rankOf = (rank: number, of: number) => `Rank ${n(rank)} of ${n(of)}`;

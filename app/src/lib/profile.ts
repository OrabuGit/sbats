// The analog profile of one Earth place against one target: the five dimensions (rock, terrain, climate, bare ground,
// sunlight) as matches, partly or does not match, each with both values, then one sentence of verdict. Everything is
// read from the match record (lib/match). Nothing here changes a score; it only chooses what is said first.
import type { MatchRecord } from './matchAdapter';
import { fromRecord, type Verdict } from './verdict';

export interface ProfileRow {
  label: string;
  earth: string;
  target: string;
}

export interface ProfileDim {
  id: string;
  label: string;
  /** How the dimension reads in a sentence: "rock", "terrain", "climate", "bare ground", "sunlight". */
  noun: string;
  verdict: Verdict;
  rows: ProfileRow[];
}

export interface Profile {
  dims: ProfileDim[];
  /** One line, for example "Good for rock and terrain work. Not a climate match." */
  line: string;
}

const NOUN: Record<string, string> = { geology: 'rock', terrain: 'terrain', climate: 'climate', bareGround: 'bare ground', sunlight: 'sunlight' };

const and = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const or = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);

/** The sentence that follows the profile. Says what the place is good for, and what it is not. */
export function verdictLine(dims: ProfileDim[]): string {
  const pick = (v: Verdict) => dims.filter((d) => d.verdict === v).map((d) => d.noun);
  const good = pick('match');
  const partly = pick('partial');
  const bad = pick('miss');
  const none = pick('none');
  const parts: string[] = [];
  if (good.length > 0) parts.push(`Good for ${and(good)} work.`);
  if (partly.length > 0) parts.push(`Partly right for ${and(partly)}.`);
  if (bad.length > 0) parts.push(`Not a ${or(bad)} match.`);
  if (none.length > 0) parts.push(`No data for ${and(none)}.`);
  return parts.length > 0 ? parts.join(' ') : 'No dimension could be compared.';
}

const windowOf = (rec: MatchRecord) => (rec.earth.scale === 'site' ? '(inside the site footprint)' : '(over the 55 km square)');

export function profileOf(rec: MatchRecord): Profile {
  const dims: ProfileDim[] = rec.dimensions
    .filter((d) => d.inScore)
    .map((d) => ({
      id: d.id,
      label: d.label,
      noun: NOUN[d.id] ?? d.label.toLowerCase(),
      verdict: fromRecord(d.verdict),
      rows: d.rows
        .filter((r) => r.earth.text !== 'no data' || r.target.text !== 'no data')
        // Slope and roughness depend on the size of the window they are measured over, so each says which one.
        .map((r) => ({ label: r.key === 'slope' || r.key === 'roughness' ? `${r.label} ${windowOf(rec)}` : r.label, earth: r.earth.text, target: r.target.text })),
    }));
  return { dims, line: verdictLine(dims) };
}

/**
 * The all-round score as a sentence that says why it is low. When the score is close to zero because a dimension
 * fails, it says so: the score is a geometric mean, so one failed factor pulls it to about zero by design.
 */
export function scoreSentence(score: number | null, dims: ProfileDim[], what = 'All-round score'): string {
  if (score === null) return `${what}: no data.`;
  const failing = dims.filter((d) => d.verdict === 'miss').map((d) => d.noun);
  let s = `${what} ${score.toFixed(0)} / 100`;
  if (failing.length > 0) s += `: ${and(failing)} ${failing.length === 1 ? 'does' : 'do'} not match`;
  if (failing.length > 0 && score < 5) s += ', and one failed factor pulls this score to about zero by design';
  return `${s}.`;
}

/** A value with the target's "(Earth's closest: ...)" aside removed, for the short form. */
export const short = (t: string) => t.replace(/\s*\(.*\)\s*$/, '');

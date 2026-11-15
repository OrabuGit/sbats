import type { Analog, CellSummary, EarthCell, EarthFile } from '../types';
import { distanceKm } from './geo';

/** A site counts as NEW when it is farther than this from every known analog (the Method page). */
export const NEW_DISTANCE_KM = 500;

export interface Candidate {
  index: number;
  rank: number;
  isNew: boolean;
}

export interface Tally {
  scored: number;
  high: number;
  medium: number;
  low: number;
  noData: number;
}

export function tally(results: CellSummary[]): Tally {
  const t: Tally = { scored: 0, high: 0, medium: 0, low: 0, noData: 0 };
  for (const r of results) {
    if (r.score === null || r.confidence === null) t.noData++;
    else {
      t.scored++;
      t[r.confidence]++;
    }
  }
  return t;
}

export function isNewSite(cell: Pick<EarthCell, 'lat' | 'lon'>, analogs: Analog[]): boolean {
  return analogs.every(
    (a) => a.kind !== 'known' || distanceKm(cell.lat, cell.lon, a.lat, a.lon) > NEW_DISTANCE_KM,
  );
}

/** Minimum spacing between listed candidates, so one desert does not fill the whole list. */
export const MIN_SEPARATION_KM = 250;
/** On a coarse grid the spacing grows to this many cell widths, so neighbours never both list. */
export const MIN_SEPARATION_CELLS = 2.5;
export function separationKm(earth: EarthFile): number {
  return Math.max(MIN_SEPARATION_KM, earth.meta.resolutionDeg * 111 * MIN_SEPARATION_CELLS);
}

/**
 * Top candidates: best score first, unscored cells never ranked, low confidence left out unless
 * asked for, and each pick at least separationKm from the picks above it.
 */
export function topCandidates(
  earth: EarthFile,
  results: CellSummary[],
  analogs: Analog[],
  opts: { includeLow: boolean; limit: number },
): Candidate[] {
  const order: number[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.score === null) continue;
    if (!opts.includeLow && r.confidence === 'low') continue;
    order.push(i);
  }
  order.sort((a, b) => (results[b].score as number) - (results[a].score as number));
  const sep = separationKm(earth);
  const picks: Candidate[] = [];
  for (const i of order) {
    const c = earth.cells[i];
    const clash = picks.some((p) => {
      const q = earth.cells[p.index];
      return distanceKm(c.lat, c.lon, q.lat, q.lon) < sep;
    });
    if (clash) continue;
    picks.push({ index: i, rank: picks.length + 1, isNew: isNewSite(c, analogs) });
    if (picks.length >= opts.limit) break;
  }
  return picks;
}

/** Share of scored cells that this score beats, 0 to 100. */
export function percentile(results: CellSummary[], score: number): number {
  let below = 0;
  let n = 0;
  for (const r of results) {
    if (r.score === null) continue;
    n++;
    if (r.score < score) below++;
  }
  return n === 0 ? 0 : (100 * below) / n;
}

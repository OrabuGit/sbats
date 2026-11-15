// The app's door to Session C's match, stability and route libraries (./match, ./scoring, ./route).
// Components import from here, so those APIs can change in one place.
import {
  MATCH_AT,
  PARTLY_AT,
  VERDICT_LABEL,
  buildMatchRecord,
  buildReport,
  earthPlaceFromCell,
  earthPlaceFromSite,
  sitePosts,
  targetAtSiteWindow,
  type MatchRecord,
  type SiteEntryLike,
  type TargetWindowsFile,
} from './match';
import { PRESETS, buildProfileIndex, computeEarthRanges, prepareTarget, rankStability, stabilityBasis } from './scoring';
import type { EarthRanges, ProfileIndex, StabilityBasis, StabilityResult } from './scoring';
import { measureRoute, type ElevationTile, type RouteResult } from './route';
import { loadExtra } from '../data/access';
import type { EarthCell, EarthFile, LithologySimilarity, Target, Weights } from '../types';

export { MATCH_AT, PARTLY_AT, VERDICT_LABEL, buildReport, measureRoute };
export type { MatchRecord, RouteResult, ElevationTile, StabilityResult };
export type { MatchDimension, MatchRow, MatchSide, Verdict as RecordVerdict } from './match';
export type { MatchReport, ReportText } from './match/report';
export type { CellStability } from './scoring';

/** Target terrain measured in windows the size of each site's footprint (Session C). null when not published. */
export const loadTargetWindows = () => loadExtra<TargetWindowsFile>('target_windows.json');

const rangesOf = new WeakMap<EarthFile, EarthRanges>();
const indexOf = new WeakMap<EarthFile, Map<string, ProfileIndex>>();
const basisOf = new WeakMap<EarthFile, Map<string, StabilityBasis>>();

function ranges(earth: EarthFile): EarthRanges {
  let r = rangesOf.get(earth);
  if (!r) rangesOf.set(earth, (r = computeEarthRanges(earth.cells)));
  return r;
}

export interface RecordInput {
  earth: EarthFile;
  lithology: LithologySimilarity;
  target: Target;
  cell: EarthCell;
  name: string;
  /** The entry of data/sites.json for this place, to compare at footprint scale. */
  site?: SiteEntryLike | null;
  targetWindows?: TargetWindowsFile | null;
}

/**
 * The match record for a target and an Earth place: nine dimensions with both values, similarity,
 * verdict and a one-line reason each. With `site`, terrain, vegetation and rock are the footprint's
 * and the target's terrain is measured in a window of the same size when that was published.
 */
export function matchRecord(input: RecordInput): { record: MatchRecord; note: string | null } {
  const { earth, lithology, target, cell, site } = input;
  const classes = earth.meta.factors.find((f) => f.key === 'lithology')?.classes;
  const like = site && input.targetWindows ? targetAtSiteWindow(target, sitePosts(site), input.targetWindows) : null;
  const used = like ?? target;
  const place = site ? earthPlaceFromSite(site, cell, earth.meta) : earthPlaceFromCell(cell, earth.meta, { name: input.name });
  // Percentiles rank this place among all grid cells for the same target. They are left out when the
  // target was re-measured for a site window, because the grid was not scored against that.
  let index: ProfileIndex | null = null;
  if (!like) {
    let byTarget = indexOf.get(earth);
    if (!byTarget) indexOf.set(earth, (byTarget = new Map()));
    index = byTarget.get(target.id) ?? null;
    if (!index) {
      try {
        index = buildProfileIndex(earth.cells, prepareTarget(target, ranges(earth), lithology));
        byTarget.set(target.id, index);
      } catch {
        index = null;
      }
    }
  }
  const build = (table: LithologySimilarity | null) =>
    buildMatchRecord({ target: used, place, ranges: ranges(earth), table, classes, index, terrainLikeForLike: like !== null });
  try {
    return { record: build(lithology), note: null };
  } catch (e) {
    // A rock class outside the similarity table: compare without rock type and say so.
    return { record: build(null), note: `Rock type is left out: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** How much the ranking moves when the weights are redrawn 200 times (Session C's rankStability). About 0.7 s. */
export function stability(earth: EarthFile, lithology: LithologySimilarity, target: Target, weights: Weights, follow: number[]): StabilityResult {
  let byTarget = basisOf.get(earth);
  if (!byTarget) basisOf.set(earth, (byTarget = new Map()));
  let basis = byTarget.get(target.id);
  if (!basis) {
    let prepared;
    try {
      prepared = prepareTarget(target, ranges(earth), lithology);
      basis = stabilityBasis(earth.cells, prepared);
    } catch {
      prepared = prepareTarget(target, ranges(earth), null);
      basis = stabilityBasis(earth.cells, prepared);
    }
    byTarget.set(target.id, basis);
  }
  return rankStability(basis, weights, { follow });
}

export const BASE_WEIGHTS: Weights = PRESETS.base.weights;

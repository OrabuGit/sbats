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
  emitFamilies,
  extraRanges,
  sharedMinerals,
  targetEnvironment,
  targetExtrasForProfile,
  sitePosts,
  targetAtSiteWindow,
  type MatchRecord,
  type SharedMinerals,
  type SiteEntryLike,
  type TargetEnvironmentFile,
  type TargetMineralsFile,
  type TargetWindowsFile,
} from './match';
import { PRESETS, buildProfileIndex, computeEarthRanges, prepareTarget, rankStability, stabilityBasis } from './scoring';
import type { EarthRanges, ProfileIndex, StabilityBasis, StabilityResult } from './scoring';
import { measureRoute, type ElevationTile, type RouteResult } from './route';
import { loadExtra } from '../data/access';
import { flags } from '../flags';
import type { EarthCell, EarthFile, LithologySimilarity, Target, Weights } from '../types';

export { MATCH_AT, PARTLY_AT, VERDICT_LABEL, buildReport, measureRoute };
export type { MatchRecord, RouteResult, ElevationTile, StabilityResult, SharedMinerals };
export type { MatchDimension, MatchRow, MatchSide, Verdict as RecordVerdict } from './match';
export type { MatchReport, ReportText } from './match/report';
export type { CellStability } from './scoring';
export type { BodyGrid, KnownSite, KnownSitesFile, TargetProfile } from './targets';
export { targetFromKnownSite, targetFromPoint } from './targets';
import type { TargetProfile } from './targets';

/** Target terrain measured in windows the size of each site's footprint (Session C). null when not published. */
export const loadTargetWindows = () => loadExtra<TargetWindowsFile>('target_windows.json');
/** Wind, dust and ice at the targets (Session C). null when not published. */
export const loadTargetEnvironment = () => loadExtra<TargetEnvironmentFile>('target_environment.json');
/** Minerals reported at the targets and the mineral families used to compare them (Session C). null when not published. */
export const loadTargetMinerals = () => loadExtra<TargetMineralsFile>('target_minerals.json');

const rangesOf = new WeakMap<EarthFile, EarthRanges>();
const extraRangesOf = new WeakMap<EarthFile, ReturnType<typeof extraRanges>>();
const indexOf = new WeakMap<EarthFile, Map<string, ProfileIndex>>();
const basisOf = new WeakMap<EarthFile, Map<string, StabilityBasis>>();

function ranges(earth: EarthFile): EarthRanges {
  let r = rangesOf.get(earth);
  if (!r) rangesOf.set(earth, (r = computeEarthRanges(earth.cells)));
  return r;
}

/** True for a site whose EMIT minerals must not be shown yet. Indonesian site ids start with "id-". */
export const mineralsWithheld = (siteId: string) => !flags.indonesiaMinerals && siteId.startsWith('id-');
export const WITHHELD_NOTE = 'Minerals are not shown for this site: the EMIT identifications for the Indonesian sites are being rebuilt after a cloud screening problem was found.';

export interface RecordInput {
  earth: EarthFile;
  lithology: LithologySimilarity;
  target: Target;
  cell: EarthCell;
  name: string;
  /** The entry of data/sites.json for this place, to compare at footprint scale. */
  site?: SiteEntryLike | null;
  targetWindows?: TargetWindowsFile | null;
  /** data/target_minerals.json. Minerals are compared at site scale only. */
  minerals?: TargetMineralsFile | null;
  /** data/target_environment.json: wind, dust and ice at the targets. */
  environment?: TargetEnvironmentFile | null;
  /** The profile, when the target was built from a clicked point or a named place (lib/targets). */
  profile?: TargetProfile | null;
}

/**
 * The match record for a target and an Earth place: nine dimensions with both values, similarity,
 * verdict and a one-line reason each. With `site`, terrain, vegetation and rock are the footprint's
 * and the target's terrain is measured in a window of the same size when that was published.
 */
export function matchRecord(input: RecordInput): { record: MatchRecord; note: string | null; minerals: SharedMinerals | null } {
  const { earth, lithology, target, cell } = input;
  // EMIT minerals for the Indonesian sites are withheld until the rebuilt file is confirmed (flags.indonesiaMinerals).
  const withheld = !!input.site && mineralsWithheld(input.site.id);
  const site = input.site && withheld ? { ...input.site, mineralogy: null } : input.site;
  const classes = earth.meta.factors.find((f) => f.key === 'lithology')?.classes;
  const like = site && input.targetWindows ? targetAtSiteWindow(target, sitePosts(site), input.targetWindows) : null;
  const used = like ?? target;
  const mf = input.minerals ?? null;
  const place = site
    ? earthPlaceFromSite(site, cell, earth.meta, mf ? { families: mf.families, emitMinimumShare: mf.meta.emitMinimumShare } : {})
    : earthPlaceFromCell(cell, earth.meta, { name: input.name });
  // Minerals: EMIT identifications in the site's footprint against minerals reported at the target.
  let shared: SharedMinerals | null = null;
  if (site && mf) {
    try {
      shared = sharedMinerals(emitFamilies(site.mineralogy ?? null, mf.families, mf.meta.emitMinimumShare), mf.targets[target.id]?.minerals, mf.families);
    } catch {
      shared = null;
    }
  }
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
  let xr = extraRangesOf.get(earth);
  if (!xr) extraRangesOf.set(earth, (xr = extraRanges(earth.cells)));
  const build = (table: LithologySimilarity | null) =>
    buildMatchRecord({
      target: used,
      place,
      ranges: ranges(earth),
      table,
      classes,
      index,
      terrainLikeForLike: like !== null,
      minerals: shared,
      // Wind, dust and ice: the target side from target_environment.json, clamped to Earth's own range
      // the way the frozen score clamps (a windless Moon is compared with Earth's calmest cell).
      profile: input.profile ?? null,
      targetExtras: input.profile ? targetExtrasForProfile(input.profile, input.environment ?? null) : targetEnvironment(input.environment ?? null, target.id),
      extraRanges: xr,
    });
  try {
    return { record: build(lithology), note: withheld ? WITHHELD_NOTE : null, minerals: shared };
  } catch (e) {
    // A rock class outside the similarity table: compare without rock type and say so.
    return { record: build(null), note: `Rock type is left out: ${e instanceof Error ? e.message : String(e)}`, minerals: shared };
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

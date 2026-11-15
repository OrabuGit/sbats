// The app's only door to the scoring library in ./scoring. Components never import from
// ./scoring directly, so its API can change in one place.
//
// Functions used from the library:
//   PRESETS (record keyed by preset id), PRESET_IDS
//   computeEarthRanges(cells)
//   prepareTarget(target, ranges, lithologyTable | null) -> { missingTargetKeys, gaps, warnings, ... }
//   scoreCells(cells, prepared, weights) -> CellSummary[]
//   scoreCell(cell, prepared, weights)   -> CellScore (breakdown, limitingFactor, reason)

import {
  PRESETS as LIB_PRESETS,
  PRESET_IDS,
  PURPOSES,
  analogProfile,
  buildProfileIndex,
  computeEarthRanges,
  purposeWeights as libPurposeWeights,
  prepareTarget,
  scoreCell,
  scoreCells,
} from './scoring';
import type { DimensionProfile, ProfileIndex, PurposeId } from './scoring';
import type {
  CellScore,
  CellSummary,
  EarthCell,
  EarthFile,
  FactorId,
  LithologySimilarity,
  PreparedTarget,
  Preset,
  Target,
  Weights,
} from '../types';

// The constants behind the rules, for the Method page.
export {
  FACTORS,
  KEY_INFO,
  REQUIRED_KEYS,
  MIN_COVERAGE,
  MEDIUM_CONFIDENCE_COVERAGE,
  SUN_ELEVATION_SIGMA_DEG,
} from './scoring';

export { DIMENSIONS, PURPOSES, matchWord } from './scoring';
export type { DimensionProfile, PurposeDef, PurposeId } from './scoring';

/** Weights of each purpose ranking, built once so the same object is reused between renders. */
const PURPOSE_WEIGHTS = Object.fromEntries(PURPOSES.map((p) => [p.id, libPurposeWeights(p.id)])) as Record<PurposeId, Weights>;
export const purposeWeights = (id: PurposeId): Weights => PURPOSE_WEIGHTS[id];

export const PRESETS: Preset[] = PRESET_IDS.map((id) => LIB_PRESETS[id]);

export const FACTOR_LABELS: Record<FactorId, string> = {
  terrain: 'Terrain',
  bareGround: 'Bare ground',
  dryness: 'Dryness',
  temperature: 'Temperature',
  sunlight: 'Sunlight',
  rockType: 'Rock type',
};

/** One target, ready to score against one dataset. */
export interface TargetScorer {
  prepared: PreparedTarget;
  /** Notes for the user, for example when Rock type had to be left out. */
  notes: string[];
  scoreAll: (weights: Weights) => CellSummary[];
  explain: (cell: EarthCell, weights: Weights) => CellScore;
  /** Similarity per dimension and its standing among all Earth cells. The index is built on first use. */
  profile: (cell: EarthCell) => DimensionProfile[];
  /** The score of one cell under every purpose, in the order of PURPOSES. */
  purposeScores: (cell: EarthCell) => { id: PurposeId; result: CellScore }[];
}

export interface Scorer {
  forTarget: (target: Target) => TargetScorer;
}

/** Builds the scorer for one dataset. Targets are prepared once and cached. */
export function createScorer(earth: EarthFile, lithology: LithologySimilarity): Scorer {
  const ranges = computeEarthRanges(earth.cells);
  const cache = new Map<string, TargetScorer>();
  return {
    forTarget(target) {
      const hit = cache.get(target.id);
      if (hit) return hit;
      let prepared = prepareTarget(target, ranges, lithology);
      const notes: string[] = [];
      // The library throws when a rock class pair is not in the similarity table (by design: a
      // missing pair is an error, not a silent default). That happens when earth.json and
      // lithology_similarity.json come from different builds. Leave Rock type out and say so,
      // rather than blank the screen.
      // The trial run is kept, so the first screen does not score every cell twice.
      let first: CellSummary[] | null = null;
      try {
        first = scoreCells(earth.cells, prepared, PRESETS[0].weights);
      } catch (e) {
        prepared = prepareTarget(target, ranges, null);
        notes.push(
          `Rock type is left out for ${target.name}: the similarity table does not cover the rock classes in earth.json (${e instanceof Error ? e.message : String(e)}).`,
        );
      }
      let profileIndex: ProfileIndex | null = null;
      const ts: TargetScorer = {
        prepared,
        notes,
        profile: (c) => {
          profileIndex ??= buildProfileIndex(earth.cells, prepared);
          return analogProfile(c, prepared, profileIndex);
        },
        purposeScores: (c) => PURPOSES.map((p) => ({ id: p.id, result: scoreCell(c, prepared, PURPOSE_WEIGHTS[p.id]) })),
        scoreAll: (w) => (first && w === PRESETS[0].weights ? first : scoreCells(earth.cells, prepared, w)),
        explain: (c, w) => scoreCell(c, prepared, w),
      };
      cache.set(target.id, ts);
      return ts;
    },
  };
}

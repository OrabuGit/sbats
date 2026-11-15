// SBATS scoring library. Pure TypeScript, no UI and no file or network access.
// Implements the Method page and the scoring rules of data/SCHEMA.md. See README.md in this folder.

export { PRESETS, PRESET_IDS, DEFAULT_PRESET_ID, normaliseWeights } from './presets';
export type { Preset, PresetId } from './presets';

export { computeEarthRanges, prepareTarget, scoreCell, scoreCells, scoreCellSummary, factorSimilarities, nearestCell } from './score';
export type { PrepareOptions } from './score';

export {
  DIMENSIONS,
  DIMENSION_IDS,
  PURPOSES,
  PURPOSE_IDS,
  analogProfile,
  buildProfileIndex,
  dimensionSimilarities,
  purposeWeights,
  rankIn,
} from './profile';
export type { DimensionDef, DimensionId, DimensionProfile, ProfileIndex, PurposeDef, PurposeId, Rank } from './profile';

export { STABILITY_DRAWS, STABILITY_SEED, STABILITY_SPREAD, perturbWeights, rankStability, scoresFromBasis, seededRandom, stabilityBasis } from './stability';
export type { CellStability, StabilityBasis, StabilityOptions, StabilityResult } from './stability';

export { buildReason, describeGap, formatValue, matchWord } from './explain';

export { gaussianSimilarity, gaussianLogSimilarity, clampToRange, weightedGeometricMean } from './similarity';

export { sunElevation, OBLIQUITY_DEG, SUN_ELEVATION_SIGMA_DEG } from './sunlight';

export { lithologySimilarity, buildLithologyLookup, validateLithologyTable, LithologyPairError } from './lithology';

export {
  FACTORS,
  KEY_INFO,
  REQUIRED_KEYS,
  MIN_COVERAGE,
  MEDIUM_CONFIDENCE_COVERAGE,
} from './factors';
export type { FactorDef, KeyInfo } from './factors';

export { FACTOR_IDS, FACTOR_KEYS, NUMERIC_KEYS, GAUSSIAN_KEYS } from './types';
export type {
  Badge,
  BareGroundSource,
  Body,
  CellScore,
  CellSummary,
  ClampGap,
  Confidence,
  EarthCell,
  EarthRanges,
  FactorBreakdown,
  FactorId,
  FactorKey,
  GaussianKey,
  KeyBreakdown,
  KeyStatus,
  LithologyClass,
  LithologyLevels,
  LithologyPair,
  LithologyRelation,
  LithologyTable,
  NumericKey,
  PreparedGaussian,
  PreparedTarget,
  Range,
  ScoreKey,
  SunKey,
  Target,
  TargetValue,
  UnscoredReason,
  Weights,
} from './types';

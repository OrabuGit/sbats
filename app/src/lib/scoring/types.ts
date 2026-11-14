// Shared types for the SBATS scoring library.
// File shapes (EarthFile, Target, LithologyTable) follow data/SCHEMA.md exactly.
// app/src/types.ts (Session A) mirrors the result shapes below. Do not rename them without telling Session A.

/** The six numeric data keys of data/SCHEMA.md. They use the Gaussian similarity. */
export const NUMERIC_KEYS = ['tempMean', 'tempRange', 'precip', 'ndvi', 'slope', 'roughness'] as const;
export type NumericKey = (typeof NUMERIC_KEYS)[number];

/** All seven data keys of data/SCHEMA.md. `lithology` is categorical. */
export const FACTOR_KEYS = [...NUMERIC_KEYS, 'lithology'] as const;
export type FactorKey = (typeof FACTOR_KEYS)[number];

/** The Sunlight quantity. Computed here from latitude, never read from a data file. */
export type SunKey = 'sunElevation';

/** Keys scored with the Gaussian rule. */
export const GAUSSIAN_KEYS = [...NUMERIC_KEYS, 'sunElevation'] as const;
export type GaussianKey = NumericKey | SunKey;
/** Every key that can appear in a breakdown. */
export type ScoreKey = FactorKey | SunKey;

/** The six scoring factors of DESIGN.md section 6. */
export const FACTOR_IDS = ['terrain', 'bareGround', 'dryness', 'temperature', 'sunlight', 'rockType'] as const;
export type FactorId = (typeof FACTOR_IDS)[number];

export type Body = 'earth' | 'moon' | 'mars';
export type Badge = 'Measured' | 'Mission' | 'Literature';

/** One cell of data/earth.json. Extra keys are ignored. */
export interface EarthCell {
  lat: number;
  lon: number;
  tempMean: number | null;
  tempRange: number | null;
  precip: number | null;
  ndvi: number | null;
  slope: number | null;
  roughness: number | null;
  lithology: number | null;
}

export interface LithologyClass {
  code: number;
  label: string;
}

/** One entry of `values` in data/targets.json. `note` is an optional, additive key. */
export interface TargetValue {
  value: number | null;
  sigma: number | null;
  source: string | null;
  badge: Badge | null;
  note?: string;
}

/** One entry of data/targets.json. */
export interface Target {
  id: string;
  name: string;
  body: 'moon' | 'mars';
  lat: number;
  lon: number;
  summary: string;
  values: Record<FactorKey, TargetValue>;
  cannotCopy: string[];
}

export type LithologyRelation = 'related' | 'unrelated';

export interface LithologyPair {
  a: number;
  b: number;
  relation: LithologyRelation;
  justification: string;
  source: string | null;
}

export interface LithologyLevels {
  same: number;
  related: number;
  unrelated: number;
}

/** data/lithology_similarity.json */
export interface LithologyTable {
  levels: LithologyLevels;
  pairs: readonly LithologyPair[];
}

/** Weights per scoring factor. Any non-negative numbers; they are normalised to sum to 1. */
export type Weights = Record<FactorId, number>;

export interface Range {
  min: number;
  max: number;
}

/** Earth's observed range per Gaussian key. `null` when no cell has a value for that key. */
export type EarthRanges = Record<GaussianKey, Range | null>;

export type Confidence = 'high' | 'medium' | 'low';
export type UnscoredReason = 'required-factor-missing' | 'coverage-too-low';

/** The per-cell result contract of data/SCHEMA.md ("Missing values and confidence"). */
export interface CellSummary {
  /** 0 to 100, or null when the cell is not scored. */
  score: number | null;
  /** Share of the preset's total weight that was present, 0 to 1. */
  coverage: number;
  /** Data keys that were left out. Empty when nothing is missing. */
  missing: FactorKey[];
  /** null when the cell is not scored. */
  confidence: Confidence | null;
  /** Why `score` is null, otherwise null. */
  unscoredReason: UnscoredReason | null;
}

/**
 * scored: the key entered the score.
 * missing-earth: the cell has no value. missing-target: the target has no published value.
 * zero-weight: the key has data but its factor's weight is 0, so it does not affect the score.
 */
export type KeyStatus = 'scored' | 'missing-earth' | 'missing-target' | 'zero-weight';

export interface KeyBreakdown {
  key: ScoreKey;
  label: string;
  unit: string;
  /** The Earth cell's value. For Sunlight it is computed from the cell latitude. */
  earthValue: number | null;
  /** The real target value, unclamped. */
  targetValue: number | null;
  /** The target value used in scoring, after clamping to Earth's observed range. Same as targetValue for lithology. */
  targetClamped: number | null;
  /** Gaussian tolerance. null for lithology. */
  sigma: number | null;
  /** 0 to 1, or null when the key was left out. */
  similarity: number | null;
  /** This key's share of the normalised weights (factor weight divided by its number of keys). */
  weight: number;
  status: KeyStatus;
}

export interface FactorBreakdown {
  factor: FactorId;
  label: string;
  /** Normalised weight of the factor (all six sum to 1). */
  weight: number;
  /** The part of `weight` that had data. Half for a two-key factor with one key missing. */
  coveredWeight: number;
  /** Weight after renormalising over everything present. 0 when the factor was left out. */
  effectiveWeight: number;
  /** Geometric mean of the key similarities, or null when the factor was left out. */
  similarity: number | null;
  keys: KeyBreakdown[];
}

/** Full result for one cell: the contract fields plus everything the dossier needs. */
export interface CellScore extends CellSummary {
  breakdown: FactorBreakdown[];
  /** The factor that lowers the score the most. null when unscored or when every factor is a perfect match. */
  limitingFactor: FactorId | null;
  /** One or two plain-language sentences explaining the score. */
  reason: string;
}

/** A target value that lies outside anything Earth offers. Feeds "what Earth cannot copy". */
export interface ClampGap {
  key: GaussianKey;
  label: string;
  unit: string;
  /** The real target value. */
  targetValue: number;
  /** The closest value Earth offers (the end of Earth's observed range). */
  clampedValue: number;
  /** targetValue minus clampedValue. Negative when the target is below Earth's range. */
  gap: number;
  earthRange: Range;
}

export interface PreparedGaussian {
  value: number;
  clamped: number;
  sigma: number;
}

/** A target made ready for scoring: clamped values, sunlight geometry and the rock-class lookup. */
export interface PreparedTarget {
  target: Target;
  gaussian: Record<GaussianKey, PreparedGaussian | null>;
  lithology: {
    code: number;
    similarityByCode: ReadonlyMap<number, number>;
    levels: LithologyLevels;
  } | null;
  /** Data keys with no usable target value. Missing for every cell of this target. */
  missingTargetKeys: FactorKey[];
  gaps: ClampGap[];
  /** Problems found while preparing (for example a value without a sigma). Never thrown. */
  warnings: string[];
}

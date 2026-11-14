// Types for the files described in data/SCHEMA.md. Keep in step with that document.

export type Badge = 'Measured' | 'Mission' | 'Literature';

export const FACTOR_KEYS = [
  'tempMean',
  'tempRange',
  'precip',
  'ndvi',
  'slope',
  'roughness',
  'lithology',
] as const;
export type FactorKey = (typeof FACTOR_KEYS)[number];

export interface LithologyClass {
  code: number;
  label: string;
}

export interface FactorMeta {
  key: FactorKey;
  label: string;
  unit: string;
  source: string;
  badge: Badge;
  classes?: LithologyClass[];
}

export type EarthCell = { lat: number; lon: number } & Record<FactorKey, number | null>;

export interface EarthFile {
  meta: {
    resolutionDeg: number;
    factors: FactorMeta[];
    generatedAt: string;
    [extra: string]: unknown;
  };
  cells: EarthCell[];
}

export interface TargetValue {
  value: number | null;
  sigma: number | null;
  source: string | null;
  badge: Badge | null;
}

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

export type AnalogKind = 'known' | 'negative' | 'candidate';

export interface Analog {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: AnalogKind;
  analogFor: string[];
  source: string;
}

export interface LithologySimilarity {
  levels: { same: number; related: number; unrelated: number };
  pairs: {
    a: number;
    b: number;
    relation: 'related' | 'unrelated';
    justification: string;
    source: string | null;
  }[];
}

// ---------------------------------------------------------------------------------------------
// Scoring shapes. These mirror the public types of src/lib/scoring (Session C) so that the app,
// the temporary stub and the real library all speak the same language. The app does not import
// from src/lib/scoring directly: everything goes through src/lib/scoringAdapter.ts.
// ---------------------------------------------------------------------------------------------

export type Confidence = 'high' | 'medium' | 'low';
export type UnscoredReason = 'required-factor-missing' | 'coverage-too-low';

/** Result contract from data/SCHEMA.md, "Missing values and confidence". */
export interface CellSummary {
  score: number | null;
  coverage: number;
  missing: string[];
  confidence: Confidence | null;
  unscoredReason: UnscoredReason | null;
}

// The six scoring factors of DESIGN.md section 6.
export const FACTOR_IDS = ['terrain', 'bareGround', 'dryness', 'temperature', 'sunlight', 'rockType'] as const;
export type FactorId = (typeof FACTOR_IDS)[number];
export type Weights = Record<FactorId, number>;

export type SunKey = 'sunElevation' | 'sunSeason';
export type ScoreKey = FactorKey | SunKey;

export interface Preset {
  id: string;
  label: string;
  description?: string;
  weights: Weights;
}

export type KeyStatus = 'scored' | 'missing-earth' | 'missing-target' | 'zero-weight';

export interface KeyBreakdown {
  key: ScoreKey;
  label: string;
  unit: string;
  earthValue: number | null;
  /** Real target value, unclamped. */
  targetValue: number | null;
  /** Target value after clamping to Earth's observed range. */
  targetClamped: number | null;
  sigma: number | null;
  similarity: number | null;
  weight: number;
  status: KeyStatus;
}

export interface FactorBreakdown {
  factor: FactorId;
  label: string;
  /** Normalised weight of the factor (all six sum to 1). */
  weight: number;
  /** The part of `weight` that had data. */
  coveredWeight: number;
  effectiveWeight: number;
  similarity: number | null;
  keys: KeyBreakdown[];
}

export interface CellScore extends CellSummary {
  breakdown: FactorBreakdown[];
  limitingFactor: FactorId | null;
  /** One plain-language sentence explaining the score. */
  reason: string;
}

/** A target value outside anything Earth offers. Feeds "what Earth cannot copy". */
export interface ClampGap {
  key: string;
  label: string;
  unit: string;
  targetValue: number;
  clampedValue: number;
  gap: number;
  earthRange: { min: number; max: number };
}

export interface PreparedTarget {
  target: Target;
  missingTargetKeys: string[];
  gaps: ClampGap[];
  warnings: string[];
}

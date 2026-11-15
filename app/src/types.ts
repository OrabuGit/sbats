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

export type EarthCell = { lat: number; lon: number } & Record<FactorKey, number | null> & {
  /** Share of the cell's land that is permanent snow and ice, 0 to 1. Used by the Bare ground rule. */
  snowIceFrac?: number | null;
  /** Share of the cell's land that is barren, 0 to 1. Stands in for NDVI where NDVI is null. */
  barrenFrac?: number | null;
};

export interface LandCoverMeta {
  source: string;
  keys: { key: string; label: string; unit: string; badge: Badge }[];
  method?: string;
}

export interface EarthFile {
  meta: {
    resolutionDeg: number;
    factors: FactorMeta[];
    generatedAt: string;
    landCover?: LandCoverMeta;
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
  note?: string;
  /** What the site is used for in practice (purpose ids), with a source per use. Known analogs only. */
  usedFor?: string[];
  usedForPrimary?: string;
  usedForSource?: Record<string, string>;
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

// Scoring shapes come straight from the scoring library, so the two cannot drift apart.
// Components still call the library only through src/lib/scoringAdapter.ts.
export { FACTOR_IDS } from './lib/scoring';
export type {
  CellScore,
  CellSummary,
  ClampGap,
  Confidence,
  FactorBreakdown,
  FactorId,
  KeyBreakdown,
  KeyStatus,
  BareGroundSource,
  PreparedTarget,
  Preset,
  ScoreKey,
  SunKey,
  UnscoredReason,
  Weights,
} from './lib/scoring';

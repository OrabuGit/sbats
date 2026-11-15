import type { FactorId, FactorKey, ScoreKey } from './types';

export interface FactorDef {
  id: FactorId;
  label: string;
  /** What the factor measures, for the Method page. */
  measures: string;
  /** Data keys behind the factor. Each key carries an equal share of the factor's weight. */
  keys: readonly ScoreKey[];
}

/**
 * The six scoring factors of the Method page and the data keys behind each
 * (mapping from data/SCHEMA.md, "Factor keys").
 */
export const FACTORS: readonly FactorDef[] = [
  { id: 'terrain', label: 'Terrain', measures: 'Mean slope and elevation roughness', keys: ['slope', 'roughness'] },
  { id: 'bareGround', label: 'Bare ground', measures: 'Lack of vegetation (NDVI)', keys: ['ndvi'] },
  { id: 'dryness', label: 'Dryness', measures: 'Annual precipitation', keys: ['precip'] },
  { id: 'temperature', label: 'Temperature', measures: 'Annual mean and day-night swing', keys: ['tempMean', 'tempRange'] },
  { id: 'sunlight', label: 'Sunlight', measures: 'Annual mean noon Sun elevation, from latitude and axial tilt', keys: ['sunElevation'] },
  { id: 'rockType', label: 'Rock type', measures: 'Dominant rock class', keys: ['lithology'] },
];

export interface KeyInfo {
  label: string;
  /** Display unit. Empty for unitless. Matches data/SCHEMA.md. */
  unit: string;
  /** Decimals shown in plain-language text. */
  decimals: number;
}

export const KEY_INFO: Record<ScoreKey, KeyInfo> = {
  tempMean: { label: 'Mean temperature', unit: '°C', decimals: 0 },
  tempRange: { label: 'Day-night swing', unit: '°C', decimals: 0 },
  precip: { label: 'Precipitation', unit: 'mm/year', decimals: 0 },
  ndvi: { label: 'Vegetation (NDVI)', unit: '', decimals: 2 },
  slope: { label: 'Slope', unit: '°', decimals: 1 },
  roughness: { label: 'Roughness', unit: 'm', decimals: 0 },
  lithology: { label: 'Rock class', unit: '', decimals: 0 },
  sunElevation: { label: 'Noon Sun elevation', unit: '°', decimals: 0 },
};

/** Data keys that must be present for a cell to be scored (data/SCHEMA.md, required factors). */
export const REQUIRED_KEYS: readonly FactorKey[] = ['ndvi', 'precip'];

/** Present factors must cover at least this share of the preset's total weight. */
export const MIN_COVERAGE = 0.6;

/** Confidence levels: high when coverage is 1, medium when at least this, otherwise low. */
export const MEDIUM_CONFIDENCE_COVERAGE = 0.8;

/**
 * Coverage is a sum of floating-point weights (0.25 + 0.2 + 0.15 ... ). It is rounded to this many
 * decimals before it is compared with the limits, so that 0.6 means 0.6.
 */
export const COVERAGE_DECIMALS = 9;

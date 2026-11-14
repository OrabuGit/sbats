// TEST FIXTURES. Made-up numbers for unit tests only. Never shown as real data.

import { gaussianSimilarity, clampToRange } from '../similarity';
import { SUN_ELEVATION_SIGMA_DEG, sunElevation } from '../sunlight';
import type { EarthCell, EarthRanges, FactorKey, LithologyTable, Target, TargetValue, Weights } from '../types';

export const BASE: Weights = { terrain: 0.25, bareGround: 0.2, dryness: 0.15, temperature: 0.15, sunlight: 0.1, rockType: 0.15 };

/** Ranges wide enough that the fixture target is never clamped. */
export const WIDE_RANGES: EarthRanges = {
  tempMean: { min: -60, max: 40 },
  tempRange: { min: 0, max: 50 },
  precip: { min: 0, max: 6000 },
  ndvi: { min: -0.2, max: 0.95 },
  slope: { min: 0, max: 45 },
  roughness: { min: 0, max: 3000 },
  sunElevation: { min: 0, max: 90 },
};

/** Three rock classes: 1 and 2 related, 3 unrelated to both. */
export const TABLE: LithologyTable = {
  levels: { same: 1.0, related: 0.6, unrelated: 0.15 },
  pairs: [
    { a: 1, b: 2, relation: 'related', justification: 'fixture: both volcanic', source: null },
    { a: 1, b: 3, relation: 'unrelated', justification: 'fixture: different origin', source: null },
    { a: 2, b: 3, relation: 'unrelated', justification: 'fixture: different origin', source: null },
  ],
};

export const CLASSES = [
  { code: 1, label: 'fixture class one' },
  { code: 2, label: 'fixture class two' },
  { code: 3, label: 'fixture class three' },
];

function tv(value: number | null, sigma: number | null): TargetValue {
  return value === null
    ? { value: null, sigma: null, source: null, badge: null }
    : { value, sigma, source: 'fixture', badge: 'Literature' };
}

export const TARGET_LAT = 20;

export function makeTarget(overrides: Partial<Record<FactorKey, TargetValue>> = {}, extra: Partial<Target> = {}): Target {
  return {
    id: 'mars-fixture',
    name: 'Fixture Planitia',
    body: 'mars',
    lat: TARGET_LAT,
    lon: 0,
    summary: 'Test fixture, not a real site.',
    values: {
      tempMean: tv(10, 10),
      tempRange: tv(20, 10),
      precip: tv(0, 250),
      ndvi: tv(0.05, 0.1),
      slope: tv(5, 5),
      roughness: tv(100, 100),
      lithology: tv(1, null),
      ...overrides,
    },
    cannotCopy: ['fixture'],
    ...extra,
  };
}

/** A cell that matches the fixture target exactly on every data key. */
export function makeCell(overrides: Partial<EarthCell> = {}): EarthCell {
  return {
    lat: TARGET_LAT,
    lon: 0,
    tempMean: 10,
    tempRange: 20,
    precip: 0,
    ndvi: 0.05,
    slope: 5,
    roughness: 100,
    lithology: 1,
    ...overrides,
  };
}

export const NULL_VALUE: TargetValue = { value: null, sigma: null, source: null, badge: null };

/**
 * Sunlight similarity between an Earth latitude and the fixture target, written out from the
 * definition so tests can include it in hand calculations.
 */
export function sunSimilarity(cellLat: number, target: Target, ranges: EarthRanges = WIDE_RANGES): number {
  const range = ranges.sunElevation;
  const t = sunElevation(target.body, target.lat);
  const clamped = range ? clampToRange(t, range) : t;
  return gaussianSimilarity(sunElevation('earth', cellLat), clamped, SUN_ELEVATION_SIGMA_DEG);
}

/**
 * Independent statement of the overall formula, in its plain product form:
 * 100 * product( s_i ^ (w_i / sum of w) ). The library computes it in log space.
 */
export function productScore(parts: readonly { s: number; w: number }[]): number {
  const total = parts.reduce((sum, p) => sum + p.w, 0);
  return 100 * parts.reduce((product, p) => product * p.s ** (p.w / total), 1);
}

export function near(actual: number | null, expected: number, tolerance = 1e-9): boolean {
  return actual !== null && Math.abs(actual - expected) <= tolerance;
}

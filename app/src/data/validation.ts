// Shapes of the files written by /validation (Session C) and published by the build.
// Only the fields the pages use are listed. Everything is read as written: no number is retyped here.
import { loadExtra } from './access';
import type { Confidence, FactorId } from '../types';

export interface SetStats {
  knownSites: number;
  negativeSites: number;
  positiveCases: number;
  rocAuc: number | null;
  top10Share: number | null;
  casesInTop10: number;
  knownSitesInTop10AnyTarget: number;
  knownSitesUnscored: number;
  meanPercentile: number | null;
  meanScoreKnown: number | null;
  meanScoreNegative: number | null;
  limitingFactorShare: Partial<Record<FactorId, number>>;
}

export interface SiteResult {
  target: string;
  score: number | null;
  shareAbove: number | null;
  inTop10: boolean;
  coverage: number;
  confidence: Confidence | null;
  missing: string[];
  limitingFactor: FactorId | null;
  reason: string;
}

export interface ReportSite {
  set?: 'tuning' | 'holdout';
  id: string;
  name: string;
  kind: 'known' | 'negative' | 'candidate';
  lat: number;
  lon: number;
  cell: { lat: number; lon: number; distanceKm: number } | null;
  analogFor: string[];
  results: Record<string, SiteResult>;
}

type Split = Record<'overall' | 'moon' | 'mars', SetStats>;

export interface ValidationReport {
  status: string;
  statusNote: string;
  generatedAt: string;
  preset: string;
  earth: { generatedAt: string; resolutionDeg: number; cells: number };
  frozenAt: string;
  split: { seed: number; tuning: number; holdout: number; excludedCandidates: string[] };
  sets: Record<'tuning' | 'holdout' | 'all', Split>;
  targetsMissingValues: Record<string, string[]>;
  definitions: Record<string, string>;
  warnings: string[];
  negativeControls: { id: string; name: string; set: string; bestRank: SiteResult }[];
  sites: ReportSite[];
}

export interface CandidatesFile {
  generatedAt: string;
  presets: Record<string, ReportSite[]>;
}

interface Tunables {
  tempMeanSigma: number;
  tempRangeSigma: number;
  precipSigma: number;
  ndviSigma: number;
  terrainFraction: number;
  sunSigma: number;
}
export interface FrozenFile {
  frozenAt: string;
  rule: string;
  objective: string;
  before: Tunables;
  after: Tunables;
  changes: unknown[];
  evaluations: number;
  tuningSet: { objectiveBefore: number; objectiveAfter: number };
}

export interface SourceTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export const loadReport = (preset: string) => loadExtra<ValidationReport>(`validation-report-${preset}.json`);
export const loadCandidates = () => loadExtra<CandidatesFile>('validation-candidates.json');
export const loadFrozen = () => loadExtra<FrozenFile>('validation-frozen.json');
export const loadSources = () => loadExtra<SourceTable[]>('sources.json');

interface Group {
  sites: number;
  meanPercentile: number | null;
  top10: number;
  top25: number;
}
/** validation/output/purposes.json: do sites used for a purpose rank higher on that purpose's ranking? */
export interface PurposesFile {
  generatedAt: string;
  caveat: string;
  percentile: string;
  byPurpose: {
    purpose: string;
    label: string;
    sitesUsedForIt: string[];
    onPurposeRanking: Group;
    sameSitesOnAllRoundScore: Group;
    otherKnownSitesOnPurposeRanking: Group;
  }[];
  byDimension: { dimension: string; label: string; sitesKnownForIt: Group; otherKnownSites: Group }[];
  shareOfEarthCellsWithTheSameRockClassAsTheTarget: Record<string, number | null>;
}
export const loadPurposes = () => loadExtra<PurposesFile>('validation-purposes.json');

// ---------------------------------------------------------------------------------------------
// Two optional files, published later by another session. Until they exist the page shows nothing
// for them. Both are read defensively: anything that does not look right is dropped, never thrown.
//
// data/validation_ablation.json, "remove one factor at a time". Percentiles are fractions 0 to 1
// (the share of Earth cells a known analog outscores, hold-out set, chance 0.5):
//   {
//     "generatedAt": "2026-11-16",
//     "metric": "Mean percentile of the hold-out analogs",
//     "full": 0.716,                       // the full model, nothing removed
//     "factors": [
//       { "factor": "ndvi", "label": "Bare ground", "without": 0.70, "change": -0.016 }
//     ]                                    // "change" = without minus full; computed here if absent
//   }
//   A bare array of the same factor rows is also accepted ("full" is then unknown).
//
// data/validation_agreement.json, "do independent datasets agree":
//   {
//     "generatedAt": "2026-11-16",
//     "pairs": [
//       { "label": "Elevation", "a": "Copernicus DEM", "b": "SRTM", "agreement": 0.93, "n": 120,
//         "unit": "cells", "metric": "share of cells within one tolerance" }
//     ]                                    // "agreement" 0 to 1; "n" = sample size
//   }
//   A bare array of the same pair rows is also accepted.
// ---------------------------------------------------------------------------------------------

export interface AblationFactor {
  /** Factor key, as written in the file. */
  factor: string;
  /** Plain name from the file, if any. */
  label: string | null;
  /** Overall percentile (0 to 1) with this factor removed. */
  without: number;
  /** Change against the full model, in fraction points. Null when it cannot be worked out. */
  change: number | null;
}
export interface AblationData {
  metric: string | null;
  /** The full model's overall percentile (0 to 1), or null. */
  full: number | null;
  factors: AblationFactor[];
}
export interface AgreementPair {
  label: string | null;
  a: string;
  b: string;
  /** 0 to 1. */
  agreement: number;
  /** Sample size, a whole number above 0. */
  n: number;
  unit: string | null;
  metric: string | null;
}
export interface AgreementData {
  pairs: AgreementPair[];
}

const rec = (v: unknown): Record<string, unknown> | null => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const txt = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
/** A share written as 0 to 1, or by mistake as 0 to 100. */
const share = (v: unknown): number | null => {
  const n = num(v);
  if (n === null || n < 0 || n > 100) return null;
  return n > 1 ? n / 100 : n;
};
const rowsOf = (raw: unknown, key: string): unknown[] | null => {
  if (Array.isArray(raw)) return raw;
  const o = rec(raw);
  return o && Array.isArray(o[key]) ? (o[key] as unknown[]) : null;
};

export function parseAblation(raw: unknown): AblationData | null {
  try {
    const rows = rowsOf(raw, 'factors');
    if (!rows) return null;
    const o = rec(raw);
    const full = o ? share(o.full) : null;
    const factors: AblationFactor[] = [];
    for (const row of rows) {
      const r = rec(row);
      const factor = r ? txt(r.factor) : null;
      const without = r ? share(r.without) : null;
      if (!r || !factor || without === null) continue;
      let change = num(r.change);
      if (change !== null && Math.abs(change) > 1) change /= 100;
      if (change === null && full !== null) change = without - full;
      factors.push({ factor, label: txt(r.label), without, change });
    }
    return factors.length ? { metric: o ? txt(o.metric) : null, full, factors } : null;
  } catch {
    return null;
  }
}

export function parseAgreement(raw: unknown): AgreementData | null {
  try {
    const rows = rowsOf(raw, 'pairs');
    if (!rows) return null;
    const pairs: AgreementPair[] = [];
    for (const row of rows) {
      const r = rec(row);
      if (!r) continue;
      const a = txt(r.a);
      const b = txt(r.b);
      const agreement = share(r.agreement);
      const n = num(r.n);
      if (!a || !b || agreement === null || n === null || n < 1 || !Number.isInteger(n)) continue;
      pairs.push({ label: txt(r.label), a, b, agreement, n, unit: txt(r.unit), metric: txt(r.metric) });
    }
    return pairs.length ? { pairs } : null;
  } catch {
    return null;
  }
}

export const loadAblation = (): Promise<AblationData | null> =>
  loadExtra<unknown>('validation_ablation.json').then(parseAblation, () => null);
export const loadAgreement = (): Promise<AgreementData | null> =>
  loadExtra<unknown>('validation_agreement.json').then(parseAgreement, () => null);

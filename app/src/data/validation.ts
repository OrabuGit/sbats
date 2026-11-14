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

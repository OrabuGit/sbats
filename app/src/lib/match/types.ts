// Types for the match record: everything the comparison screen shows about one target and one
// Earth place, in a shape that does not change with what data happens to exist.

import type { Badge, Confidence, DimensionId, EarthCell, FactorId, FactorKey, PurposeId, UnscoredReason } from '../scoring/index';
import type { ProfileOrigin } from '../targets/index';

/** The three-level verdict of a comparison, plus "no data" when one side has no value. */
export type Verdict = 'matches' | 'partly' | 'does-not-match' | 'no-data';

/** What a value describes: the 0.5 degree cell, the site's own footprint, the whole volcano, or geometry. */
export type ValueScale = 'grid' | 'site' | 'volcano' | 'computed' | 'target';

/** One side of one comparison row. `value` is the raw value; `text` is the same value ready to print. */
export interface MatchSide {
  value: number | string | null;
  /** Printable value with its unit, or "no data". */
  text: string;
  source: string | null;
  badge: Badge | null;
  scale: ValueScale | null;
  note?: string;
}

/** One measured quantity, compared on both sides. */
export interface MatchRow {
  /** Stable key: a data key ("slope"), "sunElevation", or an extra key ("minerals"). */
  key: string;
  label: string;
  unit: string;
  earth: MatchSide;
  target: MatchSide;
  /** 0 to 1, or null when the row could not be compared. */
  similarity: number | null;
  verdict: Verdict;
  /** One plain sentence: why the verdict is what it is. */
  reason: string;
}

/** Dimension ids: the five of the analog profile, plus those added after the freeze. */
export type ExtraDimensionId = 'minerals' | 'wind' | 'dust' | 'ice';
export type MatchDimensionId = DimensionId | ExtraDimensionId;

export interface MatchDimension {
  id: MatchDimensionId;
  label: string;
  measures: string;
  /** True for the five dimensions behind the frozen all-round score. */
  inScore: boolean;
  /** True for a dimension added after the freeze of 2026-11-14: shown and used in purposes, never in the all-round score. */
  addedAfterFreeze: boolean;
  similarity: number | null;
  verdict: Verdict;
  reason: string;
  /** Tie-fair percentile of the similarity among all Earth cells, when a profile index was given. */
  percentile: number | null;
  rows: MatchRow[];
}

export interface MatchPurpose {
  id: PurposeId;
  label: string;
  why: string;
  /** The purpose score with the frozen Base weights, 0 to 100, or null when it cannot be computed. */
  score: number | null;
  verdict: Verdict;
  /** Dimensions added after the freeze that belong to this purpose and have data here. */
  extraDimensions: ExtraDimensionId[];
  /**
   * The purpose score with those extra dimensions blended in (see extras.ts for the rule), or null
   * when no extra dimension has data. Not validated.
   */
  extendedScore: number | null;
}

/** An Earth place prepared for comparison: the cell to score and where each value came from. */
export interface EarthPlace {
  id: string | null;
  name: string;
  lat: number;
  lon: number;
  /** "site" when terrain, vegetation and rock come from the site's own footprint. Climate is always the grid's. */
  scale: 'grid' | 'site';
  footprintKm: number | null;
  /** The values the scoring functions read. */
  cell: EarthCell;
  /** Source, badge and scale for each value in `cell`. */
  provenance: Partial<Record<FactorKey | 'snowIceFrac' | 'barrenFrac', { source: string | null; badge: Badge | null; scale: ValueScale }>>;
  /** The rock as the source names it, when known ("Andesite / Basaltic Andesite"). */
  rockName: string | null;
  /** Share of the footprint that is bare ground, 0 to 1, when measured (site scale only). */
  bareShare: number | null;
  /** Values for dimensions added after the freeze. */
  extras: Partial<Record<ExtraDimensionId, ExtraValue>>;
  /** Caveats that must be shown with the place. */
  notes: string[];
}

/** One side's value for a dimension added after the freeze. */
export interface ExtraValue {
  /** A number (wind speed, dust, ice share) or a list of mineral family ids. null when unknown. */
  value: number | string[] | null;
  unit: string;
  /** Printable form. */
  text: string;
  source: string | null;
  badge: Badge | null;
  scale: ValueScale;
  note?: string;
}

export interface MatchRecord {
  /** Shape version. Fields are only ever added. */
  version: 1;
  generatedAt: string;
  target: {
    id: string;
    name: string;
    body: 'moon' | 'mars';
    lat: number;
    lon: number;
    summary: string;
    /** curated, grid or none: see app/src/lib/targets. */
    origin: ProfileOrigin;
    confidence: Confidence;
    missing: FactorKey[];
    notes: string[];
  };
  earth: {
    id: string | null;
    name: string;
    lat: number;
    lon: number;
    scale: 'grid' | 'site';
    footprintKm: number | null;
    rockName: string | null;
    bareShare: number | null;
    notes: string[];
  };
  /** The frozen all-round score for this pair. */
  score: {
    preset: string;
    value: number | null;
    verdict: Verdict;
    confidence: Confidence | null;
    coverage: number;
    missing: FactorKey[];
    unscoredReason: UnscoredReason | null;
    limitingFactor: FactorId | null;
    reason: string;
  };
  /** Always the same five, in the same order, then every dimension added after the freeze. */
  dimensions: MatchDimension[];
  /** Always the same five purposes, in the same order. */
  purposes: MatchPurpose[];
  /** What no place on Earth can copy: the target's own sentences. Never part of any score. */
  cannotCopy: string[];
  /** Target values beyond anything Earth offers: the score compares with Earth's closest value instead. */
  beyondEarth: { key: string; label: string; text: string }[];
  /** One line each: the strongest and the weakest dimension. */
  headline: { strongest: string | null; weakest: string | null };
  /** Things a reader must know before trusting the numbers. */
  caveats: string[];
}

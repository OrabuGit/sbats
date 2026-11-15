// Types for "a target from anywhere": named places on the Moon and Mars (data/known_sites.json) and
// target profiles built for any latitude and longitude from a global grid of that body.

import type { Badge, Confidence, FactorKey, Target } from '../scoring/index';

export type TargetBody = 'moon' | 'mars';

/** One entry of data/known_sites.json: a real, named place a user can pick. */
export interface KnownSite {
  id: string;
  name: string;
  body: TargetBody;
  /** Degrees, north positive. */
  lat: number;
  /** Degrees, east positive, -180 to 180. */
  lon: number;
  kind: 'landing-site' | 'candidate-region';
  mission: string | null;
  agency: string | null;
  /** Landing date (ISO), or null for a candidate. */
  date: string | null;
  status: string;
  /** Where the coordinates were read. */
  source: string;
  url: string;
  /** primary: read in an agency page or paper. secondary: read on a reference page that quotes one. */
  access: 'primary' | 'secondary';
  note?: string | null;
  /** The curated target in data/targets.json that describes this place, when there is one. */
  targetId?: string | null;
}

export interface KnownSitesFile {
  meta: { generatedAt: string; note: string; coordinateConvention: string };
  sites: KnownSite[];
}

/** One cell of a global Moon or Mars grid. Shaped like an Earth cell; any key may be absent or null. */
export interface BodyGridCell {
  lat: number;
  lon: number;
  slope?: number | null;
  roughness?: number | null;
  tempMean?: number | null;
  tempRange?: number | null;
  lithology?: number | null;
  [extra: string]: number | string | null | undefined;
}

export interface BodyGridFactor {
  key: string;
  label?: string;
  unit?: string;
  source: string;
  badge?: Badge;
}

/** A global grid of one body, as Session B publishes it (data/SCHEMA.md). */
export interface BodyGrid {
  meta: {
    body: TargetBody;
    resolutionDeg: number;
    generatedAt?: string;
    factors: BodyGridFactor[];
    /** Keys that are not in the file because the answer is a fact, with the reason ("No atmosphere, so no wind"). */
    notInFile?: Record<string, string>;
  };
  cells: BodyGridCell[];
}

/** One target-side value for a dimension added after the freeze (wind, dust, ice). Same shape as data/target_environment.json. */
export interface ProfileEnvironmentValue {
  value: number | null;
  unit: string;
  source: string | null;
  badge: Badge | null;
  note?: string | null;
}

/** Where a target profile's values came from. */
export type ProfileOrigin = 'curated' | 'grid' | 'none';

export interface TargetProfile {
  /**
   * curated: a hand-checked target of data/targets.json lies at this place and is returned as it is.
   * grid: built from the global grid cell that holds the point.
   * none: no grid is loaded, or it has no cell here. Only the values every place on the body shares are filled.
   */
  origin: ProfileOrigin;
  /** A complete Target, ready for prepareTarget() and the scoring functions. */
  target: Target;
  /**
   * How far to trust the profile. A curated target is as good as its own coverage. A grid profile is
   * one level lower than its coverage would give, because one 0.5 degree value stands for the place.
   */
  confidence: Confidence;
  /** Data keys with no value on the target side. Scores leave these out. */
  missing: FactorKey[];
  /** Share of the Base weights that the target side can supply, 0 to 1. */
  coverage: number;
  /**
   * False when the target has no temperature at all. Scores then leave temperature out, and since
   * temperature is what holds most Earth places back for every other target, they run far higher and
   * must not be set beside scores for other targets. Show the warning in `notes` wherever a score is shown.
   */
  scoresComparable: boolean;
  /** Plain sentences to show with the profile. */
  notes: string[];
  /** The grid cell used, for origin "grid". */
  cell: { lat: number; lon: number; distanceKm: number } | null;
  /** The curated target used, for origin "curated". */
  curated: { id: string; distanceKm: number } | null;
  /** The nearest named place within the search radius, if any. */
  knownSite: { site: KnownSite; distanceKm: number } | null;
  /**
   * Wind, dust and ground ice at the point, read from the grid cell, for the dimensions added after the
   * freeze. Empty for a curated target (use data/target_environment.json for those) and when there is no cell.
   */
  environment: Partial<Record<'wind' | 'dust' | 'ice', ProfileEnvironmentValue>>;
}

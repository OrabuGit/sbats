// A target profile for any latitude and longitude on the Moon or Mars.
//
// Order of preference:
//   1. A curated target of data/targets.json at this place. Its values are cited and hand-checked, so
//      it is returned unchanged.
//   2. The cell of the body's global grid (Session B) that holds the point. One 0.5 degree value
//      then stands for the place, so the profile's confidence is one level lower.
//   3. Nothing: only the values every place on the body shares (no rain, bare ground). Scores
//      built on such a profile fall under the minimum coverage and show "no data".
//
// Nothing here changes the frozen score. A grid profile is an ordinary Target: the tolerances are
// read from the curated targets (the frozen ones), never typed here.

import { FACTORS, FACTOR_KEYS, MEDIUM_CONFIDENCE_COVERAGE, PRESETS } from '../scoring/index';
import type { Badge, Confidence, FactorKey, Target, TargetValue } from '../scoring/index';
import { distanceKm, formatPoint, kmPerDegree, normaliseLon, validPoint } from './geo';
import type { BodyGrid, BodyGridCell, KnownSite, TargetBody, TargetProfile } from './types';

/**
 * A curated target is used for any point inside the window its values were measured over:
 * half of 55.6 km (data/SCHEMA.md, "Terrain method").
 */
export const CURATED_RADIUS_KM = 27.8;
/** A named place is reported when it lies within this distance of the point. */
export const KNOWN_SITE_RADIUS_KM = 27.8;
/** A grid cell is used when its centre is within this many cell widths of the point (half a diagonal, with a margin). */
export const GRID_SNAP_CELLS = 0.75;

/** Floors of the terrain tolerance rule (data/REVIEW_ME.md, "Design parameters"): 1 degree and 50 m. */
export const SLOPE_SIGMA_FLOOR = 1;
export const ROUGHNESS_SIGMA_FLOOR = 50;

const GRID_KEYS = ['tempMean', 'tempRange', 'slope', 'roughness', 'lithology'] as const;
type GridKey = (typeof GRID_KEYS)[number];

export interface Tolerances {
  tempMean: number;
  tempRange: number;
  /** Terrain tolerance as a share of the target value (above the floors). */
  terrainFraction: number;
}

/**
 * Reads the frozen tolerances from the curated targets, so that a grid profile uses exactly the
 * same ones. Throws if the curated targets disagree with each other, which the data tests forbid.
 */
export function tolerancesFrom(curated: readonly Target[]): Tolerances {
  const one = (key: 'tempMean' | 'tempRange'): number => {
    const set = new Set(curated.map((t) => t.values[key].sigma).filter((s): s is number => s !== null));
    if (set.size !== 1) throw new RangeError(`curated targets must share one "${key}" tolerance, found ${[...set].join(', ') || 'none'}`);
    return [...set][0] as number;
  };
  const fractions = new Set<number>();
  for (const t of curated) {
    for (const [key, floor] of [['slope', SLOPE_SIGMA_FLOOR], ['roughness', ROUGHNESS_SIGMA_FLOOR]] as const) {
      const v = t.values[key];
      if (v.value === null || v.sigma === null || v.sigma <= floor) continue;
      fractions.add(Math.round((v.sigma / v.value) * 100) / 100);
    }
  }
  if (fractions.size !== 1) throw new RangeError(`curated targets must share one terrain tolerance fraction, found ${[...fractions].join(', ') || 'none'}`);
  return { tempMean: one('tempMean'), tempRange: one('tempRange'), terrainFraction: [...fractions][0] as number };
}

const NO_VALUE: TargetValue = { value: null, sigma: null, source: null, badge: null };

function round(v: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

/** Share of the Base weights the target side can supply, and the keys it cannot. Sunlight always counts. */
export function targetCoverage(target: Target): { coverage: number; missing: FactorKey[] } {
  const weights = PRESETS.base.weights;
  const total = FACTORS.reduce((sum, f) => sum + weights[f.id], 0);
  let covered = 0;
  for (const f of FACTORS) {
    const share = weights[f.id] / f.keys.length;
    for (const key of f.keys) {
      if (key === 'sunElevation' || target.values[key].value !== null) covered += share;
    }
  }
  return { coverage: round(covered / total, 9), missing: FACTOR_KEYS.filter((k) => target.values[k].value === null) };
}

function level(coverage: number): Confidence {
  if (coverage >= 1) return 'high';
  return coverage >= MEDIUM_CONFIDENCE_COVERAGE ? 'medium' : 'low';
}

function oneLower(c: Confidence): Confidence {
  return c === 'high' ? 'medium' : 'low';
}

/** The grid cell whose centre is nearest the point, if it is near enough to hold it. */
export function nearestGridCell(grid: BodyGrid, lat: number, lon: number): { cell: BodyGridCell; distanceKm: number } | null {
  const body = grid.meta.body;
  const l = normaliseLon(lon);
  let best: BodyGridCell | null = null;
  let bestD = Infinity;
  // A cheap latitude test first: most cells are many rows away.
  const band = grid.meta.resolutionDeg * 1.5;
  for (const c of grid.cells) {
    if (Math.abs(c.lat - lat) > band) continue;
    const d = distanceKm(body, lat, l, c.lat, c.lon);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  const limit = GRID_SNAP_CELLS * grid.meta.resolutionDeg * kmPerDegree(body);
  return best && bestD <= limit ? { cell: best, distanceKm: bestD } : null;
}

/** The named place nearest a point, within `radiusKm`. */
export function nearestKnownSite(
  sites: readonly KnownSite[],
  body: TargetBody,
  lat: number,
  lon: number,
  radiusKm: number = KNOWN_SITE_RADIUS_KM,
): { site: KnownSite; distanceKm: number } | null {
  let best: { site: KnownSite; distanceKm: number } | null = null;
  for (const site of sites) {
    if (site.body !== body) continue;
    const d = distanceKm(body, lat, lon, site.lat, site.lon);
    if (d <= radiusKm && (!best || d < best.distanceKm)) best = { site, distanceKm: d };
  }
  return best;
}

export interface TargetFromPointOptions {
  /** The body's global grid, or null when it is not loaded or not published yet. */
  grid: BodyGrid | null;
  /** data/targets.json. Curated targets are preferred, and they supply the tolerances and the shared values. */
  curated: readonly Target[];
  /** data/known_sites.json `sites`, to name the place. Optional. */
  knownSites?: readonly KnownSite[];
  /** A name for the target. Defaults to the named place nearby, else the coordinates. */
  name?: string;
}

function pointId(body: TargetBody, lat: number, lon: number): string {
  const part = (v: number, pos: string, neg: string): string => `${Math.round(Math.abs(v) * 100)}${v >= 0 ? pos : neg}`;
  return `${body}-point-${part(lat, 'n', 's')}-${part(lon, 'e', 'w')}`;
}

/** The "what Earth cannot copy" sentences every curated target of a body shares (gravity, atmosphere, radiation). */
export function sharedCannotCopy(curated: readonly Target[], body: TargetBody): string[] {
  const same = curated.filter((t) => t.body === body);
  if (same.length === 0) return [];
  return (same[0] as Target).cannotCopy.filter((line) => same.every((t) => t.cannotCopy.includes(line)));
}

/**
 * Builds the target profile for a point. See the top of this file for the order of preference.
 * Throws RangeError for a point outside -90..90 latitude.
 */
export function targetFromPoint(body: TargetBody, lat: number, lon: number, options: TargetFromPointOptions): TargetProfile {
  if (!validPoint(lat, lon)) throw new RangeError(`not a valid point: ${lat}, ${lon}`);
  const l = normaliseLon(lon);
  const sameBody = options.curated.filter((t) => t.body === body);
  const knownSite = options.knownSites ? nearestKnownSite(options.knownSites, body, lat, l) : null;

  // 1. A curated target at this place: by link from the named place, or by distance.
  let curated: { target: Target; distanceKm: number } | null = null;
  for (const t of sameBody) {
    const d = distanceKm(body, lat, l, t.lat, t.lon);
    if (d <= CURATED_RADIUS_KM && (!curated || d < curated.distanceKm)) curated = { target: t, distanceKm: d };
  }
  if (curated) {
    const { coverage, missing } = targetCoverage(curated.target);
    const notes = [`Curated target: every value is cited or measured for this place (data/targets.json). It lies ${curated.distanceKm.toFixed(1)} km from the point picked.`];
    if (missing.length > 0) notes.push(`No published value for: ${missing.join(', ')}.`);
    return {
      origin: 'curated',
      target: curated.target,
      confidence: level(coverage),
      missing,
      coverage,
      notes,
      cell: null,
      curated: { id: curated.target.id, distanceKm: round(curated.distanceKm, 2) },
      knownSite,
    };
  }

  // 2 and 3. Build a target. Values shared by every place on the body come from a curated target.
  const template = sameBody[0];
  const values: Record<FactorKey, TargetValue> = {
    tempMean: NO_VALUE,
    tempRange: NO_VALUE,
    precip: template ? template.values.precip : NO_VALUE,
    ndvi: template ? template.values.ndvi : NO_VALUE,
    slope: NO_VALUE,
    roughness: NO_VALUE,
    lithology: NO_VALUE,
  };
  const notes: string[] = [];
  const hit = options.grid && options.grid.meta.body === body ? nearestGridCell(options.grid, lat, l) : null;
  let cell: TargetProfile['cell'] = null;

  if (hit && options.grid) {
    const tol = tolerancesFrom(options.curated);
    const res = options.grid.meta.resolutionDeg;
    const where = `${res} degree grid cell centred ${formatPoint(hit.cell.lat, hit.cell.lon)}`;
    const factor = (key: GridKey): { source: string; badge: Badge } | null => {
      const f = options.grid?.meta.factors.find((x) => x.key === key);
      return f ? { source: `${f.source} (${where})`, badge: f.badge ?? 'Mission' } : null;
    };
    const sigma = (key: GridKey, value: number): number | null => {
      if (key === 'tempMean') return tol.tempMean;
      if (key === 'tempRange') return tol.tempRange;
      if (key === 'slope') return round(Math.max(SLOPE_SIGMA_FLOOR, tol.terrainFraction * value), 2);
      if (key === 'roughness') return round(Math.max(ROUGHNESS_SIGMA_FLOOR, tol.terrainFraction * value), 1);
      return null;
    };
    for (const key of GRID_KEYS) {
      const raw = hit.cell[key];
      const f = factor(key);
      // A value with no stated source is not used: "no data" is better than an unsourced number.
      if (typeof raw !== 'number' || !Number.isFinite(raw) || !f) continue;
      values[key] = { value: raw, sigma: sigma(key, raw), source: f.source, badge: f.badge, note: 'Grid value for the cell that holds the point, not a value measured for this place.' };
    }
    cell = { lat: hit.cell.lat, lon: hit.cell.lon, distanceKm: round(hit.distanceKm, 2) };
    notes.push(`Built from the ${where}. One grid value stands for the whole cell, so confidence is one level lower than for a curated target.`);
  } else if (options.grid && options.grid.meta.body === body) {
    notes.push('The global grid has no cell at this point. Only the values every place on this body shares are filled in.');
  } else {
    notes.push(`No global grid of ${body === 'moon' ? 'the Moon' : 'Mars'} is loaded. Only the values every place on this body shares are filled in.`);
  }
  if (!template) notes.push('No curated target exists for this body, so precipitation and bare ground have no reference value.');

  const named = options.name ?? (knownSite ? knownSite.site.name : `${body === 'moon' ? 'Moon' : 'Mars'}, ${formatPoint(lat, l)}`);
  const target: Target = {
    id: pointId(body, lat, l),
    name: named,
    body,
    lat,
    lon: l,
    summary: knownSite
      ? `${knownSite.site.name}: ${knownSite.site.status}${knownSite.site.mission ? `, ${knownSite.site.mission}` : ''}. Target values are grid values for the surrounding cell, not measurements at the site.`
      : 'A point picked on the map. Target values are grid values for the surrounding cell, not those of a studied site.',
    values,
    cannotCopy: sharedCannotCopy(options.curated, body),
  };
  const { coverage, missing } = targetCoverage(target);
  if (missing.length > 0) notes.push(`No value for: ${missing.join(', ')}. Scores leave these out, and with too little left they show "no data".`);
  if (knownSite) notes.push(`Nearest named place: ${knownSite.site.name}, ${knownSite.distanceKm.toFixed(1)} km away (${knownSite.site.source}).`);
  return {
    origin: hit ? 'grid' : 'none',
    target,
    confidence: hit ? oneLower(level(coverage)) : 'low',
    missing,
    coverage,
    notes,
    cell,
    curated: null,
    knownSite,
  };
}

/** The target profile for a named place: its curated target when it is linked to one, else from its coordinates. */
export function targetFromKnownSite(site: KnownSite, options: TargetFromPointOptions): TargetProfile {
  const linked = site.targetId ? options.curated.find((t) => t.id === site.targetId) : undefined;
  if (linked) {
    const { coverage, missing } = targetCoverage(linked);
    const d = distanceKm(site.body, site.lat, site.lon, linked.lat, linked.lon);
    return {
      origin: 'curated',
      target: linked,
      confidence: level(coverage),
      missing,
      coverage,
      notes: [`Curated target for this place (data/targets.json), centred ${d.toFixed(1)} km from the listed coordinates.`],
      cell: null,
      curated: { id: linked.id, distanceKm: round(d, 2) },
      knownSite: { site, distanceKm: 0 },
    };
  }
  const profile = targetFromPoint(site.body, site.lat, site.lon, { ...options, name: options.name ?? site.name, knownSites: [site] });
  return profile;
}

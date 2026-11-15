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
import type { BodyGrid, BodyGridCell, KnownSite, ProfileEnvironmentValue, TargetBody, TargetProfile } from './types';
import { plainKeys } from '../format';

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

/** The warning shown when a target has no temperature at all. */
export const NO_TEMPERATURE_WARNING =
  'This target has no temperature value, so scores leave temperature out. Temperature is what holds most Earth places back for every other target, so scores here run much higher and must not be compared with scores for other targets.';

/** True when the target side has at least one temperature value, so its scores can be set beside those of other targets. */
export function scoresComparable(target: Target): boolean {
  return target.values.tempMean.value !== null || target.values.tempRange.value !== null;
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

/**
 * Wind, dust and ground ice of a grid cell, as target-side values for the dimensions added after the freeze.
 *   wind  `windSpeed` (m/s at 10 m). On a body whose grid says it has no atmosphere, 0 by fact.
 *   dust  `dustOpticalDepth` (column, visible light). 0 by fact on an airless body.
 *   ice   `psrFrac`: the share of the cell in permanent shadow, where ice can survive (shadow, not ice).
 *         A water content by weight (`waterH2O`) is a different quantity from a share of ground: it is
 *         quoted in the note and not used as the value.
 */
export function gridEnvironment(grid: BodyGrid, cell: BodyGridCell): TargetProfile['environment'] {
  const where = `${grid.meta.resolutionDeg} degree grid cell centred ${formatPoint(cell.lat, cell.lon)}`;
  const factor = (key: string) => grid.meta.factors.find((f) => f.key === key);
  const read = (key: string, unit: string): ProfileEnvironmentValue | null => {
    const f = factor(key);
    const raw = cell[key];
    if (f && typeof raw === 'number' && Number.isFinite(raw)) return { value: raw, unit, source: `${f.source} (${where})`, badge: f.badge ?? 'Mission', note: 'Grid value for the cell that holds the point.' };
    const fact = grid.meta.notInFile?.[key];
    if (fact && /\(0\b|\b0 m\/s/.test(fact)) return { value: 0, unit, source: `Stated as a fact in the grid file: ${fact}`, badge: 'Literature', note: fact };
    if (f) return { value: null, unit, source: null, badge: null, note: 'The grid has no value for this cell.' };
    return null;
  };
  const out: TargetProfile['environment'] = {};
  const wind = read('windSpeed', 'm/s');
  if (wind) out.wind = wind;
  const dust = read('dustOpticalDepth', 'optical depth');
  if (dust) out.dust = dust;
  const shadow = read('psrFrac', 'share of ground');
  if (shadow) {
    out.ice = shadow.value === null ? shadow : { ...shadow, note: 'Share of the cell in permanent shadow, where water ice can survive. The map shows shadow, not ice.' };
  } else {
    const water = factor('waterH2O');
    const w = cell.waterH2O;
    if (water) {
      out.ice = {
        value: null,
        unit: 'share of ground',
        source: null,
        badge: null,
        note: typeof w === 'number' ? `No share of icy ground is mapped here. The top metre holds ${w} percent water by weight (${water.source}), which is a different quantity and is not compared.` : 'No share of icy ground is mapped here.',
      };
    }
  }
  return out;
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
  /**
   * The rock class codes the scoring library knows (the legend of data/earth.json, which
   * data/lithology_similarity.json covers). A grid rock class outside this list is left out as "no data",
   * with a note, because scoring a class the table does not list would throw. Pass it whenever a grid is passed.
   */
  rockClasses?: readonly number[];
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
    const notes = [`Curated target: every value is cited or measured for this place (the target list). It lies ${curated.distanceKm.toFixed(1)} km from the point picked.`];
    if (missing.length > 0) notes.push(`No published value for: ${missing.join(', ')}.`);
    if (!scoresComparable(curated.target)) notes.push(NO_TEMPERATURE_WARNING);
    return {
      origin: 'curated',
      target: curated.target,
      confidence: level(coverage),
      missing,
      coverage,
      scoresComparable: scoresComparable(curated.target),
      notes,
      cell: null,
      curated: { id: curated.target.id, distanceKm: round(curated.distanceKm, 2) },
      knownSite,
      environment: {},
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
      if (key === 'lithology' && options.rockClasses && !options.rockClasses.includes(raw)) {
        notes.push(`The grid gives rock class code ${raw} here, which the rock-class table does not list, so rock type is left out.`);
        continue;
      }
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
    summary: `${knownSite ? `${knownSite.site.name}: ${knownSite.site.status}${knownSite.site.mission ? `, ${knownSite.site.mission}` : ''}.` : 'A point picked on the map.'} ${
      hit
        ? 'Target values are grid values for the surrounding cell, not measurements at the place.'
        : 'No measured values are available for this place yet, so it cannot be matched.'
    }`,
    values,
    cannotCopy: sharedCannotCopy(options.curated, body),
  };
  const { coverage, missing } = targetCoverage(target);
  if (missing.length > 0) notes.push(`No value for: ${plainKeys(missing)}. Scores leave these out, and with too little left they show "no data".`);
  if (knownSite) notes.push(`Nearest named place: ${knownSite.site.name}, ${knownSite.distanceKm.toFixed(1)} km away (${knownSite.site.source}).`);
  // With no temperature the confidence is low whatever else is known, and the scores carry a warning.
  const comparable = scoresComparable(target);
  if (hit && !comparable) notes.push(NO_TEMPERATURE_WARNING);
  return {
    origin: hit ? 'grid' : 'none',
    target,
    confidence: hit && comparable ? oneLower(level(coverage)) : 'low',
    missing,
    coverage,
    scoresComparable: comparable,
    notes,
    cell,
    curated: null,
    knownSite,
    environment: hit && options.grid ? gridEnvironment(options.grid, hit.cell) : {},
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
      scoresComparable: scoresComparable(linked),
      notes: [`Curated target for this place (the target list), centred ${d.toFixed(1)} km from the listed coordinates.`],
      cell: null,
      curated: { id: linked.id, distanceKm: round(d, 2) },
      knownSite: { site, distanceKm: 0 },
      environment: {},
    };
  }
  const profile = targetFromPoint(site.body, site.lat, site.lon, { ...options, name: options.name ?? site.name, knownSites: [site] });
  return profile;
}

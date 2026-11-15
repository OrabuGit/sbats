// Shared code for the validation tools: loading the data, scoring sites, and the statistics.
// Used by validate.ts, tune.ts and score_candidates.ts so that all three measure the same way.
//
// Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeEarthRanges,
  nearestCell,
  prepareTarget,
  scoreCell,
  scoreCells,
  validateLithologyTable,
} from '../app/src/lib/scoring/index';
import type {
  EarthCell,
  EarthRanges,
  FactorId,
  LithologyClass,
  LithologyTable,
  Target,
  Weights,
} from '../app/src/lib/scoring/index';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = join(ROOT, 'data');
/** Where reports are written. SBATS_OUT_DIR redirects them, for trying the tools without touching the real reports. */
export const OUT = process.env.SBATS_OUT_DIR ?? join(ROOT, 'validation', 'output');
export const TUNING = join(ROOT, 'validation', 'tuning');

/** A site further than this from its nearest cell centre is treated as off the grid (open ocean). */
export const MAX_SNAP_KM = 60;
export const TOP_SHARE = 0.1;
/** Terrain counts as landed when this share of cells has both slope and roughness. */
export const TERRAIN_MIN_SHARE = 0.8;

export interface Analog {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: 'known' | 'negative' | 'candidate';
  analogFor: string[];
  source: string;
}

export interface EarthFile {
  meta: { resolutionDeg: number; generatedAt: string; factors: { key: string; source: string; classes?: LithologyClass[] }[] };
  cells: EarthCell[];
}

export interface Split {
  drawnAt: string;
  seed: number;
  tuning: string[];
  holdout: string[];
  excludedCandidates: string[];
}

/** The tolerances and Base weights that the one tuning pass may change. */
export interface Params {
  tempMeanSigma: number;
  tempRangeSigma: number;
  precipSigma: number;
  ndviSigma: number;
  /** slope sigma = max(1 degree, fraction x target slope); roughness sigma = max(50 m, fraction x target roughness). */
  terrainFraction: number;
  sunSigma: number;
  baseWeights: Weights;
}

export interface Frozen {
  frozenAt: string;
  earthGeneratedAt: string;
  before: Params;
  after: Params;
  presets: Record<string, Weights>;
  [extra: string]: unknown;
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function fail(message: string): never {
  console.error(`validation: ${message}`);
  process.exit(1);
}

export function loadSplit(): Split | null {
  const path = join(TUNING, 'split.json');
  return existsSync(path) ? readJson<Split>(path) : null;
}

export function loadFrozen(): Frozen | null {
  const path = join(TUNING, 'frozen.json');
  return existsSync(path) ? readJson<Frozen>(path) : null;
}

export interface Data {
  earth: EarthFile;
  cells: EarthCell[];
  ranges: EarthRanges;
  targets: Target[];
  /**
   * The targets that take part in validation: those listed in `analogFor` by at least one known analog.
   * A target with no known analog (Marius Hills, added 2026-11-15, after the freeze) has no positive
   * case to test, so it is left out of every validation statistic and the frozen numbers stay as they were.
   */
  validationTargets: Target[];
  /** Known analogs and negative controls only. Candidate sites are never loaded here. */
  sites: Analog[];
  candidates: Analog[];
  table: LithologyTable | null;
  notes: string[];
  terrain: { slopeShare: number; roughnessShare: number; landed: boolean };
}

/** Loads the data files. `includeCandidates` is false everywhere except score_candidates.ts. */
export function loadData(includeCandidates = false): Data {
  for (const name of ['earth.json', 'targets.json', 'analogs.json']) {
    if (!existsSync(join(DATA, name))) fail(`data/${name} does not exist yet.`);
  }
  const earth = readJson<EarthFile>(join(DATA, 'earth.json'));
  const targets = readJson<Target[]>(join(DATA, 'targets.json'));
  const analogs = readJson<Analog[]>(join(DATA, 'analogs.json'));
  const notes: string[] = [];

  let table: LithologyTable | null = null;
  const tablePath = join(DATA, 'lithology_similarity.json');
  if (existsSync(tablePath)) {
    table = readJson<LithologyTable>(tablePath);
    const legend = earth.meta.factors.find((f) => f.key === 'lithology')?.classes;
    const problems = validateLithologyTable(table, legend && legend.length > 0 ? legend : undefined);
    if (problems.length > 0) fail(`lithology_similarity.json is not valid: ${problems.join('; ')}`);
  } else {
    notes.push('data/lithology_similarity.json does not exist, so Rock type is left out of every score.');
  }

  const cells = earth.cells;
  const ranges = computeEarthRanges(cells);
  for (const key of ['tempMean', 'tempRange', 'precip', 'ndvi', 'slope', 'roughness'] as const) {
    if (ranges[key] === null) notes.push(`earth.json has no "${key}" values yet, so that key is left out of every score.`);
  }
  if (!cells.some((c) => c.lithology !== null)) notes.push('earth.json has no "lithology" values yet, so Rock type is left out of every score.');

  const slopeShare = cells.filter((c) => c.slope !== null).length / cells.length;
  const roughnessShare = cells.filter((c) => c.roughness !== null).length / cells.length;

  const targetIds = new Set(targets.map((t) => t.id));
  for (const a of analogs) {
    for (const id of a.analogFor) if (!targetIds.has(id)) fail(`analogs.json: "${a.id}" refers to unknown target "${id}"`);
  }

  const listedByKnown = new Set(analogs.filter((a) => a.kind === 'known').flatMap((a) => a.analogFor));
  const validationTargets = targets.filter((t) => listedByKnown.has(t.id));
  if (validationTargets.length < targets.length) {
    notes.push(`Left out of validation, because no known analog is listed for them: ${targets.filter((t) => !listedByKnown.has(t.id)).map((t) => t.id).join(', ')}.`);
  }

  return {
    earth,
    cells,
    ranges,
    targets,
    validationTargets,
    sites: analogs.filter((a) => a.kind === 'known' || a.kind === 'negative'),
    candidates: includeCandidates ? analogs.filter((a) => a.kind === 'candidate') : [],
    table,
    notes,
    terrain: { slopeShare, roughnessShare, landed: Math.min(slopeShare, roughnessShare) >= TERRAIN_MIN_SHARE },
  };
}

/** The tolerances currently written in targets.json and the scoring library, as one Params object. */
export function currentParams(targets: readonly Target[], baseWeights: Weights, sunSigma: number): Params {
  const first = <K extends 'tempMean' | 'tempRange' | 'precip' | 'ndvi'>(key: K): number => {
    const sigmas = new Set(targets.map((t) => t.values[key].sigma).filter((s): s is number => s !== null));
    if (sigmas.size !== 1) fail(`targets.json: expected one shared sigma for "${key}", found ${[...sigmas].join(', ')}`);
    return [...sigmas][0] as number;
  };
  const fractions = new Set<number>();
  for (const t of targets) {
    for (const [key, floor] of [['slope', 1], ['roughness', 50]] as const) {
      const v = t.values[key];
      if (v.value === null || v.sigma === null || v.sigma <= floor) continue;
      fractions.add(Math.round((v.sigma / v.value) * 100) / 100);
    }
  }
  if (fractions.size !== 1) fail(`targets.json: expected one terrain sigma fraction, found ${[...fractions].join(', ')}`);
  return {
    tempMeanSigma: first('tempMean'),
    tempRangeSigma: first('tempRange'),
    precipSigma: first('precip'),
    ndviSigma: first('ndvi'),
    terrainFraction: [...fractions][0] as number,
    sunSigma,
    baseWeights: { ...baseWeights },
  };
}

/** Returns copies of the targets with the tolerances of `p`. Target values are never changed. */
export function applySigmas(targets: readonly Target[], p: Params): Target[] {
  return targets.map((t) => {
    const values = { ...t.values };
    const set = (key: 'tempMean' | 'tempRange' | 'precip' | 'ndvi' | 'slope' | 'roughness', sigma: number): void => {
      if (values[key].value !== null) values[key] = { ...values[key], sigma };
    };
    set('tempMean', p.tempMeanSigma);
    set('tempRange', p.tempRangeSigma);
    set('precip', p.precipSigma);
    set('ndvi', p.ndviSigma);
    if (values.slope.value !== null) set('slope', Math.max(1, p.terrainFraction * values.slope.value));
    if (values.roughness.value !== null) set('roughness', Math.max(50, p.terrainFraction * values.roughness.value));
    return { ...t, values };
  });
}

// ---------------------------------------------------------------------------------------------
// Scoring sites
// ---------------------------------------------------------------------------------------------

export interface SiteResult {
  target: string;
  score: number | null;
  /** Share of scored Earth cells with a higher score for this target. null when the site is unscored. */
  shareAbove: number | null;
  inTop10: boolean;
  coverage: number;
  confidence: string | null;
  unscoredReason: string | null;
  missing: string[];
  limitingFactor: FactorId | null;
  reason: string;
}

export interface Site {
  id: string;
  name: string;
  kind: Analog['kind'];
  lat: number;
  lon: number;
  cell: { lat: number; lon: number; distanceKm: number } | null;
  analogFor: string[];
  results: Record<string, SiteResult>;
}

function shareAbove(sorted: Float64Array, score: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((sorted[mid] as number) <= score) lo = mid + 1;
    else hi = mid;
  }
  return sorted.length === 0 ? 1 : (sorted.length - lo) / sorted.length;
}

export interface Scored {
  sites: Site[];
  scoredCellsPerTarget: Record<string, number>;
  missingTargetKeys: Record<string, string[]>;
}

/**
 * Scores every Earth cell for every target, then reads off each site's score and its rank among
 * all scored cells. Sites are snapped to the nearest cell centre.
 */
export function scoreSites(
  sites: readonly Analog[],
  targets: readonly Target[],
  data: Pick<Data, 'cells' | 'ranges' | 'table'>,
  weights: Weights,
  sunSigma?: number,
): Scored {
  const perTarget = new Map<string, { prepared: ReturnType<typeof prepareTarget>; sorted: Float64Array }>();
  for (const t of targets) {
    const prepared = prepareTarget(t, data.ranges, data.table, sunSigma === undefined ? {} : { sunElevationSigmaDeg: sunSigma });
    const scores: number[] = [];
    for (const s of scoreCells(data.cells, prepared, weights)) if (s.score !== null) scores.push(s.score);
    perTarget.set(t.id, { prepared, sorted: Float64Array.from(scores).sort() });
  }

  const out: Site[] = sites.map((a) => {
    const hit = nearestCell(data.cells, a.lat, a.lon);
    const onGrid = hit !== null && hit.distanceKm <= MAX_SNAP_KM;
    const results: Record<string, SiteResult> = {};
    for (const t of targets) {
      const pt = perTarget.get(t.id);
      if (!pt) continue;
      if (!onGrid || !hit) {
        results[t.id] = {
          target: t.id, score: null, shareAbove: null, inTop10: false, coverage: 0, confidence: null,
          unscoredReason: 'no-land-cell', missing: [], limitingFactor: null,
          reason: 'No land cell of the Earth grid lies within 60 km of this site.',
        };
        continue;
      }
      const full = scoreCell(hit.cell, pt.prepared, weights);
      const above = full.score === null ? null : shareAbove(pt.sorted, full.score);
      results[t.id] = {
        target: t.id,
        score: full.score === null ? null : Math.round(full.score * 10) / 10,
        shareAbove: above === null ? null : Math.round(above * 10000) / 10000,
        inTop10: above !== null && above < TOP_SHARE,
        coverage: full.coverage,
        confidence: full.confidence,
        unscoredReason: full.unscoredReason,
        missing: full.missing,
        limitingFactor: full.limitingFactor,
        reason: full.reason,
      };
    }
    return {
      id: a.id, name: a.name, kind: a.kind, lat: a.lat, lon: a.lon,
      cell: hit && onGrid ? { lat: hit.cell.lat, lon: hit.cell.lon, distanceKm: Math.round(hit.distanceKm * 10) / 10 } : null,
      analogFor: a.analogFor,
      results,
    };
  });

  return {
    sites: out,
    scoredCellsPerTarget: Object.fromEntries([...perTarget].map(([id, v]) => [id, v.sorted.length])),
    missingTargetKeys: Object.fromEntries([...perTarget].map(([id, v]) => [id, v.prepared.missingTargetKeys])),
  };
}

// ---------------------------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------------------------

export interface Metrics {
  knownSites: number;
  negativeSites: number;
  positiveCases: number;
  /** Strict ROC AUC: a site with no score counts as below every scored site. */
  rocAuc: number | null;
  rocAucScoredOnly: number | null;
  /** Site-weighted share of known analogs in the top 10% of all scored Earth cells for their target. */
  top10Share: number | null;
  casesInTop10: number;
  knownSitesInTop10AnyTarget: number;
  knownSitesUnscored: number;
  casesUnscored: number;
  /** Site-weighted mean share of scored Earth cells that a known analog beats or ties. 0.5 is chance. */
  meanPercentile: number | null;
  meanScoreKnown: number | null;
  meanScoreNegative: number | null;
  /** Site-weighted share of scored positive cases in which each factor is the limiting factor. */
  limitingFactorShare: Record<string, number>;
  largestLimitingShare: number;
}

const round = (v: number | null, d = 3): number | null => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);

/**
 * The validation statistics for a set of known sites and negative controls.
 *
 * One positive case is one known site scored against one target in its analogFor. A site listed for
 * several targets is split equally between them, so every known site counts once. `targetIds` limits
 * the calculation to some targets (for the Moon and Mars breakdown).
 */
export function computeMetrics(known: readonly Site[], negative: readonly Site[], targetIds?: ReadonlySet<string>): Metrics {
  for (const s of [...known, ...negative]) {
    if (s.kind === 'candidate') throw new Error(`candidate site "${s.id}" must never enter the validation statistics`);
  }
  let aucWins = 0, aucTotal = 0, scoredWins = 0, scoredTotal = 0;
  let positiveCases = 0, casesUnscored = 0, casesInTop10 = 0, sitesWithCases = 0, top10 = 0;
  let pctSum = 0, pctWeight = 0, scoreSum = 0;
  let sitesInTop10 = 0, sitesUnscored = 0;
  const limiting: Record<string, number> = {};

  for (const site of known) {
    const ids = site.analogFor.filter((id) => site.results[id] && (!targetIds || targetIds.has(id)));
    if (ids.length === 0) continue;
    sitesWithCases += 1;
    const weight = 1 / ids.length;
    let anyTop = false;
    let anyScored = false;
    for (const id of ids) {
      const p = site.results[id] as SiteResult;
      positiveCases += 1;
      if (p.score === null) casesUnscored += 1;
      else {
        anyScored = true;
        pctSum += weight * (1 - (p.shareAbove ?? 1));
        scoreSum += weight * p.score;
        pctWeight += weight;
        const key = p.limitingFactor ?? 'none';
        limiting[key] = (limiting[key] ?? 0) + weight;
      }
      if (p.inTop10) {
        casesInTop10 += 1;
        top10 += weight;
        anyTop = true;
      }
      for (const neg of negative) {
        const n = neg.results[id];
        if (!n) continue;
        const ps = p.score ?? -1;
        const ns = n.score ?? -1;
        aucTotal += weight;
        aucWins += ps > ns ? weight : ps === ns ? weight / 2 : 0;
        if (p.score !== null && n.score !== null) {
          scoredTotal += weight;
          scoredWins += p.score > n.score ? weight : p.score === n.score ? weight / 2 : 0;
        }
      }
    }
    if (anyTop) sitesInTop10 += 1;
    if (!anyScored) sitesUnscored += 1;
  }

  let negSum = 0, negCount = 0;
  for (const neg of negative) {
    for (const [id, r] of Object.entries(neg.results)) {
      if (targetIds && !targetIds.has(id)) continue;
      if (r.score === null) continue;
      negSum += r.score;
      negCount += 1;
    }
  }

  const limitingFactorShare: Record<string, number> = {};
  let largest = 0;
  for (const [key, w] of Object.entries(limiting)) {
    const share = pctWeight > 0 ? w / pctWeight : 0;
    limitingFactorShare[key] = round(share) as number;
    if (share > largest) largest = share;
  }

  return {
    knownSites: sitesWithCases,
    negativeSites: negative.length,
    positiveCases,
    rocAuc: round(aucTotal > 0 ? aucWins / aucTotal : null),
    rocAucScoredOnly: round(scoredTotal > 0 ? scoredWins / scoredTotal : null),
    top10Share: round(sitesWithCases > 0 ? top10 / sitesWithCases : null),
    casesInTop10,
    knownSitesInTop10AnyTarget: sitesInTop10,
    knownSitesUnscored: sitesUnscored,
    casesUnscored,
    meanPercentile: round(pctWeight > 0 ? pctSum / pctWeight : null),
    meanScoreKnown: round(pctWeight > 0 ? scoreSum / pctWeight : null, 1),
    meanScoreNegative: round(negCount > 0 ? negSum / negCount : null, 1),
    limitingFactorShare,
    largestLimitingShare: round(largest) as number,
  };
}

export interface SetMetrics {
  overall: Metrics;
  moon: Metrics;
  mars: Metrics;
}

/** Overall statistics plus the same statistics for Moon targets only and Mars targets only. */
export function metricsByBody(sites: readonly Site[], targets: readonly Target[]): SetMetrics {
  const known = sites.filter((s) => s.kind === 'known');
  const negative = sites.filter((s) => s.kind === 'negative');
  const ids = (body: string): Set<string> => new Set(targets.filter((t) => t.body === body).map((t) => t.id));
  return {
    overall: computeMetrics(known, negative),
    moon: computeMetrics(known, negative, ids('moon')),
    mars: computeMetrics(known, negative, ids('mars')),
  };
}

export const DEFINITIONS = {
  positiveCase:
    'One known analog site scored against one target listed in its analogFor. A site listed for several targets is ' +
    'split equally between them, so every site counts once in each number.',
  rocAuc:
    'Share of (positive case, negative control) pairs, both scored against the same target, in which the known ' +
    'analog has the higher score. Ties count half. A site with no score counts as below every scored site. ' +
    '0.5 is chance, 1.0 is perfect.',
  rocAucScoredOnly: 'The same, using only pairs where both sites have a score.',
  top10Share:
    'Share of known analogs whose cell is in the top 10% of all scored Earth cells for their matching target. ' +
    'Unscored cases count as not in the top 10%.',
  meanPercentile:
    'Mean share of scored Earth cells that a known analog beats or ties, over scored cases. 0.5 is chance. ' +
    'This compares known analogs with every land cell, a harder test than the negative controls.',
  snapping: `Each site is scored at the nearest earth.json cell centre. Sites more than ${MAX_SNAP_KM} km from any cell are unscored.`,
  candidates: 'Indonesian candidate sites are never part of tuning or validation. Their scores are reported separately.',
};

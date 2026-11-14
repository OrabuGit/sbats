// Analog profile and purpose rankings: a second view beside the all-round score.
//
// Why it exists. Validation on 2026-11-14 showed that the all-round score under-ranks sites that are
// known for one dimension only: an impact crater in farmland is a real lunar geology analog but loses
// almost everything on vegetation and climate. The all-round score answers "could a whole base be
// rehearsed here?". This view answers "what is this place like the target in, and what is that good for?".
//
// What it is not. It adds no tuned parameter. Every number here is one of the existing per-factor
// similarities, or a combination of them with the frozen Base weights. The all-round score is unchanged.
//
// The dimensions and purposes below were written down from first principles before any per-dimension
// or per-purpose result was computed (see validation/purposes/DEFINITIONS.md).

import { FACTORS } from './factors';
import { PRESETS } from './presets';
import { factorSimilarities } from './score';
import { FACTOR_IDS } from './types';
import type { EarthCell, FactorId, PreparedTarget, Weights } from './types';

export type DimensionId = 'geology' | 'terrain' | 'climate' | 'bareGround' | 'sunlight';

export interface DimensionDef {
  id: DimensionId;
  label: string;
  /** The scoring factors that make up the dimension. Every factor belongs to exactly one dimension. */
  factors: readonly FactorId[];
  measures: string;
}

/** Five dimensions over the six scoring factors. Climate joins Temperature and Dryness. */
export const DIMENSIONS: readonly DimensionDef[] = [
  { id: 'geology', label: 'Geology', factors: ['rockType'], measures: 'Dominant rock class' },
  { id: 'terrain', label: 'Terrain', factors: ['terrain'], measures: 'Slope and elevation roughness' },
  { id: 'climate', label: 'Climate', factors: ['temperature', 'dryness'], measures: 'Temperature and precipitation' },
  { id: 'bareGround', label: 'Bare ground', factors: ['bareGround'], measures: 'Exposed, ice-free, unvegetated ground' },
  { id: 'sunlight', label: 'Sunlight', factors: ['sunlight'], measures: 'Noon Sun elevation over the year' },
];

export type PurposeId = 'geology' | 'mobility' | 'ice' | 'astrobiology' | 'base';

export interface PurposeDef {
  id: PurposeId;
  label: string;
  /** The dimensions the purpose depends on. */
  dimensions: readonly DimensionId[];
  /** One line, from first principles, on why these dimensions and no others. */
  why: string;
}

/**
 * What a site can be used for, and the dimensions each use depends on.
 * "Full base rehearsal" uses all five and is, by construction, the existing all-round score.
 */
export const PURPOSES: readonly PurposeDef[] = [
  {
    id: 'geology',
    label: 'Instrument and geology testing',
    dimensions: ['geology'],
    why: 'An instrument or a field geologist is tested by the rock in front of them. Outcrops are far smaller than a grid cell, so the cell\'s climate, light and vegetation do not decide whether the right rock is there.',
  },
  {
    id: 'mobility',
    label: 'Rover mobility',
    dimensions: ['terrain', 'bareGround'],
    why: 'Wheels, suspension and navigation respond to slope, relief and an open surface free of vegetation and ice. Rock chemistry and weather do not move a rover.',
  },
  {
    id: 'ice',
    label: 'Ice and resources',
    dimensions: ['climate', 'sunlight', 'geology'],
    why: 'Ground ice and other volatiles survive where it is cold, dry and poorly lit, and what can be extracted from the ground depends on the host rock.',
  },
  {
    id: 'astrobiology',
    label: 'Astrobiology',
    dimensions: ['climate', 'geology', 'bareGround'],
    why: 'Life at its limits is set by temperature and water and by the mineral substrate. Ground with almost no vegetation is where biology is as sparse as a mission would meet.',
  },
  {
    id: 'base',
    label: 'Full base rehearsal',
    dimensions: ['geology', 'terrain', 'climate', 'bareGround', 'sunlight'],
    why: 'A crewed base lives with everything at once: ground, rock, weather and light. This is the existing all-round score.',
  },
];

export const DIMENSION_IDS: readonly DimensionId[] = DIMENSIONS.map((d) => d.id);
export const PURPOSE_IDS: readonly PurposeId[] = PURPOSES.map((p) => p.id);

function dimension(id: DimensionId): DimensionDef {
  const d = DIMENSIONS.find((x) => x.id === id);
  if (!d) throw new RangeError(`Unknown dimension "${id}"`);
  return d;
}

function purpose(id: PurposeId): PurposeDef {
  const p = PURPOSES.find((x) => x.id === id);
  if (!p) throw new RangeError(`Unknown purpose "${id}"`);
  return p;
}

/**
 * Weights for a purpose ranking: the frozen Base weights of the factors in the purpose's dimensions,
 * and zero for every other factor. Passing these to scoreCells gives the purpose score, with the same
 * formula and the same missing-factor rules as the all-round score. Nothing here is tuned.
 * For "base" these are exactly the Base preset weights.
 */
export function purposeWeights(id: PurposeId): Weights {
  const included = new Set<FactorId>(purpose(id).dimensions.flatMap((d) => dimension(d).factors));
  const out = {} as Record<FactorId, number>;
  for (const f of FACTOR_IDS) out[f] = included.has(f) ? PRESETS.base.weights[f] : 0;
  return out;
}

/**
 * Similarity per dimension for one cell, 0 to 1, or null when the dimension has no data.
 *
 * A dimension with one factor is that factor's similarity, unchanged. Climate is the geometric mean of
 * Temperature and Dryness, weighted by their frozen Base weights (and by how much of each factor is
 * present, as in the score). Unlike a score, a profile has no veto, no required factor and no minimum
 * coverage: it only reports what is there.
 */
export function dimensionSimilarities(cell: EarthCell, target: PreparedTarget): Record<DimensionId, number | null> {
  const factors = factorSimilarities(cell, target);
  const out = {} as Record<DimensionId, number | null>;
  for (const d of DIMENSIONS) {
    let logSum = 0;
    let weightSum = 0;
    for (const f of d.factors) {
      const s = factors[f];
      if (s.similarity === null) continue;
      const w = PRESETS.base.weights[f] * s.present;
      logSum += w * Math.log(s.similarity);
      weightSum += w;
    }
    out[d.id] = weightSum > 0 ? Math.exp(logSum / weightSum) : null;
  }
  return out;
}

/** Per-dimension similarities of every cell, sorted, for looking up percentiles. Build once per target. */
export interface ProfileIndex {
  sorted: Record<DimensionId, Float64Array>;
}

export function buildProfileIndex(cells: readonly EarthCell[], target: PreparedTarget): ProfileIndex {
  const lists = {} as Record<DimensionId, number[]>;
  for (const d of DIMENSIONS) lists[d.id] = [];
  for (const cell of cells) {
    const s = dimensionSimilarities(cell, target);
    for (const d of DIMENSIONS) {
      const v = s[d.id];
      if (v !== null) lists[d.id].push(v);
    }
  }
  const sorted = {} as Record<DimensionId, Float64Array>;
  for (const d of DIMENSIONS) sorted[d.id] = Float64Array.from(lists[d.id]).sort();
  return { sorted };
}

export interface Rank {
  /** Tie-fair percentile: share of values strictly lower, plus half of those exactly equal. Chance is 0.5. */
  midPercentile: number;
  /** Share of values it beats or ties, 1 - shareAbove. Flatters a value that ties with most of the list. */
  percentile: number;
  /** Share of values strictly higher (0 means nothing beats it). */
  shareAbove: number;
  /** Share of values exactly equal, the value itself included when it is in the list. */
  shareTied: number;
}

/**
 * Where a value stands in a sorted list.
 *
 * Use `midPercentile` to judge a site. `percentile` (beats or ties) was the first definition, and the
 * first run showed its flaw: rock class has three levels, most of the Earth is "unrelated" to any one
 * target, and a site at that lowest level "ties" with all of them and gets a percentile near 1.
 * The mid-rank percentile counts ties as half, so the average over all cells is 0.5 whatever the ties.
 */
export function rankIn(sorted: Float64Array, value: number): Rank {
  const n = sorted.length;
  if (n === 0) return { midPercentile: 0, percentile: 0, shareAbove: 1, shareTied: 0 };
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((sorted[mid] as number) <= value) lo = mid + 1;
    else hi = mid;
  }
  const upper = lo; // first index strictly greater
  lo = 0;
  hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((sorted[mid] as number) < value) lo = mid + 1;
    else hi = mid;
  }
  const shareAbove = (n - upper) / n;
  const shareTied = (upper - lo) / n;
  return { midPercentile: lo / n + shareTied / 2, percentile: 1 - shareAbove, shareAbove, shareTied };
}

export interface DimensionProfile {
  id: DimensionId;
  label: string;
  measures: string;
  /** 0 to 1, or null when the cell or the target has no data for the dimension. */
  similarity: number | null;
  /** Tie-fair percentile among Earth cells: share strictly lower plus half the ties. Chance is 0.5. Use this one. */
  midPercentile: number | null;
  /** Share of Earth cells this cell beats or ties on the dimension. Misleading when many cells tie: see rankIn. */
  percentile: number | null;
  /** Share of Earth cells with a strictly higher similarity. */
  shareAbove: number | null;
  /** Share of Earth cells with exactly the same similarity. Large for Geology, which has three levels. */
  shareTied: number | null;
  factors: readonly FactorId[];
}

/** The analog profile of one cell: similarity per dimension and its standing among all Earth cells. */
export function analogProfile(cell: EarthCell, target: PreparedTarget, index: ProfileIndex): DimensionProfile[] {
  const s = dimensionSimilarities(cell, target);
  return DIMENSIONS.map((d) => {
    const similarity = s[d.id];
    const rank = similarity === null ? null : rankIn(index.sorted[d.id], similarity);
    return {
      id: d.id,
      label: d.label,
      measures: d.measures,
      similarity,
      midPercentile: rank?.midPercentile ?? null,
      percentile: rank?.percentile ?? null,
      shareAbove: rank?.shareAbove ?? null,
      shareTied: rank?.shareTied ?? null,
      factors: d.factors,
    };
  });
}

/** Checks that the dimensions cover every scoring factor exactly once. Used by the unit tests. */
export function dimensionCoverage(): { missing: FactorId[]; repeated: FactorId[] } {
  const seen = new Map<FactorId, number>();
  for (const d of DIMENSIONS) for (const f of d.factors) seen.set(f, (seen.get(f) ?? 0) + 1);
  return {
    missing: FACTORS.map((f) => f.id).filter((id) => !seen.has(id)),
    repeated: [...seen].filter(([, n]) => n > 1).map(([id]) => id),
  };
}

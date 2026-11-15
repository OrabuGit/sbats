// Dimensions added after the freeze of 2026-11-14: minerals, wind, dust, ice or permafrost.
//
// Rules, written before any of them was looked at for a site:
//   - They never enter the all-round score. Its formula, tolerances and weights are frozen.
//   - They appear in the match record as their own dimensions, marked `addedAfterFreeze`.
//   - They may enter a purpose score as an "extended" score, shown beside the frozen purpose score,
//     by the blend rule below. Nothing about them has been validated.
//
// Which purposes each belongs to, from first principles (one line each):
//   minerals  geology, astrobiology, base: an instrument is tested on minerals, and life at its limits lives on them.
//   ice       ice, astrobiology, base: ground ice is the resource itself, and where water is, life is looked for.
//   dust      mobility, base: dust covers arrays, wears seals and hides the ground from cameras.
//   wind      base: wind loads structures and moves dust. The Moon has none.

import { PRESETS, PURPOSES } from '../scoring/index';
import type { FactorId, PurposeId } from '../scoring/index';
import { listLabels } from './minerals';
import type { SharedMinerals } from './minerals';
import type { ExtraDimensionId, ExtraValue, MatchDimension, MatchRow, MatchSide } from './types';
import { verdictOf } from './verdict';

export interface ExtraDimensionDef {
  id: ExtraDimensionId;
  label: string;
  measures: string;
  /** gaussian: two numbers and a tolerance. shared-set: two lists of mineral families. */
  kind: 'gaussian' | 'shared-set';
  unit: string;
  /** Tolerance for a gaussian dimension. null until both sides are published and a rule is written down. */
  sigma: number | null;
  /** Why the tolerance is what it is. */
  sigmaReason: string | null;
  purposes: readonly PurposeId[];
  why: string;
}

export const EXTRA_DIMENSIONS: readonly ExtraDimensionDef[] = [
  {
    id: 'minerals',
    label: 'Minerals',
    measures: 'Mineral families identified from orbit on Earth (EMIT) and reported at the target',
    kind: 'shared-set',
    unit: '',
    sigma: null,
    sigmaReason: null,
    purposes: ['geology', 'astrobiology', 'base'],
    why: 'An instrument is tested on minerals, and life at its limits lives on them.',
  },
  {
    id: 'ice',
    label: 'Ice and permafrost',
    measures: 'Ground ice or permafrost at the place',
    kind: 'gaussian',
    unit: '',
    sigma: null,
    sigmaReason: null,
    purposes: ['ice', 'astrobiology', 'base'],
    why: 'Ground ice is the resource itself, and where water is, life is looked for.',
  },
  {
    id: 'dust',
    label: 'Dust',
    measures: 'Dust in the air or on the ground',
    kind: 'gaussian',
    unit: '',
    sigma: null,
    sigmaReason: null,
    purposes: ['mobility', 'base'],
    why: 'Dust covers arrays, wears seals and hides the ground from cameras.',
  },
  {
    id: 'wind',
    label: 'Wind',
    measures: 'Mean wind speed near the ground',
    kind: 'gaussian',
    unit: 'm/s',
    sigma: null,
    sigmaReason: null,
    purposes: ['base'],
    why: 'Wind loads structures and moves dust. The Moon has none.',
  },
];

export const EXTRA_DIMENSION_IDS: readonly ExtraDimensionId[] = EXTRA_DIMENSIONS.map((d) => d.id);

export function extraDimension(id: ExtraDimensionId): ExtraDimensionDef {
  const d = EXTRA_DIMENSIONS.find((x) => x.id === id);
  if (!d) throw new RangeError(`Unknown extra dimension "${id}"`);
  return d;
}

const NO_SIDE: MatchSide = { value: null, text: 'no data', source: null, badge: null, scale: null };

function side(v: ExtraValue | null | undefined): MatchSide {
  if (!v || v.value === null) return v?.note ? { ...NO_SIDE, note: v.note } : NO_SIDE;
  return {
    value: Array.isArray(v.value) ? v.value.join(', ') : v.value,
    text: v.text,
    source: v.source,
    badge: v.badge,
    scale: v.scale,
    ...(v.note ? { note: v.note } : {}),
  };
}

function gaussian(a: number, b: number, sigma: number): number {
  return Math.exp(-0.5 * ((a - b) / sigma) ** 2);
}

/**
 * Compares one extra dimension. A dimension with no data on one side, or no agreed tolerance, is
 * returned with verdict "no-data" and a reason that says which: the record keeps the same shape.
 */
export function compareExtra(
  def: ExtraDimensionDef,
  earth: ExtraValue | null | undefined,
  target: ExtraValue | null | undefined,
  shared?: SharedMinerals | null,
): MatchDimension {
  const e = side(earth);
  const t = side(target);
  let similarity: number | null = null;
  let reason: string;

  if (e.value === null && t.value === null) reason = `No ${def.label.toLowerCase()} data on either side yet.`;
  else if (e.value === null) reason = `No ${def.label.toLowerCase()} data for the Earth place.`;
  else if (t.value === null) reason = `No published ${def.label.toLowerCase()} value for the target.`;
  else if (def.kind === 'shared-set') {
    if (!shared || shared.similarity === null) {
      reason = 'The minerals reported at the target cannot be identified by EMIT, so the two lists cannot be compared.';
    } else {
      similarity = shared.similarity;
      const comparable = shared.shared.length + shared.targetOnly.length;
      const sharedText = shared.shared.length > 0 ? `Shares ${listLabels(shared.shared.map((s) => s.label))}` : 'Shares none';
      const missing = shared.targetOnly.length > 0 ? `; ${listLabels(shared.targetOnly.map((s) => s.label))} reported at the target and not seen here` : '';
      reason = `${sharedText} (${shared.shared.length} of ${comparable} comparable mineral families)${missing}.`;
    }
  } else if (def.sigma === null) {
    reason = `Both sides have a value, but no tolerance has been agreed for ${def.label.toLowerCase()}, so no similarity is given.`;
  } else if (typeof earth?.value === 'number' && typeof target?.value === 'number') {
    similarity = gaussian(earth.value, target.value, def.sigma);
    const diff = earth.value - target.value;
    reason = `${def.label} ${e.text} against ${t.text}: ${Math.abs(diff) < 1e-9 ? 'the same' : `${diff > 0 ? 'higher' : 'lower'} than the target`}.`;
  } else {
    reason = `The ${def.label.toLowerCase()} values are not numbers and cannot be compared.`;
  }

  const row: MatchRow = { key: def.id, label: def.label, unit: def.unit, earth: e, target: t, similarity, verdict: verdictOf(similarity), reason };
  return {
    id: def.id,
    label: def.label,
    measures: def.measures,
    inScore: false,
    addedAfterFreeze: true,
    similarity,
    verdict: verdictOf(similarity),
    reason,
    percentile: null,
    rows: [row],
  };
}

/**
 * The blend rule for an extended purpose score.
 *
 * The frozen purpose score is a weighted geometric mean of its factors with the frozen Base weights.
 * Each extra dimension that belongs to the purpose and has a similarity joins that mean with the
 * average weight of the purpose's own factors: it counts as much as a typical factor of that purpose,
 * no more. No weight is fitted to anything.
 *
 * Returns null when the frozen purpose score is null (the extras cannot rescue a place the frozen
 * rules do not score) or when no extra dimension has a similarity.
 */
export function extendedPurposeScore(
  purposeId: PurposeId,
  frozenScore: number | null,
  purposeFactors: readonly FactorId[],
  extras: readonly { id: ExtraDimensionId; similarity: number | null }[],
): { score: number | null; used: ExtraDimensionId[] } {
  const mine = extras.filter((x) => extraDimension(x.id).purposes.includes(purposeId) && x.similarity !== null);
  if (frozenScore === null || mine.length === 0 || purposeFactors.length === 0) return { score: null, used: [] };
  const weights = PRESETS.base.weights;
  const core = purposeFactors.reduce((sum, f) => sum + weights[f], 0);
  const each = core / purposeFactors.length;
  if (frozenScore <= 0 || mine.some((x) => (x.similarity as number) <= 0)) return { score: 0, used: mine.map((x) => x.id) };
  let logSum = core * Math.log(frozenScore / 100);
  for (const x of mine) logSum += each * Math.log(x.similarity as number);
  return { score: 100 * Math.exp(logSum / (core + each * mine.length)), used: mine.map((x) => x.id) };
}

/** The purposes an extra dimension belongs to, for documentation. */
export function purposesOfExtra(id: ExtraDimensionId): PurposeId[] {
  const set = new Set(extraDimension(id).purposes);
  return PURPOSES.map((p) => p.id).filter((p) => set.has(p));
}

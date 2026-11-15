// Dimensions added after the freeze of 2026-11-14: minerals, wind, dust, ice or permafrost.
//
// Rules, written before any of them was looked at for a site:
//   - They never enter the all-round score. Its formula, tolerances and weights are frozen.
//   - They appear in the match record as their own dimensions, marked `addedAfterFreeze`.
//   - They may enter a purpose score as an "extended" score, shown beside the frozen purpose score,
//     by the blend rule below. Nothing about them has been validated.
//
// Tolerances, written down on 2026-11-15 before any site was compared on these dimensions:
//   wind and dust  one quarter of the spread between the 5th and 95th percentile of Earth's land cells
//                  (data/earth.json built 2026-11-15: wind 1.79 to 9.89 m/s, aerosol optical depth 0.00
//                  to 0.48). The frozen temperature tolerances are a sixth to a quarter of Earth's range;
//                  this is the same kind of rule, not a fitted number.
//   ice            0.25: one quarter of the scale, which runs from 0 to 1.
// A target value outside Earth's observed range is compared at the nearest value Earth offers, as in
// the frozen score.
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
    measures: 'Share of the ground that holds or can hold ice: permafrost on Earth, ice-stable ground at the target',
    kind: 'gaussian',
    unit: 'share of ground',
    sigma: 0.25,
    sigmaReason: 'One quarter of the scale, which runs from 0 to 1.',
    purposes: ['ice', 'astrobiology', 'base'],
    why: 'Ground ice is the resource itself, and where water is, life is looked for.',
  },
  {
    id: 'dust',
    label: 'Dust and aerosol',
    measures: 'Optical depth of the air column in visible light: all aerosol on Earth, dust on Mars',
    kind: 'gaussian',
    unit: 'optical depth',
    sigma: 0.12,
    sigmaReason: "One quarter of the spread between the 5th and 95th percentile of Earth's land cells (0.00 to 0.48).",
    purposes: ['mobility', 'base'],
    why: 'Dust covers arrays, wears seals and hides the ground from cameras.',
  },
  {
    id: 'wind',
    label: 'Wind',
    measures: 'Mean wind speed 10 m above the surface',
    kind: 'gaussian',
    unit: 'm/s',
    sigma: 2.0,
    sigmaReason: "One quarter of the spread between the 5th and 95th percentile of Earth's land cells (1.79 to 9.89 m/s).",
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

const MORE: Partial<Record<ExtraDimensionId, [string, string]>> = {
  wind: ['windier', 'calmer'],
  dust: ['hazier', 'clearer'],
  ice: ['more frozen ground', 'less frozen ground'],
};

/** Prints a number of an extra dimension with its unit. */
export function formatExtra(value: number, unit: string): string {
  if (unit === 'share of ground') return `${Math.round(value * 1000) / 10}% of the ground`;
  const text = Math.abs(value) >= 10 ? value.toFixed(1) : String(Math.round(value * 100) / 100);
  return unit === '' ? text : `${text} ${unit}`;
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
  earthRange?: { min: number; max: number } | null,
): MatchDimension {
  const e = side(earth);
  let t = side(target);
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
    // A target beyond anything on Earth is compared at the nearest value Earth offers.
    const clamped = earthRange ? Math.min(earthRange.max, Math.max(earthRange.min, target.value)) : target.value;
    const isClamped = clamped !== target.value;
    similarity = gaussian(earth.value, clamped, def.sigma);
    const diff = earth.value - clamped;
    const words = MORE[def.id] ?? ['higher', 'lower'];
    const than = isClamped ? 'than the closest Earth gets to the target' : 'than the target';
    if (isClamped) t = { ...t, text: `${t.text} (Earth's closest: ${formatExtra(clamped, def.unit)})` };
    reason =
      Math.abs(diff) < def.sigma / 20
        ? `${def.label} ${e.text}: about the same as the target${isClamped ? "'s closest value on Earth" : ''}.`
        : `${def.label} ${e.text} against ${formatExtra(clamped, def.unit)}: ${diff > 0 ? words[0] : words[1]} ${than}.`;
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
/**
 * In a blend, the minerals similarity is never taken below this. A site where EMIT saw none of the
 * target's minerals is a poor match on minerals, not a place with no geology at all: EMIT cannot see
 * olivine or pyroxene on weathered ground even at Mauna Kea. The value is the "unrelated" level of the
 * rock-class table (0.15), which exists for the same reason: rock type lowers a score and never vetoes it.
 * The similarity shown in the record is not changed.
 */
export const MINERALS_BLEND_FLOOR = 0.15;

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
  const blend = (x: { id: ExtraDimensionId; similarity: number | null }): number =>
    x.id === 'minerals' ? Math.max(MINERALS_BLEND_FLOOR, x.similarity as number) : (x.similarity as number);
  if (frozenScore <= 0 || mine.some((x) => blend(x) <= 0)) return { score: 0, used: mine.map((x) => x.id) };
  let logSum = core * Math.log(frozenScore / 100);
  for (const x of mine) logSum += each * Math.log(blend(x));
  return { score: 100 * Math.exp(logSum / (core + each * mine.length)), used: mine.map((x) => x.id) };
}

/** The purposes an extra dimension belongs to, for documentation. */
export function purposesOfExtra(id: ExtraDimensionId): PurposeId[] {
  const set = new Set(extraDimension(id).purposes);
  return PURPOSES.map((p) => p.id).filter((p) => set.has(p));
}

/** One value of data/target_environment.json. */
export interface EnvironmentValue {
  value: number | null;
  unit: string;
  source: string | null;
  badge: 'Measured' | 'Mission' | 'Literature' | null;
  note?: string | null;
}

/** data/target_environment.json: the target side of wind, dust and ground ice. */
export interface TargetEnvironmentFile {
  meta: { generatedAt: string; note: string; definitions: Record<string, string> };
  targets: Record<string, Partial<Record<'wind' | 'dust' | 'ice', EnvironmentValue>>>;
}

/** An environment value as one side of an extra dimension. `scale` says what it describes. */
export function extraFromEnvironment(v: EnvironmentValue | null | undefined, scale: ExtraValue['scale']): ExtraValue | undefined {
  if (!v) return undefined;
  if (v.value === null) return { value: null, unit: v.unit, text: 'no data', source: null, badge: null, scale, ...(v.note ? { note: v.note } : {}) };
  return { value: v.value, unit: v.unit, text: formatExtra(v.value, v.unit), source: v.source, badge: v.badge, scale, ...(v.note ? { note: v.note } : {}) };
}

/**
 * The target-side wind, dust and ice for any target profile: the curated file for a curated target,
 * the grid cell's own values for a point picked on the map.
 */
export function targetExtrasForProfile(
  profile: { origin: string; target: { id: string }; environment?: Partial<Record<'wind' | 'dust' | 'ice', EnvironmentValue>> },
  file: TargetEnvironmentFile | null | undefined,
): Partial<Record<ExtraDimensionId, ExtraValue>> {
  if (profile.origin === 'curated') return targetEnvironment(file, profile.target.id);
  const out: Partial<Record<ExtraDimensionId, ExtraValue>> = {};
  for (const id of ['wind', 'dust', 'ice'] as const) {
    const value = extraFromEnvironment(profile.environment?.[id], 'target');
    if (value) out[id] = value;
  }
  return out;
}

/** The target-side wind, dust and ice values of one target, ready for `MatchInput.targetExtras`. */
export function targetEnvironment(file: TargetEnvironmentFile | null | undefined, targetId: string): Partial<Record<ExtraDimensionId, ExtraValue>> {
  const entry = file?.targets[targetId];
  const out: Partial<Record<ExtraDimensionId, ExtraValue>> = {};
  if (!entry) return out;
  for (const id of ['wind', 'dust', 'ice'] as const) {
    const value = extraFromEnvironment(entry[id], 'target');
    if (value) out[id] = value;
  }
  return out;
}


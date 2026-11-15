// The match record: one target, one Earth place, everything the comparison screen shows.
//
// The record always has the same shape: five core dimensions in a fixed order, then the dimensions
// added after the freeze, then five purposes. A dimension with no data is present with verdict
// "no-data" and a reason, never left out. All similarities come from the frozen scoring library.

import {
  DIMENSIONS,
  FACTORS,
  KEY_INFO,
  PRESETS,
  PURPOSES,
  dimensionSimilarities,
  formatValue,
  prepareTarget,
  purposeWeights,
  rankIn,
  scoreCell,
  sunElevation,
} from '../scoring/index';
import type {
  Badge,
  EarthRanges,
  FactorBreakdown,
  KeyBreakdown,
  LithologyClass,
  LithologyTable,
  PreparedTarget,
  PresetId,
  ProfileIndex,
  ScoreKey,
  Target,
} from '../scoring/index';
import { targetCoverage } from '../targets/index';
import type { TargetProfile } from '../targets/index';
import { EXTRA_DIMENSIONS, compareExtra, extendedPurposeScore } from './extras';
import type { SharedMinerals } from './minerals';
import type { EarthPlace, ExtraDimensionId, ExtraValue, MatchDimension, MatchPurpose, MatchRecord, MatchRow, MatchSide, ValueScale } from './types';
import { verdictOf, verdictOfScore } from './verdict';

export interface MatchInput {
  /** The target. A curated entry of data/targets.json, or `profile.target`. */
  target: Target;
  /** The target profile, when the target was built from a point. Gives origin, confidence and notes. */
  profile?: TargetProfile | null;
  place: EarthPlace;
  /** Earth's observed ranges (computeEarthRanges over data/earth.json). */
  ranges: EarthRanges;
  /** data/lithology_similarity.json, or null. */
  table: LithologyTable | null;
  /** Rock class legend of data/earth.json, to print class names. */
  classes?: readonly LithologyClass[];
  /** Preset for the all-round score. Default "base". */
  presetId?: PresetId;
  /** Per-dimension index of all Earth cells for this target (buildProfileIndex), to add percentiles. */
  index?: ProfileIndex | null;
  /** Target-side values for dimensions added after the freeze. */
  targetExtras?: Partial<Record<ExtraDimensionId, ExtraValue>>;
  /** Result of sharedMinerals() for this pair, when both sides have minerals. */
  minerals?: SharedMinerals | null;
  /**
   * Set when `target` carries terrain measured in a window the size of the site's footprint
   * (targetAtSiteWindow). Changes only a caveat line.
   */
  terrainLikeForLike?: boolean;
  /** Timestamp to write. Default: now. Pass a fixed value for reproducible output. */
  generatedAt?: string;
}

const SUN_SOURCE = 'Computed from latitude and axial tilt (annual mean noon Sun elevation; tilt from NASA NSSDCA fact sheets and NASA Photojournal PIA13720)';
const NO_SIDE: MatchSide = { value: null, text: 'no data', source: null, badge: null, scale: null };

function printValue(value: number, key: ScoreKey): string {
  const info = KEY_INFO[key];
  const text = formatValue(value, info.decimals);
  if (info.unit === '') return text;
  return info.unit === '°' ? `${text}°` : `${text} ${info.unit}`;
}

function className(code: number, classes: readonly LithologyClass[] | undefined): string {
  const label = classes?.find((c) => c.code === code)?.label;
  return label ?? `class ${code}`;
}

const MORE: Partial<Record<ScoreKey, [string, string]>> = {
  tempMean: ['warmer', 'colder'],
  tempRange: ['larger', 'smaller'],
  precip: ['wetter', 'drier'],
  slope: ['steeper', 'flatter'],
  roughness: ['rougher', 'smoother'],
  sunElevation: ['higher', 'lower'],
  ndvi: ['more vegetated', 'barer'],
};

function rowFor(k: KeyBreakdown, input: MatchInput, prepared: PreparedTarget): MatchRow {
  const info = KEY_INFO[k.key];
  const tv = k.key === 'sunElevation' ? null : input.target.values[k.key];
  const prov = k.key === 'sunElevation' ? null : input.place.provenance[k.key];
  const clamped = k.targetValue !== null && k.targetClamped !== null && k.targetValue !== k.targetClamped;

  // Earth side
  let earth: MatchSide = NO_SIDE;
  if (k.earthValue !== null) {
    if (k.key === 'lithology') {
      const name = className(k.earthValue, input.classes);
      earth = { value: k.earthValue, text: input.place.rockName ? `${name} ("${input.place.rockName}")` : name, source: prov?.source ?? null, badge: prov?.badge ?? null, scale: prov?.scale ?? input.place.scale };
    } else if (k.key === 'sunElevation') {
      earth = { value: k.earthValue, text: printValue(k.earthValue, k.key), source: SUN_SOURCE, badge: 'Literature', scale: 'computed' };
    } else {
      earth = { value: k.earthValue, text: printValue(k.earthValue, k.key), source: prov?.source ?? null, badge: prov?.badge ?? null, scale: prov?.scale ?? input.place.scale };
    }
  } else if (k.key === 'ndvi' && k.bareGround?.source === 'landCover') {
    const bare = k.bareGround.barrenFrac ?? 0;
    const lc = input.place.provenance.barrenFrac;
    earth = { value: bare, text: `${formatValue(bare * 100, 0)}% bare ground (land cover; no NDVI here)`, source: lc?.source ?? null, badge: lc?.badge ?? null, scale: 'grid' };
  }
  if (k.key === 'ndvi' && earth.value !== null) {
    const ice = k.bareGround?.snowIceFrac ?? 0;
    const notes: string[] = [];
    if (ice > 0.005) notes.push(`${formatValue(ice * 100, 0)}% of the cell is permanent ice, which lowers the match.`);
    if (input.place.bareShare !== null) notes.push(`${formatValue(input.place.bareShare * 100, 0)}% of the footprint is bare ground.`);
    if (notes.length > 0) earth = { ...earth, note: notes.join(' ') };
  }

  // Target side
  let target: MatchSide = NO_SIDE;
  if (k.targetValue !== null) {
    const scale: ValueScale = 'target';
    if (k.key === 'lithology') {
      target = { value: k.targetValue, text: className(k.targetValue, input.classes), source: tv?.source ?? null, badge: tv?.badge ?? null, scale, ...(tv?.note ? { note: tv.note } : {}) };
    } else if (k.key === 'sunElevation') {
      target = { value: k.targetValue, text: printValue(k.targetValue, k.key), source: SUN_SOURCE, badge: 'Literature', scale: 'computed' };
    } else {
      const text = clamped ? `${printValue(k.targetValue, k.key)} (Earth's closest: ${printValue(k.targetClamped as number, k.key)})` : printValue(k.targetValue, k.key);
      target = { value: k.targetValue, text, source: tv?.source ?? null, badge: tv?.badge ?? null, scale, ...(tv?.note ? { note: tv.note } : {}) };
    }
  } else if (tv?.note) {
    target = { ...NO_SIDE, note: tv.note };
  }

  // Reason
  let reason: string;
  if (k.similarity === null) {
    if (k.status === 'missing-target' || k.targetValue === null) reason = `The target has no published ${info.label.toLowerCase()} value, so this is left out.`;
    else reason = `No ${info.label.toLowerCase()} value for the Earth place, so this is left out.`;
  } else if (k.key === 'lithology') {
    const levels = prepared.lithology?.levels;
    const e = className(k.earthValue as number, input.classes);
    const t = className(k.targetValue as number, input.classes);
    if (levels && k.similarity >= levels.same) reason = `Same rock class as the target: ${t.toLowerCase()}.`;
    else if (levels && k.similarity >= levels.related) reason = `Related rock class: ${e.toLowerCase()} here, ${t.toLowerCase()} at the target.`;
    else reason = `Unrelated rock class: ${e.toLowerCase()} here, ${t.toLowerCase()} at the target.`;
  } else if (k.key === 'ndvi' && k.bareGround?.source === 'landCover') {
    reason = `${formatValue((k.bareGround.barrenFrac ?? 0) * 100, 0)}% of the cell is ice-free bare ground; the target is all bare ground.`;
  } else {
    const diff = (k.earthValue as number) - (k.targetClamped as number);
    const words = MORE[k.key] ?? ['higher', 'lower'];
    const than = clamped ? "than the closest Earth gets to the target" : 'than the target';
    const shown = printValue(Math.abs(diff), k.key);
    const zero = printValue(0, k.key);
    if (k.key === 'ndvi') {
      reason = diff > 0.05 ? `Vegetation cover (NDVI ${formatValue(k.earthValue as number, 2)}) where the target is bare ground.` : `Bare ground, like the target (NDVI ${formatValue(k.earthValue as number, 2)}).`;
      const ice = k.bareGround?.snowIceFrac ?? 0;
      if (ice > 0.5) reason = `Permanent ice covers ${formatValue(ice * 100, 0)}% of the cell: ice is not bare ground.`;
    } else if (shown === zero) reason = `${info.label} ${earth.text}: the same as the target${clamped ? "'s closest value on Earth" : ''}.`;
    else reason = `${info.label} ${earth.text}: ${shown} ${diff > 0 ? words[0] : words[1]} ${than}.`;
  }

  return { key: k.key, label: info.label, unit: info.unit, earth, target, similarity: k.similarity, verdict: verdictOf(k.similarity), reason };
}

/** Builds the match record. Pure: the same input gives the same record (pass `generatedAt` to fix the timestamp). */
export function buildMatchRecord(input: MatchInput): MatchRecord {
  const { target, place } = input;
  const prepared = prepareTarget(target, input.ranges, input.table);
  const presetId = input.presetId ?? 'base';
  const preset = PRESETS[presetId];

  // Rows always come from the Base weights, so that no key is "zero-weight" and every row is filled.
  const full = scoreCell(place.cell, prepared, PRESETS.base.weights);
  const scored = presetId === 'base' ? full : scoreCell(place.cell, prepared, preset.weights);
  const byFactor = new Map<string, FactorBreakdown>(full.breakdown.map((f) => [f.factor, f]));
  const sims = dimensionSimilarities(place.cell, prepared);

  const dimensions: MatchDimension[] = DIMENSIONS.map((d) => {
    const rows = d.factors.flatMap((f) => (byFactor.get(f)?.keys ?? []).map((k) => rowFor(k, input, prepared)));
    const similarity = sims[d.id];
    const compared = rows.filter((r) => r.similarity !== null);
    let reason: string;
    if (similarity === null || compared.length === 0) reason = rows[0]?.reason ?? 'No data.';
    else {
      const weakest = compared.reduce((a, b) => ((b.similarity as number) < (a.similarity as number) ? b : a));
      reason = weakest.reason;
      const left = rows.length - compared.length;
      if (left > 0) reason += ` ${left} of ${rows.length} measurements had no data.`;
    }
    return {
      id: d.id,
      label: d.label,
      measures: d.measures,
      inScore: true,
      addedAfterFreeze: false,
      similarity,
      verdict: verdictOf(similarity),
      reason,
      percentile: similarity !== null && input.index ? rankIn(input.index.sorted[d.id], similarity).midPercentile : null,
      rows,
    };
  });

  const extraDims = EXTRA_DIMENSIONS.map((def) => compareExtra(def, place.extras[def.id], input.targetExtras?.[def.id], def.id === 'minerals' ? input.minerals : null));
  const extraSims = extraDims.map((d) => ({ id: d.id as ExtraDimensionId, similarity: d.similarity }));

  const purposes: MatchPurpose[] = PURPOSES.map((p) => {
    const score = scoreCell(place.cell, prepared, purposeWeights(p.id)).score;
    const factors = p.dimensions.flatMap((d) => DIMENSIONS.find((x) => x.id === d)?.factors ?? []);
    const extended = extendedPurposeScore(p.id, score, factors, extraSims);
    return { id: p.id, label: p.label, why: p.why, score, verdict: verdictOfScore(score), extraDimensions: extended.used, extendedScore: extended.score };
  });

  const withData = dimensions.filter((d) => d.similarity !== null);
  const strongest = withData.length > 0 ? withData.reduce((a, b) => ((b.similarity as number) > (a.similarity as number) ? b : a)) : null;
  const weakest = withData.length > 0 ? withData.reduce((a, b) => ((b.similarity as number) < (a.similarity as number) ? b : a)) : null;

  const tc = targetCoverage(target);
  const profile = input.profile ?? null;
  const caveats: string[] = [...place.notes];
  if (place.scale === 'site') {
    caveats.push(
      input.terrainLikeForLike
        ? 'Terrain is compared with the target measured in a window of the same size as the footprint. A small window describes the ground at that point, not the whole landform.'
        : 'Terrain here is from a small footprint, but the target terrain is measured over 55.6 km. Roughness grows with the window, so the terrain comparison is not like for like.',
    );
  }
  if (profile) caveats.push(...profile.notes);
  for (const w of prepared.warnings) caveats.push(w);
  caveats.push('Dimensions marked as added after the freeze are not part of the all-round score and have not been validated.');
  caveats.push('Gravity, vacuum or thin air, and radiation are never scored. They are listed under what Earth cannot copy.');

  return {
    version: 1,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    target: {
      id: target.id,
      name: target.name,
      body: target.body,
      lat: target.lat,
      lon: target.lon,
      summary: target.summary,
      origin: profile?.origin ?? 'curated',
      confidence: profile?.confidence ?? (tc.coverage >= 1 ? 'high' : tc.coverage >= 0.8 ? 'medium' : 'low'),
      missing: profile?.missing ?? tc.missing,
      notes: profile?.notes ?? [],
    },
    earth: {
      id: place.id,
      name: place.name,
      lat: place.lat,
      lon: place.lon,
      scale: place.scale,
      footprintKm: place.footprintKm,
      rockName: place.rockName,
      bareShare: place.bareShare,
      notes: place.notes,
    },
    score: {
      preset: preset.id,
      value: scored.score,
      verdict: verdictOfScore(scored.score),
      confidence: scored.confidence,
      coverage: scored.coverage,
      missing: scored.missing,
      unscoredReason: scored.unscoredReason,
      limitingFactor: scored.limitingFactor,
      reason: scored.reason,
    },
    dimensions: [...dimensions, ...extraDims],
    purposes,
    cannotCopy: [...target.cannotCopy],
    beyondEarth: prepared.gaps.map((g) => ({
      key: g.key,
      label: g.label,
      text: `${g.label}: the target is ${printValue(g.targetValue, g.key)}; the closest any Earth cell comes is ${printValue(g.clampedValue, g.key)}.`,
    })),
    headline: {
      strongest: strongest ? `${strongest.label}: ${strongest.reason}` : null,
      weakest: weakest && weakest !== strongest ? `${weakest.label}: ${weakest.reason}` : null,
    },
    caveats,
  };
}

/** The sun elevation both sides of a record were compared on, for callers that want it without a record. */
export function sunElevations(target: Target, place: EarthPlace): { earth: number; target: number } {
  return { earth: sunElevation('earth', place.lat), target: sunElevation(target.body, target.lat) };
}

// Re-exported so callers do not need to know which factor a key belongs to.
export const CORE_KEYS: readonly ScoreKey[] = FACTORS.flatMap((f) => f.keys);
export type { Badge };

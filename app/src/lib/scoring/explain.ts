import { KEY_INFO, MIN_COVERAGE } from './factors';
import type { CellSummary, ClampGap, FactorBreakdown, FactorId, KeyBreakdown, PreparedTarget, ScoreKey } from './types';

/** Plain names for data keys, used inside sentences. */
const KEY_NOUN: Record<ScoreKey, string> = {
  tempMean: 'mean temperature',
  tempRange: 'day-night temperature swing',
  precip: 'precipitation',
  ndvi: 'vegetation (NDVI)',
  slope: 'slope',
  roughness: 'roughness',
  lithology: 'rock class',
  sunElevation: 'Sun elevation',
};

const FACTOR_NOUN: Record<FactorId, string> = {
  terrain: 'terrain',
  bareGround: 'bare ground',
  dryness: 'dryness',
  temperature: 'temperature',
  sunlight: 'sunlight',
  rockType: 'rock type',
};

/** Formats a number for a sentence, with thousands separators and a fixed number of decimals. */
export function formatValue(value: number, decimals: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function withUnit(value: number, key: ScoreKey): string {
  const info = KEY_INFO[key];
  const text = formatValue(value, info.decimals);
  if (info.unit === '') return text;
  return info.unit === '°' ? `${text}°` : `${text} ${info.unit}`;
}

function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1] ?? ''}`;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A word for the overall score. Presentation only: it does not affect any number. */
export function matchWord(score: number): string {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Partial';
  if (score >= 20) return 'Weak';
  return 'Poor';
}

/** Describes how one key differs from the target, for the limiting-factor sentence. */
function describeKeyGap(k: KeyBreakdown, pt: PreparedTarget): string {
  if (k.key === 'lithology') {
    const related = pt.lithology !== null && k.similarity !== null && k.similarity >= pt.lithology.levels.related;
    return related
      ? 'the rock class is related to the target rock but not the same'
      : 'the rock class is unrelated to the target rock';
  }
  if (k.key === 'ndvi' && k.bareGround) {
    const ice = k.bareGround.snowIceFrac ?? 0;
    const percent = (v: number): string => `${formatValue(v * 100, 0)}%`;
    if (k.bareGround.source === 'landCover') {
      const bare = k.bareGround.barrenFrac ?? 0;
      return `only ${percent(bare)} of the cell is ice-free bare ground and ${percent(ice)} is permanent ice`;
    }
    // With NDVI, the similarity is the vegetation match times the ice-free share. Name whichever costs more.
    const vegetationMatch = ice < 1 && k.similarity !== null ? k.similarity / (1 - ice) : 1;
    if (1 - ice < vegetationMatch) return `permanent ice covers ${percent(ice)} of the cell`;
  }
  if (k.earthValue === null || k.targetClamped === null) return `no ${KEY_NOUN[k.key]} data`;

  const diff = k.earthValue - k.targetClamped;
  const amount = withUnit(Math.abs(diff), k.key);
  const than = k.targetValue !== k.targetClamped ? "than the closest Earth gets to the target" : 'than the target';
  const up = diff > 0;
  switch (k.key) {
    case 'tempMean':
      return `${amount} ${up ? 'warmer' : 'colder'} ${than}`;
    case 'tempRange':
      return `a day-night temperature swing ${amount} ${up ? 'larger' : 'smaller'} ${than}`;
    case 'precip':
      return `${amount} ${up ? 'wetter' : 'drier'} ${than}`;
    case 'ndvi':
      return up
        ? `vegetation cover (NDVI ${formatValue(k.earthValue, 2)}) where the target is bare ground`
        : `NDVI ${formatValue(k.earthValue, 2)} is below the bare-ground reference of ${formatValue(k.targetClamped, 2)}`;
    case 'slope':
      return `slopes ${amount} ${up ? 'steeper' : 'flatter'} ${than}`;
    case 'roughness':
      return `relief ${amount} ${up ? 'rougher' : 'smoother'} ${than}`;
    case 'sunElevation':
      return `a noon Sun ${amount} ${up ? 'higher' : 'lower'} ${than}`;
  }
}

/**
 * One or two plain-language sentences for a scored or unscored cell.
 * Every number in the text is taken from the breakdown, never invented.
 */
export function buildReason(
  result: CellSummary,
  factors: readonly FactorBreakdown[],
  limitingFactor: FactorId | null,
  pt: PreparedTarget,
): string {
  const missingNouns = result.missing.map((key) => KEY_NOUN[key]);

  if (result.unscoredReason === 'required-factor-missing') {
    const required = factors
      .flatMap((f) => f.keys)
      .filter((k) => (k.key === 'ndvi' || k.key === 'precip') && k.similarity === null);
    const fromTarget = required.filter((k) => k.status === 'missing-target').map((k) => KEY_NOUN[k.key]);
    const fromEarth = required.filter((k) => k.status === 'missing-earth').map((k) => KEY_NOUN[k.key]);
    const parts: string[] = [];
    if (fromEarth.length > 0) {
      const names = fromEarth.map((n) => (n === KEY_NOUN.ndvi ? 'vegetation (NDVI) or land cover' : n));
      parts.push(`this cell has no ${joinList(names)} data`);
    }
    if (fromTarget.length > 0) parts.push(`the target has no published ${joinList(fromTarget)} value`);
    return `No score: ${joinList(parts)}. Bare ground and precipitation are required.`;
  }

  if (result.unscoredReason === 'coverage-too-low') {
    const have = Math.round(result.coverage * 100);
    const need = Math.round(MIN_COVERAGE * 100);
    return `No score: only ${have}% of the weighted factors have data and ${need}% is needed. Missing: ${joinList(missingNouns)}.`;
  }

  const score = result.score ?? 0;
  const sentences: string[] = [];
  let first = `${matchWord(score)} match for ${pt.target.name}`;

  const strong = factors
    .filter((f) => f.effectiveWeight > 0 && f.similarity !== null && f.similarity >= 0.8 && f.factor !== limitingFactor)
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    .slice(0, 2)
    .map((f) => FACTOR_NOUN[f.factor]);
  if (strong.length > 0) first += `: close on ${joinList(strong)}`;
  sentences.push(`${first}.`);

  const limiting = factors.find((f) => f.factor === limitingFactor);
  if (limiting) {
    let worst: KeyBreakdown | null = null;
    for (const k of limiting.keys) {
      if (k.status !== 'scored' || k.similarity === null) continue;
      if (!worst || k.similarity < (worst.similarity ?? 1)) worst = k;
    }
    if (worst) sentences.push(`Held back by ${FACTOR_NOUN[limiting.factor]}: ${describeKeyGap(worst, pt)}.`);
  }

  if (result.confidence && result.confidence !== 'high' && missingNouns.length > 0) {
    sentences.push(`${capitalise(result.confidence)} confidence: no data for ${joinList(missingNouns)}.`);
  }
  return sentences.join(' ');
}

/**
 * One sentence per target value that lies outside Earth's observed range, for the
 * "what Earth cannot copy" block. Numbers come from targets.json and earth.json, with the
 * target's own source named, as data/SCHEMA.md requires for quoted numbers.
 */
export function describeGap(gap: ClampGap, pt: PreparedTarget): string {
  const noun = capitalise(KEY_NOUN[gap.key]);
  const end = gap.gap < 0 ? 'lowest' : 'highest';
  const source =
    gap.key === 'sunElevation'
      ? 'computed from latitude and axial tilt'
      : (pt.target.values[gap.key].source ?? 'source not recorded');
  return (
    `${noun}: ${withUnit(gap.targetValue, gap.key)} at ${pt.target.name} (${source}). ` +
    `The ${end} value in the Earth grid is ${withUnit(gap.clampedValue, gap.key)}, ` +
    `so the score compares against that and the remaining ${withUnit(Math.abs(gap.gap), gap.key)} cannot be rehearsed on Earth.`
  );
}

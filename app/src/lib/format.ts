import type { CellScore, EarthFile, FactorKey, FactorMeta } from '../types';

export type MetaByKey = Partial<Record<FactorKey, FactorMeta>>;

export function metaByKey(earth: EarthFile): MetaByKey {
  const out: MetaByKey = {};
  for (const f of earth.meta.factors) out[f.key] = f;
  return out;
}

/** One short name per measurement, used everywhere. The dataset's own label, with its method, is the tooltip. */
const SHORT_LABELS: Record<string, string> = {
  tempMean: 'Mean temperature',
  tempRange: 'Day-night temperature range',
  precip: 'Precipitation',
  ndvi: 'Vegetation (NDVI)',
  slope: 'Mean slope',
  roughness: 'Roughness',
  lithology: 'Rock class',
  sunElevation: 'Noon Sun elevation',
  sunSeason: 'Seasonal Sun swing',
};

/** Decimals per quantity, the same wherever the quantity is shown. */
const DECIMALS: Record<string, number> = { tempMean: 1, tempRange: 1, precip: 0, ndvi: 2, slope: 1, roughness: 0 };
const FALLBACK_UNITS: Record<string, string> = { tempMean: '°C', tempRange: '°C', precip: 'mm/year', slope: '°', roughness: 'm' };

export const isSunKey = (key: string) => key === 'sunElevation' || key === 'sunSeason';

export function keyLabel(key: string, meta: MetaByKey): string {
  return SHORT_LABELS[key] ?? meta[key as FactorKey]?.label ?? key;
}

const minus = (s: string) => s.replace('-', '\u2212');

/** Formats one value with its unit. null becomes "no data". */
export function formatValue(key: string, value: number | null | undefined, meta: MetaByKey): string {
  if (value === null || value === undefined) return 'no data';
  if (isSunKey(key)) return `${value.toFixed(1)}°`;
  const m = meta[key as FactorKey];
  if (key === 'lithology') {
    const cls = m?.classes?.find((c) => c.code === value);
    return cls ? cls.label : `class ${value}`;
  }
  const digits = DECIMALS[key] ?? 1;
  const raw = m?.unit ?? FALLBACK_UNITS[key] ?? '';
  const unit = raw === 'degrees' || raw === 'deg' ? '°' : raw;
  // A space before every unit except the degree sign of an angle: 11.1°, 25.4 °C, 147 m.
  const gap = unit === '' || unit === '°' ? '' : ' ';
  return minus(`${value.toFixed(digits)}${gap}${unit}`);
}

export const formatScore = (s: number | null) => (s === null ? 'no data' : s.toFixed(0));
export const formatSim = (s: number | null) => (s === null ? 'no data' : s.toFixed(2));

/** One short line for the candidates list, built from the breakdown. */
export function reasonLine(e: CellScore): string {
  if (e.score === null) return 'Not scored';
  const fs = e.breakdown
    .filter((f) => f.similarity !== null && f.coveredWeight > 0)
    .sort((a, b) => (b.similarity as number) - (a.similarity as number));
  if (fs.length === 0) return 'Not scored';
  const best = fs[0];
  const limit = e.breakdown.find((f) => f.factor === e.limitingFactor) ?? fs[fs.length - 1];
  if (best.factor === limit.factor) return `Best: ${best.label.toLowerCase()}`;
  return `Best: ${best.label.toLowerCase()} · Limit: ${limit.label.toLowerCase()}`;
}

const list = (xs: string[]) =>
  xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

export function unscoredText(e: CellScore, meta: MetaByKey): string {
  if (e.unscoredReason === 'required-factor-missing') {
    const req = e.missing
      .filter((k) => k === 'ndvi' || k === 'precip')
      .map((k) => (k === 'ndvi' ? 'bare ground (NDVI or land cover)' : keyLabel(k, meta).toLowerCase()));
    return `No score. ${list(req)} ${req.length > 1 ? 'are' : 'is'} missing for this cell or this target. Bare ground and precipitation are required because they carry the veto that rules out forests and wet regions.`;
  }
  if (e.unscoredReason === 'coverage-too-low')
    return `No score. The factors with data cover ${(e.coverage * 100).toFixed(0)}% of the mission weight. The minimum is 60%.`;
  return 'No score.';
}

export const formatShare = (v: number | null | undefined) => (v === null || v === undefined ? 'no data' : `${(v * 100).toFixed(v > 0 && v < 0.1 ? 1 : 0)}%`);

// A place or target name cut at its first comma, except a comma inside brackets, so
// "Perseverance (Octavia E. Butler Landing, Jezero crater)" never loses its closing bracket.
export function shortName(name: string): string {
  let depth = 0;
  for (let i = 0; i < name.length; i++) {
    const c = name[i];
    if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if (c === ',' && depth === 0) return name.slice(0, i);
  }
  return name;
}

const PLAIN_KEY: Record<string, string> = {
  ndvi: 'vegetation (NDVI)',
  precip: 'precipitation',
  tempMean: 'mean temperature',
  tempRange: 'day-night swing',
  slope: 'slope',
  roughness: 'roughness',
  lithology: 'rock type',
  sunElevation: 'sun elevation',
  sunSeason: 'sun season',
  wind: 'wind',
  dust: 'dust',
  ice: 'ground ice',
  minerals: 'minerals',
};
/** Plain words for a list of value keys, for sentences a visitor reads. */
export const plainKeys = (keys: readonly string[]): string => keys.map((k) => PLAIN_KEY[k] ?? k).join(', ');

import type { CellScore, EarthFile, FactorKey, FactorMeta } from '../types';

export type MetaByKey = Partial<Record<FactorKey, FactorMeta>>;

export function metaByKey(earth: EarthFile): MetaByKey {
  const out: MetaByKey = {};
  for (const f of earth.meta.factors) out[f.key] = f;
  return out;
}

const FALLBACK_LABELS: Record<string, string> = {
  tempMean: 'Mean temperature',
  tempRange: 'Day-night swing',
  precip: 'Precipitation',
  ndvi: 'Vegetation (NDVI)',
  slope: 'Mean slope',
  roughness: 'Roughness',
  lithology: 'Rock class',
  sunElevation: 'Noon Sun elevation',
  sunSeason: 'Seasonal Sun swing',
};

export const isSunKey = (key: string) => key === 'sunElevation' || key === 'sunSeason';

export function keyLabel(key: string, meta: MetaByKey): string {
  return meta[key as FactorKey]?.label ?? FALLBACK_LABELS[key] ?? key;
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
  const digits = key === 'ndvi' ? 2 : Math.abs(value) >= 100 ? 0 : 1;
  const raw = m?.unit ?? '';
  const unit = raw === 'degrees' || raw === 'deg' ? '°' : raw;
  const gap = unit === '' || unit.startsWith('°') ? '' : ' ';
  return minus(`${value.toFixed(digits)}${gap}${unit}`);
}

export const formatScore = (s: number | null) => (s === null ? '\u2014' : s.toFixed(0));
export const formatSim = (s: number | null) => (s === null ? '\u2014' : s.toFixed(2));

/** One short line for the candidates list, built from the breakdown. */
export function reasonLine(e: CellScore): string {
  if (e.score === null) return 'Not scored.';
  const fs = e.breakdown
    .filter((f) => f.similarity !== null && f.coveredWeight > 0)
    .sort((a, b) => (b.similarity as number) - (a.similarity as number));
  if (fs.length === 0) return 'Not scored.';
  const best = fs[0];
  const limit = e.breakdown.find((f) => f.factor === e.limitingFactor) ?? fs[fs.length - 1];
  if (best.factor === limit.factor) return `Strongest: ${best.label.toLowerCase()}.`;
  return `Strongest: ${best.label.toLowerCase()}. Limited by: ${limit.label.toLowerCase()}.`;
}

const list = (xs: string[]) =>
  xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

export function unscoredText(e: CellScore, meta: MetaByKey): string {
  if (e.unscoredReason === 'required-factor-missing') {
    const req = e.missing.filter((k) => k === 'ndvi' || k === 'precip').map((k) => keyLabel(k, meta).toLowerCase());
    return `No score. ${list(req)} ${req.length > 1 ? 'are' : 'is'} missing for this cell or this target. Vegetation and precipitation are required because they carry the veto that rules out forests and wet regions.`;
  }
  if (e.unscoredReason === 'coverage-too-low')
    return `No score. The factors with data cover ${(e.coverage * 100).toFixed(0)}% of the mission weight. The minimum is 60%.`;
  return 'No score.';
}

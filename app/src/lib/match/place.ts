// Builds an EarthPlace: the cell the scoring functions read, with the source of every value.

import type { Badge, EarthCell, FactorKey, Target } from '../scoring/index';
import { emitFamilies, listLabels } from './minerals';
import type { EmitMineralogy, MineralFamily } from './minerals';
import type { EarthPlace, ExtraValue, ValueScale } from './types';

/** The parts of data/earth.json `meta` that say where each value came from. */
export interface EarthMetaLike {
  factors: readonly { key: string; source: string; badge?: Badge | null }[];
  landCover?: { source: string } | null;
}

const KEYS: readonly FactorKey[] = ['tempMean', 'tempRange', 'precip', 'ndvi', 'slope', 'roughness', 'lithology'];

function gridProvenance(meta: EarthMetaLike): EarthPlace['provenance'] {
  const out: EarthPlace['provenance'] = {};
  for (const key of KEYS) {
    const f = meta.factors.find((x) => x.key === key);
    out[key] = { source: f?.source ?? null, badge: f?.badge ?? (f ? 'Measured' : null), scale: 'grid' };
  }
  const lc = meta.landCover?.source ?? null;
  out.snowIceFrac = { source: lc, badge: lc ? 'Measured' : null, scale: 'grid' };
  out.barrenFrac = { source: lc, badge: lc ? 'Measured' : null, scale: 'grid' };
  return out;
}

/** An Earth place that is one 0.5 degree cell of data/earth.json. */
export function earthPlaceFromCell(cell: EarthCell, meta: EarthMetaLike, options: { name?: string; id?: string | null } = {}): EarthPlace {
  return {
    id: options.id ?? null,
    name: options.name ?? `Earth cell ${Math.abs(cell.lat).toFixed(2)} ${cell.lat >= 0 ? 'N' : 'S'}, ${Math.abs(cell.lon).toFixed(2)} ${cell.lon >= 0 ? 'E' : 'W'}`,
    lat: cell.lat,
    lon: cell.lon,
    scale: 'grid',
    footprintKm: null,
    cell,
    provenance: gridProvenance(meta),
    rockName: null,
    bareShare: null,
    extras: {},
    notes: ['Every value describes a 0.5 degree cell, about 55 km across, not a single feature inside it.'],
  };
}

/** One value of data/sites.json (Session B). */
export interface SiteValueLike {
  value: number | string | null;
  unit?: string;
  scale: string;
  source: string | null;
  badge: Badge | null;
  windowKm?: number;
  pixels?: number;
}

/** One entry of data/sites.json, as far as this library reads it. */
export interface SiteEntryLike {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind?: string;
  footprintKm: number;
  footprintNote?: string | null;
  footprintStatus?: string | null;
  caveat?: string | null;
  values: Record<string, SiteValueLike | undefined>;
  mineralogy?: EmitMineralogy | null;
}

const num = (v: SiteValueLike | undefined): number | null => (v && typeof v.value === 'number' && Number.isFinite(v.value) ? v.value : null);
const scaleOf = (v: SiteValueLike | undefined): ValueScale => (v?.scale === 'site' || v?.scale === 'volcano' ? v.scale : 'grid');

/** Number of 463 m posts along one side of the site's terrain window. */
export function sitePosts(site: SiteEntryLike): number {
  const w = site.values.slope?.windowKm;
  return typeof w === 'number' ? Math.round((w * 1000) / 463) : Math.max(1, Math.round((site.footprintKm * 1000) / 463));
}

/**
 * An Earth place that is a named site of data/sites.json. Terrain, vegetation and rock come from the
 * site's own footprint. Temperature and precipitation are those of the 0.5 degree cell, and the
 * record says so.
 *
 * `gridCell` is the Earth cell that holds the site (nearestCell of the scoring library).
 * Pass `families` (data/target_minerals.json) to reduce the site's EMIT minerals to families.
 */
export function earthPlaceFromSite(
  site: SiteEntryLike,
  gridCell: EarthCell,
  meta: EarthMetaLike,
  options: { families?: readonly MineralFamily[]; emitMinimumShare?: number } = {},
): EarthPlace {
  const v = site.values;
  const cell: EarthCell = {
    ...gridCell,
    lat: site.lat,
    lon: site.lon,
    slope: num(v.slope),
    roughness: num(v.roughness),
    ndvi: num(v.ndvi),
    lithology: num(v.lithology),
    tempMean: num(v.tempMean) ?? gridCell.tempMean,
    tempRange: num(v.tempRange) ?? gridCell.tempRange,
    precip: num(v.precip) ?? gridCell.precip,
  };
  const provenance = gridProvenance(meta);
  for (const key of KEYS) {
    const sv = v[key];
    if (sv && sv.value !== null) provenance[key] = { source: sv.source, badge: sv.badge, scale: scaleOf(sv) };
    else if (key === 'slope' || key === 'roughness' || key === 'ndvi' || key === 'lithology') provenance[key] = { source: null, badge: null, scale: 'site' };
  }

  const notes: string[] = [
    `Terrain and vegetation are measured inside a ${site.footprintKm} km footprint${site.footprintStatus === 'provisional' ? ' (provisional outline)' : ''}. Temperature and precipitation are those of the 0.5 degree cell around it.`,
  ];
  if (site.footprintNote) notes.push(site.footprintNote);
  if (site.caveat) notes.push(site.caveat);
  if (scaleOf(v.lithology) === 'volcano' && num(v.lithology) !== null) notes.push('The rock class is that of the whole volcano, not mapped inside the footprint.');

  const extras: EarthPlace['extras'] = {};
  if (options.families && site.mineralogy) {
    const summary = emitFamilies(site.mineralogy, options.families, options.emitMinimumShare);
    if (summary) {
      const value: ExtraValue = {
        value: summary.families.map((m) => m.family),
        unit: '',
        text: summary.families.length > 0 ? listLabels(summary.families.map((m) => m.label)) : 'no mineral identified',
        source: site.mineralogy.source,
        badge: site.mineralogy.badge,
        scale: 'site',
        note: `Spectral identifications from orbit on ${site.mineralogy.date ?? 'one date'}: how often a mineral's signature is seen, not how much is present.${summary.nonMineralShare > 0.3 ? ` Dry vegetation is matched in ${Math.round(summary.nonMineralShare * 100)}% of the pixels, which hides the ground.` : ''}`,
      };
      extras.minerals = value;
    } else if (site.mineralogy.note) {
      extras.minerals = { value: null, unit: '', text: 'no data', source: null, badge: null, scale: 'site', note: site.mineralogy.note };
    }
  }

  return {
    id: site.id,
    name: site.name,
    lat: site.lat,
    lon: site.lon,
    scale: 'site',
    footprintKm: site.footprintKm,
    cell,
    provenance,
    rockName: typeof v.rockType?.value === 'string' ? v.rockType.value : null,
    bareShare: num(v.bareFrac),
    extras,
    notes,
  };
}

/** One row of data/target_windows.json: a target's terrain measured in a site-sized window. */
export interface TargetWindowsFile {
  meta: { generatedAt: string; note: string; postM: number; terrainFraction: number; slopeSigmaFloor: number; roughnessSigmaFloor: number; source: Record<string, string> };
  /** windows[posts][targetId] = { slope, roughness } */
  windows: Record<string, Record<string, { slope: number | null; roughness: number | null }>>;
}

/**
 * The target with slope and roughness measured in a window of the same size as a site's footprint,
 * so that terrain is compared like for like (roughness grows with the window). Tolerances follow the
 * frozen rule: a fixed share of the value, with floors. Returns null when that window was not measured.
 */
export function targetAtSiteWindow(target: Target, posts: number, file: TargetWindowsFile): Target | null {
  const w = file.windows[String(posts)]?.[target.id];
  if (!w) return null;
  const { terrainFraction, slopeSigmaFloor, roughnessSigmaFloor } = file.meta;
  const source = `${file.meta.source[target.body] ?? 'Mission elevation model'}, measured in a ${((posts * file.meta.postM) / 1000).toFixed(1)} km window centred on the target (data/target_windows.json)`;
  const values = { ...target.values };
  values.slope = w.slope === null ? { value: null, sigma: null, source: null, badge: null } : { value: w.slope, sigma: Math.max(slopeSigmaFloor, terrainFraction * w.slope), source, badge: 'Mission' };
  values.roughness = w.roughness === null ? { value: null, sigma: null, source: null, badge: null } : { value: w.roughness, sigma: Math.max(roughnessSigmaFloor, terrainFraction * w.roughness), source, badge: 'Mission' };
  return { ...target, values };
}

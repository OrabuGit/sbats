// Minerals on both sides (added after the freeze, site-level only).
//
// Earth side: NASA EMIT mineral identifications inside a site's footprint (data/sites.json,
// `mineralogy`, Session B). Target side: minerals reported by rovers, landers and orbiters in cited
// papers (data/target_minerals.json). Both are reduced to mineral families so they can be compared.
//
// What this is and is not. An EMIT identification is a spectral match in a 60 m pixel: it says a
// mineral's absorption feature was seen, not how much of the mineral is there, and it is weak under
// vegetation. A rover's X-ray diffraction is a laboratory measurement of one drilled sample. Sharing
// a mineral family is a pointer for a geologist, not proof of the same rock.

import type { Badge } from '../scoring/index';

/** A mineral family both sides can be reduced to. Defined in data/target_minerals.json. */
export interface MineralFamily {
  id: string;
  label: string;
  /**
   * Lower-case fragments of EMIT spectral-library names that belong to the family ("hematite",
   * "nontronite"). Empty when EMIT's library has no entry for the family.
   */
  emitPatterns: string[];
  /** Plain note, for example why EMIT cannot see the family. */
  note?: string | null;
}

/** One mineral reported at a target, from a cited source. */
export interface TargetMineral {
  family: string;
  /** The mineral as the source names it. */
  name: string;
  method: 'in-place' | 'orbital';
  instrument: string;
  /** Abundance as the source states it, or null. */
  abundance: string | null;
  source: string;
  url: string | null;
  badge: Badge;
  /** How the source was read: primary text, abstract, or a secondary page. */
  access: string;
}

export interface TargetMineralsFile {
  meta: { generatedAt: string; note: string; emitMinimumShare: number };
  families: MineralFamily[];
  targets: Record<string, { minerals: TargetMineral[]; note?: string | null }>;
}

/** One entry of sites.json `mineralogy.value.group1.top` (Session B). */
export interface EmitEntry {
  libraryName: string;
  libraryTitle: string | null;
  shareOfValidPixels: number;
  meanBandDepth: number;
}
export interface EmitMineralogy {
  value: { group1?: { identifiedShare: number; top: EmitEntry[] } | null; group2?: { identifiedShare: number; top: EmitEntry[] } | null } | null;
  source: string | null;
  badge: Badge | null;
  date?: string | null;
  validShare?: number | null;
  note?: string | null;
}

/** A family identified by EMIT at an Earth site. */
export interface EarthMineral {
  family: string;
  label: string;
  /** Sum of the shares of valid pixels over the matching library entries. How often it is seen, not how much there is. */
  shareOfValidPixels: number;
  libraryTitles: string[];
}

/**
 * An EMIT identification counts when its family is matched in at least this share of the valid
 * pixels of the footprint. A display rule, read from the data file's meta, with this default.
 */
export const DEFAULT_EMIT_MINIMUM_SHARE = 0.01;

/** Library entries that are not minerals (dry grass, wood, plastics) are never counted. */
function isNonMineral(libraryName: string): boolean {
  const n = libraryName.toLowerCase();
  return n.startsWith('organic') || n.includes('vegetation') || n.includes('plastic') || n.includes('snow') || n.includes('ice_');
}

/**
 * The families an EMIT library name belongs to. A library entry can be a mixture ("kaolin.5+smect.5",
 * "hematite.1+goeth.4+qtz"): it then counts for every family named in it.
 */
export function familiesOfEmitName(libraryName: string, families: readonly MineralFamily[]): MineralFamily[] {
  const n = libraryName.toLowerCase();
  return families.filter((family) => family.emitPatterns.some((p) => p.length > 0 && n.includes(p.toLowerCase())));
}

/** The first family of an EMIT library name, or null when no family claims it. */
export function familyOfEmitName(libraryName: string, families: readonly MineralFamily[]): MineralFamily | null {
  return familiesOfEmitName(libraryName, families)[0] ?? null;
}

export interface EmitSummary {
  /** Families identified in at least the minimum share of valid pixels, most frequent first. */
  families: EarthMineral[];
  /** Library entries seen that no family claims: shown so nothing is silently dropped. */
  unassigned: EmitEntry[];
  /** Share of valid pixels matched to dry vegetation or other non-mineral entries, summed. */
  nonMineralShare: number;
}

/** Reduces an EMIT mineralogy record to mineral families. Returns null when the site has no EMIT data. */
export function emitFamilies(
  mineralogy: EmitMineralogy | null | undefined,
  families: readonly MineralFamily[],
  minimumShare: number = DEFAULT_EMIT_MINIMUM_SHARE,
): EmitSummary | null {
  if (!mineralogy || !mineralogy.value) return null;
  const entries = [...(mineralogy.value.group1?.top ?? []), ...(mineralogy.value.group2?.top ?? [])];
  const byFamily = new Map<string, EarthMineral>();
  const unassigned: EmitEntry[] = [];
  let nonMineralShare = 0;
  for (const e of entries) {
    if (isNonMineral(e.libraryName)) {
      nonMineralShare += e.shareOfValidPixels;
      continue;
    }
    const matched = familiesOfEmitName(e.libraryName, families);
    if (matched.length === 0) {
      unassigned.push(e);
      continue;
    }
    for (const family of matched) {
      const row = byFamily.get(family.id) ?? { family: family.id, label: family.label, shareOfValidPixels: 0, libraryTitles: [] };
      row.shareOfValidPixels += e.shareOfValidPixels;
      row.libraryTitles.push(e.libraryTitle ?? e.libraryName);
      byFamily.set(family.id, row);
    }
  }
  const kept = [...byFamily.values()]
    .map((m) => ({ ...m, shareOfValidPixels: Math.round(m.shareOfValidPixels * 1000) / 1000 }))
    .filter((m) => m.shareOfValidPixels >= minimumShare)
    .sort((a, b) => b.shareOfValidPixels - a.shareOfValidPixels || a.family.localeCompare(b.family));
  return { families: kept, unassigned, nonMineralShare: Math.round(nonMineralShare * 1000) / 1000 };
}

export interface SharedMinerals {
  /** Families reported at the target and identified by EMIT at the Earth site. */
  shared: { family: string; label: string; target: TargetMineral[]; earthShare: number }[];
  /** Reported at the target, could be identified by EMIT, but not identified at this site. */
  targetOnly: { family: string; label: string; target: TargetMineral[] }[];
  /** Reported at the target, but EMIT's library cannot identify the family: no comparison is possible. */
  notComparable: { family: string; label: string; target: TargetMineral[] }[];
  /** Identified at the Earth site, not reported at the target. */
  earthOnly: EarthMineral[];
  /** shared / (shared + targetOnly), 0 to 1, or null when nothing can be compared. */
  similarity: number | null;
}

/**
 * Which mineral families the two sides share. The similarity is the share of the target's
 * comparable families that EMIT also identified at the Earth site. It is a count of families,
 * not a measure of abundance.
 */
export function sharedMinerals(earth: EmitSummary | null, target: readonly TargetMineral[] | null | undefined, families: readonly MineralFamily[]): SharedMinerals | null {
  if (!earth || !target || target.length === 0) return null;
  const byId = new Map(families.map((f) => [f.id, f]));
  const targetByFamily = new Map<string, TargetMineral[]>();
  for (const m of target) targetByFamily.set(m.family, [...(targetByFamily.get(m.family) ?? []), m]);
  const earthById = new Map(earth.families.map((m) => [m.family, m]));

  const out: SharedMinerals = { shared: [], targetOnly: [], notComparable: [], earthOnly: [], similarity: null };
  for (const [id, list] of targetByFamily) {
    const family = byId.get(id);
    const label = family?.label ?? id;
    const seen = earthById.get(id);
    if (!family || family.emitPatterns.length === 0) out.notComparable.push({ family: id, label, target: list });
    else if (seen) out.shared.push({ family: id, label, target: list, earthShare: seen.shareOfValidPixels });
    else out.targetOnly.push({ family: id, label, target: list });
  }
  out.earthOnly = earth.families.filter((m) => !targetByFamily.has(m.family));
  const comparable = out.shared.length + out.targetOnly.length;
  out.similarity = comparable > 0 ? out.shared.length / comparable : null;
  return out;
}

/** "hematite, goethite and smectite clay" */
export function listLabels(labels: readonly string[]): string {
  const l = labels.map((x) => x.toLowerCase());
  if (l.length <= 1) return l.join('');
  return `${l.slice(0, -1).join(', ')} and ${l[l.length - 1] ?? ''}`;
}

// Site-level scores: every site in data/sites.json, scored from its fine-scale values.
//
//     npx tsx validation/score_sites.ts
//
// The global score reads one value per 0.5 degree cell (about 55 km). data/sites.json (Session B)
// measures the same factors inside a 2 to 5 km footprint around each named site. This script builds,
// for each site, a "site cell" from those values and passes it through the frozen scoring library:
// the analog profile (similarity per dimension) and the purpose scores. Nothing is tuned and no
// formula, sigma or weight is changed.
//
// What is fine-scale and what is not (the report repeats this):
//   terrain      slope and roughness on 463 m posts inside the footprint               site scale
//   bare ground  mean NDVI of the footprint (Sentinel-2, 10 m)                         site scale
//   geology      rock class of the site's map unit, or of the whole volcano            site or volcano scale
//   climate      temperature and precipitation of the 0.5 degree cell                  GRID scale, unchanged
//   sunlight     from latitude                                                          exact
//
// Terrain needs care. Roughness is the spread of elevation inside the window, so it grows with the
// window: a target measured over 55.6 km has far more relief than any 3 km footprint. For the site
// comparison the target's slope and roughness are therefore measured again in a window of the same
// number of 463 m posts as the site (validation/target_terrain.py --posts, written to
// validation/output/target_terrain_windows.json), with the tolerance set by the frozen rule
// (half the target value, at least 1 degree or 50 m). The comparison against the 55.6 km target
// values is reported next to it.
//
// Percentiles compare a site-scale similarity with the similarities of all 0.5 degree Earth cells.
// That mixes two scales and is a rough guide only.
//
// It refuses to run before the freeze, like score_candidates.ts. Candidate sites are findings: they
// are never used to tune or validate anything.
//
// Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DIMENSIONS,
  PURPOSES,
  buildProfileIndex,
  dimensionSimilarities,
  nearestCell,
  prepareTarget,
  purposeWeights,
  rankIn,
  scoreCell,
  scoreCells,
} from '../app/src/lib/scoring/index';
import type { DimensionId, EarthCell, PurposeId, Target } from '../app/src/lib/scoring/index';
import { DATA, MAX_SNAP_KM, OUT, fail, loadData, loadFrozen, readJson } from './lib';

interface SiteValue {
  value: number | string | null;
  unit: string;
  scale: 'site' | 'volcano' | 'grid';
  source: string | null;
  badge: string | null;
  windowKm?: number;
  pixels?: number;
  postM?: number;
  label?: string;
}
interface SiteEntry {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: 'candidate' | 'known';
  footprintKm: number;
  footprintNote: string;
  /** false for sites that Session B defines in pipeline/sites.py and that data/analogs.json does not list. */
  inAnalogsJson?: boolean;
  footprintStatus?: string | null;
  caveat?: string | null;
  gridCell?: { lat: number; lon: number } | null;
  values: Record<string, SiteValue>;
}
interface SitesFile {
  meta: { generatedAt: string };
  sites: SiteEntry[];
}
interface WindowsFile {
  generatedAt: string;
  windows: Record<string, { posts: number; windowKm: number; targets: Record<string, { slope: number | null; roughness: number | null; validPixels: number; pixels: number }> }>;
}

const POST_M = 463;
const frozen = loadFrozen();
if (!frozen) fail('the all-round score is not frozen yet. Sites are not scored until it is.');
const sitesPath = join(DATA, 'sites.json');
if (!existsSync(sitesPath)) fail('data/sites.json does not exist yet (Session B).');
const windowsPath = join(OUT, 'target_terrain_windows.json');
if (!existsSync(windowsPath)) fail('validation/output/target_terrain_windows.json is missing. Run validation/target_terrain.py --posts 4 6 9 11');

const data = loadData(true);
const sitesFile = readJson<SitesFile>(sitesPath);
const windows = readJson<WindowsFile>(windowsPath);
const terrainFraction = frozen.after.terrainFraction;

// Every site window size must have been measured on the targets, or terrain cannot be compared like for like.
const postsOf = (s: SiteEntry): number => {
  const w = s.values.slope?.windowKm;
  return typeof w === 'number' ? Math.round((w * 1000) / POST_M) : Math.max(1, Math.round((s.footprintKm * 1000) / POST_M));
};
const neededPosts = [...new Set(sitesFile.sites.map(postsOf))].sort((a, b) => a - b);
const missingPosts = neededPosts.filter((n) => !windows.windows[String(n)] || data.targets.some((t) => !windows.windows[String(n)]?.targets[t.id]));
if (missingPosts.length > 0) {
  fail(`target windows are missing for ${missingPosts.join(', ')} posts. Run: pipeline/.venv/bin/python validation/target_terrain.py --posts ${missingPosts.join(' ')}`);
}

const num = (v: SiteValue | undefined): number | null => (v && typeof v.value === 'number' ? v.value : null);
const r3 = (v: number | null): number | null => (v === null ? null : Math.round(v * 1000) / 1000);
const r1 = (v: number | null): number | null => (v === null ? null : Math.round(v * 10) / 10);

/** The target with slope and roughness measured in a window of `posts` x `posts` 463 m posts. */
function targetAtWindow(t: Target, posts: number): { target: Target; slope: number | null; roughness: number | null } | null {
  const w = windows.windows[String(posts)]?.targets[t.id];
  if (!w) return null;
  const values = { ...t.values };
  const set = (key: 'slope' | 'roughness', value: number | null, floor: number): void => {
    values[key] = value === null
      ? { value: null, sigma: null, source: null, badge: null }
      : { ...t.values[key], value, sigma: Math.max(floor, terrainFraction * value), source: `validation/output/target_terrain_windows.json, ${posts} posts`, badge: 'Mission' };
  };
  set('slope', w.slope, 1);
  set('roughness', w.roughness, 50);
  return { target: { ...t, values }, slope: w.slope, roughness: w.roughness };
}

// Per target: the frozen prepared target, the sorted purpose scores of every Earth cell and the
// dimension index, all at grid scale. These give the percentiles.
interface PerTarget {
  target: Target;
  prepared: ReturnType<typeof prepareTarget>;
  purposeSorted: Record<string, Float64Array>;
  index: ReturnType<typeof buildProfileIndex>;
}
const perTarget: PerTarget[] = data.targets.map((t) => {
  const prepared = prepareTarget(t, data.ranges, data.table);
  const purposeSorted: Record<string, Float64Array> = {};
  for (const p of PURPOSES) {
    const scores: number[] = [];
    for (const r of scoreCells(data.cells, prepared, purposeWeights(p.id))) if (r.score !== null) scores.push(r.score);
    purposeSorted[p.id] = Float64Array.from(scores).sort();
  }
  return { target: t, prepared, purposeSorted, index: buildProfileIndex(data.cells, prepared) };
});

interface Cellwise {
  similarity: number | null;
  /** Tie-fair percentile among all 0.5 degree Earth cells. */
  midPercentile: number | null;
}
interface PurposeResult {
  score: number | null;
  midPercentile: number | null;
  unscoredReason: string | null;
  limitingFactor: string | null;
}
interface TargetResult {
  target: string;
  listed: boolean;
  windowPosts: number;
  targetTerrainAtWindow: { slope: number | null; roughness: number | null } | null;
  targetTerrainAt55km: { slope: number | null; roughness: number | null };
  site: { dimensions: Record<DimensionId, Cellwise>; purposes: Record<PurposeId, PurposeResult> };
  grid: { dimensions: Record<DimensionId, Cellwise>; purposes: Record<PurposeId, PurposeResult> };
  /** Terrain similarity of the site values against the target's 55.6 km values: a mismatch of scales, shown for the record. */
  terrainAgainst55km: number | null;
}
interface SiteReport {
  id: string;
  name: string;
  kind: string;
  footprintKm: number;
  footprintNote: string;
  windowPosts: number;
  windowKm: number | null;
  terrainPixels: number | null;
  inAnalogsJson: boolean;
  provisional: boolean;
  caveat: string | null;
  /** The 0.5 degree cell used here: the one the global score snaps the site to (nearest cell centre). */
  cell: { lat: number; lon: number; sameAsSitesJson: boolean | null };
  inputs: Record<string, { site: number | string | null; siteScale: string | null; grid: number | null }>;
  bareFrac: number | null;
  rockType: string | null;
  results: TargetResult[];
}

function evaluate(cell: EarthCell, prepared: ReturnType<typeof prepareTarget>, pt: PerTarget): TargetResult['site'] {
  const sims = dimensionSimilarities(cell, prepared);
  const dimensions = {} as Record<DimensionId, Cellwise>;
  for (const d of DIMENSIONS) {
    const s = sims[d.id];
    dimensions[d.id] = { similarity: r3(s), midPercentile: s === null ? null : r3(rankIn(pt.index.sorted[d.id], s).midPercentile) };
  }
  const purposes = {} as Record<PurposeId, PurposeResult>;
  for (const p of PURPOSES) {
    const r = scoreCell(cell, prepared, purposeWeights(p.id));
    purposes[p.id] = {
      score: r1(r.score),
      midPercentile: r.score === null ? null : r3(rankIn(pt.purposeSorted[p.id] as Float64Array, r.score).midPercentile),
      unscoredReason: r.unscoredReason,
      limitingFactor: r.limitingFactor,
    };
  }
  return { dimensions, purposes };
}

const reports: SiteReport[] = [];
const analogFor = new Map<string, string[]>();
for (const a of [...data.sites, ...data.candidates]) analogFor.set(a.id, a.analogFor);

for (const s of sitesFile.sites) {
  const hit = nearestCell(data.cells, s.lat, s.lon);
  if (!hit || hit.distanceKm > MAX_SNAP_KM) fail(`"${s.id}" has no Earth cell within ${MAX_SNAP_KM} km`);
  const grid = hit.cell;
  const slope = s.values.slope;
  const windowKm = slope?.windowKm ?? null;
  const posts = postsOf(s);
  const lith = num(s.values.lithology);

  // The site cell: fine-scale values where sites.json has them, the grid cell's climate otherwise.
  const siteCell: EarthCell = {
    ...grid,
    lat: s.lat,
    lon: s.lon,
    slope: num(slope),
    roughness: num(s.values.roughness),
    ndvi: num(s.values.ndvi),
    lithology: lith,
    tempMean: num(s.values.tempMean),
    tempRange: num(s.values.tempRange),
    precip: num(s.values.precip),
  };

  const results: TargetResult[] = [];
  for (const pt of perTarget) {
    const atWindow = targetAtWindow(pt.target, posts);
    const preparedSite = atWindow ? prepareTarget(atWindow.target, data.ranges, data.table) : pt.prepared;
    const site = evaluate(siteCell, preparedSite, pt);
    if (!atWindow) {
      // No same-size target window: terrain cannot be compared like for like, so it is left out.
      const noTerrain = evaluate({ ...siteCell, slope: null, roughness: null }, pt.prepared, pt);
      site.dimensions.terrain = noTerrain.dimensions.terrain;
      site.purposes = noTerrain.purposes;
    }
    results.push({
      target: pt.target.id,
      listed: (analogFor.get(s.id) ?? []).includes(pt.target.id),
      windowPosts: posts,
      targetTerrainAtWindow: atWindow ? { slope: r3(atWindow.slope), roughness: r1(atWindow.roughness) } : null,
      targetTerrainAt55km: { slope: pt.target.values.slope.value, roughness: pt.target.values.roughness.value },
      site,
      grid: evaluate(grid, pt.prepared, pt),
      terrainAgainst55km: r3(dimensionSimilarities(siteCell, pt.prepared).terrain),
    });
  }

  reports.push({
    id: s.id,
    name: s.name,
    kind: s.kind,
    footprintKm: s.footprintKm,
    footprintNote: s.footprintNote,
    windowPosts: posts,
    windowKm,
    terrainPixels: slope?.pixels ?? null,
    inAnalogsJson: s.inAnalogsJson !== false,
    provisional: s.footprintStatus === 'provisional',
    caveat: s.caveat ?? null,
    cell: { lat: grid.lat, lon: grid.lon, sameAsSitesJson: s.gridCell ? s.gridCell.lat === grid.lat && s.gridCell.lon === grid.lon : null },
    inputs: {
      slope: { site: num(slope), siteScale: slope?.scale ?? null, grid: grid.slope },
      roughness: { site: num(s.values.roughness), siteScale: s.values.roughness?.scale ?? null, grid: grid.roughness },
      ndvi: { site: num(s.values.ndvi), siteScale: s.values.ndvi?.scale ?? null, grid: grid.ndvi },
      lithology: { site: lith, siteScale: s.values.lithology?.scale ?? null, grid: grid.lithology },
      tempMean: { site: num(s.values.tempMean), siteScale: s.values.tempMean?.scale ?? null, grid: grid.tempMean },
      tempRange: { site: num(s.values.tempRange), siteScale: s.values.tempRange?.scale ?? null, grid: grid.tempRange },
      precip: { site: num(s.values.precip), siteScale: s.values.precip?.scale ?? null, grid: grid.precip },
    },
    bareFrac: num(s.values.bareFrac),
    rockType: typeof s.values.rockType?.value === 'string' ? s.values.rockType.value : null,
    results,
  });
}

// Candidate sites of analogs.json that sites.json does not hold yet.
const published = new Set(sitesFile.sites.map((s) => s.id));
const notPublished = data.candidates.filter((c) => !published.has(c.id)).map((c) => ({ id: c.id, name: c.name }));

// ---------------------------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------------------------

const classLabel = new Map<number, string>();
for (const c of data.earth.meta.factors.find((f) => f.key === 'lithology')?.classes ?? []) classLabel.set(c.code, c.label);
const rock = (code: number | string | null): string => (typeof code === 'number' ? `${code} ${classLabel.get(code) ?? ''}`.trim() : 'no data');
const sim = (v: number | null): string => (v === null ? 'no data' : v.toFixed(2));
const pc = (v: number | null): string => (v === null ? '' : ` (p ${v.toFixed(2)})`);
const score = (p: PurposeResult): string => (p.score === null ? `no score${p.unscoredReason ? `: ${p.unscoredReason}` : ''}` : `${p.score.toFixed(1)}${pc(p.midPercentile)}`);
const val = (v: number | string | null, digits = 2): string => (v === null ? 'no data' : typeof v === 'number' ? v.toFixed(digits) : v);

const md: string[] = [];
md.push('# Site-level scores from fine-scale values', '');
md.push(`Written ${new Date().toISOString()} by validation/score_sites.ts. Site values: data/sites.json built ${sitesFile.meta.generatedAt} (Session B).`);
md.push(`Scoring values frozen ${frozen.frozenAt}. Target windows: validation/output/target_terrain_windows.json (${windows.generatedAt}).`, '');
md.push('Read this first:', '');
md.push('- These are the frozen formula, tolerances and weights applied to site-scale inputs. Nothing was tuned.');
md.push('- Terrain, bare ground and rock class are measured at the site (2 to 5 km footprint, or the whole volcano for rock).');
md.push('  **Climate is still the 0.5 degree cell value.** A crater at 2,400 m and the coast below it share one temperature and one rainfall figure.');
md.push('- Terrain is compared with the target measured in a window of the same size. A footprint holds 16 to 121 posts of 463 m, so both numbers are coarse.');
md.push('- "p" is the tie-fair percentile of the value among all 0.5 degree Earth cells (0.5 is the middle). It compares a site-scale value with cell-scale values and is a rough guide.');
md.push('- Candidate sites were never used to tune or validate the score. The five known analogs are shown for comparison only.');
md.push('- The reading of these tables is in validation/sites/FINDINGS.md.', '');
if (notPublished.length > 0) {
  md.push(`**Not published yet in data/sites.json, so not scored here:** ${notPublished.map((c) => c.name).join('; ')}.`, '');
}

const dims = DIMENSIONS.map((d) => d.id);
for (const kind of ['candidate', 'known'] as const) {
  md.push(kind === 'candidate' ? '## Candidate sites' : '## Known analogs, for comparison', '');
  for (const s of reports.filter((x) => x.kind === kind)) {
    md.push(`### ${s.name}`, '');
    md.push(`Footprint ${s.footprintKm} km${s.provisional ? ' (provisional)' : ''}. ${s.footprintNote} Terrain window: ${s.windowPosts} x ${s.windowPosts} posts of 463 m${s.terrainPixels === null ? '' : ` (${s.terrainPixels} land posts)`}.${s.inAnalogsJson ? '' : ' Defined by Session B in pipeline/sites.py; not listed in data/analogs.json, so the global score does not rank it by name.'}${s.caveat ? ` Caveat from sites.json: ${s.caveat}` : ''}`, '');
    if (s.cell.sameAsSitesJson === false) md.push(`The site lies on a cell edge. The cell used here is the one the global score snaps to (centre ${s.cell.lat}, ${s.cell.lon}); data/sites.json quotes the neighbouring cell, so its "grid" column differs.`, '');
    md.push('| Input | Site value | Scale | 0.5 degree cell |', '| --- | --- | --- | --- |');
    md.push(`| Slope (degrees) | ${val(s.inputs.slope?.site ?? null)} | ${s.inputs.slope?.siteScale ?? ''} | ${val(s.inputs.slope?.grid ?? null)} |`);
    md.push(`| Roughness (m) | ${val(s.inputs.roughness?.site ?? null, 1)} | ${s.inputs.roughness?.siteScale ?? ''}, window-dependent | ${val(s.inputs.roughness?.grid ?? null, 1)} |`);
    md.push(`| NDVI | ${val(s.inputs.ndvi?.site ?? null)}${s.bareFrac === null ? '' : `, ${(s.bareFrac * 100).toFixed(0)}% of the footprint bare`} | ${s.inputs.ndvi?.siteScale ?? ''} | ${val(s.inputs.ndvi?.grid ?? null)} |`);
    md.push(`| Rock class | ${rock(s.inputs.lithology?.site ?? null)}${s.rockType ? ` ("${s.rockType}")` : ''} | ${s.inputs.lithology?.siteScale ?? ''} | ${rock(s.inputs.lithology?.grid ?? null)} |`);
    md.push(`| Mean temperature (deg C) | ${val(s.inputs.tempMean?.site ?? null, 1)} | grid | same |`);
    md.push(`| Day-night range (deg C) | ${val(s.inputs.tempRange?.site ?? null, 1)} | grid | same |`);
    md.push(`| Precipitation (mm/year) | ${val(s.inputs.precip?.site ?? null, 0)} | grid | same |`, '');

    md.push('Similarity per dimension at site scale, 0 to 1. In brackets: the same dimension from the 0.5 degree cell.', '');
    md.push(`| Target | ${DIMENSIONS.map((d) => d.label).join(' | ')} | Target terrain in the same window | Terrain against the 55.6 km target |`, `| --- | ${dims.map(() => '---').join(' | ')} | --- | --- |`);
    for (const r of s.results) {
      const cells = dims.map((d) => `${sim(r.site.dimensions[d].similarity)}${pc(r.site.dimensions[d].midPercentile)} [${sim(r.grid.dimensions[d].similarity)}]`);
      const tw = r.targetTerrainAtWindow ? `${val(r.targetTerrainAtWindow.slope)} deg, ${val(r.targetTerrainAtWindow.roughness, 1)} m` : 'not measured';
      md.push(`| ${r.target}${r.listed ? ' (listed)' : ''} | ${cells.join(' | ')} | ${tw} | ${sim(r.terrainAgainst55km)} |`);
    }
    md.push('', 'Purpose scores at site scale, 0 to 100. In brackets: the 0.5 degree cell.', '');
    md.push(`| Target | ${PURPOSES.map((p) => p.label).join(' | ')} |`, `| --- | ${PURPOSES.map(() => '---').join(' | ')} |`);
    for (const r of s.results) {
      md.push(`| ${r.target}${r.listed ? ' (listed)' : ''} | ${PURPOSES.map((p) => `${score(r.site.purposes[p.id])} [${r.grid.purposes[p.id].score === null ? 'no score' : (r.grid.purposes[p.id].score as number).toFixed(1)}]`).join(' | ')} |`);
    }
    md.push('');
  }
}

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, 'sites.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), frozenAt: frozen.frozenAt, sitesGeneratedAt: sitesFile.meta.generatedAt, earthGeneratedAt: data.earth.meta.generatedAt, notPublished, sites: reports }, null, 2)}\n`,
);
writeFileSync(join(OUT, 'SITES.md'), `${md.join('\n')}\n`);
console.log(`Scored ${reports.length} sites against ${data.targets.length} targets. Not published yet: ${notPublished.map((c) => c.id).join(', ') || 'none'}.`);
console.log(`Wrote ${join(OUT, 'sites.json')} and SITES.md`);

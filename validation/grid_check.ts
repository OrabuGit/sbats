// Targets from anywhere, checked on the real Moon and Mars grids.
//
//     npx tsx validation/grid_check.ts
//
// Needs data/moon.json and data/mars.json (Session B). Three checks:
//
//   1. Agreement. At each curated target of data/targets.json, the grid cell that holds it is read
//      and its values are put beside the curated ones. The two were measured differently (a 55.6 km
//      window centred on the target against one grid cell), so they should be close, not equal. Large
//      gaps are listed, not hidden.
//   2. Coverage. For every named place of data/known_sites.json the target profile is built with
//      targetFromKnownSite: how many come out curated, from the grid, or with no data, at which
//      confidence, and which factors are missing.
//   3. Use. For every named place with a usable profile, every Earth cell is scored with the frozen
//      formula and the best-ranked place is reported, with the app's spacing rule.
//
// Nothing is tuned. Writes validation/output/GRID_CHECK.md, grid_check.json and data/place_matches.json.
//
// Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PRESETS, prepareTarget, scoreCells } from '../app/src/lib/scoring/index';
import type { EarthCell, FactorKey } from '../app/src/lib/scoring/index';
import { distanceKm, nearestGridCell, targetFromKnownSite } from '../app/src/lib/targets/index';
import type { BodyGrid, KnownSitesFile, TargetBody } from '../app/src/lib/targets/index';
import { DATA, OUT, fail, loadData, loadFrozen, readJson } from './lib';

const frozen = loadFrozen();
if (!frozen) fail('the all-round score is not frozen yet.');
const data = loadData(false);
const known = readJson<KnownSitesFile>(join(DATA, 'known_sites.json'));
const grids: Partial<Record<TargetBody, BodyGrid>> = {};
// SBATS_GRID_DIR points at another folder holding moon.json and mars.json (used to test this script on made-up grids).
const GRID_DIR = process.env.SBATS_GRID_DIR ?? DATA;
const TEST_RUN = GRID_DIR !== DATA;
for (const body of ['moon', 'mars'] as const) {
  const path = join(GRID_DIR, `${body}.json`);
  if (existsSync(path)) grids[body] = readJson<BodyGrid>(path);
}
if (!grids.moon && !grids.mars) fail('neither data/moon.json nor data/mars.json exists yet (Session B).');

const KEYS: FactorKey[] = ['slope', 'roughness', 'tempMean', 'tempRange', 'lithology'];
const r2 = (v: number | null | undefined): number | null => (typeof v === 'number' ? Math.round(v * 100) / 100 : null);

// 1. Agreement at the curated targets
const agreement = data.targets.map((t) => {
  const grid = grids[t.body];
  const hit = grid ? nearestGridCell(grid, t.lat, t.lon) : null;
  const rows = KEYS.map((key) => {
    const curated = t.values[key].value;
    const raw = hit ? hit.cell[key] : null;
    const cell = typeof raw === 'number' ? raw : null;
    const sigma = t.values[key].sigma;
    // How many tolerances apart the two values are: under 1 means a cell scored against either would barely differ.
    const sigmas = curated !== null && cell !== null && sigma ? Math.abs(cell - curated) / sigma : null;
    return { key, curated, grid: r2(cell), sigma, sigmasApart: sigmas === null ? null : Math.round(sigmas * 100) / 100, same: key === 'lithology' && curated !== null && cell !== null ? curated === cell : null };
  });
  return { target: t.id, body: t.body, gridLoaded: Boolean(grid), cell: hit ? { lat: hit.cell.lat, lon: hit.cell.lon, distanceKm: Math.round(hit.distanceKm * 10) / 10 } : null, rows };
});

// 2. Coverage over the named places
// Rock classes the scoring library knows. A grid class outside the list is left out, with a note, instead of failing.
const rockClasses = (data.earth.meta.factors.find((f) => f.key === 'lithology')?.classes ?? []).map((c) => c.code);
const profiles = known.sites.map((s) => ({ site: s, profile: targetFromKnownSite(s, { grid: grids[s.body] ?? null, curated: data.targets, rockClasses }) }));
const count = <T extends string>(values: T[]): Record<string, number> => values.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {});
const coverage = {
  places: profiles.length,
  byOrigin: count(profiles.map((p) => p.profile.origin)),
  byConfidence: count(profiles.map((p) => p.profile.confidence)),
  missing: count(profiles.flatMap((p) => p.profile.missing)),
  byBody: Object.fromEntries((['moon', 'mars'] as const).map((b) => [b, count(profiles.filter((p) => p.site.body === b).map((p) => p.profile.origin))])),
};

// 3. Best Earth match for every named place with a usable profile
const RAD = Math.PI / 180;
const earthKm = (a: EarthCell, b: EarthCell): number => {
  const h = Math.sin(((b.lat - a.lat) * RAD) / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(((b.lon - a.lon) * RAD) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
};
const MIN_SEPARATION_KM = 250;
const cache = new Map<string, { lat: number; lon: number; score: number; confidence: string }[] | null>();
function bestMatches(profile: (typeof profiles)[number]['profile']): { lat: number; lon: number; score: number; confidence: string }[] | null {
  const key = profile.origin === 'curated' ? profile.target.id : `${profile.target.body}:${profile.cell?.lat}:${profile.cell?.lon}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  let out: { lat: number; lon: number; score: number; confidence: string }[] | null = null;
  if (profile.origin !== 'none') {
    const results = scoreCells(data.cells, prepareTarget(profile.target, data.ranges, data.table), PRESETS.base.weights);
    const order: number[] = [];
    for (let i = 0; i < results.length; i += 1) if (results[i]?.score !== null && results[i]?.confidence !== 'low') order.push(i);
    order.sort((a, b) => (results[b]?.score as number) - (results[a]?.score as number) || a - b);
    const picks: number[] = [];
    for (const i of order) {
      if (picks.some((p) => earthKm(data.cells[i] as EarthCell, data.cells[p] as EarthCell) < MIN_SEPARATION_KM)) continue;
      picks.push(i);
      if (picks.length >= 3) break;
    }
    out = picks.map((i) => ({ lat: (data.cells[i] as EarthCell).lat, lon: (data.cells[i] as EarthCell).lon, score: Math.round((results[i]?.score as number) * 10) / 10, confidence: results[i]?.confidence as string }));
  }
  cache.set(key, out);
  return out;
}
const matches = profiles.map(({ site, profile }) => ({
  id: site.id,
  name: site.name,
  body: site.body,
  kind: site.kind,
  origin: profile.origin,
  confidence: profile.confidence,
  missing: profile.missing,
  /** False when the place has no temperature: its scores run high and must not be compared with other places'. */
  scoresComparable: profile.scoresComparable,
  environment: Object.fromEntries(Object.entries(profile.environment).map(([k, v]) => [k, v?.value ?? null])),
  targetId: profile.target.id,
  cell: profile.cell,
  values: Object.fromEntries(KEYS.map((k) => [k, profile.target.values[k].value])),
  best: bestMatches(profile),
  // Whether scores exist at all for this place: with too few factors on the target side, none do.
  scorable: bestMatches(profile) !== null && (bestMatches(profile)?.length ?? 0) > 0,
}));

const generatedAt = new Date().toISOString();
const at = (lat: number, lon: number): string => `${Math.abs(lat).toFixed(2)} ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)} ${lon >= 0 ? 'E' : 'W'}`;
const md: string[] = [];
md.push('# Targets from anywhere, checked on the real Moon and Mars grids', '');
md.push(`Written ${generatedAt} by \`npx tsx validation/grid_check.ts\`. Grids: ${(['moon', 'mars'] as const).map((b) => (grids[b] ? `${b}.json (${grids[b]?.meta.resolutionDeg} degree, ${grids[b]?.cells.length} cells, built ${grids[b]?.meta.generatedAt ?? 'unknown'})` : `${b}.json missing`)).join('; ')}.`, '');
md.push('## 1. Does the grid agree with the curated targets?', '');
md.push('The curated value is measured over a 55.6 km window centred on the target; the grid value is that of the cell holding the target. "Tolerances apart" is the gap divided by the frozen tolerance: under 1, a score would barely change.', '');
md.push('| Target | Grid cell | Key | Curated | Grid | Tolerances apart |', '| --- | --- | --- | --- | --- | --- |');
for (const a of agreement) {
  for (const r of a.rows) {
    const apart = r.key === 'lithology' ? (r.same === null ? 'n/a' : r.same ? 'same class' : 'different class') : r.sigmasApart === null ? 'n/a' : r.sigmasApart.toFixed(2);
    md.push(`| ${a.target} | ${a.cell ? `${at(a.cell.lat, a.cell.lon)} (${a.cell.distanceKm} km)` : a.gridLoaded ? 'no cell' : 'grid not loaded'} | ${r.key} | ${r.curated ?? 'no value'} | ${r.grid ?? 'no value'} | ${apart} |`);
  }
}
const gaps = agreement.flatMap((a) => a.rows.filter((r) => (r.sigmasApart ?? 0) > 1 || r.same === false).map((r) => `${a.target} ${r.key}: curated ${r.curated}, grid ${r.grid}`));
md.push('', gaps.length > 0 ? `More than one tolerance apart, or a different rock class: ${gaps.join('; ')}.` : 'No value is more than one tolerance from its curated counterpart.', '');
md.push('## 2. What a user gets for each named place', '');
md.push(`${coverage.places} named places. By origin: ${Object.entries(coverage.byOrigin).map(([k, v]) => `${v} ${k}`).join(', ')}. By confidence: ${Object.entries(coverage.byConfidence).map(([k, v]) => `${v} ${k}`).join(', ')}. Missing factors: ${Object.entries(coverage.missing).map(([k, v]) => `${k} at ${v}`).join(', ') || 'none'}.`, '');
md.push(`Places with no temperature value: ${matches.filter((m) => m.origin !== 'none' && !m.scoresComparable).length}. Their scores leave temperature out, run much higher, and are marked "not comparable" below.`, '');
md.push('| Place | Body | Profile from | Confidence | Missing | Best-ranked Earth cell | Score |', '| --- | --- | --- | --- | --- | --- | --- |');
for (const m of matches) {
  const b = m.best?.[0];
  md.push(`| ${m.name} | ${m.body} | ${m.origin === 'curated' ? `curated target ${m.targetId}` : m.origin === 'grid' && m.cell ? `grid cell ${at(m.cell.lat, m.cell.lon)}` : 'no data'} | ${m.confidence} | ${m.missing.join(', ') || 'none'} | ${b ? at(b.lat, b.lon) : 'no score'} | ${b ? `${b.score.toFixed(1)}${m.scoresComparable ? '' : ' (not comparable: no temperature)'}` : ''} |`);
}
md.push('');
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'grid_check.json'), `${JSON.stringify({ generatedAt, agreement, coverage }, null, 1)}\n`);
writeFileSync(join(OUT, 'GRID_CHECK.md'), `${md.join('\n')}\n`);
writeFileSync(
  join(TEST_RUN ? OUT : DATA, 'place_matches.json'),
  `${JSON.stringify({
    meta: {
      generatedAt, frozenAt: frozen.frozenAt,
      note: 'For every named place of known_sites.json: the target profile a user gets (curated, grid or none), its confidence and missing factors, and the three best-ranked Earth cells by the frozen all-round score (Base weights, high and medium confidence, 250 km apart). Coordinates are cell centres; no place name is stored.',
      grids: Object.fromEntries((['moon', 'mars'] as const).map((b) => [b, grids[b] ? { resolutionDeg: grids[b]?.meta.resolutionDeg, generatedAt: grids[b]?.meta.generatedAt ?? null } : null])),
    },
    places: matches,
  })}\n`,
);
console.log(`Agreement gaps over one tolerance: ${gaps.length}. Places: ${JSON.stringify(coverage.byOrigin)}, confidence ${JSON.stringify(coverage.byConfidence)}.`);
console.log(`Scorable places: ${matches.filter((m) => m.scorable).length} of ${matches.length}. Wrote ${join(OUT, 'GRID_CHECK.md')} and ${TEST_RUN ? 'a test copy of ' : ''}data/place_matches.json`);
void distanceKm;

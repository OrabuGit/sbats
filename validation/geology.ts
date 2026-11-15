// Why does the Geology dimension barely beat chance? A diagnosis, not a fix.
//
//     npx tsx validation/geology.ts
//
// validation/output/PURPOSES.md reports that the 19 known analogs cited for geology reach a mean
// percentile of 0.59 on the geology ranking, against 0.56 for the other known sites and 0.5 for
// chance. This script takes that number apart:
//
//   1. What the dimension can say at all: per target, the share of Earth cells at each of its three
//      levels (same, related, unrelated rock class) and the percentile each level gives.
//   2. Where the known sites land: the rock class of each site's 0.5 degree cell against each of its
//      targets, counted by level and by body.
//   3. How much of the 0.59 against 0.56 gap is noise: spread and standard error of the two groups.
//   4. A separate site-level result: for the sites that data/sites.json (Session B) describes at
//      fine scale, the rock class mapped at the site (or the whole volcano) against the class of
//      the 0.5 degree cell, and what the geology similarity becomes with the site's own class.
//
// Nothing is tuned: the rock-class table, the targets' classes and the frozen score are read, never
// written. Candidate sites appear only in the last, site-level table and are never part of a
// validation number. The reading of these tables is in validation/purposes/GEOLOGY.md.
//
// Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildProfileIndex, lithologySimilarity, nearestCell, prepareTarget, rankIn } from '../app/src/lib/scoring/index';
import type { LithologyTable, PurposeId, Target } from '../app/src/lib/scoring/index';
import { DATA, MAX_SNAP_KM, OUT, fail, loadData, loadFrozen, readJson } from './lib';
import type { Analog } from './lib';

interface Labelled extends Analog {
  usedFor?: PurposeId[];
}
interface SiteValue {
  value: number | string | null;
  scale: string;
  source: string | null;
}
interface SitesFile {
  meta: { generatedAt: string };
  sites: { id: string; name: string; kind: string; lat: number; lon: number; values: Record<string, SiteValue> }[];
}

const frozen = loadFrozen();
if (!frozen) fail('the all-round score is not frozen yet.');
const data = loadData(true);
if (!data.table) fail('data/lithology_similarity.json is missing.');
const table: LithologyTable = data.table;
const known = (data.sites as Labelled[]).filter((s) => s.kind === 'known');

const classLabel = new Map<number, string>();
for (const c of data.earth.meta.factors.find((f) => f.key === 'lithology')?.classes ?? []) classLabel.set(c.code, c.label);
const rock = (code: number | null): string => (code === null ? 'no rock class' : `${code} ${classLabel.get(code) ?? ''}`.trim());
const r3 = (v: number | null): number | null => (v === null ? null : Math.round(v * 1000) / 1000);
const mean = (v: number[]): number | null => (v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : null);
const sd = (v: number[]): number | null => {
  const m = mean(v);
  if (m === null || v.length < 2) return null;
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
};

type Level = 'same' | 'related' | 'unrelated';
const LEVELS: readonly Level[] = ['unrelated', 'related', 'same'];
/** The level of a cell class against a target class, read from the table itself (no rounding involved). */
function levelOf(cellClass: number, targetClass: number): Level {
  const similarity = lithologySimilarity(cellClass, targetClass, table);
  if (similarity === table.levels.same) return 'same';
  return similarity === table.levels.related ? 'related' : 'unrelated';
}

// ---------------------------------------------------------------------------------------------
// 1. Per target: what the dimension can say
// ---------------------------------------------------------------------------------------------

interface TargetGeology {
  id: string;
  body: string;
  rockClass: number | null;
  cellsWithRockClass: number;
  share: Record<Level, number>;
  /** Tie-fair percentile a cell gets at each level: the share of cells at lower levels plus half of its own. Only these three values are possible. */
  percentile: Record<Level, number>;
}
const targetGeology = new Map<string, TargetGeology>();
for (const t of data.targets) {
  const code = t.values.lithology.value;
  const count: Record<Level, number> = { same: 0, related: 0, unrelated: 0 };
  if (code !== null) for (const c of data.cells) if (c.lithology !== null) count[levelOf(c.lithology, code)] += 1;
  const n = count.same + count.related + count.unrelated;
  const share: Record<Level, number> = { same: 0, related: 0, unrelated: 0 };
  const percentile: Record<Level, number> = { same: 0, related: 0, unrelated: 0 };
  let below = 0;
  for (const level of LEVELS) {
    share[level] = n === 0 ? 0 : count[level] / n;
    percentile[level] = below + share[level] / 2;
    below += share[level];
  }
  targetGeology.set(t.id, { id: t.id, body: t.body, rockClass: code, cellsWithRockClass: n, share, percentile });
}
// Guard: the percentile of "same" must agree with the scoring library's own tie-fair rank.
for (const t of data.targets) {
  const tg = targetGeology.get(t.id) as TargetGeology;
  if (tg.rockClass === null) continue;
  const lib = rankIn(buildProfileIndex(data.cells, prepareTarget(t, data.ranges, table)).sorted.geology, table.levels.same).midPercentile;
  if (Math.abs(lib - tg.percentile.same) > 1e-9) fail(`geology percentile for ${t.id} disagrees with the scoring library: ${lib} against ${tg.percentile.same}`);
}

// ---------------------------------------------------------------------------------------------
// 2. Known sites: the cell's rock class against each listed target
// ---------------------------------------------------------------------------------------------

interface Pair {
  site: string;
  target: string;
  body: string;
  cellClass: number | null;
  targetClass: number | null;
  level: Level | 'no data';
  percentile: number | null;
}
interface SiteRow {
  id: string;
  name: string;
  citedForGeology: boolean;
  cellClass: number | null;
  pairs: Pair[];
  /** Mean over the site's targets that can be compared, as in PURPOSES.md. */
  meanPercentile: number | null;
}

function pairFor(siteId: string, cellClass: number | null, t: Target): Pair {
  const tg = targetGeology.get(t.id) as TargetGeology;
  if (cellClass === null || tg.rockClass === null) {
    return { site: siteId, target: t.id, body: t.body, cellClass, targetClass: tg.rockClass, level: 'no data', percentile: null };
  }
  const level = levelOf(cellClass, tg.rockClass);
  return { site: siteId, target: t.id, body: t.body, cellClass, targetClass: tg.rockClass, level, percentile: tg.percentile[level] };
}

const targetById = new Map(data.targets.map((t) => [t.id, t]));
const siteRows: SiteRow[] = known.map((s) => {
  const hit = nearestCell(data.cells, s.lat, s.lon);
  if (!hit || hit.distanceKm > MAX_SNAP_KM) fail(`"${s.id}" has no cell within ${MAX_SNAP_KM} km`);
  const pairs = s.analogFor.map((id) => pairFor(s.id, hit.cell.lithology, targetById.get(id) as Target));
  return {
    id: s.id,
    name: s.name,
    citedForGeology: (s.usedFor ?? []).includes('geology'),
    cellClass: hit.cell.lithology,
    pairs,
    meanPercentile: mean(pairs.map((p) => p.percentile).filter((v): v is number => v !== null)),
  };
});

function countLevels(pairs: Pair[]): Record<Level | 'no data', number> {
  const c = { same: 0, related: 0, unrelated: 0, 'no data': 0 };
  for (const p of pairs) c[p.level] += 1;
  return c;
}
function group(rows: SiteRow[]): { sites: number; scoredSites: number; meanPercentile: number | null; sd: number | null; standardError: number | null; pairs: Record<Level | 'no data', number> } {
  const v = rows.map((r) => r.meanPercentile).filter((x): x is number => x !== null);
  const s = sd(v);
  return { sites: rows.length, scoredSites: v.length, meanPercentile: r3(mean(v)), sd: r3(s), standardError: s === null ? null : r3(s / Math.sqrt(v.length)), pairs: countLevels(rows.flatMap((r) => r.pairs)) };
}
const cited = siteRows.filter((r) => r.citedForGeology);
const others = siteRows.filter((r) => !r.citedForGeology);
const byBody = (rows: SiteRow[], body: string): { pairs: Record<Level | 'no data', number>; meanPercentile: number | null } => {
  const pairs = rows.flatMap((r) => r.pairs).filter((p) => p.body === body);
  return { pairs: countLevels(pairs), meanPercentile: r3(mean(pairs.map((p) => p.percentile).filter((v): v is number => v !== null))) };
};

// What the 19 sites would average if every cell carried the "right" class is unknowable from the
// grid. What can be stated: the mean percentile each level would give them, over their own targets.
function ifAll(rows: SiteRow[], level: Level): number | null {
  const perSite = rows.map((r) => mean(r.pairs.filter((p) => p.targetClass !== null).map((p) => (targetGeology.get(p.target) as TargetGeology).percentile[level])));
  return r3(mean(perSite.filter((v): v is number => v !== null)));
}

// ---------------------------------------------------------------------------------------------
// 4. Site-level: the class mapped at the site against the class of the cell
// ---------------------------------------------------------------------------------------------

interface FineRow {
  id: string;
  name: string;
  kind: string;
  rockType: string | null;
  siteClass: number | null;
  siteScale: string | null;
  source: string | null;
  cellClass: number | null;
  agrees: boolean | null;
  pairs: { target: string; listed: boolean; cell: Pair; site: Pair }[];
}
const fine: FineRow[] = [];
const sitesPath = join(DATA, 'sites.json');
let sitesGeneratedAt: string | null = null;
if (existsSync(sitesPath)) {
  const file = readJson<SitesFile>(sitesPath);
  sitesGeneratedAt = file.meta.generatedAt;
  const listed = new Map<string, string[]>([...data.sites, ...data.candidates].map((a) => [a.id, a.analogFor]));
  for (const s of file.sites) {
    const hit = nearestCell(data.cells, s.lat, s.lon);
    if (!hit || hit.distanceKm > MAX_SNAP_KM) continue;
    const lith = s.values.lithology;
    const siteClass = lith && typeof lith.value === 'number' ? lith.value : null;
    const own = listed.get(s.id) ?? [];
    // A known analog is compared with the targets it is cited for; a candidate with every target that has a rock class.
    const targets = s.kind === 'known' ? own.map((id) => targetById.get(id) as Target) : data.targets;
    fine.push({
      id: s.id,
      name: s.name,
      kind: s.kind,
      rockType: typeof s.values.rockType?.value === 'string' ? s.values.rockType.value : null,
      siteClass,
      siteScale: lith?.scale ?? null,
      source: lith?.source ?? s.values.rockType?.source ?? null,
      cellClass: hit.cell.lithology,
      agrees: siteClass === null || hit.cell.lithology === null ? null : siteClass === hit.cell.lithology,
      pairs: targets.filter((t) => t.values.lithology.value !== null).map((t) => ({ target: t.id, listed: own.includes(t.id), cell: pairFor(s.id, hit.cell.lithology, t), site: pairFor(s.id, siteClass, t) })),
    });
  }
}
const fineKnown = fine.filter((f) => f.kind === 'known');
const fineMean = (rows: FineRow[], which: 'cell' | 'site'): number | null => {
  const perSite = rows.map((r) => mean(r.pairs.map((p) => p[which].percentile).filter((v): v is number => v !== null)));
  return r3(mean(perSite.filter((v): v is number => v !== null)));
};

// ---------------------------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------------------------

const report = {
  generatedAt: new Date().toISOString(),
  frozenAt: frozen.frozenAt,
  earthGeneratedAt: data.earth.meta.generatedAt,
  sitesGeneratedAt,
  levels: table.levels,
  targets: [...targetGeology.values()].map((t) => ({ id: t.id, body: t.body, rockClass: t.rockClass, cellsWithRockClass: t.cellsWithRockClass, share: { same: r3(t.share.same), related: r3(t.share.related), unrelated: r3(t.share.unrelated) }, percentile: { same: r3(t.percentile.same), related: r3(t.percentile.related), unrelated: r3(t.percentile.unrelated) } })),
  landCells: data.cells.length,
  cellsWithNoRockClass: data.cells.filter((c) => c.lithology === null).length,
  citedForGeology: { ...group(cited), moon: byBody(cited, 'moon'), mars: byBody(cited, 'mars'), ifEveryPairWere: { same: ifAll(cited, 'same'), related: ifAll(cited, 'related'), unrelated: ifAll(cited, 'unrelated') } },
  otherKnownSites: group(others),
  sites: siteRows.map((r) => ({ ...r, meanPercentile: r3(r.meanPercentile), pairs: r.pairs.map((p) => ({ ...p, percentile: r3(p.percentile) })) })),
  siteLevel: {
    note: 'Separate site-level result. Rock class mapped at the site or for the whole volcano (data/sites.json), against the class of the 0.5 degree cell. Five known analogs only: an illustration, not a validation.',
    knownSites: fineKnown.length,
    knownSitesWhereCellAndSiteClassAgree: fineKnown.filter((f) => f.agrees === true).length,
    knownSitesWhereTheyDiffer: fineKnown.filter((f) => f.agrees === false).length,
    knownSitesNotComparable: fineKnown.filter((f) => f.agrees === null).length,
    knownMeanPercentileWithCellClass: fineMean(fineKnown, 'cell'),
    knownMeanPercentileWithSiteClass: fineMean(fineKnown, 'site'),
    rows: fine.map((f) => ({ ...f, pairs: f.pairs.map((p) => ({ target: p.target, listed: p.listed, cellLevel: p.cell.level, cellPercentile: r3(p.cell.percentile), siteLevel: p.site.level, sitePercentile: r3(p.site.percentile) })) })),
  },
};

const f2 = (v: number | null): string => (v === null ? 'n/a' : v.toFixed(2));
const pct = (v: number): string => `${(v * 100).toFixed(1)}%`;
const counts = (c: Record<Level | 'no data', number>): string => `${c.same} same, ${c.related} related, ${c.unrelated} unrelated, ${c['no data']} no data`;
const md: string[] = [];
md.push('# Geology dimension: where the number comes from', '');
md.push(`Generated ${report.generatedAt} by \`npx tsx validation/geology.ts\`. Earth grid built ${report.earthGeneratedAt}. Score frozen ${frozen.frozenAt}; nothing here changes it.`);
md.push('The cause, in words, is in `validation/purposes/GEOLOGY.md`. Percentiles are tie-fair (0.5 is chance).', '');

md.push('## 1. The dimension has three possible values per target', '');
md.push(`Geology similarity is ${table.levels.same} for the same rock class, ${table.levels.related} for a related class and ${table.levels.unrelated} for an unrelated one. Every cell therefore gets one of three percentiles. Of ${report.landCells} land cells, ${report.cellsWithNoRockClass} have no rock class.`, '');
md.push('| Target | Rock class | Cells: same | related | unrelated | Percentile if same | if related | if unrelated |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const t of targetGeology.values()) {
  if (t.rockClass === null) md.push(`| ${t.id} | no rock class | | | | | | |`);
  else md.push(`| ${t.id} | ${rock(t.rockClass)} | ${pct(t.share.same)} | ${pct(t.share.related)} | ${pct(t.share.unrelated)} | ${f2(t.percentile.same)} | ${f2(t.percentile.related)} | ${f2(t.percentile.unrelated)} |`);
}
md.push('');

md.push('## 2. Where the known analogs land', '');
md.push('One pair is one site against one of the targets it is listed for.', '');
md.push('| Group | Sites | Mean percentile | Spread (SD) | Standard error | Pairs by level |', '| --- | --- | --- | --- | --- | --- |');
md.push(`| Cited for geology | ${report.citedForGeology.sites} (${report.citedForGeology.scoredSites} comparable) | ${f2(report.citedForGeology.meanPercentile)} | ${f2(report.citedForGeology.sd)} | ${f2(report.citedForGeology.standardError)} | ${counts(report.citedForGeology.pairs)} |`);
md.push(`| Other known sites | ${report.otherKnownSites.sites} (${report.otherKnownSites.scoredSites} comparable) | ${f2(report.otherKnownSites.meanPercentile)} | ${f2(report.otherKnownSites.sd)} | ${f2(report.otherKnownSites.standardError)} | ${counts(report.otherKnownSites.pairs)} |`);
md.push('');
md.push('Sites cited for geology, by the body of the target:', '');
md.push('| Targets | Pairs by level | Mean percentile of the pairs |', '| --- | --- | --- |');
md.push(`| Moon | ${counts(report.citedForGeology.moon.pairs)} | ${f2(report.citedForGeology.moon.meanPercentile)} |`);
md.push(`| Mars | ${counts(report.citedForGeology.mars.pairs)} | ${f2(report.citedForGeology.mars.meanPercentile)} |`);
md.push('');
md.push(`For scale: over the same sites and targets, the mean percentile would be ${f2(report.citedForGeology.ifEveryPairWere.same)} if every pair were the same class, ${f2(report.citedForGeology.ifEveryPairWere.related)} if every pair were related and ${f2(report.citedForGeology.ifEveryPairWere.unrelated)} if every pair were unrelated.`, '');
md.push('| Site | Cited for geology | Rock class of its cell | Against its targets | Mean percentile |', '| --- | --- | --- | --- | --- |');
for (const r of siteRows) {
  md.push(`| ${r.name} | ${r.citedForGeology ? 'yes' : 'no'} | ${rock(r.cellClass)} | ${r.pairs.map((p) => `${p.target}: ${p.level}`).join('; ')} | ${f2(r3(r.meanPercentile))} |`);
}
md.push('');

md.push('## 3. Site-level result: the rock mapped at the site against the rock class of the cell', '');
md.push('**Separate from every number above and from the frozen score.** `data/sites.json` (Session B) gives, for a few named sites, the rock type of the regional map unit at the site, or the major rock type of the whole volcano. Five known analogs are covered: too few to validate anything, enough to show what the grid does to a named site.', '');
if (fine.length === 0) md.push('data/sites.json does not exist yet.', '');
else {
  md.push(`Of the ${fineKnown.length} known analogs: the cell and the site carry the same class at ${report.siteLevel.knownSitesWhereCellAndSiteClassAgree}, a different class at ${report.siteLevel.knownSitesWhereTheyDiffer}, and ${report.siteLevel.knownSitesNotComparable} cannot be compared because one side has no class.`);
  md.push(`Mean geology percentile of those sites against their own targets: ${f2(report.siteLevel.knownMeanPercentileWithCellClass)} with the cell's class, ${f2(report.siteLevel.knownMeanPercentileWithSiteClass)} with the site's class.`, '');
  for (const kind of ['known', 'candidate']) {
    md.push(kind === 'known' ? '### Known analogs (against the targets they are listed for)' : '### Candidate sites (against every target with a rock class; never part of a validation number)', '');
    md.push('| Site | Rock named by the source | Site class (scale) | Cell class | Target | With the cell class | With the site class |', '| --- | --- | --- | --- | --- | --- | --- |');
    for (const r of fine.filter((x) => x.kind === kind)) {
      if (r.pairs.length === 0) md.push(`| ${r.name} | ${r.rockType ?? 'no data'} | ${rock(r.siteClass)}${r.siteScale ? ` (${r.siteScale})` : ''} | ${rock(r.cellClass)} | none listed | | |`);
      for (const p of r.pairs) {
        md.push(`| ${r.name} | ${r.rockType ?? 'no data'} | ${rock(r.siteClass)}${r.siteScale ? ` (${r.siteScale})` : ''} | ${rock(r.cellClass)} | ${p.target}${p.listed ? ' (listed)' : ''} | ${p.cell.level}${p.cell.percentile === null ? '' : `, p ${f2(r3(p.cell.percentile))}`} | ${p.site.level}${p.site.percentile === null ? '' : `, p ${f2(r3(p.site.percentile))}`} |`);
      }
    }
    md.push('');
  }
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'geology.json'), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(join(OUT, 'GEOLOGY.md'), `${md.join('\n')}\n`);
console.log(`Cited for geology: mean percentile ${f2(report.citedForGeology.meanPercentile)} (SE ${f2(report.citedForGeology.standardError)}), others ${f2(report.otherKnownSites.meanPercentile)} (SE ${f2(report.otherKnownSites.standardError)}).`);
console.log(`Pairs, cited sites: ${counts(report.citedForGeology.pairs)}.`);
console.log(`Wrote ${join(OUT, 'geology.json')} and GEOLOGY.md`);

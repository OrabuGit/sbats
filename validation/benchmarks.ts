// Benchmarks: the established analog sites and our candidates, scored the same way, side by side.
//
//     npx tsx validation/benchmarks.ts
//
// Writes data/benchmarks.json for the Featured page, and validation/output/BENCHMARKS.md for people.
// Every site of data/sites.json (Session B) is scored against every target with the match record
// (app/src/lib/match): the frozen formula on site-scale terrain, vegetation and rock, the grid cell's
// climate, and the target's terrain measured in a window of the site's size. The site's own 0.5 degree
// cell is scored too, so the page can show both.
//
// Honest by construction:
//   - One procedure for every site. No site gets a better window, target or threshold than another.
//   - Both "best target" and "typical target" (median over all targets) are given. Best-of-eight
//     flatters, so the median is there to keep it in check.
//   - Known analogs are picked because fine-scale data existed for them. They are a yardstick, not
//     a validation set, and nothing here was tuned.
//
// Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIMENSIONS, PRESETS, PURPOSES, buildProfileIndex, nearestCell, prepareTarget, rankIn, scoreCells } from '../app/src/lib/scoring/index';
import type { DimensionId, PurposeId, Target } from '../app/src/lib/scoring/index';
import { buildMatchRecord, earthPlaceFromCell, earthPlaceFromSite, emitFamilies, listLabels, sharedMinerals, sitePosts, targetAtSiteWindow } from '../app/src/lib/match/index';
import type { ExtraValue, MatchRecord, SiteEntryLike, TargetMineralsFile, TargetWindowsFile, Verdict } from '../app/src/lib/match/index';
import { DATA, MAX_SNAP_KM, OUT, fail, loadData, loadFrozen, readJson } from './lib';

interface SitesFile {
  meta: { generatedAt: string };
  sites: (SiteEntryLike & { kind: 'candidate' | 'known'; inAnalogsJson?: boolean; analogSource?: string | null })[];
}

const frozen = loadFrozen();
if (!frozen) fail('the all-round score is not frozen yet.');
const data = loadData(true);
const sitesFile = readJson<SitesFile>(join(DATA, 'sites.json'));
const windows = readJson<TargetWindowsFile>(join(DATA, 'target_windows.json'));
const mineralsPath = join(DATA, 'target_minerals.json');
const minerals = existsSync(mineralsPath) ? readJson<TargetMineralsFile>(mineralsPath) : null;
const classes = data.earth.meta.factors.find((f) => f.key === 'lithology')?.classes ?? [];
const meta = data.earth.meta as unknown as Parameters<typeof earthPlaceFromCell>[1];

const r3 = (v: number | null): number | null => (v === null ? null : Math.round(v * 1000) / 1000);
const r1 = (v: number | null): number | null => (v === null ? null : Math.round(v * 10) / 10);
const median = (v: number[]): number | null => {
  if (v.length === 0) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
};

// Per target: sorted all-round scores of every Earth cell (for the rank of a score) and the dimension index.
const perTarget = new Map<string, { target: Target; sorted: Float64Array; index: ReturnType<typeof buildProfileIndex> }>();
for (const t of data.targets) {
  const prepared = prepareTarget(t, data.ranges, data.table);
  const scores: number[] = [];
  for (const s of scoreCells(data.cells, prepared, PRESETS.base.weights)) if (s.score !== null) scores.push(s.score);
  perTarget.set(t.id, { target: t, sorted: Float64Array.from(scores).sort(), index: buildProfileIndex(data.cells, prepared) });
}

interface Side {
  /** The frozen all-round score, 0 to 100, or null. */
  score: number | null;
  /** Share of scored Earth cells this score beats (tie-fair). */
  scorePercentile: number | null;
  dimensions: Record<DimensionId, { similarity: number | null; verdict: Verdict }>;
  purposes: Record<PurposeId, number | null>;
}
interface PairResult {
  target: string;
  site: Side & { terrainLikeForLike: boolean; minerals: { similarity: number | null; verdict: Verdict; shared: string[]; targetOnly: string[]; reason: string } | null };
  cell: Side;
}
interface SiteRow {
  id: string;
  name: string;
  kind: 'candidate' | 'known';
  lat: number;
  lon: number;
  footprintKm: number;
  provisional: boolean;
  rockName: string | null;
  bareShare: number | null;
  caveat: string | null;
  /** Minerals EMIT identified here, as family labels, or null when the site has no EMIT data. */
  mineralsIdentified: string[] | null;
  results: PairResult[];
  /** Per purpose: the best target and the median over all targets, at site scale. */
  summary: Record<PurposeId, { best: number | null; bestTarget: string | null; median: number | null }>;
  /** Per dimension: mean similarity over all targets, at site scale. */
  dimensionMean: Record<DimensionId, number | null>;
}

function side(record: MatchRecord, sorted: Float64Array): Side {
  const dims = {} as Side['dimensions'];
  for (const d of DIMENSIONS) {
    const m = record.dimensions.find((x) => x.id === d.id);
    dims[d.id] = { similarity: r3(m?.similarity ?? null), verdict: m?.verdict ?? 'no-data' };
  }
  const purposes = {} as Side['purposes'];
  for (const p of record.purposes) purposes[p.id] = r1(p.score);
  return {
    score: r1(record.score.value),
    scorePercentile: record.score.value === null ? null : r3(rankIn(sorted, record.score.value).midPercentile),
    dimensions: dims,
    purposes,
  };
}

const generatedAt = new Date().toISOString();
const rows: SiteRow[] = [];
for (const s of sitesFile.sites) {
  const hit = nearestCell(data.cells, s.lat, s.lon);
  if (!hit || hit.distanceKm > MAX_SNAP_KM) fail(`"${s.id}" has no Earth cell within ${MAX_SNAP_KM} km`);
  const families = minerals?.families;
  const sitePlace = earthPlaceFromSite(s, hit.cell, meta, families ? { families, emitMinimumShare: minerals?.meta.emitMinimumShare } : {});
  const cellPlace = earthPlaceFromCell(hit.cell, meta, { name: `${s.name} (0.5 degree cell)`, id: s.id });
  const earthMinerals = minerals && s.mineralogy ? emitFamilies(s.mineralogy, minerals.families, minerals.meta.emitMinimumShare) : null;
  const posts = sitePosts(s);

  const results: PairResult[] = [];
  for (const pt of perTarget.values()) {
    const like = targetAtSiteWindow(pt.target, posts, windows);
    const targetMinerals = minerals?.targets[pt.target.id]?.minerals ?? null;
    const shared = minerals ? sharedMinerals(earthMinerals, targetMinerals, minerals.families) : null;
    const famLabel = (id: string): string => minerals?.families.find((f) => f.id === id)?.label ?? id;
    const targetExtra: ExtraValue | undefined =
      targetMinerals && targetMinerals.length > 0
        ? { value: [...new Set(targetMinerals.map((m) => m.family))], unit: '', text: listLabels([...new Set(targetMinerals.map((m) => famLabel(m.family)))]), source: [...new Set(targetMinerals.map((m) => m.source))].join('; '), badge: 'Literature', scale: 'target' }
        : undefined;
    const siteRecord = buildMatchRecord({
      target: like ?? pt.target, place: sitePlace, ranges: data.ranges, table: data.table, classes, terrainLikeForLike: like !== null, generatedAt,
      ...(targetExtra ? { targetExtras: { minerals: targetExtra } } : {}),
      minerals: shared,
    });
    const cellRecord = buildMatchRecord({ target: pt.target, place: cellPlace, ranges: data.ranges, table: data.table, classes, generatedAt });
    const m = siteRecord.dimensions.find((d) => d.id === 'minerals');
    results.push({
      target: pt.target.id,
      site: {
        ...side(siteRecord, pt.sorted),
        terrainLikeForLike: like !== null,
        minerals: shared && m ? { similarity: r3(m.similarity), verdict: m.verdict, shared: shared.shared.map((x) => x.label), targetOnly: shared.targetOnly.map((x) => x.label), reason: m.reason } : null,
      },
      cell: side(cellRecord, pt.sorted),
    });
  }

  const summary = {} as SiteRow['summary'];
  for (const p of PURPOSES) {
    const scored = results.map((r) => ({ target: r.target, score: r.site.purposes[p.id] })).filter((x): x is { target: string; score: number } => x.score !== null);
    const best = scored.length > 0 ? scored.reduce((a, b) => (b.score > a.score ? b : a)) : null;
    summary[p.id] = { best: best?.score ?? null, bestTarget: best?.target ?? null, median: r1(median(scored.map((x) => x.score))) };
  }
  const dimensionMean = {} as SiteRow['dimensionMean'];
  for (const d of DIMENSIONS) {
    const v = results.map((r) => r.site.dimensions[d.id].similarity).filter((x): x is number => x !== null);
    dimensionMean[d.id] = v.length > 0 ? r3(v.reduce((a, b) => a + b, 0) / v.length) : null;
  }
  rows.push({
    id: s.id, name: s.name, kind: s.kind, lat: s.lat, lon: s.lon, footprintKm: s.footprintKm,
    provisional: s.footprintStatus === 'provisional', rockName: sitePlace.rockName, bareShare: sitePlace.bareShare, caveat: s.caveat ?? null,
    mineralsIdentified: earthMinerals ? earthMinerals.families.map((f) => f.label) : null,
    results, summary, dimensionMean,
  });
}

// Group comparison: candidates against known analogs, per dimension and per purpose (median target).
function groupMean(kind: 'candidate' | 'known', pick: (r: SiteRow) => number | null): number | null {
  const v = rows.filter((r) => r.kind === kind).map(pick).filter((x): x is number => x !== null);
  return v.length > 0 ? r3(v.reduce((a, b) => a + b, 0) / v.length) : null;
}
const groups = {
  candidates: rows.filter((r) => r.kind === 'candidate').length,
  known: rows.filter((r) => r.kind === 'known').length,
  dimensionMean: Object.fromEntries(DIMENSIONS.map((d) => [d.id, { candidates: groupMean('candidate', (r) => r.dimensionMean[d.id]), known: groupMean('known', (r) => r.dimensionMean[d.id]) }])),
  purposeMedian: Object.fromEntries(PURPOSES.map((p) => [p.id, { candidates: r1(groupMean('candidate', (r) => r.summary[p.id].median)), known: r1(groupMean('known', (r) => r.summary[p.id].median)) }])),
  purposeBest: Object.fromEntries(PURPOSES.map((p) => [p.id, { candidates: r1(groupMean('candidate', (r) => r.summary[p.id].best)), known: r1(groupMean('known', (r) => r.summary[p.id].best)) }])),
};

const caveats = [
  'One procedure for every site: site-scale terrain, vegetation and rock; the 0.5 degree cell\'s temperature and rainfall; the target\'s terrain measured in a window of the site\'s size.',
  '"Best" is the best of all targets, chosen after the fact, and flatters. "Median" is the typical target.',
  'Known analogs are those for which fine-scale data was built. They are a yardstick, not a validation set.',
  'Similarities and scores use the formula, tolerances and weights frozen on ' + frozen.frozenAt + '. Nothing was tuned on these sites.',
  'A footprint holds 16 to 256 terrain posts. Small samples.',
];

const out = {
  meta: {
    generatedAt,
    frozenAt: frozen.frozenAt,
    sitesGeneratedAt: sitesFile.meta.generatedAt,
    earthGeneratedAt: data.earth.meta.generatedAt,
    note: 'Established analog sites and candidate sites scored the same way, for the Featured page. Built by validation/benchmarks.ts with app/src/lib/match.',
    caveats,
    mineralsIncluded: minerals !== null,
    dimensions: DIMENSIONS.map((d) => ({ id: d.id, label: d.label })),
    purposes: PURPOSES.map((p) => ({ id: p.id, label: p.label })),
    targets: data.targets.map((t) => ({ id: t.id, name: t.name, body: t.body })),
  },
  groups,
  sites: rows,
};
writeFileSync(join(DATA, 'benchmarks.json'), `${JSON.stringify(out)}\n`);

// ---------------------------------------------------------------------------------------------
// Markdown for people
// ---------------------------------------------------------------------------------------------
const f2 = (v: number | null): string => (v === null ? 'n/a' : v.toFixed(2));
const f1 = (v: number | null): string => (v === null ? 'n/a' : v.toFixed(1));
const md: string[] = [];
md.push('# Benchmarks: established analogs and our candidates, scored the same way', '');
md.push(`Written ${generatedAt} by \`npx tsx validation/benchmarks.ts\`. Data file for the app: \`data/benchmarks.json\`.`, '');
for (const c of caveats) md.push(`- ${c}`);
md.push('', '## Groups', '');
md.push(`Mean similarity per dimension over all ${data.targets.length} targets, site scale. ${groups.candidates} candidate sites, ${groups.known} known analogs.`, '');
md.push('| Dimension | Candidates | Known analogs |', '| --- | --- | --- |');
for (const d of DIMENSIONS) md.push(`| ${d.label} | ${f2(groups.dimensionMean[d.id]?.candidates ?? null)} | ${f2(groups.dimensionMean[d.id]?.known ?? null)} |`);
md.push('', 'Purpose scores, 0 to 100, mean over sites of the typical (median) target and of the best target:', '');
md.push('| Purpose | Candidates, typical | Known, typical | Candidates, best | Known, best |', '| --- | --- | --- | --- | --- |');
for (const p of PURPOSES) md.push(`| ${p.label} | ${f1(groups.purposeMedian[p.id]?.candidates ?? null)} | ${f1(groups.purposeMedian[p.id]?.known ?? null)} | ${f1(groups.purposeBest[p.id]?.candidates ?? null)} | ${f1(groups.purposeBest[p.id]?.known ?? null)} |`);
md.push('', '## Site by site', '');
md.push(`| Site | Kind | ${DIMENSIONS.map((d) => d.label).join(' | ')} | ${PURPOSES.map((p) => `${p.label} (best / typical)`).join(' | ')} | Minerals identified |`);
md.push(`| --- | --- | ${DIMENSIONS.map(() => '---').join(' | ')} | ${PURPOSES.map(() => '---').join(' | ')} | --- |`);
for (const r of [...rows].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))) {
  md.push(`| ${r.name}${r.provisional ? ' (provisional footprint)' : ''} | ${r.kind} | ${DIMENSIONS.map((d) => f2(r.dimensionMean[d.id])).join(' | ')} | ${PURPOSES.map((p) => `${f1(r.summary[p.id].best)} / ${f1(r.summary[p.id].median)}`).join(' | ')} | ${r.mineralsIdentified === null ? 'no EMIT data' : r.mineralsIdentified.join(', ') || 'none'} |`);
}
md.push('');
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'BENCHMARKS.md'), `${md.join('\n')}\n`);
console.log(`Benchmarks: ${rows.length} sites x ${data.targets.length} targets. Minerals included: ${minerals !== null}.`);
console.log(`Wrote data/benchmarks.json and ${join(OUT, 'BENCHMARKS.md')}`);

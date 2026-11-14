// Do sites known for one thing rank high on that thing?
//
//     npx tsx validation/purposes.ts
//
// For every known analog in data/analogs.json this reads the uses it is cited for (`usedFor`) and
// reports where the site ranks among all Earth cells on each purpose ranking and on each dimension,
// next to its rank on the all-round score. Definitions: validation/purposes/DEFINITIONS.md.
//
// THESE ARE DEVELOPMENT NUMBERS, NOT A CLEAN TEST. All 28 known sites, the 8 hold-out sites included,
// had been scored and read before the dimensions and purposes were defined. The report says so.
//
// The Indonesian candidate sites are never loaded. Nothing here changes a sigma or a weight.
//
// Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.

import { mkdirSync, writeFileSync } from 'node:fs';
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
import type { DimensionId, PurposeId } from '../app/src/lib/scoring/index';
import { MAX_SNAP_KM, OUT, fail, loadData, loadFrozen } from './lib';
import type { Analog } from './lib';

interface Labelled extends Analog {
  usedFor?: PurposeId[];
  usedForPrimary?: PurposeId;
  usedForSource?: Partial<Record<PurposeId, string>>;
}

const frozen = loadFrozen();
if (!frozen) fail('the all-round score is not frozen yet.');
const data = loadData();
const known = (data.sites as Labelled[]).filter((s) => s.kind === 'known');
const purposeIds = new Set(PURPOSES.map((p) => p.id));
for (const s of known) {
  if (!s.usedFor || s.usedFor.length === 0) fail(`"${s.id}" has no usedFor label in analogs.json`);
  for (const u of s.usedFor) if (!purposeIds.has(u)) fail(`"${s.id}": unknown use "${u}"`);
}

// ---------------------------------------------------------------------------------------------
// Per target: purpose scores of every cell (sorted) and the dimension index
// ---------------------------------------------------------------------------------------------

interface PerTarget {
  prepared: ReturnType<typeof prepareTarget>;
  purposeSorted: Record<string, Float64Array>;
  index: ReturnType<typeof buildProfileIndex>;
}
const perTarget = new Map<string, PerTarget>();
for (const t of data.targets) {
  const prepared = prepareTarget(t, data.ranges, data.table);
  const purposeSorted: Record<string, Float64Array> = {};
  for (const p of PURPOSES) {
    const scores: number[] = [];
    for (const r of scoreCells(data.cells, prepared, purposeWeights(p.id))) if (r.score !== null) scores.push(r.score);
    purposeSorted[p.id] = Float64Array.from(scores).sort();
  }
  perTarget.set(t.id, { prepared, purposeSorted, index: buildProfileIndex(data.cells, prepared) });
}

// ---------------------------------------------------------------------------------------------
// Per site: percentile on each purpose and each dimension, averaged over the site's targets
// ---------------------------------------------------------------------------------------------

interface SiteRow {
  id: string;
  name: string;
  usedFor: PurposeId[];
  primary: PurposeId | null;
  targets: number;
  /** Mean over the site's targets of the share of Earth cells beaten or tied. null if never scored. */
  purposePercentile: Record<string, number | null>;
  dimensionPercentile: Record<string, number | null>;
  dimensionSimilarity: Record<string, number | null>;
}

const mean = (values: number[]): number | null => (values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null);
const r3 = (v: number | null): number | null => (v === null ? null : Math.round(v * 1000) / 1000);

const rows: SiteRow[] = [];
for (const s of known) {
  const hit = nearestCell(data.cells, s.lat, s.lon);
  if (!hit || hit.distanceKm > MAX_SNAP_KM) fail(`"${s.id}" has no cell within ${MAX_SNAP_KM} km`);
  const pPct: Record<string, number[]> = {};
  const dPct: Record<string, number[]> = {};
  const dSim: Record<string, number[]> = {};
  for (const targetId of s.analogFor) {
    const pt = perTarget.get(targetId);
    if (!pt) continue;
    for (const p of PURPOSES) {
      const score = scoreCell(hit.cell, pt.prepared, purposeWeights(p.id)).score;
      if (score === null) continue;
      (pPct[p.id] ??= []).push(rankIn(pt.purposeSorted[p.id] as Float64Array, score).percentile);
    }
    const sims = dimensionSimilarities(hit.cell, pt.prepared);
    for (const d of DIMENSIONS) {
      const v = sims[d.id];
      if (v === null) continue;
      (dSim[d.id] ??= []).push(v);
      (dPct[d.id] ??= []).push(rankIn(pt.index.sorted[d.id], v).percentile);
    }
  }
  rows.push({
    id: s.id,
    name: s.name,
    usedFor: s.usedFor as PurposeId[],
    primary: s.usedForPrimary ?? null,
    targets: s.analogFor.length,
    purposePercentile: Object.fromEntries(PURPOSES.map((p) => [p.id, r3(mean(pPct[p.id] ?? []))])),
    dimensionPercentile: Object.fromEntries(DIMENSIONS.map((d) => [d.id, r3(mean(dPct[d.id] ?? []))])),
    dimensionSimilarity: Object.fromEntries(DIMENSIONS.map((d) => [d.id, r3(mean(dSim[d.id] ?? []))])),
  });
}

// ---------------------------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------------------------

function summarise(values: (number | null)[]): { sites: number; meanPercentile: number | null; top10: number; top25: number } {
  const v = values.filter((x): x is number => x !== null);
  return {
    sites: v.length,
    meanPercentile: r3(mean(v)),
    top10: v.filter((x) => x >= 0.9).length,
    top25: v.filter((x) => x >= 0.75).length,
  };
}

const byPurpose = PURPOSES.map((p) => {
  const used = rows.filter((r) => r.usedFor.includes(p.id));
  const others = rows.filter((r) => !r.usedFor.includes(p.id));
  return {
    purpose: p.id,
    label: p.label,
    dimensions: p.dimensions,
    sitesUsedForIt: used.map((r) => r.id),
    onPurposeRanking: summarise(used.map((r) => r.purposePercentile[p.id] ?? null)),
    sameSitesOnAllRoundScore: summarise(used.map((r) => r.purposePercentile.base ?? null)),
    otherKnownSitesOnPurposeRanking: summarise(others.map((r) => r.purposePercentile[p.id] ?? null)),
  };
});

// The same question with one label per site: the use it is best known for.
const byPrimary = PURPOSES.map((p) => {
  const used = rows.filter((r) => r.primary === p.id);
  return {
    purpose: p.id,
    label: p.label,
    sitesBestKnownForIt: used.map((r) => r.id),
    onPurposeRanking: summarise(used.map((r) => r.purposePercentile[p.id] ?? null)),
    sameSitesOnAllRoundScore: summarise(used.map((r) => r.purposePercentile.base ?? null)),
  };
});

const byDimension = DIMENSIONS.map((d) => {
  const purposes = PURPOSES.filter((p) => p.id !== 'base' && p.dimensions.includes(d.id)).map((p) => p.id);
  const knownFor = rows.filter((r) => r.usedFor.some((u) => purposes.includes(u)));
  const rest = rows.filter((r) => !r.usedFor.some((u) => purposes.includes(u)));
  return {
    dimension: d.id,
    label: d.label,
    purposesThatDependOnIt: purposes,
    sitesKnownForIt: summarise(knownFor.map((r) => r.dimensionPercentile[d.id] ?? null)),
    otherKnownSites: summarise(rest.map((r) => r.dimensionPercentile[d.id] ?? null)),
  };
});

// How many cells tie at the top of Geology, per target: the weakness stated in DEFINITIONS.md.
const geologyTies = Object.fromEntries(
  [...perTarget].map(([id, pt]) => {
    const sorted = pt.index.sorted.geology;
    return [id, sorted.length === 0 ? null : r3(rankIn(sorted, 1).shareTied)];
  }),
);

const caveat =
  'Development numbers, not a clean test. All 28 known sites, including the 8 hold-out sites, had been scored and ' +
  'read before the dimensions and purposes were defined. Chance is a mean percentile of 0.5.';

const report = {
  generatedAt: new Date().toISOString(),
  caveat,
  frozenAt: frozen.frozenAt,
  earthGeneratedAt: data.earth.meta.generatedAt,
  definitions: 'validation/purposes/DEFINITIONS.md',
  percentile: 'Share of Earth cells the site beats or ties, averaged over the targets the site is an analog for.',
  purposes: PURPOSES,
  byPurpose,
  byPrimary,
  byDimension,
  shareOfEarthCellsWithTheSameRockClassAsTheTarget: geologyTies,
  sites: rows,
};

// ---------------------------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------------------------

const f = (v: number | null): string => (v === null ? 'n/a' : v.toFixed(2));
const md: string[] = [];
md.push('# Purpose rankings and analog profiles: do sites rank high on what they are known for?', '');
md.push(`**${caveat}**`, '');
md.push(`Generated ${report.generatedAt} by \`npx tsx validation/purposes.ts\`. Earth grid built ${data.earth.meta.generatedAt}.`);
md.push('The all-round score is the one frozen on ' + frozen.frozenAt + ' and is not changed by this view. Definitions and the');
md.push('reason this view exists: `validation/purposes/DEFINITIONS.md`. Candidate sites are not part of this report.', '');
md.push('A percentile is the share of Earth cells the site beats or ties, averaged over the targets it is an analog for.', '');

md.push('## By purpose', '');
md.push('For the sites cited as used for each purpose: their mean percentile on that purpose\'s ranking, the same');
md.push('sites on the all-round score, and the other known sites on the purpose ranking for comparison.', '');
md.push('| Purpose | Depends on | Sites used for it | Mean percentile on the purpose ranking | In top 10% / top 25% | Same sites, all-round score | Other known sites, purpose ranking |');
md.push('| --- | --- | --- | --- | --- | --- | --- |');
for (const b of byPurpose) {
  md.push(
    `| ${b.label} | ${b.dimensions.join(', ')} | ${b.onPurposeRanking.sites} | ${f(b.onPurposeRanking.meanPercentile)} | ` +
      `${b.onPurposeRanking.top10} / ${b.onPurposeRanking.top25} | ${f(b.sameSitesOnAllRoundScore.meanPercentile)} | ` +
      `${f(b.otherKnownSitesOnPurposeRanking.meanPercentile)} (${b.otherKnownSitesOnPurposeRanking.sites} sites) |`,
  );
}
md.push('');
md.push('## By the one use each site is best known for', '');
md.push('Each site counted once, under its primary use.', '');
md.push('| Purpose | Sites best known for it | Mean percentile on the purpose ranking | In top 10% / top 25% | Same sites, all-round score |');
md.push('| --- | --- | --- | --- | --- |');
for (const b of byPrimary) {
  md.push(`| ${b.label} | ${b.onPurposeRanking.sites} | ${f(b.onPurposeRanking.meanPercentile)} | ${b.onPurposeRanking.top10} / ${b.onPurposeRanking.top25} | ${f(b.sameSitesOnAllRoundScore.meanPercentile)} |`);
}
md.push('');
md.push('## By dimension', '');
md.push('Sites used for a purpose that depends on the dimension, against the other known sites.', '');
md.push('| Dimension | Sites known for it | Their mean percentile on it | In top 10% / top 25% | Other known sites |');
md.push('| --- | --- | --- | --- | --- |');
for (const b of byDimension) {
  md.push(
    `| ${b.label} | ${b.sitesKnownForIt.sites} | ${f(b.sitesKnownForIt.meanPercentile)} | ${b.sitesKnownForIt.top10} / ${b.sitesKnownForIt.top25} | ` +
      `${f(b.otherKnownSites.meanPercentile)} (${b.otherKnownSites.sites} sites) |`,
  );
}
md.push('');
md.push('Geology has three possible values, so ties are large. Share of Earth cells with exactly the same rock class');
md.push('as each target (all of them share the top geology percentile):', '');
md.push('| Target | Share of cells tied at the top |', '| --- | --- |');
for (const [id, v] of Object.entries(geologyTies)) md.push(`| ${id} | ${v === null ? 'no rock class for this target' : `${(v * 100).toFixed(1)}%`} |`);
md.push('');
md.push('## Every known site', '');
md.push('| Site | Cited use | ' + PURPOSES.map((p) => p.label).join(' | ') + ' | ' + DIMENSIONS.map((d) => `${d.label} (dim.)`).join(' | ') + ' |');
md.push('| --- | --- | ' + PURPOSES.map(() => '---').join(' | ') + ' | ' + DIMENSIONS.map(() => '---').join(' | ') + ' |');
for (const r of rows) {
  md.push(
    `| ${r.name} | ${r.usedFor.join(', ')} | ` +
      PURPOSES.map((p) => (r.usedFor.includes(p.id) ? `**${f(r.purposePercentile[p.id] ?? null)}**` : f(r.purposePercentile[p.id] ?? null))).join(' | ') +
      ' | ' +
      DIMENSIONS.map((d) => f(r.dimensionPercentile[d.id as DimensionId] ?? null)).join(' | ') +
      ' |',
  );
}
md.push('', 'Bold marks the purposes a site is cited as used for.', '');

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'purposes.json'), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(join(OUT, 'PURPOSES.md'), `${md.join('\n')}\n`);
console.log(caveat, '\n');
for (const b of byPurpose) {
  console.log(
    `${b.label.padEnd(32)} ${String(b.onPurposeRanking.sites).padStart(2)} sites: purpose ranking ${f(b.onPurposeRanking.meanPercentile)}, ` +
      `all-round ${f(b.sameSitesOnAllRoundScore.meanPercentile)}, other known sites ${f(b.otherKnownSitesOnPurposeRanking.meanPercentile)}`,
  );
}
console.log(`Wrote ${join(OUT, 'purposes.json')} and PURPOSES.md`);

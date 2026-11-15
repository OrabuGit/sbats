// Rank stability of the all-round score, for every target: does the top ten survive nudged weights?
//
//     npx tsx validation/stability.ts
//
// 200 redraws of the Base weights (seed 20261115, each weight times a factor between 0.75 and 1.25,
// renormalised), every Earth cell scored again each time with the frozen formula. Also follows the
// cells of the known analogs and of the candidate sites. Nothing is tuned: no redraw is kept.
// Writes validation/output/STABILITY.md and stability.json.
//
// Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PRESETS, STABILITY_DRAWS, STABILITY_SEED, STABILITY_SPREAD, nearestCell, prepareTarget, rankStability, stabilityBasis } from '../app/src/lib/scoring/index';
import { MAX_SNAP_KM, OUT, loadData, loadFrozen, fail } from './lib';

const frozen = loadFrozen();
if (!frozen) fail('the all-round score is not frozen yet.');
const data = loadData(true);
const indexOf = new Map(data.cells.map((c, i) => [c, i]));
const named = [...data.sites.filter((s) => s.kind === 'known'), ...data.candidates].map((s) => {
  const hit = nearestCell(data.cells, s.lat, s.lon);
  return { id: s.id, name: s.name, kind: s.kind, analogFor: s.analogFor, index: hit && hit.distanceKm <= MAX_SNAP_KM ? (indexOf.get(hit.cell) as number) : null };
});

const rows = data.targets.map((t) => {
  const basis = stabilityBasis(data.cells, prepareTarget(t, data.ranges, data.table));
  const top = rankStability(basis, PRESETS.base.weights);
  const listed = named.filter((s) => s.index !== null && (s.kind === 'candidate' || s.analogFor.includes(t.id)));
  const followed = rankStability(basis, PRESETS.base.weights, { follow: listed.map((s) => s.index as number) });
  return {
    target: t.id,
    scoredCells: top.scoredCells,
    meanTop10Overlap: Math.round(top.meanTopNOverlap * 1000) / 1000,
    minTop10Overlap: Math.round(top.minTopNOverlap * 1000) / 1000,
    summary: top.summary,
    top10: top.followed.map((c) => ({ lat: data.cells[c.index]?.lat, lon: data.cells[c.index]?.lon, baseRank: c.baseRank, bestRank: c.bestRank, worstRank: c.worstRank, shareInTop10: c.shareInTopN })),
    sites: listed.map((s, k) => {
      const c = followed.followed[k];
      return { id: s.id, kind: s.kind, baseRank: c?.baseRank ?? null, rankP05: c?.rankP05 ?? null, rankP95: c?.rankP95 ?? null, basePercentile: c?.baseRank ? Math.round((1 - (c.baseRank - 1) / top.scoredCells) * 1000) / 1000 : null };
    }),
  };
});

const pct = (v: number): string => `${Math.round(v * 100)}%`;
const md: string[] = [];
md.push('# Rank stability: does the top ten depend on the exact weights?', '');
md.push(`Written ${new Date().toISOString()} by \`npx tsx validation/stability.ts\`. Score frozen ${frozen.frozenAt}; nothing here changes it.`, '');
md.push(`Method: ${STABILITY_DRAWS} redraws of the Base weights with seed ${STABILITY_SEED}. In each, every weight is multiplied by a random factor between ${1 - STABILITY_SPREAD} and ${1 + STABILITY_SPREAD}, the six are renormalised to sum to 1, and all ${data.cells.length} Earth cells are scored again with the frozen formula. No redraw is kept.`, '');
md.push('| Target | Top 10 that stays in the top 10, on average | In the worst redraw | Widest rank range among the top 10 |', '| --- | --- | --- | --- |');
for (const r of rows) {
  const widest = r.top10.reduce((a, b) => ((b.worstRank ?? 0) - (b.bestRank ?? 0) > (a.worstRank ?? 0) - (a.bestRank ?? 0) ? b : a));
  md.push(`| ${r.target} | ${pct(r.meanTop10Overlap)} | ${pct(r.minTop10Overlap)} | rank ${widest.baseRank} moved between ${widest.bestRank} and ${widest.worstRank} |`);
}
md.push('', 'Reading: the list of the best ten cells is mostly the same whatever the weights within a quarter of the preset. Single ranks inside it are not fixed: say "among the ten best", not "the third best".', '');
md.push('## Known analogs and candidates: how far their rank moves', '');
md.push('Rank among all scored Earth cells with the frozen weights, and the range that nine redraws in ten fall into.', '');
md.push('| Target | Site | Kind | Rank | Nine in ten redraws | Beats this share of cells |', '| --- | --- | --- | --- | --- | --- |');
for (const r of rows) for (const s of r.sites) md.push(`| ${r.target} | ${s.id} | ${s.kind} | ${s.baseRank ?? 'no score'} | ${s.rankP05 ?? 'n/a'} to ${s.rankP95 ?? 'n/a'} | ${s.basePercentile === null ? 'n/a' : pct(s.basePercentile)} |`);
md.push('');
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'stability.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), draws: STABILITY_DRAWS, seed: STABILITY_SEED, spread: STABILITY_SPREAD, targets: rows }, null, 1)}\n`);
writeFileSync(join(OUT, 'STABILITY.md'), `${md.join('\n')}\n`);
for (const r of rows) console.log(`${r.target.padEnd(24)} mean ${pct(r.meanTop10Overlap)}  worst ${pct(r.minTop10Overlap)}`);
console.log(`Wrote ${join(OUT, 'STABILITY.md')}`);

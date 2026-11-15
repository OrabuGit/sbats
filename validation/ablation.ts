// Remove one factor at a time: how do the known analogs and the top Earth place change?
//
//     npx tsx validation/ablation.ts
//
// For each of the six scoring dimensions of the Base preset (Terrain, Bare ground, Dryness, Temperature,
// Sunlight, Rock type) the dimension's weight is set to zero, the other five are renormalised, and
// every Earth cell is scored again for every validation target with the frozen formula. Nothing is
// tuned and the frozen score is not changed: this only reports how much each dimension matters.
//
// Reported per removed dimension: the validation statistics (known analogs in the top 10%, mean
// percentile, ROC AUC against the negative controls), how far each known analog's percentile moves,
// the rank correlation of the known analogs, and for each target whether the best Earth place stays.
// Writes validation/output/ablation.json (and a short plain-language note inside it).
//
// Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PRESETS, normaliseWeights, prepareTarget, scoreCells } from '../app/src/lib/scoring/index';
import type { Weights } from '../app/src/lib/scoring/index';
import { OUT, computeMetrics, loadData, loadFrozen, fail, scoreSites } from './lib';
import type { Site } from './lib';

const frozen = loadFrozen();
if (!frozen) fail('the all-round score is not frozen yet.');
const data = loadData();
const base = PRESETS.base.weights;
const DIMENSIONS = Object.keys(base) as (keyof Weights)[];
const LABEL: Record<string, string> = {
  terrain: 'Terrain', bareGround: 'Bare ground', dryness: 'Dryness', temperature: 'Temperature', sunlight: 'Sunlight', rockType: 'Rock type',
};

const without = (dim: keyof Weights | null): Weights => {
  const w = { ...base } as Weights;
  if (dim) w[dim] = 0;
  return normaliseWeights(w);
};

const known = (sites: Site[]) => sites.filter((s) => s.kind === 'known');
const negative = (sites: Site[]) => sites.filter((s) => s.kind === 'negative');
const round = (v: number | null, d = 3): number | null => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);

function topCells(weights: Weights) {
  const out: Record<string, { lat: number; lon: number; score: number; top10: string[] }> = {};
  for (const t of data.validationTargets) {
    const prepared = prepareTarget(t, data.ranges, data.table);
    const scored = scoreCells(data.cells, prepared, weights);
    const idx = scored.map((s, i) => ({ i, s: s.score })).filter((x): x is { i: number; s: number } => x.s !== null).sort((a, b) => b.s - a.s);
    const best = idx[0];
    if (!best) continue;
    const c = data.cells[best.i]!;
    out[t.id] = { lat: c.lat, lon: c.lon, score: Math.round(best.s * 10) / 10, top10: idx.slice(0, 10).map((x) => `${data.cells[x.i]!.lat},${data.cells[x.i]!.lon}`) };
  }
  return out;
}

function spearman(a: number[], b: number[]): number | null {
  const n = a.length;
  if (n < 3) return null;
  const rank = (v: number[]) => {
    const o = v.map((x, i) => [x, i] as const).sort((p, q) => p[0] - q[0]);
    const r = new Array<number>(n);
    for (let k = 0; k < n; ) {
      let m = k;
      while (m + 1 < n && o[m + 1]![0] === o[k]![0]) m++;
      for (let j = k; j <= m; j++) r[o[j]![1]] = (k + m) / 2;
      k = m + 1;
    }
    return r;
  };
  const ra = rank(a), rb = rank(b);
  const ma = ra.reduce((s, x) => s + x, 0) / n, mb = rb.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (ra[i]! - ma) * (rb[i]! - mb); da += (ra[i]! - ma) ** 2; db += (rb[i]! - mb) ** 2; }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : null;
}

const run = (dim: keyof Weights | null) => {
  const w = without(dim);
  const scored = scoreSites(data.sites, data.validationTargets, data, w);
  return { weights: w, scored, metrics: computeMetrics(known(scored.sites), negative(scored.sites)), tops: topCells(w) };
};

const ref = run(null);
const pairKey = (s: Site, t: string) => `${s.id}|${t}`;
const refPct = new Map<string, number>();
for (const s of known(ref.scored.sites)) for (const t of s.analogFor) {
  const r = s.results[t];
  if (r && r.shareAbove !== null) refPct.set(pairKey(s, t), 1 - r.shareAbove);
}

const rows = DIMENSIONS.map((dim) => {
  const r = run(dim);
  const moves: { site: string; target: string; before: number; after: number | null }[] = [];
  const a: number[] = [], b: number[] = [];
  for (const s of known(r.scored.sites)) for (const t of s.analogFor) {
    const before = refPct.get(pairKey(s, t));
    const res = s.results[t];
    if (before === undefined) continue;
    const after = res && res.shareAbove !== null ? 1 - res.shareAbove : null;
    moves.push({ site: s.id, target: t, before: round(before)!, after: round(after) });
    if (after !== null) { a.push(before); b.push(after); }
  }
  const diffs = moves.filter((m) => m.after !== null).map((m) => (m.after as number) - m.before);
  const meanAbs = diffs.length ? diffs.reduce((s, x) => s + Math.abs(x), 0) / diffs.length : null;
  const worst = [...moves].filter((m) => m.after !== null).sort((x, y) => (y.after! - y.before) - (x.after! - x.before));
  const topChange = Object.entries(ref.tops).map(([t, top]) => {
    const now = r.tops[t];
    const overlap = now ? top.top10.filter((c) => now.top10.includes(c)).length : null;
    return { target: t, sameBestPlace: now ? now.lat === top.lat && now.lon === top.lon : null,
             before: { lat: top.lat, lon: top.lon, score: top.score }, after: now ? { lat: now.lat, lon: now.lon, score: now.score } : null, top10Overlap: overlap };
  });
  return {
    removed: dim,
    label: LABEL[dim] ?? String(dim),
    weightRemoved: base[dim],
    metrics: { top10Share: r.metrics.top10Share, meanPercentile: r.metrics.meanPercentile, rocAuc: r.metrics.rocAuc, meanScoreKnown: r.metrics.meanScoreKnown, meanScoreNegative: r.metrics.meanScoreNegative },
    change: {
      top10Share: round((r.metrics.top10Share ?? NaN) - (ref.metrics.top10Share ?? NaN)),
      meanPercentile: round((r.metrics.meanPercentile ?? NaN) - (ref.metrics.meanPercentile ?? NaN)),
      rocAuc: round((r.metrics.rocAuc ?? NaN) - (ref.metrics.rocAuc ?? NaN)),
    },
    knownAnalogRankCorrelation: round(spearman(a, b)),
    meanAbsolutePercentileMove: round(meanAbs),
    biggestRise: worst.length ? worst[worst.length - 1] : null,
    biggestFall: worst.length ? worst[0] : null,
    bestPlaceByTarget: topChange,
    bestPlaceStaysFor: topChange.filter((t) => t.sameBestPlace).length,
    targetsCompared: topChange.length,
  };
});

const byDrop = [...rows].sort((x, y) => (x.change.meanPercentile ?? 0) - (y.change.meanPercentile ?? 0));
const costliest = byDrop[0]!;
const improves = byDrop.filter((r) => (r.change.meanPercentile ?? 0) > 0.005);
const pc = (v: number | null) => (v === null ? 'n/a' : `${Math.round(v * 100)}%`);
const stays = rows.map((r) => r.bestPlaceStaysFor);
const note =
  `Each row removes one scoring dimension, renormalises the other weights and scores again with the frozen formula. ` +
  `With all six, known analogs beat on average ${pc(ref.metrics.meanPercentile)} of scored land squares and ${pc(ref.metrics.top10Share)} reach the top 10%. ` +
  `Removing ${costliest.label} hurts the most: the mean percentile falls to ${pc(costliest.metrics.meanPercentile)}. ` +
  (improves.length
    ? `Removing ${improves.map((r) => `${r.label} (to ${pc(r.metrics.meanPercentile)})`).join(' or ')} slightly raises it: in this validation set that dimension does not help to separate known analogs from other land. `
    : `No removal improves it. `) +
  `The best Earth place for a target stays the same for ${Math.min(...stays)} to ${Math.max(...stays)} of ${rows[0]!.targetsCompared} targets, depending on what is removed, so the single top square is fragile; the top ten is steadier (see STABILITY.md). ` +
  `This is a finding about the validation set, not a reason to change the frozen weights.`;

const result = {
  generatedAt: new Date().toISOString(),
  frozenAt: frozen.frozenAt,
  method: 'Base preset. For each dimension: weight set to zero, remaining weights renormalised to sum to 1, every Earth cell scored again for every validation target with the frozen formula. The frozen score itself is not changed.',
  sites: { known: known(ref.scored.sites).length, negative: negative(ref.scored.sites).length, note: 'Tuning and hold-out sites together, as in the validation report: the hold-out sites alone are too few to show this.' },
  reference: { weights: ref.weights, metrics: { top10Share: ref.metrics.top10Share, meanPercentile: ref.metrics.meanPercentile, rocAuc: ref.metrics.rocAuc }, bestPlaceByTarget: ref.tops },
  note,
  removals: rows,
};
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'ablation.json'), `${JSON.stringify(result, null, 1)}\n`);
console.log(note);
for (const r of rows) console.log(`${r.label.padEnd(12)} top10 ${pc(r.metrics.top10Share)} percentile ${pc(r.metrics.meanPercentile)} auc ${r.metrics.rocAuc} corr ${r.knownAnalogRankCorrelation} best place stays ${r.bestPlaceStaysFor}/${r.targetsCompared}`);

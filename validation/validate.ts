// SBATS validation: do known analog sites score high and negative controls score low?
//
// Run from the repository root:
//
//     npx tsx validation/validate.ts            (Base preset)
//     npx tsx validation/validate.ts rover      (another preset)
//
// It reads data/earth.json, data/targets.json, data/analogs.json and, when it exists,
// data/lithology_similarity.json, scores every Earth cell for every target with the same library the
// app uses (app/src/lib/scoring), and writes validation/output/report.json and REPORT.md.
//
// Nothing here tunes anything. The numbers are reported as they come out, weak ones included.
// DESIGN.md section 9: a perfect score is a warning that the test is too easy, not a success.
//
// Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PRESET_IDS,
  PRESETS,
  computeEarthRanges,
  nearestCell,
  prepareTarget,
  scoreCell,
  scoreCells,
  validateLithologyTable,
} from '../app/src/lib/scoring/index';
import type { CellSummary, EarthCell, LithologyClass, LithologyTable, PresetId, Target } from '../app/src/lib/scoring/index';

interface Analog {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: 'known' | 'negative' | 'candidate';
  analogFor: string[];
  source: string;
}

interface EarthFile {
  meta: { resolutionDeg: number; generatedAt: string; factors: { key: string; source: string; classes?: LithologyClass[] }[] };
  cells: EarthCell[];
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
const OUT = join(ROOT, 'validation', 'output');

/** A site further than this from its nearest cell centre is treated as off the grid (open ocean). */
const MAX_SNAP_KM = 60;
const TOP_SHARE = 0.1;

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function fail(message: string): never {
  console.error(`validation: ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------------------------

/**
 * ROC AUC: the share of (positive, negative) pairs in which the positive has the higher score.
 * Ties count as half. 0.5 is chance, 1.0 means every positive outranks every negative.
 * Each pair carries a weight so that every known site counts once, however many targets it is tested on.
 */
export function rocAuc(pairs: readonly { positive: number; negative: number; weight: number }[]): number | null {
  let wins = 0;
  let total = 0;
  for (const p of pairs) {
    total += p.weight;
    if (p.positive > p.negative) wins += p.weight;
    else if (p.positive === p.negative) wins += 0.5 * p.weight;
  }
  return total > 0 ? wins / total : null;
}

/** Sorted ascending scores of the scored cells, for rank lookups. */
function sortedScores(summaries: readonly CellSummary[]): Float64Array {
  const scores: number[] = [];
  for (const s of summaries) if (s.score !== null) scores.push(s.score);
  return Float64Array.from(scores).sort();
}

/** Share of scored cells with a strictly higher score. 0 means the best cell on Earth. */
function shareAbove(sorted: Float64Array, score: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((sorted[mid] as number) <= score) lo = mid + 1;
    else hi = mid;
  }
  return sorted.length === 0 ? 1 : (sorted.length - lo) / sorted.length;
}

// ---------------------------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------------------------

const presetArg = (process.argv[2] ?? 'base') as PresetId;
if (!PRESET_IDS.includes(presetArg)) fail(`unknown preset "${presetArg}". Use one of: ${PRESET_IDS.join(', ')}`);
const preset = PRESETS[presetArg];

for (const name of ['earth.json', 'targets.json', 'analogs.json']) {
  if (!existsSync(join(DATA, name))) fail(`data/${name} does not exist yet. Nothing to validate.`);
}
const earth = readJson<EarthFile>(join(DATA, 'earth.json'));
const targets = readJson<Target[]>(join(DATA, 'targets.json'));
const analogs = readJson<Analog[]>(join(DATA, 'analogs.json'));

const notes: string[] = [];
let table: LithologyTable | null = null;
const tablePath = join(DATA, 'lithology_similarity.json');
if (existsSync(tablePath)) {
  table = readJson<LithologyTable>(tablePath);
  const legend = earth.meta.factors.find((f) => f.key === 'lithology')?.classes;
  const problems = validateLithologyTable(table, legend && legend.length > 0 ? legend : undefined);
  if (problems.length > 0) fail(`lithology_similarity.json is not valid: ${problems.join('; ')}`);
} else {
  notes.push('data/lithology_similarity.json does not exist, so Rock type is left out of every score.');
}

const cells = earth.cells;
const ranges = computeEarthRanges(cells);
for (const key of ['tempMean', 'tempRange', 'precip', 'ndvi', 'slope', 'roughness'] as const) {
  if (ranges[key] === null) notes.push(`earth.json has no "${key}" values yet, so that key is left out of every score.`);
}
if (!cells.some((c) => c.lithology !== null)) notes.push('earth.json has no "lithology" values yet, so Rock type is left out of every score.');

const targetById = new Map(targets.map((t) => [t.id, t]));
for (const a of analogs) {
  for (const id of a.analogFor) if (!targetById.has(id)) fail(`analogs.json: "${a.id}" refers to unknown target "${id}"`);
}

// ---------------------------------------------------------------------------------------------
// Score
// ---------------------------------------------------------------------------------------------

interface SiteResult {
  target: string;
  score: number | null;
  /** Share of scored Earth cells with a higher score for this target. null when the site is unscored. */
  shareAbove: number | null;
  inTop10: boolean;
  coverage: number;
  confidence: string | null;
  unscoredReason: string | null;
  missing: string[];
  limitingFactor: string | null;
  reason: string;
}

interface Site {
  id: string;
  name: string;
  kind: Analog['kind'];
  lat: number;
  lon: number;
  cell: { lat: number; lon: number; distanceKm: number } | null;
  analogFor: string[];
  results: Record<string, SiteResult>;
}

const perTarget = new Map<string, { prepared: ReturnType<typeof prepareTarget>; sorted: Float64Array; scored: number }>();
for (const t of targets) {
  const prepared = prepareTarget(t, ranges, table);
  const summaries = scoreCells(cells, prepared, preset.weights);
  const sorted = sortedScores(summaries);
  perTarget.set(t.id, { prepared, sorted, scored: sorted.length });
}

const sites: Site[] = analogs.map((a) => {
  const hit = nearestCell(cells, a.lat, a.lon);
  const onGrid = hit !== null && hit.distanceKm <= MAX_SNAP_KM;
  const results: Record<string, SiteResult> = {};
  for (const t of targets) {
    const pt = perTarget.get(t.id);
    if (!pt) continue;
    if (!onGrid || !hit) {
      results[t.id] = {
        target: t.id, score: null, shareAbove: null, inTop10: false, coverage: 0, confidence: null,
        unscoredReason: 'no-land-cell', missing: [], limitingFactor: null,
        reason: 'No land cell of the Earth grid lies within 60 km of this site.',
      };
      continue;
    }
    const full = scoreCell(hit.cell, pt.prepared, preset.weights);
    const above = full.score === null ? null : shareAbove(pt.sorted, full.score);
    results[t.id] = {
      target: t.id,
      score: full.score === null ? null : Math.round(full.score * 10) / 10,
      shareAbove: above === null ? null : Math.round(above * 10000) / 10000,
      inTop10: above !== null && above < TOP_SHARE,
      coverage: full.coverage,
      confidence: full.confidence,
      unscoredReason: full.unscoredReason,
      missing: full.missing,
      limitingFactor: full.limitingFactor,
      reason: full.reason,
    };
  }
  return {
    id: a.id, name: a.name, kind: a.kind, lat: a.lat, lon: a.lon,
    cell: hit && onGrid ? { lat: hit.cell.lat, lon: hit.cell.lon, distanceKm: Math.round(hit.distanceKm * 10) / 10 } : null,
    analogFor: a.analogFor,
    results,
  };
});

const known = sites.filter((s) => s.kind === 'known');
const negative = sites.filter((s) => s.kind === 'negative');
const candidates = sites.filter((s) => s.kind === 'candidate');

// ---------------------------------------------------------------------------------------------
// Headline numbers
// ---------------------------------------------------------------------------------------------

// A (known analog, matching target) pair is one positive case. Each is compared with every negative
// control scored for the same target. A site listed for several targets is split equally between
// them, so every known site carries the same total weight.
type Pair = { positive: number; negative: number; weight: number };
const scoredPairs: Pair[] = [];
const strictPairs: Pair[] = [];
let positiveCases = 0;
let positiveUnscored = 0;
let positiveInTop10 = 0;
let sitesWithCases = 0;
let top10Share = 0;
let percentileSum = 0;
let percentileWeight = 0;

for (const site of known) {
  const ids = site.analogFor.filter((id) => site.results[id]);
  if (ids.length === 0) continue;
  sitesWithCases += 1;
  const weight = 1 / ids.length;
  for (const targetId of ids) {
    const p = site.results[targetId] as SiteResult;
    positiveCases += 1;
    if (p.score === null) positiveUnscored += 1;
    else {
      percentileSum += weight * (1 - (p.shareAbove ?? 1));
      percentileWeight += weight;
    }
    if (p.inTop10) {
      positiveInTop10 += 1;
      top10Share += weight;
    }
    for (const neg of negative) {
      const n = neg.results[targetId];
      if (!n) continue;
      // Strict: a site with no score is never ranked or shown, so it sits below every scored site.
      strictPairs.push({ positive: p.score ?? -1, negative: n.score ?? -1, weight });
      if (p.score !== null && n.score !== null) scoredPairs.push({ positive: p.score, negative: n.score, weight });
    }
  }
}

const knownSitesInTop10 = known.filter((s) => s.analogFor.some((id) => s.results[id]?.inTop10)).length;
const knownSitesUnscored = known.filter((s) => s.analogFor.every((id) => (s.results[id]?.score ?? null) === null)).length;
const aucStrict = rocAuc(strictPairs);
const aucScored = rocAuc(scoredPairs);
const meanPercentile = percentileWeight > 0 ? percentileSum / percentileWeight : null;
const top10ShareOfSites = sitesWithCases > 0 ? top10Share / sitesWithCases : null;

const negativeWorst = negative.map((s) => {
  let best: SiteResult | null = null;
  for (const r of Object.values(s.results)) {
    if (r.score === null) continue;
    if (!best || (r.shareAbove ?? 1) < (best.shareAbove ?? 1)) best = r;
  }
  return { id: s.id, name: s.name, bestRank: best };
});

const warnings: string[] = [];
if (aucStrict !== null && aucStrict >= 0.99) {
  warnings.push(
    'ROC AUC is at or near 1.0. That mostly shows the negative controls (rainforests and cities) are easy to ' +
      'tell apart, not that the ranking is right. Read the top-10% share and the mean percentile, which compare ' +
      'the known analogs with every land cell on Earth.',
  );
}
if (positiveUnscored > 0) {
  warnings.push(`${positiveUnscored} of ${positiveCases} known-analog cases have no score and count as failures in the strict AUC.`);
}
for (const n of negativeWorst) {
  if (n.bestRank && (n.bestRank.shareAbove ?? 1) < TOP_SHARE) {
    warnings.push(`Negative control "${n.name}" is in the top 10% for ${n.bestRank.target}. That is a failure.`);
  }
}

const round = (v: number | null, d = 3): number | null => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);

const report = {
  generatedAt: new Date().toISOString(),
  preset: preset.id,
  weights: preset.weights,
  earth: { generatedAt: earth.meta.generatedAt, resolutionDeg: earth.meta.resolutionDeg, cells: cells.length },
  scoredCellsPerTarget: Object.fromEntries([...perTarget].map(([id, v]) => [id, v.scored])),
  targetsMissingValues: Object.fromEntries([...perTarget].map(([id, v]) => [id, v.prepared.missingTargetKeys])),
  counts: { known: known.length, negative: negative.length, candidate: candidates.length, positiveCases },
  headline: {
    rocAuc: round(aucStrict),
    rocAucScoredOnly: round(aucScored),
    comparisons: strictPairs.length,
    comparisonsScoredOnly: scoredPairs.length,
    knownInTop10Share: round(top10ShareOfSites),
    knownCasesInTop10: positiveInTop10,
    knownSitesInTop10AnyTarget: knownSitesInTop10,
    knownCasesUnscored: positiveUnscored,
    knownSitesUnscored,
    meanPercentileOfKnown: round(meanPercentile),
  },
  definitions: {
    positiveCase:
      'One known analog site scored against one target listed in its analogFor. A site listed for several targets is ' +
      'split equally between them, so every site counts once in each number below.',
    rocAuc:
      'Share of (positive case, negative control) pairs, both scored against the same target, in which the known ' +
      'analog has the higher score. Ties count half. A site with no score counts as below every scored site.',
    rocAucScoredOnly: 'The same, using only pairs where both sites have a score.',
    knownInTop10Share:
      'Share of known analogs whose cell is in the top 10% of all scored Earth cells for their matching target ' +
      '(site-weighted over their targets). Unscored cases count as not in the top 10%.',
    meanPercentileOfKnown:
      'Mean, over scored positive cases, of the share of scored Earth cells that the site beats or ties. 0.5 is chance. ' +
      'This is the AUC of known analogs against every land cell, a harder test than the six controls.',
    snapping: `Each site is scored at the nearest earth.json cell centre. Sites more than ${MAX_SNAP_KM} km from any cell are unscored.`,
  },
  notes,
  warnings,
  negativeControls: negativeWorst,
  sites,
};

// ---------------------------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------------------------

function pct(v: number | null): string {
  return v === null ? 'no score' : `${(v * 100).toFixed(1)}%`;
}

function siteRow(s: Site, targetId: string): string {
  const r = s.results[targetId];
  if (!r) return '';
  const score = r.score === null ? `no score (${r.unscoredReason})` : r.score.toFixed(1);
  const top = r.shareAbove === null ? 'n/a' : `top ${pct(r.shareAbove)}`;
  return `| ${s.name} | ${targetId} | ${score} | ${top} | ${r.confidence ?? 'n/a'} | ${r.limitingFactor ?? 'n/a'} |`;
}

const md: string[] = [];
md.push('# SBATS validation report', '');
md.push(`Generated ${report.generatedAt} by \`npx tsx validation/validate.ts ${preset.id}\`. Preset: ${preset.label}.`);
md.push(`Earth grid: ${cells.length} land cells at ${earth.meta.resolutionDeg} degrees, built ${earth.meta.generatedAt}.`, '');
md.push('These numbers are reported as they came out. Nothing was tuned to produce them.', '');
md.push('## Headline', '');
md.push('| Measure | Value |', '| --- | --- |');
md.push(`| ROC AUC, known analogs against negative controls (strict) | ${report.headline.rocAuc ?? 'n/a'} |`);
md.push(`| ROC AUC, scored sites only | ${report.headline.rocAucScoredOnly ?? 'n/a'} |`);
md.push(`| Share of known analogs in the top 10% of Earth cells for their target | ${pct(report.headline.knownInTop10Share)} (${positiveInTop10} of ${positiveCases} site-target cases) |`);
md.push(`| Known sites in the top 10% for at least one of their targets | ${knownSitesInTop10} of ${known.length} |`);
md.push(`| Known analogs with no score for any of their targets | ${knownSitesUnscored} of ${known.length} sites (${positiveUnscored} of ${positiveCases} cases) |`);
md.push(`| Mean percentile of known analogs among all Earth cells | ${report.headline.meanPercentileOfKnown ?? 'n/a'} |`, '');
md.push('How to read them:', '');
for (const [k, v] of Object.entries(report.definitions)) md.push(`- \`${k}\`: ${v}`);
md.push('');
if (warnings.length > 0) {
  md.push('## Warnings', '');
  for (const w of warnings) md.push(`- ${w}`);
  md.push('');
}
if (notes.length > 0) {
  md.push('## What was left out of the scores', '');
  for (const n of notes) md.push(`- ${n}`);
  for (const [id, keys] of Object.entries(report.targetsMissingValues)) {
    if (keys.length > 0) md.push(`- Target \`${id}\` has no usable value for: ${keys.join(', ')}.`);
  }
  md.push('');
}
md.push('## Negative controls (must rank low)', '');
md.push('| Site | Best rank over all targets | Target | Score |', '| --- | --- | --- | --- |');
for (const n of negativeWorst) {
  md.push(
    n.bestRank
      ? `| ${n.name} | top ${pct(n.bestRank.shareAbove)} | ${n.bestRank.target} | ${n.bestRank.score?.toFixed(1) ?? ''} |`
      : `| ${n.name} | no score for any target | | |`,
  );
}
md.push('');
md.push('## Known analogs, scored against their own targets', '');
md.push('| Site | Target | Score | Rank among Earth cells | Confidence | Limiting factor |', '| --- | --- | --- | --- | --- | --- |');
for (const s of known) for (const id of s.analogFor) md.push(siteRow(s, id));
md.push('');
md.push('## Candidates (the headline sites, not part of the validation numbers)', '');
md.push('| Site | Target | Score | Rank among Earth cells | Confidence | Limiting factor |', '| --- | --- | --- | --- | --- | --- |');
for (const s of candidates) for (const id of s.analogFor) md.push(siteRow(s, id));
md.push('');

mkdirSync(OUT, { recursive: true });
const suffix = preset.id === 'base' ? '' : `.${preset.id}`;
writeFileSync(join(OUT, `report${suffix}.json`), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(join(OUT, `REPORT${suffix}.md`), `${md.join('\n')}\n`);

console.log(`Preset ${preset.label}: ${known.length} known, ${negative.length} negative, ${candidates.length} candidate sites, ${cells.length} cells`);
console.log(`ROC AUC (strict)            ${report.headline.rocAuc}`);
console.log(`ROC AUC (scored only)       ${report.headline.rocAucScoredOnly}`);
console.log(`Known in top 10% (share)    ${pct(report.headline.knownInTop10Share)}  (${positiveInTop10} of ${positiveCases} cases, ${knownSitesInTop10} of ${known.length} sites for at least one target)`);
console.log(`Known with no score         ${knownSitesUnscored} of ${known.length} sites (${positiveUnscored} of ${positiveCases} cases)`);
console.log(`Mean percentile of known    ${report.headline.meanPercentileOfKnown}`);
for (const w of warnings) console.log(`WARNING: ${w}`);
for (const n of notes) console.log(`NOTE: ${n}`);
console.log(`Wrote validation/output/report${suffix}.json and REPORT${suffix}.md`);

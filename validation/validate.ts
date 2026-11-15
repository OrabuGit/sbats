// SBATS validation: do known analog sites score high and negative controls score low?
//
// Run from the repository root:
//
//     npx tsx validation/validate.ts            (Base preset)
//     npx tsx validation/validate.ts rover      (another preset)
//
// It scores every Earth cell for every target with the same library the app uses
// (app/src/lib/scoring) and writes validation/output/report.json and REPORT.md.
//
// Which sites it uses depends on where the project stands:
// - Before the tuning pass is frozen (no validation/tuning/frozen.json): the tuning set only. The
//   hold-out set stays unseen so that it can give an honest number afterwards. The report is
//   marked PROVISIONAL.
// - After the freeze: the tuning set and the hold-out set, side by side, plus both together.
// Indonesian candidate sites are never loaded here. They are the findings, not the test.
//
// Nothing here tunes anything. Numbers are reported as they come out, weak ones included.
//
// Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PRESET_IDS, PRESETS } from '../app/src/lib/scoring/index';
import type { PresetId } from '../app/src/lib/scoring/index';
import { DEFINITIONS, OUT, fail, loadData, loadFrozen, loadSplit, metricsByBody, scoreSites } from './lib';
import type { Metrics, SetMetrics, Site } from './lib';

const presetArg = (process.argv[2] ?? 'base') as PresetId;
if (!PRESET_IDS.includes(presetArg)) fail(`unknown preset "${presetArg}". Use one of: ${PRESET_IDS.join(', ')}`);
const preset = PRESETS[presetArg];

const data = loadData();
const split = loadSplit();
const frozen = loadFrozen();
if (!split) fail('validation/tuning/split.json does not exist. Run python3 validation/tuning/make_split.py once.');

const known = new Set(data.sites.map((s) => s.id));
for (const id of [...split.tuning, ...split.holdout]) if (!known.has(id)) fail(`split.json names "${id}", which is not a known or negative site in analogs.json`);
for (const s of data.sites) if (!split.tuning.includes(s.id) && !split.holdout.includes(s.id)) fail(`"${s.id}" is in analogs.json but not in split.json. The site list changed after the split was drawn.`);

// ---------------------------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------------------------

const reasons: string[] = [];
if (!data.terrain.landed) reasons.push('slope and roughness are not in earth.json yet, so Terrain is left out of every score');
if (!frozen) reasons.push('the one tuning pass has not been run and frozen, so sigmas and weights are first guesses and the hold-out set has not been scored');
const status = reasons.length === 0 ? 'final' : 'provisional';
const statusNote =
  status === 'final'
    ? `Sigmas and weights were frozen on ${frozen?.frozenAt}. The hold-out numbers are the honest ones: those sites were never used to tune.`
    : `${reasons.map((r) => r[0]?.toUpperCase() + r.slice(1)).join('. ')}.`;

// ---------------------------------------------------------------------------------------------
// Score
// ---------------------------------------------------------------------------------------------

const wanted = frozen ? data.sites : data.sites.filter((s) => split.tuning.includes(s.id));
const scored = scoreSites(wanted, data.validationTargets, data, preset.weights);
const setOf = (s: Site): 'tuning' | 'holdout' => (split.tuning.includes(s.id) ? 'tuning' : 'holdout');

const sets: Record<string, SetMetrics> = {
  tuning: metricsByBody(scored.sites.filter((s) => setOf(s) === 'tuning'), data.validationTargets),
};
if (frozen) {
  sets.holdout = metricsByBody(scored.sites.filter((s) => setOf(s) === 'holdout'), data.validationTargets);
  sets.all = metricsByBody(scored.sites, data.validationTargets);
}
const headlineSet = frozen ? 'holdout' : 'tuning';
const headline = (sets[headlineSet] as SetMetrics).overall;

const negativeWorst = scored.sites
  .filter((s) => s.kind === 'negative')
  .map((s) => {
    let best: Site['results'][string] | null = null;
    for (const r of Object.values(s.results)) {
      if (r.score === null) continue;
      if (!best || (r.shareAbove ?? 1) < (best.shareAbove ?? 1)) best = r;
    }
    return { id: s.id, name: s.name, set: setOf(s), bestRank: best };
  });

const warnings: string[] = [];
for (const [name, m] of Object.entries(sets)) {
  if (m.overall.rocAuc !== null && m.overall.rocAuc >= 0.99) {
    warnings.push(
      `ROC AUC on the ${name} set is at or near 1.0. That mostly shows the negative controls (rainforests and cities) ` +
        'are easy to tell apart. Read the top-10% share and the mean percentile, which compare with every land cell.',
    );
  }
  if (m.overall.casesUnscored > 0) {
    warnings.push(`${name} set: ${m.overall.casesUnscored} of ${m.overall.positiveCases} known-analog cases have no score and count as failures in the strict AUC.`);
  }
}
for (const n of negativeWorst) {
  if (n.bestRank && (n.bestRank.shareAbove ?? 1) < 0.1) warnings.push(`Negative control "${n.name}" is in the top 10% for ${n.bestRank.target}. That is a failure.`);
}
if (frozen) {
  const t = sets.tuning?.overall;
  const h = sets.holdout?.overall;
  if (t && h && t.rocAuc !== null && h.rocAuc !== null && t.rocAuc - h.rocAuc > 0.1) {
    warnings.push(`The hold-out AUC (${h.rocAuc}) is more than 0.1 below the tuning-set AUC (${t.rocAuc}): the tuning did not carry over well.`);
  }
  const moon = sets.holdout?.moon.meanPercentile ?? null;
  const mars = sets.holdout?.mars.meanPercentile ?? null;
  if (moon !== null && mars !== null && Math.abs(moon - mars) > 0.1) {
    warnings.push(`On the hold-out set, ${mars < moon ? 'Mars' : 'Moon'} targets do worse: mean percentile ${Math.min(moon, mars)} against ${Math.max(moon, mars)}.`);
  }
}
if (frozen && frozen.earthGeneratedAt !== data.earth.meta.generatedAt) {
  warnings.push(`earth.json was rebuilt (${data.earth.meta.generatedAt}) after the freeze (built ${frozen.earthGeneratedAt}). The frozen values were not retuned, by rule.`);
}

const report = {
  status,
  statusNote,
  generatedAt: new Date().toISOString(),
  preset: preset.id,
  weights: preset.weights,
  earth: { generatedAt: data.earth.meta.generatedAt, resolutionDeg: data.earth.meta.resolutionDeg, cells: data.cells.length, terrain: data.terrain },
  frozenAt: frozen?.frozenAt ?? null,
  split: { seed: split.seed, drawnAt: split.drawnAt, tuning: split.tuning.length, holdout: split.holdout.length, excludedCandidates: split.excludedCandidates },
  headlineSet,
  headline,
  sets,
  scoredCellsPerTarget: scored.scoredCellsPerTarget,
  targetsMissingValues: scored.missingTargetKeys,
  definitions: DEFINITIONS,
  notes: data.notes,
  warnings,
  negativeControls: negativeWorst,
  sites: scored.sites.map((s) => ({ set: setOf(s), ...s })),
};

// ---------------------------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------------------------

const pct = (v: number | null): string => (v === null ? 'n/a' : `${(v * 100).toFixed(1)}%`);
const num = (v: number | null): string => (v === null ? 'n/a' : String(v));

function metricRows(cols: { label: string; m: Metrics }[]): string[] {
  const row = (label: string, f: (m: Metrics) => string): string => `| ${label} | ${cols.map((c) => f(c.m)).join(' | ')} |`;
  return [
    `| Measure | ${cols.map((c) => c.label).join(' | ')} |`,
    `| --- | ${cols.map(() => '---').join(' | ')} |`,
    row('Known sites / negative controls', (m) => `${m.knownSites} / ${m.negativeSites}`),
    row('ROC AUC (strict)', (m) => num(m.rocAuc)),
    row('ROC AUC (scored sites only)', (m) => num(m.rocAucScoredOnly)),
    row('Known analogs in the top 10% of Earth cells', (m) => pct(m.top10Share)),
    row('Mean percentile of known analogs', (m) => num(m.meanPercentile)),
    row('Known sites with no score', (m) => `${m.knownSitesUnscored}`),
    row('Mean score, known / negative', (m) => `${num(m.meanScoreKnown)} / ${num(m.meanScoreNegative)}`),
    row('Most common limiting factor', (m) => {
      const top = Object.entries(m.limitingFactorShare).sort((a, b) => b[1] - a[1])[0];
      return top ? `${top[0]} (${pct(top[1])})` : 'n/a';
    }),
  ];
}

function siteRow(s: Site, targetId: string): string {
  const r = s.results[targetId];
  if (!r) return '';
  const score = r.score === null ? `no score (${r.unscoredReason})` : r.score.toFixed(1);
  const top = r.shareAbove === null ? 'n/a' : `top ${pct(r.shareAbove)}`;
  return `| ${s.name} | ${setOf(s)} | ${targetId} | ${score} | ${top} | ${r.confidence ?? 'n/a'} | ${r.limitingFactor ?? 'n/a'} |`;
}

const md: string[] = [];
md.push('# SBATS validation report', '');
md.push(`**Status: ${status.toUpperCase()}.** ${statusNote}`, '');
md.push(`Generated ${report.generatedAt} by \`npx tsx validation/validate.ts ${preset.id}\`. Preset: ${preset.label}.`);
md.push(`Earth grid: ${data.cells.length} land cells at ${data.earth.meta.resolutionDeg} degrees, built ${data.earth.meta.generatedAt}.`);
md.push(`Split: ${split.tuning.length} tuning sites and ${split.holdout.length} hold-out sites, seed ${split.seed} (validation/tuning/split.json).`, '');
md.push('Numbers are reported as they came out. Indonesian candidate sites are not part of this report.', '');

md.push(frozen ? '## Headline: tuning set against hold-out set' : '## Headline: tuning set only (hold-out not yet scored)', '');
const overallCols = Object.entries(sets).map(([name, m]) => ({ label: name === 'all' ? 'Both together' : `${name[0]?.toUpperCase()}${name.slice(1)} set`, m: m.overall }));
md.push(...metricRows(overallCols), '');

md.push('## Moon targets against Mars targets', '');
for (const [name, m] of Object.entries(sets)) {
  if (name === 'all') continue;
  md.push(`${name[0]?.toUpperCase()}${name.slice(1)} set:`, '');
  md.push(...metricRows([{ label: 'Moon targets', m: m.moon }, { label: 'Mars targets', m: m.mars }]), '');
}

md.push('How to read the measures:', '');
for (const [k, v] of Object.entries(DEFINITIONS)) md.push(`- \`${k}\`: ${v}`);
md.push('');
if (warnings.length > 0) {
  md.push('## Warnings', '');
  for (const w of warnings) md.push(`- ${w}`);
  md.push('');
}
const left: string[] = [...data.notes];
for (const [id, keys] of Object.entries(scored.missingTargetKeys)) if (keys.length > 0) left.push(`Target \`${id}\` has no usable value for: ${keys.join(', ')}.`);
if (left.length > 0) {
  md.push('## What was left out of the scores', '');
  for (const n of left) md.push(`- ${n}`);
  md.push('');
}
md.push('## Negative controls (must rank low)', '');
md.push('| Site | Set | Best rank over all targets | Target | Score |', '| --- | --- | --- | --- | --- |');
for (const n of negativeWorst) {
  md.push(
    n.bestRank
      ? `| ${n.name} | ${n.set} | top ${pct(n.bestRank.shareAbove)} | ${n.bestRank.target} | ${n.bestRank.score?.toFixed(1) ?? ''} |`
      : `| ${n.name} | ${n.set} | no score for any target | | |`,
  );
}
md.push('');
md.push('## Known analogs, scored against their own targets', '');
md.push('| Site | Set | Target | Score | Rank among Earth cells | Confidence | Limiting factor |', '| --- | --- | --- | --- | --- | --- | --- |');
for (const s of scored.sites) if (s.kind === 'known') for (const id of s.analogFor) md.push(siteRow(s, id));
md.push('');

mkdirSync(OUT, { recursive: true });
const suffix = preset.id === 'base' ? '' : `.${preset.id}`;
writeFileSync(join(OUT, `report${suffix}.json`), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(join(OUT, `REPORT${suffix}.md`), `${md.join('\n')}\n`);

console.log(`Status: ${status.toUpperCase()}. ${statusNote}`);
for (const [name, m] of Object.entries(sets)) {
  const o = m.overall;
  console.log(
    `${name.padEnd(8)} known ${o.knownSites}, negative ${o.negativeSites}: AUC ${num(o.rocAuc)} (scored only ${num(o.rocAucScoredOnly)}), ` +
      `top 10% ${pct(o.top10Share)}, mean percentile ${num(o.meanPercentile)} | Moon pct ${num(m.moon.meanPercentile)}, Mars pct ${num(m.mars.meanPercentile)}`,
  );
}
for (const w of warnings) console.log(`WARNING: ${w}`);
for (const n of data.notes) console.log(`NOTE: ${n}`);
console.log(`Wrote ${join(OUT, `report${suffix}.json`)} and REPORT${suffix}.md`);

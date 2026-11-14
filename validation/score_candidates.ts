// Scores the Indonesian candidate sites. These are the project's findings, not part of the test.
//
//     npx tsx validation/score_candidates.ts
//
// It refuses to run before the tuning pass is frozen (validation/tuning/frozen.json), so that
// candidate scores can never be seen while sigmas and weights are still open to change.
// It writes validation/output/candidates.json and CANDIDATES.md. Each candidate is scored against
// every target, with every preset, and reported as it comes out.
//
// Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PRESET_IDS, PRESETS } from '../app/src/lib/scoring/index';
import { OUT, fail, loadData, loadFrozen, scoreSites } from './lib';

const frozen = loadFrozen();
if (!frozen) fail('the tuning pass is not frozen yet. Candidate sites are not scored until it is.');

const data = loadData(true);
if (data.candidates.length === 0) fail('analogs.json has no candidate sites.');

const pct = (v: number | null): string => (v === null ? 'n/a' : `${(v * 100).toFixed(1)}%`);
const byPreset: Record<string, ReturnType<typeof scoreSites>['sites']> = {};
for (const id of PRESET_IDS) byPreset[id] = scoreSites(data.candidates, data.targets, data, PRESETS[id].weights).sites;

const md: string[] = [];
md.push('# Indonesian candidate sites', '');
md.push(`Scored ${new Date().toISOString()} with the values frozen on ${frozen.frozenAt}. Earth grid built ${data.earth.meta.generatedAt}.`, '');
md.push('These sites were never used to tune or validate the score. Each is scored at its 0.5 degree cell, about');
md.push('55 km wide, so a crater or a cave is represented by the rainfall, vegetation and rock of the whole cell.');
md.push('Indonesia is wet and vegetated: low all-round scores are expected and are reported as they are.', '');
for (const id of PRESET_IDS) {
  md.push(`## Preset: ${PRESETS[id].label}`, '');
  md.push('| Site | Target | Score | Rank among Earth cells | Confidence | Limiting factor | Why |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const s of byPreset[id] ?? []) {
    for (const t of data.targets) {
      const r = s.results[t.id];
      if (!r) continue;
      const listed = s.analogFor.includes(t.id) ? ' (listed)' : '';
      const score = r.score === null ? `no score (${r.unscoredReason})` : r.score.toFixed(1);
      md.push(`| ${s.name} | ${t.id}${listed} | ${score} | ${r.shareAbove === null ? 'n/a' : `top ${pct(r.shareAbove)}`} | ${r.confidence ?? 'n/a'} | ${r.limitingFactor ?? 'n/a'} | ${r.reason} |`);
    }
  }
  md.push('');
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'candidates.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), frozenAt: frozen.frozenAt, earthGeneratedAt: data.earth.meta.generatedAt, presets: byPreset }, null, 2)}\n`);
writeFileSync(join(OUT, 'CANDIDATES.md'), `${md.join('\n')}\n`);
console.log(`Scored ${data.candidates.length} candidate sites against ${data.targets.length} targets with ${PRESET_IDS.length} presets.`);
console.log(`Wrote ${join(OUT, 'candidates.json')} and CANDIDATES.md`);

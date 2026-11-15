// Are the validation outputs newer than the data they were built from?
//
//     npx tsx validation/check_fresh.ts
//
// Three sessions write into data/. When Session B rebuilds sites.json or a grid, every output
// computed from it here is out of date until it is run again. This lists them. It reads only the
// "generatedAt" each file records, changes nothing, and exits 1 when anything is stale, so
// validation/build_all.sh ends by proving its own outputs are current.
//
// Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib';

/** Each output, the inputs it is computed from, and the command that rebuilds it. */
export const OUTPUTS: { output: string; inputs: string[]; rebuild: string }[] = [
  { output: 'validation/output/report.json', inputs: ['data/earth.json'], rebuild: 'npx tsx validation/validate.ts base' },
  { output: 'validation/output/candidates.json', inputs: ['data/earth.json'], rebuild: 'npx tsx validation/score_candidates.ts' },
  { output: 'validation/output/purposes.json', inputs: ['data/earth.json'], rebuild: 'npx tsx validation/purposes.ts' },
  { output: 'validation/output/geology.json', inputs: ['data/earth.json', 'data/sites.json'], rebuild: 'npx tsx validation/geology.ts' },
  { output: 'validation/output/sites.json', inputs: ['data/earth.json', 'data/sites.json', 'data/target_windows.json'], rebuild: 'npx tsx validation/score_sites.ts' },
  { output: 'validation/output/minerals.json', inputs: ['data/sites.json', 'data/target_minerals.json'], rebuild: 'npx tsx validation/minerals.ts' },
  { output: 'validation/output/stability.json', inputs: ['data/earth.json'], rebuild: 'npx tsx validation/stability.ts' },
  { output: 'data/discoveries.json', inputs: ['data/earth.json'], rebuild: 'npx tsx validation/discoveries.ts' },
  { output: 'data/benchmarks.json', inputs: ['data/earth.json', 'data/sites.json', 'data/target_windows.json', 'data/target_minerals.json', 'data/target_environment.json'], rebuild: 'npx tsx validation/benchmarks.ts' },
  { output: 'data/place_matches.json', inputs: ['data/earth.json', 'data/moon.json', 'data/mars.json', 'data/known_sites.json'], rebuild: 'npx tsx validation/grid_check.ts' },
];

/** The build time a JSON file records about itself (top level or under "meta"), in milliseconds, or null. */
export function builtAt(path: string): number | null {
  if (!existsSync(path)) return null;
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as { generatedAt?: unknown; meta?: { generatedAt?: unknown } };
  const text = parsed.meta?.generatedAt ?? parsed.generatedAt;
  const ms = typeof text === 'string' ? Date.parse(text) : Number.NaN;
  return Number.isFinite(ms) ? ms : null;
}

export interface Stale {
  output: string;
  /** Inputs built after the output, or 'missing' when the output is not there or records no date. */
  newerInputs: string[];
  rebuild: string;
}

/** Outputs older than at least one of their inputs. An input without a recorded date is not counted. */
export function staleOutputs(root: string = ROOT, outputs = OUTPUTS): Stale[] {
  const stale: Stale[] = [];
  for (const o of outputs) {
    const at = builtAt(join(root, o.output));
    if (at === null) {
      stale.push({ output: o.output, newerInputs: ['missing'], rebuild: o.rebuild });
      continue;
    }
    const newer = o.inputs.filter((i) => {
      const inputAt = builtAt(join(root, i));
      return inputAt !== null && inputAt > at;
    });
    if (newer.length > 0) stale.push({ output: o.output, newerInputs: newer, rebuild: o.rebuild });
  }
  return stale;
}

if (process.argv[1]?.endsWith('check_fresh.ts')) {
  const stale = staleOutputs();
  if (stale.length === 0) {
    console.log(`Fresh: all ${OUTPUTS.length} outputs are newer than the data they were built from.`);
  } else {
    console.log(`Stale: ${stale.length} of ${OUTPUTS.length} outputs are older than their inputs.`);
    for (const s of stale) console.log(`  ${s.output}  <-  ${s.newerInputs.join(', ')}\n      ${s.rebuild}`);
    console.log('Or rebuild everything: validation/build_all.sh');
    process.exitCode = 1;
  }
}

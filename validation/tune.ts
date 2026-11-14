// The one tuning pass for sigmas and Base weights. Read validation/tuning/PLAN.md first: this
// script does exactly what that plan says, and the plan was committed before terrain data existed.
//
//     npx tsx validation/tune.ts --team-go
//
// What it may and may not do:
// - It sees the TUNING set only (validation/tuning/split.json). The hold-out sites are never
//   scored here, and the Indonesian candidate sites are never loaded.
// - It refuses to run until slope and roughness are in earth.json, until Bare ground can be
//   computed south of 60 S (the Antarctica fix), and unless it is started with --team-go.
// - It refuses to run a second time: once validation/tuning/frozen.json exists, tuning is over.
// - It changes no source file. It writes frozen.json and tuning-log.json; the frozen values are then
//   copied by hand into validation/build/make_targets.py, app/src/lib/scoring/presets.ts and
//   sunlight.ts, and a unit test checks that they match.
//
// `npx tsx validation/tune.ts --selftest` runs the same code on made-up cells to check the mechanics.
// It scores no real Earth cell, prints clearly that it is a self-test, and writes nothing.
//
// Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.

import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { computeEarthRanges, FACTOR_IDS, PRESETS, SUN_ELEVATION_SIGMA_DEG } from '../app/src/lib/scoring/index';
import type { EarthCell, FactorId, Weights } from '../app/src/lib/scoring/index';
import { TUNING, applySigmas, currentParams, fail, loadData, loadSplit, metricsByBody, scoreSites } from './lib';
import type { Data, Params, SetMetrics } from './lib';

// ---------------------------------------------------------------------------------------------
// The search space and rules. These mirror validation/tuning/PLAN.md. Do not edit after the freeze.
// ---------------------------------------------------------------------------------------------

/** Values each tolerance may take. The starting value is always among them. Tried in this order of keys. */
const LADDERS: { key: Exclude<keyof Params, 'baseWeights'>; values: number[] }[] = [
  { key: 'tempMeanSigma', values: [10, 15, 20, 25, 30] },
  { key: 'tempRangeSigma', values: [3, 5, 7.5, 10] },
  { key: 'precipSigma', values: [125, 250, 375, 500] },
  { key: 'ndviSigma', values: [0.05, 0.1, 0.15, 0.2] },
  { key: 'terrainFraction', values: [0.35, 0.5, 0.75, 1.0] },
  { key: 'sunSigma', values: [10, 15, 22.5, 30] },
];
const SWEEPS = 2;
/** A change is accepted only if it raises the objective by at least this much. Smaller gains are noise. */
const MIN_GAIN = 0.03;
const WEIGHT_STEP = 0.05;
const WEIGHT_MIN = 0.05;
const WEIGHT_MAX = 0.3;
const MAX_WEIGHT_TRANSFERS = 2;

/** How the three other presets follow Base: fixed differences, the same ones used before tuning. */
const PRESET_DELTAS: Record<string, Partial<Weights>> = {
  rover: { terrain: 0.15, dryness: -0.05, temperature: -0.05, rockType: -0.05 },
  ice: { terrain: -0.1, bareGround: -0.05, dryness: -0.05, temperature: 0.15, sunlight: -0.05, rockType: 0.1 },
  astrobiology: { terrain: -0.15, bareGround: -0.05, dryness: 0.15, temperature: -0.05, sunlight: -0.05, rockType: 0.15 },
};

const r3 = (v: number): number => Math.round(v * 1000) / 1000;

export function derivePreset(base: Weights, delta: Partial<Weights>): Weights {
  const raw = {} as Record<FactorId, number>;
  let total = 0;
  for (const id of FACTOR_IDS) {
    raw[id] = Math.max(WEIGHT_MIN, base[id] + (delta[id] ?? 0));
    total += raw[id];
  }
  const out = {} as Record<FactorId, number>;
  let largest: FactorId = 'terrain';
  let sum = 0;
  for (const id of FACTOR_IDS) {
    out[id] = r3(raw[id] / total);
    sum += out[id];
    if (out[id] > out[largest]) largest = id;
  }
  // Rounding to three decimals can leave the sum a hair off 1: put the remainder on the largest weight.
  out[largest] = r3(out[largest] + (1 - sum));
  return out;
}

// ---------------------------------------------------------------------------------------------
// Objective
// ---------------------------------------------------------------------------------------------

interface Evaluation {
  /** Mean of the strict ROC AUC and the mean percentile of known analogs, on the tuning set, Base weights. */
  objective: number;
  metrics: SetMetrics;
}

function evaluate(data: Pick<Data, 'cells' | 'ranges' | 'table' | 'targets'>, tuningSites: Data['sites'], p: Params): Evaluation {
  const scored = scoreSites(tuningSites, applySigmas(data.targets, p), data, p.baseWeights, p.sunSigma);
  const metrics = metricsByBody(scored.sites, data.targets);
  const auc = metrics.overall.rocAuc ?? 0;
  const pct = metrics.overall.meanPercentile ?? 0;
  return { objective: (auc + pct) / 2, metrics };
}

interface LogEntry {
  step: string;
  parameter: string;
  value: unknown;
  objective: number;
  rocAuc: number | null;
  meanPercentile: number | null;
  top10Share: number | null;
  largestLimitingShare: number;
  decision: string;
}

// ---------------------------------------------------------------------------------------------
// Data: real, or made up for the self-test
// ---------------------------------------------------------------------------------------------

const selftest = process.argv.includes('--selftest');
const split = loadSplit();
if (!split) fail('validation/tuning/split.json does not exist.');
const frozenPath = join(TUNING, 'frozen.json');

let data: Data;
if (selftest) {
  console.log('SELF-TEST: made-up Earth cells. These numbers mean nothing and nothing is written.\n');
  const real = loadData();
  // A small pseudo-random grid. One made-up cell sits exactly under every site so that sites snap.
  let seed = 12345;
  const rnd = (): number => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const make = (lat: number, lon: number): EarthCell => ({
    lat, lon,
    tempMean: -50 + 80 * rnd(), tempRange: 1 + 18 * rnd(), precip: 3000 * rnd() ** 2, ndvi: -0.05 + 0.9 * rnd(),
    slope: 15 * rnd() ** 2, roughness: 1500 * rnd() ** 2, lithology: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 16][Math.floor(rnd() * 14)] as number,
  });
  const cells: EarthCell[] = [];
  for (let i = 0; i < 3000; i++) cells.push(make(-80 + 160 * rnd(), -180 + 360 * rnd()));
  for (const s of real.sites) cells.push(make(s.lat, s.lon));
  data = { ...real, cells, ranges: computeEarthRanges(cells), terrain: { slopeShare: 1, roughnessShare: 1, landed: true } };
} else {
  if (existsSync(frozenPath)) fail('validation/tuning/frozen.json exists. The one tuning pass has been done. There is no second pass.');
  // The team starts the pass, nobody else: no watcher, no script.
  if (!process.argv.includes('--team-go')) {
    fail('the tuning pass runs only when the team says so. Start it with --team-go once they have confirmed that terrain and the Antarctica fix are both in earth.json.');
  }
  data = loadData();
  // Team rule of 2026-11-14: no tuning while Antarctica is unscored. The fix that landed leaves NDVI null
  // south of 60 S and supplies the measured barren share instead, so the test is whether Bare ground can
  // be computed there (data/SCHEMA.md, "Bare ground and permanent ice"), not whether NDVI exists.
  const south = data.cells.filter((c) => c.lat < -60);
  const southWithBareGround = south.filter((c) => c.ndvi !== null || (c.barrenFrac !== null && c.barrenFrac !== undefined)).length;
  if (south.length > 0 && southWithBareGround / south.length < 0.8) {
    fail(
      `the Antarctica fix has not landed: ${southWithBareGround} of ${south.length} cells south of 60 S have NDVI or a barren share. ` +
        'Tuning now would freeze the weights with a whole continent unscored.',
    );
  }
  if (!data.terrain.landed) {
    fail(
      `terrain has not landed: slope is in ${(data.terrain.slopeShare * 100).toFixed(0)}% of cells and roughness in ` +
        `${(data.terrain.roughnessShare * 100).toFixed(0)}%. Tuning waits until both are in at least 80%.`,
    );
  }
}

const tuningSites = data.sites.filter((s) => split.tuning.includes(s.id));
if (tuningSites.some((s) => s.kind === 'candidate')) fail('a candidate site is in the tuning set');
if (tuningSites.length !== split.tuning.length) fail('split.json and analogs.json disagree about the tuning sites');

// ---------------------------------------------------------------------------------------------
// The pass
// ---------------------------------------------------------------------------------------------

const before = currentParams(data.targets, PRESETS.base.weights, SUN_ELEVATION_SIGMA_DEG);
for (const { key, values } of LADDERS) {
  if (!values.includes(before[key])) fail(`starting value ${before[key]} of ${key} is not on its ladder`);
}

const log: LogEntry[] = [];
const record = (step: string, parameter: string, value: unknown, e: Evaluation, decision: string): void => {
  log.push({
    step, parameter, value,
    objective: r3(e.objective),
    rocAuc: e.metrics.overall.rocAuc,
    meanPercentile: e.metrics.overall.meanPercentile,
    top10Share: e.metrics.overall.top10Share,
    largestLimitingShare: e.metrics.overall.largestLimitingShare,
    decision,
  });
};

let current: Params = { ...before, baseWeights: { ...before.baseWeights } };
let best = evaluate(data, tuningSites, current);
const start = best;
record('start', 'all', 'starting values', best, 'baseline');
console.log(`Tuning set: ${tuningSites.filter((s) => s.kind === 'known').length} known sites, ${tuningSites.filter((s) => s.kind === 'negative').length} negative controls.`);
console.log(`Start: objective ${r3(best.objective)} (AUC ${best.metrics.overall.rocAuc}, mean percentile ${best.metrics.overall.meanPercentile}, top 10% ${best.metrics.overall.top10Share})\n`);

const changes: { parameter: string; before: unknown; after: unknown; objectiveBefore: number; objectiveAfter: number; step: string }[] = [];

for (let sweep = 1; sweep <= SWEEPS; sweep++) {
  for (const { key, values } of LADDERS) {
    let pick: { value: number; e: Evaluation } | null = null;
    for (const value of values) {
      if (value === current[key]) continue;
      const e = evaluate(data, tuningSites, { ...current, [key]: value });
      const gain = e.objective - best.objective;
      // A change must not make one factor decide more of the results than it already does.
      const dominates = e.metrics.overall.largestLimitingShare > best.metrics.overall.largestLimitingShare + 1e-9;
      const ok = gain >= MIN_GAIN && !dominates;
      record(`sweep ${sweep}`, key, value, e, ok ? 'candidate' : dominates && gain >= MIN_GAIN ? 'rejected: raises the largest limiting-factor share' : 'rejected: gain below 0.03');
      if (!ok) continue;
      const closer = pick !== null && Math.abs(value - before[key]) < Math.abs(pick.value - before[key]);
      if (!pick || e.objective > pick.e.objective + 1e-9 || (Math.abs(e.objective - pick.e.objective) <= 1e-9 && closer)) pick = { value, e };
    }
    if (pick) {
      changes.push({ parameter: key, before: current[key], after: pick.value, objectiveBefore: r3(best.objective), objectiveAfter: r3(pick.e.objective), step: `sweep ${sweep}` });
      console.log(`sweep ${sweep}: ${key} ${current[key]} -> ${pick.value}   objective ${r3(best.objective)} -> ${r3(pick.e.objective)}`);
      current = { ...current, [key]: pick.value };
      best = pick.e;
      record(`sweep ${sweep}`, key, pick.value, pick.e, 'ACCEPTED');
    } else {
      console.log(`sweep ${sweep}: ${key} stays at ${current[key]}`);
    }
  }
}

for (let n = 1; n <= MAX_WEIGHT_TRANSFERS; n++) {
  let pick: { from: FactorId; to: FactorId; weights: Weights; e: Evaluation } | null = null;
  for (const from of FACTOR_IDS) {
    for (const to of FACTOR_IDS) {
      if (from === to) continue;
      const w = { ...current.baseWeights };
      w[from] = r3(w[from] - WEIGHT_STEP);
      w[to] = r3(w[to] + WEIGHT_STEP);
      if (w[from] < WEIGHT_MIN - 1e-9 || w[to] > WEIGHT_MAX + 1e-9) continue;
      const e = evaluate(data, tuningSites, { ...current, baseWeights: w });
      const gain = e.objective - best.objective;
      const dominates = e.metrics.overall.largestLimitingShare > best.metrics.overall.largestLimitingShare + 1e-9;
      const ok = gain >= MIN_GAIN && !dominates;
      record(`weights ${n}`, `${from} -> ${to}`, WEIGHT_STEP, e, ok ? 'candidate' : dominates && gain >= MIN_GAIN ? 'rejected: raises the largest limiting-factor share' : 'rejected: gain below 0.03');
      if (ok && (!pick || e.objective > pick.e.objective + 1e-9)) pick = { from, to, weights: w, e };
    }
  }
  if (!pick) {
    console.log(`weights ${n}: no transfer of ${WEIGHT_STEP} improves the objective by ${MIN_GAIN}. Base weights stay.`);
    break;
  }
  changes.push({ parameter: `baseWeights (${pick.from} -> ${pick.to})`, before: { ...current.baseWeights }, after: pick.weights, objectiveBefore: r3(best.objective), objectiveAfter: r3(pick.e.objective), step: `weights ${n}` });
  console.log(`weights ${n}: move ${WEIGHT_STEP} from ${pick.from} to ${pick.to}   objective ${r3(best.objective)} -> ${r3(pick.e.objective)}`);
  current = { ...current, baseWeights: pick.weights };
  best = pick.e;
  record(`weights ${n}`, `${pick.from} -> ${pick.to}`, WEIGHT_STEP, pick.e, 'ACCEPTED');
}

// ---------------------------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------------------------

const presetsBefore: Record<string, Weights> = { base: before.baseWeights };
const presetsAfter: Record<string, Weights> = { base: current.baseWeights };
for (const [id, delta] of Object.entries(PRESET_DELTAS)) {
  presetsBefore[id] = PRESETS[id as keyof typeof PRESETS].weights;
  presetsAfter[id] = derivePreset(current.baseWeights, delta);
}

console.log(`\nEnd:   objective ${r3(best.objective)} (AUC ${best.metrics.overall.rocAuc}, mean percentile ${best.metrics.overall.meanPercentile}, top 10% ${best.metrics.overall.top10Share})`);
console.log(`${changes.length} change(s) accepted out of ${log.length - 1} evaluations.`);
console.log(`Moon targets, tuning set: mean percentile ${start.metrics.moon.meanPercentile} -> ${best.metrics.moon.meanPercentile}`);
console.log(`Mars targets, tuning set: mean percentile ${start.metrics.mars.meanPercentile} -> ${best.metrics.mars.meanPercentile}`);

if (selftest) {
  console.log('\nSELF-TEST finished. Nothing was written.');
} else {
  const frozen = {
    frozenAt: new Date().toISOString().slice(0, 10),
    frozenAtTime: new Date().toISOString(),
    earthGeneratedAt: data.earth.meta.generatedAt,
    rule: 'This is the only tuning pass. These values are frozen and are not tuned again, even if a later result looks worse.',
    split: { seed: split.seed, tuningSites: split.tuning },
    objective: 'Mean of strict ROC AUC and mean percentile of known analogs, tuning set, Base preset.',
    before,
    after: current,
    presets: presetsAfter,
    presetsBefore,
    changes,
    tuningSet: { before: start.metrics, after: best.metrics, objectiveBefore: r3(start.objective), objectiveAfter: r3(best.objective) },
    evaluations: log.length,
  };
  writeFileSync(frozenPath, `${JSON.stringify(frozen, null, 2)}\n`);
  writeFileSync(join(TUNING, 'tuning-log.json'), `${JSON.stringify(log, null, 2)}\n`);
  console.log('\nWrote validation/tuning/frozen.json and tuning-log.json. Tuning is now closed.');
}

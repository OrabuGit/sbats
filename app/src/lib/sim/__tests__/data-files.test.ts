// Checks the real data/modules.json against the rules, and runs the engine on the real targets.
// Skipped, with a visible note, while the file does not exist.

import { describe, it } from 'node:test';
import { deepEqual, equal, ok } from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MODULE_PARAMS, missingParams, validateModulesFile } from '../catalog';
import { deployTwice } from '../compare';
import { evaluate } from '../evaluate';
import { simulate } from '../simulate';
import { siteFromEarthCell, siteFromTarget } from '../site';
import type { TargetLike } from '../site';
import { MODULE_TYPES } from '../types';
import type { ModulesFile, Sourced } from '../types';
import { layoutOf } from './fixtures';

const DATA = fileURLToPath(new URL('../../../../../data/', import.meta.url));
const load = <T>(name: string): T | null => (existsSync(`${DATA}${name}`) ? (JSON.parse(readFileSync(`${DATA}${name}`, 'utf8')) as T) : null);
const file = load<ModulesFile>('modules.json');
const targets = load<(TargetLike & { cannotCopy: string[] })[]>('targets.json');
const skip = (what: string): void => console.log(`    (skipped: ${what})`);

function everySourced(f: ModulesFile): [string, Sourced][] {
  const out: [string, Sourced][] = [];
  for (const [k, v] of Object.entries(f.crew)) out.push([`crew.${k}`, v]);
  for (const [k, v] of Object.entries(f.constants)) out.push([`constants.${k}`, v]);
  for (const t of MODULE_TYPES) for (const [k, v] of Object.entries(f.modules[t].params)) out.push([`modules.${t}.${k}`, v]);
  for (const [id, e] of Object.entries(f.events)) for (const [k, v] of Object.entries(e.params)) out.push([`events.${id}.${k}`, v]);
  for (const [id, site] of Object.entries(f.sites)) for (const [k, v] of Object.entries(site)) out.push([`sites.${id}.${k}`, v as Sourced]);
  return out;
}

describe('data/modules.json', () => {
  it('follows the rules: every value has a source and a badge, every null says why', () => {
    if (!file) return skip('modules.json does not exist yet');
    deepEqual(validateModulesFile(file), []);
  });

  it('lists every parameter of every module, and nothing is a bare number', () => {
    if (!file) return skip('modules.json does not exist yet');
    for (const t of MODULE_TYPES) deepEqual(Object.keys(file.modules[t].params).sort(), [...MODULE_PARAMS[t]].sort(), t);
    for (const [where, v] of everySourced(file)) {
      ok(v !== null && typeof v === 'object' && 'value' in v && 'source' in v, where);
      if (v.derived) ok((v.note ?? '').startsWith('Derived:'), `${where}: a derived value must show its arithmetic`);
    }
  });

  it('marks as illustrative exactly the modules that have a parameter with no source', () => {
    if (!file) return skip('modules.json does not exist yet');
    const illustrative = MODULE_TYPES.filter((t) => missingParams(file, t).length > 0);
    for (const t of illustrative) {
      const e = evaluate(layoutOf({ [t]: 1 }, 0), { id: 'x', name: 'x', body: 'mars', irradianceWm2: 300, litFraction: 0.5, longestDarkHours: 13, tempMeanC: -50, slopeDeg: 1, iceAvailability: 1, notes: [] }, file);
      equal(e.illustrative, true, t);
      deepEqual(e.illustrativeModules.map((m) => m.type), [t]);
    }
  });

  it('has sunlight, darkness and ice entries for every target in targets.json', () => {
    if (!file || !targets) return skip('needs modules.json and targets.json');
    deepEqual(Object.keys(file.sites).sort(), targets.map((t) => t.id).sort());
    for (const t of targets) {
      const site = siteFromTarget(t, file);
      equal(site.body, t.body);
      ok(site.irradianceWm2 !== null && site.irradianceWm2 > 0, `${t.id}: sunlight`);
      if (t.body === 'mars') ok(typeof site.dustStormSolarFactor === 'number' && site.dustStormSolarFactor > 0 && site.dustStormSolarFactor < 1, `${t.id}: dust storm factor`);
    }
  });
});

describe('The engine on the real data', () => {
  const layout = layoutOf({ habitat: 1, solar: 12, battery: 12, iceMiner: 1, landingPad: 1 });

  it('evaluates, simulates and compares every target without throwing', () => {
    if (!file || !targets) return skip('needs modules.json and targets.json');
    const earth = siteFromEarthCell({ lat: -24.25, lon: -69.75, tempMean: 12, slope: 3 }, file, { name: 'Test cell' });
    for (const t of targets) {
      const site = siteFromTarget(t, file);
      const e = evaluate(layout, site, file);
      ok(e.readiness === null || ['GREEN', 'AMBER', 'RED'].includes(e.readiness), t.id);
      const sim = simulate(layout, site, file, { resupplyEveryDays: 10, events: [{ type: t.body === 'moon' ? 'lunarNight' : 'marsDustStorm', startDay: 5 }] });
      ok(sim.days.length === 0 || sim.days.length === 30, t.id);
      const report = deployTwice(layout, earth, site, file);
      ok(report.lines.length >= 4, t.id);
      // The report always ends with the target's own "what Earth cannot copy" sentences.
      deepEqual(report.lines.slice(-t.cannotCopy.length), t.cannotCopy, t.id);
      ok(report.lines.join(' ').toLowerCase().includes('gravity'), t.id);
    }
  });

  it('never reports a number for a quantity whose inputs have no source', () => {
    if (!file || !targets) return skip('needs modules.json and targets.json');
    for (const t of targets) {
      const site = siteFromTarget(t, file);
      const e = evaluate(layout, site, file);
      if (site.litFraction === null) equal(e.power.productionKw, null, `${t.id}: no lit fraction, so no solar figure`);
      if (site.iceAvailability === null) equal(e.water.producedKgDay, null, `${t.id}: no ice figure, so no water figure`);
      if (missingParams(file, 'landingPad').includes('massKg')) equal(e.deliveredMassKg, null, t.id);
    }
  });
});

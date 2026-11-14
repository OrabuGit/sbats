// Checks the real files in /data against data/SCHEMA.md. A check is skipped, with a visible note,
// when the file it needs does not exist yet.

import { describe, it } from 'node:test';
import { deepEqual, equal, ok } from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateLithologyTable } from '../lithology';
import { PRESETS } from '../presets';
import { computeEarthRanges, prepareTarget, scoreCell, scoreCells } from '../score';
import { FACTOR_KEYS } from '../types';
import type { EarthCell, LithologyClass, LithologyTable, Target } from '../types';

const DATA = fileURLToPath(new URL('../../../../../data/', import.meta.url));

function load<T>(name: string): T | null {
  const path = `${DATA}${name}`;
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : null;
}

interface EarthFile {
  meta: { factors: { key: string; unit: string; classes?: LithologyClass[] }[] };
  cells: EarthCell[];
}
interface Analog {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: string;
  analogFor: string[];
  source: string;
}

const targets = load<Target[]>('targets.json');
const analogs = load<Analog[]>('analogs.json');
const table = load<LithologyTable>('lithology_similarity.json');
const earth = load<EarthFile>('earth.json');
const legend = earth?.meta.factors.find((f) => f.key === 'lithology')?.classes ?? [];

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const BADGES = ['Measured', 'Mission', 'Literature'];
const skip = (what: string): void => console.log(`    (skipped: ${what})`);

describe('data/targets.json', () => {
  it('lists the seven DESIGN.md sites with unique kebab-case ids', () => {
    if (!targets) return skip('targets.json does not exist yet');
    const ids = targets.map((t) => t.id);
    equal(new Set(ids).size, ids.length);
    for (const id of ids) ok(KEBAB.test(id), id);
    deepEqual(
      [...ids].sort(),
      [
        'mars-arcadia-planitia',
        'mars-gale',
        'mars-jezero',
        'moon-haworth',
        'moon-malapert-massif',
        'moon-mons-mouton',
        'moon-shackleton-rim',
      ],
    );
  });

  it('follows the contract for every target and every factor key', () => {
    if (!targets) return skip('targets.json does not exist yet');
    for (const t of targets) {
      ok(t.body === 'moon' || t.body === 'mars', t.id);
      ok(t.id.startsWith(`${t.body}-`), t.id);
      ok(t.lat >= -90 && t.lat <= 90 && t.lon >= -180 && t.lon <= 180, `${t.id} coordinates`);
      ok(t.name.length > 0 && t.summary.length > 0, `${t.id} name and summary`);
      deepEqual(Object.keys(t.values).sort(), [...FACTOR_KEYS].sort(), `${t.id} must have all seven keys`);
      for (const key of FACTOR_KEYS) {
        const v = t.values[key];
        const where = `${t.id}.${key}`;
        if (v.value === null) {
          equal(v.sigma, null, `${where}: sigma must be null when value is null`);
          equal(v.source, null, `${where}: source must be null when value is null`);
          equal(v.badge, null, `${where}: badge must be null when value is null`);
          continue;
        }
        ok(Number.isFinite(v.value), `${where}: value`);
        ok(typeof v.source === 'string' && v.source.length > 0, `${where}: source`);
        ok(v.badge !== null && BADGES.includes(v.badge), `${where}: badge`);
        if (key === 'lithology') {
          equal(v.sigma, null, `${where}: lithology has no sigma`);
          ok(Number.isInteger(v.value), `${where}: class code must be an integer`);
        } else {
          ok(typeof v.sigma === 'number' && v.sigma > 0, `${where}: sigma must be greater than 0`);
        }
      }
    }
  });

  it('uses 0 precipitation for every Moon and Mars target', () => {
    if (!targets) return skip('targets.json does not exist yet');
    for (const t of targets) equal(t.values.precip.value, 0, t.id);
  });

  it('states gravity, atmosphere and radiation under cannotCopy for every target', () => {
    if (!targets) return skip('targets.json does not exist yet');
    for (const t of targets) {
      const text = t.cannotCopy.join(' ').toLowerCase();
      ok(text.includes('gravity'), `${t.id}: gravity`);
      ok(text.includes('vacuum') || text.includes('atmosphere'), `${t.id}: vacuum or thin atmosphere`);
      ok(text.includes('radiation'), `${t.id}: radiation`);
    }
  });

  it('uses only rock class codes from the earth.json legend', () => {
    if (!targets) return skip('targets.json does not exist yet');
    const coded = targets.filter((t) => t.values.lithology.value !== null);
    if (coded.length === 0) return skip('no target has a lithology code yet');
    ok(legend.length > 0, 'targets have lithology codes but earth.json has no class legend');
    const codes = new Set(legend.map((c) => c.code));
    for (const t of coded) ok(codes.has(t.values.lithology.value as number), `${t.id}: unknown rock class code`);
  });
});

describe('data/analogs.json', () => {
  it('follows the contract', () => {
    if (!analogs) return skip('analogs.json does not exist yet');
    const ids = analogs.map((a) => a.id);
    equal(new Set(ids).size, ids.length);
    const targetIds = new Set((targets ?? []).map((t) => t.id));
    for (const a of analogs) {
      ok(KEBAB.test(a.id), a.id);
      ok(['known', 'negative', 'candidate'].includes(a.kind), `${a.id} kind`);
      ok(a.lat >= -90 && a.lat <= 90 && a.lon >= -180 && a.lon <= 180, `${a.id} coordinates`);
      ok(a.name.length > 0 && a.source.length > 0, `${a.id} name and source`);
      if (a.kind === 'negative') deepEqual(a.analogFor, [], `${a.id}: negative controls have no targets`);
      // A candidate may be a feature analog (a lava tube, say) that matches none of the listed targets.
      if (a.kind === 'known') ok(a.analogFor.length > 0, `${a.id}: needs at least one target`);
      if (targets) for (const id of a.analogFor) ok(targetIds.has(id), `${a.id}: unknown target ${id}`);
    }
  });

  it('has 25 to 30 known sites, the six negative controls and the Indonesian candidates', () => {
    if (!analogs) return skip('analogs.json does not exist yet');
    const known = analogs.filter((a) => a.kind === 'known').length;
    ok(known >= 25 && known <= 30, `known sites: ${known}`);
    equal(analogs.filter((a) => a.kind === 'negative').length, 6);
    const candidates = analogs.filter((a) => a.kind === 'candidate').map((a) => a.id);
    ok(candidates.includes('id-kawah-ijen') && candidates.includes('id-merapi'), candidates.join(', '));
  });
});

describe('data/lithology_similarity.json', () => {
  it('lists every pair of classes in the earth.json legend, with a justification each', () => {
    if (!table) return skip('lithology_similarity.json does not exist yet');
    if (legend.length === 0) return skip('earth.json has no lithology class legend yet');
    deepEqual(validateLithologyTable(table, legend), []);
  });

  it('uses the approved levels 1.0, 0.6 and 0.15', () => {
    if (!table) return skip('lithology_similarity.json does not exist yet');
    deepEqual(table.levels, { same: 1.0, related: 0.6, unrelated: 0.15 });
  });
});

describe('Real data, end to end', () => {
  it('prepares and scores every target against earth.json without throwing', () => {
    if (!targets || !earth) return skip('needs targets.json and earth.json');
    const ranges = computeEarthRanges(earth.cells);
    const usableTable = table && legend.length > 0 && validateLithologyTable(table, legend).length === 0 ? table : null;
    for (const t of targets) {
      const prepared = prepareTarget(t, ranges, usableTable);
      deepEqual(prepared.warnings.filter((w) => !w.includes('no lithology similarity table')), [], t.id);
      const summaries = scoreCells(earth.cells, prepared, PRESETS.base.weights);
      equal(summaries.length, earth.cells.length);
      for (const s of summaries) {
        ok(s.score === null || (s.score >= 0 && s.score <= 100));
        ok(s.coverage >= 0 && s.coverage <= 1);
      }
      const first = earth.cells[0];
      ok(first);
      ok(scoreCell(first, prepared, PRESETS.base.weights).reason.length > 0);
    }
  });
});

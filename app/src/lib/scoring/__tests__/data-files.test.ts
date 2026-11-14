// Checks the real files in /data against data/SCHEMA.md. A check is skipped, with a visible note,
// when the file it needs does not exist yet.

import { describe, it } from 'node:test';
import { deepEqual, equal, ok } from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateLithologyTable } from '../lithology';
import { PRESET_IDS, PRESETS } from '../presets';
import { PURPOSE_IDS } from '../profile';
import { SUN_ELEVATION_SIGMA_DEG } from '../sunlight';
import { computeEarthRanges, prepareTarget, scoreCell, scoreCells } from '../score';
import { FACTOR_KEYS } from '../types';
import type { EarthCell, LithologyClass, LithologyTable, Target, Weights } from '../types';

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
  usedFor?: string[];
  usedForPrimary?: string;
  usedForSource?: Record<string, string>;
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

interface FrozenFile {
  frozenAt: string;
  after: { tempMeanSigma: number; tempRangeSigma: number; precipSigma: number; ndviSigma: number; terrainFraction: number; sunSigma: number };
  presets: Record<string, Weights>;
}
const frozenPath = fileURLToPath(new URL('../../../../../validation/tuning/frozen.json', import.meta.url));
const frozen = existsSync(frozenPath) ? (JSON.parse(readFileSync(frozenPath, 'utf8')) as FrozenFile) : null;

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

describe('What each known analog is used for', () => {
  it('labels every known site with at least one use, a primary use, and a source for each', () => {
    if (!analogs) return skip('analogs.json does not exist yet');
    const purposes: readonly string[] = PURPOSE_IDS;
    for (const a of analogs.filter((x) => x.kind === 'known')) {
      ok(Array.isArray(a.usedFor) && a.usedFor.length > 0, `${a.id}: usedFor`);
      equal(new Set(a.usedFor).size, a.usedFor.length, `${a.id}: repeated use`);
      for (const use of a.usedFor) {
        ok(purposes.includes(use), `${a.id}: unknown use "${use}"`);
        ok((a.usedForSource?.[use] ?? '').length > 20, `${a.id}: no source for "${use}"`);
      }
      deepEqual(Object.keys(a.usedForSource ?? {}).sort(), [...a.usedFor].sort(), `${a.id}: sources and uses differ`);
      ok(a.usedForPrimary !== undefined && a.usedFor.includes(a.usedForPrimary), `${a.id}: primary use must be one of its uses`);
    }
  });

  it('labels no negative control and no candidate: candidates took no part in this view', () => {
    if (!analogs) return skip('analogs.json does not exist yet');
    for (const a of analogs.filter((x) => x.kind !== 'known')) {
      equal(a.usedFor, undefined, a.id);
      equal(a.usedForSource, undefined, a.id);
    }
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

describe('Antarctica in the real data', () => {
  it('scores the cells south of 60 S from land cover, and gives all-ice cells 0', () => {
    if (!targets || !earth) return skip('needs targets.json and earth.json');
    const south = earth.cells.filter((c) => c.lat < -60);
    if (south.length === 0 || !south.some((c) => typeof c.barrenFrac === 'number')) return skip('earth.json has no land cover shares south of 60 S yet');
    const target = targets.find((t) => t.id === 'moon-shackleton-rim');
    ok(target);
    const prepared = prepareTarget(target, computeEarthRanges(earth.cells), null);
    const results = scoreCells(south, prepared, PRESETS.base.weights);
    const scored = results.filter((r) => r.score !== null);
    ok(scored.length / south.length > 0.95, `only ${scored.length} of ${south.length} Antarctic cells are scored`);
    ok(scored.every((r) => r.bareGroundSource === 'landCover'));
    ok(scored.some((r) => (r.score ?? 0) > 0), 'no ice-free Antarctic cell scores above 0');
    south.forEach((cell, i) => {
      const r = results[i];
      ok(r);
      if (cell.barrenFrac === 0 && r.score !== null) equal(r.score, 0, `all-ice cell ${cell.lat}, ${cell.lon}`);
    });
  });
});

describe('Sigmas and weights against the frozen tuning result', () => {
  const DESIGN_BASE = { terrain: 0.25, bareGround: 0.2, dryness: 0.15, temperature: 0.15, sunlight: 0.1, rockType: 0.15 };

  it('uses the Base weights of the DESIGN.md table until a tuning pass is frozen', () => {
    if (frozen) return skip(`tuning was frozen on ${frozen.frozenAt}; the next checks apply instead`);
    deepEqual(PRESETS.base.weights, DESIGN_BASE);
    equal(SUN_ELEVATION_SIGMA_DEG, 15);
  });

  it('uses exactly the frozen preset weights and Sunlight tolerance', () => {
    if (!frozen) return skip('validation/tuning/frozen.json does not exist yet');
    for (const id of PRESET_IDS) deepEqual(PRESETS[id].weights, frozen.presets[id], `preset ${id} differs from frozen.json`);
    equal(SUN_ELEVATION_SIGMA_DEG, frozen.after.sunSigma);
  });

  it('uses exactly the frozen tolerances in targets.json', () => {
    if (!frozen) return skip('validation/tuning/frozen.json does not exist yet');
    if (!targets) return skip('targets.json does not exist yet');
    const f = frozen.after;
    for (const t of targets) {
      const v = t.values;
      if (v.tempMean.value !== null) equal(v.tempMean.sigma, f.tempMeanSigma, `${t.id} tempMean`);
      if (v.tempRange.value !== null) equal(v.tempRange.sigma, f.tempRangeSigma, `${t.id} tempRange`);
      if (v.precip.value !== null) equal(v.precip.sigma, f.precipSigma, `${t.id} precip`);
      if (v.ndvi.value !== null) equal(v.ndvi.sigma, f.ndviSigma, `${t.id} ndvi`);
      if (v.slope.value !== null) ok(Math.abs((v.slope.sigma ?? 0) - Math.max(1, f.terrainFraction * v.slope.value)) <= 0.006, `${t.id} slope`);
      if (v.roughness.value !== null) ok(Math.abs((v.roughness.sigma ?? 0) - Math.max(50, f.terrainFraction * v.roughness.value)) <= 0.06, `${t.id} roughness`);
    }
  });
});

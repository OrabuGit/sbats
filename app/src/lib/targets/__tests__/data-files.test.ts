// Checks the any-point target profile against the real Moon and Mars grids (Session B) and the real
// targets. Each block is skipped, with a visible note, while its file does not exist.

import { equal, ok } from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PRESETS, computeEarthRanges, prepareTarget, scoreCells } from '../../scoring/index';
import type { EarthCell, LithologyClass, LithologyTable, Target } from '../../scoring/index';
import { nearestGridCell, targetFromKnownSite, targetFromPoint } from '../index';
import type { BodyGrid, KnownSitesFile } from '../index';

const DATA = fileURLToPath(new URL('../../../../../data/', import.meta.url));
const load = <T>(name: string): T | null => (existsSync(`${DATA}${name}`) ? (JSON.parse(readFileSync(`${DATA}${name}`, 'utf8')) as T) : null);
const skip = (what: string): void => console.log(`    (skipped: ${what})`);

const targets = load<Target[]>('targets.json');
const known = load<KnownSitesFile>('known_sites.json');
const table = load<LithologyTable>('lithology_similarity.json');
const earth = load<{ meta: { factors: { key: string; classes?: LithologyClass[] }[] }; cells: EarthCell[] }>('earth.json');
const rockClasses = (earth?.meta.factors.find((f) => f.key === 'lithology')?.classes ?? []).map((c) => c.code);

for (const body of ['moon', 'mars'] as const) {
  const grid = load<BodyGrid>(`${body}.json`);
  describe(`data/${body}.json as a source of targets`, () => {
    it('has the shape the profile function reads, with a source for every key', () => {
      if (!grid) return skip(`${body}.json does not exist yet`);
      equal(grid.meta.body, body);
      ok(grid.meta.resolutionDeg > 0 && grid.cells.length > 1000);
      for (const key of ['slope', 'roughness', 'tempMean', 'tempRange', 'lithology']) {
        const f = grid.meta.factors.find((x) => x.key === key);
        ok(f && f.source.length > 10, `${key} needs a source in meta.factors`);
      }
      for (const c of [grid.cells[0], grid.cells[grid.cells.length - 1]]) ok(c && c.lat >= -90 && c.lat <= 90 && c.lon >= -180 && c.lon <= 180);
    });

    it('uses only rock classes the rock table knows', () => {
      if (!grid) return skip(`${body}.json does not exist yet`);
      if (rockClasses.length === 0) return skip('earth.json has no rock class legend');
      const seen = new Set<number>();
      for (const c of grid.cells) if (typeof c.lithology === 'number') seen.add(c.lithology);
      for (const code of seen) ok(rockClasses.includes(code), `rock class ${code} is not in the earth.json legend`);
    });

    it('finds a cell for every point, the poles and the date line included', () => {
      if (!grid) return skip(`${body}.json does not exist yet`);
      for (const [lat, lon] of [[90, 0], [-90, 0], [0, 180], [0, -180], [0, 179.99], [45.3, -120.7], [-89.67, 129.78]] as const) {
        ok(nearestGridCell(grid, lat, lon), `no cell at ${lat}, ${lon}`);
      }
    });

    it('agrees with the curated targets where both have a value', () => {
      if (!grid || !targets) return skip(`needs ${body}.json and targets.json`);
      for (const t of targets.filter((x) => x.body === body)) {
        const hit = nearestGridCell(grid, t.lat, t.lon);
        ok(hit, t.id);
        if (!hit) continue;
        for (const key of ['slope', 'roughness'] as const) {
          const curated = t.values[key];
          const cell = hit.cell[key];
          if (curated.value === null || curated.sigma === null || typeof cell !== 'number') continue;
          // Same instrument and method, a window centred a few tens of km away: within two tolerances.
          ok(Math.abs(cell - curated.value) <= 2 * curated.sigma, `${t.id} ${key}: grid ${cell} against curated ${curated.value} (tolerance ${curated.sigma})`);
        }
      }
    });

    it('gives a usable, lower-confidence profile for the named places that have no curated target', () => {
      if (!grid || !targets || !known) return skip(`needs ${body}.json, targets.json and known_sites.json`);
      let fromGrid = 0;
      for (const s of known.sites.filter((x) => x.body === body)) {
        const p = targetFromKnownSite(s, { grid, curated: targets, rockClasses });
        if (s.targetId) {
          equal(p.origin, 'curated', s.id);
          continue;
        }
        equal(p.origin, 'grid', s.id);
        ok(p.confidence !== 'high', `${s.id}: a grid profile is never high confidence`);
        ok(p.cell !== null && p.notes.length > 0);
        for (const key of ['slope', 'roughness'] as const) ok(p.target.values[key].value !== null && (p.target.values[key].sigma ?? 0) > 0, `${s.id} ${key}`);
        equal(p.target.values.precip.value, 0);
        fromGrid += 1;
      }
      ok(fromGrid > 5);
    });

    it('scores the Earth against a point picked on the map', () => {
      if (!grid || !targets || !earth || !table) return skip(`needs ${body}.json, targets.json, earth.json and the rock table`);
      const [lat, lon] = body === 'moon' ? [26.13, 3.63] : [22.27, -47.95]; // Apollo 15, Viking 1
      const p = targetFromPoint(body, lat, lon, { grid, curated: targets, rockClasses });
      equal(p.origin, 'grid');
      const results = scoreCells(earth.cells, prepareTarget(p.target, computeEarthRanges(earth.cells), table), PRESETS.base.weights);
      const scored = results.filter((r) => r.score !== null);
      ok(scored.length > 10000, `only ${scored.length} cells scored`);
      ok(Math.max(...scored.map((r) => r.score as number)) > 20);
    });

    it('carries wind, dust and ice for a point where the grid has them', () => {
      if (!grid || !targets) return skip(`needs ${body}.json and targets.json`);
      const p = body === 'moon'
        ? targetFromPoint('moon', -87, 40, { grid, curated: targets, rockClasses })
        : targetFromPoint('mars', 22.27, -47.95, { grid, curated: targets, rockClasses });
      equal(p.origin, 'grid');
      ok(p.environment.wind && p.environment.wind.value !== null, 'wind');
      if (body === 'moon') {
        equal(p.environment.wind?.value, 0);
        equal(p.environment.dust?.value, 0);
        ok(p.environment.ice && p.environment.ice.value !== null && p.environment.ice.value >= 0 && p.environment.ice.value <= 1, 'shadow share near the pole');
      } else {
        ok((p.environment.wind?.value ?? 0) > 0);
        ok(p.environment.dust && (p.environment.dust.value ?? 0) > 0, 'dust');
      }
    });
  });
}

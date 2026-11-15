// Unit tests for the any-point target profile. Run: npx tsx --test app/src/lib/targets/__tests__/*.test.ts

import { deepEqual, equal, ok, throws } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PRESETS, computeEarthRanges, prepareTarget, scoreCell } from '../../scoring/index';
import type { EarthCell, Target, TargetValue } from '../../scoring/index';
import {
  CURATED_RADIUS_KM,
  distanceKm,
  formatPoint,
  gridEnvironment,
  kmPerDegree,
  nearestGridCell,
  nearestKnownSite,
  NO_TEMPERATURE_WARNING,
  normaliseLon,
  scoresComparable,
  sharedCannotCopy,
  targetCoverage,
  targetFromKnownSite,
  targetFromPoint,
  tolerancesFrom,
} from '../index';
import type { BodyGrid, KnownSite } from '../index';

const val = (value: number | null, sigma: number | null, source = 'test source'): TargetValue =>
  value === null ? { value: null, sigma: null, source: null, badge: null } : { value, sigma, source, badge: 'Mission' };

function curatedTarget(id: string, body: 'moon' | 'mars', lat: number, lon: number, over: Partial<Target['values']> = {}, cannot: string[] = []): Target {
  return {
    id,
    name: id,
    body,
    lat,
    lon,
    summary: 'fixture',
    values: {
      tempMean: val(-60, 15),
      tempRange: val(50, 5),
      precip: val(0, 250, 'no rain'),
      ndvi: val(0.05, 0.1, 'bare reference'),
      slope: val(6, 3),
      roughness: val(300, 150),
      lithology: { value: 2, sigma: null, source: 'paper', badge: 'Literature' },
      ...over,
    },
    cannotCopy: ['Gravity: one third.', 'Thin atmosphere.', 'Radiation.', ...cannot],
  };
}

const CURATED: Target[] = [
  curatedTarget('mars-a', 'mars', 18.44, 77.45, {}, ['Only at A.']),
  curatedTarget('mars-b', 'mars', -4.6, 137.4, { slope: val(0.4, 1), roughness: val(20, 50) }),
  curatedTarget('moon-a', 'moon', -89.67, 129.78, { tempRange: val(null, null) }),
];

function grid(body: 'moon' | 'mars', cells: BodyGrid['cells'], keys = ['tempMean', 'tempRange', 'slope', 'roughness', 'lithology']): BodyGrid {
  return {
    meta: { body, resolutionDeg: 0.5, factors: keys.map((key) => ({ key, source: `grid ${key} product`, badge: key === 'tempMean' ? 'Literature' : undefined })) },
    cells,
  };
}

const MARS_GRID = grid('mars', [
  { lat: 40.25, lon: -157.75, tempMean: -74, tempRange: 53, slope: 0.3, roughness: 17, lithology: 2 },
  { lat: 40.25, lon: -157.25, tempMean: -73, tempRange: 52, slope: 4, roughness: 400, lithology: null },
  { lat: 18.25, lon: 77.25, tempMean: -56, tempRange: 49, slope: 2.6, roughness: 287, lithology: 2 },
]);

describe('Distances on the Moon and Mars', () => {
  it('uses the radius of the body', () => {
    ok(Math.abs(kmPerDegree('moon') - 30.32) < 0.01);
    ok(Math.abs(kmPerDegree('mars') - 59.16) < 0.01);
    ok(Math.abs(distanceKm('moon', 0, 0, 1, 0) - kmPerDegree('moon')) < 1e-9);
    ok(Math.abs(distanceKm('mars', 0, 0, 0, 180) - Math.PI * 3389.5) < 1e-6);
  });

  it('folds longitude into -180 to 180 and prints a point', () => {
    equal(normaliseLon(303.23), -56.76999999999998);
    equal(normaliseLon(-190), 170);
    equal(normaliseLon(180), 180);
    equal(normaliseLon(540), 180);
    equal(formatPoint(14.091, 303.23), '14.09 N, 56.77 W');
    equal(formatPoint(-4.6, 137.4), '4.60 S, 137.40 E');
  });
});

describe('Frozen tolerances read from the curated targets', () => {
  it('returns the shared tolerances and the terrain fraction', () => {
    deepEqual(tolerancesFrom(CURATED), { tempMean: 15, tempRange: 5, terrainFraction: 0.5 });
  });

  it('ignores terrain values that sit on the floor', () => {
    // mars-b has slope sigma 1 and roughness sigma 50: both floors, so they say nothing about the fraction.
    deepEqual(tolerancesFrom([CURATED[1] as Target, CURATED[0] as Target]).terrainFraction, 0.5);
  });

  it('refuses curated targets that disagree', () => {
    const odd = curatedTarget('mars-odd', 'mars', 0, 0, { tempMean: val(-60, 20) });
    throws(() => tolerancesFrom([...CURATED, odd]), /tempMean/);
  });
});

describe('targetFromPoint: curated targets are preferred', () => {
  it('returns the curated target unchanged for a point inside its window', () => {
    const p = targetFromPoint('mars', 18.6, 77.5, { grid: MARS_GRID, curated: CURATED });
    equal(p.origin, 'curated');
    equal(p.target, CURATED[0]);
    equal(p.confidence, 'high');
    deepEqual(p.missing, []);
    equal(p.cell, null);
    equal(p.curated?.id, 'mars-a');
    ok((p.curated?.distanceKm ?? 99) < CURATED_RADIUS_KM);
  });

  it('gives a curated target with a missing value the confidence of its own coverage', () => {
    const p = targetFromPoint('moon', -89.67, 129.78, { grid: null, curated: CURATED });
    equal(p.origin, 'curated');
    deepEqual(p.missing, ['tempRange']);
    equal(p.coverage, 0.925);
    equal(p.confidence, 'medium');
  });

  it('does not use a curated target of the other body at the same coordinates', () => {
    const p = targetFromPoint('moon', 18.44, 77.45, { grid: null, curated: CURATED });
    equal(p.origin, 'none');
  });

  it('falls back to the grid just outside the window', () => {
    // 0.5 degrees of latitude on Mars is 29.6 km: outside the 27.8 km window of mars-a.
    const p = targetFromPoint('mars', 18.44 - 0.5, 77.45, { grid: MARS_GRID, curated: CURATED });
    equal(p.origin, 'grid');
  });
});

describe('targetFromPoint: built from the global grid', () => {
  const p = targetFromPoint('mars', 40.2, 202.3, { grid: MARS_GRID, curated: CURATED });

  it('takes the values of the cell that holds the point', () => {
    equal(p.origin, 'grid');
    deepEqual(p.cell && { lat: p.cell.lat, lon: p.cell.lon }, { lat: 40.25, lon: -157.75 });
    equal(p.target.values.tempMean.value, -74);
    equal(p.target.values.roughness.value, 17);
    equal(p.target.values.lithology.value, 2);
    equal(p.target.lon, normaliseLon(202.3));
    equal(p.target.body, 'mars');
  });

  it('sets tolerances by the frozen rules, including the floors', () => {
    equal(p.target.values.tempMean.sigma, 15);
    equal(p.target.values.tempRange.sigma, 5);
    equal(p.target.values.slope.sigma, 1); // half of 0.3 is below the 1 degree floor
    equal(p.target.values.roughness.sigma, 50); // half of 17 m is below the 50 m floor
    equal(p.target.values.lithology.sigma, null);
    const steep = targetFromPoint('mars', 40.25, -157.25, { grid: MARS_GRID, curated: CURATED });
    equal(steep.target.values.slope.sigma, 2);
    equal(steep.target.values.roughness.sigma, 200);
  });

  it('carries the grid source and badge on every value, and the shared values from a curated target', () => {
    ok(p.target.values.slope.source?.startsWith('grid slope product (0.5 degree grid cell centred 40.25 N, 157.75 W)'));
    equal(p.target.values.slope.badge, 'Mission');
    equal(p.target.values.tempMean.badge, 'Literature');
    equal(p.target.values.precip, CURATED[0]?.values.precip);
    equal(p.target.values.ndvi, CURATED[0]?.values.ndvi);
  });

  it('lowers confidence by one level: a complete grid profile is medium', () => {
    deepEqual(p.missing, []);
    equal(p.coverage, 1);
    equal(p.confidence, 'medium');
  });

  it('lists a missing factor and drops to low', () => {
    const q = targetFromPoint('mars', 40.25, -157.25, { grid: MARS_GRID, curated: CURATED });
    deepEqual(q.missing, ['lithology']);
    equal(q.coverage, 0.85);
    equal(q.confidence, 'low');
    ok(q.notes.some((n) => n.includes('lithology')));
  });

  it('does not use a grid value whose factor has no stated source', () => {
    const g = grid('mars', MARS_GRID.cells, ['tempMean', 'slope', 'roughness']);
    const q = targetFromPoint('mars', 40.2, 202.3, { grid: g, curated: CURATED });
    deepEqual(q.missing, ['tempRange', 'lithology']);
    equal(q.target.values.lithology.source, null);
  });

  it('keeps only the sentences every curated target of the body shares under cannotCopy', () => {
    deepEqual(p.target.cannotCopy, ['Gravity: one third.', 'Thin atmosphere.', 'Radiation.']);
    deepEqual(sharedCannotCopy(CURATED, 'mars'), ['Gravity: one third.', 'Thin atmosphere.', 'Radiation.']);
  });

  it('gives a stable id and a name from the coordinates', () => {
    equal(p.target.id, 'mars-point-4020n-15770w');
    equal(p.target.name, 'Mars, 40.20 N, 157.70 W');
    equal(targetFromPoint('mars', 40.2, 202.3, { grid: MARS_GRID, curated: CURATED, name: 'My pick' }).target.name, 'My pick');
  });

  it('can be scored like any target', () => {
    const cells: EarthCell[] = [
      { lat: 70, lon: 0, tempMean: -20, tempRange: 10, precip: 100, ndvi: 0.05, slope: 0.4, roughness: 20, lithology: 2 },
      { lat: 0, lon: 0, tempMean: 26, tempRange: 8, precip: 2500, ndvi: 0.8, slope: 5, roughness: 300, lithology: 1 },
    ];
    const prepared = prepareTarget(p.target, computeEarthRanges(cells), null);
    const cold = scoreCell(cells[0] as EarthCell, prepared, PRESETS.base.weights);
    const jungle = scoreCell(cells[1] as EarthCell, prepared, PRESETS.base.weights);
    ok(cold.score !== null && jungle.score !== null && cold.score > jungle.score);
  });
});

describe('targetFromPoint: no grid, or no cell', () => {
  it('fills only the shared values, says so, and is low confidence', () => {
    const p = targetFromPoint('mars', 40.2, 202.3, { grid: null, curated: CURATED });
    equal(p.origin, 'none');
    equal(p.confidence, 'low');
    deepEqual(p.missing, ['tempMean', 'tempRange', 'slope', 'roughness', 'lithology']);
    equal(p.coverage, 0.45);
    ok(p.notes.some((n) => n.includes('No global grid of Mars')));
  });

  it('leads to "no data", never to a made-up score', () => {
    const p = targetFromPoint('mars', 40.2, 202.3, { grid: null, curated: CURATED });
    const cell: EarthCell = { lat: 70, lon: 0, tempMean: -20, tempRange: 10, precip: 100, ndvi: 0.05, slope: 0.4, roughness: 20, lithology: 2 };
    const r = scoreCell(cell, prepareTarget(p.target, computeEarthRanges([cell]), null), PRESETS.base.weights);
    equal(r.score, null);
    equal(r.unscoredReason, 'coverage-too-low');
  });

  it('ignores a grid of the other body and a point the grid does not cover', () => {
    equal(targetFromPoint('moon', 40.2, -157.7, { grid: MARS_GRID, curated: CURATED }).origin, 'none');
    const far = targetFromPoint('mars', -60, 10, { grid: MARS_GRID, curated: CURATED });
    equal(far.origin, 'none');
    ok(far.notes.some((n) => n.includes('no cell at this point')));
    equal(nearestGridCell(MARS_GRID, -60, 10), null);
  });

  it('does not say "grid values" when there are none', () => {
    const p = targetFromPoint('mars', 10, 20, { grid: null, curated: CURATED });
    ok(!p.target.summary.includes('grid values'), p.target.summary);
    ok(p.target.summary.includes('cannot be matched'));
    ok(targetFromPoint('mars', 40.2, 202.3, { grid: MARS_GRID, curated: CURATED }).target.summary.includes('grid values'));
  });

  it('leaves out a grid rock class the rock table does not list, instead of failing later', () => {
    const odd = grid('mars', [{ lat: 40.25, lon: -157.75, tempMean: -74, tempRange: 53, slope: 0.3, roughness: 17, lithology: 99 }]);
    const p = targetFromPoint('mars', 40.2, 202.3, { grid: odd, curated: CURATED, rockClasses: [1, 2, 3, 10] });
    equal(p.target.values.lithology.value, null);
    deepEqual(p.missing, ['lithology']);
    ok(p.notes.some((n) => n.includes('rock class code 99')));
    // A listed class is kept.
    equal(targetFromPoint('mars', 40.2, 202.3, { grid: MARS_GRID, curated: CURATED, rockClasses: [1, 2, 3, 10] }).target.values.lithology.value, 2);
  });

  it('rejects coordinates that are not a place', () => {
    throws(() => targetFromPoint('mars', 91, 0, { grid: null, curated: CURATED }), RangeError);
    throws(() => targetFromPoint('mars', Number.NaN, 0, { grid: null, curated: CURATED }), RangeError);
  });
});

describe('Named places', () => {
  const site = (id: string, body: 'moon' | 'mars', lat: number, lon: number, targetId: string | null = null): KnownSite => ({
    id, name: `Site ${id}`, body, lat, lon, kind: 'landing-site', mission: 'Test 1', agency: 'NASA', date: '2000-01-01', status: 'rover', source: 'fixture', url: 'https://example.org', access: 'primary', targetId,
  });
  const SITES = [site('viking', 'mars', 40.3, -157.6), site('linked', 'mars', 18.44, 77.45, 'mars-a'), site('apollo', 'moon', 0.67, 23.47)];

  it('finds the nearest named place of the same body inside the radius', () => {
    equal(nearestKnownSite(SITES, 'mars', 40.2, -157.7)?.site.id, 'viking');
    equal(nearestKnownSite(SITES, 'moon', 40.2, -157.7), null);
    equal(nearestKnownSite(SITES, 'mars', 45, -157.7), null);
  });

  it('names a grid profile after the named place nearby and cites it', () => {
    const p = targetFromPoint('mars', 40.2, 202.3, { grid: MARS_GRID, curated: CURATED, knownSites: SITES });
    equal(p.target.name, 'Site viking');
    equal(p.knownSite?.site.id, 'viking');
    ok(p.target.summary.includes('grid values'));
    ok(p.notes.some((n) => n.includes('Nearest named place: Site viking')));
  });

  it('returns the linked curated target for a named place, and the grid for an unlinked one', () => {
    const linked = targetFromKnownSite(SITES[1] as KnownSite, { grid: MARS_GRID, curated: CURATED });
    equal(linked.origin, 'curated');
    equal(linked.target.id, 'mars-a');
    const unlinked = targetFromKnownSite(SITES[0] as KnownSite, { grid: MARS_GRID, curated: CURATED });
    equal(unlinked.origin, 'grid');
    equal(unlinked.target.name, 'Site viking');
    equal(targetFromKnownSite(SITES[2] as KnownSite, { grid: null, curated: CURATED }).origin, 'none');
  });
});

describe('A target with no temperature', () => {
  const g = grid('mars', [{ lat: 40.25, lon: -157.75, tempMean: null, tempRange: null, slope: 0.3, roughness: 17, lithology: 2 }]);
  const p = targetFromPoint('mars', 40.2, 202.3, { grid: g, curated: CURATED });

  it('is flagged: its scores cannot be set beside those of other targets', () => {
    equal(p.origin, 'grid');
    equal(p.scoresComparable, false);
    equal(p.confidence, 'low');
    ok(p.notes.includes(NO_TEMPERATURE_WARNING));
    deepEqual(p.missing, ['tempMean', 'tempRange']);
  });

  it('is not flagged when one temperature value is present, or for an ordinary target', () => {
    const half = grid('mars', [{ lat: 40.25, lon: -157.75, tempMean: -70, tempRange: null, slope: 0.3, roughness: 17, lithology: 2 }]);
    equal(targetFromPoint('mars', 40.2, 202.3, { grid: half, curated: CURATED }).scoresComparable, true);
    equal(targetFromPoint('mars', 40.2, 202.3, { grid: MARS_GRID, curated: CURATED }).scoresComparable, true);
    equal(targetFromPoint('mars', 18.44, 77.45, { grid: null, curated: CURATED }).scoresComparable, true);
    equal(scoresComparable(CURATED[2] as Target), true); // a polar target with a mean and no swing
  });

  it('really does score higher, which is why the warning exists', () => {
    const cell: EarthCell = { lat: 40, lon: 0, tempMean: 25, tempRange: 10, precip: 20, ndvi: 0.05, slope: 0.3, roughness: 17, lithology: 2 };
    const ranges = computeEarthRanges([cell, { ...cell, tempMean: -50, tempRange: 20, precip: 3000, ndvi: 0.8, slope: 20, roughness: 900 }]);
    const without = scoreCell(cell, prepareTarget(p.target, ranges, null), PRESETS.base.weights).score as number;
    const withTemp = scoreCell(cell, prepareTarget(targetFromPoint('mars', 40.2, 202.3, { grid: MARS_GRID, curated: CURATED }).target, ranges, null), PRESETS.base.weights).score as number;
    ok(without > withTemp + 20, `${without} against ${withTemp}`);
  });
});

describe('Wind, dust and ice from the grid cell', () => {
  const moon: BodyGrid = {
    meta: {
      body: 'moon', resolutionDeg: 2,
      factors: [
        { key: 'slope', source: 'LOLA', badge: 'Mission' },
        { key: 'psrFrac', source: 'LOLA shadow maps', badge: 'Mission' },
      ],
      notInFile: { windSpeed: 'No atmosphere, so no wind (0 m/s): a fact, not missing data.', dustOpticalDepth: 'No atmosphere, so no dust suspended in air (0): a fact, not missing data.', ndvi: 'No vegetation.' },
    },
    cells: [
      { lat: -89, lon: 129, slope: 9.8, psrFrac: 0.131 },
      { lat: 15, lon: -57, slope: 1.2, psrFrac: null },
    ],
  };
  const mars: BodyGrid = {
    meta: { body: 'mars', resolutionDeg: 1, factors: [
      { key: 'windSpeed', source: 'climate model', badge: 'Literature' },
      { key: 'dustOpticalDepth', source: 'climate model', badge: 'Literature' },
      { key: 'waterH2O', source: 'Odyssey GRS', badge: 'Mission' },
    ] },
    cells: [{ lat: 40.5, lon: -157.5, windSpeed: 4.2, dustOpticalDepth: 0.4, waterH2O: 7.5 }],
  };

  it('reads zero wind and dust as stated facts on an airless body, and shadow as the ice share', () => {
    const e = gridEnvironment(moon, moon.cells[0] as BodyGrid['cells'][number]);
    equal(e.wind?.value, 0);
    ok(e.wind?.source?.includes('No atmosphere, so no wind'));
    equal(e.dust?.value, 0);
    equal(e.ice?.value, 0.131);
    equal(e.ice?.badge, 'Mission');
    ok(e.ice?.source?.startsWith('LOLA shadow maps (2 degree grid cell centred 89.00 S, 129.00 E)'));
    ok(e.ice?.note?.includes('shadow, not ice'));
  });

  it('keeps a null shadow share null: not mapped is not zero', () => {
    const e = gridEnvironment(moon, moon.cells[1] as BodyGrid['cells'][number]);
    equal(e.ice?.value, null);
    equal(e.ice?.source, null);
  });

  it('reads Mars wind and dust from the cell, and quotes the water content without using it as a share', () => {
    const e = gridEnvironment(mars, mars.cells[0] as BodyGrid['cells'][number]);
    equal(e.wind?.value, 4.2);
    equal(e.wind?.unit, 'm/s');
    equal(e.dust?.value, 0.4);
    equal(e.ice?.value, null);
    ok(e.ice?.note?.includes('7.5 percent water by weight') && e.ice.note.includes('not compared'));
  });

  it('puts them on a grid profile and leaves a curated profile empty', () => {
    const p = targetFromPoint('mars', 40.4, -157.4, { grid: { ...mars, meta: { ...mars.meta, factors: [...mars.meta.factors, { key: 'slope', source: 'MOLA' }] }, cells: [{ ...mars.cells[0], slope: 0.3 }] as BodyGrid['cells'] }, curated: CURATED });
    equal(p.origin, 'grid');
    equal(p.environment.wind?.value, 4.2);
    deepEqual(targetFromPoint('mars', 18.44, 77.45, { grid: mars, curated: CURATED }).environment, {});
    deepEqual(targetFromPoint('mars', 0, 0, { grid: null, curated: CURATED }).environment, {});
  });
});

describe('targetCoverage', () => {
  it('counts half a factor for one of two keys, and always counts sunlight', () => {
    const t = curatedTarget('x', 'mars', 0, 0, { roughness: val(null, null), lithology: val(null, null) });
    const c = targetCoverage(t);
    equal(c.coverage, 0.725);
    deepEqual(c.missing, ['roughness', 'lithology']);
  });
});

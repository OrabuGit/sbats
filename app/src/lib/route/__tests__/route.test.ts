// Unit tests for the rover route logic. Run: npx tsx --test app/src/lib/route/__tests__/*.test.ts

import { deepEqual, equal, ok, throws } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { elevationAt, measureRoute, pointFromLatLon, pointFromMetres, terrainSlopeAt, tileFromFloat32 } from '../index';
import type { ElevationTile, SlopeLimit } from '../index';

/** A tile whose height is a function of column and row. */
function tile(size: number, pixelM: number, z: (col: number, row: number) => number): ElevationTile {
  const data = new Float32Array(size * size);
  for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) data[r * size + c] = z(c, r);
  return { size, pixelM, data };
}

const FLAT = tile(21, 30, () => 100);
/** Rises 10 m per pixel to the east: a 30 m pixel gives atan(10/30) = 18.43 degrees. */
const RAMP = tile(21, 30, (c) => 10 * c);
const RAMP_DEG = (Math.atan(10 / 30) * 180) / Math.PI;
const LIMIT: SlopeLimit = { rover: 'Test rover', limitDeg: 15, kind: 'operating rule', source: 'a fact sheet' };
const near = (a: number | null, b: number, tol = 0.01): boolean => a !== null && Math.abs(a - b) <= tol;

describe('Reading the tile', () => {
  it('interpolates between posts and returns null outside the tile', () => {
    equal(elevationAt(RAMP, 3, 5), 30);
    equal(elevationAt(RAMP, 3.5, 5.25), 35);
    equal(elevationAt(RAMP, 20, 20), 200);
    equal(elevationAt(RAMP, -0.1, 5), null);
    equal(elevationAt(RAMP, 20.1, 5), null);
  });

  it('returns null beside a gap, but reads a post exactly even next to one', () => {
    const holed = tile(5, 30, (c, r) => (c === 2 && r === 2 ? Number.NaN : 50));
    equal(elevationAt(holed, 1.5, 1.5), null);
    equal(elevationAt(holed, 1, 1), 50);
    equal(elevationAt(holed, 2, 2), null);
    equal(terrainSlopeAt(holed, 1, 2), null);
  });

  it('measures the slope of the ground whatever its direction', () => {
    ok(near(terrainSlopeAt(RAMP, 10, 10), RAMP_DEG));
    equal(terrainSlopeAt(FLAT, 10, 10), 0);
    const south = tile(21, 30, (_c, r) => 10 * r);
    ok(near(terrainSlopeAt(south, 10, 10), RAMP_DEG));
    equal(terrainSlopeAt(RAMP, 0, 10), null); // no neighbour to the west
  });

  it('converts metres and coordinates to tile points', () => {
    deepEqual(pointFromMetres(RAMP, 300, 150), { col: 10, row: 5 });
    const centre = pointFromLatLon(FLAT, -8, 118, 6371000, -8, 118);
    deepEqual(centre, { col: 10, row: 10 });
    // 0.001 degrees of latitude on Earth is 111.2 m: 3.7 pixels north, so the row falls.
    const north = pointFromLatLon(FLAT, -8, 118, 6371000, -7.999, 118);
    ok(near(north.row, 10 - 111.19 / 30, 0.01) && near(north.col, 10, 1e-6));
    const east = pointFromLatLon(FLAT, 0, 0, 1737400, 0, 0.01);
    ok(east.col > 10 && near(east.row, 10, 1e-6));
  });

  it('reads a raw little-endian float32 file', () => {
    const buf = new ArrayBuffer(16);
    const view = new DataView(buf);
    [1, 2, 3, 4].forEach((v, i) => view.setFloat32(i * 4, v, true));
    const t = tileFromFloat32(buf, 2, 30);
    deepEqual(Array.from(t.data), [1, 2, 3, 4]);
    throws(() => tileFromFloat32(buf, 3, 30), RangeError);
  });
});

describe('measureRoute on flat ground', () => {
  const r = measureRoute(FLAT, [{ col: 2, row: 2 }, { col: 12, row: 2 }], { limit: LIMIT });

  it('gives the distance, a level profile and nothing above the limit', () => {
    equal(r.distanceM, 300);
    equal(r.surfaceDistanceM, 300);
    equal(r.samples.length, 11);
    equal(r.ascentM, 0);
    equal(r.descentM, 0);
    equal(r.maxUphillDeg, 0);
    equal(r.meanAlongSlopeDeg, 0);
    equal(r.shareAboveLimit, 0);
    equal(r.minElevationM, 100);
    equal(r.maxElevationM, 100);
    equal(r.samples[0]?.alongSlopeDeg, null);
    equal(r.samples[10]?.distanceM, 300);
  });
});

describe('measureRoute on a slope', () => {
  it('measures a straight climb', () => {
    const r = measureRoute(RAMP, [{ col: 2, row: 10 }, { col: 12, row: 10 }], { limit: LIMIT });
    equal(r.distanceM, 300);
    equal(r.ascentM, 100);
    equal(r.descentM, 0);
    ok(near(r.maxUphillDeg, RAMP_DEG));
    equal(r.maxDownhillDeg, 0);
    ok(near(r.meanAlongSlopeDeg, RAMP_DEG));
    ok(near(r.surfaceDistanceM, Math.hypot(300, 100), 0.1));
    equal(r.startElevationM, 20);
    equal(r.endElevationM, 120);
    equal(r.shareAboveLimit, 1);
    equal(r.shareAlongAboveLimit, 1);
    equal(r.distanceAboveLimitM, 300);
  });

  it('counts a descent as a descent', () => {
    const r = measureRoute(RAMP, [{ col: 12, row: 10 }, { col: 2, row: 10 }]);
    equal(r.ascentM, 0);
    equal(r.descentM, 100);
    ok(near(r.maxDownhillDeg, RAMP_DEG));
    equal(r.maxUphillDeg, 0);
    equal(r.shareAboveLimit, null);
  });

  it('sees a steep slope crossed sideways: level route, ground above the limit', () => {
    const r = measureRoute(RAMP, [{ col: 10, row: 2 }, { col: 10, row: 12 }], { limit: LIMIT });
    equal(r.ascentM, 0);
    equal(r.meanAlongSlopeDeg, 0);
    equal(r.shareAlongAboveLimit, 0);
    equal(r.shareAboveLimit, 1);
    ok(near(r.maxTerrainSlopeDeg, RAMP_DEG));
  });

  it('gives the share above the limit for a route that is partly steep', () => {
    // Flat for columns 0 to 10, then the ramp.
    const half = tile(21, 30, (c) => (c <= 10 ? 0 : 10 * (c - 10)));
    const r = measureRoute(half, [{ col: 2, row: 10 }, { col: 18, row: 10 }], { limit: LIMIT });
    equal(r.distanceM, 480);
    equal(r.ascentM, 80);
    // The ground slope is taken at the steeper end of each 30 m segment. At column 10 the central
    // difference sees half the ramp (9.5 degrees, under the limit), so the 8 segments on the ramp count.
    equal(r.shareAboveLimit, 0.5);
    equal(r.shareAlongAboveLimit, 0.5);
    equal(r.distanceAboveLimitM, 240);
  });

  it('follows several legs and keeps the waypoints as samples', () => {
    const r = measureRoute(RAMP, [{ col: 2, row: 2 }, { col: 6, row: 2 }, { col: 6, row: 5 }]);
    equal(r.distanceM, 210);
    equal(r.ascentM, 40);
    ok(r.samples.some((s) => s.col === 6 && s.row === 2));
    equal(r.samples[r.samples.length - 1]?.distanceM, 210);
  });
});

describe('measureRoute: gaps, speed and notes', () => {
  it('leaves ground with no data out of the slope figures and says how much', () => {
    const holed = tile(21, 30, (c) => (c >= 8 && c <= 9 ? Number.NaN : 100));
    const r = measureRoute(holed, [{ col: 2, row: 10 }, { col: 12, row: 10 }], { limit: LIMIT });
    ok(r.noDataShare > 0.2 && r.noDataShare < 0.5);
    equal(r.surfaceDistanceM, null);
    ok(r.notes.some((n) => n.includes('no elevation data')));
    equal(r.shareAboveLimit, 0);
    equal(r.samples.find((s) => s.col === 8)?.elevationM, null);
  });

  it('gives a driving time only when a published speed is passed, and calls it a lower bound', () => {
    const none = measureRoute(FLAT, [{ col: 0, row: 0 }, { col: 10, row: 0 }]);
    equal(none.drivingTimeH, null);
    const timed = measureRoute(FLAT, [{ col: 0, row: 0 }, { col: 10, row: 0 }], { speed: { rover: 'Test rover', metresPerHour: 150, kind: 'top speed on flat, hard ground', source: 'a fact sheet' } });
    equal(timed.drivingTimeH, 2);
    ok(timed.notes.some((n) => n.includes('lower bound')));
  });

  it('always states the pixel size limit, the source of the slope limit, and that no energy figure is given', () => {
    const r = measureRoute(FLAT, [{ col: 0, row: 0 }, { col: 10, row: 0 }], { limit: LIMIT });
    ok(r.notes[0]?.includes('30 m apart'));
    ok(r.notes.some((n) => n.includes('15 degrees') && n.includes('a fact sheet')));
    ok(r.notes.some((n) => n.includes('No energy figure')));
    equal(r.baselineM, 30);
    equal(r.limit, LIMIT);
  });

  it('gives energy only from a measured rate, and only on the body it was measured on', () => {
    const rate = { rover: 'Apollo rover', whPerKm: 75.6, kind: 'measured mission rate', source: 'a NASA report', body: 'moon' as const };
    const way = [{ col: 0, row: 0 }, { col: 10, row: 0 }];
    const moon = measureRoute(FLAT, way, { energy: rate, body: 'moon' });
    equal(moon.energyWh, 22.7); // 0.3 km x 75.6 Wh per km
    ok(moon.notes.some((n) => n.includes('75.6 Wh per km') && n.includes('not adjusted for the slopes')));
    const earth = measureRoute(FLAT, way, { energy: rate, body: 'earth' });
    equal(earth.energyWh, null);
    ok(earth.notes.some((n) => n.includes('on the Moon, and this route is not there')));
    equal(measureRoute(FLAT, way, { energy: rate }).energyWh, null); // body not stated: no figure
    equal(measureRoute(FLAT, way).energyWh, null);
  });

  it('samples no finer than half a pixel', () => {
    equal(measureRoute(FLAT, [{ col: 0, row: 0 }, { col: 10, row: 0 }], { stepM: 1 }).stepM, 15);
    equal(measureRoute(FLAT, [{ col: 0, row: 0 }, { col: 10, row: 0 }], { stepM: 60 }).samples.length, 6);
  });

  it('rejects a route with one waypoint and a tile that is not square', () => {
    throws(() => measureRoute(FLAT, [{ col: 1, row: 1 }]), RangeError);
    throws(() => measureRoute({ size: 3, pixelM: 30, data: new Float32Array(8) }, [{ col: 0, row: 0 }, { col: 1, row: 1 }]), RangeError);
  });
});

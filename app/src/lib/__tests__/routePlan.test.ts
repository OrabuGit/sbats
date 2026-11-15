// Unit tests for the route planner. Run from the repo root: npx tsx --test app/src/lib/__tests__/routePlan.test.ts

import { equal, ok, throws } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { planRoute, steepClass, strideFor, strideWords, type PlanGrid } from '../routePlan';

/** A grid whose height is a function of column and row. */
function grid(size: number, pixelM: number, z: (col: number, row: number) => number): PlanGrid {
  const data = new Float32Array(size * size);
  for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) data[r * size + c] = z(c, r);
  return { size, pixelM, data };
}
const near = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;

describe('planRoute', () => {
  it('gives the straight line on a flat grid, with the true post spacing', () => {
    const g = grid(21, 30, () => 100);
    const r = planRoute(g, [{ col: 0, row: 10 }, { col: 20, row: 10 }], { limitDeg: 15, stride: 1 });
    ok(r.ok);
    equal(r.samples.length, 21);
    ok(r.samples.every((s) => s.row === 10));
    ok(near(r.distanceM, 600));
    equal(r.climbM, 0);
    equal(r.descentM, 0);
    equal(r.maxSlopeDeg, 0);
  });

  it('keeps the true spacing when it uses every 2nd post', () => {
    const g = grid(21, 30, () => 0);
    const r = planRoute(g, [{ col: 0, row: 0 }, { col: 20, row: 20 }], { limitDeg: 15, stride: 2 });
    ok(r.ok);
    equal(r.spacingM, 60);
    ok(near(r.distanceM, 600 * Math.SQRT2));
    equal(r.samples.length, 11);
  });

  it('refuses a ramp that is too steep, and reports the blocking section', () => {
    // Rises 15 m per 30 m post to the east everywhere: 26.6 degrees, and 19.5 degrees on a diagonal step, both over a 15 degree limit.
    const g = grid(21, 30, (c) => 15 * c);
    const r = planRoute(g, [{ col: 2, row: 10 }, { col: 18, row: 10 }], { limitDeg: 15, stride: 1 });
    equal(r.ok, false);
    ok(r.blocked);
    equal(r.blocked.reason, 'slope');
    equal(r.blocked.sections.length, 1);
    ok(near(r.blocked.maxSlopeDeg ?? 0, (Math.atan(15 / 30) * 180) / Math.PI, 1e-3));
    ok(near(r.blocked.overLimitM, 16 * 30, 1e-3));
    // A northward path has no slope, but cannot get any nearer the east end: the start stays the closest post.
    equal(r.blocked.closest.col, 2);
  });

  it('accepts the same ramp under a looser limit, with the climb summed', () => {
    const g = grid(21, 30, (c) => 15 * c);
    const r = planRoute(g, [{ col: 2, row: 10 }, { col: 18, row: 10 }], { limitDeg: 30, stride: 1 });
    ok(r.ok);
    ok(near(r.climbM, 240, 1e-3));
    equal(r.descentM, 0);
    ok(r.maxSlopeDeg <= 30);
  });

  it('routes around a gap', () => {
    // A 200 m deep trench across the middle column, open only in the bottom three rows.
    const g = grid(21, 30, (c, r) => (c === 10 && r < 18 ? -200 : 0));
    const r = planRoute(g, [{ col: 2, row: 2 }, { col: 18, row: 2 }], { limitDeg: 30, stride: 1 });
    ok(r.ok);
    ok(r.samples.some((s) => s.col === 10 && s.row >= 18));
    ok(r.samples.every((s) => !(s.col === 10 && s.row < 18)));
    ok(r.distanceM > 16 * 30);
    equal(r.maxSlopeDeg, 0);
  });

  it('routes around no-data posts and reports a no-data start', () => {
    const g = grid(21, 30, (c, r) => (c === 10 && r < 18 ? NaN : 0));
    const r = planRoute(g, [{ col: 2, row: 2 }, { col: 18, row: 2 }], { limitDeg: 30, stride: 1 });
    ok(r.ok);
    const bad = planRoute(g, [{ col: 10, row: 2 }, { col: 18, row: 2 }], { limitDeg: 30, stride: 1 });
    equal(bad.ok, false);
    equal(bad.blocked?.reason, 'no data');
  });

  it('plans through waypoints in order and stops at the leg that is blocked', () => {
    const g = grid(21, 30, (c) => (c > 15 ? 15 * (c - 15) : 0));
    const r = planRoute(
      g,
      [
        { col: 0, row: 10 },
        { col: 10, row: 10 },
        { col: 20, row: 10 },
      ],
      { limitDeg: 15, stride: 1 },
    );
    equal(r.ok, false);
    equal(r.blocked?.leg, 1);
    ok(near(r.distanceM, 300));
  });

  it('throws without a start and an end or without a limit', () => {
    const g = grid(5, 30, () => 0);
    throws(() => planRoute(g, [{ col: 0, row: 0 }], { limitDeg: 15 }));
    throws(() => planRoute(g, [{ col: 0, row: 0 }, { col: 4, row: 4 }], { limitDeg: 0 }));
  });
});

describe('helpers', () => {
  it('picks every 2nd post for a 667-post grid', () => {
    equal(strideFor(667), 2);
    equal(strideFor(101), 1);
    equal(strideWords(2), 'every 2nd post');
    equal(strideWords(3), 'every 3rd post');
    equal(strideWords(1), 'every post');
  });
  it('classes steepness against the limit', () => {
    equal(steepClass(10, 30), 0);
    equal(steepClass(25, 30), 1);
    equal(steepClass(31, 30), 2);
    equal(steepClass(null, 30), 0);
  });
});

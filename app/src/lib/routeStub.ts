// STUB. Route figures computed in the app until Session C publishes its route function.
// flags.routeFromLib switches the terrain page over when that lands. Everything here is plain
// geometry on the elevation grid: no speed, no energy, no time, because none has a cited number.

export interface RoutePoint {
  x: number;
  z: number;
}

export interface RouteProfile {
  /** Distance along the ground plan from the start, km, one entry per sample. */
  distKm: number[];
  /** Height above the lowest point of the square, m. */
  heightM: number[];
}

export interface RouteFigures {
  /** Length along the surface, km. */
  lengthKm: number;
  climbM: number;
  descentM: number;
  /** Steepest 100 m of the route, degrees. */
  maxSlopeDeg: number;
  /** Share of the route steeper than `limitDeg`, 0 to 1. */
  shareOverLimit: number;
  limitDeg: number;
}

/** Sampling step along the route, km. */
export const ROUTE_STEP_KM = 0.1;

/** A sampler of height in metres at a point given in km from the centre of a square extract. */
export function heightSampler(heights: Float32Array, size: number, windowKm: number): (x: number, z: number) => number {
  let min = Infinity;
  for (const h of heights) if (!Number.isNaN(h) && h < min) min = h;
  if (!Number.isFinite(min)) min = 0;
  const half = windowKm / 2;
  return (x, z) => {
    const c = Math.max(0, Math.min(size - 1, Math.round(((x + half) / windowKm) * (size - 1))));
    const r = Math.max(0, Math.min(size - 1, Math.round(((z + half) / windowKm) * (size - 1))));
    const h = heights[r * size + c];
    return (Number.isNaN(h) ? min : h) - min;
  };
}

export function routeProfile(points: RoutePoint[], heightAt: (x: number, z: number) => number): RouteProfile {
  const distKm: number[] = [];
  const heightM: number[] = [];
  let d = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.ceil(len / ROUTE_STEP_KM));
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      distKm.push(d + len * t);
      heightM.push(heightAt(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t));
    }
    d += len;
  }
  if (points.length > 0) {
    const p = points[points.length - 1];
    distKm.push(d);
    heightM.push(heightAt(p.x, p.z));
  }
  return { distKm, heightM };
}

export function routeFigures(p: RouteProfile, limitDeg: number): RouteFigures | null {
  if (p.distKm.length < 2) return null;
  let lengthKm = 0;
  let climbM = 0;
  let descentM = 0;
  let maxSlopeDeg = 0;
  let over = 0;
  for (let i = 1; i < p.distKm.length; i++) {
    const run = (p.distKm[i] - p.distKm[i - 1]) * 1000;
    const rise = p.heightM[i] - p.heightM[i - 1];
    if (run <= 0) continue;
    lengthKm += Math.hypot(run, rise) / 1000;
    if (rise > 0) climbM += rise;
    else descentM -= rise;
    const deg = (Math.atan(Math.abs(rise) / run) * 180) / Math.PI;
    if (deg > maxSlopeDeg) maxSlopeDeg = deg;
    if (deg > limitDeg) over += run;
  }
  const plan = (p.distKm[p.distKm.length - 1] - p.distKm[0]) * 1000;
  return { lengthKm, climbM, descentM, maxSlopeDeg, shareOverLimit: plan > 0 ? over / plan : 0, limitDeg };
}

// Shared, display-only helpers for the 3D terrain: the one height ramp, the contour interval rule and the
// contour lines themselves. All computed in the browser from the elevation grids; nothing here is data.

/** One fixed hypsometric ramp for every place, low to high. Eight flat classes, each an equal share of the place's own relief. */
export const HEIGHT_RAMP = ['#2f5d62', '#3f7a5a', '#6f9a52', '#a8b04e', '#d6b85a', '#c08a4a', '#9a6a45', '#e8e2d6'] as const;

/** Index of the ramp class for a height given as a share 0 to 1 of the place's relief. */
export const rampIndex = (share: number) => Math.max(0, Math.min(HEIGHT_RAMP.length - 1, Math.floor(share * HEIGHT_RAMP.length)));

/** Sun elevation above the horizon, degrees: the default, and the low-sun preset. The sun is always in the north-west. */
export const SUN_DEFAULT = 45;
export const SUN_LOW = 10;
/** Range of the vertical exaggeration control. */
export const EXAGGERATION_MIN = 1;
export const EXAGGERATION_MAX = 5;

/** Number of contour lines aimed for across a place's relief. */
const TARGET_LINES = 10;

/** Contour interval in metres for a place: its relief divided by about 10, rounded to 1, 2 or 5 times a power of ten. At least 1 m. null when there is no relief. */
export function niceInterval(reliefM: number): number | null {
  if (!(reliefM > 0)) return null;
  const raw = reliefM / TARGET_LINES;
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  let best = power;
  for (const f of [1, 2, 5, 10]) if (Math.abs(Math.log(f * power / raw)) < Math.abs(Math.log(best / raw))) best = f * power;
  return Math.max(1, best);
}

/** Lowest, highest and relief in metres of a grid, ignoring no-data. null when the grid has no valid value. */
export function heightRange(heights: Float32Array): { min: number; max: number; reliefM: number } | null {
  let min = Infinity;
  let max = -Infinity;
  for (const h of heights)
    if (!Number.isNaN(h)) {
      if (h < min) min = h;
      if (h > max) max = h;
    }
  return max >= min ? { min, max, reliefM: max - min } : null;
}

/**
 * Contour lines on the triangulated surface, as line-segment end points (x, y, z, x, y, z, ...) in km.
 * `h` holds n x n heights in km above the lowest point; lines are drawn at whole multiples of `intervalM`
 * above that point, on the same triangles the mesh is drawn with, so they lie on the surface.
 */
export function contourPositions(h: Float32Array, n: number, windowKm: number, intervalM: number, lift: number): Float32Array {
  const out: number[] = [];
  const step = windowKm / (n - 1);
  const at = (c: number, r: number) => h[r * n + c];
  const tri = (c0: number, r0: number, c1: number, r1: number, c2: number, r2: number) => {
    const v0 = at(c0, r0) * 1000;
    const v1 = at(c1, r1) * 1000;
    const v2 = at(c2, r2) * 1000;
    const lo = Math.min(v0, v1, v2);
    const hi = Math.max(v0, v1, v2);
    if (hi <= lo) return;
    const pts = [
      [c0, r0, v0],
      [c1, r1, v1],
      [c2, r2, v2],
    ];
    for (let k = Math.max(1, Math.floor(lo / intervalM) + 1); k * intervalM <= hi; k++) {
      const level = k * intervalM;
      const hits: number[] = [];
      for (let e = 0; e < 3; e++) {
        const a = pts[e];
        const b = pts[(e + 1) % 3];
        if (a[2] >= level === b[2] >= level) continue;
        const t = (level - a[2]) / (b[2] - a[2]);
        hits.push((a[0] + (b[0] - a[0]) * t) * step - windowKm / 2, level / 1000 + lift, (a[1] + (b[1] - a[1]) * t) * step - windowKm / 2);
      }
      if (hits.length === 6) out.push(...hits);
    }
  };
  for (let r = 0; r < n - 1; r++)
    for (let c = 0; c < n - 1; c++) {
      // The two triangles PlaneGeometry makes for this quad: (a, b, d) and (b, c, d).
      tri(c, r, c, r + 1, c + 1, r);
      tri(c, r + 1, c + 1, r + 1, c + 1, r);
    }
  return new Float32Array(out);
}

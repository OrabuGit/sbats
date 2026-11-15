// Shaded relief from a square elevation grid. The same function draws Earth, Moon and Mars, so the
// three look alike for the same terrain. Light from the north-west at 45 degrees, no exaggeration.

/** Returns a size x size canvas with one grey value per elevation pixel. No-data pixels are the panel colour. */
export function reliefCanvas(heights: Float32Array, size: number, pixelM: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const g = cv.getContext('2d')!;
  const img = g.createImageData(size, size);
  const at = (x: number, y: number) => heights[Math.min(size - 1, Math.max(0, y)) * size + Math.min(size - 1, Math.max(0, x))];
  // Unit vector towards the light: azimuth 315 degrees, altitude 45 degrees.
  const lx = -0.5;
  const ly = 0.5;
  const lz = Math.SQRT1_2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4;
      const h = heights[y * size + x];
      if (Number.isNaN(h)) {
        img.data[o] = 18;
        img.data[o + 1] = 22;
        img.data[o + 2] = 26;
        img.data[o + 3] = 255;
        continue;
      }
      const e = at(x + 1, y);
      const w = at(x - 1, y);
      const n = at(x, y - 1);
      const s = at(x, y + 1);
      const dzdx = ((Number.isNaN(e) ? h : e) - (Number.isNaN(w) ? h : w)) / (2 * pixelM);
      const dzdy = ((Number.isNaN(n) ? h : n) - (Number.isNaN(s) ? h : s)) / (2 * pixelM);
      const len = Math.hypot(dzdx, dzdy, 1);
      const shade = Math.max(0, (-dzdx * lx - dzdy * ly + lz) / len);
      const v = Math.round(28 + shade * 190);
      img.data[o] = v;
      img.data[o + 1] = v;
      img.data[o + 2] = v;
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return cv;
}

/** Highest minus lowest valid height, in metres. null when the grid has no valid value. */
export function reliefM(heights: Float32Array): number | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (const h of heights) {
    if (Number.isNaN(h)) continue;
    if (h < lo) lo = h;
    if (h > hi) hi = h;
  }
  return hi >= lo ? hi - lo : null;
}

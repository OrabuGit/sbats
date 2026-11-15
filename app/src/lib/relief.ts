// Shaded relief from a square elevation grid. The same function draws Earth, Moon and Mars, so the
// three look alike for the same terrain. Light from the north-west at 45 degrees, no vertical
// exaggeration. For display only, the lighting is stretched to the range this grid actually has (so a
// gentle plain is not a flat grey) and tinted by height: cool low, warm high.

/** Returns a size x size canvas shaded from the elevation grid. No-data pixels are the panel colour. */
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
  const shade = new Float32Array(size * size).fill(NaN);
  let lo = Infinity;
  let hi = -Infinity;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const h = heights[y * size + x];
      if (Number.isNaN(h)) continue;
      if (h < lo) lo = h;
      if (h > hi) hi = h;
      const e = at(x + 1, y);
      const w = at(x - 1, y);
      const n = at(x, y - 1);
      const s = at(x, y + 1);
      const dzdx = ((Number.isNaN(e) ? h : e) - (Number.isNaN(w) ? h : w)) / (2 * pixelM);
      const dzdy = ((Number.isNaN(n) ? h : n) - (Number.isNaN(s) ? h : s)) / (2 * pixelM);
      shade[y * size + x] = Math.max(0, (-dzdx * lx - dzdy * ly + lz) / Math.hypot(dzdx, dzdy, 1));
    }
  }
  // The 2nd and 98th percentile of the lighting, so a few extreme pixels do not decide the contrast.
  const bins = new Uint32Array(512);
  let count = 0;
  for (const v of shade) {
    if (Number.isNaN(v)) continue;
    bins[Math.min(511, Math.floor(v * 511))]++;
    count++;
  }
  const percentile = (p: number) => {
    let acc = 0;
    for (let i = 0; i < 512; i++) {
      acc += bins[i];
      if (acc >= count * p) return i / 511;
    }
    return 1;
  };
  const s0 = percentile(0.02);
  const s1 = Math.max(s0 + 0.02, percentile(0.98));
  const span = hi > lo ? hi - lo : 1;
  for (let i = 0; i < size * size; i++) {
    const o = i * 4;
    const sh = shade[i];
    if (Number.isNaN(sh)) {
      img.data[o] = 18;
      img.data[o + 1] = 22;
      img.data[o + 2] = 26;
      img.data[o + 3] = 255;
      continue;
    }
    const k = Math.max(0, Math.min(1, (sh - s0) / (s1 - s0)));
    const v = 30 + k * 205;
    const t = Math.max(0, Math.min(1, (heights[i] - lo) / span));
    img.data[o] = Math.min(255, v * (0.84 + 0.22 * t));
    img.data[o + 1] = Math.min(255, v * (0.94 + 0.04 * t));
    img.data[o + 2] = Math.min(255, v * (1.04 - 0.22 * t));
    img.data[o + 3] = 255;
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

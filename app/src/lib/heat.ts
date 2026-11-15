// Match strength is shown by brightness. A cell's light is a function of its score, and the legend prints the same function.
export const AMBER = '255,176,0';
/** Share of full brightness for a score from 0 to 100. */
export const brightness = (score: number) => Math.pow(Math.max(0, Math.min(100, score)) / 100, 1.1);
/** Cells from this score up carry a halo. The halo grows with the score. */
export const GLOW_FROM = 35;
export const SCORE_CLASSES = [0, 20, 35, 50, 65, 80, 100].map((min) => ({ min, label: String(min), b: brightness(min) }));
export const NO_DATA = '#2B333B';
// Over the imagery the cells are slightly see-through, so relief and coastlines stay readable.
// Cells below the first score step get only a thin dark veil.
export const NO_DATA_ALPHA = 0.8;
export const cellAlpha = (score: number) => 0.035 + 0.93 * brightness(score);

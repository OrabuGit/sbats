import { describe, it } from 'node:test';
import { equal, ok, throws } from 'node:assert/strict';
import { clampToRange, gaussianLogSimilarity, gaussianSimilarity, weightedGeometricMean } from '../similarity';
import { OBLIQUITY_DEG, sunElevation } from '../sunlight';
import { near } from './fixtures';

describe('Gaussian similarity', () => {
  it('is 1 when the Earth value equals the target', () => {
    equal(gaussianSimilarity(12.5, 12.5, 3), 1);
  });

  it('is exp(-0.5) one sigma away and exp(-2) two sigma away', () => {
    ok(near(gaussianSimilarity(13, 10, 3), Math.exp(-0.5)));
    ok(near(gaussianSimilarity(16, 10, 3), Math.exp(-2)));
    ok(near(gaussianSimilarity(13, 10, 3), 0.6065306597126334));
  });

  it('is symmetric around the target', () => {
    equal(gaussianSimilarity(7, 10, 3), gaussianSimilarity(13, 10, 3));
  });

  it('rises with a larger tolerance and never leaves 0 to 1', () => {
    ok(gaussianSimilarity(20, 10, 10) > gaussianSimilarity(20, 10, 5));
    for (const x of [-1e6, -50, 0, 9.99, 10, 1e6]) {
      const s = gaussianSimilarity(x, 10, 4);
      ok(s >= 0 && s <= 1);
    }
  });

  it('agrees with its log form', () => {
    ok(near(Math.exp(gaussianLogSimilarity(4, 1, 2)), gaussianSimilarity(4, 1, 2)));
    equal(gaussianLogSimilarity(4, 1, 2), -1.125);
  });

  it('rejects a sigma that is zero, negative or not a number', () => {
    throws(() => gaussianSimilarity(1, 1, 0), RangeError);
    throws(() => gaussianSimilarity(1, 1, -2), RangeError);
    throws(() => gaussianSimilarity(1, 1, Number.NaN), RangeError);
  });
});

describe('Clamping to a range', () => {
  const range = { min: -55, max: 30 };
  it('pulls a value below the range up to the minimum', () => equal(clampToRange(-170, range), -55));
  it('pulls a value above the range down to the maximum', () => equal(clampToRange(120, range), 30));
  it('leaves a value inside the range alone', () => equal(clampToRange(4, range), 4));
  it('leaves the two ends alone', () => {
    equal(clampToRange(-55, range), -55);
    equal(clampToRange(30, range), 30);
  });
});

describe('Weighted geometric mean', () => {
  it('gives 100 when every similarity is 1', () => {
    equal(weightedGeometricMean([{ similarity: 1, weight: 0.3 }, { similarity: 1, weight: 0.7 }]), 100);
  });

  it('matches hand-calculated values', () => {
    // sqrt(0.25 * 1) = 0.5
    ok(near(weightedGeometricMean([{ similarity: 0.25, weight: 0.5 }, { similarity: 1, weight: 0.5 }]), 50));
    // 0.5^0.25 * 0.8^0.75 = 0.711312...
    ok(near(weightedGeometricMean([{ similarity: 0.5, weight: 0.25 }, { similarity: 0.8, weight: 0.75 }]), 100 * 0.5 ** 0.25 * 0.8 ** 0.75));
  });

  it('renormalises weights that do not sum to 1', () => {
    const a = weightedGeometricMean([{ similarity: 0.5, weight: 0.25 }, { similarity: 0.8, weight: 0.75 }]);
    const b = weightedGeometricMean([{ similarity: 0.5, weight: 1 }, { similarity: 0.8, weight: 3 }]);
    ok(near(a, b));
  });

  it('is a veto: one zero similarity gives 0 where an arithmetic mean would give 83', () => {
    const entries = [1, 1, 1, 1, 1, 0].map((similarity) => ({ similarity, weight: 1 / 6 }));
    equal(weightedGeometricMean(entries), 0);
    const arithmetic = (100 * entries.reduce((sum, e) => sum + e.similarity, 0)) / entries.length;
    ok(arithmetic > 83);
  });

  it('ignores entries with zero weight, even a zero similarity', () => {
    equal(weightedGeometricMean([{ similarity: 0, weight: 0 }, { similarity: 1, weight: 1 }]), 100);
  });

  it('rejects an empty list and similarities outside 0 to 1', () => {
    throws(() => weightedGeometricMean([]), RangeError);
    throws(() => weightedGeometricMean([{ similarity: 1.2, weight: 1 }]), RangeError);
    throws(() => weightedGeometricMean([{ similarity: Number.NaN, weight: 1 }]), RangeError);
  });
});

describe('Sunlight geometry', () => {
  it('uses the published axial tilts', () => {
    equal(OBLIQUITY_DEG.earth, 23.44);
    equal(OBLIQUITY_DEG.mars, 25.19);
    equal(OBLIQUITY_DEG.moon, 1.54);
  });

  it('is exactly 90 minus latitude outside the tropics and polar circles', () => {
    // At 45 degrees the noon elevation is 45 + declination, and the declination averages to zero.
    ok(near(sunElevation('earth', 45), 45, 1e-9));
    ok(near(sunElevation('earth', -45), 45, 1e-9));
    ok(near(sunElevation('mars', 40), 50, 1e-9));
  });

  it('is the same north and south of the equator', () => {
    for (const lat of [0.25, 10.75, 23.44, 60.25, 89.75]) {
      ok(near(sunElevation('earth', lat), sunElevation('earth', -lat), 1e-9));
    }
  });

  it('counts polar night as zero, so the pole sits near tilt divided by pi', () => {
    const pole = sunElevation('earth', 90);
    ok(pole > 7.3 && pole < 7.5, `Earth pole gave ${pole}`);
    const moonPole = sunElevation('moon', -90);
    ok(moonPole > 0.45 && moonPole < 0.5, `Moon pole gave ${moonPole}`);
  });

  it('falls steadily from the tropics to the pole', () => {
    let previous = sunElevation('earth', 25);
    for (let lat = 30; lat <= 90; lat += 5) {
      const now = sunElevation('earth', lat);
      ok(now < previous);
      previous = now;
    }
  });

  it('keeps the Sun very low at a lunar polar site and high in the Mars tropics', () => {
    ok(sunElevation('moon', -89.5) < 2);
    // Inside the tropics the Sun passes overhead twice a year, so the mean sits below 90 - 0 = 90
    // and above 90 - latitude - tilt. Mars at 18.4 N is within 2 degrees of Earth at 18.4 N.
    const mars = sunElevation('mars', 18.4);
    ok(mars > 90 - 18.4 - 25.19 && mars < 90);
    ok(Math.abs(mars - sunElevation('earth', 18.4)) < 2);
  });

  it('stays between 0 and 90 everywhere and rejects impossible latitudes', () => {
    for (const body of ['earth', 'moon', 'mars'] as const) {
      for (let lat = -90; lat <= 90; lat += 7.5) {
        const v = sunElevation(body, lat);
        ok(v >= 0 && v <= 90);
      }
    }
    throws(() => sunElevation('earth', 91), RangeError);
    throws(() => sunElevation('earth', Number.NaN), RangeError);
  });
});

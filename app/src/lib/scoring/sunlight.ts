import type { Body } from './types';

/**
 * Tilt of each body's spin axis relative to the plane in which the Sun appears to move, in degrees.
 * Earth and Mars: obliquity to orbit, NASA NSSDC planetary fact sheets.
 * Moon: inclination of the lunar equator to the ecliptic (the Sun's path as seen from the Moon).
 * See SOURCES.md.
 */
export const OBLIQUITY_DEG: Record<Body, number> = {
  earth: 23.44,
  moon: 1.54,
  mars: 25.19,
};

/**
 * Gaussian tolerance for the Sunlight quantity, in degrees. A design parameter, not a measurement:
 * 15 degrees of noon Sun elevation is about one climate belt of latitude.
 */
export const SUN_ELEVATION_SIGMA_DEG = 15;

const DEG = Math.PI / 180;
const STEPS = 360;
const cache = new Map<string, number>();

/**
 * Annual mean noon Sun elevation in degrees for a latitude on a body.
 * The same formula is used for Earth, the Moon and Mars.
 *
 * For each degree of solar longitude L (0 to 359):
 *     declination     d = asin( sin(tilt) * sin(L) )
 *     noon elevation  h = max( 0, 90 - |lat - d| )
 * The result is the mean of h over the 360 steps. A noon with the Sun below the horizon counts as 0,
 * so polar night lowers the mean: this is how the seasonal light pattern enters the factor.
 *
 * Limits, stated on purpose:
 * - Every degree of solar longitude gets equal time (circular orbit). Mars' eccentric orbit makes its
 *   northern summer longer than this assumes.
 * - The body is treated as a smooth sphere. Local topography is ignored, so the long sunlit periods on
 *   lunar polar ridges and the permanent shadow inside polar craters are not captured.
 * - Atmosphere, cloud and day length are not part of this factor.
 */
export function sunElevation(body: Body, lat: number): number {
  if (!(lat >= -90 && lat <= 90)) {
    throw new RangeError(`lat must be between -90 and 90, got ${String(lat)}`);
  }
  const cacheKey = `${body}:${lat}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const sinTilt = Math.sin(OBLIQUITY_DEG[body] * DEG);
  let sum = 0;
  for (let i = 0; i < STEPS; i++) {
    const declination = Math.asin(sinTilt * Math.sin(i * DEG)) / DEG;
    sum += Math.max(0, 90 - Math.abs(lat - declination));
  }
  const result = sum / STEPS;
  cache.set(cacheKey, result);
  return result;
}

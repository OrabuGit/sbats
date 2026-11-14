import { sourcedValue } from './catalog';
import type { Body, ModulesFile, SiteConditions } from './types';

/** Earth's axial tilt in degrees (NASA NSSDC Earth Fact Sheet). The same constant as in the scoring library. */
export const EARTH_TILT_DEG = 23.44;
const DEG = Math.PI / 180;

/**
 * Longest continuous night at an Earth latitude, in hours, from geometry alone (no twilight, no refraction).
 * Outside the polar circles it is the night of the winter solstice. Inside them it is the polar night:
 * the share of the year in which the Sun stays below the horizon at noon, times 365.25 days.
 */
export function earthLongestNightHours(lat: number): number {
  const phi = Math.abs(lat);
  if (phi + EARTH_TILT_DEG < 90) {
    const x = Math.tan(phi * DEG) * Math.tan(EARTH_TILT_DEG * DEG);
    return 24 * (1 - Math.acos(Math.min(1, x)) / Math.PI);
  }
  let dark = 0;
  for (let i = 0; i < 3600; i++) {
    const declination = Math.asin(Math.sin(EARTH_TILT_DEG * DEG) * Math.sin(i * 0.1 * DEG)) / DEG;
    // Northern latitude assumed; the southern case is the mirror image and gives the same count.
    if (90 - Math.abs(phi - declination) <= 0) dark += 1;
  }
  return (dark / 3600) * 365.25 * 24;
}

/**
 * Annual mean sunlight at the top of the atmosphere over an Earth latitude, in W/m2 on a horizontal
 * surface, averaged over day and night. Standard geometry: for each day,
 *     Q = (S / pi) * (h0 sin(lat) sin(d) + cos(lat) cos(d) sin(h0)),  cos(h0) = -tan(lat) tan(d)
 * This is an UPPER BOUND on what reaches the ground: it has no air, cloud or dust in it.
 */
export function topOfAtmosphereMeanWm2(lat: number, solarConstantWm2: number): number {
  const phi = lat * DEG;
  let sum = 0;
  const steps = 360;
  for (let i = 0; i < steps; i++) {
    const d = Math.asin(Math.sin(EARTH_TILT_DEG * DEG) * Math.sin(i * DEG));
    const x = -Math.tan(phi) * Math.tan(d);
    const h0 = x >= 1 ? 0 : x <= -1 ? Math.PI : Math.acos(x);
    sum += (solarConstantWm2 / Math.PI) * (h0 * Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.sin(h0));
  }
  return Math.max(0, sum / steps);
}

/** The fields of a targets.json entry that the simulation reads. */
export interface TargetLike {
  id: string;
  name: string;
  body: 'moon' | 'mars';
  values: { tempMean: { value: number | null }; slope: { value: number | null } };
  cannotCopy?: string[];
}

/**
 * Site conditions for a Moon or Mars target: temperature and slope from targets.json, sunlight,
 * darkness and ice from the `sites` block of modules.json. Anything without a source stays null.
 */
export function siteFromTarget(target: TargetLike, file: ModulesFile): SiteConditions {
  const entry = file.sites[target.id];
  const notes: string[] = [];
  if (!entry) notes.push(`modules.json has no sunlight, darkness or ice figures for ${target.name}.`);
  const pick = (key: 'irradianceWm2' | 'litFraction' | 'longestDarkHours' | 'iceAvailability', what: string): number | null => {
    const v = entry ? sourcedValue(entry[key]) : null;
    if (entry && v === null) notes.push(`${target.name}: no published ${what}${entry[key]?.note ? ` (${entry[key].note})` : ''}.`);
    return v;
  };
  return {
    id: target.id,
    name: target.name,
    body: target.body as Body,
    irradianceWm2: pick('irradianceWm2', 'sunlight figure'),
    litFraction: pick('litFraction', 'share of time in sunlight'),
    longestDarkHours: pick('longestDarkHours', 'longest dark period'),
    iceAvailability: pick('iceAvailability', 'ice availability'),
    tempMeanC: target.values.tempMean.value,
    slopeDeg: target.values.slope.value,
    cannotTest: target.cannotCopy ?? [],
    notes,
  };
}

/** The fields of an earth.json cell that the simulation reads. `insolationKwhM2Day` is optional. */
export interface CellLike {
  lat: number;
  lon: number;
  tempMean: number | null;
  slope: number | null;
  /** Measured mean daily sunlight at the surface, kWh/m2/day, if earth.json ever carries it. */
  insolationKwhM2Day?: number | null;
}

/**
 * Site conditions for an Earth cell.
 *
 * - Sunlight: the measured surface value when the cell has one. Otherwise the top-of-atmosphere mean
 *   for the latitude, flagged as an upper bound, because earth.json has no surface sunlight yet.
 * - Lit fraction: 0.5. Averaged over a year the Sun is up half the time at every latitude.
 * - Longest dark period: the longest night for the latitude, by geometry.
 * - Ice: earth.json has no ground-ice data, so the ice miner is treated as idle on Earth (availability 0)
 *   and a note says so. Pass `iceAvailability` to override when a site is known to have ground ice.
 */
export function siteFromEarthCell(cell: CellLike, file: ModulesFile, options: { name?: string; iceAvailability?: number | null } = {}): SiteConditions {
  const name = options.name ?? `Earth cell ${cell.lat}, ${cell.lon}`;
  const notes: string[] = [];
  const lit = 0.5;
  let irradiance: number | null = null;
  let upperBound = false;
  if (typeof cell.insolationKwhM2Day === 'number' && Number.isFinite(cell.insolationKwhM2Day)) {
    irradiance = (cell.insolationKwhM2Day * 1000) / 24 / lit;
  } else {
    const s = sourcedValue(file.constants.solarConstantWm2);
    if (s === null) notes.push('Sunlight is unknown: no measured surface value for this cell and no sourced solar constant.');
    else {
      irradiance = topOfAtmosphereMeanWm2(cell.lat, s) / lit;
      upperBound = true;
      notes.push(`Sunlight at ${name} is the top-of-atmosphere figure for its latitude: an upper bound, with no air or cloud. earth.json has no surface sunlight yet.`);
    }
  }
  let ice: number | null;
  if (options.iceAvailability === undefined) {
    ice = 0;
    notes.push('earth.json has no ground-ice data, so the ice miner is treated as idle on Earth.');
  } else ice = options.iceAvailability;
  return {
    id: `earth:${cell.lat},${cell.lon}`,
    name,
    body: 'earth',
    irradianceWm2: irradiance,
    litFraction: lit,
    longestDarkHours: earthLongestNightHours(cell.lat),
    iceAvailability: ice,
    tempMeanC: cell.tempMean,
    slopeDeg: cell.slope,
    irradianceIsUpperBound: upperBound,
    notes,
  };
}

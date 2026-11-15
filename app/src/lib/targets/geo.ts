// Distances on the Moon and Mars.

import type { TargetBody } from './types';

/**
 * Mean radius in km. NASA NSSDCA fact sheets (volumetric mean radius): Moon 1737.4, Mars 3389.5.
 * https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html and .../marsfact.html
 */
export const BODY_RADIUS_KM: Record<TargetBody, number> = { moon: 1737.4, mars: 3389.5 };

const RAD = Math.PI / 180;

/** Great-circle distance in km between two points on a body (haversine). */
export function distanceKm(body: TargetBody, lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * RAD;
  const dLon = (lon2 - lon1) * RAD;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * BODY_RADIUS_KM[body] * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Kilometres per degree of latitude on a body. */
export function kmPerDegree(body: TargetBody): number {
  return (Math.PI * BODY_RADIUS_KM[body]) / 180;
}

/** Longitude folded into -180 to 180. */
export function normaliseLon(lon: number): number {
  const x = ((((lon + 180) % 360) + 360) % 360) - 180;
  return x === -180 ? 180 : x;
}

export function validPoint(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -360 && lon <= 360;
}

/** "14.09 N, 56.77 W" */
export function formatPoint(lat: number, lon: number): string {
  const l = normaliseLon(lon);
  return `${Math.abs(lat).toFixed(2)} ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(l).toFixed(2)} ${l >= 0 ? 'E' : 'W'}`;
}

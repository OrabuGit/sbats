import type { EarthCell, EarthFile } from '../types';

const R_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface CellIndex {
  res: number;
  /** Index into earth.cells of the cell containing or nearest to the point, or -1. */
  nearest: (lat: number, lon: number, maxRings?: number) => number;
}

/** Grid lookup. Cell centres sit at half a step from the grid lines (SCHEMA.md). */
export function buildIndex(earth: EarthFile): CellIndex {
  const res = earth.meta.resolutionDeg;
  const cols = Math.round(360 / res);
  const rows = Math.round(180 / res);
  const rowOf = (lat: number) => Math.min(rows - 1, Math.max(0, Math.floor((lat + 90) / res)));
  const colOf = (lon: number) => ((Math.floor((lon + 180) / res) % cols) + cols) % cols;
  const map = new Map<number, number>();
  earth.cells.forEach((c, i) => map.set(rowOf(c.lat) * cols + colOf(c.lon), i));

  const nearest = (lat: number, lon: number, maxRings = 2) => {
    const r0 = rowOf(lat);
    const c0 = colOf(lon);
    const direct = map.get(r0 * cols + c0);
    if (direct !== undefined) return direct;
    let best = -1;
    let bestD = Infinity;
    for (let ring = 1; ring <= maxRings && best < 0; ring++) {
      for (let dr = -ring; dr <= ring; dr++) {
        for (let dc = -ring; dc <= ring; dc++) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
          const r = r0 + dr;
          if (r < 0 || r >= rows) continue;
          const i = map.get(r * cols + (((c0 + dc) % cols) + cols) % cols);
          if (i === undefined) continue;
          const cell = earth.cells[i];
          const d = distanceKm(lat, lon, cell.lat, cell.lon);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
      }
    }
    return best;
  };
  return { res, nearest };
}

export function formatLat(lat: number, digits = 2): string {
  return `${Math.abs(lat).toFixed(digits)}°${lat < 0 ? 'S' : 'N'}`;
}
export function formatLon(lon: number, digits = 2): string {
  return `${Math.abs(lon).toFixed(digits)}°${lon < 0 ? 'W' : 'E'}`;
}
export function formatCoords(lat: number, lon: number): string {
  return `${formatLat(lat)} ${formatLon(lon)}`;
}

/** Stable grid code for a cell, for example SBATS-S0775-E11025. */
export function siteCode(cell: Pick<EarthCell, 'lat' | 'lon'>): string {
  const p = (v: number, width: number) => String(Math.round(Math.abs(v) * 100)).padStart(width, '0');
  return `SBATS-${cell.lat < 0 ? 'S' : 'N'}${p(cell.lat, 4)}-${cell.lon < 0 ? 'W' : 'E'}${p(cell.lon, 5)}`;
}

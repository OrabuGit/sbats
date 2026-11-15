// Rover route logic: distance, elevation profile and slope along a route drawn on an elevation tile.
//
// Pure functions. The tile is one of data/extracts (Session B): a square of elevations in metres,
// row 0 at the north edge, in a local projection where one pixel is `pixelM` metres on the ground.
//
// Two honest limits, repeated in every result:
//   1. Slope is measured between elevation posts `pixelM` apart (30 m on Earth, 60 or 80 m on the
//      Moon, 463 m on Mars). A rover meets rocks and steps far smaller than that. A route that looks
//      drivable here is not proven drivable.
//   2. Tiles of different bodies have different pixel sizes. Slopes from a 463 m grid are gentler
//      than slopes of the same ground from a 30 m grid, so compare routes at one pixel size only.

/** An elevation tile. `data` has size x size values, row-major, north row first; NaN is no data. */
export interface ElevationTile {
  size: number;
  /** Ground size of one pixel in metres. */
  pixelM: number;
  data: ArrayLike<number>;
}

/** A point on a tile in pixel units: `col` grows east, `row` grows south. (0, 0) is the centre of the north-west pixel. */
export interface TilePoint {
  col: number;
  row: number;
}

/** A published slope limit for a rover, with its source. From data/rovers.json. */
export interface SlopeLimit {
  rover: string;
  /** Degrees. */
  limitDeg: number;
  /** What kind of limit the source states: a design capability, an operating rule, or a static tilt limit. */
  kind: string;
  source: string;
}

/** A published speed for a rover, with its source. */
export interface RoverSpeed {
  rover: string;
  metresPerHour: number;
  /** What the source says the speed is: top speed on flat hard ground, typical traverse rate. */
  kind: string;
  source: string;
}

/** A published, measured energy rate for one vehicle on one body. The only kind of energy figure this library accepts. */
export interface EnergyRate {
  rover: string;
  whPerKm: number;
  kind: string;
  source: string;
  /** The body the rate was measured on. It is not applied to a route on another body. */
  body: 'moon' | 'mars' | 'earth';
}

export interface RouteSample {
  /** Horizontal distance from the start, metres. */
  distanceM: number;
  col: number;
  row: number;
  /** null where the tile has no data. */
  elevationM: number | null;
  /** Slope of the route itself from the previous sample to this one, degrees; positive uphill. null for the first sample or across a gap. */
  alongSlopeDeg: number | null;
  /** Steepest slope of the ground at this point, degrees, whatever the direction of travel. null near a gap or the tile edge. */
  terrainSlopeDeg: number | null;
}

export interface RouteResult {
  /** Horizontal length of the route, metres. */
  distanceM: number;
  /** Length along the ground, following the ups and downs seen at the tile's pixel size, metres. null when part of the route has no data. */
  surfaceDistanceM: number | null;
  /** Spacing of the samples, metres. */
  stepM: number;
  /** The distance over which slope is measured: the tile's pixel size. */
  baselineM: number;
  samples: RouteSample[];
  startElevationM: number | null;
  endElevationM: number | null;
  minElevationM: number | null;
  maxElevationM: number | null;
  /** Sum of all climbs and of all descents along the route, metres. */
  ascentM: number;
  descentM: number;
  /** Steepest climb and steepest descent of the route itself, degrees (both given as positive numbers). */
  maxUphillDeg: number | null;
  maxDownhillDeg: number | null;
  /** Mean of the absolute along-route slope, degrees. */
  meanAlongSlopeDeg: number | null;
  /** Steepest ground crossed, degrees. */
  maxTerrainSlopeDeg: number | null;
  /** Share of the route's length (0 to 1) where the ground is steeper than the limit. null when no limit was given. */
  shareAboveLimit: number | null;
  /** The same share for the slope of the route itself, uphill or downhill. Never larger than shareAboveLimit would suggest by much: a route can cross a steep slope sideways. */
  shareAlongAboveLimit: number | null;
  /** Metres of route above the limit (by ground slope). */
  distanceAboveLimitM: number | null;
  limit: SlopeLimit | null;
  /** Share of the route with no elevation data, 0 to 1. */
  noDataShare: number;
  /** Driving time at a published rover speed, hours. A lower bound: no stops, no slowing on slopes. null when no speed was given. */
  drivingTimeH: number | null;
  speed: RoverSpeed | null;
  /**
   * Energy for the route at a published, measured rate per km, in watt-hours. null unless a rate was
   * given and the route is on the body the rate was measured on. Not adjusted for slope: no cited
   * model of energy against slope exists.
   */
  energyWh: number | null;
  energy: EnergyRate | null;
  /** Plain sentences that must be shown with the numbers. */
  notes: string[];
}

function at(tile: ElevationTile, col: number, row: number): number {
  if (col < 0 || row < 0 || col >= tile.size || row >= tile.size) return Number.NaN;
  const v = tile.data[row * tile.size + col];
  return typeof v === 'number' ? v : Number.NaN;
}

/** Elevation at a point, by bilinear interpolation between the four posts around it. null outside the tile or beside a gap. */
export function elevationAt(tile: ElevationTile, col: number, row: number): number | null {
  if (!(col >= 0 && row >= 0 && col <= tile.size - 1 && row <= tile.size - 1)) return null;
  const c0 = Math.min(Math.floor(col), tile.size - 2 < 0 ? 0 : tile.size - 2);
  const r0 = Math.min(Math.floor(row), tile.size - 2 < 0 ? 0 : tile.size - 2);
  const fc = col - c0;
  const fr = row - r0;
  const a = at(tile, c0, r0);
  const b = at(tile, c0 + 1, r0);
  const c = at(tile, c0, r0 + 1);
  const d = at(tile, c0 + 1, r0 + 1);
  // On a post or an edge line only the posts that carry weight need data.
  const w = [(1 - fc) * (1 - fr), fc * (1 - fr), (1 - fc) * fr, fc * fr];
  const v = [a, b, c, d];
  let sum = 0;
  for (let i = 0; i < 4; i += 1) {
    if ((w[i] as number) === 0) continue;
    if (Number.isNaN(v[i] as number)) return null;
    sum += (w[i] as number) * (v[i] as number);
  }
  return sum;
}

/**
 * Steepest slope of the ground at a point, in degrees, from central differences one pixel either
 * side. null when a neighbour is missing.
 */
export function terrainSlopeAt(tile: ElevationTile, col: number, row: number): number | null {
  const e = elevationAt(tile, col + 1, row);
  const w = elevationAt(tile, col - 1, row);
  const n = elevationAt(tile, col, row - 1);
  const s = elevationAt(tile, col, row + 1);
  if (e === null || w === null || n === null || s === null) return null;
  const dzdx = (e - w) / (2 * tile.pixelM);
  const dzdy = (n - s) / (2 * tile.pixelM);
  return (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI;
}

/** A point given in metres east and south of the tile's north-west pixel centre. */
export function pointFromMetres(tile: ElevationTile, eastM: number, southM: number): TilePoint {
  return { col: eastM / tile.pixelM, row: southM / tile.pixelM };
}

/**
 * The tile point of a latitude and longitude, for a tile in a local orthographic projection centred
 * on (centreLat, centreLon) with north up, as data/extracts are. `radiusM` is the body's radius.
 */
export function pointFromLatLon(tile: ElevationTile, centreLat: number, centreLon: number, radiusM: number, lat: number, lon: number): TilePoint {
  const rad = Math.PI / 180;
  const dLon = (lon - centreLon) * rad;
  const x = radiusM * Math.cos(lat * rad) * Math.sin(dLon);
  const y = radiusM * (Math.cos(centreLat * rad) * Math.sin(lat * rad) - Math.sin(centreLat * rad) * Math.cos(lat * rad) * Math.cos(dLon));
  const mid = (tile.size - 1) / 2;
  return { col: mid + x / tile.pixelM, row: mid - y / tile.pixelM };
}

export interface RouteOptions {
  /** Spacing of the samples in metres. Default: the tile's pixel size. Never finer than half a pixel. */
  stepM?: number;
  limit?: SlopeLimit | null;
  speed?: RoverSpeed | null;
  /** A measured energy rate, and the body this tile is on. Energy is given only when the two bodies agree. */
  energy?: EnergyRate | null;
  body?: 'moon' | 'mars' | 'earth';
}

const deg = (rise: number, run: number): number => (Math.atan2(rise, run) * 180) / Math.PI;
const round = (v: number, d: number): number => Math.round(v * 10 ** d) / 10 ** d;

/**
 * Measures a route through the waypoints, in order, along straight legs.
 * Throws RangeError for fewer than two waypoints or a tile that is not square.
 */
export function measureRoute(tile: ElevationTile, waypoints: readonly TilePoint[], options: RouteOptions = {}): RouteResult {
  if (!(tile.size >= 2) || tile.data.length !== tile.size * tile.size || !(tile.pixelM > 0)) throw new RangeError('not a valid elevation tile');
  if (waypoints.length < 2) throw new RangeError('a route needs at least two waypoints');
  const stepM = Math.max(tile.pixelM / 2, options.stepM ?? tile.pixelM);

  // Sample points: every waypoint, and evenly spaced points along each leg.
  const points: { col: number; row: number; distanceM: number }[] = [];
  let travelled = 0;
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const a = waypoints[i] as TilePoint;
    const b = waypoints[i + 1] as TilePoint;
    const legM = Math.hypot(b.col - a.col, b.row - a.row) * tile.pixelM;
    const n = Math.max(1, Math.round(legM / stepM));
    for (let k = i === 0 ? 0 : 1; k <= n; k += 1) {
      const f = k / n;
      points.push({ col: a.col + (b.col - a.col) * f, row: a.row + (b.row - a.row) * f, distanceM: travelled + legM * f });
    }
    travelled += legM;
  }

  const samples: RouteSample[] = [];
  let ascent = 0;
  let descent = 0;
  let surface = 0;
  let surfaceKnown = true;
  let maxUp: number | null = null;
  let maxDown: number | null = null;
  let maxTerrain: number | null = null;
  let alongSum = 0;
  let alongLen = 0;
  let noDataLen = 0;
  let aboveTerrainLen = 0;
  let aboveAlongLen = 0;
  let judgedLen = 0;
  const limitDeg = options.limit?.limitDeg ?? null;

  for (let i = 0; i < points.length; i += 1) {
    const p = points[i] as (typeof points)[number];
    const z = elevationAt(tile, p.col, p.row);
    const terrain = z === null ? null : terrainSlopeAt(tile, p.col, p.row);
    let along: number | null = null;
    if (i > 0) {
      const prev = samples[i - 1] as RouteSample;
      const run = p.distanceM - prev.distanceM;
      if (z !== null && prev.elevationM !== null && run > 0) {
        const rise = z - prev.elevationM;
        along = deg(rise, run);
        if (rise > 0) ascent += rise;
        else descent -= rise;
        surface += Math.hypot(run, rise);
        alongSum += Math.abs(along) * run;
        alongLen += run;
        if (along > 0) maxUp = Math.max(maxUp ?? 0, along);
        if (along < 0) maxDown = Math.max(maxDown ?? 0, -along);
        if (limitDeg !== null) {
          // The ground slope of a segment is the steeper of its two ends, where both are known.
          const ends = [terrain, prev.terrainSlopeDeg].filter((v): v is number => v !== null);
          const ground = ends.length > 0 ? Math.max(...ends) : Math.abs(along);
          judgedLen += run;
          if (ground > limitDeg) aboveTerrainLen += run;
          if (Math.abs(along) > limitDeg) aboveAlongLen += run;
        }
      } else if (run > 0) {
        noDataLen += run;
        surfaceKnown = false;
      }
    }
    if (terrain !== null) maxTerrain = Math.max(maxTerrain ?? 0, terrain);
    samples.push({ distanceM: round(p.distanceM, 2), col: p.col, row: p.row, elevationM: z, alongSlopeDeg: along === null ? null : round(along, 2), terrainSlopeDeg: terrain === null ? null : round(terrain, 2) });
  }

  const known = samples.map((s) => s.elevationM).filter((v): v is number => v !== null);
  const notes: string[] = [
    `Slope is measured between elevation posts ${round(tile.pixelM, 0)} m apart. Rocks, steps and soft ground smaller than that are not seen, so a route within the limit here is not proven drivable.`,
  ];
  if (noDataLen > 0) notes.push(`${Math.round((noDataLen / travelled) * 100)}% of the route crosses ground with no elevation data and is left out of the slope figures.`);
  if (options.limit) notes.push(`Slope limit: ${options.limit.limitDeg} degrees, ${options.limit.kind} for ${options.limit.rover} (${options.limit.source}). The share above it uses the steepest slope of the ground, whichever way the rover faces.`);
  const drivingTimeH = options.speed && options.speed.metresPerHour > 0 ? travelled / options.speed.metresPerHour : null;
  if (options.speed && drivingTimeH !== null) notes.push(`Driving time uses ${options.speed.metresPerHour} m per hour, ${options.speed.kind} for ${options.speed.rover} (${options.speed.source}). It is a lower bound: no stops, no slowing on slopes, no planning time.`);
  let energyWh: number | null = null;
  if (options.energy && options.body && options.energy.body === options.body && options.energy.whPerKm > 0) {
    energyWh = (travelled / 1000) * options.energy.whPerKm;
    notes.push(`Energy uses ${options.energy.whPerKm} Wh per km, ${options.energy.kind} for ${options.energy.rover} (${options.energy.source}). It is a mission average for that vehicle and is not adjusted for the slopes of this route.`);
  } else if (options.energy && options.body && options.energy.body !== options.body) {
    notes.push(`No energy figure: the only published rate is for ${options.energy.rover} on ${options.energy.body === 'moon' ? 'the Moon' : options.energy.body === 'mars' ? 'Mars' : 'Earth'}, and this route is not there.`);
  } else {
    notes.push('No energy figure is given: no published, citable model of rover energy against slope was found that could be applied to a route.');
  }

  return {
    distanceM: round(travelled, 1),
    surfaceDistanceM: surfaceKnown ? round(surface, 1) : null,
    stepM,
    baselineM: tile.pixelM,
    samples,
    startElevationM: samples[0]?.elevationM ?? null,
    endElevationM: samples[samples.length - 1]?.elevationM ?? null,
    minElevationM: known.length > 0 ? Math.min(...known) : null,
    maxElevationM: known.length > 0 ? Math.max(...known) : null,
    ascentM: round(ascent, 1),
    descentM: round(descent, 1),
    maxUphillDeg: maxUp === null ? (alongLen > 0 ? 0 : null) : round(maxUp, 2),
    maxDownhillDeg: maxDown === null ? (alongLen > 0 ? 0 : null) : round(maxDown, 2),
    meanAlongSlopeDeg: alongLen > 0 ? round(alongSum / alongLen, 2) : null,
    maxTerrainSlopeDeg: maxTerrain === null ? null : round(maxTerrain, 2),
    shareAboveLimit: limitDeg === null || judgedLen === 0 ? null : round(aboveTerrainLen / judgedLen, 4),
    shareAlongAboveLimit: limitDeg === null || judgedLen === 0 ? null : round(aboveAlongLen / judgedLen, 4),
    distanceAboveLimitM: limitDeg === null || judgedLen === 0 ? null : round(aboveTerrainLen, 1),
    limit: options.limit ?? null,
    noDataShare: travelled > 0 ? round(noDataLen / travelled, 4) : 0,
    drivingTimeH: drivingTimeH === null ? null : round(drivingTimeH, 2),
    speed: options.speed ?? null,
    energyWh: energyWh === null ? null : round(energyWh, 1),
    energy: options.energy ?? null,
    notes,
  };
}

/** Reads a raw little-endian float32 elevation file of data/extracts into a tile. */
export function tileFromFloat32(buffer: ArrayBuffer, size: number, pixelM: number): ElevationTile {
  if (buffer.byteLength !== size * size * 4) throw new RangeError(`expected ${size * size * 4} bytes for a ${size} x ${size} tile, got ${buffer.byteLength}`);
  const view = new DataView(buffer);
  const data = new Float32Array(size * size);
  for (let i = 0; i < data.length; i += 1) data[i] = view.getFloat32(i * 4, true);
  return { size, pixelM, data };
}

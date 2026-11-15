// Rover route logic. Pure TypeScript, no UI and no file or network access. See README.md.

export { elevationAt, measureRoute, pointFromLatLon, pointFromMetres, terrainSlopeAt, tileFromFloat32 } from './route';
export type { ElevationTile, EnergyRate, RouteOptions, RouteResult, RouteSample, RoverSpeed, SlopeLimit, TilePoint } from './route';

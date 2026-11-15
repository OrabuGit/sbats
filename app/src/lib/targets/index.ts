// Targets from anywhere: named Moon and Mars places, and a target profile for any coordinates.
// Pure TypeScript, no UI and no file or network access. See README.md in this folder.

export { BODY_RADIUS_KM, distanceKm, formatPoint, kmPerDegree, normaliseLon, validPoint } from './geo';
export {
  CURATED_RADIUS_KM,
  GRID_SNAP_CELLS,
  KNOWN_SITE_RADIUS_KM,
  ROUGHNESS_SIGMA_FLOOR,
  SLOPE_SIGMA_FLOOR,
  nearestGridCell,
  nearestKnownSite,
  sharedCannotCopy,
  targetCoverage,
  targetFromKnownSite,
  targetFromPoint,
  tolerancesFrom,
} from './profile';
export type { TargetFromPointOptions, Tolerances } from './profile';
export type { BodyGrid, BodyGridCell, BodyGridFactor, KnownSite, KnownSitesFile, ProfileOrigin, TargetBody, TargetProfile } from './types';

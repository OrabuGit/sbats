// SBATS base simulation. Pure TypeScript, no UI and no file or network access.
// Implements app/src/lib/sim/README.md. See README.md in this folder.

export { MODULE_TYPES, RESOURCE_IDS } from './types';
export type {
  Badge, Body, DayState, Evaluation, EventEntry, GapReport, Layout, ModuleEntry, ModuleType, ModulesFile, PlacedModule,
  Readiness, ResourceBalance, ResourceId, ResourceStatus, SimEvent, SimOptions, Simulation, SiteConditions, Sourced, TargetSiteEntry,
} from './types';

export { MODULE_PARAMS, missingParams, param, validateModulesFile } from './catalog';
export { HORIZON_DAYS, countModules, evaluate } from './evaluate';
export { DEFAULT_DAYS, simulate } from './simulate';
export { DEFAULT_CANNOT_TEST, deployTwice } from './compare';
export { EARTH_TILT_DEG, earthLongestNightHours, siteFromEarthCell, siteFromTarget, topOfAtmosphereMeanWm2 } from './site';
export type { CellLike, TargetLike } from './site';
export { GRID_SIZE, LAYOUT_VERSION, LayoutError, MAX_MODULES, decodeLayout, encodeLayout, layoutFromJson, layoutToJson, validateLayout } from './layout';
export type { SavedLayout } from './layout';

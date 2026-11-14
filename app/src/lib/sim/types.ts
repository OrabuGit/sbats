// Types for the SBATS base simulation. Pure data: no UI, no file access.
// Module numbers come from data/modules.json, every one with a source. See README.md in this folder.

export const MODULE_TYPES = ['habitat', 'solar', 'battery', 'greenhouse', 'iceMiner', 'landingPad'] as const;
export type ModuleType = (typeof MODULE_TYPES)[number];

/** The resources shown in the live panel (DESIGN.md section 5, checkpoint 3). */
export const RESOURCE_IDS = ['power', 'water', 'oxygen', 'food', 'crew'] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];

export type Badge = 'Measured' | 'Mission' | 'Literature';
export type Body = 'earth' | 'moon' | 'mars';

/** One number in data/modules.json. `value` is null when no source could be found. */
export interface Sourced {
  value: number | null;
  unit: string;
  source: string | null;
  badge: Badge | null;
  note?: string;
  /** True when the value is one multiplication or division of numbers printed in the source. The note shows the arithmetic. */
  derived?: boolean;
}

export interface ModuleEntry {
  label: string;
  description: string;
  params: Record<string, Sourced>;
}

export interface EventEntry {
  label: string;
  description: string;
  /** Which body the event belongs to. */
  body: 'moon' | 'mars';
  params: { durationDays: Sourced; solarFactor: Sourced };
}

export interface TargetSiteEntry {
  irradianceWm2: Sourced;
  litFraction: Sourced;
  longestDarkHours: Sourced;
  iceAvailability: Sourced;
  /** Mars targets only: sunlight in a planet-wide dust storm as a share of normal, 0 to 1. */
  dustStormSolarFactor?: Sourced;
}

/** data/modules.json */
export interface ModulesFile {
  meta: { note: string; [extra: string]: unknown };
  crew: { oxygenKgPerDay: Sourced; waterKgPerDay: Sourced; foodKgPerDay: Sourced };
  constants: { oxygenKgPerKgWater: Sourced; solarConstantWm2: Sourced };
  modules: Record<ModuleType, ModuleEntry>;
  events: { lunarNight: EventEntry; marsDustStorm: EventEntry };
  /** Sunlight, darkness and ice at each target, keyed by target id from targets.json. */
  sites: Record<string, TargetSiteEntry>;
}

export interface PlacedModule {
  type: ModuleType;
  /** Grid position, 0 to 35 on each axis. */
  x: number;
  y: number;
}

/** A base design. Small enough to put in a URL (see layout.ts). */
export interface Layout {
  modules: PlacedModule[];
  /** Crew on site. Defaults to every habitat place being filled. */
  crew?: number;
}

/** The conditions a layout is run under: an Earth cell or a Moon or Mars target. */
export interface SiteConditions {
  id: string;
  name: string;
  body: Body;
  /** Sunlight on the arrays while the Sun is up, W/m2. */
  irradianceWm2: number | null;
  /** Share of the time the arrays are lit, 0 to 1. */
  litFraction: number | null;
  /** Longest continuous period without sunlight, hours. Sizes the batteries. */
  longestDarkHours: number | null;
  /** Annual mean temperature, deg C. Drives the heating load. */
  tempMeanC: number | null;
  /** Mean slope, degrees. A landing pad needs flat ground. */
  slopeDeg: number | null;
  /** Share of an ice miner's nominal output this site can give, 0 to 1. 0 means no accessible ice. */
  iceAvailability: number | null;
  /** Sunlight in a dust storm at this site as a share of normal, when it is known. Overrides the event's own factor. */
  dustStormSolarFactor?: number | null;
  /** True when irradianceWm2 is a top-of-atmosphere figure: an upper bound, with no air or cloud. */
  irradianceIsUpperBound?: boolean;
  /** Sentences on what Earth cannot reproduce here (targets.json `cannotCopy`). Used to end the gap report. */
  cannotTest?: string[];
  /** Notes on where each condition came from, or why it is missing. */
  notes: string[];
}

export type ResourceStatus = 'ok' | 'reserves' | 'short' | 'unknown';
export type Readiness = 'GREEN' | 'AMBER' | 'RED';

export interface ResourceBalance {
  id: ResourceId;
  label: string;
  unit: string;
  /** Per-day production, or supply for crew places. null when it cannot be computed. */
  production: number | null;
  consumption: number | null;
  /** production minus consumption. */
  net: number | null;
  status: ResourceStatus;
  /** One plain sentence on the status. */
  note: string;
}

export interface Evaluation {
  site: SiteConditions;
  counts: Record<ModuleType, number>;
  crew: number;
  crewCapacity: number | null;
  /** Average electrical power, kW. */
  power: {
    perArrayKw: number | null;
    productionKw: number | null;
    consumptionKw: number | null;
    netKw: number | null;
    heatingKw: number | null;
    batteryKwh: number | null;
    /** Energy needed to ride through the longest dark period, kWh. */
    darkDemandKwh: number | null;
    /** How long the batteries carry the base with no sunlight, hours. */
    batteryHours: number | null;
  };
  /** kg per day. */
  water: { producedKgDay: number | null; consumedKgDay: number | null; netKgDay: number | null };
  oxygen: { producedKgDay: number | null; consumedKgDay: number | null; netKgDay: number | null; fromElectrolysisKgDay: number | null };
  food: { producedKgDay: number | null; consumedKgDay: number | null; netKgDay: number | null };
  /** Whether cargo can land here: the site slope against the pad's limit. null when it cannot be judged. */
  landingPossible: boolean | null;
  /** Cargo one delivery brings, summed over usable pads, kg. */
  cargoKgPerDelivery: number | null;
  /** Mass of every placed module, kg. null if any placed module has no sourced mass. */
  deliveredMassKg: number | null;
  resources: Record<ResourceId, ResourceBalance>;
  /** null when a resource cannot be judged for lack of data: shown as "no data", never guessed. */
  readiness: Readiness | null;
  /** True when a placed module uses a parameter with no source: its effect is left out and it must be labelled. */
  illustrative: boolean;
  /** Module types placed here whose output is illustrative, with the parameters that are missing. */
  illustrativeModules: { type: ModuleType; missing: string[] }[];
  notes: string[];
}

export interface SimEvent {
  type: 'lunarNight' | 'marsDustStorm';
  /** First day of the event, 1-based. */
  startDay: number;
}

export interface SimOptions {
  /** Days to simulate. Default 30. */
  days?: number;
  /** Cargo delivery every N days. null or absent: no resupply. */
  resupplyEveryDays?: number | null;
  events?: SimEvent[];
}

export interface DayState {
  day: number;
  /** Events active on this day. */
  events: SimEvent['type'][];
  /** Stocks at the end of the day. */
  batteryKwh: number | null;
  waterKg: number | null;
  oxygenKg: number | null;
  foodKg: number | null;
  solarKw: number | null;
  /** Modules switched off this day because power ran short. */
  shed: ModuleType[];
  /** Cargo delivered this day, kg. */
  deliveredKg: number;
  /** Resources that ran out on this day. */
  depleted: ResourceId[];
}

export interface Simulation {
  days: DayState[];
  /** The first resource to run out, and the day it did. null if nothing ran out. */
  firstDepletion: { resource: ResourceId; day: number } | null;
  /** Readiness over the whole run. null when it cannot be judged. */
  readiness: Readiness | null;
  /** Days survived with no resupply (DESIGN.md section 8). */
  sustainability: {
    days: number;
    /** True when nothing ran out before the last simulated day: the true figure is at least `days`. */
    reachedHorizon: boolean;
    firstResource: ResourceId | null;
  } | null;
  /** Stocks the base starts with, from the first cargo delivery. */
  initialStock: { waterKg: number; oxygenKg: number; foodKg: number; batteryKwh: number | null };
  notes: string[];
}

export interface GapReport {
  earth: Evaluation;
  target: Evaluation;
  /** One plain sentence per difference. The last lines always say what the Earth rehearsal cannot test. */
  lines: string[];
  /** The closing lines on their own. Never empty. */
  cannotTest: string[];
}

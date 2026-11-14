import { MODULE_TYPES } from './types';
import type { EventEntry, ModuleType, ModulesFile, Sourced } from './types';

/** The parameters each module must list in data/modules.json. A value may be null; the key may not be absent. */
export const MODULE_PARAMS: Record<ModuleType, readonly string[]> = {
  habitat: ['massKg', 'crewCapacity', 'powerKw', 'heatingKwPerDegC', 'comfortTempC'],
  solar: ['massKg', 'ratedPowerKw', 'ratedIrradianceWm2'],
  battery: ['massKg', 'capacityKwh'],
  greenhouse: ['massKg', 'growingAreaM2', 'foodKgPerM2Day', 'oxygenKgPerM2Day', 'waterKgPerM2Day', 'powerKwPerM2'],
  iceMiner: ['massKg', 'waterKgPerDay', 'powerKw', 'electrolysisKwhPerKgOxygen'],
  landingPad: ['massKg', 'cargoKgPerDelivery', 'maxSlopeDeg'],
};

const BADGES = ['Measured', 'Mission', 'Literature'];

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** The number behind a module parameter, or null when it has no sourced value. */
export function param(file: ModulesFile, type: ModuleType, key: string): number | null {
  const v = file.modules[type]?.params[key]?.value;
  return isNumber(v) ? v : null;
}

export function sourcedValue(s: Sourced | undefined): number | null {
  return s && isNumber(s.value) ? s.value : null;
}

/** Parameters of a module that have no sourced value. A module with any is "illustrative". */
export function missingParams(file: ModulesFile, type: ModuleType): string[] {
  return MODULE_PARAMS[type].filter((key) => param(file, type, key) === null);
}

function checkSourced(where: string, s: Sourced | undefined, problems: string[]): void {
  if (!s || typeof s !== 'object') {
    problems.push(`${where}: missing`);
    return;
  }
  if (typeof s.unit !== 'string') problems.push(`${where}: unit must be a string`);
  if (s.value === null) {
    if (s.source !== null || s.badge !== null) problems.push(`${where}: a null value must have null source and badge`);
    if (typeof s.note !== 'string' || s.note.trim() === '') problems.push(`${where}: a null value needs a note saying why`);
    return;
  }
  if (!isNumber(s.value)) problems.push(`${where}: value must be a number or null`);
  if (typeof s.source !== 'string' || s.source.trim() === '') problems.push(`${where}: a value needs a source`);
  if (s.badge === null || !BADGES.includes(s.badge)) problems.push(`${where}: badge must be Measured, Mission or Literature`);
}

/**
 * Checks data/modules.json against the rules: every expected number is listed, every value has a
 * source and a badge, and every null says why. Returns a list of problems, empty when valid.
 */
export function validateModulesFile(file: ModulesFile): string[] {
  const problems: string[] = [];
  for (const key of ['oxygenKgPerDay', 'waterKgPerDay', 'foodKgPerDay'] as const) checkSourced(`crew.${key}`, file.crew?.[key], problems);
  for (const key of ['oxygenKgPerKgWater', 'solarConstantWm2'] as const) checkSourced(`constants.${key}`, file.constants?.[key], problems);
  for (const type of MODULE_TYPES) {
    const m = file.modules?.[type];
    if (!m) {
      problems.push(`modules.${type}: missing`);
      continue;
    }
    if (typeof m.label !== 'string' || m.label === '') problems.push(`modules.${type}: label is empty`);
    for (const key of MODULE_PARAMS[type]) checkSourced(`modules.${type}.params.${key}`, m.params?.[key], problems);
  }
  for (const id of ['lunarNight', 'marsDustStorm'] as const) {
    const e: EventEntry | undefined = file.events?.[id];
    if (!e) {
      problems.push(`events.${id}: missing`);
      continue;
    }
    checkSourced(`events.${id}.params.durationDays`, e.params?.durationDays, problems);
    checkSourced(`events.${id}.params.solarFactor`, e.params?.solarFactor, problems);
    const factor = e.params?.solarFactor?.value;
    if (isNumber(factor) && (factor < 0 || factor > 1)) problems.push(`events.${id}.params.solarFactor: must be between 0 and 1`);
  }
  for (const [id, site] of Object.entries(file.sites ?? {})) {
    for (const key of ['irradianceWm2', 'litFraction', 'longestDarkHours', 'iceAvailability'] as const) {
      checkSourced(`sites.${id}.${key}`, site?.[key], problems);
    }
    for (const key of ['litFraction', 'iceAvailability'] as const) {
      const v = site?.[key]?.value;
      if (isNumber(v) && (v < 0 || v > 1)) problems.push(`sites.${id}.${key}: must be between 0 and 1`);
    }
    if (site?.dustStormSolarFactor !== undefined) {
      checkSourced(`sites.${id}.dustStormSolarFactor`, site.dustStormSolarFactor, problems);
      const v = site.dustStormSolarFactor?.value;
      if (isNumber(v) && (v < 0 || v > 1)) problems.push(`sites.${id}.dustStormSolarFactor: must be between 0 and 1`);
    }
  }
  return problems;
}

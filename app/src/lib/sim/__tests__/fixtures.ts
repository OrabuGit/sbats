// TEST FIXTURES. Made-up round numbers so that expected results can be worked out by hand.
// None of these is a real engineering value. Real values live in data/modules.json with sources.

import type { Layout, ModuleType, ModulesFile, SiteConditions, Sourced } from '../types';

export function s(value: number | null, unit = ''): Sourced {
  return value === null
    ? { value: null, unit, source: null, badge: null, note: 'fixture: no source' }
    : { value, unit, source: 'fixture', badge: 'Literature' };
}

export function makeFile(): ModulesFile {
  return {
    meta: { note: 'TEST FIXTURE, not real data' },
    crew: { oxygenKgPerDay: s(1, 'kg'), waterKgPerDay: s(3, 'kg'), foodKgPerDay: s(1, 'kg') },
    constants: { oxygenKgPerKgWater: s(0.8), solarConstantWm2: s(1000, 'W/m2') },
    modules: {
      habitat: { label: 'Habitat', description: 'fixture', params: { massKg: s(10000), crewCapacity: s(4), powerKw: s(5), heatingKwPerDegC: s(0.1), comfortTempC: s(20) } },
      solar: { label: 'Solar array', description: 'fixture', params: { massKg: s(500), areaM2: s(100), efficiency: s(0.2) } },
      battery: { label: 'Battery', description: 'fixture', params: { massKg: s(200), capacityKwh: s(100) } },
      greenhouse: {
        label: 'Greenhouse', description: 'fixture',
        params: { massKg: s(1000), growingAreaM2: s(50), foodKgPerM2Day: s(0.02), oxygenKgPerM2Day: s(0.03), waterKgPerM2Day: s(0.1), powerKwPerM2: s(0.1) },
      },
      iceMiner: { label: 'Ice miner', description: 'fixture', params: { massKg: s(800), waterKgPerDay: s(50), powerKw: s(4), electrolysisKwhPerKgOxygen: s(6) } },
      landingPad: { label: 'Landing pad', description: 'fixture', params: { massKg: s(100), cargoKgPerDelivery: s(3000), maxSlopeDeg: s(5) } },
    },
    events: {
      lunarNight: { label: 'Lunar night', description: 'fixture', body: 'moon', params: { durationDays: s(14), solarFactor: s(0) } },
      marsDustStorm: { label: 'Mars dust storm', description: 'fixture', body: 'mars', params: { durationDays: s(10), solarFactor: s(0.1) } },
    },
    sites: {
      'mars-fixture': { irradianceWm2: s(500), litFraction: s(0.5), longestDarkHours: s(12), iceAvailability: s(1) },
    },
  };
}

/** Earth fixture site: each array gives 800 x 100 x 0.2 x 0.5 / 1000 = 8 kW; a habitat draws 5 + 0.1 x 10 = 6 kW. */
export function earthSite(overrides: Partial<SiteConditions> = {}): SiteConditions {
  return { id: 'earth:fixture', name: 'Earth fixture', body: 'earth', irradianceWm2: 800, litFraction: 0.5, longestDarkHours: 12, tempMeanC: 10, slopeDeg: 2, iceAvailability: 0, notes: [], ...overrides };
}

/** Mars fixture site: each array gives 5 kW; a habitat draws 5 + 0.1 x 80 = 13 kW; ice is fully available. */
export function marsSite(overrides: Partial<SiteConditions> = {}): SiteConditions {
  return { id: 'mars-fixture', name: 'Mars fixture', body: 'mars', irradianceWm2: 500, litFraction: 0.5, longestDarkHours: 12, tempMeanC: -60, slopeDeg: 2, iceAvailability: 1, notes: [], ...overrides };
}

/** Moon fixture site: each array gives 1000 x 100 x 0.2 x 0.8 / 1000 = 16 kW; a habitat draws 5 + 0.1 x 170 = 22 kW. */
export function moonSite(overrides: Partial<SiteConditions> = {}): SiteConditions {
  return { id: 'moon-fixture', name: 'Moon fixture', body: 'moon', irradianceWm2: 1000, litFraction: 0.8, longestDarkHours: 48, tempMeanC: -150, slopeDeg: 3, iceAvailability: 0.5, notes: [], ...overrides };
}

/** Builds a layout from counts, placing modules along rows of the grid. */
export function layoutOf(counts: Partial<Record<ModuleType, number>>, crew?: number): Layout {
  const modules: Layout['modules'] = [];
  let i = 0;
  for (const [type, n] of Object.entries(counts) as [ModuleType, number][]) {
    for (let k = 0; k < n; k++) {
      modules.push({ type, x: i % 36, y: Math.floor(i / 36) });
      i++;
    }
  }
  return crew === undefined ? { modules } : { modules, crew };
}

export function near(actual: number | null | undefined, expected: number, tolerance = 1e-6): boolean {
  return typeof actual === 'number' && Math.abs(actual - expected) <= tolerance;
}

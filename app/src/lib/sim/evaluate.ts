import { missingParams, param, sourcedValue } from './catalog';
import { MODULE_TYPES } from './types';
import type { Evaluation, Layout, ModuleType, ModulesFile, Readiness, ResourceBalance, ResourceId, ResourceStatus, SiteConditions } from './types';

/** Days a base must last on stored reserves and scheduled cargo to count as AMBER rather than RED. */
export const HORIZON_DAYS = 30;

export function countModules(layout: Layout): Record<ModuleType, number> {
  const counts = {} as Record<ModuleType, number>;
  for (const t of MODULE_TYPES) counts[t] = 0;
  for (const m of layout.modules) counts[m.type] += 1;
  return counts;
}

/** Multiplies numbers, giving null as soon as one of them is null: an unknown input is an unknown output. */
function times(...xs: (number | null)[]): number | null {
  let product = 1;
  for (const x of xs) {
    if (x === null) return null;
    product *= x;
  }
  return product;
}

function plus(...xs: (number | null)[]): number | null {
  let sum = 0;
  for (const x of xs) {
    if (x === null) return null;
    sum += x;
  }
  return sum;
}

/** `count` copies of something worth `each`. Zero copies is zero even when `each` is unknown. */
function copies(count: number, each: number | null): number | null {
  return count === 0 ? 0 : times(count, each);
}

export interface Switches {
  /** Multiplies sunlight. 1 is normal, 0 is a lunar night, a small number a dust storm. */
  solarFactor?: number;
  /** False switches the greenhouses off for lack of power. */
  greenhouseOn?: boolean;
  /** False switches the ice miners and electrolysis off for lack of power. */
  minerOn?: boolean;
}

/** Every daily flow of a layout at a site. Shared by the steady-state evaluation and the day-by-day run. */
export interface Flows {
  counts: Record<ModuleType, number>;
  crew: number;
  crewCapacity: number | null;
  perArrayKw: number | null;
  solarKw: number | null;
  habitatKw: number | null;
  heatingKw: number | null;
  greenhouseKw: number | null;
  minerKw: number | null;
  electrolysisKw: number | null;
  waterProduced: number | null;
  waterCrew: number | null;
  waterGreenhouse: number | null;
  waterElectrolysis: number | null;
  oxygenGreenhouse: number | null;
  oxygenElectrolysis: number | null;
  oxygenCrew: number | null;
  foodProduced: number | null;
  foodCrew: number | null;
  notes: string[];
}

/**
 * The model, in one place (DESIGN.md section 8).
 *
 *   crew places   = habitats x crewCapacity
 *   solar power   = arrays x irradiance x area x efficiency x litFraction            (P = I A eff lit)
 *   habitat power = habitats x (powerKw + heatingKwPerDegC x max(0, comfortTempC - site temperature))
 *   greenhouse    = area x per-m2 rates for food, oxygen, water and power
 *   ice miner     = waterKgPerDay x site ice availability; idle, drawing nothing, where there is no ice
 *   electrolysis  = only as much surplus water as the crew's oxygen shortfall needs
 *   crew needs    = crew x per-person oxygen, water and food
 *
 * A parameter with no source makes what depends on it unknown (null), never zero and never a guess.
 * The heating load is the one refinement that is simply left out, with a note, when it cannot be computed.
 */
export function flows(layout: Layout, site: SiteConditions, file: ModulesFile, sw: Switches = {}): Flows {
  const counts = countModules(layout);
  const notes: string[] = [];
  const solarFactor = sw.solarFactor ?? 1;
  const greenhouseOn = sw.greenhouseOn ?? true;
  const minerOn = sw.minerOn ?? true;

  const crewCapacity = copies(counts.habitat, param(file, 'habitat', 'crewCapacity'));
  const crew = Math.max(0, layout.crew ?? crewCapacity ?? 0);

  // Power
  const perArrayKw = times(site.irradianceWm2, param(file, 'solar', 'areaM2'), param(file, 'solar', 'efficiency'), site.litFraction, 0.001);
  const solarKw = copies(counts.solar, times(perArrayKw, solarFactor));

  let heatingEach: number | null = null;
  const perDeg = param(file, 'habitat', 'heatingKwPerDegC');
  const comfort = param(file, 'habitat', 'comfortTempC');
  if (counts.habitat > 0) {
    if (perDeg === null || comfort === null) notes.push('Heating load is not modelled: no sourced value for heat loss per degree.');
    else if (site.tempMeanC === null) notes.push(`Heating load is left out: no temperature for ${site.name}.`);
    else heatingEach = perDeg * Math.max(0, comfort - site.tempMeanC);
  }
  const heatingKw = heatingEach === null ? null : counts.habitat * heatingEach;
  const habitatKw = plus(copies(counts.habitat, param(file, 'habitat', 'powerKw')), heatingKw ?? 0);

  const area = param(file, 'greenhouse', 'growingAreaM2');
  const greenhouses = greenhouseOn ? counts.greenhouse : 0;
  const greenhouseKw = copies(greenhouses, times(area, param(file, 'greenhouse', 'powerKwPerM2')));
  const foodProduced = copies(greenhouses, times(area, param(file, 'greenhouse', 'foodKgPerM2Day')));
  const oxygenGreenhouse = copies(greenhouses, times(area, param(file, 'greenhouse', 'oxygenKgPerM2Day')));
  const waterGreenhouse = copies(greenhouses, times(area, param(file, 'greenhouse', 'waterKgPerM2Day')));

  // Ice miner. Where there is no accessible ice it cannot be exercised: it sits idle and draws nothing.
  let miners = minerOn ? counts.iceMiner : 0;
  if (counts.iceMiner > 0 && site.iceAvailability === 0) {
    miners = 0;
    notes.push(`No accessible ice at ${site.name}: the ice miner cannot be exercised here.`);
  }
  const waterProduced = copies(miners, times(param(file, 'iceMiner', 'waterKgPerDay'), site.iceAvailability));
  const minerKw = copies(miners, param(file, 'iceMiner', 'powerKw'));

  // Crew
  const waterCrew = copies(crew, sourcedValue(file.crew.waterKgPerDay));
  const oxygenCrew = copies(crew, sourcedValue(file.crew.oxygenKgPerDay));
  const foodCrew = copies(crew, sourcedValue(file.crew.foodKgPerDay));

  // Electrolysis: turn surplus water into oxygen, only as much as the crew still needs.
  let oxygenElectrolysis: number | null = 0;
  let waterElectrolysis: number | null = 0;
  let electrolysisKw: number | null = 0;
  if (miners > 0) {
    const perKgWater = sourcedValue(file.constants.oxygenKgPerKgWater);
    const kwhPerKg = param(file, 'iceMiner', 'electrolysisKwhPerKgOxygen');
    if (perKgWater === null || kwhPerKg === null) {
      notes.push('Oxygen from electrolysis is not modelled: no sourced energy per kilogram of oxygen.');
    } else if (waterProduced === null || waterCrew === null || waterGreenhouse === null || oxygenCrew === null || oxygenGreenhouse === null) {
      oxygenElectrolysis = null;
      waterElectrolysis = null;
      electrolysisKw = null;
    } else {
      const shortfall = Math.max(0, oxygenCrew - oxygenGreenhouse);
      const surplusWater = Math.max(0, waterProduced - waterCrew - waterGreenhouse);
      oxygenElectrolysis = Math.min(shortfall, surplusWater * perKgWater);
      waterElectrolysis = oxygenElectrolysis / perKgWater;
      electrolysisKw = (oxygenElectrolysis * kwhPerKg) / 24;
    }
  }

  return {
    counts, crew, crewCapacity, perArrayKw, solarKw, habitatKw, heatingKw, greenhouseKw, minerKw, electrolysisKw,
    waterProduced, waterCrew, waterGreenhouse, waterElectrolysis,
    oxygenGreenhouse, oxygenElectrolysis, oxygenCrew, foodProduced, foodCrew, notes,
  };
}

const round = (v: number | null, d = 2): number | null => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);
const fmt = (v: number, d = 1): string => v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d });

/** Cargo mass one delivery brings, and whether cargo can land at all. */
export function cargo(counts: Record<ModuleType, number>, site: SiteConditions, file: ModulesFile): { landingPossible: boolean | null; kg: number | null; note: string | null } {
  if (counts.landingPad === 0) return { landingPossible: false, kg: 0, note: null };
  const limit = param(file, 'landingPad', 'maxSlopeDeg');
  if (limit === null || site.slopeDeg === null) {
    return { landingPossible: null, kg: null, note: `Cannot tell whether cargo can land at ${site.name}: ${limit === null ? 'no sourced slope limit' : 'no slope for the site'}.` };
  }
  if (site.slopeDeg > limit) {
    return {
      landingPossible: false, kg: 0,
      note: `The mean slope at ${site.name} is ${fmt(site.slopeDeg)} degrees, above the pad limit of ${fmt(limit)}: no cargo can land. The slope is an average over a 55 km window; a real pad needs one flat spot inside it.`,
    };
  }
  return { landingPossible: true, kg: copies(counts.landingPad, param(file, 'landingPad', 'cargoKgPerDelivery')), note: null };
}

function consumable(
  id: ResourceId, label: string, produced: number | null, consumed: number | null,
  reserveDays: number | null, resupplyCovers: boolean | null,
): ResourceBalance {
  const net = produced === null || consumed === null ? null : produced - consumed;
  let status: ResourceStatus;
  let note: string;
  if (net === null) {
    status = 'unknown';
    note = `${label} cannot be worked out: a number it depends on has no source.`;
  } else if (net >= -1e-9) {
    status = 'ok';
    note = consumed === 0 && produced === 0 ? `No ${label.toLowerCase()} is needed yet.` : `${label} is in balance: ${fmt(produced ?? 0)} kg made and ${fmt(consumed ?? 0)} kg used each day.`;
  } else if (resupplyCovers === null || reserveDays === null) {
    status = 'unknown';
    note = `${label} runs ${fmt(-net)} kg short each day, and it cannot be told whether cargo can make it up.`;
  } else if (reserveDays >= HORIZON_DAYS) {
    status = 'reserves';
    note = `${label} runs ${fmt(-net)} kg short each day. Delivered reserves cover ${fmt(reserveDays, 0)} days.`;
  } else {
    status = 'short';
    note = `${label} runs ${fmt(-net)} kg short each day and delivered reserves last ${fmt(reserveDays, 0)} days.`;
  }
  return { id, label, unit: 'kg/day', production: round(produced), consumption: round(consumed), net: round(net), status, note };
}

/**
 * Steady-state evaluation of a layout at one site: the resource panel and the readiness rating.
 *
 * Readiness (DESIGN.md section 8):
 *   GREEN  every balance is zero or positive, and the batteries carry the base through the longest dark period.
 *   AMBER  at least one of water, oxygen or food is short each day but the first cargo delivery covers 30 days.
 *   RED    something runs out: power in the dark, a consumable within 30 days, or more crew than places.
 * When a balance cannot be computed for lack of a sourced number, readiness is null ("no data"), unless
 * something else is already RED.
 */
export function evaluate(layout: Layout, site: SiteConditions, file: ModulesFile): Evaluation {
  const f = flows(layout, site, file);
  const { counts } = f;
  const notes = [...site.notes, ...f.notes];

  // Power
  const consumptionKw = plus(f.habitatKw, f.greenhouseKw, f.minerKw, f.electrolysisKw);
  const netKw = f.solarKw === null || consumptionKw === null ? null : f.solarKw - consumptionKw;
  const batteryKwh = copies(counts.battery, param(file, 'battery', 'capacityKwh'));
  const darkDemandKwh = times(consumptionKw, site.longestDarkHours);
  const batteryHours = batteryKwh === null || consumptionKw === null ? null : consumptionKw > 0 ? batteryKwh / consumptionKw : Infinity;

  let powerStatus: ResourceStatus;
  let powerNote: string;
  if (netKw === null) {
    powerStatus = 'unknown';
    powerNote = 'Power cannot be worked out: a number it depends on has no source.';
  } else if (netKw < -1e-9) {
    powerStatus = 'short';
    powerNote = `The arrays give ${fmt(f.solarKw ?? 0)} kW on average and the base draws ${fmt(consumptionKw ?? 0)} kW: ${fmt(-netKw)} kW short.`;
  } else if (consumptionKw === 0) {
    powerStatus = 'ok';
    powerNote = 'Nothing draws power yet.';
  } else if (darkDemandKwh === null || batteryKwh === null) {
    powerStatus = 'unknown';
    powerNote = 'Average power is enough, but it cannot be told whether the batteries last the longest dark period.';
  } else if (batteryKwh + 1e-9 < darkDemandKwh) {
    powerStatus = 'short';
    powerNote = `Power is enough on average, but the batteries last ${fmt(batteryHours ?? 0)} hours and the longest dark period is ${fmt(site.longestDarkHours ?? 0)} hours.`;
  } else {
    powerStatus = 'ok';
    powerNote = `The arrays give ${fmt(f.solarKw ?? 0)} kW against ${fmt(consumptionKw ?? 0)} kW drawn, and the batteries cover the longest dark period.`;
  }

  // Consumables and the cargo that backs them
  const waterConsumed = plus(f.waterCrew, f.waterGreenhouse, f.waterElectrolysis);
  const oxygenProduced = plus(f.oxygenGreenhouse, f.oxygenElectrolysis);
  const c = cargo(counts, site, file);
  if (c.note) notes.push(c.note);

  const deficits = [
    f.waterProduced === null || waterConsumed === null ? null : Math.max(0, waterConsumed - f.waterProduced),
    oxygenProduced === null || f.oxygenCrew === null ? null : Math.max(0, f.oxygenCrew - oxygenProduced),
    f.foodProduced === null || f.foodCrew === null ? null : Math.max(0, f.foodCrew - f.foodProduced),
  ];
  const totalDeficit = plus(...deficits);
  // One delivery is split between the short resources in proportion to their shortfall, so they all
  // run out on the same day: reserve days = cargo mass / total daily shortfall.
  const reserveDays = totalDeficit === null || c.kg === null ? null : totalDeficit === 0 ? Infinity : c.kg / totalDeficit;
  const covers = reserveDays === null ? null : reserveDays >= HORIZON_DAYS;

  const resources = {
    power: { id: 'power', label: 'Power', unit: 'kW', production: round(f.solarKw), consumption: round(consumptionKw), net: round(netKw), status: powerStatus, note: powerNote },
    water: consumable('water', 'Water', f.waterProduced, waterConsumed, reserveDays, covers),
    oxygen: consumable('oxygen', 'Oxygen', oxygenProduced, f.oxygenCrew, reserveDays, covers),
    food: consumable('food', 'Food', f.foodProduced, f.foodCrew, reserveDays, covers),
    crew: ((): ResourceBalance => {
      const cap = f.crewCapacity;
      const status: ResourceStatus = cap === null ? 'unknown' : f.crew > cap ? 'short' : 'ok';
      const note = cap === null ? 'Crew places cannot be worked out: the habitat has no sourced crew capacity.'
        : f.crew > cap ? `${f.crew} crew but only ${cap} habitat places.` : `${f.crew} crew in ${cap} habitat places.`;
      return { id: 'crew', label: 'Crew', unit: 'people', production: cap, consumption: f.crew, net: cap === null ? null : cap - f.crew, status, note };
    })(),
  } as Record<ResourceId, ResourceBalance>;

  const statuses = Object.values(resources).map((r) => r.status);
  let readiness: Readiness | null;
  if (statuses.includes('short')) readiness = 'RED';
  else if (statuses.includes('unknown')) readiness = null;
  else if (statuses.includes('reserves')) readiness = 'AMBER';
  else readiness = 'GREEN';

  const illustrativeModules = MODULE_TYPES.filter((t) => counts[t] > 0)
    .map((type) => ({ type, missing: missingParams(file, type) }))
    .filter((m) => m.missing.length > 0);

  let deliveredMassKg: number | null = 0;
  for (const t of MODULE_TYPES) deliveredMassKg = plus(deliveredMassKg, copies(counts[t], param(file, t, 'massKg')));

  return {
    site, counts, crew: f.crew, crewCapacity: f.crewCapacity,
    power: {
      perArrayKw: round(f.perArrayKw, 3), productionKw: round(f.solarKw), consumptionKw: round(consumptionKw), netKw: round(netKw),
      heatingKw: round(f.heatingKw), batteryKwh: round(batteryKwh), darkDemandKwh: round(darkDemandKwh),
      batteryHours: batteryHours === null || !Number.isFinite(batteryHours) ? null : round(batteryHours, 1),
    },
    water: { producedKgDay: round(f.waterProduced), consumedKgDay: round(waterConsumed), netKgDay: resources.water.net },
    oxygen: { producedKgDay: round(oxygenProduced), consumedKgDay: round(f.oxygenCrew), netKgDay: resources.oxygen.net, fromElectrolysisKgDay: round(f.oxygenElectrolysis) },
    food: { producedKgDay: round(f.foodProduced), consumedKgDay: round(f.foodCrew), netKgDay: resources.food.net },
    landingPossible: c.landingPossible,
    cargoKgPerDelivery: c.kg,
    deliveredMassKg,
    resources,
    readiness,
    illustrative: illustrativeModules.length > 0,
    illustrativeModules,
    notes,
  };
}

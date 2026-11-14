import { param, sourcedValue } from './catalog';
import { cargo, evaluate, flows } from './evaluate';
import type { Flows } from './evaluate';
import type { DayState, Layout, ModuleType, ModulesFile, Readiness, ResourceId, SimEvent, SimOptions, Simulation, SiteConditions } from './types';

export const DEFAULT_DAYS = 30;

interface ActiveEvent {
  type: SimEvent['type'];
  startDay: number;
  endDay: number;
  solarFactor: number;
}

/** Turns the requested events into day ranges, using the sourced duration and sunlight factor of each. */
function resolveEvents(events: readonly SimEvent[], site: SiteConditions, file: ModulesFile, notes: string[]): ActiveEvent[] {
  const out: ActiveEvent[] = [];
  for (const e of events) {
    const entry = file.events[e.type];
    if (!entry) {
      notes.push(`Unknown event "${e.type}" was ignored.`);
      continue;
    }
    if (entry.body !== site.body) {
      notes.push(`${entry.label} does not happen at ${site.name}: it was ignored.`);
      continue;
    }
    const duration = sourcedValue(entry.params.durationDays);
    const factor = sourcedValue(entry.params.solarFactor);
    if (duration === null || factor === null) {
      notes.push(`${entry.label} is not simulated: its duration or its effect on sunlight has no source.`);
      continue;
    }
    if (!(e.startDay >= 1)) {
      notes.push(`${entry.label} needs a start day of 1 or later: it was ignored.`);
      continue;
    }
    out.push({ type: e.type, startDay: e.startDay, endDay: e.startDay + Math.ceil(duration) - 1, solarFactor: factor });
  }
  return out;
}

const NEEDED: (keyof Flows)[] = [
  'solarKw', 'habitatKw', 'greenhouseKw', 'minerKw', 'electrolysisKw', 'waterProduced', 'waterCrew', 'waterGreenhouse',
  'waterElectrolysis', 'oxygenGreenhouse', 'oxygenElectrolysis', 'oxygenCrew', 'foodProduced', 'foodCrew',
];

function known(f: Flows): boolean {
  return NEEDED.every((k) => f[k] !== null);
}

function powerDraw(f: Flows): number {
  return (f.habitatKw ?? 0) + (f.greenhouseKw ?? 0) + (f.minerKw ?? 0) + (f.electrolysisKw ?? 0);
}

function deficits(f: Flows): { water: number; oxygen: number; food: number; total: number } {
  const water = Math.max(0, (f.waterCrew ?? 0) + (f.waterGreenhouse ?? 0) + (f.waterElectrolysis ?? 0) - (f.waterProduced ?? 0));
  const oxygen = Math.max(0, (f.oxygenCrew ?? 0) - (f.oxygenGreenhouse ?? 0) - (f.oxygenElectrolysis ?? 0));
  const food = Math.max(0, (f.foodCrew ?? 0) - (f.foodProduced ?? 0));
  return { water, oxygen, food, total: water + oxygen + food };
}

interface Run {
  days: DayState[];
  firstDepletion: { resource: ResourceId; day: number } | null;
  usedReserves: boolean;
}

/**
 * Day-by-day simulation (DESIGN.md section 8): each day adds production, subtracts crew use and
 * applies any active event.
 *
 * Start of the run: batteries full, and one cargo delivery already on the ground, split between
 * water, oxygen and food in proportion to their daily shortfall. With no usable landing pad there
 * is no stock.
 *
 * Each day:
 * 1. Sunlight is multiplied by the factor of every active event (0 in a lunar night).
 * 2. Power. Energy on hand is the day's solar energy plus the battery. The habitats are served first.
 *    If the rest cannot all run, the ice miners are switched off for the day, then the greenhouses.
 *    If even the habitats cannot be powered, power has run out. Whatever is left recharges the battery.
 * 3. Water, oxygen and food stocks change by what was made and used. A stock that would go below
 *    zero has run out.
 * 4. On a resupply day one cargo delivery arrives, split by the same rule as the first.
 *
 * The step is one day, so a night shorter than a day is not resolved here: the steady-state check in
 * evaluate() covers it (batteries against the longest dark period).
 */
function run(layout: Layout, site: SiteConditions, file: ModulesFile, days: number, events: ActiveEvent[], resupplyEvery: number | null, cargoKg: number, nominal: Flows): Run {
  const capacity = nominal.counts.battery * (param(file, 'battery', 'capacityKwh') ?? 0);
  const split = deficits(nominal);
  const share = (part: number, total: number, kg: number): number => (total > 0 ? (kg * part) / total : 0);

  let battery = capacity;
  let water = share(split.water, split.total, cargoKg);
  let oxygen = share(split.oxygen, split.total, cargoKg);
  let food = share(split.food, split.total, cargoKg);
  const out: DayState[] = [];
  let firstDepletion: Run['firstDepletion'] = null;
  let usedReserves = false;

  for (let day = 1; day <= days; day++) {
    const active = events.filter((e) => day >= e.startDay && day <= e.endDay);
    const solarFactor = active.reduce((f, e) => f * e.solarFactor, 1);
    const depleted: ResourceId[] = [];
    const shed: ModuleType[] = [];

    // Power, with load shedding: full base, then without miners, then without greenhouses too.
    const options = [
      { greenhouseOn: true, minerOn: true, off: [] as ModuleType[] },
      { greenhouseOn: true, minerOn: false, off: ['iceMiner'] as ModuleType[] },
      { greenhouseOn: false, minerOn: false, off: ['iceMiner', 'greenhouse'] as ModuleType[] },
    ];
    let f = flows(layout, site, file, { solarFactor });
    const solarKwh = (f.solarKw ?? 0) * 24;
    const onHand = solarKwh + battery;
    let chosen = false;
    for (const o of options) {
      const candidate = flows(layout, site, file, { solarFactor, greenhouseOn: o.greenhouseOn, minerOn: o.minerOn });
      if (powerDraw(candidate) * 24 <= onHand + 1e-9) {
        f = candidate;
        for (const t of o.off) if (nominal.counts[t] > 0) shed.push(t);
        chosen = true;
        break;
      }
      f = candidate;
    }
    if (chosen) {
      battery = Math.min(capacity, onHand - powerDraw(f) * 24);
    } else {
      // Not even the habitats can be powered.
      for (const t of ['iceMiner', 'greenhouse'] as ModuleType[]) if (nominal.counts[t] > 0) shed.push(t);
      battery = 0;
      depleted.push('power');
    }
    if (solarKwh + 1e-9 < powerDraw(f) * 24 && capacity > 0) usedReserves = true;

    const d = deficits(f);
    if (d.total > 0) usedReserves = true;
    water += (f.waterProduced ?? 0) - (f.waterCrew ?? 0) - (f.waterGreenhouse ?? 0) - (f.waterElectrolysis ?? 0);
    oxygen += (f.oxygenGreenhouse ?? 0) + (f.oxygenElectrolysis ?? 0) - (f.oxygenCrew ?? 0);
    food += (f.foodProduced ?? 0) - (f.foodCrew ?? 0);
    if (water < -1e-9) depleted.push('water');
    if (oxygen < -1e-9) depleted.push('oxygen');
    if (food < -1e-9) depleted.push('food');
    water = Math.max(0, water);
    oxygen = Math.max(0, oxygen);
    food = Math.max(0, food);

    let deliveredKg = 0;
    if (resupplyEvery !== null && cargoKg > 0 && day % resupplyEvery === 0 && split.total > 0) {
      deliveredKg = cargoKg;
      water += share(split.water, split.total, cargoKg);
      oxygen += share(split.oxygen, split.total, cargoKg);
      food += share(split.food, split.total, cargoKg);
    }

    if (!firstDepletion && depleted.length > 0) firstDepletion = { resource: depleted[0] as ResourceId, day };
    const r = (v: number): number => Math.round(v * 100) / 100;
    out.push({
      day, events: active.map((e) => e.type), batteryKwh: r(battery), waterKg: r(water), oxygenKg: r(oxygen), foodKg: r(food),
      solarKw: r(f.solarKw ?? 0), shed, deliveredKg, depleted,
    });
  }
  return { days: out, firstDepletion, usedReserves };
}

/**
 * Runs a layout at a site for 30 days (or `options.days`), with optional resupply and events.
 *
 * Returns the daily states, the first resource to run out, the readiness over the run, and the
 * sustainability score: the number of full days the base lasts with NO resupply, under the same events.
 * When a number the run depends on has no source, nothing is simulated and readiness is null.
 */
export function simulate(layout: Layout, site: SiteConditions, file: ModulesFile, options: SimOptions = {}): Simulation {
  const days = Math.max(1, Math.floor(options.days ?? DEFAULT_DAYS));
  const resupplyEvery = options.resupplyEveryDays && options.resupplyEveryDays >= 1 ? Math.floor(options.resupplyEveryDays) : null;
  const notes: string[] = [];
  const events = resolveEvents(options.events ?? [], site, file, notes);
  const nominal = flows(layout, site, file);
  const steady = evaluate(layout, site, file);
  const c = cargo(nominal.counts, site, file);
  const capacity = nominal.counts.battery === 0 ? 0 : param(file, 'battery', 'capacityKwh');
  const empty: Simulation = {
    days: [], firstDepletion: null, readiness: null, sustainability: null,
    initialStock: { waterKg: 0, oxygenKg: 0, foodKg: 0, batteryKwh: null }, notes,
  };

  if (!known(nominal) || capacity === null) {
    notes.push('The run cannot be simulated: a number it depends on has no source. See the illustrative modules.');
    return empty;
  }
  const d = deficits(nominal);
  if (c.kg === null && d.total > 0) {
    notes.push('The run cannot be simulated: the base needs cargo and it cannot be told whether cargo can land.');
    return empty;
  }
  const cargoKg = c.kg ?? 0;
  if (resupplyEvery !== null && cargoKg === 0) notes.push('Resupply was asked for, but no cargo can land here: there is no usable landing pad.');

  const withResupply = run(layout, site, file, days, events, resupplyEvery, cargoKg, nominal);
  const alone = resupplyEvery === null ? withResupply : run(layout, site, file, days, events, null, cargoKg, nominal);

  let readiness: Readiness;
  if (withResupply.firstDepletion || steady.resources.crew.status === 'short' || steady.resources.power.status === 'short') readiness = 'RED';
  else if (withResupply.usedReserves) readiness = 'AMBER';
  else readiness = 'GREEN';
  if (steady.resources.power.status === 'short' && !withResupply.firstDepletion) notes.push(steady.resources.power.note);
  if (steady.resources.crew.status === 'short') notes.push(steady.resources.crew.note);

  const share = (part: number): number => (d.total > 0 ? Math.round(((cargoKg * part) / d.total) * 100) / 100 : 0);
  return {
    days: withResupply.days,
    firstDepletion: withResupply.firstDepletion,
    readiness,
    sustainability: {
      days: alone.firstDepletion ? alone.firstDepletion.day - 1 : days,
      reachedHorizon: alone.firstDepletion === null,
      firstResource: alone.firstDepletion?.resource ?? null,
    },
    initialStock: { waterKg: share(d.water), oxygenKg: share(d.oxygen), foodKg: share(d.food), batteryKwh: capacity * nominal.counts.battery },
    notes,
  };
}

import { param, sourcedValue } from './catalog';
import { evaluate } from './evaluate';
import type { Evaluation, GapReport, Layout, ModulesFile, SiteConditions } from './types';

/** Used when a target carries no `cannotCopy` sentences. It quotes no number, so it needs no source. */
export const DEFAULT_CANNOT_TEST = [
  'Gravity: Earth cannot reproduce the lower gravity of the Moon or Mars, so loads, dust behaviour and how people move stay untested.',
  'Atmosphere: Earth cannot reproduce a vacuum or the thin Martian air, so seals, cooling and dust in low pressure stay untested.',
  'Radiation: Earth\'s air and magnetic field shield the site, so radiation exposure and shielding stay untested.',
];

const n1 = (v: number): string => v.toLocaleString('en-US', { maximumFractionDigits: 1 });
const n0 = (v: number): string => v.toLocaleString('en-US', { maximumFractionDigits: 0 });

function ratioPhrase(earth: number, target: number): string {
  if (target <= 0 && earth <= 0) return 'nothing at either site';
  if (target <= 0) return 'nothing at the target';
  if (earth <= 0) return 'nothing on Earth';
  const r = earth / target;
  if (r >= 1.05) return `${n1(r)} times less at the target`;
  if (r <= 0.95) return `${n1(1 / r)} times more at the target`;
  return 'about the same at both';
}

/**
 * Deploys one layout twice, at the Earth site and at the target, and explains the difference
 * (app/src/lib/sim/README.md). Every number in a sentence is computed here from sourced module data.
 * The report always ends with what the Earth rehearsal cannot test at all.
 */
export function deployTwice(layout: Layout, earthSite: SiteConditions, targetSite: SiteConditions, file: ModulesFile): GapReport {
  const earth = evaluate(layout, earthSite, file);
  const target = evaluate(layout, targetSite, file);
  const lines: string[] = [];
  const E = earthSite.name;
  const T = targetSite.name;
  const word = (r: Evaluation['readiness']): string => r ?? 'NO DATA';

  lines.push(`Readiness: ${word(earth.readiness)} at ${E}, ${word(target.readiness)} at ${T}.`);

  // Solar power
  if (earth.counts.solar > 0) {
    const pe = earth.power.perArrayKw;
    const pt = target.power.perArrayKw;
    if (pe === null || pt === null) {
      lines.push(`Solar power cannot be compared: ${pe === null ? E : T} has no published sunlight or lit-time figure, or the array has no sourced rating.`);
    } else {
      let line = `Each solar array gives ${n1(pe)} kW at ${E} and ${n1(pt)} kW at ${T}: ${ratioPhrase(pe, pt)}.`;
      if (earthSite.irradianceIsUpperBound) line += ` The ${E} figure is an upper bound: it ignores air and cloud.`;
      const net = target.power.netKw;
      if (net !== null && net < 0 && pt > 0) line += ` To cover the shortfall of ${n1(-net)} kW at ${T}, add ${n0(Math.ceil(-net / pt))} arrays.`;
      lines.push(line);
    }
  } else if ((target.power.consumptionKw ?? 0) > 0) {
    lines.push('The base has no solar arrays: nothing makes power at either site.');
  }

  // Darkness and batteries
  const de = earthSite.longestDarkHours;
  const dt = targetSite.longestDarkHours;
  if (de !== null && dt !== null && (target.power.consumptionKw ?? 0) > 0) {
    let line = `The longest dark period is ${n1(de)} hours at ${E} and ${n1(dt)} hours at ${T}.`;
    const need = target.power.darkDemandKwh;
    const have = target.power.batteryKwh;
    const each = param(file, 'battery', 'capacityKwh');
    if (need !== null && have !== null) {
      if (have + 1e-9 >= need) line += ` The batteries cover it at ${T}.`;
      else if (each !== null && each > 0) line += ` The batteries hold ${n0(have)} kWh and ${T} needs ${n0(need)} kWh: add ${n0(Math.ceil((need - have) / each))} batteries.`;
    }
    lines.push(line);
  } else if (dt === null && (target.power.consumptionKw ?? 0) > 0) {
    lines.push(`The longest dark period at ${T} has no published value, so battery sizing cannot be checked there.`);
  }

  // Heating
  const he = earth.power.heatingKw;
  const ht = target.power.heatingKw;
  if (he !== null && ht !== null && earth.counts.habitat > 0 && Math.abs(ht - he) >= 0.05) {
    lines.push(`Heating the habitats takes ${n1(he)} kW at ${E} and ${n1(ht)} kW at ${T}, because of the difference in temperature.`);
  }

  // Ice
  if (earth.counts.iceMiner > 0) {
    const we = earth.water.producedKgDay;
    const wt = target.water.producedKgDay;
    if (we === null || wt === null) lines.push(`Ice mining cannot be compared: ${wt === null ? T : E} has no ice figure.`);
    else if (we === 0 && wt > 0) lines.push(`The ice miners give ${n1(wt)} kg of water a day at ${T} and nothing at ${E}: this Earth site cannot rehearse ice mining.`);
    else if (wt === 0 && we === 0) lines.push('The ice miners give nothing at either site: there is no accessible ice.');
    else lines.push(`The ice miners give ${n1(we)} kg of water a day at ${E} and ${n1(wt)} kg at ${T}.`);
  }

  // Consumables at the target
  const perPerson = { water: sourcedValue(file.crew.waterKgPerDay), oxygen: sourcedValue(file.crew.oxygenKgPerDay), food: sourcedValue(file.crew.foodKgPerDay) };
  for (const id of ['water', 'oxygen', 'food'] as const) {
    const re = earth.resources[id];
    const rt = target.resources[id];
    if (rt.net === null || re.net === null) continue;
    if (rt.net < 0) {
      const each = perPerson[id];
      const cut = each !== null && each > 0 ? ' Deliver it as cargo, or reduce the crew.' : '';
      const same = re.net < 0 ? ` (${n1(-re.net)} kg short at ${E} too)` : ` (in balance at ${E})`;
      lines.push(`${rt.label} runs ${n1(-rt.net)} kg a day short at ${T}${same}.${cut}`);
    } else if (re.net < 0) {
      lines.push(`${rt.label} is in balance at ${T} but runs ${n1(-re.net)} kg a day short at ${E}: the rehearsal needs it delivered.`);
    }
  }

  // Landing
  if (earth.counts.landingPad > 0 && earth.landingPossible !== target.landingPossible) {
    const say = (v: boolean | null): string => (v === null ? 'cannot be judged' : v ? 'is possible' : 'is not possible');
    lines.push(`Landing cargo ${say(earth.landingPossible)} at ${E} and ${say(target.landingPossible)} at ${T}, on mean slope alone.`);
  }

  // Crew
  if (target.resources.crew.status === 'short') lines.push(target.resources.crew.note);

  // Unsourced numbers
  if (target.illustrative) {
    const names = target.illustrativeModules.map((m) => `${file.modules[m.type].label} (${m.missing.join(', ')})`).join('; ');
    lines.push(`Illustrative only: these modules use a number with no source, so their effect is left out or unknown: ${names}.`);
  }

  const cannotTest = targetSite.cannotTest && targetSite.cannotTest.length > 0 ? targetSite.cannotTest : DEFAULT_CANNOT_TEST;
  lines.push(`What a rehearsal at ${E} cannot test at all:`);
  for (const c of cannotTest) lines.push(c);
  return { earth, target, lines, cannotTest };
}

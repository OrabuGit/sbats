import { describe, it } from 'node:test';
import { deepEqual, equal, ok } from 'node:assert/strict';
import { MODULE_PARAMS, missingParams, validateModulesFile } from '../catalog';
import { DEFAULT_CANNOT_TEST, deployTwice } from '../compare';
import { countModules, evaluate } from '../evaluate';
import { simulate } from '../simulate';
import { earthSite, layoutOf, makeFile, marsSite, moonSite, near, s } from './fixtures';

const file = makeFile();

describe('Module catalog', () => {
  it('accepts a complete file and lists the parameters every module needs', () => {
    deepEqual(validateModulesFile(file), []);
    deepEqual(Object.keys(MODULE_PARAMS).sort(), ['battery', 'greenhouse', 'habitat', 'iceMiner', 'landingPad', 'solar']);
  });

  it('rejects a value with no source, a null that still has a source, and a null with no reason', () => {
    const bad = makeFile();
    bad.modules.solar.params.efficiency = { value: 0.3, unit: '', source: null, badge: null };
    bad.modules.battery.params.capacityKwh = { value: null, unit: 'kWh', source: 'somewhere', badge: 'Literature', note: 'x' };
    bad.crew.foodKgPerDay = { value: null, unit: 'kg', source: null, badge: null };
    const problems = validateModulesFile(bad);
    ok(problems.some((p) => p.startsWith('modules.solar.params.efficiency') && p.includes('needs a source')));
    ok(problems.some((p) => p.startsWith('modules.battery.params.capacityKwh') && p.includes('null source')));
    ok(problems.some((p) => p.startsWith('crew.foodKgPerDay') && p.includes('needs a note')));
  });

  it('rejects a missing parameter and a sunlight factor outside 0 to 1', () => {
    const bad = makeFile();
    delete bad.modules.habitat.params.crewCapacity;
    bad.events.marsDustStorm.params.solarFactor = s(1.5);
    const problems = validateModulesFile(bad);
    ok(problems.includes('modules.habitat.params.crewCapacity: missing'));
    ok(problems.some((p) => p.includes('marsDustStorm') && p.includes('between 0 and 1')));
  });

  it('reports which parameters of a module have no source', () => {
    const partial = makeFile();
    partial.modules.greenhouse.params.foodKgPerM2Day = s(null);
    deepEqual(missingParams(partial, 'greenhouse'), ['foodKgPerM2Day']);
    deepEqual(missingParams(partial, 'habitat'), []);
  });
});

describe('Resource balances', () => {
  it('counts modules and fills every habitat place by default', () => {
    const e = evaluate(layoutOf({ habitat: 2, solar: 3 }), earthSite(), file);
    deepEqual(countModules(layoutOf({ habitat: 2, solar: 3 })), { habitat: 2, solar: 3, battery: 0, greenhouse: 0, iceMiner: 0, landingPad: 0 });
    equal(e.crewCapacity, 8);
    equal(e.crew, 8);
  });

  it('computes solar power as irradiance x area x efficiency x lit fraction', () => {
    const e = evaluate(layoutOf({ solar: 3 }), earthSite(), file);
    equal(e.power.perArrayKw, 8); // 800 x 100 x 0.2 x 0.5 / 1000
    equal(e.power.productionKw, 24);
    equal(evaluate(layoutOf({ solar: 3 }), marsSite(), file).power.perArrayKw, 5);
  });

  it('adds a heating load that grows as the site gets colder', () => {
    equal(evaluate(layoutOf({ habitat: 1 }), earthSite(), file).power.consumptionKw, 6); // 5 + 0.1 x (20 - 10)
    equal(evaluate(layoutOf({ habitat: 1 }), marsSite(), file).power.consumptionKw, 13); // 5 + 0.1 x 80
    equal(evaluate(layoutOf({ habitat: 1 }), earthSite({ tempMeanC: 30 }), file).power.heatingKw, 0); // never negative
  });

  it('charges crew needs per person per day', () => {
    const e = evaluate(layoutOf({ habitat: 1 }, 3), earthSite(), file);
    equal(e.water.consumedKgDay, 9);
    equal(e.oxygen.consumedKgDay, 3);
    equal(e.food.consumedKgDay, 3);
  });

  it('runs a greenhouse from its area: food, oxygen, water and power', () => {
    const e = evaluate(layoutOf({ greenhouse: 2 }, 0), earthSite(), file);
    equal(e.food.producedKgDay, 2); // 2 x 50 x 0.02
    equal(e.oxygen.producedKgDay, 3); // 2 x 50 x 0.03
    equal(e.water.consumedKgDay, 10); // 2 x 50 x 0.1
    equal(e.power.consumptionKw, 10); // 2 x 50 x 0.1
  });

  it('scales ice mining with the ice the site offers, and idles the miner where there is none', () => {
    equal(evaluate(layoutOf({ iceMiner: 1 }, 0), marsSite(), file).water.producedKgDay, 50);
    equal(evaluate(layoutOf({ iceMiner: 1 }, 0), moonSite(), file).water.producedKgDay, 25);
    const idle = evaluate(layoutOf({ iceMiner: 1 }, 0), earthSite(), file);
    equal(idle.water.producedKgDay, 0);
    equal(idle.power.consumptionKw, 0);
    ok(idle.notes.some((n) => n.includes('cannot be exercised')));
  });

  it('electrolyses only the surplus water the crew\'s oxygen shortfall needs', () => {
    // 4 crew need 4 kg oxygen. Miner makes 50 kg water, crew drink 12: surplus 38. 4 kg O2 takes 5 kg water and 1 kW.
    const e = evaluate(layoutOf({ habitat: 1, iceMiner: 1 }), marsSite(), file);
    equal(e.oxygen.fromElectrolysisKgDay, 4);
    equal(e.oxygen.netKgDay, 0);
    equal(e.water.consumedKgDay, 17); // 12 crew + 5 electrolysed
    equal(e.power.consumptionKw, 18); // 13 habitat + 4 miner + 1 electrolysis
    equal(e.resources.oxygen.status, 'ok');
  });

  it('does not electrolyse when greenhouses already cover the oxygen', () => {
    const e = evaluate(layoutOf({ habitat: 1, iceMiner: 1, greenhouse: 4 }), marsSite(), file);
    equal(e.oxygen.fromElectrolysisKgDay, 0);
    equal(e.oxygen.producedKgDay, 6);
  });

  it('adds up delivered mass', () => {
    equal(evaluate(layoutOf({ habitat: 1, solar: 2, battery: 1 }), earthSite(), file).deliveredMassKg, 11200);
  });
});

describe('Readiness', () => {
  /** Self-sufficient on Mars: 4 crew, 4 greenhouses, 1 miner, 8 arrays (40 kW against 37), 5 batteries (500 kWh against 444). */
  const base = layoutOf({ habitat: 1, greenhouse: 4, iceMiner: 1, solar: 8, battery: 5 });

  it('is GREEN when every balance is zero or positive and the batteries last the longest dark period', () => {
    const e = evaluate(base, marsSite(), file);
    equal(e.power.productionKw, 40);
    equal(e.power.consumptionKw, 37);
    equal(e.power.darkDemandKwh, 444);
    equal(e.water.netKgDay, 18); // 50 - 12 - 20
    equal(e.food.netKgDay, 0);
    equal(e.readiness, 'GREEN');
    for (const r of Object.values(e.resources)) equal(r.status, 'ok');
  });

  it('is RED when the arrays cannot carry the base', () => {
    const e = evaluate(layoutOf({ habitat: 1, greenhouse: 4, iceMiner: 1, solar: 7, battery: 5 }), marsSite(), file);
    equal(e.resources.power.status, 'short');
    equal(e.readiness, 'RED');
    ok(e.resources.power.note.includes('2 kW short'));
  });

  it('is RED when the batteries do not last the longest dark period, even with enough average power', () => {
    const e = evaluate(layoutOf({ habitat: 1, greenhouse: 4, iceMiner: 1, solar: 8, battery: 4 }), marsSite(), file);
    equal(e.power.netKw, 3);
    equal(e.resources.power.status, 'short');
    equal(e.readiness, 'RED');
    ok(e.resources.power.note.includes('longest dark period is 12 hours'));
  });

  it('is AMBER when a consumable is short each day but delivered cargo covers 30 days', () => {
    // On Earth the miner is idle: water is 32 kg a day short. One 3000 kg delivery lasts 93 days.
    const e = evaluate({ ...base, modules: [...base.modules, { type: 'landingPad', x: 0, y: 5 }] }, earthSite(), file);
    equal(e.resources.water.status, 'reserves');
    equal(e.cargoKgPerDelivery, 3000);
    equal(e.readiness, 'AMBER');
  });

  it('is RED when a consumable is short and nothing can be delivered', () => {
    const e = evaluate(base, earthSite(), file);
    equal(e.resources.water.status, 'short');
    equal(e.readiness, 'RED');
  });

  it('is RED when cargo covers fewer than 30 days', () => {
    const small = makeFile();
    small.modules.landingPad.params.cargoKgPerDelivery = s(300);
    const e = evaluate(layoutOf({ habitat: 1, solar: 1, battery: 1, landingPad: 1 }), earthSite(), small);
    // 4 crew: 12 water + 4 oxygen + 4 food = 20 kg a day short. 300 kg lasts 15 days.
    equal(e.resources.water.status, 'short');
    ok(e.resources.water.note.includes('15 days'));
    equal(e.readiness, 'RED');
  });

  it('is RED with more crew than habitat places', () => {
    const e = evaluate(layoutOf({ habitat: 1 }, 6), earthSite(), file);
    equal(e.resources.crew.status, 'short');
    equal(e.resources.crew.net, -2);
    equal(e.readiness, 'RED');
  });

  it('refuses cargo where the ground is too steep for a pad', () => {
    const e = evaluate(layoutOf({ habitat: 1, solar: 1, battery: 1, landingPad: 1 }), earthSite({ slopeDeg: 9 }), file);
    equal(e.landingPossible, false);
    equal(e.cargoKgPerDelivery, 0);
    ok(e.notes.some((n) => n.includes('above the pad limit of 5')));
    equal(e.readiness, 'RED');
  });

  it('an empty layout is GREEN: nothing is needed and nothing is short', () => {
    equal(evaluate({ modules: [] }, marsSite(), file).readiness, 'GREEN');
  });
});

describe('Numbers with no source', () => {
  it('makes what depends on a null parameter unknown, never zero, and marks the module illustrative', () => {
    const partial = makeFile();
    partial.modules.solar.params.efficiency = s(null);
    const e = evaluate(layoutOf({ habitat: 1, solar: 4, battery: 1, landingPad: 1 }), earthSite(), partial);
    equal(e.power.perArrayKw, null);
    equal(e.power.productionKw, null);
    equal(e.resources.power.status, 'unknown');
    equal(e.illustrative, true);
    deepEqual(e.illustrativeModules, [{ type: 'solar', missing: ['efficiency'] }]);
    equal(e.readiness, null); // "no data", not GREEN and not RED
  });

  it('still says RED when something else has clearly run out', () => {
    const partial = makeFile();
    partial.modules.solar.params.efficiency = s(null);
    equal(evaluate(layoutOf({ habitat: 1, solar: 4 }, 9), earthSite(), partial).readiness, 'RED');
  });

  it('ignores a null parameter of a module that is not placed', () => {
    const partial = makeFile();
    partial.modules.iceMiner.params.waterKgPerDay = s(null);
    const e = evaluate(layoutOf({ solar: 1 }, 0), earthSite(), partial);
    equal(e.illustrative, false);
    equal(e.readiness, 'GREEN');
  });

  it('leaves the heating load out, with a note, when it cannot be computed', () => {
    const partial = makeFile();
    partial.modules.habitat.params.heatingKwPerDegC = s(null);
    const e = evaluate(layoutOf({ habitat: 1 }), marsSite(), partial);
    equal(e.power.heatingKw, null);
    equal(e.power.consumptionKw, 5);
    ok(e.notes.some((n) => n.includes('Heating load is not modelled')));
    equal(e.illustrative, true);
  });

  it('makes site data that is missing unknown too', () => {
    const e = evaluate(layoutOf({ habitat: 1, solar: 2, battery: 1 }), marsSite({ irradianceWm2: null }), file);
    equal(e.resources.power.status, 'unknown');
    const dark = evaluate(layoutOf({ habitat: 1, solar: 4, battery: 9 }, 0), marsSite({ longestDarkHours: null }), file);
    equal(dark.resources.power.status, 'unknown');
    equal(evaluate(layoutOf({ landingPad: 1 }), marsSite({ slopeDeg: null }), file).landingPossible, null);
  });

  it('gives no delivered mass when a placed module has no sourced mass', () => {
    const partial = makeFile();
    partial.modules.battery.params.massKg = s(null);
    equal(evaluate(layoutOf({ battery: 1 }), earthSite(), partial).deliveredMassKg, null);
    equal(evaluate(layoutOf({ solar: 1 }), earthSite(), partial).deliveredMassKg, 500);
  });
});

describe('Thirty-day simulation', () => {
  const small = makeFile();
  small.modules.landingPad.params.cargoKgPerDelivery = s(300);
  /** Earth: 4 crew, 8 kW solar against 6 kW, one battery. 20 kg of water, oxygen and food short each day. */
  const outpost = layoutOf({ habitat: 1, solar: 1, battery: 1, landingPad: 1 });

  it('steps one day at a time for 30 days and starts with one cargo delivery', () => {
    const sim = simulate(outpost, earthSite(), file);
    equal(sim.days.length, 30);
    deepEqual(sim.initialStock, { waterKg: 1800, oxygenKg: 600, foodKg: 600, batteryKwh: 100 }); // 3000 kg split 12 : 4 : 4
    equal(sim.days[0]?.waterKg, 1788);
    equal(sim.days[29]?.waterKg, 1440); // 1800 - 30 x 12
    equal(sim.days[29]?.oxygenKg, 480);
    equal(sim.firstDepletion, null);
  });

  it('is AMBER when the base lasts the run only on delivered reserves', () => {
    const sim = simulate(outpost, earthSite(), file);
    equal(sim.readiness, 'AMBER');
    deepEqual(sim.sustainability, { days: 30, reachedHorizon: true, firstResource: null });
  });

  it('gives the sustainability score: full days survived with no resupply', () => {
    // 300 kg against 20 kg a day: stocks reach zero at the end of day 15 and run out on day 16.
    const sim = simulate(outpost, earthSite(), small);
    equal(sim.days[14]?.waterKg, 0);
    deepEqual(sim.firstDepletion, { resource: 'water', day: 16 });
    deepEqual(sim.days[15]?.depleted, ['water', 'oxygen', 'food']);
    deepEqual(sim.sustainability, { days: 15, reachedHorizon: false, firstResource: 'water' });
    equal(sim.readiness, 'RED');
  });

  it('keeps the base alive with resupply every N days, and still reports the no-resupply score', () => {
    const sim = simulate(outpost, earthSite(), small, { resupplyEveryDays: 10 });
    equal(sim.firstDepletion, null);
    equal(sim.readiness, 'AMBER');
    equal(sim.days[9]?.deliveredKg, 300);
    equal(sim.days[9]?.waterKg, 240); // 180 - 120 + 180
    equal(sim.days.filter((d) => d.deliveredKg > 0).length, 3);
    equal(sim.sustainability?.days, 15);
  });

  it('is GREEN when a self-sufficient base never touches a reserve', () => {
    const sim = simulate(layoutOf({ habitat: 1, greenhouse: 4, iceMiner: 1, solar: 8, battery: 5 }), marsSite(), file);
    equal(sim.readiness, 'GREEN');
    equal(sim.days[29]?.waterKg, 540); // surplus of 18 kg a day builds up
    equal(sim.days[29]?.batteryKwh, 500);
  });

  it('runs a lunar night: no sunlight for its duration, batteries drain, then the base goes dark', () => {
    // Moon: habitat draws 22 kW = 528 kWh a day. 6 batteries hold 600 kWh: one dark day, then nothing.
    const base = layoutOf({ habitat: 1, solar: 2, battery: 6 }, 0);
    const calm = simulate(base, moonSite(), file);
    equal(calm.firstDepletion, null);
    const night = simulate(base, moonSite(), file, { events: [{ type: 'lunarNight', startDay: 5 }] });
    equal(night.days[4]?.solarKw, 0);
    deepEqual(night.days[4]?.events, ['lunarNight']);
    equal(night.days[4]?.batteryKwh, 72); // 600 - 528
    deepEqual(night.firstDepletion, { resource: 'power', day: 6 });
    equal(night.days[17]?.events.length, 1); // day 18 is the 14th dark day
    equal(night.days[18]?.events.length, 0);
    ok((night.days[18]?.solarKw ?? 0) > 0);
    equal(night.readiness, 'RED');
    equal(night.sustainability?.days, 5);
  });

  it('survives the lunar night with enough batteries, on reserves', () => {
    const sim = simulate(layoutOf({ habitat: 1, solar: 2, battery: 80 }, 0), moonSite(), file, { events: [{ type: 'lunarNight', startDay: 5 }] });
    equal(sim.firstDepletion, null);
    equal(sim.days[17]?.batteryKwh, 608); // 8000 - 14 x 528
    equal(sim.readiness, 'AMBER');
  });

  it('runs a Mars dust storm and sheds load: ice miners first, then greenhouses', () => {
    // 40 kW of solar falls to 4 kW. Battery 500 kWh. Full base 37 kW = 888 kWh a day against 596 on hand:
    // miners off (33 kW = 792, still too much), greenhouses off too (13 kW = 312).
    const base = layoutOf({ habitat: 1, greenhouse: 4, iceMiner: 1, solar: 8, battery: 5 });
    const sim = simulate(base, marsSite(), file, { events: [{ type: 'marsDustStorm', startDay: 3 }] });
    equal(sim.days[2]?.solarKw, 4);
    deepEqual(sim.days[2]?.shed, ['iceMiner', 'greenhouse']);
    equal(sim.days[2]?.batteryKwh, 284); // 96 + 500 - 312
    deepEqual(sim.days[1]?.shed, []);
    ok(sim.firstDepletion !== null); // with greenhouses off, food and oxygen have no stock to fall back on
    equal(sim.readiness, 'RED');
  });

  it('ignores an event that belongs to another body, and says so', () => {
    const sim = simulate(layoutOf({ habitat: 1, solar: 2, battery: 6 }, 0), moonSite(), file, { events: [{ type: 'marsDustStorm', startDay: 2 }] });
    ok(sim.notes.some((n) => n.includes('does not happen at Moon fixture')));
    equal(sim.days.every((d) => d.events.length === 0), true);
  });

  it('does not simulate an event whose duration or effect has no source', () => {
    const partial = makeFile();
    partial.events.lunarNight.params.durationDays = s(null);
    const sim = simulate(layoutOf({ habitat: 1, solar: 2, battery: 6 }, 0), moonSite(), partial, { events: [{ type: 'lunarNight', startDay: 2 }] });
    ok(sim.notes.some((n) => n.includes('is not simulated')));
    equal(sim.firstDepletion, null);
  });

  it('simulates nothing when a number the run depends on has no source', () => {
    const partial = makeFile();
    partial.modules.solar.params.areaM2 = s(null);
    const sim = simulate(layoutOf({ habitat: 1, solar: 2, battery: 1 }), earthSite(), partial);
    equal(sim.days.length, 0);
    equal(sim.readiness, null);
    equal(sim.sustainability, null);
    ok(sim.notes.some((n) => n.includes('cannot be simulated')));
  });

  it('honours a custom number of days', () => {
    equal(simulate({ modules: [] }, marsSite(), file, { days: 7 }).days.length, 7);
  });

  it('flags the nightly dark period even though the daily step cannot see it', () => {
    // 8 kW of solar against 6 kW drawn, but no battery at all: the base is dark every night.
    const sim = simulate(layoutOf({ habitat: 1, solar: 1, landingPad: 1 }), earthSite(), file);
    equal(sim.readiness, 'RED');
    ok(sim.notes.some((n) => n.includes('longest dark period')));
  });
});

describe('Deploy twice and the gap report', () => {
  const base = layoutOf({ habitat: 1, greenhouse: 4, iceMiner: 1, solar: 8, battery: 5, landingPad: 1 });
  const cannot = ['Gravity: fixture sentence one.', 'Radiation: fixture sentence two.'];
  const report = deployTwice(base, earthSite(), marsSite({ cannotTest: cannot }), file);

  it('evaluates the same layout at both sites', () => {
    equal(report.earth.site.name, 'Earth fixture');
    equal(report.target.site.name, 'Mars fixture');
    equal(report.earth.readiness, 'AMBER');
    equal(report.target.readiness, 'GREEN');
    equal(report.lines[0], 'Readiness: AMBER at Earth fixture, GREEN at Mars fixture.');
  });

  it('explains the solar difference with numbers from the model', () => {
    ok(report.lines.includes('Each solar array gives 8 kW at Earth fixture and 5 kW at Mars fixture: 1.6 times less at the target.'));
  });

  it('says how many arrays to add when the target falls short', () => {
    const r = deployTwice(layoutOf({ habitat: 1, solar: 2, battery: 3 }), earthSite(), marsSite(), file);
    // Mars: 10 kW against 13 kW. One more array (5 kW) covers the 3 kW gap.
    ok(r.lines.some((l) => l.includes('To cover the shortfall of 3 kW at Mars fixture, add 1 arrays.')));
    equal(r.target.readiness, 'RED');
  });

  it('says how many batteries to add for a longer dark period', () => {
    const r = deployTwice(layoutOf({ habitat: 1, solar: 4, battery: 1 }, 0), earthSite(), moonSite(), file);
    // Moon: 22 kW x 48 h = 1056 kWh needed, 100 held: 10 more batteries.
    ok(r.lines.some((l) => l.includes('The longest dark period is 12 hours at Earth fixture and 48 hours at Moon fixture.') && l.includes('add 10 batteries')));
  });

  it('says the Earth site cannot rehearse ice mining, and reports heating', () => {
    ok(report.lines.some((l) => l.includes('nothing at Earth fixture: this Earth site cannot rehearse ice mining')));
    ok(report.lines.includes('Heating the habitats takes 1 kW at Earth fixture and 8 kW at Mars fixture, because of the difference in temperature.'));
    ok(report.lines.some((l) => l.startsWith('Water is in balance at Mars fixture but runs 32 kg a day short at Earth fixture')));
  });

  it('suggests cargo or fewer crew when a consumable is short at the target', () => {
    const r = deployTwice(layoutOf({ habitat: 1, solar: 3, battery: 2 }), earthSite(), marsSite(), file);
    ok(r.lines.some((l) => l.startsWith('Food runs 4 kg a day short at Mars fixture (4 kg short at Earth fixture too). Deliver it as cargo, or cut 4 crew.')));
  });

  it('always ends with what the Earth rehearsal cannot test', () => {
    deepEqual(report.lines.slice(-3), ['What a rehearsal at Earth fixture cannot test at all:', ...cannot]);
    deepEqual(report.cannotTest, cannot);
    for (const layout of [{ modules: [] }, layoutOf({ solar: 1 }), layoutOf({ habitat: 3 })]) {
      const r = deployTwice(layout, earthSite(), marsSite(), file);
      deepEqual(r.cannotTest, DEFAULT_CANNOT_TEST);
      deepEqual(r.lines.slice(-DEFAULT_CANNOT_TEST.length), DEFAULT_CANNOT_TEST);
      ok(r.lines.join(' ').toLowerCase().includes('gravity'));
    }
  });

  it('labels an upper-bound sunlight figure and illustrative modules', () => {
    const partial = makeFile();
    partial.modules.greenhouse.params.foodKgPerM2Day = s(null);
    const r = deployTwice(base, earthSite({ irradianceIsUpperBound: true }), marsSite(), partial);
    ok(r.lines.some((l) => l.includes('is an upper bound: it ignores air and cloud')));
    ok(r.lines.some((l) => l.startsWith('Illustrative only') && l.includes('Greenhouse (foodKgPerM2Day)')));
    equal(r.target.readiness, null);
    equal(r.lines[0], 'Readiness: NO DATA at Earth fixture, NO DATA at Mars fixture.');
  });
});

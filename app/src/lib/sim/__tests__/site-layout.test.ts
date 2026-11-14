import { describe, it } from 'node:test';
import { deepEqual, equal, ok, throws } from 'node:assert/strict';
import { GRID_SIZE, LayoutError, MAX_MODULES, decodeLayout, encodeLayout, layoutFromJson, layoutToJson } from '../layout';
import type { SavedLayout } from '../layout';
import { earthLongestNightHours, siteFromEarthCell, siteFromTarget, topOfAtmosphereMeanWm2 } from '../site';
import { MODULE_TYPES } from '../types';
import { makeFile, near, s } from './fixtures';

const file = makeFile();

describe('Earth geometry', () => {
  it('gives a 12 hour longest night at the equator and a longer one towards the poles', () => {
    ok(near(earthLongestNightHours(0), 12, 1e-9));
    // 45 degrees: 24 x (1 - acos(tan 45 x tan 23.44) / pi) = 15.43 hours
    ok(near(earthLongestNightHours(45), 15.43, 0.01));
    ok(near(earthLongestNightHours(-45), earthLongestNightHours(45), 1e-9));
    ok(earthLongestNightHours(60) > earthLongestNightHours(45));
  });

  it('gives a polar night of months inside the polar circles and about half a year at the pole', () => {
    ok(earthLongestNightHours(66) < 24);
    ok(earthLongestNightHours(70) > 24 * 30);
    const pole = earthLongestNightHours(90) / 24;
    ok(pole > 180 && pole < 185, `pole: ${pole} days`);
    ok(near(earthLongestNightHours(-80), earthLongestNightHours(80), 1e-9));
  });

  it('computes top-of-atmosphere sunlight that averages to a quarter of the solar constant over the globe', () => {
    // A sphere intercepts pi R^2 of sunlight and has 4 pi R^2 of surface: the area-weighted mean must be S / 4.
    let sum = 0;
    let weight = 0;
    for (let lat = -89.5; lat < 90; lat += 1) {
      const w = Math.cos((lat * Math.PI) / 180);
      sum += w * topOfAtmosphereMeanWm2(lat, 1000);
      weight += w;
    }
    ok(near(sum / weight, 250, 1.5), `global mean ${sum / weight}`);
    ok(topOfAtmosphereMeanWm2(0, 1000) > topOfAtmosphereMeanWm2(45, 1000));
    ok(topOfAtmosphereMeanWm2(45, 1000) > topOfAtmosphereMeanWm2(90, 1000));
    ok(near(topOfAtmosphereMeanWm2(30, 1000), topOfAtmosphereMeanWm2(-30, 1000), 1e-6));
    ok(near(topOfAtmosphereMeanWm2(10, 2000), 2 * topOfAtmosphereMeanWm2(10, 1000), 1e-6));
  });
});

describe('Site conditions', () => {
  const target = { id: 'mars-fixture', name: 'Mars fixture', body: 'mars' as const, values: { tempMean: { value: -60 }, slope: { value: 2.5 } }, cannotCopy: ['Gravity: fixture.'] };

  it('builds a target site from targets.json and the sites block of modules.json', () => {
    const site = siteFromTarget(target, file);
    equal(site.body, 'mars');
    equal(site.irradianceWm2, 500);
    equal(site.litFraction, 0.5);
    equal(site.longestDarkHours, 12);
    equal(site.iceAvailability, 1);
    equal(site.tempMeanC, -60);
    equal(site.slopeDeg, 2.5);
    deepEqual(site.cannotTest, ['Gravity: fixture.']);
    deepEqual(site.notes, []);
  });

  it('keeps unknown conditions null and says which', () => {
    const partial = makeFile();
    (partial.sites['mars-fixture'] as (typeof partial.sites)[string]).longestDarkHours = { ...s(null), note: 'no lander has measured it' };
    const site = siteFromTarget(target, partial);
    equal(site.longestDarkHours, null);
    ok(site.notes.some((n) => n.includes('longest dark period') && n.includes('no lander has measured it')));
    const absent = siteFromTarget({ ...target, id: 'moon-nowhere', name: 'Nowhere' }, file);
    equal(absent.irradianceWm2, null);
    ok(absent.notes.some((n) => n.includes('no sunlight, darkness or ice figures')));
  });

  it('uses measured surface sunlight for an Earth cell when the cell carries it', () => {
    const site = siteFromEarthCell({ lat: -24.25, lon: -69.75, tempMean: 12, slope: 3, insolationKwhM2Day: 4.8 }, file, { name: 'Atacama cell' });
    equal(site.name, 'Atacama cell');
    equal(site.litFraction, 0.5);
    ok(near(site.irradianceWm2, 400)); // 4.8 kWh/m2/day = 200 W/m2 on average = 400 W/m2 while lit
    equal(site.irradianceIsUpperBound, false);
    equal(site.tempMeanC, 12);
    equal(site.slopeDeg, 3);
  });

  it('falls back to the top-of-atmosphere figure and flags it as an upper bound', () => {
    const site = siteFromEarthCell({ lat: 0.25, lon: 10.25, tempMean: 25, slope: 1 }, file);
    equal(site.irradianceIsUpperBound, true);
    ok(near(site.irradianceWm2, topOfAtmosphereMeanWm2(0.25, 1000) / 0.5));
    ok(site.notes.some((n) => n.includes('upper bound')));
    equal(site.name, 'Earth cell 0.25, 10.25');
  });

  it('leaves sunlight unknown when there is neither a measurement nor a sourced solar constant', () => {
    const partial = makeFile();
    partial.constants.solarConstantWm2 = s(null);
    equal(siteFromEarthCell({ lat: 10.25, lon: 10.25, tempMean: 25, slope: 1 }, partial).irradianceWm2, null);
  });

  it('treats the ice miner as idle on Earth unless told otherwise, and says so', () => {
    const site = siteFromEarthCell({ lat: 70.25, lon: 100.25, tempMean: -12, slope: 1 }, file);
    equal(site.iceAvailability, 0);
    ok(site.notes.some((n) => n.includes('no ground-ice data')));
    equal(siteFromEarthCell({ lat: 70.25, lon: 100.25, tempMean: -12, slope: 1 }, file, { iceAvailability: 0.4 }).iceAvailability, 0.4);
    ok(site.longestDarkHours !== null && site.longestDarkHours > 24);
  });
});

describe('Layout save format', () => {
  const layout: SavedLayout = {
    modules: [
      { type: 'habitat', x: 0, y: 0 },
      { type: 'solar', x: 1, y: 0 },
      { type: 'solar', x: 2, y: 0 },
      { type: 'battery', x: 0, y: 1 },
    ],
    crew: 4,
    resupplyEveryDays: 10,
  };

  it('encodes a layout as a short string that is safe in a URL', () => {
    const text = encodeLayout(layout);
    equal(text, '1.4.10.h00s10s20b01');
    equal(encodeURIComponent(text), text);
  });

  it('round-trips through the string and through JSON', () => {
    deepEqual(decodeLayout(encodeLayout(layout)), layout);
    deepEqual(layoutFromJson(JSON.parse(JSON.stringify(layoutToJson(layout)))), layout);
  });

  it('handles every module type, the far corner of the grid, and the optional fields', () => {
    const all: SavedLayout = { modules: MODULE_TYPES.map((type, i) => ({ type, x: GRID_SIZE - 1, y: i })), resupplyEveryDays: null };
    const text = encodeLayout(all);
    equal(text, '1.-.-.hz0sz1bz2gz3iz4pz5');
    deepEqual(decodeLayout(text), all);
    equal(decodeLayout(text).crew, undefined);
    deepEqual(decodeLayout('1.-.-.'), { modules: [], resupplyEveryDays: null });
    deepEqual(decodeLayout('1.0.1.'), { modules: [], crew: 0, resupplyEveryDays: 1 });
  });

  it('stays small: three characters per module', () => {
    const big: SavedLayout = { modules: [], resupplyEveryDays: null };
    for (let i = 0; i < 100; i++) big.modules.push({ type: 'solar', x: i % GRID_SIZE, y: Math.floor(i / GRID_SIZE) });
    equal(encodeLayout(big).length, 6 + 300);
    deepEqual(decodeLayout(encodeLayout(big)), big);
  });

  it('rejects layouts that are not valid', () => {
    throws(() => encodeLayout({ modules: [{ type: 'habitat', x: 0, y: 0 }, { type: 'solar', x: 0, y: 0 }], resupplyEveryDays: null }), LayoutError);
    throws(() => encodeLayout({ modules: [{ type: 'habitat', x: GRID_SIZE, y: 0 }], resupplyEveryDays: null }), LayoutError);
    throws(() => encodeLayout({ modules: [{ type: 'habitat', x: 1.5, y: 0 }], resupplyEveryDays: null }), LayoutError);
    throws(() => encodeLayout({ modules: [{ type: 'reactor' as 'habitat', x: 1, y: 0 }], resupplyEveryDays: null }), LayoutError);
    throws(() => encodeLayout({ modules: [], crew: -1, resupplyEveryDays: null }), LayoutError);
    throws(() => encodeLayout({ modules: [], resupplyEveryDays: 0 }), LayoutError);
    const tooMany: SavedLayout = { modules: [], resupplyEveryDays: null };
    for (let i = 0; i <= MAX_MODULES; i++) tooMany.modules.push({ type: 'solar', x: i % GRID_SIZE, y: Math.floor(i / GRID_SIZE) });
    throws(() => encodeLayout(tooMany), LayoutError);
  });

  it('rejects strings it does not recognise, without crashing', () => {
    for (const bad of ['', 'hello', '2.4.10.h00', '1.4.10', '1.4.10.h0', '1.4.10.x00', '1.4.10.H00', '1.four.10.h00', '1.4.-1.h00', '1.4.10.h00h00', '1.4.10.h00.extra', '1.4.10.h0!']) {
      throws(() => decodeLayout(bad), LayoutError, bad);
    }
    throws(() => decodeLayout(null as unknown as string), LayoutError);
    throws(() => decodeLayout('1.-.-.' + 's00'.repeat(1000)), LayoutError);
    throws(() => layoutFromJson({ v: 2, modules: [] }), LayoutError);
    throws(() => layoutFromJson({ v: 1, modules: [['habitat', 0]] }), LayoutError);
    throws(() => layoutFromJson('nope'), LayoutError);
  });
});

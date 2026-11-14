// Builds the FIXTURE data files in src/mocks. These follow data/SCHEMA.md exactly but the
// numbers are synthetic: smooth functions of latitude and longitude plus seeded noise.
// They exist only so the UI can be built before the pipeline lands. They are never real data,
// and the app shows a "FIXTURE DATA" notice whenever one of them is in use.
//
// Run: npm run fixtures

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { geoContains } from 'd3-geo';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../src/mocks');
const FIX = 'FIXTURE, not real data';

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(26);
const r2 = (x) => Math.round(x * 100) / 100;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

const topo = require('world-atlas/land-110m.json');
const land = feature(topo, topo.objects.land);

const RES = 3;
const cells = [];
for (let lat = -90 + RES / 2; lat < 90; lat += RES) {
  for (let lon = -180 + RES / 2; lon < 180; lon += RES) {
    if (!geoContains(land, [lon, lat])) continue;
    const a = Math.abs(lat);
    const wave = Math.sin((lon * Math.PI) / 60) * 0.5 + 0.5;
    const tropics = Math.exp(-((a / 11) ** 2));
    const midlat = Math.exp(-(((a - 52) / 13) ** 2));
    const precip = clamp(40 + 2600 * tropics * (0.45 + 0.55 * wave) + 750 * midlat * (0.3 + 0.7 * (1 - wave)) + (rnd() - 0.5) * 80, 2, 4000);
    const tempMean = 27 - 0.0088 * lat * lat + (rnd() - 0.5) * 4;
    const dry = 1 - clamp(precip / 1200, 0, 1);
    const tempRange = 7 + 11 * dry + (rnd() - 0.5) * 3;
    const ndvi = clamp((precip / 2400) * (tempMean > -5 ? 1 : 0.2) + 0.05 + (rnd() - 0.5) * 0.06, 0.02, 0.88);
    const rugged = rnd() ** 2;
    const cell = {
      lat,
      lon,
      tempMean: r2(tempMean),
      tempRange: r2(tempRange),
      precip: r2(precip),
      ndvi: r2(ndvi),
      slope: r2(0.4 + rugged * 18),
      roughness: r2(8 + rugged * 620),
      lithology: 1 + Math.floor(rnd() * 5),
    };
    // Gaps, so the missing-factor rule, the confidence levels and "no data" are all exercised.
    const g = rnd();
    if (g < 0.1) cell.lithology = null; // medium confidence on the Base preset
    else if (g < 0.14) cell.roughness = null; // medium
    else if (g < 0.19) {
      cell.slope = null; // low
      cell.roughness = null;
    } else if (g < 0.22) cell.ndvi = null; // no data: required factor missing
    else if (g < 0.24) {
      cell.slope = null; // no data: coverage too low
      cell.roughness = null;
      cell.tempMean = null;
      cell.tempRange = null;
      cell.lithology = null;
    }
    cells.push(cell);
  }
}

const earth = {
  meta: {
    resolutionDeg: RES,
    fixture: true,
    factors: [
      { key: 'tempMean', label: 'Mean temperature', unit: '°C', source: FIX, badge: 'Measured' },
      { key: 'tempRange', label: 'Day-night swing', unit: '°C', source: FIX, badge: 'Measured' },
      { key: 'precip', label: 'Precipitation', unit: 'mm/year', source: FIX, badge: 'Measured' },
      { key: 'ndvi', label: 'Vegetation (NDVI)', unit: '', source: FIX, badge: 'Measured' },
      { key: 'slope', label: 'Mean slope', unit: '°', source: FIX, badge: 'Measured' },
      { key: 'roughness', label: 'Roughness', unit: 'm', source: FIX, badge: 'Measured' },
      {
        key: 'lithology',
        label: 'Rock class',
        unit: '',
        source: FIX,
        badge: 'Measured',
        classes: [
          { code: 1, label: 'Fixture class 1 (basalt-like)' },
          { code: 2, label: 'Fixture class 2 (andesite-like)' },
          { code: 3, label: 'Fixture class 3 (sediment-like)' },
          { code: 4, label: 'Fixture class 4 (plutonic-like)' },
          { code: 5, label: 'Fixture class 5 (ice-like)' },
        ],
      },
    ],
    generatedAt: '2026-11-14T00:00:00Z',
  },
  cells,
};

const v = (value, sigma, badge = 'Literature') => ({ value, sigma, source: FIX, badge });
const none = { value: null, sigma: null, source: null, badge: null };
const cannot = (g, air, rad) => [
  `Gravity: ${g} (fixture text, not a cited figure).`,
  `Atmosphere: ${air} (fixture text, not a cited figure).`,
  `Radiation: ${rad} (fixture text, not a cited figure).`,
];
const moonCannot = cannot(
  'the Moon pulls with about one sixth of Earth gravity, so loads, dust and walking behave differently',
  'the surface is in hard vacuum, so no Earth site tests seals, outgassing or heat rejection',
  'there is no magnetic field or air to shield crews from solar and cosmic radiation',
);
const marsCannot = cannot(
  'Mars pulls with a little over one third of Earth gravity',
  'the air is thin carbon dioxide at under one percent of Earth surface pressure',
  'the surface dose is far above any place on Earth',
);

const targets = [
  {
    id: 'moon-shackleton-rim',
    name: 'Shackleton rim',
    body: 'moon',
    lat: -89.5,
    lon: 130,
    summary: 'Fixture entry. Lunar south polar rim site used to exercise the UI until targets.json is published.',
    values: {
      tempMean: v(-170, 9, 'Mission'),
      tempRange: v(60, 12, 'Mission'),
      precip: v(0, 180),
      ndvi: v(0, 0.12),
      slope: v(11, 5, 'Mission'),
      roughness: v(420, 200, 'Mission'),
      lithology: { value: 4, sigma: null, source: FIX, badge: 'Literature' },
    },
    cannotCopy: moonCannot,
  },
  {
    id: 'moon-malapert-massif',
    name: 'Malapert Massif',
    body: 'moon',
    lat: -85.9,
    lon: 0,
    summary: 'Fixture entry. Lunar south polar massif with two factors left unpublished on purpose.',
    values: {
      tempMean: v(-150, 9, 'Mission'),
      tempRange: none,
      precip: v(0, 180),
      ndvi: v(0, 0.12),
      slope: v(14, 5, 'Mission'),
      roughness: v(560, 200, 'Mission'),
      lithology: none,
    },
    cannotCopy: moonCannot,
  },
  {
    id: 'mars-jezero',
    name: 'Jezero crater',
    body: 'mars',
    lat: 18.4,
    lon: 77.7,
    summary: 'Fixture entry. Martian crater with an ancient river delta, used to exercise the UI.',
    values: {
      tempMean: v(-55, 14, 'Mission'),
      tempRange: v(70, 20, 'Mission'),
      precip: v(0, 200),
      ndvi: v(0, 0.12),
      slope: v(4, 4, 'Mission'),
      roughness: v(120, 150, 'Mission'),
      lithology: { value: 1, sigma: null, source: FIX, badge: 'Literature' },
    },
    cannotCopy: marsCannot,
  },
  {
    id: 'mars-gale',
    name: 'Gale crater',
    body: 'mars',
    lat: -5.4,
    lon: 137.8,
    summary: 'Fixture entry. Martian crater with layered sediments, used to exercise the UI.',
    values: {
      tempMean: v(-48, 14, 'Mission'),
      tempRange: v(75, 20, 'Mission'),
      precip: v(0, 200),
      ndvi: v(0, 0.12),
      slope: v(6, 4, 'Mission'),
      roughness: v(260, 150, 'Mission'),
      lithology: { value: 3, sigma: null, source: FIX, badge: 'Literature' },
    },
    cannotCopy: marsCannot,
  },
];

const analogs = [
  { id: 'atacama-yungay', name: 'Atacama Desert, Yungay', lat: -24.1, lon: -70.0, kind: 'known', analogFor: ['mars-jezero', 'mars-gale'], source: FIX },
  { id: 'mcmurdo-dry-valleys', name: 'McMurdo Dry Valleys', lat: -77.5, lon: 162.0, kind: 'known', analogFor: ['mars-jezero', 'moon-shackleton-rim'], source: FIX },
  { id: 'mauna-kea', name: 'Mauna Kea', lat: 19.82, lon: -155.47, kind: 'known', analogFor: ['moon-shackleton-rim', 'mars-jezero'], source: FIX },
  { id: 'haughton-crater', name: 'Haughton Crater, Devon Island', lat: 75.38, lon: -89.67, kind: 'known', analogFor: ['mars-gale'], source: FIX },
  { id: 'kalimantan-rainforest', name: 'Central Kalimantan rainforest', lat: -1.0, lon: 113.5, kind: 'negative', analogFor: [], source: FIX },
  { id: 'amazon-basin', name: 'Amazon basin', lat: -3.5, lon: -62.0, kind: 'negative', analogFor: [], source: FIX },
  { id: 'paris', name: 'Paris', lat: 48.86, lon: 2.35, kind: 'negative', analogFor: [], source: FIX },
  { id: 'kawah-ijen', name: 'Kawah Ijen, East Java', lat: -8.06, lon: 114.24, kind: 'candidate', analogFor: ['mars-gale'], source: FIX },
  { id: 'merapi', name: 'Merapi, Central Java', lat: -7.54, lon: 110.45, kind: 'candidate', analogFor: ['mars-jezero', 'mars-gale'], source: FIX },
];

const rel = new Set(['1-2', '1-4', '2-4']);
const pairs = [];
for (let a = 1; a <= 5; a++) {
  for (let b = a + 1; b <= 5; b++) {
    const related = rel.has(`${a}-${b}`);
    pairs.push({
      a,
      b,
      relation: related ? 'related' : 'unrelated',
      justification: related ? 'Fixture pairing: both igneous.' : 'Fixture pairing: different origin.',
      source: null,
    });
  }
}
const lithology = { levels: { same: 1.0, related: 0.6, unrelated: 0.15 }, pairs };

fs.mkdirSync(out, { recursive: true });
const write = (name, data, pretty = true) =>
  fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, pretty ? 2 : 0) + '\n');
write('earth.fixture.json', earth, false);
write('targets.fixture.json', targets);
write('analogs.fixture.json', analogs);
write('lithology_similarity.fixture.json', lithology);
console.log(`fixtures written: ${cells.length} earth cells at ${RES} degrees`);

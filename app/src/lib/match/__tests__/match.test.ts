// Unit tests for the match record. Run: npx tsx --test app/src/lib/match/__tests__/*.test.ts

import { deepEqual, equal, ok } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DIMENSION_IDS, PRESETS, PURPOSE_IDS, buildProfileIndex, prepareTarget, scoreCell } from '../../scoring/index';
import type { Target } from '../../scoring/index';
import { targetFromPoint } from '../../targets/index';
import {
  EXTRA_DIMENSIONS,
  EXTRA_DIMENSION_IDS,
  MATCH_AT,
  PARTLY_AT,
  buildMatchRecord,
  compareExtra,
  earthPlaceFromCell,
  earthPlaceFromSite,
  emitFamilies,
  extendedPurposeScore,
  extraDimension,
  familiesOfEmitName,
  familyOfEmitName,
  purposesOfExtra,
  sharedMinerals,
  sitePosts,
  targetAtSiteWindow,
  targetEnvironment,
  verdictOf,
  verdictOfScore,
} from '../index';
import type { ExtraValue, MatchRecord, TargetEnvironmentFile, TargetWindowsFile } from '../index';
import { CLASSES, EARTH, FAMILIES, META, RANGES, SITE, TABLE, TARGET, TARGET_MINERALS, cell, val } from './fixtures';

const record = (over: Partial<Parameters<typeof buildMatchRecord>[0]> = {}): MatchRecord =>
  buildMatchRecord({ target: TARGET, place: earthPlaceFromCell(cell(), META, { name: 'Good cell' }), ranges: RANGES, table: TABLE, classes: CLASSES, generatedAt: '2026-11-15T00:00:00Z', ...over });
const dim = (r: MatchRecord, id: string) => r.dimensions.find((d) => d.id === id) as MatchRecord['dimensions'][number];
const row = (r: MatchRecord, key: string) => r.dimensions.flatMap((d) => d.rows).find((x) => x.key === key) as MatchRecord['dimensions'][number]['rows'][number];

describe('The three-level verdict', () => {
  it('reads a similarity at the stated thresholds', () => {
    equal(verdictOf(1), 'matches');
    equal(verdictOf(MATCH_AT), 'matches');
    equal(verdictOf(MATCH_AT - 1e-9), 'partly');
    equal(verdictOf(PARTLY_AT), 'partly');
    equal(verdictOf(PARTLY_AT - 1e-9), 'does-not-match');
    equal(verdictOf(0), 'does-not-match');
    equal(verdictOf(null), 'no-data');
    equal(verdictOf(Number.NaN), 'no-data');
  });

  it('puts the three rock-class levels on the three verdicts', () => {
    equal(verdictOf(TABLE.levels.same), 'matches');
    equal(verdictOf(TABLE.levels.related), 'partly');
    equal(verdictOf(TABLE.levels.unrelated), 'does-not-match');
  });

  it('reads a 0 to 100 score on the same thresholds', () => {
    equal(verdictOfScore(80), 'matches');
    equal(verdictOfScore(40), 'partly');
    equal(verdictOfScore(5), 'does-not-match');
    equal(verdictOfScore(null), 'no-data');
  });
});

describe('The match record has one stable shape', () => {
  const r = record();

  it('always lists the five core dimensions, then every dimension added after the freeze, in a fixed order', () => {
    deepEqual(r.dimensions.map((d) => d.id), [...DIMENSION_IDS, ...EXTRA_DIMENSION_IDS]);
    deepEqual(r.dimensions.map((d) => d.id), ['geology', 'terrain', 'climate', 'bareGround', 'sunlight', 'minerals', 'ice', 'dust', 'wind']);
    deepEqual(r.purposes.map((p) => p.id), [...PURPOSE_IDS]);
    equal(r.version, 1);
    equal(r.generatedAt, '2026-11-15T00:00:00Z');
  });

  it('keeps the same keys and row keys when data is missing', () => {
    const empty = record({ place: earthPlaceFromCell(cell({ slope: null, roughness: null, lithology: null, tempMean: null, tempRange: null }), META), table: null });
    deepEqual(empty.dimensions.map((d) => [d.id, d.rows.map((x) => x.key)]), r.dimensions.map((d) => [d.id, d.rows.map((x) => x.key)]));
    deepEqual(Object.keys(empty).sort(), Object.keys(r).sort());
    for (const d of empty.dimensions) for (const x of d.rows) deepEqual(Object.keys(x).sort(), ['earth', 'key', 'label', 'reason', 'similarity', 'target', 'unit', 'verdict']);
  });

  it('marks which dimensions are in the frozen score and which were added after', () => {
    for (const d of r.dimensions.slice(0, 5)) ok(d.inScore && !d.addedAfterFreeze, d.id);
    for (const d of r.dimensions.slice(5)) ok(!d.inScore && d.addedAfterFreeze, d.id);
  });

  it('gives every row both raw values, a unit, a similarity, a verdict and a one-line reason', () => {
    for (const d of r.dimensions.slice(0, 5)) {
      ok(d.rows.length >= 1);
      for (const x of d.rows) {
        ok(x.earth.value !== null && x.target.value !== null, x.key);
        ok(typeof x.similarity === 'number' && x.similarity >= 0 && x.similarity <= 1, x.key);
        ok(x.reason.length > 10 && !x.reason.includes('\n') && x.reason.endsWith('.'), `${x.key}: ${x.reason}`);
        ok(x.earth.source && x.earth.badge && x.target.source && x.target.badge, `${x.key}: source and badge on both sides`);
      }
    }
  });

  it('is the same record for the same input', () => {
    deepEqual(record(), r);
  });
});

describe('The numbers in a record are the scoring library\'s own', () => {
  const r = record();
  const prepared = prepareTarget(TARGET, RANGES, TABLE);

  it('carries the frozen all-round score unchanged', () => {
    const s = scoreCell(cell(), prepared, PRESETS.base.weights);
    equal(r.score.value, s.score);
    equal(r.score.confidence, s.confidence);
    equal(r.score.reason, s.reason);
    equal(r.score.preset, 'base');
    equal(record({ presetId: 'rover' }).score.value, scoreCell(cell(), prepared, PRESETS.rover.weights).score);
  });

  it('takes row similarities from the key breakdown', () => {
    const s = scoreCell(cell(), prepared, PRESETS.base.weights);
    for (const f of s.breakdown) for (const k of f.keys) equal(row(r, k.key).similarity, k.similarity, k.key);
  });

  it('adds a tie-fair percentile when an index is given, and null otherwise', () => {
    equal(dim(r, 'terrain').percentile, null);
    const withIndex = record({ index: buildProfileIndex(EARTH, prepared) });
    const p = dim(withIndex, 'terrain').percentile;
    ok(p !== null && p > 0.5 && p <= 1);
    equal(dim(withIndex, 'minerals').percentile, null);
  });
});

describe('Rows explain themselves', () => {
  it('says what differs, with the unit', () => {
    const r = record({ place: earthPlaceFromCell(cell({ slope: 10, precip: 800 }), META) });
    equal(row(r, 'slope').reason, 'Slope 10.0°: 6.0° steeper than the target.');
    equal(row(r, 'slope').verdict, 'does-not-match');
    equal(row(r, 'precip').reason, 'Precipitation 800 mm/year: 800 mm/year wetter than the target.');
    equal(row(r, 'roughness').verdict, 'matches');
  });

  it('shows the clamped value when the target lies beyond anything on Earth', () => {
    const r = record();
    ok(row(r, 'tempMean').target.text.includes("Earth's closest: -40 °C"));
    ok(row(r, 'tempMean').reason.includes('than the closest Earth gets to the target'));
    equal(row(r, 'tempMean').target.value, -60);
    deepEqual(r.beyondEarth.map((g) => g.key), ['tempMean', 'tempRange']);
    ok(r.beyondEarth[0]?.text.includes('-60 °C') && r.beyondEarth[0]?.text.includes('-40 °C'));
  });

  it('names rock classes and the three relations', () => {
    equal(row(record(), 'lithology').reason, 'Same rock class as the target: basic volcanic rocks.');
    const related = record({ place: earthPlaceFromCell(cell({ lithology: 10 }), META) });
    equal(row(related, 'lithology').verdict, 'partly');
    equal(row(related, 'lithology').reason, 'Related rock class: intermediate volcanic rocks here, basic volcanic rocks at the target.');
    const unrelated = record({ place: earthPlaceFromCell(cell({ lithology: 1 }), META) });
    equal(row(unrelated, 'lithology').verdict, 'does-not-match');
    equal(row(unrelated, 'lithology').earth.text, 'Unconsolidated sediments');
  });

  it('says which side has no data', () => {
    const noEarth = record({ place: earthPlaceFromCell(cell({ slope: null }), META) });
    equal(row(noEarth, 'slope').verdict, 'no-data');
    equal(row(noEarth, 'slope').earth.text, 'no data');
    ok(row(noEarth, 'slope').reason.includes('Earth place'));
    ok(dim(noEarth, 'terrain').reason.includes('1 of 2 measurements had no data'));
    const target: Target = { ...TARGET, values: { ...TARGET.values, lithology: val(null, null) } };
    const noTarget = record({ target });
    equal(row(noTarget, 'lithology').verdict, 'no-data');
    ok(row(noTarget, 'lithology').reason.includes('target has no published'));
    equal(row(noTarget, 'lithology').target.note, 'No published value.');
    equal(dim(noTarget, 'geology').verdict, 'no-data');
  });

  it('explains bare ground from land cover and permanent ice', () => {
    const antarctic = record({ place: earthPlaceFromCell(cell({ ndvi: null, barrenFrac: 0.12, snowIceFrac: 0.88 }), META) });
    equal(row(antarctic, 'ndvi').earth.text, '12% bare ground (land cover; no NDVI here)');
    equal(row(antarctic, 'ndvi').earth.source, 'land cover product');
    ok(row(antarctic, 'ndvi').reason.startsWith('12% of the cell is ice-free bare ground'));
    const icy = record({ place: earthPlaceFromCell(cell({ ndvi: 0.02, snowIceFrac: 0.9 }), META) });
    ok(row(icy, 'ndvi').reason.startsWith('Permanent ice covers 90% of the cell'));
    ok(row(icy, 'ndvi').earth.note?.includes('90% of the cell is permanent ice'));
    const forest = record({ place: earthPlaceFromCell(cell({ ndvi: 0.7 }), META) });
    equal(row(forest, 'ndvi').reason, 'Vegetation cover (NDVI 0.70) where the target is bare ground.');
  });

  it('labels the computed Sun elevation as computed, with a source', () => {
    const s = row(record(), 'sunElevation');
    equal(s.earth.scale, 'computed');
    ok(s.earth.source?.includes('latitude'));
    equal(s.earth.badge, 'Literature');
  });

  it('gives the strongest and the weakest dimension in the headline', () => {
    const r = record({ place: earthPlaceFromCell(cell({ precip: 3000 }), META) });
    ok(r.headline.weakest?.startsWith('Climate:'));
    ok(r.headline.strongest !== null && r.headline.strongest !== r.headline.weakest);
  });
});

describe('What Earth cannot copy and the caveats', () => {
  it('repeats the target\'s own sentences, untouched, and never scores them', () => {
    const r = record();
    deepEqual(r.cannotCopy, TARGET.cannotCopy);
    ok(r.caveats.some((c) => c.includes('never scored')));
    ok(r.caveats.some((c) => c.includes('added after the freeze')));
  });

  it('carries the target profile of a point picked on the map', () => {
    const profile = targetFromPoint('mars', 40, 100, { grid: null, curated: [TARGET] });
    const r = record({ target: profile.target, profile });
    equal(r.target.origin, 'none');
    equal(r.target.confidence, 'low');
    deepEqual(r.target.missing, ['tempMean', 'tempRange', 'slope', 'roughness', 'lithology']);
    equal(r.score.value, null);
    equal(r.score.verdict, 'no-data');
    equal(r.score.unscoredReason, 'coverage-too-low');
    ok(r.caveats.some((c) => c.includes('No global grid of Mars')));
  });

  it('reports a curated target as curated, with the confidence of its own coverage', () => {
    equal(record().target.origin, 'curated');
    equal(record().target.confidence, 'high');
    const target: Target = { ...TARGET, values: { ...TARGET.values, lithology: val(null, null) } };
    equal(record({ target }).target.confidence, 'medium');
  });
});

describe('An Earth place from a named site', () => {
  const place = earthPlaceFromSite(SITE, cell({ lat: 12.25, lon: 30.25, ndvi: 0.7, slope: 2, roughness: 600, lithology: 1, snowIceFrac: 0.1 }), META, { families: FAMILIES });

  it('takes terrain, vegetation and rock from the footprint and climate from the cell', () => {
    equal(place.scale, 'site');
    equal(place.cell.slope, 9);
    equal(place.cell.ndvi, 0.3);
    equal(place.cell.lithology, 10);
    equal(place.cell.precip, 50);
    equal(place.cell.snowIceFrac, 0.1);
    equal(place.provenance.slope?.scale, 'site');
    equal(place.provenance.lithology?.scale, 'volcano');
    equal(place.provenance.tempMean?.scale, 'grid');
    equal(place.provenance.slope?.source, 'site DEM');
    equal(place.rockName, 'Andesite');
    equal(place.bareShare, 0.28);
    equal(sitePosts(SITE), 11);
  });

  it('says so in the caveats, with the provisional outline and the site\'s own caveat', () => {
    ok(place.notes[0]?.includes('5 km footprint (provisional outline)'));
    ok(place.notes[0]?.includes('0.5 degree cell'));
    ok(place.notes.includes('Half the square is outside the lava.'));
    ok(place.notes.some((n) => n.includes('whole volcano')));
  });

  it('shows scale per row and the bare share next to NDVI', () => {
    const r = record({ place });
    equal(row(r, 'slope').earth.scale, 'site');
    equal(row(r, 'tempMean').earth.scale, 'grid');
    equal(row(r, 'lithology').earth.text, 'Intermediate volcanic rocks ("Andesite")');
    ok(row(r, 'ndvi').earth.note?.includes('28% of the footprint is bare ground'));
    equal(r.earth.footprintKm, 5);
    ok(r.caveats.some((c) => c.includes('not like for like')));
    ok(record({ place, terrainLikeForLike: true }).caveats.some((c) => c.includes('window of the same size')));
  });

  it('never fills a missing site value with the cell\'s value for terrain, vegetation or rock', () => {
    const bare = earthPlaceFromSite({ ...SITE, values: { ...SITE.values, slope: undefined, lithology: { value: null, scale: 'site', source: null, badge: null } } }, cell({ slope: 2, lithology: 1 }), META);
    equal(bare.cell.slope, null);
    equal(bare.cell.lithology, null);
    equal(bare.provenance.slope?.source, null);
  });
});

describe('The target in a site-sized window', () => {
  const file: TargetWindowsFile = {
    meta: { generatedAt: 'x', note: 'x', postM: 463, terrainFraction: 0.5, slopeSigmaFloor: 1, roughnessSigmaFloor: 50, source: { mars: 'MOLA' } },
    windows: { '11': { 'mars-test': { slope: 1.2, roughness: 300 } }, '6': { 'mars-test': { slope: null, roughness: null } } },
  };

  it('replaces slope and roughness, with tolerances by the frozen rule', () => {
    const t = targetAtSiteWindow(TARGET, 11, file) as Target;
    equal(t.values.slope.value, 1.2);
    equal(t.values.slope.sigma, 1); // half of 1.2 is under the floor
    equal(t.values.roughness.sigma, 150);
    ok(t.values.slope.source?.includes('MOLA') && t.values.slope.source.includes('5.1 km window'));
    equal(t.values.tempMean, TARGET.values.tempMean);
    equal(TARGET.values.slope.value, 4); // the curated target is not changed
  });

  it('returns null for a window that was not measured and nulls for a missing measurement', () => {
    equal(targetAtSiteWindow(TARGET, 9, file), null);
    equal(targetAtSiteWindow(TARGET, 6, file)?.values.slope.value, null);
    equal(targetAtSiteWindow(TARGET, 6, file)?.values.slope.source, null);
  });
});

describe('Minerals on both sides', () => {
  const earth = emitFamilies(SITE.mineralogy, FAMILIES);

  it('counts a mixture for every family named in it', () => {
    deepEqual(familiesOfEmitName('fe3+_hematite-nano+goethite-fg-amix', FAMILIES).map((f) => f.id), ['hematite', 'goethite']);
    deepEqual(familiesOfEmitName('calcite+0.2Na-mont', [...FAMILIES, { id: 'x', label: 'X', emitPatterns: ['-mont'] }]).map((f) => f.id), ['carbonate', 'x']);
    deepEqual(familiesOfEmitName('organic_plastic-vinyl', FAMILIES), []);
    const mixed = emitFamilies({ value: { group1: { identifiedShare: 1, top: [{ libraryName: 'fe3+_hematite-nano+goethite-fg-amix', libraryTitle: 'mix', shareOfValidPixels: 0.2, meanBandDepth: 0.1 }] }, group2: null }, source: 's', badge: 'Measured' }, FAMILIES);
    deepEqual(mixed?.families.map((m) => [m.family, m.shareOfValidPixels]), [['goethite', 0.2], ['hematite', 0.2]]);
  });

  it('reduces EMIT library names to families', () => {
    equal(familyOfEmitName('fe3+_hematite.thincoat', FAMILIES)?.id, 'hematite');
    equal(familyOfEmitName('smectite_nontronite_swelling', FAMILIES)?.id, 'smectite');
    equal(familyOfEmitName('carbonate_aragonite', FAMILIES)?.id, 'carbonate');
    equal(familyOfEmitName('sioh_hydrated_basaltic_glass', FAMILIES), null);
  });

  it('sums shares per family, drops vegetation, keeps what it cannot assign in view', () => {
    deepEqual(earth?.families.map((m) => [m.family, m.shareOfValidPixels]), [['hematite', 0.16], ['goethite', 0.11]]);
    equal(earth?.nonMineralShare, 0.6);
    deepEqual(earth?.unassigned.map((e) => e.libraryName), ['sioh_hydrated_basaltic_glass']);
  });

  it('ignores a family seen in under 1% of the pixels, unless the limit is lowered', () => {
    ok(!earth?.families.some((m) => m.family === 'smectite'));
    ok(emitFamilies(SITE.mineralogy, FAMILIES, 0.001)?.families.some((m) => m.family === 'smectite'));
  });

  it('returns null when a site has no EMIT data', () => {
    equal(emitFamilies(null, FAMILIES), null);
    equal(emitFamilies({ value: null, source: null, badge: null }, FAMILIES), null);
  });

  it('reports shared, target-only, not comparable and Earth-only families', () => {
    const s = sharedMinerals(earth, TARGET_MINERALS, FAMILIES);
    deepEqual(s?.shared.map((x) => x.family), ['hematite']);
    deepEqual(s?.targetOnly.map((x) => x.family), ['smectite', 'carbonate']);
    deepEqual(s?.notComparable.map((x) => x.family), ['plagioclase']);
    deepEqual(s?.earthOnly.map((x) => x.family), ['goethite']);
    equal(s?.similarity, 1 / 3);
    equal(s?.targetOnly[0]?.target.length, 2); // saponite and nontronite, one family
  });

  it('gives no similarity when nothing can be compared', () => {
    const onlyPlagioclase = TARGET_MINERALS.filter((m) => m.family === 'plagioclase');
    equal(sharedMinerals(earth, onlyPlagioclase, FAMILIES)?.similarity, null);
    equal(sharedMinerals(earth, [], FAMILIES), null);
    equal(sharedMinerals(null, TARGET_MINERALS, FAMILIES), null);
  });

  it('enters the record as its own dimension, with the shared families in the reason', () => {
    const place = earthPlaceFromSite(SITE, cell(), META, { families: FAMILIES });
    equal(place.extras.minerals?.text, 'hematite and goethite');
    ok(place.extras.minerals?.note?.includes('Dry vegetation is matched in 60% of the pixels'));
    const targetSide: ExtraValue = { value: ['hematite', 'smectite', 'plagioclase', 'carbonate'], unit: '', text: 'hematite, smectite clay, plagioclase and carbonate', source: 'papers', badge: 'Mission', scale: 'target' };
    const r = record({ place, targetExtras: { minerals: targetSide }, minerals: sharedMinerals(earth, TARGET_MINERALS, FAMILIES) });
    const m = dim(r, 'minerals');
    equal(m.similarity, 1 / 3);
    equal(m.verdict, 'partly');
    equal(m.reason, 'Shares hematite (1 of 3 comparable mineral families); smectite clay and carbonate reported at the target and not seen here.');
    equal(m.rows[0]?.earth.badge, 'Measured');
    equal(m.rows[0]?.target.source, 'papers');
    ok(m.addedAfterFreeze && !m.inScore);
  });

  it('does not change the all-round score', () => {
    const place = earthPlaceFromSite(SITE, cell(), META, { families: FAMILIES });
    const bare = record({ place });
    const withMinerals = record({ place, targetExtras: { minerals: { value: ['hematite'], unit: '', text: 'hematite', source: 's', badge: 'Mission', scale: 'target' } }, minerals: sharedMinerals(earth, TARGET_MINERALS, FAMILIES) });
    deepEqual(withMinerals.score, bare.score);
    deepEqual(withMinerals.dimensions.slice(0, 5), bare.dimensions.slice(0, 5));
    deepEqual(withMinerals.purposes.map((p) => p.score), bare.purposes.map((p) => p.score));
  });
});

describe('Dimensions added after the freeze', () => {
  const v = (value: number | null): ExtraValue => ({ value, unit: 'm/s', text: value === null ? 'no data' : `${value} m/s`, source: value === null ? null : 'a source', badge: value === null ? null : 'Measured', scale: 'grid' });

  it('are defined with the purposes they belong to and a one-line reason', () => {
    deepEqual(EXTRA_DIMENSIONS.map((d) => d.id), ['minerals', 'ice', 'dust', 'wind']);
    for (const d of EXTRA_DIMENSIONS) ok(d.why.length > 20 && d.purposes.length > 0, d.id);
    deepEqual(purposesOfExtra('minerals'), ['geology', 'astrobiology', 'base']);
    deepEqual(purposesOfExtra('ice'), ['ice', 'astrobiology', 'base']);
    deepEqual(purposesOfExtra('wind'), ['base']);
  });

  it('say which side has no data', () => {
    const wind = extraDimension('wind');
    equal(compareExtra(wind, undefined, undefined).reason, 'No wind data on either side yet.');
    equal(compareExtra(wind, undefined, v(5)).reason, 'No wind data for the Earth place.');
    equal(compareExtra(wind, v(5), v(null)).reason, 'No published wind value for the target.');
    equal(compareExtra(wind, v(5), undefined).verdict, 'no-data');
  });

  it('give no similarity while no tolerance has been agreed', () => {
    const d = compareExtra(extraDimension('wind'), v(5), v(7));
    equal(d.similarity, null);
    ok(d.reason.includes('no tolerance has been agreed'));
    equal(d.rows[0]?.earth.text, '5 m/s');
  });

  it('use a Gaussian once a tolerance is set', () => {
    const d = compareExtra({ ...extraDimension('wind'), sigma: 2 }, v(5), v(7));
    ok(Math.abs((d.similarity as number) - Math.exp(-0.5)) < 1e-12);
    equal(d.verdict, 'partly');
    equal(d.reason, 'Wind 5 m/s against 7 m/s: lower than the target.');
  });
});

describe('The target side of wind, dust and ice', () => {
  const file: TargetEnvironmentFile = {
    meta: { generatedAt: 'x', note: 'x', definitions: {} },
    targets: {
      'mars-test': {
        wind: { value: 5.06, unit: 'm/s', source: 'a climate model', badge: 'Literature', note: 'Model.' },
        dust: { value: 0.48, unit: 'optical depth', source: 'a climate model', badge: 'Literature' },
        ice: { value: null, unit: 'share of ground', source: null, badge: null, note: 'No mapped value yet.' },
      },
      'moon-test': { wind: { value: 0, unit: 'm/s', source: 'fact sheet', badge: 'Literature' }, ice: { value: 0.111, unit: 'share of ground', source: 'Diviner', badge: 'Mission' } },
    },
  };

  it('turns the file into target extras, with units and sources', () => {
    const t = targetEnvironment(file, 'mars-test');
    equal(t.wind?.text, '5.06 m/s');
    equal(t.wind?.source, 'a climate model');
    equal(t.wind?.scale, 'target');
    equal(t.dust?.text, '0.48 optical depth');
    equal(t.ice?.value, null);
    equal(t.ice?.note, 'No mapped value yet.');
    equal(targetEnvironment(file, 'moon-test').ice?.text, '11.1% of the ground');
    equal(targetEnvironment(file, 'moon-test').wind?.text, '0 m/s');
    deepEqual(targetEnvironment(file, 'unknown'), {});
    deepEqual(targetEnvironment(null, 'mars-test'), {});
  });

  it('shows the target value in the record and says the Earth value is missing', () => {
    const r = record({ targetExtras: targetEnvironment(file, 'mars-test') });
    const wind = dim(r, 'wind');
    equal(wind.verdict, 'no-data');
    equal(wind.rows[0]?.target.text, '5.06 m/s');
    equal(wind.rows[0]?.target.badge, 'Literature');
    equal(wind.reason, 'No wind data for the Earth place.');
    equal(dim(r, 'ice').reason, 'No ice and permafrost data on either side yet.');
    equal(dim(r, 'ice').rows[0]?.target.note, 'No mapped value yet.');
  });

  it('leaves the all-round score alone', () => {
    deepEqual(record({ targetExtras: targetEnvironment(file, 'mars-test') }).score, record().score);
  });
});

describe('Extended purpose scores', () => {
  it('blend an extra dimension in with the average weight of the purpose\'s own factors', () => {
    // Geology has one factor (rock type, 0.15): the extra gets 0.15 too, so the result is the geometric mean.
    const g = extendedPurposeScore('geology', 100, ['rockType'], [{ id: 'minerals', similarity: 0.25 }]);
    ok(Math.abs((g.score as number) - 50) < 1e-9);
    deepEqual(g.used, ['minerals']);
    // Astrobiology: temperature 0.15, dryness 0.15, rock 0.15, bare 0.2 = 0.65; the extra gets 0.1625.
    const a = extendedPurposeScore('astrobiology', 40, ['temperature', 'dryness', 'rockType', 'bareGround'], [{ id: 'minerals', similarity: 1 }]);
    ok(Math.abs((a.score as number) - 100 * Math.exp((0.65 * Math.log(0.4)) / 0.8125)) < 1e-9);
  });

  it('use only extras that belong to the purpose and have a similarity', () => {
    deepEqual(extendedPurposeScore('mobility', 60, ['terrain', 'bareGround'], [{ id: 'minerals', similarity: 0.5 }]), { score: null, used: [] });
    deepEqual(extendedPurposeScore('geology', 60, ['rockType'], [{ id: 'minerals', similarity: null }]), { score: null, used: [] });
  });

  it('cannot rescue a place the frozen rules do not score, and keep a zero a zero', () => {
    equal(extendedPurposeScore('geology', null, ['rockType'], [{ id: 'minerals', similarity: 1 }]).score, null);
    equal(extendedPurposeScore('geology', 0, ['rockType'], [{ id: 'minerals', similarity: 1 }]).score, 0);
    equal(extendedPurposeScore('geology', 80, ['rockType'], [{ id: 'minerals', similarity: 0 }]).score, 0);
  });

  it('appear in the record beside the frozen purpose score, never instead of it', () => {
    const place = earthPlaceFromSite(SITE, cell(), META, { families: FAMILIES });
    const earth = emitFamilies(SITE.mineralogy, FAMILIES);
    const r = record({ place, targetExtras: { minerals: { value: ['hematite'], unit: '', text: 'hematite', source: 's', badge: 'Mission', scale: 'target' } }, minerals: sharedMinerals(earth, TARGET_MINERALS, FAMILIES) });
    const geology = r.purposes.find((p) => p.id === 'geology');
    const mobility = r.purposes.find((p) => p.id === 'mobility');
    ok(geology && geology.score !== null && geology.extendedScore !== null && geology.extendedScore < geology.score);
    deepEqual(geology?.extraDimensions, ['minerals']);
    equal(mobility?.extendedScore, null);
    deepEqual(mobility?.extraDimensions, []);
  });
});

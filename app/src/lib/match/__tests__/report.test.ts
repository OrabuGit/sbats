// Unit tests for the report content. Run: npx tsx --test app/src/lib/match/__tests__/*.test.ts

import { deepEqual, equal, ok } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PRESETS, prepareTarget, rankStability, stabilityBasis } from '../../scoring/index';
import { measureRoute } from '../../route/index';
import { buildMatchRecord, buildReport, earthPlaceFromCell, earthPlaceFromSite, emitFamilies, sharedMinerals } from '../index';
import type { ExtraValue, MatchReport, ReportText } from '../index';
import { CLASSES, EARTH, FAMILIES, META, RANGES, SITE, TABLE, TARGET, TARGET_MINERALS, cell } from './fixtures';

const earthMinerals = emitFamilies(SITE.mineralogy, FAMILIES);
const shared = sharedMinerals(earthMinerals, TARGET_MINERALS, FAMILIES);
const targetSide: ExtraValue = { value: ['hematite', 'smectite', 'plagioclase', 'carbonate'], unit: '', text: 'hematite, smectite clay, plagioclase and carbonate', source: 'Rover papers (list in target_minerals.json)', badge: 'Mission', scale: 'target' };
const sitePlace = earthPlaceFromSite(SITE, cell(), META, { families: FAMILIES });
const record = buildMatchRecord({ target: TARGET, place: sitePlace, ranges: RANGES, table: TABLE, classes: CLASSES, targetExtras: { minerals: targetSide }, minerals: shared, generatedAt: '2026-11-15T00:00:00Z' });
const report = buildReport({ record, minerals: shared });

const texts = (r: MatchReport): ReportText[] => [
  ...r.summary,
  ...r.sections.flatMap((s) => [...s.paragraphs, ...(s.table?.rows.flat() ?? [])]),
];
const section = (r: MatchReport, id: string) => r.sections.find((s) => s.id === id);

describe('The report object', () => {
  it('has a title, a summary and the fixed sections in order', () => {
    equal(report.version, 1);
    equal(report.title, 'Test volcano as an analog for Test crater');
    equal(report.generatedAt, '2026-11-15T00:00:00Z');
    deepEqual(report.sections.map((s) => s.id), ['target', 'earth', 'score', 'dimensions', 'after-freeze', 'purposes', 'cannot-copy', 'limits']);
    ok(report.summary.length >= 3 && report.summary.length <= 5);
    ok(report.summary[0]?.text.includes('Test volcano against Test crater'));
  });

  it('is the same object for the same input', () => {
    deepEqual(buildReport({ record, minerals: shared }), report);
  });

  it('has one table row per measurement, with both values, the verdict and the reason', () => {
    const t = section(report, 'dimensions')?.table;
    deepEqual(t?.columns, ['Dimension', 'Measurement', 'Earth', 'Target', 'Similarity', 'Verdict', 'Why']);
    equal(t?.rows.length, 8); // lithology, slope, roughness, tempMean, tempRange, precip, ndvi, sunElevation
    const slope = t?.rows.find((r) => r[1]?.text === 'Slope');
    equal(slope?.[2]?.text, '9.0°');
    equal(slope?.[3]?.text, '4.0°');
    equal(slope?.[5]?.text, 'Does not match');
    ok(slope?.[6]?.text.includes('steeper'));
  });

  it('prints what Earth cannot copy and says it is never scored', () => {
    const s = section(report, 'cannot-copy');
    equal(s?.paragraphs[0]?.text, 'Never part of any score.');
    for (const line of TARGET.cannotCopy) ok(s?.paragraphs.some((p) => p.text === line), line);
    ok(s?.paragraphs.some((p) => p.text.includes('closest any Earth cell comes')));
    ok(report.footer.some((f) => f.includes('never scored')));
    ok(report.footer.some((f) => f.includes('AI assistance')));
  });

  it('carries every caveat of the record under limits', () => {
    deepEqual(section(report, 'limits')?.paragraphs.map((p) => p.text), record.caveats);
  });
});

describe('Numbered citations', () => {
  it('numbers each source once, from 1, in order of first use', () => {
    deepEqual(report.citations.map((c) => c.n), report.citations.map((_c, i) => i + 1));
    equal(new Set(report.citations.map((c) => c.text)).size, report.citations.length);
    ok(report.citations.length >= 6);
  });

  it('only cites numbers that exist, and every citation is used', () => {
    const used = new Set(texts(report).flatMap((t) => t.cites));
    for (const n of used) ok(n >= 1 && n <= report.citations.length, `citation ${n}`);
    for (const c of report.citations) ok(used.has(c.n), `citation ${c.n} is never used: ${c.text}`);
  });

  it('puts the source of each side of each row on that cell', () => {
    const t = section(report, 'dimensions')?.table;
    const slope = t?.rows.find((r) => r[1]?.text === 'Slope');
    const cite = (n: number | undefined) => report.citations.find((c) => c.n === n);
    equal(cite(slope?.[2]?.cites[0])?.text, 'site DEM');
    equal(cite(slope?.[2]?.cites[0])?.badge, 'Measured');
    equal(cite(slope?.[3]?.cites[0])?.text, 'target source');
    equal(cite(slope?.[3]?.cites[0])?.badge, 'Mission');
    const temp = t?.rows.find((r) => r[1]?.text === 'Mean temperature');
    equal(cite(temp?.[2]?.cites[0])?.text, 'POWER');
    // Slope and roughness share one source on each side: one number each, not two.
    const rough = t?.rows.find((r) => r[1]?.text === 'Roughness');
    deepEqual(rough?.[2]?.cites, slope?.[2]?.cites);
  });

  it('cites no source for a value that has none', () => {
    const bare = buildMatchRecord({ target: TARGET, place: earthPlaceFromCell(cell({ slope: null }), META), ranges: RANGES, table: TABLE, classes: CLASSES, generatedAt: 'x' });
    const r = buildReport({ record: bare });
    const slope = section(r, 'dimensions')?.table?.rows.find((row) => row[1]?.text === 'Slope');
    equal(slope?.[2]?.text, 'no data');
    deepEqual(slope?.[2]?.cites, []);
  });
});

describe('Minerals in the report', () => {
  it('lists shared, target-only, not comparable and Earth-only families, each cited', () => {
    const s = section(report, 'after-freeze');
    ok(s?.paragraphs[0]?.text.includes('added after the score was frozen'));
    const rows = s?.table?.rows ?? [];
    deepEqual(rows.map((r) => [r[0]?.text, r[3]?.text]), [
      ['Hematite', 'Shared'],
      ['Smectite clay', 'At the target only'],
      ['Carbonate', 'At the target only'],
      ['Plagioclase feldspar', 'Not comparable'],
      ['Goethite', 'On Earth only'],
    ]);
    ok(rows[0]?.[2]?.text.includes('hematite (CheMin, measured in place)'));
    ok((rows[0]?.[2]?.cites.length ?? 0) > 0);
    ok(s?.paragraphs.some((p) => p.text.includes('pointer for a geologist')));
  });

  it('has no mineral table when no mineral comparison was passed', () => {
    equal(section(buildReport({ record }), 'after-freeze')?.table, null);
  });
});

describe('Optional sections', () => {
  const prepared = prepareTarget(TARGET, RANGES, TABLE);
  const result = rankStability(stabilityBasis(EARTH, prepared), PRESETS.base.weights, { draws: 20, topN: 2 });
  const tile = { size: 11, pixelM: 30, data: Float32Array.from({ length: 121 }, (_v, i) => 5 * (i % 11)) };
  const route = measureRoute(tile, [{ col: 1, row: 5 }, { col: 9, row: 5 }], {
    limit: { rover: 'Test rover', limitDeg: 5, kind: 'operating rule', source: 'Rover fact sheet' },
    speed: { rover: 'Test rover', metresPerHour: 120, kind: 'top speed on flat, hard ground', source: 'Rover fact sheet' },
  });
  const full = buildReport({
    record,
    minerals: shared,
    stability: { result, cell: result.followed[0] },
    routes: [{ label: 'Rim to floor on Earth', result: route }],
    knownSite: { id: 'k', name: 'Bradbury Landing', body: 'mars', lat: -4.59, lon: 137.44, kind: 'landing-site', mission: 'Curiosity', agency: 'NASA', date: '2012-08-06', status: 'rover', source: 'NASA page', url: 'https://example.org', access: 'primary' },
    validation: { holdoutAuc: 0.979, holdoutTop10: 0.292, holdoutMeanPercentile: 0.716, frozenAt: '2026-11-14' },
  });

  it('adds rank stability with this place\'s own rank range', () => {
    const s = section(full, 'stability');
    ok(s?.paragraphs[0]?.text.includes('20 redraws'));
    ok(s?.paragraphs[1]?.text.startsWith('This place ranks 1 of'));
    ok(s?.paragraphs[2]?.text.includes('seed'));
  });

  it('adds a route with its distance, the share above the cited limit and a lower-bound time', () => {
    const s = section(full, 'route-1');
    ok(s?.paragraphs[0]?.text.includes('0.24 km'));
    ok(s?.paragraphs[1]?.text.includes('steeper than 5 degrees'));
    ok(s?.paragraphs[2]?.text.includes('at least 2.0 hours'));
    const n = s?.paragraphs[1]?.cites[0];
    equal(full.citations.find((c) => c.n === n)?.text, 'Rover fact sheet');
    deepEqual(s?.paragraphs[2]?.cites, s?.paragraphs[1]?.cites);
    ok(s?.paragraphs.some((p) => p.text.includes('No energy figure')));
  });

  it('names the place the target was picked from, with its source, and the validation figures', () => {
    const t = section(full, 'target');
    const named = t?.paragraphs.find((p) => p.text.includes('Bradbury Landing'));
    ok(named && named.cites.length === 1);
    ok(full.citations.find((c) => c.n === named?.cites[0])?.text.includes('NASA page'));
    ok(section(full, 'score')?.paragraphs.some((p) => p.text.includes('98% of the time') && p.text.includes('29%')));
  });

  it('keeps the section order with the optional sections in place', () => {
    deepEqual(full.sections.map((s) => s.id), ['target', 'earth', 'score', 'dimensions', 'after-freeze', 'purposes', 'stability', 'route-1', 'cannot-copy', 'limits']);
  });
});

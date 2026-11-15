// Checks the real data files behind the match record, the named places and the routes, and runs the
// libraries on them. Each block is skipped, with a visible note, while its file does not exist.

import { deepEqual, equal, ok } from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DIMENSION_IDS, PRESETS, PURPOSE_IDS, computeEarthRanges, nearestCell, prepareTarget, scoreCell, scoreCells, scoresFromBasis, stabilityBasis } from '../../scoring/index';
import type { EarthCell, LithologyClass, LithologyTable, Target } from '../../scoring/index';
import { measureRoute, tileFromFloat32 } from '../../route/index';
import { CURATED_RADIUS_KM, distanceKm, targetFromKnownSite, targetFromPoint, tolerancesFrom } from '../../targets/index';
import type { KnownSitesFile } from '../../targets/index';
import { EXTRA_DIMENSION_IDS, buildMatchRecord, buildReport, earthPlaceFromCell, earthPlaceFromSite, emitFamilies, familiesOfEmitName, sharedMinerals, sitePosts, targetAtSiteWindow, targetEnvironment } from '../index';
import type { EarthMetaLike, SiteEntryLike, TargetEnvironmentFile, TargetMineralsFile, TargetWindowsFile } from '../index';

const DATA = fileURLToPath(new URL('../../../../../data/', import.meta.url));
const load = <T>(name: string): T | null => (existsSync(`${DATA}${name}`) ? (JSON.parse(readFileSync(`${DATA}${name}`, 'utf8')) as T) : null);
const skip = (what: string): void => console.log(`    (skipped: ${what})`);

const targets = load<Target[]>('targets.json');
interface EarthFileLike { meta: Omit<EarthMetaLike, 'factors'> & { factors: { key: string; source: string; classes?: LithologyClass[] }[] }; cells: EarthCell[] }
const earth = load<EarthFileLike>('earth.json');
const table = load<LithologyTable>('lithology_similarity.json');
const sites = load<{ sites: (SiteEntryLike & { kind: string })[] }>('sites.json');
const windows = load<TargetWindowsFile>('target_windows.json');
const minerals = load<TargetMineralsFile>('target_minerals.json');
const known = load<KnownSitesFile>('known_sites.json');
const rovers = load<{ rovers: { id: string; name: string; body: string; slopeLimit: Fig | null; otherSlopeFigures: Fig[]; speed: Fig | null; otherSpeeds: Fig[]; energy: Fig | null }[] }>('rovers.json');
const benchmarks = load<{ meta: { targets: { id: string }[]; mineralsIncluded: boolean }; sites: { id: string; kind: string; results: { target: string; site: Record<string, unknown>; cell: Record<string, unknown> }[] }[] }>('benchmarks.json');
interface Fig { value: number; unit: string; kind: string; source: string; url: string; badge: string; derived?: boolean; note?: string }

describe('data/known_sites.json', () => {
  it('lists every mission the brief names, each with coordinates in range and a source', () => {
    if (!known) return skip('known_sites.json does not exist yet');
    const ids = known.sites.map((s) => s.id);
    equal(new Set(ids).size, ids.length);
    for (const s of known.sites) {
      ok(/^(moon|mars)-[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id), s.id);
      ok(s.id.startsWith(`${s.body}-`), s.id);
      ok(s.lat >= -90 && s.lat <= 90 && s.lon >= -180 && s.lon <= 180, `${s.id} coordinates`);
      ok(s.kind === 'landing-site' || s.kind === 'candidate-region', s.id);
      ok(s.source.length > 10 && /^https?:\/\//.test(s.url), `${s.id} needs a source and a URL`);
      ok(s.access === 'primary' || s.access === 'secondary', s.id);
      if (s.kind === 'landing-site') ok(s.date && /^\d{4}-\d{2}-\d{2}$/.test(s.date), `${s.id} landing date`);
    }
    const names = known.sites.map((s) => `${s.name} ${s.mission ?? ''}`).join(' | ');
    for (const wanted of ['Apollo 11', 'Apollo 12', 'Apollo 14', 'Apollo 15', 'Apollo 16', 'Apollo 17', 'Surveyor 1', "Chang'e 3", "Chang'e 4", "Chang'e 5", "Chang'e 6", 'Chandrayaan-3',
      'Viking 1', 'Viking 2', 'Pathfinder', 'Spirit', 'Opportunity', 'Phoenix', 'Curiosity', 'InSight', 'Perseverance', 'Zhurong', 'Artemis III', 'Marius Hills', 'Arcadia Planitia']) {
      ok(names.includes(wanted), `${wanted} is missing`);
    }
  });

  it('links a place to a curated target only when it lies inside that target\'s window', () => {
    if (!known || !targets) return skip('needs known_sites.json and targets.json');
    const byId = new Map(targets.map((t) => [t.id, t]));
    let linked = 0;
    for (const s of known.sites) {
      if (!s.targetId) {
        for (const t of targets) if (t.body === s.body) ok(distanceKm(s.body, s.lat, s.lon, t.lat, t.lon) > CURATED_RADIUS_KM, `${s.id} is inside ${t.id} but not linked`);
        continue;
      }
      const t = byId.get(s.targetId);
      ok(t && t.body === s.body, `${s.id}: unknown target ${s.targetId}`);
      if (t) ok(distanceKm(s.body, s.lat, s.lon, t.lat, t.lon) <= CURATED_RADIUS_KM, s.id);
      linked += 1;
    }
    ok(linked >= 5, 'Curiosity, Perseverance, Marius Hills, Shackleton and Arcadia AP-1 at least must be linked');
    equal(known.sites.find((s) => s.name.startsWith('Curiosity'))?.targetId, 'mars-gale');
    equal(known.sites.find((s) => s.name.startsWith('Perseverance'))?.targetId, 'mars-jezero');
    equal(known.sites.find((s) => s.name === 'Marius Hills Pit')?.targetId, 'moon-marius-hills');
  });

  it('gives a target profile for every named place, with no grid loaded', () => {
    if (!known || !targets) return skip('needs known_sites.json and targets.json');
    deepEqual(tolerancesFrom(targets), { tempMean: 15, tempRange: 5, terrainFraction: 0.5 });
    for (const s of known.sites) {
      const p = targetFromKnownSite(s, { grid: null, curated: targets });
      equal(p.origin, s.targetId ? 'curated' : 'none', s.id);
      if (s.targetId) equal(p.target.id, s.targetId);
      else {
        equal(p.confidence, 'low');
        equal(p.target.values.precip.value, 0);
        ok(p.target.cannotCopy.length >= 3, `${s.id} must still say what Earth cannot copy`);
      }
    }
  });

  it('returns each curated target for its own coordinates', () => {
    if (!targets) return skip('needs targets.json');
    for (const t of targets) {
      const p = targetFromPoint(t.body, t.lat, t.lon, { grid: null, curated: targets });
      equal(p.origin, 'curated');
      equal(p.target.id, t.id);
    }
  });
});

describe('data/target_windows.json', () => {
  it('holds every target for every site window size, with the frozen tolerance rule', () => {
    if (!windows || !targets || !sites) return skip('needs target_windows.json, targets.json and sites.json');
    equal(windows.meta.terrainFraction, 0.5);
    equal(windows.meta.slopeSigmaFloor, 1);
    equal(windows.meta.roughnessSigmaFloor, 50);
    for (const s of sites.sites) {
      for (const t of targets) {
        const like = targetAtSiteWindow(t, sitePosts(s), windows);
        ok(like, `no ${sitePosts(s)}-post window for ${t.id} (site ${s.id})`);
        if (like && like.values.slope.value !== null) {
          equal(like.values.slope.sigma, Math.max(1, 0.5 * like.values.slope.value));
          equal(like.values.slope.badge, 'Mission');
          equal(like.values.tempMean, t.values.tempMean);
        }
      }
    }
  });
});

describe('data/target_minerals.json', () => {
  it('cites every target mineral and uses only defined families', () => {
    if (!minerals || !targets) return skip('needs target_minerals.json and targets.json');
    const families = new Set(minerals.families.map((f) => f.id));
    equal(families.size, minerals.families.length);
    deepEqual(Object.keys(minerals.targets).sort(), targets.map((t) => t.id).sort());
    for (const [id, t] of Object.entries(minerals.targets)) {
      for (const m of t.minerals) {
        ok(families.has(m.family), `${id}: unknown family ${m.family}`);
        ok(m.source.length > 10 && m.instrument.length > 2, `${id}: ${m.name} needs a source and an instrument`);
        ok(m.method === 'in-place' || m.method === 'orbital', id);
        ok(['Measured', 'Mission', 'Literature'].includes(m.badge), id);
      }
      if (t.minerals.length === 0) ok(t.note && t.note.length > 20, `${id} has no minerals and must say why`);
    }
    ok((minerals.targets['mars-gale']?.minerals.length ?? 0) >= 10);
    ok((minerals.targets['mars-jezero']?.minerals.length ?? 0) >= 8);
  });

  it('assigns the EMIT library names seen at our sites, and counts no vegetation as a mineral', () => {
    if (!minerals || !sites) return skip('needs target_minerals.json and sites.json');
    let withData = 0;
    for (const s of sites.sites) {
      const e = emitFamilies(s.mineralogy, minerals.families, minerals.meta.emitMinimumShare);
      if (!e) continue;
      withData += 1;
      for (const f of e.families) ok(f.shareOfValidPixels >= minerals.meta.emitMinimumShare, s.id);
    }
    ok(withData >= 5, 'several sites have EMIT data');
    deepEqual(familiesOfEmitName('organic_vegetation-dry-grass-golden', minerals.families), []);
    deepEqual(familiesOfEmitName('fe3+_hematite.thincoat', minerals.families).map((f) => f.id), ['hematite']);
    deepEqual(familiesOfEmitName('fe3+_hematite.1+goeth.4+qtz', minerals.families).map((f) => f.id).sort(), ['goethite', 'hematite']);
    deepEqual(familiesOfEmitName('kaolin.5+smect.5', minerals.families).map((f) => f.id).sort(), ['kaolinite', 'smectite']);
    deepEqual(familiesOfEmitName('calcite+0.2Na-mont', minerals.families).map((f) => f.id).sort(), ['carbonate-ca', 'smectite']);
    deepEqual(familiesOfEmitName('sulfate_jarosite-lowT', minerals.families).map((f) => f.id), ['jarosite']);
  });

  it('cannot compare any Earth site with Shackleton, whose one reported mineral EMIT cannot see', () => {
    if (!minerals || !sites) return skip('needs target_minerals.json and sites.json');
    const site = sites.sites.find((s) => s.mineralogy?.value);
    if (!site) return skip('no site has EMIT data');
    const shared = sharedMinerals(emitFamilies(site.mineralogy, minerals.families), minerals.targets['moon-shackleton-rim']?.minerals, minerals.families);
    equal(shared?.similarity, null);
    equal(shared?.notComparable.length, 1);
  });
});

describe('data/target_environment.json', () => {
  it('gives every target a wind, dust and ice entry, each number with a source', () => {
    const env = load<TargetEnvironmentFile>('target_environment.json');
    if (!env || !targets) return skip('needs target_environment.json and targets.json');
    deepEqual(Object.keys(env.targets).sort(), targets.map((t) => t.id).sort());
    for (const t of targets) {
      const e = env.targets[t.id];
      for (const key of ['wind', 'dust', 'ice'] as const) {
        const v = e?.[key];
        ok(v, `${t.id}: ${key}`);
        if (!v) continue;
        equal(v.value === null, v.source === null, `${t.id}.${key}: value and source are null together`);
        if (v.value !== null) ok(v.value >= 0 && ['Measured', 'Mission', 'Literature'].includes(v.badge ?? ''), `${t.id}.${key}`);
        else ok(v.note && v.note.length > 10, `${t.id}.${key}: a missing value must say why`);
      }
      // No atmosphere, no wind: the Moon is exactly zero. Mars has wind everywhere.
      if (t.body === 'moon') equal(e?.wind?.value, 0, t.id);
      else ok((e?.wind?.value ?? 0) > 0, t.id);
      const extras = targetEnvironment(env, t.id);
      ok(extras.wind && extras.dust && extras.ice, t.id);
    }
  });
});

describe('data/rovers.json', () => {
  it('gives a source for every figure, and energy for one vehicle on one body only', () => {
    if (!rovers) return skip('rovers.json does not exist yet');
    ok(rovers.rovers.length >= 5);
    for (const r of rovers.rovers) {
      const figs = [r.slopeLimit, ...r.otherSlopeFigures, r.speed, ...r.otherSpeeds, r.energy].filter((f): f is Fig => f !== null);
      ok(figs.length >= 1, r.id);
      for (const f of figs) {
        ok(typeof f.value === 'number' && f.value > 0, `${r.id}: value`);
        ok(f.source.length > 10 && /^https?:\/\//.test(f.url) && f.kind.length > 3, `${r.id}: ${f.kind} needs a source`);
      }
      if (r.slopeLimit) ok(r.slopeLimit.value >= 5 && r.slopeLimit.value <= 45 && r.slopeLimit.unit === 'degrees', r.id);
    }
    deepEqual(rovers.rovers.filter((r) => r.energy !== null).map((r) => r.id), ['lrv']);
  });

  it('feeds the route function on a real elevation tile', () => {
    if (!rovers) return skip('rovers.json does not exist yet');
    const index = load<{ items: { id: string; elevation: { file: string; size: number; pixelM: number } | null }[] }>('extracts/index.json');
    const item = index?.items.find((i) => i.id === 'id-tambora-caldera' && i.elevation);
    if (!item?.elevation || !existsSync(`${DATA}${item.elevation.file}`)) return skip('no Tambora elevation extract');
    const bytes = readFileSync(`${DATA}${item.elevation.file}`);
    const tile = tileFromFloat32(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), item.elevation.size, item.elevation.pixelM);
    const r = rovers.rovers.find((x) => x.id === 'perseverance');
    ok(r?.slopeLimit && r.speed);
    if (!r?.slopeLimit || !r.speed) return;
    const mid = (tile.size - 1) / 2;
    const route = measureRoute(tile, [{ col: mid, row: mid }, { col: mid + 100, row: mid }, { col: mid + 100, row: mid - 60 }], {
      limit: { rover: r.name, limitDeg: r.slopeLimit.value, kind: r.slopeLimit.kind, source: r.slopeLimit.source },
      speed: { rover: r.name, metresPerHour: r.speed.value, kind: r.speed.kind, source: r.speed.source },
    });
    equal(route.distanceM, 4800);
    ok(route.shareAboveLimit !== null && route.shareAboveLimit >= 0 && route.shareAboveLimit <= 1);
    ok(route.drivingTimeH !== null && Math.abs(route.drivingTimeH - 4800 / 152) < 0.01);
    equal(route.energyWh, null);
    ok(route.maxElevationM !== null && route.minElevationM !== null && route.maxElevationM > route.minElevationM);
  });
});

describe('The match record on the real data', () => {
  it('builds a complete, stable record and report for every site against every target', () => {
    if (!targets || !earth || !table || !sites || !windows) return skip('needs targets, earth, lithology table, sites and target windows');
    const ranges = computeEarthRanges(earth.cells);
    const classes = earth.meta.factors.find((f) => f.key === 'lithology')?.classes ?? [];
    const wantDims = [...DIMENSION_IDS, ...EXTRA_DIMENSION_IDS];
    let pairs = 0;
    for (const s of sites.sites) {
      const hit = nearestCell(earth.cells, s.lat, s.lon);
      ok(hit, s.id);
      if (!hit) continue;
      const place = earthPlaceFromSite(s, hit.cell, earth.meta, minerals ? { families: minerals.families } : {});
      const cellPlace = earthPlaceFromCell(hit.cell, earth.meta);
      for (const t of targets) {
        const like = targetAtSiteWindow(t, sitePosts(s), windows);
        const earthMinerals = minerals ? emitFamilies(s.mineralogy, minerals.families, minerals.meta.emitMinimumShare) : null;
        const shared = minerals ? sharedMinerals(earthMinerals, minerals.targets[t.id]?.minerals, minerals.families) : null;
        const record = buildMatchRecord({ target: like ?? t, place, ranges, table, classes, terrainLikeForLike: like !== null, minerals: shared, generatedAt: 'x' });
        deepEqual(record.dimensions.map((d) => d.id), wantDims, `${s.id} x ${t.id}`);
        deepEqual(record.purposes.map((p) => p.id), [...PURPOSE_IDS]);
        deepEqual(record.cannotCopy, t.cannotCopy);
        for (const d of record.dimensions) for (const r of d.rows) ok(r.reason.length > 5 && ['matches', 'partly', 'does-not-match', 'no-data'].includes(r.verdict), `${s.id} x ${t.id} ${r.key}`);
        // The grid-scale record carries exactly the frozen score of that cell.
        const cellRecord = buildMatchRecord({ target: t, place: cellPlace, ranges, table, classes, generatedAt: 'x' });
        equal(cellRecord.score.value, scoreCell(hit.cell, prepareTarget(t, ranges, table), PRESETS.base.weights).score);
        const report = buildReport({ record, minerals: shared });
        const used = new Set([...report.summary, ...report.sections.flatMap((x) => [...x.paragraphs, ...(x.table?.rows.flat() ?? [])])].flatMap((x) => x.cites));
        for (const n of used) ok(n >= 1 && n <= report.citations.length);
        ok(report.citations.length >= 5, `${s.id} x ${t.id}: a report must cite its sources`);
        pairs += 1;
      }
    }
    ok(pairs >= 100);
  });

  it('finds real shared minerals between a bare volcanic site and Gale', () => {
    if (!minerals || !sites) return skip('needs target_minerals.json and sites.json');
    const mk = sites.sites.find((s) => s.id === 'mauna-kea');
    const e = emitFamilies(mk?.mineralogy, minerals.families, minerals.meta.emitMinimumShare);
    if (!e) return skip('Mauna Kea has no EMIT data');
    const shared = sharedMinerals(e, minerals.targets['mars-gale']?.minerals, minerals.families);
    ok(shared && shared.shared.some((x) => x.family === 'hematite'));
    ok(shared && shared.notComparable.some((x) => x.family === 'plagioclase'));
    ok(shared && shared.similarity !== null && shared.similarity > 0 && shared.similarity < 1);
  });
});

describe('Rank stability on the real Earth grid', () => {
  it('reproduces the frozen score for every cell of every target', () => {
    if (!targets || !earth || !table) return skip('needs targets, earth and the lithology table');
    const ranges = computeEarthRanges(earth.cells);
    for (const t of targets) {
      const prepared = prepareTarget(t, ranges, table);
      const fast = scoresFromBasis(stabilityBasis(earth.cells, prepared), PRESETS.base.weights);
      const slow = scoreCells(earth.cells, prepared, PRESETS.base.weights);
      let worst = 0;
      for (let i = 0; i < slow.length; i += 1) {
        const s = slow[i]?.score ?? null;
        if (s === null) ok(Number.isNaN(fast[i] as number), `${t.id} cell ${i}`);
        else worst = Math.max(worst, Math.abs((fast[i] as number) - s));
      }
      ok(worst < 1e-9, `${t.id}: largest difference ${worst}`);
    }
  });
});

describe('data/benchmarks.json', () => {
  it('scores every site of sites.json against every target, the same way', () => {
    if (!benchmarks || !sites || !targets) return skip('needs benchmarks.json, sites.json and targets.json');
    deepEqual(benchmarks.sites.map((s) => s.id).sort(), sites.sites.map((s) => s.id).sort());
    deepEqual(benchmarks.meta.targets.map((t) => t.id).sort(), targets.map((t) => t.id).sort());
    for (const s of benchmarks.sites) {
      equal(s.results.length, targets.length, s.id);
      ok(s.kind === 'candidate' || s.kind === 'known', s.id);
      for (const r of s.results) deepEqual(Object.keys(r.site).filter((k) => ['score', 'dimensions', 'purposes', 'terrainLikeForLike'].includes(k)).length, 4, `${s.id} x ${r.target}`);
    }
    ok(benchmarks.sites.some((s) => s.kind === 'candidate') && benchmarks.sites.some((s) => s.kind === 'known'));
  });

  it('says for every site what could and could not be tested there, each sentence with its basis', () => {
    if (!benchmarks) return skip('benchmarks.json does not exist yet');
    interface Card { id: string; kind: string; process: { text: string; source: string; differs: string } | null; couldTest: { text: string; basis: string }[]; cannotTest: { text: string; basis: string }[] }
    for (const s of benchmarks.sites as unknown as Card[]) {
      ok(s.cannotTest.length >= 1 && s.cannotTest.some((t) => t.text.includes('Gravity')), `${s.id} must say what cannot be tested`);
      for (const t of [...s.couldTest, ...s.cannotTest]) ok(t.text.length > 20 && t.basis.includes('data/'), `${s.id}: ${t.text}`);
      if (s.kind === 'candidate') {
        ok(s.process && s.process.text.length > 10 && s.process.source.length > 8 && s.process.differs.length > 20, `${s.id} needs a cited process`);
        ok(s.couldTest.length >= 1, `${s.id} must offer at least one thing to test`);
      }
    }
  });
});

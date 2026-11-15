// Benchmarks: the established analog sites and our candidates, scored the same way, side by side.
//
//     npx tsx validation/benchmarks.ts
//
// Writes data/benchmarks.json for the Featured page, and validation/output/BENCHMARKS.md for people.
// Every site of data/sites.json (Session B) is scored against every target with the match record
// (app/src/lib/match): the frozen formula on site-scale terrain, vegetation and rock, the grid cell's
// climate, and the target's terrain measured in a window of the site's size. The site's own 0.5 degree
// cell is scored too, so the page can show both.
//
// Honest by construction:
//   - One procedure for every site. No site gets a better window, target or threshold than another.
//   - Both "best target" and "typical target" (median over all targets) are given. Best-of-eight
//     flatters, so the median is there to keep it in check.
//   - Known analogs are picked because fine-scale data existed for them. They are a yardstick, not
//     a validation set, and nothing here was tuned.
//
// Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIMENSIONS, PRESETS, PURPOSES, buildProfileIndex, nearestCell, prepareTarget, rankIn, scoreCells } from '../app/src/lib/scoring/index';
import type { DimensionId, PurposeId, Target } from '../app/src/lib/scoring/index';
import { buildMatchRecord, earthPlaceFromCell, earthPlaceFromSite, emitFamilies, extraRanges, sharedMinerals, sitePosts, targetAtSiteWindow, targetEnvironment } from '../app/src/lib/match/index';
import type { MatchRecord, SiteEntryLike, TargetEnvironmentFile, TargetMineralsFile, TargetWindowsFile, Verdict } from '../app/src/lib/match/index';
import { DATA, MAX_SNAP_KM, OUT, fail, loadData, loadFrozen, readJson } from './lib';

interface SitesFile {
  meta: { generatedAt: string };
  sites: (SiteEntryLike & { kind: 'candidate' | 'known'; inAnalogsJson?: boolean; analogSource?: string | null; gridCell?: { lat: number; lon: number } | null })[];
}

const frozen = loadFrozen();
if (!frozen) fail('the all-round score is not frozen yet.');
const data = loadData(true);
const sitesFile = readJson<SitesFile>(join(DATA, 'sites.json'));
const windows = readJson<TargetWindowsFile>(join(DATA, 'target_windows.json'));
const mineralsPath = join(DATA, 'target_minerals.json');
const minerals = existsSync(mineralsPath) ? readJson<TargetMineralsFile>(mineralsPath) : null;
const envPath = join(DATA, 'target_environment.json');
const environment = existsSync(envPath) ? readJson<TargetEnvironmentFile>(envPath) : null;
const ranges = extraRanges(data.cells);
interface RoversFile {
  rovers: { id: string; name: string; body: string; slopeLimit: { value: number; kind: string; source: string } | null }[];
}
const roversPath = join(DATA, 'rovers.json');
const rovers = existsSync(roversPath) ? readJson<RoversFile>(roversPath) : null;
interface AnalogProcess {
  text: string;
  source: string;
  links: { target: string; text: string; source: string }[];
  differs: string;
}
const processOf = new Map<string, AnalogProcess>();
for (const a of readJson<{ id: string; process?: AnalogProcess }[]>(join(DATA, 'analogs.json'))) if (a.process) processOf.set(a.id, a.process);
const classes = data.earth.meta.factors.find((f) => f.key === 'lithology')?.classes ?? [];
const meta = data.earth.meta as unknown as Parameters<typeof earthPlaceFromCell>[1];

const r3 = (v: number | null): number | null => (v === null ? null : Math.round(v * 1000) / 1000);
const r1 = (v: number | null): number | null => (v === null ? null : Math.round(v * 10) / 10);
const median = (v: number[]): number | null => {
  if (v.length === 0) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
};

// Per target: sorted all-round scores of every Earth cell (for the rank of a score) and the dimension index.
const perTarget = new Map<string, { target: Target; sorted: Float64Array; index: ReturnType<typeof buildProfileIndex> }>();
for (const t of data.targets) {
  const prepared = prepareTarget(t, data.ranges, data.table);
  const scores: number[] = [];
  for (const s of scoreCells(data.cells, prepared, PRESETS.base.weights)) if (s.score !== null) scores.push(s.score);
  perTarget.set(t.id, { target: t, sorted: Float64Array.from(scores).sort(), index: buildProfileIndex(data.cells, prepared) });
}

interface Side {
  /** The frozen all-round score, 0 to 100, or null. */
  score: number | null;
  /** Share of scored Earth cells this score beats (tie-fair). */
  scorePercentile: number | null;
  dimensions: Record<DimensionId, { similarity: number | null; verdict: Verdict }>;
  purposes: Record<PurposeId, number | null>;
  /** Wind, dust and ice: added after the freeze, never in `score`. Climate-like values of the 0.5 degree cell on both scales. */
  environment: Record<'wind' | 'dust' | 'ice', { similarity: number | null; verdict: Verdict; earth: string; target: string; reason: string }>;
  /** Purpose scores with the added dimensions blended in, where any has data. Not validated. */
  extendedPurposes: Record<PurposeId, number | null>;
}
interface PairResult {
  target: string;
  site: Side & { terrainLikeForLike: boolean; minerals: { similarity: number | null; verdict: Verdict; shared: string[]; targetOnly: string[]; reason: string } | null };
  cell: Side;
}
interface SiteRow {
  id: string;
  name: string;
  kind: 'candidate' | 'known';
  lat: number;
  lon: number;
  footprintKm: number;
  provisional: boolean;
  rockName: string | null;
  bareShare: number | null;
  caveat: string | null;
  /** Minerals EMIT identified here, as family labels, or null when the site has no EMIT data. */
  mineralsIdentified: string[] | null;
  results: PairResult[];
  /** Per purpose: the best target and the median over all targets, at site scale. */
  summary: Record<PurposeId, { best: number | null; bestTarget: string | null; median: number | null }>;
  /** Per dimension: mean similarity over all targets, at site scale. */
  dimensionMean: Record<DimensionId, number | null>;
  /** The process the site stands for, with its source (candidates only; from data/analogs.json). */
  process: AnalogProcess | null;
  /** What a mission team could test here: each sentence is built from measured values named in `basis`. */
  couldTest: { text: string; basis: string }[];
  /** What a rehearsal here cannot test, from the same values. */
  cannotTest: { text: string; basis: string }[];
}

function side(record: MatchRecord, sorted: Float64Array): Side {
  const dims = {} as Side['dimensions'];
  for (const d of DIMENSIONS) {
    const m = record.dimensions.find((x) => x.id === d.id);
    dims[d.id] = { similarity: r3(m?.similarity ?? null), verdict: m?.verdict ?? 'no-data' };
  }
  const purposes = {} as Side['purposes'];
  const extendedPurposes = {} as Side['extendedPurposes'];
  for (const p of record.purposes) {
    purposes[p.id] = r1(p.score);
    extendedPurposes[p.id] = r1(p.extendedScore);
  }
  const environmentOut = {} as Side['environment'];
  for (const id of ['wind', 'dust', 'ice'] as const) {
    const m = record.dimensions.find((x) => x.id === id);
    const row = m?.rows[0];
    environmentOut[id] = { similarity: r3(m?.similarity ?? null), verdict: m?.verdict ?? 'no-data', earth: row?.earth.text ?? 'no data', target: row?.target.text ?? 'no data', reason: m?.reason ?? '' };
  }
  return {
    environment: environmentOut,
    extendedPurposes,
    score: r1(record.score.value),
    scorePercentile: record.score.value === null ? null : r3(rankIn(sorted, record.score.value).midPercentile),
    dimensions: dims,
    purposes,
  };
}

const generatedAt = new Date().toISOString();
const rows: SiteRow[] = [];
for (const s of sitesFile.sites) {
  // The cell sites.json took the site's climate from, when it names one: a site on a cell corner has four
  // equally near cells, and the site and its cell must be the same one.
  const named = s.gridCell ? data.cells.find((c) => c.lat === s.gridCell?.lat && c.lon === s.gridCell?.lon) : undefined;
  const nearest = nearestCell(data.cells, s.lat, s.lon);
  const hit = named ? { cell: named, distanceKm: 0 } : nearest;
  if (!hit || hit.distanceKm > MAX_SNAP_KM) fail(`"${s.id}" has no Earth cell within ${MAX_SNAP_KM} km`);
  const families = minerals?.families;
  const sitePlace = earthPlaceFromSite(s, hit.cell, meta, families ? { families, emitMinimumShare: minerals?.meta.emitMinimumShare } : {});
  const cellPlace = earthPlaceFromCell(hit.cell, meta, { name: `${s.name} (0.5 degree cell)`, id: s.id });
  const earthMinerals = minerals && s.mineralogy ? emitFamilies(s.mineralogy, minerals.families, minerals.meta.emitMinimumShare) : null;
  const posts = sitePosts(s);

  const results: PairResult[] = [];
  for (const pt of perTarget.values()) {
    const like = targetAtSiteWindow(pt.target, posts, windows);
    const targetMinerals = minerals?.targets[pt.target.id]?.minerals ?? null;
    const shared = minerals ? sharedMinerals(earthMinerals, targetMinerals, minerals.families) : null;
    const env = targetEnvironment(environment, pt.target.id);
    const siteRecord = buildMatchRecord({
      target: like ?? pt.target, place: sitePlace, ranges: data.ranges, table: data.table, classes, terrainLikeForLike: like !== null, generatedAt,
      targetExtras: env,
      extraRanges: ranges,
      minerals: shared,
    });
    const cellRecord = buildMatchRecord({ target: pt.target, place: cellPlace, ranges: data.ranges, table: data.table, classes, generatedAt, targetExtras: env, extraRanges: ranges });
    const m = siteRecord.dimensions.find((d) => d.id === 'minerals');
    results.push({
      target: pt.target.id,
      site: {
        ...side(siteRecord, pt.sorted),
        terrainLikeForLike: like !== null,
        minerals: shared && m ? { similarity: r3(m.similarity), verdict: m.verdict, shared: shared.shared.map((x) => x.label), targetOnly: shared.targetOnly.map((x) => x.label), reason: m.reason } : null,
      },
      cell: side(cellRecord, pt.sorted),
    });
  }

  const summary = {} as SiteRow['summary'];
  for (const p of PURPOSES) {
    const scored = results.map((r) => ({ target: r.target, score: r.site.purposes[p.id] })).filter((x): x is { target: string; score: number } => x.score !== null);
    const best = scored.length > 0 ? scored.reduce((a, b) => (b.score > a.score ? b : a)) : null;
    summary[p.id] = { best: best?.score ?? null, bestTarget: best?.target ?? null, median: r1(median(scored.map((x) => x.score))) };
  }
  const dimensionMean = {} as SiteRow['dimensionMean'];
  for (const d of DIMENSIONS) {
    const v = results.map((r) => r.site.dimensions[d.id].similarity).filter((x): x is number => x !== null);
    dimensionMean[d.id] = v.length > 0 ? r3(v.reduce((a, b) => a + b, 0) / v.length) : null;
  }
  // What a team could test here, and could not. Every sentence comes from a measured value and a stated rule.
  const couldTest: SiteRow['couldTest'] = [];
  const cannotTest: SiteRow['cannotTest'] = [];
  const join = (items: string[]): string => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1] ?? ''}`);
  const names = (ids: string[]): string => join(ids.map((id) => data.targets.find((t) => t.id === id)?.name ?? id));
  const shortName = (name: string): string => name.split(' (')[0] as string;
  const fine = s.values.slopeFine;
  const fineSlope = fine && typeof fine.value === 'number' ? fine.value : null;
  if (fineSlope !== null && rovers) {
    const limits = rovers.rovers.filter((r) => r.slopeLimit).map((r) => ({ name: shortName(r.name), deg: (r.slopeLimit as { value: number }).value }));
    const above = limits.filter((l) => fineSlope > l.deg);
    const below = limits.filter((l) => fineSlope <= l.deg);
    if (above.length > 0 && below.length === 0) {
      couldTest.push({
        text: `Foot traverses on very steep ground, not rover driving: the mean slope is ${fineSlope.toFixed(0)} degrees on 31 m posts, above the published slope limit of every rover listed (${Math.min(...limits.map((l) => l.deg))} to ${Math.max(...limits.map((l) => l.deg))} degrees).`,
        basis: 'data/sites.json slopeFine; data/rovers.json slopeLimit',
      });
    } else if (above.length > 0) {
      couldTest.push({
        text: `Driving and walking on steep ground: the mean slope is ${fineSlope.toFixed(0)} degrees on 31 m posts, above the published slope limit of ${join(above.map((l) => `${l.name} (${l.deg})`))}${below.length > 0 ? `, and within that of ${join(below.map((l) => `${l.name} (${l.deg})`))}` : ''}.`,
        basis: 'data/sites.json slopeFine; data/rovers.json slopeLimit',
      });
    } else {
      couldTest.push({ text: `Routine traverses: the mean slope is ${fineSlope.toFixed(0)} degrees on 31 m posts, within the published slope limit of every rover listed (${Math.min(...limits.map((l) => l.deg))} degrees and up).`, basis: 'data/sites.json slopeFine; data/rovers.json slopeLimit' });
    }
  }
  const sameRock = results.filter((r) => r.site.dimensions.geology.verdict === 'matches').map((r) => r.target);
  const relatedRock = results.filter((r) => r.site.dimensions.geology.verdict === 'partly').map((r) => r.target);
  if (sameRock.length > 0) couldTest.push({ text: `Sampling and instrument work on the same class of rock as ${names(sameRock)}${sitePlace.rockName ? ` (${sitePlace.rockName.toLowerCase()})` : ''}.`, basis: 'data/sites.json rockType and lithology; data/targets.json lithology; data/lithology_similarity.json' });
  else if (relatedRock.length > 0) couldTest.push({ text: `Sampling and instrument work on a rock class related to that of ${names(relatedRock)}${sitePlace.rockName ? ` (${sitePlace.rockName.toLowerCase()})` : ''}: related, not the same.`, basis: 'data/sites.json rockType and lithology; data/targets.json lithology; data/lithology_similarity.json' });
  const terrainMatch = results.filter((r) => r.site.terrainLikeForLike && r.site.dimensions.terrain.verdict === 'matches').map((r) => r.target);
  if (terrainMatch.length > 0) couldTest.push({ text: `Route planning on slopes and relief close to those of ${names(terrainMatch)}, measured in a window of the same size.`, basis: 'data/sites.json slope and roughness; data/target_windows.json' });
  const mineralHits = results.filter((r) => r.site.minerals && r.site.minerals.shared.length > 0).sort((a, b) => (b.site.minerals?.shared.length ?? 0) - (a.site.minerals?.shared.length ?? 0));
  const bestMinerals = mineralHits[0];
  if (bestMinerals?.site.minerals) {
    couldTest.push({
      text: `Checking mineral identifications made from orbit against samples on the ground: NASA's EMIT instrument identifies ${join(bestMinerals.site.minerals.shared.map((x) => (x.split(' (')[0] as string).toLowerCase()))} here, ${bestMinerals.site.minerals.shared.length === 1 ? 'a mineral family' : 'mineral families'} also reported at ${names([bestMinerals.target])}.`,
      basis: 'data/sites.json mineralogy (EMIT); data/target_minerals.json',
    });
  }
  if (sitePlace.bareShare !== null && sitePlace.bareShare >= 0.2 && sitePlace.bareShare < 0.9) couldTest.push({ text: `${Math.round(sitePlace.bareShare * 100)}% of the footprint is bare ground: a rehearsal has to be laid out inside that part.`, basis: 'data/sites.json bareFrac' });

  const t = sitePlace.cell.tempMean;
  const rain = sitePlace.cell.precip;
  const climateMean = dimensionMean.climate;
  if (climateMean !== null && climateMean < 0.3 && t !== null && rain !== null) {
    // 250 mm a year is the dryness tolerance of the frozen score (the arid limit): wetter than that is not a dry site.
    const wet = rain > 250;
    cannotTest.push({
      text: wet
        ? `Cold, dryness and thermal design: the surrounding cell averages ${t.toFixed(0)} C with ${Math.round(rain).toLocaleString('en-US')} mm of rain a year. No target here has rain, and all are far colder.`
        : `Cold and thermal design: the surrounding cell averages ${t.toFixed(0)} C. Every target here is far colder. It is dry, with ${Math.round(rain).toLocaleString('en-US')} mm of rain a year.`,
      basis: 'data/earth.json tempMean and precip (0.5 degree cell)',
    });
  }
  if (sitePlace.bareShare !== null && sitePlace.bareShare < 0.2) cannotTest.push({ text: `Open-ground operations over the whole site: ${sitePlace.bareShare < 0.01 ? 'almost none' : `only ${Math.round(sitePlace.bareShare * 100)}%`} of the footprint is bare; the rest is vegetated.`, basis: 'data/sites.json bareFrac' });
  if (results.every((r) => r.site.dimensions.geology.verdict !== 'matches' && r.site.dimensions.geology.verdict !== 'partly') && sitePlace.cell.lithology !== null) cannotTest.push({ text: 'Rock-specific instrument tests: the rock class is unrelated to that of every target.', basis: 'data/sites.json lithology; data/lithology_similarity.json' });
  cannotTest.push({ text: 'Gravity, vacuum or thin air, and radiation: no place on Earth can.', basis: 'data/targets.json cannotCopy' });

  rows.push({
    process: processOf.get(s.id) ?? null, couldTest, cannotTest,
    id: s.id, name: s.name, kind: s.kind, lat: s.lat, lon: s.lon, footprintKm: s.footprintKm,
    provisional: s.footprintStatus === 'provisional', rockName: sitePlace.rockName, bareShare: sitePlace.bareShare, caveat: s.caveat ?? null,
    mineralsIdentified: earthMinerals ? earthMinerals.families.map((f) => f.label) : null,
    results, summary, dimensionMean,
  });
}

// Group comparison: candidates against known analogs, per dimension and per purpose (median target).
function groupMean(kind: 'candidate' | 'known', pick: (r: SiteRow) => number | null): number | null {
  const v = rows.filter((r) => r.kind === kind).map(pick).filter((x): x is number => x !== null);
  return v.length > 0 ? r3(v.reduce((a, b) => a + b, 0) / v.length) : null;
}
const groups = {
  candidates: rows.filter((r) => r.kind === 'candidate').length,
  known: rows.filter((r) => r.kind === 'known').length,
  dimensionMean: Object.fromEntries(DIMENSIONS.map((d) => [d.id, { candidates: groupMean('candidate', (r) => r.dimensionMean[d.id]), known: groupMean('known', (r) => r.dimensionMean[d.id]) }])),
  purposeMedian: Object.fromEntries(PURPOSES.map((p) => [p.id, { candidates: r1(groupMean('candidate', (r) => r.summary[p.id].median)), known: r1(groupMean('known', (r) => r.summary[p.id].median)) }])),
  purposeBest: Object.fromEntries(PURPOSES.map((p) => [p.id, { candidates: r1(groupMean('candidate', (r) => r.summary[p.id].best)), known: r1(groupMean('known', (r) => r.summary[p.id].best)) }])),
  /** Mean similarity over all targets with a value, for the dimensions added after the freeze. */
  environmentMean: Object.fromEntries((['wind', 'dust', 'ice'] as const).map((id) => {
    const of = (kind: 'candidate' | 'known'): number | null => groupMean(kind, (r) => {
      const v = r.results.map((x) => x.site.environment[id].similarity).filter((x): x is number => x !== null);
      return v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : null;
    });
    return [id, { candidates: of('candidate'), known: of('known') }];
  })),
};

const caveats = [
  'One procedure for every site: site-scale terrain, vegetation and rock; the 0.5 degree cell\'s temperature and rainfall; the target\'s terrain measured in a window of the site\'s size.',
  '"Best" is the best of all targets, chosen after the fact, and flatters. "Median" is the typical target.',
  'Known analogs are those for which fine-scale data was built. They are a yardstick, not a validation set.',
  'Similarities and scores use the formula, tolerances and weights frozen on ' + frozen.frozenAt + '. Nothing was tuned on these sites.',
  'A footprint holds 16 to 256 terrain posts. Small samples.',
];

const out = {
  meta: {
    generatedAt,
    frozenAt: frozen.frozenAt,
    sitesGeneratedAt: sitesFile.meta.generatedAt,
    earthGeneratedAt: data.earth.meta.generatedAt,
    note: 'Established analog sites and candidate sites scored the same way, for the Featured page. Built by validation/benchmarks.ts with app/src/lib/match.',
    caveats,
    mineralsIncluded: minerals !== null,
    dimensions: DIMENSIONS.map((d) => ({ id: d.id, label: d.label })),
    purposes: PURPOSES.map((p) => ({ id: p.id, label: p.label })),
    targets: data.targets.map((t) => ({ id: t.id, name: t.name, body: t.body })),
  },
  groups,
  sites: rows,
};
writeFileSync(join(DATA, 'benchmarks.json'), `${JSON.stringify(out)}\n`);

// ---------------------------------------------------------------------------------------------
// Markdown for people
// ---------------------------------------------------------------------------------------------
const f2 = (v: number | null): string => (v === null ? 'n/a' : v.toFixed(2));
const f1 = (v: number | null): string => (v === null ? 'n/a' : v.toFixed(1));
const md: string[] = [];
md.push('# Benchmarks: established analogs and our candidates, scored the same way', '');
md.push(`Written ${generatedAt} by \`npx tsx validation/benchmarks.ts\`. Data file for the app: \`data/benchmarks.json\`.`, '');
for (const c of caveats) md.push(`- ${c}`);
md.push('', '## Groups', '');
md.push(`Mean similarity per dimension over all ${data.targets.length} targets, site scale. ${groups.candidates} candidate sites, ${groups.known} known analogs.`, '');
md.push('| Dimension | Candidates | Known analogs |', '| --- | --- | --- |');
for (const d of DIMENSIONS) md.push(`| ${d.label} | ${f2(groups.dimensionMean[d.id]?.candidates ?? null)} | ${f2(groups.dimensionMean[d.id]?.known ?? null)} |`);
md.push('', 'Purpose scores, 0 to 100, mean over sites of the typical (median) target and of the best target:', '');
md.push('| Purpose | Candidates, typical | Known, typical | Candidates, best | Known, best |', '| --- | --- | --- | --- | --- |');
for (const p of PURPOSES) md.push(`| ${p.label} | ${f1(groups.purposeMedian[p.id]?.candidates ?? null)} | ${f1(groups.purposeMedian[p.id]?.known ?? null)} | ${f1(groups.purposeBest[p.id]?.candidates ?? null)} | ${f1(groups.purposeBest[p.id]?.known ?? null)} |`);
md.push('', '## Wind, dust and ice (added after the freeze, never in the score)', '');
md.push('Earth side: NASA POWER wind speed at 10 m and aerosol optical depth, and the permafrost share of Obu et al. 2018, all for the 0.5 degree cell. Target side: the Mars Climate Database for wind and dust on Mars, zero on the airless Moon, and the share of ice-stable ground from Diviner at the lunar poles (data/target_environment.json). Mean similarity over the targets that have a value:', '');
md.push('| Dimension | Candidates | Known analogs |', '| --- | --- | --- |');
for (const id of ['wind', 'dust', 'ice'] as const) md.push(`| ${id === 'wind' ? 'Wind' : id === 'dust' ? 'Dust and aerosol' : 'Ice and permafrost'} | ${f2(groups.environmentMean[id]?.candidates ?? null)} | ${f2(groups.environmentMean[id]?.known ?? null)} |`);
md.push('', '| Site | Kind | Wind, m/s | Aerosol optical depth | Permafrost share | Wind against Jezero / Gale / the Moon | Dust against Jezero / Gale / the Moon |', '| --- | --- | --- | --- | --- | --- | --- |');
for (const r of [...rows].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))) {
  const pick = (target: string): PairResult | undefined => r.results.find((x) => x.target === target);
  const j = pick('mars-jezero');
  const g = pick('mars-gale');
  const m = pick('moon-shackleton-rim');
  md.push(`| ${r.name} | ${r.kind} | ${j?.site.environment.wind.earth ?? ''} | ${j?.site.environment.dust.earth ?? ''} | ${m?.site.environment.ice.earth ?? ''} | ${f2(j?.site.environment.wind.similarity ?? null)} / ${f2(g?.site.environment.wind.similarity ?? null)} / ${f2(m?.site.environment.wind.similarity ?? null)} | ${f2(j?.site.environment.dust.similarity ?? null)} / ${f2(g?.site.environment.dust.similarity ?? null)} / ${f2(m?.site.environment.dust.similarity ?? null)} |`);
}
md.push('', '## Site by site', '');
md.push(`| Site | Kind | ${DIMENSIONS.map((d) => d.label).join(' | ')} | ${PURPOSES.map((p) => `${p.label} (best / typical)`).join(' | ')} | Minerals identified |`);
md.push(`| --- | --- | ${DIMENSIONS.map(() => '---').join(' | ')} | ${PURPOSES.map(() => '---').join(' | ')} | --- |`);
for (const r of [...rows].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))) {
  md.push(`| ${r.name}${r.provisional ? ' (provisional footprint)' : ''} | ${r.kind} | ${DIMENSIONS.map((d) => f2(r.dimensionMean[d.id])).join(' | ')} | ${PURPOSES.map((p) => `${f1(r.summary[p.id].best)} / ${f1(r.summary[p.id].median)}`).join(' | ')} | ${r.mineralsIdentified === null ? 'no EMIT data' : r.mineralsIdentified.join(', ') || 'none'} |`);
}
md.push('', '## What a team could test at each candidate site', '');
md.push('Each sentence is built by a fixed rule from measured values (slope against published rover limits, rock class, same-window terrain, minerals seen from orbit, bare share, the cell\'s climate). The process line is from the cited literature (data/analogs.json).', '');
for (const r of rows.filter((x) => x.kind === 'candidate')) {
  md.push(`### ${r.name}`, '');
  if (r.process) {
    md.push(`Process: ${r.process.text} (${r.process.source})`, '');
    for (const l of r.process.links) md.push(`- Link to ${data.targets.find((t) => t.id === l.target)?.name ?? l.target}: ${l.text} (${l.source})`);
    md.push(`- Where the analogy breaks: ${r.process.differs}`, '');
  }
  md.push('Could test:', '');
  for (const t of r.couldTest) md.push(`- ${t.text}`);
  md.push('', 'Could not test:', '');
  for (const t of r.cannotTest) md.push(`- ${t.text}`);
  md.push('');
}
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'BENCHMARKS.md'), `${md.join('\n')}\n`);
console.log(`Benchmarks: ${rows.length} sites x ${data.targets.length} targets. Minerals included: ${minerals !== null}.`);
console.log(`Wrote data/benchmarks.json and ${join(OUT, 'BENCHMARKS.md')}`);

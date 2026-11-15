// What the search itself finds: the best-ranked places on Earth for each target.
//
//     npx tsx validation/discoveries.ts
//
// The challenge asks for new analogs found by searching the whole Earth. The validation reports say how
// well the score ranks sites we already knew. This report turns it round and lists what the frozen
// score puts at the top for each target, by the same rules the app uses for its candidate list:
//   - best all-round score first (Base weights), high and medium confidence only;
//   - each pick at least 250 km from the picks above it, so one desert does not fill the list;
//   - NEW when a place is more than 500 km from every known analog of data/analogs.json.
// For each pick it adds the verdict per dimension (match record), the limiting factor, and how far the
// rank moves when the weights are nudged (rank stability).
//
// It also lists the best-ranked cells in the Indonesian region for each target, because the project's
// headline candidates are Indonesian and the honest question is where Indonesia stands in the world list.
//
// Nothing is tuned and no site here was used in tuning. Places are given by coordinates and by the
// nearest known analog: no place name is typed in. A person should look each one up before naming it.
//
// Writes data/discoveries.json, validation/output/DISCOVERIES.md.
//
// Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIMENSIONS, PRESETS, prepareTarget, rankStability, scoreCells, stabilityBasis } from '../app/src/lib/scoring/index';
import type { DimensionId, EarthCell } from '../app/src/lib/scoring/index';
import { buildMatchRecord, earthPlaceFromCell } from '../app/src/lib/match/index';
import type { Verdict } from '../app/src/lib/match/index';
import { DATA, OUT, fail, loadData, loadFrozen } from './lib';

/** The app's rules (app/src/lib/rank.ts). */
const NEW_DISTANCE_KM = 500;
const MIN_SEPARATION_KM = 250;
const TOP = 8;
/** A box around the Indonesian archipelago. It also holds parts of Malaysia, Brunei, Timor-Leste and Papua New Guinea. */
const INDONESIA = { latMin: -11, latMax: 6, lonMin: 95, lonMax: 141 };
const TOP_INDONESIA = 3;

const frozen = loadFrozen();
if (!frozen) fail('the all-round score is not frozen yet.');
const data = loadData(false);
const known = data.sites.filter((s) => s.kind === 'known');
const classes = data.earth.meta.factors.find((f) => f.key === 'lithology')?.classes ?? [];
const meta = data.earth.meta as unknown as Parameters<typeof earthPlaceFromCell>[1];

const RAD = Math.PI / 180;
function km(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const a = Math.sin(((lat2 - lat1) * RAD) / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(((lon2 - lon1) * RAD) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}
const r1 = (v: number): number => Math.round(v * 10) / 10;
const r3 = (v: number | null): number | null => (v === null ? null : Math.round(v * 1000) / 1000);

interface Pick {
  lat: number;
  lon: number;
  score: number;
  /** Rank among all scored cells (1 is best). */
  rank: number;
  /** Share of scored cells this cell beats. */
  percentile: number;
  confidence: string;
  isNew: boolean;
  nearestKnown: { id: string; name: string; km: number };
  dimensions: Record<DimensionId, { similarity: number | null; verdict: Verdict }>;
  limitingFactor: string | null;
  reason: string;
  values: Pick_Values;
  stability: { rankP05: number | null; rankP95: number | null; shareInTop10: number } | null;
}
type Pick_Values = Pick_Value<'tempMean' | 'tempRange' | 'precip' | 'ndvi' | 'slope' | 'roughness' | 'lithology'>;
type Pick_Value<K extends string> = Record<K, number | null>;

function nearestKnown(c: EarthCell): Pick['nearestKnown'] {
  let best = { id: '', name: '', km: Infinity };
  for (const s of known) {
    const d = km(c.lat, c.lon, s.lat, s.lon);
    if (d < best.km) best = { id: s.id, name: s.name, km: d };
  }
  return { ...best, km: Math.round(best.km) };
}

const out: { target: string; name: string; body: string; scoredCells: number; top: Pick[]; indonesia: Pick[]; newInTop: number }[] = [];
for (const t of data.targets) {
  const prepared = prepareTarget(t, data.ranges, data.table);
  const results = scoreCells(data.cells, prepared, PRESETS.base.weights);
  const order: number[] = [];
  for (let i = 0; i < results.length; i += 1) if (results[i]?.score !== null) order.push(i);
  order.sort((a, b) => (results[b]?.score as number) - (results[a]?.score as number) || a - b);
  const rankOf = new Map(order.map((idx, k) => [idx, k + 1]));

  const pickFrom = (candidates: number[], limit: number): number[] => {
    const picks: number[] = [];
    for (const i of candidates) {
      if (results[i]?.confidence === 'low') continue;
      const c = data.cells[i] as EarthCell;
      if (picks.some((p) => km(c.lat, c.lon, (data.cells[p] as EarthCell).lat, (data.cells[p] as EarthCell).lon) < MIN_SEPARATION_KM)) continue;
      picks.push(i);
      if (picks.length >= limit) break;
    }
    return picks;
  };
  const top = pickFrom(order, TOP);
  const indo = pickFrom(order.filter((i) => {
    const c = data.cells[i] as EarthCell;
    return c.lat >= INDONESIA.latMin && c.lat <= INDONESIA.latMax && c.lon >= INDONESIA.lonMin && c.lon <= INDONESIA.lonMax;
  }), TOP_INDONESIA);

  const basis = stabilityBasis(data.cells, prepared);
  const followed = rankStability(basis, PRESETS.base.weights, { follow: [...top, ...indo] }).followed;
  const describe = (i: number, k: number): Pick => {
    const c = data.cells[i] as EarthCell;
    const record = buildMatchRecord({ target: t, place: earthPlaceFromCell(c, meta), ranges: data.ranges, table: data.table, classes, generatedAt: 'x' });
    const dims = {} as Pick['dimensions'];
    for (const d of DIMENSIONS) {
      const m = record.dimensions.find((x) => x.id === d.id);
      dims[d.id] = { similarity: r3(m?.similarity ?? null), verdict: m?.verdict ?? 'no-data' };
    }
    const near = nearestKnown(c);
    const st = followed[k];
    return {
      lat: c.lat, lon: c.lon, score: r1(results[i]?.score as number), rank: rankOf.get(i) as number,
      percentile: r3(1 - ((rankOf.get(i) as number) - 1) / order.length) as number,
      confidence: results[i]?.confidence as string, isNew: near.km > NEW_DISTANCE_KM, nearestKnown: near,
      dimensions: dims, limitingFactor: record.score.limitingFactor, reason: record.score.reason,
      values: { tempMean: c.tempMean, tempRange: c.tempRange, precip: c.precip, ndvi: c.ndvi, slope: c.slope, roughness: c.roughness, lithology: c.lithology },
      stability: st ? { rankP05: st.rankP05, rankP95: st.rankP95, shareInTop10: st.shareInTopN } : null,
    };
  };
  const topPicks = top.map((i, k) => describe(i, k));
  out.push({ target: t.id, name: t.name, body: t.body, scoredCells: order.length, top: topPicks, indonesia: indo.map((i, k) => describe(i, top.length + k)), newInTop: topPicks.filter((p) => p.isNew).length });
}

const generatedAt = new Date().toISOString();
const file = {
  meta: {
    generatedAt, frozenAt: frozen.frozenAt, earthGeneratedAt: data.earth.meta.generatedAt,
    note: 'The best-ranked 0.5 degree cells on Earth for each target, by the frozen all-round score (Base weights), and the best-ranked cells in the Indonesian region. Places are given by coordinates only: look each one up before naming it.',
    rules: { preset: 'base', confidence: 'high and medium only', minSeparationKm: MIN_SEPARATION_KM, newDistanceKm: NEW_DISTANCE_KM, top: TOP, indonesiaBox: INDONESIA },
    caveats: [
      'A cell is about 55 km across. The score describes the cell, not a feature inside it.',
      'Scores are low in absolute terms everywhere: read the rank.',
      '"New" means more than 500 km from every site in our list of 28 known analogs. It does not mean nobody has studied the place.',
      'The Indonesian box also holds parts of Malaysia, Brunei, Timor-Leste and Papua New Guinea.',
    ],
  },
  targets: out,
};
writeFileSync(join(DATA, 'discoveries.json'), `${JSON.stringify(file)}\n`);

const VERDICT: Record<Verdict, string> = { matches: 'matches', partly: 'partly', 'does-not-match': 'no', 'no-data': 'no data' };
const at = (p: Pick): string => `${Math.abs(p.lat).toFixed(2)} ${p.lat >= 0 ? 'N' : 'S'}, ${Math.abs(p.lon).toFixed(2)} ${p.lon >= 0 ? 'E' : 'W'}`;
const pct = (v: number): string => `${(v * 100).toFixed(1)}%`;
const md: string[] = [];
md.push('# What the search finds: the best-ranked places on Earth for each target', '');
md.push(`Written ${generatedAt} by \`npx tsx validation/discoveries.ts\`. Score frozen ${frozen.frozenAt}. Data file for the app: \`data/discoveries.json\`.`, '');
md.push('Rules, the same as the app\'s candidate list: best all-round score first (Base weights), high and medium confidence only, each pick at least 250 km from the picks above it. **New** means more than 500 km from every one of our 28 known analogs.', '');
for (const c of file.meta.caveats) md.push(`- ${c}`);
md.push('- No place name is typed in. Coordinates are cell centres; look each one up before naming it.', '');
md.push('## How many of the top eight are new', '');
md.push('| Target | New among the top 8 | Best score | Best new place |', '| --- | --- | --- | --- |');
for (const t of out) {
  const best = t.top.find((p) => p.isNew);
  md.push(`| ${t.name} | ${t.newInTop} | ${t.top[0]?.score.toFixed(1) ?? 'n/a'} | ${best ? `${at(best)} (score ${best.score.toFixed(1)}, rank ${best.rank})` : 'none'} |`);
}
md.push('');
for (const t of out) {
  md.push(`## ${t.name} (\`${t.target}\`)`, '');
  md.push(`${t.scoredCells} cells scored.`, '');
  md.push(`| # | Cell centre | Score | Rank | New? | Nearest known analog | ${DIMENSIONS.map((d) => d.label).join(' | ')} | Held back by | Rank in nine of ten redraws |`);
  md.push(`| --- | --- | --- | --- | --- | --- | ${DIMENSIONS.map(() => '---').join(' | ')} | --- | --- |`);
  t.top.forEach((p, k) => {
    md.push(`| ${k + 1} | ${at(p)} | ${p.score.toFixed(1)} | ${p.rank} | ${p.isNew ? '**new**' : 'known area'} | ${p.nearestKnown.name}, ${p.nearestKnown.km} km | ${DIMENSIONS.map((d) => VERDICT[p.dimensions[d.id].verdict]).join(' | ')} | ${p.limitingFactor ?? 'nothing'} | ${p.stability ? `${p.stability.rankP05} to ${p.stability.rankP95}` : 'n/a'} |`);
  });
  md.push('', 'Best-ranked cells in the Indonesian region:', '');
  md.push('| Cell centre | Score | Rank | Beats this share of cells | Held back by | Why |', '| --- | --- | --- | --- | --- | --- |');
  for (const p of t.indonesia) md.push(`| ${at(p)} | ${p.score.toFixed(1)} | ${p.rank} | ${pct(p.percentile)} | ${p.limitingFactor ?? 'nothing'} | ${p.reason} |`);
  md.push('');
}
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'DISCOVERIES.md'), `${md.join('\n')}\n`);
for (const t of out) console.log(`${t.target.padEnd(24)} new in top 8: ${t.newInTop}  best ${t.top[0]?.score}  best Indonesian cell: ${t.indonesia[0] ? `${at(t.indonesia[0])} score ${t.indonesia[0].score} rank ${t.indonesia[0].rank} (${pct(t.indonesia[0].percentile)})` : 'none'}`);
console.log(`Wrote data/discoveries.json and ${join(OUT, 'DISCOVERIES.md')}`);

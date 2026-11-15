// Report content: everything about one match in one structured object, with numbered citations.
//
// The downloadable report renders this object and adds nothing of its own. Every value that comes
// from a dataset or a paper carries the number of its citation; the citation list is built here,
// each source once, in order of first use.

import type { Badge, CellStability, StabilityResult } from '../scoring/index';
import type { RouteResult } from '../route/index';
import type { KnownSite } from '../targets/index';
import { listLabels } from './minerals';
import type { SharedMinerals } from './minerals';
import type { MatchRecord, MatchSide, Verdict } from './types';
import { VERDICT_LABEL } from './verdict';

export interface ReportCitation {
  /** 1-based number, in order of first use. */
  n: number;
  text: string;
  /** Measured, Mission or Literature, when the source carries a badge. */
  badge: Badge | null;
}

/** A sentence or a table cell, with the citations it rests on. */
export interface ReportText {
  text: string;
  cites: number[];
}

export interface ReportTable {
  columns: string[];
  rows: ReportText[][];
}

export interface ReportSection {
  id: string;
  title: string;
  paragraphs: ReportText[];
  table: ReportTable | null;
}

export interface MatchReport {
  version: 1;
  generatedAt: string;
  title: string;
  subtitle: string;
  /** Three to five sentences: the verdict, the strongest and weakest dimension, and the main caveat. */
  summary: ReportText[];
  sections: ReportSection[];
  citations: ReportCitation[];
  /** Printed at the foot of every report. */
  footer: string[];
}

export interface ValidationFigures {
  /** ROC AUC on the hold-out set, Base preset. */
  holdoutAuc: number;
  /** Share of known analogs in the top 10% of Earth cells, hold-out set. */
  holdoutTop10: number;
  /** Mean percentile of known analogs, hold-out set. */
  holdoutMeanPercentile: number;
  frozenAt: string;
}

export interface ReportInput {
  record: MatchRecord;
  /** The shared-minerals result for this pair, to list the minerals by name. */
  minerals?: SharedMinerals | null;
  /** Rank stability for this target, and this place's own row in it when it was followed. */
  stability?: { result: StabilityResult; cell?: CellStability | null } | null;
  /** A measured route on the Earth place or the target, with a label saying which. */
  routes?: { label: string; result: RouteResult }[];
  /** The named place the target was picked from, if any. */
  knownSite?: KnownSite | null;
  /** Headline validation numbers (validation/output/report.json). */
  validation?: ValidationFigures | null;
}

const VERDICT_WORD: Record<Verdict, string> = VERDICT_LABEL;
const pct = (v: number): string => `${Math.round(v * 100)}%`;
const fixed = (v: number | null, d: number): string => (v === null ? 'no data' : v.toFixed(d));

class Citations {
  private readonly list: ReportCitation[] = [];
  private readonly byText = new Map<string, number>();

  cite(text: string | null | undefined, badge: Badge | null = null): number[] {
    if (!text) return [];
    const key = text.trim();
    if (key === '') return [];
    const known = this.byText.get(key);
    if (known !== undefined) return [known];
    const n = this.list.length + 1;
    this.list.push({ n, text: key, badge });
    this.byText.set(key, n);
    return [n];
  }

  side(s: MatchSide): number[] {
    return this.cite(s.source, s.badge);
  }

  all(): ReportCitation[] {
    return this.list;
  }
}

const plain = (text: string): ReportText => ({ text, cites: [] });
const merge = (...lists: number[][]): number[] => [...new Set(lists.flat())].sort((a, b) => a - b);

function coords(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
}

/** Assembles the report object for one match. Pure: the same input gives the same report. */
export function buildReport(input: ReportInput): MatchReport {
  const { record } = input;
  const c = new Citations();
  const body = record.target.body === 'moon' ? 'the Moon' : 'Mars';
  const core = record.dimensions.filter((d) => d.inScore);
  const extra = record.dimensions.filter((d) => d.addedAfterFreeze);
  const sections: ReportSection[] = [];

  // 1. The target
  const targetParagraphs: ReportText[] = [
    plain(`${record.target.name}, on ${body}, at ${coords(record.target.lat, record.target.lon)}.`),
    plain(record.target.summary),
  ];
  if (input.knownSite) {
    targetParagraphs.push({
      text: `Picked from the list of named places: ${input.knownSite.name} (${input.knownSite.status}${input.knownSite.date ? `, ${input.knownSite.date}` : ''}).`,
      cites: c.cite(`${input.knownSite.source}${input.knownSite.url ? `, ${input.knownSite.url}` : ''}`, input.knownSite.kind === 'landing-site' ? 'Mission' : 'Literature'),
    });
  }
  const originText =
    record.target.origin === 'curated'
      ? 'Target values are curated: each is cited or measured for this place.'
      : record.target.origin === 'grid'
        ? 'Target values come from a global grid cell around the point, not from a study of the place.'
        : 'No target values exist for this point beyond those every place on the body shares.';
  targetParagraphs.push(plain(`${originText} Confidence in the target profile: ${record.target.confidence}.${record.target.missing.length > 0 ? ` No value for: ${record.target.missing.join(', ')}.` : ''}`));
  sections.push({ id: 'target', title: 'The target', paragraphs: targetParagraphs, table: null });

  // 2. The Earth place
  const earthParagraphs: ReportText[] = [
    plain(`${record.earth.name}, at ${coords(record.earth.lat, record.earth.lon)}. ${record.earth.scale === 'site' ? `Values measured inside a ${record.earth.footprintKm ?? '?'} km footprint, with the climate of the surrounding 0.5 degree cell.` : 'Values are those of one 0.5 degree grid cell, about 55 km across.'}`),
    ...record.earth.notes.map(plain),
  ];
  if (record.earth.rockName) earthParagraphs.push(plain(`Rock as named by the source: ${record.earth.rockName}.`));
  if (record.earth.bareShare !== null) earthParagraphs.push(plain(`${pct(record.earth.bareShare)} of the footprint is bare ground.`));
  sections.push({ id: 'earth', title: 'The place on Earth', paragraphs: earthParagraphs, table: null });

  // 3. All-round score
  const scoreText =
    record.score.value === null
      ? `No all-round score: ${record.score.reason}`
      : `All-round score ${fixed(record.score.value, 1)} out of 100 (${record.score.preset} weights, ${record.score.confidence} confidence). ${record.score.reason}`;
  const scoreParagraphs: ReportText[] = [...(record.target.scoresComparable ? [] : [plain(record.caveats[0] ?? '')]), plain(scoreText), plain('The all-round score is low for almost every place on Earth, because Earth is far warmer and wetter than the target. Read the rank and the single dimensions, not the score alone.')];
  if (input.validation) {
    scoreParagraphs.push(
      plain(
        `How far to trust it: on sites kept aside for testing, the score ranked a known analog above a control site ${pct(input.validation.holdoutAuc)} of the time, and known analogs beat ${pct(input.validation.holdoutMeanPercentile)} of all land cells on average; ${pct(input.validation.holdoutTop10)} of them reached the top tenth. Formula, tolerances and weights were frozen on ${input.validation.frozenAt}.`,
      ),
    );
  }
  sections.push({ id: 'score', title: 'All-round score', paragraphs: scoreParagraphs, table: null });

  // 4. Dimension by dimension
  const rows: ReportText[][] = [];
  for (const d of core) {
    for (const r of d.rows) {
      const e = c.side(r.earth);
      const t = c.side(r.target);
      rows.push([
        plain(d.label),
        plain(r.label),
        { text: r.earth.note ? `${r.earth.text}. ${r.earth.note}` : r.earth.text, cites: e },
        { text: r.target.text, cites: t },
        plain(r.similarity === null ? 'n/a' : r.similarity.toFixed(2)),
        plain(VERDICT_WORD[r.verdict]),
        plain(r.reason),
      ]);
    }
  }
  sections.push({
    id: 'dimensions',
    title: 'Dimension by dimension',
    paragraphs: core.map((d) => plain(`${d.label}: ${VERDICT_WORD[d.verdict].toLowerCase()}${d.similarity === null ? '' : ` (similarity ${d.similarity.toFixed(2)}${d.percentile === null ? '' : `, ahead of ${pct(d.percentile)} of Earth's land cells`})`}. ${d.reason}`)),
    table: { columns: ['Dimension', 'Measurement', 'Earth', 'Target', 'Similarity', 'Verdict', 'Why'], rows },
  });

  // 5. Dimensions added after the freeze
  const extraParagraphs: ReportText[] = [plain('These dimensions were added after the score was frozen on 2026-11-14. They are shown beside it, never inside it, and they have not been validated.')];
  for (const d of extra) {
    const r = d.rows[0];
    extraParagraphs.push({ text: `${d.label}: ${VERDICT_WORD[d.verdict].toLowerCase()}. ${d.reason}`, cites: r ? merge(c.side(r.earth), c.side(r.target)) : [] });
    if (r?.earth.note) extraParagraphs.push(plain(r.earth.note));
  }
  let mineralTable: ReportTable | null = null;
  if (input.minerals) {
    const m = input.minerals;
    const targetCell = (list: { name: string; instrument: string; method: string; abundance: string | null; source: string; url: string | null; badge: Badge }[]): ReportText => ({
      text: list.map((x) => `${x.name} (${x.instrument}, ${x.method === 'in-place' ? 'measured in place' : 'from orbit'}${x.abundance ? `, ${x.abundance}` : ''})`).join('; '),
      cites: merge(...list.map((x) => c.cite(`${x.source}${x.url ? `, ${x.url}` : ''}`, x.badge))),
    });
    const mrows: ReportText[][] = [];
    for (const s of m.shared) mrows.push([plain(s.label), plain(`Identified in ${pct(s.earthShare)} of the clear pixels`), targetCell(s.target), plain('Shared')]);
    for (const s of m.targetOnly) mrows.push([plain(s.label), plain('Not identified'), targetCell(s.target), plain('At the target only')]);
    for (const s of m.notComparable) mrows.push([plain(s.label), plain('Cannot be identified by this instrument'), targetCell(s.target), plain('Not comparable')]);
    for (const s of m.earthOnly) mrows.push([plain(s.label), plain(`Identified in ${pct(s.shareOfValidPixels)} of the clear pixels`), plain('Not reported'), plain('On Earth only')]);
    mineralTable = { columns: ['Mineral family', 'Earth place', 'Target', 'Result'], rows: mrows };
    if (m.shared.length > 0) extraParagraphs.push(plain(`Shared mineral families: ${listLabels(m.shared.map((s) => s.label))}. A shared family is a pointer for a geologist, not proof of the same rock: the Earth side is a spectral match from orbit, the target side a rover or orbiter result.`));
  }
  sections.push({ id: 'after-freeze', title: 'Added after the freeze: minerals, ice, dust, wind', paragraphs: extraParagraphs, table: mineralTable });

  // 6. Purposes
  sections.push({
    id: 'purposes',
    title: 'What the place could be used for',
    paragraphs: [plain('Each purpose uses only the dimensions it depends on, with the frozen weights. These rankings are development numbers: they were defined after every known site had been seen.')],
    table: {
      columns: ['Purpose', 'Score', 'Verdict', 'With the added dimensions', 'Why these dimensions'],
      rows: record.purposes.map((p) => [
        plain(p.label),
        plain(p.score === null ? 'no score' : p.score.toFixed(1)),
        plain(VERDICT_WORD[p.verdict]),
        plain(p.extendedScore === null ? 'n/a' : `${p.extendedScore.toFixed(1)} (${p.extraDimensions.join(', ')})`),
        plain(p.why),
      ]),
    },
  });

  // 7. Rank stability
  if (input.stability) {
    const s = input.stability;
    const paragraphs: ReportText[] = [plain(s.result.summary)];
    if (s.cell) {
      paragraphs.push(
        plain(
          s.cell.baseRank === null
            ? 'This place has no score, so it has no rank to test.'
            : `This place ranks ${s.cell.baseRank} of ${s.result.scoredCells} scored cells. Over the redraws its rank ran from ${s.cell.bestRank} to ${s.cell.worstRank} (median ${s.cell.medianRank}), and it was in the top ${s.result.topN} in ${pct(s.cell.shareInTopN)} of them.`,
        ),
      );
    }
    paragraphs.push(plain(`Method: ${s.result.draws} redraws with seed ${s.result.seed}; each weight multiplied by a factor between ${(1 - s.result.spread).toFixed(2)} and ${(1 + s.result.spread).toFixed(2)}, then all renormalised. The frozen weights are not changed.`));
    sections.push({ id: 'stability', title: 'Does the rank depend on the exact weights?', paragraphs, table: null });
  }

  // 8. Routes
  for (const [i, route] of (input.routes ?? []).entries()) {
    const r = route.result;
    const paragraphs: ReportText[] = [
      plain(
        `${route.label}: ${(r.distanceM / 1000).toFixed(2)} km, climbing ${r.ascentM.toFixed(0)} m and descending ${r.descentM.toFixed(0)} m, between ${fixed(r.minElevationM, 0)} m and ${fixed(r.maxElevationM, 0)} m. Steepest ground crossed: ${fixed(r.maxTerrainSlopeDeg, 1)} degrees.`,
      ),
    ];
    if (r.limit && r.shareAboveLimit !== null) {
      const partial = r.noDataShare > 0;
      paragraphs.push({
        text: `${pct(r.shareAboveLimit)} of ${partial ? `the ${fixed(r.judgedDistanceM, 0)} m of route that has elevation data` : 'the route'} (${fixed(r.distanceAboveLimitM, 0)} m) crosses ground steeper than ${r.limit.limitDeg} degrees, the ${r.limit.kind} for ${r.limit.rover}.`,
        cites: c.cite(r.limit.source, 'Literature'),
      });
    }
    if (r.speed && r.drivingTimeH !== null) {
      paragraphs.push({ text: `Driving time at ${r.speed.metresPerHour} m per hour (${r.speed.kind}, ${r.speed.rover}): at least ${r.drivingTimeH.toFixed(1)} hours.`, cites: c.cite(r.speed.source, 'Literature') });
    }
    paragraphs.push(...r.notes.filter((n) => !n.startsWith('Slope limit:') && !n.startsWith('Driving time')).map(plain));
    sections.push({ id: `route-${i + 1}`, title: `Route: ${route.label}`, paragraphs, table: null });
  }

  // 9. What Earth cannot copy
  sections.push({
    id: 'cannot-copy',
    title: 'What Earth cannot copy',
    paragraphs: [plain('Never part of any score.'), ...record.cannotCopy.map(plain), ...record.beyondEarth.map((g) => plain(g.text))],
    table: null,
  });

  // 10. Limits
  sections.push({ id: 'limits', title: 'Limits of this comparison', paragraphs: record.caveats.map(plain), table: null });

  const strongest = record.headline.strongest;
  const weakest = record.headline.weakest;
  const summary: ReportText[] = [
    plain(
      record.score.value === null
        ? `${record.earth.name} cannot be scored against ${record.target.name}: ${record.score.reason}`
        : `${record.earth.name} against ${record.target.name}: ${VERDICT_WORD[record.score.verdict].toLowerCase()} as an all-round rehearsal site (${record.score.value.toFixed(1)} out of 100).`,
    ),
  ];
  if (strongest) summary.push(plain(`Closest on ${strongest.charAt(0).toLowerCase()}${strongest.slice(1)}`));
  if (weakest) summary.push(plain(`Furthest on ${weakest.charAt(0).toLowerCase()}${weakest.slice(1)}`));
  const best = [...record.purposes].filter((p) => p.score !== null && p.id !== 'base').sort((a, b) => (b.score as number) - (a.score as number))[0];
  if (best && (best.score as number) > 0) summary.push(plain(`Best use: ${best.label.toLowerCase()} (${(best.score as number).toFixed(1)} out of 100, not validated).`));
  summary.push(plain(record.earth.scale === 'site' ? 'Terrain, vegetation and rock are site values; temperature and rainfall are those of the 55 km cell around the site.' : 'Every Earth value describes a 55 km cell, not a single feature in it.'));

  return {
    version: 1,
    generatedAt: record.generatedAt,
    title: `${record.earth.name} as an analog for ${record.target.name}`,
    subtitle: `SBATS match report. ${body === 'Mars' ? 'Mars' : 'Moon'} target at ${coords(record.target.lat, record.target.lon)}; Earth place at ${coords(record.earth.lat, record.earth.lon)}.`,
    summary,
    sections,
    citations: c.all(),
    footer: [
      'Gravity, vacuum or thin air, and radiation cannot be copied on Earth and are never scored.',
      'Badges: Measured (Earth observation data), Mission (spacecraft data), Literature (published papers and agency pages).',
      'Built with AI assistance (Claude Code), directed and reviewed by the team. No value in this report was produced by an AI model: every number comes from the cited sources or is computed from them.',
    ],
  };
}

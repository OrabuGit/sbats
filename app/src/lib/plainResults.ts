// Plain-language results, built by fixed rules from a match record. Nothing here is written by hand
// per place and nothing is a new number: every figure comes from the library that computed it.
//
// RULES
//  1. Headline. The band word is matchWord(score) of lib/scoring (Strong 80+, Good 60+, Partial 40+,
//     Weak 20+, Poor). The sentence then names the dimensions that match, those that match partly and
//     those that do not, by the verdict the match record gave each one (verdict.ts cut-offs 0.75 / 0.30).
//     No score: the sentence says so and names what could be compared.
//  2. "Good for" = the activities of the dimensions whose verdict is "matches".
//     "Not for"   = the activities of the dimensions whose verdict is "does-not-match".
//     A dimension that matches partly or has no data is in neither line; the headline names it.
//  3. Tags = one short label for each dimension that matches (solid) or matches partly (outlined).
//  4. Purposes = one entry per purpose of the record, in its order. Ready = verdict "matches",
//     Partial = "partly", Not suited = "does-not-match", No data = "no-data". Each carries the
//     purpose's own reason (PurposeDef.why) and, from the purpose's own dimension list, which of its
//     dimensions hold it back (verdict other than "matches").
//  4b. Capabilities ("What could be tested here"): one card for each of the seven kinds of work the challenge
//     names, in this order: Landing, Navigation, Mobility, Robotics, Construction, Resource utilization,
//     Human operations. Each is Ready, Partial, Not suited or Not assessed, by the rule below from the
//     record's dimension verdicts (same cut-offs as everywhere: 0.75 / 0.30) and its purpose scores.
//     There are two kinds of rule.
//       By dimensions: "core" dimensions must all match for Ready; one core dimension that does not match
//       is Not suited; otherwise Partial. "Support" dimensions can only lower Ready to Partial (a condition,
//       not a blocker). Landing:      core terrain (slope and roughness), support sunlight.
//                       Navigation:   core terrain and bare ground (open surface), support sunlight (light and
//                                     shadow for cameras). Construction: core terrain (slope, roughness),
//                                     support rock type; its reason always says that ground strength and
//                                     regolith depth are not assessed.
//       By purpose: the verdict of the record's own purpose score. Mobility = the Rover mobility purpose
//       (terrain, bare ground). Resource utilization = the Ice and resources purpose (climate, sunlight,
//       rock type); where the ice or minerals dimension has data and does not match, Ready is lowered to
//       Partial, and where it matches or does not exist the purpose alone decides. Human operations = the
//       Full base rehearsal purpose (rock, terrain, climate, bare ground, sunlight).
//     Not assessed, by rule: any dimension the rule needs has no data (the reason names it); the purpose
//     has no score (reason names the dimensions with no data); and always for Robotics, because robot
//     performance depends on regolith properties and electronics temperature cycles that the grid does not
//     hold at site scale. The only dust and temperature figures here are the air haze (aerosol optical
//     depth) and the day-night swing of a 0.5 degree cell: neither is regolith dust or a component
//     temperature, so no part of Robotics is rated from them.
//     The reason names the dimensions by verdict ("Slope and roughness match; sunlight matches partly.").
//     The score shown, when there is one, is the purpose's own score, printed as given.
//  5. Dimension to activity: geology = rock and mineral sampling, terrain = driving and landing
//     practice, climate = thermal and life-support tests, bare ground = surface operations on bare
//     ground, sunlight = solar power tests.
//  6. Day length (field logistics). Sunrise equation cos H = -tan(latitude) tan(declination), day length
//     = 24 H / pi hours, with the Sun's declination at the solstice, the axial tilt of 23.44 degrees.
//     The geometric day: no refraction, no horizon elevation. cos H above 1 is polar night (0 h),
//     below -1 is midnight sun (24 h). Labelled Computed.
//  7. Slope in words: compared with a published rover slope limit only when data/rovers.json is loaded,
//     and the limit is then quoted with its source. Without it, no judgement is made.
//
// A local test fixture would be: plainResults(record with geology 'matches', terrain 'does-not-match',
// the other three 'partly') gives goodFor ['rock and mineral sampling'], notFor ['driving and landing
// practice'].

import type { MatchRecord } from './matchAdapter';
import { fromRecord, type Verdict } from './verdict';
import { PURPOSES, matchWord } from './scoringAdapter';

export type DimId = 'geology' | 'terrain' | 'climate' | 'bareGround' | 'sunlight';

/** Plain activity per dimension (rule 5). `tag` is the short label used on a tag. */
export const ACTIVITY: Record<DimId, { activity: string; tag: string }> = {
  geology: { activity: 'rock and mineral sampling', tag: 'Rock sampling' },
  terrain: { activity: 'driving and landing practice', tag: 'Driving and landing' },
  climate: { activity: 'thermal and life-support tests', tag: 'Thermal tests' },
  bareGround: { activity: 'surface operations on bare ground', tag: 'Bare-ground work' },
  sunlight: { activity: 'solar power tests', tag: 'Solar power' },
};

const isDim = (id: string): id is DimId => id in ACTIVITY;

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export type PurposeStatus = 'ready' | 'partial' | 'not-suited' | 'no-data' | 'not-assessed';
export const STATUS_WORD: Record<PurposeStatus, string> = { ready: 'Ready', partial: 'Partial', 'not-suited': 'Not suited', 'no-data': 'No data', 'not-assessed': 'Not assessed' };

export interface PlainPurpose {
  id: string;
  label: string;
  status: PurposeStatus;
  /** The library's score, 0 to 100, or null. Printed as given. */
  score: number | null;
  /** The purpose's own reason. */
  why: string;
  /** Names of the purpose's dimensions that do not match here, empty when all match. */
  heldBack: string[];
}

export type CapabilityId = 'landing' | 'navigation' | 'mobility' | 'robotics' | 'construction' | 'resources' | 'human';

export interface Capability {
  id: CapabilityId;
  /** The name as the challenge uses it. */
  label: string;
  status: PurposeStatus;
  /** One line, written by rule from the verdicts. */
  reason: string;
  /** What the rating was read from, in words. Empty when nothing was assessed. */
  basis: string;
  /** The purpose's own score (0 to 100) when the rating comes from a purpose, else null. */
  score: number | null;
}

export interface PlainResults {
  headline: string;
  goodFor: string[];
  notFor: string[];
  tags: { label: string; verdict: Verdict }[];
  purposes: PlainPurpose[];
  /** The seven kinds of work, one card each, in fixed order. */
  capabilities: Capability[];
}

const STATUS: Record<Verdict, PurposeStatus> = { match: 'ready', partial: 'partial', miss: 'not-suited', none: 'no-data' };

/**
 * @param record the match record on screen
 * @param score  the 0 to 100 score shown for it, null when it has none
 * @param placeName name of the Earth place, for the headline
 */
export function plainResults(record: MatchRecord, score: number | null, placeName: string): PlainResults {
  const core = record.dimensions.filter((d) => d.inScore && isDim(d.id));
  const by = (v: Verdict) => core.filter((d) => fromRecord(d.verdict) === v);
  const names = (ds: typeof core) => ds.map((d) => d.label.toLowerCase());
  const match = by('match');
  const partial = by('partial');
  const miss = by('miss');
  const none = by('none');

  const parts: string[] = [];
  if (match.length > 0) parts.push(`${list(names(match))} ${match.length === 1 ? 'matches' : 'match'}`);
  if (partial.length > 0) parts.push(`${list(names(partial))} ${partial.length === 1 ? 'matches' : 'match'} partly`);
  if (miss.length > 0) parts.push(`${list(names(miss))} ${miss.length === 1 ? 'does' : 'do'} not match`);
  if (none.length > 0) parts.push(`${list(names(none))} could not be compared`);
  const detail = parts.length > 0 ? `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1)}${parts.length > 1 ? `; ${parts.slice(1).join('; ')}` : ''}.` : 'No dimension could be compared.';
  const lead =
    score === null
      ? `${placeName} has no overall score as a stand-in for ${record.target.name}.`
      : `${placeName} is a ${matchWord(score).toLowerCase()} stand-in for ${record.target.name}.`;

  const purposes: PlainPurpose[] = record.purposes.map((p) => {
    const def = PURPOSES.find((x) => x.id === p.id);
    const heldBack = (def?.dimensions ?? [])
      .map((id) => core.find((d) => d.id === id))
      .filter((d): d is (typeof core)[number] => !!d && fromRecord(d.verdict) !== 'match')
      .map((d) => d.label.toLowerCase());
    return { id: p.id, label: p.label, status: STATUS[fromRecord(p.verdict)], score: p.score, why: p.why, heldBack };
  });

  return {
    headline: `${lead} ${detail}`,
    goodFor: match.map((d) => ACTIVITY[d.id as DimId].activity),
    notFor: miss.map((d) => ACTIVITY[d.id as DimId].activity),
    tags: [...match, ...partial].map((d) => ({ label: ACTIVITY[d.id as DimId].tag, verdict: fromRecord(d.verdict) })),
    purposes,
    capabilities: capabilities(record),
  };
}

// ---------------------------------------------------------------------------------------------
// Capabilities (rule 4b)

type NeedId = 'geology' | 'terrain' | 'climate' | 'bareGround' | 'sunlight' | 'minerals' | 'ice';
/** Noun phrase for each dimension in a reason, and whether it reads as plural ("slope and roughness match"). */
const NAME: Record<NeedId, { text: string; pl: boolean }> = {
  geology: { text: 'rock type', pl: false },
  terrain: { text: 'slope and roughness', pl: true },
  climate: { text: 'climate', pl: false },
  bareGround: { text: 'open bare ground', pl: false },
  sunlight: { text: 'sunlight', pl: false },
  minerals: { text: 'minerals', pl: true },
  ice: { text: 'ground ice', pl: false },
};

interface Rule {
  id: CapabilityId;
  label: string;
  by: 'dims' | 'purpose' | 'none';
  core?: NeedId[];
  support?: NeedId[];
  purpose?: string;
  purposeName?: string;
  /** Dimensions that lower Ready to Partial when present with data and not matching. */
  optional?: NeedId[];
  note?: string;
  unassessed?: string;
}

export const CAPABILITY_RULES: Rule[] = [
  { id: 'landing', label: 'Landing', by: 'dims', core: ['terrain'], support: ['sunlight'], note: 'Rock abundance at landing-site scale is not assessed.' },
  { id: 'navigation', label: 'Navigation', by: 'dims', core: ['terrain', 'bareGround'], support: ['sunlight'], note: 'Visible landmarks are not assessed.' },
  { id: 'mobility', label: 'Mobility', by: 'purpose', purpose: 'mobility', purposeName: 'Rover mobility' },
  {
    id: 'robotics',
    label: 'Robotics',
    by: 'none',
    unassessed: 'Robot performance depends on dust and regolith properties and electronics temperature cycles that our grid does not hold at site scale.',
  },
  { id: 'construction', label: 'Construction', by: 'dims', core: ['terrain'], support: ['geology'], note: 'Ground strength and regolith depth are not assessed.' },
  { id: 'resources', label: 'Resource utilization', by: 'purpose', purpose: 'ice', purposeName: 'Ice and resources', optional: ['ice', 'minerals'] },
  { id: 'human', label: 'Human operations', by: 'purpose', purpose: 'base', purposeName: 'Full base rehearsal', note: 'Radiation, vacuum and gravity cannot be copied on Earth.' },
];

const WORD: Record<Verdict, string> = { match: 'match', partial: 'match partly', miss: 'do not match', none: 'have no data' };
const WORD1: Record<Verdict, string> = { match: 'matches', partial: 'matches partly', miss: 'does not match', none: 'has no data' };

/** "Slope and roughness match; sunlight matches partly." Grouped by verdict, the same style as the headline. */
function sentence(items: { id: NeedId; v: Verdict }[]): string {
  const parts: string[] = [];
  for (const v of ['match', 'partial', 'miss'] as Verdict[]) {
    const g = items.filter((i) => i.v === v);
    if (g.length === 0) continue;
    const plural = g.length > 1 || NAME[g[0].id].pl;
    parts.push(`${list(g.map((i) => NAME[i.id].text))} ${plural ? WORD[v] : WORD1[v]}`);
  }
  const t = parts.join('; ');
  return t ? `${t.charAt(0).toUpperCase()}${t.slice(1)}.` : '';
}

function capabilities(record: MatchRecord): Capability[] {
  const dimV = (id: NeedId): Verdict => {
    const d = record.dimensions.find((x) => x.id === id);
    return d ? fromRecord(d.verdict) : 'none';
  };
  return CAPABILITY_RULES.map((r): Capability => {
    const base = { id: r.id, label: r.label };
    const tail = r.note ? ` ${r.note}` : '';
    if (r.by === 'none') return { ...base, status: 'not-assessed', reason: r.unassessed ?? '', basis: '', score: null };

    if (r.by === 'dims') {
      const need = [...(r.core ?? []), ...(r.support ?? [])];
      const items = need.map((id) => ({ id, v: dimV(id) }));
      const missing = items.filter((i) => i.v === 'none');
      if (missing.length > 0) {
        return { ...base, status: 'not-assessed', reason: `No data for ${list(missing.map((i) => NAME[i.id].text))}, so this is not assessed.${tail}`, basis: '', score: null };
      }
      const core = items.filter((i) => r.core?.includes(i.id));
      const support = items.filter((i) => r.support?.includes(i.id));
      const status: PurposeStatus = core.some((i) => i.v === 'miss')
        ? 'not-suited'
        : core.every((i) => i.v === 'match') && support.every((i) => i.v === 'match')
          ? 'ready'
          : 'partial';
      return { ...base, status, reason: `${sentence(items)}${tail}`, basis: list(need.map((id) => NAME[id].text)), score: null };
    }

    // By purpose
    const p = record.purposes.find((x) => x.id === r.purpose);
    const def = PURPOSES.find((x) => x.id === r.purpose);
    const dims = (def?.dimensions ?? []) as NeedId[];
    const items = dims.map((id) => ({ id, v: dimV(id) }));
    if (!p || p.verdict === 'no-data') {
      const missing = items.filter((i) => i.v === 'none');
      const what = missing.length > 0 ? `No data for ${list(missing.map((i) => NAME[i.id].text))}` : `The ${r.purposeName?.toLowerCase()} score could not be computed`;
      return { ...base, status: 'not-assessed', reason: `${what}, so this is not assessed.${tail}`, basis: '', score: null };
    }
    const opt = (r.optional ?? []).map((id) => ({ id, v: dimV(id) })).filter((i) => i.v !== 'none');
    let status = STATUS[fromRecord(p.verdict)];
    if (status === 'ready' && opt.some((i) => i.v !== 'match')) status = 'partial';
    const reason = `${sentence([...items, ...opt])}${tail}`;
    const optNames = opt.length > 0 ? ` and ${list(opt.map((i) => NAME[i.id].text))}` : '';
    return { ...base, status, reason, basis: `the ${r.purposeName} score (${list(dims.map((id) => NAME[id].text))})${optNames}`, score: p.score };
  });
}

// ---------------------------------------------------------------------------------------------
// Field logistics (rules 6 and 7)

/** Axial tilt of the Earth, degrees: the Sun's declination at a solstice. A standard astronomical constant. */
export const AXIAL_TILT_DEG = 23.44;

/** Hours of daylight at a latitude when the Sun's declination is `declDeg`. 0 is polar night, 24 midnight sun. */
export function dayLengthHours(latDeg: number, declDeg: number): number {
  const rad = Math.PI / 180;
  const c = -Math.tan(latDeg * rad) * Math.tan(declDeg * rad);
  if (c >= 1) return 0;
  if (c <= -1) return 24;
  return (24 / Math.PI) * Math.acos(c);
}

/** Longest and shortest day of the year at a latitude (Computed). Which solstice is which flips with the hemisphere. */
export function dayLengths(latDeg: number): { longest: number; shortest: number } {
  const a = dayLengthHours(latDeg, AXIAL_TILT_DEG);
  const b = dayLengthHours(latDeg, -AXIAL_TILT_DEG);
  return { longest: Math.max(a, b), shortest: Math.min(a, b) };
}

/** 14.2 h as "14 h 12 min". */
export function hoursText(h: number): string {
  if (h <= 0) return '0 h';
  if (h >= 24) return '24 h';
  const total = Math.round(h * 60);
  if (total < 60) return `${total} min`;
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')} min`;
}

/** What the day lengths mean, by rule. */
export function dayMeaning(latDeg: number): string {
  const { longest, shortest } = dayLengths(latDeg);
  if (shortest <= 0 && longest >= 24) return 'Inside the polar circle: the Sun stays below the horizon on the shortest day and above it on the longest.';
  if (shortest <= 0) return 'The Sun stays below the horizon for the shortest day of the year.';
  if (longest >= 24) return 'The Sun does not set on the longest day of the year.';
  const swing = longest - shortest;
  return `Daylight changes by about ${hoursText(swing)} between the longest and the shortest day, so solar power and work hours shift through the year.`;
}

export interface RoverLimit {
  deg: number;
  rover: string;
  kind: string;
  source: string;
}

/** The slope limit to quote: the published figure of the VIPER rover in data/rovers.json when present, else none. */
export interface RoversLike {
  rovers: { id: string; name: string; slopeLimit: { value: number; kind: string; source: string } | null }[];
}

export function limitFromRovers(file: RoversLike | null): RoverLimit | null {
  const r = file?.rovers?.find((x) => x.id === 'viper');
  if (!r?.slopeLimit) return null;
  return { deg: r.slopeLimit.value, rover: r.name.split(' (')[0], kind: r.slopeLimit.kind, source: r.slopeLimit.source };
}

export function slopeMeaning(slopeDeg: number, limit: RoverLimit | null): string {
  if (!limit) return 'No rover slope limit is published in this build, so no judgement is made. The figure is a mean: slopes inside the area can be steeper.';
  const cite = `${limit.deg}° ${limit.kind} of ${limit.rover}`;
  return slopeDeg > limit.deg
    ? `Steep for wheeled vehicles: the mean is above the ${cite}.`
    : `Gentle for wheeled vehicles on average: below the ${cite}. The figure is a mean, so slopes inside the area can be steeper.`;
}

export function roughnessMeaning(roughnessM: number): string {
  return `Ground height varies by about ${roughnessM.toFixed(roughnessM < 10 ? 1 : 0)} m (standard deviation) around its local mean.`;
}

export function tempMeaning(tempC: number): string {
  return tempC < 0 ? 'The mean is below the freezing point of water (0 °C), so heating and cold-soak matter more than cooling.' : 'The mean is above the freezing point of water (0 °C).';
}

export function precipMeaning(mmPerYear: number): string {
  if (mmPerYear === 0) return 'No precipitation is recorded here.';
  return `About ${(mmPerYear / 365).toFixed(mmPerYear / 365 < 1 ? 2 : 1)} mm a day on average, as rain or snow.`;
}

export function reliefMeaning(reliefM: number, windowKm: number): string {
  return `The highest point of this ${windowKm} km square stands ${Math.round(reliefM).toLocaleString('en-US')} m above its lowest.`;
}

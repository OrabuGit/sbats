// The tool's own verdict for each team story pair (data/site_stories.json). The story carries no score;
// this computes one in the browser with the same scorer as the heatmap: the Earth site's 0.5 degree grid
// cell against the story's tool target, Base weights. A story whose place has no tool target gets no
// verdict (null), and the page says so.
import type { EarthFile, Target } from '../types';
import type { SitesFile } from '../data/sites';
import type { StoriesFile } from '../data/stories';
import { buildIndex, type CellIndex } from './geo';
import { PRESETS, matchWord, type Scorer } from './scoringAdapter';
import type { MatchRecord } from './matchAdapter';
import { fromRecord, type Verdict } from './verdict';
import { profileOf, type Profile } from './profile';
import type { FeaturedSite } from '../data/sites';

export interface PairVerdict {
  /** 0 to 100, or null when the cell has too little data for a score. */
  score: number | null;
  /** matchWord(score), or 'no data'. */
  word: string;
  confidence: string | null;
}

/** One measurement of the site-scale comparison: Earth value against target value, with the tool's verdict. */
export interface SiteScaleRow {
  label: string;
  earth: string;
  target: string;
  verdict: Verdict;
}

/** The comparison measured inside the site's own footprint, with the footprint score. */
export interface SiteScale {
  footprintKm: number | null;
  rows: SiteScaleRow[];
  score: number | null;
  word: string;
  confidence: string | null;
  /** The five dimensions with both values and the one-line verdict. */
  profile: Profile;
}

export interface EarthOwnValue {
  label: string;
  text: string;
  badge: string | null;
}

/**
 * Two Mars targets added after the freeze of 2026-11-14. The stories file does not name them yet, so the pairing is made
 * here. They are in no validation number and no weight or tolerance changed for them.
 */
const AFTER_FREEZE_TARGET: Record<string, string> = { 'dallol-columbia-hills': 'mars-gusev-columbia-hills', 'uyuni-tunupa-holden': 'mars-holden' };
export const AFTER_FREEZE_TARGET_IDS: string[] = Object.values(AFTER_FREEZE_TARGET);

export interface StoryPair {
  storyId: string;
  /** True when the target was added after the freeze: it is shown, but it is in no validation number. */
  afterFreeze: boolean;
  earthSiteId: string;
  /** All-round score of the whole 0.5 degree grid cell (about 55 km) around the site. null when the place has no tool target. */
  verdict: PairVerdict | null;
  /** The measurements inside the site's footprint against the target, or null when there is no tool target. */
  siteScale: SiteScale | null;
  /** The Earth site's own measured values, always, for the pair whose target has no values. */
  earthOwn: EarthOwnValue[];
}

const NO_DATA: PairVerdict = { score: null, word: 'no data', confidence: null };
const indexes = new WeakMap<EarthFile, CellIndex>();

/** One entry per story: the verdict of the Earth site's grid cell against the story's tool target. */
export function pairVerdict(
  earth: EarthFile,
  scorer: Scorer,
  targets: Target[],
  sites: SitesFile | null,
  stories: StoriesFile | null,
  /** The match record of a featured site against a target at footprint scale (App builds it with matchRecord). */
  recordFor?: (site: FeaturedSite, target: Target) => MatchRecord | null,
): StoryPair[] {
  if (!stories) return [];
  let index = indexes.get(earth);
  if (!index) {
    index = buildIndex(earth);
    indexes.set(earth, index);
  }
  const weights = PRESETS[0].weights;
  const OWN: [string, string][] = [
    ['slope', 'Slope'],
    ['roughness', 'Roughness'],
    ['bareFrac', 'Bare ground'],
    ['rockType', 'Rock class'],
    ['tempMean', 'Mean temperature'],
    ['precip', 'Precipitation'],
  ];
  return stories.stories.map((story) => {
    const earthSiteId = story.earthSiteIds[0] ?? '';
    const targetId = story.target.inTool?.id ?? story.target.targetId ?? AFTER_FREEZE_TARGET[story.id];
    const site = sites?.sites.find((x) => x.id === earthSiteId);
    const earthOwn: EarthOwnValue[] = OWN.flatMap(([k, label]) => {
      const v = site?.values[k];
      if (!v || v.value === null || v.value === undefined) return [];
      const num = typeof v.value === 'number' ? (Math.abs(v.value) >= 100 ? Math.round(v.value) : Math.round(v.value * 100) / 100) : v.value;
      if (k === 'bareFrac' && typeof v.value === 'number') return [{ label, text: `${Math.round(v.value * 100)}% of land pixels`, badge: v.badge ?? null }];
      return [{ label, text: `${num}${v.unit ? ` ${v.unit}` : ''}`, badge: v.badge ?? null }];
    });
    const afterFreeze = AFTER_FREEZE_TARGET_IDS.includes(targetId ?? '');
    const none = { storyId: story.id, afterFreeze, earthSiteId, verdict: null, siteScale: null, earthOwn };
    if (!targetId) return none;
    const target = targets.find((t) => t.id === targetId);
    const point = site?.gridCell ?? site ?? story.earth.teamLocation;
    if (!target || !point) return { ...none, verdict: NO_DATA };
    const i = index.nearest(point.lat, point.lon, 2);
    if (i < 0) return { ...none, verdict: NO_DATA };
    let verdict: PairVerdict = NO_DATA;
    try {
      const e = scorer.forTarget(target).explain(earth.cells[i], weights);
      verdict = e.score === null ? { ...NO_DATA, confidence: e.confidence ?? null } : { score: e.score, word: matchWord(e.score), confidence: e.confidence ?? null };
    } catch {
      verdict = NO_DATA;
    }
    let siteScale: SiteScale | null = null;
    if (site && recordFor) {
      try {
        const rec = recordFor(site, target);
        if (rec) {
          const rows = rec.dimensions
            .filter((d) => d.inScore)
            .flatMap((d) => d.rows.map((r) => ({ label: r.label, earth: r.earth.text, target: r.target.text, verdict: fromRecord(r.verdict) })))
            .filter((r) => r.earth !== 'no data' || r.target !== 'no data');
          const sc = rec.score.value;
          siteScale = { footprintKm: rec.earth.footprintKm ?? null, rows, score: sc, word: sc === null ? 'no data' : matchWord(sc), confidence: rec.score.confidence ?? null, profile: profileOf(rec) };
        }
      } catch {
        siteScale = null;
      }
    }
    return { storyId: story.id, afterFreeze, earthSiteId, verdict, siteScale, earthOwn };
  });
}

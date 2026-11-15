// The tool's own verdict for each team story pair (data/site_stories.json). The story carries no score;
// this computes one in the browser with the same scorer as the heatmap: the Earth site's 0.5 degree grid
// cell against the story's tool target, Base weights. A story whose place has no tool target gets no
// verdict (null), and the page says so.
import type { EarthFile, Target } from '../types';
import type { SitesFile } from '../data/sites';
import type { StoriesFile } from '../data/stories';
import { buildIndex, type CellIndex } from './geo';
import { PRESETS, matchWord, type Scorer } from './scoringAdapter';

export interface PairVerdict {
  /** 0 to 100, or null when the cell has too little data for a score. */
  score: number | null;
  /** matchWord(score), or 'no data'. */
  word: string;
  confidence: string | null;
}

export interface StoryPair {
  storyId: string;
  earthSiteId: string;
  /** null when the story's place has no target in targets.json, so the tool gives no score. */
  verdict: PairVerdict | null;
}

const NO_DATA: PairVerdict = { score: null, word: 'no data', confidence: null };
const indexes = new WeakMap<EarthFile, CellIndex>();

/** One entry per story: the verdict of the Earth site's grid cell against the story's tool target. */
export function pairVerdict(earth: EarthFile, scorer: Scorer, targets: Target[], sites: SitesFile | null, stories: StoriesFile | null): StoryPair[] {
  if (!stories) return [];
  let index = indexes.get(earth);
  if (!index) {
    index = buildIndex(earth);
    indexes.set(earth, index);
  }
  const weights = PRESETS[0].weights;
  return stories.stories.map((story) => {
    const earthSiteId = story.earthSiteIds[0] ?? '';
    const targetId = story.target.inTool?.id ?? story.target.targetId;
    if (!targetId) return { storyId: story.id, earthSiteId, verdict: null };
    const target = targets.find((t) => t.id === targetId);
    const site = sites?.sites.find((s) => s.id === earthSiteId);
    const point = site?.gridCell ?? site ?? story.earth.teamLocation;
    if (!target || !point) return { storyId: story.id, earthSiteId, verdict: NO_DATA };
    const i = index.nearest(point.lat, point.lon, 2);
    if (i < 0) return { storyId: story.id, earthSiteId, verdict: NO_DATA };
    try {
      const e = scorer.forTarget(target).explain(earth.cells[i], weights);
      return {
        storyId: story.id,
        earthSiteId,
        verdict: e.score === null ? { ...NO_DATA, confidence: e.confidence ?? null } : { score: e.score, word: matchWord(e.score), confidence: e.confidence ?? null },
      };
    } catch {
      return { storyId: story.id, earthSiteId, verdict: NO_DATA };
    }
  });
}

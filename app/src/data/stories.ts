// Site stories: data/site_stories.json (Session B, pipeline/site_stories.py; shape in data/SCHEMA.md,
// section "data/site_stories.json"). Five Earth-to-target stories written by the team, beside values
// computed from the project's own data. No story carries a score or a similarity percentage: the type
// has no field for one, and every score on screen comes from the tool. The file may be absent: the
// loader then gives null and the pages show nothing for it.
import type { Badge } from '../types';
import { loadExtra } from './access';
import { useAsync } from '../lib/useAsync';
import type { SiteLogistics } from '../components/FieldLogisticsData';

export interface LatLon {
  lat: number;
  lon: number;
}

export interface StoryValue {
  value: number | string | null;
  unit: string;
  scale: string;
  source: string;
  badge: Badge;
}

export interface StoryOurData {
  siteId: string;
  name: string;
  lat: number;
  lon: number;
  footprintKm: number | null;
  footprintStatus: string | null;
  elevationFootprintM: [number | null, number | null] | null;
  values: Record<string, StoryValue>;
  caveat: string | null;
}

export interface SiteStory {
  id: string;
  title: string;
  trek: string | null;
  earthSiteIds: string[];
  earth: { name: string; teamLocation: LatLon | null };
  target: {
    name: string;
    teamLocation: LatLon | null;
    /** Id in targets.json, or null when the tool has no target (and no score) for the place. */
    targetId: string | null;
    note: string | null;
    /** The tool's own point for the target, when it differs from the team's rounded position. */
    inTool: { id: string; name: string; lat: number; lon: number } | null;
  };
  whyItStandsOut: string | null;
  siteDescription: string | null;
  testingTags: string[];
  missionUse: string | null;
  limitation: string[];
  workaround: string[];
  dominantRock: { earth: string; target: string; status: string } | null;
  ourData: StoryOurData[];
  dataChecks: { claim: string; data: string; source: string; agrees: boolean }[];
  logistics: {
    computed: (SiteLogistics & { siteId: string })[];
    teamEstimate: { accessDifficulty?: string | null; nearestSupportHub?: string | null; costEfficiency?: string | null } | null;
    note: string | null;
  } | null;
  corrections: { field: string; was: string | null; now: string | null; basis: string }[];
  verification: { claim: string; status: string; evidence: string }[];
  needsTeamReview?: string[];
  teamSource: { title: string; url: string | null } | null;
  sources: { title: string; url: string | null }[];
  credit: string | null;
}

export interface StoriesFile {
  meta: { generatedAt: string; description: string; credit: string; rules: string[] };
  stories: SiteStory[];
}

export const loadStories = () => loadExtra<StoriesFile>('site_stories.json');

/** The stories that use this Earth site. Empty when the file or the site has none. */
export function storiesFor(file: StoriesFile | null, siteId: string): SiteStory[] {
  return file?.stories?.filter((s) => Array.isArray(s.earthSiteIds) && s.earthSiteIds.includes(siteId)) ?? [];
}

/** The stories file once loaded. null while loading or when it was not published. */
export function useStories(): StoriesFile | null {
  const s = useAsync(loadStories, 'site-stories');
  return s.status === 'ready' && s.value && Array.isArray(s.value.stories) ? s.value : null;
}

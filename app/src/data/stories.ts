// Site stories: short written accounts of featured sites, published later as data/site_stories.json
// by another session. The file may be absent: loadStories then gives null and the app shows nothing,
// no placeholder. The file can carry text and its source only. A score that is not computed by the
// tool is never read from it (the type has no field for one, and storyFor copies only the fields below).
//
// Expected shape:
//   { "meta": { "generatedAt": "...", "description": "..." },
//     "stories": [ { "siteId": "id-tambora", "title": "optional", "text": "paragraph" | ["paragraph", ...],
//                    "source": "where it comes from", "badge": "Literature", "url": "optional" } ] }
//
// Test fixture, for a local check only (never put it in data/):
//   { "stories": [ { "siteId": "id-batur", "text": ["Example."], "source": "Example source", "badge": "Literature" } ] }
import type { Badge } from '../types';
import { loadExtra } from './access';
import { useAsync } from '../lib/useAsync';

export interface SiteStory {
  siteId: string;
  title: string | null;
  paragraphs: string[];
  source: string;
  badge: Badge;
  url: string | null;
}

interface RawStory {
  siteId?: unknown;
  id?: unknown;
  title?: unknown;
  text?: unknown;
  source?: unknown;
  badge?: unknown;
  url?: unknown;
}
export interface StoriesFile {
  meta?: { generatedAt?: string; description?: string };
  stories?: RawStory[];
}

export const loadStories = () => loadExtra<StoriesFile>('site_stories.json');

const BADGES: readonly string[] = ['Measured', 'Mission', 'Literature'];
const str = (x: unknown): string | null => (typeof x === 'string' && x.trim() !== '' ? x.trim() : null);

/** The story of one site, or null when the file, the site, its text, its source or its badge is missing. */
export function storyFor(file: StoriesFile | null, siteId: string): SiteStory | null {
  const raw = file?.stories?.find((s) => (s.siteId ?? s.id) === siteId);
  if (!raw) return null;
  const paragraphs = (Array.isArray(raw.text) ? raw.text : [raw.text]).map(str).filter((t): t is string => t !== null);
  const source = str(raw.source);
  if (paragraphs.length === 0 || !source || typeof raw.badge !== 'string' || !BADGES.includes(raw.badge)) return null;
  return { siteId, title: str(raw.title), paragraphs, source, badge: raw.badge as Badge, url: str(raw.url) };
}

/** The story of a site once the file has loaded. null while loading, when the file is missing, or when the site has none. */
export function useStories(): StoriesFile | null {
  const s = useAsync(loadStories, 'site-stories');
  return s.status === 'ready' ? s.value : null;
}

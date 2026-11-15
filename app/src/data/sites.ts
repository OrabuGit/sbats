// Featured sites (data/sites.json) and the same-scale extracts (data/extracts). Both are optional:
// null when the file was not published with this build, and the UI then says "no data".
import type { Badge } from '../types';
import { loadExtra } from './access';

export type ValueScale = 'site' | 'volcano' | 'grid';

export interface SiteValue {
  value: number | string | null;
  unit: string;
  scale: ValueScale;
  source: string | null;
  badge: Badge | null;
  note?: string;
  label?: string;
  postM?: number;
  windowKm?: number;
  pixels?: number;
  months?: number;
  scenes?: number;
}

export interface FeaturedSite {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: 'known' | 'negative' | 'candidate';
  /** Side of the square footprint, km. */
  footprintKm: number;
  footprintNote: string;
  values: Record<string, SiteValue | undefined>;
  gridCell: {
    lat: number;
    lon: number;
    ndvi: number | null;
    slope: number | null;
    roughness: number | null;
    lithology: number | null;
    snowIceFrac: number | null;
    barrenFrac: number | null;
  } | null;
  detail: {
    demTile?: string;
    elevMinM?: number | null;
    elevMaxM?: number | null;
    sentinel2Tile?: string;
    sentinel2Scenes?: { id: string; date: string; sceneCloudPct: number; clearLandShare: number }[];
    sentinel2MedianMonthsPerPixel?: number | null;
    sentinel2PixelsNeverClear?: number | null;
    otherRegionalMapUnits?: unknown[];
    errors?: string[];
  };
}

export interface SitesFile {
  meta: { generatedAt: string; description: string; year: number; bareNdviThreshold: number; methods: Record<string, string> };
  sites: FeaturedSite[];
}

export const loadSites = () => loadExtra<SitesFile>('sites.json');

export interface ExtractLayer {
  file: string;
  size: number;
  pixelM: number;
  product: string;
  attribution: string;
  badge: Badge;
  note?: string;
}
export interface ExtractElevation extends ExtractLayer {
  unit: string;
  min: number;
  max: number;
  noDataShare: number;
  nativePixelM: number;
}
export interface ExtractImage extends ExtractLayer {
  bands: string;
  date?: string;
  scene?: string;
  darkShare?: number;
}
export interface ExtractItem {
  id: string;
  name: string;
  body: 'earth' | 'moon' | 'mars';
  lat: number;
  lon: number;
  matchedTargets?: string[];
  elevation: ExtractElevation | null;
  image: ExtractImage | null;
}
export interface ExtractIndex {
  meta: { generatedAt: string; windowKm: number; projection: string; description: string; imageNote?: string };
  items: ExtractItem[];
}

export const loadExtracts = () => loadExtra<ExtractIndex>('extracts/index.json');

/** URL of a file given relative to /data, as the extracts index writes it. */
export const dataUrl = (file: string) => `${import.meta.env.BASE_URL}data/${file}`;

const elevations = new Map<string, Promise<Float32Array>>();
/** Heights in metres, row-major, north row first. NaN is no data. */
export function loadElevation(layer: ExtractElevation): Promise<Float32Array> {
  let hit = elevations.get(layer.file);
  if (!hit) {
    hit = fetch(dataUrl(layer.file)).then(async (res) => {
      if (!res.ok) throw new Error(`${layer.file}: HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      if (buf.byteLength !== layer.size * layer.size * 4) throw new Error(`${layer.file}: expected ${layer.size} x ${layer.size} float32 values`);
      return new Float32Array(buf);
    });
    hit.catch(() => elevations.delete(layer.file));
    elevations.set(layer.file, hit);
  }
  return hit;
}

const images = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(file: string): Promise<HTMLImageElement> {
  let hit = images.get(file);
  if (!hit) {
    hit = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`${file} could not be loaded`));
      img.src = dataUrl(file);
    });
    hit.catch(() => images.delete(file));
    images.set(file, hit);
  }
  return hit;
}

/** Written findings per site, parsed from validation/sites/FINDINGS.md at build time. Printed as they are. */
export interface Findings {
  written: string | null;
  claim: string | null;
  sections: { title: string; slug: string; strong: string[]; short: string[]; notScored: string[]; bullets: string[] }[];
}
export const loadFindings = () => loadExtra<Findings>('findings.json');

/** Site-scale scores from validation/score_sites.ts (Session C). */
export interface SiteScores {
  generatedAt: string;
  sites: {
    id: string;
    name: string;
    kind: string;
    provisional?: boolean;
    caveat?: string | null;
    bareFrac?: number | null;
    rockType?: string | null;
    results: {
      target: string;
      listed: boolean;
      site: {
        dimensions: Record<string, { similarity: number | null; midPercentile: number | null }>;
        purposes: Record<string, { score: number | null; limitingFactor: string | null }>;
      };
    }[];
  }[];
}
export const loadSiteScores = () => loadExtra<SiteScores>('validation-sites.json');

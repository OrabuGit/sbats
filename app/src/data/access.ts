// The one data-access module. Every component gets its data from loadData().
//
// For each file in data/SCHEMA.md it first tries the real built file at <base>data/<name>.json.
// (the build writes data/manifest.json, the list of files that exist, so nothing missing is requested).
// If that file is absent or does not match the contract, it falls back to the fixture in
// src/mocks and records the fact, so the UI can say plainly that fixture data is on screen.
// Nothing else needs to change when the real files land.

import {
  FACTOR_KEYS,
  type Analog,
  type EarthFile,
  type LithologySimilarity,
  type Target,
} from '../types';
import { decodeEarthBin } from './earthBin';

export type FileName = 'earth' | 'targets' | 'analogs' | 'lithology_similarity';
export type FileOrigin = 'real' | 'fixture';

export interface DataBundle {
  earth: EarthFile;
  targets: Target[];
  analogs: Analog[];
  lithology: LithologySimilarity;
  origin: Record<FileName, FileOrigin>;
  /** Files served from fixtures, in display order. Empty when everything is real. */
  fixtureFiles: FileName[];
  /** Problems found in real files that forced a fallback. */
  warnings: string[];
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

function checkEarth(x: unknown): string | null {
  if (!isObj(x) || !isObj(x.meta) || !Array.isArray(x.cells)) return 'missing meta or cells';
  if (typeof x.meta.resolutionDeg !== 'number' || !Array.isArray(x.meta.factors))
    return 'meta.resolutionDeg or meta.factors missing';
  if (x.cells.length === 0) return 'no cells';
  const c = x.cells[0];
  if (!isObj(c) || typeof c.lat !== 'number' || typeof c.lon !== 'number') return 'cells lack lat/lon';
  for (const k of FACTOR_KEYS) if (!(k in c)) return `cells lack key ${k}`;
  return null;
}

function checkTargets(x: unknown): string | null {
  if (!Array.isArray(x) || x.length === 0) return 'not a non-empty array';
  for (const t of x) {
    if (!isObj(t) || typeof t.id !== 'string' || !isObj(t.values) || !Array.isArray(t.cannotCopy))
      return 'target lacks id, values or cannotCopy';
    for (const k of FACTOR_KEYS) if (!isObj(t.values[k])) return `target ${t.id} lacks values.${k}`;
  }
  return null;
}

function checkAnalogs(x: unknown): string | null {
  if (!Array.isArray(x)) return 'not an array';
  for (const a of x)
    if (!isObj(a) || typeof a.id !== 'string' || typeof a.lat !== 'number' || typeof a.lon !== 'number')
      return 'analog lacks id, lat or lon';
  return null;
}

function checkLithology(x: unknown): string | null {
  if (!isObj(x) || !isObj(x.levels) || !Array.isArray(x.pairs)) return 'missing levels or pairs';
  return null;
}

/** Compact binary copy of earth.json (format SBE1, data/SCHEMA.md). Preferred when it is published. */
export const COMPACT_EARTH_FILE = 'earth.bin';

type Early = Record<string, Promise<Response | null>>;
/** Requests index.html started before the app code arrived. Each is used once. */
function early(file: string): Promise<Response | null> | null {
  const e = (window as unknown as { __sbatsEarly?: Early }).__sbatsEarly;
  const hit = e?.[file] ?? null;
  if (e) delete e[file];
  return hit;
}

/** Share of the Earth file received, 0 to 1, or null before the size is known. Shown on the loading screen. */
let progress: number | null = null;
const listeners = new Set<(p: number | null) => void>();
export function onEarthProgress(fn: (p: number | null) => void): () => void {
  listeners.add(fn);
  fn(progress);
  return () => void listeners.delete(fn);
}
function report(p: number | null) {
  progress = p;
  listeners.forEach((fn) => fn(p));
}

/** Reads a response body in pieces so the loading screen can show how much has arrived. */
async function readWithProgress(res: Response): Promise<ArrayBuffer> {
  // The size on the wire is the compressed size. What is read is larger, so the bar uses an estimate and never passes 99% before the end.
  const encoded = Number(res.headers.get('content-length') ?? 0);
  const expected = encoded * (res.headers.get('content-encoding') ? 2.5 : 1);
  if (!res.body || expected === 0) return res.arrayBuffer();
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    got += value.length;
    report(Math.min(0.99, got / expected));
  }
  const out = new Uint8Array(got);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  report(1);
  return out.buffer;
}

async function fetchEarthBin(): Promise<unknown | undefined> {
  try {
    const res = (await early(COMPACT_EARTH_FILE)) ?? (await fetch(`${import.meta.env.BASE_URL}data/${COMPACT_EARTH_FILE}`, { cache: 'no-cache' }));
    if (!res.ok || (res.headers.get('content-type') ?? '').includes('text/html')) return undefined;
    return decodeEarthBin(await readWithProgress(res));
  } catch {
    return undefined;
  }
}

/** `?data=fixture` in the URL forces the fixtures, to check the UI against a fully populated set. */
const forceFixtures = new URLSearchParams(window.location.search).get('data') === 'fixture';

async function fetchJson(file: string): Promise<unknown | undefined> {
  try {
    const res = (await early(file)) ?? (await fetch(`${import.meta.env.BASE_URL}data/${file}`, { cache: 'no-cache' }));
    if (!res.ok) return undefined;
    if ((res.headers.get('content-type') ?? '').includes('text/html')) return undefined; // host fallback page
    return await res.json();
  } catch {
    return undefined;
  }
}

/** data/manifest.json lists the built files that exist, so the app never requests a missing one. */
let manifest: Promise<Set<string>> | null = null;
function present(): Promise<Set<string>> {
  manifest ??= fetchJson('manifest.json').then((m) =>
    isObj(m) && Array.isArray(m.files) ? new Set(m.files.filter((f): f is string => typeof f === 'string')) : new Set<string>(),
  );
  return manifest;
}

async function fetchReal(name: FileName): Promise<unknown | undefined> {
  if (forceFixtures) return undefined;
  const files = await present();
  if (name === 'earth' && files.has(COMPACT_EARTH_FILE)) {
    // Prefer the compact file. If it cannot be decoded, use earth.json when it is published.
    const compact = await fetchEarthBin();
    if (compact !== undefined && checkEarth(compact) === null) return compact;
  }
  if (!files.has(`${name}.json`)) return undefined;
  return fetchJson(`${name}.json`);
}

const fixtures: Record<FileName, () => Promise<{ default: unknown }>> = {
  earth: () => import('../mocks/earth.fixture.json'),
  targets: () => import('../mocks/targets.fixture.json'),
  analogs: () => import('../mocks/analogs.fixture.json'),
  lithology_similarity: () => import('../mocks/lithology_similarity.fixture.json'),
};

const checks: Record<FileName, (x: unknown) => string | null> = {
  earth: checkEarth,
  targets: checkTargets,
  analogs: checkAnalogs,
  lithology_similarity: checkLithology,
};

async function loadOne(name: FileName, warnings: string[]): Promise<{ data: unknown; origin: FileOrigin }> {
  const real = await fetchReal(name);
  if (real !== undefined) {
    const problem = checks[name](real);
    if (problem === null) return { data: real, origin: 'real' };
    warnings.push(`The ${name} data does not match the contract (${problem}). Using the fixture.`);
  }
  return { data: (await fixtures[name]()).default, origin: 'fixture' };
}

let cached: Promise<DataBundle> | null = null;

export function loadData(): Promise<DataBundle> {
  cached ??= (async () => {
    const warnings: string[] = [];
    const names: FileName[] = ['earth', 'targets', 'analogs', 'lithology_similarity'];
    const [earth, targets, analogs, lithology] = await Promise.all(names.map((n) => loadOne(n, warnings)));
    const origin = {
      earth: earth.origin,
      targets: targets.origin,
      analogs: analogs.origin,
      lithology_similarity: lithology.origin,
    };
    return {
      earth: earth.data as EarthFile,
      targets: targets.data as Target[],
      analogs: analogs.data as Analog[],
      lithology: lithology.data as LithologySimilarity,
      origin,
      fixtureFiles: names.filter((n) => origin[n] === 'fixture'),
      warnings,
    };
  })();
  return cached;
}

/**
 * A published file that is not one of the four contract files: validation reports, the frozen
 * tuning record, the SOURCES.md tables. null when the file was not published with this build.
 */
const extras = new Map<string, Promise<unknown | null>>();
export function loadExtra<T>(file: string): Promise<T | null> {
  let hit = extras.get(file);
  if (!hit) {
    hit = present().then(async (files) => (files.has(file) ? ((await fetchJson(file)) ?? null) : null));
    extras.set(file, hit);
  }
  return hit as Promise<T | null>;
}

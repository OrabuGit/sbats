// The app's only door to scoring.
//
// It uses the real library from ./scoring (Session C) when ./scoring/index.ts exists and exports
// the functions below, and the clearly marked stub in ./scoringStub otherwise. The stub has the
// same function signatures, so nothing else in the app changes when the library takes over.
// `scoringInfo()` says which one is active so the UI can show it.
//
// Functions used from the library:
//   PRESETS (record keyed by preset id), PRESET_IDS
//   computeEarthRanges(cells)
//   prepareTarget(target, ranges, lithologyTable | null) -> { missingTargetKeys, gaps, warnings, ... }
//   scoreCells(cells, prepared, weights) -> CellSummary[]
//   scoreCell(cell, prepared, weights)   -> CellScore (breakdown, limitingFactor, reason)

import type {
  CellScore,
  CellSummary,
  EarthCell,
  EarthFile,
  FactorId,
  LithologySimilarity,
  PreparedTarget,
  Preset,
  Target,
  Weights,
} from '../types';
import * as stub from './scoringStub';

interface ScoringApi {
  PRESETS: Record<string, Preset>;
  PRESET_IDS?: readonly string[];
  computeEarthRanges: (cells: readonly EarthCell[]) => unknown;
  prepareTarget: (target: Target, ranges: never, table: LithologySimilarity | null) => PreparedTarget;
  scoreCells: (cells: readonly EarthCell[], target: never, weights: Weights) => CellSummary[];
  scoreCell: (cell: EarthCell, target: never, weights: Weights) => CellScore;
}

const found = import.meta.glob('./scoring/index.ts', { eager: true });
const candidate = Object.values(found)[0] as Partial<ScoringApi> | undefined;

function usable(m: Partial<ScoringApi> | undefined): m is ScoringApi {
  return (
    !!m &&
    typeof m.PRESETS === 'object' &&
    m.PRESETS !== null &&
    Object.keys(m.PRESETS).length > 0 &&
    typeof m.computeEarthRanges === 'function' &&
    typeof m.prepareTarget === 'function' &&
    typeof m.scoreCells === 'function' &&
    typeof m.scoreCell === 'function'
  );
}

const STUB = stub as unknown as ScoringApi;
let api: ScoringApi = STUB;
let source: 'library' | 'stub' = 'stub';
let problem: string | null = null;

if (candidate) {
  if (usable(candidate)) {
    api = candidate;
    source = 'library';
  } else {
    problem = 'src/lib/scoring/index.ts does not export PRESETS, computeEarthRanges, prepareTarget, scoreCells and scoreCell.';
  }
}

export function scoringInfo(): { source: 'library' | 'stub'; problem: string | null } {
  return { source, problem };
}

function presetList(a: ScoringApi): Preset[] {
  const ids = a.PRESET_IDS ?? Object.keys(a.PRESETS);
  return ids.map((id) => a.PRESETS[id]).filter(Boolean);
}
export const PRESETS: Preset[] = presetList(api);

export const FACTOR_LABELS: Record<FactorId, string> = {
  terrain: 'Terrain',
  bareGround: 'Bare ground',
  dryness: 'Dryness',
  temperature: 'Temperature',
  sunlight: 'Sunlight',
  rockType: 'Rock type',
};

/** One target, ready to score against one dataset. */
export interface TargetScorer {
  prepared: PreparedTarget;
  /** Notes for the user, for example when Rock type had to be left out. */
  notes: string[];
  scoreAll: (weights: Weights) => CellSummary[];
  explain: (cell: EarthCell, weights: Weights) => CellScore;
}

export interface Scorer {
  forTarget: (target: Target) => TargetScorer;
}

function build(a: ScoringApi, earth: EarthFile, lithology: LithologySimilarity): Scorer {
  const ranges = a.computeEarthRanges(earth.cells) as never;
  const cache = new Map<string, TargetScorer>();
  return {
    forTarget(target) {
      const hit = cache.get(target.id);
      if (hit) return hit;
      let prepared = a.prepareTarget(target, ranges, lithology);
      const notes: string[] = [];
      // The library throws when a rock class pair is not in the similarity table (by design: a
      // missing pair is an error, not a silent default). That happens when earth.json and
      // lithology_similarity.json come from different builds. Leave Rock type out and say so,
      // rather than blank the screen.
      try {
        a.scoreCells(earth.cells, prepared as never, presetList(a)[0].weights);
      } catch (e) {
        prepared = a.prepareTarget(target, ranges, null);
        notes.push(
          `Rock type is left out for ${target.name}: the similarity table does not cover the rock classes in earth.json (${e instanceof Error ? e.message : String(e)}).`,
        );
      }
      const ts: TargetScorer = {
        prepared,
        notes,
        scoreAll: (w) => a.scoreCells(earth.cells, prepared as never, w),
        explain: (c, w) => a.scoreCell(c, prepared as never, w),
      };
      cache.set(target.id, ts);
      return ts;
    },
  };
}

/**
 * Builds the scorer for one dataset. If the real library throws or returns the wrong shape on a
 * probe call, the stub takes over and the reason is recorded, so a half-finished library cannot
 * blank the screen.
 */
export function createScorer(earth: EarthFile, lithology: LithologySimilarity, probeTarget: Target): Scorer {
  if (source === 'library') {
    try {
      const s = build(api, earth, lithology);
      const ts = s.forTarget(probeTarget);
      const probe = ts.explain(earth.cells[0], presetList(api)[0].weights);
      if (typeof probe.coverage !== 'number' || !Array.isArray(probe.missing) || !Array.isArray(probe.breakdown))
        throw new Error('scoreCell result does not match the contract');
      if (!Array.isArray(ts.prepared.gaps) || !Array.isArray(ts.prepared.missingTargetKeys))
        throw new Error('prepareTarget result does not match the contract');
      return s;
    } catch (e) {
      problem = `src/lib/scoring failed a probe call (${e instanceof Error ? e.message : String(e)}).`;
      source = 'stub';
    }
  }
  return build(STUB, earth, lithology);
}

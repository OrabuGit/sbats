// The Earth cells the app lists as best matches for each target, as JSON on stdout.
//
//     npx tsx pipeline/candidate_cells.ts [limit]
//
// Same code path as the app (app/src/App.tsx): createScorer -> forTarget -> scoreAll with the Base
// weights, then topCandidates (high and medium confidence, each pick at least 250 km from the picks
// above it). Used by pipeline/extracts_candidates.py to know which cells need a terrain extract.
//
// Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PRESETS, createScorer } from '../app/src/lib/scoringAdapter';
import { topCandidates } from '../app/src/lib/rank';
import { siteCode } from '../app/src/lib/geo';
import type { Analog, EarthFile, Target } from '../app/src/types';

const DATA = join(__dirname, '..', 'data');
const read = <T>(name: string): T => JSON.parse(readFileSync(join(DATA, name), 'utf8')) as T;

const limit = Number(process.argv[2] ?? 10);
const earth = read<EarthFile>('earth.json');
const targets = read<Target[]>('targets.json');
const analogs = read<Analog[]>('analogs.json');
const lithology = read<Parameters<typeof createScorer>[1]>('lithology_similarity.json');

const scorer = createScorer(earth, lithology);
const out = targets.map((t) => {
  const results = scorer.forTarget(t).scoreAll(PRESETS[0].weights);
  const picks = topCandidates(earth, results, analogs, { includeLow: false, limit });
  return {
    target: t.id,
    preset: PRESETS[0].id,
    cells: picks.map((p) => {
      const c = earth.cells[p.index];
      return { id: siteCode(c), lat: c.lat, lon: c.lon, rank: p.rank, score: results[p.index].score, confidence: results[p.index].confidence };
    }),
  };
});
process.stdout.write(JSON.stringify(out));

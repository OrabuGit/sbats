# Void tuning run, 2026-11-14

This folder records a tuning run that does not count. Nothing in it is in force.

## What happened

- The team's first instruction was to tune "after terrain lands in earth.json".
- Terrain landed (earth.json built 2026-11-14T11:49:21Z). A watcher fired and `validation/tune.ts` was
  run, following `PLAN.md` exactly.
- While it was running, the team sent a second instruction: do not tune until Session B has also fixed
  Antarctica, where every cell south of 60 S has `ndvi: null` and therefore no score. That message was
  read only after the run had finished.

## What the run did

- It scored the tuning set only (20 known sites, 4 negative controls). No hold-out site and no
  candidate site was scored.
- It tried 68 values. None raised the objective by 0.03, so it accepted no change:
  every sigma and every weight came out exactly as it went in (`before` equals `after` in the file).
- It changed no source file. `targets.json`, `presets.ts` and `sunlight.ts` were never touched.
- Tuning-set numbers at the time, with terrain but without Antarctica: strict ROC AUC 0.816,
  mean percentile 0.666, top-10% share 24.2%; Moon targets mean percentile 0.475, Mars targets 0.739.

## Why it is void

It ran on data the team had said was not ready: a whole continent, 25,219 cells, had no score. Its
`frozen.json` was moved here and renamed, so no tool treats the project as frozen. The hold-out set
was not scored afterwards and the candidate sites were not scored.

## What this means for the real pass

- The real pass runs once, after the team says both terrain and the Antarctica fix have landed.
- `PLAN.md` and the search in `tune.ts` (allowed values, objective, acceptance tests, order) are not
  changed in any way because of this run. The only change to `tune.ts` is two extra preconditions:
  it now refuses to run unless cells south of 60 S have NDVI, and unless it is started with
  `--team-go`.
- What was learned from this run: on the pre-fix data, no allowed value cleared the 0.03 threshold.
  That knowledge exists and is disclosed here. It cannot steer the real pass, because the real pass is
  the same fixed procedure with no choices left to make.

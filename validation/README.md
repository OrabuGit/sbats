# SBATS validation

Does the score put known analog sites high and obviously wrong places low? This folder answers that with
the same scoring code the app runs, and holds the scripts that produced the measured target values.

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See `AI_USE.md`.

## Where things stand

FINAL. The one tuning pass ran on 2026-11-14 and changed nothing: all 68 alternatives it tried were
within noise, so every sigma and weight is frozen at the value set by rule beforehand. The record is in
`tuning/FROZEN.md`. Hold-out results, Base preset: ROC AUC 0.979, 29.2% of known analogs in the top 10% of
Earth cells, mean percentile 0.716. Moon targets do worse than Mars targets (mean percentile 0.617
against 0.774). `output/report.json` carries `status: "final"`.

The values are not tuned again. If `earth.json` is rebuilt, rerun `validate.ts` and report what comes out.

## The order of work

1. `python3 validation/tuning/make_split.py` drew the tuning / hold-out split once (seed 20261114,
   20 + 8 known sites, 4 + 2 controls). It is in `tuning/split.json` and cannot be redrawn.
2. `tuning/PLAN.md` says exactly what the tuning pass may change and how. It was written first.
3. When the team says that terrain and the Antarctica NDVI fix are both in `earth.json`:
   `npx tsx validation/tune.ts --team-go`, once. It sees the tuning set only,
   writes `tuning/frozen.json` and `tuning/tuning-log.json`, and refuses to run again.
4. Copy the frozen values into `build/make_targets.py`, `app/src/lib/scoring/presets.ts` and
   `sunlight.ts`. A unit test fails if they differ from `frozen.json`.
5. `npx tsx validation/validate.ts` (add `rover`, `ice` or `astrobiology` for the other presets).
   After the freeze it scores the hold-out set as well and reports both sets side by side.
6. `npx tsx validation/score_candidates.ts` scores the Indonesian candidate sites. They are never
   part of tuning or validation, and this script refuses to run before the freeze.

Before the freeze, `validate.ts` scores the tuning set only, so the hold-out set stays unseen.
All commands run from the repository root. `SBATS_OUT_DIR=/some/folder` redirects the reports.

## What it reports

- For the tuning set and the hold-out set, and for Moon targets and Mars targets separately:
- ROC AUC: how often a known analog outranks a negative control, both scored against the same target.
  0.5 is chance, 1.0 is perfect. The strict version counts a site with no score as ranked last.
- Share of known analogs in the top 10% of all scored Earth cells for their matching target.
- Mean percentile of known analogs among all Earth cells. This is the harder test: the six negative
  controls are rainforests and cities, which any sensible score separates from deserts.
- One row per site and target, with the score, the rank, the confidence and the limiting factor.

Each known site counts once. A site listed for several targets is split equally between them.

## Rules for using the numbers

- Report them as they come out, weak ones included (DESIGN.md section 9, JUDGING.md).
- There is one tuning pass, on the tuning set only, following `tuning/PLAN.md`. After it the values are
  frozen. They are not tuned again, even if a later result looks worse.
- The hold-out numbers are the ones to quote. Tuning-set numbers flatter the score.
- Indonesian candidate sites never enter tuning or validation. They are the findings.
- An AUC at or near 1.0 is printed with a warning: it means the test is too easy.
- The positive set was chosen by strength of published evidence, one site per grid cell, before any score
  was computed. It includes sites that are analogs for geology only (impact craters in forest or farmland)
  and will score low on a climate-driven score. They stay in.

## Known limits of this test

- Antarctic cells have no NDVI. They are scored from the measured barren share instead (data/SCHEMA.md,
  "Bare ground and permanent ice"). At 0.5 degrees the Dry Valleys cell is 85% ice, so it scores low.
- About 24,000 all-ice cells now sit in the ranking with a score of 0. They are real scored cells, but they
  lift every other site's percentile and widen the top 10%. Compare numbers only within one earth.json build.
- A 0.5 degree cell is about 55 km wide. A dry summit inside a wet cell (Mauna Kea, Teide) is scored with
  the cell's rainfall and vegetation.
- `analogFor` was assigned by SBATS from each site's cited characteristic. The sources name the body
  (Moon or Mars), not the specific target.

## Scripts that measure the targets

| Script | Produces | Run with |
| --- | --- | --- |
| `target_terrain.py` | `slope` and `roughness` of every target from LOLA and MOLA, using `pipeline/terrain_metrics.py` | `pipeline/.venv/bin/python validation/target_terrain.py` |
| `build/moon_temperature.py` | `tempMean` of the Moon targets from the Diviner Polar Resource Product | `python3 validation/build/moon_temperature.py` |
| `build/moon_global_temperature.py` | `tempMean` and `tempRange` of a Moon target away from the poles (Marius Hills) from the Diviner Global Cumulative Products | `python3 validation/build/moon_global_temperature.py` |
| `build/mars_temperature.py` | `tempMean` and `tempRange` of the Mars targets from the Mars Climate Database, and the REMS check at Gale | `python3 validation/build/mars_temperature.py` |
| `build/mars_sunlight.py` | Sunlight, night length and dust-storm factor at the Mars targets, from the Mars Climate Database, for `data/modules.json` | `python3 validation/build/mars_sunlight.py` |
| `build/make_modules.py` | `data/modules.json` from hand-entered, sourced values | `python3 validation/build/make_modules.py` |
| `build/make_targets.py` | `data/targets.json` from hand-entered values | `python3 validation/build/make_targets.py` |
| `build/make_analogs.py` | `data/analogs.json` | `python3 validation/build/make_analogs.py` |
| `build/make_lithology.py` | `data/lithology_similarity.json` | `python3 validation/build/make_lithology.py` |
| `build/make_review.py` | `data/REVIEW_ME.md` | `python3 validation/build/make_review.py` |

`target_terrain.py --only <id>` measures one target and keeps the others; `--posts 4 6 9 11 16` measures every
target again in site-sized windows for the site-level report (see below).

The measuring scripts read target coordinates from `data/targets.json` and write to `output/`.
Their numbers are copied into `build/make_targets.py` by hand, so every change to a target value is a
reviewed edit. They download only the bytes they need from NASA's Planetary Data System.

## Notes for the other sessions

For Session A (app):
- The scoring tests run with `npx tsx --test app/src/lib/scoring/__tests__/*.test.ts`. Nothing needs to
  be added to `app/package.json`.
- Sunlight has one key, `sunElevation`. There is no `sunSeason`.
- Every result now carries `bareGroundSource` (`"ndvi"`, `"landCover"` or `null`). In `scoreCell` results
  the `ndvi` key entry also has `bareGround: { source, snowIceFrac, barrenFrac }` for the dossier.
  Cells that are all permanent ice have a score of 0 and a confidence: they are scored, not "no data".
- `targets.json` values and `analogs.json` entries may carry an optional `note` string. Show it where a
  value is `null` or flagged.
- A `candidate` in `analogs.json` may have an empty `analogFor` (the lava tubes and the karst caves match
  no listed target). `known` sites always have at least one.
- `describeGap(gap, prepared)` in the scoring library writes the "what Earth cannot copy" sentence for a
  clamped target value. `prepared.missingTargetKeys` lists the factors with no published value.
- The base simulation is in `app/src/lib/sim` with its own README: `evaluate`, `simulate`, `deployTwice`,
  `encodeLayout`. Label modules listed in `illustrativeModules` as illustrative, and show `readiness: null`
  as "no data".
- The analog profile and purpose rankings are documented in `app/src/lib/scoring/README.md`.
- `validation/output/report.json` holds the headline numbers and the per-site table for the Validation page.
  Read `status` and `statusNote` and show "provisional" next to every number while `status` is not `"final"`.
  After the freeze, `headline` is the hold-out set and `sets.tuning`, `sets.holdout` and `sets.all` hold the rest.

For Session B (pipeline):
- Target terrain uses a 55.6 km square window. An Earth cell narrows east-west with cos(latitude); a
  target window cannot, because it would shrink to nothing at the lunar pole. Say so on the Method page.
- Request: add NASA POWER surface sunlight (`ALLSKY_SFC_SW_DWN`, kWh/m2/day) to each `earth.json` cell as
  `insolationKwhM2Day`. The base simulation uses it when present. Without it, Earth solar power is a
  top-of-atmosphere upper bound and the gap report has to say so.
- If `earth.json` is rebuilt, rerun `npx tsx validation/validate.ts`. The frozen values are not retuned.

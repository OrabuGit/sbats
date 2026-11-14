# Frozen sigmas and weights

Frozen on 2026-11-14, against `data/earth.json` built 2026-11-14T11:56:02Z.

This is the record of the one tuning pass allowed by DESIGN.md section 6 and run under the team's six
rules (see `PLAN.md`). **The values below are final. They are not tuned again, even if a later result
looks worse.** A unit test (`data-files.test.ts`) fails the build if `targets.json`, `presets.ts` or
`sunlight.ts` ever differ from `frozen.json`.

## Result in one line

The pass tried 68 alternative values on the tuning set and accepted 0. Every sigma and every weight stays exactly as it was set by rule before any validation run.

## Every value, before and after

| Parameter | Before | After | Best alternative tried | Its gain | Reason |
| --- | --- | --- | --- | --- | --- |
| `tempMean` sigma | 15 C | 15 C | 20 C | +0.000 | Kept. No allowed value raised the objective by 0.03; the best moved it by +0.000, which is within noise for 20 sites. |
| `tempRange` sigma | 5 C | 5 C | 7.5 C | +0.003 | Kept. No allowed value raised the objective by 0.03; the best moved it by +0.003, which is within noise for 20 sites. |
| `precip` sigma | 250 mm/year | 250 mm/year | 375 mm/year | +0.008 | Kept. No allowed value raised the objective by 0.03; the best moved it by +0.008, which is within noise for 20 sites. |
| `ndvi` sigma | 0.1  | 0.1  | 0.05 | +0.011 | Kept. No allowed value raised the objective by 0.03; the best moved it by +0.011, which is within noise for 20 sites. |
| Terrain sigma, as a fraction of the target's slope and roughness | 0.5  | 0.5  | 0.75 | +0.005 | Kept. No allowed value raised the objective by 0.03; the best moved it by +0.005, which is within noise for 20 sites. |
| Sunlight sigma | 15 degrees | 15 degrees | 22.5 degrees | +0.002 | Kept. No allowed value raised the objective by 0.03; the best moved it by +0.002, which is within noise for 20 sites. |
| Base weight, Terrain | 0.25 | 0.25 | | | Kept. |
| Base weight, Bare ground | 0.2 | 0.2 | | | Kept. |
| Base weight, Dryness | 0.15 | 0.15 | | | Kept. |
| Base weight, Temperature | 0.15 | 0.15 | | | Kept. |
| Base weight, Sunlight | 0.1 | 0.1 | | | Kept. |
| Base weight, Rock type | 0.15 | 0.15 | | | Kept. |

Best move of 0.05 between Base weights that was tried: terrain -> sunlight, gain +0.020. That is below the 0.03 threshold, so the Base weights stay as in the
DESIGN.md table. The table in DESIGN.md section 6 therefore needs no edit.

Why keeping everything is the right outcome and not a failure of the pass: with 20 tuning sites, a
change of 0.02 in the objective is what random noise produces (shown by the self-test on made-up cells).
None of the 68 alternatives did better than that. Accepting one would have been fitting noise.

## Preset weights (frozen)

| Preset | Terrain | Bare ground | Dryness | Temperature | Sunlight | Rock type | Changed? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Base | 0.25 | 0.2 | 0.15 | 0.15 | 0.1 | 0.15 | no |
| Rover | 0.4 | 0.2 | 0.1 | 0.1 | 0.1 | 0.1 | no |
| Ice | 0.15 | 0.15 | 0.1 | 0.3 | 0.05 | 0.25 | no |
| Astrobiology | 0.1 | 0.15 | 0.3 | 0.1 | 0.05 | 0.3 | no |

Rover, Ice and Astrobiology were not searched (the validation sites carry no mission-type label).
They follow Base by fixed differences, as written in `PLAN.md`.

## Tuning set against hold-out set

The hold-out sites were never used to choose a value. Quote the hold-out column.

| Preset | Set | Known / controls | ROC AUC | Top-10% share | Mean percentile | Moon mean percentile | Mars mean percentile |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Base | Tuning | 20 / 4 | 0.853 | 29.2% | 0.731 | 0.63 | 0.765 |
| Base | Hold-out | 8 / 2 | 0.979 | 29.2% | 0.716 | 0.617 | 0.774 |
| Rover | Tuning | 20 / 4 | 0.862 | 30.0% | 0.726 | 0.645 | 0.757 |
| Rover | Hold-out | 8 / 2 | 0.979 | 33.3% | 0.726 | 0.633 | 0.792 |
| Ice | Tuning | 20 / 4 | 0.881 | 17.5% | 0.707 | 0.615 | 0.721 |
| Ice | Hold-out | 8 / 2 | 0.979 | 16.7% | 0.678 | 0.629 | 0.725 |
| Astrobiology | Tuning | 20 / 4 | 0.912 | 37.5% | 0.753 | 0.631 | 0.792 |
| Astrobiology | Hold-out | 8 / 2 | 0.979 | 16.7% | 0.704 | 0.57 | 0.761 |

## Moon against Mars (Base preset)

| | Tuning: Moon | Tuning: Mars | Hold-out: Moon | Hold-out: Mars |
| --- | --- | --- | --- | --- |
| Known sites | 7 | 15 | 3 | 6 |
| ROC AUC | 0.786 | 0.871 | 1 | 0.972 |
| Top-10% share | 0.0% | 41.1% | 0.0% | 38.9% |
| Mean percentile | 0.63 | 0.765 | 0.617 | 0.774 |
| Mean score of known analogs (0 to 100) | 4.9 | 12.8 | 4.3 | 13 |

Moon targets do worse, on both sets. No known Moon analog reaches the top 10% of Earth cells for any Moon
target. The known Moon analogs in the list are volcanoes and impact craters in temperate or wet settings
(Hawaii, Iceland, the Canary Islands, Arizona, Germany, Sicily, Ontario, Labrador). The lunar south pole is far colder and
has a Sun on the horizon, so on a climate-and-light score those sites sit mid-table.

## How to read these numbers honestly

- The hold-out set is small: 8 known sites and 2 controls. One site moving changes the top-10% share by
  several points. Treat the hold-out numbers as a check that tuning-set numbers were not flattered, not
  as precise estimates.
- The hold-out ROC AUC of 0.979 is close to 1. Its two controls are a rainforest and a city, which any
  sensible score separates from deserts. The mean percentile, which compares known analogs with every
  land cell on Earth, is the harder and more useful number.
- Percentiles are counted over all scored cells. About 24,000 Antarctic cells are all ice and score 0.
  They are real scored cells, but they lift every other site's percentile. Numbers from before the
  Antarctica fix are not comparable with these.
- Absolute scores are low: known analogs average about 10 out of 100. Mars and the lunar poles are far
  colder than almost anywhere on Earth, and temperature is the limiting factor in about half the cases.
- Disclosed in `PLAN.md`: the hold-out sites were seen once, on incomplete data, before the split was
  drawn; and one earlier run of the tuning script, before the Antarctica fix, accepted no changes and
  was voided (`void-run-2026-11-14/`).
- The Indonesian candidate sites took no part in tuning or validation. Their scores are in
  `validation/output/CANDIDATES.md`.

## Files

- `frozen.json`: the frozen values, the tuning-set statistics before and after, and the split used.
- `tuning-log.json`: all 68 values tried, with the objective and the reason each was rejected.
- `before-tuning/`: tuning-set report after the Antarctica fix and before the pass.
- `../output/report*.json`, `REPORT*.md`: the final reports, one per preset.

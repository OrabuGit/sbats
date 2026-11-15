# SBATS validation in one page

For the team, to explain the tool without notes. Updated 2026-11-15. Nothing was tuned after the
freeze of 2026-11-14.

**What it does.** It compares every 55 km square of Earth's land with a Moon or Mars site on terrain,
bare ground, dryness, temperature, sunlight and rock type, and scores each square from 0 to 100. One
poor match pulls the whole score down, on purpose: a base rehearsal needs everything at once.

## What it gets right

- **It tells real analogs from wrong places.** Given one of 28 known analogs and one of 6 control
  sites (rainforest, cities), it ranks the analog higher 98% of the time. That figure is for the 10
  hold-out sites (8 analogs, 2 controls).
- **Known analogs sit high.** On the hold-out sites (8 analogs, 2 controls) they beat 72% of all land squares. Chance is 50%.
- **It is not over-fitted, and not fragile.** The one tuning pass tried 68 changes and kept none. With
  every weight moved by up to a quarter, 200 times, 81 to 100% of each top ten stays in the top ten
  (all ten targets).
- **It finds new places.** For each target, 2 to 6 of its eight best places are over 500 km from every
  known analog: high cold desert near 35 N, 85 E for Mars and Marius Hills, the far north of the
  Canadian Arctic for the lunar poles.
- **Any point on the Moon or Mars can be a target.** At the ten measured targets the grid agrees
  within one tolerance, with three exceptions (`output/GRID_CHECK.md`). All 71 named places get a target profile.

## What it gets wrong

- **Scores are low.** A known analog averages 10 out of 100: Earth is far warmer than the targets.
  Read the rank, not the score.
- **It ranks, it does not pinpoint.** Only 29% of known analogs (hold-out set, 8 analogs, 2 controls)
  reach the top tenth of Earth.
- **The Moon is harder than Mars** (hold-out set: 62% with 3 lunar analogs and 2 controls, against 77% with
  6 Mars analogs and 2 controls; no lunar analog in the top tenth). Lunar training
  sites are craters and volcanoes in green, wet places, chosen for landforms (`MOON.md`).
- **Rock type barely works** (59% against 56%): one rock class per 55 km square is often not the rock
  at the crater.
- **The Indonesian candidates score 0 all round.** Hot, wet, vegetated; the best cell in the region
  scores 0 to 0.1, and about 40 to 49% of Earth cells score the same or lower (many Earth cells tie at zero). Beside established analogs scored the same way they come close on rock
  (0.41 against 0.45) and fall far short on bare ground (0.01 against 0.70). What they offer is
  narrower: basalt, crater and lava shapes, and at Merapi three mineral families shared with Gale
  crater. That result was re-checked after cloud was found in the mineral data, and it held.
- **Minerals speak for two candidates only.** Five of the eight have no mineral result: no clear
  satellite scene, or nothing identified in one.
- **Tambora is not a Shackleton:** the same steepness, about a third of the size.
- **Ten lunar landing sites have no temperature in the grid** (Apollo 11, 16, 17 among them). Their
  scores jump to about 95 and are flagged "not comparable".
- **It cannot see** caves, lava tubes, lake chemistry, gravity, vacuum or radiation. Minerals are seen
  from orbit only. The haze figure counts all particles: Java's smoke matches Mars dust by number, not
  by material.

## What each number means

| Number | Plain meaning | Our value |
| --- | --- | --- |
| Score, 0 to 100 | How close one square is to one target on all six factors | Analogs about 10, controls about 0 |
| Percentile | Share of all land squares a site beats. 50% is chance | 72% (Moon 62%, Mars 77%); hold-out set, 8 analogs and 2 controls (Moon 3 and 2, Mars 6 and 2) |
| Top-10% share | Share of known analogs in the best tenth of Earth | 29% (hold-out set, 8 analogs and 2 controls) |
| ROC AUC | Chance that a known analog outranks a control site | 0.98 test (8 analogs, 2 controls), 0.85 tuning (20 analogs, 4 controls) |
| Hold-out (test) set | 8 analogs and 2 controls never used for tuning | 10 of 34 sites |
| Confidence | How much of the score's weight had data | On every score |
| Target confidence | High for a measured target, lower for a point picked on the map | Per target |
| Similarity and verdict | Match on one dimension: matches (0.75 up), partly (0.30 up), does not | Per dimension |
| Purpose score | The same formula on the dimensions one use needs | Not validated |
| Site-scale score | The same formula on a 2 to 7 km footprint. Climate stays the 55 km value | 21 sites |
| Shared minerals | Mineral families seen from orbit on Earth and reported at the target | Merapi and Gale: 3 of 9 |
| Rank stability | Share of the top ten that survives nudged weights | 81 to 100% |
| Readiness | Sandbox colour for power, water, oxygen and food | "No data" where a number has no source |

## Three sentences to say out loud

1. "It separated Moon and Mars analogs from ordinary places on 10 test sites it was not tuned on (8
   analogs, 2 controls), and its top ten holds when the weights are nudged."
2. "It ranks, it does not pinpoint: seven in ten known analogs fall outside the top tenth, and it is
   weaker for the Moon and for rock type."
3. "Our Indonesian sites do not pass as full base rehearsals. We offer them for their rock, their
   shape and, at Merapi, their minerals, at a third of the scale for Tambora, and we say so."

## Limits of the test

- Thirty-four sites is a small test; 8 test analogs is smaller. The test sites were scored once before
  the split, on incomplete data: nothing was changed in response, but they were not unseen.
- Purposes, site-scale scores, minerals and the comparison with established analogs were made after
  every site had been seen: development numbers, not tests.
- Six of the eight known analogs that have a rover mobility score reach 95 to 98 out of 100 against
  their best target (Mauna Kea, Atacama, Haughton, Timanfaya, Dallol, Dasht-e Lut); Tunupa scores 87 and
  Kilauea 47. These are development numbers, not a test; the best target was chosen after every site
  had been seen.
- Minerals, wind, haze and permafrost were added after the freeze and are never in the score.
- Marius Hills, the points picked on the map, and the two Mars targets added after the freeze (Columbia
  Hills in Gusev crater, Holden crater) have no known analog and are in none of the test numbers.

Detail: `output/REPORT.md`, `tuning/FROZEN.md`, `output/PURPOSES.md`, `purposes/GEOLOGY.md`, `MOON.md`,
`sites/FINDINGS.md`, `output/DISCOVERIES.md`, `output/MINERALS.md`, `output/BENCHMARKS.md`,
`output/STABILITY.md`, `output/GRID_CHECK.md`, `../data/REVIEW_ME.md`.

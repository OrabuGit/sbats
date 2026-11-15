# SBATS validation in one page

For the team, to explain the tool without notes. Written 2026-11-15. Nothing was tuned after the
freeze of 2026-11-14.

**What it does.** It compares every 55 km square of Earth's land with a Moon or Mars site on terrain,
bare ground, dryness, temperature, sunlight and rock type, and scores each square from 0 to 100. One
poor match pulls the whole score down, on purpose: a base rehearsal needs everything at once.

## What it gets right

- **It tells real analogs from plainly wrong places.** Given one of 28 known analog sites and one of 6
  control sites (rainforest, cities), it ranks the analog higher 98% of the time on the test sites
  and 85% on the tuning sites.
- **Known analogs sit high in the world ranking.** On the test sites they beat 72% of all land
  squares on average. Chance is 50%.
- **It is not over-fitted.** The one tuning pass tried 68 changes. None beat noise, none was kept.
- **The top ten does not hang on the exact weights.** With every weight moved by up to a quarter, 200
  times, 81 to 91% of each target's ten best cells stay in the top ten.
- **It finds new places.** For each target, 4 to 6 of its eight best-ranked places are more than
  500 km from every known analog we listed: high, cold desert around 35 N, 85 E for Mars and Marius
  Hills, and the far north of the Canadian Arctic for the lunar poles.
- **Measured at the site, known analogs score very high.** From a 5 km footprint, Mauna Kea, Atacama,
  Haughton and Lanzarote reach 95 to 98 out of 100 for rover mobility against their best target.

## What it gets wrong

- **Scores are low.** A known analog averages 10 out of 100, because Earth is far warmer than Mars or
  the lunar poles. Read the rank, not the score.
- **It ranks, it does not pinpoint.** Only 29% of known analogs reach the top tenth of Earth.
- **The Moon is harder than Mars.** Lunar analogs beat 62% of squares, Mars analogs 77%. No lunar
  analog reaches the top tenth. The lunar training sites are craters and volcanoes in green, wet
  places, chosen for landforms, not climate (`MOON.md`).
- **Rock type barely works:** 59% for geology sites against 56% for the rest. A 55 km square has one
  rock class, often not the rock at the crater, and "geology site" usually means a landform.
- **Sites known for one thing are under-ranked.** An impact crater in farmland can score near zero.
- **The Indonesian candidates score 0 on the all-round score.** Hot, wet, vegetated. The best cell in
  the Indonesian region beats 40 to 49% of Earth's cells. At site scale
  they still score 0 as a full base rehearsal. What they offer is narrower: basalt rock (Tambora,
  the lava caves), crater and lava-field shapes, and at Merapi three mineral families shared with
  Gale crater (hematite, jarosite, smectite clay), as many as Mauna Kea shares.
- **Beside established analogs, scored the same way:** the candidates match them on rock (0.44
  against 0.53) and fall far short on bare ground (0.01 against 0.85).
- **Tambora is not a Shackleton.** Same steepness (21 and 22 degrees), about a third of the size
  (roughly 7 against 21 km wide, 1.3 against 4.1 km deep).
- **It cannot see** caves, lava tubes, lake chemistry, ground ice, gravity, vacuum or radiation.
  Minerals are seen only from orbit, as families: olivine and pyroxene were found at no site.

## What each number means

| Number | Plain meaning | Our value |
| --- | --- | --- |
| Score, 0 to 100 | How close one square is to one target on all six factors | Analogs about 10, controls about 0 |
| Percentile | Share of all land squares a site beats. 50% is chance | 72% (Moon 62%, Mars 77%) |
| Top-10% share | Share of known analogs in the best tenth of Earth | 29% |
| ROC AUC | Chance that a known analog outranks a control site | 0.98 test, 0.85 tuning |
| Hold-out (test) set | 8 analogs and 2 controls never used for tuning | 10 of 34 sites |
| Confidence | How much of the score's weight had data | On every score |
| Similarity, 0 to 1 | Match on one dimension only (the analog profile) | Per dimension |
| Purpose score | The same formula on the dimensions one use needs | Not validated |
| Verdict | Matches (similarity 0.75 or more), partly (0.30 or more), does not match | Per dimension |
| Shared minerals | Mineral families seen from orbit on Earth and reported at the target | Merapi and Gale: 3 of 9 |
| Rank stability | Share of the top ten that survives nudged weights | 81 to 91% |
| Target confidence | High for a curated target, lower for a point picked on the map | Per target |
| Site-scale score | The same formula on a 2 to 7 km footprint. Climate stays the 55 km value | 17 sites |
| Readiness | Sandbox colour for power, water, oxygen and food | "No data" where a number has no source |

## Three sentences to say out loud

1. "It reliably separates Moon and Mars analogs from ordinary places, tested on sites it was not
   tuned on."
2. "It ranks, it does not pinpoint: seven in ten known analogs fall outside the top tenth, and it is
   weaker for the Moon and for rock type."
3. "Our Indonesian sites do not pass as full base rehearsals. We offer them for their rock and
   their shape, at a third of the scale for Tambora, and we say so."

## Limits of the test

- Thirty-four sites is a small test; 8 test analogs is smaller.
- The test sites were scored once before the split, on incomplete data. Nothing was changed in
  response, but they were not unseen.
- Purpose rankings, site-scale scores, minerals and the comparison with established analogs were made
  after every site had been seen: development numbers, not tests.
- Minerals, wind, haze and permafrost were added after the freeze and are never in the score. The haze
  figure counts all particles: Java's smoke matches Mars's dust by number, not by material.
- Marius Hills was added after the freeze, has no known analog, and is in none of these numbers.

Detail: `output/REPORT.md`, `tuning/FROZEN.md`, `output/PURPOSES.md`, `purposes/GEOLOGY.md`,
`sites/FINDINGS.md`, `MOON.md`, `output/DISCOVERIES.md`, `output/MINERALS.md`, `output/BENCHMARKS.md`,
`output/STABILITY.md`,
`../data/REVIEW_ME.md`.

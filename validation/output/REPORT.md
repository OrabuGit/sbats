# SBATS validation report

**Status: PROVISIONAL.** Slope and roughness are not in earth.json yet, so Terrain is left out of every score. The one tuning pass has not been run and frozen, so sigmas and weights are first guesses. This run predates the tuning / hold-out split and covers all 28 known sites and 6 controls together.

Generated 2026-11-14T11:14:31.309Z by `npx tsx validation/validate.ts base`. Preset: Base.
Earth grid: 91894 land cells at 0.5 degrees, built 2026-11-14T10:47:08Z.

These numbers are reported as they came out. Nothing was tuned to produce them.

## Headline

| Measure | Value |
| --- | --- |
| ROC AUC, known analogs against negative controls (strict) | 0.827 |
| ROC AUC, scored sites only | 0.931 |
| Share of known analogs in the top 10% of Earth cells for their target | 24.4% (15 of 81 site-target cases) |
| Known sites in the top 10% for at least one of their targets | 8 of 28 |
| Known analogs with no score for any of their targets | 2 of 28 sites (10 of 81 cases) |
| Mean percentile of known analogs among all Earth cells | 0.674 |

How to read them:

- `positiveCase`: One known analog site scored against one target listed in its analogFor. A site listed for several targets is split equally between them, so every site counts once in each number below.
- `rocAuc`: Share of (positive case, negative control) pairs, both scored against the same target, in which the known analog has the higher score. Ties count half. A site with no score counts as below every scored site.
- `rocAucScoredOnly`: The same, using only pairs where both sites have a score.
- `knownInTop10Share`: Share of known analogs whose cell is in the top 10% of all scored Earth cells for their matching target (site-weighted over their targets). Unscored cases count as not in the top 10%.
- `meanPercentileOfKnown`: Mean, over scored positive cases, of the share of scored Earth cells that the site beats or ties. 0.5 is chance. This is the AUC of known analogs against every land cell, a harder test than the six controls.
- `snapping`: Each site is scored at the nearest earth.json cell centre. Sites more than 60 km from any cell are unscored.

## Warnings

- 10 of 81 known-analog cases have no score and count as failures in the strict AUC.

## What was left out of the scores

- earth.json has no "slope" values yet, so that key is left out of every score.
- earth.json has no "roughness" values yet, so that key is left out of every score.
- Target `moon-malapert-massif` has no usable value for: tempRange.
- Target `moon-mons-mouton` has no usable value for: tempRange.
- Target `moon-haworth` has no usable value for: tempRange.
- Target `moon-shackleton-rim` has no usable value for: tempRange.
- Target `mars-arcadia-planitia` has no usable value for: lithology.

## Negative controls (must rank low)

| Site | Best rank over all targets | Target | Score |
| --- | --- | --- | --- |
| Betung Kerihun National Park, Kalimantan, Indonesia | top 99.9% | mars-jezero | 0.0 |
| Jau National Park, central Amazon, Brazil | top 97.4% | mars-gale | 0.0 |
| Salonga National Park, Congo basin, DR Congo | top 95.0% | mars-gale | 0.0 |
| Jakarta, Indonesia | top 92.1% | mars-gale | 0.0 |
| Singapore | top 95.7% | mars-arcadia-planitia | 0.0 |
| Paris, France | top 65.3% | mars-gale | 0.5 |

## Known analogs, scored against their own targets

| Site | Target | Score | Rank among Earth cells | Confidence | Limiting factor |
| --- | --- | --- | --- | --- | --- |
| Atacama Desert hyperarid core (Yungay), Chile | mars-jezero | 19.7 | top 3.3% | low | temperature |
| Atacama Desert hyperarid core (Yungay), Chile | mars-gale | 19.4 | top 8.6% | low | temperature |
| Haughton impact structure, Devon Island, Canada | mars-jezero | 11.5 | top 19.7% | low | sunlight |
| Haughton impact structure, Devon Island, Canada | mars-gale | 13.2 | top 18.1% | low | sunlight |
| Haughton impact structure, Devon Island, Canada | mars-arcadia-planitia | 20.1 | top 7.5% | low | temperature |
| Beacon Valley, McMurdo Dry Valleys, Antarctica | mars-arcadia-planitia | no score (required-factor-missing) | n/a | n/a | n/a |
| Don Juan Pond, Wright Valley, Antarctica | mars-arcadia-planitia | no score (required-factor-missing) | n/a | n/a | n/a |
| Mauna Kea, Hawaii, USA | moon-malapert-massif | 0.0 | top 90.5% | low | dryness |
| Mauna Kea, Hawaii, USA | moon-mons-mouton | 0.0 | top 90.5% | low | dryness |
| Mauna Kea, Hawaii, USA | moon-haworth | 0.0 | top 90.5% | low | dryness |
| Mauna Kea, Hawaii, USA | moon-shackleton-rim | 0.0 | top 90.5% | low | dryness |
| Kilauea, Hawaii, USA | moon-malapert-massif | no score (coverage-too-low) | n/a | n/a | n/a |
| Kilauea, Hawaii, USA | moon-mons-mouton | no score (coverage-too-low) | n/a | n/a | n/a |
| Kilauea, Hawaii, USA | moon-haworth | no score (coverage-too-low) | n/a | n/a | n/a |
| Kilauea, Hawaii, USA | moon-shackleton-rim | no score (coverage-too-low) | n/a | n/a | n/a |
| Kilauea, Hawaii, USA | mars-jezero | 0.0 | top 87.0% | low | dryness |
| Kilauea, Hawaii, USA | mars-gale | 0.0 | top 87.3% | low | dryness |
| Craters of the Moon, Idaho, USA | mars-jezero | 16.6 | top 7.6% | low | temperature |
| Craters of the Moon, Idaho, USA | mars-gale | 10.6 | top 23.9% | low | temperature |
| Timanfaya, Lanzarote, Spain | moon-malapert-massif | no score (coverage-too-low) | n/a | n/a | n/a |
| Timanfaya, Lanzarote, Spain | moon-mons-mouton | no score (coverage-too-low) | n/a | n/a | n/a |
| Timanfaya, Lanzarote, Spain | moon-haworth | no score (coverage-too-low) | n/a | n/a | n/a |
| Timanfaya, Lanzarote, Spain | moon-shackleton-rim | no score (coverage-too-low) | n/a | n/a | n/a |
| Timanfaya, Lanzarote, Spain | mars-jezero | 9.7 | top 25.7% | low | temperature |
| Timanfaya, Lanzarote, Spain | mars-gale | 9.4 | top 27.7% | low | temperature |
| Noerdlinger Ries impact crater, Germany | moon-malapert-massif | 0.0 | top 74.8% | low | bareGround |
| Noerdlinger Ries impact crater, Germany | moon-mons-mouton | 0.0 | top 74.8% | low | bareGround |
| Noerdlinger Ries impact crater, Germany | moon-haworth | 0.0 | top 74.8% | low | bareGround |
| Noerdlinger Ries impact crater, Germany | moon-shackleton-rim | 0.0 | top 74.8% | low | bareGround |
| Askja caldera, Iceland highlands | moon-malapert-massif | 8.4 | top 23.3% | low | dryness |
| Askja caldera, Iceland highlands | moon-mons-mouton | 8.4 | top 23.3% | low | dryness |
| Askja caldera, Iceland highlands | moon-haworth | 8.4 | top 23.3% | low | dryness |
| Askja caldera, Iceland highlands | moon-shackleton-rim | 8.4 | top 23.3% | low | dryness |
| Askja caldera, Iceland highlands | mars-jezero | 4.8 | top 42.4% | low | dryness |
| Askja caldera, Iceland highlands | mars-gale | 2.9 | top 49.9% | low | dryness |
| Mars Desert Research Station, Hanksville, Utah, USA | mars-jezero | 18.0 | top 4.6% | low | temperature |
| Mars Desert Research Station, Hanksville, Utah, USA | mars-gale | 22.6 | top 4.1% | low | temperature |
| Rio Tinto, Huelva, Spain | mars-jezero | 1.3 | top 57.6% | low | bareGround |
| Rio Tinto, Huelva, Spain | mars-gale | 1.8 | top 55.0% | low | bareGround |
| Dallol, Danakil Depression, Ethiopia | mars-jezero | 10.6 | top 22.7% | low | temperature |
| Dallol, Danakil Depression, Ethiopia | mars-gale | 14.0 | top 16.4% | low | temperature |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | moon-malapert-massif | 5.2 | top 32.2% | low | temperature |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | moon-mons-mouton | 5.2 | top 32.2% | low | temperature |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | moon-haworth | 5.2 | top 32.2% | low | temperature |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | moon-shackleton-rim | 5.2 | top 32.2% | low | temperature |
| Meteor Crater, Arizona, USA | moon-malapert-massif | 8.1 | top 23.8% | low | temperature |
| Meteor Crater, Arizona, USA | moon-mons-mouton | 8.1 | top 23.8% | low | temperature |
| Meteor Crater, Arizona, USA | moon-haworth | 8.1 | top 23.8% | low | temperature |
| Meteor Crater, Arizona, USA | moon-shackleton-rim | 8.1 | top 23.8% | low | temperature |
| Ubehebe Crater, Death Valley, California, USA | mars-jezero | 19.1 | top 3.7% | low | temperature |
| Ubehebe Crater, Death Valley, California, USA | mars-gale | 23.9 | top 3.0% | low | temperature |
| North Pole Dome, Pilbara, Australia | mars-jezero | 7.5 | top 33.1% | low | temperature |
| North Pole Dome, Pilbara, Australia | mars-gale | 10.9 | top 23.2% | low | temperature |
| Arkaroola, Flinders Ranges, Australia | mars-jezero | 14.0 | top 13.8% | low | temperature |
| Arkaroola, Flinders Ranges, Australia | mars-gale | 13.6 | top 17.3% | low | temperature |
| Qaidam Basin, China | mars-jezero | 26.2 | top 1.0% | low | temperature |
| Qaidam Basin, China | mars-gale | 32.9 | top 0.5% | low | temperature |
| Makhtesh Ramon, Negev, Israel | mars-jezero | 17.3 | top 5.8% | low | temperature |
| Makhtesh Ramon, Negev, Israel | mars-gale | 22.0 | top 5.0% | low | temperature |
| Lonar crater, Maharashtra, India | mars-jezero | 0.5 | top 64.8% | low | bareGround |
| Lonar crater, Maharashtra, India | mars-gale | 0.4 | top 68.0% | low | bareGround |
| Tso Kar, Ladakh, India | mars-jezero | 29.9 | top 0.6% | low | temperature |
| Tso Kar, Ladakh, India | mars-gale | 38.0 | top 0.3% | low | temperature |
| Tso Kar, Ladakh, India | mars-arcadia-planitia | 37.1 | top 0.5% | low | temperature |
| Makgadikgadi Pans, Botswana | mars-jezero | 9.3 | top 27.1% | low | temperature |
| Makgadikgadi Pans, Botswana | mars-gale | 12.1 | top 20.3% | low | temperature |
| Teide and Las Canadas, Tenerife, Spain | mars-jezero | 4.6 | top 42.8% | low | temperature |
| Teide and Las Canadas, Tenerife, Spain | mars-gale | 3.1 | top 49.1% | low | temperature |
| Mount Etna, Sicily, Italy | moon-malapert-massif | 0.1 | top 70.0% | low | bareGround |
| Mount Etna, Sicily, Italy | moon-mons-mouton | 0.1 | top 70.0% | low | bareGround |
| Mount Etna, Sicily, Italy | moon-haworth | 0.1 | top 70.0% | low | bareGround |
| Mount Etna, Sicily, Italy | moon-shackleton-rim | 0.1 | top 70.0% | low | bareGround |
| Sudbury Basin, Ontario, Canada | moon-malapert-massif | 0.2 | top 68.5% | low | bareGround |
| Sudbury Basin, Ontario, Canada | moon-mons-mouton | 0.2 | top 68.5% | low | bareGround |
| Sudbury Basin, Ontario, Canada | moon-haworth | 0.2 | top 68.5% | low | bareGround |
| Sudbury Basin, Ontario, Canada | moon-shackleton-rim | 0.2 | top 68.5% | low | bareGround |
| Kangerlussuaq, Greenland | mars-arcadia-planitia | 10.8 | top 28.3% | low | temperature |
| Mistastin crater, Labrador, Canada | moon-malapert-massif | 3.5 | top 41.0% | low | dryness |
| Mistastin crater, Labrador, Canada | moon-mons-mouton | 3.5 | top 41.0% | low | dryness |
| Mistastin crater, Labrador, Canada | moon-haworth | 3.5 | top 41.0% | low | dryness |
| Mistastin crater, Labrador, Canada | moon-shackleton-rim | 3.5 | top 41.0% | low | dryness |

## Candidates

Indonesian candidate sites are not part of validation. Their scores are written by
`validation/score_candidates.ts` after the tuning pass is frozen.

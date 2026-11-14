# SBATS validation report

**Status: FINAL.** Sigmas and weights were frozen on 2026-11-14. The hold-out numbers are the honest ones: those sites were never used to tune.

Generated 2026-11-14T12:03:37.193Z by `npx tsx validation/validate.ts astrobiology`. Preset: Astrobiology.
Earth grid: 91894 land cells at 0.5 degrees, built 2026-11-14T11:56:02Z.
Split: 24 tuning sites and 10 hold-out sites, seed 20261114 (validation/tuning/split.json).

Numbers are reported as they came out. Indonesian candidate sites are not part of this report.

## Headline: tuning set against hold-out set

| Measure | Tuning set | Holdout set | Both together |
| --- | --- | --- | --- |
| Known sites / negative controls | 20 / 4 | 8 / 2 | 28 / 6 |
| ROC AUC (strict) | 0.912 | 0.979 | 0.923 |
| ROC AUC (scored sites only) | 0.912 | 0.979 | 0.923 |
| Known analogs in the top 10% of Earth cells | 37.5% | 16.7% | 31.5% |
| Mean percentile of known analogs | 0.753 | 0.704 | 0.739 |
| Known sites with no score | 0 | 0 | 0 |
| Mean score, known / negative | 14.6 / 0.4 | 11.8 / 0 | 13.8 / 0.3 |
| Most common limiting factor | temperature (43.3%) | temperature (35.4%) | temperature (41.1%) |

## Moon targets against Mars targets

Tuning set:

| Measure | Moon targets | Mars targets |
| --- | --- | --- |
| Known sites / negative controls | 7 / 4 | 15 / 4 |
| ROC AUC (strict) | 0.786 | 0.942 |
| ROC AUC (scored sites only) | 0.786 | 0.942 |
| Known analogs in the top 10% of Earth cells | 28.6% | 41.1% |
| Mean percentile of known analogs | 0.631 | 0.792 |
| Known sites with no score | 0 | 0 |
| Mean score, known / negative | 7.7 / 0.4 | 17.3 / 0.4 |
| Most common limiting factor | dryness (42.9%) | temperature (51.1%) |

Holdout set:

| Measure | Moon targets | Mars targets |
| --- | --- | --- |
| Known sites / negative controls | 3 / 2 | 6 / 2 |
| ROC AUC (strict) | 1 | 0.972 |
| ROC AUC (scored sites only) | 1 | 0.972 |
| Known analogs in the top 10% of Earth cells | 0.0% | 22.2% |
| Mean percentile of known analogs | 0.57 | 0.761 |
| Known sites with no score | 0 | 0 |
| Mean score, known / negative | 2.5 / 0 | 15.3 / 0 |
| Most common limiting factor | bareGround (66.7%) | temperature (47.2%) |

How to read the measures:

- `positiveCase`: One known analog site scored against one target listed in its analogFor. A site listed for several targets is split equally between them, so every site counts once in each number.
- `rocAuc`: Share of (positive case, negative control) pairs, both scored against the same target, in which the known analog has the higher score. Ties count half. A site with no score counts as below every scored site. 0.5 is chance, 1.0 is perfect.
- `rocAucScoredOnly`: The same, using only pairs where both sites have a score.
- `top10Share`: Share of known analogs whose cell is in the top 10% of all scored Earth cells for their matching target. Unscored cases count as not in the top 10%.
- `meanPercentile`: Mean share of scored Earth cells that a known analog beats or ties, over scored cases. 0.5 is chance. This compares known analogs with every land cell, a harder test than the negative controls.
- `snapping`: Each site is scored at the nearest earth.json cell centre. Sites more than 60 km from any cell are unscored.
- `candidates`: Indonesian candidate sites are never part of tuning or validation. Their scores are reported separately.

## Warnings

- On the hold-out set, Moon targets do worse: mean percentile 0.57 against 0.761.

## What was left out of the scores

- Target `moon-malapert-massif` has no usable value for: tempRange.
- Target `moon-mons-mouton` has no usable value for: tempRange.
- Target `moon-haworth` has no usable value for: tempRange.
- Target `moon-shackleton-rim` has no usable value for: tempRange.
- Target `mars-arcadia-planitia` has no usable value for: lithology.

## Negative controls (must rank low)

| Site | Set | Best rank over all targets | Target | Score |
| --- | --- | --- | --- | --- |
| Betung Kerihun National Park, Kalimantan, Indonesia | tuning | top 71.5% | moon-malapert-massif | 0.0 |
| Jau National Park, central Amazon, Brazil | holdout | top 69.1% | mars-arcadia-planitia | 0.0 |
| Salonga National Park, Congo basin, DR Congo | tuning | top 66.5% | mars-arcadia-planitia | 0.0 |
| Jakarta, Indonesia | tuning | top 67.3% | mars-arcadia-planitia | 0.0 |
| Singapore | holdout | top 68.6% | mars-arcadia-planitia | 0.0 |
| Paris, France | tuning | top 38.7% | mars-arcadia-planitia | 0.9 |

## Known analogs, scored against their own targets

| Site | Set | Target | Score | Rank among Earth cells | Confidence | Limiting factor |
| --- | --- | --- | --- | --- | --- | --- |
| Atacama Desert hyperarid core (Yungay), Chile | tuning | mars-jezero | 23.5 | top 5.9% | high | temperature |
| Atacama Desert hyperarid core (Yungay), Chile | tuning | mars-gale | 29.0 | top 8.0% | high | temperature |
| Haughton impact structure, Devon Island, Canada | tuning | mars-jezero | 19.8 | top 10.9% | high | rockType |
| Haughton impact structure, Devon Island, Canada | tuning | mars-gale | 26.5 | top 9.7% | high | temperature |
| Haughton impact structure, Devon Island, Canada | tuning | mars-arcadia-planitia | 29.4 | top 6.7% | low | temperature |
| Beacon Valley, McMurdo Dry Valleys, Antarctica | tuning | mars-arcadia-planitia | 1.1 | top 37.2% | low | terrain |
| Don Juan Pond, Wright Valley, Antarctica | tuning | mars-arcadia-planitia | 0.1 | top 49.0% | low | terrain |
| Mauna Kea, Hawaii, USA | tuning | moon-malapert-massif | 0.0 | top 65.6% | medium | dryness |
| Mauna Kea, Hawaii, USA | tuning | moon-mons-mouton | 0.0 | top 65.5% | medium | dryness |
| Mauna Kea, Hawaii, USA | tuning | moon-haworth | 0.0 | top 65.6% | medium | dryness |
| Mauna Kea, Hawaii, USA | tuning | moon-shackleton-rim | 0.0 | top 65.5% | medium | dryness |
| Kilauea, Hawaii, USA | tuning | moon-malapert-massif | 0.0 | top 65.8% | low | dryness |
| Kilauea, Hawaii, USA | tuning | moon-mons-mouton | 0.0 | top 65.8% | low | dryness |
| Kilauea, Hawaii, USA | tuning | moon-haworth | 0.0 | top 65.8% | low | dryness |
| Kilauea, Hawaii, USA | tuning | moon-shackleton-rim | 0.0 | top 65.8% | low | dryness |
| Kilauea, Hawaii, USA | tuning | mars-jezero | 0.0 | top 65.6% | low | dryness |
| Kilauea, Hawaii, USA | tuning | mars-gale | 0.0 | top 65.7% | low | dryness |
| Craters of the Moon, Idaho, USA | tuning | mars-jezero | 31.2 | top 0.9% | high | temperature |
| Craters of the Moon, Idaho, USA | tuning | mars-gale | 15.6 | top 21.1% | high | rockType |
| Timanfaya, Lanzarote, Spain | tuning | moon-malapert-massif | 18.0 | top 9.4% | low | temperature |
| Timanfaya, Lanzarote, Spain | tuning | moon-mons-mouton | 18.2 | top 9.3% | low | temperature |
| Timanfaya, Lanzarote, Spain | tuning | moon-haworth | 18.0 | top 9.3% | low | temperature |
| Timanfaya, Lanzarote, Spain | tuning | moon-shackleton-rim | 18.1 | top 9.4% | low | temperature |
| Timanfaya, Lanzarote, Spain | tuning | mars-jezero | 24.3 | top 4.7% | low | temperature |
| Timanfaya, Lanzarote, Spain | tuning | mars-gale | 21.9 | top 14.1% | low | temperature |
| Noerdlinger Ries impact crater, Germany | holdout | moon-malapert-massif | 0.4 | top 51.2% | medium | bareGround |
| Noerdlinger Ries impact crater, Germany | holdout | moon-mons-mouton | 0.4 | top 51.3% | medium | bareGround |
| Noerdlinger Ries impact crater, Germany | holdout | moon-haworth | 0.4 | top 51.2% | medium | bareGround |
| Noerdlinger Ries impact crater, Germany | holdout | moon-shackleton-rim | 0.4 | top 51.3% | medium | bareGround |
| Askja caldera, Iceland highlands | holdout | moon-malapert-massif | 5.7 | top 32.6% | medium | dryness |
| Askja caldera, Iceland highlands | holdout | moon-mons-mouton | 5.8 | top 32.4% | medium | dryness |
| Askja caldera, Iceland highlands | holdout | moon-haworth | 5.7 | top 32.6% | medium | dryness |
| Askja caldera, Iceland highlands | holdout | moon-shackleton-rim | 5.8 | top 32.5% | medium | dryness |
| Askja caldera, Iceland highlands | holdout | mars-jezero | 5.8 | top 32.1% | high | dryness |
| Askja caldera, Iceland highlands | holdout | mars-gale | 2.9 | top 42.1% | high | dryness |
| Mars Desert Research Station, Hanksville, Utah, USA | holdout | mars-jezero | 26.2 | top 2.7% | high | rockType |
| Mars Desert Research Station, Hanksville, Utah, USA | holdout | mars-gale | 37.0 | top 2.5% | high | temperature |
| Rio Tinto, Huelva, Spain | tuning | mars-jezero | 4.2 | top 35.5% | high | bareGround |
| Rio Tinto, Huelva, Spain | tuning | mars-gale | 6.9 | top 33.6% | high | bareGround |
| Dallol, Danakil Depression, Ethiopia | holdout | mars-jezero | 18.4 | top 12.6% | high | temperature |
| Dallol, Danakil Depression, Ethiopia | holdout | mars-gale | 25.7 | top 10.4% | high | temperature |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | tuning | moon-malapert-massif | 12.5 | top 21.5% | medium | rockType |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | tuning | moon-mons-mouton | 12.6 | top 21.1% | medium | rockType |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | tuning | moon-haworth | 12.5 | top 21.5% | medium | rockType |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | tuning | moon-shackleton-rim | 12.6 | top 21.2% | medium | rockType |
| Meteor Crater, Arizona, USA | tuning | moon-malapert-massif | 19.8 | top 7.3% | medium | temperature |
| Meteor Crater, Arizona, USA | tuning | moon-mons-mouton | 20.0 | top 7.2% | medium | temperature |
| Meteor Crater, Arizona, USA | tuning | moon-haworth | 19.9 | top 7.3% | medium | temperature |
| Meteor Crater, Arizona, USA | tuning | moon-shackleton-rim | 20.0 | top 7.2% | medium | temperature |
| Ubehebe Crater, Death Valley, California, USA | tuning | mars-jezero | 28.3 | top 1.7% | high | rockType |
| Ubehebe Crater, Death Valley, California, USA | tuning | mars-gale | 40.4 | top 1.3% | high | temperature |
| North Pole Dome, Pilbara, Australia | holdout | mars-jezero | 12.8 | top 20.2% | high | temperature |
| North Pole Dome, Pilbara, Australia | holdout | mars-gale | 21.1 | top 14.9% | high | temperature |
| Arkaroola, Flinders Ranges, Australia | tuning | mars-jezero | 23.9 | top 5.3% | high | temperature |
| Arkaroola, Flinders Ranges, Australia | tuning | mars-gale | 21.6 | top 14.4% | high | temperature |
| Qaidam Basin, China | tuning | mars-jezero | 29.5 | top 1.3% | high | rockType |
| Qaidam Basin, China | tuning | mars-gale | 43.2 | top 0.7% | high | temperature |
| Makhtesh Ramon, Negev, Israel | tuning | mars-jezero | 27.2 | top 2.1% | high | temperature |
| Makhtesh Ramon, Negev, Israel | tuning | mars-gale | 37.1 | top 2.5% | high | temperature |
| Lonar crater, Maharashtra, India | holdout | mars-jezero | 1.7 | top 43.9% | high | dryness |
| Lonar crater, Maharashtra, India | holdout | mars-gale | 0.9 | top 49.9% | high | dryness |
| Tso Kar, Ladakh, India | holdout | mars-jezero | 7.0 | top 29.9% | high | terrain |
| Tso Kar, Ladakh, India | holdout | mars-gale | 39.2 | top 1.7% | high | temperature |
| Tso Kar, Ladakh, India | holdout | mars-arcadia-planitia | 0.0 | top 51.9% | low | terrain |
| Makgadikgadi Pans, Botswana | tuning | mars-jezero | 12.7 | top 20.4% | high | temperature |
| Makgadikgadi Pans, Botswana | tuning | mars-gale | 19.1 | top 17.1% | high | temperature |
| Teide and Las Canadas, Tenerife, Spain | tuning | mars-jezero | 7.2 | top 29.5% | high | terrain |
| Teide and Las Canadas, Tenerife, Spain | tuning | mars-gale | 10.0 | top 28.8% | high | temperature |
| Mount Etna, Sicily, Italy | holdout | moon-malapert-massif | 1.2 | top 45.4% | medium | bareGround |
| Mount Etna, Sicily, Italy | holdout | moon-mons-mouton | 1.3 | top 45.2% | medium | bareGround |
| Mount Etna, Sicily, Italy | holdout | moon-haworth | 1.2 | top 45.3% | medium | bareGround |
| Mount Etna, Sicily, Italy | holdout | moon-shackleton-rim | 1.3 | top 45.2% | medium | bareGround |
| Sudbury Basin, Ontario, Canada | tuning | moon-malapert-massif | 0.7 | top 48.6% | medium | bareGround |
| Sudbury Basin, Ontario, Canada | tuning | moon-mons-mouton | 0.7 | top 48.6% | medium | bareGround |
| Sudbury Basin, Ontario, Canada | tuning | moon-haworth | 0.7 | top 48.6% | medium | bareGround |
| Sudbury Basin, Ontario, Canada | tuning | moon-shackleton-rim | 0.7 | top 48.6% | medium | bareGround |
| Kangerlussuaq, Greenland | tuning | mars-arcadia-planitia | 5.1 | top 26.1% | low | terrain |
| Mistastin crater, Labrador, Canada | tuning | moon-malapert-massif | 2.6 | top 40.2% | medium | dryness |
| Mistastin crater, Labrador, Canada | tuning | moon-mons-mouton | 2.6 | top 40.2% | medium | dryness |
| Mistastin crater, Labrador, Canada | tuning | moon-haworth | 2.6 | top 40.2% | medium | dryness |
| Mistastin crater, Labrador, Canada | tuning | moon-shackleton-rim | 2.6 | top 40.2% | medium | dryness |


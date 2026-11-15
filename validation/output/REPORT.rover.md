# SBATS validation report

**Status: FINAL.** Sigmas and weights were frozen on 2026-11-14. The hold-out numbers are the honest ones: those sites were never used to tune.

Generated 2026-11-15T13:42:36.772Z by `npx tsx validation/validate.ts rover`. Preset: Rover.
Earth grid: 91894 land cells at 0.5 degrees, built 2026-11-15T06:42:18Z.
Split: 24 tuning sites and 10 hold-out sites, seed 20261114 (validation/tuning/split.json).

Numbers are reported as they came out. Indonesian candidate sites are not part of this report.

## Headline: tuning set against hold-out set

| Measure | Tuning set | Holdout set | Both together |
| --- | --- | --- | --- |
| Known sites / negative controls | 20 / 4 | 8 / 2 | 28 / 6 |
| ROC AUC (strict) | 0.862 | 0.979 | 0.896 |
| ROC AUC (scored sites only) | 0.862 | 0.979 | 0.896 |
| Known analogs in the top 10% of Earth cells | 30.0% | 33.3% | 31.0% |
| Mean percentile of known analogs | 0.726 | 0.726 | 0.726 |
| Known sites with no score | 0 | 0 | 0 |
| Mean score, known / negative | 13.6 / 0.4 | 14.1 / 0 | 13.8 / 0.3 |
| Most common limiting factor | terrain (42.5%) | bareGround (37.5%) | terrain (33.9%) |

## Moon targets against Mars targets

Tuning set:

| Measure | Moon targets | Mars targets |
| --- | --- | --- |
| Known sites / negative controls | 7 / 4 | 15 / 4 |
| ROC AUC (strict) | 0.839 | 0.875 |
| ROC AUC (scored sites only) | 0.839 | 0.875 |
| Known analogs in the top 10% of Earth cells | 0.0% | 44.4% |
| Mean percentile of known analogs | 0.645 | 0.757 |
| Known sites with no score | 0 | 0 |
| Mean score, known / negative | 6.6 / 0.3 | 16.5 / 0.5 |
| Most common limiting factor | bareGround (28.6%) | terrain (43.3%) |

Holdout set:

| Measure | Moon targets | Mars targets |
| --- | --- | --- |
| Known sites / negative controls | 3 / 2 | 6 / 2 |
| ROC AUC (strict) | 1 | 0.972 |
| ROC AUC (scored sites only) | 1 | 0.972 |
| Known analogs in the top 10% of Earth cells | 16.7% | 38.9% |
| Mean percentile of known analogs | 0.633 | 0.792 |
| Known sites with no score | 0 | 0 |
| Mean score, known / negative | 6.8 / 0 | 17.9 / 0 |
| Most common limiting factor | bareGround (66.7%) | temperature (50.0%) |

How to read the measures:

- `positiveCase`: One known analog site scored against one target listed in its analogFor. A site listed for several targets is split equally between them, so every site counts once in each number.
- `rocAuc`: Share of (positive case, negative control) pairs, both scored against the same target, in which the known analog has the higher score. Ties count half. A site with no score counts as below every scored site. 0.5 is chance, 1.0 is perfect.
- `rocAucScoredOnly`: The same, using only pairs where both sites have a score.
- `top10Share`: Share of known analogs whose cell is in the top 10% of all scored Earth cells for their matching target. Unscored cases count as not in the top 10%.
- `meanPercentile`: Mean share of scored Earth cells that a known analog beats or ties, over scored cases. 0.5 is chance. This compares known analogs with every land cell, a harder test than the negative controls.
- `snapping`: Each site is scored at the nearest earth.json cell centre. Sites more than 60 km from any cell are unscored.
- `candidates`: Indonesian candidate sites are never part of tuning or validation. Their scores are reported separately.

## Warnings

- On the hold-out set, Moon targets do worse: mean percentile 0.633 against 0.792.
- earth.json was rebuilt (2026-11-15T06:42:18Z) after the freeze (built 2026-11-14T11:56:02Z). The frozen values were not retuned, by rule.

## What was left out of the scores

- Left out of validation, because no known analog is listed for them: moon-marius-hills, mars-gusev-columbia-hills, mars-holden.
- Target `moon-malapert-massif` has no usable value for: tempRange.
- Target `moon-mons-mouton` has no usable value for: tempRange.
- Target `moon-haworth` has no usable value for: tempRange.
- Target `moon-shackleton-rim` has no usable value for: tempRange.
- Target `mars-arcadia-planitia` has no usable value for: lithology.

## Negative controls (must rank low)

| Site | Set | Best rank over all targets | Target | Score |
| --- | --- | --- | --- | --- |
| Betung Kerihun National Park, Kalimantan, Indonesia | tuning | top 69.6% | mars-arcadia-planitia | 0.0 |
| Jau National Park, central Amazon, Brazil | holdout | top 61.9% | mars-arcadia-planitia | 0.0 |
| Salonga National Park, Congo basin, DR Congo | tuning | top 59.0% | mars-arcadia-planitia | 0.0 |
| Jakarta, Indonesia | tuning | top 53.5% | mars-arcadia-planitia | 0.0 |
| Singapore | holdout | top 57.1% | mars-arcadia-planitia | 0.0 |
| Paris, France | tuning | top 33.9% | mars-arcadia-planitia | 2.6 |

## Known analogs, scored against their own targets

| Site | Set | Target | Score | Rank among Earth cells | Confidence | Limiting factor |
| --- | --- | --- | --- | --- | --- | --- |
| Atacama Desert hyperarid core (Yungay), Chile | tuning | mars-jezero | 15.9 | top 15.6% | high | terrain |
| Atacama Desert hyperarid core (Yungay), Chile | tuning | mars-gale | 37.5 | top 0.6% | high | temperature |
| Haughton impact structure, Devon Island, Canada | tuning | mars-jezero | 20.4 | top 9.1% | high | sunlight |
| Haughton impact structure, Devon Island, Canada | tuning | mars-gale | 15.9 | top 14.8% | high | sunlight |
| Haughton impact structure, Devon Island, Canada | tuning | mars-arcadia-planitia | 32.7 | top 8.9% | medium | temperature |
| Beacon Valley, McMurdo Dry Valleys, Antarctica | tuning | mars-arcadia-planitia | 0.0 | top 60.5% | medium | terrain |
| Don Juan Pond, Wright Valley, Antarctica | tuning | mars-arcadia-planitia | 0.0 | top 66.6% | medium | terrain |
| Mauna Kea, Hawaii, USA | tuning | moon-malapert-massif | 0.0 | top 61.7% | medium | bareGround |
| Mauna Kea, Hawaii, USA | tuning | moon-mons-mouton | 0.0 | top 61.4% | medium | bareGround |
| Mauna Kea, Hawaii, USA | tuning | moon-haworth | 0.0 | top 61.7% | medium | bareGround |
| Mauna Kea, Hawaii, USA | tuning | moon-shackleton-rim | 0.0 | top 61.5% | medium | bareGround |
| Kilauea, Hawaii, USA | tuning | moon-malapert-massif | 0.1 | top 57.5% | medium | dryness |
| Kilauea, Hawaii, USA | tuning | moon-mons-mouton | 0.2 | top 57.1% | medium | dryness |
| Kilauea, Hawaii, USA | tuning | moon-haworth | 0.1 | top 57.4% | medium | dryness |
| Kilauea, Hawaii, USA | tuning | moon-shackleton-rim | 0.1 | top 57.1% | medium | dryness |
| Kilauea, Hawaii, USA | tuning | mars-jezero | 0.3 | top 55.7% | medium | dryness |
| Kilauea, Hawaii, USA | tuning | mars-gale | 0.5 | top 55.9% | medium | dryness |
| Craters of the Moon, Idaho, USA | tuning | mars-jezero | 32.6 | top 2.1% | high | temperature |
| Craters of the Moon, Idaho, USA | tuning | mars-gale | 17.2 | top 13.0% | high | terrain |
| Timanfaya, Lanzarote, Spain | tuning | moon-malapert-massif | 11.9 | top 19.0% | medium | sunlight |
| Timanfaya, Lanzarote, Spain | tuning | moon-mons-mouton | 12.3 | top 18.6% | medium | sunlight |
| Timanfaya, Lanzarote, Spain | tuning | moon-haworth | 12.0 | top 18.9% | medium | sunlight |
| Timanfaya, Lanzarote, Spain | tuning | moon-shackleton-rim | 12.1 | top 18.9% | medium | sunlight |
| Timanfaya, Lanzarote, Spain | tuning | mars-jezero | 28.9 | top 3.2% | medium | temperature |
| Timanfaya, Lanzarote, Spain | tuning | mars-gale | 21.5 | top 6.8% | medium | temperature |
| Noerdlinger Ries impact crater, Germany | holdout | moon-malapert-massif | 0.4 | top 53.3% | medium | bareGround |
| Noerdlinger Ries impact crater, Germany | holdout | moon-mons-mouton | 0.4 | top 53.3% | medium | bareGround |
| Noerdlinger Ries impact crater, Germany | holdout | moon-haworth | 0.4 | top 53.3% | medium | bareGround |
| Noerdlinger Ries impact crater, Germany | holdout | moon-shackleton-rim | 0.4 | top 53.4% | medium | bareGround |
| Askja caldera, Iceland highlands | holdout | moon-malapert-massif | 18.1 | top 10.3% | medium | dryness |
| Askja caldera, Iceland highlands | holdout | moon-mons-mouton | 19.2 | top 9.6% | medium | dryness |
| Askja caldera, Iceland highlands | holdout | moon-haworth | 18.3 | top 10.1% | medium | dryness |
| Askja caldera, Iceland highlands | holdout | moon-shackleton-rim | 19.0 | top 9.7% | medium | dryness |
| Askja caldera, Iceland highlands | holdout | mars-jezero | 18.0 | top 12.6% | high | dryness |
| Askja caldera, Iceland highlands | holdout | mars-gale | 9.7 | top 26.7% | high | dryness |
| Mars Desert Research Station, Hanksville, Utah, USA | holdout | mars-jezero | 37.7 | top 1.1% | high | temperature |
| Mars Desert Research Station, Hanksville, Utah, USA | holdout | mars-gale | 33.6 | top 1.1% | high | temperature |
| Rio Tinto, Huelva, Spain | tuning | mars-jezero | 4.0 | top 36.9% | high | bareGround |
| Rio Tinto, Huelva, Spain | tuning | mars-gale | 3.8 | top 40.2% | high | bareGround |
| Dallol, Danakil Depression, Ethiopia | holdout | mars-jezero | 32.2 | top 2.3% | high | temperature |
| Dallol, Danakil Depression, Ethiopia | holdout | mars-gale | 26.3 | top 3.1% | high | temperature |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | tuning | moon-malapert-massif | 10.4 | top 21.4% | medium | terrain |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | tuning | moon-mons-mouton | 10.9 | top 20.7% | medium | terrain |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | tuning | moon-haworth | 10.5 | top 21.3% | medium | terrain |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | tuning | moon-shackleton-rim | 10.8 | top 20.7% | medium | terrain |
| Meteor Crater, Arizona, USA | tuning | moon-malapert-massif | 13.1 | top 17.2% | medium | terrain |
| Meteor Crater, Arizona, USA | tuning | moon-mons-mouton | 13.6 | top 16.7% | medium | terrain |
| Meteor Crater, Arizona, USA | tuning | moon-haworth | 13.2 | top 17.2% | medium | terrain |
| Meteor Crater, Arizona, USA | tuning | moon-shackleton-rim | 13.7 | top 16.6% | medium | terrain |
| Ubehebe Crater, Death Valley, California, USA | tuning | mars-jezero | 37.2 | top 1.1% | high | temperature |
| Ubehebe Crater, Death Valley, California, USA | tuning | mars-gale | 35.1 | top 0.9% | high | temperature |
| North Pole Dome, Pilbara, Australia | holdout | mars-jezero | 17.3 | top 13.7% | high | temperature |
| North Pole Dome, Pilbara, Australia | holdout | mars-gale | 16.1 | top 14.5% | high | temperature |
| Arkaroola, Flinders Ranges, Australia | tuning | mars-jezero | 33.6 | top 1.9% | high | temperature |
| Arkaroola, Flinders Ranges, Australia | tuning | mars-gale | 22.9 | top 5.2% | high | temperature |
| Qaidam Basin, China | tuning | mars-jezero | 24.8 | top 4.9% | high | terrain |
| Qaidam Basin, China | tuning | mars-gale | 25.8 | top 3.3% | high | terrain |
| Makhtesh Ramon, Negev, Israel | tuning | mars-jezero | 38.3 | top 0.9% | high | temperature |
| Makhtesh Ramon, Negev, Israel | tuning | mars-gale | 29.6 | top 2.0% | high | temperature |
| Lonar crater, Maharashtra, India | holdout | mars-jezero | 2.4 | top 41.9% | high | bareGround |
| Lonar crater, Maharashtra, India | holdout | mars-gale | 1.6 | top 47.9% | high | bareGround |
| Tso Kar, Ladakh, India | holdout | mars-jezero | 0.1 | top 58.6% | high | terrain |
| Tso Kar, Ladakh, India | holdout | mars-gale | 30.6 | top 1.7% | high | terrain |
| Tso Kar, Ladakh, India | holdout | mars-arcadia-planitia | 0.0 | top 67.8% | medium | terrain |
| Makgadikgadi Pans, Botswana | tuning | mars-jezero | 12.8 | top 20.3% | high | terrain |
| Makgadikgadi Pans, Botswana | tuning | mars-gale | 14.5 | top 17.1% | high | terrain |
| Teide and Las Canadas, Tenerife, Spain | tuning | mars-jezero | 0.4 | top 54.3% | high | terrain |
| Teide and Las Canadas, Tenerife, Spain | tuning | mars-gale | 10.9 | top 24.0% | high | temperature |
| Mount Etna, Sicily, Italy | holdout | moon-malapert-massif | 1.1 | top 47.3% | medium | bareGround |
| Mount Etna, Sicily, Italy | holdout | moon-mons-mouton | 1.3 | top 46.5% | medium | bareGround |
| Mount Etna, Sicily, Italy | holdout | moon-haworth | 1.2 | top 47.1% | medium | bareGround |
| Mount Etna, Sicily, Italy | holdout | moon-shackleton-rim | 1.3 | top 46.6% | medium | bareGround |
| Sudbury Basin, Ontario, Canada | tuning | moon-malapert-massif | 0.9 | top 48.6% | medium | bareGround |
| Sudbury Basin, Ontario, Canada | tuning | moon-mons-mouton | 0.9 | top 48.6% | medium | bareGround |
| Sudbury Basin, Ontario, Canada | tuning | moon-haworth | 0.9 | top 48.6% | medium | bareGround |
| Sudbury Basin, Ontario, Canada | tuning | moon-shackleton-rim | 0.9 | top 48.6% | medium | bareGround |
| Kangerlussuaq, Greenland | tuning | mars-arcadia-planitia | 0.4 | top 44.1% | medium | terrain |
| Mistastin crater, Labrador, Canada | tuning | moon-malapert-massif | 9.1 | top 24.6% | medium | dryness |
| Mistastin crater, Labrador, Canada | tuning | moon-mons-mouton | 9.1 | top 24.5% | medium | dryness |
| Mistastin crater, Labrador, Canada | tuning | moon-haworth | 9.1 | top 24.5% | medium | dryness |
| Mistastin crater, Labrador, Canada | tuning | moon-shackleton-rim | 9.0 | top 24.7% | medium | dryness |


# SBATS validation report

**Status: FINAL.** Sigmas and weights were frozen on 2026-11-14. The hold-out numbers are the honest ones: those sites were never used to tune.

Generated 2026-11-15T06:07:21.753Z by `npx tsx validation/validate.ts base`. Preset: Base.
Earth grid: 91894 land cells at 0.5 degrees, built 2026-11-15T06:06:00Z.
Split: 24 tuning sites and 10 hold-out sites, seed 20261114 (validation/tuning/split.json).

Numbers are reported as they came out. Indonesian candidate sites are not part of this report.

## Headline: tuning set against hold-out set

| Measure | Tuning set | Holdout set | Both together |
| --- | --- | --- | --- |
| Known sites / negative controls | 20 / 4 | 8 / 2 | 28 / 6 |
| ROC AUC (strict) | 0.853 | 0.979 | 0.883 |
| ROC AUC (scored sites only) | 0.853 | 0.979 | 0.883 |
| Known analogs in the top 10% of Earth cells | 29.2% | 29.2% | 29.2% |
| Mean percentile of known analogs | 0.731 | 0.716 | 0.727 |
| Known sites with no score | 0 | 0 | 0 |
| Mean score, known / negative | 10.7 / 0.3 | 10.2 / 0 | 10.5 / 0.2 |
| Most common limiting factor | temperature (54.2%) | temperature (41.7%) | temperature (50.6%) |

## Moon targets against Mars targets

Tuning set:

| Measure | Moon targets | Mars targets |
| --- | --- | --- |
| Known sites / negative controls | 7 / 4 | 15 / 4 |
| ROC AUC (strict) | 0.786 | 0.871 |
| ROC AUC (scored sites only) | 0.786 | 0.871 |
| Known analogs in the top 10% of Earth cells | 0.0% | 41.1% |
| Mean percentile of known analogs | 0.63 | 0.765 |
| Known sites with no score | 0 | 0 |
| Mean score, known / negative | 4.9 / 0.2 | 12.8 / 0.3 |
| Most common limiting factor | dryness (42.9%) | temperature (58.9%) |

Holdout set:

| Measure | Moon targets | Mars targets |
| --- | --- | --- |
| Known sites / negative controls | 3 / 2 | 6 / 2 |
| ROC AUC (strict) | 1 | 0.972 |
| ROC AUC (scored sites only) | 1 | 0.972 |
| Known analogs in the top 10% of Earth cells | 0.0% | 38.9% |
| Mean percentile of known analogs | 0.617 | 0.774 |
| Known sites with no score | 0 | 0 |
| Mean score, known / negative | 4.3 / 0 | 13 / 0 |
| Most common limiting factor | bareGround (66.7%) | temperature (55.6%) |

How to read the measures:

- `positiveCase`: One known analog site scored against one target listed in its analogFor. A site listed for several targets is split equally between them, so every site counts once in each number.
- `rocAuc`: Share of (positive case, negative control) pairs, both scored against the same target, in which the known analog has the higher score. Ties count half. A site with no score counts as below every scored site. 0.5 is chance, 1.0 is perfect.
- `rocAucScoredOnly`: The same, using only pairs where both sites have a score.
- `top10Share`: Share of known analogs whose cell is in the top 10% of all scored Earth cells for their matching target. Unscored cases count as not in the top 10%.
- `meanPercentile`: Mean share of scored Earth cells that a known analog beats or ties, over scored cases. 0.5 is chance. This compares known analogs with every land cell, a harder test than the negative controls.
- `snapping`: Each site is scored at the nearest earth.json cell centre. Sites more than 60 km from any cell are unscored.
- `candidates`: Indonesian candidate sites are never part of tuning or validation. Their scores are reported separately.

## Warnings

- On the hold-out set, Moon targets do worse: mean percentile 0.617 against 0.774.
- earth.json was rebuilt (2026-11-15T06:06:00Z) after the freeze (built 2026-11-14T11:56:02Z). The frozen values were not retuned, by rule.

## What was left out of the scores

- Left out of validation, because no known analog is listed for them: moon-marius-hills.
- Target `moon-malapert-massif` has no usable value for: tempRange.
- Target `moon-mons-mouton` has no usable value for: tempRange.
- Target `moon-haworth` has no usable value for: tempRange.
- Target `moon-shackleton-rim` has no usable value for: tempRange.
- Target `mars-arcadia-planitia` has no usable value for: lithology.

## Negative controls (must rank low)

| Site | Set | Best rank over all targets | Target | Score |
| --- | --- | --- | --- | --- |
| Betung Kerihun National Park, Kalimantan, Indonesia | tuning | top 70.8% | mars-arcadia-planitia | 0.0 |
| Jau National Park, central Amazon, Brazil | holdout | top 65.9% | mars-arcadia-planitia | 0.0 |
| Salonga National Park, Congo basin, DR Congo | tuning | top 62.8% | mars-arcadia-planitia | 0.0 |
| Jakarta, Indonesia | tuning | top 59.8% | mars-arcadia-planitia | 0.0 |
| Singapore | holdout | top 63.1% | mars-arcadia-planitia | 0.0 |
| Paris, France | tuning | top 36.2% | mars-arcadia-planitia | 1.3 |

## Known analogs, scored against their own targets

| Site | Set | Target | Score | Rank among Earth cells | Confidence | Limiting factor |
| --- | --- | --- | --- | --- | --- | --- |
| Atacama Desert hyperarid core (Yungay), Chile | tuning | mars-jezero | 15.6 | top 10.4% | high | temperature |
| Atacama Desert hyperarid core (Yungay), Chile | tuning | mars-gale | 26.5 | top 1.5% | high | temperature |
| Haughton impact structure, Devon Island, Canada | tuning | mars-jezero | 16.4 | top 9.0% | high | sunlight |
| Haughton impact structure, Devon Island, Canada | tuning | mars-gale | 15.2 | top 12.6% | high | sunlight |
| Haughton impact structure, Devon Island, Canada | tuning | mars-arcadia-planitia | 26.2 | top 4.7% | medium | temperature |
| Beacon Valley, McMurdo Dry Valleys, Antarctica | tuning | mars-arcadia-planitia | 0.0 | top 53.4% | medium | terrain |
| Don Juan Pond, Wright Valley, Antarctica | tuning | mars-arcadia-planitia | 0.0 | top 62.6% | medium | terrain |
| Mauna Kea, Hawaii, USA | tuning | moon-malapert-massif | 0.0 | top 63.5% | medium | dryness |
| Mauna Kea, Hawaii, USA | tuning | moon-mons-mouton | 0.0 | top 63.4% | medium | dryness |
| Mauna Kea, Hawaii, USA | tuning | moon-haworth | 0.0 | top 63.5% | medium | dryness |
| Mauna Kea, Hawaii, USA | tuning | moon-shackleton-rim | 0.0 | top 63.5% | medium | dryness |
| Kilauea, Hawaii, USA | tuning | moon-malapert-massif | 0.0 | top 61.0% | low | dryness |
| Kilauea, Hawaii, USA | tuning | moon-mons-mouton | 0.0 | top 60.7% | low | dryness |
| Kilauea, Hawaii, USA | tuning | moon-haworth | 0.0 | top 60.9% | low | dryness |
| Kilauea, Hawaii, USA | tuning | moon-shackleton-rim | 0.0 | top 60.7% | low | dryness |
| Kilauea, Hawaii, USA | tuning | mars-jezero | 0.0 | top 60.0% | medium | dryness |
| Kilauea, Hawaii, USA | tuning | mars-gale | 0.1 | top 60.5% | medium | dryness |
| Craters of the Moon, Idaho, USA | tuning | mars-jezero | 24.9 | top 1.8% | high | temperature |
| Craters of the Moon, Idaho, USA | tuning | mars-gale | 13.9 | top 14.6% | high | temperature |
| Timanfaya, Lanzarote, Spain | tuning | moon-malapert-massif | 8.2 | top 21.0% | low | temperature |
| Timanfaya, Lanzarote, Spain | tuning | moon-mons-mouton | 8.5 | top 20.6% | low | temperature |
| Timanfaya, Lanzarote, Spain | tuning | moon-haworth | 8.3 | top 20.9% | low | temperature |
| Timanfaya, Lanzarote, Spain | tuning | moon-shackleton-rim | 8.4 | top 20.8% | low | temperature |
| Timanfaya, Lanzarote, Spain | tuning | mars-jezero | 17.0 | top 7.8% | medium | temperature |
| Timanfaya, Lanzarote, Spain | tuning | mars-gale | 13.9 | top 14.6% | medium | temperature |
| Noerdlinger Ries impact crater, Germany | holdout | moon-malapert-massif | 0.2 | top 52.4% | medium | bareGround |
| Noerdlinger Ries impact crater, Germany | holdout | moon-mons-mouton | 0.2 | top 52.4% | medium | bareGround |
| Noerdlinger Ries impact crater, Germany | holdout | moon-haworth | 0.2 | top 52.4% | medium | bareGround |
| Noerdlinger Ries impact crater, Germany | holdout | moon-shackleton-rim | 0.2 | top 52.5% | medium | bareGround |
| Askja caldera, Iceland highlands | holdout | moon-malapert-massif | 11.9 | top 15.3% | medium | dryness |
| Askja caldera, Iceland highlands | holdout | moon-mons-mouton | 12.3 | top 14.7% | medium | dryness |
| Askja caldera, Iceland highlands | holdout | moon-haworth | 12.0 | top 15.2% | medium | dryness |
| Askja caldera, Iceland highlands | holdout | moon-shackleton-rim | 12.3 | top 14.8% | medium | dryness |
| Askja caldera, Iceland highlands | holdout | mars-jezero | 10.0 | top 21.1% | high | dryness |
| Askja caldera, Iceland highlands | holdout | mars-gale | 5.6 | top 33.0% | high | dryness |
| Mars Desert Research Station, Hanksville, Utah, USA | holdout | mars-jezero | 26.6 | top 1.3% | high | temperature |
| Mars Desert Research Station, Hanksville, Utah, USA | holdout | mars-gale | 27.5 | top 1.3% | high | temperature |
| Rio Tinto, Huelva, Spain | tuning | mars-jezero | 2.8 | top 37.7% | high | bareGround |
| Rio Tinto, Huelva, Spain | tuning | mars-gale | 3.2 | top 39.2% | high | bareGround |
| Dallol, Danakil Depression, Ethiopia | holdout | mars-jezero | 18.5 | top 5.7% | high | temperature |
| Dallol, Danakil Depression, Ethiopia | holdout | mars-gale | 18.4 | top 7.7% | high | temperature |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | tuning | moon-malapert-massif | 8.1 | top 21.4% | medium | temperature |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | tuning | moon-mons-mouton | 8.3 | top 21.0% | medium | temperature |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | tuning | moon-haworth | 8.1 | top 21.4% | medium | temperature |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | tuning | moon-shackleton-rim | 8.3 | top 21.0% | medium | temperature |
| Meteor Crater, Arizona, USA | tuning | moon-malapert-massif | 10.9 | top 16.6% | medium | temperature |
| Meteor Crater, Arizona, USA | tuning | moon-mons-mouton | 11.2 | top 16.4% | medium | temperature |
| Meteor Crater, Arizona, USA | tuning | moon-haworth | 10.9 | top 16.6% | medium | temperature |
| Meteor Crater, Arizona, USA | tuning | moon-shackleton-rim | 11.2 | top 16.3% | medium | temperature |
| Ubehebe Crater, Death Valley, California, USA | tuning | mars-jezero | 26.8 | top 1.2% | high | temperature |
| Ubehebe Crater, Death Valley, California, USA | tuning | mars-gale | 28.8 | top 1.0% | high | temperature |
| North Pole Dome, Pilbara, Australia | holdout | mars-jezero | 11.5 | top 17.8% | high | temperature |
| North Pole Dome, Pilbara, Australia | holdout | mars-gale | 13.0 | top 16.0% | high | temperature |
| Arkaroola, Flinders Ranges, Australia | tuning | mars-jezero | 22.3 | top 2.9% | high | temperature |
| Arkaroola, Flinders Ranges, Australia | tuning | mars-gale | 17.4 | top 9.1% | high | temperature |
| Qaidam Basin, China | tuning | mars-jezero | 23.6 | top 2.3% | high | temperature |
| Qaidam Basin, China | tuning | mars-gale | 26.9 | top 1.4% | high | temperature |
| Makhtesh Ramon, Negev, Israel | tuning | mars-jezero | 25.7 | top 1.5% | high | temperature |
| Makhtesh Ramon, Negev, Israel | tuning | mars-gale | 24.5 | top 2.2% | high | temperature |
| Lonar crater, Maharashtra, India | holdout | mars-jezero | 1.5 | top 43.6% | high | bareGround |
| Lonar crater, Maharashtra, India | holdout | mars-gale | 1.0 | top 48.6% | high | bareGround |
| Tso Kar, Ladakh, India | holdout | mars-jezero | 1.0 | top 46.5% | high | terrain |
| Tso Kar, Ladakh, India | holdout | mars-gale | 31.7 | top 0.7% | high | temperature |
| Tso Kar, Ladakh, India | holdout | mars-arcadia-planitia | 0.0 | top 64.8% | medium | terrain |
| Makgadikgadi Pans, Botswana | tuning | mars-jezero | 10.3 | top 20.3% | high | temperature |
| Makgadikgadi Pans, Botswana | tuning | mars-gale | 12.5 | top 16.8% | high | temperature |
| Teide and Las Canadas, Tenerife, Spain | tuning | mars-jezero | 0.9 | top 46.7% | high | terrain |
| Teide and Las Canadas, Tenerife, Spain | tuning | mars-gale | 6.6 | top 30.5% | high | temperature |
| Mount Etna, Sicily, Italy | holdout | moon-malapert-massif | 0.6 | top 47.6% | medium | bareGround |
| Mount Etna, Sicily, Italy | holdout | moon-mons-mouton | 0.7 | top 47.2% | medium | bareGround |
| Mount Etna, Sicily, Italy | holdout | moon-haworth | 0.6 | top 47.5% | medium | bareGround |
| Mount Etna, Sicily, Italy | holdout | moon-shackleton-rim | 0.7 | top 47.2% | medium | bareGround |
| Sudbury Basin, Ontario, Canada | tuning | moon-malapert-massif | 0.6 | top 48.0% | medium | bareGround |
| Sudbury Basin, Ontario, Canada | tuning | moon-mons-mouton | 0.6 | top 48.0% | medium | bareGround |
| Sudbury Basin, Ontario, Canada | tuning | moon-haworth | 0.6 | top 48.0% | medium | bareGround |
| Sudbury Basin, Ontario, Canada | tuning | moon-shackleton-rim | 0.6 | top 48.0% | medium | bareGround |
| Kangerlussuaq, Greenland | tuning | mars-arcadia-planitia | 1.3 | top 36.3% | medium | terrain |
| Mistastin crater, Labrador, Canada | tuning | moon-malapert-massif | 5.7 | top 28.1% | medium | dryness |
| Mistastin crater, Labrador, Canada | tuning | moon-mons-mouton | 5.8 | top 27.9% | medium | dryness |
| Mistastin crater, Labrador, Canada | tuning | moon-haworth | 5.8 | top 28.0% | medium | dryness |
| Mistastin crater, Labrador, Canada | tuning | moon-shackleton-rim | 5.7 | top 28.0% | medium | dryness |


# SBATS validation report

**Status: FINAL.** Sigmas and weights were frozen on 2026-11-14. The hold-out numbers are the honest ones: those sites were never used to tune.

Generated 2026-11-15T04:53:07.126Z by `npx tsx validation/validate.ts ice`. Preset: Ice.
Earth grid: 91894 land cells at 0.5 degrees, built 2026-11-14T13:02:33Z.
Split: 24 tuning sites and 10 hold-out sites, seed 20261114 (validation/tuning/split.json).

Numbers are reported as they came out. Indonesian candidate sites are not part of this report.

## Headline: tuning set against hold-out set

| Measure | Tuning set | Holdout set | Both together |
| --- | --- | --- | --- |
| Known sites / negative controls | 20 / 4 | 8 / 2 | 28 / 6 |
| ROC AUC (strict) | 0.881 | 0.979 | 0.901 |
| ROC AUC (scored sites only) | 0.881 | 0.979 | 0.901 |
| Known analogs in the top 10% of Earth cells | 17.5% | 16.7% | 17.3% |
| Mean percentile of known analogs | 0.707 | 0.678 | 0.699 |
| Known sites with no score | 0 | 0 | 0 |
| Mean score, known / negative | 5.2 / 0.2 | 5.3 / 0 | 5.2 / 0.1 |
| Most common limiting factor | temperature (75.0%) | temperature (66.7%) | temperature (72.6%) |

## Moon targets against Mars targets

Tuning set:

| Measure | Moon targets | Mars targets |
| --- | --- | --- |
| Known sites / negative controls | 7 / 4 | 15 / 4 |
| ROC AUC (strict) | 0.804 | 0.892 |
| ROC AUC (scored sites only) | 0.804 | 0.892 |
| Known analogs in the top 10% of Earth cells | 0.0% | 23.3% |
| Mean percentile of known analogs | 0.615 | 0.721 |
| Known sites with no score | 0 | 0 |
| Mean score, known / negative | 2.5 / 0.2 | 5.9 / 0.3 |
| Most common limiting factor | temperature (71.4%) | temperature (80.0%) |

Holdout set:

| Measure | Moon targets | Mars targets |
| --- | --- | --- |
| Known sites / negative controls | 3 / 2 | 6 / 2 |
| ROC AUC (strict) | 1 | 0.972 |
| ROC AUC (scored sites only) | 1 | 0.972 |
| Known analogs in the top 10% of Earth cells | 0.0% | 22.2% |
| Mean percentile of known analogs | 0.629 | 0.725 |
| Known sites with no score | 0 | 0 |
| Mean score, known / negative | 3.5 / 0 | 6.5 / 0 |
| Most common limiting factor | bareGround (66.7%) | temperature (88.9%) |

How to read the measures:

- `positiveCase`: One known analog site scored against one target listed in its analogFor. A site listed for several targets is split equally between them, so every site counts once in each number.
- `rocAuc`: Share of (positive case, negative control) pairs, both scored against the same target, in which the known analog has the higher score. Ties count half. A site with no score counts as below every scored site. 0.5 is chance, 1.0 is perfect.
- `rocAucScoredOnly`: The same, using only pairs where both sites have a score.
- `top10Share`: Share of known analogs whose cell is in the top 10% of all scored Earth cells for their matching target. Unscored cases count as not in the top 10%.
- `meanPercentile`: Mean share of scored Earth cells that a known analog beats or ties, over scored cases. 0.5 is chance. This compares known analogs with every land cell, a harder test than the negative controls.
- `snapping`: Each site is scored at the nearest earth.json cell centre. Sites more than 60 km from any cell are unscored.
- `candidates`: Indonesian candidate sites are never part of tuning or validation. Their scores are reported separately.

## Warnings

- earth.json was rebuilt (2026-11-14T13:02:33Z) after the freeze (built 2026-11-14T11:56:02Z). The frozen values were not retuned, by rule.

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
| Betung Kerihun National Park, Kalimantan, Indonesia | tuning | top 71.1% | mars-arcadia-planitia | 0.0 |
| Jau National Park, central Amazon, Brazil | holdout | top 67.0% | mars-arcadia-planitia | 0.0 |
| Salonga National Park, Congo basin, DR Congo | tuning | top 64.2% | mars-arcadia-planitia | 0.0 |
| Jakarta, Indonesia | tuning | top 61.1% | mars-arcadia-planitia | 0.0 |
| Singapore | holdout | top 64.5% | mars-arcadia-planitia | 0.0 |
| Paris, France | tuning | top 38.2% | mars-arcadia-planitia | 0.6 |

## Known analogs, scored against their own targets

| Site | Set | Target | Score | Rank among Earth cells | Confidence | Limiting factor |
| --- | --- | --- | --- | --- | --- | --- |
| Atacama Desert hyperarid core (Yungay), Chile | tuning | mars-jezero | 6.7 | top 17.2% | high | temperature |
| Atacama Desert hyperarid core (Yungay), Chile | tuning | mars-gale | 9.2 | top 13.7% | high | temperature |
| Haughton impact structure, Devon Island, Canada | tuning | mars-jezero | 11.9 | top 2.7% | high | temperature |
| Haughton impact structure, Devon Island, Canada | tuning | mars-gale | 14.4 | top 3.0% | high | temperature |
| Haughton impact structure, Devon Island, Canada | tuning | mars-arcadia-planitia | 14.3 | top 1.2% | low | temperature |
| Beacon Valley, McMurdo Dry Valleys, Antarctica | tuning | mars-arcadia-planitia | 0.2 | top 46.3% | low | terrain |
| Don Juan Pond, Wright Valley, Antarctica | tuning | mars-arcadia-planitia | 0.0 | top 58.2% | low | terrain |
| Mauna Kea, Hawaii, USA | tuning | moon-malapert-massif | 0.0 | top 62.8% | medium | dryness |
| Mauna Kea, Hawaii, USA | tuning | moon-mons-mouton | 0.0 | top 62.6% | medium | dryness |
| Mauna Kea, Hawaii, USA | tuning | moon-haworth | 0.0 | top 62.7% | medium | dryness |
| Mauna Kea, Hawaii, USA | tuning | moon-shackleton-rim | 0.0 | top 62.7% | medium | dryness |
| Kilauea, Hawaii, USA | tuning | moon-malapert-massif | 0.0 | top 64.2% | low | temperature |
| Kilauea, Hawaii, USA | tuning | moon-mons-mouton | 0.0 | top 64.1% | low | temperature |
| Kilauea, Hawaii, USA | tuning | moon-haworth | 0.0 | top 64.2% | low | temperature |
| Kilauea, Hawaii, USA | tuning | moon-shackleton-rim | 0.0 | top 64.1% | low | temperature |
| Kilauea, Hawaii, USA | tuning | mars-jezero | 0.0 | top 63.5% | low | temperature |
| Kilauea, Hawaii, USA | tuning | mars-gale | 0.0 | top 64.2% | low | temperature |
| Craters of the Moon, Idaho, USA | tuning | mars-jezero | 15.4 | top 0.7% | high | temperature |
| Craters of the Moon, Idaho, USA | tuning | mars-gale | 8.0 | top 18.1% | high | temperature |
| Timanfaya, Lanzarote, Spain | tuning | moon-malapert-massif | 1.8 | top 36.1% | low | temperature |
| Timanfaya, Lanzarote, Spain | tuning | moon-mons-mouton | 1.9 | top 35.6% | low | temperature |
| Timanfaya, Lanzarote, Spain | tuning | moon-haworth | 1.8 | top 36.0% | low | temperature |
| Timanfaya, Lanzarote, Spain | tuning | moon-shackleton-rim | 1.8 | top 35.8% | low | temperature |
| Timanfaya, Lanzarote, Spain | tuning | mars-jezero | 2.4 | top 37.6% | low | temperature |
| Timanfaya, Lanzarote, Spain | tuning | mars-gale | 2.1 | top 42.5% | low | temperature |
| Noerdlinger Ries impact crater, Germany | holdout | moon-malapert-massif | 0.3 | top 51.4% | medium | bareGround |
| Noerdlinger Ries impact crater, Germany | holdout | moon-mons-mouton | 0.3 | top 51.4% | medium | bareGround |
| Noerdlinger Ries impact crater, Germany | holdout | moon-haworth | 0.3 | top 51.4% | medium | bareGround |
| Noerdlinger Ries impact crater, Germany | holdout | moon-shackleton-rim | 0.3 | top 51.4% | medium | bareGround |
| Askja caldera, Iceland highlands | holdout | moon-malapert-massif | 9.8 | top 11.5% | medium | temperature |
| Askja caldera, Iceland highlands | holdout | moon-mons-mouton | 10.0 | top 11.3% | medium | temperature |
| Askja caldera, Iceland highlands | holdout | moon-haworth | 9.8 | top 11.5% | medium | temperature |
| Askja caldera, Iceland highlands | holdout | moon-shackleton-rim | 10.0 | top 11.3% | medium | temperature |
| Askja caldera, Iceland highlands | holdout | mars-jezero | 8.2 | top 11.4% | high | temperature |
| Askja caldera, Iceland highlands | holdout | mars-gale | 4.3 | top 33.9% | high | temperature |
| Mars Desert Research Station, Hanksville, Utah, USA | holdout | mars-jezero | 11.2 | top 3.6% | high | temperature |
| Mars Desert Research Station, Hanksville, Utah, USA | holdout | mars-gale | 14.3 | top 3.0% | high | temperature |
| Rio Tinto, Huelva, Spain | tuning | mars-jezero | 1.6 | top 42.2% | high | temperature |
| Rio Tinto, Huelva, Spain | tuning | mars-gale | 2.4 | top 41.6% | high | temperature |
| Dallol, Danakil Depression, Ethiopia | holdout | mars-jezero | 4.6 | top 27.4% | high | temperature |
| Dallol, Danakil Depression, Ethiopia | holdout | mars-gale | 5.8 | top 28.0% | high | temperature |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | tuning | moon-malapert-massif | 4.0 | top 23.1% | medium | temperature |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | tuning | moon-mons-mouton | 4.1 | top 22.9% | medium | temperature |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | tuning | moon-haworth | 4.0 | top 23.0% | medium | temperature |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | tuning | moon-shackleton-rim | 4.1 | top 22.9% | medium | temperature |
| Meteor Crater, Arizona, USA | tuning | moon-malapert-massif | 6.3 | top 16.9% | medium | temperature |
| Meteor Crater, Arizona, USA | tuning | moon-mons-mouton | 6.4 | top 16.7% | medium | temperature |
| Meteor Crater, Arizona, USA | tuning | moon-haworth | 6.3 | top 16.9% | medium | temperature |
| Meteor Crater, Arizona, USA | tuning | moon-shackleton-rim | 6.4 | top 16.7% | medium | temperature |
| Ubehebe Crater, Death Valley, California, USA | tuning | mars-jezero | 10.7 | top 4.5% | high | temperature |
| Ubehebe Crater, Death Valley, California, USA | tuning | mars-gale | 13.9 | top 3.5% | high | temperature |
| North Pole Dome, Pilbara, Australia | holdout | mars-jezero | 3.9 | top 30.9% | high | temperature |
| North Pole Dome, Pilbara, Australia | holdout | mars-gale | 5.7 | top 28.4% | high | temperature |
| Arkaroola, Flinders Ranges, Australia | tuning | mars-jezero | 7.6 | top 13.5% | high | temperature |
| Arkaroola, Flinders Ranges, Australia | tuning | mars-gale | 6.6 | top 24.3% | high | temperature |
| Qaidam Basin, China | tuning | mars-jezero | 12.5 | top 2.1% | high | temperature |
| Qaidam Basin, China | tuning | mars-gale | 17.0 | top 1.2% | high | temperature |
| Makhtesh Ramon, Negev, Israel | tuning | mars-jezero | 8.4 | top 10.7% | high | temperature |
| Makhtesh Ramon, Negev, Israel | tuning | mars-gale | 10.3 | top 10.4% | high | temperature |
| Lonar crater, Maharashtra, India | holdout | mars-jezero | 1.1 | top 45.4% | high | temperature |
| Lonar crater, Maharashtra, India | holdout | mars-gale | 0.7 | top 51.8% | high | temperature |
| Tso Kar, Ladakh, India | holdout | mars-jezero | 2.5 | top 37.5% | high | terrain |
| Tso Kar, Ladakh, India | holdout | mars-gale | 24.9 | top 0.3% | high | temperature |
| Tso Kar, Ladakh, India | holdout | mars-arcadia-planitia | 0.0 | top 61.2% | low | terrain |
| Makgadikgadi Pans, Botswana | tuning | mars-jezero | 4.1 | top 29.9% | high | temperature |
| Makgadikgadi Pans, Botswana | tuning | mars-gale | 5.8 | top 27.7% | high | temperature |
| Teide and Las Canadas, Tenerife, Spain | tuning | mars-jezero | 0.8 | top 48.2% | high | temperature |
| Teide and Las Canadas, Tenerife, Spain | tuning | mars-gale | 1.9 | top 43.5% | high | temperature |
| Mount Etna, Sicily, Italy | holdout | moon-malapert-massif | 0.4 | top 48.6% | medium | bareGround |
| Mount Etna, Sicily, Italy | holdout | moon-mons-mouton | 0.4 | top 48.3% | medium | bareGround |
| Mount Etna, Sicily, Italy | holdout | moon-haworth | 0.4 | top 48.5% | medium | bareGround |
| Mount Etna, Sicily, Italy | holdout | moon-shackleton-rim | 0.4 | top 48.3% | medium | bareGround |
| Sudbury Basin, Ontario, Canada | tuning | moon-malapert-massif | 0.6 | top 46.2% | medium | bareGround |
| Sudbury Basin, Ontario, Canada | tuning | moon-mons-mouton | 0.6 | top 46.2% | medium | bareGround |
| Sudbury Basin, Ontario, Canada | tuning | moon-haworth | 0.6 | top 46.2% | medium | bareGround |
| Sudbury Basin, Ontario, Canada | tuning | moon-shackleton-rim | 0.6 | top 46.3% | medium | bareGround |
| Kangerlussuaq, Greenland | tuning | mars-arcadia-planitia | 1.5 | top 31.4% | low | terrain |
| Mistastin crater, Labrador, Canada | tuning | moon-malapert-massif | 5.0 | top 20.3% | medium | temperature |
| Mistastin crater, Labrador, Canada | tuning | moon-mons-mouton | 5.0 | top 20.4% | medium | temperature |
| Mistastin crater, Labrador, Canada | tuning | moon-haworth | 5.0 | top 20.3% | medium | temperature |
| Mistastin crater, Labrador, Canada | tuning | moon-shackleton-rim | 5.0 | top 20.4% | medium | temperature |


# Geology dimension: where the number comes from

Generated 2026-11-15T04:44:55.827Z by `npx tsx validation/geology.ts`. Earth grid built 2026-11-14T13:02:33Z. Score frozen 2026-11-14; nothing here changes it.
The cause, in words, is in `validation/purposes/GEOLOGY.md`. Percentiles are tie-fair (0.5 is chance).

## 1. The dimension has three possible values per target

Geology similarity is 1 for the same rock class, 0.6 for a related class and 0.15 for an unrelated one. Every cell therefore gets one of three percentiles. Of 91894 land cells, 5618 have no rock class.

| Target | Rock class | Cells: same | related | unrelated | Percentile if same | if related | if unrelated |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | 4 Basic plutonic rocks | 0.7% | 3.3% | 96.1% | 1.00 | 0.98 | 0.48 |
| moon-mons-mouton | 4 Basic plutonic rocks | 0.7% | 3.3% | 96.1% | 1.00 | 0.98 | 0.48 |
| moon-haworth | 4 Basic plutonic rocks | 0.7% | 3.3% | 96.1% | 1.00 | 0.98 | 0.48 |
| moon-shackleton-rim | 4 Basic plutonic rocks | 0.7% | 3.3% | 96.1% | 1.00 | 0.98 | 0.48 |
| mars-jezero | 2 Basic volcanic rocks | 2.9% | 2.6% | 94.5% | 0.99 | 0.96 | 0.47 |
| mars-gale | 3 Siliciclastic sedimentary rocks | 13.4% | 30.4% | 56.2% | 0.93 | 0.71 | 0.28 |
| mars-arcadia-planitia | no rock class | | | | | | |

## 2. Where the known analogs land

One pair is one site against one of the targets it is listed for.

| Group | Sites | Mean percentile | Spread (SD) | Standard error | Pairs by level |
| --- | --- | --- | --- | --- | --- |
| Cited for geology | 23 (19 comparable) | 0.59 | 0.15 | 0.03 | 6 same, 13 related, 35 unrelated, 15 no data |
| Other known sites | 5 (4 comparable) | 0.56 | 0.06 | 0.03 | 0 same, 3 related, 7 unrelated, 2 no data |

Sites cited for geology, by the body of the target:

| Targets | Pairs by level | Mean percentile of the pairs |
| --- | --- | --- |
| Moon | 0 same, 8 related, 20 unrelated, 8 no data | 0.62 |
| Mars | 6 same, 5 related, 15 unrelated, 7 no data | 0.59 |

For scale: over the same sites and targets, the mean percentile would be 0.97 if every pair were the same class, 0.89 if every pair were related and 0.42 if every pair were unrelated.

| Site | Cited for geology | Rock class of its cell | Against its targets | Mean percentile |
| --- | --- | --- | --- | --- |
| Atacama Desert hyperarid core (Yungay), Chile | yes | 13 Intermediate plutonic rocks | mars-jezero: unrelated; mars-gale: unrelated | 0.38 |
| Haughton impact structure, Devon Island, Canada | yes | 5 Mixed sedimentary rocks | mars-jezero: unrelated; mars-gale: related; mars-arcadia-planitia: no data | 0.59 |
| Beacon Valley, McMurdo Dry Valleys, Antarctica | no | 3 Siliciclastic sedimentary rocks | mars-arcadia-planitia: no data | n/a |
| Don Juan Pond, Wright Valley, Antarctica | yes | 3 Siliciclastic sedimentary rocks | mars-arcadia-planitia: no data | n/a |
| Mauna Kea, Hawaii, USA | yes | 10 Intermediate volcanic rocks | moon-malapert-massif: unrelated; moon-mons-mouton: unrelated; moon-haworth: unrelated; moon-shackleton-rim: unrelated | 0.48 |
| Kilauea, Hawaii, USA | yes | no rock class | moon-malapert-massif: no data; moon-mons-mouton: no data; moon-haworth: no data; moon-shackleton-rim: no data; mars-jezero: no data; mars-gale: no data | n/a |
| Craters of the Moon, Idaho, USA | yes | 2 Basic volcanic rocks | mars-jezero: same; mars-gale: unrelated | 0.63 |
| Timanfaya, Lanzarote, Spain | yes | no rock class | moon-malapert-massif: no data; moon-mons-mouton: no data; moon-haworth: no data; moon-shackleton-rim: no data; mars-jezero: no data; mars-gale: no data | n/a |
| Noerdlinger Ries impact crater, Germany | yes | 3 Siliciclastic sedimentary rocks | moon-malapert-massif: unrelated; moon-mons-mouton: unrelated; moon-haworth: unrelated; moon-shackleton-rim: unrelated | 0.48 |
| Askja caldera, Iceland highlands | yes | 2 Basic volcanic rocks | moon-malapert-massif: related; moon-mons-mouton: related; moon-haworth: related; moon-shackleton-rim: related; mars-jezero: same; mars-gale: unrelated | 0.86 |
| Mars Desert Research Station, Hanksville, Utah, USA | no | 1 Unconsolidated sediments | mars-jezero: unrelated; mars-gale: related | 0.59 |
| Rio Tinto, Huelva, Spain | yes | 3 Siliciclastic sedimentary rocks | mars-jezero: unrelated; mars-gale: same | 0.70 |
| Dallol, Danakil Depression, Ethiopia | yes | 1 Unconsolidated sediments | mars-jezero: unrelated; mars-gale: related | 0.59 |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | no | 6 Carbonate sedimentary rocks | moon-malapert-massif: unrelated; moon-mons-mouton: unrelated; moon-haworth: unrelated; moon-shackleton-rim: unrelated | 0.48 |
| Meteor Crater, Arizona, USA | yes | 2 Basic volcanic rocks | moon-malapert-massif: related; moon-mons-mouton: related; moon-haworth: related; moon-shackleton-rim: related | 0.98 |
| Ubehebe Crater, Death Valley, California, USA | yes | 1 Unconsolidated sediments | mars-jezero: unrelated; mars-gale: related | 0.59 |
| North Pole Dome, Pilbara, Australia | yes | 3 Siliciclastic sedimentary rocks | mars-jezero: unrelated; mars-gale: same | 0.70 |
| Arkaroola, Flinders Ranges, Australia | yes | 9 Acid plutonic rocks | mars-jezero: unrelated; mars-gale: unrelated | 0.38 |
| Qaidam Basin, China | yes | 1 Unconsolidated sediments | mars-jezero: unrelated; mars-gale: related | 0.59 |
| Makhtesh Ramon, Negev, Israel | no | 5 Mixed sedimentary rocks | mars-jezero: unrelated; mars-gale: related | 0.59 |
| Lonar crater, Maharashtra, India | yes | 2 Basic volcanic rocks | mars-jezero: same; mars-gale: unrelated | 0.63 |
| Tso Kar, Ladakh, India | no | 5 Mixed sedimentary rocks | mars-jezero: unrelated; mars-gale: related; mars-arcadia-planitia: no data | 0.59 |
| Makgadikgadi Pans, Botswana | yes | 1 Unconsolidated sediments | mars-jezero: unrelated; mars-gale: related | 0.59 |
| Teide and Las Canadas, Tenerife, Spain | yes | 2 Basic volcanic rocks | mars-jezero: same; mars-gale: unrelated | 0.63 |
| Mount Etna, Sicily, Italy | yes | 5 Mixed sedimentary rocks | moon-malapert-massif: unrelated; moon-mons-mouton: unrelated; moon-haworth: unrelated; moon-shackleton-rim: unrelated | 0.48 |
| Sudbury Basin, Ontario, Canada | yes | 9 Acid plutonic rocks | moon-malapert-massif: unrelated; moon-mons-mouton: unrelated; moon-haworth: unrelated; moon-shackleton-rim: unrelated | 0.48 |
| Kangerlussuaq, Greenland | yes | 8 Metamorphics | mars-arcadia-planitia: no data | n/a |
| Mistastin crater, Labrador, Canada | yes | 9 Acid plutonic rocks | moon-malapert-massif: unrelated; moon-mons-mouton: unrelated; moon-haworth: unrelated; moon-shackleton-rim: unrelated | 0.48 |

## 3. Site-level result: the rock mapped at the site against the rock class of the cell

**Separate from every number above and from the frozen score.** `data/sites.json` (Session B) gives, for a few named sites, the rock type of the regional map unit at the site, or the major rock type of the whole volcano. Five known analogs are covered: too few to validate anything, enough to show what the grid does to a named site.

Of the 9 known analogs: the cell and the site carry the same class at 0, a different class at 2, and 7 cannot be compared because one side has no class.
Mean geology percentile of those sites against their own targets: 0.51 with the cell's class, 0.77 with the site's class.

### Known analogs (against the targets they are listed for)

| Site | Rock named by the source | Site class (scale) | Cell class | Target | With the cell class | With the site class |
| --- | --- | --- | --- | --- | --- | --- |
| Mauna Kea, Hawaii, USA | Scoria cones | 2 Basic volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-malapert-massif (listed) | unrelated, p 0.48 | related, p 0.98 |
| Mauna Kea, Hawaii, USA | Scoria cones | 2 Basic volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-mons-mouton (listed) | unrelated, p 0.48 | related, p 0.98 |
| Mauna Kea, Hawaii, USA | Scoria cones | 2 Basic volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-haworth (listed) | unrelated, p 0.48 | related, p 0.98 |
| Mauna Kea, Hawaii, USA | Scoria cones | 2 Basic volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-shackleton-rim (listed) | unrelated, p 0.48 | related, p 0.98 |
| Kilauea, Hawaii, USA | basalt | 2 Basic volcanic rocks (site) | no rock class | moon-malapert-massif (listed) | no data | related, p 0.98 |
| Kilauea, Hawaii, USA | basalt | 2 Basic volcanic rocks (site) | no rock class | moon-mons-mouton (listed) | no data | related, p 0.98 |
| Kilauea, Hawaii, USA | basalt | 2 Basic volcanic rocks (site) | no rock class | moon-haworth (listed) | no data | related, p 0.98 |
| Kilauea, Hawaii, USA | basalt | 2 Basic volcanic rocks (site) | no rock class | moon-shackleton-rim (listed) | no data | related, p 0.98 |
| Kilauea, Hawaii, USA | basalt | 2 Basic volcanic rocks (site) | no rock class | mars-jezero (listed) | no data | same, p 0.98 |
| Kilauea, Hawaii, USA | basalt | 2 Basic volcanic rocks (site) | no rock class | mars-gale (listed) | no data | unrelated, p 0.28 |
| Atacama Desert hyperarid core (Yungay), Chile | Granite | 9 Acid plutonic rocks (site) | 13 Intermediate plutonic rocks | mars-jezero (listed) | unrelated, p 0.47 | unrelated, p 0.47 |
| Atacama Desert hyperarid core (Yungay), Chile | Granite | 9 Acid plutonic rocks (site) | 13 Intermediate plutonic rocks | mars-gale (listed) | unrelated, p 0.28 | unrelated, p 0.28 |
| Haughton impact structure, Devon Island, Canada | sedimentary | no rock class (site) | 5 Mixed sedimentary rocks | mars-jezero (listed) | unrelated, p 0.47 | no data |
| Haughton impact structure, Devon Island, Canada | sedimentary | no rock class (site) | 5 Mixed sedimentary rocks | mars-gale (listed) | related, p 0.71 | no data |
| Timanfaya, Lanzarote, Spain | mafic volcanic rocks | 2 Basic volcanic rocks (site) | no rock class | moon-malapert-massif (listed) | no data | related, p 0.98 |
| Timanfaya, Lanzarote, Spain | mafic volcanic rocks | 2 Basic volcanic rocks (site) | no rock class | moon-mons-mouton (listed) | no data | related, p 0.98 |
| Timanfaya, Lanzarote, Spain | mafic volcanic rocks | 2 Basic volcanic rocks (site) | no rock class | moon-haworth (listed) | no data | related, p 0.98 |
| Timanfaya, Lanzarote, Spain | mafic volcanic rocks | 2 Basic volcanic rocks (site) | no rock class | moon-shackleton-rim (listed) | no data | related, p 0.98 |
| Timanfaya, Lanzarote, Spain | mafic volcanic rocks | 2 Basic volcanic rocks (site) | no rock class | mars-jezero (listed) | no data | same, p 0.98 |
| Timanfaya, Lanzarote, Spain | mafic volcanic rocks | 2 Basic volcanic rocks (site) | no rock class | mars-gale (listed) | no data | unrelated, p 0.28 |
| Dallol, Danakil Depression, Ethiopia | volcanic | no rock class (site) | 1 Unconsolidated sediments | mars-jezero (listed) | unrelated, p 0.47 | no data |
| Dallol, Danakil Depression, Ethiopia | volcanic | no rock class (site) | 1 Unconsolidated sediments | mars-gale (listed) | related, p 0.71 | no data |
| Dasht-e Lut (Lut Desert), Iran | no data | no rock class (site) | 1 Unconsolidated sediments | none listed | | |
| Salar de Uyuni salt flat, Bolivia | Evaporite | no rock class (site) | 14 Evaporites | none listed | | |
| Tunupa volcano, north shore of Salar de Uyuni, Bolivia | Andesite and related volcanic | no rock class (site) | 10 Intermediate volcanic rocks | none listed | | |

### Candidate sites (against every target with a rock class; never part of a validation number)

| Site | Rock named by the source | Site class (scale) | Cell class | Target | With the cell class | With the site class |
| --- | --- | --- | --- | --- | --- | --- |
| Kawah Ijen, East Java, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 1 Unconsolidated sediments | moon-malapert-massif | unrelated, p 0.48 | unrelated, p 0.48 |
| Kawah Ijen, East Java, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 1 Unconsolidated sediments | moon-mons-mouton | unrelated, p 0.48 | unrelated, p 0.48 |
| Kawah Ijen, East Java, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 1 Unconsolidated sediments | moon-haworth | unrelated, p 0.48 | unrelated, p 0.48 |
| Kawah Ijen, East Java, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 1 Unconsolidated sediments | moon-shackleton-rim | unrelated, p 0.48 | unrelated, p 0.48 |
| Kawah Ijen, East Java, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 1 Unconsolidated sediments | mars-jezero | unrelated, p 0.47 | related, p 0.96 |
| Kawah Ijen, East Java, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 1 Unconsolidated sediments | mars-gale (listed) | related, p 0.71 | unrelated, p 0.28 |
| Mount Merapi and the Opak River, Central Java, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-malapert-massif | unrelated, p 0.48 | unrelated, p 0.48 |
| Mount Merapi and the Opak River, Central Java, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-mons-mouton | unrelated, p 0.48 | unrelated, p 0.48 |
| Mount Merapi and the Opak River, Central Java, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-haworth | unrelated, p 0.48 | unrelated, p 0.48 |
| Mount Merapi and the Opak River, Central Java, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-shackleton-rim | unrelated, p 0.48 | unrelated, p 0.48 |
| Mount Merapi and the Opak River, Central Java, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 10 Intermediate volcanic rocks | mars-jezero | related, p 0.96 | related, p 0.96 |
| Mount Merapi and the Opak River, Central Java, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 10 Intermediate volcanic rocks | mars-gale (listed) | unrelated, p 0.28 | unrelated, p 0.28 |
| Gua Lawa lava tube, Purbalingga, Central Java, Indonesia | Basalt / Picro-Basalt | 2 Basic volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-malapert-massif | unrelated, p 0.48 | related, p 0.98 |
| Gua Lawa lava tube, Purbalingga, Central Java, Indonesia | Basalt / Picro-Basalt | 2 Basic volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-mons-mouton | unrelated, p 0.48 | related, p 0.98 |
| Gua Lawa lava tube, Purbalingga, Central Java, Indonesia | Basalt / Picro-Basalt | 2 Basic volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-haworth | unrelated, p 0.48 | related, p 0.98 |
| Gua Lawa lava tube, Purbalingga, Central Java, Indonesia | Basalt / Picro-Basalt | 2 Basic volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-shackleton-rim | unrelated, p 0.48 | related, p 0.98 |
| Gua Lawa lava tube, Purbalingga, Central Java, Indonesia | Basalt / Picro-Basalt | 2 Basic volcanic rocks (volcano) | 10 Intermediate volcanic rocks | mars-jezero | related, p 0.96 | same, p 0.98 |
| Gua Lawa lava tube, Purbalingga, Central Java, Indonesia | Basalt / Picro-Basalt | 2 Basic volcanic rocks (volcano) | 10 Intermediate volcanic rocks | mars-gale | unrelated, p 0.28 | unrelated, p 0.28 |
| Goa Pandan basalt lava cave, East Lampung, Sumatra, Indonesia | basalt | 2 Basic volcanic rocks (site) | 2 Basic volcanic rocks | moon-malapert-massif | related, p 0.98 | related, p 0.98 |
| Goa Pandan basalt lava cave, East Lampung, Sumatra, Indonesia | basalt | 2 Basic volcanic rocks (site) | 2 Basic volcanic rocks | moon-mons-mouton | related, p 0.98 | related, p 0.98 |
| Goa Pandan basalt lava cave, East Lampung, Sumatra, Indonesia | basalt | 2 Basic volcanic rocks (site) | 2 Basic volcanic rocks | moon-haworth | related, p 0.98 | related, p 0.98 |
| Goa Pandan basalt lava cave, East Lampung, Sumatra, Indonesia | basalt | 2 Basic volcanic rocks (site) | 2 Basic volcanic rocks | moon-shackleton-rim | related, p 0.98 | related, p 0.98 |
| Goa Pandan basalt lava cave, East Lampung, Sumatra, Indonesia | basalt | 2 Basic volcanic rocks (site) | 2 Basic volcanic rocks | mars-jezero | same, p 0.98 | same, p 0.98 |
| Goa Pandan basalt lava cave, East Lampung, Sumatra, Indonesia | basalt | 2 Basic volcanic rocks (site) | 2 Basic volcanic rocks | mars-gale | unrelated, p 0.28 | unrelated, p 0.28 |
| Kesaksak lava tube, Batur caldera, Bali, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-malapert-massif | unrelated, p 0.48 | unrelated, p 0.48 |
| Kesaksak lava tube, Batur caldera, Bali, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-mons-mouton | unrelated, p 0.48 | unrelated, p 0.48 |
| Kesaksak lava tube, Batur caldera, Bali, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-haworth | unrelated, p 0.48 | unrelated, p 0.48 |
| Kesaksak lava tube, Batur caldera, Bali, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-shackleton-rim | unrelated, p 0.48 | unrelated, p 0.48 |
| Kesaksak lava tube, Batur caldera, Bali, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 10 Intermediate volcanic rocks | mars-jezero | related, p 0.96 | related, p 0.96 |
| Kesaksak lava tube, Batur caldera, Bali, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 10 Intermediate volcanic rocks | mars-gale | unrelated, p 0.28 | unrelated, p 0.28 |
| Maros-Pangkep karst caves, South Sulawesi, Indonesia | no data | no rock class (site) | 10 Intermediate volcanic rocks | moon-malapert-massif | unrelated, p 0.48 | no data |
| Maros-Pangkep karst caves, South Sulawesi, Indonesia | no data | no rock class (site) | 10 Intermediate volcanic rocks | moon-mons-mouton | unrelated, p 0.48 | no data |
| Maros-Pangkep karst caves, South Sulawesi, Indonesia | no data | no rock class (site) | 10 Intermediate volcanic rocks | moon-haworth | unrelated, p 0.48 | no data |
| Maros-Pangkep karst caves, South Sulawesi, Indonesia | no data | no rock class (site) | 10 Intermediate volcanic rocks | moon-shackleton-rim | unrelated, p 0.48 | no data |
| Maros-Pangkep karst caves, South Sulawesi, Indonesia | no data | no rock class (site) | 10 Intermediate volcanic rocks | mars-jezero | related, p 0.96 | no data |
| Maros-Pangkep karst caves, South Sulawesi, Indonesia | no data | no rock class (site) | 10 Intermediate volcanic rocks | mars-gale | unrelated, p 0.28 | no data |
| Mount Tambora caldera, Sumbawa, Indonesia | Trachybasalt / Tephrite Basanite | 2 Basic volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-malapert-massif | unrelated, p 0.48 | related, p 0.98 |
| Mount Tambora caldera, Sumbawa, Indonesia | Trachybasalt / Tephrite Basanite | 2 Basic volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-mons-mouton | unrelated, p 0.48 | related, p 0.98 |
| Mount Tambora caldera, Sumbawa, Indonesia | Trachybasalt / Tephrite Basanite | 2 Basic volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-haworth | unrelated, p 0.48 | related, p 0.98 |
| Mount Tambora caldera, Sumbawa, Indonesia | Trachybasalt / Tephrite Basanite | 2 Basic volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-shackleton-rim | unrelated, p 0.48 | related, p 0.98 |
| Mount Tambora caldera, Sumbawa, Indonesia | Trachybasalt / Tephrite Basanite | 2 Basic volcanic rocks (volcano) | 10 Intermediate volcanic rocks | mars-jezero | related, p 0.96 | same, p 0.98 |
| Mount Tambora caldera, Sumbawa, Indonesia | Trachybasalt / Tephrite Basanite | 2 Basic volcanic rocks (volcano) | 10 Intermediate volcanic rocks | mars-gale | unrelated, p 0.28 | unrelated, p 0.28 |
| Mount Batur black lava fields, Bali, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-malapert-massif | unrelated, p 0.48 | unrelated, p 0.48 |
| Mount Batur black lava fields, Bali, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-mons-mouton | unrelated, p 0.48 | unrelated, p 0.48 |
| Mount Batur black lava fields, Bali, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-haworth | unrelated, p 0.48 | unrelated, p 0.48 |
| Mount Batur black lava fields, Bali, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 10 Intermediate volcanic rocks | moon-shackleton-rim | unrelated, p 0.48 | unrelated, p 0.48 |
| Mount Batur black lava fields, Bali, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 10 Intermediate volcanic rocks | mars-jezero | related, p 0.96 | related, p 0.96 |
| Mount Batur black lava fields, Bali, Indonesia | Andesite / Basaltic Andesite | 10 Intermediate volcanic rocks (volcano) | 10 Intermediate volcanic rocks | mars-gale | unrelated, p 0.28 | unrelated, p 0.28 |


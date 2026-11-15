# Benchmarks: established analogs and our candidates, scored the same way

Written 2026-11-15T06:49:23.984Z by `npx tsx validation/benchmarks.ts`. Data file for the app: `data/benchmarks.json`.

- One procedure for every site: site-scale terrain, vegetation and rock; the 0.5 degree cell's temperature and rainfall; the target's terrain measured in a window of the site's size.
- "Best" is the best of all targets, chosen after the fact, and flatters. "Median" is the typical target.
- Known analogs are those for which fine-scale data was built. They are a yardstick, not a validation set.
- Similarities and scores use the formula, tolerances and weights frozen on 2026-11-14. Nothing was tuned on these sites.
- A footprint holds 16 to 256 terrain posts. Small samples.

## Groups

Mean similarity per dimension over all 8 targets, site scale. 8 candidate sites, 13 known analogs.

| Dimension | Candidates | Known analogs |
| --- | --- | --- |
| Geology | 0.44 | 0.45 |
| Terrain | 0.28 | 0.41 |
| Climate | 0.00 | 0.10 |
| Bare ground | 0.01 | 0.70 |
| Sunlight | 0.40 | 0.39 |

Purpose scores, 0 to 100, mean over sites of the typical (median) target and of the best target:

| Purpose | Candidates, typical | Known, typical | Candidates, best | Known, best |
| --- | --- | --- | --- | --- |
| Instrument and geology testing | 34.3 | 40.7 | 77.1 | 70.0 |
| Rover mobility | 0.1 | 40.6 | 3.7 | 74.7 |
| Ice and resources | 0.0 | 4.7 | 0.0 | 10.1 |
| Astrobiology | 0.0 | 13.6 | 0.0 | 16.3 |
| Full base rehearsal | 0.0 | 9.5 | 0.1 | 19.7 |

## Wind, dust and ice (added after the freeze, never in the score)

Earth side: NASA POWER wind speed at 10 m and aerosol optical depth, and the permafrost share of Obu et al. 2018, all for the 0.5 degree cell. Target side: the Mars Climate Database for wind and dust on Mars, zero on the airless Moon, and the share of ice-stable ground from Diviner at the lunar poles (data/target_environment.json). Mean similarity over the targets that have a value:

| Dimension | Candidates | Known analogs |
| --- | --- | --- |
| Wind | 0.49 | 0.31 |
| Dust and aerosol | 0.20 | 0.45 |
| Ice and permafrost | n/a | 0.65 |

| Site | Kind | Wind, m/s | Aerosol optical depth | Permafrost share | Wind against Jezero / Gale / the Moon | Dust against Jezero / Gale / the Moon |
| --- | --- | --- | --- | --- | --- | --- |
| Goa Pandan basalt lava cave, East Lampung, Sumatra, Indonesia | candidate | 2.87 m/s | 0.35 optical depth | no data | 0.55 / 0.00 / 0.53 | 0.56 / 0.21 / 0.01 |
| Gua Lawa lava tube, Purbalingga, Central Java, Indonesia | candidate | 2.6 m/s | 0.39 optical depth | no data | 0.47 / 0.00 / 0.61 | 0.76 / 0.36 / 0.01 |
| Kawah Ijen, East Java, Indonesia | candidate | 2.44 m/s | 0.24 optical depth | no data | 0.42 / 0.00 / 0.66 | 0.14 / 0.03 / 0.14 |
| Kesaksak lava tube, Batur caldera, Bali, Indonesia | candidate | 3.02 m/s | 0.22 optical depth | no data | 0.59 / 0.00 / 0.48 | 0.10 / 0.02 / 0.19 |
| Maros-Pangkep karst caves, South Sulawesi, Indonesia | candidate | 3.6 m/s | 0.24 optical depth | no data | 0.77 / 0.00 / 0.33 | 0.14 / 0.03 / 0.14 |
| Mount Batur black lava fields, Bali, Indonesia | candidate | 3.02 m/s | 0.22 optical depth | no data | 0.59 / 0.00 / 0.48 | 0.10 / 0.02 / 0.19 |
| Mount Merapi and the Opak River, Central Java, Indonesia | candidate | 3.32 m/s | 0.38 optical depth | no data | 0.69 / 0.00 / 0.40 | 0.71 / 0.32 / 0.01 |
| Mount Tambora caldera, Sumbawa, Indonesia | candidate | 2.89 m/s | 0.21 optical depth | no data | 0.56 / 0.00 / 0.52 | 0.08 / 0.01 / 0.22 |
| Askja caldera, Iceland highlands | known | 5.74 m/s | 0.07 optical depth | 11.6% of the ground | 0.94 / 0.00 / 0.04 | 0.00 / 0.00 / 0.84 |
| Atacama Desert hyperarid core (Yungay), Chile | known | 3.56 m/s | 0.04 optical depth | no data | 0.76 / 0.00 / 0.33 | 0.00 / 0.00 / 0.95 |
| Beacon Valley, McMurdo Dry Valleys, Antarctica | known | 10.2 m/s | 0 optical depth | no data | 0.04 / 0.50 / 0.00 | 0.00 / 0.00 / 1.00 |
| Craters of the Moon, Idaho, USA | known | 3.62 m/s | 0.09 optical depth | 0% of the ground | 0.77 / 0.00 / 0.32 | 0.01 / 0.00 / 0.76 |
| Dallol, Danakil Depression, Ethiopia | known | 3.83 m/s | 0.4 optical depth | no data | 0.83 / 0.00 / 0.27 | 0.80 / 0.41 / 0.00 |
| Dasht-e Lut (Lut Desert), Iran | known | 4.66 m/s | 0.32 optical depth | 0% of the ground | 0.98 / 0.00 / 0.13 | 0.41 / 0.13 / 0.03 |
| Don Juan Pond, Wright Valley, Antarctica | known | 9.63 m/s | 0 optical depth | no data | 0.07 / 0.34 / 0.00 | 0.00 / 0.00 / 1.00 |
| Haughton impact structure, Devon Island, Canada | known | 4.32 m/s | 0.07 optical depth | 100% of the ground | 0.93 / 0.00 / 0.18 | 0.00 / 0.00 / 0.84 |
| Kilauea, Hawaii, USA | known | 5.34 m/s | 0.1 optical depth | no data | 0.99 / 0.00 / 0.06 | 0.01 / 0.00 / 0.71 |
| Mauna Kea, Hawaii, USA | known | 4.81 m/s | 0.1 optical depth | no data | 0.99 / 0.00 / 0.11 | 0.01 / 0.00 / 0.71 |
| Salar de Uyuni salt flat, Bolivia | known | 3.1 m/s | 0.1 optical depth | no data | 0.62 / 0.00 / 0.46 | 0.01 / 0.00 / 0.71 |
| Timanfaya, Lanzarote, Spain | known | 6.4 m/s | 0.27 optical depth | no data | 0.80 / 0.01 / 0.01 | 0.22 / 0.05 / 0.08 |
| Tunupa volcano, north shore of Salar de Uyuni, Bolivia | known | 2.96 m/s | 0.1 optical depth | no data | 0.58 / 0.00 / 0.50 | 0.01 / 0.00 / 0.71 |

## Site by site

| Site | Kind | Geology | Terrain | Climate | Bare ground | Sunlight | Instrument and geology testing (best / typical) | Rover mobility (best / typical) | Ice and resources (best / typical) | Astrobiology (best / typical) | Full base rehearsal (best / typical) | Minerals identified |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Goa Pandan basalt lava cave, East Lampung, Sumatra, Indonesia | candidate | 0.65 | 0.67 | 0.00 | 0.00 | 0.40 | 100.0 / 60.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | no EMIT data |
| Gua Lawa lava tube, Purbalingga, Central Java, Indonesia | candidate | 0.65 | 0.30 | 0.00 | 0.00 | 0.40 | 100.0 / 60.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | no EMIT data |
| Kawah Ijen, East Java, Indonesia | candidate | 0.28 | 0.12 | 0.00 | 0.00 | 0.40 | 60.0 / 15.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | no EMIT data |
| Kesaksak lava tube, Batur caldera, Bali, Indonesia | candidate | 0.28 | 0.19 | 0.00 | 0.00 | 0.40 | 60.0 / 15.0 | 0.9 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | none |
| Maros-Pangkep karst caves, South Sulawesi, Indonesia | candidate | n/a | 0.43 | 0.00 | 0.00 | 0.40 | n/a / n/a | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | none |
| Mount Batur black lava fields, Bali, Indonesia (provisional footprint) | candidate | 0.28 | 0.36 | 0.00 | 0.00 | 0.40 | 60.0 / 15.0 | 1.9 / 0.7 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | Goethite |
| Mount Merapi and the Opak River, Central Java, Indonesia | candidate | 0.28 | 0.00 | 0.00 | 0.00 | 0.40 | 60.0 / 15.0 | 0.4 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | Goethite, Jarosite, Smectite clay, Hematite, Gibbsite |
| Mount Tambora caldera, Sumbawa, Indonesia (provisional footprint) | candidate | 0.65 | 0.12 | 0.00 | 0.07 | 0.40 | 100.0 / 60.0 | 26.4 / 0.0 | 0.2 / 0.0 | 0.2 / 0.2 | 0.6 / 0.0 | Hematite, Goethite, Calcium carbonate (calcite, aragonite, dolomite), Hydrated volcanic glass, Smectite clay |
| Askja caldera, Iceland highlands | known | 0.65 | 0.62 | 0.00 | 0.99 | 0.29 | 100.0 / 60.0 | 95.6 / 75.2 | 3.1 / 2.4 | 6.4 / 6.3 | 15.7 / 11.3 | no EMIT data |
| Atacama Desert hyperarid core (Yungay), Chile | known | 0.15 | 0.52 | 0.04 | 0.93 | 0.41 | 15.0 / 15.0 | 95.9 / 61.8 | 12.8 / 6.3 | 18.0 / 15.7 | 26.8 / 14.8 | Hematite, Mica and illite, Kaolinite, Smectite clay, Goethite |
| Beacon Valley, McMurdo Dry Valleys, Antarctica | known | n/a | 0.10 | 0.47 | 0.09 | 0.46 | n/a / n/a | 29.7 / 0.0 | 20.0 / 6.7 | 25.6 / 22.1 | 43.0 / 0.2 | no EMIT data |
| Craters of the Moon, Idaho, USA | known | n/a | 0.52 | 0.04 | 0.31 | 0.22 | n/a / n/a | 58.6 / 38.8 | 10.9 / 7.8 | 10.7 / 9.5 | 19.7 / 15.1 | Hematite, Goethite |
| Dallol, Danakil Depression, Ethiopia (provisional footprint) | known | n/a | 0.68 | 0.01 | 0.91 | 0.41 | n/a / n/a | 95.6 / 78.8 | 3.1 / 3.1 | 6.0 / 5.2 | 19.1 / 10.0 | Goethite, Hematite, Jarosite, Iron sulfate, Smectite clay |
| Dasht-e Lut (Lut Desert), Iran (provisional footprint) | known | n/a | 0.38 | 0.02 | 0.97 | 0.36 | n/a / n/a | 95.7 / 39.5 | 6.4 / 6.2 | 11.4 / 9.8 | 11.4 / 9.0 | Hematite, Mica and illite, Goethite, Calcium carbonate (calcite, aragonite, dolomite), Smectite clay |
| Don Juan Pond, Wright Valley, Antarctica | known | n/a | 0.00 | 0.46 | 0.14 | 0.45 | n/a / n/a | 2.7 / 0.0 | 19.8 / 6.6 | 30.3 / 25.9 | 10.4 / 0.0 | no EMIT data |
| Haughton impact structure, Devon Island, Canada | known | n/a | 0.62 | 0.13 | 0.96 | 0.43 | n/a / n/a | 97.6 / 76.5 | 9.0 / 3.2 | 37.8 / 30.9 | 47.6 / 31.5 | no EMIT data |
| Kilauea, Hawaii, USA | known | 0.65 | 0.53 | 0.00 | 0.18 | 0.42 | 100.0 / 60.0 | 46.7 / 31.4 | 0.0 / 0.0 | 0.1 / 0.1 | 0.9 / 0.4 | Goethite, Smectite clay, Jarosite, Hematite, Hydrated volcanic glass |
| Mauna Kea, Hawaii, USA | known | 0.65 | 0.28 | 0.00 | 0.99 | 0.42 | 100.0 / 60.0 | 94.9 / 14.3 | 0.0 / 0.0 | 0.0 / 0.0 | 0.2 / 0.1 | Hematite, Hydrated volcanic glass, Goethite, Jarosite, Smectite clay |
| Salar de Uyuni salt flat, Bolivia (provisional footprint) | known | 0.15 | n/a | 0.07 | 0.95 | 0.41 | 15.0 / 15.0 | n/a / n/a | 16.4 / 8.0 | 23.7 / 19.5 | 26.4 / 16.2 | no EMIT data |
| Timanfaya, Lanzarote, Spain | known | 0.65 | 0.54 | 0.01 | 0.95 | 0.37 | 100.0 / 60.0 | 96.2 / 70.4 | 8.3 / 3.2 | 16.7 / 14.5 | 22.6 / 15.3 | no EMIT data |
| Tunupa volcano, north shore of Salar de Uyuni, Bolivia (provisional footprint) | known | 0.28 | 0.12 | 0.06 | 0.77 | 0.42 | 60.0 / 15.0 | 86.6 / 0.1 | 21.8 / 7.0 | 25.4 / 16.7 | 12.1 / 0.2 | Hematite, Goethite, Kaolinite, Calcium carbonate (calcite, aragonite, dolomite) |

## What a team could test at each candidate site

Each sentence is built by a fixed rule from measured values (slope against published rover limits, rock class, same-window terrain, minerals seen from orbit, bare share, the cell's climate). The process line is from the cited literature (data/analogs.json).

### Kawah Ijen, East Java, Indonesia

Process: Acid-sulfate alteration: a crater lake with a pH below 0.3 alters the volcanic rock around it. (Loehr et al. 2005, doi:10.1065/espr2004.09.118 (lake pH); Rodriguez and van Bergen 2016, doi:10.1017/njg.2015.12 (hyperacid volcanic lakes as analogues of Martian sulphate-rich terrains))

- Link to Gale crater: Gale's lake mudstones hold jarosite, an iron sulfate, measured by Curiosity. (Rampe et al. 2020, Geochemistry 80:125605, Table 2)
- Where the analogy breaks: Kawah Ijen is an active, hot, wet system today. Gale's lake is ancient and long dry.

Could test:

- Driving and walking on steep ground: the mean slope is 23 degrees on 31 m posts, above the published slope limit of VIPER (15), and within that of Perseverance (30), Curiosity (30), Spirit and Opportunity (25) and Apollo Lunar Roving Vehicle (25).
- Sampling and instrument work on a rock class related to that of Marius Hills pit and Jezero crater (andesite / basaltic andesite): related, not the same.

Could not test:

- Cold, dryness and thermal design: the surrounding cell averages 25 C with 1,655 mm of rain a year. No target here has rain, and all are far colder.
- Open-ground operations over the whole site: only 9% of the footprint is bare; the rest is vegetated.
- Gravity, vacuum or thin air, and radiation: no place on Earth can.

### Mount Merapi and the Opak River, Central Java, Indonesia

Process: Volcanic sediment carried and sorted by rivers: the minerals of Merapi's river sediments were compared with rocks at Gale crater. (Argadestya et al. 2022, Earth and Space Science 9(11), doi:10.1029/2022EA002279)

- Link to Gale crater: Gale's sandstones and mudstones are made of basaltic grains laid down by water. (Grotzinger et al. 2014, Science 343:1242777)
- Where the analogy breaks: The study is about river sediments below the volcano, not the summit that the footprint covers.

Could test:

- Foot traverses on very steep ground, not rover driving: the mean slope is 31 degrees on 31 m posts, above the published slope limit of every rover listed (15 to 30 degrees).
- Sampling and instrument work on a rock class related to that of Marius Hills pit and Jezero crater (andesite / basaltic andesite): related, not the same.
- Checking mineral identifications made from orbit against samples on the ground: NASA's EMIT instrument identifies hematite, jarosite and smectite clay here, mineral families also reported at Gale crater.
- 35% of the footprint is bare ground: a rehearsal has to be laid out inside that part.

Could not test:

- Cold, dryness and thermal design: the surrounding cell averages 25 C with 2,338 mm of rain a year. No target here has rain, and all are far colder.
- Gravity, vacuum or thin air, and radiation: no place on Earth can.

### Gua Lawa lava tube, Purbalingga, Central Java, Indonesia

Process: Lava tube formation: a cave left behind by flowing basalt lava. (Widagdo and Setijadi 2007, Dinamika Rekayasa 3(2):57-60; Siswandi et al. 2024, doi:10.20884/2.procicma.2024.3.1.10237 (basalt, SiO2 50.5 to 51.4 percent))

- Link to Marius Hills pit: Radar found echo patterns that fit intact lava tubes at Marius Hills. (Kaku et al. 2017, Geophysical Research Letters 44:10155, doi:10.1002/2017GL074998)
- Where the analogy breaks: A lunar tube formed in one sixth of Earth's gravity. Its size at Marius Hills has not been measured.

Could test:

- Routine traverses: the mean slope is 13 degrees on 31 m posts, within the published slope limit of every rover listed (15 degrees and up).
- Sampling and instrument work on the same class of rock as Marius Hills pit and Jezero crater (basalt / picro-basalt).
- Route planning on slopes and relief close to those of Malapert Massif and Mons Mouton, measured in a window of the same size.

Could not test:

- Cold, dryness and thermal design: the surrounding cell averages 25 C with 2,403 mm of rain a year. No target here has rain, and all are far colder.
- Open-ground operations over the whole site: only 3% of the footprint is bare; the rest is vegetated.
- Gravity, vacuum or thin air, and radiation: no place on Earth can.

### Goa Pandan basalt lava cave, East Lampung, Sumatra, Indonesia

Process: A cave in basalt lava. (Al Farishi et al. 2024, doi:10.25299/jgeet.2024.9.2.16848; Sirait et al. 2023, doi:10.25299/jgeet.2023.8.2.12118)

- Link to Marius Hills pit: Radar found echo patterns that fit intact lava tubes at Marius Hills. (Kaku et al. 2017, Geophysical Research Letters 44:10155, doi:10.1002/2017GL074998)
- Where the analogy breaks: The coordinates are those of the village, not the cave entrance.

Could test:

- Routine traverses: the mean slope is 4 degrees on 31 m posts, within the published slope limit of every rover listed (15 degrees and up).
- Sampling and instrument work on the same class of rock as Marius Hills pit and Jezero crater (basalt).
- Route planning on slopes and relief close to those of Shackleton rim, Marius Hills pit and Jezero crater, measured in a window of the same size.

Could not test:

- Cold, dryness and thermal design: the surrounding cell averages 27 C with 2,049 mm of rain a year. No target here has rain, and all are far colder.
- Open-ground operations over the whole site: almost none of the footprint is bare; the rest is vegetated.
- Gravity, vacuum or thin air, and radiation: no place on Earth can.

### Kesaksak lava tube, Batur caldera, Bali, Indonesia

Process: Lava tube formation: a tube in the basaltic lava flow that Batur erupted in 1888. (Agastya et al. 2023, Jurnal Geominerba 8(1):44-61, doi:10.58522/ppsdm22.v8i1.134)

- Link to Marius Hills pit: Radar found echo patterns that fit intact lava tubes at Marius Hills. (Kaku et al. 2017, Geophysical Research Letters 44:10155, doi:10.1002/2017GL074998)
- Where the analogy breaks: The tube's position inside the caldera is not published, so the footprint is centred on the volcano.

Could test:

- Routine traverses: the mean slope is 11 degrees on 31 m posts, within the published slope limit of every rover listed (15 degrees and up).
- Sampling and instrument work on a rock class related to that of Marius Hills pit and Jezero crater (andesite / basaltic andesite): related, not the same.
- Route planning on slopes and relief close to those of Malapert Massif, measured in a window of the same size.

Could not test:

- Cold, dryness and thermal design: the surrounding cell averages 27 C with 1,615 mm of rain a year. No target here has rain, and all are far colder.
- Open-ground operations over the whole site: only 5% of the footprint is bare; the rest is vegetated.
- Gravity, vacuum or thin air, and radiation: no place on Earth can.

### Maros-Pangkep karst caves, South Sulawesi, Indonesia

Process: Karst: caves formed in limestone. (UNESCO Global Geoparks, 'Maros Pangkep' (572 caves))

- Where the analogy breaks: Limestone caves form by water dissolving rock. No cave on the Moon or Mars targets listed here is known to have formed that way: this site is a cave-operations place, not a geological analog.

Could test:

- Routine traverses: the mean slope is 15 degrees on 31 m posts, within the published slope limit of every rover listed (15 degrees and up).
- Route planning on slopes and relief close to those of Mons Mouton, Haworth and Shackleton rim, measured in a window of the same size.

Could not test:

- Cold, dryness and thermal design: the surrounding cell averages 26 C with 1,939 mm of rain a year. No target here has rain, and all are far colder.
- Open-ground operations over the whole site: almost none of the footprint is bare; the rest is vegetated.
- Gravity, vacuum or thin air, and radiation: no place on Earth can.

### Mount Tambora caldera, Sumbawa, Indonesia

Process: Caldera collapse: the 1815 eruption left a caldera 6 km wide and 1,250 m deep. (Smithsonian GVP volcano 264040)

- Link to Shackleton rim: Shackleton is a crater 21 km wide and 4.1 km deep with steep walls. (Zuber et al. 2012, Nature 486:378)
- Where the analogy breaks: Shackleton is an impact crater; Tambora collapsed after an eruption. The shapes are alike, the process is not, and Tambora is about a third of the size.

Could test:

- Driving and walking on steep ground: the mean slope is 26 degrees on 31 m posts, above the published slope limit of Spirit and Opportunity (25), VIPER (15) and Apollo Lunar Roving Vehicle (25), and within that of Perseverance (30) and Curiosity (30).
- Sampling and instrument work on the same class of rock as Marius Hills pit and Jezero crater (trachybasalt / tephrite basanite).
- Route planning on slopes and relief close to those of Malapert Massif, measured in a window of the same size.
- Checking mineral identifications made from orbit against samples on the ground: NASA's EMIT instrument identifies hematite and smectite clay here, mineral families also reported at Gale crater.
- 28% of the footprint is bare ground: a rehearsal has to be laid out inside that part.

Could not test:

- Cold, dryness and thermal design: the surrounding cell averages 27 C with 1,282 mm of rain a year. No target here has rain, and all are far colder.
- Gravity, vacuum or thin air, and radiation: no place on Earth can.

### Mount Batur black lava fields, Bali, Indonesia

Process: Basaltic lava flows: lava from summit and flank vents has reached the caldera floor in historical time. (Smithsonian GVP volcano 264010)

- Link to Marius Hills pit: Marius Hills is a field of mare basalt domes and flows. (Besse et al. 2011, JGR 116:E00G13; Lawrence et al. 2013, JGR Planets 118:615)
- Link to Jezero crater: The floor of Jezero that Perseverance landed on is igneous, with lava flows. (Farley et al. 2022, Science 377:eabo2196)
- Where the analogy breaks: The lava is young and already carries moss and grass: only 8% of the footprint reads as bare. The target surfaces are bare.

Could test:

- Routine traverses: the mean slope is 11 degrees on 31 m posts, within the published slope limit of every rover listed (15 degrees and up).
- Sampling and instrument work on a rock class related to that of Marius Hills pit and Jezero crater (andesite / basaltic andesite): related, not the same.
- Route planning on slopes and relief close to those of Malapert Massif, Mons Mouton and Shackleton rim, measured in a window of the same size.

Could not test:

- Cold, dryness and thermal design: the surrounding cell averages 27 C with 1,615 mm of rain a year. No target here has rain, and all are far colder.
- Open-ground operations over the whole site: only 8% of the footprint is bare; the rest is vegetated.
- Gravity, vacuum or thin air, and radiation: no place on Earth can.


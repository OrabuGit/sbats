# Benchmarks: established analogs and our candidates, scored the same way

Written 2026-11-15T05:55:25.003Z by `npx tsx validation/benchmarks.ts`. Data file for the app: `data/benchmarks.json`.

- One procedure for every site: site-scale terrain, vegetation and rock; the 0.5 degree cell's temperature and rainfall; the target's terrain measured in a window of the site's size.
- "Best" is the best of all targets, chosen after the fact, and flatters. "Median" is the typical target.
- Known analogs are those for which fine-scale data was built. They are a yardstick, not a validation set.
- Similarities and scores use the formula, tolerances and weights frozen on 2026-11-14. Nothing was tuned on these sites.
- A footprint holds 16 to 256 terrain posts. Small samples.

## Groups

Mean similarity per dimension over all 8 targets, site scale. 8 candidate sites, 9 known analogs.

| Dimension | Candidates | Known analogs |
| --- | --- | --- |
| Geology | 0.44 | 0.53 |
| Terrain | 0.28 | 0.46 |
| Climate | 0.00 | 0.04 |
| Bare ground | 0.01 | 0.85 |
| Sunlight | 0.40 | 0.41 |

Purpose scores, 0 to 100, mean over sites of the typical (median) target and of the best target:

| Purpose | Candidates, typical | Known, typical | Candidates, best | Known, best |
| --- | --- | --- | --- | --- |
| Instrument and geology testing | 34.3 | 48.8 | 77.1 | 78.8 |
| Rover mobility | 0.1 | 46.6 | 3.7 | 88.7 |
| Ice and resources | 0.0 | 5.9 | 0.0 | 7.9 |
| Astrobiology | 0.0 | 12.7 | 0.0 | 14.8 |
| Full base rehearsal | 0.0 | 12.3 | 0.1 | 18.9 |

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
| Atacama Desert hyperarid core (Yungay), Chile | known | 0.15 | 0.52 | 0.04 | 0.93 | 0.41 | 15.0 / 15.0 | 95.9 / 61.8 | 12.8 / 6.3 | 18.0 / 15.7 | 26.8 / 14.8 | Hematite, Mica and illite, Kaolinite, Smectite clay, Goethite |
| Dallol, Danakil Depression, Ethiopia (provisional footprint) | known | n/a | 0.68 | 0.01 | 0.91 | 0.41 | n/a / n/a | 95.6 / 78.8 | 3.1 / 3.1 | 6.0 / 5.2 | 19.1 / 10.0 | Goethite, Hematite, Jarosite, Iron sulfate, Smectite clay |
| Dasht-e Lut (Lut Desert), Iran (provisional footprint) | known | n/a | 0.38 | 0.02 | 0.97 | 0.36 | n/a / n/a | 95.7 / 39.5 | 6.4 / 6.2 | 11.4 / 9.8 | 11.4 / 9.0 | Hematite, Mica and illite, Goethite, Calcium carbonate (calcite, aragonite, dolomite), Smectite clay |
| Haughton impact structure, Devon Island, Canada | known | n/a | 0.62 | 0.13 | 0.96 | 0.43 | n/a / n/a | 97.6 / 76.5 | 9.0 / 3.2 | 37.8 / 30.9 | 47.6 / 31.5 | no EMIT data |
| Kilauea, Hawaii, USA | known | 0.65 | 0.53 | 0.00 | 0.18 | 0.42 | 100.0 / 60.0 | 46.7 / 31.4 | 0.0 / 0.0 | 0.1 / 0.1 | 0.9 / 0.4 | Goethite, Smectite clay, Jarosite, Hematite, Hydrated volcanic glass |
| Mauna Kea, Hawaii, USA | known | 0.65 | 0.28 | 0.00 | 0.99 | 0.42 | 100.0 / 60.0 | 94.9 / 14.3 | 0.0 / 0.0 | 0.0 / 0.0 | 0.2 / 0.1 | Hematite, Hydrated volcanic glass, Goethite, Jarosite, Smectite clay |
| Salar de Uyuni salt flat, Bolivia (provisional footprint) | known | n/a | n/a | 0.07 | 0.95 | 0.41 | n/a / n/a | n/a / n/a | 16.9 / 16.7 | 23.7 / 21.2 | 30.1 / 29.8 | no EMIT data |
| Timanfaya, Lanzarote, Spain | known | 0.65 | 0.54 | 0.01 | 0.95 | 0.37 | 100.0 / 60.0 | 96.2 / 70.4 | 8.3 / 3.2 | 16.7 / 14.5 | 22.6 / 15.3 | no EMIT data |
| Tunupa volcano, north shore of Salar de Uyuni, Bolivia (provisional footprint) | known | n/a | 0.12 | 0.06 | 0.77 | 0.42 | n/a / n/a | 86.6 / 0.1 | 14.9 / 14.7 | 19.6 / 17.3 | 11.6 / 0.1 | Hematite, Goethite, Kaolinite, Calcium carbonate (calcite, aragonite, dolomite) |


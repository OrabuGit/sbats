# What the search finds: the best-ranked places on Earth for each target

Written 2026-11-15T06:50:17.799Z by `npx tsx validation/discoveries.ts`. Score frozen 2026-11-14. Data file for the app: `data/discoveries.json`.

Rules, the same as the app's candidate list: best all-round score first (Base weights), high and medium confidence only, each pick at least 250 km from the picks above it. **New** means more than 500 km from every one of our 28 known analogs.

- A cell is about 55 km across. The score describes the cell, not a feature inside it.
- Scores are low in absolute terms everywhere: read the rank.
- "New" means more than 500 km from every site in our list of 28 known analogs. It does not mean nobody has studied the place.
- The Indonesian box also holds parts of Malaysia, Brunei, Timor-Leste and Papua New Guinea.
- No place name is typed in. Coordinates are cell centres; look each one up before naming it.

## How many of the top eight are new

| Target | New among the top 8 | Best score | Best new place |
| --- | --- | --- | --- |
| Malapert Massif | 6 | 53.0 | 82.25 N, 82.75 W (score 53.0, rank 2) |
| Mons Mouton | 6 | 51.1 | 82.75 N, 77.25 W (score 51.1, rank 8) |
| Haworth | 6 | 51.9 | 82.25 N, 82.75 W (score 51.9, rank 2) |
| Shackleton rim | 6 | 53.6 | 82.25 N, 82.75 W (score 53.6, rank 3) |
| Marius Hills pit | 4 | 54.3 | 34.75 N, 84.75 E (score 54.3, rank 1) |
| Jezero crater | 4 | 55.5 | 34.75 N, 84.75 E (score 55.5, rank 1) |
| Gale crater | 4 | 51.8 | 36.75 N, 87.25 E (score 48.9, rank 5) |
| Arcadia Planitia (site AP-1) | 6 | 51.5 | 35.25 N, 85.25 E (score 51.5, rank 1) |

## Malapert Massif (`moon-malapert-massif`)

91892 cells scored.

| # | Cell centre | Score | Rank | New? | Nearest known analog | Geology | Terrain | Climate | Bare ground | Sunlight | Held back by | Rank in nine of ten redraws |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 82.25 N, 82.75 W | 53.0 | 2 | **new** | Haughton impact structure, Devon Island, Canada, 777 km | matches | partly | no | partly | matches | temperature | 1 to 6 |
| 2 | 81.75 N, 26.75 W | 47.8 | 29 | **new** | Haughton impact structure, Devon Island, Canada, 1453 km | partly | partly | no | partly | matches | temperature | 16 to 38 |
| 3 | 79.75 N, 82.75 W | 42.9 | 86 | **new** | Haughton impact structure, Devon Island, Canada, 512 km | no | partly | no | matches | matches | rockType | 67 to 130 |
| 4 | 80.75 N, 63.25 W | 42.8 | 88 | **new** | Haughton impact structure, Devon Island, Canada, 837 km | no | partly | no | partly | matches | rockType | 69 to 142 |
| 5 | 82.25 N, 50.25 W | 42.6 | 94 | **new** | Haughton impact structure, Devon Island, Canada, 1102 km | no | partly | no | matches | matches | rockType | 75 to 138 |
| 6 | 70.75 N, 53.75 W | 41.8 | 121 | known area | Kangerlussuaq, Greenland, 434 km | matches | partly | no | matches | partly | temperature | 66 to 288.8 |
| 7 | 72.25 N, 111.75 W | 40.7 | 170 | **new** | Haughton impact structure, Devon Island, Canada, 762 km | partly | partly | no | matches | matches | terrain | 95 to 292.1 |
| 8 | 72.75 N, 85.25 W | 40.7 | 173 | known area | Haughton impact structure, Devon Island, Canada, 322 km | partly | partly | no | matches | matches | temperature | 103.8 to 290.1 |

Best-ranked cells in the Indonesian region:

| Cell centre | Score | Rank | Beats this share of cells | Held back by | Why |
| --- | --- | --- | --- | --- | --- |
| 9.75 S, 120.25 E | 0.0 | 54887 | 40.3% | bareGround | Poor match for Malapert Massif. Held back by bare ground: vegetation cover (NDVI 0.64) where the target is bare ground. Medium confidence: no data for day-night temperature swing. |
| 8.75 S, 125.75 E | 0.0 | 55546 | 39.6% | bareGround | Poor match for Malapert Massif. Held back by bare ground: vegetation cover (NDVI 0.72) where the target is bare ground. Medium confidence: no data for day-night temperature swing. |
| 8.25 S, 128.25 E | 0.0 | 56227 | 38.8% | bareGround | Poor match for Malapert Massif. Held back by bare ground: vegetation cover (NDVI 0.66) where the target is bare ground. Medium confidence: no data for day-night temperature swing. |

## Mons Mouton (`moon-mons-mouton`)

91892 cells scored.

| # | Cell centre | Score | Rank | New? | Nearest known analog | Geology | Terrain | Climate | Bare ground | Sunlight | Held back by | Rank in nine of ten redraws |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 82.75 N, 77.25 W | 51.1 | 8 | **new** | Haughton impact structure, Devon Island, Canada, 855 km | matches | partly | no | partly | matches | temperature | 3 to 35 |
| 2 | 81.75 N, 26.75 W | 49.8 | 19 | **new** | Haughton impact structure, Devon Island, Canada, 1453 km | partly | partly | no | partly | matches | temperature | 10 to 30 |
| 3 | 80.75 N, 63.25 W | 44.5 | 76 | **new** | Haughton impact structure, Devon Island, Canada, 837 km | no | partly | no | partly | matches | rockType | 54 to 123 |
| 4 | 79.75 N, 82.75 W | 44.4 | 77 | **new** | Haughton impact structure, Devon Island, Canada, 512 km | no | partly | no | matches | matches | rockType | 57 to 119 |
| 5 | 82.25 N, 50.25 W | 44.2 | 83 | **new** | Haughton impact structure, Devon Island, Canada, 1102 km | no | partly | no | matches | matches | rockType | 62 to 126 |
| 6 | 70.75 N, 53.75 W | 42.1 | 151 | known area | Kangerlussuaq, Greenland, 434 km | matches | partly | no | matches | partly | temperature | 70 to 367.8 |
| 7 | 72.75 N, 85.25 W | 42.1 | 153 | known area | Haughton impact structure, Devon Island, Canada, 322 km | partly | partly | no | matches | matches | temperature | 88 to 279.1 |
| 8 | 72.25 N, 111.75 W | 41.9 | 161 | **new** | Haughton impact structure, Devon Island, Canada, 762 km | partly | partly | no | matches | matches | temperature | 87 to 302 |

Best-ranked cells in the Indonesian region:

| Cell centre | Score | Rank | Beats this share of cells | Held back by | Why |
| --- | --- | --- | --- | --- | --- |
| 9.75 S, 120.25 E | 0.0 | 54803 | 40.4% | bareGround | Poor match for Mons Mouton. Held back by bare ground: vegetation cover (NDVI 0.64) where the target is bare ground. Medium confidence: no data for day-night temperature swing. |
| 8.75 S, 125.75 E | 0.0 | 55415 | 39.7% | bareGround | Poor match for Mons Mouton. Held back by bare ground: vegetation cover (NDVI 0.72) where the target is bare ground. Medium confidence: no data for day-night temperature swing. |
| 8.25 S, 128.25 E | 0.0 | 56287 | 38.7% | bareGround | Poor match for Mons Mouton. Held back by bare ground: vegetation cover (NDVI 0.66) where the target is bare ground. Medium confidence: no data for day-night temperature swing. |

## Haworth (`moon-haworth`)

91892 cells scored.

| # | Cell centre | Score | Rank | New? | Nearest known analog | Geology | Terrain | Climate | Bare ground | Sunlight | Held back by | Rank in nine of ten redraws |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 82.25 N, 82.75 W | 51.9 | 2 | **new** | Haughton impact structure, Devon Island, Canada, 777 km | matches | partly | no | partly | matches | temperature | 1 to 13 |
| 2 | 81.75 N, 26.75 W | 48.3 | 23 | **new** | Haughton impact structure, Devon Island, Canada, 1453 km | partly | partly | no | partly | matches | temperature | 14 to 35 |
| 3 | 79.75 N, 82.75 W | 43.2 | 83 | **new** | Haughton impact structure, Devon Island, Canada, 512 km | no | partly | no | matches | matches | rockType | 63 to 128 |
| 4 | 80.75 N, 63.25 W | 43.1 | 87 | **new** | Haughton impact structure, Devon Island, Canada, 837 km | no | partly | no | partly | matches | rockType | 66 to 140.1 |
| 5 | 82.25 N, 50.25 W | 43.0 | 92 | **new** | Haughton impact structure, Devon Island, Canada, 1102 km | no | partly | no | matches | matches | rockType | 71 to 135 |
| 6 | 70.75 N, 53.75 W | 41.6 | 138 | known area | Kangerlussuaq, Greenland, 434 km | matches | partly | no | matches | partly | temperature | 69.9 to 324.9 |
| 7 | 72.75 N, 85.25 W | 41.1 | 166 | known area | Haughton impact structure, Devon Island, Canada, 322 km | partly | partly | no | matches | matches | temperature | 98 to 283 |
| 8 | 72.25 N, 111.75 W | 41.1 | 167 | **new** | Haughton impact structure, Devon Island, Canada, 762 km | partly | partly | no | matches | matches | terrain | 92 to 291 |

Best-ranked cells in the Indonesian region:

| Cell centre | Score | Rank | Beats this share of cells | Held back by | Why |
| --- | --- | --- | --- | --- | --- |
| 9.75 S, 120.25 E | 0.0 | 54864 | 40.3% | bareGround | Poor match for Haworth. Held back by bare ground: vegetation cover (NDVI 0.64) where the target is bare ground. Medium confidence: no data for day-night temperature swing. |
| 8.75 S, 125.75 E | 0.0 | 55525 | 39.6% | bareGround | Poor match for Haworth. Held back by bare ground: vegetation cover (NDVI 0.72) where the target is bare ground. Medium confidence: no data for day-night temperature swing. |
| 8.25 S, 128.25 E | 0.0 | 56238 | 38.8% | bareGround | Poor match for Haworth. Held back by bare ground: vegetation cover (NDVI 0.66) where the target is bare ground. Medium confidence: no data for day-night temperature swing. |

## Shackleton rim (`moon-shackleton-rim`)

91892 cells scored.

| # | Cell centre | Score | Rank | New? | Nearest known analog | Geology | Terrain | Climate | Bare ground | Sunlight | Held back by | Rank in nine of ten redraws |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 82.25 N, 82.75 W | 53.6 | 3 | **new** | Haughton impact structure, Devon Island, Canada, 777 km | matches | partly | no | partly | matches | temperature | 2 to 11 |
| 2 | 81.75 N, 26.75 W | 49.6 | 25 | **new** | Haughton impact structure, Devon Island, Canada, 1453 km | partly | partly | no | partly | matches | temperature | 14 to 34 |
| 3 | 80.75 N, 63.25 W | 44.8 | 74 | **new** | Haughton impact structure, Devon Island, Canada, 837 km | no | partly | no | partly | matches | rockType | 51 to 117.2 |
| 4 | 79.75 N, 82.75 W | 44.4 | 85 | **new** | Haughton impact structure, Devon Island, Canada, 512 km | no | partly | no | matches | matches | rockType | 61 to 124 |
| 5 | 82.25 N, 50.25 W | 44.1 | 93 | **new** | Haughton impact structure, Devon Island, Canada, 1102 km | no | partly | no | matches | matches | rockType | 67 to 132 |
| 6 | 70.75 N, 53.75 W | 43.4 | 111 | known area | Kangerlussuaq, Greenland, 434 km | matches | partly | no | matches | partly | temperature | 56 to 276.6 |
| 7 | 72.75 N, 85.25 W | 41.7 | 185 | known area | Haughton impact structure, Devon Island, Canada, 322 km | partly | partly | no | matches | matches | temperature | 104 to 316 |
| 8 | 72.25 N, 111.75 W | 41.6 | 190 | **new** | Haughton impact structure, Devon Island, Canada, 762 km | partly | partly | no | matches | matches | terrain | 97 to 332.2 |

Best-ranked cells in the Indonesian region:

| Cell centre | Score | Rank | Beats this share of cells | Held back by | Why |
| --- | --- | --- | --- | --- | --- |
| 9.75 S, 120.25 E | 0.0 | 54827 | 40.3% | bareGround | Poor match for Shackleton rim. Held back by bare ground: vegetation cover (NDVI 0.64) where the target is bare ground. Medium confidence: no data for day-night temperature swing. |
| 8.75 S, 125.75 E | 0.0 | 55388 | 39.7% | bareGround | Poor match for Shackleton rim. Held back by bare ground: vegetation cover (NDVI 0.72) where the target is bare ground. Medium confidence: no data for day-night temperature swing. |
| 8.25 S, 128.25 E | 0.0 | 56291 | 38.7% | bareGround | Poor match for Shackleton rim. Held back by bare ground: vegetation cover (NDVI 0.66) where the target is bare ground. Medium confidence: no data for day-night temperature swing. |

## Marius Hills pit (`moon-marius-hills`)

91894 cells scored.

| # | Cell centre | Score | Rank | New? | Nearest known analog | Geology | Terrain | Climate | Bare ground | Sunlight | Held back by | Rank in nine of ten redraws |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 34.75 N, 84.75 E | 54.3 | 1 | **new** | Tso Kar, Ladakh, India, 644 km | matches | matches | no | matches | partly | temperature | 1 to 1 |
| 2 | 36.25 N, 88.75 E | 52.5 | 3 | **new** | Qaidam Basin, China, 520 km | matches | partly | no | matches | partly | temperature | 3 to 3 |
| 3 | 34.75 N, 79.25 E | 43.9 | 8 | known area | Tso Kar, Ladakh, India, 199 km | no | matches | no | matches | partly | temperature | 5 to 12 |
| 4 | 36.75 N, 93.25 E | 41.7 | 14 | known area | Qaidam Basin, China, 121 km | partly | matches | no | matches | partly | temperature | 9 to 48 |
| 5 | 43.25 N, 100.75 E | 40.8 | 26 | **new** | Qaidam Basin, China, 853 km | matches | matches | no | matches | no | temperature | 8 to 68.1 |
| 6 | 25.25 S, 69.75 W | 39.8 | 36 | known area | Atacama Desert hyperarid core (Yungay), Chile, 141 km | matches | partly | no | matches | matches | temperature | 8 to 89.2 |
| 7 | 32.75 N, 82.75 E | 39.7 | 39 | known area | Tso Kar, Ladakh, India, 449 km | no | matches | no | matches | partly | temperature | 31 to 52 |
| 8 | 41.25 N, 104.75 E | 39.2 | 49 | **new** | Qaidam Basin, China, 990 km | matches | matches | no | matches | no | temperature | 11 to 91 |

Best-ranked cells in the Indonesian region:

| Cell centre | Score | Rank | Beats this share of cells | Held back by | Why |
| --- | --- | --- | --- | --- | --- |
| 10.75 S, 121.75 E | 0.1 | 51018 | 44.5% | bareGround | Poor match for Marius Hills pit: close on sunlight. Held back by bare ground: vegetation cover (NDVI 0.61) where the target is bare ground. Medium confidence: no data for rock class. |
| 8.25 S, 126.25 E | 0.1 | 52778 | 42.6% | bareGround | Poor match for Marius Hills pit: close on sunlight. Held back by bare ground: vegetation cover (NDVI 0.64) where the target is bare ground. Medium confidence: no data for rock class. |
| 9.25 S, 119.75 E | 0.0 | 55637 | 39.5% | bareGround | Poor match for Marius Hills pit: close on sunlight. Held back by bare ground: vegetation cover (NDVI 0.60) where the target is bare ground. Medium confidence: no data for rock class. |

## Jezero crater (`mars-jezero`)

91894 cells scored.

| # | Cell centre | Score | Rank | New? | Nearest known analog | Geology | Terrain | Climate | Bare ground | Sunlight | Held back by | Rank in nine of ten redraws |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 34.75 N, 84.75 E | 55.5 | 1 | **new** | Tso Kar, Ladakh, India, 644 km | matches | partly | no | matches | partly | temperature | 1 to 1 |
| 2 | 36.25 N, 88.75 E | 55.1 | 2 | **new** | Qaidam Basin, China, 520 km | matches | partly | no | matches | partly | temperature | 2 to 2 |
| 3 | 36.75 N, 93.25 E | 46.9 | 6 | known area | Qaidam Basin, China, 121 km | partly | matches | no | matches | partly | temperature | 6 to 16 |
| 4 | 22.75 S, 67.25 W | 45.6 | 9 | known area | Atacama Desert hyperarid core (Yungay), Chile, 313 km | partly | partly | no | matches | matches | temperature | 7 to 27 |
| 5 | 35.25 N, 79.75 E | 45.1 | 12 | known area | Tso Kar, Ladakh, India, 271 km | no | matches | no | matches | partly | temperature | 8 to 19 |
| 6 | 25.25 S, 69.75 W | 44.4 | 16 | known area | Atacama Desert hyperarid core (Yungay), Chile, 141 km | matches | matches | no | matches | matches | temperature | 7 to 105 |
| 7 | 43.75 N, 100.75 E | 43.6 | 23 | **new** | Qaidam Basin, China, 896 km | matches | matches | no | matches | partly | temperature | 10 to 98 |
| 8 | 46.25 N, 96.75 E | 43.4 | 30 | **new** | Qaidam Basin, China, 1017 km | partly | matches | no | matches | no | temperature | 14 to 75 |

Best-ranked cells in the Indonesian region:

| Cell centre | Score | Rank | Beats this share of cells | Held back by | Why |
| --- | --- | --- | --- | --- | --- |
| 10.75 S, 121.75 E | 0.1 | 52494 | 42.9% | bareGround | Poor match for Jezero crater: close on sunlight. Held back by bare ground: vegetation cover (NDVI 0.61) where the target is bare ground. Medium confidence: no data for rock class. |
| 8.25 S, 126.25 E | 0.1 | 53204 | 42.1% | bareGround | Poor match for Jezero crater: close on sunlight. Held back by bare ground: vegetation cover (NDVI 0.64) where the target is bare ground. Medium confidence: no data for rock class. |
| 8.75 S, 117.75 E | 0.0 | 56627 | 38.4% | bareGround | Poor match for Jezero crater: close on sunlight. Held back by bare ground: vegetation cover (NDVI 0.72) where the target is bare ground. |

## Gale crater (`mars-gale`)

91894 cells scored.

| # | Cell centre | Score | Rank | New? | Nearest known analog | Geology | Terrain | Climate | Bare ground | Sunlight | Held back by | Rank in nine of ten redraws |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 35.25 N, 80.25 E | 51.8 | 1 | known area | Tso Kar, Ladakh, India, 301 km | matches | partly | no | matches | partly | temperature | 1 to 2 |
| 2 | 31.75 N, 79.75 E | 51.4 | 2 | known area | Tso Kar, Ladakh, India, 239 km | matches | partly | no | matches | partly | temperature | 1 to 3 |
| 3 | 36.75 N, 87.25 E | 48.9 | 5 | **new** | Qaidam Basin, China, 642 km | matches | partly | no | matches | partly | temperature | 5 to 12 |
| 4 | 24.75 S, 68.75 W | 48.7 | 7 | known area | Atacama Desert hyperarid core (Yungay), Chile, 152 km | matches | partly | no | matches | matches | temperature | 3 to 30 |
| 5 | 36.25 N, 83.25 E | 48.5 | 9 | **new** | Tso Kar, Ladakh, India, 582 km | matches | partly | no | matches | partly | temperature | 7 to 16 |
| 6 | 38.25 N, 89.75 E | 47.4 | 18 | known area | Qaidam Basin, China, 427 km | matches | partly | no | matches | partly | temperature | 9 to 36 |
| 7 | 33.75 N, 83.75 E | 47.3 | 20 | **new** | Tso Kar, Ladakh, India, 537 km | matches | partly | no | matches | partly | temperature | 16 to 27 |
| 8 | 31.25 N, 83.25 E | 46.6 | 30 | **new** | Tso Kar, Ladakh, India, 545 km | matches | partly | no | matches | partly | temperature | 18 to 38 |

Best-ranked cells in the Indonesian region:

| Cell centre | Score | Rank | Beats this share of cells | Held back by | Why |
| --- | --- | --- | --- | --- | --- |
| 9.75 S, 120.25 E | 0.1 | 53671 | 41.6% | bareGround | Poor match for Gale crater: close on rock type and sunlight. Held back by bare ground: vegetation cover (NDVI 0.64) where the target is bare ground. |
| 8.25 S, 126.25 E | 0.1 | 54665 | 40.5% | bareGround | Poor match for Gale crater: close on sunlight. Held back by bare ground: vegetation cover (NDVI 0.64) where the target is bare ground. Medium confidence: no data for rock class. |
| 8.75 S, 117.75 E | 0.0 | 57417 | 37.5% | bareGround | Poor match for Gale crater: close on sunlight. Held back by bare ground: vegetation cover (NDVI 0.72) where the target is bare ground. |

## Arcadia Planitia (site AP-1) (`mars-arcadia-planitia`)

91894 cells scored.

| # | Cell centre | Score | Rank | New? | Nearest known analog | Geology | Terrain | Climate | Bare ground | Sunlight | Held back by | Rank in nine of ten redraws |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 35.25 N, 85.25 E | 51.5 | 1 | **new** | Tso Kar, Ladakh, India, 702 km | no data | partly | no | matches | matches | temperature | 1 to 1 |
| 2 | 38.25 N, 92.25 E | 48.1 | 4 | known area | Qaidam Basin, China, 222 km | no data | matches | no | matches | matches | temperature | 2 to 8 |
| 3 | 36.75 N, 95.75 E | 45.1 | 17 | known area | Qaidam Basin, China, 129 km | no data | matches | no | matches | matches | temperature | 11 to 23 |
| 4 | 44.75 N, 105.25 E | 44.2 | 23 | **new** | Qaidam Basin, China, 1228 km | no data | matches | no | matches | matches | temperature | 20 to 28 |
| 5 | 48.75 N, 93.25 E | 42.7 | 32 | **new** | Qaidam Basin, China, 1281 km | no data | matches | no | matches | matches | temperature | 26 to 44 |
| 6 | 45.25 N, 108.75 E | 42.3 | 37 | **new** | Qaidam Basin, China, 1485 km | no data | matches | no | partly | matches | temperature | 32 to 53 |
| 7 | 41.75 N, 96.25 E | 42.2 | 38 | **new** | Qaidam Basin, China, 522 km | no data | partly | no | matches | matches | temperature | 30 to 53 |
| 8 | 42.75 N, 103.25 E | 42.1 | 39 | **new** | Qaidam Basin, China, 965 km | no data | matches | no | matches | matches | temperature | 30 to 58 |

Best-ranked cells in the Indonesian region:

| Cell centre | Score | Rank | Beats this share of cells | Held back by | Why |
| --- | --- | --- | --- | --- | --- |
| 10.75 S, 121.75 E | 0.1 | 46508 | 49.4% | bareGround | Poor match for Arcadia Planitia (site AP-1). Held back by bare ground: vegetation cover (NDVI 0.61) where the target is bare ground. Medium confidence: no data for rock class. |
| 8.25 S, 128.25 E | 0.0 | 48961 | 46.7% | bareGround | Poor match for Arcadia Planitia (site AP-1): close on terrain. Held back by bare ground: vegetation cover (NDVI 0.66) where the target is bare ground. Medium confidence: no data for rock class. |
| 9.25 S, 119.75 E | 0.0 | 51359 | 44.1% | bareGround | Poor match for Arcadia Planitia (site AP-1). Held back by bare ground: vegetation cover (NDVI 0.60) where the target is bare ground. Medium confidence: no data for rock class. |


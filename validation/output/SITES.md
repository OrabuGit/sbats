# Site-level scores from fine-scale values

Written 2026-11-15T06:07:36.986Z by validation/score_sites.ts. Site values: data/sites.json built 2026-11-15T06:06:23Z (Session B).
Scoring values frozen 2026-11-14. Target windows: validation/output/target_terrain_windows.json (2026-11-15T04:50:09Z).

Read this first:

- These are the frozen formula, tolerances and weights applied to site-scale inputs. Nothing was tuned.
- Terrain, bare ground and rock class are measured at the site (2 to 5 km footprint, or the whole volcano for rock).
  **Climate is still the 0.5 degree cell value.** A crater at 2,400 m and the coast below it share one temperature and one rainfall figure.
- Terrain is compared with the target measured in a window of the same size. A footprint holds 16 to 121 posts of 463 m, so both numbers are coarse.
- "p" is the tie-fair percentile of the value among all 0.5 degree Earth cells (0.5 is the middle). It compares a site-scale value with cell-scale values and is a rough guide.
- Candidate sites were never used to tune or validate the score. The five known analogs are shown for comparison only.
- The reading of these tables is in validation/sites/FINDINGS.md.

## Candidate sites

### Kawah Ijen, East Java, Indonesia

Footprint 3 km. Crater, acid lake and rim of Kawah Ijen. Terrain window: 6 x 6 posts of 463 m (34 land posts).

| Input | Site value | Scale | 0.5 degree cell |
| --- | --- | --- | --- |
| Slope (degrees) | 11.06 | site | 4.63 |
| Roughness (m) | 146.7 | site, window-dependent | 636.0 |
| NDVI | 0.62, 9% of the footprint bare | site | 0.76 |
| Rock class | 10 Intermediate volcanic rocks ("Andesite / Basaltic Andesite") | volcano | 1 Unconsolidated sediments |
| Mean temperature (deg C) | 25.4 | grid | same |
| Day-night range (deg C) | 5.3 | grid | same |
| Precipitation (mm/year) | 1655 | grid | same |

Similarity per dimension at site scale, 0 to 1. In brackets: the same dimension from the 0.5 degree cell.

| Target | Geology | Terrain | Climate | Bare ground | Sunlight | Target terrain in the same window | Terrain against the 55.6 km target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | 0.15 (p 0.48) [0.15] | 0.54 (p 0.95) [0.51] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.42) [0.00] | 0.00 (p 0.06) [0.00] | 8.02 deg, 77.5 m | 0.48 |
| moon-mons-mouton | 0.15 (p 0.48) [0.15] | 0.38 (p 0.84) [0.67] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.42) [0.00] | 0.00 (p 0.06) [0.00] | 6.36 deg, 82.5 m | 0.47 |
| moon-haworth | 0.15 (p 0.48) [0.15] | 0.00 (p 0.00) [0.53] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.42) [0.00] | 0.00 (p 0.06) [0.00] | 3.35 deg, 43.8 m | 0.48 |
| moon-shackleton-rim | 0.15 (p 0.48) [0.15] | 0.00 (p 0.00) [0.66] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.42) [0.00] | 0.00 (p 0.06) [0.00] | 2.81 deg, 36.2 m | 0.49 |
| moon-marius-hills | 0.60 (p 0.96) [0.15] | 0.00 (p 0.03) [0.01] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.42) [0.00] | 1.00 (p 0.94) [1.00] | 1.50 deg, 17.7 m | 0.00 |
| mars-jezero | 0.60 (p 0.96) [0.15] | 0.00 (p 0.01) [0.13] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.42) [0.00] | 0.95 (p 0.85) [0.95] | 1.08 deg, 14.4 m | 0.00 |
| mars-gale (listed) | 0.15 (p 0.28) [0.60] | 0.00 (p 0.00) [0.74] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.42) [0.00] | 1.00 (p 0.98) [1.00] | 0.37 deg, 4.4 m | 0.24 |
| mars-arcadia-planitia | no data [no data] | 0.00 (p 0.05) [0.00] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.42) [0.00] | 0.28 (p 0.48) [0.28] | 0.10 deg, 1.1 m | 0.00 |

Purpose scores at site scale, 0 to 100. In brackets: the 0.5 degree cell.

| Target | Instrument and geology testing | Rover mobility | Ice and resources | Astrobiology | Full base rehearsal |
| --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | 15.0 (p 0.48) [15.0] | 0.0 (p 0.43) [0.0] | 0.0 (p 0.05) [0.0] | 0.0 (p 0.37) [0.0] | 0.0 (p 0.37) [0.0] |
| moon-mons-mouton | 15.0 (p 0.48) [15.0] | 0.0 (p 0.43) [0.0] | 0.0 (p 0.05) [0.0] | 0.0 (p 0.37) [0.0] | 0.0 (p 0.36) [0.0] |
| moon-haworth | 15.0 (p 0.48) [15.0] | 0.0 (p 0.35) [0.0] | 0.0 (p 0.05) [0.0] | 0.0 (p 0.37) [0.0] | 0.0 (p 0.34) [0.0] |
| moon-shackleton-rim | 15.0 (p 0.48) [15.0] | 0.0 (p 0.32) [0.0] | 0.0 (p 0.05) [0.0] | 0.0 (p 0.37) [0.0] | 0.0 (p 0.33) [0.0] |
| moon-marius-hills | 60.0 (p 0.96) [15.0] | 0.0 (p 0.30) [0.0] | 0.0 (p 0.06) [0.0] | 0.0 (p 0.37) [0.0] | 0.0 (p 0.32) [0.0] |
| mars-jezero | 60.0 (p 0.96) [15.0] | 0.0 (p 0.29) [0.0] | 0.0 (p 0.06) [0.0] | 0.0 (p 0.37) [0.0] | 0.0 (p 0.31) [0.0] |
| mars-gale (listed) | 15.0 (p 0.28) [60.0] | 0.0 (p 0.28) [0.0] | 0.0 (p 0.06) [0.0] | 0.0 (p 0.36) [0.0] | 0.0 (p 0.30) [0.0] |
| mars-arcadia-planitia | no score: coverage-too-low [no score] | 0.0 (p 0.33) [0.0] | 0.0 (p 0.06) [0.0] | 0.0 (p 0.36) [0.0] | 0.0 (p 0.33) [0.0] |

### Mount Merapi and the Opak River, Central Java, Indonesia

Footprint 4 km. Summit cone and upper flanks of Merapi. The Opak River deposits downstream are not inside it. Terrain window: 9 x 9 posts of 463 m (81 land posts).

| Input | Site value | Scale | 0.5 degree cell |
| --- | --- | --- | --- |
| Slope (degrees) | 24.96 | site | 3.06 |
| Roughness (m) | 301.6 | site, window-dependent | 312.5 |
| NDVI | 0.44, 35% of the footprint bare | site | 0.73 |
| Rock class | 10 Intermediate volcanic rocks ("Andesite / Basaltic Andesite") | volcano | 10 Intermediate volcanic rocks |
| Mean temperature (deg C) | 25.0 | grid | same |
| Day-night range (deg C) | 5.6 | grid | same |
| Precipitation (mm/year) | 2338 | grid | same |

Similarity per dimension at site scale, 0 to 1. In brackets: the same dimension from the 0.5 degree cell.

| Target | Geology | Terrain | Climate | Bare ground | Sunlight | Target terrain in the same window | Terrain against the 55.6 km target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | 0.15 (p 0.48) [0.15] | 0.02 (p 0.00) [0.33] | 0.00 (p 0.02) [0.00] | 0.00 (p 0.57) [0.00] | 0.00 (p 0.06) [0.00] | 10.01 deg, 133.6 m | 0.20 |
| moon-mons-mouton | 0.15 (p 0.48) [0.15] | 0.00 (p 0.00) [0.39] | 0.00 (p 0.02) [0.00] | 0.00 (p 0.57) [0.00] | 0.00 (p 0.06) [0.00] | 4.93 deg, 90.6 m | 0.04 |
| moon-haworth | 0.15 (p 0.48) [0.15] | 0.00 (p 0.00) [0.34] | 0.00 (p 0.02) [0.00] | 0.00 (p 0.57) [0.00] | 0.00 (p 0.06) [0.00] | 3.28 deg, 56.9 m | 0.12 |
| moon-shackleton-rim | 0.15 (p 0.48) [0.15] | 0.00 (p 0.00) [0.39] | 0.00 (p 0.02) [0.00] | 0.00 (p 0.57) [0.00] | 0.00 (p 0.06) [0.00] | 4.68 deg, 68.9 m | 0.11 |
| moon-marius-hills | 0.60 (p 0.96) [0.60] | 0.00 (p 0.00) [0.57] | 0.00 (p 0.02) [0.00] | 0.00 (p 0.57) [0.00] | 1.00 (p 0.94) [1.00] | 1.12 deg, 20.3 m | 0.00 |
| mars-jezero | 0.60 (p 0.96) [0.60] | 0.00 (p 0.00) [0.97] | 0.00 (p 0.02) [0.00] | 0.00 (p 0.57) [0.00] | 0.95 (p 0.84) [0.95] | 1.21 deg, 28.3 m | 0.00 |
| mars-gale (listed) | 0.15 (p 0.28) [0.15] | 0.00 (p 0.00) [0.44] | 0.00 (p 0.02) [0.00] | 0.00 (p 0.57) [0.00] | 1.00 (p 0.97) [1.00] | 0.47 deg, 7.4 m | 0.00 |
| mars-arcadia-planitia | no data [no data] | 0.00 (p 0.00) [0.00] | 0.00 (p 0.02) [0.00] | 0.00 (p 0.57) [0.00] | 0.27 (p 0.47) [0.27] | 0.07 deg, 1.0 m | 0.00 |

Purpose scores at site scale, 0 to 100. In brackets: the 0.5 degree cell.

| Target | Instrument and geology testing | Rover mobility | Ice and resources | Astrobiology | Full base rehearsal |
| --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | 15.0 (p 0.48) [15.0] | 0.4 (p 0.51) [0.0] | 0.0 (p 0.02) [0.0] | 0.0 (p 0.34) [0.0] | 0.0 (p 0.33) [0.0] |
| moon-mons-mouton | 15.0 (p 0.48) [15.0] | 0.0 (p 0.28) [0.0] | 0.0 (p 0.02) [0.0] | 0.0 (p 0.34) [0.0] | 0.0 (p 0.30) [0.0] |
| moon-haworth | 15.0 (p 0.48) [15.0] | 0.0 (p 0.28) [0.0] | 0.0 (p 0.02) [0.0] | 0.0 (p 0.34) [0.0] | 0.0 (p 0.29) [0.0] |
| moon-shackleton-rim | 15.0 (p 0.48) [15.0] | 0.0 (p 0.28) [0.0] | 0.0 (p 0.02) [0.0] | 0.0 (p 0.34) [0.0] | 0.0 (p 0.30) [0.0] |
| moon-marius-hills | 60.0 (p 0.96) [60.0] | 0.0 (p 0.28) [0.0] | 0.0 (p 0.03) [0.0] | 0.0 (p 0.34) [0.0] | 0.0 (p 0.28) [0.0] |
| mars-jezero | 60.0 (p 0.96) [60.0] | 0.0 (p 0.28) [0.0] | 0.0 (p 0.02) [0.0] | 0.0 (p 0.34) [0.0] | 0.0 (p 0.28) [0.0] |
| mars-gale (listed) | 15.0 (p 0.28) [15.0] | 0.0 (p 0.28) [0.0] | 0.0 (p 0.02) [0.0] | 0.0 (p 0.34) [0.0] | 0.0 (p 0.28) [0.0] |
| mars-arcadia-planitia | no score: coverage-too-low [no score] | 0.0 (p 0.28) [0.0] | 0.0 (p 0.02) [0.0] | 0.0 (p 0.34) [0.0] | 0.0 (p 0.28) [0.0] |

### Gua Lawa lava tube, Purbalingga, Central Java, Indonesia

Footprint 2 km. Ground surface above and around the cave entrance. The cave interior is not measured. Terrain window: 4 x 4 posts of 463 m (16 land posts).

| Input | Site value | Scale | 0.5 degree cell |
| --- | --- | --- | --- |
| Slope (degrees) | 7.11 | site | 4.70 |
| Roughness (m) | 68.5 | site, window-dependent | 486.7 |
| NDVI | 0.73, 3% of the footprint bare | site | 0.74 |
| Rock class | 2 Basic volcanic rocks ("Basalt / Picro-Basalt") | volcano | 10 Intermediate volcanic rocks |
| Mean temperature (deg C) | 25.3 | grid | same |
| Day-night range (deg C) | 6.8 | grid | same |
| Precipitation (mm/year) | 2403 | grid | same |

Similarity per dimension at site scale, 0 to 1. In brackets: the same dimension from the 0.5 degree cell.

| Target | Geology | Terrain | Climate | Bare ground | Sunlight | Target terrain in the same window | Terrain against the 55.6 km target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | 0.60 (p 0.98) [0.15] | 0.94 (p 1.00) [0.46] | 0.00 (p 0.02) [0.00] | 0.00 (p 0.35) [0.00] | 0.00 (p 0.06) [0.00] | 5.94 deg, 52.9 m | 0.38 |
| moon-mons-mouton | 0.60 (p 0.98) [0.15] | 1.00 (p 1.00) [0.59] | 0.00 (p 0.02) [0.00] | 0.00 (p 0.35) [0.00] | 0.00 (p 0.06) [0.00] | 6.92 deg, 62.6 m | 0.39 |
| moon-haworth | 0.60 (p 0.98) [0.15] | 0.44 (p 0.90) [0.48] | 0.00 (p 0.02) [0.00] | 0.00 (p 0.35) [0.00] | 0.00 (p 0.06) [0.00] | 3.88 deg, 33.2 m | 0.39 |
| moon-shackleton-rim | 0.60 (p 0.98) [0.15] | 0.00 (p 0.00) [0.59] | 0.00 (p 0.02) [0.00] | 0.00 (p 0.35) [0.00] | 0.00 (p 0.06) [0.00] | 1.52 deg, 14.5 m | 0.38 |
| moon-marius-hills | 1.00 (p 0.98) [0.60] | 0.00 (p 0.08) [0.03] | 0.00 (p 0.02) [0.00] | 0.00 (p 0.35) [0.00] | 1.00 (p 0.94) [1.00] | 1.67 deg, 15.4 m | 0.00 |
| mars-jezero | 1.00 (p 0.98) [0.60] | 0.00 (p 0.04) [0.33] | 0.00 (p 0.02) [0.00] | 0.00 (p 0.35) [0.00] | 0.95 (p 0.84) [0.95] | 1.15 deg, 10.1 m | 0.03 |
| mars-gale | 0.15 (p 0.28) [0.15] | 0.00 (p 0.00) [0.65] | 0.00 (p 0.02) [0.00] | 0.00 (p 0.35) [0.00] | 1.00 (p 0.96) [1.00] | 0.28 deg, 2.9 m | 0.40 |
| mars-arcadia-planitia | no data [no data] | 0.00 (p 0.12) [0.00] | 0.00 (p 0.02) [0.00] | 0.00 (p 0.35) [0.00] | 0.27 (p 0.47) [0.27] | 0.09 deg, 1.0 m | 0.00 |

Purpose scores at site scale, 0 to 100. In brackets: the 0.5 degree cell.

| Target | Instrument and geology testing | Rover mobility | Ice and resources | Astrobiology | Full base rehearsal |
| --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | 60.0 (p 0.98) [15.0] | 0.0 (p 0.36) [0.0] | 0.0 (p 0.02) [0.0] | 0.0 (p 0.31) [0.0] | 0.0 (p 0.31) [0.0] |
| moon-mons-mouton | 60.0 (p 0.98) [15.0] | 0.0 (p 0.36) [0.0] | 0.0 (p 0.02) [0.0] | 0.0 (p 0.31) [0.0] | 0.0 (p 0.31) [0.0] |
| moon-haworth | 60.0 (p 0.98) [15.0] | 0.0 (p 0.35) [0.0] | 0.0 (p 0.02) [0.0] | 0.0 (p 0.31) [0.0] | 0.0 (p 0.31) [0.0] |
| moon-shackleton-rim | 60.0 (p 0.98) [15.0] | 0.0 (p 0.29) [0.0] | 0.0 (p 0.02) [0.0] | 0.0 (p 0.31) [0.0] | 0.0 (p 0.30) [0.0] |
| moon-marius-hills | 100.0 (p 0.98) [60.0] | 0.0 (p 0.33) [0.0] | 0.0 (p 0.02) [0.0] | 0.0 (p 0.31) [0.0] | 0.0 (p 0.32) [0.0] |
| mars-jezero | 100.0 (p 0.98) [60.0] | 0.0 (p 0.30) [0.0] | 0.0 (p 0.02) [0.0] | 0.0 (p 0.31) [0.0] | 0.0 (p 0.30) [0.0] |
| mars-gale | 15.0 (p 0.28) [15.0] | 0.0 (p 0.28) [0.0] | 0.0 (p 0.02) [0.0] | 0.0 (p 0.31) [0.0] | 0.0 (p 0.29) [0.0] |
| mars-arcadia-planitia | no score: coverage-too-low [no score] | 0.0 (p 0.36) [0.0] | 0.0 (p 0.02) [0.0] | 0.0 (p 0.30) [0.0] | 0.0 (p 0.33) [0.0] |

### Goa Pandan basalt lava cave, East Lampung, Sumatra, Indonesia

Footprint 3 km. Centred on Giri Mulyo village, because the cave's own position is not published. The cave interior is not measured. Terrain window: 6 x 6 posts of 463 m (36 land posts).

| Input | Site value | Scale | 0.5 degree cell |
| --- | --- | --- | --- |
| Slope (degrees) | 1.65 | site | 0.70 |
| Roughness (m) | 18.0 | site, window-dependent | 31.6 |
| NDVI | 0.68, 0% of the footprint bare | site | 0.74 |
| Rock class | 2 Basic volcanic rocks ("basalt") | site | 2 Basic volcanic rocks |
| Mean temperature (deg C) | 27.2 | grid | same |
| Day-night range (deg C) | 4.3 | grid | same |
| Precipitation (mm/year) | 2049 | grid | same |

Similarity per dimension at site scale, 0 to 1. In brackets: the same dimension from the 0.5 degree cell.

| Target | Geology | Terrain | Climate | Bare ground | Sunlight | Target terrain in the same window | Terrain against the 55.6 km target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | 0.60 (p 0.98) [0.60] | 0.37 (p 0.87) [0.18] | 0.00 (p 0.03) [0.00] | 0.00 (p 0.38) [0.00] | 0.00 (p 0.04) [0.00] | 8.02 deg, 77.5 m | 0.20 |
| moon-mons-mouton | 0.60 (p 0.98) [0.60] | 0.38 (p 0.84) [0.17] | 0.00 (p 0.03) [0.00] | 0.00 (p 0.38) [0.00] | 0.00 (p 0.04) [0.00] | 6.36 deg, 82.5 m | 0.19 |
| moon-haworth | 0.60 (p 0.98) [0.60] | 0.72 (p 0.99) [0.17] | 0.00 (p 0.03) [0.00] | 0.00 (p 0.38) [0.00] | 0.00 (p 0.04) [0.00] | 3.35 deg, 43.8 m | 0.20 |
| moon-shackleton-rim | 0.60 (p 0.98) [0.60] | 0.81 (p 0.99) [0.16] | 0.00 (p 0.03) [0.00] | 0.00 (p 0.38) [0.00] | 0.00 (p 0.04) [0.00] | 2.81 deg, 36.2 m | 0.19 |
| moon-marius-hills | 1.00 (p 0.98) [1.00] | 0.99 (p 1.00) [0.36] | 0.00 (p 0.03) [0.00] | 0.00 (p 0.38) [0.00] | 1.00 (p 0.96) [1.00] | 1.50 deg, 17.7 m | 0.43 |
| mars-jezero | 1.00 (p 0.98) [1.00] | 0.92 (p 0.99) [0.26] | 0.00 (p 0.03) [0.00] | 0.00 (p 0.38) [0.00] | 0.94 (p 0.82) [0.94] | 1.08 deg, 14.4 m | 0.36 |
| mars-gale | 0.15 (p 0.28) [0.15] | 0.65 (p 0.99) [0.18] | 0.00 (p 0.03) [0.00] | 0.00 (p 0.38) [0.00] | 1.00 (p 0.94) [1.00] | 0.37 deg, 4.4 m | 0.22 |
| mars-arcadia-planitia | no data [no data] | 0.53 (p 0.38) [0.93] | 0.00 (p 0.03) [0.00] | 0.00 (p 0.38) [0.00] | 0.26 (p 0.45) [0.26] | 0.10 deg, 1.1 m | 0.62 |

Purpose scores at site scale, 0 to 100. In brackets: the 0.5 degree cell.

| Target | Instrument and geology testing | Rover mobility | Ice and resources | Astrobiology | Full base rehearsal |
| --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | 60.0 (p 0.98) [60.0] | 0.0 (p 0.38) [0.0] | 0.0 (p 0.03) [0.0] | 0.0 (p 0.33) [0.0] | 0.0 (p 0.33) [0.0] |
| moon-mons-mouton | 60.0 (p 0.98) [60.0] | 0.0 (p 0.38) [0.0] | 0.0 (p 0.03) [0.0] | 0.0 (p 0.33) [0.0] | 0.0 (p 0.33) [0.0] |
| moon-haworth | 60.0 (p 0.98) [60.0] | 0.0 (p 0.39) [0.0] | 0.0 (p 0.03) [0.0] | 0.0 (p 0.33) [0.0] | 0.0 (p 0.33) [0.0] |
| moon-shackleton-rim | 60.0 (p 0.98) [60.0] | 0.0 (p 0.40) [0.0] | 0.0 (p 0.03) [0.0] | 0.0 (p 0.33) [0.0] | 0.0 (p 0.33) [0.0] |
| moon-marius-hills | 100.0 (p 0.98) [100.0] | 0.0 (p 0.44) [0.0] | 0.0 (p 0.04) [0.0] | 0.0 (p 0.33) [0.0] | 0.0 (p 0.36) [0.0] |
| mars-jezero | 100.0 (p 0.98) [100.0] | 0.0 (p 0.41) [0.0] | 0.0 (p 0.04) [0.0] | 0.0 (p 0.33) [0.0] | 0.0 (p 0.35) [0.0] |
| mars-gale | 15.0 (p 0.28) [15.0] | 0.0 (p 0.39) [0.0] | 0.0 (p 0.03) [0.0] | 0.0 (p 0.33) [0.0] | 0.0 (p 0.33) [0.0] |
| mars-arcadia-planitia | no score: coverage-too-low [no score] | 0.0 (p 0.48) [0.0] | 0.0 (p 0.03) [0.0] | 0.0 (p 0.33) [0.0] | 0.0 (p 0.38) [0.0] |

### Kesaksak lava tube, Batur caldera, Bali, Indonesia

Footprint 5 km. Centred on Batur volcano, because the tube's position inside the caldera is not published. Terrain window: 11 x 11 posts of 463 m (119 land posts).

| Input | Site value | Scale | 0.5 degree cell |
| --- | --- | --- | --- |
| Slope (degrees) | 9.61 | site | 5.64 |
| Roughness (m) | 118.0 | site, window-dependent | 431.9 |
| NDVI | 0.51, 5% of the footprint bare | site | 0.80 |
| Rock class | 10 Intermediate volcanic rocks ("Andesite / Basaltic Andesite") | volcano | 10 Intermediate volcanic rocks |
| Mean temperature (deg C) | 26.6 | grid | same |
| Day-night range (deg C) | 3.1 | grid | same |
| Precipitation (mm/year) | 1615 | grid | same |

Similarity per dimension at site scale, 0 to 1. In brackets: the same dimension from the 0.5 degree cell.

| Target | Geology | Terrain | Climate | Bare ground | Sunlight | Target terrain in the same window | Terrain against the 55.6 km target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | 0.15 (p 0.48) [0.15] | 0.87 (p 1.00) [0.48] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.52) [0.00] | 0.00 (p 0.06) [0.00] | 11.28 deg, 178.0 m | 0.45 |
| moon-mons-mouton | 0.15 (p 0.48) [0.15] | 0.21 (p 0.66) [0.61] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.52) [0.00] | 0.00 (p 0.06) [0.00] | 4.35 deg, 88.9 m | 0.46 |
| moon-haworth | 0.15 (p 0.48) [0.15] | 0.01 (p 0.00) [0.50] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.52) [0.00] | 0.00 (p 0.06) [0.00] | 3.19 deg, 59.2 m | 0.46 |
| moon-shackleton-rim | 0.15 (p 0.48) [0.15] | 0.45 (p 0.88) [0.60] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.52) [0.00] | 0.00 (p 0.06) [0.00] | 5.21 deg, 88.7 m | 0.46 |
| moon-marius-hills | 0.60 (p 0.96) [0.60] | 0.00 (p 0.04) [0.01] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.52) [0.00] | 1.00 (p 0.94) [1.00] | 1.03 deg, 22.2 m | 0.00 |
| mars-jezero | 0.60 (p 0.96) [0.60] | 0.00 (p 0.01) [0.21] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.52) [0.00] | 0.95 (p 0.85) [0.95] | 1.39 deg, 36.8 m | 0.00 |
| mars-gale | 0.15 (p 0.28) [0.15] | 0.00 (p 0.00) [0.65] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.52) [0.00] | 1.00 (p 0.98) [1.00] | 0.55 deg, 10.0 m | 0.32 |
| mars-arcadia-planitia | no data [no data] | 0.00 (p 0.07) [0.00] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.52) [0.00] | 0.28 (p 0.48) [0.28] | 0.09 deg, 1.4 m | 0.00 |

Purpose scores at site scale, 0 to 100. In brackets: the 0.5 degree cell.

| Target | Instrument and geology testing | Rover mobility | Ice and resources | Astrobiology | Full base rehearsal |
| --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | 15.0 (p 0.48) [15.0] | 0.9 (p 0.55) [0.0] | 0.0 (p 0.05) [0.0] | 0.0 (p 0.41) [0.0] | 0.0 (p 0.41) [0.0] |
| moon-mons-mouton | 15.0 (p 0.48) [15.0] | 0.4 (p 0.52) [0.0] | 0.0 (p 0.05) [0.0] | 0.0 (p 0.41) [0.0] | 0.0 (p 0.40) [0.0] |
| moon-haworth | 15.0 (p 0.48) [15.0] | 0.1 (p 0.45) [0.0] | 0.0 (p 0.05) [0.0] | 0.0 (p 0.41) [0.0] | 0.0 (p 0.38) [0.0] |
| moon-shackleton-rim | 15.0 (p 0.48) [15.0] | 0.6 (p 0.54) [0.0] | 0.0 (p 0.05) [0.0] | 0.0 (p 0.41) [0.0] | 0.0 (p 0.40) [0.0] |
| moon-marius-hills | 60.0 (p 0.96) [60.0] | 0.0 (p 0.33) [0.0] | 0.0 (p 0.07) [0.0] | 0.0 (p 0.41) [0.0] | 0.0 (p 0.34) [0.0] |
| mars-jezero | 60.0 (p 0.96) [60.0] | 0.0 (p 0.31) [0.0] | 0.0 (p 0.06) [0.0] | 0.0 (p 0.41) [0.0] | 0.0 (p 0.34) [0.0] |
| mars-gale | 15.0 (p 0.28) [15.0] | 0.0 (p 0.28) [0.0] | 0.0 (p 0.06) [0.0] | 0.0 (p 0.40) [0.0] | 0.0 (p 0.31) [0.0] |
| mars-arcadia-planitia | no score: coverage-too-low [no score] | 0.0 (p 0.36) [0.0] | 0.0 (p 0.06) [0.0] | 0.0 (p 0.39) [0.0] | 0.0 (p 0.35) [0.0] |

### Maros-Pangkep karst caves, South Sulawesi, Indonesia

Footprint 5 km. One 5 km sample of the karst at the listed coordinates, not the whole cave district. Terrain window: 11 x 11 posts of 463 m (121 land posts).

| Input | Site value | Scale | 0.5 degree cell |
| --- | --- | --- | --- |
| Slope (degrees) | 4.37 | site | 6.83 |
| Roughness (m) | 83.2 | site, window-dependent | 534.6 |
| NDVI | 0.81, 0% of the footprint bare | site | 0.76 |
| Rock class | no data | site | 10 Intermediate volcanic rocks |
| Mean temperature (deg C) | 26.3 | grid | same |
| Day-night range (deg C) | 4.7 | grid | same |
| Precipitation (mm/year) | 1939 | grid | same |

Similarity per dimension at site scale, 0 to 1. In brackets: the same dimension from the 0.5 degree cell.

| Target | Geology | Terrain | Climate | Bare ground | Sunlight | Target terrain in the same window | Terrain against the 55.6 km target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | no data [0.15] | 0.52 (p 0.94) [0.57] | 0.00 (p 0.04) [0.00] | 0.00 (p 0.31) [0.00] | 0.00 (p 0.04) [0.00] | 11.28 deg, 178.0 m | 0.30 |
| moon-mons-mouton | no data [0.15] | 1.00 (p 1.00) [0.74] | 0.00 (p 0.04) [0.00] | 0.00 (p 0.31) [0.00] | 0.00 (p 0.04) [0.00] | 4.35 deg, 88.9 m | 0.32 |
| moon-haworth | no data [0.15] | 0.82 (p 1.00) [0.60] | 0.00 (p 0.04) [0.00] | 0.00 (p 0.31) [0.00] | 0.00 (p 0.04) [0.00] | 3.19 deg, 59.2 m | 0.31 |
| moon-shackleton-rim | no data [0.15] | 0.97 (p 1.00) [0.74] | 0.00 (p 0.04) [0.00] | 0.00 (p 0.31) [0.00] | 0.00 (p 0.04) [0.00] | 5.21 deg, 88.7 m | 0.31 |
| moon-marius-hills | no data [0.60] | 0.04 (p 0.13) [0.00] | 0.00 (p 0.04) [0.00] | 0.00 (p 0.31) [0.00] | 1.00 (p 0.96) [1.00] | 1.03 deg, 22.2 m | 0.12 |
| mars-jezero | no data [0.60] | 0.09 (p 0.09) [0.04] | 0.00 (p 0.04) [0.00] | 0.00 (p 0.31) [0.00] | 0.94 (p 0.82) [0.94] | 1.39 deg, 36.8 m | 0.39 |
| mars-gale | no data [0.15] | 0.01 (p 0.00) [0.71] | 0.00 (p 0.04) [0.00] | 0.00 (p 0.31) [0.00] | 1.00 (p 0.94) [1.00] | 0.55 deg, 10.0 m | 0.39 |
| mars-arcadia-planitia | no data [no data] | 0.01 (p 0.20) [0.00] | 0.00 (p 0.04) [0.00] | 0.00 (p 0.31) [0.00] | 0.26 (p 0.45) [0.26] | 0.09 deg, 1.4 m | 0.01 |

Purpose scores at site scale, 0 to 100. In brackets: the 0.5 degree cell.

| Target | Instrument and geology testing | Rover mobility | Ice and resources | Astrobiology | Full base rehearsal |
| --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | no score: coverage-too-low [15.0] | 0.0 (p 0.32) [0.0] | no score: coverage-too-low [0.0] | 0.0 (p 0.30) [0.0] | 0.0 (p 0.30) [0.0] |
| moon-mons-mouton | no score: coverage-too-low [15.0] | 0.0 (p 0.32) [0.0] | no score: coverage-too-low [0.0] | 0.0 (p 0.30) [0.0] | 0.0 (p 0.30) [0.0] |
| moon-haworth | no score: coverage-too-low [15.0] | 0.0 (p 0.32) [0.0] | no score: coverage-too-low [0.0] | 0.0 (p 0.30) [0.0] | 0.0 (p 0.30) [0.0] |
| moon-shackleton-rim | no score: coverage-too-low [15.0] | 0.0 (p 0.32) [0.0] | no score: coverage-too-low [0.0] | 0.0 (p 0.30) [0.0] | 0.0 (p 0.30) [0.0] |
| moon-marius-hills | no score: coverage-too-low [60.0] | 0.0 (p 0.33) [0.0] | 0.0 (p 0.02) [0.0] | 0.0 (p 0.30) [0.0] | 0.0 (p 0.32) [0.0] |
| mars-jezero | no score: coverage-too-low [60.0] | 0.0 (p 0.32) [0.0] | 0.0 (p 0.02) [0.0] | 0.0 (p 0.30) [0.0] | 0.0 (p 0.31) [0.0] |
| mars-gale | no score: coverage-too-low [15.0] | 0.0 (p 0.28) [0.0] | 0.0 (p 0.02) [0.0] | 0.0 (p 0.30) [0.0] | 0.0 (p 0.30) [0.0] |
| mars-arcadia-planitia | no score: coverage-too-low [no score] | 0.0 (p 0.37) [0.0] | 0.0 (p 0.04) [0.0] | 0.0 (p 0.31) [0.0] | 0.0 (p 0.35) [0.0] |

### Mount Tambora caldera, Sumbawa, Indonesia

Footprint 7.4 km (provisional). The whole summit caldera of Tambora, rim to rim, with a little of the outer slope in the corners of the square. Terrain window: 16 x 16 posts of 463 m (255 land posts).

| Input | Site value | Scale | 0.5 degree cell |
| --- | --- | --- | --- |
| Slope (degrees) | 20.73 | site | 5.90 |
| Roughness (m) | 393.7 | site, window-dependent | 548.7 |
| NDVI | 0.28, 28% of the footprint bare | site | 0.76 |
| Rock class | 2 Basic volcanic rocks ("Trachybasalt / Tephrite Basanite") | volcano | 10 Intermediate volcanic rocks |
| Mean temperature (deg C) | 27.1 | grid | same |
| Day-night range (deg C) | 4.2 | grid | same |
| Precipitation (mm/year) | 1282 | grid | same |

Similarity per dimension at site scale, 0 to 1. In brackets: the same dimension from the 0.5 degree cell.

| Target | Geology | Terrain | Climate | Bare ground | Sunlight | Target terrain in the same window | Terrain against the 55.6 km target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | 0.60 (p 0.98) [0.15] | 0.75 (p 0.99) [0.54] | 0.00 (p 0.10) [0.00] | 0.07 (p 0.73) [0.00] | 0.00 (p 0.06) [0.00] | 14.21 deg, 310.9 m | 0.39 |
| moon-mons-mouton | 0.60 (p 0.98) [0.15] | 0.00 (p 0.00) [0.70] | 0.00 (p 0.10) [0.00] | 0.07 (p 0.73) [0.00] | 0.00 (p 0.06) [0.00] | 4.25 deg, 86.6 m | 0.16 |
| moon-haworth | 0.60 (p 0.98) [0.15] | 0.00 (p 0.00) [0.56] | 0.00 (p 0.10) [0.00] | 0.07 (p 0.73) [0.00] | 0.00 (p 0.06) [0.00] | 2.72 deg, 59.6 m | 0.28 |
| moon-shackleton-rim | 0.60 (p 0.98) [0.15] | 0.23 (p 0.70) [0.70] | 0.00 (p 0.10) [0.00] | 0.07 (p 0.73) [0.00] | 0.00 (p 0.06) [0.00] | 10.09 deg, 246.8 m | 0.31 |
| moon-marius-hills | 1.00 (p 0.98) [0.60] | 0.00 (p 0.00) [0.00] | 0.00 (p 0.09) [0.00] | 0.07 (p 0.73) [0.00] | 1.00 (p 0.94) [1.00] | 0.95 deg, 27.6 m | 0.00 |
| mars-jezero | 1.00 (p 0.98) [0.60] | 0.00 (p 0.00) [0.09] | 0.00 (p 0.09) [0.00] | 0.07 (p 0.73) [0.00] | 0.95 (p 0.85) [0.95] | 1.39 deg, 49.4 m | 0.00 |
| mars-gale | 0.15 (p 0.28) [0.15] | 0.00 (p 0.00) [0.72] | 0.00 (p 0.09) [0.00] | 0.07 (p 0.73) [0.00] | 1.00 (p 0.98) [1.00] | 0.82 deg, 22.5 m | 0.00 |
| mars-arcadia-planitia | no data [no data] | 0.00 (p 0.01) [0.00] | 0.00 (p 0.09) [0.00] | 0.07 (p 0.73) [0.00] | 0.28 (p 0.48) [0.28] | 0.13 deg, 2.6 m | 0.00 |

Purpose scores at site scale, 0 to 100. In brackets: the 0.5 degree cell.

| Target | Instrument and geology testing | Rover mobility | Ice and resources | Astrobiology | Full base rehearsal |
| --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | 60.0 (p 0.98) [15.0] | 26.4 (p 0.82) [0.0] | 0.0 (p 0.09) [0.0] | 0.2 (p 0.54) [0.0] | 0.6 (p 0.52) [0.0] |
| moon-mons-mouton | 60.0 (p 0.98) [15.0] | 0.0 (p 0.29) [0.0] | 0.0 (p 0.09) [0.0] | 0.2 (p 0.54) [0.0] | 0.0 (p 0.34) [0.0] |
| moon-haworth | 60.0 (p 0.98) [15.0] | 0.0 (p 0.28) [0.0] | 0.0 (p 0.09) [0.0] | 0.2 (p 0.54) [0.0] | 0.0 (p 0.29) [0.0] |
| moon-shackleton-rim | 60.0 (p 0.98) [15.0] | 13.7 (p 0.73) [0.0] | 0.0 (p 0.09) [0.0] | 0.2 (p 0.54) [0.0] | 0.4 (p 0.50) [0.0] |
| moon-marius-hills | 100.0 (p 0.98) [60.0] | 0.0 (p 0.28) [0.0] | 0.2 (p 0.11) [0.2] | 0.2 (p 0.53) [0.0] | 0.0 (p 0.28) [0.0] |
| mars-jezero | 100.0 (p 0.98) [60.0] | 0.0 (p 0.28) [0.0] | 0.2 (p 0.11) [0.2] | 0.2 (p 0.53) [0.0] | 0.0 (p 0.28) [0.0] |
| mars-gale | 15.0 (p 0.28) [15.0] | 0.0 (p 0.28) [0.0] | 0.1 (p 0.10) [0.1] | 0.2 (p 0.50) [0.0] | 0.0 (p 0.28) [0.0] |
| mars-arcadia-planitia | no score: coverage-too-low [no score] | 0.0 (p 0.29) [0.0] | 0.0 (p 0.09) [0.0] | 0.0 (p 0.51) [0.0] | 0.0 (p 0.29) [0.0] |

### Mount Batur black lava fields, Bali, Indonesia

Footprint 4 km (provisional). Young bare lava flows on the caldera floor south-west of the Batur cone. Terrain window: 9 x 9 posts of 463 m (81 land posts). Caveat from sites.json: The square is 16 km2 and the mapped bare-rock polygon inside it is 7.5 km2, so about half of the footprint is ground outside the lava field.

| Input | Site value | Scale | 0.5 degree cell |
| --- | --- | --- | --- |
| Slope (degrees) | 5.66 | site | 5.64 |
| Roughness (m) | 116.0 | site, window-dependent | 431.9 |
| NDVI | 0.47, 8% of the footprint bare | site | 0.80 |
| Rock class | 10 Intermediate volcanic rocks ("Andesite / Basaltic Andesite") | volcano | 10 Intermediate volcanic rocks |
| Mean temperature (deg C) | 26.6 | grid | same |
| Day-night range (deg C) | 3.1 | grid | same |
| Precipitation (mm/year) | 1615 | grid | same |

Similarity per dimension at site scale, 0 to 1. In brackets: the same dimension from the 0.5 degree cell.

| Target | Geology | Terrain | Climate | Bare ground | Sunlight | Target terrain in the same window | Terrain against the 55.6 km target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | 0.15 (p 0.48) [0.15] | 0.81 (p 1.00) [0.48] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.55) [0.00] | 0.00 (p 0.07) [0.00] | 10.01 deg, 133.6 m | 0.35 |
| moon-mons-mouton | 0.15 (p 0.48) [0.15] | 0.92 (p 1.00) [0.61] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.55) [0.00] | 0.00 (p 0.07) [0.00] | 4.93 deg, 90.6 m | 0.39 |
| moon-haworth | 0.15 (p 0.48) [0.15] | 0.41 (p 0.88) [0.50] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.55) [0.00] | 0.00 (p 0.07) [0.00] | 3.28 deg, 56.9 m | 0.37 |
| moon-shackleton-rim | 0.15 (p 0.48) [0.15] | 0.77 (p 0.98) [0.60] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.55) [0.00] | 0.00 (p 0.07) [0.00] | 4.68 deg, 68.9 m | 0.37 |
| moon-marius-hills | 0.60 (p 0.96) [0.60] | 0.00 (p 0.09) [0.01] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.55) [0.00] | 1.00 (p 0.93) [1.00] | 1.12 deg, 20.3 m | 0.02 |
| mars-jezero | 0.60 (p 0.96) [0.60] | 0.00 (p 0.05) [0.21] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.55) [0.00] | 0.95 (p 0.85) [0.95] | 1.21 deg, 28.3 m | 0.18 |
| mars-gale | 0.15 (p 0.28) [0.15] | 0.00 (p 0.00) [0.65] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.55) [0.00] | 1.00 (p 0.98) [1.00] | 0.47 deg, 7.4 m | 0.44 |
| mars-arcadia-planitia | no data [no data] | 0.00 (p 0.15) [0.00] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.55) [0.00] | 0.28 (p 0.48) [0.28] | 0.07 deg, 1.0 m | 0.00 |

Purpose scores at site scale, 0 to 100. In brackets: the 0.5 degree cell.

| Target | Instrument and geology testing | Rover mobility | Ice and resources | Astrobiology | Full base rehearsal |
| --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | 15.0 (p 0.48) [15.0] | 1.8 (p 0.59) [0.0] | 0.0 (p 0.05) [0.0] | 0.0 (p 0.42) [0.0] | 0.0 (p 0.42) [0.0] |
| moon-mons-mouton | 15.0 (p 0.48) [15.0] | 1.9 (p 0.59) [0.0] | 0.0 (p 0.05) [0.0] | 0.0 (p 0.42) [0.0] | 0.0 (p 0.42) [0.0] |
| moon-haworth | 15.0 (p 0.48) [15.0] | 1.2 (p 0.57) [0.0] | 0.0 (p 0.05) [0.0] | 0.0 (p 0.42) [0.0] | 0.0 (p 0.41) [0.0] |
| moon-shackleton-rim | 15.0 (p 0.48) [15.0] | 1.7 (p 0.58) [0.0] | 0.0 (p 0.05) [0.0] | 0.0 (p 0.42) [0.0] | 0.0 (p 0.42) [0.0] |
| moon-marius-hills | 60.0 (p 0.96) [60.0] | 0.1 (p 0.49) [0.0] | 0.0 (p 0.07) [0.0] | 0.0 (p 0.42) [0.0] | 0.0 (p 0.41) [0.0] |
| mars-jezero | 60.0 (p 0.96) [60.0] | 0.1 (p 0.47) [0.0] | 0.0 (p 0.06) [0.0] | 0.0 (p 0.42) [0.0] | 0.0 (p 0.39) [0.0] |
| mars-gale | 15.0 (p 0.28) [15.0] | 0.0 (p 0.41) [0.0] | 0.0 (p 0.06) [0.0] | 0.0 (p 0.41) [0.0] | 0.0 (p 0.36) [0.0] |
| mars-arcadia-planitia | no score: coverage-too-low [no score] | 0.0 (p 0.49) [0.0] | 0.0 (p 0.06) [0.0] | 0.0 (p 0.41) [0.0] | 0.0 (p 0.42) [0.0] |

## Known analogs, for comparison

### Mauna Kea, Hawaii, USA

Footprint 4 km. Summit area of Mauna Kea. The field-test sites on the flank are outside it. Terrain window: 9 x 9 posts of 463 m (81 land posts).

| Input | Site value | Scale | 0.5 degree cell |
| --- | --- | --- | --- |
| Slope (degrees) | 7.93 | site | 4.94 |
| Roughness (m) | 105.2 | site, window-dependent | 918.5 |
| NDVI | 0.04, 100% of the footprint bare | site | 0.59 |
| Rock class | 2 Basic volcanic rocks ("Scoria cones") | volcano | 10 Intermediate volcanic rocks |
| Mean temperature (deg C) | 21.4 | grid | same |
| Day-night range (deg C) | 4.1 | grid | same |
| Precipitation (mm/year) | 1831 | grid | same |

Similarity per dimension at site scale, 0 to 1. In brackets: the same dimension from the 0.5 degree cell.

| Target | Geology | Terrain | Climate | Bare ground | Sunlight | Target terrain in the same window | Terrain against the 55.6 km target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moon-malapert-massif (listed) | 0.60 (p 0.98) [0.15] | 0.92 (p 1.00) [0.62] | 0.00 (p 0.04) [0.00] | 0.99 (p 0.99) [0.00] | 0.00 (p 0.16) [0.00] | 10.01 deg, 133.6 m | 0.41 |
| moon-mons-mouton (listed) | 0.60 (p 0.98) [0.15] | 0.68 (p 0.98) [0.79] | 0.00 (p 0.04) [0.00] | 0.99 (p 0.99) [0.00] | 0.00 (p 0.16) [0.00] | 4.93 deg, 90.6 m | 0.44 |
| moon-haworth (listed) | 0.60 (p 0.98) [0.15] | 0.10 (p 0.00) [0.65] | 0.00 (p 0.04) [0.00] | 0.99 (p 0.99) [0.00] | 0.00 (p 0.16) [0.00] | 3.28 deg, 56.9 m | 0.42 |
| moon-shackleton-rim (listed) | 0.60 (p 0.98) [0.15] | 0.54 (p 0.92) [0.75] | 0.00 (p 0.04) [0.00] | 0.99 (p 0.99) [0.00] | 0.00 (p 0.16) [0.00] | 4.68 deg, 68.9 m | 0.43 |
| moon-marius-hills | 1.00 (p 0.98) [0.60] | 0.00 (p 0.06) [0.00] | 0.00 (p 0.04) [0.00] | 0.99 (p 0.99) [0.00] | 0.93 (p 0.84) [0.93] | 1.12 deg, 20.3 m | 0.00 |
| mars-jezero | 1.00 (p 0.98) [0.60] | 0.00 (p 0.03) [0.00] | 0.00 (p 0.04) [0.00] | 0.99 (p 0.99) [0.00] | 1.00 (p 0.99) [1.00] | 1.21 deg, 28.3 m | 0.01 |
| mars-gale | 0.15 (p 0.28) [0.15] | 0.00 (p 0.00) [0.90] | 0.00 (p 0.04) [0.00] | 0.99 (p 0.99) [0.00] | 0.96 (p 0.84) [0.96] | 0.47 deg, 7.4 m | 0.40 |
| mars-arcadia-planitia | no data [no data] | 0.00 (p 0.10) [0.00] | 0.00 (p 0.04) [0.00] | 0.99 (p 0.99) [0.00] | 0.44 (p 0.63) [0.44] | 0.07 deg, 1.0 m | 0.00 |

Purpose scores at site scale, 0 to 100. In brackets: the 0.5 degree cell.

| Target | Instrument and geology testing | Rover mobility | Ice and resources | Astrobiology | Full base rehearsal |
| --- | --- | --- | --- | --- | --- |
| moon-malapert-massif (listed) | 60.0 (p 0.98) [15.0] | 94.9 (p 1.00) [0.1] | 0.0 (p 0.04) [0.0] | 0.0 (p 0.46) [0.0] | 0.2 (p 0.46) [0.0] |
| moon-mons-mouton (listed) | 60.0 (p 0.98) [15.0] | 80.1 (p 1.00) [0.1] | 0.0 (p 0.04) [0.0] | 0.0 (p 0.46) [0.0] | 0.2 (p 0.46) [0.0] |
| moon-haworth (listed) | 60.0 (p 0.98) [15.0] | 28.5 (p 0.83) [0.1] | 0.0 (p 0.04) [0.0] | 0.0 (p 0.46) [0.0] | 0.1 (p 0.44) [0.0] |
| moon-shackleton-rim (listed) | 60.0 (p 0.98) [15.0] | 70.8 (p 0.99) [0.1] | 0.0 (p 0.04) [0.0] | 0.0 (p 0.46) [0.0] | 0.1 (p 0.46) [0.0] |
| moon-marius-hills | 100.0 (p 0.98) [60.0] | 0.1 (p 0.51) [0.0] | 0.0 (p 0.05) [0.0] | 0.0 (p 0.46) [0.0] | 0.0 (p 0.40) [0.0] |
| mars-jezero | 100.0 (p 0.98) [60.0] | 0.1 (p 0.49) [0.0] | 0.0 (p 0.05) [0.0] | 0.0 (p 0.46) [0.0] | 0.0 (p 0.38) [0.0] |
| mars-gale | 15.0 (p 0.28) [15.0] | 0.0 (p 0.41) [0.1] | 0.0 (p 0.04) [0.0] | 0.0 (p 0.44) [0.0] | 0.0 (p 0.35) [0.0] |
| mars-arcadia-planitia | no score: coverage-too-low [no score] | 0.0 (p 0.48) [0.0] | 0.0 (p 0.04) [0.0] | 0.0 (p 0.44) [0.0] | 0.0 (p 0.41) [0.0] |

### Kilauea, Hawaii, USA

Footprint 5 km. Summit caldera of Kilauea. Terrain window: 11 x 11 posts of 463 m (121 land posts).

| Input | Site value | Scale | 0.5 degree cell |
| --- | --- | --- | --- |
| Slope (degrees) | 2.81 | site | 4.16 |
| Roughness (m) | 58.7 | site, window-dependent | 598.4 |
| NDVI | 0.23, 50% of the footprint bare | site | 0.48 |
| Rock class | 2 Basic volcanic rocks ("basalt") | site | no data |
| Mean temperature (deg C) | 21.9 | grid | same |
| Day-night range (deg C) | 3.7 | grid | same |
| Precipitation (mm/year) | 1554 | grid | same |

Similarity per dimension at site scale, 0 to 1. In brackets: the same dimension from the 0.5 degree cell.

| Target | Geology | Terrain | Climate | Bare ground | Sunlight | Target terrain in the same window | Terrain against the 55.6 km target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moon-malapert-massif (listed) | 0.60 (p 0.98) [no data] | 0.36 (p 0.86) [0.47] | 0.00 (p 0.07) [0.00] | 0.18 (p 0.78) [0.00] | 0.00 (p 0.16) [0.00] | 11.28 deg, 178.0 m | 0.24 |
| moon-mons-mouton (listed) | 0.60 (p 0.98) [no data] | 0.81 (p 0.99) [0.62] | 0.00 (p 0.07) [0.00] | 0.18 (p 0.78) [0.00] | 0.00 (p 0.16) [0.00] | 4.35 deg, 88.9 m | 0.25 |
| moon-haworth (listed) | 0.60 (p 0.98) [no data] | 0.99 (p 1.00) [0.49] | 0.00 (p 0.07) [0.00] | 0.18 (p 0.78) [0.00] | 0.00 (p 0.16) [0.00] | 3.19 deg, 59.2 m | 0.25 |
| moon-shackleton-rim (listed) | 0.60 (p 0.98) [no data] | 0.74 (p 0.98) [0.61] | 0.00 (p 0.07) [0.00] | 0.18 (p 0.78) [0.00] | 0.00 (p 0.16) [0.00] | 5.21 deg, 88.7 m | 0.24 |
| moon-marius-hills | 1.00 (p 0.98) [no data] | 0.40 (p 0.69) [0.02] | 0.00 (p 0.07) [0.00] | 0.18 (p 0.78) [0.00] | 0.93 (p 0.84) [0.94] | 1.03 deg, 22.2 m | 0.43 |
| mars-jezero (listed) | 1.00 (p 0.98) [no data] | 0.58 (p 0.87) [0.22] | 0.00 (p 0.07) [0.00] | 0.18 (p 0.78) [0.00] | 1.00 (p 0.99) [1.00] | 1.39 deg, 36.8 m | 0.53 |
| mars-gale (listed) | 0.15 (p 0.28) [no data] | 0.22 (p 0.64) [0.69] | 0.00 (p 0.07) [0.00] | 0.18 (p 0.78) [0.00] | 0.96 (p 0.84) [0.96] | 0.55 deg, 10.0 m | 0.30 |
| mars-arcadia-planitia | no data [no data] | 0.11 (p 0.27) [0.00] | 0.00 (p 0.07) [0.00] | 0.18 (p 0.78) [0.00] | 0.43 (p 0.63) [0.43] | 0.09 deg, 1.4 m | 0.17 |

Purpose scores at site scale, 0 to 100. In brackets: the 0.5 degree cell.

| Target | Instrument and geology testing | Rover mobility | Ice and resources | Astrobiology | Full base rehearsal |
| --- | --- | --- | --- | --- | --- |
| moon-malapert-massif (listed) | 60.0 (p 0.98) [no score] | 26.8 (p 0.82) [1.0] | 0.0 (p 0.07) [no score] | 0.1 (p 0.50) [0.0] | 0.3 (p 0.48) [0.0] |
| moon-mons-mouton (listed) | 60.0 (p 0.98) [no score] | 41.8 (p 0.94) [1.1] | 0.0 (p 0.07) [no score] | 0.1 (p 0.50) [0.0] | 0.4 (p 0.49) [0.0] |
| moon-haworth (listed) | 60.0 (p 0.98) [no score] | 46.7 (p 0.96) [1.0] | 0.0 (p 0.07) [no score] | 0.1 (p 0.50) [0.0] | 0.4 (p 0.50) [0.0] |
| moon-shackleton-rim (listed) | 60.0 (p 0.98) [no score] | 39.9 (p 0.93) [1.1] | 0.0 (p 0.07) [no score] | 0.1 (p 0.50) [0.0] | 0.4 (p 0.49) [0.0] |
| moon-marius-hills | 100.0 (p 0.98) [no score] | 28.1 (p 0.84) [0.2] | 0.0 (p 0.08) [0.0] | 0.1 (p 0.49) [0.0] | 0.8 (p 0.55) [0.0] |
| mars-jezero (listed) | 100.0 (p 0.98) [no score] | 34.7 (p 0.87) [0.6] | 0.0 (p 0.08) [0.0] | 0.1 (p 0.49) [0.0] | 0.9 (p 0.53) [0.0] |
| mars-gale (listed) | 15.0 (p 0.28) [no score] | 20.3 (p 0.78) [1.2] | 0.0 (p 0.07) [0.0] | 0.1 (p 0.47) [0.0] | 0.5 (p 0.48) [0.1] |
| mars-arcadia-planitia | no score: coverage-too-low [no score] | 14.0 (p 0.79) [0.0] | 0.0 (p 0.07) [0.0] | 0.0 (p 0.47) [0.0] | 0.2 (p 0.54) [0.0] |

### Atacama Desert hyperarid core (Yungay), Chile

Footprint 5 km. Centred on the published approximate position (24 S, 70 W), not a surveyed station. Terrain window: 11 x 11 posts of 463 m (121 land posts).

The site lies on a cell edge. The cell used here is the one the global score snaps to (centre -24.25, -70.25); data/sites.json quotes the neighbouring cell, so its "grid" column differs.

| Input | Site value | Scale | 0.5 degree cell |
| --- | --- | --- | --- |
| Slope (degrees) | 2.93 | site | 6.43 |
| Roughness (m) | 67.9 | site, window-dependent | 480.0 |
| NDVI | 0.09, 100% of the footprint bare | site | 0.08 |
| Rock class | 9 Acid plutonic rocks ("Granite") | site | 13 Intermediate plutonic rocks |
| Mean temperature (deg C) | 16.0 | grid | same |
| Day-night range (deg C) | 15.9 | grid | same |
| Precipitation (mm/year) | 9 | grid | same |

Similarity per dimension at site scale, 0 to 1. In brackets: the same dimension from the 0.5 degree cell.

| Target | Geology | Terrain | Climate | Bare ground | Sunlight | Target terrain in the same window | Terrain against the 55.6 km target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | 0.15 (p 0.48) [0.60] | 0.39 (p 0.88) [0.53] | 0.03 (p 0.54) [0.02] | 0.93 (p 0.97) [0.96] | 0.00 (p 0.20) [0.00] | 11.28 deg, 178.0 m | 0.25 |
| moon-mons-mouton | 0.15 (p 0.48) [0.60] | 0.86 (p 1.00) [0.68] | 0.03 (p 0.54) [0.02] | 0.93 (p 0.97) [0.96] | 0.00 (p 0.20) [0.00] | 4.35 deg, 88.9 m | 0.26 |
| moon-haworth | 0.15 (p 0.48) [0.60] | 0.99 (p 1.00) [0.56] | 0.03 (p 0.54) [0.02] | 0.93 (p 0.97) [0.96] | 0.00 (p 0.20) [0.00] | 3.19 deg, 59.2 m | 0.26 |
| moon-shackleton-rim | 0.15 (p 0.48) [0.60] | 0.79 (p 0.99) [0.68] | 0.03 (p 0.54) [0.02] | 0.93 (p 0.97) [0.96] | 0.00 (p 0.20) [0.00] | 5.21 deg, 88.7 m | 0.25 |
| moon-marius-hills | 0.15 (p 0.47) [0.15] | 0.33 (p 0.59) [0.00] | 0.06 (p 0.61) [0.05] | 0.93 (p 0.97) [0.96] | 0.83 (p 0.80) [0.82] | 1.03 deg, 22.2 m | 0.43 |
| mars-jezero (listed) | 0.15 (p 0.47) [0.15] | 0.50 (p 0.82) [0.08] | 0.06 (p 0.61) [0.05] | 0.93 (p 0.97) [0.96] | 0.97 (p 0.90) [0.97] | 1.39 deg, 36.8 m | 0.55 |
| mars-gale (listed) | 0.15 (p 0.28) [0.15] | 0.17 (p 0.46) [0.68] | 0.06 (p 0.61) [0.05] | 0.93 (p 0.97) [0.96] | 0.87 (p 0.80) [0.86] | 0.55 deg, 10.0 m | 0.31 |
| mars-arcadia-planitia | no data [no data] | 0.09 (p 0.26) [0.00] | 0.06 (p 0.61) [0.05] | 0.93 (p 0.97) [0.96] | 0.57 (p 0.70) [0.58] | 0.09 deg, 1.4 m | 0.13 |

Purpose scores at site scale, 0 to 100. In brackets: the 0.5 degree cell.

| Target | Instrument and geology testing | Rover mobility | Ice and resources | Astrobiology | Full base rehearsal |
| --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | 15.0 (p 0.48) [60.0] | 57.7 (p 0.98) [69.2] | 1.9 (p 0.35) [3.0] | 14.1 (p 0.91) [19.9] | 10.1 (p 0.82) [13.7] |
| moon-mons-mouton | 15.0 (p 0.48) [60.0] | 88.9 (p 1.00) [79.6] | 1.9 (p 0.35) [3.0] | 14.1 (p 0.91) [19.9] | 12.5 (p 0.85) [14.7] |
| moon-haworth | 15.0 (p 0.48) [60.0] | 95.9 (p 1.00) [70.9] | 1.9 (p 0.35) [3.0] | 14.1 (p 0.91) [19.9] | 12.9 (p 0.86) [13.9] |
| moon-shackleton-rim | 15.0 (p 0.48) [60.0] | 84.9 (p 1.00) [79.3] | 1.9 (p 0.35) [3.0] | 14.1 (p 0.91) [19.9] | 12.2 (p 0.85) [14.6] |
| moon-marius-hills | 15.0 (p 0.47) [15.0] | 52.0 (p 0.94) [2.4] | 12.5 (p 0.98) [10.7] | 17.3 (p 0.95) [15.4] | 23.7 (p 0.98) [5.4] |
| mars-jezero (listed) | 15.0 (p 0.47) [15.0] | 65.9 (p 0.97) [23.8] | 12.8 (p 0.96) [11.1] | 17.3 (p 0.95) [15.4] | 26.8 (p 0.99) [15.6] |
| mars-gale (listed) | 15.0 (p 0.28) [15.0] | 36.4 (p 0.91) [79.3] | 12.6 (p 0.92) [10.8] | 17.3 (p 0.91) [15.4] | 20.3 (p 0.95) [26.5] |
| mars-arcadia-planitia | no score: coverage-too-low [no score] | 24.6 (p 0.83) [0.0] | 10.6 (p 0.67) [8.7] | 18.0 (p 0.96) [15.6] | 16.6 (p 0.86) [0.0] |

### Haughton impact structure, Devon Island, Canada

Footprint 5 km. Central part of the 23 km impact structure only. Terrain window: 11 x 11 posts of 463 m (121 land posts).

| Input | Site value | Scale | 0.5 degree cell |
| --- | --- | --- | --- |
| Slope (degrees) | 1.19 | site | 1.56 |
| Roughness (m) | 16.0 | site, window-dependent | 69.1 |
| NDVI | 0.07, 100% of the footprint bare | site | 0.04 |
| Rock class | no data ("sedimentary") | site | 5 Mixed sedimentary rocks |
| Mean temperature (deg C) | -14.7 | grid | same |
| Day-night range (deg C) | 4.8 | grid | same |
| Precipitation (mm/year) | 342 | grid | same |

Similarity per dimension at site scale, 0 to 1. In brackets: the same dimension from the 0.5 degree cell.

| Target | Geology | Terrain | Climate | Bare ground | Sunlight | Target terrain in the same window | Terrain against the 55.6 km target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | no data [0.15] | 0.20 (p 0.60) [0.21] | 0.17 (p 0.72) [0.17] | 0.96 (p 0.98) [0.98] | 0.84 (p 0.76) [0.84] | 11.28 deg, 178.0 m | 0.19 |
| moon-mons-mouton | no data [0.15] | 0.35 (p 0.82) [0.21] | 0.17 (p 0.72) [0.17] | 0.96 (p 0.98) [0.98] | 0.84 (p 0.76) [0.84] | 4.35 deg, 88.9 m | 0.18 |
| moon-haworth | no data [0.15] | 0.56 (p 0.96) [0.21] | 0.17 (p 0.72) [0.17] | 0.96 (p 0.98) [0.98] | 0.84 (p 0.76) [0.84] | 3.19 deg, 59.2 m | 0.19 |
| moon-shackleton-rim | no data [0.15] | 0.33 (p 0.81) [0.20] | 0.17 (p 0.72) [0.17] | 0.96 (p 0.98) [0.98] | 0.84 (p 0.76) [0.84] | 5.21 deg, 88.7 m | 0.17 |
| moon-marius-hills | no data [0.15] | 0.99 (p 1.00) [0.61] | 0.10 (p 0.70) [0.10] | 0.96 (p 0.98) [0.98] | 0.00 (p 0.24) [0.00] | 1.03 deg, 22.2 m | 0.39 |
| mars-jezero (listed) | no data [0.15] | 0.95 (p 0.99) [0.47] | 0.10 (p 0.70) [0.10] | 0.96 (p 0.98) [0.98] | 0.00 (p 0.24) [0.00] | 1.39 deg, 36.8 m | 0.30 |
| mars-gale (listed) | no data [0.60] | 0.90 (p 1.00) [0.23] | 0.10 (p 0.70) [0.10] | 0.96 (p 0.98) [0.98] | 0.00 (p 0.24) [0.00] | 0.55 deg, 10.0 m | 0.20 |
| mars-arcadia-planitia (listed) | no data [no data] | 0.72 (p 0.44) [0.50] | 0.10 (p 0.70) [0.10] | 0.96 (p 0.98) [0.98] | 0.08 (p 0.24) [0.08] | 0.09 deg, 1.4 m | 0.81 |

Purpose scores at site scale, 0 to 100. In brackets: the 0.5 degree cell.

| Target | Instrument and geology testing | Rover mobility | Ice and resources | Astrobiology | Full base rehearsal |
| --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | no score: coverage-too-low [15.0] | 39.7 (p 0.93) [41.5] | no score: coverage-too-low [22.6] | 37.8 (p 1.00) [29.9] | 34.0 (p 0.99) [30.4] |
| moon-mons-mouton | no score: coverage-too-low [15.0] | 54.5 (p 0.97) [41.5] | no score: coverage-too-low [22.6] | 37.8 (p 1.00) [29.9] | 40.8 (p 1.00) [30.4] |
| moon-haworth | no score: coverage-too-low [15.0] | 71.1 (p 1.00) [41.6] | no score: coverage-too-low [22.6] | 37.8 (p 1.00) [29.9] | 47.6 (p 1.00) [30.4] |
| moon-shackleton-rim | no score: coverage-too-low [15.0] | 52.6 (p 0.97) [41.0] | no score: coverage-too-low [22.6] | 37.8 (p 1.00) [29.9] | 40.0 (p 1.00) [30.2] |
| moon-marius-hills | no score: coverage-too-low [15.0] | 97.6 (p 1.00) [75.1] | 2.5 (p 0.31) [4.1] | 24.0 (p 0.99) [21.7] | 17.3 (p 0.93) [15.1] |
| mars-jezero (listed) | no score: coverage-too-low [15.0] | 95.3 (p 1.00) [65.4] | 3.6 (p 0.35) [5.3] | 24.0 (p 0.99) [21.7] | 20.3 (p 0.96) [16.4] |
| mars-gale (listed) | no score: coverage-too-low [60.0] | 92.4 (p 1.00) [44.3] | 2.7 (p 0.29) [6.3] | 24.0 (p 0.97) [29.8] | 17.6 (p 0.91) [15.2] |
| mars-arcadia-planitia (listed) | no score: coverage-too-low [no score] | 81.9 (p 0.95) [67.4] | 9.0 (p 0.61) [9.1] | 24.0 (p 0.98) [24.2] | 29.0 (p 0.98) [26.2] |

### Timanfaya, Lanzarote, Spain

Footprint 5 km. Timanfaya lava field at the listed coordinates. Terrain window: 11 x 11 posts of 463 m (121 land posts).

| Input | Site value | Scale | 0.5 degree cell |
| --- | --- | --- | --- |
| Slope (degrees) | 2.63 | site | 3.30 |
| Roughness (m) | 58.3 | site, window-dependent | 115.0 |
| NDVI | 0.02, 100% of the footprint bare | site | 0.10 |
| Rock class | 2 Basic volcanic rocks ("mafic volcanic rocks") | site | no data |
| Mean temperature (deg C) | 20.2 | grid | same |
| Day-night range (deg C) | 2.4 | grid | same |
| Precipitation (mm/year) | 102 | grid | same |

Similarity per dimension at site scale, 0 to 1. In brackets: the same dimension from the 0.5 degree cell.

| Target | Geology | Terrain | Climate | Bare ground | Sunlight | Target terrain in the same window | Terrain against the 55.6 km target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moon-malapert-massif (listed) | 0.60 (p 0.98) [no data] | 0.35 (p 0.85) [0.28] | 0.01 (p 0.48) [0.01] | 0.95 (p 0.98) [0.87] | 0.00 (p 0.25) [0.00] | 11.28 deg, 178.0 m | 0.24 |
| moon-mons-mouton (listed) | 0.60 (p 0.98) [no data] | 0.78 (p 0.99) [0.30] | 0.01 (p 0.48) [0.01] | 0.95 (p 0.98) [0.87] | 0.00 (p 0.25) [0.00] | 4.35 deg, 88.9 m | 0.24 |
| moon-haworth (listed) | 0.60 (p 0.98) [no data] | 0.97 (p 1.00) [0.28] | 0.01 (p 0.48) [0.01] | 0.95 (p 0.98) [0.87] | 0.00 (p 0.25) [0.00] | 3.19 deg, 59.2 m | 0.24 |
| moon-shackleton-rim (listed) | 0.60 (p 0.98) [no data] | 0.71 (p 0.97) [0.29] | 0.01 (p 0.48) [0.01] | 0.95 (p 0.98) [0.87] | 0.00 (p 0.25) [0.00] | 5.21 deg, 88.7 m | 0.23 |
| moon-marius-hills | 1.00 (p 0.98) [no data] | 0.46 (p 0.76) [0.42] | 0.01 (p 0.32) [0.01] | 0.95 (p 0.98) [0.87] | 0.64 (p 0.75) [0.65] | 1.03 deg, 22.2 m | 0.47 |
| mars-jezero (listed) | 1.00 (p 0.98) [no data] | 0.65 (p 0.91) [0.65] | 0.01 (p 0.32) [0.01] | 0.95 (p 0.98) [0.87] | 0.85 (p 0.75) [0.86] | 1.39 deg, 36.8 m | 0.53 |
| mars-gale (listed) | 0.15 (p 0.28) [no data] | 0.27 (p 0.73) [0.35] | 0.01 (p 0.32) [0.01] | 0.95 (p 0.98) [0.87] | 0.69 (p 0.75) [0.70] | 0.55 deg, 10.0 m | 0.29 |
| mars-arcadia-planitia | no data [no data] | 0.14 (p 0.28) [0.04] | 0.01 (p 0.32) [0.01] | 0.95 (p 0.98) [0.87] | 0.77 (p 0.81) [0.76] | 0.09 deg, 1.4 m | 0.21 |

Purpose scores at site scale, 0 to 100. In brackets: the 0.5 degree cell.

| Target | Instrument and geology testing | Rover mobility | Ice and resources | Astrobiology | Full base rehearsal |
| --- | --- | --- | --- | --- | --- |
| moon-malapert-massif (listed) | 60.0 (p 0.98) [no score] | 54.9 (p 0.98) [46.0] | 3.1 (p 0.42) [no score] | 16.7 (p 0.94) [10.2] | 12.5 (p 0.86) [8.2] |
| moon-mons-mouton (listed) | 60.0 (p 0.98) [no score] | 85.2 (p 1.00) [48.0] | 3.1 (p 0.42) [no score] | 16.7 (p 0.94) [10.2] | 15.5 (p 0.90) [8.5] |
| moon-haworth (listed) | 60.0 (p 0.98) [no score] | 96.2 (p 1.00) [46.6] | 3.1 (p 0.42) [no score] | 16.7 (p 0.94) [10.2] | 16.4 (p 0.91) [8.3] |
| moon-shackleton-rim (listed) | 60.0 (p 0.98) [no score] | 81.2 (p 1.00) [47.0] | 3.1 (p 0.42) [no score] | 16.7 (p 0.94) [10.2] | 15.1 (p 0.89) [8.4] |
| moon-marius-hills | 100.0 (p 0.98) [no score] | 63.7 (p 0.97) [58.4] | 7.8 (p 0.82) [3.0] | 12.3 (p 0.87) [6.3] | 20.1 (p 0.96) [14.5] |
| mars-jezero (listed) | 100.0 (p 0.98) [no score] | 77.1 (p 0.99) [74.2] | 8.3 (p 0.76) [3.3] | 12.3 (p 0.87) [6.3] | 22.6 (p 0.97) [17.0] |
| mars-gale (listed) | 15.0 (p 0.28) [no score] | 47.0 (p 0.96) [52.8] | 4.7 (p 0.41) [3.1] | 7.9 (p 0.75) [6.3] | 13.3 (p 0.84) [13.9] |
| mars-arcadia-planitia | no score: coverage-too-low [no score] | 33.3 (p 0.85) [15.4] | 3.2 (p 0.34) [3.2] | 6.5 (p 0.77) [6.3] | 11.0 (p 0.81) [7.3] |

### Dallol, Danakil Depression, Ethiopia

Footprint 3 km (provisional). Dallol crater and hydrothermal field on the Danakil salt plain. Terrain window: 6 x 6 posts of 463 m (36 land posts).

| Input | Site value | Scale | 0.5 degree cell |
| --- | --- | --- | --- |
| Slope (degrees) | 1.25 | site | 2.59 |
| Roughness (m) | 12.5 | site, window-dependent | 331.1 |
| NDVI | 0.01, 100% of the footprint bare | site | 0.08 |
| Rock class | no data ("volcanic") | site | 1 Unconsolidated sediments |
| Mean temperature (deg C) | 29.4 | grid | same |
| Day-night range (deg C) | 12.0 | grid | same |
| Precipitation (mm/year) | 342 | grid | same |

Similarity per dimension at site scale, 0 to 1. In brackets: the same dimension from the 0.5 degree cell.

| Target | Geology | Terrain | Climate | Bare ground | Sunlight | Target terrain in the same window | Terrain against the 55.6 km target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | no data [0.15] | 0.32 (p 0.82) [0.32] | 0.00 (p 0.28) [0.00] | 0.91 (p 0.96) [0.96] | 0.00 (p 0.11) [0.00] | 8.02 deg, 77.5 m | 0.19 |
| moon-mons-mouton | no data [0.15] | 0.32 (p 0.80) [0.38] | 0.00 (p 0.28) [0.00] | 0.91 (p 0.96) [0.96] | 0.00 (p 0.11) [0.00] | 6.36 deg, 82.5 m | 0.18 |
| moon-haworth | no data [0.15] | 0.61 (p 0.98) [0.32] | 0.00 (p 0.28) [0.00] | 0.91 (p 0.96) [0.96] | 0.00 (p 0.11) [0.00] | 3.35 deg, 43.8 m | 0.19 |
| moon-shackleton-rim | no data [0.15] | 0.69 (p 0.97) [0.37] | 0.00 (p 0.28) [0.00] | 0.91 (p 0.96) [0.96] | 0.00 (p 0.11) [0.00] | 2.81 deg, 36.2 m | 0.17 |
| moon-marius-hills | no data [0.15] | 0.98 (p 1.00) [0.68] | 0.01 (p 0.31) [0.01] | 0.91 (p 0.96) [0.96] | 0.98 (p 0.89) [0.98] | 1.50 deg, 17.7 m | 0.39 |
| mars-jezero (listed) | no data [0.15] | 0.99 (p 1.00) [0.98] | 0.01 (p 0.31) [0.01] | 0.91 (p 0.96) [0.96] | 0.98 (p 0.91) [0.98] | 1.08 deg, 14.4 m | 0.30 |
| mars-gale (listed) | no data [0.60] | 0.82 (p 1.00) [0.42] | 0.01 (p 0.31) [0.01] | 0.91 (p 0.96) [0.96] | 0.99 (p 0.89) [0.99] | 0.37 deg, 4.4 m | 0.20 |
| mars-arcadia-planitia | no data [no data] | 0.71 (p 0.43) [0.00] | 0.01 (p 0.31) [0.01] | 0.91 (p 0.96) [0.96] | 0.34 (p 0.55) [0.34] | 0.10 deg, 1.1 m | 0.79 |

Purpose scores at site scale, 0 to 100. In brackets: the 0.5 degree cell.

| Target | Instrument and geology testing | Rover mobility | Ice and resources | Astrobiology | Full base rehearsal |
| --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | no score: coverage-too-low [15.0] | 51.1 (p 0.97) [51.7] | no score: coverage-too-low [0.5] | 4.4 (p 0.72) [6.1] | 3.7 (p 0.65) [4.7] |
| moon-mons-mouton | no score: coverage-too-low [15.0] | 51.1 (p 0.97) [56.9] | no score: coverage-too-low [0.5] | 4.4 (p 0.72) [6.1] | 3.7 (p 0.65) [4.9] |
| moon-haworth | no score: coverage-too-low [15.0] | 73.0 (p 1.00) [52.4] | no score: coverage-too-low [0.5] | 4.4 (p 0.72) [6.1] | 4.6 (p 0.68) [4.7] |
| moon-shackleton-rim | no score: coverage-too-low [15.0] | 78.4 (p 1.00) [56.9] | no score: coverage-too-low [0.5] | 4.4 (p 0.72) [6.1] | 4.8 (p 0.68) [4.9] |
| moon-marius-hills | no score: coverage-too-low [15.0] | 95.0 (p 1.00) [79.5] | 3.1 (p 0.35) [4.8] | 6.0 (p 0.74) [7.5] | 19.0 (p 0.95) [16.9] |
| mars-jezero (listed) | no score: coverage-too-low [15.0] | 95.6 (p 1.00) [96.9] | 3.1 (p 0.32) [4.8] | 6.0 (p 0.74) [7.5] | 19.1 (p 0.95) [18.5] |
| mars-gale (listed) | no score: coverage-too-low [60.0] | 85.9 (p 1.00) [60.4] | 3.1 (p 0.31) [7.0] | 6.0 (p 0.72) [10.4] | 18.0 (p 0.92) [18.4] |
| mars-arcadia-planitia | no score: coverage-too-low [no score] | 79.2 (p 0.94) [0.2] | 2.4 (p 0.30) [2.4] | 6.0 (p 0.76) [6.1] | 15.2 (p 0.85) [0.6] |

### Dasht-e Lut (Lut Desert), Iran

Footprint 5 km (provisional). One 5 km sample of the Lut Desert, not the whole desert. Terrain window: 11 x 11 posts of 463 m (121 land posts). Defined by Session B in pipeline/sites.py; not listed in data/analogs.json, so the global score does not rank it by name.

| Input | Site value | Scale | 0.5 degree cell |
| --- | --- | --- | --- |
| Slope (degrees) | 5.31 | site | 3.57 |
| Roughness (m) | 65.7 | site, window-dependent | 148.1 |
| NDVI | 0.07, 100% of the footprint bare | site | 0.10 |
| Rock class | no data | site | 1 Unconsolidated sediments |
| Mean temperature (deg C) | 25.0 | grid | same |
| Day-night range (deg C) | 15.3 | grid | same |
| Precipitation (mm/year) | 66 | grid | same |

Similarity per dimension at site scale, 0 to 1. In brackets: the same dimension from the 0.5 degree cell.

| Target | Geology | Terrain | Climate | Bare ground | Sunlight | Target terrain in the same window | Terrain against the 55.6 km target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | no data [0.15] | 0.51 (p 0.94) [0.30] | 0.01 (p 0.41) [0.01] | 0.97 (p 0.98) [0.89] | 0.00 (p 0.27) [0.00] | 11.28 deg, 178.0 m | 0.32 |
| moon-mons-mouton | no data [0.15] | 0.90 (p 1.00) [0.33] | 0.01 (p 0.41) [0.01] | 0.97 (p 0.98) [0.89] | 0.00 (p 0.27) [0.00] | 4.35 deg, 88.9 m | 0.34 |
| moon-haworth | no data [0.15] | 0.64 (p 0.98) [0.30] | 0.01 (p 0.41) [0.01] | 0.97 (p 0.98) [0.89] | 0.00 (p 0.27) [0.00] | 3.19 deg, 59.2 m | 0.33 |
| moon-shackleton-rim | no data [0.15] | 0.95 (p 1.00) [0.32] | 0.01 (p 0.41) [0.01] | 0.97 (p 0.98) [0.89] | 0.00 (p 0.27) [0.00] | 5.21 deg, 88.7 m | 0.33 |
| moon-marius-hills | no data [0.15] | 0.01 (p 0.11) [0.38] | 0.03 (p 0.45) [0.03] | 0.97 (p 0.98) [0.89] | 0.59 (p 0.73) [0.59] | 1.03 deg, 22.2 m | 0.03 |
| mars-jezero | no data [0.15] | 0.02 (p 0.07) [0.69] | 0.03 (p 0.45) [0.03] | 0.97 (p 0.98) [0.89] | 0.81 (p 0.73) [0.81] | 1.39 deg, 36.8 m | 0.19 |
| mars-gale | no data [0.60] | 0.00 (p 0.00) [0.39] | 0.03 (p 0.45) [0.03] | 0.97 (p 0.98) [0.89] | 0.64 (p 0.73) [0.64] | 0.55 deg, 10.0 m | 0.40 |
| mars-arcadia-planitia | no data [no data] | 0.00 (p 0.17) [0.01] | 0.03 (p 0.45) [0.03] | 0.97 (p 0.98) [0.89] | 0.82 (p 0.83) [0.82] | 0.09 deg, 1.4 m | 0.00 |

Purpose scores at site scale, 0 to 100. In brackets: the 0.5 degree cell.

| Target | Instrument and geology testing | Rover mobility | Ice and resources | Astrobiology | Full base rehearsal |
| --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | no score: coverage-too-low [15.0] | 67.7 (p 0.99) [48.3] | no score: coverage-too-low [1.7] | 8.2 (p 0.80) [9.3] | 9.3 (p 0.81) [8.5] |
| moon-mons-mouton | no score: coverage-too-low [15.0] | 93.2 (p 1.00) [51.1] | no score: coverage-too-low [1.7] | 8.2 (p 0.80) [9.3] | 11.2 (p 0.84) [8.8] |
| moon-haworth | no score: coverage-too-low [15.0] | 77.1 (p 1.00) [49.0] | no score: coverage-too-low [1.7] | 8.2 (p 0.80) [9.3] | 10.0 (p 0.82) [8.6] |
| moon-shackleton-rim | no score: coverage-too-low [15.0] | 95.8 (p 1.00) [50.2] | no score: coverage-too-low [1.7] | 8.2 (p 0.80) [9.3] | 11.4 (p 0.84) [8.7] |
| moon-marius-hills | no score: coverage-too-low [15.0] | 6.9 (p 0.72) [55.7] | 5.9 (p 0.67) [7.6] | 11.4 (p 0.85) [11.9] | 6.4 (p 0.75) [18.6] |
| mars-jezero | no score: coverage-too-low [15.0] | 11.2 (p 0.73) [77.6] | 6.4 (p 0.54) [8.1] | 11.4 (p 0.85) [11.9] | 8.6 (p 0.76) [22.4] |
| mars-gale | no score: coverage-too-low [60.0] | 3.5 (p 0.63) [56.0] | 6.0 (p 0.58) [11.3] | 11.4 (p 0.81) [16.3] | 4.6 (p 0.65) [23.2] |
| mars-arcadia-planitia | no score: coverage-too-low [no score] | 1.8 (p 0.68) [8.0] | 6.4 (p 0.49) [6.4] | 11.4 (p 0.88) [11.1] | 3.3 (p 0.70) [7.2] |

### Salar de Uyuni salt flat, Bolivia

Footprint 5 km (provisional). One 5 km sample of the salt flat. Terrain window: 11 x 11 posts of 463 m (5 land posts). Defined by Session B in pipeline/sites.py; not listed in data/analogs.json, so the global score does not rank it by name. Caveat from sites.json: The Copernicus DEM water body mask classes 96% of this footprint as water (the salt flat floods in the wet season) and Sentinel-2 classes most clear views of the salt as snow. Terrain on 463 m posts is therefore null, and slopeFine, roughnessFine, ndvi and bareFrac rest on the 4% of the footprint outside the mask. waterFrac here is not a measurement of open water.

| Input | Site value | Scale | 0.5 degree cell |
| --- | --- | --- | --- |
| Slope (degrees) | no data | site | 1.82 |
| Roughness (m) | no data | site, window-dependent | 31.2 |
| NDVI | 0.02, 100% of the footprint bare | site | 0.03 |
| Rock class | no data ("Evaporite") | site | 14 Evaporites |
| Mean temperature (deg C) | 7.6 | grid | same |
| Day-night range (deg C) | 17.1 | grid | same |
| Precipitation (mm/year) | 227 | grid | same |

Similarity per dimension at site scale, 0 to 1. In brackets: the same dimension from the 0.5 degree cell.

| Target | Geology | Terrain | Climate | Bare ground | Sunlight | Target terrain in the same window | Terrain against the 55.6 km target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | no data [0.15] | no data [0.21] | 0.04 (p 0.60) [0.04] | 0.95 (p 0.98) [0.98] | 0.00 (p 0.17) [0.00] | 11.28 deg, 178.0 m | no data |
| moon-mons-mouton | no data [0.15] | no data [0.20] | 0.04 (p 0.60) [0.04] | 0.95 (p 0.98) [0.98] | 0.00 (p 0.17) [0.00] | 4.35 deg, 88.9 m | no data |
| moon-haworth | no data [0.15] | no data [0.21] | 0.04 (p 0.60) [0.04] | 0.95 (p 0.98) [0.98] | 0.00 (p 0.17) [0.00] | 3.19 deg, 59.2 m | no data |
| moon-shackleton-rim | no data [0.15] | no data [0.20] | 0.04 (p 0.60) [0.04] | 0.95 (p 0.98) [0.98] | 0.00 (p 0.17) [0.00] | 5.21 deg, 88.7 m | no data |
| moon-marius-hills | no data [0.15] | no data [0.47] | 0.09 (p 0.69) [0.09] | 0.95 (p 0.98) [0.98] | 0.92 (p 0.83) [0.92] | 1.03 deg, 22.2 m | no data |
| mars-jezero | no data [0.15] | no data [0.41] | 0.09 (p 0.69) [0.09] | 0.95 (p 0.98) [0.98] | 1.00 (p 0.99) [1.00] | 1.39 deg, 36.8 m | no data |
| mars-gale | no data [0.15] | no data [0.24] | 0.09 (p 0.69) [0.09] | 0.95 (p 0.98) [0.98] | 0.95 (p 0.83) [0.95] | 0.55 deg, 10.0 m | no data |
| mars-arcadia-planitia | no data [no data] | no data [0.54] | 0.09 (p 0.69) [0.09] | 0.95 (p 0.98) [0.98] | 0.46 (p 0.64) [0.45] | 0.09 deg, 1.4 m | no data |

Purpose scores at site scale, 0 to 100. In brackets: the 0.5 degree cell.

| Target | Instrument and geology testing | Rover mobility | Ice and resources | Astrobiology | Full base rehearsal |
| --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | no score: coverage-too-low [15.0] | no score: coverage-too-low [41.4] | no score: coverage-too-low [2.1] | 18.6 (p 0.95) [17.8] | no score: coverage-too-low [9.0] |
| moon-mons-mouton | no score: coverage-too-low [15.0] | no score: coverage-too-low [41.0] | no score: coverage-too-low [2.1] | 18.6 (p 0.95) [17.8] | no score: coverage-too-low [8.9] |
| moon-haworth | no score: coverage-too-low [15.0] | no score: coverage-too-low [41.5] | no score: coverage-too-low [2.1] | 18.6 (p 0.95) [17.8] | no score: coverage-too-low [9.0] |
| moon-shackleton-rim | no score: coverage-too-low [15.0] | no score: coverage-too-low [40.2] | no score: coverage-too-low [2.1] | 18.6 (p 0.95) [17.8] | no score: coverage-too-low [8.9] |
| moon-marius-hills | no score: coverage-too-low [15.0] | no score: coverage-too-low [65.4] | 16.6 (p 0.99) [16.1] | 23.7 (p 0.99) [21.5] | 29.7 (p 1.00) [30.3] |
| mars-jezero | no score: coverage-too-low [15.0] | no score: coverage-too-low [60.4] | 16.9 (p 0.99) [16.4] | 23.7 (p 0.99) [21.5] | 30.1 (p 0.99) [29.5] |
| mars-gale | no score: coverage-too-low [15.0] | no score: coverage-too-low [44.5] | 16.7 (p 0.98) [16.2] | 23.7 (p 0.97) [21.5] | 29.8 (p 0.99) [25.6] |
| mars-arcadia-planitia | no score: coverage-too-low [no score] | no score: coverage-too-low [70.2] | 13.9 (p 0.73) [13.9] | 23.7 (p 0.98) [24.0] | 26.4 (p 0.95) [32.8] |

### Tunupa volcano, north shore of Salar de Uyuni, Bolivia

Footprint 5 km (provisional). Summit area of Tunupa volcano. The salt flat is outside it. Terrain window: 11 x 11 posts of 463 m (121 land posts). Defined by Session B in pipeline/sites.py; not listed in data/analogs.json, so the global score does not rank it by name.

| Input | Site value | Scale | 0.5 degree cell |
| --- | --- | --- | --- |
| Slope (degrees) | 13.78 | site | 5.10 |
| Roughness (m) | 185.7 | site, window-dependent | 220.8 |
| NDVI | 0.12, 80% of the footprint bare | site | 0.12 |
| Rock class | no data ("Andesite and related volcanic") | site | 10 Intermediate volcanic rocks |
| Mean temperature (deg C) | 8.2 | grid | same |
| Day-night range (deg C) | 17.2 | grid | same |
| Precipitation (mm/year) | 292 | grid | same |

Similarity per dimension at site scale, 0 to 1. In brackets: the same dimension from the 0.5 degree cell.

| Target | Geology | Terrain | Climate | Bare ground | Sunlight | Target terrain in the same window | Terrain against the 55.6 km target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | no data [0.15] | 0.95 (p 1.00) [0.38] | 0.03 (p 0.57) [0.03] | 0.77 (p 0.91) [0.80] | 0.00 (p 0.16) [0.00] | 11.28 deg, 178.0 m | 0.50 |
| moon-mons-mouton | no data [0.15] | 0.00 (p 0.00) [0.44] | 0.03 (p 0.57) [0.03] | 0.77 (p 0.91) [0.80] | 0.00 (p 0.16) [0.00] | 4.35 deg, 88.9 m | 0.41 |
| moon-haworth | no data [0.15] | 0.00 (p 0.00) [0.39] | 0.03 (p 0.57) [0.03] | 0.77 (p 0.91) [0.80] | 0.00 (p 0.16) [0.00] | 3.19 deg, 59.2 m | 0.47 |
| moon-shackleton-rim | no data [0.15] | 0.03 (p 0.00) [0.43] | 0.03 (p 0.57) [0.03] | 0.77 (p 0.91) [0.80] | 0.00 (p 0.16) [0.00] | 5.21 deg, 88.7 m | 0.49 |
| moon-marius-hills | no data [0.60] | 0.00 (p 0.01) [0.06] | 0.08 (p 0.66) [0.08] | 0.77 (p 0.91) [0.80] | 0.93 (p 0.84) [0.93] | 1.03 deg, 22.2 m | 0.00 |
| mars-jezero | no data [0.60] | 0.00 (p 0.00) [0.39] | 0.08 (p 0.66) [0.08] | 0.77 (p 0.91) [0.80] | 1.00 (p 0.99) [1.00] | 1.39 deg, 36.8 m | 0.00 |
| mars-gale | no data [0.15] | 0.00 (p 0.00) [0.49] | 0.08 (p 0.66) [0.08] | 0.77 (p 0.91) [0.80] | 0.95 (p 0.84) [0.96] | 0.55 deg, 10.0 m | 0.10 |
| mars-arcadia-planitia | no data [no data] | 0.00 (p 0.03) [0.00] | 0.08 (p 0.66) [0.08] | 0.77 (p 0.91) [0.80] | 0.44 (p 0.63) [0.44] | 0.09 deg, 1.4 m | 0.00 |

Purpose scores at site scale, 0 to 100. In brackets: the 0.5 degree cell.

| Target | Instrument and geology testing | Rover mobility | Ice and resources | Astrobiology | Full base rehearsal |
| --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | no score: coverage-too-low [15.0] | 86.6 (p 1.00) [52.4] | no score: coverage-too-low [1.9] | 14.9 (p 0.92) [15.1] | 11.6 (p 0.84) [9.4] |
| moon-mons-mouton | no score: coverage-too-low [15.0] | 3.9 (p 0.63) [57.2] | no score: coverage-too-low [1.9] | 14.9 (p 0.92) [15.1] | 1.9 (p 0.59) [9.9] |
| moon-haworth | no score: coverage-too-low [15.0] | 0.1 (p 0.45) [53.5] | no score: coverage-too-low [1.9] | 14.9 (p 0.92) [15.1] | 0.2 (p 0.47) [9.5] |
| moon-shackleton-rim | no score: coverage-too-low [15.0] | 11.7 (p 0.71) [56.4] | no score: coverage-too-low [1.9] | 14.9 (p 0.92) [15.1] | 3.6 (p 0.65) [9.8] |
| moon-marius-hills | no score: coverage-too-low [60.0] | 0.0 (p 0.30) [18.8] | 14.6 (p 0.99) [21.5] | 19.6 (p 0.97) [25.7] | 0.0 (p 0.32) [20.2] |
| mars-jezero | no score: coverage-too-low [60.0] | 0.0 (p 0.29) [53.6] | 14.9 (p 0.98) [21.8] | 19.6 (p 0.97) [25.7] | 0.0 (p 0.32) [32.6] |
| mars-gale | no score: coverage-too-low [15.0] | 0.0 (p 0.28) [61.0] | 14.7 (p 0.96) [14.8] | 19.6 (p 0.94) [18.6] | 0.0 (p 0.30) [28.0] |
| mars-arcadia-planitia | no score: coverage-too-low [no score] | 0.0 (p 0.32) [0.4] | 12.1 (p 0.70) [12.1] | 19.6 (p 0.97) [19.9] | 0.0 (p 0.35) [1.9] |


# Targets from anywhere, checked on the real Moon and Mars grids

Written 2026-11-15T13:44:46.986Z by `npx tsx validation/grid_check.ts`. Grids: moon.json (2 degree, 16200 cells, built 2026-11-15T06:43:23Z); mars.json (1 degree, 64800 cells, built 2026-11-15T06:47:52Z).

## 1. Does the grid agree with the curated targets?

The curated value is measured over a 55.6 km window centred on the target; the grid value is that of the cell holding the target. "Tolerances apart" is the gap divided by the frozen tolerance: under 1, a score would barely change.

| Target | Grid cell | Key | Curated | Grid | Tolerances apart |
| --- | --- | --- | --- | --- | --- |
| moon-malapert-massif | 85.00 S, 1.00 W (29.8 km) | slope | 12.3 | 11.19 | 0.18 |
| moon-malapert-massif | 85.00 S, 1.00 W (29.8 km) | roughness | 1571.3 | 1592.2 | 0.03 |
| moon-malapert-massif | 85.00 S, 1.00 W (29.8 km) | tempMean | -159.5 | -141.83 | 1.18 |
| moon-malapert-massif | 85.00 S, 1.00 W (29.8 km) | tempRange | no value | 176.57 | n/a |
| moon-malapert-massif | 85.00 S, 1.00 W (29.8 km) | lithology | 4 | no value | n/a |
| moon-mons-mouton | 85.00 S, 31.00 E (12.1 km) | slope | 9.42 | 10.71 | 0.27 |
| moon-mons-mouton | 85.00 S, 31.00 E (12.1 km) | roughness | 1018.6 | 1341 | 0.63 |
| moon-mons-mouton | 85.00 S, 31.00 E (12.1 km) | tempMean | -141.3 | -145.68 | 0.29 |
| moon-mons-mouton | 85.00 S, 31.00 E (12.1 km) | tempRange | no value | 124.44 | n/a |
| moon-mons-mouton | 85.00 S, 31.00 E (12.1 km) | lithology | 4 | 4 | same class |
| moon-haworth | 87.00 S, 5.00 W (13.6 km) | slope | 11.04 | 10.38 | 0.12 |
| moon-haworth | 87.00 S, 5.00 W (13.6 km) | roughness | 1552.3 | 2073.8 | 0.67 |
| moon-haworth | 87.00 S, 5.00 W (13.6 km) | tempMean | -211.9 | -201.04 | 0.72 |
| moon-haworth | 87.00 S, 5.00 W (13.6 km) | tempRange | no value | 90.25 | n/a |
| moon-haworth | 87.00 S, 5.00 W (13.6 km) | lithology | 4 | no value | n/a |
| moon-shackleton-rim | 89.00 S, 129.00 E (20.3 km) | slope | 10.78 | 9.76 | 0.19 |
| moon-shackleton-rim | 89.00 S, 129.00 E (20.3 km) | roughness | 910.9 | 869.6 | 0.09 |
| moon-shackleton-rim | 89.00 S, 129.00 E (20.3 km) | tempMean | -176.2 | -167.35 | 0.59 |
| moon-shackleton-rim | 89.00 S, 129.00 E (20.3 km) | tempRange | no value | 110.48 | n/a |
| moon-shackleton-rim | 89.00 S, 129.00 E (20.3 km) | lithology | 4 | 4 | same class |
| moon-marius-hills | 15.00 N, 57.00 W (28.4 km) | slope | 1.74 | 1.23 | 0.51 |
| moon-marius-hills | 15.00 N, 57.00 W (28.4 km) | roughness | 228.9 | 236.6 | 0.07 |
| moon-marius-hills | 15.00 N, 57.00 W (28.4 km) | tempMean | -54.6 | -54.86 | 0.02 |
| moon-marius-hills | 15.00 N, 57.00 W (28.4 km) | tempRange | 297.5 | 296.45 | 0.21 |
| moon-marius-hills | 15.00 N, 57.00 W (28.4 km) | lithology | 2 | no value | n/a |
| mars-jezero | 18.50 N, 77.50 E (4.5 km) | slope | 2.63 | 2.39 | 0.18 |
| mars-jezero | 18.50 N, 77.50 E (4.5 km) | roughness | 287.4 | 284.2 | 0.02 |
| mars-jezero | 18.50 N, 77.50 E (4.5 km) | tempMean | -56.6 | -56.89 | 0.02 |
| mars-jezero | 18.50 N, 77.50 E (4.5 km) | tempRange | 48.8 | 48.23 | 0.11 |
| mars-jezero | 18.50 N, 77.50 E (4.5 km) | lithology | 2 | no value | n/a |
| mars-gale | 4.50 S, 137.50 E (8.4 km) | slope | 6.11 | 6.4 | 0.09 |
| mars-gale | 4.50 S, 137.50 E (8.4 km) | roughness | 1262.8 | 1145.1 | 0.19 |
| mars-gale | 4.50 S, 137.50 E (8.4 km) | tempMean | -57.7 | -59.33 | 0.11 |
| mars-gale | 4.50 S, 137.50 E (8.4 km) | tempRange | 62.1 | 54.65 | 1.49 |
| mars-gale | 4.50 S, 137.50 E (8.4 km) | lithology | 3 | no value | n/a |
| mars-arcadia-planitia | 39.50 N, 157.50 W (25.4 km) | slope | 0.27 | 0.29 | 0.02 |
| mars-arcadia-planitia | 39.50 N, 157.50 W (25.4 km) | roughness | 16.8 | 18.5 | 0.03 |
| mars-arcadia-planitia | 39.50 N, 157.50 W (25.4 km) | tempMean | -74.5 | -75.48 | 0.07 |
| mars-arcadia-planitia | 39.50 N, 157.50 W (25.4 km) | tempRange | 53.2 | 50.35 | 0.57 |
| mars-arcadia-planitia | 39.50 N, 157.50 W (25.4 km) | lithology | no value | 2 | n/a |
| mars-gusev-columbia-hills | 14.50 S, 175.50 E (4.5 km) | slope | 0.53 | 0.47 | 0.06 |
| mars-gusev-columbia-hills | 14.50 S, 175.50 E (4.5 km) | roughness | 33.8 | 33 | 0.02 |
| mars-gusev-columbia-hills | 14.50 S, 175.50 E (4.5 km) | tempMean | -63.6 | -66.69 | 0.21 |
| mars-gusev-columbia-hills | 14.50 S, 175.50 E (4.5 km) | tempRange | 61.3 | 64.31 | 0.60 |
| mars-gusev-columbia-hills | 14.50 S, 175.50 E (4.5 km) | lithology | 2 | 2 | same class |
| mars-holden | 26.50 S, 34.50 W (39.7 km) | slope | 1.98 | 1.86 | 0.12 |
| mars-holden | 26.50 S, 34.50 W (39.7 km) | roughness | 105.4 | 202 | 1.83 |
| mars-holden | 26.50 S, 34.50 W (39.7 km) | tempMean | -62.5 | -62.02 | 0.03 |
| mars-holden | 26.50 S, 34.50 W (39.7 km) | tempRange | 49.4 | 46.73 | 0.53 |
| mars-holden | 26.50 S, 34.50 W (39.7 km) | lithology | 3 | no value | n/a |

More than one tolerance apart, or a different rock class: moon-malapert-massif tempMean: curated -159.5, grid -141.83; mars-gale tempRange: curated 62.1, grid 54.65; mars-holden roughness: curated 105.4, grid 202.

## 2. What a user gets for each named place

71 named places. By origin: 58 grid, 13 curated. By confidence: 31 low, 5 high, 35 medium. Missing factors: lithology at 25, tempRange at 17, tempMean at 10.

Places with no temperature value: 10. Their scores leave temperature out, run much higher, and are marked "not comparable" below.

| Place | Body | Profile from | Confidence | Missing | Best-ranked Earth cell | Score |
| --- | --- | --- | --- | --- | --- | --- |
| Arabia Terra: area south of Firsoff crater | mars | grid cell 0.50 N, 8.50 W | low | lithology | 35.25 N, 82.75 E | 55.4 |
| Deuteronilus Mensae exploration zone (DBDM EZ) | mars | grid cell 39.50 N, 23.50 E | low | lithology | 35.75 N, 83.75 E | 60.1 |
| Hellas: eastern rim exploration zone | mars | grid cell 40.50 S, 103.50 E | low | lithology | 35.25 N, 80.25 E | 53.3 |
| Mawrth Vallis (ExoMars candidate landing site) | mars | grid cell 22.50 N, 17.50 W | low | lithology | 37.25 N, 88.25 E | 55.0 |
| Midway (Mars 2020 finalist) | mars | curated target mars-jezero | high | none | 34.75 N, 84.75 E | 55.5 |
| Northeast Syrtis Major (Mars 2020 finalist) | mars | grid cell 17.50 N, 77.50 E | low | lithology | 35.25 N, 80.25 E | 55.5 |
| Oxia Planum (ExoMars Rosalind Franklin landing site) | mars | grid cell 18.50 N, 24.50 W | low | lithology | 35.25 N, 85.25 E | 53.5 |
| Pavonis Mons | mars | grid cell 1.50 N, 112.50 W | medium | none | 34.75 N, 84.75 E | 51.4 |
| Starship candidate: Arcadia Planitia AP-1 | mars | curated target mars-arcadia-planitia | medium | lithology | 35.25 N, 85.25 E | 51.5 |
| Starship candidate: Arcadia Planitia AP-8 | mars | grid cell 40.50 N, 158.50 W | medium | none | 35.75 N, 86.25 E | 45.3 |
| Starship candidate: Arcadia Planitia AP-9 | mars | grid cell 40.50 N, 156.50 W | medium | none | 35.75 N, 86.25 E | 47.5 |
| Starship candidate: Erebus Montes EM-15 | mars | grid cell 39.50 N, 164.50 W | low | lithology | 35.25 N, 82.75 E | 60.7 |
| Starship candidate: Erebus Montes EM-16 | mars | grid cell 39.50 N, 167.50 W | medium | none | 35.75 N, 86.25 E | 51.1 |
| Starship candidate: Phlegra Montes PM-1 | mars | grid cell 35.50 N, 163.50 E | low | lithology | 34.75 N, 79.25 E | 59.0 |
| Starship candidate: Phlegra Montes PM-7 | mars | grid cell 36.50 N, 162.50 E | low | lithology | 35.25 N, 80.25 E | 57.8 |
| Valles Marineris: Eastern Melas Chasma exploration zone | mars | grid cell 11.50 S, 70.50 W | low | lithology | 35.25 N, 82.25 E | 55.8 |
| Viking 1 Lander (Chryse Planitia) | mars | grid cell 22.50 N, 47.50 W | low | lithology | 35.25 N, 85.25 E | 51.4 |
| Viking 2 Lander (Utopia Planitia) | mars | grid cell 47.50 N, 134.50 E | low | lithology | 35.25 N, 85.25 E | 53.9 |
| Mars Pathfinder (Ares Vallis) | mars | grid cell 19.50 N, 33.50 W | low | lithology | 35.25 N, 85.25 E | 52.3 |
| Spirit landing site (Gusev crater) | mars | curated target mars-gusev-columbia-hills | high | none | 35.75 N, 86.25 E | 48.9 |
| Opportunity landing site (Meridiani) | mars | grid cell 1.50 S, 5.50 W | low | lithology | 35.25 N, 85.25 E | 49.0 |
| Phoenix (north polar plains) | mars | grid cell 68.50 N, 125.50 W | low | lithology | 72.25 N, 115.25 W | 45.5 |
| Curiosity (Bradbury Landing, Gale crater) | mars | curated target mars-gale | high | none | 35.25 N, 80.25 E | 51.8 |
| InSight (Elysium Planitia) | mars | grid cell 4.50 N, 135.50 E | low | lithology | 35.25 N, 85.25 E | 49.4 |
| Perseverance (Octavia E. Butler Landing, Jezero crater) | mars | curated target mars-jezero | high | none | 34.75 N, 84.75 E | 55.5 |
| Zhurong (Tianwen-1, southern Utopia Planitia) | mars | grid cell 25.50 N, 109.50 E | low | lithology | 35.25 N, 85.25 E | 55.0 |
| Artemis III candidate: Haworth | moon | grid cell 87.00 S, 23.00 W | low | lithology | 82.25 N, 68.25 W | 39.5 |
| Artemis III candidate: Malapert Massif | moon | curated target moon-malapert-massif | medium | tempRange | 82.25 N, 82.75 W | 53.0 |
| Artemis III candidate: Mons Mouton Plateau | moon | curated target moon-mons-mouton | medium | tempRange | 82.75 N, 77.25 W | 51.1 |
| Artemis III candidate: Nobile Rim 2 | moon | grid cell 83.00 S, 59.00 E | low | lithology | 79.75 N, 82.75 W | 39.3 |
| Artemis III candidate: Peak near Cabeus B | moon | grid cell 83.00 S, 69.00 W | low | lithology | 82.25 N, 68.25 W | 40.6 |
| Artemis III candidate: Slater Plain (point is the centre of Slater crater) | moon | grid cell 89.00 S, 111.00 E | medium | none | 79.75 N, 81.75 W | 40.3 |
| Artemis III candidate: de Gerlache Rim 2 (LROC 'de Gerlache Rim' mosaic) | moon | grid cell 89.00 S, 67.00 W | low | lithology | 82.25 N, 68.25 W | 41.0 |
| Artemis III candidates: Nobile Rim 1 and Mons Mouton (shared mosaic) | moon | curated target moon-mons-mouton | medium | tempRange | 82.75 N, 77.25 W | 51.1 |
| Compton-Belkovich Volcanic Complex | moon | grid cell 61.00 N, 99.00 E | low | tempMean, tempRange, lithology | no score |  |
| Gruithuisen Domes, Lunar-VISE landing site (Mons Gruithuisen Gamma) | moon | grid cell 37.00 N, 41.00 W | medium | none | 36.25 N, 88.75 E | 54.0 |
| Lacus Mortis Pit | moon | grid cell 45.00 N, 25.00 E | medium | none | 35.75 N, 86.25 E | 61.2 |
| Mare Tranquillitatis Pit | moon | grid cell 9.00 N, 33.00 E | medium | none | 35.75 N, 86.25 E | 45.9 |
| Marius Hills Pit | moon | curated target moon-marius-hills | high | none | 34.75 N, 84.75 E | 54.3 |
| Reiner Gamma, Lunar Vertex landing site (CLPS CP-11) | moon | grid cell 7.00 N, 59.00 W | medium | none | 35.75 N, 86.25 E | 51.1 |
| Schrodinger basin | moon | grid cell 75.00 S, 133.00 E | medium | none | 71.25 N, 114.75 W | 42.4 |
| Shackleton - de Gerlache 'Connecting Ridge' at the Shackleton rim | moon | curated target moon-shackleton-rim | medium | tempRange | 82.25 N, 82.75 W | 53.6 |
| Shackleton crater (south pole) | moon | curated target moon-shackleton-rim | medium | tempRange | 82.25 N, 82.75 W | 53.6 |
| VIPER mission area (Mons Mouton) | moon | curated target moon-mons-mouton | medium | tempRange | 82.75 N, 77.25 W | 51.1 |
| Luna 9 | moon | grid cell 7.00 N, 65.00 W | low | tempMean, tempRange | 20.75 N, 18.25 E | 95.2 (not comparable: no temperature) |
| Surveyor 1 | moon | grid cell 3.00 S, 43.00 W | medium | none | 35.75 N, 86.25 E | 55.6 |
| Surveyor 3 | moon | grid cell 3.00 S, 23.00 W | medium | none | 35.75 N, 86.25 E | 49.6 |
| Surveyor 5 | moon | grid cell 1.00 N, 23.00 E | low | tempMean, tempRange | 25.75 N, 40.25 E | 95.1 (not comparable: no temperature) |
| Surveyor 6 | moon | grid cell 1.00 N, 1.00 W | medium | none | 35.75 N, 86.25 E | 51.8 |
| Surveyor 7 | moon | grid cell 41.00 S, 11.00 W | low | tempMean, tempRange, lithology | no score |  |
| Apollo 11 (Tranquility Base) | moon | grid cell 1.00 N, 23.00 E | low | tempMean, tempRange | 25.75 N, 40.25 E | 95.1 (not comparable: no temperature) |
| Apollo 12 (Oceanus Procellarum) | moon | grid cell 3.00 S, 23.00 W | medium | none | 35.75 N, 86.25 E | 49.6 |
| Luna 16 | moon | grid cell 1.00 S, 57.00 E | medium | none | 35.75 N, 86.25 E | 56.6 |
| Luna 17 (Lunokhod 1 lander) | moon | grid cell 39.00 N, 35.00 W | medium | none | 35.75 N, 86.25 E | 53.3 |
| Lunokhod 1 (final rover position) | moon | grid cell 39.00 N, 35.00 W | medium | none | 35.75 N, 86.25 E | 53.3 |
| Apollo 14 (Fra Mauro) | moon | grid cell 3.00 S, 17.00 W | medium | none | 35.25 N, 88.75 E | 53.1 |
| Apollo 15 (Hadley-Apennine) | moon | grid cell 27.00 N, 3.00 E | medium | none | 35.25 N, 88.75 E | 55.9 |
| Apollo 16 (Descartes Highlands) | moon | grid cell 9.00 S, 15.00 E | low | tempMean, tempRange | 26.75 N, 59.75 E | 92.4 (not comparable: no temperature) |
| Apollo 17 (Taurus-Littrow) | moon | grid cell 21.00 N, 31.00 E | low | tempMean, tempRange | 15.25 S, 74.75 W | 97.1 (not comparable: no temperature) |
| Luna 21 (Lunokhod 2 lander) | moon | grid cell 27.00 N, 31.00 E | medium | none | 36.25 N, 88.75 E | 51.3 |
| Lunokhod 2 (final rover position) | moon | grid cell 25.00 N, 31.00 E | low | tempMean, tempRange | 28.75 N, 61.25 E | 95.6 (not comparable: no temperature) |
| Luna 24 | moon | grid cell 13.00 N, 63.00 E | medium | none | 35.75 N, 86.25 E | 54.2 |
| Chang'e 3 (Guang Han Gong) | moon | grid cell 45.00 N, 19.00 W | medium | none | 35.75 N, 86.25 E | 57.5 |
| Chang'e 4 (Statio Tianhe) | moon | grid cell 45.00 S, 177.00 E | medium | none | 35.75 N, 86.25 E | 58.5 |
| Chang'e 5 (Statio Tianchuan) | moon | grid cell 43.00 N, 51.00 W | medium | none | 35.75 N, 86.25 E | 53.3 |
| Chandrayaan-3 Vikram lander (Statio Shiv Shakti) | moon | grid cell 69.00 S, 33.00 E | medium | none | 47.25 N, 93.25 E | 45.7 |
| SLIM | moon | grid cell 13.00 S, 25.00 E | low | tempMean, tempRange, lithology | no score |  |
| IM-1 Odysseus | moon | grid cell 81.00 S, 1.00 E | low | tempMean, tempRange | 82.75 N, 77.25 W | 61.8 (not comparable: no temperature) |
| Chang'e 6 (Statio Tianjiang) | moon | grid cell 41.00 S, 153.00 W | medium | none | 35.75 N, 86.25 E | 62.8 |
| Blue Ghost Mission 1 | moon | grid cell 19.00 N, 61.00 E | medium | none | 35.75 N, 86.25 E | 51.6 |
| IM-2 Athena (Mons Mouton) | moon | curated target moon-mons-mouton | medium | tempRange | 82.75 N, 77.25 W | 51.1 |


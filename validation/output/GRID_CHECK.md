# Targets from anywhere, checked on the real Moon and Mars grids

Written 2026-11-15T06:47:43.829Z by `npx tsx validation/grid_check.ts`. Grids: moon.json (2 degree, 16200 cells, built 2026-11-15T06:43:23Z); mars.json missing.

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
| mars-jezero | grid not loaded | slope | 2.63 | no value | n/a |
| mars-jezero | grid not loaded | roughness | 287.4 | no value | n/a |
| mars-jezero | grid not loaded | tempMean | -56.6 | no value | n/a |
| mars-jezero | grid not loaded | tempRange | 48.8 | no value | n/a |
| mars-jezero | grid not loaded | lithology | 2 | no value | n/a |
| mars-gale | grid not loaded | slope | 6.11 | no value | n/a |
| mars-gale | grid not loaded | roughness | 1262.8 | no value | n/a |
| mars-gale | grid not loaded | tempMean | -57.7 | no value | n/a |
| mars-gale | grid not loaded | tempRange | 62.1 | no value | n/a |
| mars-gale | grid not loaded | lithology | 3 | no value | n/a |
| mars-arcadia-planitia | grid not loaded | slope | 0.27 | no value | n/a |
| mars-arcadia-planitia | grid not loaded | roughness | 16.8 | no value | n/a |
| mars-arcadia-planitia | grid not loaded | tempMean | -74.5 | no value | n/a |
| mars-arcadia-planitia | grid not loaded | tempRange | 53.2 | no value | n/a |
| mars-arcadia-planitia | grid not loaded | lithology | no value | no value | n/a |

More than one tolerance apart, or a different rock class: moon-malapert-massif tempMean: curated -159.5, grid -141.83.

## 2. What a user gets for each named place

66 named places. By origin: 18 none, 12 curated, 36 grid. By confidence: 32 low, 4 high, 30 medium. Missing factors: tempMean at 28, tempRange at 35, slope at 18, roughness at 18, lithology at 26.

Places with no temperature value: 10. Their scores leave temperature out, run much higher, and are marked "not comparable" below.

| Place | Body | Profile from | Confidence | Missing | Best-ranked Earth cell | Score |
| --- | --- | --- | --- | --- | --- | --- |
| Deuteronilus Mensae exploration zone (DBDM EZ) | mars | no data | low | tempMean, tempRange, slope, roughness, lithology | no score |  |
| Mawrth Vallis (ExoMars candidate landing site) | mars | no data | low | tempMean, tempRange, slope, roughness, lithology | no score |  |
| Midway (Mars 2020 finalist) | mars | curated target mars-jezero | high | none | 34.75 N, 84.75 E | 55.5 |
| Northeast Syrtis Major (Mars 2020 finalist) | mars | no data | low | tempMean, tempRange, slope, roughness, lithology | no score |  |
| Oxia Planum (ExoMars Rosalind Franklin landing site) | mars | no data | low | tempMean, tempRange, slope, roughness, lithology | no score |  |
| Starship candidate: Arcadia Planitia AP-1 | mars | curated target mars-arcadia-planitia | medium | lithology | 35.25 N, 85.25 E | 51.5 |
| Starship candidate: Arcadia Planitia AP-8 | mars | no data | low | tempMean, tempRange, slope, roughness, lithology | no score |  |
| Starship candidate: Arcadia Planitia AP-9 | mars | no data | low | tempMean, tempRange, slope, roughness, lithology | no score |  |
| Starship candidate: Erebus Montes EM-15 | mars | no data | low | tempMean, tempRange, slope, roughness, lithology | no score |  |
| Starship candidate: Erebus Montes EM-16 | mars | no data | low | tempMean, tempRange, slope, roughness, lithology | no score |  |
| Starship candidate: Phlegra Montes PM-1 | mars | no data | low | tempMean, tempRange, slope, roughness, lithology | no score |  |
| Starship candidate: Phlegra Montes PM-7 | mars | no data | low | tempMean, tempRange, slope, roughness, lithology | no score |  |
| Viking 1 Lander (Chryse Planitia) | mars | no data | low | tempMean, tempRange, slope, roughness, lithology | no score |  |
| Viking 2 Lander (Utopia Planitia) | mars | no data | low | tempMean, tempRange, slope, roughness, lithology | no score |  |
| Mars Pathfinder (Ares Vallis) | mars | no data | low | tempMean, tempRange, slope, roughness, lithology | no score |  |
| Spirit landing site (Gusev crater) | mars | no data | low | tempMean, tempRange, slope, roughness, lithology | no score |  |
| Opportunity landing site (Meridiani) | mars | no data | low | tempMean, tempRange, slope, roughness, lithology | no score |  |
| Phoenix (north polar plains) | mars | no data | low | tempMean, tempRange, slope, roughness, lithology | no score |  |
| Curiosity (Bradbury Landing, Gale crater) | mars | curated target mars-gale | high | none | 35.25 N, 80.25 E | 51.8 |
| InSight (Elysium Planitia) | mars | no data | low | tempMean, tempRange, slope, roughness, lithology | no score |  |
| Perseverance (Octavia E. Butler Landing, Jezero crater) | mars | curated target mars-jezero | high | none | 34.75 N, 84.75 E | 55.5 |
| Zhurong (Tianwen-1, southern Utopia Planitia) | mars | no data | low | tempMean, tempRange, slope, roughness, lithology | no score |  |
| Artemis III candidate: Haworth | moon | grid cell 87.00 S, 23.00 W | low | lithology | 82.25 N, 68.25 W | 39.5 |
| Artemis III candidate: Malapert Massif | moon | curated target moon-malapert-massif | medium | tempRange | 82.25 N, 82.75 W | 53.0 |
| Artemis III candidate: Mons Mouton Plateau | moon | curated target moon-mons-mouton | medium | tempRange | 82.75 N, 77.25 W | 51.1 |
| Artemis III candidate: Nobile Rim 2 | moon | grid cell 83.00 S, 59.00 E | low | lithology | 79.75 N, 82.75 W | 39.3 |
| Artemis III candidate: Peak near Cabeus B | moon | grid cell 83.00 S, 69.00 W | low | lithology | 82.25 N, 68.25 W | 40.6 |
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


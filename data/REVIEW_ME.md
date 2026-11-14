# REVIEW_ME: target values to check by hand

Every value in `data/targets.json`, where it came from, and how far to trust it. Written by Claude Code
(Session C) on 2026-11-14 for a human reviewer. Please check the rows marked Medium or lower first.
Regenerate with `python3 validation/build/make_review.py` after changing `targets.json`.

## How to read the check level

- A: the number was read in the source text, or computed from the source data, in the main working session.
  Computed values can be reproduced with the script named in the row.
- B: a research sub-agent reported reading it in a fetched page or abstract. It was not opened again.
  These deserve a second look.
- Nothing in the file comes from memory or from a search-result snippet. Where no source could be opened, the
  value is `null`.

## Decisions a human should make

1. Gale mean temperature. The climate model says -57.7 C; Curiosity's own record points to something warmer
   (midpoint of daily minimum and maximum -43.7 C). The model value is in the file. Keep it, or switch?
2. The tolerances (sigma) and the three non-Base preset weights are first guesses, listed at the end. DESIGN.md
   allows one tuning pass against the validation set before they are frozen. That pass has not been done.
3. Temperature dominates the scores. Mars and the lunar poles are far colder than almost all of Earth, so with
   a 15 C tolerance warm deserts lose most of their score on temperature alone. Widening it is a scoring
   decision, so it was left alone.
4. Lunar rock class. All four Moon targets are coded as GLiM 'Basic plutonic rocks' because the lunar highlands
   are anorthosite. Only Shackleton has a direct detection.
5. Two target points are feature centres, not landing points: Haworth (crater centre, in permanent shadow) and
   Shackleton rim (crater centre).
6. Gale's day-night swing uses NASA's public REMS weather feed, which describes itself as an outreach product.
7. `analogFor` in `analogs.json` was assigned by SBATS from each site's cited characteristic (see the comment
   block in validation/build/make_analogs.py). The sources name the body, not the target.

## Coordinates

| Target | lat | lon | What the point is | Link | Check | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| Malapert Massif | -85.98 | -1.67 | Centre of Mons Malapert, IAU Gazetteer feature 16338. The Artemis region centre in the LROC archive is 86.0 S, 0.3 E, about 6 km away. | https://planetarynames.wr.usgs.gov/Feature/16338 | A | High |
| Mons Mouton | -84.6 | 31.0 | Centre of Mons Mouton, IAU Gazetteer feature 16070. | https://planetarynames.wr.usgs.gov/Feature/16070 | A | High |
| Haworth | -87.45 | -5.17 | Centre of Haworth crater, IAU Gazetteer feature 14502 (LOLA 2011 control network). NASA publishes no coordinates for the Artemis 'Haworth' region, which lies beside the crater. | https://planetarynames.wr.usgs.gov/Feature/14502 | A | High for the crater, medium as a landing point |
| Shackleton rim | -89.67 | 129.78 | Centre of Shackleton crater, IAU Gazetteer feature 5450, not a point on the rim. The rim is about 10 km away, well inside the 55.6 km window that every value is measured over. | https://planetarynames.wr.usgs.gov/Feature/5450 | A | High for the crater, medium as a rim point |
| Jezero crater | 18.44 | 77.45 | Perseverance landing point, 18.44 N 77.45 E, Rodriguez-Manfredi et al. 2023, Nature Geoscience. | https://doi.org/10.1038/s41561-022-01084-0 | A | High |
| Gale crater | -4.6 | 137.4 | Curiosity landing point, 4.6 S 137.4 E, NASA MSL fact sheet. | https://solarsystem.nasa.gov/docs/MSL%20Fact%20Sheet%20REV-141119.pdf | A | High |
| Arcadia Planitia (site AP-1) | 39.8 | -157.9 | Candidate landing site AP-1, 39.8 N 202.1 E (written here as -157.9), Golombek et al. 2021, LPSC abstract 2420, Table 1. The paper does not say whether latitude is planetocentric; at 0.5 degree resolution the difference does not matter. | https://www.hou.usra.edu/meetings/lpsc2021/pdf/2420.pdf | A | High |

## Values, target by target

### Malapert Massif (`moon-malapert-massif`)

| Factor | Value | Sigma | Badge | Source link | Check | Confidence | Comment |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `tempMean` | -159.5 C | 15.0 | Mission | https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/ | A | Medium | Computed by validation/build/moon_temperature.py from the Diviner Polar Resource Product. It is the Diviner team's modelled annual average at 2 cm depth, not a raw reading, averaged over a 55.6 km window that mixes sunlit ridges and permanently shadowed floors. No paper was found that gives a site temperature to compare with. |
| `tempRange` | null |  |  |  |  | n/a | Left null on purpose. See the note in targets.json. |
| `precip` | 0 mm/year | 250.0 | Literature | https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html | A | High | Set to 0 by data/SCHEMA.md. The source shows why: there is no atmosphere. |
| `ndvi` | 0.05 | 0.1 | Literature | https://science.nasa.gov/earth/earth-observatory/measuring-vegetation-ndvi-evi | A | Medium | Not a measurement on the Moon or Mars. NASA's page says NDVI of 0.1 and below is barren rock, sand or snow; 0.05 is the middle of that band, chosen by SBATS as the bare-ground reference. |
| `slope` | 12.3 deg | 6.15 | Mission | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ | A | High | Computed by validation/target_terrain.py with Session B's terrain_metrics(). The map orientation was checked against Shackleton (deep) and Mons Mouton (high). |
| `roughness` | 1571.3 m | 785.6 | Mission | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ | A | High | Same run as slope. |
| `lithology` | 4 GLiM code |  | Literature | https://doi.org/10.1016/j.pss.2019.104750 | B | Low to medium | No direct rock measurement. Inferred from 'highland crust covered in basin ejecta'. |

### Mons Mouton (`moon-mons-mouton`)

| Factor | Value | Sigma | Badge | Source link | Check | Confidence | Comment |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `tempMean` | -141.3 C | 15.0 | Mission | https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/ | A | Medium | Computed by validation/build/moon_temperature.py from the Diviner Polar Resource Product. It is the Diviner team's modelled annual average at 2 cm depth, not a raw reading, averaged over a 55.6 km window that mixes sunlit ridges and permanently shadowed floors. No paper was found that gives a site temperature to compare with. |
| `tempRange` | null |  |  |  |  | n/a | Left null on purpose. See the note in targets.json. |
| `precip` | 0 mm/year | 250.0 | Literature | https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html | A | High | Set to 0 by data/SCHEMA.md. The source shows why: there is no atmosphere. |
| `ndvi` | 0.05 | 0.1 | Literature | https://science.nasa.gov/earth/earth-observatory/measuring-vegetation-ndvi-evi | A | Medium | Not a measurement on the Moon or Mars. NASA's page says NDVI of 0.1 and below is barren rock, sand or snow; 0.05 is the middle of that band, chosen by SBATS as the bare-ground reference. |
| `slope` | 9.42 deg | 4.71 | Mission | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ | A | High | Computed by validation/target_terrain.py with Session B's terrain_metrics(). The map orientation was checked against Shackleton (deep) and Mons Mouton (high). |
| `roughness` | 1018.6 m | 509.3 | Mission | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ | A | High | Same run as slope. |
| `lithology` | 4 GLiM code |  | Literature | https://doi.org/10.1029/2025JE009127 | B | Low to medium | No direct rock measurement. Abstract only. |

### Haworth (`moon-haworth`)

| Factor | Value | Sigma | Badge | Source link | Check | Confidence | Comment |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `tempMean` | -211.9 C | 15.0 | Mission | https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/ | A | Medium | Computed by validation/build/moon_temperature.py from the Diviner Polar Resource Product. It is the Diviner team's modelled annual average at 2 cm depth, not a raw reading, averaged over a 55.6 km window that mixes sunlit ridges and permanently shadowed floors. No paper was found that gives a site temperature to compare with. |
| `tempRange` | null |  |  |  |  | n/a | Left null on purpose. See the note in targets.json. |
| `precip` | 0 mm/year | 250.0 | Literature | https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html | A | High | Set to 0 by data/SCHEMA.md. The source shows why: there is no atmosphere. |
| `ndvi` | 0.05 | 0.1 | Literature | https://science.nasa.gov/earth/earth-observatory/measuring-vegetation-ndvi-evi | A | Medium | Not a measurement on the Moon or Mars. NASA's page says NDVI of 0.1 and below is barren rock, sand or snow; 0.05 is the middle of that band, chosen by SBATS as the bare-ground reference. |
| `slope` | 11.04 deg | 5.52 | Mission | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ | A | High | Computed by validation/target_terrain.py with Session B's terrain_metrics(). The map orientation was checked against Shackleton (deep) and Mons Mouton (high). |
| `roughness` | 1552.3 m | 776.1 | Mission | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ | A | High | Same run as slope. |
| `lithology` | 4 GLiM code |  | Literature | https://doi.org/10.1016/j.icarus.2015.03.016 | B | Low to medium | No direct rock measurement. The source gives the crater's age, not its rock. |

### Shackleton rim (`moon-shackleton-rim`)

| Factor | Value | Sigma | Badge | Source link | Check | Confidence | Comment |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `tempMean` | -176.2 C | 15.0 | Mission | https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/ | A | Medium | Computed by validation/build/moon_temperature.py from the Diviner Polar Resource Product. It is the Diviner team's modelled annual average at 2 cm depth, not a raw reading, averaged over a 55.6 km window that mixes sunlit ridges and permanently shadowed floors. No paper was found that gives a site temperature to compare with. |
| `tempRange` | null |  |  |  |  | n/a | Left null on purpose. See the note in targets.json. |
| `precip` | 0 mm/year | 250.0 | Literature | https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html | A | High | Set to 0 by data/SCHEMA.md. The source shows why: there is no atmosphere. |
| `ndvi` | 0.05 | 0.1 | Literature | https://science.nasa.gov/earth/earth-observatory/measuring-vegetation-ndvi-evi | A | Medium | Not a measurement on the Moon or Mars. NASA's page says NDVI of 0.1 and below is barren rock, sand or snow; 0.05 is the middle of that band, chosen by SBATS as the bare-ground reference. |
| `slope` | 10.78 deg | 5.39 | Mission | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ | A | High | Computed by validation/target_terrain.py with Session B's terrain_metrics(). The map orientation was checked against Shackleton (deep) and Mons Mouton (high). |
| `roughness` | 910.9 m | 455.4 | Mission | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ | A | High | Same run as slope. |
| `lithology` | 4 GLiM code |  | Literature | https://doi.org/10.1002/grl.50753 | B | Medium | Anorthosite detected on the inner wall. Mapping anorthosite to GLiM 'Basic plutonic rocks' is SBATS's choice. |

### Jezero crater (`mars-jezero`)

| Factor | Value | Sigma | Badge | Source link | Check | Confidence | Comment |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `tempMean` | -56.6 C | 15.0 | Literature | https://www-mars.lmd.jussieu.fr/mcd_python/ | A | Medium | Climate model, not a measurement. Cross-check: the MEDA team's summary of 'around -55 C' (UPV/EHU release, read by a research agent on phys.org, not in the paper text). |
| `tempRange` | 48.8 C | 5.0 | Literature | https://www-mars.lmd.jussieu.fr/mcd_python/ | A | Medium | Climate model. The MEDA team's summary says 50 to 60 C. |
| `precip` | 0 mm/year | 250.0 | Literature | https://science.nasa.gov/mars/facts/ | B | High | Set to 0 by data/SCHEMA.md. No NASA page was found that says 'no rain' in those words; the cited sentence is about liquid water not lasting on the surface. |
| `ndvi` | 0.05 | 0.1 | Literature | https://science.nasa.gov/earth/earth-observatory/measuring-vegetation-ndvi-evi | A | Medium | Not a measurement on the Moon or Mars. NASA's page says NDVI of 0.1 and below is barren rock, sand or snow; 0.05 is the middle of that band, chosen by SBATS as the bare-ground reference. |
| `slope` | 2.63 deg | 1.31 | Mission | https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/ | A | High | Computed by validation/target_terrain.py with Session B's terrain_metrics(). Elevation ranges match the known crater floors. |
| `roughness` | 287.4 m | 143.7 | Mission | https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/ | A | High | Same run as slope. |
| `lithology` | 2 GLiM code |  | Literature | https://doi.org/10.1126/science.abo2196 | B | Medium | Abstract only. The landing point is on the Maaz lava flows; the window also holds the sedimentary delta. |

### Gale crater (`mars-gale`)

| Factor | Value | Sigma | Badge | Source link | Check | Confidence | Comment |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `tempMean` | -57.7 C | 15.0 | Literature | https://www-mars.lmd.jussieu.fr/mcd_python/ | A | Medium to low | Climate model. DISAGREES WITH THE ROVER: the midpoint of REMS daily minimum and maximum is -43.7 C over 4,717 sols; the model's figure for that same statistic is -54.6 C. The model value is used so that all three Mars targets share one definition (a true 24-hour mean, like Earth's). A human should decide whether to keep it. With sigma 15 C the choice changes scores only slightly. |
| `tempRange` | 62.1 C | 5.0 | Mission | https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json | A | Medium | Computed by validation/build/mars_temperature.py from NASA's public REMS weather feed. The feed says it is for outreach, not science; the calibrated data are in the PDS. It agrees with Martinez et al. 2016 (Fisica de la Tierra 28:163), who give air temperature amplitudes of about 45 to 75 K. |
| `precip` | 0 mm/year | 250.0 | Literature | https://science.nasa.gov/mars/facts/ | B | High | Set to 0 by data/SCHEMA.md. No NASA page was found that says 'no rain' in those words; the cited sentence is about liquid water not lasting on the surface. |
| `ndvi` | 0.05 | 0.1 | Literature | https://science.nasa.gov/earth/earth-observatory/measuring-vegetation-ndvi-evi | A | Medium | Not a measurement on the Moon or Mars. NASA's page says NDVI of 0.1 and below is barren rock, sand or snow; 0.05 is the middle of that band, chosen by SBATS as the bare-ground reference. |
| `slope` | 6.11 deg | 3.06 | Mission | https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/ | A | High | Computed by validation/target_terrain.py with Session B's terrain_metrics(). Elevation ranges match the known crater floors. |
| `roughness` | 1262.8 m | 631.4 | Mission | https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/ | A | High | Same run as slope. |
| `lithology` | 3 GLiM code |  | Literature | https://doi.org/10.1126/science.1242777 | B | Medium | Abstract only. Sedimentary rock with basaltic grains: no GLiM class fits exactly. |

### Arcadia Planitia (site AP-1) (`mars-arcadia-planitia`)

| Factor | Value | Sigma | Badge | Source link | Check | Confidence | Comment |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `tempMean` | -74.5 C | 15.0 | Literature | https://www-mars.lmd.jussieu.fr/mcd_python/ | A | Medium to low | Climate model. No lander has measured here and no published site value was found. |
| `tempRange` | 53.2 C | 5.0 | Literature | https://www-mars.lmd.jussieu.fr/mcd_python/ | A | Medium to low | Climate model. No lander has measured here. |
| `precip` | 0 mm/year | 250.0 | Literature | https://science.nasa.gov/mars/facts/ | B | High | Set to 0 by data/SCHEMA.md. No NASA page was found that says 'no rain' in those words; the cited sentence is about liquid water not lasting on the surface. |
| `ndvi` | 0.05 | 0.1 | Literature | https://science.nasa.gov/earth/earth-observatory/measuring-vegetation-ndvi-evi | A | Medium | Not a measurement on the Moon or Mars. NASA's page says NDVI of 0.1 and below is barren rock, sand or snow; 0.05 is the middle of that band, chosen by SBATS as the bare-ground reference. |
| `slope` | 0.27 deg | 1.0 | Mission | https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/ | A | High | Computed by validation/target_terrain.py with Session B's terrain_metrics(). Elevation ranges match the known crater floors. |
| `roughness` | 16.8 m | 50.0 | Mission | https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/ | A | High | Same run as slope. |
| `lithology` | null |  |  | https://doi.org/10.3133/sim3292 | B | n/a | Left null. The map unit at AP-1 needs a GIS query of USGS SIM 3292. |

## Numbers quoted in `summary` and `cannotCopy` sentences

| Statement | Link | Check | Confidence |
| --- | --- | --- | --- |
| Lunar surface gravity 1.62 m/s2, Earth 9.80 m/s2 | https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html | A | High |
| Lunar surface pressure 3 x 10^-15 bar at night | https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html | A | High |
| Lunar day (synodic period) 29.53 days | https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html | A | High |
| 1,369 microsieverts per day on the lunar surface (Chang'e 4 LND) | https://doi.org/10.1126/sciadv.aaz1334 | A | High. Measured on the far side at 45.5 S, not at the pole. |
| Moon's spin axis tilted by 1.54 degrees | https://science.nasa.gov/photojournal/south-pole-illumination-map/ | A | High |
| Haworth floor never exceeds about 40 K | https://meetingorganizer.copernicus.org/EPSC2013/EPSC2013-864.pdf | B | Medium. Conference abstract. |
| Shackleton rim point sunlit continuously for 240 days a year | https://doi.org/10.1016/j.icarus.2010.10.030 | B | Medium. From the abstract only. |
| Artemis III candidate regions, 2022 list of 13 and 2024 list of 9 | https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/ | B | High |
| Haworth 51 km wide, more than four billion years old | https://doi.org/10.1016/j.icarus.2015.03.016 | B | Medium. Age 4.18 billion years from crater counts (Tye et al. 2015). |
| Mars surface gravity 3.73 m/s2, Earth 9.82 m/s2 | https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html | A | High |
| Mars mean surface pressure 6.36 mb; Earth 1014 mb | https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html and https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html | A | High |
| 0.67 millisieverts per day on the surface of Mars (Curiosity RAD) | https://swri.org/node/9079 | B | Medium. Press release figure. Secondary sources quote 0.64 +/- 0.12 mSv/day from the paper (Hassler et al. 2014) for cosmic rays alone; the paper itself could not be opened. |
| Jezero: 45 km crater, lake about 3.5 billion years ago, landing 18 February 2021 | https://www.jpl.nasa.gov/news/press_kits/mars_2020/landing/mission/landing_site/ | B | High |
| Gale: 154 km crater, ancient habitable lake | https://doi.org/10.1126/science.1242777 | B | High. Diameter 154.08 km from the IAU Gazetteer. |
| Arcadia Planitia: buried water ice tens of metres thick | https://arxiv.org/abs/1509.03210 | A | High. Bramson et al. 2015. |
| AP-1 is one of four prime Starship candidate sites | https://www.hou.usra.edu/meetings/lpsc2021/pdf/2420.pdf | A | High |

## Constants used by the scoring library

| Constant | Link | Check | Confidence |
| --- | --- | --- | --- |
| Earth axial tilt 23.44 degrees | https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html | A | High |
| Mars axial tilt 25.19 degrees | https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html | A | High |
| Moon spin axis to ecliptic 1.54 degrees | https://doi.org/10.1029/2019JE006028 and NASA Photojournal PIA13720 | A | High. The NSSDC sheet prints 6.68 degrees, which is the tilt to the Moon's orbit round Earth, not to the Sun's path. |
| Mars orbit eccentricity 0.0935 (season weighting of Mars temperatures) | https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html | A | High |
| Mars perihelion at Ls 251 degrees (season weighting) | https://www-mars.lmd.jussieu.fr/mars/time/solar_longitude.html | A | High |

## Design parameters (not data)

These are choices, not measurements. They were set by rule before any validation run and have not been tuned.

| Parameter | Value | Reason |
| --- | --- | --- |
| `tempMean` sigma | 15 C | About one sixth of the range in the Earth grid (-54.5 to 33.0 C), and larger than the 11 C gap between model and rover at Gale. |
| `tempRange` sigma | 5 C | About a quarter of the range in the Earth grid (0.6 to 19.0 C). |
| `precip` sigma | 250 mm/year | The arid limit in Meigs' classification: arid lands have less than 250 mm of annual rainfall (Walker 1992, USGS, Deserts: Geology and Resources, https://pubs.usgs.gov/gip/deserts/what/). |
| `ndvi` value and sigma | 0.05 and 0.1 | NASA's bands: 0.1 and below barren, 0.2 to 0.3 shrub and grassland, 0.6 to 0.8 rainforest. With these numbers shrub and grass sit 1.5 to 2.5 sigma away and rainforest more than 5. |
| `slope` sigma | half the target value, at least 1 degree | Slope is a ratio-scale quantity: a site within a factor of about 1.5 counts as similar. |
| `roughness` sigma | half the target value, at least 50 m | Same reasoning as slope. |
| Sunlight sigma (in the scoring library) | 15 degrees | About one climate belt of latitude. |
| Preset weights for Rover, Ice and Astrobiology | see app/src/lib/scoring/presets.ts | DESIGN.md gives only the direction. The numbers are a first guess. |

## What could not be found

- A published Diviner temperature for any of the four lunar sites. The papers that probably hold them
  (Williams et al. 2019, Wueller et al. 2025, Kring et al. 2025, Beyer et al. 2025) could not be opened by an
  automated reader. A person with a browser can check them against the computed values above.
- A measured annual mean air temperature for Gale or Jezero in a paper. Martinez et al. 2017 (Space Science
  Reviews, doi:10.1007/s11214-017-0360-x) and Munguira et al. 2023 (doi:10.1029/2022JE007559) are open access
  and most likely contain them.
- Any temperature for Arcadia Planitia other than the climate model.
- The geologic map unit at Arcadia site AP-1.
- A day-night temperature swing for the lunar polar sites.

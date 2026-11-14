# REVIEW_ME: values to check by hand

Part 1 covers `data/targets.json`. Part 2, further down, covers `data/modules.json`.

# Part 1: target values (`data/targets.json`)

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
2. Closed. The tolerances (sigma) and preset weights went through the one tuning pass on 2026-11-14. It tried
   68 alternatives on the tuning set and none beat noise, so all are frozen at the values listed at the end.
   See validation/tuning/FROZEN.md. They are not tuned again.
3. Temperature is still the most common limiting factor (about half of the known-analog cases). Mars and the
   lunar poles are far colder than almost all of Earth. The tuning pass tried wider temperature tolerances
   and they made no measurable difference, so this is a property of the targets, not of the tolerance.
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
| Malapert Massif | -85.98 | -1.67 | Centre of Mons Malapert, IAU Gazetteer feature 16338. The Artemis region centre in the LROC archive is 86.0 S, 0.3 E, about 4 km away. | https://planetarynames.wr.usgs.gov/Feature/16338 | A | High |
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

These are choices, not measurements. They were set by rule before any validation run. The one tuning pass
(2026-11-14) left every one unchanged, and they are now frozen: see validation/tuning/FROZEN.md.

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

# Part 2: base simulation numbers (`data/modules.json`)

Every number the base simulation uses. Regenerate the file with `python3 validation/build/make_modules.py`.
The same check levels apply: A = read in the source text, or computed from the source data, in the main
working session; B = reported by a research sub-agent from a fetched page or abstract, not opened again.

## Decisions a human should make

1. Seven values are derived, not printed in the source (one multiplication or division each). They are
   listed below. If the team wants only printed numbers, set them to null: the module becomes illustrative.
2. The modules are sized on real hardware or studies, but for other settings: the habitat is a Mars
   design, the solar array and battery are International Space Station units, the ice miner is a lunar
   study and the cargo figure is a lunar lander. They are used at every target. Is that acceptable?
3. Greenhouse power is 2.6 kW per m2, NASA's figure for high-pressure sodium lamps. BVAD itself says it has
   not been updated for LEDs. It makes one greenhouse draw 130 kW, ten times a habitat. It is NASA's
   published number, so it stands, but it will dominate any layout with a greenhouse.
4. Lit fraction on the Moon uses the upper end of a published range (Shackleton 87%, Malapert 82%), on the
   assumption that arrays go at the best-lit spot. Mons Mouton and Haworth have no figure and stay null.
5. Ice availability is 1 at Arcadia Planitia, 0 at Jezero and Gale (inferred from latitude), and null at
   every lunar site. So any lunar layout with an ice miner shows "no data". That is honest but limiting.
6. The Mars sunlight, night length and dust-storm figures are from a climate model (Mars Climate Database),
   not from landers.
7. Crew water is drinking, food preparation and exercise only (3.217 kg). Hygiene water and recycling are
   not modelled.
8. Earth sites use top-of-atmosphere sunlight, an upper bound, because `earth.json` has no surface
   sunlight. Adding NASA POWER surface sunlight to `earth.json` would fix it (Session B's file).

## Values with no source (null): these make a module illustrative

| Value | What was looked for and not found |
| --- | --- |
| `modules.habitat.heatingKwPerDegC` | No published heat-loss figure per degree was found for a surface habitat. The heating load is not modelled. |
| `modules.habitat.comfortTempC` | Only needed for the heating load, which is not modelled. |
| `modules.greenhouse.waterKgPerM2Day` | Wheat takes up 11.79 kg per m2 per day (BVAD Rev 2, Table 4-91), but transpires nearly all of it, and a closed chamber recovers it. No net make-up figure was found, so greenhouse water is left out. |
| `modules.landingPad.massKg` | No published mass for a prepared lunar or Martian landing pad was found. |
| `events.marsDustStorm.solarFactor` | No single figure: each Mars site carries its own in sites.<id>.dustStormSolarFactor, from the Mars Climate Database. |
| `sites.moon-shackleton-rim.iceAvailability` | No measurement of extractable ice exists for this site. Diviner shows 11.1% of the 55.6 km window never warms above 110 K, where water ice is stable (validation/build/moon_temperature.py). The one direct measurement of lunar polar water, 5.6 +/- 2.9% by mass, is from the LCROSS impact at Cabeus (Colaprete et al. 2010, Science), a different crater. |
| `sites.moon-malapert-massif.longestDarkHours` | No published longest dark period for this site was found. |
| `sites.moon-malapert-massif.iceAvailability` | No measurement of extractable ice exists for this site. Diviner shows 1.5% of the 55.6 km window never warms above 110 K, where water ice is stable (validation/build/moon_temperature.py). The one direct measurement of lunar polar water, 5.6 +/- 2.9% by mass, is from the LCROSS impact at Cabeus (Colaprete et al. 2010, Science), a different crater. |
| `sites.moon-mons-mouton.litFraction` | No published share of time in sunlight for this site was found. |
| `sites.moon-mons-mouton.longestDarkHours` | No published longest dark period for this site was found. |
| `sites.moon-mons-mouton.iceAvailability` | No measurement of extractable ice exists for this site. Diviner shows 0.5% of the 55.6 km window never warms above 110 K, where water ice is stable (validation/build/moon_temperature.py). The one direct measurement of lunar polar water, 5.6 +/- 2.9% by mass, is from the LCROSS impact at Cabeus (Colaprete et al. 2010, Science), a different crater. |
| `sites.moon-haworth.litFraction` | The crater floor is in permanent shadow. No published figure for the landing region beside it was found. |
| `sites.moon-haworth.longestDarkHours` | No published longest dark period for the landing region was found. |
| `sites.moon-haworth.iceAvailability` | No measurement of extractable ice exists for this site. Diviner shows 35.4% of the 55.6 km window never warms above 110 K, where water ice is stable (validation/build/moon_temperature.py). The one direct measurement of lunar polar water, 5.6 +/- 2.9% by mass, is from the LCROSS impact at Cabeus (Colaprete et al. 2010, Science), a different crater. |

## Derived values

| Value | Number | Unit | Arithmetic | Source | Check |
| --- | --- | --- | --- | --- | --- |
| `constants.oxygenKgPerKgWater` | 0.867 | kg oxygen per kg water | Derived: 13 t of oxygen from 15 t of water in the study's baseline case (13 / 15). | Kleinhenz and Paz 2020, Case Studies for Lunar ISRU Systems Utilizing Polar Water, AIAA ASCEND (NASA NTRS 20205007966) | A |
| `modules.solar.massKg` | 325 | kg | Derived: 16.25 kg per kW (the table's estimate for the ISS roll-out array producing 20 kW, arrays only) x 20 kW. | NASA Life Support Baseline Values and Assumptions Document, NASA/TP-2015-218570/REV2 (2022), Table 3-16 | A |
| `modules.battery.massKg` | 197.3 | kg | Derived: specification weight 435 lb x 0.45359 kg per lb. | Dalton et al. 2016, International Space Station Lithium-Ion Battery, NASA Aerospace Battery Workshop (NASA NTRS 20170004112) | A |
| `modules.greenhouse.massKg` | 5075 | kg | Derived: 101.5 kg per m2 of growing area x 50 m2. | NASA Life Support Baseline Values and Assumptions Document, NASA/TP-2015-218570/REV2 (2022), Table 4-88 | A |
| `modules.iceMiner.waterKgPerDay` | 66.7 | kg per day | Derived: 15 t of water collected and processed in 225 days (15,000 / 225). The study assumes 5% ice by mass and 75% extraction. | Kleinhenz and Paz 2020, Case Studies for Lunar ISRU Systems Utilizing Polar Water, AIAA ASCEND (NASA NTRS 20205007966) | A |
| `modules.iceMiner.electrolysisKwhPerKgOxygen` | 8.31 | kWh per kg oxygen | Derived: the electrolysis subsystem draws approximately 20 kW and makes 13 t of oxygen in 225 days (20 kW x 24 h / 57.8 kg per day). | Kleinhenz and Paz 2020, Case Studies for Lunar ISRU Systems Utilizing Polar Water, AIAA ASCEND (NASA NTRS 20205007966) | A |
| `events.marsDustStorm.durationDays` | 54 | days | Derived: the 2018 storm was first detected on 30 May and by 23 July more dust was falling out than being raised (54 days). Dust took until mid-September to clear. | NASA Scientific Visualization Studio 30983 and JPL Opportunity status, 2018 global dust storm | A |

## Published values

| Value | Number | Unit | Source | Check | Note |
| --- | --- | --- | --- | --- | --- |
| `crew.oxygenKgPerDay` | 0.895 | kg per person per day | NASA Life Support Baseline Values and Assumptions Document, NASA/TP-2015-218570/REV2 (2022), Table 3-31 | A |  |
| `crew.waterKgPerDay` | 3.217 | kg per person per day | NASA Life Support Baseline Values and Assumptions Document, NASA/TP-2015-218570/REV2 (2022), Table 3-31 | A | Potable water: 2.00 kg drinking, 0.5 kg food preparation, 0.717 kg extra for exercise. Hygiene water and water recycling are not modelled. |
| `crew.foodKgPerDay` | 0.8 | kg dry mass per person per day | NASA Life Support Baseline Values and Assumptions Document, NASA/TP-2015-218570/REV2 (2022), Table 3-31 | A | Food solids without packaging. |
| `constants.solarConstantWm2` | 1361.0 | W/m2 | NASA NSSDCA Earth Fact Sheet | A | Sunlight at Earth's distance, above the atmosphere. |
| `modules.habitat.massKg` | 21500 | kg | Drake, Hoffman and Beaty 2010, Human Exploration of Mars, Design Reference Architecture 5.0, IEEE Aerospace Conference (NASA NTRS 20090040343) | A | 'approximately 21.5 t'. |
| `modules.habitat.crewCapacity` | 6 | people | Drake, Hoffman and Beaty 2010, Human Exploration of Mars, Design Reference Architecture 5.0, IEEE Aerospace Conference (NASA NTRS 20090040343) | A | The architecture sends six crew members, housed in one habitat. |
| `modules.habitat.powerKw` | 12.1 | kW | Drake, Hoffman and Beaty 2010, Human Exploration of Mars, Design Reference Architecture 5.0, IEEE Aerospace Conference (NASA NTRS 20090040343) | A | 'using 12.1 kWe of electrical power'. Whatever thermal control that figure includes is not broken out. |
| `modules.solar.ratedPowerKw` | 20 | kW | NASA 2021, New Solar Arrays to Power NASA's International Space Station Research, nasa.gov | A | 'Each new solar array will produce more than 20 kilowatts'. Dust and heat on a planet's surface are not modelled. |
| `modules.solar.ratedIrradianceWm2` | 1361.0 | W/m2 | NASA NSSDCA Earth Fact Sheet | A | The sunlight the rated power refers to: Earth's distance, above the atmosphere. |
| `modules.battery.capacityKwh` | 15 | kWh | Dalton et al. 2016, International Space Station Lithium-Ion Battery, NASA Aerospace Battery Workshop (NASA NTRS 20170004112) | A | 'Li-Ion ~15 kWh'. Depth-of-discharge limits are not modelled. |
| `modules.greenhouse.growingAreaM2` | 50 | m2 | Wheeler 2020, Bioregenerative Life Support for Humans in Space (NASA NTRS 20205008786) | B | The size chosen for one module: 'about 50 m2' of crops supplies one person's food calories. |
| `modules.greenhouse.foodKgPerM2Day` | 0.02 | kg dry edible mass per m2 per day | NASA Life Support Baseline Values and Assumptions Document, NASA/TP-2015-218570/REV2 (2022), Table 4-90 | A | Wheat: 20.00 g dry weight per m2 per day. |
| `modules.greenhouse.oxygenKgPerM2Day` | 0.056 | kg per m2 per day | NASA Life Support Baseline Values and Assumptions Document, NASA/TP-2015-218570/REV2 (2022), Table 4-91 | A | Wheat: 56.00 g per m2 per day. |
| `modules.greenhouse.powerKwPerM2` | 2.6 | kW per m2 | NASA Life Support Baseline Values and Assumptions Document, NASA/TP-2015-218570/REV2 (2022), Table 4-88 | A | Lamps, ballasts, root zone and fans. Based on high-pressure sodium lamps; BVAD says it has not been updated for LED lighting, which would lower it. |
| `modules.iceMiner.massKg` | 4900 | kg | Kleinhenz and Paz 2020, Case Studies for Lunar ISRU Systems Utilizing Polar Water, AIAA ASCEND (NASA NTRS 20205007966) | A | 'Total Mass 4.9 tons' for the whole plant (ridge system, mine system, two water tankers), without its power system. |
| `modules.iceMiner.powerKw` | 20 | kW | Kleinhenz and Paz 2020, Case Studies for Lunar ISRU Systems Utilizing Polar Water, AIAA ASCEND (NASA NTRS 20205007966) | A | 'approximately 20 kW' for the water extractor subsystem. |
| `modules.landingPad.cargoKgPerDelivery` | 12000 | kg | NASA 2024, Work Underway on Large Cargo Landers for NASA's Artemis Moon Missions, nasa.gov | A | 'approximately 26,000 - 33,000 pounds (12 to 15 metric tons) of payload'. The lower figure is used. A lunar lander; no Mars figure was looked for. |
| `modules.landingPad.maxSlopeDeg` | 10 | degrees | Dwyer Cianciolo 2024, Artemis Human Landing System Update, NASA EDL Summer Seminar (NASA NTRS 20240009596) | A | 'Surface slope for landing (100m): <10 deg', from a seminar slide of Artemis III requirements, not the requirements document. The site slopes it is compared with are means over a 55 km window at 463 m spacing. |
| `events.lunarNight.durationDays` | 14 | days | NASA LRO lithograph LG-2013-11-084-GSFC, Temperature Variation on the Moon | A | 'a lunar night lasts 14 Earth days'. |
| `events.lunarNight.solarFactor` | 0 | fraction of normal sunlight | NASA LRO lithograph LG-2013-11-084-GSFC, Temperature Variation on the Moon | A | Night: the Sun is below the horizon. |
| `sites.moon-shackleton-rim.irradianceWm2` | 1361.0 | W/m2 | NASA NSSDCA Moon Fact Sheet | A | Sunlight at the Moon's distance on an array turned to face the Sun. At the poles the Sun is on the horizon, so arrays stand upright. |
| `sites.moon-shackleton-rim.litFraction` | 0.87 | fraction | Leone et al. 2023, iScience 26:107853, doi:10.1016/j.isci.2023.107853 | A | Upper end of the published range for the Shackleton rim (50% to 87% of the time): assumes the arrays stand at the best-lit spot. |
| `sites.moon-shackleton-rim.longestDarkHours` | 36 | hours | Mazarico et al. 2011, Icarus 211:1066, doi:10.1016/j.icarus.2010.10.030 | B | 'longest total darkness about 1.5 days' at the best-lit rim location (1.5 x 24 hours). From the paper's abstract. |
| `sites.moon-malapert-massif.irradianceWm2` | 1361.0 | W/m2 | NASA NSSDCA Moon Fact Sheet | A | Sunlight at the Moon's distance on an array turned to face the Sun. At the poles the Sun is on the horizon, so arrays stand upright. |
| `sites.moon-malapert-massif.litFraction` | 0.82 | fraction | Leone et al. 2023, iScience 26:107853, doi:10.1016/j.isci.2023.107853 | A | Upper end of the published range for Malapert Massif (50% to 82%): assumes the arrays stand at the best-lit spot. |
| `sites.moon-mons-mouton.irradianceWm2` | 1361.0 | W/m2 | NASA NSSDCA Moon Fact Sheet | A | Sunlight at the Moon's distance on an array turned to face the Sun. At the poles the Sun is on the horizon, so arrays stand upright. |
| `sites.moon-haworth.irradianceWm2` | 1361.0 | W/m2 | NASA NSSDCA Moon Fact Sheet | A | Sunlight at the Moon's distance on an array turned to face the Sun. At the poles the Sun is on the horizon, so arrays stand upright. |
| `sites.mars-jezero.irradianceWm2` | 295.2 | W/m2 | Mars Climate Database v6.2 (LMD/OU/IAA/ESA/CNES), incident solar flux on a horizontal surface (validation/build/mars_sunlight.py) | A | Climate model, not a measurement. Mean over the Mars year, seasons weighted by their length. Mean flux on flat ground while the Sun is up. |
| `sites.mars-jezero.litFraction` | 0.501 | fraction | Mars Climate Database v6.2 (LMD/OU/IAA/ESA/CNES), incident solar flux on a horizontal surface (validation/build/mars_sunlight.py) | A | Climate model, not a measurement. Mean over the Mars year, seasons weighted by their length. Share of local hours with any sunlight. |
| `sites.mars-jezero.longestDarkHours` | 13.4 | hours | Mars Climate Database v6.2 (LMD/OU/IAA/ESA/CNES), incident solar flux on a horizontal surface (validation/build/mars_sunlight.py) | A | Longest night of the Mars year, from hourly model output: good to about an hour. |
| `sites.mars-jezero.iceAvailability` | 0 | fraction of nominal miner output | Piqueux et al. 2019, Geophysical Research Letters 46:14290, doi:10.1029/2019GL083947 | B | Inferred, not measured at the site: shallow ground ice is reported at latitudes as low as 35 N and 45 S, and Jezero is at 18 N. |
| `sites.mars-jezero.dustStormSolarFactor` | 0.17 | fraction of normal sunlight | Mars Climate Database v6.2 (LMD/OU/IAA/ESA/CNES), incident solar flux on a horizontal surface (validation/build/mars_sunlight.py) | A | Dust-storm scenario divided by the normal year, at five seasons in the dust-storm season (Ls 210 to 330). Climate model. |
| `sites.mars-gale.irradianceWm2` | 318.7 | W/m2 | Mars Climate Database v6.2 (LMD/OU/IAA/ESA/CNES), incident solar flux on a horizontal surface (validation/build/mars_sunlight.py) | A | Climate model, not a measurement. Mean over the Mars year, seasons weighted by their length. Mean flux on flat ground while the Sun is up. |
| `sites.mars-gale.litFraction` | 0.492 | fraction | Mars Climate Database v6.2 (LMD/OU/IAA/ESA/CNES), incident solar flux on a horizontal surface (validation/build/mars_sunlight.py) | A | Climate model, not a measurement. Mean over the Mars year, seasons weighted by their length. Share of local hours with any sunlight. |
| `sites.mars-gale.longestDarkHours` | 13.4 | hours | Mars Climate Database v6.2 (LMD/OU/IAA/ESA/CNES), incident solar flux on a horizontal surface (validation/build/mars_sunlight.py) | A | Longest night of the Mars year, from hourly model output: good to about an hour. |
| `sites.mars-gale.iceAvailability` | 0 | fraction of nominal miner output | Piqueux et al. 2019, Geophysical Research Letters 46:14290, doi:10.1029/2019GL083947 | B | Inferred, not measured at the site: shallow ground ice is reported at latitudes as low as 35 N and 45 S, and Gale is at 5 S. |
| `sites.mars-gale.dustStormSolarFactor` | 0.219 | fraction of normal sunlight | Mars Climate Database v6.2 (LMD/OU/IAA/ESA/CNES), incident solar flux on a horizontal surface (validation/build/mars_sunlight.py) | A | Dust-storm scenario divided by the normal year, at five seasons in the dust-storm season (Ls 210 to 330). Climate model. |
| `sites.mars-arcadia-planitia.irradianceWm2` | 240.7 | W/m2 | Mars Climate Database v6.2 (LMD/OU/IAA/ESA/CNES), incident solar flux on a horizontal surface (validation/build/mars_sunlight.py) | A | Climate model, not a measurement. Mean over the Mars year, seasons weighted by their length. Mean flux on flat ground while the Sun is up. |
| `sites.mars-arcadia-planitia.litFraction` | 0.509 | fraction | Mars Climate Database v6.2 (LMD/OU/IAA/ESA/CNES), incident solar flux on a horizontal surface (validation/build/mars_sunlight.py) | A | Climate model, not a measurement. Mean over the Mars year, seasons weighted by their length. Share of local hours with any sunlight. |
| `sites.mars-arcadia-planitia.longestDarkHours` | 15.4 | hours | Mars Climate Database v6.2 (LMD/OU/IAA/ESA/CNES), incident solar flux on a horizontal surface (validation/build/mars_sunlight.py) | A | Longest night of the Mars year, from hourly model output: good to about an hour. |
| `sites.mars-arcadia-planitia.iceAvailability` | 1 | fraction of nominal miner output | Bramson et al. 2015, Geophysical Research Letters 42, doi:10.1002/2015GL064844; Golombek et al. 2021, LPSC abstract 2420 | A | A widespread layer of excess water ice tens of metres thick, and the site was chosen for its ice. 1 means the miner works at its rated output; the rating itself is a lunar figure. |
| `sites.mars-arcadia-planitia.dustStormSolarFactor` | 0.102 | fraction of normal sunlight | Mars Climate Database v6.2 (LMD/OU/IAA/ESA/CNES), incident solar flux on a horizontal surface (validation/build/mars_sunlight.py) | A | Dust-storm scenario divided by the normal year, at five seasons in the dust-storm season (Ls 210 to 330). Climate model. |

## Source links

- NASA BVAD Rev 2: https://ntrs.nasa.gov/api/citations/20210024855/downloads/BVAD_2.15.22-final.pdf
- DRA 5.0 (Drake et al. 2010): https://ntrs.nasa.gov/api/citations/20090040343/downloads/20090040343.pdf
- Kleinhenz and Paz 2020: https://ntrs.nasa.gov/citations/20205007966
- ISS lithium-ion battery (Dalton et al. 2016): https://ntrs.nasa.gov/api/citations/20170004112/downloads/20170004112.pdf
- ISS roll-out solar arrays (NASA 2021): https://www.nasa.gov/missions/station/new-solar-arrays-to-power-nasas-international-space-station-research/
- Artemis HLS update (Dwyer Cianciolo 2024): https://ntrs.nasa.gov/citations/20240009596
- Artemis cargo landers (NASA 2024): https://www.nasa.gov/humans-in-space/work-underway-on-large-cargo-landers-for-nasas-artemis-moon-missions/
- LRO lithograph, lunar temperature: https://science.nasa.gov/wp-content/uploads/2024/01/lrolitho7temperaturevariation27may2014.pdf
- Wheeler 2020: https://ntrs.nasa.gov/citations/20205008786
- Mars Climate Database: https://www-mars.lmd.jussieu.fr/mcd_python/
- Leone et al. 2023: https://doi.org/10.1016/j.isci.2023.107853
- Mazarico et al. 2011: https://doi.org/10.1016/j.icarus.2010.10.030
- Piqueux et al. 2019: https://doi.org/10.1029/2019GL083947
- 2018 dust storm (NASA SVS): https://svs.gsfc.nasa.gov/30983
- NSSDCA fact sheets: https://nssdc.gsfc.nasa.gov/planetary/factsheet/

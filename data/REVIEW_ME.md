# REVIEW_ME: values to check by hand

Part 1 covers `data/targets.json`. Part 2, further down, covers `data/modules.json`. Part 3 covers the named
places, target minerals and rover figures added on 2026-11-15.

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
8. Marius Hills (added 2026-11-15) is SBATS's own choice of a lava-tube target. It is not a NASA landing region,
   the pit's link to an open tube is not confirmed, and its temperature is a different statistic from the polar
   targets (measured surface mean against modelled mean at 2 cm depth). It has no known Earth analog listed, so
   it takes no part in validation: the frozen validation numbers are those of the other seven targets.

## Coordinates

| Target | lat | lon | What the point is | Link | Check | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| Malapert Massif | -85.98 | -1.67 | Centre of Mons Malapert, IAU Gazetteer feature 16338. The Artemis region centre in the LROC archive is 86.0 S, 0.3 E, about 4 km away. | https://planetarynames.wr.usgs.gov/Feature/16338 | A | High |
| Mons Mouton | -84.6 | 31.0 | Centre of Mons Mouton, IAU Gazetteer feature 16070. | https://planetarynames.wr.usgs.gov/Feature/16070 | A | High |
| Haworth | -87.45 | -5.17 | Centre of Haworth crater, IAU Gazetteer feature 14502 (LOLA 2011 control network). NASA publishes no coordinates for the Artemis 'Haworth' region, which lies beside the crater. | https://planetarynames.wr.usgs.gov/Feature/14502 | A | High for the crater, medium as a landing point |
| Shackleton rim | -89.67 | 129.78 | Centre of Shackleton crater, IAU Gazetteer feature 5450, not a point on the rim. The rim is about 10 km away, well inside the 55.6 km window that every value is measured over. | https://planetarynames.wr.usgs.gov/Feature/5450 | A | High for the crater, medium as a rim point |
| Marius Hills pit | 14.091 | -56.77 | The Marius Hills pit, 14.091 N 303.230 E, Wagner and Robinson 2014, Icarus 237:52, Table 2 (read in the open manuscript). The LROC pit atlas gives 14.0917, 303.2299. JAXA's 2017 release gives 14.100 N, 303.262 E, about 1 km away. 'Marius Hills' is an informal name with no IAU Gazetteer entry. | https://doi.org/10.1016/j.icarus.2014.04.002 | B | High |
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

### Marius Hills pit (`moon-marius-hills`)

| Factor | Value | Sigma | Badge | Source link | Check | Confidence | Comment |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `tempMean` | -54.6 C | 15.0 | Mission | https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_gcp/ | A | Medium to high | Computed by validation/build/moon_global_temperature.py from the Diviner Global Cumulative Products: mean of the measured surface temperature over the 96 local-time steps of one lunar day, 218.5 K. 29 of the 96 steps had no observation and were filled by straight-line interpolation (longest gap two steps). Cross-check: Williams et al. 2017 state 215.5 K for the equator. NOT THE SAME STATISTIC as the polar targets, which carry a modelled annual mean at 2 cm depth. The score clamps both to Earth's coldest cell (-54.5 C), so the difference does not change a score. It is the open surface, not the pit interior. |
| `tempRange` | 297.5 C | 5.0 | Mission | https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_gcp/ | A | Medium | Same run as the mean: highest step 391.9 K (12.4 h local time) minus lowest 94.4 K (4.9 h). Williams et al. 2017 give 392.3 K and 94.3 K for the equator. A HUMAN SHOULD DECIDE whether a swing over a 29.5-day lunar day belongs in the same field as Earth's daily range. It is far beyond Earth's largest (19 C), so the score clamps it; the four polar targets have no value here. |
| `precip` | 0 mm/year | 250.0 | Literature | https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html | A | High | Set to 0 by data/SCHEMA.md. The source shows why: there is no atmosphere. |
| `ndvi` | 0.05 | 0.1 | Literature | https://science.nasa.gov/earth/earth-observatory/measuring-vegetation-ndvi-evi | A | Medium | Not a measurement on the Moon or Mars. NASA's page says NDVI of 0.1 and below is barren rock, sand or snow; 0.05 is the middle of that band, chosen by SBATS as the bare-ground reference. |
| `slope` | 1.74 deg | 1.0 | Mission | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/ | A | High | Computed by validation/target_terrain.py from the LOLA 512 pixels per degree global grid (59 m), tile LDEM_512_00N_45N_270_360, block-averaged to 463 m like every other target. The two polar-grid targets re-measured in the same run reproduce their published values. |
| `roughness` | 228.9 m | 114.5 | Mission | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/ | A | High | Same run as slope. Elevations in the window run from -2317 m to -843 m. |
| `lithology` | 2 GLiM code |  | Literature | https://doi.org/10.1029/2010JE003725 | B | Medium to high | Mare basalt: Besse et al. 2011 ('mare basalts', domes and cones in a 'high-calcium pyroxene' unit) and Lawrence et al. 2013 (domes 'not rich in silica'). Abstracts only, read by a research agent. |

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
| Marius Hills pit 58 by 49 m wide and 40 m deep | https://doi.org/10.1016/j.icarus.2014.04.002 | B | Medium. Wagner and Robinson 2014, Table 2, from LROC images at about 1 m. SOURCES DISAGREE: the discovery paper (Haruyama et al. 2009, doi:10.1029/2009GL040635) gives 65 m wide and 80 to 88 m deep from 10 m SELENE images; an early LROC post gives 34 m deep. |
| Radar echo patterns around the pit that fit intact lava tubes | https://doi.org/10.1002/2017GL074998 | B | Medium. Kaku et al. 2017, abstract only. The '50 km tube' figure is in JAXA's press release, not the abstract, and is not used. Wagner and Robinson 2014 argue that mare pits are 'likely to be post-flow features rather than volcanic skylights', which is why the summary says the link to a tube is not confirmed. |
| Marius Hills surface 392 K at midday and 94 K before dawn | https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_gcp/ | A | High. Computed here; matches Williams et al. 2017 for the equator. |
| Pits give some protection from cosmic rays, solar radiation and micrometeorites | https://www.nasa.gov/solar-system/nasas-lro-finds-lunar-pits-harbor-comfortable-temperatures/ | B | Medium. NASA release of 26 July 2022. De Angelis et al. 2002 (doi:10.1269/jrr.43.S41) studied the radiation case; its dose figures could not be opened. |
| About 290 K (17 C) in the shadowed part of a pit | https://doi.org/10.1029/2022GL099710 | A | Medium. Horvath et al. 2022, read in full. The figure is a model of the Mare Tranquillitatis pit, NOT Marius Hills. An older estimate for lunar caves is 253 K (Horz 1985, quoted by Wagner and Robinson 2014). |
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

1. 11 values are derived, not printed in the source (one multiplication or division each). They are
   listed below. If the team wants only printed numbers, set them to null: the module becomes illustrative.
2. The modules are sized on real hardware or studies, but for other settings: the habitat is a Mars
   design, the solar array and battery are International Space Station units, the ice miner is a lunar
   study and the cargo figure is a lunar lander. They are used at every target. Is that acceptable?
3. Greenhouse power is 2.6 kW per m2, NASA's figure for high-pressure sodium lamps. BVAD itself says it has
   not been updated for LEDs. It makes one greenhouse draw 130 kW, ten times a habitat. It is NASA's
   published number, so it stands, but it will dominate any layout with a greenhouse.
4. Lit fraction on the Moon assumes the arrays stand at the best-lit spot near the target: the upper end of a
   published range (Shackleton 87%, Malapert 82%), and for Mons Mouton the 2009 figure for its summit (77%),
   24 km from the target's centre point. Haworth is 0: its target point is the crater centre, in permanent
   shadow. Is 'best-lit spot nearby' the right rule, and is Haworth better moved to the landing region?
5. Ice availability is 1 at Arcadia Planitia, 0 at Jezero, Gale and Marius Hills (inferred), and null at
   the four polar lunar sites. So a polar layout with an ice miner shows "no data". Ice is detected at the
   surface in Haworth and inside Shackleton, but no source gives a grade a miner could be scaled by.
9. Shackleton's longest dark period changed on 2026-11-15 from 36 to 66 hours. The earlier figure could not
   be confirmed in its stated source on a second search. The new one is read from Glaser et al. 2018,
   Table 2 (array 2 m above ground). At ground level the same study gives 221 hours.
10. The Malapert and Mons Mouton dark periods and the Mons Mouton lit fraction come from a 2009 JPL study on
    a radar elevation model made before LOLA. The LOLA illumination map agrees with its lit fractions to
    within a few percent (validation/build/moon_illumination.py), but has no dark-period figure to check.
11. Marius Hills is lit half the time with a 354-hour night (derived from the length of the lunar day).
    Nothing about the inside of the pit is modelled.
6. The Mars sunlight, night length and dust-storm figures are from a climate model (Mars Climate Database),
   not from landers.
7. Crew water is drinking, food preparation and exercise only (3.217 kg). Hygiene water and recycling are
   not modelled.
8. Earth sites use top-of-atmosphere sunlight, an upper bound, because `earth.json` has no surface
   sunlight. Adding NASA POWER surface sunlight to `earth.json` would fix it (Session B's file).

## Null values ranked by how much they matter to the sandbox (review of 2026-11-15)

On 2026-11-14 the file held the word `null` 43 times. That was 14 values: each stores a null value, a null
source and a null badge (42), and the word appears once in the file's own description. The 14 are ranked below by what they block in the
sandbox. The top 10 were searched for a second time in NASA technical reports and mission papers. Four
could be filled. The rest stay null, as do ranks 11 to 14, which were not searched again.

| Rank | Value | What it blocks in the sandbox | Second search | Now |
| --- | --- | --- | --- | --- |
| 1 | `sites.moon-mons-mouton.litFraction` | Solar power is "no data", so no layout at this target gets a power balance or a readiness colour | Found: Bryant 2009, JPL IPN Progress Report 42-176, Table 3 (summit, 77.43%). Cross-checked on the LOLA illumination map (0.75) | 0.77 |
| 2 | `sites.moon-haworth.litFraction` | Same, at Haworth | No paper gives a figure. Measured instead on the LOLA illumination map: the target point is in permanent shadow | 0 |
| 3 | `sites.moon-shackleton-rim.iceAvailability` | An ice miner placed here makes water and oxygen "no data". The miner is the only water source in the model | Not found. Surface ice is detected inside the crater (Lemelin et al. 2021: 34 detections, at most 0.17% water-equivalent hydrogen), none on the rim, and no mined grade anywhere | null |
| 4 | `sites.moon-haworth.iceAvailability` | Same, at Haworth | Not found. Surface ice is detected (80 detections; 0.31% or 0.44% water-equivalent hydrogen, two instruments), but that is not a grade for the top metre of ground | null |
| 5 | `sites.moon-mons-mouton.iceAvailability` | Same, at Mons Mouton | Not found. No direct detection in the VIPER area (Beyer et al. 2025); ice-stability maps are models | null |
| 6 | `sites.moon-malapert-massif.iceAvailability` | Same, at Malapert Massif | Not found. No statement about the massif itself; the nearest shadowed area is in Malapert crater | null |
| 7 | `sites.moon-malapert-massif.longestDarkHours` | The battery check against the longest dark period shows "no data", and the lunar night event falls back to 14 days | Found: Bryant 2009, Table 3 (12.86 days at the Malapert alpha peak) | 309 (derived) |
| 8 | `sites.moon-mons-mouton.longestDarkHours` | Same, at Mons Mouton | Found: Bryant 2009, Table 3 (9.48 days at the summit) | 228 (derived) |
| 9 | `sites.moon-haworth.longestDarkHours` | Same, at Haworth | Not applicable: the target point is in permanent shadow. No figure for the landing region beside it | null |
| 10 | `modules.habitat.heatingKwPerDegC` | Heating is left out of habitat power at every target, and the habitat is marked illustrative | Not found in a usable form. Schunk et al. 2022 give 1,550 W for a 100-hour lunar eclipse, with no outside temperature to divide by | null |
| 11 | `modules.habitat.comfortTempC` | Nothing while rank 10 is null | Not searched again. A source exists (BVAD Rev 2, Table 4-73: 295.15 K nominal) | null |
| 12 | `modules.greenhouse.waterKgPerM2Day` | Greenhouse water demand is left out, with a note | Not searched again. BVAD gives uptake (11.79 kg per m2 per day for wheat), not net make-up water | null |
| 13 | `modules.landingPad.massKg` | Only the delivered-mass total; the pad is marked illustrative | Not searched again. Published figures range from 0.5 t to 282 t by building method | null |
| 14 | `events.marsDustStorm.solarFactor` | Nothing: every Mars site carries its own factor | Not searched again | null |

Check levels for this review: the Bryant 2009 table, the Glaser 2018 tables and the Lemelin 2021 rows were
read in the saved source texts in the main session (A). Everything else in the 'Second search' column was
reported by a research sub-agent (B).

## Values with no source (null): these make a module illustrative

| Value | What was looked for and not found |
| --- | --- |
| `modules.habitat.heatingKwPerDegC` | No published heat-loss figure per degree was found for a surface habitat, so the heating load is not modelled. The nearest figure: 1,550 W of heater power to hold a lunar surface habitat at 283 K through a 100-hour eclipse (Schunk et al. 2022, NASA NTRS 20210026557), with no outside temperature to divide by. Searched twice (2026-11-14 and 2026-11-15). |
| `modules.habitat.comfortTempC` | Only needed for the heating load, which is not modelled. Left null on purpose. A source exists if the load is ever modelled: BVAD Rev 2, Table 4-73, nominal cabin air temperature 295.15 K. |
| `modules.greenhouse.waterKgPerM2Day` | Wheat takes up 11.79 kg per m2 per day (BVAD Rev 2, Table 4-91), but transpires nearly all of it, and a closed chamber recovers it. No net make-up figure was found, so greenhouse water is left out. |
| `modules.landingPad.massKg` | Left null: no single mass fits. Published figures depend on the building method: 0.5 to 7.6 t of equipment or material brought from Earth for a 27 m radius pad (Metzger and Autry, arXiv:2205.00378, Table 1), and 3 to 282 t of imported polymer for pads of 15 to 200 m (Gelino et al. 2022, NASA NTRS 20220000334, Table 1). |
| `events.marsDustStorm.solarFactor` | No single figure: each Mars site carries its own in sites.<id>.dustStormSolarFactor, from the Mars Climate Database. |
| `sites.moon-shackleton-rim.iceAvailability` | No measurement of extractable ice in the ground exists for this site, so the miner's output cannot be scaled. Ice has been detected on the surface inside the crater, not on the rim: 34 detections on the walls of the permanently shadowed interior, with at most 0.17% water-equivalent hydrogen by mass (Lemelin et al. 2021, Planetary Science Journal 2:103, Table 2). Zuber et al. 2012 offer about 20% ice in a one-micrometre surface layer of the floor only as an alternative reading. No detection on the rim was found. Diviner shows 11.1% of the 55.6 km window never warms above 110 K, where water ice is stable (validation/build/moon_temperature.py). The miner is sized for 5% ice by mass; the one direct measurement of lunar polar water, 5.6 +/- 2.9% by mass, is from the LCROSS impact at Cabeus (Colaprete et al. 2010, Science), a different crater. Searched twice (2026-11-14 and 2026-11-15). |
| `sites.moon-malapert-massif.iceAvailability` | No measurement of extractable ice in the ground exists for this site, so the miner's output cannot be scaled. No statement of ice detected, or looked for and not found, at the massif itself was found. The nearest catalogued shadowed area, in Malapert crater, has 17 surface detections and at most 0.05% water-equivalent hydrogen (Lemelin et al. 2021, Tables 2 and 5). Diviner shows 1.5% of the 55.6 km window never warms above 110 K, where water ice is stable (validation/build/moon_temperature.py). The miner is sized for 5% ice by mass; the one direct measurement of lunar polar water, 5.6 +/- 2.9% by mass, is from the LCROSS impact at Cabeus (Colaprete et al. 2010, Science), a different crater. Searched twice (2026-11-14 and 2026-11-15). |
| `sites.moon-mons-mouton.iceAvailability` | No measurement of extractable ice in the ground exists for this site, so the miner's output cannot be scaled. No direct detection in the VIPER mission area on Mons Mouton was found: the site analysis says only that the extended area may hold one surface detection (Beyer et al. 2025, Planetary Science Journal 6:236). Ice-stability maps there are models, not detections. Diviner shows 0.5% of the 55.6 km window never warms above 110 K, where water ice is stable (validation/build/moon_temperature.py). The miner is sized for 5% ice by mass; the one direct measurement of lunar polar water, 5.6 +/- 2.9% by mass, is from the LCROSS impact at Cabeus (Colaprete et al. 2010, Science), a different crater. Searched twice (2026-11-14 and 2026-11-15). |
| `sites.moon-haworth.longestDarkHours` | No value: the target point is in permanent shadow, so there is no longest dark period to give. No published figure for the landing region beside the crater was found. Searched twice (2026-11-14 and 2026-11-15). |
| `sites.moon-haworth.iceAvailability` | No measurement of extractable ice in the ground exists for this site, so the miner's output cannot be scaled. Ice has been detected on the surface here: 80 detections in the permanently shadowed floor (Lemelin et al. 2021, Table 2; also listed by Li et al. 2018, PNAS). The amount is small and uncertain: at most 0.31% water-equivalent hydrogen by mass from Lunar Prospector (Lemelin et al. 2021), 0.44% from LEND as quoted by Krasilnikov et al. 2023. That is the top metre seen from orbit, not a mined grade. Diviner shows 35.4% of the 55.6 km window never warms above 110 K, where water ice is stable (validation/build/moon_temperature.py). The miner is sized for 5% ice by mass; the one direct measurement of lunar polar water, 5.6 +/- 2.9% by mass, is from the LCROSS impact at Cabeus (Colaprete et al. 2010, Science), a different crater. Searched twice (2026-11-14 and 2026-11-15). |

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
| `sites.moon-malapert-massif.longestDarkHours` | 309 | hours | Derived: 12.86 days x 24 hours, the longest continuous period with less than half the solar disk visible at the Malapert alpha peak (86.037 S, 1.704 E). Computed in 2009 on a radar elevation model made before LOLA. For comparison, an idealised study gives 159 to 199 hours (Fincannon 2007, NASA/TM-2007-215025, reporting Sharpe and Schrunk). | Bryant 2009, Lunar Pole Illumination and Communications Maps Computed from Goldstone Solar System Radar Elevation Data, JPL IPN Progress Report 42-176, Table 3 | A |
| `sites.moon-mons-mouton.longestDarkHours` | 228 | hours | Derived: 9.48 days x 24 hours, the longest continuous period with less than half the solar disk visible at the Leibnitz beta peak. Computed in 2009 on a radar elevation model made before LOLA. | Bryant 2009, Lunar Pole Illumination and Communications Maps Computed from Goldstone Solar System Radar Elevation Data, JPL IPN Progress Report 42-176, Table 3 | A |
| `sites.moon-marius-hills.litFraction` | 0.5 | fraction | Derived: away from the poles, open ground is in daylight for half of each lunar day of 29.53 Earth days (synodic period, NSSDC). Hills that shade the site are not modelled. Arrays on the surface; nothing inside the pit is lit. | NASA NSSDCA Moon Fact Sheet | A |
| `sites.moon-marius-hills.longestDarkHours` | 354 | hours | Derived: half of the 29.53-day lunar day (29.53 x 24 / 2 = 354 hours). The same night the LRO lithograph rounds to 14 Earth days. | NASA NSSDCA Moon Fact Sheet | A |

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
| `sites.moon-shackleton-rim.litFraction` | 0.87 | fraction | Leone et al. 2023, iScience 26:107853, doi:10.1016/j.isci.2023.107853 | B | Upper end of the published range for the Shackleton rim (50% to 87% of the time): assumes the arrays stand at the best-lit spot. Cross-check: the LOLA illumination map gives 0.86 at the best-lit rim point of Glaser et al. 2018 (validation/build/moon_illumination.py). The target's own centre point is the crater floor, in permanent shadow. |
| `sites.moon-shackleton-rim.longestDarkHours` | 66 | hours | Glaser et al. 2018, Planetary and Space Science 162:170, doi:10.1016/j.pss.2017.07.006 (manuscript NASA NTRS 20170007365), Table 2 | A | 'Max. time in shadow' 66 hours at the best-lit rim cluster, for an array 2 m above the ground, over twenty years. At ground level the same study gives 221 hours (its Table 1). Replaces 36 hours, which a second search on 2026-11-15 could not confirm in its stated source. |
| `sites.moon-malapert-massif.irradianceWm2` | 1361.0 | W/m2 | NASA NSSDCA Moon Fact Sheet | A | Sunlight at the Moon's distance on an array turned to face the Sun. At the poles the Sun is on the horizon, so arrays stand upright. |
| `sites.moon-malapert-massif.litFraction` | 0.82 | fraction | Leone et al. 2023, iScience 26:107853, doi:10.1016/j.isci.2023.107853 | B | Upper end of the published range for Malapert Massif (50% to 82%): assumes the arrays stand at the best-lit spot. Cross-check: the LOLA illumination map gives 0.82 at the best point within 2 km of the Malapert alpha peak; Bryant 2009 gives 78% for that peak. |
| `sites.moon-mons-mouton.irradianceWm2` | 1361.0 | W/m2 | NASA NSSDCA Moon Fact Sheet | A | Sunlight at the Moon's distance on an array turned to face the Sun. At the poles the Sun is on the horizon, so arrays stand upright. |
| `sites.moon-mons-mouton.litFraction` | 0.77 | fraction | Bryant 2009, Lunar Pole Illumination and Communications Maps Computed from Goldstone Solar System Radar Elevation Data, JPL IPN Progress Report 42-176, Table 3 | A | 'Multiyear average illumination' 77.43% with at least half the solar disk visible (79.06% for any part, 75.82% for the whole disk) at the Leibnitz beta peak (84.722 S, 39.470 E), the earlier name of this mountain's summit, about 24 km from the target's centre point. Computed in 2009 on a radar elevation model made before LOLA. Cross-check: the LOLA illumination map gives 0.75 at the best point within 2 km of that peak, and 0.32 at the target's centre point (validation/build/moon_illumination.py). Assumes the arrays stand at the best-lit spot. |
| `sites.moon-haworth.irradianceWm2` | 1361.0 | W/m2 | NASA NSSDCA Moon Fact Sheet | A | Sunlight at the Moon's distance on an array turned to face the Sun. At the poles the Sun is on the horizon, so arrays stand upright. |
| `sites.moon-haworth.litFraction` | 0 | fraction | LOLA average solar illumination map AVGVISIB_85S_060M_201608, NASA PDS (method of Mazarico et al. 2011), read by validation/build/moon_illumination.py | A | Measured from the map: the target point (the crater centre) and all ground within 2 km of it are in permanent shadow. Solar arrays here produce nothing. The landing region beside the crater is lit part of the time; no figure for it was found. |
| `sites.moon-marius-hills.irradianceWm2` | 1361.0 | W/m2 | NASA NSSDCA Moon Fact Sheet | A | Sunlight at the Moon's distance on an array turned to face the Sun. |
| `sites.moon-marius-hills.iceAvailability` | 0 | fraction of nominal miner output | LRO Diviner Global Cumulative Products, PDS LRO-L-DLRE-5-GCP-V1.0 (validation/build/moon_global_temperature.py); Horvath, Hayne and Paige 2022, Geophysical Research Letters 49:e2022GL099710, doi:10.1029/2022GL099710 | A | Inferred, not measured: Diviner measures the open surface here at 392 K at midday, far above the 110 K below which water ice stays put, and a model of a similar pit gives about 290 K in its shadowed interior (Horvath et al. 2022). No one has looked for ice inside this pit. |
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


# Part 3: named places, target minerals and rover figures (added 2026-11-15)

Three files compiled with research sub-agents under one rule: every value must be read in a source opened in
that session, never typed from memory. The main session then checked the items below. None of these files
enters the all-round score.

## `data/known_sites.json`: places on the Moon and Mars a user can pick

66 places: 27 lunar and 10 Mars landing sites, 17 lunar and 12 Mars candidate regions. Each row has its citation, URL and the
quoted line the coordinates were read from (`quote`). Built by `validation/build/make_known_sites.py`.

Checked in the main session (check level A): all 27 lunar landing rows were found again, digit for digit, in
NASA's two NSSDCA pages fetched on 2026-11-15 (the Apollo coordinates page and the table of spacecraft on the
Moon). The Mars landing sites agree with the values the team already held for Viking 1 and 2, Pathfinder, Spirit,
Opportunity, Curiosity, InSight, Perseverance and Zhurong. Curiosity, Perseverance, Marius Hills, Shackleton and
Arcadia AP-1 fall within 3 km of the curated targets. The candidate regions are check level B (sub-agent only):
please spot-check those before the demo.

Decisions a human should make:

1. Artemis III regions. NASA published no coordinates for the nine regions of October 2024. The file uses the
   centre of the LROC image mosaic made for each region, rounded by LROC to 0.1 degree (about 3 km). 'Nobile Rim 1'
   and 'Mons Mouton' share one mosaic and are one entry. 'de Gerlache Rim 2' uses LROC's single 'de Gerlache Rim'
   mosaic. 'Slater Plain' has no published point and is left out.
2. Surveyor positions are the newer LROC-imaged ones in NASA's table; NASA's older Surveyor page differs by up to
   0.12 degrees (Surveyor 7).
3. Luna 9 is low confidence: NASA says the coordinates are from the original press report and may be 10 km off.
4. Phoenix is NASA's 'nominal' position. Opportunity uses the stated touchdown point; the same NASA page prints the
   ellipse centre with what looks like a W/E typo.
5. Oxia Planum has four published centres up to about 100 km apart (Harris 2024 is used).
6. Schrodinger is the IAU basin centre, not a landing point. Compton-Belkovich is the LROC image centre.
7. Mars sources do not always say whether latitude is planetocentric. At most 0.4 degrees apart.
8. Not found, so not listed: a Chang'e 7 or ILRS site, Mars Sample Return or Ice Mapper regions.
9. `targetId` is computed: the curated target within 27.8 km. 'Midway' (a Mars 2020 finalist beside Jezero) and
   the VIPER area therefore resolve to the Jezero and Mons Mouton targets. Is that the wanted behaviour?

## `data/target_minerals.json`: minerals reported at the targets

Built by `validation/build/make_target_minerals.py`. FT = the paper's full text was read by the sub-agent; ABS =
abstract only. Re-read in the saved texts in the main session: the Jezero olivine and carbonate figures (Farley,
Wiens), the Gale clay names (Rampe) and the EMIT library names. The Gale abundance ranges are check level B.

| Target | Mineral | Family | How | Instrument | Abundance | Source | Read |
| --- | --- | --- | --- | --- | --- | --- | --- |
| mars-gale | plagioclase feldspar | plagioclase | in-place | Curiosity CheMin | 6 to 56% by weight of the crystalline part, by sample | Rampe et al. 2020, Geochemistry 80:125605 (CheMin X-ray diffraction, review of six years in Gale), Table 2 https://doi.org/10.1016/j.chemer.2020.125605 | FT |
| mars-gale | pyroxene | pyroxene | in-place | Curiosity CheMin | 2 to 42% of the crystalline part | Rampe et al. 2020, Geochemistry 80:125605 (CheMin X-ray diffraction, review of six years in Gale), Table 2 https://doi.org/10.1016/j.chemer.2020.125605 | FT |
| mars-gale | olivine | olivine | in-place | Curiosity CheMin | 1 to 8% of the crystalline part; 20.5% in the Rocknest sand | Rampe et al. 2020, Geochemistry 80:125605 (CheMin X-ray diffraction, review of six years in Gale), Tables 2 and 7 https://doi.org/10.1016/j.chemer.2020.125605 | FT |
| mars-gale | magnetite | magnetite | in-place | Curiosity CheMin | 1 to 16% of the crystalline part | Rampe et al. 2020, Geochemistry 80:125605 (CheMin X-ray diffraction, review of six years in Gale), Table 2 https://doi.org/10.1016/j.chemer.2020.125605 | FT |
| mars-gale | hematite | hematite | in-place | Curiosity CheMin | 1 to 28% of the crystalline part | Rampe et al. 2020, Geochemistry 80:125605 (CheMin X-ray diffraction, review of six years in Gale), Table 2 https://doi.org/10.1016/j.chemer.2020.125605 | FT |
| mars-gale | crystalline hematite | hematite | orbital | MRO CRISM |  | Fraeman et al. 2013, Geology 41:1103 https://doi.org/10.1130/G34613.1 | ABS |
| mars-gale | akaganeite | akaganeite | in-place | Curiosity CheMin | 1 to 11% of the crystalline part | Rampe et al. 2020, Geochemistry 80:125605 (CheMin X-ray diffraction, review of six years in Gale), Table 2 https://doi.org/10.1016/j.chemer.2020.125605 | FT |
| mars-gale | jarosite | jarosite | in-place | Curiosity CheMin | 1 to 8% of the crystalline part | Rampe et al. 2020, Geochemistry 80:125605 (CheMin X-ray diffraction, review of six years in Gale), Table 2 https://doi.org/10.1016/j.chemer.2020.125605 | FT |
| mars-gale | anhydrite, bassanite and gypsum | calcium-sulfate | in-place | Curiosity CheMin | anhydrite 1 to 21%, bassanite 1 to 7%, gypsum 1 to 7% of the crystalline part | Rampe et al. 2020, Geochemistry 80:125605 (CheMin X-ray diffraction, review of six years in Gale), Table 2 https://doi.org/10.1016/j.chemer.2020.125605 | FT |
| mars-gale | iron saponite; smectite resembling montmorillonite or nontronite | smectite | in-place | Curiosity CheMin | clay minerals 3 to 28% by weight of the sample | Rampe et al. 2020, Geochemistry 80:125605 (CheMin X-ray diffraction, review of six years in Gale), Table 5 and text https://doi.org/10.1016/j.chemer.2020.125605 | FT |
| mars-gale | iron-magnesium smectite | smectite | orbital | MRO CRISM |  | Fraeman et al. 2013, Geology 41:1103 https://doi.org/10.1130/G34613.1 | ABS |
| mars-gale | tridymite, cristobalite and opal-CT | silica | in-place | Curiosity CheMin | tridymite 34% of the crystalline part in one sample; cristobalite 6 to 12%; opal-CT 4 to 11% of the sample | Rampe et al. 2020, Geochemistry 80:125605 (CheMin X-ray diffraction, review of six years in Gale), Tables 2 and 5 https://doi.org/10.1016/j.chemer.2020.125605 | FT |
| mars-gale | siderite | carbonate-mgfe | in-place | Curiosity CheMin | about 1 to 3% by weight in three samples | Thorpe et al. 2022, JGR Planets 127:e2021JE007099, section 4 https://doi.org/10.1029/2021JE007099 | FT |
| mars-gale | siderite | carbonate-mgfe | in-place | Curiosity CheMin | 4.8 to 10.5% by weight, in a higher part of the section | Tutolo et al. 2025, Science 388:292 https://doi.org/10.1126/science.ado9966 | ABS |
| mars-jezero | olivine | olivine | in-place | Perseverance PIXL | 65% of the analysed surface of one abraded rock (Dourbes, Seitah) | Farley et al. 2022, Science 377:eabo2196 https://doi.org/10.1126/science.abo2196 | FT |
| mars-jezero | olivine with magnesium-rich carbonate | olivine | orbital | MRO CRISM |  | Goudge et al. 2015, JGR Planets 120:775 https://doi.org/10.1002/2014JE004782 | ABS |
| mars-jezero | augite | pyroxene | in-place | Perseverance PIXL | 13% of the analysed surface of the same rock | Farley et al. 2022, Science 377:eabo2196 https://doi.org/10.1126/science.abo2196 | FT |
| mars-jezero | plagioclase (andesine) | plagioclase | in-place | Perseverance SuperCam |  | Wiens et al. 2022, Science Advances 8:eabo3399 https://doi.org/10.1126/sciadv.abo3399 | FT |
| mars-jezero | iron-magnesium carbonate (magnesite to siderite) | carbonate-mgfe | in-place | Perseverance SuperCam and PIXL | a very small fraction, likely under 5%, of the Seitah rock | Wiens et al. 2022, Science Advances 8:eabo3399; Tice et al. 2022, Science Advances 8:eabp9084 https://doi.org/10.1126/sciadv.abo3399 | FT |
| mars-jezero | magnesium-rich carbonate | carbonate-mgfe | orbital | MRO CRISM |  | Goudge et al. 2015, JGR Planets 120:775 https://doi.org/10.1002/2014JE004782 | ABS |
| mars-jezero | hydrous calcium sulfate | calcium-sulfate | in-place | Perseverance SHERLOC and PIXL |  | Farley et al. 2022, Science 377:eabo2196; Tice et al. 2022, Science Advances 8:eabp9084 https://doi.org/10.1126/science.abo2196 | FT |
| mars-jezero | magnesium sulfate | magnesium-sulfate | in-place | Perseverance PIXL |  | Tice et al. 2022, Science Advances 8:eabp9084 https://doi.org/10.1126/sciadv.abp9084 | FT |
| mars-jezero | sodium perchlorate | perchlorate | in-place | Perseverance SHERLOC and SuperCam |  | Farley et al. 2022, Science 377:eabo2196; Wiens et al. 2022, Science Advances 8:eabo3399 https://doi.org/10.1126/science.abo2196 | FT |
| mars-jezero | iron-rich clay such as nontronite | smectite | in-place | Perseverance SuperCam |  | Wiens et al. 2022, Science Advances 8:eabo3399 https://doi.org/10.1126/sciadv.abo3399 | FT |
| mars-jezero | iron-magnesium smectite (saponite or nontronite) in the western fan | smectite | orbital | MRO CRISM |  | Goudge et al. 2015, JGR Planets 120:775 https://doi.org/10.1002/2014JE004782 | ABS |
| mars-jezero | merrillite | phosphate | in-place | Perseverance PIXL |  | Tice et al. 2022, Science Advances 8:eabp9084 https://doi.org/10.1126/sciadv.abp9084 | FT |
| moon-shackleton-rim | plagioclase of very pure anorthosite | plagioclase | orbital | SELENE (Kaguya) Multiband Imager |  | Haruyama et al. 2013, Geophysical Research Letters 40:3814 https://doi.org/10.1002/grl.50753 | ABS |
| moon-marius-hills | high-calcium pyroxene | pyroxene | orbital | Chandrayaan-1 M3 |  | Besse et al. 2011, JGR 116:E00G13 https://doi.org/10.1029/2010JE003725 | ABS |
| moon-marius-hills | olivine, in some flows | olivine | orbital | Chandrayaan-1 M3 |  | Besse et al. 2011, JGR 116:E00G13 https://doi.org/10.1029/2010JE003725 | ABS |

Decisions a human should make:

1. The mineral families and the EMIT name fragments that define them are SBATS's own grouping. 'Smectite clay' on
   the Earth side is mostly EMIT's nontronite; at Gale it is saponite and a montmorillonite-like clay. Is one
   family for all smectites acceptable?
2. An EMIT family counts when matched in at least 1% of the clear pixels. A display rule, not tuned.
3. Gale's siderite: 1 to 3% (Thorpe 2022) and 4.8 to 10.5% (Tutolo 2025) are different parts of the section.
   Tridymite is 34% of the crystalline part (Rampe 2020) and about 14% of the whole sample (Morris 2016): the same
   sample, two ways of counting. The file quotes Rampe.
4. Arcadia Planitia and three lunar polar targets have no published mineral result and are empty on purpose.
5. EMIT's own documentation says validation is still needed for minerals outside its ten core ones (jarosite,
   nontronite and the hematite grain-size variants are outside). Treat every 'shared' as a pointer.

## Wind, dust and ice (`data/target_environment.json`, and the tolerances in `app/src/lib/match/extras.ts`)

Decisions a human should make:

1. Tolerances: wind 2.0 m/s, optical depth 0.12, ice share 0.25. The first two are a quarter of the spread
   between the 5th and 95th percentile of Earth's land cells; the third is a quarter of the 0 to 1 scale.
   Written down before any site was compared, and not tuned. Are these the right widths?
2. Mars wind and dust are climate model values (Mars Climate Database, 10 m wind, column dust optical
   depth). Gale's 12.6 m/s is far above the other two sites and matches no place on Earth: probably the
   model's coarse grid at the crater wall. Curiosity's own wind record would be the better source.
3. Earth 'dust' is aerosol optical depth of all particles (NASA POWER AOD_55). Smoke and pollution over Java
   read like Mars dust by number. The dimension is labelled 'Dust and aerosol' and the note says so. If the
   team prefers, drop the similarity for this dimension and show the two values only.
4. Antarctica reads an aerosol optical depth of exactly 0.00 in every cell: the product is rounded to 0.01.
5. Lunar 'ice' is the share of the window that never warms above 110 K (stability, not detection). Earth
   'ice' is the permafrost share, mapped north of 25 N only. They are compared as 'ground that holds or can
   hold ice'. Mars has no value yet.
6. Wind on Mars pushes about a hundredth as hard as the same wind on Earth. A wind match is not a load match.

## `data/rovers.json`: slope limits and speeds

Built by `validation/build/make_rovers.py`. A = the quoted words were found again in the saved source text in the
main session; B = sub-agent only.

| Rover | Figure | Value | Unit | Source | Check | Note |
| --- | --- | --- | --- | --- | --- | --- |
| perseverance | slopeLimit | 30 | degrees | NASA, Mars 2020 Perseverance rover components page https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/ | A | 'rover drivers avoid terrains that would tilt the rover more than 30 degrees'. |
| perseverance | otherSlope | 45 | degrees | NASA, Mars 2020 Perseverance rover components page https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/ | A |  |
| perseverance | speed | 152 | m per hour | NASA, Mars 2020 Perseverance rover components page https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/ | A |  |
| perseverance | otherSpeed | 110 | m per hour | NASA/JPL Robotics, Mars 2020 rover mobility page https://robotics.jpl.nasa.gov/what-we-do/flight-projects/mars-2020-rover/m2020mobility/ | A |  |
| curiosity | slopeLimit | 30 | degrees | Rankin, Maimone, Biesiadecki, Patel, Levine and Toupet 2020, Driving Curiosity: Mars Rover Mobility Trends During the First Seven Years (JPL) https://www-robotics.jpl.nasa.gov/media/documents/2020-mobility-trending.pdf | A | 'the nominal flight tilt limit is 30 degrees. However, the tilt limit is typically lowered for each drive'. The largest tilt in the first seven years was 25.3 degrees. |
| curiosity | speed | 150 | m per hour | NASA/JPL Robotics, Mars 2020 rover mobility page https://robotics.jpl.nasa.gov/what-we-do/flight-projects/mars-2020-rover/m2020mobility/ | A | 'maximum wheel speed is just 4.2 cm/sec (or approximately 150 meters per hour)'. |
| curiosity | otherSpeed | 18 | m per hour | NASA/JPL Robotics, Mars 2020 rover mobility page https://robotics.jpl.nasa.gov/what-we-do/flight-projects/mars-2020-rover/m2020mobility/ | B |  |
| mer | slopeLimit | 25 | degrees | Biesiadecki, Leger and Maimone 2007, International Journal of Robotics Research 26(1):91, doi:10.1177/0278364907073777 https://doi.org/10.1177/0278364907073777 | A | 'driving on slopes greater than 25 degrees requires special planning'. The rovers drove on hard slopes of up to 31 degrees and are statically stable to 45. |
| mer | otherSlope | 31 | degrees | Biesiadecki, Leger and Maimone 2007, International Journal of Robotics Research 26(1):91, doi:10.1177/0278364907073777 https://doi.org/10.1177/0278364907073777 | B |  |
| mer | otherSlope | 10 | degrees | Leger et al. 2005, Mars Exploration Rover Surface Operations: Driving Spirit at Gusev Crater (JPL) https://www-robotics.jpl.nasa.gov/media/documents/leger_driving05.pdf | B |  |
| mer | speed | 124 | m per hour | Biesiadecki, Leger and Maimone 2007, International Journal of Robotics Research 26(1):91, doi:10.1177/0278364907073777 https://doi.org/10.1177/0278364907073777 | A |  |
| mer | otherSpeed | 36 | m per hour | Biesiadecki, Leger and Maimone 2007, International Journal of Robotics Research 26(1):91, doi:10.1177/0278364907073777 https://doi.org/10.1177/0278364907073777 | B |  |
| sojourner | speed (derived) | 24 | m per hour | NASA PDS, Mars Pathfinder rover instrument host description https://pds.nasa.gov/data/mpfr-m-apxs-2-edr-v1.0/mprv_0001/document/insthost.htm | A | Derived: 'top speed of 0.4 m/min' x 60. |
| viper | slopeLimit | 15 | degrees | Bluethmann 2024, VIPER Rover Overview and Mobility and Hardware (NASA NTRS 20240013903) https://ntrs.nasa.gov/citations/20240013903 | A | 'Slopes up to 15 deg (reqt)'. NASA's operations page adds that it can tackle 25 or 30 degrees when necessary. |
| viper | otherSlope | 30 | degrees | NASA, VIPER lunar operations page https://science.nasa.gov/mission/viper/lunar-operations/ | B |  |
| viper | speed (derived) | 720 | m per hour | NASA 2025, VIPER updated technical briefing https://assets.science.nasa.gov/content/dam/science/psd/lunar-science/documents/2025-02-13_VIPER_Updated_Technical_Briefing_Presentation-Shared.pdf | A | Derived: 'Top Speed: 20cm/s' x 3600 / 100. |
| viper | otherSpeed (derived) | 360 | m per hour | NASA 2025, VIPER updated technical briefing https://assets.science.nasa.gov/content/dam/science/psd/lunar-science/documents/2025-02-13_VIPER_Updated_Technical_Briefing_Presentation-Shared.pdf | B | Derived: 10 cm/s x 3600 / 100. |
| lrv | slopeLimit | 25 | degrees | Costes, Farmer and George 1972, Mobility Performance of the Lunar Roving Vehicle, NASA TR R-401 (NTRS 19730008090) https://ntrs.nasa.gov/citations/19730008090 | B | The same report puts the wheel's climbing ability on simulated lunar soil at 18 to 23 degrees; the Apollo 17 crew found slopes of up to 20 degrees easy. |
| lrv | otherSlope | 20 | degrees | Apollo 17 Mission Report, JSC-07904 (NASA NTRS 19730015117) https://ntrs.nasa.gov/citations/19730015117 | B |  |
| lrv | speed | 7600 | m per hour | Apollo Program Summary Report, JSC-09423, 1975, Table 4-IX and section 4.8 (NASA NTRS 19750013242) https://ntrs.nasa.gov/citations/19750013242 | B | Mission averages were 9.2, 7.7 and 7.6 km per hour. |
| lrv | otherSpeed | 9200 | m per hour | Apollo Program Summary Report, JSC-09423, 1975, Table 4-IX and section 4.8 (NASA NTRS 19750013242) https://ntrs.nasa.gov/citations/19750013242 | B |  |
| lrv | energy (derived) | 75.6 | Wh per km | Apollo Program Summary Report, JSC-09423, 1975, Table 4-IX and section 4.8 (NASA NTRS 19750013242) https://ntrs.nasa.gov/citations/19750013242 | B | Derived: 2.1 ampere-hours per km x 36 volts. The three missions used 1.9, 2.1 and 1.64 ampere-hours per km. Measured on the Moon, at one sixth of Earth's gravity, for this vehicle with two astronauts. It is a mission average, not a function of slope. |

Decisions a human should make:

1. Which limit is 'the' limit. The file uses the operating rule where one is published (Perseverance and
   Curiosity 30 degrees, the Mars Exploration Rovers 25) and the design requirement otherwise (VIPER 15, the
   Apollo rover 25). The other published figures are kept beside it.
2. The Apollo rover's energy rate (75.6 Wh per km) is 2.1 ampere-hours per km times 36 volts: the multiplication
   is ours. It is used only for a lunar route and never adjusted for slope.
3. Not found in a primary source and left out: Zhurong, Yutu, Lunokhod, the Artemis terrain vehicle, and any
   energy figure for a Mars rover.

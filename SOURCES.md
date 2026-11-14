# Data sources

Add a row BEFORE a feature that uses the dataset is marked done.

| Dataset | Provider | URL | Accessed | Licence / terms | Used for | Badge |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |
| POWER climatology 2001-2020 (MERRA-2 based), v10.0.0: T2M, T2M_RANGE, PRECTOTCORR | NASA Langley Research Center, POWER Project | https://power.larc.nasa.gov (read from the public archive https://nasa-power.s3.amazonaws.com/merra2/temporal/power_merra2_climatology_temporal_utc.zarr) | 2026-11-14 | Open, free of charge under NASA's open data policy; acknowledge the NASA POWER Project | `tempMean`, `tempRange`, `precip` in `data/earth.json`. Regridded from 0.5 x 0.625 degrees to the 0.5 degree grid by area-weighted mean | Measured |
| Natural Earth 1:10m physical vectors, Land (v5.1.1) | Natural Earth | https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/ | 2026-11-14 | Public domain | Land mask: which 0.5 degree cells are in `data/earth.json` (at least 5% land), and which pixels count as land in the NDVI and terrain averages | Measured |
| MODIS/Terra Vegetation Indices Monthly L3 Global 0.05 Deg CMG (MOD13C2) v061, 12 monthly files for 2025 | NASA LP DAAC (Didan, K., 2021) | https://doi.org/10.5067/MODIS/MOD13C2.061 | 2026-11-14 | Open, no restrictions on reuse (NASA EOSDIS data policy); cite the DOI | `ndvi` in `data/earth.json`: mean of monthly cell means over land pixels with pixel reliability 0, 1 or 2. The product has no data over Antarctica, so those cells are `null` | Measured |
| Global Lithological Map Database GLiM v1.0, gridded to 0.5 degrees | Hartmann, J. and Moosdorf, N. (2012), published on PANGAEA | https://doi.org/10.1594/PANGAEA.788537 (paper: https://doi.org/10.1029/2012GC004370) | 2026-11-14 | CC BY 3.0 | `lithology` in `data/earth.json`: the class of the authors' 0.5 degree grid, taken as published. Water bodies and no-data cells are `null` | Measured |
| Copernicus DEM GLO-90 (COP-DEM_GLO-90-DGED, 2021 release): elevation and Water Body Mask tiles | European Space Agency (ESA) / Copernicus, produced by Airbus; read from the AWS Open Data registry | https://doi.org/10.5270/ESA-c5d3d65 (files: https://registry.opendata.aws/copernicus-dem/) | 2026-11-14 | Free of charge for any use under the Copernicus DEM licence; required notice: "produced using Copernicus WorldDEM-90 (c) DLR e.V. 2010-2014 and (c) Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved" | `slope` and `roughness` in `data/earth.json`. Elevation block-averaged to 463 m posts (15 arc-seconds, the MOLA spacing), water pixels left out. Window: one 0.5 degree cell (55.6 km x 55.6 km x cos latitude). `slope` = mean Horn 3x3 slope in degrees, `roughness` = standard deviation of elevation in m | Measured |
| Natural Earth 1:110m physical vectors, Land, as packaged in the `world-atlas` npm package v2.0.2 (`land-110m.json`) | Natural Earth, packaged by Mike Bostock | https://github.com/topojson/world-atlas | 2026-11-14 | Public domain (data), ISC (package) | Coastline drawing on the ORBIT globe only. Not used in any score | Measured |

## Software and libraries

| Library | Licence | Used for |
| --- | --- | --- |
|  |  |  |
| React 19, React DOM | MIT | App UI |
| Vite 8, @vitejs/plugin-react | MIT | Build and dev server |
| TypeScript | Apache-2.0 | Type checking |
| Tailwind CSS 4 | MIT | Styling with the DESIGN.md tokens |
| globe.gl, three.js | MIT | ORBIT 3D globe |
| topojson-client | ISC | Decoding the coastline file |
| d3-geo | ISC | Land test when generating UI fixtures (dev only) |
| lucide-react | ISC | Icons |
| Inter (via @fontsource/inter) | SIL Open Font License 1.1 | Sentence text |
| IBM Plex Mono (via @fontsource/ibm-plex-mono) | SIL Open Font License 1.1 | Numbers, labels and codes |

## Methods borrowed

| Method | Where it comes from | Used for |
| --- | --- | --- |
| Weighted geometric mean (non-compensatory) scoring | Standard multi-criteria method, also used by other 2026 Space Apps teams | Overall match score |

## Site and target references (Session C)

Papers, agency pages and reference pages behind `data/targets.json`, `data/analogs.json` and
`data/lithology_similarity.json`. How each was checked is in `data/REVIEW_ME.md`.

| Reference | URL or DOI | Accessed | Used for | Badge |
| --- | --- | --- | --- | --- |
| Navarro-Gonzalez et al. 2003, Science 302:1018 | https://doi.org/10.1126/science.1089143 | 2026-11-14 | analogs.json: Atacama (Yungay) as a Mars analog | Literature |
| Glass et al. 2023, Astrobiology (PMC10750311) | https://pmc.ncbi.nlm.nih.gov/articles/PMC10750311/ | 2026-11-14 | analogs.json: approximate coordinates of the Atacama hyperarid core | Literature |
| Lee and Osinski 2005, Meteoritics and Planetary Science 40:1755 | https://doi.org/10.1111/j.1945-5100.2005.tb00144.x | 2026-11-14 | analogs.json: Haughton impact structure as a Mars analog | Literature |
| Heldmann et al. 2013, Planetary and Space Science 85:53 | https://doi.org/10.1016/j.pss.2013.05.019 | 2026-11-14 | analogs.json: Beacon Valley / McMurdo Dry Valleys (title checked only) | Literature |
| Dickson et al. 2013, Scientific Reports 3:1166 | https://doi.org/10.1038/srep01166 | 2026-11-14 | analogs.json: Don Juan Pond | Literature |
| ten Kate et al. 2013, Journal of Aerospace Engineering 26(1):183 | https://doi.org/10.1061/(ASCE)AS.1943-5525.0000200 | 2026-11-14 | analogs.json: Mauna Kea lunar field tests | Literature |
| Hughes et al. 2019, Astrobiology 19(3):260 | https://doi.org/10.1089/ast.2018.1847 | 2026-11-14 | analogs.json: Kilauea and Craters of the Moon as basaltic Mars analogs | Literature |
| ESA PANGAEA course, 'What is Pangaea?' | https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/CAVES_and_Pangaea/What_is_Pangaea | 2026-11-14 | analogs.json: Lanzarote and the Noerdlinger Ries | Literature |
| Europlanet TA1 planetary field analogue sites, Iceland | https://www.europlanet.org/?p=8731 | 2026-11-14 | analogs.json: Iceland highlands (Askja, Holuhraun) | Literature |
| Amils et al. 2014, Life 4(3):511 | https://doi.org/10.3390/life4030511 | 2026-11-14 | analogs.json: Rio Tinto | Literature |
| Cavalazzi et al. 2019, Astrobiology 19(4):553 | https://doi.org/10.1089/ast.2018.1926 | 2026-11-14 | analogs.json: Dallol | Literature |
| US National Park Service news release, 24 Feb 2012, 'Mars and the Mojave' | https://www.nps.gov/deva/learn/news/mars-and-mojave.htm | 2026-11-14 | analogs.json: Death Valley | Literature |
| Brown, Walter and Cudahy 2005, Australian Journal of Earth Sciences 52:353 | https://doi.org/10.1080/08120090500134530 | 2026-11-14 | analogs.json: Pilbara North Pole Dome | Literature |
| Thomas et al. 2012, Episodes 35(1):226 | https://doi.org/10.18814/epiiugs/2012/v35i1/022 | 2026-11-14 | analogs.json: Arkaroola | Literature |
| Angles and Li 2017, JGR Planets 122:856 | https://doi.org/10.1002/2017JE005293 | 2026-11-14 | analogs.json: Qaidam Basin | Literature |
| Kumar et al. 2014, JGR Planets 119:2029 | https://doi.org/10.1002/2013JE004543 | 2026-11-14 | analogs.json: Lonar crater | Literature |
| Pandey et al. 2020, International Journal of Astrobiology 19(1):78 | https://doi.org/10.1017/S1473550419000119 | 2026-11-14 | analogs.json: Ladakh (Tso Kar) | Literature |
| Pineau et al. 2024, EPSC2024-991 | https://doi.org/10.5194/epsc2024-991 | 2026-11-14 | analogs.json: Makgadikgadi Pans | Literature |
| Wedler et al. 2021, Philosophical Transactions of the Royal Society A 379:20190574 | https://doi.org/10.1098/rsta.2019.0574 | 2026-11-14 | analogs.json: Mount Etna lunar rover tests | Literature |
| Grau Galofre and Noblet 2024, EPSC2024-1039 | https://doi.org/10.5194/epsc2024-1039 | 2026-11-14 | analogs.json: Kangerlussuaq | Literature |
| Wikipedia articles: Beacon Valley, Askja, Mars Desert Research Station, S P Crater, Meteor Crater, D-MARS, Teide, Sudbury Basin, Mistastin crater | https://en.wikipedia.org/ | 2026-11-14 | analogs.json: coordinates of most sites, and the analog-use statement for the nine sites named here (no paper was opened for them) | Literature |
| Wikipedia articles: Betung Kerihun National Park, Jau National Park, Salonga National Park, Jakarta, Geography of Singapore, Paris | https://en.wikipedia.org/ | 2026-11-14 | analogs.json: coordinates and the reason each negative control is a control | Literature |
| Smithsonian Institution Global Volcanism Program, Volcanoes of the World | https://volcano.si.edu/ | 2026-11-14 | analogs.json: coordinates of Kilauea, Askja, Dallol, Etna, Teide, Ijen, Merapi and Batur | Literature |
| Loehr et al. 2005, Environmental Science and Pollution Research 12(2):89 | https://doi.org/10.1065/espr2004.09.118 | 2026-11-14 | analogs.json: Kawah Ijen crater lake pH below 0.3 | Literature |
| Rodriguez and van Bergen 2016, Netherlands Journal of Geosciences 95(2):153 | https://doi.org/10.1017/njg.2015.12 | 2026-11-14 | analogs.json: hyperacid volcanic lakes, Kawah Ijen among them, as analogues of Martian sulphate-rich terrains | Literature |
| Argadestya et al. 2022, Earth and Space Science 9(11) | https://doi.org/10.1029/2022EA002279 | 2026-11-14 | analogs.json: Merapi volcaniclastic sediments compared with Gale crater rocks | Literature |
| Widagdo and Setijadi 2007, Dinamika Rekayasa 3(2):57-60 | https://doaj.org/ | 2026-11-14 | analogs.json: Gua Lawa (Purbalingga) formed by lava flow | Literature |
| Siswandi et al. 2024, Proceedings ICMA-SURE | https://doi.org/10.20884/2.procicma.2024.3.1.10237 | 2026-11-14 | analogs.json: Gua Lawa lava tube, basalt composition | Literature |
| Al Farishi et al. 2024, JGEET 9(2):188-194 | https://doi.org/10.25299/jgeet.2024.9.2.16848 | 2026-11-14 | analogs.json: Goa Pandan basalt lava cave | Literature |
| Sirait et al. 2023, JGEET 8(2):112-122 | https://doi.org/10.25299/jgeet.2023.8.2.12118 | 2026-11-14 | analogs.json: Goa Pandan basalt lava cave | Literature |
| Agastya et al. 2023, Jurnal Geominerba 8(1):44-61 | https://doi.org/10.58522/ppsdm22.v8i1.134 | 2026-11-14 | analogs.json: Kesaksak lava tube, Batur | Literature |
| UNESCO Global Geoparks, Maros Pangkep | https://www.unesco.org/en/iggp/geoparks/maros-pangkep | 2026-11-14 | analogs.json: Maros-Pangkep karst cave system | Literature |
| Wikidata items Q25153151 (Gua Lawa) and Q14629677 (Giri Mulyo) | https://www.wikidata.org/ | 2026-11-14 | analogs.json: coordinates of Gua Lawa and of the village nearest Goa Pandan | Literature |

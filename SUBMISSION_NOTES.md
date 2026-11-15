# Submission notes: resource lists for the project page

Two lists, ready to paste. Both are condensed from [SOURCES.md](SOURCES.md), which holds the full row for
each entry (exact product name, URL, access date, licence text). If the two ever disagree, SOURCES.md is
right. Compiled 2026-11-15.

Live site: https://orabugit.github.io/sbats/
Repository: https://github.com/OrabuGit/sbats

---

## List 1. NASA data and resources

### Earth data

- **NASA POWER climatology 2001-2020, v10 (MERRA-2 and CERES SYN1deg)**, NASA Langley Research Center.
  https://power.larc.nasa.gov. Used for: temperature, day-night temperature range, precipitation, wind
  speed and aerosol optical depth of every Earth cell; monthly normals and surface solar irradiance at
  the named sites.
- **MODIS/Terra Vegetation Indices Monthly, MOD13C2 v061**, NASA LP DAAC (NASA Earthdata).
  https://doi.org/10.5067/MODIS/MOD13C2.061. Used for: NDVI, the bare-ground factor.
- **MODIS/Terra+Aqua Land Cover Type Yearly, MCD12C1 v061**, NASA LP DAAC (NASA Earthdata).
  https://doi.org/10.5067/MODIS/MCD12C1.061. Used for: snow-and-ice and barren shares of each cell.
- **EMIT L2B Estimated Mineral Identification (EMITL2BMIN v002) and EMIT L2A Masks (EMITL2AMASK v003)**,
  NASA JPL EMIT mission, NASA LP DAAC, found through NASA CMR / Earthdata Search.
  https://lpdaac.usgs.gov/products/emitl2bminv002/. Used for: minerals seen from orbit at the featured
  sites (shown, never scored).
- **Blue Marble: Shaded Relief and Bathymetry, through NASA GIBS (WMS and WMTS)**, NASA Earth Observatory
  / ESDIS. https://gibs.earthdata.nasa.gov. Used for: the Earth globe texture and zoom tiles.
- **NASA Earthdata Login and Earthdata Cloud**, https://urs.earthdata.nasa.gov. Used for: downloading
  the MODIS and EMIT files in the offline pipeline.
- **NASA Earth Observatory, "Measuring Vegetation (NDVI and EVI)"**.
  https://science.nasa.gov/earth/earth-observatory/measuring-vegetation-ndvi-evi. Used for: the NDVI
  value that counts as bare ground and its tolerance.

### Moon data

- **LRO LOLA gridded elevation models (LDEM_64, LDEM_512, LDEM_80S_80M, LDEM_80S_20M)**, NASA PDS
  Geosciences Node, LOLA team (NASA GSFC). https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/.
  Used for: slope and roughness of every Moon cell and of the lunar targets; 3D terrain extracts.
- **LRO LOLA permanently shadowed region maps and average illumination maps (archive extras)**, NASA PDS
  Geosciences Node. Used for: permanent-shadow share of polar cells; lit fraction at the south polar
  targets in the base sandbox.
- **LRO Diviner Global Cumulative Products and Polar Resource Product**, NASA PDS Geosciences Node,
  Diviner team (UCLA). https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/. Used
  for: surface temperature mean and swing of every Moon cell and of the lunar targets.
- **LROC WAC Global Morphology Mosaic 100 m, and the LROC WAC 303 ppd mosaic through NASA Moon Trek**,
  NASA / GSFC / Arizona State University; hosted by USGS Astrogeology and NASA Solar System Treks.
  https://trek.nasa.gov. Used for: the Moon globe texture and image extracts of the lunar targets.
- **LROC data portal, featured images and Lunar Pit Atlas**, NASA / GSFC / Arizona State University.
  https://data.lroc.im-ldi.com. Used for: positions of Artemis III candidate regions and lunar pits;
  the Marius Hills pit.
- **NASA releases 22-089 and 24-136, Artemis III candidate landing regions**.
  https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/. Used
  for: why each Moon site is a target.

### Mars data

- **MGS MOLA MEGDR, 128 pixels per degree (and the USGS 463 m global mosaic of it)**, NASA PDS
  Geosciences Node, MOLA team (NASA GSFC). https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/.
  Used for: slope and roughness of every Mars cell and of the Mars targets, measured the same way as on
  Earth and the Moon.
- **2001 Mars Odyssey GRS element maps (H2O)**, NASA PDS Geosciences Node, GRS team (University of
  Arizona). Used for: water in the top metre of Mars cells.
- **Mars Odyssey THEMIS Daytime Infrared Global Mosaic 100 m v12**, NASA / JPL-Caltech / Arizona State
  University. Used for: image extracts of the Mars targets.
- **Viking MDIM 2.1 Colour Mosaic through NASA Mars Trek**, NASA / JPL / USGS. https://trek.nasa.gov.
  Used for: the Mars globe texture.
- **Curiosity REMS daily weather feed**, NASA/JPL (data by Centro de Astrobiologia, CSIC-INTA).
  https://mars.nasa.gov. Used for: day-night temperature range at Gale crater and a check of the
  climate model there.
- **NASA/JPL rover localisation files (Curiosity, Perseverance), Mars 2020 landing press kit, MSL fact
  sheet, NASA Science "Mars Facts", NASA Mars 2020 rover and mobility pages**. Used for: landing
  coordinates, target summaries, rover slope limits and speeds.
- **NASA Scientific Visualization Studio 30983 and JPL Opportunity status pages**.
  https://svs.gsfc.nasa.gov/30983. Used for: dust storm duration in the base sandbox.

### Reference data, reports and pages

- **NSSDCA planetary fact sheets, Apollo landing site coordinates, Master Catalog**, NASA GSFC.
  https://nssdc.gsfc.nasa.gov/planetary/factsheet/. Used for: gravity, pressure, day length and axial
  tilt under "What Earth cannot copy"; coordinates of landing sites; mission dates on the Learn page.
- **NASA Technical Reports Server (NTRS)**: Life Support Baseline Values and Assumptions Document
  (NASA/TP-2015-218570/REV2); Mars Design Reference Architecture 5.0 (20090040343); Kleinhenz and Paz
  2020 (20205007966); Dalton et al. 2016 (20170004112); Dwyer Cianciolo 2024 (20240009596); Wheeler 2020
  (20205008786); Schunk et al. 2022 (20210026557); Fincannon 2007 (NASA/TM-2007-215025); Gelino et al.
  2022 (20220000334); Glaser et al. 2018 (20170007365); Lemelin et al. 2021 (20210016381); Bluethmann
  2024 (20240013903); George et al. 2026 (20250011660); Costes et al. 1972 (NASA TR R-401); Apollo 17
  Mission Report; Apollo Program Summary Report (JSC-09423). https://ntrs.nasa.gov. Used for: every
  number in the base sandbox (crew needs, module power and mass, ice mining, batteries, landing slope
  limit, dark periods) and rover figures.
- **NASA pages**: ISS roll-out solar arrays (2021); large cargo landers for Artemis (2024); LRO
  lithograph "Temperature Variation on the Moon"; "NASA's LRO Finds Lunar Pits Harbor Comfortable
  Temperatures" (2022); Photojournal PIA13720; Analog Missions, NEEMO and CHAPEA; Artemis, Apollo and
  NASA Science mission pages. Used for: sandbox values, pit temperature, Moon axial tilt, and the
  dates and places on the Learn page.
- **JPL IPN Progress Report 42-176 (Bryant 2009)**. Used for: lit fraction and longest dark period at
  Mons Mouton and Malapert Massif.
- **EMIT L2B Algorithm Theoretical Basis Document (JPL D-104479)**. Used for: what an EMIT mineral
  identification means and its limits.
- **NASA PDS Mars Pathfinder rover description**. Used for: Sojourner figures on the Learn page.

No NASA logo or mission insignia is used anywhere in the project.

---

## List 2. Space agency partner data, other references, libraries, fonts, textures and tools

### Space agency partner datasets and resources

| Resource | Agency / provider | Licence or terms | Used for |
| --- | --- | --- | --- |
| Copernicus DEM GLO-90 and GLO-30 (2021 release) | ESA / Copernicus (produced by Airbus), read from AWS Open Data | Copernicus DEM licence, free for any use; notice: "produced using Copernicus WorldDEM-30 / WorldDEM-90 (c) DLR e.V. 2010-2014 and (c) Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved" | Earth slope and roughness (every cell and every site); 3D terrain extracts |
| Sentinel-2 L2A, 2025 | ESA / Copernicus, read from the Earth Search open archive (Element 84, AWS Open Data) | Copernicus Sentinel data terms, free, full and open; notice: "Contains modified Copernicus Sentinel data 2025" | Site-scale NDVI and bare-ground share; true colour images of featured sites |
| Ground Temperature Map 2000-2016, Northern Hemisphere Permafrost (Obu et al. 2018) | ESA GlobPermafrost, on PANGAEA | CC BY 4.0 | Permafrost share of Earth cells (shown, never scored) |
| Mars MGS MOLA - MEX HRSC Blended DEM Global 200 m v2 | USGS Astrogeology; HRSC by ESA / DLR / FU Berlin; MOLA by NASA GSFC | Public domain with credit to USGS, ESA/DLR/FU Berlin and NASA | Elevation extracts of the Mars targets |
| Mars Climate Database v6.2 | LMD with the Open University, IAA, ESA and CNES | Free for research and education with citation; copyright LMD/OU/IAA/ESA/CNES. Reuse terms to be confirmed by the team before submission | Temperature, wind, dust and sunlight on Mars (a climate model, not a measurement) |
| GSMaP gauge-adjusted precipitation, monthly normals 2012-2021 | JAXA EORC, through the JAXA Earth API | JAXA Earth API terms: free use with credit to JAXA | Cross-check of precipitation at the named sites; replaces no NASA value |
| GCOM-C (Shikisai) SGLI Level-3 NDVI v3, 2025 (G-Portal product) | JAXA, through the JAXA Earth API | JAXA Earth API terms: free use with credit to JAXA | Cross-check of NDVI at the named sites; replaces no NASA value |
| ESA PANGAEA course page; ESA Concordia and Mars500 pages | ESA | Citation only | Lanzarote and the Ries as analog sites; Learn page dates |
| CNSA (Chang'e), ISRO (Chandrayaan-3), JAXA (SLIM) mission pages | CNSA, ISRO, JAXA | Citation only | Landing dates in the Learn page timeline |
| CSA, DLR, ISRO and Europlanet pages on analog sites | CSA, DLR, ISRO, Europlanet | Citation only | What each known analog site is used for (cited per site in `data/analogs.json`) |

### Other datasets

| Resource | Provider | Licence or terms | Used for |
| --- | --- | --- | --- |
| Global Lithological Map GLiM v1.0 (Hartmann and Moosdorf 2012) | PANGAEA | CC BY 3.0 | Rock type of every Earth cell |
| Natural Earth land vectors, 1:10m and 1:110m | Natural Earth | Public domain | Land mask; coastline on the globe |
| Unified Geologic Map of the Moon 1:5M (Fortezzo et al. 2020) | USGS Astrogeology | Public domain | Rock class of Moon cells |
| Geologic Map of Mars, SIM 3292 (Tanaka et al. 2014) | USGS | Public domain | Rock class of Mars cells |
| Gazetteer of Planetary Nomenclature | IAU / USGS Astrogeology | Public domain | Coordinates and sizes of named features |
| Macrostrat geologic map units, with the regional maps it serves | Macrostrat, University of Wisconsin-Madison | CC BY 4.0 | Rock type at five known analog sites |
| Volcanoes of the World v5 | Smithsonian Institution, Global Volcanism Program | Free with citation | Rock type and coordinates of volcano sites |
| OpenStreetMap relation 19753621 | OpenStreetMap contributors | ODbL 1.0, "(c) OpenStreetMap contributors" | Outline of one provisional site footprint; no value taken |
| Wikidata coordinate statements | Wikimedia Foundation | CC0 | Coordinates of a few sites, marked provisional |
| Wikipedia articles (named in SOURCES.md) | Wikimedia Foundation | CC BY-SA 4.0, cited for facts only | Coordinates of several sites and controls |
| USGS "Deserts: Geology and Resources" (Walker 1992) | USGS | Public domain | The dryness tolerance (arid limit) |

### Published references

Cited for single facts; no text or figure is reproduced. Full citations with DOIs are in SOURCES.md,
"Site and target references".

- **Known analog sites (`data/analogs.json`):** Navarro-Gonzalez et al. 2003; Glass et al. 2023; Lee and
  Osinski 2005; Heldmann et al. 2013; Dickson et al. 2013; ten Kate et al. 2013; Hughes et al. 2019;
  Amils et al. 2014; Cavalazzi et al. 2019; Brown, Walter and Cudahy 2005; Thomas et al. 2012; Angles
  and Li 2017; Kumar et al. 2014; Pandey et al. 2020; Pineau et al. 2024; Wedler et al. 2021; Grau
  Galofre and Noblet 2024; GSA abstract 2017 (Lut Desert yardangs); US National Park Service release
  2012 (Death Valley).
- **Indonesian candidate sites:** Loehr et al. 2005; Rodriguez and van Bergen 2016; Argadestya et al.
  2022; Widagdo and Setijadi 2007; Siswandi et al. 2024; Al Farishi et al. 2024; Sirait et al. 2023;
  Agastya et al. 2023; Maulany et al. 2019; UNESCO Global Geoparks (Maros Pangkep); Self et al. 1984.
- **Mars targets:** Rodriguez-Manfredi et al. 2023; Golombek et al. 2021 (LPSC 2420); Golombek et al.
  2020; Bramson et al. 2015; Martinez et al. 2016; Farley et al. 2022; Grotzinger et al. 2014; Vaniman
  et al. 2014; Hassler et al. 2014 (SwRI release); Piqueux et al. 2019; Rampe et al. 2020; Thorpe et al.
  2022; Tutolo et al. 2025; Fraeman et al. 2013; Wiens et al. 2022; Tice et al. 2022; Goudge et al.
  2015; Boynton et al. 2007; Edwards et al. 2011; Fergason, Hare and Laura 2018; Forget et al. 1999;
  Millour et al. 2022; Li et al. 2022 (Zhurong); Grant et al. 2018; Head et al. 2015; Vago et al. 2017;
  McEwen et al. 2015, Rice et al. 2015, Ori and Pondrelli 2015 (Exploration Zone Workshop); LMD Mars
  solar longitude page.
- **Moon targets:** Zhang et al. 2020; Williams et al. 2017; Williams et al. 2019; Paige et al. 2010;
  Mazarico et al. 2011; Sefton-Nash et al. 2013; Haruyama et al. 2009 and 2013; Flahaut et al. 2020;
  Wueller et al. 2025; Tye et al. 2015; Wagner and Robinson 2014; Kaku et al. 2017; Besse et al. 2011;
  Lawrence et al. 2013; Horvath, Hayne and Paige 2022; Leone et al. 2023; Colaprete et al. 2010; Li et
  al. 2018; Zuber et al. 2012; Beyer et al. 2025; Krasilnikov et al. 2023; Smith et al. 2003 and 2010;
  Harris et al. 2024; Blewett et al. 2023; Williams et al. 2026; Keszthelyi et al. 2025; Kokh and Walden
  1994; Metzger and Autry (arXiv:2205.00378).
- **Rovers:** Rankin et al. 2020; Biesiadecki et al. 2007; Leger et al. 2005.
- **Analog stations (Learn page):** The Mars Society (MDRS, FMARS); Mars Institute (Haughton-Mars
  Project); HI-SEAS.
- **Methods:** weighted geometric mean scoring and ROC AUC (standard methods); Hartmann and Moosdorf
  2012 for rock class families; Peters et al. 2018 (Macrostrat); Kubota et al. 2007 (GSMaP); Obu et al.
  2019 (permafrost method); Meigs' aridity classification through Walker 1992.

### Software libraries (web app)

| Library | Version | Licence | Used for |
| --- | --- | --- | --- |
| React, React DOM | 19.3 | MIT | App UI |
| Vite, @vitejs/plugin-react | 8.3, 6.3 | MIT | Build and dev server |
| TypeScript | 7.0 | Apache-2.0 | Type checking |
| Tailwind CSS, @tailwindcss/vite | 4.3 | MIT | Styling |
| three.js | 0.187 | MIT | 3D globe and terrain |
| globe.gl | 2.46 | MIT | Globe |
| three-slippy-map-globe | 1.0 | MIT | Map tiles on the globe |
| topojson-client | 3.1 | ISC | Decoding the coastline file |
| world-atlas (Natural Earth) | 2.0 | ISC (package), public domain (data) | Coastline and country outlines |
| d3-geo | 3.1 | ISC | Which country a point is in |
| lucide-react | 1.73 | ISC | Icons |
| @types/node, @types/react, @types/react-dom, @types/three, @types/d3-geo, @types/topojson-client | | MIT | Type definitions |
| tsx (run with `npx`) | | MIT | Runs unit tests and validation scripts |

### Software libraries (offline data pipeline, Python 3.12)

| Library | Licence | Used for |
| --- | --- | --- |
| NumPy, SciPy | BSD-3-Clause | Array maths, regridding, terrain metrics |
| xarray | Apache-2.0 | Reading the NASA POWER archive |
| zarr | MIT | Reading the NASA POWER archive |
| fsspec | BSD-3-Clause | Remote file access |
| aiohttp, requests | Apache-2.0 | Downloads |
| rasterio (GDAL) | BSD-3-Clause (GDAL: MIT) | Reading elevation and image files |
| h5py, pyhdf | BSD-3-Clause, MIT | Reading MODIS and EMIT files |
| pyshp | MIT | Reading map shapefiles |
| Shapely | BSD-3-Clause | Geometry of land and map units |
| uv | Apache-2.0 or MIT | Python environment and runner |

### Fonts

| Font | Source | Licence | Used for |
| --- | --- | --- | --- |
| Inter | @fontsource/inter | SIL Open Font License 1.1 | Sentence text |
| IBM Plex Mono | @fontsource/ibm-plex-mono | SIL Open Font License 1.1 | Numbers, labels and codes |
| Archivo (variable) | @fontsource-variable/archivo | SIL Open Font License 1.1 | Headings, the wordmark and large numbers |

### Textures and images

| File | Source | Licence / credit |
| --- | --- | --- |
| `app/public/textures/blue-marble-*.jpg` | NASA Blue Marble through NASA GIBS | NASA open data; credit NASA GIBS / ESDIS |
| `app/public/textures/moon-wac-*.jpg` | LROC WAC mosaic through NASA Moon Trek | Public domain; credit NASA/GSFC/Arizona State University |
| `app/public/textures/mars-viking-*.jpg` | Viking MDIM 2.1 through NASA Mars Trek | Public domain; credit NASA/JPL/USGS |
| Image extracts in `data/extracts/` | LROC WAC, THEMIS, Sentinel-2 (see above) | As listed for each dataset |
| Logo, favicon, icons and line drawings | Drawn in code for this project, with AI assistance | Apache-2.0 (this project); marked "AI-generated drawings" in the app |

No photograph, video or audio of any person is used. No AI-generated photograph, image or video is used.

### Tools and services

| Tool | Used for |
| --- | --- |
| Claude Code (Anthropic), model Claude Fable 5.2 | AI assistance for code, data compilation and text, directed and reviewed by the team. Every use is logged in [AI_USE.md](AI_USE.md) |
| GitHub, GitHub Actions, GitHub Pages | Source hosting, build and the live site |
| Node.js and npm | Building and running the app |
| AWS Open Data registry, Earth Search (Element 84) | Open archives the Copernicus and NASA POWER files were read from |
| Crossref, NASA CMR, Overpass API, Macrostrat API, JAXA Earth API | Finding and reading the records listed above |

### Licence of this project

Apache License 2.0, see [LICENSE](LICENSE).

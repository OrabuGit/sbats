# Data sources

Add a row BEFORE a feature that uses the dataset is marked done.

| Dataset | Provider | URL | Accessed | Licence / terms | Used for | Badge |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |
| POWER climatology 2001-2020 (MERRA-2 based), v10.0.0: T2M, T2M_RANGE, PRECTOTCORR | NASA Langley Research Center, POWER Project | https://power.larc.nasa.gov (read from the public archive https://nasa-power.s3.amazonaws.com/merra2/temporal/power_merra2_climatology_temporal_utc.zarr) | 2026-11-14 | Open, free of charge under NASA's open data policy; acknowledge the NASA POWER Project | `tempMean`, `tempRange`, `precip` in `data/earth.json`. Regridded from 0.5 x 0.625 degrees to the 0.5 degree grid by area-weighted mean | Measured |
| Natural Earth 1:10m physical vectors, Land (v5.1.1) | Natural Earth | https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/ | 2026-11-14 | Public domain | Land mask: which 0.5 degree cells are in `data/earth.json` (at least 5% land), and which pixels count as land in the NDVI and terrain averages | Measured |
| MODIS/Terra Vegetation Indices Monthly L3 Global 0.05 Deg CMG (MOD13C2) v061, 12 monthly files for 2025 | NASA LP DAAC (Didan, K., 2021) | https://doi.org/10.5067/MODIS/MOD13C2.061 | 2026-11-14 | Open, no restrictions on reuse (NASA EOSDIS data policy); cite the DOI | `ndvi` in `data/earth.json`: mean of monthly cell means over land pixels with pixel reliability 0, 1 or 2. The product has no data over Antarctica, so those cells are `null` | Measured |
| Global Lithological Map Database GLiM v1.0, gridded to 0.5 degrees | Hartmann, J. and Moosdorf, N. (2012), published on PANGAEA | https://doi.org/10.1594/PANGAEA.788537 (paper: https://doi.org/10.1029/2012GC004370) | 2026-11-14 | CC BY 3.0 | `lithology` in `data/earth.json`: the class of the authors' 0.5 degree grid, taken as published. Water bodies and no-data cells are `null` | Measured |
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

# Data sources

Add a row BEFORE a feature that uses the dataset is marked done.

| Dataset | Provider | URL | Accessed | Licence / terms | Used for | Badge |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |
| POWER climatology 2001-2020 (MERRA-2 based), v10.0.0: T2M, T2M_RANGE, PRECTOTCORR | NASA Langley Research Center, POWER Project | https://power.larc.nasa.gov (read from the public archive https://nasa-power.s3.amazonaws.com/merra2/temporal/power_merra2_climatology_temporal_utc.zarr) | 2026-11-14 | Open, free of charge under NASA's open data policy; acknowledge the NASA POWER Project | `tempMean`, `tempRange`, `precip` in `data/earth.json`. Regridded from 0.5 x 0.625 degrees to the 0.5 degree grid by area-weighted mean | Measured |
| Natural Earth 1:10m physical vectors, Land (v5.1.1) | Natural Earth | https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/ | 2026-11-14 | Public domain | Land mask: which 0.5 degree cells are in `data/earth.json` (at least 5% land), and which pixels count as land in the NDVI and terrain averages | Measured |
| MODIS/Terra Vegetation Indices Monthly L3 Global 0.05 Deg CMG (MOD13C2) v061, 12 monthly files for 2025 | NASA LP DAAC (Didan, K., 2021) | https://doi.org/10.5067/MODIS/MOD13C2.061 | 2026-11-14 | Open, no restrictions on reuse (NASA EOSDIS data policy); cite the DOI | `ndvi` in `data/earth.json`: mean of monthly cell means over land pixels with pixel reliability 0, 1 or 2. The product has no data over Antarctica, so those cells are `null` | Measured |

## Software and libraries

| Library | Licence | Used for |
| --- | --- | --- |
|  |  |  |

## Methods borrowed

| Method | Where it comes from | Used for |
| --- | --- | --- |
| Weighted geometric mean (non-compensatory) scoring | Standard multi-criteria method, also used by other 2026 Space Apps teams | Overall match score |

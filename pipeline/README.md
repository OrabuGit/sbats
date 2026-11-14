# SBATS data pipeline

Builds `data/earth.json`: seven factors for every land cell of a global 0.5 degree grid,
in the shape fixed by `data/SCHEMA.md`. Every value is computed from a dataset that the
pipeline downloads. Nothing is typed in, and gaps are never filled: a value that the
source does not have is `null`.

This code was written with AI assistance (Claude Code), directed and reviewed by the team.
See `AI_USE.md`.

## Rebuild everything

From the repository root:

```bash
uv run --project pipeline pipeline/build.py
```

Needs [uv](https://docs.astral.sh/uv/) (it installs Python 3.12 and the locked packages on
first run) and a NASA Earthdata token in `.env` at the repository root:

```
EARTHDATA_TOKEN=...
```

The token is only used for the MODIS NDVI files. It is never printed or written anywhere.

A first full run takes about 1.5 hours, almost all of it the terrain download.
Everything downloaded or computed is cached in `pipeline/cache/` (gitignored), so a rerun
takes seconds. Delete `pipeline/cache/` to rebuild from the sources.

Other ways to run it:

```bash
uv run --project pipeline pipeline/build.py --only climate ndvi   # run some stages
uv run --project pipeline pipeline/build.py --assemble            # rewrite earth.json from the cache
```

A stage that has not been run leaves its factors `null`. If terrain tiles fail to download,
the stage stops with an error; run it again and it fetches only the missing tiles.

## What each stage does

| Stage | File | Factors | Dataset | How the cell value is made |
| --- | --- | --- | --- | --- |
| Grid | `landmask.py` | which cells exist | Natural Earth 1:10m land minus lakes | Rasterised at 0.05 degrees. A cell is kept when at least 5% of it is land |
| Climate | `climate.py` | `tempMean`, `tempRange`, `precip` | NASA POWER climatology 2001-2020 (MERRA-2): `T2M`, `T2M_RANGE`, `PRECTOTCORR` | Annual value, regridded from 0.5 x 0.625 degrees by area-weighted mean. Precipitation is mm/day x 365.25 |
| Vegetation | `ndvi.py` | `ndvi` | MODIS/Terra MOD13C2 v061, 12 months of 2025 | Mean of monthly cell means over land pixels with reliability 0, 1 or 2 |
| Terrain | `terrain.py`, `terrain_metrics.py` | `slope`, `roughness` | Copernicus DEM GLO-90 and its water body mask | Elevation block-averaged to 463 m posts, water left out. Mean Horn slope (degrees) and elevation standard deviation (m) over the cell |
| Rock type | `lithology.py` | `lithology` | GLiM v1.0, 0.5 degree grid | Class code as published. Water bodies and no data become `null` |

`build.py` runs the stages, writes `data/earth.json` in one atomic step, and prints the
sanity check: count, nulls, min, max and mean per factor, and the values at known places
(Sahara, Amazon, Antarctica, Atacama, Java volcanoes and others).

Sources, access dates and licences are in `SOURCES.md` at the repository root.

## Terrain method (same on Earth, Moon and Mars)

`terrain_metrics.py` holds the one function that turns an elevation grid into `slope` and
`roughness`. Use it for the Moon and Mars targets too, so the numbers are comparable:

1. Resample the elevation model to about 463 m between posts in both directions, by block
   averaging. 463 m is the spacing of the coarsest of the three models (MGS MOLA MEGDR at
   128 pixels per degree). On Earth this is 15 arc-seconds of latitude.
2. Window: one 0.5 degree cell on Earth, which is 55.6 km north-south by
   55.6 km x cos(latitude) east-west. On the Moon and Mars, take the same ground area
   centred on the target.
3. `slope` is the mean of the Horn (1981) 3 x 3 slope in degrees. `roughness` is the
   standard deviation of the resampled elevations in metres.

A slope measured at 463 m posts is much lower than a slope measured at 30 m. Compare these
values only with values made the same way.

## Limits to state on the Method page

- Temperature is air temperature at 2 m from a reanalysis, not ground temperature.
  `tempRange` is the mean daily maximum minus minimum.
- NDVI is for one year, 2025. The climate is a 2001-2020 mean.
- MOD13C2 has no data over Antarctica, so every cell south of 60 S has `ndvi: null`.
  Under the scoring rule those cells get no score, including the McMurdo Dry Valleys.
- North of about 60 N the winter months have no NDVI (polar night). The annual mean there
  covers the sunlit months only.
- `roughness` over a 55 km window is closer to local relief than to surface texture.
  Nothing at the scale of a rover or a habitat is resolved.
- `lithology` is one class per cell. A volcano inside a cell of mostly sediment reads as
  sediment. The Kawah Ijen cell is "Unconsolidated sediments".
- Coastal cells with 5% land or more are kept. Their climate value is for the whole cell,
  sea included. NDVI and terrain use the land pixels only.
- Lithology is `null` for cells that the GLiM grid marks as sea, water or no data. This is
  mostly coast and small islands.
- The two rows of cells nearest the South Pole (south of 89 S) are under 1 km wide, too narrow for a
  3 x 3 slope window at 463 m posts, so their `slope` is `null`.

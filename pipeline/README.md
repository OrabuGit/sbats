# SBATS data pipeline

Builds `data/earth.json`: seven factors and two land cover shares for every land cell of a global 0.5 degree grid,
in the shape fixed by `data/SCHEMA.md`. Every value is computed from a dataset that the
pipeline downloads. Nothing is typed in, and gaps are never filled: a value that the
source does not have is `null`.

This code was written with AI assistance (Claude Code), directed and reviewed by the team.
See `AI_USE.md`.

## Rebuild everything

From the repository root, one command rebuilds every file the pipeline owns under `/data`:

```bash
uv run --project pipeline pipeline/all.py
```

It runs the steps below in order and stops at the first failure. The Earth grid alone is:

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

## Other outputs

`build.py` also writes `data/earth.bin`, a compact binary copy of `earth.json` for the browser
(2.5 MB against 20 MB). The JSON is the source of truth: the build decodes the binary again and
fails if any value differs. Layout in `compact.py`, browser decoder in `earth_bin_decoder.ts`.

Three more scripts build the site-level files. They read `data/analogs.json` and
`data/targets.json`, so run them after those exist. Each caches its downloads.

```bash
uv run --project pipeline pipeline/site_climate.py   # data/site_climate.json, under a minute
uv run --project pipeline pipeline/sites.py          # data/sites.json, about 40 minutes cold
uv run --project pipeline pipeline/extracts.py       # data/extracts/, about 25 minutes cold
```

| Script | Output | What it holds |
| --- | --- | --- |
| `site_climate.py` | `data/site_climate.json` | 12 monthly normals (NASA POWER, 2001-2020) of temperature, day-night range, precipitation and surface solar irradiance for every site in `analogs.json` and the extra comparison sites defined in `sites.py`. Grid-cell values, not site measurements |
| `sites.py` | `data/sites.json` | Fine-scale values in a 2 to 7.4 km footprint for the candidate sites (now with the Tambora caldera and the Batur lava fields) and thirteen known analogs: terrain from Copernicus DEM GLO-30, NDVI and bare-ground share from Sentinel-2 at 10 m, rock type from regional geologic maps (Macrostrat), the Smithsonian volcano list or a cited paper, and mineral matches from NASA EMIT (`emit_minerals.py`, needs `EARTHDATA_TOKEN`). Climate is copied from the grid and labelled so. Footprints proposed by a team member are marked `provisional` |
| `extracts.py` | `data/extracts/` | 20 km elevation and image extracts, all at one ground scale, for every candidate site, the four story comparison sites (Dallol, Dasht-e Lut, Salar de Uyuni, Tunupa) and every target (`extracts.py <id> ...` builds just those ids and keeps the rest of the index): Copernicus DEM 30 m and Sentinel-2 for Earth, LOLA (20 m at the south pole) and LROC WAC for the Moon, the HRSC-MOLA 200 m model and a THEMIS infrared image for Mars. `meta.pairs` lists the pairs the team asked for (Tambora with Shackleton, Batur lava with Marius Hills) |

Limits of the site files:

- Site footprints are centred on the coordinates in `analogs.json`. Where those are not the feature
  itself (Goa Pandan, Kesaksak, Yungay), the footprint note in the file says so.
- `slope` and `roughness` on 463 m posts use only 16 to 121 pixels in a footprint this small.
  `slopeFine` and `roughnessFine` (31 m posts) describe the feature better but cannot be compared
  with the targets.
- Site NDVI is one year (2025). In cloudy months few or no pixels are clear; the months and scenes
  used are listed per site.
- Sentinel-2's own classification labels dark lava as water, so open water comes from the Copernicus
  DEM water mask instead.
- Rock type is `null` where no regional map, volcano record or retrievable paper states it
  (Maros-Pangkep). The Macrostrat world map is not used: it was wrong at two Indonesian sites.
- The Mars extracts are 43 x 43 pixels (463 m). The Shackleton image is almost all permanent shadow.
- The lunar and Mars extracts use the same LOLA and MOLA products as the target terrain values in
  `/validation`.

## Moon and Mars grids, and checks

```bash
uv run --project pipeline pipeline/planets.py        # data/moon.json, data/mars.json and the .bin copies
uv run --project pipeline pipeline/jaxa_check.py     # data/jaxa_check.json
```

| Script | Output | What it is |
| --- | --- | --- |
| `planets.py` | `data/moon.json`, `data/mars.json`, `.bin` copies | Global grids (Moon 2 degrees, Mars 1 degree) so any point can be a target. It calls the five stage files below and caches each result in `cache/planet/` |
| `planet_terrain.py` | slope, roughness | LOLA (Moon) and MOLA (Mars) through the shared `terrain_metrics()`, 55.6 km window per cell |
| `moon_temperature.py` | Moon tempMean, tempRange | LRO Diviner surface temperature by local time |
| `mars_climate.py` | Mars tempMean, tempRange, surfTempMean, windSpeed, dustOpticalDepth | Mars Climate Database maps (a model), 56 requests, one at a time |
| `planet_geology.py` | lithology | USGS global geologic maps and an explicit unit-to-class table |
| `moon_shadow.py` | Moon psrFrac | LOLA permanently shadowed regions |
| `jaxa_check.py` | `data/jaxa_check.json` | JAXA GSMaP precipitation and GCOM-C SGLI NDVI against our NASA values at the named sites |
| `logistics.py` | `data/logistics.json` | Field logistics for every Earth cell and site: country (Natural Earth), nearest airport with scheduled service (OurAirports), nearest populated place (Natural Earth), nearest volcano erupted since 1900 (Smithsonian), mean land elevation (ETOPO 2022), driest three months and warmest, coldest and sunniest month (NASA POWER). Straight-line distances |
| `site_stories.py` | `data/site_stories.json` | The team's five site stories with corrections, our computed values and checks beside them, and her logistics labelled as a team estimate. No story carries a score |

A cold run downloads about 6.5 GB (LOLA 0.5 GB, MOLA 2.1 GB, Diviner 2.8 GB, the two geologic map packages
1 GB) and takes about an hour, most of it download. Everything downloads itself and is cached.

## What each stage does

| Stage | File | Factors | Dataset | How the cell value is made |
| --- | --- | --- | --- | --- |
| Grid | `landmask.py` | which cells exist | Natural Earth 1:10m land minus lakes | Rasterised at 0.05 degrees. A cell is kept when at least 5% of it is land |
| Climate | `climate.py` | `tempMean`, `tempRange`, `precip` | NASA POWER climatology 2001-2020 (MERRA-2): `T2M`, `T2M_RANGE`, `PRECTOTCORR` | Annual value, regridded from 0.5 x 0.625 degrees by area-weighted mean. Precipitation is mm/day x 365.25 |
| Vegetation | `ndvi.py` | `ndvi` | MODIS/Terra MOD13C2 v061, 12 months of 2025 | Mean of monthly cell means over land pixels with reliability 0, 1 or 2 |
| Terrain | `terrain.py`, `terrain_metrics.py` | `slope`, `roughness` | Copernicus DEM GLO-90 and its water body mask | Elevation block-averaged to 463 m posts, water left out. Mean Horn slope (degrees) and elevation standard deviation (m) over the cell |
| Land cover | `landcover.py` | `snowIceFrac`, `barrenFrac` (extra keys, not factors) | MODIS MCD12C1 v061, 2025 | Share of the cell's land in IGBP class 15 (snow and ice) and 16 (barren) |
| Atmosphere | `atmosphere.py` | `windSpeed`, `aod` (extra keys) | NASA POWER climatology 2001-2020: WS10M (MERRA-2), AOD_55 (CERES SYN1deg) | Annual mean wind speed at 10 m and aerosol optical depth at 550 nm, regridded like the climate factors |
| Permafrost | `permafrost.py` | `permafrostFrac` (extra key) | Obu et al. 2018 permafrost probability, 1 km, Northern Hemisphere (PANGAEA) | Mean permafrost probability over the cell; null south of 25 N |
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
  `ndvi` is not filled. Those cells are scored from `barrenFrac` instead, and permanent ice lowers
  Bare ground in every cell (rule in `data/SCHEMA.md`, "Bare ground and permanent ice").
  At 0.5 degrees the McMurdo Dry Valleys cells are 85% ice or more, so they score low.
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
- Moon and Mars rock classes are a reading of geologic map units, not rock measurements: lunar highland
  units are classed as basic plutonic and Martian volcanic units as basic volcanic by the project's choice.
  About a third of lunar cells and two thirds of Mars cells have no class.
- Mars temperature, wind and dust are from a climate model (Mars Climate Database) on a grid of about 4 by
  6 degrees. Mars `tempRange` is a lower bound (3-hour steps, 4 seasons).
- Lunar `psrFrac` is permanent shadow, not ice. Mars `waterH2O` is a 5 degree gamma-ray map, not the SWIM
  ice maps, which could not be downloaded.
- `permafrostFrac` is modelled and covers land north of 25 N only. `aod` is all aerosol, not dust alone.
- Site footprints marked `provisional` in `sites.json` were set by the pipeline from a traced rim
  (Tambora), a mapped polygon (Batur lava) or a single published point (Dallol, Dasht-e Lut, Salar de
  Uyuni, Tunupa). A team member should check them.
- The Salar de Uyuni footprint is 96% "water" in the Copernicus DEM mask and its salt reads as snow
  in Sentinel-2, so its site values rest on a few pixels (see the site's `caveat`).
- EMIT mineral matches are the best spectral-library match per 60 m pixel on one date. They say what a
  pixel most resembles, not how much of a mineral is there, and they are weak under vegetation.
- The two rows of cells nearest the South Pole (south of 89 S) are under 1 km wide, too narrow for a
  3 x 3 slope window at 463 m posts, so their `slope` is `null`.

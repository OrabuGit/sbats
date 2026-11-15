# SBATS data contract

Shared contract for the files in `/data`. Three parallel sessions build against this document.
If the code and this file disagree, this file wins until it is changed (see "Changing the contract").

Read with DESIGN.md (sections 6, 7, 9, 11) and JUDGING.md (acceptance rules for DATA and LOGIC).

## Conventions (all files)

- JSON, UTF-8, English. Keys are camelCase exactly as written here.
- Coordinates: WGS84 decimal degrees. `lat` from -90 to 90, north positive. `lon` from -180 to 180, east positive.
  For Moon and Mars targets, `lat`/`lon` are planetocentric, east positive, in the same ranges.
- Unknown values are `null`. Never `0`, `-9999`, `NaN`, an empty string or a guessed number.
  The UI shows `null` as "no data".
- `badge` is exactly one of `"Measured"`, `"Mission"`, `"Literature"`:
  - Measured: computed from a dataset.
  - Mission: measured by a spacecraft or rover.
  - Literature: taken from a paper, labelled as an estimate.
- `source` is a short human-readable citation that matches a row in `SOURCES.md`
  (dataset name and provider, or author/year plus URL or DOI for a paper).
- `id` values are lowercase kebab-case, unique within their file, and never change once committed
  (share links and validation results depend on them).

## Factor keys

One set of seven keys is used in all three files. A target value and an Earth cell value with the same key
are always in the same unit and computed the same way.

| Key | Meaning | Unit | Notes |
| --- | --- | --- | --- |
| `tempMean` | Annual mean surface or near-surface temperature | °C | |
| `tempRange` | Mean day-night temperature swing | °C | |
| `precip` | Annual precipitation | mm/year | Moon and Mars targets use 0 |
| `ndvi` | Annual mean NDVI | unitless, -1 to 1 | Moon and Mars targets are bare ground |
| `slope` | Mean slope within the cell | degrees | Same window and formula on Earth, Moon and Mars |
| `roughness` | Standard deviation of elevation within the cell | m | Same window and formula on Earth, Moon and Mars |
| `lithology` | Dominant rock class | integer class code | Categorical. See "Lithology" below |

The unit in `earth.json` `meta.factors[].unit` is authoritative. Session C writes target values in that unit.

These seven keys are data fields, not the six scoring factors of DESIGN.md section 6. The mapping is owned by
`/app/src/lib/scoring`:

| Scoring factor (DESIGN.md) | Data keys |
| --- | --- |
| Terrain | `slope`, `roughness` |
| Bare ground | `ndvi` |
| Dryness | `precip` |
| Temperature | `tempMean`, `tempRange` |
| Rock type | `lithology` |
| Sunlight | none: computed in the browser from `lat` and season |

### Lithology

- Stored as an integer class code so that every factor field is numeric.
- The code legend lives in the `lithology` entry of `meta.factors` as
  `classes: [{ code, label }]`. Session B defines it from the source lithology dataset. Do not invent classes.
- Published legend (Session B, 2026-11-14). Source: GLiM v1.0 global lithological map, 0.5 degree grid
  (Hartmann & Moosdorf 2012, doi:10.1594/PANGAEA.788537, CC BY 3.0). Codes are the raster values of the
  published grid. Labels are the first-level GLiM classes. `abbr` is the GLiM abbreviation, also written
  to each `classes` entry as an extra key.

  | code | abbr | label |
  | --- | --- | --- |
  | 1 | su | Unconsolidated sediments |
  | 2 | vb | Basic volcanic rocks |
  | 3 | ss | Siliciclastic sedimentary rocks |
  | 4 | pb | Basic plutonic rocks |
  | 5 | sm | Mixed sedimentary rocks |
  | 6 | sc | Carbonate sedimentary rocks |
  | 7 | va | Acid volcanic rocks |
  | 8 | mt | Metamorphics |
  | 9 | pa | Acid plutonic rocks |
  | 10 | vi | Intermediate volcanic rocks |
  | 12 | py | Pyroclastics |
  | 13 | pi | Intermediate plutonic rocks |
  | 14 | ev | Evaporites |
  | 16 | ig | Ice and glaciers |

  Codes 11 (water bodies) and 15 (no data) exist in GLiM but are not rock classes: cells with those values
  have `lithology: null`, and the codes never appear in `earth.json`. That leaves 14 classes and 91 pairs
  for `lithology_similarity.json`. Each cell holds the single class of the authors' 0.5 degree grid, so a
  small volcanic edifice inside a cell of mostly sediment reads as sediment (the Kawah Ijen cell is 1,
  the Merapi cell is 10).
- Targets use the same codes in `values.lithology.value`.
- Codes are labels, not quantities: the distance between two codes means nothing.
  Lithology is therefore the one factor that does not use the Gaussian rule. Its similarity is looked up in
  `data/lithology_similarity.json` (approved by the team on 2026-11-14):
  - same class as the target: 1.0
  - related class (for example basalt and andesite, both volcanic): 0.6
  - unrelated class: 0.15. Not zero, so rock type alone never vetoes a site.
  - `null` lithology in the cell: the Rock type factor is left out under the general rule in
    "Missing values and confidence" below.

## data/earth.json

Owner: Session B. Built by `/pipeline`, never edited by hand.

```
{
  "meta": {
    "resolutionDeg": number,
    "factors": [
      { "key": string, "label": string, "unit": string, "source": string, "badge": string }
    ],
    "generatedAt": string
  },
  "cells": [
    { "lat": number, "lon": number, "<factor key>": number | null, ... }
  ]
}
```

`meta`
- `resolutionDeg`: cell size in degrees. `0.5` for the global scan.
- `factors`: one entry per factor key, all seven present, in the order of the table above.
  - `key`: one of the seven factor keys.
  - `label`: short display name, for example `"Mean temperature"`.
  - `unit`: display unit, for example `"°C"`. Empty string for unitless.
  - `source`: dataset the factor was computed from.
  - `badge`: `"Measured"` for everything computed by the pipeline.
  - `classes`: only on `lithology`. `[{ "code": integer, "label": string }]`.
- `generatedAt`: ISO 8601 UTC timestamp of the build, for example `"2026-11-14T12:00:00Z"`.

`cells`
- One object per land cell. Ocean cells are omitted.
- `lat`, `lon`: the cell centre. On the 0.5 degree grid these end in .25 or .75
  (for example `-7.75`, `110.25`).
- Every cell has all seven factor keys. A factor that is not built yet, or has no data in that cell, is `null`.
  A key is never left out.
- Each (lat, lon) pair appears once. Order is not guaranteed: consumers must not depend on it.
- Round to the precision the source supports (2 decimals is enough for every factor) to keep the file small.

Example (illustrative numbers, not real data):

```json
{
  "meta": {
    "resolutionDeg": 0.5,
    "factors": [
      { "key": "tempMean", "label": "Mean temperature", "unit": "°C", "source": "NASA POWER climatology", "badge": "Measured" }
    ],
    "generatedAt": "2026-11-14T12:00:00Z"
  },
  "cells": [
    { "lat": -7.75, "lon": 110.25, "tempMean": 0.0, "tempRange": 0.0, "precip": 0.0, "ndvi": 0.0, "slope": null, "roughness": null, "lithology": null }
  ]
}
```

### Land cover keys (added 2026-11-14, requested by the team)

Every cell also carries two measured land cover shares. They are not factor keys and have no entry in
`meta.factors`; they are described in `meta.landCover` (`source`, `keys`, `method`).

| Key | Meaning | Unit |
| --- | --- | --- |
| `snowIceFrac` | Share of the cell's land classed as permanent snow and ice (IGBP class 15) | fraction, 0 to 1 |
| `barrenFrac` | Share of the cell's land classed as barren or sparsely vegetated (IGBP class 16) | fraction, 0 to 1 |

- Source: MODIS MCD12C1 v061 yearly land cover, 0.05 degree, 2025 (NASA LP DAAC). Badge: Measured.
- Value: mean of the class percent over the cell's land pixels, divided by 100. `null` if the product has
  no data for the cell (no such cell in the current build).
- Why they exist: permanent ice lowers the Bare ground similarity in every cell, and the NDVI product
  (MOD13C2) has no retrievals over Antarctica, so `ndvi` is `null` there (25,225 cells in all). `ndvi` is never filled with a stand-in number.
  The scoring rule below uses these shares instead. See "Bare ground and permanent ice".
- The example cell above predates these keys. A real cell looks like
  `{ "lat": -77.75, "lon": 161.75, ..., "ndvi": null, ..., "snowIceFrac": 0.847, "barrenFrac": 0.148 }`.

Additive rule: Session B may add other keys to `meta` (for example data date ranges for the Method page).
Consumers ignore keys they do not know. A finer Indonesia grid, if built, is a separate file with this same
shape and its own `resolutionDeg`; add it to this document before another session reads it.

### Atmosphere and permafrost keys (added 2026-11-15, requested by the team)

Three more keys on every cell of `earth.json`, described in `meta.extraKeys`
(`[ { "key", "label", "unit", "badge", "source", "note"? } ]`). They are not scoring factors until
Session C adds them to a preset.

| Key | Meaning | Unit | Badge | Null when |
| --- | --- | --- | --- | --- |
| `windSpeed` | Annual mean wind speed 10 m above the surface (NASA POWER, MERRA-2, `WS10M`, 2001-2020) | m/s | Measured | never |
| `aod` | Annual mean aerosol optical depth at 550 nm (NASA POWER, CERES SYN1deg, `AOD_55`, 2001-2020). All airborne particles, not dust alone | none | Measured | never |
| `permafrostFrac` | Share of the cell's land underlain by permafrost: mean permafrost probability of Obu et al. 2018 (ESA GlobPermafrost, 1 km) | fraction, 0 to 1 | Literature (modelled) | the cell is south of 25 N: the map covers Northern Hemisphere land only. Null there means "not mapped", not "no permafrost". Antarctica is null |

`sites.json` carries the same three keys in each site's `values`, with `scale: "grid"`.

Every file built by the pipeline carries `meta.aiUse`, one sentence acknowledging that the pipeline code
was written with AI assistance (added 2026-11-15, a submission rule). Readers can ignore it.

## data/earth.bin

Owner: Session B. Written by the same build step as `earth.json`, never edited by hand.

A compact copy of `earth.json` for the browser (about 1.9 MB, 0.85 MB gzipped, against 15.6 MB).
`earth.json` is the source of truth. The build decodes `earth.bin` again and fails if any cell value or
any part of `meta` differs from `earth.json`, so the two files always hold the same data.

Layout, little-endian:

- bytes 0 to 3: ASCII `SBE1`
- bytes 4 to 7: uint32, length of the header in bytes
- from byte 8: header, UTF-8 JSON, space-padded
- then one array per column, each `cellCount` values long, starting at its `byteOffset` from the start of
  the file

Header: `{ "format": "SBE1", "cellCount", "resolutionDeg", "meta", "columns": [ { "key", "dtype", "scale",
"nullValue", "byteOffset" } ] }`. `meta` is the `meta` object of `earth.json`, unchanged.

- Columns `row` and `col` (uint16): `lat = 90 - resolutionDeg * (row + 0.5)`,
  `lon = -180 + resolutionDeg * (col + 0.5)`.
- Every other column is a cell key of `earth.json`: `value = stored / scale`, or `null` when
  `stored == nullValue`. `dtype` is `uint8`, `uint16` or `int16`.
- Decode with the reference function in `pipeline/earth_bin_decoder.ts` (copy it into `/app`). It returns
  the same `{ meta, cells }` object as parsing `earth.json`.

## data/moon.json and data/mars.json

Owner: Session B. Built by `pipeline/planets.py`. Added 2026-11-15. Compact copies `data/moon.bin` and
`data/mars.bin` are in the `SBE1` format of `earth.bin` and decode with the same decoder.

Global grids so that any point on the Moon or Mars can be a target. Same shape as `earth.json`:

```
{
  "meta": { "body": "moon" | "mars", "resolutionDeg": 2 | 1, "cellKmAtEquator": number, "generatedAt",
            "cellCount", "grid": { ... },
            "factors": [ { "key", "label", "unit", "source", "badge", "note", "unitTable"? } ],
            "notInFile": { "<key>": "why this key is not in the file" } },
  "cells": [ { "lat", "lon", "<key>": number | null, ... } ]
}
```

- Every cell of the body is listed (no mask), north to south then west to east. `lat`, `lon` are cell
  centres; `lon` runs -180 to 180 east. Moon cells are 2 degrees (60.6 km), Mars cells 1 degree (59.3 km):
  about the ground size of an Earth 0.5 degree cell.
- A value that the source does not have is `null`. Every key has a row in `meta.factors` with its source
  and badge. Keys:

  | Key | Moon | Mars | Unit |
  | --- | --- | --- | --- |
  | `slope`, `roughness` | LOLA, 474 m posts | MOLA, 463 m posts | degrees, m |
  | `tempMean` | Diviner, mean surface temperature over a lunar day | Mars Climate Database, air temperature at 2 m (a model) | °C |
  | `tempRange` | Diviner, highest minus lowest over a lunar day | Mars Climate Database, day-night range of air temperature at 2 m (a lower bound) | °C |
  | `surfTempMean` | not present | Mars Climate Database, ground surface | °C |
  | `lithology` | USGS Unified Geologic Map of the Moon | USGS Geologic Map of Mars (SIM 3292) | GLiM class code |
  | `psrFrac` | share of the cell in permanent shadow (LOLA); `null` for cells that reach below 65 degrees latitude | not present | fraction, 0 to 1 |
  | `waterH2O` | not present | water in the top metre, Mars Odyssey GRS, 5 degree bins; `null` poleward of the map | weight percent |
  | `windSpeed` | not present: no atmosphere, the value is 0 by fact (`meta.notInFile`) | Mars Climate Database, 10 m above the surface | m/s |
  | `dustOpticalDepth` | not present: no atmosphere, 0 by fact | Mars Climate Database, dust column optical depth in visible light | none |

- Terrain is the target method: a 55.6 km square window centred on the cell centre, the shared
  `terrain_metrics()` function. A cell value and the value of a target at the same place agree to a few
  percent (the grid uses a coarser lunar elevation model than the targets).
- `lithology` comes from the map unit through the explicit table in the factor's `unitTable`
  (`[ { "unit", "description", "class": code | null } ]`). A unit has a class only where its type states the
  material; a cell has a class only if classed units cover at least half of it. Lunar highland units are
  class 4 (basic plutonic) and Martian volcanic units class 2 (basic volcanic) by the project's reading:
  say so wherever the class is shown.
- Mars temperature, wind and dust come from a climate model on a grid of about 3.8 by 5.6 degrees; each
  1 degree cell takes the nearest node, so neighbouring cells often share a value. Badge "Literature".
- The lunar polar targets in `targets.json` carry a different temperature statistic (a modelled annual mean
  at 2 cm depth), so they differ from their grid cells. Marius Hills uses the same statistic as the grid.
- `precip` and `ndvi` are not in these files (`meta.notInFile` says why).
- The SWIM subsurface ice maps for Mars could not be downloaded (the site returned HTTP 523 on 2026-11-15);
  `waterH2O` is a different, coarser measurement and is labelled as such.

## data/logistics.json

Owner: Session B. Built by `pipeline/logistics.py`. Added 2026-11-15.

Computed field logistics for every Earth grid cell and every site in `sites.json`. No value is typed in.
Distances are great-circle ("as the crow flies"), not travel distance or time.

```
{
  "meta": { "aiUse", "generatedAt", "description", "sources": { country, airport, populatedPlace, volcano, elevation, climate },
            "activeSince": 1900, "cellCount", "climateWindowRule", "badge", "notes" },
  "tables": { "countries": [ name ], "airports": [ { name, iata, icao, country, municipality, lat, lon } ],
              "places": [ { name, country, population, lat, lon } ],
              "volcanoes": [ { number, name, lat, lon, lastEruptionYear, type } ] },
  "sites": [ { id, name, lat, lon, country, airport: { name, iata, country, km }, populatedPlace: { name, population, km },
               volcano: { name, number, lastEruptionYear, km }, elevationFootprintM: { min, max, source }, elevationCellMeanM,
               climateWindows: { driestThreeMonths: [m, m, m], driestThreeMonthsPrecipMm, warmestMonth, coldestMonth, sunniestMonth, wettestMonth } } ],
  "cells": { "country": [i], "airport": [i], "airportKm": [km], "place": [i], "placeKm": [km], "volcano": [i], "volcanoKm": [km],
             "elevationM": [m], "driestThreeMonthsStart": [month], "warmestMonth": [m], "coldestMonth": [m], "sunniestMonth": [m] }
}
```

- `cells` are columns in the order of `earth.json` cells: entry `k` of every array belongs to cell `k`. `country`,
  `airport`, `place` and `volcano` are indices into the matching table; `airportKm`, `placeKm` and `volcanoKm`
  are whole kilometres. A `null` means no value.
- Airport: the nearest in OurAirports with scheduled passenger service and type large, medium or small. It may not
  be the most practical one. Populated place: the nearest in Natural Earth (important places only). Volcano:
  the nearest Smithsonian Holocene volcano with an eruption recorded in or after `meta.activeSince`.
- `elevationM` (cells) is the mean of the land pixels of ETOPO 2022 in the cell; sites also carry the Copernicus
  DEM range inside their footprint. A cell mean is not the height at a place.
- `climateWindows`: `driestThreeMonths` is the three consecutive months (calendar-circular) with the least total
  NASA POWER precipitation, as month numbers 1 to 12; the other entries are single months. They are grid-scale
  and are not a score. The app's "best month" keeps its own rule for a chosen target.
- Badge "Measured" for climate and elevation; airports, places, countries and volcano records are reference data.

## data/site_stories.json

Owner: Session B. Built by `pipeline/site_stories.py`. Added 2026-11-15.

Five Earth-to-target stories written by the team, beside values computed from our data. The prose is the team's;
every number comes from `sites.json`, `logistics.json` or `targets.json`. **No story carries a score or a similarity
percentage**: scores are only what the app computes.

```
{ "meta": { "aiUse", "generatedAt", "description", "credit", "rules": [ ... ] },
  "stories": [ {
      "id", "title", "trek": "Mars Trek" | "Moon Trek", "earthSiteIds": [ site id ],
      "earth": { "name", "teamLocation": { lat, lon } },
      "target": { "name", "teamLocation": { lat, lon }, "targetId": id in targets.json | null, "note", "inTool": { id, name, lat, lon } | null },
      "whyItStandsOut", "siteDescription", "testingTags": [ string ], "missionUse": string,
      "limitation": [ string ], "workaround": [ string ],
      "dominantRock": { "earth", "target", "status" } | null,
      "ourData": [ { "siteId", "name", "lat", "lon", "footprintKm", "footprintStatus", "elevationFootprintM": [min, max],
                     "values": { "<key>": { value, unit, scale, source, badge } }, "caveat" } ],
      "dataChecks": [ { "claim", "data", "source", "agrees": boolean } ],
      "logistics": { "computed": [ <the site entry of logistics.json> ], "teamEstimate": { accessDifficulty, nearestSupportHub, costEfficiency }, "note" },
      "corrections": [ { field, was, now, basis } ], "verification": [ { claim, status, evidence } ],
      "needsTeamReview": [ string ]?, "teamSource": { title, url }, "sources": [ ... ], "credit" } ] }
```

- Show `credit` with every story. Show `logistics.teamEstimate` only under the label "team estimate", next to
  `logistics.computed`, never mixed into it.
- `targetId` is `null` for Columbia Hills and Holden Crater: the tool has no target and no score for them.
  `teamLocation` of a target can differ from the tool's point (`target.inTool`): say which is which.
- `dataChecks` are statements in the team text that the data can speak to; `agrees: false` means the data disagrees
  and the team should look (Tambora's "barren ash fields" against 28% bare ground).
- `corrections` and `verification` record what was changed from the team's first draft and why. They may be shown
  on request; they are the audit trail.

## data/site_climate.json

Owner: Session B. Built by `pipeline/site_climate.py`.

Monthly climate normals (2001-2020, NASA POWER) for every site in `analogs.json`, for "best month to test"
and for sunlight in the sandbox.

```
{
  "meta": { "generatedAt", "description", "period", "powerVersion",
            "fields": [ { "key", "label", "unit", "badge", "scale", "source", "note"? } ] },
  "sites": [
    { "id", "name", "kind", "lat", "lon",
      "cells": { "merra2": { "lat", "lon" }, "syn1deg": { "lat", "lon" } },
      "months": [ { "month": 1..12, "tempMean", "tempRange", "precip", "solar" } ]
    }
  ]
}
```

- `id` matches `analogs.json`. `months` always has 12 entries, January first.
- `tempMean` and `tempRange` in °C, `precip` in mm per month, `solar` in W/m2 (all-sky shortwave on a
  horizontal surface, 24 hour mean). Units are authoritative in `meta.fields`.
- Every value is that of the source grid cell containing the site (`cells` gives the cell centres):
  0.5 x 0.625 degrees for temperature and precipitation, 1 x 1 degree for solar. It is not a measurement
  at the site. A summit and the plain below it share one number. Label it as grid scale in the UI.
- Unknown values are `null`.

## data/jaxa_check.json

Owner: Session B. Built by `pipeline/jaxa_check.py`. Added 2026-11-15.

Cross-check of our NASA values against JAXA data (partner agency) for every site in
`site_climate.json`. It is a check: no JAXA value replaces a NASA value anywhere.

```
{
  "meta": { "generatedAt", "description", "sources": { "jaxaPrecip", "jaxaNdvi", "nasaPrecip", "nasaNdvi", "attribution" },
            "method": { "precip", "ndvi" },
            "agreement": { "precipMmPerYear": S, "ndvi": S }, "badge" },
  "sites": [
    { "id", "name", "lat", "lon",
      "precip": { "nasaPowerMmPerMonth": [12], "jaxaGsmapMmPerMonth": [12], "nasaPowerMmPerYear", "jaxaGsmapMmPerYear", "note" },
      "ndvi": { "cell": { "lat", "lon" }, "nasaModis", "jaxaSgli", "jaxaSgliMonthly": [12], "jaxaMonthsWithData" } }
  ]
}
```

- `S` is `{ "n", "pearsonR", "spearmanR", "meanDifferenceJaxaMinusNasa", "meanAbsoluteDifference" }` over the
  sites where both values exist.
- JAXA precipitation is GSMaP (2012-2021 normals, 0.1 degree, 60 S to 60 N; `null` outside). NASA
  precipitation is POWER (2001-2020, about 0.5 degree). Different years and grid size: expect the same
  pattern, not the same millimetres.
- JAXA NDVI is GCOM-C SGLI, 2025, averaged over the site's 0.5 degree cell, against the MODIS cell value.
- Show `meta.sources.attribution` wherever these numbers are shown.

## data/sites.json

Owner: Session B. Built by `pipeline/sites.py`.

Fine-scale values for the `candidate` sites of `analogs.json` and nine well-known analogs (Mauna Kea,
Kilauea, Atacama Yungay, Haughton, Lanzarote, Dallol, Dasht-e Lut, Salar de Uyuni, Tunupa), measured
inside a small square footprint centred on the site's coordinates instead of over the 0.5 degree cell.
`kind: "known"` means an already-known analog shown for comparison, never a new finding.

```
{
  "meta": { "generatedAt", "description", "year", "bareNdviThreshold", "methods": { ... } },
  "sites": [
    { "id", "name", "lat", "lon", "kind",
      "footprintKm": number, "footprintNote": string,
      "footprintStatus": "set" | "provisional", "footprintBasis": string | null,
      "inAnalogsJson": boolean, "coordinateSource": string | null, "analogSource": string | null,
      "proposedBy": string | null, "caveat": string | null,
      "values": { "<key>": { "value", "unit", "scale", "source", "badge", ...extra } },
      "gridCell": { "lat", "lon", "ndvi", "slope", "roughness", "lithology", "snowIceFrac", "barrenFrac" } | null,
      "detail": { ... },
      "mineralogy": { "value": { "group1": G, "group2": G } | null, "scale", "source", "badge", "date",
                      "validShare", "pixels", "emitCovers", "granulesAvailable", "granulesTried", "note" }
    }
  ]
}
```

- `id`, `name`, `lat`, `lon`, `kind` are copied from `analogs.json`. Sites with `inAnalogsJson: false`
  (added 2026-11-15: Dasht-e Lut, Salar de Uyuni, Tunupa) are defined in `pipeline/sites.py` only, so the
  global score and the app's site list do not know them.
- `footprintStatus: "provisional"` (added 2026-11-15) marks a footprint the pipeline set for a site a
  team member proposed; `footprintBasis` says how. Show the word "provisional" next to such a site.
  `caveat`, when not null, is a known problem with the site's values and must be shown with them.
- `mineralogy` (added 2026-11-15): NASA EMIT mineral matches inside the footprint on one date. `G` is
  `{ "identifiedShare": number, "top": [ { "libraryName", "libraryTitle", "shareOfValidPixels", "meanBandDepth" } ] }`,
  at most five entries, most frequent first. Shares are fractions of the footprint pixels left after the
  cloud, cirrus and water mask (`validShare` of the footprint). They count how often a match occurs, not
  how much of the mineral is present, and are weak under vegetation. `value` is `null` when no granule
  qualified; `note` then gives the reason and `emitCovers` says whether EMIT has any granule there.
  Not used by any score.
- `footprintKm` is the side of the square in km (2 to 7.4). `footprintNote` says what it covers and what it
  misses. Show both next to the values.
- Every entry in `values` has `value` (number, string or `null`), `unit`, `scale`, `source` and `badge`.
  `scale` says what the value describes:
  - `"site"`: measured inside the footprint.
  - `"volcano"`: a property of the whole volcano (rock type from the Smithsonian volcano database).
  - `"grid"`: the 0.5 degree cell value from `earth.json`. Climate is always `"grid"`.
  When `value` is `null`, `source` and `badge` are `null` too.
- Keys in `values`:

  | Key | Meaning | Unit |
  | --- | --- | --- |
  | `slope`, `roughness` | Same method and 463 m posts as `earth.json` and the targets, over the footprint. Comparable with them, but only a few dozen pixels (`pixels`, `windowKm`) | degrees, m |
  | `slopeFine`, `roughnessFine` | Same function on about 31 m posts (Copernicus DEM GLO-30). Not comparable with 463 m values | degrees, m |
  | `ndvi` | Footprint mean of annual NDVI from Sentinel-2 at 10 m, snow and water left out | unitless |
  | `bareFrac` | Share of non-water pixels with annual NDVI below `meta.bareNdviThreshold` | fraction, 0 to 1 |
  | `waterFrac` | Share of the footprint that is open water | fraction, 0 to 1 |
  | `snowObsShare` | Share of clear observations classed as snow | fraction, 0 to 1 |
  | `rockType` | Rock type as named by the source (text) | none |
  | `lithology` | GLiM class code for `rockType` when the name maps exactly, otherwise `null` | class code |
  | `rockTypeVolcano` | Only when both a map unit and a volcano record exist: the volcano's major rock type | none |
  | `tempMean`, `tempRange`, `precip` | Copied from the grid cell, `scale: "grid"` | as `earth.json` |

- `gridCell` holds the 0.5 degree cell's own values so the UI can show site against cell.
- `detail` lists the DEM tile, the Sentinel-2 scenes used with their dates, other map units, and any errors.
- These values are not used by the global score. They describe the featured sites.

## data/extracts/

Owner: Session B. Built by `pipeline/extracts.py`.

Same-scale elevation and imagery for the split view and the 3D terrain view: every candidate site of
`analogs.json` and every target of `targets.json`. `data/extracts/index.json`:

```
{
  "meta": { "generatedAt", "windowKm", "projection", "description", "imageNote" },
  "items": [
    { "id", "name", "body": "earth" | "moon" | "mars", "lat", "lon", "matchedTargets"?: [ string ],
      "pairedWith"?: string | [ string ] | null,
      "elevation": { "file", "format", "unit", "size", "pixelM", "min", "max", "noDataShare",
                     "product", "nativePixelM", "attribution", "badge", "note" } | null,
      "image": { "file", "size", "pixelM", "bands", "product", "attribution", "badge", ... } | null
    }
  ]
}
```

- `id` is the site id from `analogs.json` or the target id from `targets.json`.
- Every item covers the same square of ground, `meta.windowKm` on a side, centred on the item, north up,
  in a local orthographic projection. One kilometre is the same length in every extract.
- `file` is relative to `/data`. `elevation` files are raw little-endian float32, `size` x `size` values,
  row-major, north row first, in metres; NaN is no data. `image` files are JPEG, `size` x `size` pixels.
- `meta.pairs` (added 2026-11-15) lists `{ "earth", "other" }` pairs the team asked to show side by
  side (Tambora caldera with Shackleton, Batur lava fields with Marius Hills). `pairedWith` on an item
  repeats it. A pair is a display choice, not an analog score.
- `pixelM` differs per dataset. Elevation: 30 m Earth (Copernicus DEM), 20 m Moon at the south pole (LOLA),
  60 m Moon elsewhere (LOLA), 200 m Mars (HRSC and MOLA blend; only MOLA detail where HRSC has no stereo).
  Images: 10 m Earth (Sentinel-2 true colour), 100 m Moon (LROC WAC), 100 m Mars (THEMIS daytime
  infrared, grey-scale: not visible light, label it so). Nothing is upsampled: scale each
  layer by `pixelM` when drawing. The Mars elevation is 100 x 100 pixels and looks coarser than Earth and Moon; say so.
- Elevation datums differ per body (see each `note`). Compare relief, not absolute height.
- `attribution` must be shown wherever the image or terrain is displayed.
- `image` is `null` where there is nothing to show: a lunar image that is almost entirely permanent shadow
  (Haworth), or a Mars window where the infrared mosaic has no data.

## data/targets.json

Owner: Session C. Hand-curated from cited sources.

```
[
  {
    "id": string,
    "name": string,
    "body": "moon" | "mars",
    "lat": number,
    "lon": number,
    "summary": string,
    "values": {
      "<factor key>": { "value": number | null, "sigma": number | null, "source": string | null, "badge": string | null }
    },
    "cannotCopy": [ string ]
  }
]
```

- `id`: for example `"moon-shackleton-rim"`, `"mars-jezero"`.
- `name`: display name, for example `"Shackleton rim"`.
- `summary`: one or two plain sentences on why this is a candidate base or landing site.
- `values`: all seven factor keys present.
  - `value`: the real target value in the unit from `earth.json` `meta.factors`. Store it unclamped.
    Clamping to Earth's observed range happens in the scoring library at run time, so the true gap can be
    shown under "what Earth cannot copy".
  - `sigma`: the tolerance in the Gaussian similarity, same unit as `value`, greater than 0.
    `null` for `lithology`, which uses the similarity table instead.
  - `source`, `badge`: where `value` comes from. `"Mission"` or `"Literature"` for almost every target value.
  - If the value is unknown, set `value`, `sigma`, `source` and `badge` to `null`. The scoring library must
    handle a `null` target value without crashing.
- `cannotCopy`: plain-language sentences, one per condition Earth cannot reproduce at this target.
  Always covers gravity, vacuum or thin atmosphere, and radiation. These never enter the score.
  Any number quoted inside a sentence must name its source in the same sentence.

## data/analogs.json

Owner: Session C. The validation set and the headline candidates.

```
[
  {
    "id": string,
    "name": string,
    "lat": number,
    "lon": number,
    "kind": "known" | "negative" | "candidate",
    "analogFor": [ string ],
    "source": string
  }
]
```

- `kind`:
  - `"known"`: established analog site from the literature. Positive validation set.
  - `"negative"`: negative control (rainforest, city). Must rank low.
  - `"candidate"`: new SBATS candidate, for example the Indonesia deep-dive sites. The headline, not validation.
- `analogFor`: target `id`s from `targets.json`. Empty array for `"negative"`. Every id must exist in `targets.json`.
- `source`: citation for the site's analog status (`"known"`), for why it is a control (`"negative"`),
  or for the evidence behind the candidate (`"candidate"`).
- `lat`, `lon`: the site itself. Consumers snap to the nearest `earth.json` cell.

## data/lithology_similarity.json

Owner: Session C. Hand-curated. It can only be written once Session B has published the lithology
`classes` legend in `earth.json`, because it is keyed by those codes.

```
{
  "levels": { "same": 1.0, "related": 0.6, "unrelated": 0.15 },
  "pairs": [
    { "a": integer, "b": integer, "relation": "related" | "unrelated", "justification": string, "source": string | null }
  ]
}
```

- `levels`: the three similarity values. The scoring library reads them from here and does not hard-code them.
- `pairs`: one entry for every unordered pair of two different class codes from the legend, with `a` < `b`.
  The table is symmetric: (a, b) and (b, a) are the same pairing.
  - `relation`: which level applies. The similarity is `levels[relation]`. There are no per-pair numbers.
  - `justification`: one short sentence on why the two classes are related or unrelated
    (shared origin, composition or process).
  - `source`: citation if the grouping comes from a reference, otherwise `null`.
- Same class (a equals b) is always `levels.same` and is not listed.
- Every pair must be listed. A missing pair is an error caught by a unit test, not a silent default.
- Session A renders the whole table, with justifications, on the Method page.

## Files added by Session C on 2026-11-14 and 2026-11-15

Owner of all of them: Session C. None is read by the all-round score. Longer descriptions and the
functions that read them: `app/src/lib/sim/README.md`, `app/src/lib/targets/README.md`,
`app/src/lib/match/README.md`, `app/src/lib/route/README.md`.

### data/modules.json

Numbers for the base simulation. Built by `validation/build/make_modules.py`.

```
{ "meta": { ... },
  "crew":      { "<key>": Sourced },
  "constants": { "<key>": Sourced },
  "modules":   { "<habitat|solar|battery|greenhouse|iceMiner|landingPad>": { "label", "description", "params": { "<key>": Sourced } } },
  "events":    { "<lunarNight|marsDustStorm>": { "label", "description", "body", "params": { "<key>": Sourced } } },
  "sites":     { "<target id>": { "irradianceWm2", "litFraction", "longestDarkHours", "iceAvailability", "dustStormSolarFactor"?: Sourced } } }
Sourced = { "value": number | null, "unit", "source": string | null, "badge": string | null, "note"?, "derived"?: true }
```

- `value: null` means no source was found: `source` and `badge` are then `null` too, and the UI shows "no data".
- `derived: true` marks one multiplication or division of published numbers; the note shows the arithmetic.
- `sites` has one entry for every target of `targets.json`.

### data/known_sites.json

Real places on the Moon and Mars a user can pick. Built by `validation/build/make_known_sites.py`.

```
{ "meta": { "generatedAt", "note", "coordinateConvention", "counts" },
  "sites": [ { "id", "name", "body": "moon" | "mars", "lat", "lon",
               "kind": "landing-site" | "candidate-region", "mission", "agency", "date", "status",
               "source", "url", "access": "primary" | "secondary", "quote", "note",
               "targetId": string | null, "targetDistanceKm": number | null } ] }
```

- `lon` is east-positive, -180 to 180. The source's own longitude is quoted in `note`.
- `targetId` is the curated target of `targets.json` within 27.8 km, if any. Use
  `targetFromKnownSite(site, ...)` (app/src/lib/targets) to turn a place into a target.
- A candidate region's point is a published centre or site point, not a boundary.

### data/target_windows.json

Slope and roughness of every target in site-sized windows, for like-for-like site comparison.
Built by `validation/build/make_target_windows.py` from `validation/target_terrain.py --posts`.

```
{ "meta": { "generatedAt", "note", "postM": 463, "terrainFraction", "slopeSigmaFloor", "roughnessSigmaFloor", "source": { "moon", "mars" }, "badge" },
  "windows": { "<posts per side>": { "<target id>": { "slope": number | null, "roughness": number | null } } } }
```

- A window of N posts is N x 463 m on a side, centred on the target's coordinates. Sizes follow the
  footprints of `sites.json`. Window 48 holds Shackleton only (rim to rim).
- Never replaces the values of `targets.json`. Read with `targetAtSiteWindow` (app/src/lib/match).

### data/target_minerals.json

Minerals reported at the targets, and the families used to compare them with EMIT minerals in
`sites.json`. Built by `validation/build/make_target_minerals.py`. Site-level only.

```
{ "meta": { "generatedAt", "note", "emitMinimumShare", "emitSource", "access" },
  "families": [ { "id", "label", "emitPatterns": [ string ], "note": string | null } ],
  "targets": { "<target id>": { "minerals": [ { "family", "name", "method": "in-place" | "orbital", "instrument",
                                                "abundance": string | null, "source", "url", "badge", "access" } ],
                                "note": string | null } } }
```

- `emitPatterns` are fragments of EMIT spectral-library names. A family with none cannot be identified
  by EMIT and is "not comparable".
- Every target of `targets.json` has an entry; one with no published minerals has an empty list and a note.

### data/target_environment.json

The target side of the dimensions added after the freeze: wind, dust and ground ice.
Built by `validation/build/make_target_environment.py`. Never part of the all-round score.

```
{ "meta": { "generatedAt", "note", "definitions": { "wind", "dust", "ice" } },
  "targets": { "<target id>": { "wind": Value, "dust": Value, "ice": Value } } }
Value = { "value": number | null, "unit", "source": string | null, "badge": string | null, "note"? }
```

- `wind`: mean wind speed 10 m above the surface, m/s. `dust`: mean optical depth of the air column in
  visible light. `ice`: share of the ground where water ice is stable at or near the surface, 0 to 1.
- The Earth side is `windSpeed`, `aod` and `permafrostFrac` of `earth.json` cells and `sites.json` values
  (Session B). `aod` counts all airborne particles, not dust alone, and is labelled so. `permafrostFrac` is
  null south of 25 N: "not mapped", shown as "no data".
- Read with `targetEnvironment(file, targetId)` (app/src/lib/match).

### data/rovers.json

Published slope limits and speeds for the route calculation. Built by `validation/build/make_rovers.py`.

```
{ "meta": { "generatedAt", "note", "energyNote", "notFound" },
  "rovers": [ { "id", "name", "body": "moon" | "mars", "crewed": boolean,
                "slopeLimit": Figure | null, "otherSlopeFigures": [ Figure ],
                "speed": Figure | null, "otherSpeeds": [ Figure ], "energy": Figure | null } ] }
Figure = { "value": number, "unit", "kind", "source", "url", "badge", "derived"?: true, "note"? }
```

- `slopeLimit.unit` is degrees; `speed.unit` is m per hour; `energy.unit` is Wh per km.
- `energy` exists for the Apollo rover only and applies to a lunar route only.

### data/benchmarks.json

Established analogs and candidate sites scored the same way, for the Featured page.
Built by `validation/benchmarks.ts` with `app/src/lib/match`.

```
{ "meta": { "generatedAt", "frozenAt", "note", "caveats": [ string ], "mineralsIncluded", "dimensions", "purposes", "targets" },
  "groups": { "candidates", "known", "dimensionMean": { "<dimension>": { "candidates", "known" } },
              "purposeMedian": { "<purpose>": { "candidates", "known" } }, "purposeBest": { ... } },
  "sites": [ { "id", "name", "kind": "candidate" | "known", "lat", "lon", "footprintKm", "provisional", "rockName",
               "bareShare", "caveat", "mineralsIdentified": [ string ] | null,
               "results": [ { "target",
                              "site": { "score", "scorePercentile", "dimensions": { "<id>": { "similarity", "verdict" } },
                                        "purposes": { "<id>": number | null }, "terrainLikeForLike",
                                        "environment": { "<wind|dust|ice>": { "similarity", "verdict", "earth", "target", "reason" } },
                                        "extendedPurposes": { "<id>": number | null },
                                        "minerals": { "similarity", "verdict", "shared", "targetOnly", "reason" } | null },
                              "cell": { "score", "scorePercentile", "dimensions", "purposes", "environment", "extendedPurposes" } } ],
               "summary": { "<purpose>": { "best", "bestTarget", "median" } },
               "dimensionMean": { "<dimension>": number | null },
               "process": { "text", "source", "links": [ { "target", "text", "source" } ], "differs" } | null,
               "couldTest": [ { "text", "basis" } ], "cannotTest": [ { "text", "basis" } ] } ] }
```

- `site` is the site scale (footprint terrain, vegetation and rock; the cell's climate; target terrain in a
  window of the site's size). `cell` is the site's 0.5 degree cell, as the global ranking sees it.
- `summary.best` is the best of all targets and flatters; `median` is the typical target. Show both.
- Show `meta.caveats` with the table.
- `environment` holds wind, dust (aerosol) and ice, added after the freeze: cell-scale values on both `site` and
  `cell`. `extendedPurposes` blends them, and minerals, into a purpose score by the rule in app/src/lib/match;
  show it beside `purposes`, never instead. `groups.environmentMean` compares the two groups.
- `process` (candidates only) is the cited process the site stands for, copied from `analogs.json`, with the
  target process it links to and where the analogy breaks. `couldTest` and `cannotTest` are sentences built by
  fixed rules from measured values; `basis` names the files and keys behind each.

### data/discoveries.json

What the frozen all-round score puts at the top for each target. Built by `validation/discoveries.ts`.

```
{ "meta": { "generatedAt", "frozenAt", "note", "rules": { "preset", "confidence", "minSeparationKm", "newDistanceKm", "top", "indonesiaBox" }, "caveats": [ string ] },
  "targets": [ { "target", "name", "body", "scoredCells", "newInTop",
                 "top": [ Pick ], "indonesia": [ Pick ] } ] }
Pick = { "lat", "lon", "score", "rank", "percentile", "confidence", "isNew",
         "nearestKnown": { "id", "name", "km" },
         "dimensions": { "<id>": { "similarity", "verdict" } }, "limitingFactor", "reason",
         "values": { "<factor key>": number | null },
         "stability": { "rankP05", "rankP95", "shareInTop10" } | null }
```

- Same rules as the app's candidate list: Base weights, high and medium confidence, picks 250 km apart,
  `isNew` when more than 500 km from every known analog. `indonesia` holds the best cells inside
  `rules.indonesiaBox`, which also covers parts of neighbouring countries.
- Coordinates are cell centres. No place name is stored.

### data/place_matches.json

For every named place of `known_sites.json`: the target profile a user gets and its best-ranked Earth cells.
Built by `validation/grid_check.ts` from `moon.json`, `mars.json` and `targets.json`.

```
{ "meta": { "generatedAt", "frozenAt", "note", "grids": { "moon": { "resolutionDeg", "generatedAt" } | null, "mars": ... } },
  "places": [ { "id", "name", "body", "kind",
                "origin": "curated" | "grid" | "none", "confidence", "missing": [ string ],
                "scoresComparable": boolean, "environment": { "wind", "dust", "ice" },
                "targetId", "cell": { "lat", "lon", "distanceKm" } | null,
                "values": { "slope", "roughness", "tempMean", "tempRange", "lithology" },
                "best": [ { "lat", "lon", "score", "confidence" } ] | null, "scorable": boolean } ] }
```

- `best` holds up to three Earth cells by the frozen all-round score (Base weights, high and medium confidence,
  250 km apart). Coordinates are cell centres; no place name is stored.
- `scoresComparable: false` marks a place whose grid cell has no temperature. Its scores leave temperature out
  and run far higher than those of other places: show them with that warning, or not at all.
- `origin: "none"` means the body's grid is not loaded or has no cell there: the place cannot be matched yet.

## Missing values and confidence

Approved by the team on 2026-11-14. Implemented in `/app/src/lib/scoring` (Session C), shown by Session A.

A scoring factor that cannot be computed for a cell is left out, and the weights of the remaining factors
are renormalised to sum to 1. Two limits apply:

1. Required factors. Bare ground and `precip` (Dryness) must be present. They carry the veto that
   rules out forests and wet regions. A cell missing either gets no score: it is shown as "no data" and is
   never ranked. Bare ground is present when `ndvi` is not `null`, or when `ndvi` is `null` and
   `barrenFrac` is not `null` (see "Bare ground and permanent ice").
2. Minimum coverage. The present factors must add up to at least 0.6 of the total weight of the active
   mission preset. Below that, no score.

Bare ground and permanent ice. Approved by the user on 2026-11-14. One rule for every cell, so Greenland
and Antarctica are treated alike. The Bare ground similarity is the share of the cell's ground that is
exposed and ice-free:

- `ndvi` present: `s_bare = gaussian(ndvi, target, sigma) * (1 - snowIceFrac)`.
  The Gaussian is the usual per-factor similarity. Permanent ice then lowers it in proportion to the
  share of the cell it covers. If `snowIceFrac` is `null`, the multiplier is 1 (no such cell in the
  current build).
- `ndvi` is `null`: `s_bare = barrenFrac`, used directly as a similarity from 0 to 1. No Gaussian and no
  target value are involved. `barrenFrac` is already the measured ice-free bare share of the cell, so it
  is not multiplied by `(1 - snowIceFrac)` again. This is the case for every cell south of 60 S, where
  the NDVI product has no retrievals. `ndvi` is never filled with a stand-in number.
- `ndvi` and `barrenFrac` both `null`: Bare ground is missing and the cell has no score, as before.

Consequences:

- A cell that is all permanent ice has a Bare ground similarity of 0 in both cases, so its score is 0
  through the geometric mean. This is the "permanent ice" veto of DESIGN.md section 6: ice is not regolith.
  An ice-free barren cell keeps its full similarity.
- The factor counts as present, with its full weight, for coverage and confidence. `ndvi` is not listed in
  `missing` when `barrenFrac` stood in for it. The result should carry `bareGroundSource`: `"ndvi"` or
  `"landCover"`, so the dossier can say which measurement was used.
- Cells with `ndvi` that this changes: 7,485 have some permanent ice, and 3,101 are at least half ice
  (mostly Greenland, where NDVI is near 0 and used to read as bare).
- Cells without `ndvi`: of 25,225, 24,353 have `barrenFrac` 0, and the highest value is 0.148, in the
  McMurdo Dry Valleys cell at -77.75, 161.75. The Dry Valleys are small ice-free valleys inside cells that
  are mostly ice, so they get a low score at 0.5 degrees. Showing them as a strong analog needs a finer grid.
- `snowIceFrac` stays in `earth.json` as its own key. The Ice mission preset may later use it as a
  resource signal; that would be a separate rule and is not part of the score today.
- This rule is part of the scoring formula: write it on the Method page exactly as coded, and cover both
  branches and the all-ice case in the unit tests.

Coverage is measured with the preset's weights before renormalising, so it changes with the preset.
A two-key factor with one key missing counts for half its weight (see "Settled details").
Sunlight is computed from latitude and is always present.

Result contract. For each cell the scoring library returns:

```
{
  "score": number | null,
  "coverage": number,
  "missing": [ string ],
  "confidence": "high" | "medium" | "low" | null,
  "unscoredReason": "required-factor-missing" | "coverage-too-low" | null
}
```

- `score`: 0 to 100, or `null` when the cell is not scored.
- `coverage`: share of the preset's total weight that was present, 0 to 1.
- `missing`: the factor keys (data keys, for example `"lithology"`) that were left out. Empty when nothing is missing.
- `confidence`: `"high"` if coverage is 1, `"medium"` if coverage is at least 0.8, otherwise `"low"`.
  `null` when the cell is not scored.
- `unscoredReason`: why `score` is `null`, otherwise `null`. Added so the UI can say why a cell has no data.

With the Base preset weights, a cell missing only Rock type (0.15) has coverage 0.85 and is medium.
A cell missing only Terrain (0.25) has coverage 0.75 and is low. A cell missing only `roughness` has
coverage 0.875 and is medium.

UI requirements (Session A):
- Show the confidence badge next to every score.
- List the missing factors in the dossier.
- Show a note on each target listing the factors that have no published value.
- The top candidates list includes only high and medium confidence cells by default.
- Document this rule on the Method page, exactly as coded.

Tests (Session C): unit tests cover leave-out and renormalise, both required factors, the 0.6 coverage
limit at the boundary, the three confidence levels at their boundaries, the contents of `missing`,
the half-weight case for two-key factors, and a `null` target value.

## Ownership

| Session | Owns | Does not touch |
| --- | --- | --- |
| A | `/app`, except `/app/src/lib/scoring` | `/pipeline`, `/data`, `/validation`, `/app/src/lib/scoring` |
| B | `/pipeline`, `data/earth.json` | `/app`, `/validation`, `data/targets.json`, `data/analogs.json`, `data/lithology_similarity.json` |
| C | `data/targets.json`, `data/analogs.json`, `data/lithology_similarity.json`, `/app/src/lib/scoring`, `/validation` | the rest of `/app`, `/pipeline`, `data/earth.json` |

Rules:
- Edit only what you own. If you need a change in another session's area, write it down for that session
  instead of making it.
- Session A consumes the scoring library through its exported functions and reads all three data files.
  It does not reimplement scoring.
- Until real files exist, each session may work against a small fixture that follows this contract.
  Fixtures live inside the session's own area and are clearly named as fixtures. They are never shown as real
  data on the live site.
- Shared root files (`SOURCES.md`, `AI_USE.md`, `README.md`): append rows only, do not reorder or rewrite
  other sessions' rows. This keeps merges clean.
- `data/modules.json` is not covered here. It is added to this document when the sandbox checkpoint starts.
  Added 2026-11-15: see "Files added by Session C". Session C also owns `/app/src/lib/sim`, `/app/src/lib/targets`,
  `/app/src/lib/match` and `/app/src/lib/route`, and the data files listed there.

## Changing the contract

1. Change this file first, in its own commit with a message starting `schema:`.
2. Then change the producer, then the consumers.
3. Adding an optional key is fine. Renaming or removing a key, or changing a unit, needs the user's approval.

## Settled details

The contract is settled as of 2026-11-14. These choices close the last gaps. They are decisions, not
questions: build against them.

- Two-key factors. Terrain uses `slope` and `roughness`. Temperature uses `tempMean` and `tempRange`.
  Each key carries half of its factor's weight. With both keys present, the factor similarity is the
  geometric mean of the two key similarities.
  - One key missing: the factor is scored from the key that is present, only half of the factor's weight
    counts as covered, and the absent key is listed in `missing`. The factor enters the renormalised mean
    with that half weight.
  - Both keys missing: the whole factor is dropped and both keys are listed in `missing`.
- Missing target value. A factor with a `null` target value is treated as missing for every cell of that
  target, under the same limits and confidence levels. Session A shows a note on the target itself listing
  the factors that have no published value, taken from the `null` entries in `values`.
- Terrain method. All three elevation models are resampled to the same ground spacing, the coarsest of the
  three, before any metric is computed. `slope` is the mean slope in degrees. `roughness` is the standard
  deviation of elevation in metres. The window is one grid cell on Earth and the same ground area centred
  on the target on the Moon and Mars. Session B records the spacing and window in `meta.factors` labels
  and in `SOURCES.md`.

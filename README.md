# SBATS-26: Space Base Analog Terrain System

A NASA Space Apps 2026 entry for the challenge "Identify Earth Locations that Analog the Permanent Moon
Base Locations and Mars".

SBATS compares every 0.5 degree cell of Earth's land with a base site on the Moon or Mars, ranks the
cells, and shows for any pair where the match holds, where it fails, and what no place on Earth can copy.
It then lets you test a base layout and a rover route at both places.

Live site: not published yet. The repository has no remote at the time of writing.

## What it does

1. **World and place.** Pick the Moon or Mars, then a base site (eight are in the data).
2. **Matches.** All 91,894 land cells of Earth are scored in the browser and shown as a heatmap and a
   ranked list, with confidence and rank stability.
3. **Match.** One Earth place against one target: both at the same ground scale, every dimension with
   both values, a verdict (matches, partly, does not match), a one-line reason and a source badge.
   Featured sites are compared at the scale of their own footprint (2 to 7.4 km).
4. **Actions.** A print-ready report with numbered citations (PDF through the browser, CSV, GeoJSON),
   3D terrain of both places with a route driven on each, and a base sandbox that runs the same layout
   under both sets of conditions.

Also in the app: featured sites (the team's proposed Indonesian sites, established analogs as
benchmarks, the top of the global scan), a Method page, a Validation page with the weak results
included, and pages on Earth, the Moon and Mars.

## The result, stated as strongly as the evidence allows

The proposed Indonesian sites (Tambora, Batur, Merapi, Kawah Ijen and four caves) are not all-round
analogs. They are hot, wet and vegetated, and score about zero as a full base rehearsal. What their
fine-scale values show is a matching rock type and a matching landform. They are candidates for geology
and landform practice. The full findings are in `validation/sites/FINDINGS.md` and the app prints those
sentences unchanged.

Validation, Base weights, hold-out set: see `validation/README.md` and the Validation page. Known Moon
analogs rank mid-table and absolute scores are low. Those numbers are shown, not hidden.

## Run it

```bash
cd app
npm install
npm run dev
```

Then open http://localhost:5173. To build the static site:

```bash
cd app
npm run build
```

The output is `app/dist`. It is a static site with no backend: every score is computed in the browser
from the files in `/data`.

Rebuild the data from its sources (about 1.5 hours the first time, needs a NASA Earthdata token in
`.env`):

```bash
uv run --project pipeline pipeline/build.py
```

Details are in `pipeline/README.md`. Validation scripts and how to rerun them are in
`validation/README.md`. The scoring, simulation, match and route libraries have unit tests; each
library's README in `app/src/lib/` gives the command.

## Layout

| Path | What |
| --- | --- |
| `app/` | The web app: React, Vite, TypeScript, Tailwind |
| `app/src/lib/` | Scoring, simulation, match record, route and target libraries, each with a README |
| `data/` | Built data files. `data/SCHEMA.md` is the contract |
| `pipeline/` | Python scripts that build the data from the sources |
| `validation/` | Validation scripts, outputs and written findings |
| `decisions/` | One log per work stream of the choices made and why |
| `SOURCES.md` | Every dataset: provider, URL, access date, licence, use |
| `AI_USE.md` | Every use of AI in the project |

## Data sources

Every dataset has a row in `SOURCES.md`. In short:

- **Earth:** NASA POWER (MERRA-2) climate, MODIS NDVI and land cover, Copernicus DEM (ESA), the GLiM
  lithological map, Sentinel-2 (ESA) for site footprints and images, NASA EMIT minerals.
- **Moon:** LRO LOLA elevation, LRO Diviner temperature, the LROC WAC mosaic.
- **Mars:** MGS MOLA elevation, the Viking MDIM 2.1 mosaic, cited rover and literature values.
- **Imagery:** NASA Blue Marble through GIBS, NASA Trek mosaics.
- **Sandbox numbers:** cited NASA technical reports, in `data/modules.json` with a source per value.

Every value in the app carries a badge: Measured (from a gridded dataset), Mission (from a spacecraft or
rover), Literature (from a paper), or Computed (worked out in the browser).

## Limits

- A score describes a whole 0.5 degree cell, about 55 km on a side. A small site inside a different
  landscape is scored as its surroundings. Featured sites are also measured inside their own footprint.
- Gravity, vacuum, thin atmosphere and radiation cannot be matched on Earth and are never scored. Each
  match lists them under "What Earth cannot copy".
- The Moon and Mars are colder than anywhere on Earth. Target temperatures are compared with Earth's
  coldest cell, and the app shows the real value next to the one used.
- Scores use annual means. Monthly values exist for the named sites only.
- Absolute scores are low and known Moon analogs rank mid-table.
- The tool has no factor for caves, lava tubes, lakes or water chemistry.
- The base simulation is a daily balance of power, water, oxygen and food. It has no thermal model and no
  transit. Modules with an unsourced number are marked Illustrative.
- Route figures are geometry on the elevation grid. No driving time or energy is shown.
- A missing value is shown as "no data". Nothing is filled in.

## AI assistance

Code, data compilation and written text in this repository were produced with AI assistance (Claude
Code), directed and reviewed by the team. The concept and the decisions are the team's. Every use is
logged in `AI_USE.md` with the tool, what it did and which files. No value in the data comes from an AI
model: each comes from a cited source. No AI-generated image or video is used.

## References

Data sources are listed in `SOURCES.md`, with URLs, access dates and licences. Facts on the world
pages are cited on those pages to NASA NSSDCA fact sheets and NASA mission pages.

Software: React, Vite, TypeScript, Tailwind CSS, three.js, globe.gl, three-slippy-map-globe, Lucide
icons, the Inter and IBM Plex Mono typefaces (through Fontsource), world-atlas (Natural Earth) and
topojson-client. See `SOURCES.md`, "Software and libraries".

No code, text, assets or visual design were taken from another entry.

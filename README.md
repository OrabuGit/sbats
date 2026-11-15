# SBATS-26: Space Base Analog Terrain System

**Live site: https://orabugit.github.io/sbats/**

A NASA Space Apps 2026 entry for the challenge "Identify Earth Locations that Analog the Permanent Moon
Base Locations and Mars". The challenge statement is in [CHALLENGE.md](CHALLENGE.md).

SBATS compares every 0.5 degree cell of Earth's land with a base site on the Moon or Mars, ranks the
cells, and shows for any pair where the match holds, where it fails, and what no place on Earth can copy.
It then lets you test a base layout and a rover route at both places.

## The challenge

Crews and hardware bound for the Moon and Mars are rehearsed on Earth, at "analog" sites that resemble
the destination in some way. The challenge asks for Earth locations that are analogs of the planned
permanent Moon base locations and of Mars, with a preference for new places over the well-known ones.
SBATS answers with a method anyone can rerun: one score, computed the same way for every land cell on
Earth, tested against known analogs, with its weak results shown.

## What it does

1. **World and place.** Pick the Moon or Mars, then a place: one of 71 named landing sites and candidate
   regions, or any point on the globe. Eight targets have hand-checked values; the rest take the values
   of the grid cell around them, at lower confidence. Ten lunar places have no temperature in the grid:
   their scores run high and the app says so wherever one is shown.
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
included, a Learn page, and pages on Earth, the Moon and Mars.

## How the scoring works, in plain words

- **Six factors.** Terrain (slope and roughness), bare ground (how little vegetation), dryness
  (rainfall), temperature (yearly mean and day-night swing), sunlight (how high the Sun gets) and rock
  type.
- **Closeness per factor.** For each factor the Earth value is compared with the target value. The same
  value gives 1; the further apart, the closer to 0, along a bell curve whose width is a written-down
  tolerance per factor. Rock type is a category, not a number, so it uses a table: same class 1.0,
  related class 0.6, unrelated 0.15.
- **One weak factor pulls the whole score down.** The overall score is 100 times the weighted geometric
  mean of the six. A place cannot make up for being wet by being flat. That is on purpose: a base
  rehearsal needs everything at once.
- **Targets are clamped to what Earth has.** The Moon and Mars are colder and drier than anywhere on
  Earth. A target value outside Earth's range is compared with Earth's extreme, and the app shows the
  real value next to the one used.
- **Missing data is left out, not guessed.** A factor with no data is dropped and the other weights are
  rescaled. Vegetation and rainfall are required, and the factors present must carry at least 0.6 of
  the weight; otherwise the cell shows "no data". Every score carries a confidence level (high, medium,
  low) that says how much of the weight had data.
- **Mission presets change weights only.** Base (terrain 0.25, bare ground 0.20, dryness 0.15,
  temperature 0.15, sunlight 0.10, rock type 0.15), Rover, Ice and Astrobiology.
- **Never scored.** Gravity, vacuum, thin atmosphere and radiation cannot be matched on Earth. Each
  match lists them under "What Earth cannot copy".
- **Terrain is measured the same way on all three worlds:** slope and roughness on 463 m elevation
  posts over a 55.6 km window.

The exact formula is in [app/src/lib/scoring/README.md](app/src/lib/scoring/README.md) and the rules
for missing data are in [data/SCHEMA.md](data/SCHEMA.md).

## Run it locally

Needs Node.js 22.12 or later (20.19 or later on the 20 line also works).

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
from the files in `/data`. The live site is built from the `main` branch by
[.github/workflows/pages.yml](.github/workflows/pages.yml) on every push.

Rebuild the data from its sources (about 1.5 hours the first time, needs a NASA Earthdata token in
`.env`, which is never committed):

```bash
uv run --project pipeline pipeline/build.py
```

Details are in [pipeline/README.md](pipeline/README.md). Validation scripts and how to rerun them are in
[validation/README.md](validation/README.md). The scoring, simulation, match and route libraries have
unit tests; each library's README in `app/src/lib/` gives the command.

## Validation results

The score was tested against sites that space agencies and published papers already use as analogs.
Weights and tolerances were frozen on 14 November 2026 and not changed afterwards. Numbers below are for
the Base preset. The full report is [validation/output/REPORT.md](validation/output/REPORT.md) and a
one-page summary is [validation/SUMMARY.md](validation/SUMMARY.md).

**Sample sizes.** 34 sites: 28 known analogs and 6 negative controls (rainforest and cities). They were
split once, by a fixed seed, into a tuning set (24 sites: 20 analogs, 4 controls) and a hold-out set
(10 sites: 8 analogs, 2 controls) that was never used for tuning. Every site is scored at its cell among
91,894 land cells.

| Measure | Tuning set (n = 24) | Hold-out set (n = 10) | All (n = 34) |
| --- | --- | --- | --- |
| Chance that a known analog outranks a control (ROC AUC; 0.5 is chance) | 0.853 | 0.979 | 0.883 |
| Share of all land cells a known analog beats (0.5 is chance) | 0.731 | 0.716 | 0.727 |
| Known analogs in the best tenth of Earth | 29.2% | 29.2% | 29.2% |
| Mean score, known analogs / controls (0 to 100) | 10.7 / 0.3 | 10.2 / 0 | 10.5 / 0.2 |

What holds:

- On the hold-out set a known analog outranks a control 98% of the time (8 analogs, 2 controls).
- The one tuning pass tried 68 changes and kept none. With every weight moved by up to a quarter, 200
  times, 81 to 91% of each target's top ten stays in the top ten.
- For each target, 4 to 6 of its eight best places are more than 500 km from every known analog.
- At site scale (21 sites measured inside their own footprint), Mauna Kea, Atacama, Haughton and
  Lanzarote score 95 to 98 out of 100 for rover mobility against their best target.

What does not:

- Absolute scores are low: a known analog averages about 10 out of 100, because Earth is far warmer
  than the targets. Read the rank, not the score.
- The tool ranks, it does not pinpoint: about seven in ten known analogs fall outside the top tenth.
- The Moon is harder than Mars. On the hold-out set, lunar analogs (3 analogs, 2 controls) beat 62% of
  land cells against 77% for Mars (6 analogs, 2 controls), and no lunar analog reaches the top tenth.
- Rock type adds little: one rock class per 55 km cell is often not the rock at the site.
- The proposed Indonesian sites score about zero as full base rehearsals: they are hot, wet and
  vegetated. They were never part of tuning or validation. See
  [validation/sites/FINDINGS.md](validation/sites/FINDINGS.md).
- Thirty-four sites is a small test and eight hold-out analogs is smaller. The hold-out sites were
  scored once before the split, on incomplete data; nothing was changed in response, but they were not
  unseen. Purpose scores, site-scale scores and mineral comparisons were made after every site had been
  seen: they are development numbers, not tests.

## Findings

<!-- To be filled in by the team. -->

## Limits

- A score describes a whole 0.5 degree cell, about 55 km on a side. A small site inside a different
  landscape is scored as its surroundings. Featured sites are also measured inside their own footprint.
- Gravity, vacuum, thin atmosphere and radiation cannot be matched on Earth and are never scored.
- The Moon and Mars are colder than anywhere on Earth. Target temperatures are compared with Earth's
  coldest cell, and the app shows the real value next to the one used.
- Scores use annual means. Monthly values exist for the named sites only.
- The tool has no factor for caves, lava tubes, lakes or water chemistry. Minerals are seen from orbit
  only, and minerals, wind, haze and permafrost are shown but never scored.
- The base simulation is a daily balance of power, water, oxygen and food. It has no thermal model and
  no transit. Modules with an unsourced number are marked Illustrative.
- Route figures are geometry on the elevation grid. No driving time or energy is shown.
- A missing value is shown as "no data". Nothing is filled in.

## Data sources

Every dataset, paper, library and font has a row in [SOURCES.md](SOURCES.md) with its provider, URL,
access date, licence and what it is used for. In short:

- **Earth:** NASA POWER (MERRA-2, CERES) climate, MODIS NDVI and land cover, Copernicus DEM (ESA), the
  GLiM lithological map, Sentinel-2 (ESA) for site footprints and images, NASA EMIT minerals, JAXA GSMaP
  and GCOM-C as a cross-check.
- **Moon:** LRO LOLA elevation, LRO Diviner temperature, the LROC WAC mosaic.
- **Mars:** MGS MOLA elevation, the Mars Climate Database, Mars Odyssey GRS and THEMIS, the Viking MDIM
  2.1 mosaic, cited rover and literature values.
- **Imagery:** NASA Blue Marble through GIBS, NASA Trek mosaics.
- **Sandbox numbers:** cited NASA technical reports, in `data/modules.json` with a source per value.

Every value in the app carries a badge: Measured (from a gridded dataset), Mission (from a spacecraft or
rover), Literature (from a paper), or Computed (worked out in the browser).

The lists prepared for the project page are in [SUBMISSION_NOTES.md](SUBMISSION_NOTES.md).

## AI assistance

Code, data compilation and written text in this repository were produced with AI assistance (Claude
Code), directed and reviewed by the team. The concept and the decisions are the team's. Every use is
logged in [AI_USE.md](AI_USE.md) with the tool, what it did and which files; the in-app page "AI
assistance" (linked in the footer) shows the same record. No value in the data comes from an AI model:
each comes from a cited source. No AI-generated photograph, image or video is used. Drawings made in
code with AI assistance carry a small "AI-generated drawings" mark.

Several ideas in the app (a guided tour, an explore chart, plain-language results, a custom-conditions
search, extra validation cards) also appear in other 2026 entries. No code, text, assets or visual
design were taken from any of them: each was written for this project from its own data.

## Repository layout

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
| `SUBMISSION_NOTES.md` | Resource lists ready to paste into the project page |

## Licence

The code and text of this project are released under the Apache License 2.0; see [LICENSE](LICENSE).
Third-party data, imagery, fonts and libraries keep their own licences and required credits, listed in
[SOURCES.md](SOURCES.md). In particular: "produced using Copernicus WorldDEM-30 and WorldDEM-90 (c) DLR
e.V. 2010-2014 and (c) Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European
Union and ESA; all rights reserved", and "Contains modified Copernicus Sentinel data 2025".

## Team

<!-- To be filled in by the team. -->

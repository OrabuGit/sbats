# SBATS Design Document

SBATS = Space Base Analog Terrain System. Shown in the UI as SBATS-26.
NASA Space Apps Challenge 2026, Jakarta local event.
Challenge: "Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars".
Hard submission deadline: Sunday 15 November 2026, 23:59 Jakarta time (confirmed in the 2026 Project Submission Guide).

## 1. Overview

SBATS finds the places on Earth that best stand in for future Moon and Mars base sites, then lets you design a base there and test the same design on the real target.

- One-line pitch: Design once, deploy twice. Rehearse your Moon base on Earth before you fly.
- What makes it different: rival projects stop at ranking sites. SBATS adds a base sandbox that shows what a rehearsal on Earth can and cannot prove.
- Headline result: new, overlooked analog candidates in Indonesia, explained properly.
- Honesty rule: no Earth site copies lunar gravity, vacuum or radiation. SBATS says so on every site.

## 2. What the official statement asks for

| The statement says | What SBATS does about it |
| --- | --- |
| Do not simply rediscover well-known sites (Antarctica, Atacama, Iceland, Hawaii are named as already studied) | Lead with new candidates. Known sites are only the validation set |
| Consider scale: one crater, volcanic field or cave system can beat a whole region | Global scan at 0.5 degree to shortlist, then a fine-scale deep dive on 2 or 3 Indonesian sites |
| Explain what is analogous, how similar, and where it breaks down | Per-factor breakdown plus "where the analogy breaks" on every dossier |
| Think about processes, not only places | Dossier names the process: volcanic deposition, acid alteration, lava tube formation |
| Connect the analog to exploration, including human operations and construction | Base Sandbox: rehearse a base on the analog, deploy on the target |
| Remember Earth's limits: gravity, vacuum, thin atmosphere, radiation | Shown beside every score, never hidden in it |
| Surprise us | A tropical volcanic country as a specialist Moon and Mars analog |
| Consider a written format to educate the public | Short findings write-up in the repo and on the Method page |

Official resources to use and name in the submission:

- NASA: Earthdata Search, Worldview, Planetary Data System, LRO (LOLA, LROC, Diviner, LEND, Mini-RF), Diviner polar products.
- ESA: Copernicus Data Space (Sentinel imagery, Copernicus DEM), ESA Open Science Catalog.
- JAXA: G-Portal (precipitation, snow, vegetation).
- CSA: RADARSAT Constellation Mission, RADARSAT-1 archive.

Indonesia deep-dive shortlist (to verify with data):

- Kawah Ijen, East Java: hyperacidic crater lake and sulfur deposits. Possible analog for acid-sulfate alteration on Mars.
- Merapi and its river system, Central Java: fresh basaltic-andesitic volcanic sediment. A published study compares it with Gale and Gusev crater minerals.
- One lava tube or cave system: candidate still to be found. Relevant to lunar and Martian subsurface shelters.

## 3. Judging fit

Official criteria: Impact, Creativity, Validity, Relevance, Presentation.

| Criterion | How SBATS answers |
| --- | --- |
| Impact | Cheaper, safer mission rehearsal. New analog candidates in Indonesia for local researchers and students |
| Creativity | Base Sandbox with deploy-twice |
| Validity | Real datasets, source badge on every number, validation against known analog sites and negative controls |
| Relevance | Finder comes first and works alone. Three-step flow usable with zero reading |
| Presentation | One demo moment: fly from orbit to a site, build a base, watch it fail on the target |

## 4. User flow

Three steps, always visible as a stepper at the top.

1. Pick target. Choose a Moon or Mars base site and a mission type. A default target is preselected on load.
2. Find analog. The globe lights up with match scores. Click a site to open its dossier.
3. Build base. Place modules on the Earth site, then deploy the same layout on the target and read the gap report.

| View | Step | What the user sees |
| --- | --- | --- |
| ORBIT | 1 and 2 | 3D Earth with match heatmap, top candidates list, target picker |
| RECON | 2 and 3 | Earth site and target side by side at the same scale, dossier, sandbox grid |
| BOOTS | 3 | One 3D terrain shot of the base on local terrain |

A "Run demo" button plays the whole flow in 30 seconds.

## 5. Features by checkpoint

Never start a later checkpoint while an earlier one is broken on the live link. Commit and deploy at each checkpoint.

Checkpoint 1, Sat 23:00: the finder

- Target picker with 6 to 8 cited base sites (Moon: Malapert Massif, Mons Mouton, Haworth, Shackleton rim. Mars: Jezero, Gale, Arcadia Planitia)
- ORBIT globe with match heatmap
- Match score 0 to 100 with per-factor breakdown
- Veto scoring (weighted geometric mean)
- Mission presets: Base, Rover, Ice, Astrobiology
- Top candidates list with NEW tag for sites far from any known analog
- Dossier: breakdown, radar chart, "what Earth cannot copy", best month to test
- First push to GitHub and first live deploy

Checkpoint 2, Sun 03:00: Indonesia deep dive

- Finer-grid scan of Indonesia with honest labels
- Featured site pages for Kawah Ijen, Merapi and one cave or lava tube
- Validation page with one headline number
- Method page listing every factor, weight, source and limit

Checkpoint 3, Sun 09:00: sandbox

- RECON split view, Earth site next to target at the same scale
- Base Sandbox grid with 6 module types
- Live resource panel: power, water, oxygen, food, crew, delivered mass
- Deploy twice with GREEN / AMBER / RED readiness
- Rehearsal gap report in plain language

Checkpoint 4, Sun 13:00: simulation

- Save, load and share base layouts (browser storage plus a share link)
- 30-day time slider with moving resource bars
- Sustainability score: days the base survives without resupply
- Resupply button: cargo delivery every N days, shown on the timeline
- Events: lunar night, Mars dust storm

Checkpoint 5, Sun 17:00: 3D

- BOOTS: one 3D terrain shot with low-poly modules and a slow camera orbit, 2 or 3 credited NASA 3D models at most
- Mission-computer narration while flying to a site

Checkpoint 6, Sun 20:00: submit. This one does not move.

- Demo, project page, References, AI disclosure, submit
- Anything unfinished is hidden behind a flag, not shipped broken

Not building: AI terrain models, offline install, XP systems, multiple languages, live space-weather feeds, animated astronauts, orbital mechanics.

## 6. Scoring model

Each Earth grid cell (0.5 degree, about 55 km) gets one score per target, built from six factor similarities combined so that one total failure rules the cell out.

| Factor | What it measures | Default weight (Base preset) |
| --- | --- | --- |
| Terrain | Slope, roughness, local relief | 0.25 |
| Bare ground | Lack of vegetation and snow cover | 0.20 |
| Dryness | Annual precipitation | 0.15 |
| Temperature | Mean and day-night swing | 0.15 |
| Sunlight | Sun elevation and seasonal light pattern | 0.10 |
| Rock type | Basalt, anorthosite, sediment, ice | 0.15 |

Per-factor similarity, where x is the Earth value, t the target value clamped to Earth's observed range, and sigma a tolerance:

    s_i = exp( -0.5 * ((x_i - t_i) / sigma_i)^2 )

Overall score, a weighted geometric mean with weights summing to 1:

    S = 100 * product over i of ( s_i ^ w_i )

- Veto: dense vegetation or permanent ice sets that factor near zero, which drags the whole score down.
- Clamping: lunar polar cold has no Earth equal, so the target is clamped to Earth's extreme and the gap is shown under "what Earth cannot copy".
- Mission presets only change weights. Rover raises Terrain, Ice raises Temperature and Rock type, Astrobiology raises Dryness and Rock type.
- Not scored: gravity, vacuum, radiation. Shown beside the score, never inside it.
- Weights above are a starting guess. Tune them once against the validation set, then freeze and record them.

## 7. Data sources

Every value in the app carries one badge: Measured (computed from a dataset), Mission (measured by a spacecraft or rover), Literature (from a paper, labelled as an estimate).

| Factor | Earth | Moon | Mars |
| --- | --- | --- | --- |
| Terrain | SRTM or Copernicus DEM | LRO LOLA elevation | MGS MOLA elevation |
| Bare ground | MODIS NDVI, ESA WorldCover | Always bare | Always bare |
| Dryness | NASA POWER precipitation | Zero | Zero liquid precipitation |
| Temperature | NASA POWER, MODIS land surface temperature | LRO Diviner | Curiosity REMS, Perseverance MEDA |
| Sunlight | Computed from latitude and season | Computed from lunar polar geometry | Computed from Mars orbit and latitude |
| Rock type | Global lithology map, Smithsonian volcano list | USGS lunar geologic map | USGS Mars geologic map |
| Ice | Permafrost maps | Diviner and LEND polar ice products | SWIM subsurface ice maps |
| Imagery | NASA GIBS, Sentinel-2 | NASA Moon Trek | NASA Mars Trek |

Rules:

- This table was drafted from memory and other teams' READMEs. Verify every dataset and link before relying on it, and record it in SOURCES.md.
- Start with NASA POWER (no login) to get the first heatmap, then add vegetation, then terrain, then rock type.
- Measure terrain the same way on all three worlds (same window size, same slope formula).
- Precompute everything into static files. The demo must never wait on a live API.

## 8. Base Sandbox

The user places modules on a grid over the site map. The same layout is simulated twice, once with the Earth site's conditions and once with the target's. The difference is the result.

| Module | Produces | Consumes | Depends on site |
| --- | --- | --- | --- |
| Habitat | Crew capacity | Power, oxygen, water, food | Temperature (heating load) |
| Solar array | Power | Nothing | Sunlight, lit fraction, dust |
| Battery | Stored power for dark periods | Nothing | Length of night |
| Greenhouse | Food, some oxygen | Power, water | Sunlight, temperature |
| Ice miner | Water, oxygen (by electrolysis) | Power | Ice availability |
| Landing pad | Resupply mass per cycle | Nothing | Slope (must be flat) |

Solar power per array: P = I * A * efficiency * lit_fraction, where I is sunlight at the surface and A is panel area.

Values to verify and cite before use (approximate, from memory):

- Sunlight: Moon about 1,361 W/m2 when lit. Mars about 590 W/m2 at the top of its atmosphere. Earth site from NASA POWER.
- Crew needs per person per day: oxygen about 0.8 kg, water about 3 kg, food about 0.6 kg dry mass. Check against NASA's Baseline Values and Assumptions Document.

Readiness rating:

- GREEN: every resource balance is zero or positive through the longest dark period.
- AMBER: at least one resource survives only with stored reserves.
- RED: at least one resource runs out.

Gap report: one line per difference, for example "Solar arrays produce 2.3 times less on Mars. Add 4 arrays or cut 2 crew." It always ends with what the Earth rehearsal cannot test at all.

Simulation and saving:

- The sim steps one day at a time for 30 days. Each step adds production, subtracts crew use, and applies any active event.
- Sustainability score = number of days until the first resource hits zero with no resupply.
- Resupply adds a fixed cargo mass every N days. No orbital mechanics.
- A layout is a small JSON object (module type and grid position). It saves to browser storage and encodes into the share link.
- Every module number lives in data/modules.json with a source field.
- Show delivered mass in kg. Show launch cost in dollars only if a cited cost per kg is found.

## 9. Validation plan

SBATS is valid if known analog sites score high and obviously wrong places score low, reported as one number.

1. Positive set: 20 to 30 established analog sites with coordinates (Atacama, Haughton Crater, McMurdo Dry Valleys, Mauna Kea, Lanzarote, Iceland highlands, Utah desert stations and others).
2. Negative set: Kalimantan rainforest, Amazon, Congo basin, Jakarta, Singapore, Paris.
3. Headline number: how often a known analog outranks a negative site (ROC AUC, 0.5 is chance, 1.0 is perfect).
4. Second number: share of known analogs in the top 10% of all Earth cells for their matching target.
5. Report weak results too. A perfect score is a warning sign that the test is too easy.

Indonesia candidates are specialist analogs (volcanic rock, acidic crater lakes), not all-round matches, because Indonesia is wet and vegetated. Say so plainly.

## 10. UI spec

Mission-control console: dark, flat, precise, one accent color. If a choice makes it look like a generic AI-built landing page, reject it.

| Token | Value | Use |
| --- | --- | --- |
| Background | #0B0D0F | App background |
| Panel | #12161A | Side panels, cards |
| Line | #2A3138 | 1px borders and grid lines |
| Text | #D7DDE3 | Body text |
| Muted | #7C8894 | Labels, secondary text |
| Accent | #FFB000 | Selection, primary button, active step |
| Green / Amber / Red | #3DDC84 / #FFB000 / #FF4D4D | Readiness only |

- Type: IBM Plex Mono for numbers, labels and codes. Inter for sentences. Labels small, uppercase, letter-spaced. Body 14 to 15 px.
- Layout: globe or map fills the screen. Left panel 320 px (target picker, mission preset, weights). Right panel 380 px (candidates, dossier or resources). Top bar with SBATS-26 mark, stepper and Run demo. Bottom strip with coordinates, site code such as SBATS-ID-014, status word.
- Banned: gradients, glows, drop shadows, glass blur, purple, emoji as icons (use Lucide), corner radius above 4 px, modal dialogs, marketing copy, more than one accent color.
- Ease of use: loads with a default target and the heatmap already visible. Every score has a one-line plain-language reason. Everything happens in the two panels.
- Accessibility: real button, a, input and label elements. Contrast at least 4.5:1. Click targets at least 44 px.

## 11. Architecture

Static site, no backend. A Python pipeline builds data files ahead of time and the browser does everything else.

1. Data build (Python, run offline): download datasets, compute the factors per 0.5 degree land cell, write data/earth.json (or compact binary), targets.json, analogs.json, modules.json.
2. Scoring (browser): load the files and score all cells for the chosen target and weights.
3. Views (browser): globe, split view, sandbox, all reading the same in-memory data.
4. Hosting: GitHub Pages or Vercel.

| Part | Choice |
| --- | --- |
| Framework | React + Vite + TypeScript |
| Styling | Tailwind with the tokens above |
| Globe | Globe.gl (three.js) |
| 2D maps | Leaflet or MapLibre |
| Charts | Hand-rolled SVG or Recharts |
| Data build | Python, NumPy, xarray, rasterio |

Repo layout: /app, /pipeline, /data, /design, README.md, SOURCES.md, AI_USE.md, JUDGING.md, CHALLENGE.md.

## 12. Submission rules that shape the build

- Deadline: "Submit for Judging" before Sunday 15 November 23:59 Jakarta time. Resubmitting is allowed until then, and only the last saved submission is judged. Submit early, then keep resubmitting.
- Demo: video of 30 seconds or less, or a slide deck of at most 7 slides including title and intro slides. Over the limit is not eligible for Global Judging. Slides must show team name, member names and the challenge.
- All links public: no password, permission or registration. Test in a private browser.
- Everything in English.
- At least one NASA dataset is required for Global Awards. Partner agency data is encouraged.
- AI tools are permitted. State where and how they were used. AI-generated images and video need a visible watermark. AI-generated code and data must be acknowledged in descriptive text and metadata. No NASA logos, flags or mission identifiers in generated content.
- No image, video, audio or likeness of anyone under 18 in the demo or final project.
- New website: request a FortiGuard Web Filter Classification after deploying, so judges' networks do not block it.
- List every dataset, library, image and borrowed method in References.

## 13. Risks

| Risk | Fallback |
| --- | --- |
| Data pipeline takes too long | Ship with 3 factors from NASA POWER and MODIS, add terrain and rock type later |
| Sandbox numbers cannot be sourced in time | Show mass and power only, drop food and cost |
| Globe is slow on judges' laptops | Fall back to a flat map heatmap |
| Looks like every other analog finder | Lead the pitch with the Indonesia discovery and the sandbox, not the globe |
| Indonesia scores low everywhere | Present it honestly as specialist analogs, with Merapi and Kawah Ijen as cases |

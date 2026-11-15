# Purpose rankings and analog profiles: do sites rank high on what they are known for?

**Development numbers, not a clean test. All 28 known sites, including the 8 hold-out sites, had been scored and read before the dimensions and purposes were defined. Chance is a mean percentile of 0.5.**

Generated 2026-11-15T13:42:55.146Z by `npx tsx validation/purposes.ts`. Earth grid built 2026-11-15T06:42:18Z.
The all-round score is the one frozen on 2026-11-14 and is not changed by this view. Definitions and the
reason this view exists: `validation/purposes/DEFINITIONS.md`. Candidate sites are not part of this report.

A percentile here is tie-fair (mid-rank): the share of Earth cells with a strictly lower value plus half of those
exactly equal, averaged over the targets the site is an analog for. Chance is exactly 0.5.

## By purpose

For the sites cited as used for each purpose: their mean percentile on that purpose's ranking, the same
sites on the all-round score, and the other known sites on the purpose ranking for comparison.

| Purpose | Depends on | Sites used for it | Mean percentile on the purpose ranking | In top 10% / top 25% | Same sites, all-round score | Other known sites, purpose ranking |
| --- | --- | --- | --- | --- | --- | --- |
| Instrument and geology testing | geology | 19 | 0.59 | 1 / 2 | 0.72 | 0.56 (4 sites) |
| Rover mobility | terrain, bareGround | 8 | 0.81 | 4 / 6 | 0.80 | 0.70 (20 sites) |
| Ice and resources | climate, sunlight, geology | 3 | 0.61 | 1 / 2 | 0.40 | 0.58 (25 sites) |
| Astrobiology | climate, geology, bareGround | 13 | 0.82 | 6 / 10 | 0.79 | 0.70 (15 sites) |
| Full base rehearsal | geology, terrain, climate, bareGround, sunlight | 9 | 0.80 | 4 / 6 | 0.80 | 0.69 (19 sites) |

## By the one use each site is best known for

Each site counted once, under its primary use.

| Purpose | Sites best known for it | Mean percentile on the purpose ranking | In top 10% / top 25% | Same sites, all-round score |
| --- | --- | --- | --- | --- |
| Instrument and geology testing | 11 | 0.61 | 1 / 2 | 0.74 |
| Rover mobility | 2 | 0.55 | 0 / 0 | 0.57 |
| Ice and resources | 3 | 0.61 | 1 / 2 | 0.40 |
| Astrobiology | 5 | 0.80 | 2 / 3 | 0.79 |
| Full base rehearsal | 4 | 0.92 | 3 / 4 | 0.92 |

## By dimension

Sites used for a purpose that depends on the dimension, against the other known sites.

| Dimension | Sites known for it | Their mean percentile on it | In top 10% / top 25% | Other known sites |
| --- | --- | --- | --- | --- |
| Geology | 20 | 0.59 | 1 / 2 | 0.56 (3 sites) |
| Terrain | 8 | 0.74 | 3 / 4 | 0.59 (20 sites) |
| Climate | 15 | 0.51 | 0 / 2 | 0.38 (13 sites) |
| Bare ground | 18 | 0.81 | 6 / 14 | 0.71 (10 sites) |
| Sunlight | 3 | 0.19 | 0 / 0 | 0.60 (25 sites) |

Geology has three possible values, so ties are large. Share of Earth cells with exactly the same rock class
as each target (all of them share the top geology percentile):

| Target | Share of cells tied at the top |
| --- | --- |
| moon-malapert-massif | 0.7% |
| moon-mons-mouton | 0.7% |
| moon-haworth | 0.7% |
| moon-shackleton-rim | 0.7% |
| moon-marius-hills | 2.9% |
| mars-jezero | 2.9% |
| mars-gale | 13.4% |
| mars-arcadia-planitia | no rock class for this target |
| mars-gusev-columbia-hills | 2.9% |
| mars-holden | 13.4% |

What the rock class of each geology-labelled site actually is against its targets (mean similarity over its
targets: 1.0 same class, 0.6 related, 0.15 unrelated):

| Mean rock similarity | Sites used for geology |
| --- | --- |
| same class for every target (1.0) | 0 |
| related on average (0.5 to under 1.0) | 7 |
| partly related (0.2 to under 0.5) | 5 |
| unrelated for every target (0.15) | 7 |
| no rock class for the cell or the target | 4 |

## Every known site

| Site | Cited use | Instrument and geology testing | Rover mobility | Ice and resources | Astrobiology | Full base rehearsal | Geology (dim.) | Terrain (dim.) | Climate (dim.) | Bare ground (dim.) | Sunlight (dim.) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Atacama Desert hyperarid core (Yungay), Chile | astrobiology, geology, mobility | **0.38** | **0.91** | 0.89 | **0.91** | 0.94 | 0.38 | 0.54 | 0.56 | 0.98 | 0.84 |
| Haughton impact structure, Devon Island, Canada | geology, mobility, base, astrobiology | **0.59** | **0.95** | 0.56 | **0.98** | **0.91** | 0.59 | 0.62 | 0.70 | 0.99 | 0.24 |
| Beacon Valley, McMurdo Dry Valleys, Antarctica | ice | n/a | 0.38 | **0.90** | 0.96 | 0.47 | n/a | 0.07 | 0.85 | 0.74 | 0.20 |
| Don Juan Pond, Wright Valley, Antarctica | ice, astrobiology, geology | **n/a** | 0.33 | **0.90** | **0.97** | 0.37 | n/a | 0.04 | 0.84 | 0.76 | 0.20 |
| Mauna Kea, Hawaii, USA | ice, geology | **0.48** | 0.47 | **0.04** | 0.36 | 0.36 | 0.48 | 0.98 | 0.04 | 0.45 | 0.16 |
| Kilauea, Hawaii, USA | geology, astrobiology, base | **n/a** | 0.56 | 0.04 | **0.37** | **0.39** | n/a | 0.87 | 0.07 | 0.53 | 0.41 |
| Craters of the Moon, Idaho, USA | geology, base, astrobiology | **0.63** | 0.86 | 0.89 | **0.85** | **0.92** | 0.63 | 0.87 | 0.58 | 0.78 | 0.62 |
| Timanfaya, Lanzarote, Spain | geology, base | **n/a** | 0.96 | 0.32 | 0.81 | **0.82** | n/a | 0.81 | 0.43 | 0.94 | 0.42 |
| Noerdlinger Ries impact crater, Germany | geology | **0.48** | 0.42 | 0.33 | 0.47 | 0.48 | 0.48 | 0.61 | 0.26 | 0.42 | 0.43 |
| Askja caldera, Iceland highlands | geology | **0.86** | 0.97 | 0.34 | 0.74 | 0.81 | 0.86 | 0.85 | 0.23 | 0.95 | 0.53 |
| Mars Desert Research Station, Hanksville, Utah, USA | base, mobility | 0.59 | **0.98** | 0.95 | 0.94 | **0.99** | 0.59 | 0.96 | 0.61 | 0.88 | 0.66 |
| Rio Tinto, Huelva, Spain | astrobiology, geology | **0.70** | 0.58 | 0.58 | **0.59** | 0.61 | 0.70 | 0.59 | 0.34 | 0.56 | 0.67 |
| Dallol, Danakil Depression, Ethiopia | astrobiology, geology | **0.59** | 0.99 | 0.54 | **0.78** | 0.93 | 0.59 | 0.93 | 0.31 | 0.98 | 0.90 |
| SP Crater, San Francisco Volcanic Field, Arizona, USA | base, mobility | 0.48 | **0.79** | 0.43 | 0.77 | **0.79** | 0.48 | 0.77 | 0.52 | 0.78 | 0.32 |
| Meteor Crater, Arizona, USA | geology | **0.98** | 0.84 | 0.47 | 0.90 | 0.83 | 0.98 | 0.74 | 0.49 | 0.83 | 0.31 |
| Ubehebe Crater, Death Valley, California, USA | geology, astrobiology | **0.59** | 0.99 | 0.95 | **0.95** | 0.99 | 0.59 | 0.94 | 0.61 | 0.90 | 0.67 |
| North Pole Dome, Pilbara, Australia | geology, astrobiology | **0.70** | 0.81 | 0.62 | **0.73** | 0.83 | 0.70 | 0.70 | 0.33 | 0.79 | 0.90 |
| Arkaroola, Flinders Ranges, Australia | geology, astrobiology, mobility | **0.38** | **0.95** | 0.81 | **0.81** | 0.94 | 0.38 | 0.90 | 0.52 | 0.85 | 0.74 |
| Qaidam Basin, China | geology, astrobiology | **0.59** | 0.89 | 0.99 | **0.99** | 0.98 | 0.59 | 0.22 | 0.72 | 1.00 | 0.67 |
| Makhtesh Ramon, Negev, Israel | base | 0.59 | 0.98 | 0.89 | 0.92 | **0.98** | 0.59 | 0.89 | 0.52 | 0.94 | 0.73 |
| Lonar crater, Maharashtra, India | geology | **0.63** | 0.55 | 0.25 | 0.52 | 0.54 | 0.63 | 0.60 | 0.18 | 0.53 | 0.92 |
| Tso Kar, Ladakh, India | astrobiology, base | 0.59 | 0.56 | 0.97 | **1.00** | **0.63** | 0.59 | 0.19 | 0.74 | 1.00 | 0.77 |
| Makgadikgadi Pans, Botswana | geology, astrobiology | **0.59** | 0.78 | 0.65 | **0.75** | 0.81 | 0.59 | 0.06 | 0.36 | 0.82 | 0.91 |
| Teide and Las Canadas, Tenerife, Spain | mobility, geology | **0.63** | **0.59** | 0.54 | 0.65 | 0.61 | 0.63 | 0.51 | 0.30 | 0.66 | 0.76 |
| Mount Etna, Sicily, Italy | mobility, geology | **0.48** | **0.50** | 0.30 | 0.51 | 0.53 | 0.48 | 0.96 | 0.29 | 0.48 | 0.33 |
| Sudbury Basin, Ontario, Canada | geology | **0.48** | 0.48 | 0.32 | 0.51 | 0.52 | 0.48 | 0.59 | 0.26 | 0.49 | 0.41 |
| Kangerlussuaq, Greenland | geology | **n/a** | 0.58 | 0.63 | 0.84 | 0.64 | n/a | 0.15 | 0.65 | 0.77 | 0.37 |
| Mistastin crater, Labrador, Canada | geology, base, mobility | **0.48** | **0.78** | 0.33 | 0.68 | **0.72** | 0.48 | 0.69 | 0.24 | 0.78 | 0.50 |

Bold marks the purposes a site is cited as used for.


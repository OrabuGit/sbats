# Minerals on both sides: what each Earth site shares with each target

Written 2026-11-15T07:27:44.482Z by `npx tsx validation/minerals.ts`. Site values: data/sites.json built 2026-11-15T07:23:39Z (Session B).

**Site-level result only. Added after the score was frozen on 2026-11-14: it is not part of any score and has not been validated.**

How to read it:

- Earth side: NASA EMIT, an imaging spectrometer on the Space Station. An "identification" is a spectral match in a 60 m pixel on one date. The share is how often a mineral's signature is matched in the clear pixels of the footprint, not how much of the mineral is there.
- Target side: minerals reported in cited papers, by a rover instrument in place or by an orbiter.
- Both are reduced to mineral families. A family counts on Earth when it is matched in at least 1% of the clear pixels.
- "Shared" is a pointer for a geologist, not proof of the same rock. Iron oxides and clays are common weathering products on Earth; finding them says little on its own.
- Some target minerals cannot be compared at all: EMIT cannot identify plain feldspar, akaganeite or phosphates.
- Vegetation hides the ground. Where dry vegetation is matched in most pixels, few minerals are seen.

## What the targets report

| Target | Mineral families reported | Comparable with EMIT | Not comparable |
| --- | --- | --- | --- |
| mars-gale | 11 | Pyroxene, Olivine, Magnetite, Hematite, Jarosite, Calcium sulfate, Smectite clay, Silica, Magnesium-iron carbonate | Plagioclase feldspar, Akaganeite |
| mars-jezero | 9 | Olivine, Pyroxene, Magnesium-iron carbonate, Calcium sulfate, Magnesium sulfate, Perchlorate, Smectite clay | Plagioclase feldspar, Phosphate |
| moon-shackleton-rim | 1 | none | Plagioclase feldspar |
| moon-marius-hills | 2 | Pyroxene, Olivine | none |
| mars-arcadia-planitia | 0 | No lander has been here and no mineral study of the site was found. A study of domes several hundred kilometres west (Farrand et al. 2021, Icarus 357:114111) is not the site. | |
| moon-malapert-massif | 0 | No published mineral result for this site was found. | |
| moon-mons-mouton | 0 | No published mineral result for this site was found. | |
| moon-haworth | 0 | No published mineral result for this site was found. | |

## What EMIT identifies at each Earth site

| Site | Kind | Date | Clear pixels | Dry vegetation matched | Mineral families identified (share of clear pixels) | Seen but not assigned to a family |
| --- | --- | --- | --- | --- | --- | --- |
| Kawah Ijen, East Java, Indonesia | candidate | | | | no data: EMIT has 18 granules over the site, but none of the 8 least cloudy ones gave a usable footprint. | |
| Mount Merapi and the Opak River, Central Java, Indonesia | candidate | 2026-09-20 | 73% of 2724 | 16% | Goethite 18%, Jarosite 10%, Smectite clay 10%, Hematite 8%, Gibbsite 4% | Fe-Hydroxide SU93-106 amorph W1R1Bb 8% |
| Gua Lawa lava tube, Purbalingga, Central Java, Indonesia | candidate | 2025-07-21 | 100% of 956 | 0% | none | none |
| Goa Pandan basalt lava cave, East Lampung, Sumatra, Indonesia | candidate | | | | no data: EMIT has 14 granules over the site, but none of the 8 least cloudy ones gave a usable footprint. | |
| Kesaksak lava tube, Batur caldera, Bali, Indonesia | candidate | 2024-09-29 | 91% of 5449 | 39% | none | none |
| Maros-Pangkep karst caves, South Sulawesi, Indonesia | candidate | | | | no data: EMIT has 11 granules over the site, but none of the 8 least cloudy ones gave a usable footprint. | |
| Mount Tambora caldera, Sumbawa, Indonesia | candidate | 2024-10-28 | 84% of 11150 | 72% | Hematite 24%, Goethite 12%, Calcium carbonate 4%, Hydrated volcanic glass 3%, Smectite clay 2% | none |
| Mount Batur black lava fields, Bali, Indonesia | candidate | 2024-09-29 | 64% of 2417 | 75% | Goethite 1% | Desert_Varnish GDS141 W1R1Ba 4%, Fe-Hydroxide SU93-106 amorph W1R1Bb 1% |
| Mauna Kea, Hawaii, USA | known | 2025-05-25 | 61% of 2323 | 0% | Silica 57%, Hematite 38%, Goethite 29%, Hydrated volcanic glass 18%, Smectite clay 10%, Gibbsite 8% | nHematit+fg-Goethit 34B2+MPC W1R1Hb 17%, Fe-Hydroxide SU93-106 amorph W1R1Bb 7% |
| Kilauea, Hawaii, USA | known | 2023-08-01 | 94% of 5566 | 24% | Goethite 31%, Smectite clay 16%, Jarosite 15%, Hematite 11%, Hydrated volcanic glass 5% | Fe-Hydroxide SU93-106 amorph W1R1Bb 6%, Acid_Mine_Dr Assemb1-Fe3+ W1R1Fb 4% |
| Atacama Desert hyperarid core (Yungay), Chile | known | 2023-01-26 | 100% of 5897 | 0% | Hematite 98%, Mica and illite 88%, Kaolinite 66%, Smectite clay 3%, Goethite 3% | Phlogopite_Sand_Mix BR93-20 W1R1Ba 1% |
| Haughton impact structure, Devon Island, Canada | known | | | | no data: No EMIT L2B mineral granule contains the site. | |
| Timanfaya, Lanzarote, Spain | known | | | | no data: EMIT has 2 granules over the site, but none of the 2 least cloudy ones gave a usable footprint. | |
| Dallol, Danakil Depression, Ethiopia | known | 2023-01-20 | 98% of 2079 | 0% | Goethite 63%, Hematite 53%, Jarosite 53%, Iron sulfate 16%, Smectite clay 3% | Renyolds_TnlSldgWet SM93-15w W1R1Ba 12% |
| Dasht-e Lut (Lut Desert), Iran | known | 2023-08-19 | 100% of 5932 | 0% | Hematite 100%, Mica and illite 91%, Goethite 72%, Calcium carbonate 9%, Smectite clay 9% | none |
| Salar de Uyuni salt flat, Bolivia | known | | | | no data: EMIT has 18 granules over the site, but none of the 8 least cloudy ones gave a usable footprint. | |
| Tunupa volcano, north shore of Salar de Uyuni, Bolivia | known | 2023-12-31 | 72% of 4308 | 47% | Hematite 80%, Goethite 25%, Kaolinite 13%, Calcium carbonate 5% | none |
| Beacon Valley, McMurdo Dry Valleys, Antarctica | known | | | | no data: No EMIT L2B mineral granule contains the site. | |
| Don Juan Pond, Wright Valley, Antarctica | known | | | | no data: No EMIT L2B mineral granule contains the site. | |
| Craters of the Moon, Idaho, USA | known | 2025-05-31 | 99% of 5890 | 1% | Hematite 9%, Calcium carbonate 2%, Goethite 1% | Maghemite GDS81 Syn (M-3) W1R1Bb 2%, Grass_Golden_Dry GDS480 W1R1Fa 84%, Dry_Long_Grass AV87-2 W1R1Ba 1% |
| Askja caldera, Iceland highlands | known | | | | no data: No EMIT L2B mineral granule contains the site. | |

## How each scene was screened for cloud

A mineral match in a cloudy pixel is a match to cloud, not ground. This table repeats, per site, the mask flags the pipeline says it removed before counting. A scene screened with fewer flags than the others should be read with more doubt.

| Site | Date | Flags removed before counting |
| --- | --- | --- |
| Mount Merapi and the Opak River, Central Java, Indonesia | 2026-09-20 | cloud flag, cirrus flag, water flag, dilated cloud flag, spectf-cloud flag |
| Gua Lawa lava tube, Purbalingga, Central Java, Indonesia | 2025-07-21 | cloud flag, cirrus flag, water flag, spacecraft flag, dilated cloud flag, aggregate flag, spectf-cloud flag |
| Kesaksak lava tube, Batur caldera, Bali, Indonesia | 2024-09-29 | cloud flag, cirrus flag, water flag, dilated cloud flag, spectf-cloud flag |
| Mount Tambora caldera, Sumbawa, Indonesia | 2024-10-28 | cloud flag, cirrus flag, water flag, dilated cloud flag, spectf-cloud flag |
| Mount Batur black lava fields, Bali, Indonesia | 2024-09-29 | cloud flag, cirrus flag, water flag, dilated cloud flag, spectf-cloud flag |
| Mauna Kea, Hawaii, USA | 2025-05-25 | cloud flag, cirrus flag, water flag, spacecraft flag, dilated cloud flag, aggregate flag, spectf-cloud flag |
| Kilauea, Hawaii, USA | 2023-08-01 | cloud flag, cirrus flag, water flag, dilated cloud flag, spectf-cloud flag |
| Atacama Desert hyperarid core (Yungay), Chile | 2023-01-26 | cloud flag, cirrus flag, water flag, dilated cloud flag, spectf-cloud flag |
| Dallol, Danakil Depression, Ethiopia | 2023-01-20 | cloud flag, cirrus flag, water flag, dilated cloud flag, spectf-cloud flag |
| Dasht-e Lut (Lut Desert), Iran | 2023-08-19 | cloud flag, cirrus flag, water flag, dilated cloud flag, spectf-cloud flag |
| Tunupa volcano, north shore of Salar de Uyuni, Bolivia | 2023-12-31 | cloud flag, cirrus flag, water flag, dilated cloud flag, spectf-cloud flag |
| Craters of the Moon, Idaho, USA | 2025-05-31 | cloud flag, cirrus flag, water flag, spacecraft flag, dilated cloud flag, aggregate flag, spectf-cloud flag |

## Shared minerals, site by target

| Site | mars-gale | mars-jezero | moon-shackleton-rim | moon-marius-hills |
| --- | --- | --- | --- | --- |
| Mount Merapi and the Opak River, Central Java, Indonesia | 3 of 9: Hematite, Jarosite, Smectite clay | 1 of 7: Smectite clay | not comparable | 0 of 2: none |
| Gua Lawa lava tube, Purbalingga, Central Java, Indonesia | not comparable | not comparable | not comparable | not comparable |
| Kesaksak lava tube, Batur caldera, Bali, Indonesia | not comparable | not comparable | not comparable | not comparable |
| Mount Tambora caldera, Sumbawa, Indonesia | 2 of 9: Hematite, Smectite clay | 1 of 7: Smectite clay | not comparable | 0 of 2: none |
| Mount Batur black lava fields, Bali, Indonesia | 0 of 9: none | 0 of 7: none | not comparable | 0 of 2: none |
| Mauna Kea, Hawaii, USA | 3 of 9: Hematite, Smectite clay, Silica | 1 of 7: Smectite clay | not comparable | 0 of 2: none |
| Kilauea, Hawaii, USA | 3 of 9: Hematite, Jarosite, Smectite clay | 1 of 7: Smectite clay | not comparable | 0 of 2: none |
| Atacama Desert hyperarid core (Yungay), Chile | 2 of 9: Hematite, Smectite clay | 1 of 7: Smectite clay | not comparable | 0 of 2: none |
| Dallol, Danakil Depression, Ethiopia | 3 of 9: Hematite, Jarosite, Smectite clay | 1 of 7: Smectite clay | not comparable | 0 of 2: none |
| Dasht-e Lut (Lut Desert), Iran | 2 of 9: Hematite, Smectite clay | 1 of 7: Smectite clay | not comparable | 0 of 2: none |
| Tunupa volcano, north shore of Salar de Uyuni, Bolivia | 1 of 9: Hematite | 0 of 7: none | not comparable | 0 of 2: none |
| Craters of the Moon, Idaho, USA | 1 of 9: Hematite | 0 of 7: none | not comparable | 0 of 2: none |

Each cell: how many of the target's comparable mineral families EMIT also identified at the site, and which.


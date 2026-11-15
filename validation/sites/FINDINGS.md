# Site-level scores: where Tambora, Batur, Merapi and Kawah Ijen are strong and where they fall short

Written 2026-11-15. Tables: `validation/output/SITES.md` and `sites.json`, produced by
`npx tsx validation/score_sites.ts` from `data/sites.json` (Session B, built 2026-11-15T04:43:34Z).

## What was done

The global score reads one value per 55 km grid cell. Here each named site is scored from values
measured inside its own footprint of 2 to 7.4 km: slope and roughness, vegetation, and the rock type
of the site or the whole volcano. The frozen formula, tolerances and weights are used unchanged.
Each site gets the analog profile (similarity per dimension) and the five purpose scores, against
all eight targets.

Four limits apply to every number below:

1. **Climate is not site-scale.** Temperature and rainfall are still the grid cell's. A crater floor at
   1,300 m and the coast below it share one figure.
2. **Terrain is compared in a window of the same size.** Roughness grows with the window, so each
   target was measured again in a square as big as the site's footprint, centred on the target's
   coordinates. That square describes the ground at that point, not the whole landform.
3. **A footprint holds 16 to 256 terrain posts.** Small samples.
4. **Percentiles mix scales.** A site-scale value is ranked among 55 km cells. Rough guide only.

Nothing here was used to tune or validate the score.

Updated 2026-11-15 with three additions made after the freeze: minerals, the comparison with
established analogs, and rank stability. The all-round score did not change.

## The short version

- **At site scale, every Indonesian candidate still scores about zero as a full base rehearsal, an
  ice site or an astrobiology site.** Those purposes include climate, and the climate is hot and wet:
  25 to 27 C and 1,300 to 2,400 mm of rain a year, against targets with no rain at all.
- **Bare ground also fails on the footprint mean.** The least vegetated candidate, Tambora, has a mean
  NDVI of 0.28. The score treats about 0.05 as bare and is close to zero by 0.3.
- **What the fine-scale values do show is rock and landform.** Tambora and the two basalt caves carry
  the same rock class as Jezero and Marius Hills. Several footprints match a lunar target's slope and
  relief in a same-size window.
- **The method itself works on dry sites.** With the same procedure, known analogs reach rover
  mobility scores of 95 to 98 out of 100 against their best target (Mauna Kea, Atacama, Haughton,
  Timanfaya, Dallol, Dasht-e Lut). The Indonesian zeros are a finding, not a fault of the method.

So the honest claim for the Indonesian sites is narrow: **a matching rock type and a matching shape,
in the wrong climate, under vegetation.** They are candidates for geology and landform practice, not
for a full base rehearsal.

## Tambora caldera

Footprint 7.4 km, rim to rim (provisional, traced by Session B on the elevation model).

| | Value | Reading |
| --- | --- | --- |
| Rock | Trachybasalt, basic volcanic (whole volcano) | Same class as Jezero and Marius Hills (1.00). Related to the lunar highland targets (0.60) |
| Terrain | 20.7 degrees mean slope, 394 m roughness | 0.75 against Malapert Massif in the same window. 0.23 against the Shackleton point. Zero against the flat targets |
| Vegetation | Mean NDVI 0.28, 28% of the footprint bare | Bare-ground similarity 0.07. Second most bare ground of the Indonesian candidates, after Merapi |
| Climate | 27.2 C, 1,282 mm a year (grid cell) | 0.00 against every target |
| Sunlight | Latitude 8 S | 0.95 to 1.00 against Jezero, Gale and Marius Hills. 0.00 against the polar targets |

Purpose scores: geology 100 against Jezero and Marius Hills; rover mobility 26 against Malapert
Massif and 14 against Shackleton; everything else below 1.

**Strong:** the right rock for a basalt target, and steep crater-wall ground.
**Short:** climate, vegetation, and size.

### Tambora and Shackleton: the scale difference, stated plainly

| | Tambora caldera | Shackleton crater |
| --- | --- | --- |
| Width, published | 6 km (Smithsonian GVP); 6 by 7 km in two papers | 21 km (Zuber et al. 2012) |
| Depth, published | 1,250 m (GVP); other sources say 1.0 to 1.2 km | 4.1 km (Zuber et al. 2012) |
| Width of the rim-to-rim square measured here | 7.4 km | 22.2 km |
| Mean slope in that square | 20.7 degrees | 22.3 degrees |
| Roughness in that square | 394 m | 1,300 m |
| Lowest to highest ground in that square | 1,372 m | 4,565 m |

**Shackleton is three to three and a half times as wide, about three times as deep, and nine to
twelve times the area.** The two have nearly the same average steepness. Tambora is the same kind of shape at
roughly one third of the size.

What follows from that:

- A square the size of Tambora's whole caldera, placed at Shackleton's centre, holds only the
  crater floor and the foot of the wall (10.1 degrees, 247 m). That is why the like-for-like terrain
  score is 0.23.
- Tambora can stand in for the **steepness** of a crater wall: walking or driving on a slope of
  about 21 degrees. It cannot stand in for the **distances** (a 21 km rim, a 4 km descent), the
  line of sight across the crater, or communication from the floor.
- Tambora's floor is in tropical air and sunlight. Shackleton's floor never sees the Sun. Nothing
  about permanent shadow, cold or ice can be rehearsed there.
- The published widths disagree (6 km, 6 by 7 km, and 7.1 by 7.4 km on the elevation model). The
  ratio is "about three", not a precise figure.

## Batur

Two footprints lie in the Batur caldera.

**Batur black lava fields** (4 km, provisional, the mapped bare-rock outline):

| | Value | Reading |
| --- | --- | --- |
| Rock | Andesite / basaltic andesite, intermediate volcanic (whole volcano) | Related to Jezero and Marius Hills (0.60). Unrelated to the lunar highland targets (0.15) |
| Terrain | 5.7 degrees, 116 m | 0.92 against Mons Mouton, 0.81 against Malapert, 0.77 against the Shackleton point. 0.00 against Marius Hills |
| Vegetation | Mean NDVI 0.47, 8% of the footprint bare | 0.00 |
| Climate | 26.6 C, 1,615 mm a year | 0.00 |
| Sunlight | Latitude 8 S | 0.95 to 1.00 against Jezero, Gale and Marius Hills |

**Kesaksak lava tube** (5 km, centred on the Batur cone because the tube's position is not
published): terrain 0.87 against Malapert; NDVI 0.51, 5% bare; same rock class as above.

**Strong:** moderate relief close to several lunar targets in a same-size window; a volcanic rock
class related to the basalt targets.
**Short:**
- "Black lava" does not read as bare. Half of the square lies outside the mapped lava, and lava with
  moss and grass is above the bare threshold. Only 8% of the footprint counts as bare.
- The pairing with Marius Hills does not show up in terrain. The ground around the pit is flat mare
  (1.1 degrees, 20 m in the same window); the lava field is five times steeper.
- The volcano's listed rock type is andesite, although GVP says the historical flows on the caldera
  floor are basaltic. The site keeps the listed type, so it is "related", not "same".
- **The tool has no factor for caves or tubes.** Whether Batur is a good lava-tube analog is not
  something any score here can say. That pairing rests on the feature, not on a number.

## Merapi

Footprint 4 km on the summit and upper flank.

| | Value | Reading |
| --- | --- | --- |
| Rock | Andesite / basaltic andesite, intermediate volcanic | Related to Jezero and Marius Hills (0.60). **Unrelated to Gale (0.15), the target it is listed for** |
| Terrain | 25.0 degrees, 302 m | Steeper than every target in the same window. Best 0.02, against Malapert (10.0 degrees) |
| Vegetation | Mean NDVI 0.44, **35% of the footprint bare** | 0.00 on the mean. The most bare ground of any Indonesian candidate |
| Climate | 25.0 C, 2,338 mm a year | 0.00 |
| Sunlight | Latitude 7.5 S | 1.00 against Gale, 0.95 against Jezero |

**Strong:** a third of the footprint is bare volcanic ground; equatorial sunlight like Gale's.
**Short:** far too steep for any target; wettest of the four; and the rock class does not support
the Gale link. The study that links Merapi to Gale is about river sediments on the Opak, below the
volcano. A 4 km square on the summit does not sample them, and no site-scale value here does.

## Kawah Ijen

Footprint 3 km: crater, acid lake and rim.

| | Value | Reading |
| --- | --- | --- |
| Rock | Andesite / basaltic andesite, intermediate volcanic | Related to Jezero and Marius Hills (0.60). **Unrelated to Gale (0.15), the target it is listed for** |
| Terrain | 11.1 degrees, 147 m | 0.54 against Malapert, 0.38 against Mons Mouton. Zero against the flat targets |
| Vegetation | Mean NDVI 0.62, 9% of the footprint bare, 5% water | 0.00 |
| Climate | 25.4 C, 1,655 mm a year | 0.00 |
| Sunlight | Latitude 8 S | 1.00 against Gale, 0.95 against Jezero |

**Strong:** crater relief of the right order for a lunar massif; equatorial sunlight.
**Short:** mostly vegetated once the rim is included; hot and wet. The grid cell had scored its rock
as "related" to Gale, but only because the cell's dominant class is loose sediment. At the volcano
it is not.
**Not scored at all:** what Kawah Ijen is cited for, the chemistry of a hyperacid lake. The tool has
no factor for water chemistry or alteration minerals.

## Minerals on both sides (added after the freeze, site-level only)

> **Provisional, 2026-11-15 14:00 WIB. Do not quote the numbers in this section.** Session B found that
> the EMIT mineral values in `data/sites.json` built between 12:30 and 13:59 today were not screened
> with every cloud flag: newer EMIT scenes carry cloud in mask bands the pipeline did not read, so some
> "identifications" are cloud, not ground. Scenes from 2023 (Mauna Kea, Kilauea, Atacama, Dallol,
> Dasht-e Lut, Tunupa, Craters of the Moon) are probably unaffected. Every Indonesian scene is newer
> (Merapi 2026, Tambora and Batur 2024) and is at risk. The Merapi and Tambora rows and the two
> bullets about them below are **withdrawn until the corrected file is re-run**. This section will be
> rewritten to whatever the corrected data shows, including nothing.

Tables: `validation/output/MINERALS.md`, from `npx tsx validation/minerals.ts`. Earth side: NASA EMIT
mineral identifications inside each footprint, on one date. Target side: minerals reported by rovers
and orbiters in cited papers (`data/target_minerals.json`). Not part of any score, not validated.

What an identification is: a spectral match in a 60 m pixel. The percentages below say how often a
mineral's signature is matched in the cloud-free pixels, not how much of it is there.

| Site | Minerals identified | Shared with Gale (of 9 comparable families) | Shared with Jezero (of 7) |
| --- | --- | --- | --- |
| Merapi | goethite 18%, jarosite 10%, smectite clay 10%, hematite 8% | **3: hematite, jarosite, smectite clay** | 1: smectite clay |
| Tambora caldera | hematite 24%, goethite 12%, smectite clay 2% | 2: hematite, smectite clay | 1: smectite clay |
| Batur lava fields | goethite 1% | none | none |
| Kesaksak (Batur cone), Maros-Pangkep | EMIT identified no mineral: no observation, so not compared | | |
| Kawah Ijen, Gua Lawa, Goa Pandan | no usable cloud-free EMIT scene | | |

What this says:

- **Merapi shares three mineral families with Gale crater**: hematite, jarosite and smectite clay,
  all three measured in place by Curiosity. That is as many as Mauna Kea, Kilauea and Dallol share
  with Gale by the same count. Merapi is the candidate the literature links to Gale, and this is the
  first number in the project that supports that link.
- **Tambora shares two with Gale** (hematite, and smectite clay in 2% of pixels).
- **No site shares olivine or pyroxene**, the minerals that define the basalt targets (Jezero's crater
  floor, Marius Hills). EMIT identified neither anywhere, including on Mauna Kea and Kilauea. So every
  site shows "0 of 2" against Marius Hills. That is a limit of what this instrument reports on
  weathered ground, not evidence about the rock.
- **Shackleton cannot be compared at all.** Its one reported mineral is plain feldspar, which EMIT
  cannot identify.

Cautions, all of which apply:

- Iron oxides and clays are ordinary weathering products on Earth. Sharing them with Mars says the
  surface chemistry overlaps, not that the rocks formed the same way.
- EMIT's own documentation says minerals outside its ten core ones still need validation. Jarosite
  and nontronite, both in the Merapi result, are outside the ten.
- One scene per site. Tambora and Batur show dry vegetation in 72% and 75% of pixels, which hides the
  ground; Merapi 16%.
- A family counts at 1% of clear pixels. Tambora's smectite, at 2%, is close to that line.

## Wind, dust and ice (added after the freeze, cell scale)

Tables: `validation/output/BENCHMARKS.md`. Earth side from Session B: NASA POWER wind speed at 10 m and
aerosol optical depth at 550 nm, and the permafrost share of Obu et al. 2018, all for the 0.5 degree
cell. Target side: the Mars Climate Database for Mars wind and dust, zero for the airless Moon, and
the share of ice-stable ground at the lunar poles from Diviner. Tolerances were written down before any
site was compared: a quarter of Earth's 5th-to-95th-percentile spread (wind 2.0 m/s, optical depth
0.12), and 0.25 for the ice share. Not part of any score. Not validated.

| Site | Wind, m/s | Aerosol optical depth | Wind like Jezero (5.1 m/s) | Haze like Jezero (0.48) |
| --- | --- | --- | --- | --- |
| Merapi | 3.3 | 0.38 | 0.69 | 0.71 |
| Tambora caldera | 2.9 | 0.21 | 0.56 | 0.08 |
| Batur lava fields | 3.0 | 0.22 | 0.59 | 0.10 |
| Kawah Ijen | 2.4 | 0.24 | 0.42 | 0.14 |
| Atacama, Yungay (known) | 3.6 | 0.04 | 0.76 | 0.00 |
| Dallol (known) | 3.8 | 0.40 | 0.83 | 0.80 |

Read with care:

- **Wind speed is the easiest thing to match and the least useful.** Indonesian sites have light winds
  of 2 to 4 m/s, about a tolerance below Jezero's and Arcadia's 4 to 5 m/s. But Mars air is about a
  hundredth as dense as Earth's, so the same speed pushes far less. A wind match says nothing about
  loads on a structure.
- **The haze number matches Mars at Merapi, and the material does not.** An optical depth of 0.38 over
  Central Java is close to Mars's 0.48. Over Java that haze is smoke, pollution and humid air; on Mars it
  is mineral dust. The Earth product counts all particles and cannot tell them apart. Dallol, in a
  desert, is the honest match on this dimension. Do not present Merapi as a dust analog.
- **Gale's model wind (12.6 m/s) matches nowhere.** No site, known or candidate, comes close. The figure is
  a point query in the model's high-resolution mode, which adds slope winds inside the crater; the same
  model's coarse map gives 7.6 m/s for the cell. Treat it as uncertain.
- **Ice cannot be compared for any Indonesian site.** The permafrost map covers land north of 25 N
  only, and the tropics have none. The lunar polar targets carry a share of ice-stable ground (0.5% to
  35% of the window); Haughton, with permafrost under all of it, is the only site here that compares.
- For the Moon, "no wind" and "no dust in the air" are matched by calm, clear places. That is true and
  not very interesting: lunar dust is a hazard on the ground, which an optical depth does not describe.

## Beside the established analogs

Tables: `validation/output/BENCHMARKS.md` and `data/benchmarks.json`, from
`npx tsx validation/benchmarks.ts`. Every site of `data/sites.json` is scored by one procedure:
8 candidates and 13 known analogs, each against all 8 targets, at site scale. Numbers as of the site file built
2026-11-15T06:40Z; `BENCHMARKS.md` is regenerated whenever sites are added and is the one to quote.

Mean similarity over all targets:

| Dimension | Candidates | Known analogs |
| --- | --- | --- |
| Geology | 0.44 | 0.45 |
| Terrain | 0.28 | 0.41 |
| Climate | 0.00 | 0.10 |
| Bare ground | 0.01 | 0.70 |
| Sunlight | 0.40 | 0.39 |

Purpose scores out of 100, for the typical (median) target and for the best target:

| Purpose | Candidates, typical | Known, typical | Candidates, best | Known, best |
| --- | --- | --- | --- | --- |
| Instrument and geology testing | 34 | 41 | 77 | 70 |
| Rover mobility | 0.1 | 41 | 4 | 75 |
| Ice and resources | 0 | 5 | 0 | 10 |
| Astrobiology | 0 | 14 | 0 | 16 |
| Full base rehearsal | 0 | 10 | 0.1 | 20 |

Read plainly:

- **On rock, the candidates stand beside the known analogs** (0.44 against 0.45; best-target geology
  77 against 70).
- **On bare ground they do not** (0.01 against 0.70). This one dimension is the whole gap in rover
  mobility, 0.1 against 41.
- **Climate is poor for everyone** (0.10 for the known analogs). No place on Earth is cold and dry
  enough, which is why even established analogs score 10 out of 100 as a full base rehearsal.
- "Best target" flatters every site, known or candidate: it is the best of eight, chosen afterwards.
  The typical-target column is the fairer one.
- The known analogs are the thirteen for which fine-scale data was built. A yardstick, not a test.

## Rank stability

`validation/output/STABILITY.md`, from `npx tsx validation/stability.ts`: 200 redraws of the weights
(each moved by up to a quarter, fixed seed), all cells scored again each time.

- For every target, 81% to 91% of the ten best cells stay in the top ten; in the worst single redraw,
  50% to 70%. The list is stable; single ranks inside it are not.
- The Indonesian candidates do not move: Tambora's cell stays near rank 59,000 of 92,000 and Merapi's
  near 63,000, whatever the weights. Their low all-round rank is not an accident of the weights.

## Where Indonesia stands in the world list

`validation/output/DISCOVERIES.md`, from `npx tsx validation/discoveries.ts`: the frozen all-round
score over every land cell, listed from the top.

- The best-ranked cells in the Indonesian region are in East Nusa Tenggara by their coordinates
  (9.75 S, 120.25 E and 10.75 S, 121.75 E; a person should confirm the islands). They beat 40% to 49%
  of Earth's cells, depending on the target, with scores of 0 to 0.1. Vegetation holds them back.
- The places the score puts first are elsewhere: around 34 to 37 N, 83 to 87 E (the northern Tibetan
  Plateau by the coordinates) for the Mars targets and Marius Hills, with scores of 49 to 56; and
  around 82 N, 83 W (the Canadian High Arctic) for the lunar polar targets, with scores of 51 to 54.
  Most are more than 500 km from every site in our list of 28 known analogs.

So the tool's own answer to "where on Earth is most like these targets, all round" is not Indonesia.
The Indonesian sites are put forward for specific things the all-round score does not reward: basalt
rock, crater and lava shapes, and lava tubes (the Merapi mineral overlap with Gale is withdrawn
pending a re-run, see the minerals section). That distinction
should be said out loud, not hidden.

## What this view cannot tell you

- Anything about climate at the site. A weather station on the crater floor would be needed.
- Whether the bare part of a footprint is a good match. The score uses the footprint's mean NDVI,
  so Merapi's bare third and Tambora's bare quarter are averaged with forest. The bare share is
  printed next to the score for that reason.
- Anything about caves, tubes or lake chemistry. Minerals are now compared, but only as families seen
  from orbit (see the minerals section).
- How a whole landform compares, except where a rim-to-rim window was measured (Tambora and
  Shackleton above).

## Check on known analogs

The same procedure on the nine known analogs measured first, best target each, rover mobility purpose
(four more were added later; all thirteen are in `output/BENCHMARKS.md`):

| Site | Site scale | Its 55 km cell |
| --- | --- | --- |
| Mauna Kea | 95 | 0.1 |
| Atacama, Yungay | 96 | 71 |
| Haughton | 98 | 75 |
| Timanfaya, Lanzarote | 96 | 47 |
| Dallol | 96 | 97 |
| Dasht-e Lut | 96 | 50 |
| Tunupa | 87 | 52 |
| Kilauea | 47 | 1 |

Mauna Kea is the clearest case: its cell has a mean NDVI of 0.59, its summit footprint 0.04. This is a
development observation on sites that were already known, picked because fine-scale data existed.
It is not a validation. It also flatters: "best target" is chosen after the fact from eight.
Salar de Uyuni has no terrain value (the elevation model's water mask covers the salt), so it has no
mobility score.

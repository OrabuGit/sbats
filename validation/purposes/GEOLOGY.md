# Why the geology dimension barely beats chance

Written 2026-11-15. Tables: `validation/output/GEOLOGY.md`, produced by `npx tsx validation/geology.ts`.
Nothing was retuned to write this. The rock-class table, the targets' rock classes and the frozen score
are exactly as they were on 2026-11-14.

**These are development numbers.** The 28 known sites had all been seen before. The Indonesian
candidates are not in any number below except the last, site-level table, where they are shown apart.

## The number in question

In `validation/output/PURPOSES.md`, the known analogs cited for geology reach a mean percentile of
**0.59** on the geology ranking. The other known sites reach **0.56**. Chance is 0.5.

## Short answer

The dimension compares one thing only: the dominant rock class of a 55 km grid cell against one rock
class per target. Four separate facts make that comparison nearly blind. In order of weight:

1. **The cell's rock class is often not the rock at the site.**
2. **"Used for geology" mostly means a landform or a process, which a rock class cannot express.**
3. **The dimension has three possible values, and almost all of Earth sits on the lowest.**
4. **The 0.59 against 0.56 gap is inside the noise.** It is not evidence of a small effect.

None of these is a tuning problem. Changing the three similarity levels or the weights would not fix
any of them, which is why nothing was changed.

## 1. The cell's rock class is often not the rock at the site

The Earth grid keeps one rock class per 0.5 degree cell: the class covering most of the cell in the
GLiM world map. A volcano, a crater or a lava field is usually a small part of its cell.

`data/sites.json` (Session B) records the rock mapped at the site itself, or for the whole volcano, for
five known analogs. Compared with their cells:

| Site | Rock at the site | Rock class of its cell |
| --- | --- | --- |
| Mauna Kea | Basalt (Smithsonian volcano record) | Intermediate volcanic rocks |
| Kilauea | Basalt (regional map unit) | none: the cell has no rock class |
| Timanfaya, Lanzarote | Mafic volcanic rocks (regional map unit) | none: the cell has no rock class |
| Atacama, Yungay | Granite (regional map unit) | Intermediate plutonic rocks |
| Haughton | "sedimentary" (too general to class) | Mixed sedimentary rocks |

The cell and the site carry the same class at **none** of the five. Two differ outright and three
cannot be compared, two of them because an island cell has no rock class at all.

The 28-site table shows the same thing without any fine-scale data. Mount Etna, a volcano, sits in a
cell classed "Mixed sedimentary rocks". SP Crater, in the San Francisco Volcanic Field, sits in a cell
classed "Carbonate sedimentary rocks". Mauna Kea's cell is "Intermediate volcanic rocks". A site can
also score well for the wrong reason: a high geology percentile only says the cell's dominant class
is related to the target's, not that the feature people visit is.

Missing data adds to it: 15 of the 69 site-target pairs for geology-cited sites cannot be compared,
because the cell has no rock class or because Arcadia Planitia has none.

## 2. "Used for geology" mostly means a landform or a process

The purpose was defined as "the rock in front of the instrument". The sources that label these sites
mean something wider: impact craters used to train astronauts in crater geology, lava fields used
for volcanic landforms, acid or evaporite deposits used for alteration chemistry. The scoring
library has no layer for "impact structure" or "fresh lava flow". It has a rock class.

The lunar targets show the gap most clearly. All four are coded "Basic plutonic rocks", the nearest
GLiM class to lunar highland anorthosite. Of the 36 pairs between a geology-cited site and a Moon
target, **none is the same class**, 8 are related, 20 are unrelated and 8 have no data. The sites are
lunar analogs because they are craters and volcanoes, not because they are anorthosite.

So part of the weak result is the label, not the tool: 23 of the 28 known sites are cited for
geology in some sense, which leaves only 5 sites (4 with a rock class) to compare them with.

## 3. Three possible values, and almost all of Earth on the lowest

Geology similarity is 1.0 for the same class, 0.6 for a related class, 0.15 for an unrelated one.
Every cell therefore lands on one of three percentiles per target:

| Target | Earth cells: same | related | unrelated | Percentile if same | if related | if unrelated |
| --- | --- | --- | --- | --- | --- | --- |
| Four Moon targets (basic plutonic) | 0.7% | 3.3% | 96.1% | 1.00 | 0.98 | 0.48 |
| Jezero (basic volcanic) | 2.9% | 2.6% | 94.5% | 0.99 | 0.96 | 0.47 |
| Gale (siliciclastic sedimentary) | 13.4% | 30.4% | 56.2% | 0.93 | 0.71 | 0.28 |

For the Moon and Jezero the dimension is close to a yes or no flag. About 95% of Earth is
"unrelated" and ties at a percentile just under 0.5, which is what chance gives. A site can only
stand out by being in the 4% to 6% of cells that are the same or related.

The geology-cited sites split into 6 same, 13 related and 35 unrelated pairs. Sixty-five percent of
their comparable pairs sit on the "unrelated" tie. Averaging 35 pairs at 0.28 to 0.48 with 19 pairs at
0.71 to 1.00, site by site, gives 0.59. For scale, the same sites would average 0.97 if every pair were the same class and
0.42 if every pair were unrelated: the result is a third of the way up from the floor.

## 4. The gap is inside the noise

| Group | Sites with a rock class | Mean percentile | Standard error |
| --- | --- | --- | --- |
| Cited for geology | 19 | 0.59 | 0.03 |
| Other known sites | 4 | 0.56 | 0.03 |

A difference of 0.03 with a standard error of 0.03 on each side, and four sites in the comparison
group, cannot be told from zero. The honest reading is not "geology helps a little". It is "this
check cannot show whether geology helps".

## Site-level result (separate, illustration only)

For the named sites that have a rock type at site or volcano scale, the geology comparison was
repeated with that class in place of the cell's. This is **not** part of the global score, the
validation or the purpose rankings, and it changes none of them. Full table in
`validation/output/GEOLOGY.md`, section 3.

Known analogs, each against the targets it is listed for:

| Site | With the cell's class | With the site's class |
| --- | --- | --- |
| Mauna Kea (Moon targets) | unrelated, percentile 0.48 | related, 0.98 |
| Kilauea (Moon targets, Jezero, Gale) | no data | related to the Moon targets 0.98, same as Jezero 0.99, unrelated to Gale 0.28 |
| Timanfaya (Moon targets, Jezero, Gale) | no data | the same as Kilauea |
| Atacama, Yungay (Jezero, Gale) | unrelated, 0.47 and 0.28 | unrelated, 0.47 and 0.28 |
| Haughton (Jezero, Gale) | unrelated 0.47, related 0.71 | no data: the source says only "sedimentary" |

Is it fairer? For the three volcanic sites, yes: basalt volcanoes used as lunar and Mars analogs now
show as basalt. Atacama stays unrelated, which is right: it is used for its dryness, not its
granite. Mean percentile over the sites that can be compared: 0.48 with the cell's class (3 sites),
0.77 with the site's class (4 sites). The two means are over different sites, and five sites chosen
because fine-scale data existed for them are an illustration, not a test.

What it does not fix: cause 2. With the right rock class, a basalt volcano is still only "related" to
a lunar highland target, and an impact crater in sandstone is still "unrelated" to the Moon.

## What would make geology work, and was not done

- A rock class at site scale for every known analog (a regional geologic map lookup, as Session B
  did for eleven sites). This removes cause 1.
- A landform or process layer: impact structures, lava fields, evaporite basins. This removes cause 2
  and is a new factor, so it would change the score. It was not attempted after the freeze.
- More sites that are not used for geology, to have something to compare against.

Until then: read the geology dimension in the analog profile as "the cell's dominant rock class is
the same, related or unrelated", show the cell's class next to it, and do not rank by it alone.

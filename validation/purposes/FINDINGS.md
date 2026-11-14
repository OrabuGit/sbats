# Purpose rankings and analog profiles: what the check showed

Run on 2026-11-14 with `npx tsx validation/purposes.ts`. Full tables: `validation/output/PURPOSES.md`.
Definitions, written first: `DEFINITIONS.md`.

**These are development numbers, not a clean test.** All 28 known sites, the 8 hold-out sites
included, had been scored and read before the dimensions and purposes were defined. The Indonesian
candidate sites were not used to design any of this and are not in these numbers.

A percentile here is tie-fair (mid-rank): the share of Earth cells strictly below, plus half of those
exactly equal. Chance is 0.5.

## Short answer

The view does not rescue the single-dimension sites, and for geology it shows why it cannot at this
resolution. It is still worth having, because it says in which respects a place matches, which a
single number cannot.

## By purpose

| Purpose | Sites cited for it | Their mean percentile on the purpose ranking | Same sites on the all-round score | Other known sites on the purpose ranking |
| --- | --- | --- | --- | --- |
| Instrument and geology testing | 19 with a rock class (23 labelled) | 0.59 | 0.72 | 0.56 |
| Rover mobility | 8 | 0.81 | 0.80 | 0.70 |
| Ice and resources | 3 | 0.61 | 0.40 | 0.58 |
| Astrobiology | 13 | 0.82 | 0.79 | 0.70 |
| Full base rehearsal | 9 | 0.80 | 0.80 (the same score) | 0.69 |

What this says, plainly:

- **Geology does not work.** Sites used for geology rank at 0.59 on the geology ranking, barely above
  chance, lower than on the all-round score, and no higher than sites that are not used for geology
  (0.56). Only 1 of 19 is in the top 10%. Of the 23 geology-labelled sites, none has the same rock class
  as all its targets, 7 are related on average, 5 partly related, 7 unrelated, and 4 have no rock class
  in the cell.
- **Rover mobility and astrobiology move by a hair** (0.81 against 0.80, 0.82 against 0.79). Sites cited
  for them do rank higher than other known sites (0.70), but they did on the all-round score too.
- **Ice and resources improves the most (0.40 to 0.61), on 3 sites.** Three sites is too few to lean
  on, and other known sites score 0.58 on the same ranking, so it does not pick the ice sites out.
- **Crewed-simulation sites were already well ranked.** The four sites best known as bases (MDRS, Makhtesh
  Ramon, SP Crater, Haughton) sit at 0.92 on the all-round score. That is the one purpose the frozen
  score serves well.

## By dimension

| Dimension | Sites known for it | Their mean percentile on it | Other known sites |
| --- | --- | --- | --- |
| Geology | 20 | 0.59 | 0.56 |
| Terrain | 8 | 0.74 | 0.59 |
| Climate | 15 | 0.51 | 0.38 |
| Bare ground | 18 | 0.81 | 0.71 |
| Sunlight | 3 | 0.19 | 0.60 |

Sites known for terrain, climate and bare ground do rank higher on those dimensions than other known
sites, by 0.10 to 0.15. Sites known for geology do not. The three ice sites rank low on sunlight
(0.19): Mauna Kea is at 20 degrees north, nothing like a polar Sun.

## Why geology fails

- The rock class is one class per 0.5 degree cell from a global map (GLiM). A crater, a lava flow or a
  quarry is far smaller than 55 km. The Ries crater's cell is not "impact rock", it is whatever
  covers most of that part of Bavaria.
- The Moon targets are coded as basic plutonic rock (anorthosite). Only 0.7% of Earth cells have that
  class, and the Apollo-era training sites are volcanoes and impact craters, not anorthosite bodies.
- There are only three possible values, so the ranking is mostly ties.

This is a limit of the data at this scale, not something a different weight would fix. It needs a
finer grid or a feature-level dataset (volcano lists, impact-crater lists, mapped lava tubes).

## A mistake found and corrected on the way

The first definition of a dimension percentile was "the share of Earth cells beaten or tied". The
first run gave the geology sites 0.90 by that measure. Looking at the rows showed why: sites whose
rock class is unrelated to the target, the lowest possible value, were given 0.96, because 96% of
Earth cells tie with them at the bottom. The tie-fair mid-rank percentile replaced it as the main
figure, and it is the one in the tables above. The change made the result worse, which is the
honest direction. Both figures are in `purposes.json`.

## What to do with this view in the app

- Show the analog profile as five bars with their similarity. It is true and readable.
- For Geology, show the words (same, related or unrelated rock class), not a percentile.
- Offer the purpose rankings as lenses, with a line saying they are not validated.
- Do not claim that the purpose rankings find known analogs better than the all-round score. On this
  evidence they do not.

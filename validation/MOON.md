# Why known lunar analogs rank lower than Mars analogs

Written 2026-11-15 from `validation/output/report.json` (the frozen validation), `output/sites.json`
and `output/DISCOVERIES.md`. Nothing was retuned.

## The numbers

| | Lunar targets | Mars targets |
| --- | --- | --- |
| Known analogs beat this share of Earth's cells, on average | 63% | 77% |
| Known analogs in the top tenth | none | about 4 in 10 |
| Mean all-round score of a known analog | about 5 | about 13 |
| What most often holds a known analog back | dryness (16 of 40 pairs), bare ground (12), temperature (12) | temperature (25 of 41 pairs) |

(All 28 known sites together. On the hold-out sites alone: 62% against 77%.)

## The cause: the lunar analog sites people use are not dry or bare

The ten known analogs listed for the Moon are places used for geology training and rover trials:
impact craters and volcanoes. Their 55 km cells are mostly wet, green or both.

| Site | Cell NDVI | Cell rain, mm a year | Held back by | Beats this share of cells |
| --- | --- | --- | --- | --- |
| Mauna Kea | 0.59 | 1,831 | dryness | 37% |
| Kilauea | 0.49 | 1,554 | dryness | 39% |
| Ries crater | 0.62 | 773 | bare ground | 48% |
| Sudbury | 0.54 | 826 | bare ground | 52% |
| Etna | 0.55 | 609 | bare ground | 53% |
| Mistastin crater | 0.24 | 948 | dryness | 72% |
| SP Crater | 0.24 | 339 | temperature | 79% |
| Timanfaya, Lanzarote | 0.10 | 102 | temperature | 79% |
| Meteor Crater | 0.19 | 378 | temperature | 84% |
| Askja | 0.00 | 932 | dryness | 85% |

The Mars analogs are mostly deserts chosen for being Mars-like in climate (Atacama, Dry Valleys,
Qaidam, Dallol), which is what the all-round score measures. The lunar list was chosen for landforms.
An all-round score with a veto on wet and green ground is bound to rank the first group higher.

Three more things add to it:

1. **The lunar targets are the harder ones.** Four of the five are at the south pole, at -140 to
   -210 C with no day-night cycle like Earth's. Every Earth cell is clamped to Earth's coldest
   value, so temperature cannot tell lunar analogs apart. It can for Mars.
2. **No known site shares the lunar rock class.** The polar targets are coded as basic plutonic rock
   (anorthosite): 0.7% of Earth's cells. None of the ten sites is in one (`purposes/GEOLOGY.md`).
3. **Scale.** Mauna Kea's cell is forest and coast; its summit is bare. At site scale Mauna Kea scores
   95 out of 100 for rover mobility against Malapert Massif; its cell scores 0.1 (`sites/FINDINGS.md`).

## What the search itself finds for the Moon

For the four polar targets the frozen score puts the far north of the Canadian Arctic, around 82 N,
83 W, at ranks 2 to 8, with scores of 51 to 54 (`output/DISCOVERIES.md`). Six of the top eight places
for each polar target are more than 500 km from every site in our list of known analogs. The top ten
is stable under nudged weights (83% to 90% stays).

So the score is not blind for the Moon. It finds cold, dry, bare, high-latitude ground, which is a fair
reading of "like a lunar polar site as far as Earth allows". What it does not do is rank the sites that
people actually use for lunar training, because those were chosen for their craters and lava, not
their climate.

## What to say

"For the Moon the score ranks cold, dry, bare ground at high latitude. The famous lunar training sites
are craters and volcanoes in temperate or tropical places, so they rank in the middle on the all-round
score. That is why the tool also gives a profile per dimension and a site-scale view."

## What was not done

No weight or tolerance was changed to lift the lunar numbers. The one tuning pass tried wider
temperature tolerances and they made no measurable difference (`tuning/FROZEN.md`).

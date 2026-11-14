# Analog profile and purpose rankings: definitions

Written on 2026-11-14, before any per-dimension or per-purpose result was computed. The code that
implements it is `app/src/lib/scoring/profile.ts`. The results are in `validation/output/PURPOSES.md`.

## Why this view was added

It was added after validation. The all-round score, frozen on 2026-11-14, puts known analogs at a mean
percentile of about 0.72 on the hold-out set, and known Moon analogs lower still, with none in the top
10% of Earth cells. Reading the per-site results showed why: many established sites are analogs for one
thing only. The Ries crater is a lunar geology site in German farmland; Mauna Kea is an instrument test
site inside a wet grid cell. A score that multiplies every factor together marks them down for climate
and vegetation that their users never cared about.

The all-round score still answers its own question (could a whole base be rehearsed here?) and is not
changed. This second view asks a different one: in which respects does a place match the target, and
what is that good for?

## What it may and may not contain

- No new tuned parameter. Every number is an existing per-factor similarity, or a combination of them
  with the frozen Base weights.
- The frozen sigmas and weights are untouched. `tuning/frozen.json` still governs them.
- The Indonesian candidate sites played no part in designing this view.

## Honest status of the evidence

This is not a clean test. By the time these definitions were written, all 28 known sites, including the
8 hold-out sites, had been scored and their limiting factors read. The definitions below were reasoned
from what each use physically depends on, and for three of them they follow the preset directions
DESIGN.md gave before any data existed. But they were written by someone who had seen the results, and
the numbers that come out of them are development numbers. They show whether the view behaves sensibly.
They do not prove it.

## Dimensions

Five dimensions over the six scoring factors. Each factor belongs to exactly one.

| Dimension | Scoring factors | Similarity |
| --- | --- | --- |
| Geology | Rock type | The rock type similarity (1.0, 0.6 or 0.15) |
| Terrain | Terrain | The terrain similarity (slope and roughness) |
| Climate | Temperature, Dryness | Geometric mean of the two, weighted by their frozen Base weights (0.15 each) |
| Bare ground | Bare ground | The bare ground similarity (NDVI and permanent ice rule) |
| Sunlight | Sunlight | The sunlight similarity |

Each dimension similarity is reported with its percentile among all Earth cells for the same target:
the share of cells it beats or ties. A profile has no veto, no required factor and no minimum coverage.
It reports what is there.

Known weakness, stated before looking: Geology has only three possible values, so a very large number
of cells tie. A geology percentile of 1.0 means "same rock class as the target", which whole provinces
share. The share of tied cells is reported next to it.

## Purposes

Which dimensions each use of an analog site depends on, reasoned from the use itself.

| Purpose | Depends on | Why, in one line |
| --- | --- | --- |
| Instrument and geology testing | Geology | An instrument or a field geologist is tested by the rock in front of them. Outcrops are far smaller than a grid cell, so the cell's climate, light and vegetation do not decide whether the right rock is there. |
| Rover mobility | Terrain, Bare ground | Wheels, suspension and navigation respond to slope, relief and an open surface free of vegetation and ice. Rock chemistry and weather do not move a rover. |
| Ice and resources | Climate, Sunlight, Geology | Ground ice and other volatiles survive where it is cold, dry and poorly lit, and what can be extracted from the ground depends on the host rock. |
| Astrobiology | Climate, Geology, Bare ground | Life at its limits is set by temperature and water and by the mineral substrate. Ground with almost no vegetation is where biology is as sparse as a mission would meet. |
| Full base rehearsal | All five | A crewed base lives with everything at once: ground, rock, weather and light. This is the existing all-round score. |

How these relate to DESIGN.md, which was written before any data: its presets say Rover raises Terrain,
Ice raises Temperature and Rock type, Astrobiology raises Dryness and Rock type. The purposes keep those
and add, by the reasoning in the table, Bare ground to Rover mobility and Astrobiology and Sunlight to
Ice and resources.

A purpose score is the existing formula restricted to the purpose's factors: the frozen Base weights of
those factors, zero for the rest, renormalised, with the same missing-factor rules. Full base rehearsal
therefore equals the all-round Base score exactly.

## The check

1. Each known analog in `data/analogs.json` is labelled with what it is actually used for (`usedFor`),
   each label backed by a cited source (`usedForSource`). The labels were collected by a research agent
   that was shown no scores.
2. For each purpose: do the sites used for it rank higher on that purpose's ranking than they do on the
   all-round score, and higher than the known sites not used for it?
3. For each dimension: do the sites used for a purpose that depends on it rank high on that dimension?
4. Everything is reported as it comes out, with the caveat above.

## Addendum after the first run, 2026-11-14

One definition above was changed after the first run, and only one: the percentile. "Beats or ties" gave
0.96 to sites whose rock class is unrelated to the target, because most Earth cells tie at that lowest
value. The tie-fair mid-rank percentile (share strictly below plus half the ties) is now the figure to
use. It lowers the geology result from 0.90 to 0.59. Dimensions, purposes, their justifications and the
use labels were not touched. Results and their reading: `FINDINGS.md`.

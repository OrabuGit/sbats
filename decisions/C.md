# Session C decisions

Small choices made without stopping to ask, each with a one-line reason. Newest at the bottom.
Larger decisions that belong to the team are raised with the team, not logged here.

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-11-14 | Analog profile: Climate is the geometric mean of Temperature and Dryness weighted by their frozen Base weights (0.15 each). | The team asked for no new tuned parameter; the Base weights already say how the two compare. |
| 2026-11-14 | A purpose score is the existing score formula with the frozen Base weights of the purpose's factors and zero for the rest. | Adds no parameter and makes "full base rehearsal" equal the all-round score exactly. |
| 2026-11-14 | Instrument and geology testing depends on Geology only, not on Bare ground. | An outcrop or quarry is far smaller than a 55 km cell, so cell-wide vegetation does not say whether the rock is reachable. |
| 2026-11-14 | Rover mobility and Astrobiology include Bare ground; Ice and resources includes Sunlight. | Reasoned from each use (open surface for wheels; sparse biology; cold traps follow light). DESIGN.md's preset directions are kept and these are added to them. |
| 2026-11-14 | A dimension percentile is the share of Earth cells beaten or tied; the share tied is reported beside it. | Same definition as the validation percentile. Geology has three levels, so ties must be visible. |
| 2026-11-14 | A profile has no veto, no required factor and no minimum coverage. | It describes what matches; the score already carries the rules for ranking. |
| 2026-11-14 | The "what is it used for" labels for known analogs are collected by a research agent that is shown no scores. | Whoever labels should not know how the sites ranked. |
| 2026-11-14 | Purpose definitions were committed (d12522f) before any per-dimension result was computed. | The team asked for definitions written down before looking at results. |
| 2026-11-14 | Sim: a module parameter with no source makes what depends on it unknown (null), the module "illustrative", and readiness "no data" unless something else is already RED. | The team's rule is never to invent a value; a silent zero would be an invented value. |
| 2026-11-14 | Sim: the heating load is the one effect that is left out with a note, not made unknown, when it has no sourced coefficient. | It is a refinement on top of the habitat's base power; the base figure still stands on its own. |
| 2026-11-14 | Sim: the base starts with one cargo delivery on the ground when it has a usable landing pad, split between water, oxygen and food in proportion to their daily shortfall. | Without a starting stock the sustainability score would be 0 or 30 for every layout; the split makes all three run out together, which is how cargo would be packed. |
| 2026-11-14 | Sim: electrolysis turns only surplus water into oxygen, and only as much as the crew still needs after the greenhouses. | Avoids a tunable "share of water electrolysed" knob. |
| 2026-11-14 | Sim: when power runs short on a day, ice miners are switched off first, then greenhouses; habitats last. | Life support for the crew comes before production. |
| 2026-11-14 | Sim: readiness is null ("no data") when a balance cannot be computed, not GREEN/AMBER/RED. | Matches the project rule that unknown is shown as "no data". |
| 2026-11-14 | Sim: Earth sunlight uses the measured surface value if earth.json carries `insolationKwhM2Day`; otherwise the top-of-atmosphere mean for the latitude, flagged as an upper bound in the site notes and the gap report. | earth.json has no surface sunlight yet (Session B's file); geometry gives an honest bound rather than a guess. |
| 2026-11-14 | Sim: the ice miner is treated as idle on Earth (ice availability 0) with a note, overridable per site. | earth.json has no ground-ice data; "no data" would blank the whole Earth evaluation whenever a miner is placed. |
| 2026-11-14 | Sim: the landing pad is gated on the site's mean slope, with a note that it is a 55 km average. | DESIGN.md asks for the dependence; the note keeps the coarse scale visible. |
| 2026-11-14 | Sim: the greenhouse uses electric lighting; site sunlight reaches it only through the solar arrays. | NASA crop-production figures assume electric lighting; a daylight share would be a new unsourced knob. |
| 2026-11-14 | Layout share string: `1.<crew>.<resupply>.<modules>`, three characters per module (type letter, x and y in base 36), grid 36 x 36, at most 200 modules. | Uses only URL-safe characters, needs no base64, and a 100-module base is 306 characters. |
| 2026-11-14 | Sim unit tests use a catalog of made-up round numbers in `__tests__/fixtures.ts`, marked as fixtures. | Lets every expected value be worked out by hand; real values live only in data/modules.json. |
| 2026-11-14 | Use labels: every use the research agent backed with a fetched source is kept, except the ones it marked "weak" itself. Applied before any purpose result was computed. | A fixed rule, so labels cannot be picked to flatter the result. |

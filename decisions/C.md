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

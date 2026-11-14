# Tuning plan

Written on 2026-11-14, before slope and roughness were in `data/earth.json` and before any tuning
run. `validation/tune.ts` does what this file says. If the two ever disagree, that is a bug in the
script, not a licence to change the plan.

## Rules from the team (2026-11-14)

1. Known analog sites are split about 70/30 into a tuning set and a hold-out set, with a fixed seed.
   Negative controls are split the same way. The split is recorded in `split.json`.
2. Sigmas and preset weights are tuned on the tuning set only. ROC AUC and the top-10% share are then
   reported for the hold-out set next to the tuning-set numbers.
3. The Indonesian candidate sites are never used in tuning or validation. They are the findings.
4. Changes stay small and physically sensible. No weight goes to zero and no factor is allowed to
   dominate. Every value is recorded before and after, with a one-line reason.
5. There is one tuning pass. Afterwards the values are frozen, saved with the date, and not tuned
   again, even if a later result looks worse.
6. Numbers are reported honestly, including if Mars scores worse than the Moon.

## The split

`make_split.py` drew it once with seed 20261114 and refuses to draw it again.

| | Tuning | Hold-out |
| --- | --- | --- |
| Known analog sites | 20 | 8 |
| Negative controls | 4 | 2 |

It is stratified so that both sets hold Moon analogs, Mars analogs, a rainforest and a city.
Hold-out known sites: Askja, Dallol, Etna, Ladakh (Tso Kar), Lonar crater, MDRS Utah, Pilbara North
Pole Dome, Ries crater. Hold-out controls: Jau National Park (Amazon), Singapore.

Disclosure: one provisional run on 2026-11-14 (commit 3c71dad) scored all 28 known sites and 6
controls together, before this split existed and before terrain data existed. Nothing was changed
in response to it. The split was drawn afterwards, in a single draw. So the hold-out sites have been
seen once, on incomplete data, but have never influenced a sigma or a weight.

## How the code keeps the sets apart

- `tune.ts` loads the tuning sites only. It never scores a hold-out site.
- `validate.ts` scores only the tuning set until `frozen.json` exists. After the freeze it scores both.
- `lib.ts` never loads candidate sites for either tool, and the statistics function throws if one is
  passed in. Candidate scores come from `score_candidates.ts`, which refuses to run before the freeze.
- `tune.ts` refuses to run before terrain is in `earth.json` (slope and roughness in at least 80% of
  cells) and refuses to run once `frozen.json` exists. See the addendum for two later preconditions.

## Addendum, 2026-11-14: one void run, and two more preconditions

Added after the plan was first committed. Nothing above or below this section was changed.

- The pass was run once too early. The team's first instruction was to tune when terrain landed; a
  second instruction, to wait for Session B's Antarctica fix as well, arrived while the run was in
  progress. The run accepted no change (every value came out as it went in), touched no source file,
  and scored neither the hold-out set nor the candidate sites. It is void. Its output is kept in
  `void-run-2026-11-14/` with a full account.
- The real pass therefore still lies ahead. It is the same procedure, with the same allowed values,
  objective and acceptance tests. Having seen the void run cannot steer it: there are no choices left
  to make.
- `tune.ts` now also refuses to run unless Bare ground can be computed for at least 80% of the cells
  south of 60 S, and unless it is started with `--team-go`. The team starts the pass; no watcher does.
  (This precondition first read "have NDVI". Session B's fix leaves NDVI null there and supplies the
  measured barren share instead, so the test was corrected to "have NDVI or a barren share" before the
  real pass. It is a precondition only; the search was not touched.)
- Between the void run and the real pass the scoring library gained the team-approved Bare ground and
  permanent ice rule (data/SCHEMA.md), and `earth.json` gained `snowIceFrac` and `barrenFrac`. Tuning-set
  numbers on that data, before any tuning, are kept in `before-tuning/`.
- Approved by the team on 2026-11-14: the disclosed hold-out peek (keep it documented), the 0.03
  threshold, and not searching the three other presets. After tuning, the weights table in DESIGN.md
  section 6 may be updated; nothing else in that file.

## Record of the real pass, 2026-11-14

- Run once, with `--team-go`, after the team confirmed that terrain and the Antarctica fix were both in
  `earth.json` (build 2026-11-14T11:56:02Z).
- 68 alternative values were tried on the tuning set. None raised the objective by 0.03, so none was
  accepted. Every sigma and every weight is frozen at its starting value. The closest was a move of 0.05
  from Terrain to Sunlight, with a gain of 0.020.
- So the honest count is: one run before the Antarctica fix, which accepted no changes and was voided,
  and one real pass after it, which also accepted no changes and is the frozen result.
- The hold-out set was scored for the first time on complete data after the freeze. Results and the full
  before-and-after table are in `FROZEN.md`.

## What may change

Six tolerances, each shared by all targets, and the Base weights.

| Parameter | Start | Values that may be tried | Why these bounds |
| --- | --- | --- | --- |
| `tempMean` sigma | 15 C | 10, 15, 20, 25, 30 | At most twice the start. 30 C is a third of Earth's range. |
| `tempRange` sigma | 5 C | 3, 5, 7.5, 10 | At most twice the start. 10 C is half of Earth's range. |
| `precip` sigma | 250 mm/year | 125, 250, 375, 500 | 250 and 500 are Meigs' arid and semi-arid limits. |
| `ndvi` sigma | 0.1 | 0.05, 0.1, 0.15, 0.2 | At 0.2, shrub and grass (0.2 to 0.3) sit one sigma from bare ground. No wider. |
| Terrain sigma, as a fraction of the target's slope and roughness | 0.5 | 0.35, 0.5, 0.75, 1.0 | At 1.0, a site with twice the target slope is one sigma away. |
| Sunlight sigma | 15 degrees | 10, 15, 22.5, 30 | At most twice the start. |
| Base weights | DESIGN.md table | moves of 0.05 from one factor to another, at most two moves, every weight kept between 0.05 and 0.30 | Small changes; nothing goes to zero; nothing above 0.30. |

Target values are never changed. Only tolerances and weights.

The three other presets are not searched. The validation sites carry no mission-type label, so
searching each preset against the same objective would only pull all four towards the same weights.
They follow Base by the fixed differences they had before tuning, then are clipped at 0.05 and
rescaled to sum to 1:

| Preset | Difference from Base |
| --- | --- |
| Rover | Terrain +0.15; Dryness, Temperature, Rock type -0.05 each |
| Ice | Temperature +0.15, Rock type +0.10; Terrain -0.10; Bare ground, Dryness, Sunlight -0.05 each |
| Astrobiology | Dryness +0.15, Rock type +0.15; Terrain -0.15; Bare ground, Temperature, Sunlight -0.05 each |

## The objective

One number, on the tuning set, with the Base weights:

    objective = ( strict ROC AUC + mean percentile of known analogs ) / 2

Strict AUC measures known analogs against the negative controls. The mean percentile measures them
against every land cell on Earth. The top-10% share is reported but not optimised: with 20 sites it
moves in steps of 5 points and is too coarse to steer by.

## The procedure

1. Score the tuning set with the starting values. That is the baseline.
2. Two sweeps over the six tolerances, always in the order of the table above. For each one, try
   every other value on its list with everything else held fixed. Take the best value if it passes
   both tests below; otherwise leave the tolerance where it is. On a tie, take the value closer to
   the start.
3. Then at most two moves of 0.05 between Base weights, each chosen as the best single move that
   passes both tests. Stop at the first round in which no move passes.
4. Derive the three other presets from the tuned Base.
5. Write `frozen.json` (before, after, every accepted change) and `tuning-log.json` (every value
   tried and why it was accepted or rejected).

The two tests for accepting a change:

- It raises the objective by at least 0.03. A self-test on made-up random cells, where every gain is
  noise by construction, produced an accepted gain of 0.02 at a threshold of 0.01. The threshold was
  raised to 0.03 before any real tuning run.
- It does not raise the largest limiting-factor share: the share of tuning-set cases in which one
  single factor is the limiting factor. This is the guard against one factor dominating.

A human then writes the one-line physical reason for each accepted change into `FROZEN.md`. If a
change passes both tests but has no sensible physical reading, it is dropped and that is recorded.

## After the pass

1. Copy the frozen values into `validation/build/make_targets.py`, `app/src/lib/scoring/presets.ts`
   and `sunlight.ts`. Regenerate `data/targets.json`. A unit test checks that they match
   `frozen.json`, so a later quiet change fails the build.
2. Run `npx tsx validation/validate.ts` once for each preset. It now scores the hold-out set.
3. Report tuning-set and hold-out numbers side by side, and Moon against Mars, whatever they are.
4. Run `npx tsx validation/score_candidates.ts` for the Indonesian sites.

There is no step 5. If the hold-out numbers are disappointing, they are reported as they are.

# SBATS scoring library

Pure TypeScript. No UI, no file access, no network. It implements the Method page and every scoring
rule in `data/SCHEMA.md`. Code generated with AI assistance (Claude Code), directed and reviewed by the
team; see `AI_USE.md`.

The app reaches this folder only through `app/src/lib/scoringAdapter.ts`. The exported names below are a
contract with that file: do not rename them without telling Session A.

## How to use it

```ts
import { PRESETS, computeEarthRanges, prepareTarget, scoreCells, scoreCell } from './scoring';

const ranges = computeEarthRanges(earth.cells);                  // once per earth.json
const prepared = prepareTarget(target, ranges, lithologyTable);  // once per target (table may be null)
const summaries = scoreCells(earth.cells, prepared, PRESETS.base.weights); // heatmap
const detail = scoreCell(cell, prepared, PRESETS.base.weights);  // dossier
```

| Export | Returns |
| --- | --- |
| `PRESETS`, `PRESET_IDS` | Base, Rover, Ice, Astrobiology. Weights only. |
| `computeEarthRanges(cells)` | Earth's observed minimum and maximum per factor, used for clamping. |
| `prepareTarget(target, ranges, table)` | Clamped target values, `missingTargetKeys`, `gaps`, `warnings`. |
| `scoreCells(cells, prepared, weights)` | One `{ score, coverage, missing, confidence, unscoredReason }` per cell. |
| `scoreCell(cell, prepared, weights)` | The same five fields plus `breakdown`, `limitingFactor`, `reason`. |
| `describeGap(gap, prepared)` | One sentence for "what Earth cannot copy", from a clamped target value. |
| `validateLithologyTable(table, classes)` | List of problems in `lithology_similarity.json`. Empty when valid. |
| `nearestCell(cells, lat, lon)` | The cell closest to a site, for snapping `analogs.json` entries. |
| `FACTORS`, `KEY_INFO`, `MIN_COVERAGE`, ... | The constants behind the rules, for the Method page. |

## The formula, exactly as coded

Six scoring factors are built from seven data keys plus one computed quantity.

| Factor | Keys | Similarity |
| --- | --- | --- |
| Terrain | `slope`, `roughness` | Gaussian per key |
| Bare ground | `ndvi`, with `snowIceFrac` and `barrenFrac` | Gaussian times ice-free share, or barren share (step 3a) |
| Dryness | `precip` | Gaussian |
| Temperature | `tempMean`, `tempRange` | Gaussian per key |
| Sunlight | `sunElevation` (computed) | Gaussian |
| Rock type | `lithology` | Lookup table |

1. Clamp. Each target value `t` is clamped to Earth's observed range for that key (the minimum and maximum
   over the cells of `earth.json`). The unclamped value is kept and the difference is reported in `gaps`.
2. Key similarity. `s = exp(-0.5 * ((x - t) / sigma)^2)`, where `x` is the cell value, `t` the clamped
   target and `sigma` the tolerance from `targets.json`.
3. Rock type. Not Gaussian. Same class gives `levels.same`, otherwise `levels[relation]` of the pair in
   `lithology_similarity.json` (1.0, 0.6, 0.15). A pair that is not listed throws `LithologyPairError`.
3a. Bare ground and permanent ice. One rule for every cell: the similarity is the share of the cell's
   ground that is exposed and ice-free.
   - `ndvi` present: `s = exp(-0.5 * ((ndvi - t) / sigma)^2) * (1 - snowIceFrac)`. A `null` `snowIceFrac`
     counts as 0.
   - `ndvi` is `null` (every cell south of 60 S): `s = barrenFrac`, used directly. No Gaussian and no
     target value. It is not multiplied by `(1 - snowIceFrac)` again.
   - both `null`: Bare ground is missing.
   A cell that is all permanent ice gets `s = 0`, so its score is 0: scored and ranked, not "no data".
   The result carries `bareGroundSource`: `"ndvi"`, `"landCover"` or `null`. `ndvi` is not listed in
   `missing` when the barren share stood in for it.
4. Weights. The preset weights are normalised to sum to 1. Each factor's weight is split equally over its
   keys, so in a two-key factor each key carries half.
5. Missing keys. A key is missing when the cell value is `null` or the target value is `null`. Missing keys
   are left out. `coverage` is the sum of the weights of the keys that are present.
6. Limits. If Bare ground (step 3a) or `precip` is missing the cell has no score (`required-factor-missing`). If coverage
   is below 0.6 the cell has no score (`coverage-too-low`). Coverage is rounded to 9 decimals before the
   comparison so that floating-point sums such as 0.2 + 0.15 + 0.15 + 0.1 count as 0.6.
7. Score. `score = 100 * exp( sum(w_k * ln s_k) / sum(w_k) )` over the present keys `k`. This is 100 times
   the weighted geometric mean, renormalised over what is present. One similarity near 0 pulls the whole
   score near 0: that is the veto.
8. Confidence. `high` if coverage is 1, `medium` if at least 0.8, otherwise `low`. `null` when unscored.
9. Limiting factor. The factor with the most negative `sum(w_k * ln s_k)`, that is, the one that lowers
   the score the most. `null` for a perfect match or an unscored cell.

Gravity, vacuum and radiation never enter the score.

### Sunlight

`sunElevation` is the annual mean noon Sun elevation in degrees, from latitude and the body's axial tilt
(Earth 23.44, Mars 25.19, Moon 1.54 degrees; see `SOURCES.md`). The same code runs for all three bodies:

    for each degree of solar longitude L from 0 to 359:
        d = asin( sin(tilt) * sin(L) )
        h = max(0, 90 - |lat - d|)
    sunElevation = mean of h

A noon with the Sun below the horizon counts as 0, so polar night lowers the mean. That is how the
seasonal light pattern enters. Tolerance: 15 degrees (`SUN_ELEVATION_SIGMA_DEG`), a design parameter.

Known limits of this factor:
- Every degree of solar longitude gets equal time (circular orbit). Mars' orbit is eccentric.
- Smooth sphere. Topography is ignored, so the near-continuous light on lunar polar ridges and the
  permanent shadow in polar craters are not represented. Show those under "what Earth cannot copy".
- No atmosphere, cloud or day length.

### Mission presets

| Preset | Terrain | Bare ground | Dryness | Temperature | Sunlight | Rock type |
| --- | --- | --- | --- | --- | --- | --- |
| Base | 0.25 | 0.20 | 0.15 | 0.15 | 0.10 | 0.15 |
| Rover | 0.40 | 0.20 | 0.10 | 0.10 | 0.10 | 0.10 |
| Ice | 0.15 | 0.15 | 0.10 | 0.30 | 0.05 | 0.25 |
| Astrobiology | 0.10 | 0.15 | 0.30 | 0.10 | 0.05 | 0.30 |

Base is the table on the Method page. The other three follow its one-line rule and are a starting guess written by
Session C. They need the team's sign-off, and may be tuned once against the validation set, then frozen.

## Analog profile and purpose rankings (a second view)

Added on 2026-11-14, after validation showed that the all-round score under-ranks sites known for one
dimension only. It adds no tuned parameter and does not change the frozen score. Definitions and the
honest results are in `validation/purposes/DEFINITIONS.md` and `FINDINGS.md`. In short: it describes a
site well, but it is **not validated**, and the Geology dimension is weak at 0.5 degrees.

```ts
import { DIMENSIONS, PURPOSES, analogProfile, buildProfileIndex, purposeWeights, scoreCells } from './scoring';

const index = buildProfileIndex(earth.cells, prepared);        // once per target
const profile = analogProfile(cell, prepared, index);          // five dimensions for the dossier
const mobility = scoreCells(earth.cells, prepared, purposeWeights('mobility')); // a purpose ranking
```

| Export | Returns |
| --- | --- |
| `DIMENSIONS` | geology, terrain, climate (temperature and dryness), bareGround, sunlight, with the factors in each. |
| `PURPOSES` | geology, mobility, ice, astrobiology, base: label, the dimensions each depends on, and a one-line `why`. |
| `analogProfile(cell, prepared, index)` | Per dimension: `similarity` (0 to 1), `midPercentile` (tie-fair rank among Earth cells, chance 0.5), `shareAbove`, `shareTied`. |
| `dimensionSimilarities(cell, prepared)` | The five similarities alone. |
| `purposeWeights(id)` | The frozen Base weights of the purpose's factors, zero elsewhere. Pass to `scoreCells` or `scoreCell`. `purposeWeights('base')` is the Base preset. |
| `factorSimilarities(cell, prepared)` | The six per-factor similarities with no weights or limits. |

Rules for showing it:
- Use `midPercentile`, not `percentile`. The older "beats or ties" figure flatters values that tie with
  most of the Earth.
- For Geology show the level in words (same, related, unrelated). It has three values, so a rank says little.
- A profile has no veto and no "no data" rule. A forest can show a perfect terrain match. That is the point.
- Label purpose rankings as not validated.

## Tests

159 tests in `__tests__/` (rules, the analog profile and purposes, and checks of the real files in `/data`), run with Node's built-in test runner:

```bash
npx tsx --test app/src/lib/scoring/__tests__/*.test.ts
```

Run from the repository root. They cover the Gaussian formula, clamping, the weighted geometric mean, the
veto, the presets, the bare-ground and permanent-ice rule (both branches and the all-ice case), the
lithology table and its validation, leave-out and renormalise, both required
factors, the 0.6 coverage limit at the boundary, the three confidence levels at their boundaries, the
contents of `missing`, the half-weight rule for two-key factors, `null` target values, the limiting
factor and the plain-language reason. `data-files.test.ts` checks the real files in `/data` against the
contract and skips the checks for files that do not exist yet.

The tests use `node:test` rather than Vitest so that nothing has to be added to `app/package.json`.
`__tests__/node-shims.d.ts` declares the few Node functions they import, because the app's `tsconfig.json`
loads only `vite/client` types. `__tests__/fixtures.ts` holds made-up numbers for tests only.

## Rank stability (added 2026-11-15, changes no score)

Does a place keep its rank when the weights are nudged? The preset weights are a judgement, so a rank
that holds only for one exact set of weights means little.

```ts
import { stabilityBasis, rankStability, scoresFromBasis } from './lib/scoring';

const basis = stabilityBasis(cells, prepared);            // once per target, about 50 ms for the Earth grid
const result = rankStability(basis, PRESETS.base.weights, { follow: [cellIndex] });   // about 0.7 s
result.summary           // one plain sentence
result.meanTopNOverlap   // share of the top 10 that stays in the top 10, averaged over the redraws
result.followed[0]       // { baseRank, bestRank, medianRank, worstRank, rankP05, rankP95, shareInTopN }
```

- 200 redraws, seed 20261115, each weight multiplied by a factor between 0.75 and 1.25 and then all
  renormalised (`STABILITY_DRAWS`, `STABILITY_SEED`, `STABILITY_SPREAD`). The same seed gives the same
  result on every machine.
- `follow` is a list of cell indices; without it the top 10 cells are followed.
- Each redraw scores every cell with the frozen formula. `scoresFromBasis` is a fast path for that:
  the unit tests check it against `scoreCells` cell by cell, on every preset.
- The frozen weights are read, never written. This is a check on the ranking, not a tuning tool: no
  redraw is ever kept.

Run it in a worker or after first paint: it is fast, but not free.


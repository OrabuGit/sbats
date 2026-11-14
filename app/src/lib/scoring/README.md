# SBATS scoring library

Pure TypeScript. No UI, no file access, no network. It implements DESIGN.md section 6 and every scoring
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
| Bare ground | `ndvi` | Gaussian |
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
4. Weights. The preset weights are normalised to sum to 1. Each factor's weight is split equally over its
   keys, so in a two-key factor each key carries half.
5. Missing keys. A key is missing when the cell value is `null` or the target value is `null`. Missing keys
   are left out. `coverage` is the sum of the weights of the keys that are present.
6. Limits. If `ndvi` or `precip` is missing the cell has no score (`required-factor-missing`). If coverage
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

Base is the DESIGN.md table. The other three follow its one-line rule and are a starting guess written by
Session C. They need the team's sign-off, and may be tuned once against the validation set, then frozen.

## Tests

98 unit tests in `__tests__/`, run with Node's built-in test runner:

```bash
npx tsx --test app/src/lib/scoring/__tests__/*.test.ts
```

Run from the repository root. They cover the Gaussian formula, clamping, the weighted geometric mean, the
veto, the presets, the lithology table and its validation, leave-out and renormalise, both required
factors, the 0.6 coverage limit at the boundary, the three confidence levels at their boundaries, the
contents of `missing`, the half-weight rule for two-key factors, `null` target values, the limiting
factor and the plain-language reason. `data-files.test.ts` checks the real files in `/data` against the
contract and skips the checks for files that do not exist yet.

The tests use `node:test` rather than Vitest so that nothing has to be added to `app/package.json`.
`__tests__/node-shims.d.ts` declares the few Node functions they import, because the app's `tsconfig.json`
loads only `vite/client` types. `__tests__/fixtures.ts` holds made-up numbers for tests only.

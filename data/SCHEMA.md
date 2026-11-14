# SBATS data contract

Shared contract for the files in `/data`. Three parallel sessions build against this document.
If the code and this file disagree, this file wins until it is changed (see "Changing the contract").

Read with DESIGN.md (sections 6, 7, 9, 11) and JUDGING.md (acceptance rules for DATA and LOGIC).

## Conventions (all files)

- JSON, UTF-8, English. Keys are camelCase exactly as written here.
- Coordinates: WGS84 decimal degrees. `lat` from -90 to 90, north positive. `lon` from -180 to 180, east positive.
  For Moon and Mars targets, `lat`/`lon` are planetocentric, east positive, in the same ranges.
- Unknown values are `null`. Never `0`, `-9999`, `NaN`, an empty string or a guessed number.
  The UI shows `null` as "no data".
- `badge` is exactly one of `"Measured"`, `"Mission"`, `"Literature"`:
  - Measured: computed from a dataset.
  - Mission: measured by a spacecraft or rover.
  - Literature: taken from a paper, labelled as an estimate.
- `source` is a short human-readable citation that matches a row in `SOURCES.md`
  (dataset name and provider, or author/year plus URL or DOI for a paper).
- `id` values are lowercase kebab-case, unique within their file, and never change once committed
  (share links and validation results depend on them).

## Factor keys

One set of seven keys is used in all three files. A target value and an Earth cell value with the same key
are always in the same unit and computed the same way.

| Key | Meaning | Unit | Notes |
| --- | --- | --- | --- |
| `tempMean` | Annual mean surface or near-surface temperature | °C | |
| `tempRange` | Mean day-night temperature swing | °C | |
| `precip` | Annual precipitation | mm/year | Moon and Mars targets use 0 |
| `ndvi` | Annual mean NDVI | unitless, -1 to 1 | Moon and Mars targets are bare ground |
| `slope` | Mean slope within the cell | degrees | Same window and formula on Earth, Moon and Mars |
| `roughness` | Standard deviation of elevation within the cell | m | Same window and formula on Earth, Moon and Mars |
| `lithology` | Dominant rock class | integer class code | Categorical. See "Lithology" below |

The unit in `earth.json` `meta.factors[].unit` is authoritative. Session C writes target values in that unit.

These seven keys are data fields, not the six scoring factors of DESIGN.md section 6. The mapping is owned by
`/app/src/lib/scoring`:

| Scoring factor (DESIGN.md) | Data keys |
| --- | --- |
| Terrain | `slope`, `roughness` |
| Bare ground | `ndvi` |
| Dryness | `precip` |
| Temperature | `tempMean`, `tempRange` |
| Rock type | `lithology` |
| Sunlight | none: computed in the browser from `lat` and season |

### Lithology

- Stored as an integer class code so that every factor field is numeric.
- The code legend lives in the `lithology` entry of `meta.factors` as
  `classes: [{ code, label }]`. Session B defines it from the source lithology dataset. Do not invent classes.
- Published legend (Session B, 2026-11-14). Source: GLiM v1.0 global lithological map, 0.5 degree grid
  (Hartmann & Moosdorf 2012, doi:10.1594/PANGAEA.788537, CC BY 3.0). Codes are the raster values of the
  published grid. Labels are the first-level GLiM classes. `abbr` is the GLiM abbreviation, also written
  to each `classes` entry as an extra key.

  | code | abbr | label |
  | --- | --- | --- |
  | 1 | su | Unconsolidated sediments |
  | 2 | vb | Basic volcanic rocks |
  | 3 | ss | Siliciclastic sedimentary rocks |
  | 4 | pb | Basic plutonic rocks |
  | 5 | sm | Mixed sedimentary rocks |
  | 6 | sc | Carbonate sedimentary rocks |
  | 7 | va | Acid volcanic rocks |
  | 8 | mt | Metamorphics |
  | 9 | pa | Acid plutonic rocks |
  | 10 | vi | Intermediate volcanic rocks |
  | 12 | py | Pyroclastics |
  | 13 | pi | Intermediate plutonic rocks |
  | 14 | ev | Evaporites |
  | 16 | ig | Ice and glaciers |

  Codes 11 (water bodies) and 15 (no data) exist in GLiM but are not rock classes: cells with those values
  have `lithology: null`, and the codes never appear in `earth.json`. That leaves 14 classes and 91 pairs
  for `lithology_similarity.json`. Each cell holds the single class of the authors' 0.5 degree grid, so a
  small volcanic edifice inside a cell of mostly sediment reads as sediment (the Kawah Ijen cell is 1,
  the Merapi cell is 10).
- Targets use the same codes in `values.lithology.value`.
- Codes are labels, not quantities: the distance between two codes means nothing.
  Lithology is therefore the one factor that does not use the Gaussian rule. Its similarity is looked up in
  `data/lithology_similarity.json` (approved by the team on 2026-11-14):
  - same class as the target: 1.0
  - related class (for example basalt and andesite, both volcanic): 0.6
  - unrelated class: 0.15. Not zero, so rock type alone never vetoes a site.
  - `null` lithology in the cell: the Rock type factor is left out under the general rule in
    "Missing values and confidence" below.

## data/earth.json

Owner: Session B. Built by `/pipeline`, never edited by hand.

```
{
  "meta": {
    "resolutionDeg": number,
    "factors": [
      { "key": string, "label": string, "unit": string, "source": string, "badge": string }
    ],
    "generatedAt": string
  },
  "cells": [
    { "lat": number, "lon": number, "<factor key>": number | null, ... }
  ]
}
```

`meta`
- `resolutionDeg`: cell size in degrees. `0.5` for the global scan.
- `factors`: one entry per factor key, all seven present, in the order of the table above.
  - `key`: one of the seven factor keys.
  - `label`: short display name, for example `"Mean temperature"`.
  - `unit`: display unit, for example `"°C"`. Empty string for unitless.
  - `source`: dataset the factor was computed from.
  - `badge`: `"Measured"` for everything computed by the pipeline.
  - `classes`: only on `lithology`. `[{ "code": integer, "label": string }]`.
- `generatedAt`: ISO 8601 UTC timestamp of the build, for example `"2026-11-14T12:00:00Z"`.

`cells`
- One object per land cell. Ocean cells are omitted.
- `lat`, `lon`: the cell centre. On the 0.5 degree grid these end in .25 or .75
  (for example `-7.75`, `110.25`).
- Every cell has all seven factor keys. A factor that is not built yet, or has no data in that cell, is `null`.
  A key is never left out.
- Each (lat, lon) pair appears once. Order is not guaranteed: consumers must not depend on it.
- Round to the precision the source supports (2 decimals is enough for every factor) to keep the file small.

Example (illustrative numbers, not real data):

```json
{
  "meta": {
    "resolutionDeg": 0.5,
    "factors": [
      { "key": "tempMean", "label": "Mean temperature", "unit": "°C", "source": "NASA POWER climatology", "badge": "Measured" }
    ],
    "generatedAt": "2026-11-14T12:00:00Z"
  },
  "cells": [
    { "lat": -7.75, "lon": 110.25, "tempMean": 0.0, "tempRange": 0.0, "precip": 0.0, "ndvi": 0.0, "slope": null, "roughness": null, "lithology": null }
  ]
}
```

### Land cover keys (added 2026-11-14, requested by the team)

Every cell also carries two measured land cover shares. They are not factor keys and have no entry in
`meta.factors`; they are described in `meta.landCover` (`source`, `keys`, `method`).

| Key | Meaning | Unit |
| --- | --- | --- |
| `snowIceFrac` | Share of the cell's land classed as permanent snow and ice (IGBP class 15) | fraction, 0 to 1 |
| `barrenFrac` | Share of the cell's land classed as barren or sparsely vegetated (IGBP class 16) | fraction, 0 to 1 |

- Source: MODIS MCD12C1 v061 yearly land cover, 0.05 degree, 2025 (NASA LP DAAC). Badge: Measured.
- Value: mean of the class percent over the cell's land pixels, divided by 100. `null` if the product has
  no data for the cell (no such cell in the current build).
- Why they exist: the NDVI product (MOD13C2) has no retrievals over Antarctica, so `ndvi` is `null` for
  every cell south of 60 S (25,225 cells in all). `ndvi` is never filled with a stand-in number.
  The scoring rule below uses these shares instead. See "Bare ground without NDVI".
- The example cell above predates these keys. A real cell looks like
  `{ "lat": -77.75, "lon": 161.75, ..., "ndvi": null, ..., "snowIceFrac": 0.847, "barrenFrac": 0.148 }`.

Additive rule: Session B may add other keys to `meta` (for example data date ranges for the Method page).
Consumers ignore keys they do not know. A finer Indonesia grid, if built, is a separate file with this same
shape and its own `resolutionDeg`; add it to this document before another session reads it.

## data/targets.json

Owner: Session C. Hand-curated from cited sources.

```
[
  {
    "id": string,
    "name": string,
    "body": "moon" | "mars",
    "lat": number,
    "lon": number,
    "summary": string,
    "values": {
      "<factor key>": { "value": number | null, "sigma": number | null, "source": string | null, "badge": string | null }
    },
    "cannotCopy": [ string ]
  }
]
```

- `id`: for example `"moon-shackleton-rim"`, `"mars-jezero"`.
- `name`: display name, for example `"Shackleton rim"`.
- `summary`: one or two plain sentences on why this is a candidate base or landing site.
- `values`: all seven factor keys present.
  - `value`: the real target value in the unit from `earth.json` `meta.factors`. Store it unclamped.
    Clamping to Earth's observed range happens in the scoring library at run time, so the true gap can be
    shown under "what Earth cannot copy".
  - `sigma`: the tolerance in the Gaussian similarity, same unit as `value`, greater than 0.
    `null` for `lithology`, which uses the similarity table instead.
  - `source`, `badge`: where `value` comes from. `"Mission"` or `"Literature"` for almost every target value.
  - If the value is unknown, set `value`, `sigma`, `source` and `badge` to `null`. The scoring library must
    handle a `null` target value without crashing.
- `cannotCopy`: plain-language sentences, one per condition Earth cannot reproduce at this target.
  Always covers gravity, vacuum or thin atmosphere, and radiation. These never enter the score.
  Any number quoted inside a sentence must name its source in the same sentence.

## data/analogs.json

Owner: Session C. The validation set and the headline candidates.

```
[
  {
    "id": string,
    "name": string,
    "lat": number,
    "lon": number,
    "kind": "known" | "negative" | "candidate",
    "analogFor": [ string ],
    "source": string
  }
]
```

- `kind`:
  - `"known"`: established analog site from the literature. Positive validation set.
  - `"negative"`: negative control (rainforest, city). Must rank low.
  - `"candidate"`: new SBATS candidate, for example the Indonesia deep-dive sites. The headline, not validation.
- `analogFor`: target `id`s from `targets.json`. Empty array for `"negative"`. Every id must exist in `targets.json`.
- `source`: citation for the site's analog status (`"known"`), for why it is a control (`"negative"`),
  or for the evidence behind the candidate (`"candidate"`).
- `lat`, `lon`: the site itself. Consumers snap to the nearest `earth.json` cell.

## data/lithology_similarity.json

Owner: Session C. Hand-curated. It can only be written once Session B has published the lithology
`classes` legend in `earth.json`, because it is keyed by those codes.

```
{
  "levels": { "same": 1.0, "related": 0.6, "unrelated": 0.15 },
  "pairs": [
    { "a": integer, "b": integer, "relation": "related" | "unrelated", "justification": string, "source": string | null }
  ]
}
```

- `levels`: the three similarity values. The scoring library reads them from here and does not hard-code them.
- `pairs`: one entry for every unordered pair of two different class codes from the legend, with `a` < `b`.
  The table is symmetric: (a, b) and (b, a) are the same pairing.
  - `relation`: which level applies. The similarity is `levels[relation]`. There are no per-pair numbers.
  - `justification`: one short sentence on why the two classes are related or unrelated
    (shared origin, composition or process).
  - `source`: citation if the grouping comes from a reference, otherwise `null`.
- Same class (a equals b) is always `levels.same` and is not listed.
- Every pair must be listed. A missing pair is an error caught by a unit test, not a silent default.
- Session A renders the whole table, with justifications, on the Method page.

## Missing values and confidence

Approved by the team on 2026-11-14. Implemented in `/app/src/lib/scoring` (Session C), shown by Session A.

A scoring factor that cannot be computed for a cell is left out, and the weights of the remaining factors
are renormalised to sum to 1. Two limits apply:

1. Required factors. Bare ground and `precip` (Dryness) must be present. They carry the veto that
   rules out forests and wet regions. A cell missing either gets no score: it is shown as "no data" and is
   never ranked. Bare ground is present when `ndvi` is not `null`, or when `ndvi` is `null` and
   `barrenFrac` is not `null` (see "Bare ground without NDVI").
2. Minimum coverage. The present factors must add up to at least 0.6 of the total weight of the active
   mission preset. Below that, no score.

Bare ground without NDVI. Requested by the team on 2026-11-14, so that Antarctica can be scored from real
data. It applies only to cells where `ndvi` is `null`:

- The Bare ground similarity is `barrenFrac`, used directly as a similarity from 0 to 1. No Gaussian and no
  target value are involved: the Moon and Mars targets are bare ground, and `barrenFrac` is the measured
  share of the cell that is bare ground.
- A cell that is all permanent ice has `barrenFrac` 0, so its Bare ground similarity is 0 and, through the
  geometric mean, its score is 0. This is the "permanent ice" veto of DESIGN.md section 6: ice is not
  regolith. An ice-free barren cell has `barrenFrac` near 1 and scores as bare.
- The factor counts as present, with its full weight, for coverage and confidence. `ndvi` is not listed in
  `missing`. The result should carry `bareGroundSource`: `"ndvi"` or `"landCover"`, so the dossier can say
  which measurement was used.
- If `ndvi` and `barrenFrac` are both `null`, the cell has no score, as before.
- What this does at 0.5 degrees: of the 25,225 cells without NDVI, 24,353 have `barrenFrac` 0, and the
  highest value is 0.148, in the McMurdo Dry Valleys cell at -77.75, 161.75. The Dry Valleys are small
  ice-free valleys inside cells that are mostly ice, so they get a low score, not a high one. Showing them
  as a strong analog needs a finer grid.
- Not changed: cells that do have `ndvi` are scored from `ndvi` alone, as before. This includes 3,101 cells
  that are at least half permanent ice (mostly Greenland), where NDVI is near 0 and so reads as bare.
  Applying `snowIceFrac` to those cells too would be a change to the scoring formula and needs the
  user's approval.

Coverage is measured with the preset's weights before renormalising, so it changes with the preset.
A two-key factor with one key missing counts for half its weight (see "Settled details").
Sunlight is computed from latitude and is always present.

Result contract. For each cell the scoring library returns:

```
{
  "score": number | null,
  "coverage": number,
  "missing": [ string ],
  "confidence": "high" | "medium" | "low" | null,
  "unscoredReason": "required-factor-missing" | "coverage-too-low" | null
}
```

- `score`: 0 to 100, or `null` when the cell is not scored.
- `coverage`: share of the preset's total weight that was present, 0 to 1.
- `missing`: the factor keys (data keys, for example `"lithology"`) that were left out. Empty when nothing is missing.
- `confidence`: `"high"` if coverage is 1, `"medium"` if coverage is at least 0.8, otherwise `"low"`.
  `null` when the cell is not scored.
- `unscoredReason`: why `score` is `null`, otherwise `null`. Added so the UI can say why a cell has no data.

With the Base preset weights, a cell missing only Rock type (0.15) has coverage 0.85 and is medium.
A cell missing only Terrain (0.25) has coverage 0.75 and is low. A cell missing only `roughness` has
coverage 0.875 and is medium.

UI requirements (Session A):
- Show the confidence badge next to every score.
- List the missing factors in the dossier.
- Show a note on each target listing the factors that have no published value.
- The top candidates list includes only high and medium confidence cells by default.
- Document this rule on the Method page, exactly as coded.

Tests (Session C): unit tests cover leave-out and renormalise, both required factors, the 0.6 coverage
limit at the boundary, the three confidence levels at their boundaries, the contents of `missing`,
the half-weight case for two-key factors, and a `null` target value.

## Ownership

| Session | Owns | Does not touch |
| --- | --- | --- |
| A | `/app`, except `/app/src/lib/scoring` | `/pipeline`, `/data`, `/validation`, `/app/src/lib/scoring` |
| B | `/pipeline`, `data/earth.json` | `/app`, `/validation`, `data/targets.json`, `data/analogs.json`, `data/lithology_similarity.json` |
| C | `data/targets.json`, `data/analogs.json`, `data/lithology_similarity.json`, `/app/src/lib/scoring`, `/validation` | the rest of `/app`, `/pipeline`, `data/earth.json` |

Rules:
- Edit only what you own. If you need a change in another session's area, write it down for that session
  instead of making it.
- Session A consumes the scoring library through its exported functions and reads all three data files.
  It does not reimplement scoring.
- Until real files exist, each session may work against a small fixture that follows this contract.
  Fixtures live inside the session's own area and are clearly named as fixtures. They are never shown as real
  data on the live site.
- Shared root files (`SOURCES.md`, `AI_USE.md`, `README.md`): append rows only, do not reorder or rewrite
  other sessions' rows. This keeps merges clean.
- `data/modules.json` is not covered here. It is added to this document when the sandbox checkpoint starts.

## Changing the contract

1. Change this file first, in its own commit with a message starting `schema:`.
2. Then change the producer, then the consumers.
3. Adding an optional key is fine. Renaming or removing a key, or changing a unit, needs the user's approval.

## Settled details

The contract is settled as of 2026-11-14. These choices close the last gaps. They are decisions, not
questions: build against them.

- Two-key factors. Terrain uses `slope` and `roughness`. Temperature uses `tempMean` and `tempRange`.
  Each key carries half of its factor's weight. With both keys present, the factor similarity is the
  geometric mean of the two key similarities.
  - One key missing: the factor is scored from the key that is present, only half of the factor's weight
    counts as covered, and the absent key is listed in `missing`. The factor enters the renormalised mean
    with that half weight.
  - Both keys missing: the whole factor is dropped and both keys are listed in `missing`.
- Missing target value. A factor with a `null` target value is treated as missing for every cell of that
  target, under the same limits and confidence levels. Session A shows a note on the target itself listing
  the factors that have no published value, taken from the `null` entries in `values`.
- Terrain method. All three elevation models are resampled to the same ground spacing, the coarsest of the
  three, before any metric is computed. `slope` is the mean slope in degrees. `roughness` is the standard
  deviation of elevation in metres. The window is one grid cell on Earth and the same ground area centred
  on the target on the Moon and Mars. Session B records the spacing and window in `meta.factors` labels
  and in `SOURCES.md`.

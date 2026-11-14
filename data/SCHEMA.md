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
| `roughness` | Terrain roughness within the cell | set by Session B in `meta.factors` | Same window and formula on Earth, Moon and Mars |
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
- Targets use the same codes in `values.lithology.value`.
- Codes are labels, not quantities: the distance between two codes means nothing.
  Lithology is therefore the one factor that does not use the Gaussian rule. Its similarity is looked up in
  `data/lithology_similarity.json` (approved by the team on 2026-11-14):
  - same class as the target: 1.0
  - related class (for example basalt and andesite, both volcanic): 0.6
  - unrelated class: 0.15. Not zero, so rock type alone never vetoes a site.
  - `null` lithology in the cell: the Rock type factor is left out for that cell, the remaining weights are
    renormalised to sum to 1, and the score is flagged as lower confidence.

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
- A score computed without the Rock type factor carries a lower-confidence flag in the scoring library's
  result. Session A shows that flag next to the score.
- Session A renders the whole table, with justifications, on the Method page.

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

## Open points

- Missing values in factors other than lithology. The leave-out-and-renormalise rule is approved for
  lithology only. Whether a cell with a `null` in another factor is scored the same way or shown as
  "no data" has not been decided. Until it is, Session C does not score such cells.
- A target whose own lithology is `null`. Not covered by the approved rule. Until decided, Session C leaves
  Rock type out for every cell of that target and flags all its scores as lower confidence.
- `roughness` definition and unit, and the `slope` window: Session B picks one method that can be run on
  SRTM or Copernicus DEM, LOLA and MOLA alike, records it in `meta.factors`, and tells Session C before
  target terrain values are written.

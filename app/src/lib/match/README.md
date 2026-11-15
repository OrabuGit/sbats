# Match record and report (`app/src/lib/match`)

Pure TypeScript, no UI, no file or network access. Owner: Session C. Tests:
`npx tsx --test app/src/lib/match/__tests__/*.test.ts`.

`buildMatchRecord` returns everything the comparison screen shows for one target and one Earth place.
`buildReport` turns a record into the downloadable report's content, with numbered citations.
All similarities come from the frozen scoring library. Nothing here changes a score.

## Quick start

```ts
import { buildMatchRecord, buildReport, earthPlaceFromCell, earthPlaceFromSite,
         targetAtSiteWindow, sitePosts, emitFamilies, sharedMinerals } from './lib/match';

// An Earth place: a grid cell ...
const place = earthPlaceFromCell(cell, earth.meta, { name: 'Atacama cell' });
// ... or a named site of data/sites.json (terrain, vegetation, rock from its footprint)
const place = earthPlaceFromSite(site, nearestCell(earth.cells, site.lat, site.lon).cell, earth.meta,
                                 { families: minerals.families });

// For a site, compare terrain like for like: the target measured in a window of the site's size
const like = targetAtSiteWindow(target, sitePosts(site), targetWindows);   // data/target_windows.json

const record = buildMatchRecord({
  target: like ?? target, place, ranges, table, classes,
  terrainLikeForLike: like !== null,
  profile,            // optional: the TargetProfile when the target came from targetFromPoint
  index,              // optional: buildProfileIndex(earth.cells, prepared) adds percentiles
  targetExtras, minerals,   // optional: see "Minerals"
});
const report = buildReport({ record, minerals, stability, routes, knownSite, validation });
```

## The record

```
MatchRecord {
  version: 1, generatedAt,
  target:  { id, name, body, lat, lon, summary, origin, confidence, missing, notes },
  earth:   { id, name, lat, lon, scale: 'grid' | 'site', footprintKm, rockName, bareShare, notes },
  score:   { preset, value, verdict, confidence, coverage, missing, unscoredReason, limitingFactor, reason },
  dimensions: MatchDimension[9],   // always the same nine, in this order:
                                   // geology, terrain, climate, bareGround, sunlight, minerals, ice, dust, wind
  purposes:   MatchPurpose[5],     // geology, mobility, ice, astrobiology, base
  cannotCopy: string[],            // the target's own sentences; never scored
  beyondEarth: [{ key, label, text }],   // target values beyond anything on Earth
  headline: { strongest, weakest },
  caveats: string[]
}
MatchDimension { id, label, measures, inScore, addedAfterFreeze, similarity, verdict, reason, percentile, rows }
MatchRow       { key, label, unit, earth: MatchSide, target: MatchSide, similarity, verdict, reason }
MatchSide      { value, text, source, badge, scale, note? }
```

The shape never changes with the data. A dimension or row with no data is still there, with
`verdict: 'no-data'`, `similarity: null`, `text: 'no data'` and a reason that says which side lacks it.
Fields will only ever be added.

- `value` is the raw value; `text` is the same value ready to print, with its unit. When the target
  lies beyond anything on Earth, `text` shows both: `-160 °C (Earth's closest: -55 °C)`.
- `scale` says what a value describes: `grid` (55 km cell), `site` (the footprint), `volcano`,
  `computed` (Sun elevation from latitude) or `target`.
- `inScore` is true for the five dimensions behind the frozen all-round score. `addedAfterFreeze` is
  true for minerals, ice, dust and wind: show them apart, with a label.

## Verdict

| Verdict | Similarity | For a measured value | For rock class |
| --- | --- | --- | --- |
| `matches` | 0.75 or more | within about three quarters of one tolerance | same class |
| `partly` | 0.30 to 0.75 | within about one and a half tolerances | related class |
| `does-not-match` | under 0.30 | further | unrelated class |
| `no-data` | null | one side has no value | |

`verdictOf(similarity)`, `verdictOfScore(score)`, `VERDICT_LABEL`. The thresholds are a display rule:
they were chosen so the three rock-class levels land on the three verdicts, and they change no number.

## Dimensions added after the freeze

Minerals, ice or permafrost, dust and wind were added after the score was frozen on 2026-11-14.

- They never enter the all-round score.
- Each is its own dimension in the record, with `addedAfterFreeze: true`.
- A purpose may show an `extendedScore` beside its frozen `score`: the extra dimension joins the
  purpose's weighted geometric mean with the average weight of the purpose's own factors. No weight
  was fitted. `extraDimensions` lists which were used. Nothing about them has been validated.
- Which purposes each belongs to is written in `extras.ts`, with a one-line reason, before any site
  was looked at: minerals in geology, astrobiology and base; ice in ice, astrobiology and base; dust
  in mobility and base; wind in base.
- Wind, dust and ice are compared on both sides since 2026-11-15. Earth side: `windSpeed`, `aod` and
  `permafrostFrac` of the Earth cell or site (read automatically by `earthPlaceFromCell` and
  `earthPlaceFromSite` when `earth.meta.extraKeys` is passed in `meta`). Target side:
  `targetExtras: targetEnvironment(envFile, target.id)` from `data/target_environment.json`. Pass
  `extraRanges: extraRanges(earth.cells)` so a target beyond Earth's range (the windless Moon) is compared
  at the nearest value Earth offers, as the frozen score does.
- Their tolerances are in `EXTRA_DIMENSIONS` with the reason for each: wind 2.0 m/s, optical depth 0.12
  (a quarter of the spread between the 5th and 95th percentile of Earth's land cells), ice share 0.25.
  They were written down before any site was compared.
- Show the notes. `aod` counts all airborne particles: smoke over Java matches Mars dust by number, not
  by material. `permafrostFrac` is null south of 25 N: "no data", not zero.

## Minerals

Earth side: NASA EMIT identifications in a site's footprint (`sites.json`, `mineralogy`). Target side:
minerals reported in cited papers (`data/target_minerals.json`). Both are reduced to mineral families.

```ts
const earthSide = emitFamilies(site.mineralogy, file.families, file.meta.emitMinimumShare);
const shared = sharedMinerals(earthSide, file.targets[target.id]?.minerals, file.families);
shared.shared         // reported at the target and identified on Earth
shared.targetOnly     // reported at the target, could be identified, not seen here
shared.notComparable  // reported at the target, but EMIT cannot identify the family
shared.earthOnly      // identified on Earth, not reported at the target
shared.similarity     // shared / (shared + targetOnly), or null
```

Site-level only. An EMIT identification is a spectral match in a 60 m pixel: how often a mineral's
signature is seen, not how much is there, and it is weak under vegetation. A shared family is a pointer
for a geologist, not proof of the same rock.

## Report

```
MatchReport { version, generatedAt, title, subtitle, summary: ReportText[],
              sections: [{ id, title, paragraphs: ReportText[], table: { columns, rows: ReportText[][] } | null }],
              citations: [{ n, text, badge }], footer: string[] }
ReportText  { text, cites: number[] }
```

Sections, in order: `target`, `earth`, `score`, `dimensions`, `after-freeze`, `purposes`, then
`stability` and `route-N` when passed, `cannot-copy`, `limits`. Every sourced value carries the number
of its citation; each source is listed once, numbered from 1 in order of first use. Render `cites` as
superscripts and `citations` as the reference list.

## Files this library reads (the caller loads them)

| File | Used for |
| --- | --- |
| `data/earth.json` `meta` | source and badge of each Earth value |
| `data/sites.json` | site values and EMIT minerals |
| `data/target_windows.json` | target terrain in site-sized windows |
| `data/target_minerals.json` | mineral families and target mineralogy |
| `data/target_environment.json` | target-side wind, dust and ground ice |
| `data/rovers.json` | slope limits and speeds for routes (see `app/src/lib/route`) |

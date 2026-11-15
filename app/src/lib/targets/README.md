# Targets from anywhere (`app/src/lib/targets`)

Pure TypeScript, no UI, no file or network access. Owner: Session C. Tests:
`npx tsx --test app/src/lib/targets/__tests__/*.test.ts`.

Two things: the named places a user can pick on the Moon and Mars (`data/known_sites.json`), and a
function that turns any latitude and longitude into a target the scoring library can use.

## Target profile for a point

```ts
import { targetFromPoint, targetFromKnownSite } from './lib/targets';

const profile = targetFromPoint('mars', 40.2, 202.3, {
  grid: marsGrid,          // data/mars.json (Session B), or null if not loaded
  curated: targets,        // data/targets.json
  knownSites: known.sites, // data/known_sites.json, optional: names the place
  rockClasses: legend.map((c) => c.code),  // rock class codes of data/earth.json: pass it whenever a grid is passed
});
profile.target      // a full Target: pass it to prepareTarget() and score as usual
profile.origin      // 'curated' | 'grid' | 'none'
profile.confidence  // 'high' | 'medium' | 'low'
profile.missing     // data keys with no value on the target side
profile.notes       // sentences to show with it
```

Order of preference:

1. **Curated.** If a target of `data/targets.json` lies within 27.8 km (half the 55.6 km window its
   values were measured over), it is returned unchanged. Its confidence is that of its own coverage
   (a polar lunar target has no day-night swing, so it is `medium`).
2. **Grid.** Otherwise the values of the global grid cell that holds the point: `slope`, `roughness`,
   `tempMean`, `tempRange`, `lithology`, each with the grid's own source and badge. Tolerances are read
   from the curated targets (the frozen ones) and follow the same rules, floors included. `precip`
   and `ndvi` are copied from a curated target of the same body: every place on the Moon or Mars
   shares them. **Confidence is one level lower** than the coverage would give: a complete grid
   profile is `medium`, one with a missing factor is `low`.
3. **None.** With no grid, or no cell at the point, only the shared values are filled. Scores built
   on it fall under the minimum coverage and show "no data". Nothing is made up.

A grid value whose factor has no stated source in `meta.factors` is not used. A grid rock class that is not in
`rockClasses` is left out with a note: scoring a class the rock table does not list would throw.

`targetFromKnownSite(site, options)` returns the curated target a named place is linked to
(`site.targetId`), else builds the profile from its coordinates.

The grid shape (`BodyGrid`) is the one Session B publishes: `{ meta: { body, resolutionDeg, factors:
[{ key, source, badge }] }, cells: [{ lat, lon, slope, roughness, tempMean, tempRange, lithology }] }`.
Any resolution works.

## Wind, dust and ice for a point picked on the map

`profile.environment` carries the target side of the dimensions added after the freeze, read from the grid
cell: `wind` from `windSpeed`, `dust` from `dustOpticalDepth`, `ice` from `psrFrac` (the share of the cell in
permanent shadow: where ice can survive, not ice itself). On the Moon the grid file states "no atmosphere" as
a fact (`meta.notInFile`), so wind and dust are 0 with that statement as the source. A Mars water content by
weight (`waterH2O`) is a different quantity from a share of ground: it is quoted in the note and not used.
For a curated target `environment` is empty: use `data/target_environment.json`. The match library's
`targetExtrasForProfile(profile, envFile)` picks the right one.

## Named places (`data/known_sites.json`)

```
{ "meta": { "generatedAt", "note", "coordinateConvention" },
  "sites": [ { "id", "name", "body": "moon" | "mars", "lat", "lon", "kind": "landing-site" | "candidate-region",
               "mission", "agency", "date", "status", "source", "url", "access": "primary" | "secondary",
               "note", "targetId" } ] }
```

Longitude is east-positive, -180 to 180. `targetId` links a place to a curated target when one
describes it. `nearestKnownSite(sites, body, lat, lon)` finds the named place within 27.8 km of a point.

## Other exports

`distanceKm(body, lat1, lon1, lat2, lon2)`, `kmPerDegree(body)`, `normaliseLon`, `formatPoint`,
`nearestGridCell(grid, lat, lon)`, `targetCoverage(target)`, `tolerancesFrom(curated)`,
`sharedCannotCopy(curated, body)`.

## What this does not do

It does not change the frozen score. A grid profile is an ordinary target scored by the ordinary
function; only its confidence label is lower.

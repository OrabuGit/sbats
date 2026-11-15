# Rover route logic (`app/src/lib/route`)

Pure TypeScript, no UI, no file or network access. Owner: Session C. Tests:
`npx tsx --test app/src/lib/route/__tests__/*.test.ts`.

```ts
import { tileFromFloat32, measureRoute, pointFromLatLon } from './lib/route';

const tile = tileFromFloat32(buffer, item.elevation.size, item.elevation.pixelM);  // a data/extracts tile
const result = measureRoute(tile, [{ col: 100, row: 300 }, { col: 240, row: 310 }, { col: 400, row: 180 }], {
  limit: { rover: r.name, limitDeg: r.slopeLimit.value, kind: r.slopeLimit.kind, source: r.slopeLimit.source },
  speed: { rover: r.name, metresPerHour: r.speed.value, kind: r.speed.kind, source: r.speed.source },   // optional
  // r is one entry of data/rovers.json `rovers`
});
```

Waypoints are tile points: `col` grows east, `row` grows south, in pixels. `pointFromMetres` and
`pointFromLatLon(tile, centreLat, centreLon, radiusM, lat, lon)` convert to them (extracts are in a
local orthographic projection centred on the item, north up).

## Result

| Field | Meaning |
| --- | --- |
| `distanceM`, `surfaceDistanceM` | horizontal length, and length along the ground |
| `samples[]` | the elevation profile: `distanceM`, `elevationM`, `alongSlopeDeg`, `terrainSlopeDeg` |
| `ascentM`, `descentM`, `minElevationM`, `maxElevationM` | sums of climbs and descents, and the range |
| `maxUphillDeg`, `maxDownhillDeg`, `meanAlongSlopeDeg` | slope of the route itself |
| `maxTerrainSlopeDeg` | steepest ground crossed, whichever way the rover faces |
| `shareAboveLimit`, `distanceAboveLimitM` | share and length of the route on ground steeper than the limit |
| `shareAlongAboveLimit` | the same for the slope of the route itself |
| `drivingTimeH` | distance divided by a published speed: a lower bound. null without a speed |
| `energyWh` | distance times a measured rate per km, on the right body only. Usually null |
| `noDataShare`, `notes[]` | gaps in the tile, and sentences that must be shown with the numbers |

## Limits, stated in every result

- Slope is measured between posts one pixel apart: 30 m on Earth, 60 or 80 m on the Moon, 463 m on
  Mars. A route within the limit here is not proven drivable.
- Slopes from a coarse grid are gentler than slopes of the same ground from a fine grid. Do not compare
  a Mars route with an Earth route by slope.
- **Energy is almost never given.** No published, citable model of rover energy against slope was found.
  `energyWh` is filled only from a measured rate in `data/rovers.json` (today: the Apollo rover on the
  Moon), only when `body` says the route is on the body the rate was measured on, and never adjusted
  for slope. Pass `{ energy: rover.energy, body: 'moon' }`.
- The slope limit and the speed are never typed in the code. They come from `data/rovers.json`, each
  with its source.

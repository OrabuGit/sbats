# SBATS base simulation

Pure TypeScript. No UI, no file access, no network. It implements DESIGN.md section 8: place modules
on an Earth analog site, run the same layout at the Moon or Mars target, and say what differs and what
the Earth rehearsal cannot test. Code generated with AI assistance (Claude Code), directed and
reviewed by the team; see `AI_USE.md`.

Every module number comes from `data/modules.json`, each with a source. Nothing is hard-coded here.

## How to use it

```ts
import modules from '../../../../data/modules.json';
import { siteFromEarthCell, siteFromTarget, evaluate, simulate, deployTwice, encodeLayout, decodeLayout } from './sim';

const earthSite = siteFromEarthCell(cell, modules, { name: 'Utah desert cell' });
const targetSite = siteFromTarget(target, modules);            // target from targets.json

const layout = { modules: [{ type: 'habitat', x: 0, y: 0 }, { type: 'solar', x: 1, y: 0 }] };

const panel = evaluate(layout, targetSite, modules);           // live resource panel + readiness
const run = simulate(layout, targetSite, modules, { resupplyEveryDays: 10, events: [{ type: 'marsDustStorm', startDay: 5 }] });
const gap = deployTwice(layout, earthSite, targetSite, modules); // both evaluations + the gap report

const link = encodeLayout({ ...layout, resupplyEveryDays: 10 }); // "1.-.10.h00s10"
const back = decodeLayout(link);
```

| Export | What it gives |
| --- | --- |
| `MODULE_TYPES` | `habitat`, `solar`, `battery`, `greenhouse`, `iceMiner`, `landingPad`. |
| `siteFromTarget(target, file)` | Conditions at a Moon or Mars target: temperature and slope from `targets.json`, sunlight, darkness, ice and dust-storm factor from the `sites` block of `modules.json`. |
| `siteFromEarthCell(cell, file, { name, iceAvailability })` | Conditions at an Earth cell. See "Earth sites" below. |
| `evaluate(layout, site, file)` | `Evaluation`: counts, crew, the five resource balances (`resources.power`, `.water`, `.oxygen`, `.food`, `.crew`, each with `production`, `consumption`, `net`, `status`, `note`), `deliveredMassKg`, `readiness`, `illustrative`, `illustrativeModules`, `notes`. |
| `simulate(layout, site, file, options)` | `Simulation`: 30 `days` (stocks, solar power, modules shed, cargo, what ran out), `firstDepletion`, `readiness`, `sustainability`, `initialStock`, `notes`. Options: `days`, `resupplyEveryDays`, `events`. |
| `deployTwice(layout, earthSite, targetSite, file)` | `GapReport`: `earth` and `target` evaluations, `lines` (plain sentences), `cannotTest`. |
| `encodeLayout`, `decodeLayout`, `layoutToJson`, `layoutFromJson`, `validateLayout` | The save format. They throw `LayoutError` on anything invalid. |
| `validateModulesFile(file)` | List of problems in `modules.json`. Empty when valid. |
| `param(file, type, key)`, `missingParams(file, type)`, `MODULE_PARAMS` | Reading the catalog, for a module info panel. |

## The model, exactly as coded

| Module | Makes | Uses | Depends on the site through |
| --- | --- | --- | --- |
| Habitat | crew places | power; oxygen, water and food for each crew member | temperature (heating load, not modelled yet: no sourced coefficient) |
| Solar array | power | nothing | sunlight and the share of time lit |
| Battery | stored power | nothing | the longest dark period |
| Greenhouse | food, oxygen | power (electric light) | nothing directly: sunlight reaches it through the arrays |
| Ice miner | water, and oxygen by electrolysis | power | ice availability |
| Landing pad | cargo per delivery | nothing | slope: no cargo above the pad's slope limit |

- Solar power per array = `ratedPowerKw x (site irradiance / ratedIrradianceWm2) x litFraction`. This is
  DESIGN.md's `P = I x A x efficiency x lit_fraction` with `A x efficiency` written as rated power over
  rated sunlight, because that is the form in which arrays are published.
- Crew needs = crew x per-person oxygen, water and food (NASA BVAD). Crew defaults to every habitat place.
- Electrolysis turns surplus water into oxygen, only as much as the crew still needs after the greenhouses.
- Batteries must carry the whole base through the site's longest dark period.
- Cargo: the base starts with one delivery on the ground when it has a usable landing pad, split between
  water, oxygen and food in proportion to their daily shortfall. Resupply repeats that every N days.

### Readiness

| | Steady state (`evaluate`) | Over the 30-day run (`simulate`) |
| --- | --- | --- |
| GREEN | Every balance is zero or positive, and the batteries last the longest dark period. | Nothing ran out and no reserve was drawn on. |
| AMBER | Water, oxygen or food is short each day, but the first delivery covers 30 days. | Nothing ran out, but only thanks to stored reserves or cargo. |
| RED | Power runs out, a consumable runs out within 30 days, or there are more crew than places. | Something ran out. |
| `null` | A balance cannot be computed because a number has no source. Show "no data". | The same. |

### The 30-day run

One step per day. Each day: sunlight is multiplied by the factor of any active event; the habitats are
powered first, and if the rest cannot all run the ice miners are switched off for the day, then the
greenhouses (`shed`); what is left recharges the batteries; water, oxygen and food stocks move by what
was made and used; on a resupply day one delivery arrives.

- `sustainability.days`: full days survived with no resupply, under the same events. `reachedHorizon`
  is true when nothing ran out, so the true figure is at least that many days.
- Events: `lunarNight` (no sunlight) and `marsDustStorm`. An event on the wrong body is ignored with a note.
  A lunar night lasts the site's own longest dark period when one is published, otherwise 14 days.
  A dust storm uses the site's own sunlight factor from the Mars Climate Database.
- A night shorter than a day is not resolved by the daily step. The steady-state battery check covers it,
  and its result is carried into the run's readiness.

### Numbers with no source

The rule in this project is never to invent a value.

- A module parameter with no source is `null` in `modules.json`. What depends on it is `null` here, never
  zero. The module is listed in `illustrativeModules` with the missing parameters. **Label that module
  "illustrative" in the UI.**
- Two refinements are simply left out, with a note, when they have no sourced figure: the habitat's
  heating load and the greenhouse's net make-up water.
- A site condition with no published value is `null` too (for example sunlight at Mons Mouton, ice at
  every lunar site). Readiness is then `null`: show "no data", and show `notes`.

Today that means: lunar targets give "no data" whenever an ice miner is placed, and Mons Mouton and
Haworth give "no data" for solar power. That is the state of the published record, shown as it is.

### Earth sites

`earth.json` has no surface sunlight and no ground-ice data, so:

- Sunlight is the top-of-atmosphere figure for the latitude, an upper bound with no air or cloud.
  `site.irradianceIsUpperBound` is true and the gap report says so. If a cell ever carries
  `insolationKwhM2Day` (NASA POWER `ALLSKY_SFC_SW_DWN` would do), the measured value is used instead.
- The ice miner is treated as idle on Earth. Pass `iceAvailability` to override for a site with ground ice.
- The share of time lit is 0.5 and the longest dark period is the longest night for the latitude, both
  from geometry.

### The gap report

`deployTwice(...).lines` is ready to show, one sentence per line: readiness at both sites, solar output
per array and how many arrays to add, the dark period and how many batteries to add, heating, ice,
each consumable that is short, landing, and any illustrative module. It **always ends** with what the
Earth rehearsal cannot test at all: the target's `cannotCopy` sentences from `targets.json`, or a
general gravity, atmosphere and radiation statement when the target has none.

## Layout save format

A layout is `{ modules: [{ type, x, y }], crew?, resupplyEveryDays }` on a 36 x 36 grid, at most 200 modules.

- Share link: `encodeLayout` gives `1.<crew>.<resupply>.<modules>`, three characters per module (a
  letter for the type, then x and y in base 36). `-` stands for "not set". Example:
  `1.4.10.h00s10s20b01`. Only letters, digits, `.` and `-`, so it needs no escaping in a URL.
  Type letters: `h` habitat, `s` solar, `b` battery, `g` greenhouse, `i` ice miner, `p` landing pad.
- Browser storage: `layoutToJson` gives `{ v: 1, crew, resupplyEveryDays, modules: [[type, x, y], ...] }`.
- Which target and which Earth cell the layout is shown on are not part of the layout. Put them in the
  URL beside it.

## data/modules.json

```
{
  "meta": { ... },
  "crew":      { "oxygenKgPerDay": V, "waterKgPerDay": V, "foodKgPerDay": V },
  "constants": { "oxygenKgPerKgWater": V, "solarConstantWm2": V },
  "modules":   { "<type>": { "label": string, "description": string, "params": { "<name>": V } } },
  "events":    { "lunarNight" | "marsDustStorm": { "label", "description", "body", "params": { "durationDays": V, "solarFactor": V } } },
  "sites":     { "<target id>": { "irradianceWm2": V, "litFraction": V, "longestDarkHours": V, "iceAvailability": V, "dustStormSolarFactor"?: V } }
}
V = { "value": number | null, "unit": string, "source": string | null, "badge": "Measured" | "Mission" | "Literature" | null,
      "note"?: string, "derived"?: true }
```

- A `null` value has `null` source and badge and a note saying what was looked for.
- `derived: true` marks a value that is one multiplication or division of numbers printed in the source.
  Its note starts with "Derived:" and shows the arithmetic.
- Show the badge beside every number, as for any other value in the app.
- The file is written by `validation/build/make_modules.py`. Every value, its source and how it was
  checked are listed in `data/REVIEW_ME.md`.
- This shape is not in `data/SCHEMA.md` yet; that file was being edited by another session when this was
  written. It should be copied there.

## Tests

72 tests in `__tests__/`, run from the repository root with Node's built-in test runner:

```bash
npx tsx --test app/src/lib/sim/__tests__/*.test.ts
```

They cover the catalog rules, every balance, readiness at each boundary, numbers with no source, the
30-day run (stocks, sustainability, resupply, both events, load shedding), the gap report and its
ending, the Earth geometry, the site builders and the layout format. `sim.test.ts` and
`site-layout.test.ts` use a catalog of made-up round numbers in `__tests__/fixtures.ts` so that every
expected value can be worked out by hand; those numbers are not real. `data-files.test.ts` checks the
real `data/modules.json` and runs the engine on every real target.

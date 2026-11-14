# Decisions, Session A (app)

Small choices made without asking, one line each with the reason. Newest at the bottom.

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-11-14 | Compact earth file: the app loads `data/earth.compact.json` when the manifest lists it, in the shape `{ "format": "columns-v1", "meta", "count", "columns": { "lat": [], "lon": [], "<key>": [] } }`, and falls back to `earth.json` if the shape differs. Note for Session B: this is a proposal, not a contract. Tell me the real shape (or add it to SCHEMA.md) and I will change the one decoder in `app/src/data/access.ts`. | Session B has not published a format yet; one array per key is the smallest JSON form and needs no binary parser. |
| 2026-11-14 | All-ice cells are drawn as scored cells in the lowest score class (a thin veil over the imagery), not in the grey "no data" colour. | SCHEMA.md: an all-ice cell has a score of 0 and is ranked. Grey means "no score". |
| 2026-11-14 | The dossier shows the ice and barren shares under Bare ground for every cell, with a line saying whether NDVI or land cover gave the similarity. | `bareGroundSource` is only useful if the numbers behind it are visible next to it. |
| 2026-11-14 | Empty-state and "no score" texts say "bare ground" instead of "vegetation (NDVI)" as the required factor. | Follows the final bare-ground rule in SCHEMA.md. |
| 2026-11-14 | Method and Validation share one top-bar button and are two tabs of one page. | A third top-bar button does not fit at phone width next to the stepper and Run demo. |
| 2026-11-14 | The build publishes `validation/output/report*.json`, `candidates.json`, `validation/tuning/frozen.json` and the tables of `SOURCES.md` (parsed) next to the data files; the pages read those. | The pages must show the numbers the validation scripts wrote. Copying numbers into the app would let them drift. |
| 2026-11-14 | Validation statistics carry one "Measured" tag at the top of the page instead of a badge on each number. | They are all computed by one script from the data files; a badge on each of about 300 table cells would hide the numbers. |
| 2026-11-14 | Site names on the Validation page open that site's dossier against the row's target. | Lets a judge check any row against the factor breakdown in one click. |
| 2026-11-14 | The 75 unrelated rock-class pairs are in a closed `details` block, the 16 related pairs open. | SCHEMA.md asks for the whole table with justifications; 91 open rows would bury the rest of the page. |
| 2026-11-14 | Dropped my `columns-v1` proposal. The app now loads `data/earth.bin` (SBE1) with Session B's reference decoder, copied to `app/src/data/earthBin.ts`, and falls back to `earth.json`. | Session B published the real compact format in SCHEMA.md. |
| 2026-11-14 | A production build ships `earth.bin` and leaves `earth.json` out of `dist`. The dev server still serves both. | The pipeline already fails if the two differ, and the JSON is 15.6 MB against 1.9 MB. |
| 2026-11-14 | The "All-round match / Match by purpose" switch is the first control in the left panel, above the target picker. | It changes what every score on screen means, so it must be visible without scrolling. |
| 2026-11-14 | In purpose mode the presets and weight sliders are hidden and the purpose's fixed weights are listed read-only. | A purpose score uses the frozen Base weights by definition; sliders would let the user leave the definition without noticing. |
| 2026-11-14 | The dossier always shows the analog profile and all five purpose scores, in both modes; clicking a purpose there switches the whole ranking to it. | "What is this place good for" is answered per site, whichever ranking is active. |
| 2026-11-14 | When more cells tie at the top score than the list holds, the list says how many tie and that it shows a spaced sample. | Geology has three possible values; without the note the order would look meaningful. |

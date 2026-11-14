# Decisions, Session A (app)

Small choices made without asking, one line each with the reason. Newest at the bottom.

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-11-14 | Compact earth file: the app loads `data/earth.compact.json` when the manifest lists it, in the shape `{ "format": "columns-v1", "meta", "count", "columns": { "lat": [], "lon": [], "<key>": [] } }`, and falls back to `earth.json` if the shape differs. Note for Session B: this is a proposal, not a contract. Tell me the real shape (or add it to SCHEMA.md) and I will change the one decoder in `app/src/data/access.ts`. | Session B has not published a format yet; one array per key is the smallest JSON form and needs no binary parser. |
| 2026-11-14 | All-ice cells are drawn as scored cells in the lowest score class (a thin veil over the imagery), not in the grey "no data" colour. | SCHEMA.md: an all-ice cell has a score of 0 and is ranked. Grey means "no score". |
| 2026-11-14 | The dossier shows the ice and barren shares under Bare ground for every cell, with a line saying whether NDVI or land cover gave the similarity. | `bareGroundSource` is only useful if the numbers behind it are visible next to it. |
| 2026-11-14 | Empty-state and "no score" texts say "bare ground" instead of "vegetation (NDVI)" as the required factor. | Follows the final bare-ground rule in SCHEMA.md. |

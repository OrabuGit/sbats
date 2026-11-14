# Use of AI

Space Apps requires teams to state where and how AI was used. Keep this current.

| Date | Tool | What it did | Files or outputs |
| --- | --- | --- | --- |
| 2026-11-14 | Claude (chat) | Researched challenge rules and similar projects, drafted the design document, UI layout concept, CLAUDE.md, JUDGING.md | DESIGN.md, CLAUDE.md, JUDGING.md, design/ |
| 2026-11-14 | Claude Code | Code generation for the app and data pipeline, directed and reviewed by the team | app/, pipeline/ |
| 2026-11-14 | Claude Code | Drafted the shared data contract from the team's field list and ownership split | data/SCHEMA.md |
| 2026-11-14 | Claude Code | Wrote the ORBIT screen: Vite/React/Tailwind scaffold, data-access module with fixture fallback, globe heatmap, target picker, presets and weight sliders, candidates list, site dossier (factor bars, radar chart, missing factors, what Earth cannot copy), status strip. Also generated the synthetic UI fixtures and a temporary scoring stub. Checked in a browser at laptop and phone width. Directed and reviewed by the team | app/ (except app/src/lib/scoring), app/src/mocks/*.fixture.json, app/scripts/make-fixtures.mjs |
| 2026-11-14 | Claude Code | Wrote the scoring library and its 98 unit tests from the rules in DESIGN.md section 6 and data/SCHEMA.md. The team set the rules; preset weights other than Base and the Sunlight tolerance are Claude's starting values and are flagged for team review | app/src/lib/scoring/ |
| 2026-11-14 | Claude Code (with research sub-agents and web search) | Collected target and analog-site sources, wrote the scripts that measure target terrain (LOLA, MOLA), lunar temperature (Diviner) and Mars temperature (Mars Climate Database, REMS), and entered the values. No value comes from the model's memory: each is computed from a named dataset or read in a fetched source, and unverified values are `null`. Check levels and confidence per value are in data/REVIEW_ME.md for human review | data/targets.json, data/analogs.json, data/REVIEW_ME.md, validation/target_terrain.py, validation/build/ |
| 2026-11-14 | Claude Code | Wrote the rock-class similarity table from the team's three approved levels: decided which GLiM class pairs count as related, with a justification each | data/lithology_similarity.json, validation/build/make_lithology.py |
| 2026-11-14 | Claude Code | Wrote the validation script and its report. Numbers are reported as computed, with no tuning | validation/validate.ts, validation/output/, validation/README.md |
| 2026-11-14 | Claude Code | Following the team's six tuning rules: drew the tuning / hold-out split (fixed seed), wrote the tuning plan and the one-pass tuning script before terrain data existed, and made the validation script keep the hold-out set unseen and the candidate sites out. The rules and the decision to tune are the team's | validation/tuning/, validation/tune.ts, validation/lib.ts, validation/validate.ts, validation/score_candidates.ts |
| 2026-11-14 | Claude Code | Ran the tuning script once too early (on terrain landing, before reading the team's instruction to wait for the Antarctica fix). It accepted no change and touched no source file. Claude set the run aside as void, documented it, and made the script refuse to run without the team's go-ahead | validation/tuning/void-run-2026-11-14/, validation/tune.ts, validation/tuning/PLAN.md |
| 2026-11-14 | Claude Code | ORBIT follow-up: removed the temporary scoring stub and put the scoring library back under the app's type check, added the Method page (formula, confidence rules, list spacing and New tag rules), loaded the globe as a separate chunk, downloaded the NASA Blue Marble imagery from GIBS and drew it under the heatmap, renamed the Sunlight tag to Computed, showed the grid code after the name of named sites. Checked in a browser at laptop and phone width. Directed and reviewed by the team | app/src/, app/vite.config.ts, app/public/textures/, SOURCES.md |
| 2026-11-14 | Claude Code | Implemented the team-approved Bare ground and permanent ice rule from data/SCHEMA.md in the scoring library, with unit tests for both branches and the all-ice case | app/src/lib/scoring/ |

Notes:
- No AI-generated images or video are used unless listed here with a visible watermark.
- All data values come from the sources in SOURCES.md, not from an AI model.

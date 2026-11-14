# Use of AI

Space Apps requires teams to state where and how AI was used. Keep this current.

| Date | Tool | What it did | Files or outputs |
| --- | --- | --- | --- |
| 2026-11-14 | Claude (chat) | Researched challenge rules and similar projects, drafted the design document, UI layout concept, CLAUDE.md, JUDGING.md | DESIGN.md, CLAUDE.md, JUDGING.md, design/ |
| 2026-11-14 | Claude Code | Code generation for the app and data pipeline, directed and reviewed by the team | app/, pipeline/ |
| 2026-11-14 | Claude Code | Drafted the shared data contract from the team's field list and ownership split | data/SCHEMA.md |
| 2026-11-14 | Claude Code | Wrote the ORBIT screen: Vite/React/Tailwind scaffold, data-access module with fixture fallback, globe heatmap, target picker, presets and weight sliders, candidates list, site dossier (factor bars, radar chart, missing factors, what Earth cannot copy), status strip. Also generated the synthetic UI fixtures and a temporary scoring stub. Checked in a browser at laptop and phone width. Directed and reviewed by the team | app/ (except app/src/lib/scoring), app/src/mocks/*.fixture.json, app/scripts/make-fixtures.mjs |
| 2026-11-14 | Claude Code | Wrote the scoring library and its 98 unit tests from the rules in DESIGN.md section 6 and data/SCHEMA.md. The team set the rules; preset weights other than Base and the Sunlight tolerance are Claude's starting values and are flagged for team review | app/src/lib/scoring/ |

Notes:
- No AI-generated images or video are used unless listed here with a visible watermark.
- All data values come from the sources in SOURCES.md, not from an AI model.

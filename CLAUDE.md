# SBATS: instructions for Claude Code

SBATS (Space Base Analog Terrain System, shown in the UI as SBATS-26) is a NASA Space Apps 2026 entry for the challenge
"Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars".
Read DESIGN.md, JUDGING.md and CHALLENGE.md before doing anything. DESIGN.md is the source of truth for
features, scoring and UI. JUDGING.md lists the acceptance rules for data, logic and relevance: a feature
is not done until it meets them. CHALLENGE.md is the official challenge statement.

## Hard deadline
Submission freeze is Sunday 15 Nov, 20:00 Jakarta time. Work in the checkpoint order below.
Never start a later checkpoint while an earlier one is broken on the live link.

1. Finder live: target picker, heatmap, dossier
2. Indonesia deep dive with real data
3. Sandbox: place modules, deploy twice, gap report
4. Save, load, share link, 30-day time slider, sustainability score, resupply
5. 3D terrain shot with base modules
6. Demo assets, README, submit

## Working rules
- Commit and push after every working step. Small commits, clear messages.
- The live site must always build. If a feature is unfinished, hide it behind a flag in `app/src/flags.ts`.
- Stop and ask me before: adding a backend, adding a paid service, changing the scoring formula, or deleting data files.
- Do not invent data. If a value is unknown, use `null` and show "no data" in the UI.
- Never commit secrets. Tokens live in `.env`, which is gitignored.

## Architecture
- Static site only. No backend, no database.
- `/app`: React + Vite + TypeScript + Tailwind.
- `/pipeline`: Python scripts that build data files. Run offline, not in the browser.
- `/data`: built outputs (`earth.json` or binary, `targets.json`, `analogs.json`, `modules.json`).
- All scoring runs in the browser from precomputed files. The demo must never wait on a live API.
- Deploy: GitHub Pages from the main branch.

## Scoring (do not change without asking)
- Per-factor similarity: Gaussian of (earth value minus target value) over a tolerance.
- Exception: rock type (lithology) is categorical and uses the lookup table in `data/lithology_similarity.json`
  (same 1.0, related 0.6, unrelated 0.15; missing lithology drops the factor, renormalises weights and flags
  lower confidence). See `data/SCHEMA.md`.
- Target values are clamped to Earth's observed range.
- Overall score: 100 times the weighted geometric mean of factor similarities.
- Gravity, vacuum and radiation are never part of the score. Show them as "what Earth cannot copy".
- Mission presets change weights only.

## Data rules
- Every dataset gets a row in `SOURCES.md`: name, provider, URL, access date, licence, what it is used for.
- Every value shown in the UI carries a badge: Measured, Mission, or Literature.
- Prefer the official challenge resources: NASA Earthdata, Worldview/GIBS, PDS, LRO (LOLA, Diviner),
  Copernicus Data Space, JAXA G-Portal. NASA POWER is fine for climate.
- Compute terrain metrics the same way on Earth, Moon and Mars.
- The challenge rewards NEW analogs. Known sites (Atacama, Antarctica, Iceland, Hawaii) are the
  validation set, not the headline. Indonesia candidates are the headline.

## UI rules (strict)
Tokens:
- Background `#0B0D0F`, panel `#12161A`, line `#2A3138`
- Text `#D7DDE3`, muted `#7C8894`, accent `#FFB000`
- Readiness only: green `#3DDC84`, amber `#FFB000`, red `#FF4D4D`

Type:
- IBM Plex Mono for numbers, labels and codes. Inter for sentences.
- Labels are small, uppercase, letter-spaced.

Layout:
- Map or globe fills the screen. Left panel for controls, right panel for dossier or resources.
- Top bar with the three-step stepper. Bottom status strip.
- Match the screenshots in `/design`.

Banned:
- Gradients, glows, drop shadows, glass blur
- Purple, or more than one accent color
- Emoji anywhere in the UI. Use Lucide icons.
- Corner radius above 4px
- Modal dialogs, marketing copy, centered hero sections

Accessibility:
- Real `button`, `a`, `input` and `label` elements. Keyboard reachable.
- Text contrast at least 4.5:1. Click targets at least 44px.

## Submission rules that affect code
- Everything in English.
- No images, video or audio of anyone under 18 anywhere in the project.
- No NASA logos or mission insignia in the UI.
- Log every use of AI in `AI_USE.md` as you go: tool, what it did, which files.
- `README.md` must explain what SBAT is, how to run it, the data sources, and the limits.

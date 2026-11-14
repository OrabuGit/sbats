# What wins: judging rules for SBATS

Read this with DESIGN.md. If a feature does not help one of these, it waits.

## The five official criteria
- Impact: how much good, for how many people.
- Creativity: new approach, not an incremental copy.
- Validity: scientifically sound, works in the real world.
- Relevance: answers the challenge, complete, usable.
- Presentation: clear story of challenge, solution, why it matters.

## What the challenge statement rewards (see CHALLENGE.md)
- NEW analogs. Antarctica, Atacama, Iceland and Hawaii are named as already studied.
- Explaining what is analogous, how similar, and where the analogy breaks down.
- Scale: a specific crater, volcanic field or cave system beats a whole region.
- Processes as well as places.
- A link to exploration: testing instruments, robotic or human operations, construction.
- Admitting Earth's limits: gravity, vacuum, thin atmosphere, radiation.
- Combining multiple datasets. "Surprise us."

## Acceptance rules: DATA
- Every factor is computed from a real, named, open dataset. No typed-in guesses.
- At least 3 NASA datasets and at least 1 partner dataset (ESA, JAXA or CSA) are actually used.
- Every dataset has a row in SOURCES.md before the feature using it is called done.
- Every number in the UI shows a badge: Measured, Mission or Literature.
- Grid resolution and data dates are stated on the Method page.
- Unknown values are shown as "no data". Never fill gaps with invented numbers.
- Sandbox module numbers come from cited NASA figures, stored in data/modules.json with a source field.

## Acceptance rules: LOGIC
- The scoring formula is written on the Method page exactly as coded.
- Weights are tuned against the validation set once, then frozen and recorded.
- Validation is real: known analogs must rank high, negative controls
  (Kalimantan rainforest, Amazon, Congo, Jakarta, Singapore, Paris) must rank low.
- Report the actual numbers, including weak ones. A perfect score is a red flag, not a goal.
- The pipeline is reproducible: one documented command rebuilds /data from sources.
- Scoring code has unit tests for the formula, clamping, the veto behaviour, the lithology table and the
  missing-factor rule (required factors, minimum coverage, confidence levels).
- The missing-factor rule and the lithology table are documented on the Method page.

## Acceptance rules: RELEVANCE
- The headline result is a named, specific, new candidate site, not a famous one.
- Each featured site states: what matches, how strongly, what does not, which process, and
  what a mission team could test there.
- The sandbox must tie back to the analog: it shows what a rehearsal at that site can and cannot prove.
- The finder works on its own even if every later feature is switched off.

## Regulation checklist (must all be true at submission)
- Responds to the official challenge, not "Create Your Own".
- All team members registered, on the Jakarta event, listed on the team.
- Public final project link and public demo link, no login needed.
- Demo: video of 30 seconds or less, or at most 7 slides including the title.
- Everything in English.
- NASA data, partner data and AI use fields filled in.
- AI-generated images or video carry a visible watermark. No NASA logos or mission insignia.
- No image, video or audio of anyone under 18.
- All outside resources listed in References. Work is original.

## Confirmed from the 2026 Project Submission Guide (see SUBMISSION_GUIDE.md)
- Deadline: Sunday 15 November 2026, 23:59 Jakarta time. Resubmitting is allowed until then.
  Only the last saved submission is judged. Submit early and keep resubmitting.
- At least one NASA dataset or resource is required for Global Awards.
- Slide demo must show team name, names of team members and the challenge selected.
- AI-generated code and data must be acknowledged in descriptive text and metadata:
  keep AI_USE.md current, add an "AI assistance" section to README.md, and note it in package metadata.
- AI tools may accelerate the work but should not be what comes up with the idea for solving the challenge.
  The team owns the concept and the decisions.
- After deploying a new website, request a FortiGuard Web Filter Classification so judges can open it.
- The project page accepts images (JPG, PNG, GIF up to 10MB) but not videos or documents.

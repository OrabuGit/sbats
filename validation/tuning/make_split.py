"""Draws the tuning / hold-out split of the validation sites, once.

Rules set by the team on 2026-11-14:
- Known analog sites are split about 70 / 30 into a tuning set and a hold-out set, with a fixed
  random seed. Negative controls are split the same way.
- Indonesian candidate sites are never part of tuning or validation. They are not in the split.
- The split is drawn once and recorded in validation/tuning/split.json. This script refuses to
  overwrite it, so the split cannot be re-rolled after results have been seen.

The draw is stratified so that both sets hold every kind of site: known sites by the bodies they
are analogs for (Moon only, Mars only, both), negative controls by type (rainforest, city).
Within each group the ids are sorted, shuffled with random.Random(SEED), and the first
round(0.3 * n) go to the hold-out set.

Run from the repository root:  python3 validation/tuning/make_split.py

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
import json
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "validation" / "tuning" / "split.json"
SEED = 20261114  # the date the split was drawn, chosen before any tuning result existed
HOLDOUT_SHARE = 0.3
CITIES = {"neg-jakarta", "neg-singapore", "neg-paris"}


def group_of(site: dict) -> str:
    if site["kind"] == "negative":
        return "negative-city" if site["id"] in CITIES else "negative-rainforest"
    bodies = sorted({target.split("-")[0] for target in site["analogFor"]})
    return "known-" + "+".join(bodies)


def main() -> None:
    if OUT.exists():
        sys.exit(f"{OUT.relative_to(ROOT)} already exists. The split is drawn once and is not redrawn.")
    analogs = json.loads((ROOT / "data" / "analogs.json").read_text())
    used = [a for a in analogs if a["kind"] in ("known", "negative")]
    excluded = sorted(a["id"] for a in analogs if a["kind"] == "candidate")

    groups: dict[str, list[str]] = {}
    for a in used:
        groups.setdefault(group_of(a), []).append(a["id"])

    rng = random.Random(SEED)
    tuning: list[str] = []
    holdout: list[str] = []
    detail = {}
    for name in sorted(groups):
        ids = sorted(groups[name])
        rng.shuffle(ids)
        n_hold = round(HOLDOUT_SHARE * len(ids))
        holdout += ids[:n_hold]
        tuning += ids[n_hold:]
        detail[name] = {"sites": len(ids), "holdout": sorted(ids[:n_hold]), "tuning": sorted(ids[n_hold:])}

    kind = {a["id"]: a["kind"] for a in used}
    out = {
        "drawnAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "seed": SEED,
        "holdoutShare": HOLDOUT_SHARE,
        "method": "Stratified by group, ids sorted then shuffled with Python random.Random(seed); the first round(0.3 * n) of each group are the hold-out.",
        "counts": {
            "knownTuning": sum(1 for i in tuning if kind[i] == "known"),
            "knownHoldout": sum(1 for i in holdout if kind[i] == "known"),
            "negativeTuning": sum(1 for i in tuning if kind[i] == "negative"),
            "negativeHoldout": sum(1 for i in holdout if kind[i] == "negative"),
        },
        "tuning": sorted(tuning),
        "holdout": sorted(holdout),
        "groups": detail,
        "excludedCandidates": excluded,
        "disclosure": (
            "A provisional validation run on 2026-11-14, before this split existed and before terrain was in "
            "earth.json, scored all 28 known sites and 6 controls together. Its numbers are in git history "
            "(commit 3c71dad). The split was drawn afterwards with this fixed seed, in one draw, without "
            "reference to those scores. No sigma or weight was changed between that run and the split."
        ),
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}: {out['counts']}")
    for name, g in detail.items():
        print(f"  {name}: hold-out {g['holdout']}")


if __name__ == "__main__":
    main()

"""Writes data/target_windows.json: each target's slope and roughness in site-sized windows.

A compact copy of validation/output/target_terrain_windows.json (made by validation/target_terrain.py
--posts) for the app. The match record uses it to compare a site's terrain with the target measured in
a window of the same size (app/src/lib/match, targetAtSiteWindow). The values never replace those in
data/targets.json and never enter the global score.

Run from the repository root:  python3 validation/build/make_target_windows.py

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "validation" / "output" / "target_terrain_windows.json"
FROZEN = ROOT / "validation" / "tuning" / "frozen.json"
OUT = ROOT / "data" / "target_windows.json"


def main() -> None:
    src = json.loads(SRC.read_text())
    frozen = json.loads(FROZEN.read_text())
    targets = {t["id"]: t for t in json.loads((ROOT / "data" / "targets.json").read_text())}
    windows = {}
    for posts, block in sorted(src["windows"].items(), key=lambda kv: int(kv[0])):
        rows = {}
        for tid, r in block["targets"].items():
            if tid not in targets:
                continue
            rows[tid] = {
                "slope": None if r["slope"] is None else round(r["slope"], 3),
                "roughness": None if r["roughness"] is None else round(r["roughness"], 1),
            }
        windows[posts] = rows
    out = {
        "meta": {
            "generatedAt": src["generatedAt"],
            "note": ("Slope and roughness of each target in a square of N x N posts of 463 m centred on the target's coordinates, "
                     "for the window sizes used by data/sites.json. Same elevation models and the same function as data/targets.json. "
                     "For site-level comparison only: a small window describes the ground at that point, not the whole landform. "
                     "A window size that holds one target only (48: Shackleton, rim to rim) was measured for a scale comparison."),
            "postM": 463,
            "terrainFraction": frozen["after"]["terrainFraction"],
            "slopeSigmaFloor": 1,
            "roughnessSigmaFloor": 50,
            "source": {
                "moon": "LRO LOLA gridded elevation (NASA PDS): LDEM_80S_80M at the south pole, LDEM_512 elsewhere",
                "mars": "MGS MOLA MEGDR 128 pixels per degree (NASA PDS)",
            },
            "badge": "Mission",
            "generatedBy": "validation/target_terrain.py --posts, copied by validation/build/make_target_windows.py",
        },
        "windows": windows,
    }
    OUT.write_text(json.dumps(out, indent=1) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}: window sizes {', '.join(windows)}")


if __name__ == "__main__":
    main()

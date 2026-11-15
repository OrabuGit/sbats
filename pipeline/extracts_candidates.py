"""Terrain extracts for the Earth cells the app ranks best for each target.

    uv run --project pipeline pipeline/extracts_candidates.py

pipeline/extracts.py builds extracts for the named sites and the targets. The match page also
shows 3D terrain for the best-ranked Earth cells, which have no name, so this script builds
extracts for them in exactly the same format, window and sources (it reuses extracts.py):

  elevation  Copernicus DEM GLO-30, 30 m, nearest neighbour
  image      Sentinel-2 L2A true colour, one pass, 10 m (null where no pass covers the window)

Which cells: for every target in data/targets.json, the best cells of the all-round (Base) score,
high and medium confidence, each at least 250 km from the picks above it, exactly as the app lists
them. They come from pipeline/candidate_cells.ts, which runs the app's own scoring and ranking code
(needs Node; it is run with `npx tsx`). Cells shared by several targets are built once.

Up to PER_TARGET_MAX cells per target, reduced to PER_TARGET_REDUCED when the estimated size of the
new files would pass SIZE_LIMIT_MB.

Each extract's id is the app's cell code (siteCode in app/src/lib/geo.ts), e.g. SBATS-N8225-W08275.
New items are MERGED into data/extracts/index.json: existing items and meta are kept as they are,
and items already present are not rebuilt, so a rerun only fetches what is missing.

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import extracts as X  # noqa: E402
from common import DATA  # noqa: E402

ROOT = DATA.parent
INDEX = X.OUT / "index.json"
PER_TARGET_MAX = 10
PER_TARGET_REDUCED = 5
SIZE_LIMIT_MB = 60.0
# Estimate per cell: 667 x 667 float32 elevation plus a 2000 x 2000 JPEG (the existing Earth images are 0.65 to 0.9 MB).
EST_CELL_MB = (667 * 667 * 4) / 1e6 + 0.9


def ranked_cells(limit: int) -> list[dict]:
    out = subprocess.run(["npx", "--yes", "tsx", "pipeline/candidate_cells.ts", str(limit)], cwd=ROOT,
                         check=True, capture_output=True, text=True).stdout
    return json.loads(out)


def pick(lists: list[dict], per_target: int) -> dict[str, dict]:
    """Unique cells by id, each with the targets (and ranks) it was listed for."""
    cells: dict[str, dict] = {}
    for t in lists:
        for c in t["cells"][:per_target]:
            e = cells.setdefault(c["id"], {"id": c["id"], "lat": c["lat"], "lon": c["lon"], "ranks": {}})
            e["ranks"][t["target"]] = c["rank"]
    return cells


def name_of(lat: float, lon: float) -> str:
    return f"Open land {'N' if lat >= 0 else 'S'}{abs(lat):.2f} {'E' if lon >= 0 else 'W'}{abs(lon):.2f}"


def write_index(index: dict) -> None:
    tmp = X.OUT / "index.json.tmp"
    tmp.write_text(json.dumps(index, ensure_ascii=False, indent=1, allow_nan=False))
    os.replace(tmp, INDEX)


def main() -> None:
    lists = ranked_cells(PER_TARGET_MAX)
    per_target = PER_TARGET_MAX
    cells = pick(lists, per_target)
    if len(cells) * EST_CELL_MB > SIZE_LIMIT_MB:
        print(f"{len(cells)} cells at top {PER_TARGET_MAX} would add about {len(cells) * EST_CELL_MB:.0f} MB; "
              f"using the top {PER_TARGET_REDUCED} per target instead")
        per_target = PER_TARGET_REDUCED
        cells = pick(lists, per_target)
    # A cell listed lower for another target (within the top PER_TARGET_MAX) still names that target.
    for t in lists:
        for c in t["cells"]:
            if c["id"] in cells:
                cells[c["id"]]["ranks"].setdefault(t["target"], c["rank"])
    print(f"{len(cells)} unique cells (top {per_target} per target)")

    index = json.loads(INDEX.read_text())
    have = {i["id"] for i in index["items"]}
    added, skipped = [], []
    for cid, c in cells.items():
        if cid in have:
            print(f"[{cid}] already in index.json, kept")
            continue
        print(f"[{cid}] {c['lat']} {c['lon']}", flush=True)
        try:
            z, zpx, zm = X.earth_elevation(c["lat"], c["lon"])
        except Exception as e:  # noqa: BLE001
            skipped.append((cid, f"elevation failed: {e}"))
            continue
        try:
            img, ipx, im = X.earth_image(cid, c["lat"], c["lon"])
        except Exception as e:  # noqa: BLE001
            print(f"  image failed, written as null: {e}")
            img, ipx, im = None, 10.0, None
        saved = X.save(cid, z, zpx, zm, img, ipx, im)
        if saved["elevation"] is None:
            skipped.append((cid, "no Copernicus DEM data in the window"))
            continue
        item = {"id": cid, "name": name_of(c["lat"], c["lon"]), "body": "earth", "lat": c["lat"], "lon": c["lon"],
                "matchedTargets": sorted(c["ranks"], key=lambda k: (c["ranks"][k], k)), "pairedWith": None,
                "rankedCell": {"ranks": c["ranks"], "preset": "base", "source": "pipeline/candidate_cells.ts",
                               "note": ("A 0.5 degree cell ranked by the app's all-round score, not a named site. The "
                                        "extract is centred on the cell centre.")},
                **saved}
        if item["image"] is None:
            item["imageNote"] = ("No Sentinel-2 L2A pass of 2025 under 40% cloud covers the whole window.")
        index["items"].append(item)
        have.add(cid)
        added.append(item)
        write_index(index)  # after every cell, so an interrupted run keeps what it built

    size = sum(f.stat().st_size for i in added for f in (X.OUT / i["id"]).glob("*") if f.is_file())
    print(f"\nadded {len(added)} items, {size / 1e6:.1f} MB")
    for i in added:
        e = i["elevation"]
        print(f"  {i['id']:<20} {e['min']:>8} {e['max']:>8} nodata {e['noDataShare']:<7} "
              f"image {i['image']['date'] if i['image'] else 'null'}")
    for cid, why in skipped:
        print(f"  skipped {cid}: {why}")


if __name__ == "__main__":
    main()

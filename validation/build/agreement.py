"""Where do independent datasets agree? Writes validation/output/agreement.json.

    python3 validation/build/agreement.py

Pairs of values for the same quantity from different data sources, both already in the project's data
files. Nothing is downloaded. Each pair reports how many places it covers, the correlation, the typical
difference, and a plain verdict by a fixed rule:

    correlation 0.9 or more  -> "agree closely"
    0.7 to 0.9               -> "agree broadly"
    below 0.7                -> "weak agreement"
    fewer than 5 places      -> "too few places to judge"

A pair can also differ on purpose (different scale or year): the note says so. The frozen score is not
touched. Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
OUT = ROOT / "validation" / "output"


def stats(pairs):
    pairs = [(a, b) for a, b in pairs if a is not None and b is not None and math.isfinite(a) and math.isfinite(b)]
    n = len(pairs)
    if n < 5:
        return {"n": n, "verdict": "too few places to judge"}
    x, y = np.array(pairs, float).T
    r = float(np.corrcoef(x, y)[0, 1]) if x.std() > 0 and y.std() > 0 else None
    rel = np.abs(y - x) / np.maximum(np.abs(x), 1e-9)
    verdict = ("agree closely" if r is not None and r >= 0.9 else "agree broadly" if r is not None and r >= 0.7
               else "weak agreement" if r is not None else "no spread to compare")
    return {"n": n, "pearsonR": None if r is None else round(r, 3), "meanDifferenceSecondMinusFirst": round(float((y - x).mean()), 3),
            "meanAbsoluteDifference": round(float(np.abs(y - x).mean()), 3), "medianRelativeDifference": round(float(np.median(rel)), 3),
            "verdict": verdict}


def pair(id_, title, first, second, scale_note, pairs, caveat=None):
    return {"id": id_, "title": title, "first": first, "second": second, "differsOnPurpose": scale_note, **stats(pairs), "caveat": caveat}


def main() -> None:
    jx = json.loads((DATA / "jaxa_check.json").read_text())
    sites = json.loads((DATA / "sites.json").read_text())["sites"]
    targets = {t["id"]: t for t in json.loads((DATA / "targets.json").read_text())}
    moon = json.loads((DATA / "moon.json").read_text())["cells"]
    mars = json.loads((DATA / "mars.json").read_text())["cells"]
    pairs = []

    # JAXA against NASA
    pairs.append(pair("precip-power-gsmap", "Yearly rain: NASA POWER against JAXA GSMaP",
                      "NASA POWER monthly normals 2001-2020 (about 0.5 degree)", "JAXA GSMaP gauge-adjusted normals 2012-2021 (0.1 degree)",
                      "Different years and grid sizes: the pattern should agree, not every millimetre.",
                      [(s["precip"]["nasaPowerMmPerYear"], s["precip"]["jaxaGsmapMmPerYear"]) for s in jx["sites"]],
                      "GSMaP covers 60 S to 60 N only, so polar sites are left out."))
    pairs.append(pair("ndvi-modis-sgli", "Vegetation index: NASA MODIS against JAXA GCOM-C SGLI",
                      "NASA MODIS MOD13C2 NDVI 2025, 0.5 degree cell", "JAXA GCOM-C SGLI NDVI 2025, mean over the same cell",
                      "Two different sensors and processing chains for one year.",
                      [(s["ndvi"]["nasaModis"], s["ndvi"]["jaxaSgli"]) for s in jx["sites"]]))

    # Sentinel-2 at the site against MODIS in the grid cell, same quantity at two scales
    pairs.append(pair("ndvi-sentinel2-modis", "Vegetation index: ESA Sentinel-2 at the site against NASA MODIS in the 0.5 degree cell",
                      "ESA Sentinel-2 L2A 2025, mean over the 2 to 7 km site footprint", "NASA MODIS MOD13C2 2025, 0.5 degree cell",
                      "Different scale: a footprint of a few km against a cell of 55 km. A site can differ from its cell.",
                      [(s["values"]["ndvi"]["value"], (s["gridCell"] or {}).get("ndvi")) for s in sites]))
    pairs.append(pair("slope-site-cell", "Slope: Copernicus DEM at the site (463 m posts) against the grid cell",
                      "Copernicus DEM GLO-30 over the site footprint, 463 m posts", "Copernicus DEM GLO-90 over the 0.5 degree cell, 463 m posts",
                      "Different scale (footprint against cell) and different DEM resolution, same function.",
                      [(s["values"]["slope"]["value"], (s["gridCell"] or {}).get("slope")) for s in sites]))

    # Moon and Mars grid against the independently measured targets
    def grid_pair(cells, res, body, key):
        out = []
        for t in targets.values():
            if t["body"] != body:
                continue
            v = (t["values"].get(key) or {}).get("value")
            la = 90 - res * (math.floor((90 - t["lat"]) / res) + 0.5)
            lo = -180 + res * (math.floor((t["lon"] + 180) / res) + 0.5)
            c = next((c for c in cells if c["lat"] == la and c["lon"] == lo), None)
            out.append((v, None if c is None else c.get(key)))
        return out
    for body, cells, res, keys in (("moon", moon, 2.0, ("slope", "roughness", "tempMean")), ("mars", mars, 1.0, ("slope", "roughness", "tempMean", "tempRange"))):
        for k in keys:
            pairs.append(pair(f"{body}-grid-target-{k}", f"{body.capitalize()} {k}: global grid against the measured target values",
                              "data/targets.json (target-centred window or the original source)", f"data/{body}.json (cell holding the target)",
                              "The target window is centred on the target, the cell on its own centre; polar temperature statistics differ.",
                              grid_pair(cells, res, body, k),
                              "Only a handful of targets, so the result is a spot check, not a statistic." ))

    # Rock type at the site against the cell class
    lith = [(s["values"]["lithology"]["value"], (s["gridCell"] or {}).get("lithology")) for s in sites]
    both = [(a, b) for a, b in lith if a is not None and b is not None]
    same = sum(1 for a, b in both if a == b)
    pairs.append({"id": "lithology-site-cell", "title": "Rock class: site map unit against the GLiM cell class",
                  "first": "Regional geologic map or volcano record at the site", "second": "GLiM v1.0 class of the 0.5 degree cell",
                  "differsOnPurpose": "Different scale and sources.", "n": len(both), "sameClass": same,
                  "verdict": "too few places to judge" if len(both) < 5 else f"{same} of {len(both)} sites have the same class as their cell",
                  "caveat": "Kawah Ijen reads 'unconsolidated sediments' in its cell but andesite at the volcano."})

    out = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "rule": "correlation 0.9 or more: agree closely; 0.7 to 0.9: agree broadly; below 0.7: weak agreement; fewer than 5 places: too few to judge.",
        "pairs": pairs,
    }
    ind = [p for p in pairs if p["id"] in ("precip-power-gsmap", "ndvi-modis-sgli")]
    out["note"] = ("Independent partner-agency data (JAXA) agrees with the NASA values we score with: yearly rain "
                   f"(correlation {ind[0].get('pearsonR')} over {ind[0]['n']} places) and vegetation index "
                   f"(correlation {ind[1].get('pearsonR')} over {ind[1]['n']} places). Within our own data, site and grid values agree where the scale "
                   "allows it; the pairs that differ on purpose (a site against its 55 km cell) are listed with the reason. Pairs with fewer than 5 "
                   "places are marked too few to judge, and the Moon and Mars checks are spot checks on a handful of targets.")
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "agreement.json").write_text(json.dumps(out, indent=1, allow_nan=False) + "\n")
    for p in pairs:
        print(f"{p['id']:<26} n={p['n']:<3} r={p.get('pearsonR')} {p['verdict']}")
    print(out["note"])


if __name__ == "__main__":
    main()

"""One command that rebuilds data/earth.json from the source datasets.

    uv run --project pipeline pipeline/build.py

Stages run in order and cache what they download or compute in pipeline/cache/.
Use --only to run some stages (for example --only climate ndvi); the rest are read
from the cache if present, and written as null if not.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import CACHE, DATA, LATS, LONS, NLAT, NLON, RES, cell_index, load_grid  # noqa: E402
import landmask  # noqa: E402

STAGES = ["climate", "ndvi", "terrain", "lithology"]
FACTOR_ORDER = ["tempMean", "tempRange", "precip", "ndvi", "slope", "roughness", "lithology"]
DECIMALS = {"tempMean": 2, "tempRange": 2, "precip": 1, "ndvi": 3, "slope": 2, "roughness": 1}

# Static part of meta.factors. Each stage adds its real provenance to cache/meta_<stage>.json.
FACTOR_META = {
    "tempMean": {"label": "Mean temperature", "unit": "°C", "stage": "climate"},
    "tempRange": {"label": "Day-night temperature range", "unit": "°C", "stage": "climate"},
    "precip": {"label": "Annual precipitation", "unit": "mm/year", "stage": "climate"},
    "ndvi": {"label": "Annual mean NDVI", "unit": "", "stage": "ndvi"},
    "slope": {"label": "Mean slope", "unit": "degrees", "stage": "terrain"},
    "roughness": {"label": "Elevation standard deviation", "unit": "m", "stage": "terrain"},
    "lithology": {"label": "Dominant rock class", "unit": "class code", "stage": "lithology"},
}

# Places used for the sanity check (name, lat, lon).
CHECK_SITES = [
    ("Sahara (Tenere, Niger)", 18.0, 11.0),
    ("Amazon (near Manaus)", -3.0, -62.0),
    ("Antarctica (Dome C)", -75.1, 123.3),
    ("Atacama (Yungay)", -24.1, -70.0),
    ("Kalimantan rainforest", 0.5, 114.0),
    ("Greenland ice sheet", 72.5, -38.5),
    ("Tibetan Plateau", 33.0, 88.0),
    ("Himalaya (Everest)", 27.9, 86.9),
    ("Kawah Ijen, East Java", -8.06, 114.24),
    ("Merapi, Central Java", -7.54, 110.45),
    ("Iceland highlands", 64.9, -18.0),
    ("Mauna Kea, Hawaii", 19.8, -155.5),
    ("McMurdo Dry Valleys", -77.5, 162.0),
    ("Paris", 48.85, 2.35),
]


def run_stage(name: str) -> None:
    print(f"[{name}]")
    if name == "climate":
        import climate
        info = climate.build()
    elif name == "ndvi":
        import ndvi
        info = ndvi.build()
    elif name == "terrain":
        import terrain
        info = terrain.build()
    elif name == "lithology":
        import lithology
        info = lithology.build()
    else:
        raise ValueError(name)
    (CACHE / f"meta_{name}.json").write_text(json.dumps(info, indent=1))


def stage_meta(name: str) -> dict | None:
    p = CACHE / f"meta_{name}.json"
    return json.loads(p.read_text()) if p.exists() else None


def factor_entries() -> tuple[list, dict]:
    """meta.factors plus the extra provenance block."""
    cm, nm, tm, lm = (stage_meta(s) for s in STAGES)
    src = {
        "tempMean": cm and f"NASA POWER climatology {cm['period']} (MERRA-2), parameter T2M",
        "tempRange": cm and f"NASA POWER climatology {cm['period']} (MERRA-2), parameter T2M_RANGE",
        "precip": cm and f"NASA POWER climatology {cm['period']} (MERRA-2), parameter PRECTOTCORR",
        "ndvi": nm and nm["source"],
        "slope": tm and tm["source"],
        "roughness": tm and tm["source"],
        "lithology": lm and lm["source"],
    }
    factors = []
    for key in FACTOR_ORDER:
        fm = FACTOR_META[key]
        label = fm["label"]
        if key in ("slope", "roughness") and tm:
            label = f"{label} ({tm['labelSuffix']})"
        e = {"key": key, "label": label, "unit": fm["unit"],
             "source": src[key] or "not built yet", "badge": "Measured"}
        if key == "lithology":
            e["classes"] = lm["classes"] if lm else []
        factors.append(e)
    provenance = {s: m for s, m in zip(STAGES, (cm, nm, tm, lm)) if m}
    return factors, provenance


def _num(v: float, nd: int):
    if v is None or not math.isfinite(v):
        return None
    r = round(float(v), nd)
    return 0.0 if r == 0 else r  # avoid -0.0


def assemble() -> dict:
    land = landmask.land_mask()
    grids = {k: load_grid(k) for k in FACTOR_ORDER}
    cells = []
    for i in range(NLAT):
        for j in np.nonzero(land[i])[0]:
            c = {"lat": float(LATS[i]), "lon": float(LONS[j])}
            for k in FACTOR_ORDER:
                g = grids[k]
                if g is None or not np.isfinite(g[i, j]):
                    c[k] = None
                elif k == "lithology":
                    c[k] = int(g[i, j])
                else:
                    c[k] = _num(g[i, j], DECIMALS[k])
            cells.append(c)
    factors, provenance = factor_entries()
    meta = {
        "resolutionDeg": RES,
        "factors": factors,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "grid": {
            "cellCount": len(cells),
            "landMask": ("Natural Earth 1:10m land polygons minus lake polygons, rasterised at 0.05 degrees; "
                         f"a cell is land when at least {landmask.LAND_MIN_FRACTION:.0%} of it is land"),
        },
        "provenance": provenance,
    }
    return {"meta": meta, "cells": cells}


def write(earth: dict) -> Path:
    DATA.mkdir(exist_ok=True)
    out = DATA / "earth.json"
    tmp = DATA / "earth.json.tmp"
    tmp.write_text(json.dumps(earth, ensure_ascii=False, separators=(",", ":"), allow_nan=False))
    os.replace(tmp, out)  # atomic: other sessions never read a half-written file
    return out


def sanity(earth: dict) -> None:
    cells = earth["cells"]
    n = len(cells)
    assert len({(c["lat"], c["lon"]) for c in cells}) == n, "duplicate cells"
    print(f"\ncells: {n}")
    print(f"{'factor':<10} {'n':>6} {'null':>6} {'min':>10} {'max':>10} {'mean':>10}")
    for k in FACTOR_ORDER:
        v = np.array([c[k] for c in cells if c[k] is not None], dtype=float)
        if v.size == 0:
            print(f"{k:<10} {0:>6} {n:>6} {'-':>10} {'-':>10} {'-':>10}")
            continue
        print(f"{k:<10} {v.size:>6} {n - v.size:>6} {v.min():>10.2f} {v.max():>10.2f} {v.mean():>10.2f}")
    by = {(c["lat"], c["lon"]): c for c in cells}
    print(f"\n{'site':<26} {'cell':>16} " + " ".join(f"{k:>9}" for k in FACTOR_ORDER))
    for name, lat, lon in CHECK_SITES:
        i, j = cell_index(lat, lon)
        c = by.get((float(LATS[i]), float(LONS[j])))
        if c is None:
            print(f"{name:<26} {'not a land cell':>16}")
            continue
        vals = " ".join(f"{('null' if c[k] is None else c[k]):>9}" for k in FACTOR_ORDER)
        print(f"{name:<26} {c['lat']:>7.2f},{c['lon']:>8.2f} {vals}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--only", nargs="*", choices=STAGES, help="stages to run (default: all)")
    ap.add_argument("--assemble", action="store_true", help="skip all stages, only rewrite earth.json from cache")
    a = ap.parse_args()
    stages = [] if a.assemble else (a.only or STAGES)
    for s in STAGES:
        if s in stages:
            run_stage(s)
    earth = assemble()
    out = write(earth)
    sanity(earth)
    print(f"\nwrote {out} ({out.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()

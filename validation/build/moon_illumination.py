"""Average sunlight at the lunar south polar targets, read from the LOLA illumination map.

A cross-check for the `litFraction` values in data/modules.json, and the source of the one value
that no paper states: whether the Haworth target point is in permanent shadow.

Source: LOLA average solar illumination map, south pole, 60 m per pixel, AVGVISIB_85S_060M_201608.IMG
(NASA PDS Geosciences Node, LRO LOLA archive, extras/illumination; method of Mazarico et al. 2011,
Icarus 211:1066, doi:10.1016/j.icarus.2010.10.030, recomputed by the LOLA team in 2016).
https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/extras/illumination/

In the words of the label, each sample is "in permanent shadow (DN=0, scaling to 0) or its average
solar disc visibility (DN up to 25000, scaling to 1)". The archive's readme says these maps are extras,
"not supported by the PDS or the LOLA Science Team". They are used here as a check, and the values
in modules.json keep their published sources where one exists.

For each point this script reports the value at the point and the highest value within RADIUS_KM,
because a base would put its arrays on the best-lit ground nearby.

The map orientation is checked before use: the centre of Shackleton must be in permanent shadow and
the best-lit point on its rim (Glaser et al. 2018, Table 1: 89.7849 S, 203.97 E) must be well lit.

Run from the repository root:  python3 validation/build/moon_illumination.py
Writes validation/output/moon_illumination.json.

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
from __future__ import annotations

import json
import math
import struct
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TARGETS = ROOT / "data" / "targets.json"
OUT = ROOT / "validation" / "output" / "moon_illumination.json"

URL = ("https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/extras/illumination/img/"
       "avgvisib_85s_060m_201608.img")
USER_AGENT = "sbats-validation/0.1 (NASA Space Apps 2026 student project)"
N = 5058                 # LINES and LINE_SAMPLES
SCALE_M = 60.0           # MAP_SCALE
CENTRE = 2528.5          # LINE_ and SAMPLE_PROJECTION_OFFSET
DN_TO_FRACTION = 0.00004  # SCALING_FACTOR
RADIUS_M = 1_737_400.0
RADIUS_KM = 2.0          # search radius for the best-lit ground near a point

# Peaks for which Bryant 2009 (JPL IPN Progress Report 42-176, Table 2 and Table 3) gives illumination.
EXTRA_POINTS = {
    "bryant-malapert-alpha": ("Malapert alpha peak, Bryant 2009 site MA", -86.037, 1.704),
    "bryant-leibnitz-beta": ("Leibnitz beta peak (Mons Mouton), Bryant 2009 site LB", -84.722, 39.470),
    "glaser-shackleton-rim": ("Best-lit Shackleton rim point at the surface, Glaser et al. 2018 Table 1", -89.7849, 203.97),
}


def xy(lat: float, lon: float) -> tuple[float, float]:
    """South polar stereographic map coordinates in metres (x towards 90 E, y towards 0 E)."""
    r = 2 * RADIUS_M * math.tan(math.radians(90.0 + lat) / 2)
    return r * math.sin(math.radians(lon)), r * math.cos(math.radians(lon))


def fetch(start: int, length: int) -> bytes:
    headers = {"Range": f"bytes={start}-{start + length - 1}", "User-Agent": USER_AGENT}
    last = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(URL, headers=headers), timeout=180) as r:
                data = r.read()
            if len(data) != length:
                raise RuntimeError(f"short read: {len(data)} bytes")
            return data
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"failed to fetch: {last}")


def around(lat: float, lon: float) -> dict:
    x, y = xy(lat, lon)
    col, row = CENTRE + x / SCALE_M, CENTRE - y / SCALE_M
    half = math.ceil(RADIUS_KM * 1000 / SCALE_M)
    r0, r1 = round(row) - half, round(row) + half + 1
    c0, c1 = round(col) - half, round(col) + half + 1
    if r0 < 0 or c0 < 0 or r1 > N or c1 > N:
        return {"inMap": False}
    raw = fetch(r0 * N * 2, (r1 - r0) * N * 2)
    best, best_d, at_point, shadow, count = -1.0, 0.0, None, 0, 0
    for r in range(r0, r1):
        line = struct.unpack_from(f"<{c1 - c0}h", raw, ((r - r0) * N + c0) * 2)
        for k, dn in enumerate(line):
            c = c0 + k
            d = math.hypot((c - col) * SCALE_M, (r - row) * SCALE_M)
            if r == round(row) and c == round(col):
                at_point = dn * DN_TO_FRACTION
            if d > RADIUS_KM * 1000:
                continue
            count += 1
            shadow += dn == 0
            if dn * DN_TO_FRACTION > best:
                best, best_d = dn * DN_TO_FRACTION, d
    return {
        "inMap": True,
        "atPoint": round(at_point, 3),
        "permanentShadowAtPoint": at_point == 0,
        "bestWithinRadius": round(best, 3),
        "bestDistanceKm": round(best_d / 1000, 2),
        "shareOfDiscInPermanentShadow": round(shadow / count, 3),
    }


def main() -> None:
    centre = around(-89.67, 129.78)
    rim = around(*EXTRA_POINTS["glaser-shackleton-rim"][1:])
    if not centre["permanentShadowAtPoint"] or rim["bestWithinRadius"] < 0.7:
        raise RuntimeError(f"orientation check failed: Shackleton centre {centre}, rim {rim}")

    out = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "LOLA average solar illumination map AVGVISIB_85S_060M_201608 (NASA PDS, LRO LOLA extras; Mazarico et al. 2011)",
        "method": f"Value at the point, and the highest value within {RADIUS_KM} km. 0 is permanent shadow, 1 is always lit.",
        "orientationCheck": {"shackletonCentre": centre, "shackletonRimGlaser2018": rim},
        "targets": {},
        "otherPoints": {},
    }
    for t in json.loads(TARGETS.read_text()):
        if t["body"] != "moon" or t["lat"] > -80:
            continue
        res = around(t["lat"], t["lon"])
        out["targets"][t["id"]] = res
        print(f'{t["id"]:26s} {res}', flush=True)
    for key, (label, lat, lon) in EXTRA_POINTS.items():
        res = {"label": label, "lat": lat, "lon": lon, **around(lat, lon)}
        out["otherPoints"][key] = res
        print(f"{key:26s} {res}", flush=True)
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

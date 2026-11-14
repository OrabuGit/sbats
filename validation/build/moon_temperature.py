"""Annual mean surface temperature of the lunar targets, from LRO Diviner.

Source: Diviner Lunar Radiometer Experiment Polar Resource Product, south pole
(PDS data set LRO-L-DLRE-5-PRP-V2.0, file DLRE_PRP_SOUTH.TAB, D. A. Paige, UCLA; method in
Paige et al. 2010, Science 330:479, doi:10.1126/science.1187726).
https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/

The file is a table of 2,880,000 triangles on a 500 m grid covering the region poleward of about
80 S. For each triangle it gives, in the words of its label:
  temp_avg  "The annual average temperature (K), calculated at a depth of 2 cm below the surface"
  temp_max  "The annual maximum temperature (K), calculated at the surface"
These come from the Diviner team's thermal model fitted to Diviner measurements. They are a
mission data product, not a raw reading, and temp_avg is just below the surface, not air (the
Moon has none). That is the closest lunar counterpart to Earth's annual mean temperature.

For each Moon target in data/targets.json this script averages temp_avg over the same
55.6 km x 55.6 km window used for slope and roughness (validation/target_terrain.py).

The table is 605 MB of fixed-length rows, ordered as a 1200 x 1200 grid, two triangles per grid
square. Only every second grid line that crosses a window is downloaded (HTTP range requests,
about 30 MB per target), so the window is sampled every 1 km in one direction and every 0.5 km in
the other. Triangles are selected by their own centre longitude and latitude, not by index maths.

Run from the repository root (takes several minutes, the server is slow):

    python3 validation/build/moon_temperature.py

Writes validation/output/moon_temperature.json. Copy numbers into data/targets.json by hand.

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
from __future__ import annotations

import json
import math
import statistics
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TARGETS = ROOT / "data" / "targets.json"
OUT = ROOT / "validation" / "output" / "moon_temperature.json"

URL = ("https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/"
       "dlre_prp_south.tab")
USER_AGENT = "sbats-validation/0.1 (NASA Space Apps 2026 student project)"
ROW_BYTES = 210           # RECORD_BYTES in the label; record 1 is the header
GRID = 1200               # grid lines per side
PER_LINE = 2 * GRID       # triangles per grid line
STEP_KM = 0.5
HALF_KM = 300.0
RADIUS_KM = 1737.4
WINDOW_KM = 55.6
LINE_STRIDE = 2           # download every second grid line
KELVIN = 273.15


def fetch(start_record: int, count: int) -> list[str]:
    first = ROW_BYTES * (1 + start_record)
    headers = {"Range": f"bytes={first}-{first + ROW_BYTES * count - 1}", "User-Agent": USER_AGENT}
    last = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(URL, headers=headers), timeout=300) as r:
                data = r.read()
            if len(data) != ROW_BYTES * count:
                raise RuntimeError(f"short read: {len(data)} bytes")
            return data.decode("ascii").splitlines()
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"failed to fetch rows {start_record}..: {last}")


def cartesian(lat: float, lon: float) -> tuple[float, float]:
    """x (towards longitude 0) and y (towards 90 E) of a surface point, in km."""
    c = RADIUS_KM * math.cos(math.radians(lat))
    return c * math.cos(math.radians(lon)), c * math.sin(math.radians(lon))


def window_temperature(lat: float, lon: float) -> dict:
    xs, ys = cartesian(lat, lon)
    half = WINDOW_KM / 2
    # Grid lines run along y at fixed x; line 0 is at x = +300 km. The grid coordinate is close to,
    # but not exactly, the Cartesian x, so take a margin and select by each triangle's own centre.
    margin = half + 6
    line_lo = max(0, math.floor((HALF_KM - (xs + margin)) / STEP_KM))
    line_hi = min(GRID - 1, math.ceil((HALF_KM - (xs - margin)) / STEP_KM))
    col_lo = max(0, math.floor((ys - margin + HALF_KM) / STEP_KM))
    col_hi = min(GRID - 1, math.ceil((ys + margin + HALF_KM) / STEP_KM))

    def one_line(line: int) -> list[tuple[float, float]]:
        rows = fetch(line * PER_LINE + col_lo * 2, (col_hi - col_lo + 1) * 2)
        picked = []
        for row in rows:
            f = row.split(",")
            clon, clat, t_avg, t_max = float(f[9]), float(f[10]), float(f[12]), float(f[13])
            x, y = cartesian(clat, clon)
            if abs(x - xs) <= half and abs(y - ys) <= half and t_avg > 0 and t_max > 0:
                picked.append((t_avg, t_max))
        return picked

    lines = list(range(line_lo, line_hi + 1, LINE_STRIDE))
    with ThreadPoolExecutor(max_workers=6) as pool:
        chunks = list(pool.map(one_line, lines))
    values = [v for chunk in chunks for v in chunk]
    if len(values) < 1000:
        raise RuntimeError(f"only {len(values)} triangles found around {lat}, {lon}")
    avg = [v[0] for v in values]
    mx = [v[1] for v in values]
    mean_avg = statistics.fmean(avg)
    return {
        "triangles": len(values),
        "gridLinesRead": len(lines),
        "tempAvgMeanK": round(mean_avg, 1),
        "tempAvgMeanC": round(mean_avg - KELVIN, 1),
        "tempAvgMinK": round(min(avg), 1),
        "tempAvgMaxK": round(max(avg), 1),
        "tempAvgStdK": round(statistics.pstdev(avg), 1),
        "tempMaxMeanK": round(statistics.fmean(mx), 1),
        "tempMaxHighestK": round(max(mx), 1),
        "shareOfWindowWithAnnualMaxBelow110K": round(sum(1 for v in mx if v < 110) / len(mx), 3),
    }


def main() -> None:
    targets = [t for t in json.loads(TARGETS.read_text()) if t["body"] == "moon"]
    out = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "LRO Diviner Polar Resource Product, PDS LRO-L-DLRE-5-PRP-V2.0, DLRE_PRP_SOUTH.TAB",
        "method": (f"Mean of temp_avg over triangles whose centre lies in a {WINDOW_KM} km square centred on the "
                   f"target; every {LINE_STRIDE}nd grid line read."),
        "targets": {},
    }
    for t in targets:
        res = window_temperature(t["lat"], t["lon"])
        out["targets"][t["id"]] = res
        print(f'{t["id"]:24s} annual mean {res["tempAvgMeanK"]:6.1f} K ({res["tempAvgMeanC"]:7.1f} C)   '
              f'range of local means {res["tempAvgMinK"]} to {res["tempAvgMaxK"]} K   '
              f'mean annual max {res["tempMaxMeanK"]} K   n={res["triangles"]}', flush=True)
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

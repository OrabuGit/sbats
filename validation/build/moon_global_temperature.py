"""Mean surface temperature and day-night swing of a lunar target away from the poles, from LRO Diviner.

The polar targets use the Diviner Polar Resource Product (validation/build/moon_temperature.py), which
stops at about 80 degrees latitude. Marius Hills is at 14 N, so it needs the global product:

Source: Diviner Lunar Radiometer Experiment Global Cumulative Products, PDS data set
LRO-L-DLRE-5-GCP-V1.0 (J.-P. Williams, UCLA), files GLOBAL_CUMUL_AVG_CYL_<band>_002.TAB.
Method paper: Williams et al. 2017, Icarus 283:300-325, doi:10.1016/j.icarus.2016.08.012.
https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_gcp/

In the words of the label, each table holds "brightness temperatures and bolometric brightness
temperatures ... binned at 0.5 degree latitude and longitude and 0.25 hours of local time derived from
a compilation of all nadir observations acquired from 5-July-2009 to 1-April-2015". Rows are ordered
longitude, then latitude, then local time (checked against the file itself before use).

What this script does, for each Moon target that the polar product does not cover:
  1. Takes the 0.5 degree bins whose centre lies inside the same 55.6 km square used for slope and
     roughness (validation/target_terrain.py).
  2. For each of the 96 local-time steps, averages the bolometric temperature of those bins.
     Steps with no observation in any bin are filled by straight-line interpolation in local time
     (the count of filled steps is reported; the script stops if more than a third of the day is
     empty or any gap is longer than half an hour of local time).
  3. tempMean = mean over the 96 steps: the average surface temperature over one lunar day.
     tempRange = highest step minus lowest step: the day-night swing of the surface.

This is a measured surface temperature. The polar targets carry a modelled annual average at 2 cm
depth instead, which at low latitude would be tens of kelvin warmer than the surface mean. The two
are not the same statistic; data/REVIEW_ME.md says so. Both are far colder than anywhere on Earth,
so the score clamps them to the same value.

Run from the repository root:

    python3 validation/build/moon_global_temperature.py

Writes validation/output/moon_global_temperature.json. Copy numbers into make_targets.py by hand.

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
from __future__ import annotations

import json
import math
import statistics
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TARGETS = ROOT / "data" / "targets.json"
OUT = ROOT / "validation" / "output" / "moon_global_temperature.json"

BASE = "https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_gcp/"
USER_AGENT = "sbats-validation/0.1 (NASA Space Apps 2026 student project)"
ROW_BYTES = 113            # RECORD_BYTES in the label; record 1 is the header
BIN_DEG = 0.5
LAT_BINS = 20              # one file covers 10 degrees of latitude
STEPS = 96                 # 0.25 h of local time
WINDOW_KM = 55.6
RADIUS_KM = 1737.4
KELVIN = 273.15
MAX_GAP_STEPS = 2          # longest run of empty local-time steps that may be interpolated
POLAR_PRODUCT_LIMIT = 78.0  # targets poleward of this use the polar product


def band_file(lat: float) -> tuple[str, float]:
    """File name and southern edge of the 10 degree band that holds a latitude."""
    south = 10.0 * math.floor(lat / 10.0)
    north = south + 10.0

    def tag(x: float) -> str:
        return f"{abs(int(x)):02d}{'n' if x >= 0 else 's'}"

    return f"global_cumul_avg_cyl_{tag(south)}{tag(north)}_002.tab", south


def fetch_rows(url: str, first_row: int, count: int) -> list[str]:
    start = ROW_BYTES * (1 + first_row)
    headers = {"Range": f"bytes={start}-{start + ROW_BYTES * count - 1}", "User-Agent": USER_AGENT}
    last = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=300) as r:
                data = r.read()
            if len(data) != ROW_BYTES * count:
                raise RuntimeError(f"short read: {len(data)} bytes")
            return data.decode("ascii").splitlines()
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"failed to fetch rows {first_row}..: {last}")


def window_temperature(lat: float, lon: float) -> dict:
    lon = ((lon + 180.0) % 360.0) - 180.0
    name, south = band_file(lat)
    half_lat = math.degrees(WINDOW_KM / 2 / RADIUS_KM)
    half_lon = half_lat / math.cos(math.radians(lat))
    if lat - half_lat < south or lat + half_lat > south + 10.0:
        raise RuntimeError("window crosses a 10 degree file edge; not handled")

    lon_idx = [i for i in range(720) if abs((-179.75 + i * BIN_DEG) - lon) <= half_lon]
    lat_idx = [j for j in range(LAT_BINS) if abs((south + 0.25 + j * BIN_DEG) - lat) <= half_lat]
    per_step: list[list[float]] = [[] for _ in range(STEPS)]
    bins = []
    for i in lon_idx:
        rows = fetch_rows(BASE + name, i * LAT_BINS * STEPS + lat_idx[0] * STEPS, len(lat_idx) * STEPS)
        for n, row in enumerate(rows):
            f = [x.strip() for x in row.split(",")]
            clon, clat, ltim, tbol = float(f[0]), float(f[1]), float(f[2]), float(f[10])
            j, step = lat_idx[0] + n // STEPS, n % STEPS
            # The row must be the bin we asked for: guards against a wrong assumption about row order.
            want_lon, want_lat = -179.75 + i * BIN_DEG, south + 0.25 + j * BIN_DEG
            if abs(clon - want_lon) > 1e-6 or abs(clat - want_lat) > 1e-6 or abs(ltim - (step + 0.5) * 0.25) > 0.011:
                raise RuntimeError(f"row order is not as assumed: got {clon}, {clat}, {ltim}")
            if tbol > 0:
                per_step[step].append(tbol)
        bins += [(round(-179.75 + i * BIN_DEG, 2), round(south + 0.25 + j * BIN_DEG, 2)) for j in lat_idx]

    curve: list[float | None] = [statistics.fmean(v) if v else None for v in per_step]
    empty = [s for s, v in enumerate(curve) if v is None]
    # The orbit samples some local times and not others, the same ones in every bin, so gaps are short
    # and scattered. Refuse to interpolate if they are not: more than a third of the day, or any gap
    # longer than MAX_GAP_STEPS (half an hour of local time).
    longest = run = 0
    for s in list(range(STEPS)) * 2:
        run = run + 1 if curve[s] is None else 0
        longest = max(longest, run)
    if len(empty) > STEPS // 3 or longest > MAX_GAP_STEPS:
        raise RuntimeError(f"{len(empty)} of {STEPS} local-time steps have no observation, longest gap {longest} steps")
    filled = list(curve)
    for s in empty:  # straight line between the nearest observed steps, wrapping around midnight
        a = next(k for k in range(1, STEPS) if curve[(s - k) % STEPS] is not None)
        b = next(k for k in range(1, STEPS) if curve[(s + k) % STEPS] is not None)
        va, vb = curve[(s - a) % STEPS], curve[(s + b) % STEPS]
        filled[s] = va + (vb - va) * a / (a + b)  # type: ignore[operator]
    values = [float(x) for x in filled]  # type: ignore[arg-type]
    mean, hi, lo = statistics.fmean(values), max(values), min(values)
    return {
        "file": name,
        "bins": len(bins),
        "binCentres": bins,
        "observationsPerStepMin": min(len(v) for v in per_step),
        "localTimeStepsFilled": len(empty),
        "longestGapSteps": longest,
        "tempMeanK": round(mean, 1), "tempMeanC": round(mean - KELVIN, 1),
        "tempMaxK": round(hi, 1), "tempMaxLocalTimeH": round((values.index(hi) + 0.5) * 0.25, 2),
        "tempMinK": round(lo, 1), "tempMinLocalTimeH": round((values.index(lo) + 0.5) * 0.25, 2),
        "tempRangeK": round(hi - lo, 1),
    }


def main() -> None:
    targets = [t for t in json.loads(TARGETS.read_text())
               if t["body"] == "moon" and abs(t["lat"]) < POLAR_PRODUCT_LIMIT]
    out = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "LRO Diviner Global Cumulative Products, PDS LRO-L-DLRE-5-GCP-V1.0 (Williams et al. 2017, Icarus 283:300)",
        "method": (f"Bolometric temperature of the 0.5 degree bins centred inside a {WINDOW_KM} km square around the target, "
                   "averaged per 0.25 h local-time step; tempMean is the mean of the 96 steps, tempRange the highest minus the lowest."),
        "targets": {},
    }
    for t in targets:
        res = window_temperature(t["lat"], t["lon"])
        out["targets"][t["id"]] = res
        print(f'{t["id"]:22s} mean {res["tempMeanK"]} K ({res["tempMeanC"]} C)  max {res["tempMaxK"]} K at {res["tempMaxLocalTimeH"]} h  '
              f'min {res["tempMinK"]} K at {res["tempMinLocalTimeH"]} h  swing {res["tempRangeK"]} K  '
              f'bins {res["bins"]}  filled steps {res["localTimeStepsFilled"]}')
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

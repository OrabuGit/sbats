"""Near-surface air temperature of the Mars targets, defined the same way as Earth's.

Earth's `tempMean` and `tempRange` in data/earth.json are NASA POWER T2M and T2M_RANGE: the annual
mean of 2 m air temperature and the annual mean of its daily maximum minus daily minimum. This
script produces the same two quantities for each Mars target in data/targets.json.

Two sources, used for different jobs:

1. Mars Climate Database v6.2 web interface (LMD / OU / IAA / ESA / CNES),
   https://www-mars.lmd.jussieu.fr/mcd_python/ , climatology scenario with average solar forcing.
   A climate model, not a measurement. For each target it returns air temperature at 2 m above
   the surface for 24 seasons (every 15 degrees of solar longitude Ls) and 24 local hours.
     tempMean  = mean over the 24 hours, then over the seasons
     tempRange = (max minus min over the 24 hours), then the mean over the seasons
   Seasons are weighted by how long Mars spends in them, because its orbit is eccentric:
   time per degree of Ls is proportional to 1 / (1 + e cos(Ls - Lp))^2, with e = 0.0935
   (NASA NSSDC Mars Fact Sheet) and perihelion at Lp = 251 degrees (LMD Mars calendar page).

2. Curiosity REMS daily minimum and maximum air temperature, from NASA's public Mars weather feed
   (https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json, data by Centro de
   Astrobiologia). This is an outreach product: its own disclaimer says so and points to the PDS
   for science use. It is used here for Gale's measured day-night swing and to check the model at
   the one target where a rover has measured for several Mars years.

Run from the repository root:

    python3 validation/build/mars_temperature.py

Writes validation/output/mars_temperature.json. Copy numbers into data/targets.json by hand.

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
from __future__ import annotations

import json
import math
import re
import statistics
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TARGETS = ROOT / "data" / "targets.json"
OUT = ROOT / "validation" / "output" / "mars_temperature.json"

USER_AGENT = "sbats-validation/0.1 (NASA Space Apps 2026 student project)"
MCD = "https://www-mars.lmd.jussieu.fr/mcd_python"
REMS_FEED = "https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json"

ALTITUDE_M = 2.0          # same height as Earth's T2M
ECCENTRICITY = 0.0935     # NSSDC Mars Fact Sheet, "Orbit eccentricity"
LS_PERIHELION = 251.0     # LMD Mars calendar page
KELVIN = 273.15


def get(url: str, timeout: int = 240) -> bytes:
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"failed to fetch {url}: {last}")


def season_weight(ls: float) -> float:
    """Relative time Mars spends per degree of solar longitude around `ls`."""
    return 1.0 / (1.0 + ECCENTRICITY * math.cos(math.radians(ls - LS_PERIHELION))) ** 2


def mcd_air_temperature(lat: float, lon: float) -> dict:
    """Queries the MCD for 2 m air temperature over all seasons and local times at one point."""
    params = {
        "datekeyhtml": "1", "ls": "all", "localtime": "all",
        "latitude": f"{lat}", "longitude": f"{lon % 360.0}", "altitude": f"{ALTITUDE_M}", "zkey": "3",
        "isfixedlt": "off", "dust": "1", "hrkey": "1", "averaging": "off", "dpi": "80", "islog": "off",
        "colorm": "jet", "minval": "", "maxval": "", "proj": "cyl", "plat": "", "plon": "", "trans": "",
        "iswind": "off", "latpoint": "", "lonpoint": "",
        "var1": "t", "var2": "none", "var3": "none", "var4": "none",
    }
    page = get(f"{MCD}/cgi-bin/mcdcgi.py?{urllib.parse.urlencode(params)}").decode("utf-8", "replace")
    m = re.search(r"href='\.\./(txt/[0-9a-f]+\.txt)'", page)
    if not m:
        raise RuntimeError("MCD did not return a data file")
    text = get(f"{MCD}/{m.group(1)}").decode("utf-8", "replace")

    header = [line for line in text.splitlines() if line.startswith("###")]
    if not any("Temperature (K)" in h for h in header):
        raise RuntimeError("unexpected MCD variable")
    version = next((h.strip("# ").strip() for h in header if "MCD_v" in h), "unknown")
    where = next((h.strip("# ").strip() for h in header if "Latitude" in h), "unknown")

    hours: list[float] = []
    rows: list[tuple[float, list[float]]] = []
    for line in text.splitlines():
        if "||" not in line:
            continue
        left, right = line.split("||", 1)
        values = [float(v) for v in right.split()]
        if left.strip().startswith("-"):
            hours = values
        else:
            rows.append((float(left), values))
    if len(hours) < 24 or len(rows) < 24:
        raise RuntimeError("unexpected MCD table shape")

    # Ls 360 repeats Ls 0 and local hour 24 repeats hour 0: drop the repeats.
    rows = [(ls, v) for ls, v in rows if ls < 360.0]
    keep = [i for i, h in enumerate(hours) if h < 24.0]

    w_sum = mean_sum = range_sum = mid_sum = 0.0
    seasons = []
    for ls, values in rows:
        day = [values[i] for i in keep]
        w = season_weight(ls)
        d_mean, d_range = statistics.fmean(day), max(day) - min(day)
        w_sum += w
        mean_sum += w * d_mean
        range_sum += w * d_range
        mid_sum += w * (max(day) + min(day)) / 2
        seasons.append({"ls": ls, "meanK": round(d_mean, 2), "minK": round(min(day), 2), "maxK": round(max(day), 2)})
    return {
        "tempMeanC": round(mean_sum / w_sum - KELVIN, 1),
        "tempRangeC": round(range_sum / w_sum, 1),
        "midpointOfDailyMinMaxC": round(mid_sum / w_sum - KELVIN, 1),
        "unweightedTempMeanC": round(statistics.fmean(s["meanK"] for s in seasons) - KELVIN, 1),
        "version": version,
        "point": where,
        "seasons": seasons,
    }


def rems_statistics() -> dict:
    """Annual statistics of Curiosity's daily air temperature extremes from NASA's weather feed."""
    feed = json.loads(get(REMS_FEED))
    bins: dict[int, list[tuple[float, float]]] = {}
    sols = []
    for row in feed["soles"]:
        try:
            ls, lo, hi = float(row["ls"]), float(row["min_temp"]), float(row["max_temp"])
        except (KeyError, ValueError):
            continue
        if hi < lo:
            continue
        bins.setdefault(int(ls // 15) % 24, []).append((lo, hi))
        sols.append(int(row["sol"]))
    if len(bins) != 24:
        raise RuntimeError("REMS feed does not cover every season")
    w_sum = mid_sum = range_sum = 0.0
    for b, values in bins.items():
        w = season_weight(b * 15 + 7.5)
        w_sum += w
        mid_sum += w * statistics.fmean((lo + hi) / 2 for lo, hi in values)
        range_sum += w * statistics.fmean(hi - lo for lo, hi in values)
    return {
        "source": REMS_FEED,
        "sols": len(sols),
        "firstSol": min(sols),
        "lastSol": max(sols),
        "fewestSolsInASeasonBin": min(len(v) for v in bins.values()),
        "midpointOfDailyMinMaxC": round(mid_sum / w_sum, 1),
        "tempRangeC": round(range_sum / w_sum, 1),
        "note": "Mean over 24 season bins of 15 degrees Ls, weighted by season length. Air temperature, about 1.6 m above ground.",
    }


def main() -> None:
    targets = [t for t in json.loads(TARGETS.read_text()) if t["body"] == "mars"]
    out = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "altitudeM": ALTITUDE_M,
        "seasonWeighting": {"eccentricity": ECCENTRICITY, "lsPerihelion": LS_PERIHELION},
        "mcd": {},
        "rems": rems_statistics(),
    }
    r = out["rems"]
    print(f'REMS at Gale, {r["sols"]} sols: midpoint of daily min and max {r["midpointOfDailyMinMaxC"]} C, '
          f'daily range {r["tempRangeC"]} C')
    for t in targets:
        res = mcd_air_temperature(t["lat"], t["lon"])
        out["mcd"][t["id"]] = res
        print(f'{t["id"]:24s} MCD mean {res["tempMeanC"]:6.1f} C   daily range {res["tempRangeC"]:5.1f} C   '
              f'(midpoint of min and max {res["midpointOfDailyMinMaxC"]} C)')
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

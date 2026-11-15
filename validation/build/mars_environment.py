"""Wind and dust at Mars points, for the dimensions added after the freeze.

Source: Mars Climate Database v6.2 web interface (LMD / OU / IAA / ESA / CNES),
https://www-mars.lmd.jussieu.fr/mcd_python/ , climatology scenario with average solar activity.
A climate model, not a measurement. Variables, in the interface's own words:
  wind  "Horizontal wind speed (m/s)", asked for 10 m above the surface, the height Earth wind
        products use
  dod   "Monthly mean dust column visible optical depth"

For each Mars target in data/targets.json it reads the value for 24 seasons (every 15 degrees of solar
longitude) and 24 local hours and gives the mean over the Mars year, seasons weighted by their length
(as in mars_temperature.py), plus the lowest and highest seasonal mean.

Run from the repository root:  python3 validation/build/mars_environment.py
Writes validation/output/mars_environment.json. Numbers are copied into
validation/build/make_target_environment.py by hand.

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
from __future__ import annotations

import json
import re
import sys
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mars_temperature import MCD, ROOT, TARGETS, get, season_weight  # noqa: E402

OUT = ROOT / "validation" / "output" / "mars_environment.json"
VARIABLES = {
    "wind": ("Horizontal wind speed", "10.0"),
    "dod": ("dust column visible optical depth", "10.0"),
}


def table(lat: float, lon: float, var: str) -> tuple[list[tuple[float, list[float]]], list[str]]:
    expect, altitude = VARIABLES[var]
    params = {
        "datekeyhtml": "1", "ls": "all", "localtime": "all",
        "latitude": f"{lat}", "longitude": f"{lon % 360.0}", "altitude": altitude, "zkey": "3",
        "isfixedlt": "off", "dust": "1", "hrkey": "1", "averaging": "off", "dpi": "80", "islog": "off",
        "colorm": "jet", "minval": "", "maxval": "", "proj": "cyl", "plat": "", "plon": "", "trans": "",
        "iswind": "off", "latpoint": "", "lonpoint": "",
        "var1": var, "var2": "none", "var3": "none", "var4": "none",
    }
    page = get(f"{MCD}/cgi-bin/mcdcgi.py?{urllib.parse.urlencode(params)}").decode("utf-8", "replace")
    m = re.search(r"href='\.\./(txt/[0-9a-f]+\.txt)'", page)
    if not m:
        raise RuntimeError(f"MCD did not return a data file for {var}")
    text = get(f"{MCD}/{m.group(1)}").decode("utf-8", "replace")
    header = [line.strip("# ").strip() for line in text.splitlines() if line.startswith("###")]
    if not any(expect.lower() in h.lower() for h in header):
        raise RuntimeError(f"unexpected MCD variable for {var}: {header}")
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
    keep = [i for i, h in enumerate(hours) if h < 24.0]
    return [(ls, [v[i] for i in keep]) for ls, v in rows if ls < 360.0], header


def year_mean(rows: list[tuple[float, list[float]]]) -> dict:
    w_sum = total = 0.0
    seasonal = []
    for ls, day in rows:
        mean = sum(day) / len(day)
        w = season_weight(ls)
        w_sum += w
        total += w * mean
        seasonal.append(mean)
    return {"mean": total / w_sum, "lowestSeason": min(seasonal), "highestSeason": max(seasonal), "seasons": len(seasonal)}


def main() -> None:
    targets = [t for t in json.loads(TARGETS.read_text()) if t["body"] == "mars"]
    out = {"generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "targets": {}, "headers": {}}
    for t in targets:
        res = {}
        for var in VARIABLES:
            rows, header = table(t["lat"], t["lon"], var)
            y = year_mean(rows)
            res[var] = {k: (round(v, 3) if isinstance(v, float) else v) for k, v in y.items()}
            out["headers"][var] = header
        out["targets"][t["id"]] = res
        print(f'{t["id"]:24s} wind {res["wind"]["mean"]:.2f} m/s ({res["wind"]["lowestSeason"]:.2f} to {res["wind"]["highestSeason"]:.2f})   '
              f'dust optical depth {res["dod"]["mean"]:.3f} ({res["dod"]["lowestSeason"]:.3f} to {res["dod"]["highestSeason"]:.3f})', flush=True)
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

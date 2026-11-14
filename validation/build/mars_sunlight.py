"""Sunlight at the Mars targets, for the `sites` block of data/modules.json.

Source: Mars Climate Database v6.2 web interface (LMD / OU / IAA / ESA / CNES),
https://www-mars.lmd.jussieu.fr/mcd_python/ , variable `fluxsurf_dn_sw`, "Incident solar flux on
horizontal surface (W/m2)". A climate model, not a measurement.

For each Mars target in data/targets.json it asks for that flux over 24 seasons (every 15 degrees of
solar longitude) and 24 local hours, under two dust scenarios:
  1  "climatology ave solar"   the normal year
  5  "dust storm ave solar"    a planet-wide dust storm

and computes, with seasons weighted by their length (as in mars_temperature.py):
  meanFluxWm2        mean over all hours and seasons: the average power falling on flat ground
  litFraction        share of local hours with any sunlight
  irradianceWm2      meanFluxWm2 / litFraction: the average flux while the Sun is up
  longestDarkHours   the longest night of the year: most consecutive hours with no sunlight in any
                     season, times 24.6597 / 24 (one Martian hour in Earth hours; day length from the
                     NASA NSSDC Mars Fact Sheet). The table has one value per hour, so this is good
                     to about an hour.
  dustStormFactor    mean flux in the dust-storm scenario divided by the normal one, at five seasons
                     inside the dust-storm season (solar longitude 210, 240, 270, 300, 330). The
                     database only offers the dust-storm scenario for that half of the year.

Run from the repository root:  python3 validation/build/mars_sunlight.py
Writes validation/output/mars_sunlight.json. Copy numbers into data/modules.json by hand.

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

OUT = ROOT / "validation" / "output" / "mars_sunlight.json"
SOL_HOURS = 24.6597  # NSSDC Mars Fact Sheet, "Length of day (hrs)"


STORM_SEASONS = [210.0, 240.0, 270.0, 300.0, 330.0]  # the dust-storm scenario exists only for Ls 180 to 360


def storm_day(lat: float, lon: float, ls: float) -> tuple[list[float], str]:
    """Hourly surface flux for one season under the dust-storm scenario (the scenario cannot be asked for a whole year)."""
    params = {
        "datekeyhtml": "1", "ls": f"{ls}", "localtime": "all",
        "latitude": f"{lat}", "longitude": f"{lon % 360.0}", "altitude": "2.0", "zkey": "3",
        "isfixedlt": "off", "dust": "5", "hrkey": "1", "averaging": "off", "dpi": "80", "islog": "off",
        "colorm": "jet", "minval": "", "maxval": "", "proj": "cyl", "plat": "", "plon": "", "trans": "",
        "iswind": "off", "latpoint": "", "lonpoint": "",
        "var1": "fluxsurf_dn_sw", "var2": "none", "var3": "none", "var4": "none",
    }
    page = get(f"{MCD}/cgi-bin/mcdcgi.py?{urllib.parse.urlencode(params)}").decode("utf-8", "replace")
    m = re.search(r"href='\.\./(txt/[0-9a-f]+\.txt)'", page)
    if not m:
        raise RuntimeError(f"MCD did not return a dust-storm file for Ls {ls}")
    text = get(f"{MCD}/{m.group(1)}").decode("utf-8", "replace")
    header = [line.strip("# ").strip() for line in text.splitlines() if line.startswith("###")]
    if not any("solar flux on horizontal surface" in h for h in header) or not any("dust storm" in h for h in header):
        raise RuntimeError(f"unexpected MCD output: {header}")
    day = []
    for line in text.splitlines():
        parts = line.split()
        if len(parts) == 2 and not line.startswith("#"):
            hour, value = float(parts[0]), float(parts[1])
            if hour < 24.0:
                day.append(max(0.0, value))
    if len(day) != 24:
        raise RuntimeError(f"expected 24 hourly values, got {len(day)}")
    return day, next((h for h in header if "MCD_v" in h), "unknown")


def flux_table(lat: float, lon: float, dust: int) -> tuple[list[tuple[float, list[float]]], str]:
    params = {
        "datekeyhtml": "1", "ls": "all", "localtime": "all",
        "latitude": f"{lat}", "longitude": f"{lon % 360.0}", "altitude": "2.0", "zkey": "3",
        "isfixedlt": "off", "dust": str(dust), "hrkey": "1", "averaging": "off", "dpi": "80", "islog": "off",
        "colorm": "jet", "minval": "", "maxval": "", "proj": "cyl", "plat": "", "plon": "", "trans": "",
        "iswind": "off", "latpoint": "", "lonpoint": "",
        "var1": "fluxsurf_dn_sw", "var2": "none", "var3": "none", "var4": "none",
    }
    page = get(f"{MCD}/cgi-bin/mcdcgi.py?{urllib.parse.urlencode(params)}").decode("utf-8", "replace")
    m = re.search(r"href='\.\./(txt/[0-9a-f]+\.txt)'", page)
    if not m:
        raise RuntimeError("MCD did not return a data file")
    text = get(f"{MCD}/{m.group(1)}").decode("utf-8", "replace")
    header = [line.strip("# ").strip() for line in text.splitlines() if line.startswith("###")]
    if not any("solar flux on horizontal surface" in h for h in header):
        raise RuntimeError(f"unexpected MCD variable: {header}")
    scenario = next((h for h in header if "MCD_v" in h), "unknown")
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
    return [(ls, [max(0.0, v[i]) for i in keep]) for ls, v in rows if ls < 360.0], scenario


def longest_run_of_zero(day: list[float]) -> int:
    """Most consecutive dark hours in a day that wraps round midnight."""
    if all(v <= 0 for v in day):
        return len(day)
    best = run = 0
    for v in day + day:
        run = run + 1 if v <= 0 else 0
        best = max(best, run)
    return min(best, len(day))


def summarise(rows: list[tuple[float, list[float]]], only=None) -> dict:
    w_sum = flux = lit = 0.0
    longest = 0
    for ls, day in rows:
        if only and not only(ls):
            continue
        w = season_weight(ls)
        w_sum += w
        flux += w * sum(day) / len(day)
        lit += w * sum(1 for v in day if v > 0) / len(day)
        longest = max(longest, longest_run_of_zero(day))
    return {"meanFluxWm2": flux / w_sum, "litFraction": lit / w_sum, "longestDarkMarsHours": longest}


def main() -> None:
    targets = [t for t in json.loads(TARGETS.read_text()) if t["body"] == "mars"]
    out = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "variable": "fluxsurf_dn_sw: Incident solar flux on horizontal surface (W/m2)",
        "solHours": SOL_HOURS,
        "targets": {},
    }
    for t in targets:
        clim, scen1 = flux_table(t["lat"], t["lon"], 1)
        year = summarise(clim)
        by_ls = {ls: sum(day) / len(day) for ls, day in clim}
        w_sum = storm_sum = clim_sum = 0.0
        scen5 = ""
        per_season = {}
        for ls in STORM_SEASONS:
            day, scen5 = storm_day(t["lat"], t["lon"], ls)
            w = season_weight(ls)
            w_sum += w
            storm_sum += w * sum(day) / len(day)
            clim_sum += w * by_ls[ls]
            per_season[str(int(ls))] = round((sum(day) / len(day)) / by_ls[ls], 3)
        factor = storm_sum / clim_sum
        res = {
            "meanFluxWm2": round(year["meanFluxWm2"], 1),
            "litFraction": round(year["litFraction"], 3),
            "irradianceWm2": round(year["meanFluxWm2"] / year["litFraction"], 1),
            "longestDarkHours": round(year["longestDarkMarsHours"] * SOL_HOURS / 24, 1),
            "dustStormFactor": round(factor, 3),
            "dustStormFactorBySeason": per_season,
            "scenarios": [scen1, scen5],
        }
        out["targets"][t["id"]] = res
        print(f'{t["id"]:24s} mean {res["meanFluxWm2"]:6.1f} W/m2  lit {res["litFraction"]:.3f}  while lit {res["irradianceWm2"]:6.1f} W/m2  '
              f'longest night {res["longestDarkHours"]:5.1f} h  dust storm x{res["dustStormFactor"]:.3f}', flush=True)
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

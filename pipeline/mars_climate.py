"""Global maps of Mars near-surface air temperature and surface temperature from the Mars Climate Database.

    uv run --project pipeline pipeline/mars_climate.py

Source: Mars Climate Database v6.2 web interface (LMD / OU / IAA / ESA / CNES),
https://www-mars.lmd.jussieu.fr/mcd_python/ , climatology scenario with average solar forcing.
It is a climate model, not a measurement. The same source and scenario give the temperature of
the Mars targets in data/targets.json (validation/build/mars_temperature.py), so a grid cell and
a target are comparable.

Requests (one at a time, each cached in cache/planet/mcd/):
  mean   12 maps: diurnal mean, every 30 degrees of solar longitude Ls
  range  32 maps: 4 seasons (Ls 0, 90, 180, 270) x 8 local times (every 3 hours)
Each map holds two variables: air temperature 2 m above the surface, and surface temperature.

  tempMean      = season-weighted mean of the 12 diurnal-mean maps of 2 m air temperature
  tempRange     = mean over the 4 seasons of (highest minus lowest of the 8 local times) of
                  2 m air temperature. With 3-hour steps it can miss the true peak and trough,
                  so it is a lower bound on the day-night range.
  surfTempMean  = as tempMean, for the surface temperature

Seasons are weighted by the time Mars spends in them (eccentric orbit): time per degree of Ls is
proportional to 1 / (1 + e cos(Ls - Lp))^2, e = 0.0935, Lp = 251 degrees, the constants used for
the targets. The maps are on the database's own grid (about 3.8 degrees of latitude by 5.6 of
longitude). Nothing is interpolated: each 1 degree cell takes the nearest map node.
"""
from __future__ import annotations

import math
import re
import sys
import time
import urllib.parse
from pathlib import Path

import numpy as np
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import CACHE, USER_AGENT  # noqa: E402

MCD = "https://www-mars.lmd.jussieu.fr/mcd_python"
OUT = CACHE / "planet" / "mcd"
OUT.mkdir(parents=True, exist_ok=True)
ECC, LS_PERI = 0.0935, 251.0
MEAN_LS = list(range(0, 360, 30))
RANGE_LS = [0, 90, 180, 270]
RANGE_LT = list(range(0, 24, 3))
KELVIN = 273.15


def fetch(ls: int, localtime: int | None) -> str:
    """Text of one map request (two variables). localtime None = diurnal mean."""
    name = OUT / (f"ls{ls:03d}_mean.txt" if localtime is None else f"ls{ls:03d}_lt{localtime:02d}.txt")
    if name.exists():
        return name.read_text()
    params = {
        "datekeyhtml": "1", "ls": str(ls), "localtime": str(localtime or 0), "latitude": "all", "longitude": "all",
        "altitude": "2", "zkey": "3", "isfixedlt": "off" if localtime is None else "on", "dust": "1", "hrkey": "1",
        "averaging": "loct" if localtime is None else "off", "dpi": "80", "islog": "off", "colorm": "jet",
        "minval": "", "maxval": "", "proj": "cyl", "plat": "", "plon": "", "trans": "", "iswind": "off",
        "latpoint": "", "lonpoint": "", "var1": "t", "var2": "tsurf", "var3": "none", "var4": "none",
    }
    last = None
    for attempt in range(4):
        try:
            page = requests.get(f"{MCD}/cgi-bin/mcdcgi.py?{urllib.parse.urlencode(params)}",
                                headers={"User-Agent": USER_AGENT}, timeout=400).text
            m = re.search(r"href='\.\./(txt/[0-9a-f]+\.txt)'", page)
            if not m:
                raise RuntimeError("no data file in the reply")
            text = requests.get(f"{MCD}/{m.group(1)}", headers={"User-Agent": USER_AGENT}, timeout=120).text
            parse(text, ls, localtime)
            name.write_text(text)
            time.sleep(2)   # one request at a time, with a pause: this is a shared research server
            return text
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(20 * (attempt + 1))
    raise RuntimeError(f"MCD request failed (Ls {ls}, local time {localtime}): {last}")


def parse(text: str, ls: int, localtime: int | None):
    """(lats, lons, air[lat, lon], surface[lat, lon]) in kelvin, after checking the header says what was asked."""
    blocks = [b for b in re.split(r"(?=#{60,}\n### MCD_v)", text) if "### MCD_v" in b]
    assert len(blocks) == 2, len(blocks)
    out = []
    for b, want in zip(blocks, ("Temperature (K)", "Surface temperature (K)")):
        head = [l for l in b.splitlines() if l.startswith("###")]
        assert any(f"Columns 2+ are {want}" in h for h in head), head
        assert any(f"Ls {float(ls):.1f}deg" in h and "Altitude 2.0 m ALS" in h for h in head), head
        if localtime is None:
            assert any("Diurnal mean over all local times" in h for h in head), head
        else:
            assert any(re.search(rf"Local time {float(localtime):.1f}h", h) for h in head), head
        assert any("Column 1 is East longitude" in h for h in head) and any("Line 1 is North latitude" in h for h in head)
        rows = [l for l in b.splitlines() if "||" in l]
        lats = np.array([float(x) for x in rows[0].split("||")[1].split()])
        lons = np.array([float(l.split("||")[0]) for l in rows[1:]])
        vals = np.array([[float(x) for x in l.split("||")[1].split()] for l in rows[1:]])   # [lon, lat]
        out.append((lats, lons, vals.T))
    assert np.array_equal(out[0][0], out[1][0]) and np.array_equal(out[0][1], out[1][1])
    return out[0][0], out[0][1], out[0][2], out[1][2]


def weight(ls: float) -> float:
    return 1.0 / (1.0 + ECC * math.cos(math.radians(ls - LS_PERI))) ** 2


def maps():
    """(lats, lons, tempMean C, tempRange K, surfTempMean C, version line) on the database grid."""
    w = np.array([weight(l) for l in MEAN_LS]); w /= w.sum()
    air = surf = None
    for l, wi in zip(MEAN_LS, w):
        lats, lons, a, s = parse(fetch(l, None), l, None)
        air = a * wi if air is None else air + a * wi
        surf = s * wi if surf is None else surf + s * wi
    rng = []
    for l in RANGE_LS:
        stack = np.array([parse(fetch(l, h), l, h)[2] for h in RANGE_LT])
        rng.append(stack.max(axis=0) - stack.min(axis=0))
    wr = np.array([weight(l) for l in RANGE_LS]); wr /= wr.sum()
    trange = sum(r_ * wi for r_, wi in zip(rng, wr))
    return lats, lons, air - KELVIN, trange, surf - KELVIN


if __name__ == "__main__":
    for l in MEAN_LS:
        fetch(l, None); print("mean", l, flush=True)
    for l in RANGE_LS:
        for h in RANGE_LT:
            fetch(l, h); print("range", l, h, flush=True)
    lats, lons, t, r_, s = maps()
    print(lats[:3], lons[:3], t.shape, float(t.min()), float(t.max()), float(r_.min()), float(r_.max()))

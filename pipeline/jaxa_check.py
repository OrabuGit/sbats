"""Cross-check of our NASA values against JAXA data for the named sites: writes data/jaxa_check.json.

    uv run --project pipeline pipeline/jaxa_check.py

JAXA data, read from the JAXA Earth API open archive (data.earth.jaxa.jp, no login):
  Precipitation  GSMaP (Global Satellite Mapping of Precipitation, JAXA EORC), gauge-adjusted,
                 monthly normals 2012-2021, 0.1 degree, between 60 S and 60 N. mm/h.
  Vegetation     GCOM-C "Shikisai" SGLI Level-3 NDVI, monthly, version 3 (the G-Portal standard
                 product), every month of YEAR.

Compared with:
  Precipitation  NASA POWER monthly normals 2001-2020 (data/site_climate.json), 0.5 x 0.625 degree.
  Vegetation     MODIS MOD13C2 NDVI of YEAR, the 0.5 degree cell value in data/earth.json.

Method. Precipitation: the GSMaP pixel that holds the site; mm/h times the hours of the month;
the 12 months summed. Vegetation: per month, the mean of the valid SGLI pixels inside the site's
0.5 degree cell; then the mean of the months that have a value (the way the MODIS value was built).
Nothing is interpolated or filled. The two precipitation products cover different years and grid
sizes, so they are expected to agree in pattern, not to the millimetre.

This file is a check. No value from it replaces a NASA value anywhere.
"""
from __future__ import annotations

import json
import math
import os
import sys
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import rasterio
import requests
from rasterio.windows import from_bounds

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import AI_NOTE, CACHE, DATA, LATS, LONS, USER_AGENT, cell_index  # noqa: E402

BASE = "https://s3.ap-northeast-1.wasabisys.com/je-pds/cog/v1"
GSMAP = "JAXA.EORC_GSMaP_standard.Gauge.00Z-23Z.v6_monthly-normal"
SGLI = "JAXA.G-Portal_GCOM-C.SGLI_standard.L3-NDVI.daytime.v3_global_monthly"
YEAR = 2025
DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
ENV = dict(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", GDAL_HTTP_MAX_RETRY="4", GDAL_HTTP_RETRY_DELAY="2",
           GDAL_HTTP_USERAGENT=USER_AGENT, VSI_CACHE="TRUE")
_items: dict = {}


def _deg(tag: str) -> float:
    return (1 if tag[0] in "EN" else -1) * float(tag[1:])


def _get(u: str):
    if u not in _items:
        r = requests.get(u, headers={"User-Agent": USER_AGENT}, timeout=60)
        _items[u] = r.json() if r.status_code == 200 else None
    return _items[u]


def item(collection: str, date: str, lon: float, lat: float = 0.0) -> dict | None:
    """The finest-level STAC item (asset href, scale, offset, nodata, unit) whose tile holds the point."""
    top = f"{BASE}/{collection}/{date}/catalog.json"
    d = _get(top)
    if d is None:
        return None
    level = max(int(l["href"].split("/")[1]) for l in d["links"] if l["rel"] == "child")
    u = urllib.parse.urljoin(top, f"./{level}/catalog.json")
    d = _get(u)
    for l in d["links"]:                       # longitude tiles, named like E000.00-E090.00
        if l["rel"] == "child":
            a, b = l["href"].split("/")[1].split("-")
            if _deg(a) <= lon < _deg(b):
                u = urllib.parse.urljoin(u, l["href"]); d = _get(u)
                break
    else:
        return None
    for l in d["links"]:                       # latitude tiles, named like S90.00-N00.00.json
        if l["rel"] == "item":
            a, b = l["href"].split("/")[-1][:-5].split("-")
            if _deg(a) <= lat < _deg(b):
                u = urllib.parse.urljoin(u, l["href"]); f = _get(u)
                name, asset = next(iter(f["assets"].items()))
                ras = asset["je:rasters"]
                return {"href": urllib.parse.urljoin(u, asset["href"]), "slope": ras["dn2value"]["slope"],
                        "offset": ras["dn2value"]["offset"], "nodata": ras["dn"].get("nodata"), "unit": ras["value"]["unit"]}
    return None


def read(it: dict, w: float, s: float, e: float, n: float) -> np.ndarray:
    """Values (scaled, NaN for no data) of the pixels whose centres lie in the box."""
    with rasterio.Env(**ENV), rasterio.open("/vsicurl/" + it["href"]) as ds:
        win = from_bounds(w, s, e, n, ds.transform).round_offsets().round_lengths()
        a = ds.read(1, window=win).astype(np.float64)
        px = abs(ds.transform.a)
    bad = ~np.isfinite(a)
    if it["nodata"] is not None:
        bad |= a == it["nodata"]
    return np.where(bad, np.nan, a * it["slope"] + it["offset"]), px


def site_check(site: dict, cell: dict | None) -> dict:
    lat, lon = site["lat"], site["lon"]
    out = {"id": site["id"], "name": site["name"], "lat": lat, "lon": lon}
    # precipitation
    power = [m["precip"] for m in site["months"]]
    gs = []
    for m in range(12):
        it = item(GSMAP, f"{m + 1:02d}", lon, lat)
        v = None
        if it is not None and abs(lat) < 60:
            assert it["unit"] == "mm/h", it["unit"]
            a, px = read(
                it, math.floor(lon / 0.1) * 0.1 + 0.01, math.floor(lat / 0.1) * 0.1 + 0.01,
                math.floor(lon / 0.1) * 0.1 + 0.09, math.floor(lat / 0.1) * 0.1 + 0.09)
            out["gsmapPixelDeg"] = round(px, 4)
            if a.size == 1 and np.isfinite(a).all() and a.min() >= 0:
                v = round(float(a.ravel()[0]) * 24 * DAYS[m], 1)
        gs.append(v)
    out["precip"] = {
        "nasaPowerMmPerMonth": power, "jaxaGsmapMmPerMonth": gs,
        "nasaPowerMmPerYear": None if None in power else round(sum(power), 1),
        "jaxaGsmapMmPerYear": None if None in gs else round(sum(gs), 1),
        "note": None if None not in gs else "GSMaP has no value here (it covers 60 S to 60 N).",
    }
    # vegetation
    i, j = cell_index(lat, lon)
    clat, clon = float(LATS[i]), float(LONS[j])
    months = []
    for m in range(12):
        it = item(SGLI, f"{YEAR}-{m + 1:02d}", clon, clat)
        v = None
        if it is not None:
            a, px = read(it, clon - 0.25, clat - 0.25, clon + 0.25, clat + 0.25)
            out["sgliPixelDeg"] = round(px, 5)
            if np.isfinite(a).any():
                v = round(float(np.nanmean(a)), 3)
                out["sgliPixelsInCell"] = int(a.size)
        months.append(v)
    have = [v for v in months if v is not None]
    out["ndvi"] = {
        "cell": {"lat": clat, "lon": clon},
        "nasaModis": None if cell is None else cell["ndvi"],
        "jaxaSgli": round(sum(have) / len(have), 3) if have else None,
        "jaxaSgliMonthly": months, "jaxaMonthsWithData": len(have),
    }
    return out


def stats(pairs: list[tuple[float, float]]) -> dict:
    if len(pairs) < 3:
        return {"n": len(pairs)}
    a = np.array(pairs, float)
    x, y = a[:, 0], a[:, 1]
    rank = lambda v: np.argsort(np.argsort(v)).astype(float)  # noqa: E731
    return {"n": len(pairs), "pearsonR": round(float(np.corrcoef(x, y)[0, 1]), 3),
            "spearmanR": round(float(np.corrcoef(rank(x), rank(y))[0, 1]), 3),
            "meanDifferenceJaxaMinusNasa": round(float((y - x).mean()), 3),
            "meanAbsoluteDifference": round(float(np.abs(y - x).mean()), 3)}


def main() -> None:
    cache = CACHE / "jaxa_check_sites.json"
    sites = json.loads((DATA / "site_climate.json").read_text())["sites"]
    earth = {(c["lat"], c["lon"]): c for c in json.loads((DATA / "earth.json").read_text())["cells"]}
    done = json.loads(cache.read_text()) if cache.exists() else {}
    rows = []
    for s in sites:
        if s["id"] not in done:
            i, j = cell_index(s["lat"], s["lon"])
            done[s["id"]] = site_check(s, earth.get((float(LATS[i]), float(LONS[j]))))
            cache.write_text(json.dumps(done))
            print(" ", s["id"], done[s["id"]]["precip"]["nasaPowerMmPerYear"], done[s["id"]]["precip"]["jaxaGsmapMmPerYear"],
                  done[s["id"]]["ndvi"]["nasaModis"], done[s["id"]]["ndvi"]["jaxaSgli"], flush=True)
        rows.append(done[s["id"]])
    pp = [(r_["precip"]["nasaPowerMmPerYear"], r_["precip"]["jaxaGsmapMmPerYear"]) for r_ in rows
          if r_["precip"]["nasaPowerMmPerYear"] is not None and r_["precip"]["jaxaGsmapMmPerYear"] is not None]
    nn = [(r_["ndvi"]["nasaModis"], r_["ndvi"]["jaxaSgli"]) for r_ in rows
          if r_["ndvi"]["nasaModis"] is not None and r_["ndvi"]["jaxaSgli"] is not None]
    out = {
        "meta": {
            "aiUse": AI_NOTE,
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "description": ("Cross-check of NASA values against JAXA data for every named site. A check only: no JAXA value "
                            "replaces a NASA value."),
            "sources": {
                "jaxaPrecip": ("GSMaP gauge-adjusted monthly normals 2012-2021, 0.1 degree (JAXA EORC; Kubota et al. 2007, IEEE TGRS "
                               "45:2259), read from the JAXA Earth API archive, collection " + GSMAP),
                "jaxaNdvi": (f"GCOM-C SGLI Level-3 NDVI, monthly, version 3, {YEAR} (JAXA; doi:10.57746/EO.01gs73bfw51k88w7j9recfk6dv), "
                             "read from the JAXA Earth API archive, collection " + SGLI),
                "nasaPrecip": "NASA POWER monthly normals 2001-2020, PRECTOTCORR (data/site_climate.json)",
                "nasaNdvi": f"MODIS MOD13C2 v061 NDVI, {YEAR}, 0.5 degree cell mean (data/earth.json)",
                "attribution": "JAXA data: (c) JAXA, used under the JAXA Earth API terms of use (https://earth.jaxa.jp/policy/).",
            },
            "method": {
                "precip": "GSMaP pixel holding the site; mm/h x hours in the month; 12 months summed. Different years and grid size from POWER.",
                "ndvi": "Mean of valid SGLI pixels in the site's 0.5 degree cell per month; mean of the months with data.",
            },
            "agreement": {"precipMmPerYear": stats(pp), "ndvi": stats(nn)},
            "badge": "Measured",
        },
        "sites": rows,
    }
    tmp = DATA / "jaxa_check.json.tmp"
    tmp.write_text(json.dumps(out, ensure_ascii=False, indent=1, allow_nan=False))
    os.replace(tmp, DATA / "jaxa_check.json")
    print(json.dumps(out["meta"]["agreement"], indent=1))


if __name__ == "__main__":
    main()

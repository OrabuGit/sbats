"""Monthly climate for every named site in data/analogs.json: writes data/site_climate.json.

    uv run --project pipeline pipeline/site_climate.py

Source: NASA POWER monthly climatology, 2001-2020, from the project's public Zarr archive.
  tempMean, tempRange, precip : MERRA-2 based parameters T2M, T2M_RANGE, PRECTOTCORR
                                (grid 0.5 x 0.625 degrees)
  solar                       : CERES SYN1deg based ALLSKY_SFC_SW_DWN, all-sky shortwave
                                irradiance on a horizontal surface, 24-hour mean
                                (grid 1 x 1 degree)

Each site takes the value of the source grid cell that contains it. Nothing is
interpolated between cells or months, so these are grid-scale values, not site
measurements: a summit and the plain below it share one number. Missing values are null.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import AI_NOTE, CACHE, DATA  # noqa: E402

BASE = "https://nasa-power.s3.amazonaws.com/"
SOURCES = {
    "merra2": (BASE + "merra2/temporal/power_merra2_climatology_temporal_utc.zarr", ["T2M", "T2M_RANGE", "PRECTOTCORR"]),
    "syn1deg": (BASE + "syn1deg/temporal/power_syn1deg_climatology_temporal_utc.zarr", ["ALLSKY_SFC_SW_DWN"]),
}
DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
FIELDS = [
    {"key": "tempMean", "param": "T2M", "label": "Mean temperature", "unit": "°C"},
    {"key": "tempRange", "param": "T2M_RANGE", "label": "Day-night temperature range", "unit": "°C"},
    {"key": "precip", "param": "PRECTOTCORR", "label": "Precipitation", "unit": "mm/month",
     "note": "mm/day from the source times the days in the month (February 28.25)."},
    {"key": "solar", "param": "ALLSKY_SFC_SW_DWN", "label": "Surface solar irradiance (all sky, horizontal, 24 h mean)", "unit": "W/m2"},
]


def fetch(points: list[tuple[float, float]]) -> dict:
    """Monthly values (12) at each point for every parameter. Cached per point set."""
    key = CACHE / "site_climate_power.json"
    want = [[round(a, 4), round(b, 4)] for a, b in points]
    if key.exists():
        d = json.loads(key.read_text())
        if d["points"] == want:
            return d
    import xarray as xr
    out = {"points": want, "params": {}, "cells": {}, "period": None, "version": None}
    for name, (url, params) in SOURCES.items():
        ds = xr.open_zarr(url, consolidated=True)
        assert list(ds.time.values[:12]) == list(range(1, 13)), ds.time.values
        out["period"] = f"{ds.attrs['time_coverage_start'][:4]}-{ds.attrs['time_coverage_end'][:4]}"
        out["version"] = str(ds.attrs.get("version", ""))
        lat = xr.DataArray([p[0] for p in points], dims="site")
        lon = xr.DataArray([p[1] for p in points], dims="site")
        sub = ds[params].isel(time=slice(0, 12)).sel(lat=lat, lon=lon, method="nearest").load()
        out["cells"][name] = [[float(a), float(b)] for a, b in zip(sub.lat.values, sub.lon.values)]
        for p in params:
            assert sub[p].dims == ("time", "site"), sub[p].dims
            out["params"][p] = {"units": ds[p].attrs.get("units"),
                                "values": [[None if not np.isfinite(x) else float(x) for x in sub[p].values[:, i]]
                                           for i in range(len(points))]}
        print(f"  fetched {name}: {params}")
    key.write_text(json.dumps(out))
    return out


def build() -> dict:
    analogs = json.loads((DATA / "analogs.json").read_text())
    from sites import merged_sites   # adds the sites proposed by a team member that analogs.json does not have
    analogs = list(merged_sites({a["id"]: a for a in analogs}).values())
    d = fetch([(a["lat"], a["lon"]) for a in analogs])
    u = {p: d["params"][p]["units"] for p in d["params"]}
    assert u["T2M"] == "C" and u["T2M_RANGE"] == "C" and u["PRECTOTCORR"] == "mm/day" and u["ALLSKY_SFC_SW_DWN"] == "W m-2", u
    src = {"T2M": "merra2", "T2M_RANGE": "merra2", "PRECTOTCORR": "merra2", "ALLSKY_SFC_SW_DWN": "syn1deg"}
    nd = {"tempMean": 2, "tempRange": 2, "precip": 1, "solar": 1}
    sites = []
    for i, a in enumerate(analogs):
        months = []
        for m in range(12):
            row = {"month": m + 1}
            for f in FIELDS:
                v = d["params"][f["param"]]["values"][i][m]
                if v is not None and f["key"] == "precip":
                    v *= DAYS[m]
                row[f["key"]] = None if v is None else round(v, nd[f["key"]])
            months.append(row)
        sites.append({"id": a["id"], "name": a["name"], "kind": a["kind"], "lat": a["lat"], "lon": a["lon"],
                      "cells": {"merra2": dict(zip(("lat", "lon"), d["cells"]["merra2"][i])),
                                "syn1deg": dict(zip(("lat", "lon"), d["cells"]["syn1deg"][i]))},
                      "months": months})
    fields = []
    for f in FIELDS:
        grid = "0.5 x 0.625 degrees (MERRA-2)" if src[f["param"]] == "merra2" else "1 x 1 degree (CERES SYN1deg)"
        e = {"key": f["key"], "label": f["label"], "unit": f["unit"], "badge": "Measured", "scale": "grid",
             "source": f"NASA POWER monthly climatology {d['period']}, parameter {f['param']}, grid {grid}"}
        if "note" in f:
            e["note"] = f["note"]
        fields.append(e)
    return {
        "meta": {
            "aiUse": AI_NOTE,
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "description": ("Monthly climate normals for every site in analogs.json and the extra sites of sites.json. Each value is that of the source "
                            "grid cell containing the site, not a measurement at the site."),
            "period": d["period"], "powerVersion": d["version"], "fields": fields,
        },
        "sites": sites,
    }


def main() -> None:
    out = build()
    tmp = DATA / "site_climate.json.tmp"
    tmp.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":"), allow_nan=False))
    os.replace(tmp, DATA / "site_climate.json")
    nulls = sum(v is None for s in out["sites"] for m in s["months"] for v in m.values())
    print(f"sites: {len(out['sites'])}, null values: {nulls}")
    print(f"{'site':<26} {'T min..max':>14} {'driest month':>14} {'precip mm/yr':>13} {'solar min..max W/m2':>20}")
    for s in out["sites"]:
        ms = s["months"]
        t = [m["tempMean"] for m in ms]; p = [m["precip"] for m in ms]; q = [m["solar"] for m in ms]
        if None in t or None in p or None in q:
            print(f"{s['id'][:25]:<26} has nulls"); continue
        print(f"{s['id'][:25]:<26} {min(t):>6.1f}..{max(t):<6.1f} {p.index(min(p)) + 1:>8} ({min(p):.0f}) {sum(p):>13.0f} {min(q):>9.0f}..{max(q):<.0f}")
    print(f"wrote {DATA / 'site_climate.json'} ({(DATA / 'site_climate.json').stat().st_size / 1e3:.0f} kB)")


if __name__ == "__main__":
    main()

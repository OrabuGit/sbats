"""Field logistics for every Earth place: writes data/logistics.json.

    uv run --project pipeline pipeline/logistics.py

Everything is computed from open data. Nothing is typed in.

  country           Natural Earth 1:10m admin-0 countries (point in polygon; a coastal cell centre
                    that falls in the sea takes the nearest country within 0.5 degrees, else null)
  airport           OurAirports (public domain), airports with scheduled passenger service and type
                    large, medium or small: nearest to the place, straight-line distance
  populatedPlace    Natural Earth 1:10m populated places: nearest, straight-line distance, with
                    its largest population figure (POP_MAX)
  volcano           Smithsonian Global Volcanism Program, Holocene volcano list: nearest volcano with a
                    recorded eruption in or after ACTIVE_SINCE
  elevation         NOAA ETOPO 2022, 60 arc-second surface model: mean of the land pixels in the 0.5 degree
                    cell (cells). Sites also carry the Copernicus DEM range inside their footprint
                    (from sites.json)
  climate windows   NASA POWER monthly normals 2001-2020 (the same source as site_climate.json):
                    driest three consecutive months, warmest, coldest and sunniest month

Distances are great-circle ("as the crow flies"), not travel distance or travel time: roads, borders and
terrain are not considered. "Nearest" does not mean "usable": an airport may be closed to the public.

Shape of the file (cells are in the order of data/earth.json, one entry per cell):
  meta, tables { countries, airports, places, volcanoes }, sites [ {...} ], cells { columns }
"""
from __future__ import annotations

import csv
import json
import math
import os
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import AI_NOTE, CACHE, DATA  # noqa: E402

LOG = CACHE / "logistics"
ACTIVE_SINCE = 1900
EARTH_R_KM = 6371.0088
POWER = {
    "merra2": "https://nasa-power.s3.amazonaws.com/merra2/temporal/power_merra2_climatology_temporal_utc.zarr",
    "syn1deg": "https://nasa-power.s3.amazonaws.com/syn1deg/temporal/power_syn1deg_climatology_temporal_utc.zarr",
}
DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
SOURCES = {
    "country": "Natural Earth 1:10m Admin 0 Countries (public domain)",
    "airport": "OurAirports airports.csv (public domain), airports with scheduled passenger service",
    "populatedPlace": "Natural Earth 1:10m Populated Places (public domain)",
    "volcano": f"Smithsonian Global Volcanism Program, Volcanoes of the World, Holocene volcano list: volcanoes with an eruption recorded in or after {ACTIVE_SINCE}",
    "elevation": "NOAA NCEI ETOPO 2022, 60 arc-second surface elevation (public domain), mean over the land pixels of the 0.5 degree cell (land mask as in earth.json)",
    "climate": "NASA POWER monthly climatology 2001-2020 (MERRA-2: T2M, PRECTOTCORR; CERES SYN1deg: ALLSKY_SFC_SW_DWN)",
}


def xyz(lat, lon):
    la, lo = np.radians(np.asarray(lat, float)), np.radians(np.asarray(lon, float))
    return np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], axis=-1)


def nearest(points_lat, points_lon, ref_lat, ref_lon):
    """Index of and great-circle distance (km) to the nearest reference point, for every point."""
    from scipy.spatial import cKDTree
    tree = cKDTree(xyz(ref_lat, ref_lon))
    d, i = tree.query(xyz(points_lat, points_lon))
    return i, 2 * EARTH_R_KM * np.arcsin(np.clip(d / 2, 0, 1))


def countries(lat, lon):
    """Country of each point: Natural Earth polygons rasterised at 0.05 degrees (about 5 km), looked up per point.
    A point whose pixel is sea takes the nearest country pixel within 0.5 degrees (coastal cell centres), else null."""
    import shapefile
    from rasterio.features import rasterize
    from rasterio.transform import from_origin
    from scipy.ndimage import distance_transform_edt
    r = shapefile.Reader(str(LOG / "ne_10m_admin_0_countries" / "ne_10m_admin_0_countries"))
    names, shapes = [], []
    for k, sr in enumerate(r.iterShapeRecords()):
        names.append(sr.record["NAME"]); shapes.append((sr.shape.__geo_interface__, k + 1))
    step = 0.05
    h, w = int(180 / step), int(360 / step)
    grid = rasterize(shapes, out_shape=(h, w), transform=from_origin(-180, 90, step, step), fill=0, dtype="int32")
    sea = grid == 0
    dist, (ri, ci) = distance_transform_edt(sea, return_indices=True)
    out = []
    for la, lo in zip(lat, lon):
        i = min(h - 1, max(0, int((90 - la) / step))); j = min(w - 1, max(0, int((lo + 180) / step)))
        if grid[i, j] > 0:
            out.append(int(grid[i, j]) - 1)
        elif dist[i, j] * step <= 0.5:
            out.append(int(grid[ri[i, j], ci[i, j]]) - 1)
        else:
            out.append(None)
    return names, out


def airports():
    rows = []
    with open(LOG / "airports.csv", newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["scheduled_service"] == "yes" and r["type"] in ("large_airport", "medium_airport", "small_airport"):
                rows.append({"name": r["name"], "iata": r["iata_code"] or None, "icao": r["icao_code"] or None,
                             "lat": float(r["latitude_deg"]), "lon": float(r["longitude_deg"]), "country": r["iso_country"],
                             "municipality": r["municipality"] or None})
    return rows


def places():
    import shapefile
    r = shapefile.Reader(str(LOG / "ne_10m_populated_places/ne_10m_populated_places"))
    out = []
    for rec in r.iterRecords():
        out.append({"name": rec["NAME"], "country": rec["ADM0NAME"], "population": int(rec["POP_MAX"]) if rec["POP_MAX"] else None,
                    "lat": float(rec["LATITUDE"]), "lon": float(rec["LONGITUDE"])})
    return out


def volcanoes():
    v = json.loads((LOG / "gvp_holocene.json").read_text())
    return [{"number": x["Volcano_Number"], "name": x["Volcano_Name"], "lat": x["Latitude"], "lon": x["Longitude"],
             "lastEruptionYear": x["Last_Eruption_Year"], "type": x["Primary_Volcano_Type"]}
            for x in v if x["Last_Eruption_Year"] is not None and x["Last_Eruption_Year"] >= ACTIVE_SINCE
            and x["Latitude"] is not None]


def elevation_cells(lats, lons):
    """Mean ETOPO 2022 60 arc-second surface elevation (m) in each 0.5 degree cell centred on (lat, lon)."""
    import h5py
    p = LOG / "etopo60.nc"
    if not p.exists():
        return None
    import landmask
    land = landmask.land_fine().astype(bool)        # 0.05 degree, row 0 = north; 10 x 10 pixels per 0.5 degree cell
    with h5py.File(p) as f:
        z = f["z"]
        la, lo = f["lat"][:], f["lon"][:]
        assert abs(la[1] - la[0] - 1 / 60) < 1e-6 and abs(lo[1] - lo[0] - 1 / 60) < 1e-6, (la[:2], lo[:2])
        out = np.full(len(lats), np.nan)
        order = np.argsort(lats)
        cache = {}
        for k in order:
            lat, lon = lats[k], lons[k]
            r0 = int(round((lat - 0.25 - la[0]) * 60 + 0.5)); r1 = r0 + 30
            c0 = int(round((lon - 0.25 - lo[0]) * 60 + 0.5)); c1 = c0 + 30
            if r0 < 0 or c0 < 0 or r1 > z.shape[0] or c1 > z.shape[1]:
                continue
            if r0 not in cache:
                cache = {r0: z[r0:r1, :].astype(np.float32)}
            blk = cache[r0][:, c0:c1]
            i0, j0 = int(round((90 - (lat + 0.25)) / 0.05)), int(round((lon - 0.25 + 180) / 0.05))
            lm = np.kron(land[i0:i0 + 10, j0:j0 + 10], np.ones((3, 3), bool))[::-1]    # 30 x 30, south first like ETOPO
            if lm.shape == blk.shape and lm.any():
                out[k] = float(np.nanmean(blk[lm]))
    return out


def month_windows(months):
    """months: 12 dicts with precip (mm/month), tempMean, solar. Rule-based windows, no scoring."""
    pr = [m["precip"] for m in months]
    if None in pr:
        return None
    best = min(range(12), key=lambda i: sum(pr[(i + k) % 12] for k in range(3)))
    win = [(best + k) % 12 + 1 for k in range(3)]
    t = [m["tempMean"] for m in months]; s = [m["solar"] for m in months]
    r = lambda v, n: None if v is None else round(float(v), n)  # noqa: E731
    return {"driestThreeMonths": win, "driestThreeMonthsPrecipMm": r(sum(pr[m - 1] for m in win), 0),
            "warmestMonth": 1 + max(range(12), key=lambda i: t[i]) if None not in t else None,
            "coldestMonth": 1 + min(range(12), key=lambda i: t[i]) if None not in t else None,
            "sunniestMonth": 1 + max(range(12), key=lambda i: s[i]) if None not in s else None,
            "wettestMonth": 1 + max(range(12), key=lambda i: pr[i])}


def power_months(lats, lons):
    """POWER monthly arrays, loaded once into memory (an npz file would be re-read on every access)."""
    import xarray as xr
    cache = CACHE / "logistics" / "power_monthly.npz"
    if not cache.exists():
        out = {}
        for name, url, params in (("merra2", POWER["merra2"], ["T2M", "PRECTOTCORR"]), ("syn1deg", POWER["syn1deg"], ["ALLSKY_SFC_SW_DWN"])):
            ds = xr.open_zarr(url, consolidated=True)
            assert list(ds.time.values[:12]) == list(range(1, 13))
            out[name + "_lat"] = ds.lat.values.astype(float); out[name + "_lon"] = ds.lon.values.astype(float)
            for p in params:
                out[p] = ds[p].isel(time=slice(0, 12)).load().values.astype(np.float32)
        np.savez(cache, **out)
    d = np.load(cache)
    return {k: d[k] for k in d.files}


def nearest_axis(axis, v):
    """Index of the nearest axis value for each v (the source cell holding the point; no interpolation)."""
    return np.abs(axis[None, :] - np.asarray(v, float)[:, None]).argmin(axis=1)


def climate_all(pw, lat, lon):
    """List (one per point) of 12 monthly dicts, gathered with vectorised lookups."""
    i, j = nearest_axis(pw["merra2_lat"], lat), nearest_axis(pw["merra2_lon"], lon)
    k, l = nearest_axis(pw["syn1deg_lat"], lat), nearest_axis(pw["syn1deg_lon"], lon)
    P = pw["PRECTOTCORR"][:, i, j]; T = pw["T2M"][:, i, j]; S = pw["ALLSKY_SFC_SW_DWN"][:, k, l]   # [12, points]
    out = []
    for n in range(len(i)):
        out.append([{"precip": None if not np.isfinite(P[m, n]) else float(P[m, n]) * DAYS[m],
                     "tempMean": None if not np.isfinite(T[m, n]) else float(T[m, n]),
                     "solar": None if not np.isfinite(S[m, n]) else float(S[m, n])} for m in range(12)])
    return out


def build() -> dict:
    earth = json.loads((DATA / "earth.json").read_text())
    cells = earth["cells"]
    clat = np.array([c["lat"] for c in cells]); clon = np.array([c["lon"] for c in cells])
    sites = json.loads((DATA / "sites.json").read_text())["sites"]
    slat = np.array([s["lat"] for s in sites]); slon = np.array([s["lon"] for s in sites])
    lat = np.concatenate([clat, slat]); lon = np.concatenate([clon, slon])
    n = len(clat)

    cnames, cidx = countries(lat, lon)
    ap = airports(); ai, akm = nearest(lat, lon, [a["lat"] for a in ap], [a["lon"] for a in ap])
    pl = places(); pi, pkm = nearest(lat, lon, [p["lat"] for p in pl], [p["lon"] for p in pl])
    vo = volcanoes(); vi, vkm = nearest(lat, lon, [v["lat"] for v in vo], [v["lon"] for v in vo])
    elev = elevation_cells(clat, clon)
    pw = power_months(lat, lon)

    used_a = sorted(set(ai.tolist())); used_p = sorted(set(pi.tolist())); used_v = sorted(set(vi.tolist()))
    used_c = sorted({c for c in cidx if c is not None})
    amap = {k: j for j, k in enumerate(used_a)}; pmap = {k: j for j, k in enumerate(used_p)}
    vmap = {k: j for j, k in enumerate(used_v)}; cmap = {k: j for j, k in enumerate(used_c)}

    win = [month_windows(m) for m in climate_all(pw, lat, lon)]
    code = lambda w: None if w is None else w["driestThreeMonths"][0]  # noqa: E731

    def entry(k):
        return {"country": cnames[cidx[k]] if cidx[k] is not None else None,
                "airport": {"name": ap[ai[k]]["name"], "iata": ap[ai[k]]["iata"], "country": ap[ai[k]]["country"],
                            "km": round(float(akm[k]), 1)},
                "populatedPlace": {"name": pl[pi[k]]["name"], "population": pl[pi[k]]["population"], "km": round(float(pkm[k]), 1)},
                "volcano": {"name": vo[vi[k]]["name"], "number": vo[vi[k]]["number"], "lastEruptionYear": vo[vi[k]]["lastEruptionYear"],
                            "km": round(float(vkm[k]), 1)},
                "climateWindows": win[k]}

    site_out = []
    for s, k in zip(sites, range(n, n + len(sites))):
        e = entry(k)
        d = s["detail"]
        e.update({"id": s["id"], "name": s["name"], "lat": s["lat"], "lon": s["lon"],
                  "elevationFootprintM": {"min": d["elevMinM"], "max": d["elevMaxM"],
                                          "source": "Copernicus DEM GLO-30 inside the site footprint (sites.json)"},
                  "elevationCellMeanM": None})
        site_out.append(e)
    if elev is not None:
        # site rows: the same ETOPO mean for the 0.5 degree cell that holds the site
        by = {(c["lat"], c["lon"]): elev[i] for i, c in enumerate(cells)}
        for e in site_out:
            la = math.floor(e["lat"] / 0.5) * 0.5 + 0.25; lo = math.floor(e["lon"] / 0.5) * 0.5 + 0.25
            v = by.get((la, lo))
            e["elevationCellMeanM"] = None if v is None or not np.isfinite(v) else round(float(v))

    cols = {
        "country": [cmap[cidx[i]] if cidx[i] is not None else None for i in range(n)],
        "airport": [amap[int(ai[i])] for i in range(n)], "airportKm": [round(float(akm[i])) for i in range(n)],
        "place": [pmap[int(pi[i])] for i in range(n)], "placeKm": [round(float(pkm[i])) for i in range(n)],
        "volcano": [vmap[int(vi[i])] for i in range(n)], "volcanoKm": [round(float(vkm[i])) for i in range(n)],
        "elevationM": None if elev is None else [None if not np.isfinite(v) else round(float(v)) for v in elev],
        "driestThreeMonthsStart": [code(win[i]) for i in range(n)],
        "warmestMonth": [None if win[i] is None else win[i]["warmestMonth"] for i in range(n)],
        "coldestMonth": [None if win[i] is None else win[i]["coldestMonth"] for i in range(n)],
        "sunniestMonth": [None if win[i] is None else win[i]["sunniestMonth"] for i in range(n)],
    }
    return {
        "meta": {
            "aiUse": AI_NOTE, "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "description": ("Computed field logistics for every Earth grid cell (same order as earth.json) and every site in sites.json. "
                            "Distances are straight-line (great-circle), not travel distance or time."),
            "sources": SOURCES, "activeSince": ACTIVE_SINCE, "cellCount": n,
            "climateWindowRule": ("driestThreeMonths: the three consecutive months (calendar-circular) with the least total POWER "
                                  "precipitation; warmest, coldest, wettest and sunniest month by POWER monthly normals. Grid-scale values."),
            "badge": "Measured",
            "notes": ["Elevation for cells is the mean of ETOPO 2022 surface pixels in the cell; for sites the Copernicus DEM range in the footprint is also given.",
                      "An airport is the nearest with scheduled passenger service in OurAirports; it may not be the most practical."],
        },
        "tables": {
            "countries": [cnames[k] for k in used_c],
            "airports": [{"name": ap[k]["name"], "iata": ap[k]["iata"], "icao": ap[k]["icao"], "country": ap[k]["country"],
                          "municipality": ap[k]["municipality"], "lat": ap[k]["lat"], "lon": ap[k]["lon"]} for k in used_a],
            "places": [{"name": pl[k]["name"], "country": pl[k]["country"], "population": pl[k]["population"],
                        "lat": pl[k]["lat"], "lon": pl[k]["lon"]} for k in used_p],
            "volcanoes": [{"number": vo[k]["number"], "name": vo[k]["name"], "lat": vo[k]["lat"], "lon": vo[k]["lon"],
                           "lastEruptionYear": vo[k]["lastEruptionYear"], "type": vo[k]["type"]} for k in used_v],
        },
        "sites": site_out,
        "cells": cols,
    }


def main() -> None:
    out = build()
    tmp = DATA / "logistics.json.tmp"
    tmp.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":"), allow_nan=False))
    os.replace(tmp, DATA / "logistics.json")
    print(f"wrote {DATA / 'logistics.json'} ({(DATA / 'logistics.json').stat().st_size / 1e6:.1f} MB)")
    for s in out["sites"]:
        a, p, v = s["airport"], s["populatedPlace"], s["volcano"]
        print(f"{s['id'][:24]:<25}{str(s['country'])[:12]:<13}{a['name'][:24]:<25}{a['km']:>7.0f} km  {p['name'][:14]:<15}{p['km']:>5.0f} km  {v['name'][:14]:<15}{v['km']:>6.0f} km  elev {s['elevationCellMeanM']}  {s['climateWindows']['driestThreeMonths'] if s['climateWindows'] else None}")


if __name__ == "__main__":
    main()

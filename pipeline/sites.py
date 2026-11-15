"""Fine-scale site analysis: writes data/sites.json.

    uv run --project pipeline pipeline/sites.py

For every site in data/analogs.json marked "candidate", and for five well-known analogs
for comparison, the factors are computed inside a small square footprint centred on the
site's coordinates, instead of over the 0.5 degree cell. The footprint side is stated per
site in FOOTPRINTS below and written to the file.

  Terrain      Copernicus DEM GLO-30 (ESA), with its Water Body Mask. Same function as
               the global grid (terrain_metrics.py), run twice: on 1 arc-second posts
               (about 31 m, keys slopeFine / roughnessFine) and on 463 m posts (keys
               slope / roughness, the spacing used for the grid and for the targets).
  Bare ground  Sentinel-2 L2A (ESA), 10 m, all of YEAR. NDVI per pixel from the red and
               near-infrared bands; cloud, shadow and snow observations are removed with the
               product's scene classification. Open water is taken from the Copernicus DEM
               water body mask, because the scene classification labels dark lava as water. Per pixel: mean of monthly means.
               ndvi = mean over the footprint. bareFrac = share of non-water pixels whose
               annual NDVI is below BARE_NDVI.
  Rock type    Regional geologic map unit at the site from Macrostrat (only maps at
               "large", "medium" or "small" scale, never the generalized world map), and
               the major rock type of the volcano from the Smithsonian Global Volcanism
               Program. Where neither exists the value is null.
  Minerals     NASA EMIT L2B mineral identification (60 m) inside the footprint, from the least
               cloudy granule that leaves at least half of the footprint free of cloud, cirrus
               and water (see emit_minerals.py). Null with the reason where no granule qualifies.
  Climate      Not recomputed. Copied from the site's 0.5 degree cell in data/earth.json
               and labelled scale "grid".

Nothing is typed in or estimated. A value that a source does not have is null.
"""
from __future__ import annotations

import json
import math
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import rasterio
import requests
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject, transform as warp_transform
from rasterio.windows import Window, from_bounds

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import CACHE, DATA, LATS, LONS, USER_AGENT, cell_index  # noqa: E402
from terrain_metrics import SPACING_M, terrain_metrics  # noqa: E402
import emit_minerals  # noqa: E402

YEAR = 2025
M_PER_DEG = 111194.9
FINE_POST_M = M_PER_DEG / 3600          # 1 arc-second of latitude, 30.9 m
BARE_NDVI = 0.2
SCENES_PER_MONTH = 3
MAX_SCENE_CLOUD = 80                    # percent, scene-level filter before the per-pixel mask
SITE_CACHE = CACHE / "sites"
SITE_CACHE.mkdir(exist_ok=True)

COMPARISON_IDS = ["mauna-kea", "kilauea", "atacama-yungay", "haughton-crater", "lanzarote-timanfaya",
                  "dallol", "dasht-e-lut", "salar-de-uyuni", "tunupa-volcano"]

# Sites proposed by a team member. Where data/analogs.json has the same id, its name, coordinates and
# kind are used and this entry only adds the coordinate source; otherwise the site is taken from here. Coordinates come from the source named in "coordinateSource"; nothing is typed
# from memory. "candidate" = proposed new analog. "known" = already-known analog added for comparison,
# not a new finding. How each position was fixed is logged in decisions/B.md.
EXTRA_SITES = {
    "id-tambora-caldera": {
        "name": "Mount Tambora caldera, Sumbawa, Indonesia", "lat": -8.2438, "lon": 117.9918, "kind": "candidate",
        "coordinateSource": ("Centre of the caldera rim traced on Copernicus DEM GLO-30 (highest point along 180 rays from the "
                             "caldera floor). Smithsonian GVP volcano 264040 lists the volcano at 8.25 S, 118.0 E."),
        "analogSource": None,
    },
    "id-batur-lava-fields": {
        "name": "Mount Batur black lava fields, Bali, Indonesia", "lat": -8.2556, "lon": 115.3628, "kind": "candidate",
        "coordinateSource": ("Centre of the bounding box of OpenStreetMap relation 19753621 (natural=bare_rock, 7.5 km2, "
                             "version 3 of 2025-10-25), the mapped bare lava south-west of the Batur cone. (c) OpenStreetMap contributors, ODbL."),
        "analogSource": None,
    },
    "dasht-e-lut": {
        "name": "Dasht-e Lut (Lut Desert), Iran", "lat": 30.2639, "lon": 59.2411, "kind": "known",
        "coordinateSource": "Wikidata Q767128 (Dasht-e Lut), coordinate statement, read 2026-11-15. One point in a desert of about 50,000 km2.",
        "analogSource": ("Title of a conference abstract: 'Terrestrial analogs for Martian yardangs: the Argentinian Altiplano and the "
                         "Lut Desert of Iran', Geological Society of America Abstracts with Programs 2017, doi:10.1130/abs/2017cd-292992"),
    },
    "salar-de-uyuni": {
        "name": "Salar de Uyuni salt flat, Bolivia", "lat": -20.3333, "lon": -67.7, "kind": "known",
        "coordinateSource": "Wikidata Q76122 (Salar de Uyuni), coordinate statement, read 2026-11-15. One point on a salt flat of about 10,000 km2.",
        "analogSource": None,
    },
    "tunupa-volcano": {
        "name": "Tunupa volcano, north shore of Salar de Uyuni, Bolivia", "lat": -19.83, "lon": -67.64, "kind": "known",
        "coordinateSource": "Wikidata Q849364 (Tunupa), coordinate statement, read 2026-11-15. Not listed in the Smithsonian GVP databases.",
        "analogSource": None,
    },
}
# Known problems with a site's values, written to the file as "caveat".
CAVEATS = {
    "salar-de-uyuni": ("The Copernicus DEM water body mask classes 96% of this footprint as water (the salt flat floods in the wet "
                       "season) and Sentinel-2 classes most clear views of the salt as snow. Terrain on 463 m posts is therefore null, "
                       "and slopeFine, roughnessFine, ndvi and bareFrac rest on the 4% of the footprint outside the mask. "
                       "waterFrac here is not a measurement of open water."),
    "id-batur-lava-fields": ("The square is 16 km2 and the mapped bare-rock polygon inside it is 7.5 km2, so about half of the "
                             "footprint is ground outside the lava field."),
}
# Footprints a team member should check. The text says how the footprint was set.
PROVISIONAL = {
    "id-tambora-caldera": ("Square enclosing the caldera rim as traced on Copernicus DEM GLO-30: rim crest 3.1 to 4.2 km from its centre, "
                           "7.1 km north-south by 7.4 km east-west. Smithsonian GVP describes a 6-km-wide, 1250-m-deep caldera."),
    "id-batur-lava-fields": ("Square enclosing the bare-rock polygon mapped in OpenStreetMap (relation 19753621): 4.0 km north-south by "
                             "3.2 km east-west. The square also holds ground outside the polygon. Smithsonian GVP confirms historical basaltic "
                             "lava flows on the caldera floor but gives no outline."),
    "dallol": "3 km square on the Smithsonian GVP coordinates of the Dallol crater (volcano 221041). The outline of the hydrothermal field was not mapped.",
    "dasht-e-lut": "5 km sample at a single published point. The desert's yardang, sand sea and plateau zones were not told apart.",
    "salar-de-uyuni": "5 km sample of the salt surface at a single published point.",
    "tunupa-volcano": "5 km square on the summit coordinates. Entered separately from the salt flat because one small footprint cannot hold both.",
}

# Footprint: side of the square in km, and what it does and does not cover.
FOOTPRINTS = {
    "id-kawah-ijen": (3.0, "Crater, acid lake and rim of Kawah Ijen."),
    "id-merapi": (4.0, "Summit cone and upper flanks of Merapi. The Opak River deposits downstream are not inside it."),
    "id-gua-lawa": (2.0, "Ground surface above and around the cave entrance. The cave interior is not measured."),
    "id-goa-pandan": (3.0, "Centred on Giri Mulyo village, because the cave's own position is not published. The cave interior is not measured."),
    "id-kesaksak-lava-tube": (5.0, "Centred on Batur volcano, because the tube's position inside the caldera is not published."),
    "id-maros-pangkep-karst": (5.0, "One 5 km sample of the karst at the listed coordinates, not the whole cave district."),
    "mauna-kea": (4.0, "Summit area of Mauna Kea. The field-test sites on the flank are outside it."),
    "kilauea": (5.0, "Summit caldera of Kilauea."),
    "atacama-yungay": (5.0, "Centred on the published approximate position (24 S, 70 W), not a surveyed station."),
    "haughton-crater": (5.0, "Central part of the 23 km impact structure only."),
    "lanzarote-timanfaya": (5.0, "Timanfaya lava field at the listed coordinates."),
    "id-tambora-caldera": (7.4, "The whole summit caldera of Tambora, rim to rim, with a little of the outer slope in the corners of the square."),
    "id-batur-lava-fields": (4.0, "Young bare lava flows on the caldera floor south-west of the Batur cone."),
    "dallol": (3.0, "Dallol crater and hydrothermal field on the Danakil salt plain."),
    "dasht-e-lut": (5.0, "One 5 km sample of the Lut Desert, not the whole desert."),
    "salar-de-uyuni": (5.0, "One 5 km sample of the salt flat."),
    "tunupa-volcano": (5.0, "Summit area of Tunupa volcano. The salt flat is outside it."),
}

# Smithsonian GVP volcano numbers, taken from the site's own citation in analogs.json
# where it gives one. Gua Lawa is on the flank of Slamet (analogs.json note).
GVP_NUMBER = {
    "id-kawah-ijen": 263350, "id-merapi": 263250, "id-kesaksak-lava-tube": 264010,
    "id-gua-lawa": 263180, "mauna-kea": 332030, "kilauea": 332010, "lanzarote-timanfaya": 383060,
    "id-tambora-caldera": 264040, "id-batur-lava-fields": 264010, "dallol": 221041,
}

# Rock type stated in a paper about the feature itself, used only where no regional map and no
# volcano record exists. Each entry was checked against the paper's abstract (Crossref, 2026-11-14).
LITERATURE_ROCK = {
    "id-goa-pandan": ("basalt", "Sirait et al. 2023, Journal of Geoscience, Engineering, Environment, and Technology 8(2):112-122, "
                                "doi:10.25299/jgeet.2023.8.2.12118 (abstract: basalt lava sequence forming Goa Pandan)"),
}

# GLiM first-level class for a rock name, by GLiM's own definitions (Hartmann & Moosdorf 2012):
# basic, intermediate and acid volcanic and plutonic rocks, carbonate sedimentary rocks.
# Only exact names listed here are mapped. Anything else gets no code.
ROCK_TO_GLIM = {
    "Basalt / Picro-Basalt": 2, "basalt": 2, "mafic volcanic rocks": 2,
    "Andesite / Basaltic Andesite": 10,
    "Granite": 9,
    "Trachybasalt / Tephrite Basanite": 2,
}

GDAL_ENV = dict(
    GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
    GDAL_HTTP_MAX_RETRY="4", GDAL_HTTP_RETRY_DELAY="2", GDAL_HTTP_TIMEOUT="120",
    GDAL_HTTP_USERAGENT=USER_AGENT, VSI_CACHE="FALSE", AWS_NO_SIGN_REQUEST="YES",
)
HEADERS = {"User-Agent": USER_AGENT}


def merged_sites(analogs: dict) -> dict:
    """analogs.json entries by id, plus the EXTRA_SITES it does not have. analogs.json wins on shared fields."""
    out = dict(analogs)
    for k, v in EXTRA_SITES.items():
        if k in out:
            assert abs(out[k]["lat"] - v["lat"]) < 0.01 and abs(out[k]["lon"] - v["lon"]) < 0.01, f"{k}: coordinates differ from analogs.json"
            out[k] = {"coordinateSource": v["coordinateSource"], **out[k]}
        else:
            out[k] = {"id": k, "analogFor": [], **v}
    return out


def cached(name: str, fn):
    p = SITE_CACHE / f"{name}.json"
    if p.exists():
        return json.loads(p.read_text())
    v = fn()
    p.write_text(json.dumps(v))
    return v


def bbox(lat: float, lon: float, side_km: float):
    """(west, south, east, north) of a square of side_km centred on the point."""
    dlat = side_km * 1000 / 2 / M_PER_DEG
    dlon = dlat / math.cos(math.radians(lat))
    return lon - dlon, lat - dlat, lon + dlon, lat + dlat


def _retry(fn, tries=5):
    last = None
    for a in range(tries):
        try:
            return fn()
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(min(20, 2 ** a))
    raise RuntimeError(f"{type(last).__name__}: {last}")


# ---------------------------------------------------------------- terrain

def glo30_name(lat0: int, lon0: int) -> str:
    ns = f"{'N' if lat0 >= 0 else 'S'}{abs(lat0):02d}_00"
    ew = f"{'E' if lon0 >= 0 else 'W'}{abs(lon0):03d}_00"
    return f"Copernicus_DSM_COG_10_{ns}_{ew}_DEM"


def _read_window(url: str, w, s, e, n):
    def go():
        with rasterio.Env(**GDAL_ENV), rasterio.open("/vsicurl/" + url) as ds:
            win = from_bounds(w, s, e, n, ds.transform).round_offsets().round_lengths()
            win = win.intersection(Window(0, 0, ds.width, ds.height))
            return ds.read(1, window=win), ds.window_transform(win), ds.crs
    return _retry(go)


def dem_mosaic(w: float, s: float, e: float, n: float):
    """Elevation and water mask (1 = water) covering the box, mosaicked from one to four GLO-30 tiles.

    Tiles in one latitude band share one pixel grid, so the mosaic is a plain copy (nearest neighbour).
    Returns (dem, water, transform, crs, tile names).
    """
    tiles = sorted({(math.floor(y), math.floor(x)) for y in (s, n) for x in (w, e)})
    parts = []
    for t in tiles:
        name = glo30_name(*t)
        base = f"https://copernicus-dem-30m.s3.amazonaws.com/{name}"
        try:
            dem, tr, crs = _read_window(f"{base}/{name}.tif", w, s, e, n)
            wbm, wtr, _ = _read_window(f"{base}/AUXFILES/{name.replace('_DEM', '_WBM')}.tif", w, s, e, n)
        except RuntimeError:
            continue  # tile does not exist (all ocean)
        if dem.size:
            parts.append((name, dem.astype(np.float32), (wbm != 0).astype(np.float32), tr, crs))
    if not parts:
        raise RuntimeError("no DEM tile covers the footprint")
    if len(parts) == 1:
        name, dem, water, tr, crs = parts[0]
        return dem, water, tr, crs, [name]
    resx = {round(p[3].a, 12) for p in parts}
    assert len(resx) == 1, "tiles with different pixel sizes"
    px, py = parts[0][3].a, -parts[0][3].e
    x0 = min(p[3].c for p in parts); y0 = max(p[3].f for p in parts)
    x1 = max(p[3].c + p[1].shape[1] * px for p in parts); y1 = min(p[3].f - p[1].shape[0] * py for p in parts)
    W, H = round((x1 - x0) / px), round((y0 - y1) / py)
    dem = np.full((H, W), np.nan, np.float32); water = np.full((H, W), np.nan, np.float32)
    for _, d, wa, tr, _crs in parts:
        c = round((tr.c - x0) / px); r_ = round((y0 - tr.f) / py)
        dem[r_:r_ + d.shape[0], c:c + d.shape[1]] = d
        water[r_:r_ + d.shape[0], c:c + d.shape[1]] = wa
    return dem, water, from_origin(x0, y0, px, py), parts[0][4], [p[0] for p in parts]


def site_terrain(lat: float, lon: float, side_km: float) -> dict:
    w, s, e, n = bbox(lat, lon, side_km)
    pad = 0.006  # about 600 m of margin so edge posts are fully covered
    dem, water, tr, crs, names = dem_mosaic(w - pad, s - pad, e + pad, n + pad)
    wtr = tr
    out = {"tile": ", ".join(names)}
    for label, post in (("fine", FINE_POST_M), ("grid", SPACING_M)):
        # k x k posts of exactly `post` metres, centred on the site. The window is therefore
        # k x post wide, the nearest whole number of posts to the stated footprint.
        k = max(1, round(side_km * 1000 / post))
        ww, ss, ee, nn = bbox(lat, lon, k * post / 1000)
        dtr = from_origin(ww, nn, (ee - ww) / k, (nn - ss) / k)
        z = np.full((k, k), np.nan, np.float32)
        wf = np.full((k, k), np.nan, np.float32)
        reproject(dem, z, src_transform=tr, src_crs=crs, dst_transform=dtr, dst_crs=crs,
                  resampling=Resampling.average, dst_nodata=np.nan)
        reproject(water, wf, src_transform=wtr, src_crs=crs, dst_transform=dtr, dst_crs=crs,
                  resampling=Resampling.average, dst_nodata=np.nan)
        valid = np.isfinite(z) & np.isfinite(wf) & (wf < 0.5)
        slope, rough, nvalid = terrain_metrics(z, valid, post, post)
        out[label] = {"slope": slope, "roughness": rough, "postM": post, "windowKm": k * post / 1000, "pixels": int(nvalid), "pixelsTotal": k * k,
                      "elevMin": float(np.nanmin(z[valid])) if nvalid else None,
                      "elevMax": float(np.nanmax(z[valid])) if nvalid else None}
    return out


# ---------------------------------------------------------------- Sentinel-2

STAC = "https://earth-search.aws.element84.com/v1/search"
# Scene classification (SCL) codes of Sentinel-2 L2A.
# Class 6 (water) is treated as a clear observation: the classification labels dark lava as water
# (86% of the Timanfaya footprint). Real open water comes from the Copernicus DEM water body mask.
SCL_CLEAR_LAND = (4, 5, 6, 7)   # vegetation, not vegetated, water (see above), unclassified
SCL_SNOW = 11


def stac_items(lat: float, lon: float) -> list[dict]:
    items, body = [], {
        "collections": ["sentinel-2-l2a"], "limit": 100,
        "intersects": {"type": "Point", "coordinates": [lon, lat]},
        "datetime": f"{YEAR}-01-01T00:00:00Z/{YEAR}-12-31T23:59:59Z",
        "query": {"eo:cloud_cover": {"lt": MAX_SCENE_CLOUD}},
    }
    url = STAC
    while True:
        d = _retry(lambda: requests.post(url, json=body, headers=HEADERS, timeout=60).json())
        for f in d["features"]:
            a, p = f["assets"], f["properties"]
            if p.get("earthsearch:boa_offset_applied") is not True:
                continue  # a few scenes are not flagged as offset-corrected; leave them out
            items.append({
                "id": f["id"], "date": p["datetime"][:10], "cloud": p["eo:cloud_cover"],
                "tile": p.get("grid:code") or f["id"].split("_")[1],
                "red": a["red"]["href"], "nir": a["nir"]["href"], "scl": a["scl"]["href"],
                "scale": a["red"]["raster:bands"][0].get("scale"), "offset": a["red"]["raster:bands"][0].get("offset"),
                "nirScale": a["nir"]["raster:bands"][0].get("scale"), "nirOffset": a["nir"]["raster:bands"][0].get("offset"),
                "boaOffsetApplied": p.get("earthsearch:boa_offset_applied"),
                "baseline": p.get("s2:processing_baseline"),
            })
        nxt = [l for l in d.get("links", []) if l["rel"] == "next"]
        if not nxt:
            break
        body = nxt[0].get("body", body)
        url = nxt[0]["href"]
    return items


def _read_s2(item: dict, lat: float, lon: float, side_km: float):
    """Red, NIR (10 m) and SCL (20 m, repeated to 10 m) for the footprint, or None if it is not fully inside the tile."""
    w, s, e, n = bbox(lat, lon, side_km)

    def go():
        with rasterio.Env(**GDAL_ENV):
            with rasterio.open("/vsicurl/" + item["scl"]) as ds:
                xs, ys = warp_transform("EPSG:4326", ds.crs, [w, e, w, e], [s, s, n, n])
                # snap to the 20 m grid so the 10 m windows line up exactly
                x0 = math.floor((min(xs) - ds.transform.c) / 20); x1 = math.ceil((max(xs) - ds.transform.c) / 20)
                y0 = math.floor((ds.transform.f - max(ys)) / 20); y1 = math.ceil((ds.transform.f - min(ys)) / 20)
                if x0 < 0 or y0 < 0 or x1 > ds.width or y1 > ds.height:
                    return None
                scl = ds.read(1, window=Window(x0, y0, x1 - x0, y1 - y0))
            win10 = Window(2 * x0, 2 * y0, 2 * (x1 - x0), 2 * (y1 - y0))
            with rasterio.open("/vsicurl/" + item["red"]) as ds:
                assert abs(ds.transform.a - 10) < 1e-6
                red = ds.read(1, window=win10)
                tr10, crs10 = ds.window_transform(win10), ds.crs
            with rasterio.open("/vsicurl/" + item["nir"]) as ds:
                nir = ds.read(1, window=win10)
        return red, nir, np.repeat(np.repeat(scl, 2, axis=0), 2, axis=1), tr10, crs10
    return _retry(go)


def site_vegetation(site_id: str, lat: float, lon: float, side_km: float) -> dict:
    items = cached(f"stac_{site_id}", lambda: stac_items(lat, lon))
    if not items:
        return {"error": "no Sentinel-2 scenes found"}
    # One MGRS tile per site, so every scene shares one pixel grid: the tile with most scenes.
    tiles: dict[str, int] = {}
    for it in items:
        tiles[it["tile"]] = tiles.get(it["tile"], 0) + 1
    arrays = None
    for tile in sorted(tiles, key=lambda t: -tiles[t]):
        chosen = [it for it in items if it["tile"] == tile]
        probe = _read_s2(chosen[0], lat, lon, side_km)
        if probe is not None:
            break
    else:
        return {"error": "footprint is not inside a single Sentinel-2 tile"}
    by_month: dict[int, list[dict]] = {}
    for it in sorted(chosen, key=lambda it: it["cloud"]):
        m = int(it["date"][5:7])
        if len(by_month.setdefault(m, [])) < SCENES_PER_MONTH:
            by_month[m].append(it)
    picked = [it for m in sorted(by_month) for it in by_month[m]]
    with ThreadPoolExecutor(16) as ex:
        arrays = list(ex.map(lambda it: _read_s2(it, lat, lon, side_km), picked))
    shape = probe[0].shape
    # Open water: the Copernicus DEM water body mask, put on the Sentinel-2 pixel grid.
    w, s_, e, n = bbox(lat, lon, side_km)
    _, wsrc, wtr, wcrs, _ = dem_mosaic(w - 0.006, s_ - 0.006, e + 0.006, n + 0.006)
    wgrid = np.zeros(shape, np.float32)
    reproject(np.nan_to_num(wsrc), wgrid, src_transform=wtr, src_crs=wcrs, dst_transform=probe[3], dst_crs=probe[4],
              resampling=Resampling.nearest)
    water = wgrid > 0.5
    ann_sum = np.zeros(shape); ann_n = np.zeros(shape, int)
    snow_n = np.zeros(shape, int); obs_n = np.zeros(shape, int)
    used = []
    for m in sorted(by_month):
        msum = np.zeros(shape); mn = np.zeros(shape, int)
        for it in by_month[m]:
            a = arrays[picked.index(it)]
            if a is None or a[0].shape != shape:
                continue
            red, nir, scl = a[:3]
            # Earth Search files flagged boa_offset_applied already have the baseline 04.00 offset removed,
            # so reflectance = DN x 0.0001 and NDVI can be taken from the DNs directly (checked: shadow
            # pixels at Kawah Ijen have DN 20 to 40, which would be negative reflectance otherwise).
            red = red.astype(np.float64); nir = nir.astype(np.float64)
            data = (red > 0) & (nir > 0)
            clear = data & np.isin(scl, SCL_CLEAR_LAND)
            ndvi = np.where(clear, (nir - red) / np.where(data, nir + red, 1), 0.0)
            msum += ndvi; mn += clear
            snow_n += data & (scl == SCL_SNOW) & ~water
            obs_n += data & np.isin(scl, SCL_CLEAR_LAND + (SCL_SNOW,)) & ~water
            used.append({"id": it["id"], "date": it["date"], "sceneCloudPct": round(it["cloud"], 1),
                         "clearLandShare": round(float(clear.mean()), 3)})
        has = mn > 0
        ann_sum += np.where(has, msum / np.maximum(mn, 1), 0.0)
        ann_n += has
    seen = (obs_n > 0) | water
    land = (ann_n > 0) & ~water
    if not land.any():
        return {"error": "no clear land observation in the footprint", "scenes": used}
    px_ndvi = ann_sum[land] / ann_n[land]
    return {
        "ndvi": float(px_ndvi.mean()),
        "bareFrac": float((px_ndvi < BARE_NDVI).mean()),
        "waterFrac": float(water.mean()),
        "snowObsShare": float(snow_n.sum() / max(1, obs_n.sum())),
        "pixels": int(land.sum()), "pixelsTotal": int(land.size),
        "pixelsNeverClear": int((~seen).sum()),
        "monthsWithData": int(len({u["date"][5:7] for u in used if u["clearLandShare"] > 0})),
        "medianMonthsPerPixel": float(np.median(ann_n[land])),
        "tile": tile, "scenes": used,
    }


# ---------------------------------------------------------------- rock type

def gvp_volcano(number: int) -> dict | None:
    url = ("https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows?service=WFS&version=1.0.0&request=GetFeature"
           "&typeName=GVP-VOTW:Smithsonian_VOTW_Holocene_Volcanoes&outputFormat=application/json"
           f"&CQL_FILTER=Volcano_Number={number}")
    d = _retry(lambda: requests.get(url, headers=HEADERS, timeout=60).json())
    if not d["features"]:
        return None
    p = d["features"][0]["properties"]
    if str(p.get("Major_Rock_Type") or "").startswith("No Data"):
        p["Major_Rock_Type"] = None   # the database says it has no rock type; that is a null, not a rock name
    return {k: p.get(k) for k in ("Volcano_Number", "Volcano_Name", "Primary_Volcano_Type", "Major_Rock_Type",
                                  "Latitude", "Longitude")}


def macrostrat_units(lat: float, lon: float) -> list[dict]:
    src = cached("macrostrat_sources", lambda: _retry(lambda: requests.get(
        "https://macrostrat.org/api/v2/defs/sources?all", headers=HEADERS, timeout=60).json())["success"]["data"])
    src = {s["source_id"]: s for s in src}
    d = _retry(lambda: requests.get("https://macrostrat.org/api/v2/geologic_units/map",
                                    params={"lat": lat, "lng": lon, "response": "long"}, headers=HEADERS, timeout=60).json())
    out = []
    for u in d["success"]["data"]:
        s = src.get(u["source_id"], {})
        out.append({"scale": s.get("scale"), "mapName": s.get("name"), "mapRef": " ".join(
            str(x) for x in (s.get("authors"), s.get("ref_year"), s.get("ref_title"), s.get("ref_source"), s.get("isbn_doi")) if x),
            "mapUrl": s.get("url"), "unit": u.get("name"), "lith": u.get("lith"), "descrip": u.get("descrip"),
            "sourceId": u["source_id"]})
    return out


SCALE_RANK = {"large": 0, "medium": 1, "small": 2}  # "tiny" (generalized world map) is never used


def site_rock(site_id: str, lat: float, lon: float) -> dict:
    units = cached(f"macrostrat_{site_id}", lambda: macrostrat_units(lat, lon))
    regional = sorted((u for u in units if u["scale"] in SCALE_RANK and (u["lith"] or u["unit"])),
                      key=lambda u: SCALE_RANK[u["scale"]])
    gvp = cached(f"gvp_{site_id}", lambda: gvp_volcano(GVP_NUMBER[site_id])) if site_id in GVP_NUMBER else None
    return {"regionalMapUnits": regional, "gvp": gvp}


# ---------------------------------------------------------------- assemble

def V(value, unit, scale, source, badge="Measured", **extra):
    d = {"value": value, "unit": unit, "scale": scale,
         "source": source if value is not None else None, "badge": badge if value is not None else None}
    d.update({k: v for k, v in extra.items() if v is not None})
    return d


def r(x, nd):
    return None if x is None or not math.isfinite(x) else round(float(x), nd)


def build() -> dict:
    analogs = {a["id"]: a for a in json.loads((DATA / "analogs.json").read_text())}
    in_file = set(analogs)
    analogs = merged_sites(analogs)
    earth = json.loads((DATA / "earth.json").read_text())
    cells = {(c["lat"], c["lon"]): c for c in earth["cells"]}
    fsrc = {f["key"]: f["source"] for f in earth["meta"]["factors"]}
    classes = {k["code"]: k["label"] for f in earth["meta"]["factors"] if f["key"] == "lithology" for k in f["classes"]}
    ids = [i for i, a in analogs.items() if a["kind"] == "candidate"] + COMPARISON_IDS
    assert all(analogs[i]["kind"] == "known" for i in COMPARISON_IDS)
    missing = [i for i in ids if i not in FOOTPRINTS or i not in analogs]
    assert not missing, f"no footprint or analogs.json entry for: {missing}"
    DEM_SRC = "Copernicus DEM GLO-30 (ESA), elevation and water body mask"
    S2_SRC = f"Copernicus Sentinel-2 L2A, {YEAR} (ESA), read from the Earth Search open archive"
    sites = []
    for sid in ids:
        a = analogs[sid]
        lat, lon = a["lat"], a["lon"]
        side, fnote = FOOTPRINTS[sid]
        print(f"[{sid}] {side} km")
        t = cached(f"terrain2_{sid}_{side}", lambda: site_terrain(lat, lon, side))
        v = cached(f"s2b_{sid}_{side}_{YEAR}", lambda: site_vegetation(sid, lat, lon, side))
        rk = site_rock(sid, lat, lon)
        try:
            em = cached(f"emit_{sid}_{side}", lambda: emit_minerals.site_minerals(lat, lon, side))
        except RuntimeError as e:   # a failed download is not cached, so the next run tries again
            em = {"covered": None, "reason": f"EMIT data could not be read on this run: {e}"}
        print(f"   EMIT: {em.get('date') or em.get('reason')}")
        i, j = cell_index(lat, lon)
        cell = cells.get((float(LATS[i]), float(LONS[j])))
        g = cell or {}
        tf, tg = t.get("fine", {}), t.get("grid", {})
        vals = {
            "slope": V(r(tg.get("slope"), 2), "degrees", "site", DEM_SRC, postM=r(tg.get("postM"), 1), windowKm=r(tg.get("windowKm"), 2), pixels=tg.get("pixels"),
                       note="463 m posts: comparable with earth.json and the targets. Few pixels in a footprint this small."),
            "roughness": V(r(tg.get("roughness"), 1), "m", "site", DEM_SRC, postM=r(tg.get("postM"), 1), windowKm=r(tg.get("windowKm"), 2), pixels=tg.get("pixels")),
            "slopeFine": V(r(tf.get("slope"), 2), "degrees", "site", DEM_SRC, postM=r(tf.get("postM"), 1), pixels=tf.get("pixels"),
                           note="About 31 m posts. Not comparable with slopes measured at 463 m."),
            "roughnessFine": V(r(tf.get("roughness"), 1), "m", "site", DEM_SRC, postM=r(tf.get("postM"), 1), pixels=tf.get("pixels")),
            "ndvi": V(r(v.get("ndvi"), 3), "", "site", S2_SRC, pixels=v.get("pixels"), months=v.get("monthsWithData"),
                      scenes=len(v.get("scenes", [])) or None),
            "bareFrac": V(r(v.get("bareFrac"), 3), "fraction of land pixels, 0 to 1", "site", S2_SRC,
                          note=f"Share of non-water 10 m pixels with annual NDVI below {BARE_NDVI}."),
            "waterFrac": V(r(v.get("waterFrac"), 3), "fraction of footprint, 0 to 1", "site", DEM_SRC,
                           note="Open water in the Copernicus DEM water body mask."),
            "snowObsShare": V(r(v.get("snowObsShare"), 3), "fraction of clear observations, 0 to 1", "site", S2_SRC,
                              note="Share of clear observations classed as snow. Snow observations are left out of ndvi and bareFrac."),
        }
        # Rock type: finest regional map unit, then the volcano's major rock type.
        reg = rk["regionalMapUnits"]
        gvp = rk["gvp"]
        if reg:
            u = reg[0]
            text = u["lith"] or u["unit"]
            vals["rockType"] = V(text, "", "site", f"{u['mapName']} ({u['scale']}-scale map) via Macrostrat: {u['mapRef']}",
                                 "Literature", mapUnit=u["unit"], description=(u["descrip"] or None))
        elif gvp and gvp.get("Major_Rock_Type"):
            text = gvp["Major_Rock_Type"]
            vals["rockType"] = V(text, "", "volcano",
                                 f"Smithsonian Global Volcanism Program, Volcanoes of the World, volcano {gvp['Volcano_Number']} ({gvp['Volcano_Name']})",
                                 "Literature", note="Major rock type of the whole volcano, not mapped inside the footprint.")
        elif sid in LITERATURE_ROCK:
            text, ref = LITERATURE_ROCK[sid]
            vals["rockType"] = V(text, "", "site", ref, "Literature", note="Stated in a paper about this feature, not read from a map.")
        else:
            text = None
            vals["rockType"] = V(None, "", "site", None,
                                 note="No regional geologic map, volcano record or retrievable paper abstract gives the rock type here.")
        code = ROCK_TO_GLIM.get(text) if text else None
        code_from = vals["rockType"]
        if code is None and reg and gvp and ROCK_TO_GLIM.get(gvp.get("Major_Rock_Type")):
            code = ROCK_TO_GLIM[gvp["Major_Rock_Type"]]
            code_from = {"scale": "volcano", "source": f"Smithsonian Global Volcanism Program, Volcanoes of the World, volcano {gvp['Volcano_Number']} ({gvp['Volcano_Name']})"}
        vals["lithology"] = V(code, "class code", code_from["scale"], code_from["source"], "Literature",
                              label=classes.get(code),
                              note=("GLiM class assigned from the named rock type by GLiM's class definitions."
                                    if code else "The rock type has no exact GLiM class in the mapping table, or is unknown."))
        if gvp and reg:
            vals["rockTypeVolcano"] = V(gvp.get("Major_Rock_Type"), "", "volcano",
                                        f"Smithsonian Global Volcanism Program, Volcanoes of the World, volcano {gvp['Volcano_Number']} ({gvp['Volcano_Name']})",
                                        "Literature")
        for k, unit in (("tempMean", "°C"), ("tempRange", "°C"), ("precip", "mm/year")):
            vals[k] = V(g.get(k), unit, "grid", fsrc[k], note="0.5 degree cell value, not measured at the site.")
        site = {
            "id": sid, "name": a["name"], "lat": lat, "lon": lon, "kind": a["kind"],
            "footprintKm": side, "footprintNote": fnote,
            "footprintStatus": "provisional" if sid in PROVISIONAL else "set",
            "footprintBasis": PROVISIONAL.get(sid),
            "inAnalogsJson": sid in in_file,
            "coordinateSource": a.get("coordinateSource"),
            "analogSource": a.get("source") or a.get("analogSource"),
            "proposedBy": "team member" if sid in PROVISIONAL else None,
            "caveat": CAVEATS.get(sid),
            "values": vals,
            "gridCell": None if cell is None else {
                "lat": cell["lat"], "lon": cell["lon"],
                **{k: cell[k] for k in ("ndvi", "slope", "roughness", "lithology", "snowIceFrac", "barrenFrac")}},
            "detail": {
                "demTile": t.get("tile"), "elevMinM": r(tf.get("elevMin"), 0), "elevMaxM": r(tf.get("elevMax"), 0),
                "sentinel2Tile": v.get("tile"), "sentinel2Scenes": v.get("scenes"),
                "sentinel2MedianMonthsPerPixel": v.get("medianMonthsPerPixel"),
                "sentinel2PixelsNeverClear": v.get("pixelsNeverClear"),
                "otherRegionalMapUnits": [{"map": u["mapName"], "scale": u["scale"], "unit": u["unit"], "lith": u["lith"]} for u in reg[1:]],
                "errors": [e for e in (t.get("error"), v.get("error")) if e],
            },
        }
        has = "group1" in em
        site["mineralogy"] = {
            "value": {"group1": em["group1"], "group2": em["group2"]} if has else None,
            "scale": "site",
            "source": (f"NASA EMIT L2B Estimated Mineral Identification and Band Depth 60 m ({em['collection']}), granule {em['granule']}; "
                       f"cloud, cirrus and water removed with {em['mask']}. NASA LP DAAC.") if has else None,
            "badge": "Measured" if has else None,
            "date": em.get("date"), "validShare": em.get("validShare"), "pixels": em.get("pixels"),
            "emitCovers": em.get("covered"), "granulesAvailable": em.get("granulesAvailable"), "granulesTried": em.get("tried"),
            "note": (("Best spectral-library match per 60 m pixel on one date. group1 and group2 are the product's two mineral groups "
                      "(group 1 holds the iron oxide matches, group 2 the clay, mica, carbonate and sulfate matches). "
                      "shareOfValidPixels is how often a match occurs, not how much of the mineral is there. "
                      "The spectral library also holds entries that are not minerals (dry vegetation, plastics); they are listed as the "
                      "product gives them. Matches are weak where plants cover the ground: read them with bareFrac.")
                     if has else em.get("reason")),
        }
        sites.append(site)
    meta = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "description": ("Factors measured inside a small square footprint centred on each site, for the candidate sites of "
                        "analogs.json, two more candidate sites proposed by a team member, and nine already-known analogs for "
                        "comparison. Every value carries its scale: site, volcano or grid. kind 'known' means an already-known "
                        "analog, not a new finding. footprintStatus 'provisional' means a team member should check the footprint."),
        "year": YEAR,
        "bareNdviThreshold": BARE_NDVI,
        "methods": {
            "terrain": ("Copernicus DEM GLO-30, water pixels left out with the product's water body mask. Same function as "
                        "earth.json (pipeline/terrain_metrics.py): mean Horn 3x3 slope, standard deviation of elevation. "
                        "slope/roughness on 463 m posts, slopeFine/roughnessFine on 1 arc-second (about 31 m) posts."),
            "vegetation": (f"Sentinel-2 L2A, {YEAR}, up to {SCENES_PER_MONTH} least-cloudy scenes per month (scene cloud cover under "
                           f"{MAX_SCENE_CLOUD}%). Per 10 m pixel: NDVI from bands 4 and 8 for observations classed vegetation, "
                           "not vegetated, water or unclassified (open water is removed with the Copernicus DEM water body mask "
                           "instead, because the classification labels dark lava as water); mean per month, then mean of months. ndvi is the footprint mean. "
                           "Only scenes flagged as offset-corrected in the archive are used. "
                           f"bareFrac is the share of non-water pixels below {BARE_NDVI}."),
            "rock": ("Finest regional geologic map unit at the site coordinates from Macrostrat (large, medium or small scale "
                     "maps only). If there is none, the volcano's major rock type from the Smithsonian Global Volcanism "
                     "Program. If there is neither, a rock type stated in the abstract of a paper about the feature. "
                     "Otherwise null."),
            "minerals": ("NASA EMIT L2B mineral identification, 60 m. Per site, the least cloudy granule (of at most "
                         f"{emit_minerals.MAX_TRIES} tried) in which the footprint is wholly inside the scene and at least "
                         f"{emit_minerals.MIN_VALID:.0%} of its pixels are free of cloud, cirrus and water in the EMIT L2A mask. "
                         "One date, nothing merged. Null where no granule qualifies."),
            "climate": "Copied from the site's 0.5 degree cell in earth.json (scale: grid).",
        },
    }
    return {"meta": meta, "sites": sites}


def main() -> None:
    out = build()
    tmp = DATA / "sites.json.tmp"
    tmp.write_text(json.dumps(out, ensure_ascii=False, indent=1, allow_nan=False))
    os.replace(tmp, DATA / "sites.json")
    print(f"\n{'site':<24}{'km':>4} {'slope':>6} {'rough':>7} {'slopeF':>7} {'roughF':>7} {'ndvi':>6} {'bare':>6} {'water':>6} {'snow':>6} {'mo':>3}  rock | cell ndvi/slope")
    for s in out["sites"]:
        v = s["values"]; g = s["gridCell"] or {}
        f = lambda k: "null" if v[k]["value"] is None else v[k]["value"]  # noqa: E731
        print(f"{s['id'][:23]:<24}{s['footprintKm']:>4} {f('slope'):>6} {f('roughness'):>7} {f('slopeFine'):>7} {f('roughnessFine'):>7} "
              f"{f('ndvi'):>6} {f('bareFrac'):>6} {f('waterFrac'):>6} {f('snowObsShare'):>6} {v['ndvi'].get('months', '-'):>3}  "
              f"{str(f('rockType'))[:40]} [{f('lithology')}] | {g.get('ndvi')}/{g.get('slope')}")
        if s["detail"]["errors"]:
            print("   errors:", s["detail"]["errors"])
    print(f"\nwrote {DATA / 'sites.json'}")


if __name__ == "__main__":
    main()

"""Terrain factors (slope, roughness) from the Copernicus DEM GLO-90.

Source: Copernicus DEM GLO-90 (ESA / Airbus), 1 x 1 degree Cloud Optimized GeoTIFFs on the
AWS Open Data registry (no login). For every tile that holds a land cell we read
  - the elevation raster. Native posting is 3 arc-seconds in latitude and 3 to 30 in
    longitude. We read the first overview stored inside each file (6 arc-seconds), which
    is the exact 2 x 2 block mean of the native raster: checked on five tiles, the two
    agree to 0.001 m. Reading it instead of the native raster cuts the download by four
    and changes the metrics by under 1 percent (slope 20.59 vs 20.49 degrees near Everest);
  - the product's own Water Body Mask (WBM: 0 land, 1 ocean, 2 lake, 3 river) at native posting.

Per 0.5 degree cell, following pipeline/terrain_metrics.py:
  - elevation is block-averaged (area-weighted mean) onto a grid of 120 rows
    (15 arc-seconds, 463 m) and as many columns as give the same spacing east-west at the
    cell's latitude;
  - a resampled pixel is water, and left out, when half or more of it is water in the WBM;
  - slope is the mean Horn slope in degrees, roughness the elevation standard deviation in m.

Tiles are streamed, not kept. The per-tile results are cached
in cache/terrain_tiles.jsonl, so a rerun only fetches tiles that are still missing.
"""
from __future__ import annotations

import json
import math
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import numpy as np
import rasterio
import requests
from rasterio.io import MemoryFile
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject

from common import CACHE, LATS, LONS, NLAT, NLON, USER_AGENT, download, save_grid
import landmask
from terrain_metrics import SPACING_M, terrain_metrics

BUCKET = "https://copernicus-dem-90m.s3.amazonaws.com"
RESULTS = CACHE / "terrain_tiles.jsonl"
WORKERS = 32
OVERVIEW_LEVEL = 0               # first overview: 2 x 2 block mean, 6 arc-seconds
ROWS = 120                       # 0.5 degrees / 15 arc-seconds
M_PER_DEG = 111194.9             # mean Earth radius 6371.0088 km
DY_M = 0.5 * M_PER_DEG / ROWS    # 463.3 m
_local = threading.local()


def tile_name(lat0: int, lon0: int) -> str:
    ns = f"{'N' if lat0 >= 0 else 'S'}{abs(lat0):02d}_00"
    ew = f"{'E' if lon0 >= 0 else 'W'}{abs(lon0):03d}_00"
    return f"Copernicus_DSM_COG_30_{ns}_{ew}_DEM"


def _get(url: str) -> bytes | None:
    s = getattr(_local, "s", None)
    if s is None:
        s = _local.s = requests.Session()
        s.headers["User-Agent"] = USER_AGENT
    last = None
    for attempt in range(6):
        try:
            r = s.get(url, timeout=(20, 180))
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.content
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(min(30, 2 ** attempt))
    raise RuntimeError(f"failed: {url}: {type(last).__name__}")


def _read(content: bytes):
    with MemoryFile(content) as mf, mf.open() as ds:
        return ds.read(1), ds.transform, ds.crs


GDAL_ENV = dict(
    GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
    GDAL_HTTP_MAX_RETRY="4", GDAL_HTTP_RETRY_DELAY="2", GDAL_HTTP_TIMEOUT="120",
    GDAL_HTTP_USERAGENT=USER_AGENT, GDAL_INGESTED_BYTES_AT_OPEN="32768", VSI_CACHE="FALSE",
)


def _read_overview(url: str):
    """Read overview level 0 (the 2 x 2 block mean) of a remote COG with HTTP range requests."""
    last = None
    for attempt in range(5):
        try:
            with rasterio.Env(**GDAL_ENV):
                with rasterio.open("/vsicurl/" + url, overview_level=OVERVIEW_LEVEL) as ds:
                    return ds.read(1), ds.transform, ds.crs
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(min(30, 2 ** attempt))
    raise RuntimeError(f"failed: {url}: {type(last).__name__}")


def cell_grid(i: int, j: int):
    """Destination grid of one 0.5 degree cell: (rows, cols, transform, dx_m)."""
    lat_n = LATS[i] + 0.25
    lon_w = LONS[j] - 0.25
    width_m = 0.5 * M_PER_DEG * math.cos(math.radians(LATS[i]))
    cols = max(1, round(width_m / SPACING_M))
    return ROWS, cols, from_origin(lon_w, lat_n, 0.5 / cols, 0.5 / ROWS), width_m / cols


def process_tile(lat0: int, lon0: int, cells: list[tuple[int, int]]) -> dict:
    name = tile_name(lat0, lon0)
    wbm_name = name.replace("_DEM", "_WBM")
    wbm_b = _get(f"{BUCKET}/{name}/AUXFILES/{wbm_name}.tif")
    if wbm_b is None:
        return {"tile": name, "status": "no-water-mask", "cells": []}
    dem, tr, crs = _read_overview(f"{BUCKET}/{name}/{name}.tif")
    wbm, wtr, _ = _read(wbm_b)
    assert wbm.shape == (dem.shape[0] * 2, dem.shape[1] * 2), (name, wbm.shape, dem.shape)
    water = (wbm != 0).astype(np.float32)
    dem = dem.astype(np.float32)
    out = []
    for i, j in cells:
        rows, cols, dtr, dx_m = cell_grid(i, j)
        z = np.full((rows, cols), np.nan, dtype=np.float32)
        w = np.full((rows, cols), np.nan, dtype=np.float32)
        for src, str_, dst in ((dem, tr, z), (water, wtr, w)):
            reproject(src, dst, src_transform=str_, src_crs=crs, dst_transform=dtr, dst_crs=crs,
                      resampling=Resampling.average, dst_nodata=np.nan, num_threads=1)
        valid = np.isfinite(z) & np.isfinite(w) & (w < 0.5)
        slope, rough, n = terrain_metrics(z, valid, dx_m, DY_M)
        out.append([i, j, slope, rough, n, rows * cols])
    return {"tile": name, "status": "ok", "cells": out}


def tiles_needed() -> dict[tuple[int, int], list[tuple[int, int]]]:
    land = landmask.land_mask()
    need: dict[tuple[int, int], list[tuple[int, int]]] = {}
    for i, j in zip(*np.nonzero(land)):
        key = (math.floor(LATS[i]), math.floor(LONS[j]))
        need.setdefault(key, []).append((int(i), int(j)))
    return need


def load_results() -> dict[str, dict]:
    done = {}
    if RESULTS.exists():
        for line in RESULTS.read_text().splitlines():
            if line.strip():
                r = json.loads(line)
                done[r["tile"]] = r
    return done


def run(limit: int | None = None) -> None:
    need = tiles_needed()
    listed = set(download(f"{BUCKET}/tileList.txt", CACHE / "cop90" / "tileList.txt").read_text().split())
    done = load_results()
    todo = []
    with open(RESULTS, "a") as f:
        for key, cells in need.items():
            name = tile_name(*key)
            prev = done.get(name)
            if prev and {(c[0], c[1]) for c in prev["cells"]} >= set(cells):
                continue
            if prev and prev["status"] != "ok":
                continue
            if name not in listed:
                f.write(json.dumps({"tile": name, "status": "missing", "cells": []}) + "\n")
                continue
            todo.append((key, cells))
    if limit:
        todo = todo[:limit]
    print(f"  tiles: {len(need)} hold land cells, {len(todo)} to fetch")
    if not todo:
        return
    t0, n, nbad = time.time(), 0, 0
    lock = threading.Lock()
    with ThreadPoolExecutor(WORKERS) as ex, open(RESULTS, "a") as f:
        futs = {ex.submit(process_tile, k[0], k[1], c): k for k, c in todo}
        for fut in as_completed(futs):
            try:
                r = fut.result()
            except Exception as e:  # noqa: BLE001 - keep going, the tile is retried on the next run
                nbad += 1
                print(f"  tile {futs[fut]} failed: {e}")
                continue
            with lock:
                f.write(json.dumps(r) + "\n")
                f.flush()
            n += 1
            if n % 500 == 0:
                el = time.time() - t0
                print(f"  {n}/{len(todo)} tiles, {el / 60:.1f} min, about {(len(todo) - n) * el / n / 60:.0f} min left", flush=True)
    print(f"  fetched {n} tiles, {nbad} failed, {(time.time() - t0) / 60:.1f} min")
    if nbad:
        raise RuntimeError(f"{nbad} tiles failed; run the terrain stage again to retry them")


def build() -> dict:
    run()
    slope = np.full((NLAT, NLON), np.nan, dtype=np.float32)
    rough = np.full((NLAT, NLON), np.nan, dtype=np.float32)
    status: dict[str, int] = {}
    for r in load_results().values():
        status[r["status"]] = status.get(r["status"], 0) + 1
        for i, j, s, ro, _n, _tot in r["cells"]:
            if s is not None:
                slope[i, j] = s
            if ro is not None:
                rough[i, j] = ro
    save_grid("slope", slope)
    save_grid("roughness", rough)
    return {
        "source": "Copernicus DEM GLO-90 (ESA, 2021 release), elevation and water body mask",
        "labelSuffix": "463 m posts, 0.5 degree window",
        "spacingM": SPACING_M,
        "window": "one 0.5 degree cell: 55.6 km north-south by 55.6 km x cos(latitude) east-west",
        "method": ("Elevation block-averaged to 15 arc-second (463 m) posts (via the product's 2x2-mean overview), "
                   "water pixels left out. "
                   "slope = mean Horn 3x3 slope in degrees; roughness = standard deviation of elevation in m. "
                   "Code: pipeline/terrain_metrics.py"),
        "tiles": status,
    }


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        t0 = time.time()
        for la, lo, label in [(-9, 114, "Ijen"), (27, 86, "Everest"), (18, 11, "Sahara"), (72, -39, "Greenland"), (-76, 123, "Dome C")]:
            need = tiles_needed().get((la, lo), [])
            r = process_tile(la, lo, need)
            for c in r["cells"]:
                print(label, LATS[c[0]], LONS[c[1]], "slope", c[2] and round(c[2], 2), "rough", c[3] and round(c[3], 1), "n", c[4], "/", c[5])
        print("sec", round(time.time() - t0, 1))
    else:
        print(build())

"""Slope and roughness for every cell of the global Moon and Mars grids.

Method: the one used for the targets (validation/target_terrain.py) and, through
terrain_metrics.py, for Earth. For each cell centre:

  1. A square window of WINDOW_KM x WINDOW_KM of ground (55.6 km, the height of an Earth cell),
     centred on the cell centre, in a local orthographic projection so it is a true square
     at any latitude, the poles included.
  2. The elevation model is block-averaged onto posts of the source spacing (Mars 463 m, Moon
     474 m: the LOLA 64 pixel per degree grid, never a finer grid than the source).
  3. terrain_metrics(): mean Horn slope in degrees, standard deviation of elevation in metres.

Cells are about one window apart at the equator (Moon 2 degrees = 60.6 km, Mars 1 degree =
59.3 km). Towards the poles cells get narrower, so neighbouring windows overlap; each value
still describes the 55.6 km around its own cell centre.
"""
from __future__ import annotations

import math
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import CACHE  # noqa: E402
from terrain_metrics import WINDOW_KM, terrain_metrics  # noqa: E402

PLANET = CACHE / "planet"
BODIES = {
    # ppd: pixels per degree of the source grid. lon0: longitude of the west edge of column 0.
    "moon": {"radius": 1_737_400.0, "cell": 2.0, "ppd": 64, "lon0": 0.0, "file": "ldem_64.img",
             "raw": ("<i2", 0.5)},
    "mars": {"radius": 3_396_190.0, "cell": 1.0, "ppd": 128, "lon0": None, "file": "mola_463m.tif", "raw": None},
}
_src = {}


def source(body: str):
    """(array-like of heights indexed [rows, cols], scale to metres, lon of west edge, nodata)."""
    if body not in _src:
        b = BODIES[body]
        if b["raw"]:
            dtype, scale = b["raw"]
            a = np.memmap(PLANET / b["file"], dtype=dtype, mode="r").reshape(180 * b["ppd"], 360 * b["ppd"])
            _src[body] = (a, scale, b["lon0"], None)
        else:
            ds = rasterio.open(PLANET / b["file"])
            assert ds.height == 180 * b["ppd"] and ds.width == 360 * b["ppd"], (ds.width, ds.height)
            # The mosaic is simple cylindrical in metres; column 0 is its west edge in degrees.
            lon0 = round(math.degrees(ds.transform.c / b["radius"]), 6)
            assert abs(lon0 + 180.0) < 0.01 and abs(math.degrees(ds.transform.f / b["radius"]) - 90.0) < 0.01, ds.transform
            a = np.memmap(PLANET / (b["file"] + ".i2"), dtype="<i2", mode="r").reshape(ds.height, ds.width)
            _src[body] = (a, 1.0, -180.0, ds.nodata)
    return _src[body]


def unpack_tif(body: str) -> None:
    """Write the GeoTIFF's single band as a raw int16 file once, so worker processes can memory-map it."""
    b = BODIES[body]
    out = PLANET / (b["file"] + ".i2")
    if out.exists():
        return
    with rasterio.open(PLANET / b["file"]) as ds:
        assert ds.dtypes[0] == "int16", ds.dtypes
        tmp = out.with_suffix(".tmp")
        with open(tmp, "wb") as f:
            for r0 in range(0, ds.height, 1024):
                f.write(ds.read(1, window=((r0, min(ds.height, r0 + 1024)), (0, ds.width))).astype("<i2").tobytes())
        tmp.rename(out)


def window(body: str, lat: float, lon: float):
    """(slope, roughness, valid posts, posts per side, post spacing m) for the window centred on lat, lon."""
    b = BODIES[body]
    a, scale, lon0, nodata = source(body)
    R, ppd = b["radius"], b["ppd"]
    post = 2 * math.pi * R / 360 / ppd                    # source spacing along a meridian
    n = round(WINDOW_KM * 1000 / post)
    half = n * post / 2
    half_deg = math.degrees(half * math.sqrt(2) / R) + 2.0 / ppd      # half-diagonal plus two pixels
    H, W = a.shape
    r0 = max(0, math.floor((90 - (lat + half_deg)) * ppd)); r1 = min(H, math.ceil((90 - (lat - half_deg)) * ppd))
    reach = max(abs(lat + half_deg), abs(lat - half_deg))
    if reach >= 89.0 or half_deg / math.cos(math.radians(reach)) >= 170:
        cols = np.arange(W); west = lon0                   # window wraps the pole: take every longitude
    else:
        dl = half_deg / math.cos(math.radians(reach))
        c0 = math.floor((lon - dl - lon0) * ppd); c1 = math.ceil((lon + dl - lon0) * ppd)
        cols = np.arange(c0, c1) % W; west = lon0 + c0 / ppd
    src = np.asarray(a[r0:r1][:, cols], dtype=np.float32)
    if nodata is not None:
        src[src == nodata] = np.nan
    src *= scale
    geo = CRS.from_proj4(f"+proj=longlat +R={R} +no_defs")
    dst = CRS.from_proj4(f"+proj=ortho +lat_0={lat} +lon_0={lon} +R={R} +units=m +no_defs")
    z = np.full((n, n), np.nan, np.float32)
    reproject(src, z, src_transform=from_origin(west, 90 - r0 / ppd, 1 / ppd, 1 / ppd), src_crs=geo,
              dst_transform=from_origin(-half, half, post, post), dst_crs=dst,
              resampling=Resampling.average, src_nodata=np.nan, dst_nodata=np.nan, num_threads=1)
    slope, rough, nv = terrain_metrics(z, np.isfinite(z), post, post)
    return slope, rough, nv, n, post


def _row(args):
    body, lat, lons = args
    return [window(body, lat, lon)[:3] for lon in lons]


def grid(body: str):
    """(lats, lons, slope[nlat, nlon], roughness[nlat, nlon]) with NaN for no value. Cached."""
    b = BODIES[body]
    cache = PLANET / f"terrain_{body}.npz"
    lats = np.arange(90 - b["cell"] / 2, -90, -b["cell"]); lons = np.arange(-180 + b["cell"] / 2, 180, b["cell"])
    if cache.exists():
        d = np.load(cache)
        return lats, lons, d["slope"], d["roughness"]
    if not b["raw"]:
        unpack_tif(body)
    slope = np.full((len(lats), len(lons)), np.nan); rough = np.full_like(slope, np.nan)
    with ProcessPoolExecutor(8) as ex:
        for i, res in enumerate(ex.map(_row, [(body, float(la), [float(x) for x in lons]) for la in lats])):
            for j, (s, r_, _n) in enumerate(res):
                slope[i, j] = np.nan if s is None else s
                rough[i, j] = np.nan if r_ is None else r_
            if i % 20 == 0:
                print(f"  {body} terrain row {i}/{len(lats)}", flush=True)
    np.savez_compressed(cache, slope=slope, roughness=rough)
    return lats, lons, slope, rough


if __name__ == "__main__":
    import json
    body = sys.argv[1]
    targets = json.loads((CACHE.parent.parent / "data" / "targets.json").read_text())
    for t in targets:
        if t["body"] == body:
            s, r_, nv, n, post = window(body, t["lat"], t["lon"])
            v = t["values"]
            print(f"{t['id']:<24} here {s:.2f} deg {r_:.1f} m ({nv} of {n * n} posts at {post:.0f} m) | targets.json {v['slope']['value']} deg {v['roughness']['value']} m")

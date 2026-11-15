"""Slope and roughness of the Moon and Mars targets, measured the same way as on Earth.

This script produces the `slope` and `roughness` values in data/targets.json. It does not guess:
it reads the mission elevation models from NASA's Planetary Data System and passes them through
the same function the Earth pipeline uses, pipeline/terrain_metrics.py (Session B), so a target
value and an Earth cell value are comparable (data/SCHEMA.md, "Terrain method").

Sources (both NASA PDS Geosciences Node, public, no login):
  Mars  MGS MOLA MEGDR, 128 pixels per degree (463 m), tiles megt*hb.img
        https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/
  Moon  LRO LOLA polar gridded DEM, 80 m per pixel, LDEM_80S_80M.IMG (targets south of 78 S)
        https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/
  Moon  LRO LOLA global gridded DEM, 512 pixels per degree (59 m), tiles LDEM_512_*.IMG (other targets)
        https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/

Method, mirroring pipeline/terrain.py:
  1. Take a window of WINDOW_KM x WINDOW_KM (55.6 km, the height of one 0.5 degree Earth cell)
     centred on the target coordinates from data/targets.json. Earth cells narrow east-west with
     cos(latitude); a target window is kept square, because a cos(latitude) width would shrink to
     nothing at the lunar pole.
  2. Block-average the elevation model onto 120 x 120 pixels (463 m), with rasterio's `average`
     resampling, the same call the Earth pipeline makes.
  3. slope = mean Horn slope in degrees, roughness = standard deviation of elevation in metres,
     both from terrain_metrics().

Only the bytes of the rows that cover each window are downloaded (HTTP range requests), about
3 MB per Mars target and 9 MB per Moon target.

Run from the repository root, with the pipeline's Python environment (numpy, rasterio, requests):

    pipeline/.venv/bin/python validation/target_terrain.py

Writes validation/output/target_terrain.json. Copy the numbers into data/targets.json by hand,
so that every change to a target value is a reviewed edit.

Site-sized windows. data/sites.json (Session B) measures Earth sites inside footprints of 2 to 5 km.
Roughness is the spread of elevation inside the window, so it grows with the window: a 3 km square of
a mountain has far less relief than a 55.6 km square. To compare a site with a target like for like,
the same targets are measured again in windows of the same number of 463 m posts:

    pipeline/.venv/bin/python validation/target_terrain.py --posts 4 6 9 11

writes validation/output/target_terrain_windows.json. These values are used only by the site-level
report (validation/score_sites.ts). They never replace the values in data/targets.json.

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import requests
from rasterio.crs import CRS
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
from terrain_metrics import SPACING_M, WINDOW_KM, terrain_metrics  # noqa: E402

TARGETS = ROOT / "data" / "targets.json"
OUT = ROOT / "validation" / "output" / "target_terrain.json"
OUT_WINDOWS = ROOT / "validation" / "output" / "target_terrain_windows.json"

PIXELS = round(WINDOW_KM * 1000 / SPACING_M)  # 120
USER_AGENT = "sbats-validation/0.1 (NASA Space Apps 2026 student project)"

MOLA_BASE = "https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128"
MOLA_PPD = 128
MOLA_LINES, MOLA_SAMPLES = 5632, 11520  # one tile: 44 x 90 degrees
MARS_RADIUS_M = 3_396_000.0  # A_AXIS_RADIUS in the MEGDR label

LOLA_URL = (
    "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/"
    "ldem_80s_80m.img"
)
LOLA_N = 7600  # lines and samples
LOLA_SCALE_M = 80.0  # MAP_SCALE, true at the pole
LOLA_CENTRE = 3799.5  # LINE_ and SAMPLE_PROJECTION_OFFSET (0-based pixel coordinates of the pole)
LOLA_DN_TO_M = 0.5  # SCALING_FACTOR
LOLA_MIN_LAT = -80.0
MOON_RADIUS_M = 1_737_400.0

LOLA_CYL_BASE = "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img"
LOLA_CYL_PPD = 512
LOLA_CYL_LINES, LOLA_CYL_SAMPLES = 23040, 46080  # one tile: 45 x 90 degrees


def fetch_range(url: str, start: int, length: int) -> bytes:
    """Download `length` bytes starting at `start`."""
    headers = {"Range": f"bytes={start}-{start + length - 1}", "User-Agent": USER_AGENT}
    last = None
    for _ in range(4):
        try:
            r = requests.get(url, headers=headers, timeout=(20, 180))
            r.raise_for_status()
            if r.status_code != 206 or len(r.content) != length:
                raise RuntimeError(f"expected {length} bytes (206), got {len(r.content)} ({r.status_code})")
            return r.content
        except Exception as e:  # noqa: BLE001
            last = e
    raise RuntimeError(f"failed to fetch {url}: {last}")


def window_m(posts: int) -> float:
    """Side of the window in metres: 55.6 km for the standard 120 posts, else posts x 463 m."""
    return WINDOW_KM * 1000 if posts == PIXELS else posts * SPACING_M


def mola_tile(lat: float, lon_e: float) -> tuple[str, float, float]:
    """Tile name and its north-west corner (lat_top, lon_west) for a point. lon_e is 0 to 360."""
    if lat >= 44:
        top, tag = 88.0, "88n"
    elif lat >= 0:
        top, tag = 44.0, "44n"
    elif lat >= -44:
        top, tag = 0.0, "00n"
    else:
        top, tag = -44.0, "44s"
    west = 90.0 * math.floor(lon_e / 90.0)
    return f"megt{tag}{int(west):03d}hb.img", top, west


def mars_window(lat: float, lon: float, posts: int = PIXELS) -> dict:
    """Terrain metrics for a square of `posts` x `posts` 463 m posts (55.6 km by default) centred on a
    Mars point (planetocentric, east-positive)."""
    lon_e = lon % 360.0
    name, top, west = mola_tile(lat, lon_e)
    half_lat = posts / 2 / MOLA_PPD  # 120 native rows = 0.9375 degrees = 55.6 km
    m_per_deg = math.pi * MARS_RADIUS_M / 180.0
    half_lon = (window_m(posts) / 2) / (m_per_deg * math.cos(math.radians(lat)))

    # Rows: snap the window to native row edges so north-south needs no resampling.
    row0 = round((top - lat) * MOLA_PPD - posts / 2)
    row1 = row0 + posts
    # Columns: native columns that cover the window, with one spare on each side.
    col0 = math.floor((lon_e - half_lon - west) * MOLA_PPD) - 1
    col1 = math.ceil((lon_e + half_lon - west) * MOLA_PPD) + 1
    if row0 < 0 or row1 > MOLA_LINES or col0 < 0 or col1 > MOLA_SAMPLES:
        raise RuntimeError(f"window around {lat}, {lon} crosses a MOLA tile edge; not handled")

    raw = fetch_range(f"{MOLA_BASE}/{name}", row0 * MOLA_SAMPLES * 2, (row1 - row0) * MOLA_SAMPLES * 2)
    tile = np.frombuffer(raw, dtype=">i2").reshape(row1 - row0, MOLA_SAMPLES)
    src = tile[:, col0:col1].astype(np.float32)

    lat_n = top - row0 / MOLA_PPD
    src_tr = from_origin(west + col0 / MOLA_PPD, lat_n, 1 / MOLA_PPD, 1 / MOLA_PPD)
    dst_tr = from_origin(lon_e - half_lon, lat_n, 2 * half_lon / posts, 1 / MOLA_PPD)
    crs = CRS.from_proj4(f"+proj=longlat +R={MARS_RADIUS_M} +no_defs")
    z = np.full((posts, posts), np.nan, dtype=np.float32)
    reproject(src, z, src_transform=src_tr, src_crs=crs, dst_transform=dst_tr, dst_crs=crs,
              resampling=Resampling.average, dst_nodata=np.nan, num_threads=1)

    dy = m_per_deg / MOLA_PPD
    dx = 2 * half_lon * m_per_deg * math.cos(math.radians(lat)) / posts
    slope, rough, n = terrain_metrics(z, np.isfinite(z), dx, dy)
    return {
        "slope": slope, "roughness": rough, "validPixels": n, "pixels": posts * posts,
        "dxM": round(dx, 2), "dyM": round(dy, 2),
        "elevationMinM": float(np.nanmin(z)), "elevationMaxM": float(np.nanmax(z)),
        "product": f"MGS MOLA MEGDR 128 ppd, {name}",
        "windowCentre": {"lat": round(lat_n - half_lat, 5), "lon": lon},
    }


def lola_xy(lat: float, lon: float) -> tuple[float, float]:
    """South polar stereographic map coordinates in metres (x east of lon 0, y towards lon 0)."""
    r = 2 * MOON_RADIUS_M * math.tan(math.radians(90.0 + lat) / 2)
    return r * math.sin(math.radians(lon)), r * math.cos(math.radians(lon))


def lola_height(lat: float, lon: float) -> float:
    """Height in metres above the 1737.4 km sphere at one point. Used to check the map orientation."""
    x, y = lola_xy(lat, lon)
    col = int(round(LOLA_CENTRE + x / LOLA_SCALE_M))
    row = int(round(LOLA_CENTRE - y / LOLA_SCALE_M))
    raw = fetch_range(LOLA_URL, (row * LOLA_N + col) * 2, 2)
    return float(np.frombuffer(raw, dtype="<i2")[0]) * LOLA_DN_TO_M


def moon_window(lat: float, lon: float, posts: int = PIXELS) -> dict:
    """Terrain metrics for a square of `posts` x `posts` 463 m posts (55.6 km by default) centred on a
    lunar point. South polar targets use the 80 m polar grid, all others the 512 ppd global grid."""
    if lat > LOLA_MIN_LAT + 2:
        return moon_window_global(lat, lon, posts)
    x, y = lola_xy(lat, lon)
    # The projection is true to scale at the pole. Away from it, map distance = ground distance * k.
    k = 2 / (1 + math.sin(math.radians(-lat)))
    half_map = window_m(posts) / 2 * k
    px = 2 * half_map / posts  # destination pixel size in map metres

    c_mid = LOLA_CENTRE + x / LOLA_SCALE_M
    r_mid = LOLA_CENTRE - y / LOLA_SCALE_M
    pad = half_map / LOLA_SCALE_M + 2
    row0, row1 = math.floor(r_mid - pad), math.ceil(r_mid + pad) + 1
    col0, col1 = math.floor(c_mid - pad), math.ceil(c_mid + pad) + 1
    if row0 < 0 or col0 < 0 or row1 > LOLA_N or col1 > LOLA_N:
        raise RuntimeError(f"window around {lat}, {lon} leaves the LOLA 80S grid")

    raw = fetch_range(LOLA_URL, row0 * LOLA_N * 2, (row1 - row0) * LOLA_N * 2)
    grid = np.frombuffer(raw, dtype="<i2").reshape(row1 - row0, LOLA_N)
    src = grid[:, col0:col1].astype(np.float32) * LOLA_DN_TO_M

    # Map coordinates of pixel edges: x grows with column, y falls with row.
    def edge_x(col: float) -> float:
        return (col - 0.5 - LOLA_CENTRE) * LOLA_SCALE_M

    def edge_y(row: float) -> float:
        return (LOLA_CENTRE - (row - 0.5)) * LOLA_SCALE_M

    src_tr = from_origin(edge_x(col0), edge_y(row0), LOLA_SCALE_M, LOLA_SCALE_M)
    dst_tr = from_origin(x - half_map, y + half_map, px, px)
    crs = CRS.from_proj4(f"+proj=stere +lat_0=-90 +lon_0=0 +k=1 +x_0=0 +y_0=0 +R={MOON_RADIUS_M} +units=m +no_defs")
    z = np.full((posts, posts), np.nan, dtype=np.float32)
    reproject(src, z, src_transform=src_tr, src_crs=crs, dst_transform=dst_tr, dst_crs=crs,
              resampling=Resampling.average, dst_nodata=np.nan, num_threads=1)

    ground = px / k
    slope, rough, n = terrain_metrics(z, np.isfinite(z), ground, ground)
    return {
        "slope": slope, "roughness": rough, "validPixels": n, "pixels": posts * posts,
        "dxM": round(ground, 2), "dyM": round(ground, 2),
        "elevationMinM": float(np.nanmin(z)), "elevationMaxM": float(np.nanmax(z)),
        "product": "LRO LOLA polar gridded DEM LDEM_80S_80M (80 m per pixel)",
        "windowCentre": {"lat": lat, "lon": lon},
    }


def lola_cyl_tile(lat: float, lon_e: float) -> tuple[str, float, float]:
    """512 ppd tile name and its north-west corner (lat_top, lon_west). lon_e is 0 to 360."""
    south = 45.0 * math.floor(lat / 45.0)
    west = 90.0 * math.floor(lon_e / 90.0)

    def tag(x: float) -> str:
        return f"{abs(int(x)):02d}{'n' if x >= 0 else 's'}"

    return f"ldem_512_{tag(south)}_{tag(south + 45)}_{int(west):03d}_{int(west + 90):03d}.img", south + 45.0, west


def moon_window_global(lat: float, lon: float, posts: int = PIXELS) -> dict:
    """Terrain metrics for a square of `posts` x `posts` 463 m posts centred on a lunar point, from the
    LOLA 512 pixels per degree global grid (simple cylindrical, row 0 = north, heights in half metres)."""
    lon_e = lon % 360.0
    name, top, west = lola_cyl_tile(lat, lon_e)
    m_per_deg = math.pi * MOON_RADIUS_M / 180.0
    half_lat = (window_m(posts) / 2) / m_per_deg
    half_lon = half_lat / math.cos(math.radians(lat))

    row0 = math.floor((top - (lat + half_lat)) * LOLA_CYL_PPD) - 1
    row1 = math.ceil((top - (lat - half_lat)) * LOLA_CYL_PPD) + 1
    col0 = math.floor((lon_e - half_lon - west) * LOLA_CYL_PPD) - 1
    col1 = math.ceil((lon_e + half_lon - west) * LOLA_CYL_PPD) + 1
    if row0 < 0 or row1 > LOLA_CYL_LINES or col0 < 0 or col1 > LOLA_CYL_SAMPLES:
        raise RuntimeError(f"window around {lat}, {lon} crosses a LOLA tile edge; not handled")

    # Only the columns of the window are downloaded, 64 rows per request, a few requests at a time.
    url = f"{LOLA_CYL_BASE}/{name}"
    width = col1 - col0

    def rows(r_start: int) -> np.ndarray:
        r_end = min(r_start + 64, row1)
        first = (r_start * LOLA_CYL_SAMPLES + col0) * 2
        last = ((r_end - 1) * LOLA_CYL_SAMPLES + col1) * 2
        raw = np.frombuffer(fetch_range(url, first, last - first), dtype="<i2")
        out = np.empty((r_end - r_start, width), dtype=np.float32)
        for k in range(r_end - r_start):
            out[k] = raw[k * LOLA_CYL_SAMPLES:k * LOLA_CYL_SAMPLES + width]
        return out

    with ThreadPoolExecutor(max_workers=4) as pool:
        src = np.vstack(list(pool.map(rows, range(row0, row1, 64)))) * LOLA_DN_TO_M

    src_tr = from_origin(west + col0 / LOLA_CYL_PPD, top - row0 / LOLA_CYL_PPD, 1 / LOLA_CYL_PPD, 1 / LOLA_CYL_PPD)
    dst_tr = from_origin(lon_e - half_lon, lat + half_lat, 2 * half_lon / posts, 2 * half_lat / posts)
    crs = CRS.from_proj4(f"+proj=longlat +R={MOON_RADIUS_M} +no_defs")
    z = np.full((posts, posts), np.nan, dtype=np.float32)
    reproject(src, z, src_transform=src_tr, src_crs=crs, dst_transform=dst_tr, dst_crs=crs,
              resampling=Resampling.average, dst_nodata=np.nan, num_threads=1)

    post = window_m(posts) / posts
    slope, rough, n = terrain_metrics(z, np.isfinite(z), post, post)
    return {
        "slope": slope, "roughness": rough, "validPixels": n, "pixels": posts * posts,
        "dxM": round(post, 2), "dyM": round(post, 2),
        "elevationMinM": float(np.nanmin(z)), "elevationMaxM": float(np.nanmax(z)),
        "product": f"LRO LOLA global gridded DEM 512 pixels per degree (59 m per pixel), {name}",
        "windowCentre": {"lat": lat, "lon": lon},
    }


def check_lola_orientation() -> dict:
    """Guards against a mirrored or rotated map, which would silently sample the wrong place.

    Two features with centres from the IAU Gazetteer of Planetary Nomenclature are read directly:
    Shackleton (89.67 S, 129.78 E), a crater about 4 km deep, must be a deep hole, and
    Mons Mouton (84.60 S, 31.00 E), a mountain, must stand high. Their mirror images across the
    0 degree meridian must not look the same.
    """
    shackleton, shackleton_mirror = lola_height(-89.67, 129.78), lola_height(-89.67, -129.78)
    mouton, mouton_mirror = lola_height(-84.60, 31.00), lola_height(-84.60, -31.00)
    checks = {
        "shackletonFloorM": shackleton, "shackletonMirrorM": shackleton_mirror,
        "monsMoutonM": mouton, "monsMoutonMirrorM": mouton_mirror,
    }
    if not (shackleton < -2000 and shackleton < shackleton_mirror - 1000):
        raise RuntimeError(f"LOLA orientation check failed at Shackleton: {checks}")
    if not (mouton > 3000 and mouton > mouton_mirror + 1000):
        raise RuntimeError(f"LOLA orientation check failed at Mons Mouton: {checks}")
    return checks


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--posts", type=int, nargs="*", default=None,
                    help="measure site-sized windows of this many 463 m posts per side instead of the 55.6 km window")
    ap.add_argument("--only", nargs="*", default=None, help="target ids to measure (default: all)")
    args = ap.parse_args()

    targets = json.loads(TARGETS.read_text())
    if args.only:
        targets = [t for t in targets if t["id"] in args.only]
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    if args.posts:
        out = json.loads(OUT_WINDOWS.read_text()) if OUT_WINDOWS.exists() else {"windows": {}}
        out.update({
            "generatedAt": now,
            "method": (
                "The same measurement as validation/output/target_terrain.json, in a square of N x N posts of "
                f"{SPACING_M:.0f} m centred on the target coordinates, for the window sizes used by data/sites.json. "
                "Used only for the site-level report. A window this small holds a few dozen posts and describes "
                "the ground at the stated coordinates, not the whole landform."
            ),
            "lolaOrientationCheck": check_lola_orientation(),
        })
        for posts in args.posts:
            key = str(posts)
            block = out["windows"].setdefault(key, {"posts": posts, "windowKm": round(posts * SPACING_M / 1000, 2), "targets": {}})
            for t in targets:
                fn = moon_window if t["body"] == "moon" else mars_window
                res = fn(t["lat"], t["lon"], posts)
                block["targets"][t["id"]] = res
                print(f'{posts:3d} posts  {t["id"]:24s} slope {res["slope"]:6.2f} deg   roughness {res["roughness"]:8.1f} m   '
                      f'({res["validPixels"]}/{res["pixels"]} px)', flush=True)
        OUT_WINDOWS.write_text(json.dumps(out, indent=2) + "\n")
        print(f"wrote {OUT_WINDOWS.relative_to(ROOT)}")
        return

    out = json.loads(OUT.read_text()) if (OUT.exists() and args.only) else {"targets": {}}
    out.update({
        "generatedAt": now,
        "method": (
            f"{WINDOW_KM} km square window centred on the target, block-averaged to {PIXELS} x {PIXELS} "
            f"pixels (about {SPACING_M:.0f} m), then pipeline/terrain_metrics.py: slope = mean Horn slope "
            "in degrees, roughness = standard deviation of elevation in metres."
        ),
        "lolaOrientationCheck": check_lola_orientation(),
    })
    for t in targets:
        fn = moon_window if t["body"] == "moon" else mars_window
        res = fn(t["lat"], t["lon"])
        out["targets"][t["id"]] = res
        print(f'{t["id"]:24s} slope {res["slope"]:6.2f} deg   roughness {res["roughness"]:8.1f} m   '
              f'({res["validPixels"]}/{res["pixels"]} px, {res["elevationMinM"]:.0f} to {res["elevationMaxM"]:.0f} m)', flush=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

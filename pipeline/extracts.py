"""Same-scale imagery and elevation extracts for the split view and the 3D shot.

    uv run --project pipeline pipeline/extracts.py

Writes data/extracts/index.json and, per place, data/extracts/<id>/elevation.f32 and
(where an image source exists) data/extracts/<id>/image.jpg.

Every extract is a square of WINDOW_KM x WINDOW_KM kilometres of ground, centred on the
site or target, north up, in a local orthographic projection centred on that point. So one
kilometre is the same length in every extract and two extracts can be shown side by side
at the same scale. Each dataset is kept at about its own native resolution: nothing is
upsampled to look finer than it is, and the pixel size is written to the index.

  Earth  elevation  Copernicus DEM GLO-30 (ESA)                          30 m
         image      Sentinel-2 L2A true colour, one scene (ESA)          10 m
  Moon   elevation  LRO LOLA polar gridded DEM LDEM_80S_80M (NASA PDS)   80 m
         image      LROC WAC global mosaic 100 m (NASA/GSFC/ASU, USGS)  100 m
  Mars   elevation  MGS MOLA MEGDR 128 pixels per degree (NASA PDS)     463 m
         image      none requested: null

Elevation is resampled with nearest neighbour (each output pixel is one real sample).
Images are resampled bilinearly, for display only.

elevation.f32: little-endian float32, row-major, north row first, `size` x `size` values,
metres. NaN means no data.
"""
from __future__ import annotations

import json
import math
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import rasterio
import requests
from rasterio.crs import CRS
from rasterio.transform import from_origin
from rasterio.vrt import WarpedVRT
from rasterio.warp import Resampling, reproject, transform as warp_transform

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import CACHE, DATA, USER_AGENT  # noqa: E402
import sites as S  # noqa: E402  (shared helpers: STAC search, GLO-30 names, GDAL settings)

WINDOW_KM = 20.0
OUT = DATA / "extracts"
XCACHE = CACHE / "extracts"
XCACHE.mkdir(exist_ok=True)

# Featured Indonesian sites. Gua Lawa is the lava tube whose own coordinates are published.
EARTH_SITES = ["id-kawah-ijen", "id-merapi", "id-gua-lawa"]

MOON_R, MARS_R = 1_737_400.0, 3_396_000.0
LOLA_URL = ("https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/"
            "ldem_80s_80m.img")
LOLA_N, LOLA_SCALE_M, LOLA_CENTRE, LOLA_DN_TO_M = 7600, 80.0, 3799.5, 0.5   # from the PDS label
MOLA_BASE = "https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128"
MOLA_PPD, MOLA_LINES, MOLA_SAMPLES = 128, 5632, 11520
WAC_URL = "https://planetarymaps.usgs.gov/mosaic/Lunar_LRO_LROC-WAC_Mosaic_global_100m_June2013.tif"

ATTR = {
    "glo30": "Copernicus DEM GLO-30. Produced using Copernicus WorldDEM-30 (c) DLR e.V. 2010-2014 and (c) Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA; all rights reserved.",
    "s2": "Contains modified Copernicus Sentinel data {year}.",
    "lola": "LRO LOLA gridded data record, NASA Planetary Data System Geosciences Node (Smith et al. 2010; Neumann 2009, LRO-L-LOLA-4-GDR-V1.0).",
    "wac": "LROC WAC Global Morphology Mosaic 100 m. NASA/GSFC/Arizona State University; hosted by USGS Astrogeology.",
    "mola": "MGS MOLA Mission Experiment Gridded Data Record, NASA Planetary Data System Geosciences Node (Smith et al. 2003, MGS-M-MOLA-5-MEGDR-L3-V1.0).",
}


def fetch_range(url: str, start: int, length: int) -> bytes:
    def go():
        r = requests.get(url, headers={"Range": f"bytes={start}-{start + length - 1}", "User-Agent": USER_AGENT},
                         timeout=(20, 300))
        r.raise_for_status()
        if r.status_code != 206 or len(r.content) != length:
            raise RuntimeError(f"expected {length} bytes (206), got {len(r.content)} ({r.status_code})")
        return r.content
    return S._retry(go)


def ortho(lat: float, lon: float, body: str) -> CRS:
    ell = "+datum=WGS84" if body == "earth" else f"+R={MOON_R if body == 'moon' else MARS_R}"
    return CRS.from_proj4(f"+proj=ortho +lat_0={lat} +lon_0={lon} {ell} +units=m +no_defs")


def grid(px_m: float):
    n = round(WINDOW_KM * 1000 / px_m)
    half = n * px_m / 2
    return n, from_origin(-half, half, px_m, px_m)


def corners_in(crs_dst: CRS, crs_src: CRS, margin_m: float = 0.0):
    """The window outline (densified) transformed into the source CRS: (xs, ys)."""
    h = WINDOW_KM * 500 + margin_m
    t = np.linspace(-h, h, 41)
    xs = np.concatenate([t, t, np.full(41, -h), np.full(41, h), [0.0]])
    ys = np.concatenate([np.full(41, -h), np.full(41, h), t, t, [0.0]])
    X, Y = warp_transform(crs_dst, crs_src, xs.tolist(), ys.tolist())
    return np.array(X), np.array(Y)


# ---------------------------------------------------------------- Earth

def earth_elevation(lat: float, lon: float):
    px = 30.0
    n, dtr = grid(px)
    dst = ortho(lat, lon, "earth")
    X, Y = corners_in(dst, CRS.from_epsg(4326), 200)
    tiles = {(math.floor(y), math.floor(x)) for x, y in zip(X, Y)}
    z = np.full((n, n), np.nan, np.float32)
    names = []
    for t in sorted(tiles):
        name = S.glo30_name(*t)
        names.append(name)
        url = f"https://copernicus-dem-30m.s3.amazonaws.com/{name}/{name}.tif"
        try:
            src, tr, crs = S._read_window(url, X.min(), Y.min(), X.max(), Y.max())
        except Exception:  # noqa: BLE001 - an all-ocean tile does not exist
            continue
        part = np.full((n, n), np.nan, np.float32)
        reproject(src.astype(np.float32), part, src_transform=tr, src_crs=crs, dst_transform=dtr, dst_crs=dst,
                  resampling=Resampling.nearest, dst_nodata=np.nan)
        z = np.where(np.isfinite(part), part, z)
    return z, px, {"product": "Copernicus DEM GLO-30", "tiles": names, "nativePixelM": 30.9,
                   "attribution": ATTR["glo30"], "badge": "Measured",
                   "note": "Heights above the EGM2008 geoid. Sea is 0 m."}


def earth_image(site_id: str, lat: float, lon: float):
    px = 10.0
    n, dtr = grid(px)
    dst = ortho(lat, lon, "earth")
    items = S.cached(f"stac_all_{site_id}", lambda: _stac_visual(lat, lon))
    best = None
    for it in sorted(items, key=lambda i: i["cloud"])[:10]:
        share = _clear_share(it, dst, dtr, n)
        if share is not None and (best is None or share > best[0]):
            best = (share, it)
        if best and best[0] > 0.97:
            break
    if best is None:
        return None, px, None
    share, it = best
    rgb = np.zeros((3, n, n), np.uint8)
    with rasterio.Env(**S.GDAL_ENV), rasterio.open("/vsicurl/" + it["visual"]) as ds:
        with WarpedVRT(ds, crs=dst, transform=dtr, width=n, height=n, resampling=Resampling.bilinear) as vrt:
            rgb[:] = vrt.read([1, 2, 3])
    return rgb, px, {"product": "Sentinel-2 L2A true colour image (TCI)", "scene": it["id"], "date": it["date"],
                     "sceneCloudPct": round(it["cloud"], 1), "clearShareInWindow": round(share, 3), "nativePixelM": 10,
                     "attribution": ATTR["s2"].format(year=it["date"][:4]), "badge": "Measured"}


def _stac_visual(lat: float, lon: float) -> list[dict]:
    body = {"collections": ["sentinel-2-l2a"], "limit": 100,
            "intersects": {"type": "Point", "coordinates": [lon, lat]},
            "datetime": f"{S.YEAR}-01-01T00:00:00Z/{S.YEAR}-12-31T23:59:59Z",
            "query": {"eo:cloud_cover": {"lt": 40}}}
    d = S._retry(lambda: requests.post(S.STAC, json=body, headers=S.HEADERS, timeout=60).json())
    return [{"id": f["id"], "date": f["properties"]["datetime"][:10], "cloud": f["properties"]["eo:cloud_cover"],
             "visual": f["assets"]["visual"]["href"], "scl": f["assets"]["scl"]["href"]} for f in d["features"]]


def _clear_share(it: dict, dst: CRS, dtr, n: int):
    """Share of the window that is clear in this scene, from its classification at 100 m. None if the scene does not cover the window."""
    m = n // 10
    def go():
        with rasterio.Env(**S.GDAL_ENV), rasterio.open("/vsicurl/" + it["scl"]) as ds:
            with WarpedVRT(ds, crs=dst, transform=dtr * dtr.scale(10, 10), width=m, height=m,
                           resampling=Resampling.nearest) as vrt:
                return vrt.read(1)
    scl = S._retry(go)
    if (scl == 0).mean() > 0.001:
        return None
    return float(np.isin(scl, (4, 5, 6, 7, 11)).mean())


# ---------------------------------------------------------------- Moon

def lola_rc(lat, lon):
    """Fractional (row, col) pixel-centre coordinates in the LOLA 80S grid."""
    r = 2 * MOON_R * np.tan(np.radians(90.0 + np.asarray(lat)) / 2)
    x, y = r * np.sin(np.radians(lon)), r * np.cos(np.radians(lon))
    return LOLA_CENTRE - y / LOLA_SCALE_M, LOLA_CENTRE + x / LOLA_SCALE_M


def moon_elevation(lat: float, lon: float):
    px = 80.0
    n, dtr = grid(px)
    dst = ortho(lat, lon, "moon")
    stere = CRS.from_proj4(f"+proj=stere +lat_0=-90 +lon_0=0 +k=1 +x_0=0 +y_0=0 +R={MOON_R} +units=m +no_defs")
    X, Y = corners_in(dst, stere, 400)
    c0, c1 = math.floor(LOLA_CENTRE + X.min() / LOLA_SCALE_M), math.ceil(LOLA_CENTRE + X.max() / LOLA_SCALE_M) + 1
    r0, r1 = math.floor(LOLA_CENTRE - Y.max() / LOLA_SCALE_M), math.ceil(LOLA_CENTRE - Y.min() / LOLA_SCALE_M) + 1
    if r0 < 0 or c0 < 0 or r1 > LOLA_N or c1 > LOLA_N:
        raise RuntimeError("window leaves the LOLA 80S grid")
    raw = fetch_range(LOLA_URL, r0 * LOLA_N * 2, (r1 - r0) * LOLA_N * 2)
    src = np.frombuffer(raw, dtype="<i2").reshape(r1 - r0, LOLA_N)[:, c0:c1].astype(np.float32) * LOLA_DN_TO_M
    str_ = from_origin((c0 - 0.5 - LOLA_CENTRE) * LOLA_SCALE_M, (LOLA_CENTRE - (r0 - 0.5)) * LOLA_SCALE_M,
                       LOLA_SCALE_M, LOLA_SCALE_M)
    z = np.full((n, n), np.nan, np.float32)
    reproject(src, z, src_transform=str_, src_crs=stere, dst_transform=dtr, dst_crs=dst,
              resampling=Resampling.nearest, dst_nodata=np.nan)
    return z, px, {"product": "LRO LOLA polar gridded DEM LDEM_80S_80M", "nativePixelM": 80,
                   "attribution": ATTR["lola"], "badge": "Mission",
                   "note": "Heights above a sphere of radius 1737.4 km."}


def moon_image(lat: float, lon: float):
    px = 100.0
    n, dtr = grid(px)
    dst = ortho(lat, lon, "moon")
    with rasterio.Env(**S.GDAL_ENV), rasterio.open("/vsicurl/" + WAC_URL) as ds:
        with WarpedVRT(ds, crs=dst, transform=dtr, width=n, height=n, resampling=Resampling.bilinear) as vrt:
            img = S._retry(lambda: vrt.read(1))
    if (img == 0).mean() > 0.5:
        return None, px, None
    return img[None], px, {"product": "LROC WAC Global Morphology Mosaic 100 m (June 2013)", "nativePixelM": 100,
                           "attribution": ATTR["wac"], "badge": "Mission",
                           "darkShare": round(float((img < 8).mean()), 3),
                           "note": ("darkShare is the share of pixels that are black or nearly black (value under 8 of 255): "
                                    "permanent shadow or no usable image in the mosaic near the pole.")}


# ---------------------------------------------------------------- Mars

def mars_elevation(lat: float, lon: float):
    px = 463.0
    n, dtr = grid(px)
    dst = ortho(lat, lon, "mars")
    geo = CRS.from_proj4(f"+proj=longlat +R={MARS_R} +no_defs")
    X, Y = corners_in(dst, geo, 1500)
    X = X % 360.0
    top = 88.0 if lat >= 44 else 44.0 if lat >= 0 else 0.0 if lat >= -44 else -44.0
    tag = {88.0: "88n", 44.0: "44n", 0.0: "00n", -44.0: "44s"}[top]
    west = 90.0 * math.floor((lon % 360.0) / 90.0)
    name = f"megt{tag}{int(west):03d}hb.img"
    r0, r1 = math.floor((top - Y.max()) * MOLA_PPD), math.ceil((top - Y.min()) * MOLA_PPD) + 1
    c0, c1 = math.floor((X.min() - west) * MOLA_PPD), math.ceil((X.max() - west) * MOLA_PPD) + 1
    if r0 < 0 or c0 < 0 or r1 > MOLA_LINES or c1 > MOLA_SAMPLES:
        raise RuntimeError("window crosses a MOLA tile edge")
    raw = fetch_range(f"{MOLA_BASE}/{name}", r0 * MOLA_SAMPLES * 2, (r1 - r0) * MOLA_SAMPLES * 2)
    src = np.frombuffer(raw, dtype=">i2").reshape(r1 - r0, MOLA_SAMPLES)[:, c0:c1].astype(np.float32)
    str_ = from_origin(west + c0 / MOLA_PPD, top - r0 / MOLA_PPD, 1 / MOLA_PPD, 1 / MOLA_PPD)
    geo360 = CRS.from_proj4(f"+proj=longlat +R={MARS_R} +lon_wrap=180 +no_defs")
    z = np.full((n, n), np.nan, np.float32)
    reproject(src, z, src_transform=str_, src_crs=geo360, dst_transform=dtr, dst_crs=dst,
              resampling=Resampling.nearest, dst_nodata=np.nan)
    return z, px, {"product": f"MGS MOLA MEGDR 128 pixels per degree, {name}", "nativePixelM": 463,
                   "attribution": ATTR["mola"], "badge": "Mission",
                   "note": "Topography above the Mars areoid. 463 m pixels: far coarser than the Earth extract."}


# ---------------------------------------------------------------- write

def save(item_id: str, z, zpx, zmeta, img, ipx, imeta) -> dict:
    d = OUT / item_id
    d.mkdir(parents=True, exist_ok=True)
    out = {"elevation": None, "image": None}
    if z is not None and np.isfinite(z).any():
        (d / "elevation.f32").write_bytes(z.astype("<f4").tobytes())
        out["elevation"] = {"file": f"extracts/{item_id}/elevation.f32", "format": "float32 little-endian, row-major, north first, NaN = no data",
                            "unit": "m", "size": int(z.shape[0]), "pixelM": zpx,
                            "min": round(float(np.nanmin(z)), 1), "max": round(float(np.nanmax(z)), 1),
                            "noDataShare": round(float((~np.isfinite(z)).mean()), 4), **zmeta}
    if img is not None:
        p = d / "image.jpg"
        with rasterio.Env(), rasterio.open(p, "w", driver="JPEG", width=img.shape[2], height=img.shape[1],
                                           count=img.shape[0], dtype="uint8", quality=85) as ds:
            ds.write(img)
        for aux in d.glob("*.aux.xml"):
            aux.unlink()
        out["image"] = {"file": f"extracts/{item_id}/image.jpg", "size": int(img.shape[1]), "pixelM": ipx,
                        "bands": "RGB" if img.shape[0] == 3 else "grey", **imeta}
    return out


def build() -> dict:
    analogs = {a["id"]: a for a in json.loads((DATA / "analogs.json").read_text())}
    targets = json.loads((DATA / "targets.json").read_text())
    items = []
    for sid in EARTH_SITES:
        a = analogs[sid]
        print(f"[{sid}]")
        z, zpx, zm = earth_elevation(a["lat"], a["lon"])
        img, ipx, im = earth_image(sid, a["lat"], a["lon"])
        items.append({"id": sid, "name": a["name"], "body": "earth", "lat": a["lat"], "lon": a["lon"],
                      "matchedTargets": a["analogFor"], **save(sid, z, zpx, zm, img, ipx, im)})
    for t in targets:
        print(f"[{t['id']}]")
        if t["body"] == "moon":
            z, zpx, zm = moon_elevation(t["lat"], t["lon"])
            img, ipx, im = moon_image(t["lat"], t["lon"])
        else:
            z, zpx, zm = mars_elevation(t["lat"], t["lon"])
            img, ipx, im = None, None, None
        items.append({"id": t["id"], "name": t["name"], "body": t["body"], "lat": t["lat"], "lon": t["lon"],
                      **save(t["id"], z, zpx, zm, img, ipx, im)})
    return {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "windowKm": WINDOW_KM,
            "projection": "Local orthographic, centred on the item's lat/lon, north up. Pixel (0,0) is the north-west corner.",
            "description": ("Every extract covers the same ground area, so they can be shown side by side at one scale. "
                            "Pixel size differs per dataset and is given per file; nothing is upsampled."),
            "imageNote": "No Mars image was requested or built: image is null for Mars targets.",
        },
        "items": items,
    }


def main() -> None:
    out = build()
    tmp = OUT / "index.json.tmp"
    tmp.write_text(json.dumps(out, ensure_ascii=False, indent=1, allow_nan=False))
    os.replace(tmp, OUT / "index.json")
    print(f"\n{'item':<24} {'elev px':>8} {'size':>5} {'min m':>8} {'max m':>8} {'nodata':>7}  image")
    for i in out["items"]:
        e, im = i["elevation"], i["image"]
        print(f"{i['id'][:23]:<24} {e['pixelM']:>8} {e['size']:>5} {e['min']:>8} {e['max']:>8} {e['noDataShare']:>7}  "
              + (f"{im['size']} px at {im['pixelM']} m, {im.get('date') or im['product'][:28]}"
                 + (f", clear {im['clearShareInWindow']}" if 'clearShareInWindow' in im else f", dark {im.get('darkShare')}") if im else "null"))
    total = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
    print(f"wrote {OUT} ({total / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()

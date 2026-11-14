"""Land cover fractions from MODIS MCD12C1 v061 (yearly land cover, 0.05 degree CMG, IGBP).

Two extra cell keys, both measured, both for every cell the product covers:

  snowIceFrac = share of the cell's land classed IGBP 15, "snow and ice" (permanent)
  barrenFrac  = share of the cell's land classed IGBP 16, "barren or sparsely vegetated"

They exist because the NDVI product (MOD13C2) has no retrievals over Antarctica. Where
`ndvi` is null, the scoring rule in data/SCHEMA.md uses these two measured shares to decide
how bare the ground is, instead of any stand-in NDVI number. `ndvi` itself is never filled.

Method: MCD12C1 gives, for each 0.05 degree pixel, the percent of its area in each of the
17 IGBP classes (layer Land_Cover_Type_1_Percent). For a 0.5 degree cell we average the
class 15 and class 16 percents over the pixels that are land in the Natural Earth mask
(the same pixels the NDVI stage uses) and divide by 100. Pixels with the fill value are
left out; a cell with no usable pixel is NaN (null).

Needs EARTHDATA_TOKEN (.env).
"""
from __future__ import annotations

import numpy as np
import requests

from common import CACHE, NLAT, NLON, USER_AGENT, download, read_env_token, save_grid
import landmask

SHORT_NAME, VERSION = "MCD12C1", "061"
YEAR = 2025
CMR = "https://cmr.earthdata.nasa.gov/search/granules.json"
SDS = "Land_Cover_Type_1_Percent"
CLASSES = {"snowIceFrac": (15, "snow and ice"), "barrenFrac": (16, "barren or sparsely vegetated")}
KEEP_RAW = False  # the raw file is 1.2 GB; the aggregate is what we cache
RAW = CACHE / "mcd12c1"


def granule_url() -> str:
    r = requests.get(CMR, params={
        "short_name": SHORT_NAME, "version": VERSION, "page_size": 10,
        "temporal": f"{YEAR}-01-01T00:00:00Z,{YEAR}-12-31T23:59:59Z",
    }, headers={"User-Agent": USER_AGENT}, timeout=60)
    r.raise_for_status()
    urls = [x["href"] for e in r.json()["feed"]["entry"] for x in e["links"]
            if x["href"].startswith("https") and x["href"].endswith(".hdf")]
    assert len(urls) == 1, f"expected one {SHORT_NAME} granule for {YEAR}, got {len(urls)}"
    return urls[0]


def aggregate() -> dict:
    agg = CACHE / f"landcover_{SHORT_NAME}_{YEAR}.npz"
    if agg.exists():
        return dict(np.load(agg))
    from pyhdf.SD import SD, SDC
    url = granule_url()
    f = RAW / url.rsplit("/", 1)[1]
    download(url, f, headers={"Authorization": f"Bearer {read_env_token()}"})
    sd = SD(str(f), SDC.READ)
    s = sd.select(SDS)
    a = s.attributes()
    fill = int(a["_FillValue"])
    land = landmask.land_fine().astype(bool)
    out = {"granule": np.array(f.name)}
    for key, (layer, name) in CLASSES.items():
        assert a[f"Layer {layer}"] == name, (layer, a.get(f"Layer {layer}"))
        pct = s[:, :, layer]
        assert pct.shape == (NLAT * 10, NLON * 10), pct.shape
        ok = land & (pct != fill) & (pct <= 100)
        ssum = np.where(ok, pct, 0).astype(np.float64).reshape(NLAT, 10, NLON, 10).sum(axis=(1, 3))
        cnt = ok.reshape(NLAT, 10, NLON, 10).sum(axis=(1, 3))
        out[key] = np.where(cnt > 0, ssum / np.maximum(cnt, 1) / 100.0, np.nan).astype(np.float32)
    sd.end()
    np.savez_compressed(agg, **out)
    if not KEEP_RAW:
        f.unlink()
    return dict(np.load(agg))


def build() -> dict:
    d = aggregate()
    for key in CLASSES:
        save_grid(key, d[key])
    land = landmask.land_mask()
    ndvi = np.load(CACHE / "grid_ndvi.npy") if (CACHE / "grid_ndvi.npy").exists() else None
    info = {
        "source": f"MODIS Terra+Aqua {SHORT_NAME} v{VERSION} yearly land cover 0.05 deg CMG, {YEAR}, IGBP classes (NASA LP DAAC)",
        "year": YEAR,
        "granule": str(d["granule"]),
        "keys": [
            {"key": "snowIceFrac", "label": "Permanent snow and ice share", "unit": "fraction of land, 0 to 1",
             "badge": "Measured", "igbpClass": 15},
            {"key": "barrenFrac", "label": "Barren ground share", "unit": "fraction of land, 0 to 1",
             "badge": "Measured", "igbpClass": 16},
        ],
        "method": ("Mean of the IGBP class percent over the cell's land pixels, divided by 100. "
                   "Used by the bare-ground rule for cells where ndvi is null (data/SCHEMA.md)."),
        "landCellsNull": int((land & ~np.isfinite(d["barrenFrac"])).sum()),
    }
    if ndvi is not None:
        no_ndvi = land & ~np.isfinite(ndvi)
        info["cellsWithoutNdvi"] = int(no_ndvi.sum())
        info["cellsWithoutNdviButWithLandCover"] = int((no_ndvi & np.isfinite(d["barrenFrac"])).sum())
    return info


if __name__ == "__main__":
    print(build())

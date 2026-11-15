"""Permafrost share of each cell from the ESA GlobPermafrost map of the Northern Hemisphere.

Source: Obu et al. 2018, "Ground Temperature Map, 2000-2016, Northern Hemisphere Permafrost",
PANGAEA, doi:10.1594/PANGAEA.888600 (CC-BY 4.0); method in Obu et al. 2019, Earth-Science
Reviews 193:299. File UiO_PEX_PERPROB_5.0_20181128_2000_2016_NH.tif: permafrost probability
(fraction 0 to 1) per 1 km pixel, modelled from satellite land surface temperature, for exposed
land north of 25 N.

  permafrostFrac = mean permafrost probability over the cell's pixels that have a value. Following
                   the source, this is the share of the cell underlain by permafrost.

Cells south of 25 N, and all of the Southern Hemisphere, are outside the product: null, not zero.
The value is modelled, not measured: badge "Literature".
"""
from __future__ import annotations

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject

from common import CACHE, LATS, NLAT, NLON, RES, USER_AGENT, save_grid

URL = "https://store.pangaea.de/Publications/ObuJ-etal_2018/UiO_PEX_PERPROB_5.0_20181128_2000_2016_NH.zip"
TIF = "UiO_PEX_PERPROB_5.0_20181128_2000_2016_NH.tif"
SOUTH_LIMIT = 25.0
RAW = CACHE / "permafrost"


def build() -> dict:
    agg = CACHE / "permafrost_agg.npy"
    if not agg.exists():
        RAW.mkdir(exist_ok=True)
        z = RAW / URL.split("/")[-1]
        if not z.exists():
            import requests
            with requests.get(URL, headers={"User-Agent": USER_AGENT}, stream=True, timeout=(30, 600)) as r:
                r.raise_for_status()
                with open(z.with_suffix(".part"), "wb") as f:
                    for chunk in r.iter_content(1 << 20):
                        f.write(chunk)
            z.with_suffix(".part").rename(z)
        with rasterio.open(f"/vsizip/{z}/{TIF}") as ds:
            assert ds.crs.to_epsg() == 3995, ds.crs
            src = ds.read(1)
            src = np.where(src < 0, np.nan, src).astype(np.float32)
            assert np.nanmax(src) <= 1.0001
            dst = np.full((NLAT, NLON), np.nan, np.float32)
            reproject(src, dst, src_transform=ds.transform, src_crs=ds.crs,
                      dst_transform=from_origin(-180, 90, RES, RES), dst_crs=CRS.from_epsg(4326),
                      resampling=Resampling.average, src_nodata=np.nan, dst_nodata=np.nan, num_threads=4)
        dst[(LATS - RES / 2) < SOUTH_LIMIT] = np.nan
        np.save(agg, dst)
    g = np.load(agg)
    save_grid("permafrostFrac", g)
    return {
        "keys": [{"key": "permafrostFrac", "label": "Permafrost share", "unit": "fraction of the cell's land, 0 to 1",
                  "badge": "Literature",
                  "source": ("Obu et al. 2018, Northern Hemisphere permafrost map 2000-2016, permafrost probability, 1 km "
                             "(ESA GlobPermafrost; PANGAEA doi:10.1594/PANGAEA.888600)"),
                  "note": "Modelled. Covers land north of 25 N only: null elsewhere, Antarctica included."}],
    }


if __name__ == "__main__":
    print(build())

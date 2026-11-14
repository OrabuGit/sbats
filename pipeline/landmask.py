"""Land mask for the 0.5 degree grid, from Natural Earth 1:10m land polygons.

The polygons are rasterised at 0.05 degrees (pixel-centre rule). The land fraction of a
0.5 degree cell is the share of its 100 sub-pixels whose centre is on land.
A cell is a land cell when that share is at least LAND_MIN_FRACTION.
"""
from __future__ import annotations

import zipfile

import numpy as np
import shapefile  # pyshp
from rasterio import features
from rasterio.transform import from_origin

from common import CACHE, NLAT, NLON, download

NE_URL = "https://naciscdn.org/naturalearth/10m/physical/ne_10m_land.zip"
LAND_MIN_FRACTION = 0.05
SUB = 10  # sub-pixels per cell side (0.05 degrees)


def land_fraction() -> np.ndarray:
    out = CACHE / "land_fraction.npy"
    if out.exists():
        return np.load(out)
    z = download(NE_URL, CACHE / "naturalearth" / "ne_10m_land.zip")
    d = z.parent / "ne_10m_land"
    if not (d / "ne_10m_land.shp").exists():
        with zipfile.ZipFile(z) as zf:
            zf.extractall(d)
    sf = shapefile.Reader(str(d / "ne_10m_land.shp"))
    shapes = [s.__geo_interface__ for s in sf.shapes()]
    transform = from_origin(-180.0, 90.0, 0.5 / SUB, 0.5 / SUB)
    fine = features.rasterize(
        ((g, 1) for g in shapes), out_shape=(NLAT * SUB, NLON * SUB),
        transform=transform, fill=0, all_touched=False, dtype="uint8",
    )
    frac = fine.reshape(NLAT, SUB, NLON, SUB).mean(axis=(1, 3)).astype(np.float32)
    np.save(out, frac)
    np.save(CACHE / "land_fine.npy", fine)
    return frac


def land_fine() -> np.ndarray:
    """0.05 degree land raster (1 land, 0 water), shape (3600, 7200), north-up."""
    land_fraction()
    return np.load(CACHE / "land_fine.npy")


def land_mask() -> np.ndarray:
    return land_fraction() >= LAND_MIN_FRACTION


if __name__ == "__main__":
    f = land_fraction()
    for t in (0.0001, 0.05, 0.25, 0.5):
        print(f"cells with land fraction >= {t}: {(f >= t).sum()}")

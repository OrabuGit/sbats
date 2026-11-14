"""Land mask for the 0.5 degree grid, from Natural Earth 1:10m land and lake polygons.

Land is the Natural Earth land layer minus the Natural Earth lakes layer, so open water
inside continents (Great Lakes, Lake Victoria, Baikal) does not count as ground.
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

NE_BASE = "https://naciscdn.org/naturalearth/10m/physical/"
LAND_MIN_FRACTION = 0.05
SUB = 10  # sub-pixels per cell side (0.05 degrees)


def _rasterize(layer: str) -> np.ndarray:
    z = download(NE_BASE + layer + ".zip", CACHE / "naturalearth" / (layer + ".zip"))
    d = z.parent / layer
    if not (d / (layer + ".shp")).exists():
        with zipfile.ZipFile(z) as zf:
            zf.extractall(d)
    sf = shapefile.Reader(str(d / (layer + ".shp")))
    shapes = [s.__geo_interface__ for s in sf.shapes()]
    transform = from_origin(-180.0, 90.0, 0.5 / SUB, 0.5 / SUB)
    return features.rasterize(
        ((g, 1) for g in shapes), out_shape=(NLAT * SUB, NLON * SUB),
        transform=transform, fill=0, all_touched=False, dtype="uint8",
    )


def land_fraction() -> np.ndarray:
    out = CACHE / "land_fraction_v2.npy"
    if out.exists():
        return np.load(out)
    fine = _rasterize("ne_10m_land") & (1 - _rasterize("ne_10m_lakes"))
    frac = fine.reshape(NLAT, SUB, NLON, SUB).mean(axis=(1, 3)).astype(np.float32)
    np.save(CACHE / "land_fine_v2.npy", fine)
    np.save(out, frac)
    return frac


def land_fine() -> np.ndarray:
    """0.05 degree land raster (1 land, 0 water), shape (3600, 7200), north-up."""
    land_fraction()
    return np.load(CACHE / "land_fine_v2.npy")


def land_mask() -> np.ndarray:
    return land_fraction() >= LAND_MIN_FRACTION


if __name__ == "__main__":
    f = land_fraction()
    for t in (0.0001, 0.05, 0.25, 0.5):
        print(f"cells with land fraction >= {t}: {(f >= t).sum()}")

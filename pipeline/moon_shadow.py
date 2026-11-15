"""Share of each lunar grid cell that is in permanent shadow.

Source: LOLA maps of permanently shadowed regions, LPSR_65S_240M_201608 and LPSR_65N_240M_201608
(NASA PDS Geosciences Node, LRO LOLA archive, extras; method of Mazarico et al. 2011, Icarus 211:1066).
Binary maps at 240 m in polar stereographic projection, complete from 65 degrees latitude to each pole.

psrFrac of a cell = PSR pixels / all pixels whose centre falls in the cell. Cells that reach below
65 degrees of latitude are outside the complete coverage and get null. Permanent shadow is where
water ice can survive; the map shows shadow, not ice.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from planet_fetch import PLANET, fetch_parallel  # noqa: E402

BASE = "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/extras/illumination/img/"
N, SCALE_M, CENTRE, R = 6420, 240.0, 3209.5, 1_737_400.0   # from the PDS labels
COMPLETE_TO = 65.0


def grid(cell: float = 2.0) -> np.ndarray:
    """psrFrac[nlat, nlon], rows north to south, NaN outside the maps' complete coverage. Cached."""
    cache = PLANET / f"moon_psr_{cell}.npy"
    if cache.exists():
        return np.load(cache)
    nlat, nlon = int(180 / cell), int(360 / cell)
    out = np.full((nlat, nlon), np.nan)
    for pole in ("s", "n"):
        name = f"lpsr_65{pole}_240m_201608.img"
        dn = np.fromfile(fetch_parallel(BASE + name, name, 8), dtype="<i2").reshape(N, N)
        # +20000 = permanent shadow, -20000 = not; 0 appears where the map has no value.
        assert set(np.unique(dn).tolist()) <= {-20000, 0, 20000}, np.unique(dn)[:5]
        psr = dn > 0
        known = dn != 0
        j, i = np.meshgrid(np.arange(N), np.arange(N))
        x = (j - CENTRE) * SCALE_M
        y = (CENTRE - i) * SCALE_M
        colat = np.degrees(2 * np.arctan(np.hypot(x, y) / (2 * R)))
        if pole == "s":
            lat = -90 + colat; lon = np.degrees(np.arctan2(x, y))
        else:
            lat = 90 - colat; lon = np.degrees(np.arctan2(x, -y))
        ci = np.floor((90 - lat) / cell).astype(int).clip(0, nlat - 1)
        cj = np.floor((lon + 180) / cell).astype(int).clip(0, nlon - 1)
        flat = ci * nlon + cj
        allpx = np.bincount(flat.ravel(), minlength=nlat * nlon).reshape(nlat, nlon)
        tot = np.bincount(flat.ravel(), weights=known.ravel(), minlength=nlat * nlon).reshape(nlat, nlon)
        hit = np.bincount(flat.ravel(), weights=psr.ravel(), minlength=nlat * nlon).reshape(nlat, nlon)
        lat_c = 90 - cell * (np.arange(nlat) + 0.5)
        rows = (np.abs(lat_c) - cell / 2 >= COMPLETE_TO) & ((lat_c < 0) == (pole == "s"))
        frac = np.where(tot >= 0.99 * np.maximum(allpx, 1), hit / np.maximum(tot, 1), np.nan)   # null if the map has gaps in the cell
        assert (allpx[rows] > 0).all()
        out[rows] = frac[rows]
    np.save(cache, out)
    return out


if __name__ == "__main__":
    g = grid()
    print("cells with a value:", int(np.isfinite(g).sum()), "max", np.nanmax(g), "mean south of 85S", np.nanmean(g[-3:]), "north of 85N", np.nanmean(g[:3]))
    for name, la, lo in (("Shackleton", -89.67, 129.78), ("Haworth", -87.45, -5.17), ("Malapert", -85.98, -1.67)):
        print(name, g[int((90 - la) // 2), int((lo + 180) // 2)])

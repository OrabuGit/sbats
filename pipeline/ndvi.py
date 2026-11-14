"""Vegetation factor from MODIS/Terra MOD13C2 v061 (monthly NDVI, 0.05 degree CMG).

  ndvi = mean of the monthly cell means for the 12 months of YEAR.

For each month, a 0.5 degree cell's value is the mean NDVI of its 0.05 degree pixels that
  - are land in the Natural Earth mask (same 0.05 degree grid), and
  - hold a real observation for that month: pixel reliability 0 (good), 1 (marginal) or
    2 (snow/ice). Cloudy pixels (3), pixels the product filled from its historic
    climatology (4) and fill (-1) are left out.
Months with no usable pixel are skipped. A cell with no usable month is NaN (null).
High-latitude cells have no winter observations (polar night), so their annual mean
covers the sunlit months only; the number of months used is kept in the cache
(grid_ndviMonths.npy) and summarised in earth.json meta.

Needs EARTHDATA_TOKEN (.env). The token is sent only to NASA Earthdata hosts and never printed.
"""
from __future__ import annotations

import numpy as np
import requests

from common import CACHE, NLAT, NLON, USER_AGENT, download, read_env_token, save_grid
import landmask

SHORT_NAME, VERSION = "MOD13C2", "061"
YEAR = 2025
CMR = "https://cmr.earthdata.nasa.gov/search/granules.json"
SDS_NDVI = "CMG 0.05 Deg Monthly NDVI"
SDS_REL = "CMG 0.05 Deg Monthly pixel reliability"
OK_RELIABILITY = (0, 1, 2)
KEEP_RAW = False  # raw files are about 100 MB each; the per-month aggregates are what we cache
RAW = CACHE / "mod13c2"


def granules() -> list[tuple[str, str]]:
    """(month 'YYYY-MM', url) for the 12 monthly granules of YEAR, from NASA CMR."""
    r = requests.get(CMR, params={
        "short_name": SHORT_NAME, "version": VERSION, "page_size": 50, "sort_key": "start_date",
        "temporal": f"{YEAR}-01-01T00:00:00Z,{YEAR}-12-31T23:59:59Z",
    }, headers={"User-Agent": USER_AGENT}, timeout=60)
    r.raise_for_status()
    out = []
    for e in r.json()["feed"]["entry"]:
        urls = [x["href"] for x in e["links"] if x["href"].startswith("https") and x["href"].endswith(".hdf")]
        if urls and e["time_start"].startswith(str(YEAR)):
            out.append((e["time_start"][:7], urls[0]))
    assert len(out) == 12, f"expected 12 monthly granules, got {len(out)}"
    return out


def month_aggregate(month: str, url: str) -> dict:
    """Per-cell sum and count of usable NDVI pixels for one month. Cached."""
    agg = CACHE / f"ndvi_{SHORT_NAME}_{month}.npz"
    if agg.exists():
        return dict(np.load(agg))
    from pyhdf.SD import SD, SDC
    f = RAW / url.rsplit("/", 1)[1]
    download(url, f, headers={"Authorization": f"Bearer {read_env_token()}"})
    sd = SD(str(f), SDC.READ)
    s = sd.select(SDS_NDVI)
    a = s.attributes()
    raw = s.get()
    rel = sd.select(SDS_REL).get()
    sd.end()
    assert raw.shape == (NLAT * 10, NLON * 10), raw.shape
    scale, fill = float(a["scale_factor"]), int(a["_FillValue"])
    vmin, vmax = a["valid_range"]
    assert scale == 10000.0, scale  # MODIS convention: value = stored / scale_factor
    land = landmask.land_fine().astype(bool)
    ok = land & (raw != fill) & (raw >= vmin) & (raw <= vmax) & np.isin(rel, OK_RELIABILITY)
    v = np.where(ok, raw / scale, 0.0)
    ssum = v.reshape(NLAT, 10, NLON, 10).sum(axis=(1, 3))
    cnt = ok.reshape(NLAT, 10, NLON, 10).sum(axis=(1, 3))
    nland = land.reshape(NLAT, 10, NLON, 10).sum(axis=(1, 3))
    np.savez_compressed(agg, sum=ssum.astype(np.float32), count=cnt.astype(np.int16),
                        landCount=nland.astype(np.int16), granule=np.array(f.name))
    if not KEEP_RAW:
        f.unlink()
    print(f"  {month}: cells with data {(cnt > 0).sum()}  ({f.name})")
    return dict(np.load(agg))


def build() -> dict:
    msum = np.zeros((NLAT, NLON))
    mcnt = np.zeros((NLAT, NLON), dtype=int)
    files = []
    for month, url in granules():
        d = month_aggregate(month, url)
        has = d["count"] > 0
        msum += np.where(has, d["sum"] / np.maximum(d["count"], 1), 0.0)
        mcnt += has
        files.append(str(d["granule"]))
    ndvi = np.where(mcnt > 0, msum / np.maximum(mcnt, 1), np.nan)
    save_grid("ndvi", ndvi)
    save_grid("ndviMonths", mcnt.astype(np.float32))
    land = landmask.land_mask()
    return {
        "source": f"MODIS/Terra {SHORT_NAME} v{VERSION} monthly NDVI 0.05 deg CMG, {YEAR} (NASA LP DAAC)",
        "year": YEAR,
        "granules": files,
        "method": ("Mean of monthly cell means. Land pixels with pixel reliability 0, 1 or 2 only; "
                   "cloudy and climatology-filled pixels are left out."),
        "landCellsWith12Months": int((land & (mcnt == 12)).sum()),
        "landCellsWith1to11Months": int((land & (mcnt > 0) & (mcnt < 12)).sum()),
        "landCellsWithNoData": int((land & (mcnt == 0)).sum()),
    }


if __name__ == "__main__":
    print(build())

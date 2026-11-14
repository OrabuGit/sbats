"""Climate factors from the NASA POWER climatology (MERRA-2, 2001-2020).

Source: the POWER project's public Zarr archive on AWS Open Data (no login). The whole
global climatology is read once and cached, so no per-point API calls are made.

  tempMean  = T2M annual mean (deg C)
  tempRange = T2M_RANGE annual mean, the average daily max-minus-min of 2 m temperature (deg C)
  precip    = PRECTOTCORR annual mean (mm/day) x 365.25 (mm/year)

POWER serves these parameters on the MERRA-2 grid (0.5 deg latitude x 0.625 deg longitude,
centres on whole and half degrees). The SBATS grid is 0.5 x 0.5 with centres on .25/.75.
Each SBATS cell takes the area-weighted mean of the source cells it overlaps. This is a
regrid of existing values, not gap filling: a cell with no valid source value stays NaN.
"""
from __future__ import annotations

import numpy as np

from common import CACHE, LATS, LONS, RES, save_grid

ZARR_URL = ("https://nasa-power.s3.amazonaws.com/merra2/temporal/"
            "power_merra2_climatology_temporal_utc.zarr")
PARAMS = {"tempMean": "T2M", "tempRange": "T2M_RANGE", "precip": "PRECTOTCORR"}
ANNUAL_INDEX = 12  # time axis is 1..12 = months, 13 = annual
DAYS_PER_YEAR = 365.25


def fetch() -> dict:
    """Download the annual climatology fields once. Returns arrays on the source grid."""
    out = CACHE / "power_climatology_annual.npz"
    if out.exists():
        return dict(np.load(out, allow_pickle=False))
    import xarray as xr
    ds = xr.open_zarr(ZARR_URL, consolidated=True)
    assert int(ds.time.values[ANNUAL_INDEX]) == 13, ds.time.values
    d = {"lat": ds.lat.values.astype(np.float64), "lon": ds.lon.values.astype(np.float64)}
    for key, p in PARAMS.items():
        assert ds[p].dims == ("time", "lat", "lon"), ds[p].dims
        d[p] = ds[p].isel(time=ANNUAL_INDEX).load().values.astype(np.float32)
        print(f"  fetched POWER {p} ({ds[p].attrs.get('units')})")
    d["period"] = np.array(f"{ds.attrs['time_coverage_start'][:4]}-{ds.attrs['time_coverage_end'][:4]}")
    d["version"] = np.array(str(ds.attrs.get("version", "")))
    np.savez(out, **d)
    return dict(np.load(out, allow_pickle=False))


def _overlap_weights(src_lo, src_hi, dst_lo, dst_hi, periodic=None, measure=None):
    """Weight matrix W[dst, src] = overlap of the two intervals (optionally periodic)."""
    m = measure or (lambda x: x)
    W = np.zeros((len(dst_lo), len(src_lo)))
    shifts = (0.0,) if periodic is None else (-periodic, 0.0, periodic)
    for s in shifts:
        lo = np.maximum(dst_lo[:, None], src_lo[None, :] + s)
        hi = np.minimum(dst_hi[:, None], src_hi[None, :] + s)
        W += np.where(hi > lo, m(hi) - m(lo), 0.0)
    return W


def regrid(field: np.ndarray, src_lat: np.ndarray, src_lon: np.ndarray) -> np.ndarray:
    """Area-weighted mean of the overlapping source cells. NaN where nothing valid overlaps."""
    dlat = float(np.median(np.diff(src_lat)))
    dlon = float(np.median(np.diff(src_lon)))
    sin = lambda x: np.sin(np.radians(x))  # noqa: E731 - area on a sphere goes with sin(lat)
    slat_lo = np.clip(src_lat - dlat / 2, -90, 90)
    slat_hi = np.clip(src_lat + dlat / 2, -90, 90)
    Wlat = _overlap_weights(slat_lo, slat_hi, LATS - RES / 2, LATS + RES / 2, measure=sin)
    Wlon = _overlap_weights(src_lon - dlon / 2, src_lon + dlon / 2,
                            LONS - RES / 2, LONS + RES / 2, periodic=360.0)
    valid = np.isfinite(field)
    num = Wlat @ np.where(valid, field, 0.0) @ Wlon.T
    den = Wlat @ valid.astype(float) @ Wlon.T
    full = Wlat.sum(1)[:, None] * Wlon.sum(1)[None, :]
    # Require the cell to be fully covered by valid source values.
    ok = den >= full * (1 - 1e-9)
    return np.where(ok, num / np.where(den > 0, den, 1), np.nan).astype(np.float32)


def build() -> dict:
    d = fetch()
    grids = {}
    for key, p in PARAMS.items():
        g = regrid(d[p], d["lat"], d["lon"])
        if key == "precip":
            g = g * DAYS_PER_YEAR
        grids[key] = g
        save_grid(key, g)
    return {"period": str(d["period"]), "version": str(d["version"])}


if __name__ == "__main__":
    print(build())

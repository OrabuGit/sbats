"""Surface temperature of every cell of the lunar grid from LRO Diviner.

    uv run --project pipeline pipeline/moon_temperature.py

Source: Diviner Lunar Radiometer Experiment Global Cumulative Products, PDS data set
LRO-L-DLRE-5-GCP-V1.0 (Williams et al. 2017, Icarus 283:300), files
GLOBAL_CUMUL_AVG_CYL_<band>_002.TAB: bolometric brightness temperature in bins of 0.5 degrees
and 0.25 hours of local time, from all nadir observations of 5 July 2009 to 1 April 2015.

Method, the one used for the Marius Hills target (validation/build/moon_global_temperature.py):
  1. For each grid cell and each of the 96 local-time steps, the mean of the bins inside the cell
     that have an observation.
  2. Steps with no observation are filled by straight-line interpolation in local time, only for
     gaps of at most MAX_GAP_STEPS steps (half an hour) and only if no more than a third of the day
     is empty. Otherwise the cell has no value (null).
  3. tempMean = mean over the 96 steps (average surface temperature over one lunar day),
     tempRange = highest step minus lowest step.

This is a measured surface temperature, not an air temperature: the Moon has no air.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from planet_fetch import PLANET, fetch_parallel  # noqa: E402

BASE = "https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_gcp/"
ROW_BYTES, STEPS, LAT_BINS, LON_BINS = 113, 96, 20, 720
MAX_GAP_STEPS = 2
KELVIN = 273.15


def band_name(south: int) -> str:
    hemi = "n" if south >= 0 else "s"          # the equator is written 00s in southern bands, 00n in northern ones
    tag = lambda x: f"{abs(x):02d}{hemi}"  # noqa: E731
    return f"global_cumul_avg_cyl_{tag(south)}{tag(south + 10)}_002.tab"


def band(south: int) -> np.ndarray:
    """tbol[lat bin (south to north), lon bin (west to east), step] in kelvin, NaN where no observation."""
    cache = PLANET / f"diviner_{south:+03d}.npy"
    if cache.exists():
        return np.load(cache)
    p = fetch_parallel(BASE + band_name(south), band_name(south), 10)
    raw = np.fromfile(p, dtype="S1")
    n = LON_BINS * LAT_BINS * STEPS
    assert raw.size == ROW_BYTES * (n + 1), raw.size
    rows = raw[ROW_BYTES:].reshape(n, ROW_BYTES)
    num = lambda a, b: np.ascontiguousarray(rows[:, a:b]).view(f"S{b - a}").astype(np.float64).reshape(-1)  # noqa: E731
    # Column positions come from the commas of the first data row (the table is fixed width).
    commas = [i for i, ch in enumerate(rows[0].tobytes().decode()) if ch == ","]
    assert len(commas) == 10, commas
    edges = [0] + [c + 1 for c in commas] + [ROW_BYTES - 2]
    assert all((rows[::max(1, n // 5000), c] == b",").all() for c in commas), "not fixed width"
    clon, clat, ltim, tbol = (num(edges[q], edges[q + 1] - (1 if q < 10 else 0)) for q in (0, 1, 2, 10))
    # Row order: longitude, then latitude, then local time. Checked on every row, not assumed.
    k = np.arange(n)
    assert np.allclose(clon, -179.75 + 0.5 * (k // (LAT_BINS * STEPS))), "longitude order"
    assert np.allclose(clat, south + 0.25 + 0.5 * ((k // STEPS) % LAT_BINS)), "latitude order"
    assert np.all(np.abs(ltim - ((k % STEPS) + 0.5) * 0.25) < 0.011), "local time order"
    t = tbol.reshape(LON_BINS, LAT_BINS, STEPS).transpose(1, 0, 2)
    t = np.where(t > 0, t, np.nan).astype(np.float32)
    np.save(cache, t)
    p.unlink()
    return t


def cell_stats(curves: np.ndarray):
    """(tempMean C, tempRange K, filled steps) from bin curves [bins, 96]; None when the day is too empty."""
    with np.errstate(invalid="ignore"):
        cnt = np.isfinite(curves).sum(axis=0)
        curve = np.where(cnt > 0, np.nansum(curves, axis=0) / np.maximum(cnt, 1), np.nan)
    miss = ~np.isfinite(curve)
    if miss.sum() > STEPS // 3:
        return None
    if miss.any():
        if miss.all():
            return None
        # longest run of empty steps, the day being circular
        dbl = np.concatenate([miss, miss]); run = best = 0
        for m in dbl:
            run = run + 1 if m else 0; best = max(best, run)
        if best > MAX_GAP_STEPS:
            return None
        x = np.arange(STEPS); ok = ~miss
        curve = np.interp(x, x[ok], curve[ok], period=STEPS)
    return float(curve.mean() - KELVIN), float(curve.max() - curve.min()), int(miss.sum())


def grid(cell: float = 2.0):
    """(tempMean[nlat, nlon] C, tempRange[nlat, nlon] K), rows north to south, NaN for no value. Cached."""
    cache = PLANET / f"moon_temp_{cell}.npz"
    if cache.exists():
        d = np.load(cache)
        return d["mean"], d["range"]
    nlat, nlon, k = int(180 / cell), int(360 / cell), int(cell / 0.5)
    mean = np.full((nlat, nlon), np.nan); rng = np.full((nlat, nlon), np.nan)
    for south in range(-90, 90, 10):
        t = band(south)
        print(f"  Diviner band {south}", flush=True)
        for bi in range(LAT_BINS // k):
            lat_c = south + cell * (bi + 0.5)
            i = int(round((90 - cell / 2 - lat_c) / cell))
            for j in range(nlon):
                st = cell_stats(t[bi * k:(bi + 1) * k, j * k:(j + 1) * k].reshape(-1, STEPS))
                if st:
                    mean[i, j], rng[i, j] = st[0], st[1]
    np.savez_compressed(cache, mean=mean, range=rng)
    return mean, rng


if __name__ == "__main__":
    m, r_ = grid()
    print("cells with a value:", int(np.isfinite(m).sum()), "of", m.size)
    print("tempMean C min/mean/max", np.nanmin(m), np.nanmean(m), np.nanmax(m), "| tempRange K", np.nanmin(r_), np.nanmean(r_), np.nanmax(r_))
    # Marius Hills target (14.09 N, 56.77 W): targets.json has -54.6 C and 297.5 K
    i, j = int((90 - 14.09) // 2), int((-56.77 + 180) // 2)
    print("Marius Hills cell:", m[i, j], r_[i, j])

"""Wind speed and aerosol loading from the NASA POWER climatology (2001-2020).

Two extra cell keys (not scoring factors unless the scoring session adds them):

  windSpeed = WS10M annual mean, wind speed 10 m above the surface (m/s). MERRA-2 based,
              source grid 0.5 x 0.625 degrees.
  aod       = AOD_55 annual mean, aerosol optical depth at 550 nm (dimensionless): how much all
              airborne particles (dust, smoke, sea salt, pollution) dim a vertical beam of light.
              It is not dust alone. From POWER's CERES SYN1deg based collection, source grid
              1 x 1 degree.

Regridding is the same area-weighted overlap as the climate stage; a cell that is not fully
covered by valid source values stays null.
"""
from __future__ import annotations

import numpy as np

from climate import ANNUAL_INDEX, regrid
from common import CACHE, save_grid

SOURCES = {
    "windSpeed": ("https://nasa-power.s3.amazonaws.com/merra2/temporal/power_merra2_climatology_temporal_utc.zarr", "WS10M", "m/s"),
    "aod": ("https://nasa-power.s3.amazonaws.com/syn1deg/temporal/power_syn1deg_climatology_temporal_utc.zarr", "AOD_55", "dimensionless"),
}


def fetch() -> dict:
    out = CACHE / "power_atmosphere_annual.npz"
    if out.exists():
        return dict(np.load(out, allow_pickle=False))
    import xarray as xr
    d = {}
    for key, (url, p, unit) in SOURCES.items():
        ds = xr.open_zarr(url, consolidated=True)
        assert int(ds.time.values[ANNUAL_INDEX]) == 13 and ds[p].dims == ("time", "lat", "lon")
        assert ds[p].attrs.get("units") == unit, ds[p].attrs.get("units")
        d[key] = ds[p].isel(time=ANNUAL_INDEX).load().values.astype(np.float32)
        d[key + "_lat"] = ds.lat.values.astype(np.float64); d[key + "_lon"] = ds.lon.values.astype(np.float64)
        d[key + "_period"] = np.array(f"{ds.attrs['time_coverage_start'][:4]}-{ds.attrs['time_coverage_end'][:4]}")
        print(f"  fetched POWER {p}")
    np.savez(out, **d)
    return dict(np.load(out, allow_pickle=False))


def build() -> dict:
    d = fetch()
    for key in SOURCES:
        save_grid(key, regrid(d[key], d[key + "_lat"], d[key + "_lon"]))
    return {
        "keys": [
            {"key": "windSpeed", "label": "Wind speed at 10 m", "unit": "m/s", "badge": "Measured",
             "source": f"NASA POWER climatology {d['windSpeed_period']} (MERRA-2), parameter WS10M, annual mean"},
            {"key": "aod", "label": "Aerosol optical depth at 550 nm", "unit": "dimensionless", "badge": "Measured",
             "source": f"NASA POWER climatology {d['aod_period']} (CERES SYN1deg), parameter AOD_55, annual mean",
             "note": "All airborne particles, not dust alone."},
        ],
    }


if __name__ == "__main__":
    print(build())

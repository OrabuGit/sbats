"""Terrain metrics shared by Earth, Moon and Mars (data/SCHEMA.md, "Terrain method").

Use this one function for all three bodies so the numbers are comparable:

  1. Resample the elevation model to a regular grid with about SPACING_M metres between
     posts in both directions (block average, never a finer grid than the source).
     463 m is the spacing of the coarsest of the three models, the MGS MOLA MEGDR at
     128 pixels per degree (463.08 m). On Earth 15 arc-seconds of latitude is 463.3 m.
  2. Take a window of WINDOW_KM x WINDOW_KM x cos(latitude) kilometres. On Earth that is
     one 0.5 degree cell: 0.5 degrees of latitude is 55.6 km, and the east-west width
     shrinks with cos(latitude). For a Moon or Mars target, centre the same ground area
     on the target.
  3. slope     = mean, over the window, of the slope in degrees from Horn's (1981)
                 3 x 3 finite-difference gradient at the resampled spacing.
     roughness = standard deviation (population, ddof 0) of the resampled elevations
                 in the window, in metres.

Pixels flagged invalid (water on Earth, no-data anywhere) are left out. A slope value
needs all nine pixels of its 3 x 3 neighbourhood to be valid.
"""
from __future__ import annotations

import numpy as np

SPACING_M = 463.0
WINDOW_KM = 55.6
MIN_PIXELS = 9  # fewer valid pixels than this: no metric


def terrain_metrics(elev: np.ndarray, valid: np.ndarray, dx_m: float, dy_m: float):
    """Return (mean slope in degrees, elevation std in metres, valid pixel count).

    elev  : 2D elevations in metres on a regular grid, row 0 = north.
    valid : 2D bool, False where the pixel must be ignored.
    dx_m, dy_m : ground spacing between columns and rows in metres.
    Either metric is None when there are not enough valid pixels.
    """
    z = np.asarray(elev, dtype=np.float64)
    v = np.asarray(valid, dtype=bool) & np.isfinite(z)
    n = int(v.sum())
    rough = float(z[v].std()) if n >= MIN_PIXELS else None
    slope = None
    if z.shape[0] >= 3 and z.shape[1] >= 3:
        a, b, c = z[:-2, :-2], z[:-2, 1:-1], z[:-2, 2:]
        d, f = z[1:-1, :-2], z[1:-1, 2:]
        g, h, i = z[2:, :-2], z[2:, 1:-1], z[2:, 2:]
        dzdx = ((c + 2 * f + i) - (a + 2 * d + g)) / (8.0 * dx_m)
        dzdy = ((g + 2 * h + i) - (a + 2 * b + c)) / (8.0 * dy_m)
        ok = np.ones(dzdx.shape, dtype=bool)
        for r in range(3):
            for s in range(3):
                ok &= v[r:r + z.shape[0] - 2, s:s + z.shape[1] - 2]
        if ok.sum() >= 1:
            deg = np.degrees(np.arctan(np.hypot(dzdx, dzdy)))
            slope = float(deg[ok].mean())
    return slope, rough, n

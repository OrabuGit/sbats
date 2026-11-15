"""Rock class of every Moon and Mars grid cell from the USGS global geologic maps.

Sources:
  Moon  Unified Geologic Map of the Moon, 1:5,000,000 (Fortezzo, Spudis and Harrel 2020, USGS),
        GIS package, layer GeoUnits.
  Mars  Geologic Map of Mars, 1:20,000,000 (Tanaka et al. 2014, USGS Scientific Investigations
        Map 3292), GIS package, layer SIM3292_Global_Geology.

The maps name geologic units (age and landform type), not rock types. UNIT_CLASS below is the
explicit table from map unit to the rock classes used on Earth (the GLiM classes of
data/SCHEMA.md). A unit is given a class only where its type states the material:

  Moon  mare and mare dome units          -> 2, Basic volcanic rocks (mare basalt)
        dark mantling unit                -> 12, Pyroclastics
        terra, plains, basin and massif   -> 4, Basic plutonic rocks. This is the project's
          units (highland crust and its      choice for lunar highland crust (anorthosite),
          basin ejecta)                      the one already used for the highland targets.
        crater units, plateau unit        -> no class: the material is whatever the impact
                                             hit, which the unit does not say
  Mars  volcanic, volcanic edifice and    -> 2, Basic volcanic rocks. The map says volcanic;
          volcanic field units               basaltic composition is the project's reading.
        Amazonian polar and polar cap     -> 16, Ice and glaciers
        polar dunes unit                  -> 1, Unconsolidated sediments
        highland, transition, lowland,    -> no class: mixed or undetermined materials
          basin, apron, impact and
          Hesperian polar units

A cell gets the class with the largest area inside it, if units with a class cover at least
MIN_CLASSED of the cell. Otherwise null. Area shares are counted on a 0.1 degree raster.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import shapefile
from rasterio.features import rasterize
from rasterio.transform import from_origin

sys.path.insert(0, str(Path(__file__).resolve().parent))

from planet_fetch import PLANET  # noqa: E402

GEO = PLANET / "geo"
FINE = 0.1
MIN_CLASSED = 0.5

MOON_SHP = GEO / "moon/Unified_Geologic_Map_of_the_Moon_GIS/Lunar_GIS/Shapefiles/GeoUnits"
MARS_SHP = GEO / "mars/SIM3292_MarsGlobalGeologicGIS_20M/SIM3292_Shapefiles/SIM3292_Global_Geology"
MOON_R = 1_737_400.0


def moon_class(unit: str, kind: str) -> int | None:
    k = kind.lower()
    if "mare" in k:
        return 2
    if "dark mantling" in k:
        return 12
    if "crater" in k or "plateau" in k:
        return None
    if any(w in k for w in ("terra", "plains", "basin", "massif", "formation", "grooved")):
        return 4
    return None


def mars_class(unit: str, desc: str) -> int | None:
    d = desc.lower()
    if "volcanic" in d:
        return 2
    if "polar dunes" in d:
        return 1
    if "amazonian polar" in d:
        return 16
    return None


def _table(body: str):
    r = shapefile.Reader(str(MOON_SHP if body == "moon" else MARS_SHP))
    rows = []
    for sr in r.iterShapeRecords():
        rec = sr.record
        if body == "moon":
            unit, desc = rec["FIRST_Unit"], f"{rec['FIRST_Un_1']} {rec['FIRST_Un_2']}"
            cls = moon_class(unit, rec["FIRST_Un_2"])
        else:
            unit, desc = rec["Unit"], rec["UnitDesc"]
            cls = mars_class(unit, desc)
        rows.append((unit, desc, cls, sr.shape.__geo_interface__))
    return rows


def grid(body: str, cell: float):
    """(lithology[nlat, nlon] float with NaN, classedShare[nlat, nlon], unit table) for the body. Cached."""
    cache = PLANET / f"geology_{body}_{cell}.npz"
    table_cache = PLANET / f"geology_{body}_table.json"
    import json
    if cache.exists() and table_cache.exists():
        d = np.load(cache)
        return d["lith"], d["share"], json.loads(table_cache.read_text())
    rows = _table(body)
    W, H = int(360 / FINE), int(180 / FINE)
    if body == "moon":   # map coordinates are metres of an equidistant cylindrical projection
        m = np.pi * MOON_R / 180 * FINE
        tr = from_origin(-180 * m / FINE, 90 * m / FINE, m, m)
    else:                # map coordinates are degrees
        tr = from_origin(-180, 90, FINE, FINE)
    # 0 = not mapped, 255 = mapped unit without a class, else the class code
    fine = rasterize(((g, 255 if c is None else c) for _u, _d, c, g in rows), out_shape=(H, W), transform=tr,
                     fill=0, dtype="uint8")
    k = int(round(cell / FINE))
    blocks = fine.reshape(H // k, k, W // k, k).transpose(0, 2, 1, 3).reshape(H // k, W // k, k * k)
    codes = sorted({c for _u, _d, c, _g in rows if c is not None})
    shares = np.stack([(blocks == c).mean(axis=2) for c in codes], axis=2)
    classed = shares.sum(axis=2)
    best = np.array(codes)[shares.argmax(axis=2)].astype(float)
    lith = np.where(classed >= MIN_CLASSED, best, np.nan)
    units = {}
    for u, d, c, _g in rows:
        units[u] = {"unit": u, "description": d, "class": c}
    table = sorted(units.values(), key=lambda x: x["unit"])
    np.savez_compressed(cache, lith=lith, share=classed)
    table_cache.write_text(json.dumps(table))
    return lith, classed, table


if __name__ == "__main__":
    for body, cell in (("moon", 2.0), ("mars", 1.0)):
        lith, share, table = grid(body, cell)
        vals, counts = np.unique(lith[np.isfinite(lith)], return_counts=True)
        print(body, lith.shape, "classes", dict(zip(vals.astype(int).tolist(), counts.tolist())), "null", int((~np.isfinite(lith)).sum()))
        print("  units without a class:", [t["unit"] for t in table if t["class"] is None])

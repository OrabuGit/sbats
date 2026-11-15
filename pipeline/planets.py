"""Global Moon and Mars grids: writes data/moon.json, data/mars.json and the compact .bin copies.

    uv run --project pipeline pipeline/planets.py            # both bodies
    uv run --project pipeline pipeline/planets.py moon       # one body

Same idea as data/earth.json: one row per cell, the factor keys that exist for the body, null
where there is no data. Every cell of the body is listed. Cells are about the ground size of an
Earth 0.5 degree cell: 2 degrees on the Moon (60.6 km), 1 degree on Mars (59.3 km).

Stages (each caches its result in cache/planet/):
  planet_terrain.py    slope, roughness        LOLA (Moon), MOLA (Mars), shared terrain_metrics()
  moon_temperature.py  tempMean, tempRange     LRO Diviner (Moon)
  mars_climate.py      tempMean, tempRange,    Mars Climate Database v6.2 (Mars; a model)
                       surfTempMean
  planet_geology.py    lithology               USGS global geologic maps, explicit unit table
  moon_shadow.py       psrFrac                 LOLA permanently shadowed regions (Moon)
  (this file)          waterH2O                Mars Odyssey GRS water map (Mars)
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

import compact  # noqa: E402
import moon_shadow  # noqa: E402
import moon_temperature  # noqa: E402
import planet_geology  # noqa: E402
import planet_terrain  # noqa: E402
from common import DATA  # noqa: E402
from planet_fetch import PLANET  # noqa: E402

GRS_URL = "https://pds-geosciences.wustl.edu/ody/ody-m-grs-5-elements-v1/odgm_xxxx/data/smoothed/h2o_sr_5x5.tab"

# key -> (dtype, scale) for the compact files; scale matches the decimals written to the JSON.
COLUMNS = {
    "slope": ("int16", 100), "roughness": ("uint16", 10), "tempMean": ("int16", 100), "tempRange": ("int16", 100),
    "surfTempMean": ("int16", 100), "lithology": ("uint8", 1), "psrFrac": ("uint16", 1000), "waterH2O": ("uint16", 100),
}
DECIMALS = {k: len(str(v[1])) - 1 for k, v in COLUMNS.items()}


def grs_water(lats, lons):
    """Water (H2O) weight percent of the 5 degree GRS bin that holds each cell centre; NaN where the map has none."""
    p = PLANET / "h2o_sr_5x5.tab"
    if not p.exists():
        import requests
        from common import USER_AGENT
        r = requests.get(GRS_URL, headers={"User-Agent": USER_AGENT}, timeout=120); r.raise_for_status()
        p.write_bytes(r.content)
    rows = np.array([[float(x) for x in line.split()[:3]] for line in p.read_text().splitlines() if line.strip()])
    assert rows.shape == (2592, 3) and rows[:, 1].min() == 2.5 and rows[:, 1].max() == 357.5, rows.shape
    g = np.full((36, 72), np.nan)
    for la, lo, v in rows:
        g[int((90 - la) // 5), int(lo // 5)] = np.nan if v > 9000 else v
    ii = ((90 - lats) // 5).astype(int)
    jj = ((lons % 360) // 5).astype(int)
    return g[np.ix_(ii, jj)]


def nearest(src_lats, src_lons, field, lats, lons):
    """Value of the nearest source node for each cell centre (no interpolation). Longitudes wrap."""
    ii = np.abs(src_lats[None, :] - lats[:, None]).argmin(axis=1)
    d = np.abs(((src_lons[None, :] - lons[:, None]) + 180) % 360 - 180)
    jj = d.argmin(axis=1)
    return field[np.ix_(ii, jj)]


def build(body: str) -> dict:
    lats, lons, slope, rough = planet_terrain.grid(body)
    cell = planet_terrain.BODIES[body]["cell"]
    lith, lith_share, units = planet_geology.grid(body, cell)
    layers = {"slope": slope, "roughness": rough}
    factors = []
    post = "474 m (LOLA 64 pixels per degree)" if body == "moon" else "463 m (MOLA 128 pixels per degree)"
    dem = ("LRO LOLA gridded elevation model LDEM_64 (NASA PDS Geosciences Node, LRO-L-LOLA-4-GDR-V1.0; Smith et al. 2010)"
           if body == "moon" else
           "MGS MOLA Mission Experiment Gridded Data Record, 128 pixels per degree, as the USGS Astrogeology global mosaic "
           "Mars_MGS_MOLA_DEM_mosaic_global_463m (NASA PDS; Smith et al. 2001)")
    tnote = (f"55.6 km square window centred on the cell centre, posts of {post}, pipeline/terrain_metrics.py: the method used "
             "for the targets and for Earth. Towards the poles neighbouring windows overlap.")
    factors += [
        {"key": "slope", "label": "Slope", "unit": "degrees", "source": dem, "badge": "Mission", "note": tnote},
        {"key": "roughness", "label": "Roughness", "unit": "m", "source": dem, "badge": "Mission", "note": tnote},
    ]
    if body == "moon":
        tm, tr = moon_temperature.grid(cell)
        layers.update(tempMean=tm, tempRange=tr, lithology=lith, psrFrac=moon_shadow.grid(cell))
        div = ("LRO Diviner Global Cumulative Products, PDS LRO-L-DLRE-5-GCP-V1.0 (Williams et al. 2017, Icarus 283:300): "
               "bolometric surface temperature in 0.5 degree bins by local time")
        factors += [
            {"key": "tempMean", "label": "Mean surface temperature", "unit": "°C", "source": div, "badge": "Mission",
             "note": ("Mean of the measured surface temperature over one lunar day. A surface temperature: the Moon has no air. "
                      "Null where the local-time coverage has gaps longer than half an hour. The polar targets in targets.json "
                      "carry a different statistic (a modelled annual mean at 2 cm depth), so they differ from their cells.")},
            {"key": "tempRange", "label": "Day-night surface temperature range", "unit": "°C", "source": div, "badge": "Mission",
             "note": "Highest minus lowest surface temperature over one lunar day (29.53 Earth days)."},
            {"key": "lithology", "label": "Rock class", "unit": "class code",
             "source": "Unified Geologic Map of the Moon, 1:5,000,000 (Fortezzo, Spudis and Harrel 2020, USGS), layer GeoUnits",
             "badge": "Literature",
             "note": ("GLiM class codes as in earth.json, assigned from the map unit by the table in unitTable. The class with the "
                      f"largest area in the cell, if classed units cover at least {planet_geology.MIN_CLASSED:.0%} of it. Highland "
                      "units are class 4 by the project's choice (anorthosite crust); crater units have no class."),
             "unitTable": units},
            {"key": "psrFrac", "label": "Permanently shadowed share", "unit": "fraction of the cell, 0 to 1",
             "source": ("LOLA maps of permanently shadowed regions LPSR_65S_240M_201608 and LPSR_65N_240M_201608 (NASA PDS "
                        "Geosciences Node, LOLA archive extras; Mazarico et al. 2011, Icarus 211:1066)"),
             "badge": "Mission",
             "note": ("Where water ice can survive; the map shows shadow, not ice. The maps are complete only from 65 degrees "
                      "latitude to each pole: cells that reach below 65 degrees are null, not zero.")},
        ]
    else:
        import mars_climate
        mlat, mlon, t, tr, ts = mars_climate.maps()
        layers.update(tempMean=nearest(mlat, mlon, t, lats, lons), tempRange=nearest(mlat, mlon, tr, lats, lons),
                      surfTempMean=nearest(mlat, mlon, ts, lats, lons), lithology=lith, waterH2O=grs_water(lats, lons))
        mcd = ("Mars Climate Database v6.2 (LMD / OU / IAA / ESA / CNES), climatology scenario with average solar forcing, "
               "maps on the database grid of about 3.8 by 5.6 degrees")
        mnote = "A climate model, not a measurement. Each cell takes the nearest map node; nothing is interpolated."
        factors += [
            {"key": "tempMean", "label": "Mean air temperature at 2 m", "unit": "°C", "source": mcd, "badge": "Literature",
             "note": mnote + " Season-weighted mean of 12 diurnal-mean maps (every 30 degrees of solar longitude). Same quantity and source as the Mars targets."},
            {"key": "tempRange", "label": "Day-night air temperature range at 2 m", "unit": "°C", "source": mcd, "badge": "Literature",
             "note": mnote + " Highest minus lowest of 8 local times (every 3 hours), mean of 4 seasons. A lower bound: 3-hour steps can miss the peak and the trough."},
            {"key": "surfTempMean", "label": "Mean surface temperature", "unit": "°C", "source": mcd, "badge": "Literature",
             "note": mnote + " As tempMean, for the ground surface. Not used by the score."},
            {"key": "lithology", "label": "Rock class", "unit": "class code",
             "source": "Geologic Map of Mars, 1:20,000,000 (Tanaka et al. 2014, USGS Scientific Investigations Map 3292), layer SIM3292_Global_Geology",
             "badge": "Literature",
             "note": ("GLiM class codes as in earth.json, assigned from the map unit by the table in unitTable. The class with the "
                      f"largest area in the cell, if classed units cover at least {planet_geology.MIN_CLASSED:.0%} of it. Volcanic units "
                      "are class 2 (basaltic) by the project's reading; highland, lowland and transition units have no class."),
             "unitTable": units},
            {"key": "waterH2O", "label": "Water in the top metre of ground", "unit": "weight percent",
             "source": ("2001 Mars Odyssey Gamma Ray Spectrometer, element concentration maps, H2O, smoothed 5 degree bins "
                        "(NASA PDS, ODY-M-GRS-5-ELEMENTS-V1.0, product H2O_SR_5X5)"),
             "badge": "Mission",
             "note": ("Water-equivalent hydrogen as weight percent H2O, sensed to a few tens of centimetres. Each cell takes its "
                      "5 degree bin. Null poleward of the map's limit. This is not the SWIM ice map: the SWIM site could not be "
                      "reached when this file was built.")},
        ]
    keys = [f["key"] for f in factors]
    cells = []
    for i, la in enumerate(lats):
        for j, lo in enumerate(lons):
            c = {"lat": float(la), "lon": float(lo)}
            for k in keys:
                v = layers[k][i, j]
                if not np.isfinite(v):
                    c[k] = None
                elif k == "lithology":
                    c[k] = int(v)
                else:
                    c[k] = round(float(v), DECIMALS[k])
            cells.append(c)
    R = planet_terrain.BODIES[body]["radius"]
    absent = ({"precip": "No atmosphere, so no rain or snow: a fact, not missing data.",
               "ndvi": "No vegetation.", "wind": "No atmosphere, so no wind and no airborne dust: a fact, not missing data."}
              if body == "moon" else
              {"precip": "No rain; see the target notes in targets.json for the literature value.", "ndvi": "No vegetation."})
    return {
        "meta": {
            "body": body, "resolutionDeg": cell, "cellKmAtEquator": round(2 * np.pi * R / 360 * cell / 1000, 1),
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "cellCount": len(cells),
            "grid": {"order": "north to south, then west to east", "lat": "cell centre, degrees north",
                     "lon": "cell centre, degrees east, -180 to 180"},
            "factors": factors,
            "notInFile": absent,
        },
        "cells": cells,
    }


def write(body: str) -> None:
    out = build(body)
    p = DATA / f"{body}.json"
    tmp = p.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":"), allow_nan=False))
    os.replace(tmp, p)
    keys = [f["key"] for f in out["meta"]["factors"]]
    nb = compact.write(out, DATA / f"{body}.bin", {k: COLUMNS[k] for k in keys})
    print(f"\n{body}: {len(out['cells'])} cells, {p.stat().st_size / 1e6:.1f} MB json, {nb / 1e6:.2f} MB bin")
    print(f"{'key':<13}{'values':>8}{'null':>8}{'min':>10}{'mean':>10}{'max':>10}")
    for k in keys:
        v = np.array([c[k] for c in out["cells"] if c[k] is not None], float)
        print(f"{k:<13}{v.size:>8}{len(out['cells']) - v.size:>8}{v.min():>10.2f}{v.mean():>10.2f}{v.max():>10.2f}")
    targets = json.loads((DATA / "targets.json").read_text())
    res = out["meta"]["resolutionDeg"]
    idx = {(c["lat"], c["lon"]): c for c in out["cells"]}
    print("cell that holds each target (grid | targets.json):")
    for t in targets:
        if t["body"] != body:
            continue
        la = 90 - res * (np.floor((90 - t["lat"]) / res) + 0.5); lo = -180 + res * (np.floor((t["lon"] + 180) / res) + 0.5)
        c = idx[(float(la), float(lo))]
        print(f"  {t['id']:<24}", " ".join(f"{k}={c[k]}|{(t['values'].get(k) or {}).get('value')}" for k in keys if k in c))


if __name__ == "__main__":
    for b in (sys.argv[1:] or ["moon", "mars"]):
        write(b)

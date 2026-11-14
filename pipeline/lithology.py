"""Rock class from the Global Lithological Map GLiM v1.0, 0.5 degree grid.

Source: Hartmann & Moosdorf (2012), PANGAEA, doi:10.1594/PANGAEA.788537 (CC BY 3.0).
The authors publish GLiM already gridded to the same 0.5 degree grid SBATS uses, so the
value of each cell is taken as published: no resampling is done here.

Codes are the raster values of the published grid. The code-to-abbreviation table is read
from the Classnames.txt file inside the download. The labels are the first-level class
names of Hartmann & Moosdorf (2012), Table 1.

Two GLiM classes are not rock classes and become null: 11 "wb" (water bodies) and
15 "nd" (no data). Cells outside the GLiM grid are null as well.
"""
from __future__ import annotations

import csv
import zipfile

import numpy as np

from common import CACHE, NLAT, NLON, download, save_grid
import landmask

URL = "https://doi.pangaea.de/10.1594/PANGAEA.788537?format=textfile"
DIR = CACHE / "glim"

# First-level GLiM classes, Hartmann & Moosdorf (2012), Table 1.
LABELS = {
    "su": "Unconsolidated sediments",
    "ss": "Siliciclastic sedimentary rocks",
    "sm": "Mixed sedimentary rocks",
    "sc": "Carbonate sedimentary rocks",
    "py": "Pyroclastics",
    "ev": "Evaporites",
    "mt": "Metamorphics",
    "pa": "Acid plutonic rocks",
    "pi": "Intermediate plutonic rocks",
    "pb": "Basic plutonic rocks",
    "va": "Acid volcanic rocks",
    "vi": "Intermediate volcanic rocks",
    "vb": "Basic volcanic rocks",
    "ig": "Ice and glaciers",
    "wb": "Water bodies",
    "nd": "No data",
}
NOT_ROCK = ("wb", "nd")


def build() -> dict:
    z = download(URL, DIR / "glim_0point5deg.zip")
    with zipfile.ZipFile(z) as zf:
        zf.extractall(DIR)
    with open(DIR / "Classnames.txt", newline="") as f:
        codes = {int(r["Value_"]): r["xx"] for r in csv.DictReader(f, delimiter=";")}
    assert set(codes.values()) == set(LABELS), sorted(codes.values())
    asc = DIR / "glim_wgs84_0point5deg.txt.asc"
    header = dict(line.split() for line in asc.read_text().splitlines()[:6])
    assert (int(header["ncols"]), int(header["nrows"])) == (NLON, NLAT), header
    assert float(header["xllcorner"]) == -180 and float(header["yllcorner"]) == -90
    assert float(header["cellsize"]) == 0.5
    a = np.loadtxt(asc, skiprows=6, dtype=np.int32)  # ESRI ASCII grid: first row is the northernmost
    nodata = int(header["NODATA_value"])
    assert set(np.unique(a)) <= set(codes) | {nodata}
    drop = [c for c, ab in codes.items() if ab in NOT_ROCK]
    g = np.where((a == nodata) | np.isin(a, drop), np.nan, a).astype(np.float32)
    save_grid("lithology", g)
    land = landmask.land_mask()
    classes = [{"code": c, "label": LABELS[ab], "abbr": ab}
               for c, ab in sorted(codes.items()) if ab not in NOT_ROCK]
    return {
        "source": "GLiM v1.0 global lithological map, 0.5 degree grid (Hartmann & Moosdorf 2012, PANGAEA)",
        "classes": classes,
        "method": ("Cell value as published in the authors' 0.5 degree grid. "
                   "Water bodies (11) and no data (15) become null."),
        "landCellsNull": int((land & ~np.isfinite(g)).sum()),
    }


if __name__ == "__main__":
    print(build())

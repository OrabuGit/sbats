"""Compact browser copy of data/earth.json: writes data/earth.bin.

earth.json stays the source of truth. earth.bin holds exactly the same cells and meta in
a columnar binary layout that is about a tenth of the size and decodes with typed arrays.
The build decodes the file again and checks every value against earth.json.

Layout (little-endian):

  bytes 0-3    ASCII "SBE1"
  bytes 4-7    uint32 H, length of the header in bytes
  bytes 8..    header: UTF-8 JSON, padded with spaces so the data starts on a 4-byte boundary
  then         one array per column, in header order, each starting at its `byteOffset`
               (counted from the start of the file) and holding `cellCount` values

Header: { "format": "SBE1", "cellCount": n, "resolutionDeg": 0.5, "meta": <meta of earth.json>,
          "columns": [ { "key", "dtype", "scale", "nullValue", "byteOffset" } ] }

Columns:
  row, col     uint16 grid indices. lat = 90 - resolutionDeg * (row + 0.5),
               lon = -180 + resolutionDeg * (col + 0.5)
  others       value = stored / scale, or null when stored == nullValue.
               dtype is one of "uint8", "uint16", "int16".

A reference decoder for the browser is in pipeline/earth_bin_decoder.ts.
"""
from __future__ import annotations

import json
import os
import struct
from pathlib import Path

import numpy as np

MAGIC = b"SBE1"
# key -> (dtype, scale). scale matches the decimals written to earth.json.
COLUMNS = {
    "tempMean": ("int16", 100), "tempRange": ("int16", 100), "precip": ("uint16", 10),
    "ndvi": ("int16", 1000), "slope": ("int16", 100), "roughness": ("uint16", 10),
    "lithology": ("uint8", 1), "snowIceFrac": ("uint16", 1000), "barrenFrac": ("uint16", 1000),
    "windSpeed": ("uint16", 100), "aod": ("uint16", 1000), "permafrostFrac": ("uint16", 1000),
}
NULLS = {"int16": -32768, "uint16": 65535, "uint8": 255}
SIZES = {"int16": 2, "uint16": 2, "uint8": 1}


def encode(earth: dict, columns: dict | None = None) -> bytes:
    COLUMNS = columns or globals()["COLUMNS"]
    cells = earth["cells"]
    res = earth["meta"]["resolutionDeg"]
    n = len(cells)
    keys = [k for k in cells[0] if k not in ("lat", "lon")]
    assert set(keys) == set(COLUMNS), f"columns out of date: {set(keys) ^ set(COLUMNS)}"
    arrays = [
        ("row", "uint16", None, np.array([round((90 - c["lat"]) / res - 0.5) for c in cells], dtype="<u2")),
        ("col", "uint16", None, np.array([round((c["lon"] + 180) / res - 0.5) for c in cells], dtype="<u2")),
    ]
    for k in keys:
        dtype, scale = COLUMNS[k]
        null = NULLS[dtype]
        info = np.iinfo(dtype)
        vals = []
        for c in cells:
            if c[k] is None:
                vals.append(null)
            else:
                s = round(c[k] * scale)
                assert info.min <= s <= info.max and s != null, (k, c[k])
                vals.append(s)
        arrays.append((k, dtype, scale, np.array(vals, dtype=np.dtype(dtype).newbyteorder("<"))))

    def header(offsets):
        cols = []
        for (k, dtype, scale, _), off in zip(arrays, offsets):
            col = {"key": k, "dtype": dtype, "byteOffset": off}
            if scale is not None:
                col.update(scale=scale, nullValue=NULLS[dtype])
            cols.append(col)
        return json.dumps({"format": "SBE1", "cellCount": n, "resolutionDeg": res,
                           "meta": earth["meta"], "columns": cols}, ensure_ascii=False, separators=(",", ":")).encode()

    # Two passes: the header length depends on the offsets. Reserve room, then pad.
    hlen = len(header([0] * len(arrays))) + 16 * len(arrays)
    hlen += (-(8 + hlen)) % 4
    offsets, pos = [], 8 + hlen
    for _, dtype, _, a in arrays:
        pos += (-pos) % SIZES[dtype]      # align each column to its element size
        offsets.append(pos)
        pos += a.nbytes
    h = header(offsets)
    assert len(h) <= hlen
    out = bytearray(MAGIC + struct.pack("<I", hlen) + h + b" " * (hlen - len(h)))
    for (_, _, _, a), off in zip(arrays, offsets):
        out += b"\0" * (off - len(out))
        out += a.tobytes()
    return bytes(out)


def decode(buf: bytes) -> dict:
    assert buf[:4] == MAGIC
    hlen = struct.unpack("<I", buf[4:8])[0]
    h = json.loads(buf[8:8 + hlen].decode())
    n, res = h["cellCount"], h["resolutionDeg"]
    cols = {}
    for c in h["columns"]:
        a = np.frombuffer(buf, dtype=np.dtype(c["dtype"]).newbyteorder("<"), count=n, offset=c["byteOffset"])
        cols[c["key"]] = (a, c)
    cells = []
    row, col = cols["row"][0], cols["col"][0]
    for i in range(n):
        cell = {"lat": 90 - res * (int(row[i]) + 0.5), "lon": -180 + res * (int(col[i]) + 0.5)}
        for k, (a, c) in cols.items():
            if k in ("row", "col"):
                continue
            v = int(a[i])
            cell[k] = None if v == c["nullValue"] else (v if c["scale"] == 1 else v / c["scale"])
        cells.append(cell)
    return {"meta": h["meta"], "cells": cells}


def write(earth: dict, out: Path, columns: dict | None = None) -> int:
    """columns: key -> (dtype, scale) for files other than earth.json (the Moon and Mars grids)."""
    buf = encode(earth, columns)
    back = decode(buf)
    assert back["meta"] == earth["meta"]
    assert len(back["cells"]) == len(earth["cells"])
    for a, b in zip(earth["cells"], back["cells"]):
        for k, v in a.items():
            w = b[k]
            assert (v is None and w is None) or (v is not None and w is not None and abs(v - w) < 1e-9), (a, b, k)
        assert set(a) == set(b)
    tmp = out.with_suffix(".bin.tmp")
    tmp.write_bytes(buf)
    os.replace(tmp, out)
    return len(buf)

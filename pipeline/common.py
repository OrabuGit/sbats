"""Shared grid definition, cache paths and download helper for the SBATS pipeline.

The output grid is a global 0.5 degree grid. Arrays are (360, 720), row 0 is the
northernmost row (centre 89.75), column 0 is the westernmost column (centre -179.75).
"""
from __future__ import annotations

import os
import time
from pathlib import Path

import numpy as np
import requests

RES = 0.5
NLAT, NLON = 360, 720
LATS = 89.75 - RES * np.arange(NLAT)      # cell-centre latitudes, north to south
LONS = -179.75 + RES * np.arange(NLON)    # cell-centre longitudes, west to east

PIPELINE_DIR = Path(__file__).resolve().parent
ROOT = PIPELINE_DIR.parent
CACHE = PIPELINE_DIR / "cache"
DATA = ROOT / "data"
CACHE.mkdir(exist_ok=True)

USER_AGENT = "sbats-pipeline/0.1 (NASA Space Apps 2026 entry; python-requests)"


def read_env_token(name: str = "EARTHDATA_TOKEN") -> str:
    """Read a secret from the environment or the repo .env file. Never print it."""
    if os.environ.get(name):
        return os.environ[name].strip()
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            line = line.strip()
            if line.startswith(name + "="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError(f"{name} not found in environment or .env")


def download(url: str, dest: Path, headers: dict | None = None, retries: int = 5) -> Path:
    """Download url to dest unless it is already cached. Atomic, with polite retries."""
    dest = Path(dest)
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    h = {"User-Agent": USER_AGENT}
    h.update(headers or {})
    last = None
    for attempt in range(retries):
        try:
            with requests.get(url, headers=h, stream=True, timeout=120) as r:
                r.raise_for_status()
                with open(tmp, "wb") as f:
                    for chunk in r.iter_content(1 << 20):
                        f.write(chunk)
            tmp.replace(dest)
            return dest
        except Exception as e:  # noqa: BLE001 - retry on any network error
            last = e
            time.sleep(2 ** attempt)
    raise RuntimeError(f"download failed after {retries} tries: {url}: {type(last).__name__}")


def save_grid(name: str, arr: np.ndarray) -> Path:
    assert arr.shape == (NLAT, NLON), arr.shape
    p = CACHE / f"grid_{name}.npy"
    np.save(p, arr.astype(np.float32))
    return p


def load_grid(name: str) -> np.ndarray | None:
    p = CACHE / f"grid_{name}.npy"
    return np.load(p) if p.exists() else None


def cell_index(lat: float, lon: float) -> tuple[int, int]:
    """Row and column of the cell that contains the point."""
    i = min(NLAT - 1, max(0, int((90.0 - lat) / RES)))
    j = min(NLON - 1, max(0, int((lon + 180.0) / RES)))
    return i, j


# Written into the meta block of every data file the pipeline builds (submission rule: acknowledge AI use in metadata).
AI_NOTE = "Built by pipeline code written with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md."

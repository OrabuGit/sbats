"""Download one large file in parallel byte ranges (resumable per chunk). Used for the global Moon and Mars grids.

    uv run --project pipeline pipeline/planet_fetch.py <url> <output name in cache/planet> [connections]
"""
from __future__ import annotations

import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import CACHE, USER_AGENT  # noqa: E402

PLANET = CACHE / "planet"
PLANET.mkdir(exist_ok=True)
CHUNK = 32 * 1024 * 1024


def fetch_parallel(url: str, name: str, connections: int = 12) -> Path:
    out = PLANET / name
    if out.exists():
        return out
    h = requests.head(url, headers={"User-Agent": USER_AGENT}, allow_redirects=True, timeout=60)
    h.raise_for_status()
    size = int(h.headers["Content-Length"])
    final = h.url
    part = PLANET / (name + ".part")
    marks = PLANET / (name + ".chunks")
    marks.mkdir(exist_ok=True)
    if not part.exists():
        with open(part, "wb") as f:
            f.truncate(size)
    fd = os.open(part, os.O_RDWR)

    def one(k: int) -> None:
        if (marks / str(k)).exists():
            return
        a, b = k * CHUNK, min(size, (k + 1) * CHUNK) - 1
        for attempt in range(8):
            try:
                r = requests.get(final, headers={"Range": f"bytes={a}-{b}", "User-Agent": USER_AGENT}, timeout=(30, 300))
                if r.status_code != 206 or len(r.content) != b - a + 1:
                    raise RuntimeError(f"bad range reply {r.status_code}")
                os.pwrite(fd, r.content, a)
                (marks / str(k)).touch()
                return
            except Exception:  # noqa: BLE001
                time.sleep(min(60, 3 * 2 ** attempt))
        raise RuntimeError(f"chunk {k} of {name} failed")

    n = -(-size // CHUNK)
    with ThreadPoolExecutor(connections) as ex:
        list(ex.map(one, range(n)))
    os.close(fd)
    part.rename(out)
    for m in marks.iterdir():
        m.unlink()
    marks.rmdir()
    return out


if __name__ == "__main__":
    p = fetch_parallel(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 12)
    print(p, p.stat().st_size)

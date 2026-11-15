"""Rebuild every file the pipeline owns under /data, from the sources, in dependency order.

    uv run --project pipeline pipeline/all.py

Runs, in order: build.py (earth.json, earth.bin), site_climate.py, sites.py, extracts.py,
planets.py (moon.json, mars.json and their .bin copies), jaxa_check.py, logistics.py, site_stories.py. Each step caches its
downloads in pipeline/cache/, so a second run only reassembles. Stops at the first step that fails.
data/analogs.json and data/targets.json must exist (they are built by the validation scripts).
"""
from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
STEPS = ["build.py", "site_climate.py", "sites.py", "extracts.py", "planets.py", "jaxa_check.py", "logistics.py", "site_stories.py"]

if __name__ == "__main__":
    for step in STEPS:
        t = time.time()
        print(f"\n=== {step} ===", flush=True)
        r = subprocess.run([sys.executable, "-u", str(HERE / step)])
        if r.returncode != 0:
            sys.exit(f"{step} failed (exit code {r.returncode}); fix it and run again, finished steps are cached")
        print(f"=== {step} done in {time.time() - t:.0f} s ===", flush=True)

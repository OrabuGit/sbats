#!/bin/sh
# Rebuilds every file Session C owns from its sources and scripts, then runs every test.
#
#     sh validation/build_all.sh           data files and reports (no network)
#     sh validation/build_all.sh --measure also re-measure the targets from NASA's archive and the
#                                          Mars Climate Database (network, about 20 minutes)
#
# Run from the repository root. It never tunes anything: validation/tuning/frozen.json is read only.
# Order matters: targets first, then the files derived from them, then the reports.
set -e
cd "$(dirname "$0")/.."

if [ "$1" = "--measure" ]; then
  PY=pipeline/.venv/bin/python
  $PY validation/target_terrain.py
  $PY validation/target_terrain.py --posts 4 6 9 11 16
  $PY validation/target_terrain.py --posts 48 --only moon-shackleton-rim
  python3 validation/build/moon_temperature.py
  python3 validation/build/moon_global_temperature.py
  python3 validation/build/moon_illumination.py
  python3 validation/build/mars_temperature.py
  python3 validation/build/mars_sunlight.py
  python3 validation/build/mars_environment.py
  echo "Measured values are written to validation/output. Copy any that changed into the make_*.py files by hand."
fi

# Data files (hand-entered, cited values live in the make_*.py scripts)
python3 validation/build/make_targets.py
python3 validation/build/make_analogs.py
python3 validation/build/make_lithology.py
python3 validation/build/make_modules.py
python3 validation/build/make_known_sites.py
python3 validation/build/make_target_windows.py
python3 validation/build/make_target_minerals.py
python3 validation/build/make_target_environment.py
python3 validation/build/make_rovers.py
python3 validation/build/make_review.py

# Reports (frozen score; candidates are never used to tune or validate)
for preset in base rover ice astrobiology; do npx tsx validation/validate.ts "$preset" > /dev/null; done
npx tsx validation/score_candidates.ts > /dev/null
npx tsx validation/purposes.ts > /dev/null
npx tsx validation/geology.ts > /dev/null
npx tsx validation/score_sites.ts > /dev/null
npx tsx validation/minerals.ts > /dev/null
npx tsx validation/stability.ts > /dev/null
npx tsx validation/discoveries.ts > /dev/null
npx tsx validation/benchmarks.ts > /dev/null

# Tests
npx tsx --test app/src/lib/scoring/__tests__/*.test.ts app/src/lib/sim/__tests__/*.test.ts \
  app/src/lib/targets/__tests__/*.test.ts app/src/lib/match/__tests__/*.test.ts app/src/lib/route/__tests__/*.test.ts
echo "Session C files rebuilt and tested."

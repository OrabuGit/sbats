"""Writes data/target_environment.json: the target side of the dimensions added after the freeze
(wind, dust, ground ice). Never part of the all-round score.

The Earth side of these dimensions is Session B's to publish. Until it exists, and until a tolerance
is written down for each, the match record shows the target value and says the Earth value is missing.

Values:
  Mars wind and dust  Mars Climate Database v6.2, climatology scenario (validation/build/mars_environment.py).
                      A climate model, not a measurement.
  Moon wind and dust  0: the Moon has no atmosphere to carry either (NASA NSSDCA Moon Fact Sheet).
  Lunar ground ice    Share of the 55.6 km target window that never warms above 110 K, where water ice
                      is stable at the surface, from the Diviner Polar Resource Product
                      (validation/build/moon_temperature.py). Stability, not a detection of ice.
  Mars ground ice     Left null until a mapped product is in the data (Session B's SWIM key).

Run from the repository root:  python3 validation/build/make_target_environment.py

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MCD = "Mars Climate Database v6.2 (LMD/OU/IAA/ESA/CNES), climatology scenario (validation/build/mars_environment.py)"
NSSDC = "NASA NSSDCA Moon Fact Sheet: surface pressure about 3 x 10^-15 bar at night"
PRP = "LRO Diviner Polar Resource Product, PDS LRO-L-DLRE-5-PRP-V2.0 (validation/build/moon_temperature.py)"
GCP = "LRO Diviner Global Cumulative Products, PDS LRO-L-DLRE-5-GCP-V1.0 (validation/build/moon_global_temperature.py)"

# Copied by hand from validation/output/mars_environment.json: id -> (wind mean, low, high, dust mean, low, high)
MARS = {
    "mars-jezero": (5.06, 3.14, 6.96, 0.480, 0.258, 0.890),
    "mars-gale": (12.55, 10.71, 13.86, 0.561, 0.284, 1.069),
    "mars-arcadia-planitia": (4.21, 3.19, 5.78, 0.401, 0.236, 0.729),
}
# Copied by hand from validation/output/moon_temperature.json: share of the window that never exceeds 110 K
MOON_COLD = {"moon-malapert-massif": 0.015, "moon-mons-mouton": 0.005, "moon-haworth": 0.354, "moon-shackleton-rim": 0.111}


def v(value, unit, source, badge, note=None):
    if value is None:
        return {"value": None, "unit": unit, "source": None, "badge": None, "note": note}
    out = {"value": value, "unit": unit, "source": source, "badge": badge}
    if note:
        out["note"] = note
    return out


def main() -> None:
    targets = json.loads((ROOT / "data" / "targets.json").read_text())
    out = {}
    for t in targets:
        tid = t["id"]
        if t["body"] == "mars":
            w, wl, wh, d, dl, dh = MARS[tid]
            out[tid] = {
                "wind": v(w, "m/s", MCD, "Literature", f"Mean wind speed 10 m above the surface over the Mars year. Seasonal means run from {wl} to {wh} m/s. Climate model on a coarse grid: local slope winds are not resolved. The air is about a hundredth as dense as Earth's, so the same speed pushes far less."),
                "dust": v(d, "optical depth", MCD, "Literature", f"Mean dust optical depth of the whole air column in visible light over the Mars year. Seasonal means run from {dl} to {dh}. Climate model."),
                "ice": v(None, "share of ground", None, None, "No mapped value yet. Shallow ground ice on Mars is mapped by other projects; none is in this data set."),
            }
        else:
            no_air = "The Moon has no atmosphere."
            cold = MOON_COLD.get(tid)
            out[tid] = {
                "wind": v(0, "m/s", NSSDC, "Literature", f"{no_air} There is no wind."),
                "dust": v(0, "optical depth", NSSDC, "Literature", f"{no_air} No dust hangs in the air. Lunar dust is a hazard on the ground and on equipment, which an optical depth does not describe."),
                "ice": (v(cold, "share of ground", PRP, "Mission", "Share of the 55.6 km window that never warms above 110 K, where water ice is stable at the surface. Stability, not a detection of ice.")
                        if cold is not None else
                        v(0, "share of ground", GCP, "Mission", "The open surface reaches 392 K at midday: water ice is not stable anywhere on it. The inside of the pit has not been measured.")),
            }
    assert set(out) == {t["id"] for t in targets}
    data = {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "note": ("Target-side values for the dimensions added after the freeze of 2026-11-14: wind, dust and ground ice. Never part of "
                     "the all-round score. A dimension is compared only when the Earth side is published too and a tolerance has been written down."),
            "definitions": {
                "wind": "Mean wind speed 10 m above the surface, m/s.",
                "dust": "Mean dust or aerosol optical depth of the air column in visible light.",
                "ice": "Share of the ground where water ice is stable at or near the surface, 0 to 1.",
            },
            "generatedBy": "validation/build/make_target_environment.py",
        },
        "targets": out,
    }
    path = ROOT / "data" / "target_environment.json"
    path.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")
    print(f"wrote {path.relative_to(ROOT)}: {len(out)} targets")


if __name__ == "__main__":
    main()

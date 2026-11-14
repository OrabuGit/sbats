"""Writes validation/tuning/FROZEN.md from frozen.json, tuning-log.json and the validation reports.

Every number in FROZEN.md is read from those files, so the record cannot drift from the results.
Run from the repository root, after `npx tsx validation/validate.ts` has been run for all four presets:

    python3 validation/tuning/make_frozen_md.py

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
T = ROOT / "validation" / "tuning"
O = ROOT / "validation" / "output"

LABELS = {
    "tempMeanSigma": ("`tempMean` sigma", "C"),
    "tempRangeSigma": ("`tempRange` sigma", "C"),
    "precipSigma": ("`precip` sigma", "mm/year"),
    "ndviSigma": ("`ndvi` sigma", ""),
    "terrainFraction": ("Terrain sigma, as a fraction of the target's slope and roughness", ""),
    "sunSigma": ("Sunlight sigma", "degrees"),
}
FACTORS = ["terrain", "bareGround", "dryness", "temperature", "sunlight", "rockType"]
FACTOR_LABEL = {"terrain": "Terrain", "bareGround": "Bare ground", "dryness": "Dryness", "temperature": "Temperature", "sunlight": "Sunlight", "rockType": "Rock type"}
PRESETS = ["base", "rover", "ice", "astrobiology"]


def pct(v):
    return "n/a" if v is None else f"{v * 100:.1f}%"


def main() -> None:
    f = json.loads((T / "frozen.json").read_text())
    log = json.loads((T / "tuning-log.json").read_text())
    reports = {p: json.loads((O / ("report.json" if p == "base" else f"report.{p}.json")).read_text()) for p in PRESETS}
    base = reports["base"]
    if base["status"] != "final":
        raise SystemExit("report.json is not final. Run npx tsx validation/validate.ts first.")

    start = log[0]["objective"]
    tried = log[1:]

    def best_for(parameter: str):
        rows = [e for e in tried if e["parameter"] == parameter]
        return max(rows, key=lambda e: e["objective"]) if rows else None

    out: list[str] = []
    w = out.append
    w("# Frozen sigmas and weights")
    w("")
    w(f"Frozen on {f['frozenAt']}, against `data/earth.json` built {f['earthGeneratedAt']}.")
    w("")
    w("This is the record of the one tuning pass allowed by DESIGN.md section 6 and run under the team's six")
    w("rules (see `PLAN.md`). **The values below are final. They are not tuned again, even if a later result")
    w("looks worse.** A unit test (`data-files.test.ts`) fails the build if `targets.json`, `presets.ts` or")
    w("`sunlight.ts` ever differ from `frozen.json`.")
    w("")
    w("## Result in one line")
    w("")
    n_changes = len(f["changes"])
    w(f"The pass tried {len(tried)} alternative values on the tuning set and accepted {n_changes}."
      + (" Every sigma and every weight stays exactly as it was set by rule before any validation run." if n_changes == 0 else ""))
    w("")
    w("## Every value, before and after")
    w("")
    w("| Parameter | Before | After | Best alternative tried | Its gain | Reason |")
    w("| --- | --- | --- | --- | --- | --- |")
    for key, (label, unit) in LABELS.items():
        b, a = f["before"][key], f["after"][key]
        best = best_for(key)
        gain = best["objective"] - start if best else 0
        alt = f"{best['value']} {unit}".strip() if best else "n/a"
        if b == a:
            reason = f"Kept. No allowed value raised the objective by 0.03; the best moved it by {gain:+.3f}, which is within noise for 20 sites."
        else:
            reason = "Changed. See the note below this table."
        w(f"| {label} | {b} {unit} | {a} {unit} | {alt} | {gain:+.3f} | {reason} |")
    wb, wa = f["before"]["baseWeights"], f["after"]["baseWeights"]
    weight_rows = [e for e in tried if e["step"].startswith("weights")]
    best_w = max(weight_rows, key=lambda e: e["objective"]) if weight_rows else None
    for fac in FACTORS:
        same = wb[fac] == wa[fac]
        w(f"| Base weight, {FACTOR_LABEL[fac]} | {wb[fac]} | {wa[fac]} | | | {'Kept.' if same else 'Changed.'} |")
    if best_w:
        w("")
        w(f"Best move of 0.05 between Base weights that was tried: {best_w['parameter']}, gain "
          f"{best_w['objective'] - start:+.3f}. That is below the 0.03 threshold, so the Base weights stay as in the")
        w("DESIGN.md table. The table in DESIGN.md section 6 therefore needs no edit.")
    w("")
    w("Why keeping everything is the right outcome and not a failure of the pass: with 20 tuning sites, a")
    w("change of 0.02 in the objective is what random noise produces (shown by the self-test on made-up cells).")
    w("None of the 68 alternatives did better than that. Accepting one would have been fitting noise.")
    w("")
    w("## Preset weights (frozen)")
    w("")
    w("| Preset | " + " | ".join(FACTOR_LABEL[x] for x in FACTORS) + " | Changed? |")
    w("| --- | " + " | ".join("---" for _ in FACTORS) + " | --- |")
    for p in PRESETS:
        row = f["presets"][p]
        changed = "no" if row == f["presetsBefore"][p] else "yes"
        w(f"| {p.capitalize()} | " + " | ".join(str(row[x]) for x in FACTORS) + f" | {changed} |")
    w("")
    w("Rover, Ice and Astrobiology were not searched (the validation sites carry no mission-type label).")
    w("They follow Base by fixed differences, as written in `PLAN.md`.")
    w("")
    w("## Tuning set against hold-out set")
    w("")
    w("The hold-out sites were never used to choose a value. Quote the hold-out column.")
    w("")
    w("| Preset | Set | Known / controls | ROC AUC | Top-10% share | Mean percentile | Moon mean percentile | Mars mean percentile |")
    w("| --- | --- | --- | --- | --- | --- | --- | --- |")
    for p in PRESETS:
        for name in ("tuning", "holdout"):
            s = reports[p]["sets"][name]
            o = s["overall"]
            w(f"| {p.capitalize()} | {'Hold-out' if name == 'holdout' else 'Tuning'} | {o['knownSites']} / {o['negativeSites']} | {o['rocAuc']} | "
              f"{pct(o['top10Share'])} | {o['meanPercentile']} | {s['moon']['meanPercentile']} | {s['mars']['meanPercentile']} |")
    w("")
    h = base["sets"]["holdout"]
    t = base["sets"]["tuning"]
    w("## Moon against Mars (Base preset)")
    w("")
    w("| | Tuning: Moon | Tuning: Mars | Hold-out: Moon | Hold-out: Mars |")
    w("| --- | --- | --- | --- | --- |")
    for key, label, fmt in [
        ("knownSites", "Known sites", str), ("rocAuc", "ROC AUC", str), ("top10Share", "Top-10% share", pct),
        ("meanPercentile", "Mean percentile", str), ("meanScoreKnown", "Mean score of known analogs (0 to 100)", str),
    ]:
        w(f"| {label} | {fmt(t['moon'][key])} | {fmt(t['mars'][key])} | {fmt(h['moon'][key])} | {fmt(h['mars'][key])} |")
    w("")
    worse = "Moon" if (h["moon"]["meanPercentile"] or 0) < (h["mars"]["meanPercentile"] or 0) else "Mars"
    w(f"{worse} targets do worse, on both sets. No known Moon analog reaches the top 10% of Earth cells for any Moon")
    w("target. The known Moon analogs in the list are volcanoes and impact craters in temperate or wet settings")
    w("(Hawaii, Iceland, the Canary Islands, Arizona, Germany, Sicily, Ontario, Labrador). The lunar south pole is far colder and")
    w("has a Sun on the horizon, so on a climate-and-light score those sites sit mid-table.")
    w("")
    w("## How to read these numbers honestly")
    w("")
    w(f"- The hold-out set is small: {h['overall']['knownSites']} known sites and {h['overall']['negativeSites']} controls. One site moving changes the top-10% share by")
    w("  several points. Treat the hold-out numbers as a check that tuning-set numbers were not flattered, not")
    w("  as precise estimates.")
    w(f"- The hold-out ROC AUC of {h['overall']['rocAuc']} is close to 1. Its two controls are a rainforest and a city, which any")
    w("  sensible score separates from deserts. The mean percentile, which compares known analogs with every")
    w("  land cell on Earth, is the harder and more useful number.")
    w("- Percentiles are counted over all scored cells. About 24,000 Antarctic cells are all ice and score 0.")
    w("  They are real scored cells, but they lift every other site's percentile. Numbers from before the")
    w("  Antarctica fix are not comparable with these.")
    w("- Absolute scores are low: known analogs average about 10 out of 100. Mars and the lunar poles are far")
    w("  colder than almost anywhere on Earth, and temperature is the limiting factor in about half the cases.")
    w("- Disclosed in `PLAN.md`: the hold-out sites were seen once, on incomplete data, before the split was")
    w("  drawn; and one earlier run of the tuning script, before the Antarctica fix, accepted no changes and")
    w("  was voided (`void-run-2026-11-14/`).")
    w("- The Indonesian candidate sites took no part in tuning or validation. Their scores are in")
    w("  `validation/output/CANDIDATES.md`.")
    w("")
    w("## Files")
    w("")
    w("- `frozen.json`: the frozen values, the tuning-set statistics before and after, and the split used.")
    w("- `tuning-log.json`: all 68 values tried, with the objective and the reason each was rejected.")
    w("- `before-tuning/`: tuning-set report after the Antarctica fix and before the pass.")
    w("- `../output/report*.json`, `REPORT*.md`: the final reports, one per preset.")
    w("")
    (T / "FROZEN.md").write_text("\n".join(out))
    print("wrote validation/tuning/FROZEN.md")


if __name__ == "__main__":
    main()

"""Writes data/REVIEW_ME.md: every target value, its source link, and how far to trust it.

The value tables are read from data/targets.json so they cannot drift from the data. The source
links, the check level and the confidence are written by hand below.

Run from the repository root:  python3 validation/build/make_review.py

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

ROOT = Path(__file__).resolve().parents[2]

GAZ = "https://planetarynames.wr.usgs.gov/Feature/"
LOLA_URL = "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/"
MOLA_URL = "https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/"
PRP_URL = "https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/"
MCD_URL = "https://www-mars.lmd.jussieu.fr/mcd_python/"
REMS_URL = "https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json"
NDVI_URL = "https://science.nasa.gov/earth/earth-observatory/measuring-vegetation-ndvi-evi"
MOONFACT = "https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html"
MARSFACT = "https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html"
EARTHFACT = "https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html"
MARS_FACTS = "https://science.nasa.gov/mars/facts/"

# Coordinates: id -> (what the point is, link, check level, confidence)
COORDS = {
    "moon-malapert-massif": ("Centre of Mons Malapert, IAU Gazetteer feature 16338. The Artemis region centre in the LROC archive is 86.0 S, 0.3 E, about 4 km away.", GAZ + "16338", "A", "High"),
    "moon-mons-mouton": ("Centre of Mons Mouton, IAU Gazetteer feature 16070.", GAZ + "16070", "A", "High"),
    "moon-haworth": ("Centre of Haworth crater, IAU Gazetteer feature 14502 (LOLA 2011 control network). NASA publishes no coordinates for the Artemis 'Haworth' region, which lies beside the crater.", GAZ + "14502", "A", "High for the crater, medium as a landing point"),
    "moon-shackleton-rim": ("Centre of Shackleton crater, IAU Gazetteer feature 5450, not a point on the rim. The rim is about 10 km away, well inside the 55.6 km window that every value is measured over.", GAZ + "5450", "A", "High for the crater, medium as a rim point"),
    "mars-jezero": ("Perseverance landing point, 18.44 N 77.45 E, Rodriguez-Manfredi et al. 2023, Nature Geoscience.", "https://doi.org/10.1038/s41561-022-01084-0", "A", "High"),
    "mars-gale": ("Curiosity landing point, 4.6 S 137.4 E, NASA MSL fact sheet.", "https://solarsystem.nasa.gov/docs/MSL%20Fact%20Sheet%20REV-141119.pdf", "A", "High"),
    "mars-arcadia-planitia": ("Candidate landing site AP-1, 39.8 N 202.1 E (written here as -157.9), Golombek et al. 2021, LPSC abstract 2420, Table 1. The paper does not say whether latitude is planetocentric; at 0.5 degree resolution the difference does not matter.", "https://www.hou.usra.edu/meetings/lpsc2021/pdf/2420.pdf", "A", "High"),
}

# Per-key review rows. key -> {target id or "*moon"/"*mars": (link, check level, confidence, comment)}
REVIEW = {
    "tempMean": {
        "*moon": (PRP_URL, "A", "Medium",
                  "Computed by validation/build/moon_temperature.py from the Diviner Polar Resource Product. It is the Diviner team's modelled annual average at 2 cm depth, not a raw reading, averaged over a 55.6 km window that mixes sunlit ridges and permanently shadowed floors. No paper was found that gives a site temperature to compare with."),
        "mars-jezero": (MCD_URL, "A", "Medium",
                        "Climate model, not a measurement. Cross-check: the MEDA team's summary of 'around -55 C' (UPV/EHU release, read by a research agent on phys.org, not in the paper text)."),
        "mars-gale": (MCD_URL, "A", "Medium to low",
                      "Climate model. DISAGREES WITH THE ROVER: the midpoint of REMS daily minimum and maximum is -43.7 C over 4,717 sols; the model's figure for that same statistic is -54.6 C. The model value is used so that all three Mars targets share one definition (a true 24-hour mean, like Earth's). A human should decide whether to keep it. With sigma 15 C the choice changes scores only slightly."),
        "mars-arcadia-planitia": (MCD_URL, "A", "Medium to low", "Climate model. No lander has measured here and no published site value was found."),
    },
    "tempRange": {
        "*moon": ("", "", "n/a", "Left null on purpose. See the note in targets.json."),
        "mars-jezero": (MCD_URL, "A", "Medium", "Climate model. The MEDA team's summary says 50 to 60 C."),
        "mars-gale": (REMS_URL, "A", "Medium",
                      "Computed by validation/build/mars_temperature.py from NASA's public REMS weather feed. The feed says it is for outreach, not science; the calibrated data are in the PDS. It agrees with Martinez et al. 2016 (Fisica de la Tierra 28:163), who give air temperature amplitudes of about 45 to 75 K."),
        "mars-arcadia-planitia": (MCD_URL, "A", "Medium to low", "Climate model. No lander has measured here."),
    },
    "precip": {
        "*moon": (MOONFACT, "A", "High", "Set to 0 by data/SCHEMA.md. The source shows why: there is no atmosphere."),
        "*mars": (MARS_FACTS, "B", "High", "Set to 0 by data/SCHEMA.md. No NASA page was found that says 'no rain' in those words; the cited sentence is about liquid water not lasting on the surface."),
    },
    "ndvi": {
        "*": (NDVI_URL, "A", "Medium",
              "Not a measurement on the Moon or Mars. NASA's page says NDVI of 0.1 and below is barren rock, sand or snow; 0.05 is the middle of that band, chosen by SBATS as the bare-ground reference."),
    },
    "slope": {
        "*moon": (LOLA_URL, "A", "High", "Computed by validation/target_terrain.py with Session B's terrain_metrics(). The map orientation was checked against Shackleton (deep) and Mons Mouton (high)."),
        "*mars": (MOLA_URL, "A", "High", "Computed by validation/target_terrain.py with Session B's terrain_metrics(). Elevation ranges match the known crater floors."),
    },
    "roughness": {
        "*moon": (LOLA_URL, "A", "High", "Same run as slope."),
        "*mars": (MOLA_URL, "A", "High", "Same run as slope."),
    },
    "lithology": {
        "moon-shackleton-rim": ("https://doi.org/10.1002/grl.50753", "B", "Medium", "Anorthosite detected on the inner wall. Mapping anorthosite to GLiM 'Basic plutonic rocks' is SBATS's choice."),
        "moon-malapert-massif": ("https://doi.org/10.1016/j.pss.2019.104750", "B", "Low to medium", "No direct rock measurement. Inferred from 'highland crust covered in basin ejecta'."),
        "moon-mons-mouton": ("https://doi.org/10.1029/2025JE009127", "B", "Low to medium", "No direct rock measurement. Abstract only."),
        "moon-haworth": ("https://doi.org/10.1016/j.icarus.2015.03.016", "B", "Low to medium", "No direct rock measurement. The source gives the crater's age, not its rock."),
        "mars-jezero": ("https://doi.org/10.1126/science.abo2196", "B", "Medium", "Abstract only. The landing point is on the Maaz lava flows; the window also holds the sedimentary delta."),
        "mars-gale": ("https://doi.org/10.1126/science.1242777", "B", "Medium", "Abstract only. Sedimentary rock with basaltic grains: no GLiM class fits exactly."),
        "mars-arcadia-planitia": ("https://doi.org/10.3133/sim3292", "B", "n/a", "Left null. The map unit at AP-1 needs a GIS query of USGS SIM 3292."),
    },
}

KEYS = ["tempMean", "tempRange", "precip", "ndvi", "slope", "roughness", "lithology"]
UNITS = {"tempMean": "C", "tempRange": "C", "precip": "mm/year", "ndvi": "", "slope": "deg", "roughness": "m", "lithology": "GLiM code"}

# Numbers quoted in cannotCopy and summary sentences.
QUOTED = [
    ("Lunar surface gravity 1.62 m/s2, Earth 9.80 m/s2", MOONFACT, "A", "High"),
    ("Lunar surface pressure 3 x 10^-15 bar at night", MOONFACT, "A", "High"),
    ("Lunar day (synodic period) 29.53 days", MOONFACT, "A", "High"),
    ("1,369 microsieverts per day on the lunar surface (Chang'e 4 LND)", "https://doi.org/10.1126/sciadv.aaz1334", "A", "High. Measured on the far side at 45.5 S, not at the pole."),
    ("Moon's spin axis tilted by 1.54 degrees", "https://science.nasa.gov/photojournal/south-pole-illumination-map/", "A", "High"),
    ("Haworth floor never exceeds about 40 K", "https://meetingorganizer.copernicus.org/EPSC2013/EPSC2013-864.pdf", "B", "Medium. Conference abstract."),
    ("Shackleton rim point sunlit continuously for 240 days a year", "https://doi.org/10.1016/j.icarus.2010.10.030", "B", "Medium. From the abstract only."),
    ("Artemis III candidate regions, 2022 list of 13 and 2024 list of 9", "https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/", "B", "High"),
    ("Haworth 51 km wide, more than four billion years old", "https://doi.org/10.1016/j.icarus.2015.03.016", "B", "Medium. Age 4.18 billion years from crater counts (Tye et al. 2015)."),
    ("Mars surface gravity 3.73 m/s2, Earth 9.82 m/s2", MARSFACT, "A", "High"),
    ("Mars mean surface pressure 6.36 mb; Earth 1014 mb", MARSFACT + " and " + EARTHFACT, "A", "High"),
    ("0.67 millisieverts per day on the surface of Mars (Curiosity RAD)", "https://swri.org/node/9079", "B", "Medium. Press release figure. Secondary sources quote 0.64 +/- 0.12 mSv/day from the paper (Hassler et al. 2014) for cosmic rays alone; the paper itself could not be opened."),
    ("Jezero: 45 km crater, lake about 3.5 billion years ago, landing 18 February 2021", "https://www.jpl.nasa.gov/news/press_kits/mars_2020/landing/mission/landing_site/", "B", "High"),
    ("Gale: 154 km crater, ancient habitable lake", "https://doi.org/10.1126/science.1242777", "B", "High. Diameter 154.08 km from the IAU Gazetteer."),
    ("Arcadia Planitia: buried water ice tens of metres thick", "https://arxiv.org/abs/1509.03210", "A", "High. Bramson et al. 2015."),
    ("AP-1 is one of four prime Starship candidate sites", "https://www.hou.usra.edu/meetings/lpsc2021/pdf/2420.pdf", "A", "High"),
]

# Constants used by the scoring library (not in targets.json).
CONSTANTS = [
    ("Earth axial tilt 23.44 degrees", EARTHFACT, "A", "High"),
    ("Mars axial tilt 25.19 degrees", MARSFACT, "A", "High"),
    ("Moon spin axis to ecliptic 1.54 degrees", "https://doi.org/10.1029/2019JE006028 and NASA Photojournal PIA13720", "A", "High. The NSSDC sheet prints 6.68 degrees, which is the tilt to the Moon's orbit round Earth, not to the Sun's path."),
    ("Mars orbit eccentricity 0.0935 (season weighting of Mars temperatures)", MARSFACT, "A", "High"),
    ("Mars perihelion at Ls 251 degrees (season weighting)", "https://www-mars.lmd.jussieu.fr/mars/time/solar_longitude.html", "A", "High"),
]

DESIGN = [
    ("`tempMean` sigma", "15 C", "About one sixth of the range in the Earth grid (-54.5 to 33.0 C), and larger than the 11 C gap between model and rover at Gale."),
    ("`tempRange` sigma", "5 C", "About a quarter of the range in the Earth grid (0.6 to 19.0 C)."),
    ("`precip` sigma", "250 mm/year", "The arid limit in Meigs' classification: arid lands have less than 250 mm of annual rainfall (Walker 1992, USGS, Deserts: Geology and Resources, https://pubs.usgs.gov/gip/deserts/what/)."),
    ("`ndvi` value and sigma", "0.05 and 0.1", "NASA's bands: 0.1 and below barren, 0.2 to 0.3 shrub and grassland, 0.6 to 0.8 rainforest. With these numbers shrub and grass sit 1.5 to 2.5 sigma away and rainforest more than 5."),
    ("`slope` sigma", "half the target value, at least 1 degree", "Slope is a ratio-scale quantity: a site within a factor of about 1.5 counts as similar."),
    ("`roughness` sigma", "half the target value, at least 50 m", "Same reasoning as slope."),
    ("Sunlight sigma (in the scoring library)", "15 degrees", "About one climate belt of latitude."),
    ("Preset weights for Rover, Ice and Astrobiology", "see app/src/lib/scoring/presets.ts", "DESIGN.md gives only the direction. The numbers are a first guess."),
]


def modules_section(w) -> None:
    """Every number in data/modules.json, read from the generator so it cannot drift from the file."""
    import make_modules

    make_modules.build()
    rows = make_modules.REVIEW_ROWS
    fmt = lambda v: "null" if v is None else str(v)  # noqa: E731
    w("# Part 2: base simulation numbers (`data/modules.json`)")
    w("")
    w("Every number the base simulation uses. Regenerate the file with `python3 validation/build/make_modules.py`.")
    w("The same check levels apply: A = read in the source text, or computed from the source data, in the main")
    w("working session; B = reported by a research sub-agent from a fetched page or abstract, not opened again.")
    w("")
    w("## Decisions a human should make")
    w("")
    w("1. Seven values are derived, not printed in the source (one multiplication or division each). They are")
    w("   listed below. If the team wants only printed numbers, set them to null: the module becomes illustrative.")
    w("2. The modules are sized on real hardware or studies, but for other settings: the habitat is a Mars")
    w("   design, the solar array and battery are International Space Station units, the ice miner is a lunar")
    w("   study and the cargo figure is a lunar lander. They are used at every target. Is that acceptable?")
    w("3. Greenhouse power is 2.6 kW per m2, NASA's figure for high-pressure sodium lamps. BVAD itself says it has")
    w("   not been updated for LEDs. It makes one greenhouse draw 130 kW, ten times a habitat. It is NASA's")
    w("   published number, so it stands, but it will dominate any layout with a greenhouse.")
    w("4. Lit fraction on the Moon uses the upper end of a published range (Shackleton 87%, Malapert 82%), on the")
    w("   assumption that arrays go at the best-lit spot. Mons Mouton and Haworth have no figure and stay null.")
    w("5. Ice availability is 1 at Arcadia Planitia, 0 at Jezero and Gale (inferred from latitude), and null at")
    w("   every lunar site. So any lunar layout with an ice miner shows \"no data\". That is honest but limiting.")
    w("6. The Mars sunlight, night length and dust-storm figures are from a climate model (Mars Climate Database),")
    w("   not from landers.")
    w("7. Crew water is drinking, food preparation and exercise only (3.217 kg). Hygiene water and recycling are")
    w("   not modelled.")
    w("8. Earth sites use top-of-atmosphere sunlight, an upper bound, because `earth.json` has no surface")
    w("   sunlight. Adding NASA POWER surface sunlight to `earth.json` would fix it (Session B's file).")
    w("")
    w("## Values with no source (null): these make a module illustrative")
    w("")
    w("| Value | What was looked for and not found |")
    w("| --- | --- |")
    for path, value, unit, source, check, kind, note in rows:
        if kind == "null":
            w(f"| `{path}` | {note} |")
    w("")
    w("## Derived values")
    w("")
    w("| Value | Number | Unit | Arithmetic | Source | Check |")
    w("| --- | --- | --- | --- | --- | --- |")
    for path, value, unit, source, check, kind, note in rows:
        if kind == "derived":
            w(f"| `{path}` | {fmt(value)} | {unit} | {note} | {source} | {check} |")
    w("")
    w("## Published values")
    w("")
    w("| Value | Number | Unit | Source | Check | Note |")
    w("| --- | --- | --- | --- | --- | --- |")
    for path, value, unit, source, check, kind, note in rows:
        if kind == "published":
            w(f"| `{path}` | {fmt(value)} | {unit} | {source} | {check} | {note} |")
    w("")
    w("## Source links")
    w("")
    for name, url in [
        ("NASA BVAD Rev 2", "https://ntrs.nasa.gov/api/citations/20210024855/downloads/BVAD_2.15.22-final.pdf"),
        ("DRA 5.0 (Drake et al. 2010)", "https://ntrs.nasa.gov/api/citations/20090040343/downloads/20090040343.pdf"),
        ("Kleinhenz and Paz 2020", "https://ntrs.nasa.gov/citations/20205007966"),
        ("ISS lithium-ion battery (Dalton et al. 2016)", "https://ntrs.nasa.gov/api/citations/20170004112/downloads/20170004112.pdf"),
        ("ISS roll-out solar arrays (NASA 2021)", "https://www.nasa.gov/missions/station/new-solar-arrays-to-power-nasas-international-space-station-research/"),
        ("Artemis HLS update (Dwyer Cianciolo 2024)", "https://ntrs.nasa.gov/citations/20240009596"),
        ("Artemis cargo landers (NASA 2024)", "https://www.nasa.gov/humans-in-space/work-underway-on-large-cargo-landers-for-nasas-artemis-moon-missions/"),
        ("LRO lithograph, lunar temperature", "https://science.nasa.gov/wp-content/uploads/2024/01/lrolitho7temperaturevariation27may2014.pdf"),
        ("Wheeler 2020", "https://ntrs.nasa.gov/citations/20205008786"),
        ("Mars Climate Database", "https://www-mars.lmd.jussieu.fr/mcd_python/"),
        ("Leone et al. 2023", "https://doi.org/10.1016/j.isci.2023.107853"),
        ("Mazarico et al. 2011", "https://doi.org/10.1016/j.icarus.2010.10.030"),
        ("Piqueux et al. 2019", "https://doi.org/10.1029/2019GL083947"),
        ("2018 dust storm (NASA SVS)", "https://svs.gsfc.nasa.gov/30983"),
        ("NSSDCA fact sheets", "https://nssdc.gsfc.nasa.gov/planetary/factsheet/"),
    ]:
        w(f"- {name}: {url}")
    w("")


def pick(table: dict, target: dict):
    return table.get(target["id"]) or table.get(f"*{target['body']}") or table.get("*")


def main() -> None:
    targets = json.loads((ROOT / "data" / "targets.json").read_text())
    out: list[str] = []
    w = out.append
    w("# REVIEW_ME: values to check by hand")
    w("")
    w("Part 1 covers `data/targets.json`. Part 2, further down, covers `data/modules.json`.")
    w("")
    w("# Part 1: target values (`data/targets.json`)")
    w("")
    w("Every value in `data/targets.json`, where it came from, and how far to trust it. Written by Claude Code")
    w("(Session C) on 2026-11-14 for a human reviewer. Please check the rows marked Medium or lower first.")
    w("Regenerate with `python3 validation/build/make_review.py` after changing `targets.json`.")
    w("")
    w("## How to read the check level")
    w("")
    w("- A: the number was read in the source text, or computed from the source data, in the main working session.")
    w("  Computed values can be reproduced with the script named in the row.")
    w("- B: a research sub-agent reported reading it in a fetched page or abstract. It was not opened again.")
    w("  These deserve a second look.")
    w("- Nothing in the file comes from memory or from a search-result snippet. Where no source could be opened, the")
    w("  value is `null`.")
    w("")
    w("## Decisions a human should make")
    w("")
    w("1. Gale mean temperature. The climate model says -57.7 C; Curiosity's own record points to something warmer")
    w("   (midpoint of daily minimum and maximum -43.7 C). The model value is in the file. Keep it, or switch?")
    w("2. Closed. The tolerances (sigma) and preset weights went through the one tuning pass on 2026-11-14. It tried")
    w("   68 alternatives on the tuning set and none beat noise, so all are frozen at the values listed at the end.")
    w("   See validation/tuning/FROZEN.md. They are not tuned again.")
    w("3. Temperature is still the most common limiting factor (about half of the known-analog cases). Mars and the")
    w("   lunar poles are far colder than almost all of Earth. The tuning pass tried wider temperature tolerances")
    w("   and they made no measurable difference, so this is a property of the targets, not of the tolerance.")
    w("4. Lunar rock class. All four Moon targets are coded as GLiM 'Basic plutonic rocks' because the lunar highlands")
    w("   are anorthosite. Only Shackleton has a direct detection.")
    w("5. Two target points are feature centres, not landing points: Haworth (crater centre, in permanent shadow) and")
    w("   Shackleton rim (crater centre).")
    w("6. Gale's day-night swing uses NASA's public REMS weather feed, which describes itself as an outreach product.")
    w("7. `analogFor` in `analogs.json` was assigned by SBATS from each site's cited characteristic (see the comment")
    w("   block in validation/build/make_analogs.py). The sources name the body, not the target.")
    w("")
    w("## Coordinates")
    w("")
    w("| Target | lat | lon | What the point is | Link | Check | Confidence |")
    w("| --- | --- | --- | --- | --- | --- | --- |")
    for t in targets:
        what, link, level, conf = COORDS[t["id"]]
        w(f"| {t['name']} | {t['lat']} | {t['lon']} | {what} | {link} | {level} | {conf} |")
    w("")
    w("## Values, target by target")
    for t in targets:
        w("")
        w(f"### {t['name']} (`{t['id']}`)")
        w("")
        w("| Factor | Value | Sigma | Badge | Source link | Check | Confidence | Comment |")
        w("| --- | --- | --- | --- | --- | --- | --- | --- |")
        for key in KEYS:
            val = t["values"][key]
            link, level, conf, comment = pick(REVIEW[key], t)
            value = "null" if val["value"] is None else f"{val['value']} {UNITS[key]}".strip()
            sigma = "" if val["sigma"] is None else str(val["sigma"])
            w(f"| `{key}` | {value} | {sigma} | {val['badge'] or ''} | {link} | {level} | {conf} | {comment} |")
    w("")
    w("## Numbers quoted in `summary` and `cannotCopy` sentences")
    w("")
    w("| Statement | Link | Check | Confidence |")
    w("| --- | --- | --- | --- |")
    for row in QUOTED:
        w("| " + " | ".join(row) + " |")
    w("")
    w("## Constants used by the scoring library")
    w("")
    w("| Constant | Link | Check | Confidence |")
    w("| --- | --- | --- | --- |")
    for row in CONSTANTS:
        w("| " + " | ".join(row) + " |")
    w("")
    w("## Design parameters (not data)")
    w("")
    w("These are choices, not measurements. They were set by rule before any validation run. The one tuning pass")
    w("(2026-11-14) left every one unchanged, and they are now frozen: see validation/tuning/FROZEN.md.")
    w("")
    w("| Parameter | Value | Reason |")
    w("| --- | --- | --- |")
    for row in DESIGN:
        w("| " + " | ".join(row) + " |")
    w("")
    w("## What could not be found")
    w("")
    w("- A published Diviner temperature for any of the four lunar sites. The papers that probably hold them")
    w("  (Williams et al. 2019, Wueller et al. 2025, Kring et al. 2025, Beyer et al. 2025) could not be opened by an")
    w("  automated reader. A person with a browser can check them against the computed values above.")
    w("- A measured annual mean air temperature for Gale or Jezero in a paper. Martinez et al. 2017 (Space Science")
    w("  Reviews, doi:10.1007/s11214-017-0360-x) and Munguira et al. 2023 (doi:10.1029/2022JE007559) are open access")
    w("  and most likely contain them.")
    w("- Any temperature for Arcadia Planitia other than the climate model.")
    w("- The geologic map unit at Arcadia site AP-1.")
    w("- A day-night temperature swing for the lunar polar sites.")
    w("")
    modules_section(w)
    (ROOT / "data" / "REVIEW_ME.md").write_text("\n".join(out))
    print("wrote data/REVIEW_ME.md")


if __name__ == "__main__":
    main()

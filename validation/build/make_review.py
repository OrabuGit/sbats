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
LOLA_CYL_URL = "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/"
GCP_URL = "https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_gcp/"
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
    "moon-marius-hills": ("The Marius Hills pit, 14.091 N 303.230 E, Wagner and Robinson 2014, Icarus 237:52, Table 2 (read in the open manuscript). The LROC pit atlas gives 14.0917, 303.2299. JAXA's 2017 release gives 14.100 N, 303.262 E, about 1 km away. 'Marius Hills' is an informal name with no IAU Gazetteer entry.", "https://doi.org/10.1016/j.icarus.2014.04.002", "B", "High"),
    "mars-jezero": ("Perseverance landing point, 18.44 N 77.45 E, Rodriguez-Manfredi et al. 2023, Nature Geoscience.", "https://doi.org/10.1038/s41561-022-01084-0", "A", "High"),
    "mars-gale": ("Curiosity landing point, 4.6 S 137.4 E, NASA MSL fact sheet.", "https://solarsystem.nasa.gov/docs/MSL%20Fact%20Sheet%20REV-141119.pdf", "A", "High"),
    "mars-arcadia-planitia": ("Candidate landing site AP-1, 39.8 N 202.1 E (written here as -157.9), Golombek et al. 2021, LPSC abstract 2420, Table 1. The paper does not say whether latitude is planetocentric; at 0.5 degree resolution the difference does not matter.", "https://www.hou.usra.edu/meetings/lpsc2021/pdf/2420.pdf", "A", "High"),
}

# Per-key review rows. key -> {target id or "*moon"/"*mars": (link, check level, confidence, comment)}
REVIEW = {
    "tempMean": {
        "*moon": (PRP_URL, "A", "Medium",
                  "Computed by validation/build/moon_temperature.py from the Diviner Polar Resource Product. It is the Diviner team's modelled annual average at 2 cm depth, not a raw reading, averaged over a 55.6 km window that mixes sunlit ridges and permanently shadowed floors. No paper was found that gives a site temperature to compare with."),
        "moon-marius-hills": (GCP_URL, "A", "Medium to high",
                              "Computed by validation/build/moon_global_temperature.py from the Diviner Global Cumulative Products: mean of the measured surface temperature over the 96 local-time steps of one lunar day, 218.5 K. 29 of the 96 steps had no observation and were filled by straight-line interpolation (longest gap two steps). Cross-check: Williams et al. 2017 state 215.5 K for the equator. NOT THE SAME STATISTIC as the polar targets, which carry a modelled annual mean at 2 cm depth. The score clamps both to Earth's coldest cell (-54.5 C), so the difference does not change a score. It is the open surface, not the pit interior."),
        "mars-jezero": (MCD_URL, "A", "Medium",
                        "Climate model, not a measurement. Cross-check: the MEDA team's summary of 'around -55 C' (UPV/EHU release, read by a research agent on phys.org, not in the paper text)."),
        "mars-gale": (MCD_URL, "A", "Medium to low",
                      "Climate model. DISAGREES WITH THE ROVER: the midpoint of REMS daily minimum and maximum is -43.7 C over 4,717 sols; the model's figure for that same statistic is -54.6 C. The model value is used so that all three Mars targets share one definition (a true 24-hour mean, like Earth's). A human should decide whether to keep it. With sigma 15 C the choice changes scores only slightly."),
        "mars-arcadia-planitia": (MCD_URL, "A", "Medium to low", "Climate model. No lander has measured here and no published site value was found."),
    },
    "tempRange": {
        "*moon": ("", "", "n/a", "Left null on purpose. See the note in targets.json."),
        "moon-marius-hills": (GCP_URL, "A", "Medium",
                              "Same run as the mean: highest step 391.9 K (12.4 h local time) minus lowest 94.4 K (4.9 h). Williams et al. 2017 give 392.3 K and 94.3 K for the equator. A HUMAN SHOULD DECIDE whether a swing over a 29.5-day lunar day belongs in the same field as Earth's daily range. It is far beyond Earth's largest (19 C), so the score clamps it; the four polar targets have no value here."),
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
        "moon-marius-hills": (LOLA_CYL_URL, "A", "High", "Computed by validation/target_terrain.py from the LOLA 512 pixels per degree global grid (59 m), tile LDEM_512_00N_45N_270_360, block-averaged to 463 m like every other target. The two polar-grid targets re-measured in the same run reproduce their published values."),
    },
    "roughness": {
        "*moon": (LOLA_URL, "A", "High", "Same run as slope."),
        "*mars": (MOLA_URL, "A", "High", "Same run as slope."),
        "moon-marius-hills": (LOLA_CYL_URL, "A", "High", "Same run as slope. Elevations in the window run from -2317 m to -843 m."),
    },
    "lithology": {
        "moon-shackleton-rim": ("https://doi.org/10.1002/grl.50753", "B", "Medium", "Anorthosite detected on the inner wall. Mapping anorthosite to GLiM 'Basic plutonic rocks' is SBATS's choice."),
        "moon-malapert-massif": ("https://doi.org/10.1016/j.pss.2019.104750", "B", "Low to medium", "No direct rock measurement. Inferred from 'highland crust covered in basin ejecta'."),
        "moon-mons-mouton": ("https://doi.org/10.1029/2025JE009127", "B", "Low to medium", "No direct rock measurement. Abstract only."),
        "moon-haworth": ("https://doi.org/10.1016/j.icarus.2015.03.016", "B", "Low to medium", "No direct rock measurement. The source gives the crater's age, not its rock."),
        "moon-marius-hills": ("https://doi.org/10.1029/2010JE003725", "B", "Medium to high", "Mare basalt: Besse et al. 2011 ('mare basalts', domes and cones in a 'high-calcium pyroxene' unit) and Lawrence et al. 2013 (domes 'not rich in silica'). Abstracts only, read by a research agent."),
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
    ("Marius Hills pit 58 by 49 m wide and 40 m deep", "https://doi.org/10.1016/j.icarus.2014.04.002", "B", "Medium. Wagner and Robinson 2014, Table 2, from LROC images at about 1 m. SOURCES DISAGREE: the discovery paper (Haruyama et al. 2009, doi:10.1029/2009GL040635) gives 65 m wide and 80 to 88 m deep from 10 m SELENE images; an early LROC post gives 34 m deep."),
    ("Radar echo patterns around the pit that fit intact lava tubes", "https://doi.org/10.1002/2017GL074998", "B", "Medium. Kaku et al. 2017, abstract only. The '50 km tube' figure is in JAXA's press release, not the abstract, and is not used. Wagner and Robinson 2014 argue that mare pits are 'likely to be post-flow features rather than volcanic skylights', which is why the summary says the link to a tube is not confirmed."),
    ("Marius Hills surface 392 K at midday and 94 K before dawn", GCP_URL, "A", "High. Computed here; matches Williams et al. 2017 for the equator."),
    ("Pits give some protection from cosmic rays, solar radiation and micrometeorites", "https://www.nasa.gov/solar-system/nasas-lro-finds-lunar-pits-harbor-comfortable-temperatures/", "B", "Medium. NASA release of 26 July 2022. De Angelis et al. 2002 (doi:10.1269/jrr.43.S41) studied the radiation case; its dose figures could not be opened."),
    ("About 290 K (17 C) in the shadowed part of a pit", "https://doi.org/10.1029/2022GL099710", "A", "Medium. Horvath et al. 2022, read in full. The figure is a model of the Mare Tranquillitatis pit, NOT Marius Hills. An older estimate for lunar caves is 253 K (Horz 1985, quoted by Wagner and Robinson 2014)."),
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


# The 14 null values of 2026-11-14, ranked by what they block. (rank, value, effect, second search, now)
NULL_RANKING = [
    ("1", "`sites.moon-mons-mouton.litFraction`", "Solar power is \"no data\", so no layout at this target gets a power balance or a readiness colour", "Found: Bryant 2009, JPL IPN Progress Report 42-176, Table 3 (summit, 77.43%). Cross-checked on the LOLA illumination map (0.75)", "0.77"),
    ("2", "`sites.moon-haworth.litFraction`", "Same, at Haworth", "No paper gives a figure. Measured instead on the LOLA illumination map: the target point is in permanent shadow", "0"),
    ("3", "`sites.moon-shackleton-rim.iceAvailability`", "An ice miner placed here makes water and oxygen \"no data\". The miner is the only water source in the model", "Not found. Surface ice is detected inside the crater (Lemelin et al. 2021: 34 detections, at most 0.17% water-equivalent hydrogen), none on the rim, and no mined grade anywhere", "null"),
    ("4", "`sites.moon-haworth.iceAvailability`", "Same, at Haworth", "Not found. Surface ice is detected (80 detections; 0.31% or 0.44% water-equivalent hydrogen, two instruments), but that is not a grade for the top metre of ground", "null"),
    ("5", "`sites.moon-mons-mouton.iceAvailability`", "Same, at Mons Mouton", "Not found. No direct detection in the VIPER area (Beyer et al. 2025); ice-stability maps are models", "null"),
    ("6", "`sites.moon-malapert-massif.iceAvailability`", "Same, at Malapert Massif", "Not found. No statement about the massif itself; the nearest shadowed area is in Malapert crater", "null"),
    ("7", "`sites.moon-malapert-massif.longestDarkHours`", "The battery check against the longest dark period shows \"no data\", and the lunar night event falls back to 14 days", "Found: Bryant 2009, Table 3 (12.86 days at the Malapert alpha peak)", "309 (derived)"),
    ("8", "`sites.moon-mons-mouton.longestDarkHours`", "Same, at Mons Mouton", "Found: Bryant 2009, Table 3 (9.48 days at the summit)", "228 (derived)"),
    ("9", "`sites.moon-haworth.longestDarkHours`", "Same, at Haworth", "Not applicable: the target point is in permanent shadow. No figure for the landing region beside it", "null"),
    ("10", "`modules.habitat.heatingKwPerDegC`", "Heating is left out of habitat power at every target, and the habitat is marked illustrative", "Not found in a usable form. Schunk et al. 2022 give 1,550 W for a 100-hour lunar eclipse, with no outside temperature to divide by", "null"),
    ("11", "`modules.habitat.comfortTempC`", "Nothing while rank 10 is null", "Not searched again. A source exists (BVAD Rev 2, Table 4-73: 295.15 K nominal)", "null"),
    ("12", "`modules.greenhouse.waterKgPerM2Day`", "Greenhouse water demand is left out, with a note", "Not searched again. BVAD gives uptake (11.79 kg per m2 per day for wheat), not net make-up water", "null"),
    ("13", "`modules.landingPad.massKg`", "Only the delivered-mass total; the pad is marked illustrative", "Not searched again. Published figures range from 0.5 t to 282 t by building method", "null"),
    ("14", "`events.marsDustStorm.solarFactor`", "Nothing: every Mars site carries its own factor", "Not searched again", "null"),
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
    derived_count = sum(1 for r in rows if r[5] == "derived")
    w(f"1. {derived_count} values are derived, not printed in the source (one multiplication or division each). They are")
    w("   listed below. If the team wants only printed numbers, set them to null: the module becomes illustrative.")
    w("2. The modules are sized on real hardware or studies, but for other settings: the habitat is a Mars")
    w("   design, the solar array and battery are International Space Station units, the ice miner is a lunar")
    w("   study and the cargo figure is a lunar lander. They are used at every target. Is that acceptable?")
    w("3. Greenhouse power is 2.6 kW per m2, NASA's figure for high-pressure sodium lamps. BVAD itself says it has")
    w("   not been updated for LEDs. It makes one greenhouse draw 130 kW, ten times a habitat. It is NASA's")
    w("   published number, so it stands, but it will dominate any layout with a greenhouse.")
    w("4. Lit fraction on the Moon assumes the arrays stand at the best-lit spot near the target: the upper end of a")
    w("   published range (Shackleton 87%, Malapert 82%), and for Mons Mouton the 2009 figure for its summit (77%),")
    w("   24 km from the target's centre point. Haworth is 0: its target point is the crater centre, in permanent")
    w("   shadow. Is 'best-lit spot nearby' the right rule, and is Haworth better moved to the landing region?")
    w("5. Ice availability is 1 at Arcadia Planitia, 0 at Jezero, Gale and Marius Hills (inferred), and null at")
    w("   the four polar lunar sites. So a polar layout with an ice miner shows \"no data\". Ice is detected at the")
    w("   surface in Haworth and inside Shackleton, but no source gives a grade a miner could be scaled by.")
    w("9. Shackleton's longest dark period changed on 2026-11-15 from 36 to 66 hours. The earlier figure could not")
    w("   be confirmed in its stated source on a second search. The new one is read from Glaser et al. 2018,")
    w("   Table 2 (array 2 m above ground). At ground level the same study gives 221 hours.")
    w("10. The Malapert and Mons Mouton dark periods and the Mons Mouton lit fraction come from a 2009 JPL study on")
    w("    a radar elevation model made before LOLA. The LOLA illumination map agrees with its lit fractions to")
    w("    within a few percent (validation/build/moon_illumination.py), but has no dark-period figure to check.")
    w("11. Marius Hills is lit half the time with a 354-hour night (derived from the length of the lunar day).")
    w("    Nothing about the inside of the pit is modelled.")
    w("6. The Mars sunlight, night length and dust-storm figures are from a climate model (Mars Climate Database),")
    w("   not from landers.")
    w("7. Crew water is drinking, food preparation and exercise only (3.217 kg). Hygiene water and recycling are")
    w("   not modelled.")
    w("8. Earth sites use top-of-atmosphere sunlight, an upper bound, because `earth.json` has no surface")
    w("   sunlight. Adding NASA POWER surface sunlight to `earth.json` would fix it (Session B's file).")
    w("")
    w("## Null values ranked by how much they matter to the sandbox (review of 2026-11-15)")
    w("")
    w("On 2026-11-14 the file held the word `null` 43 times. That was 14 values: each stores a null value, a null")
    w("source and a null badge (42), and the word appears once in the file's own description. The 14 are ranked below by what they block in the")
    w("sandbox. The top 10 were searched for a second time in NASA technical reports and mission papers. Four")
    w("could be filled. The rest stay null, as do ranks 11 to 14, which were not searched again.")
    w("")
    w("| Rank | Value | What it blocks in the sandbox | Second search | Now |")
    w("| --- | --- | --- | --- | --- |")
    for row in NULL_RANKING:
        w("| " + " | ".join(row) + " |")
    w("")
    w("Check levels for this review: the Bryant 2009 table, the Glaser 2018 tables and the Lemelin 2021 rows were")
    w("read in the saved source texts in the main session (A). Everything else in the 'Second search' column was")
    w("reported by a research sub-agent (B).")
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


def part3(w) -> None:
    """Named places, target minerals and rover figures (added 2026-11-15)."""
    import make_rovers
    import make_target_minerals

    known = json.loads((ROOT / "data" / "known_sites.json").read_text())
    make_rovers.build()
    w("")
    w("# Part 3: named places, target minerals and rover figures (added 2026-11-15)")
    w("")
    w("Three files compiled with research sub-agents under one rule: every value must be read in a source opened in")
    w("that session, never typed from memory. The main session then checked the items below. None of these files")
    w("enters the all-round score.")
    w("")
    w("## `data/known_sites.json`: places on the Moon and Mars a user can pick")
    w("")
    c = known["meta"]["counts"]
    w(f"{len(known['sites'])} places: {c['moon']['landing-site']} lunar and {c['mars']['landing-site']} Mars landing sites, "
      f"{c['moon']['candidate-region']} lunar and {c['mars']['candidate-region']} Mars candidate regions. Each row has its citation, URL and the")
    w("quoted line the coordinates were read from (`quote`). Built by `validation/build/make_known_sites.py`.")
    w("")
    w("Checked in the main session (check level A): all 27 lunar landing rows were found again, digit for digit, in")
    w("NASA's two NSSDCA pages fetched on 2026-11-15 (the Apollo coordinates page and the table of spacecraft on the")
    w("Moon). The six Mars landers that cite NASA catalogue pages (Viking 1 and 2, Pathfinder, Spirit, Opportunity,")
    w("Phoenix) were found again on those pages the same day. Curiosity, Perseverance, InSight and Zhurong (rover")
    w("waypoint files and papers) agree with the values the team already held, and Curiosity, Perseverance, Marius")
    w("Hills, Shackleton and Arcadia AP-1 fall within 3 km of the curated targets. The candidate regions are check")
    w("level B (sub-agent only): please spot-check those before the demo.")
    w("")
    w("Decisions a human should make:")
    w("")
    w("1. Artemis III regions. NASA published no coordinates for the nine regions of October 2024. The file uses the")
    w("   centre of the LROC image mosaic made for each region, rounded by LROC to 0.1 degree (about 3 km). 'Nobile Rim 1'")
    w("   and 'Mons Mouton' share one mosaic and are one entry. 'de Gerlache Rim 2' uses LROC's single 'de Gerlache Rim'")
    w("   mosaic. 'Slater Plain' has no published point and is left out.")
    w("2. Surveyor positions are the newer LROC-imaged ones in NASA's table; NASA's older Surveyor page differs by up to")
    w("   0.12 degrees (Surveyor 7).")
    w("3. Luna 9 is low confidence: NASA says the coordinates are from the original press report and may be 10 km off.")
    w("4. Phoenix is NASA's 'nominal' position. Opportunity uses the stated touchdown point; the same NASA page prints the")
    w("   ellipse centre with what looks like a W/E typo.")
    w("5. Oxia Planum has four published centres up to about 100 km apart (Harris 2024 is used).")
    w("6. Schrodinger is the IAU basin centre, not a landing point. Compton-Belkovich is the LROC image centre.")
    w("7. Mars sources do not always say whether latitude is planetocentric. At most 0.4 degrees apart.")
    w("8. Not found, so not listed: a Chang'e 7 or ILRS site, Mars Sample Return or Ice Mapper regions.")
    w("9. `targetId` is computed: the curated target within 27.8 km. 'Midway' (a Mars 2020 finalist beside Jezero) and")
    w("   the VIPER area therefore resolve to the Jezero and Mons Mouton targets. Is that the wanted behaviour?")
    w("")
    w("## `data/target_minerals.json`: minerals reported at the targets")
    w("")
    w("Built by `validation/build/make_target_minerals.py`. FT = the paper's full text was read by the sub-agent; ABS =")
    w("abstract only. Re-read in the saved texts in the main session: the Jezero olivine and carbonate figures (Farley,")
    w("Wiens), the Gale clay names (Rampe) and the EMIT library names. The Gale abundance ranges are check level B.")
    w("")
    w("| Target | Mineral | Family | How | Instrument | Abundance | Source | Read |")
    w("| --- | --- | --- | --- | --- | --- | --- | --- |")
    for tid, t in make_target_minerals.TARGETS.items():
        for m in t["minerals"]:
            w(f"| {tid} | {m['name']} | {m['family']} | {m['method']} | {m['instrument']} | {m['abundance'] or ''} | {m['source']} {m['url'] or ''} | {m['access']} |")
    w("")
    w("Decisions a human should make:")
    w("")
    w("1. The mineral families and the EMIT name fragments that define them are SBATS's own grouping. 'Smectite clay' on")
    w("   the Earth side is mostly EMIT's nontronite; at Gale it is saponite and a montmorillonite-like clay. Is one")
    w("   family for all smectites acceptable?")
    w("2. An EMIT family counts when matched in at least 1% of the clear pixels. A display rule, not tuned.")
    w("3. Gale's siderite: 1 to 3% (Thorpe 2022) and 4.8 to 10.5% (Tutolo 2025) are different parts of the section.")
    w("   Tridymite is 34% of the crystalline part (Rampe 2020) and about 14% of the whole sample (Morris 2016): the same")
    w("   sample, two ways of counting. The file quotes Rampe.")
    w("4. Arcadia Planitia and three lunar polar targets have no published mineral result and are empty on purpose.")
    w("5. EMIT's own documentation says validation is still needed for minerals outside its ten core ones (jarosite,")
    w("   nontronite and the hematite grain-size variants are outside). Treat every 'shared' as a pointer.")
    w("")
    w("## Wind, dust and ice (`data/target_environment.json`, and the tolerances in `app/src/lib/match/extras.ts`)")
    w("")
    w("Decisions a human should make:")
    w("")
    w("1. Tolerances: wind 2.0 m/s, optical depth 0.12, ice share 0.25. The first two are a quarter of the spread")
    w("   between the 5th and 95th percentile of Earth's land cells; the third is a quarter of the 0 to 1 scale.")
    w("   Written down before any site was compared, and not tuned. Are these the right widths?")
    w("2. Mars wind and dust are climate model values (Mars Climate Database, 10 m wind, column dust optical")
    w("   depth). Gale's 12.6 m/s is far above the other two sites and matches no place on Earth: probably the")
    w("   model's coarse grid at the crater wall. Curiosity's own wind record would be the better source.")
    w("3. Earth 'dust' is aerosol optical depth of all particles (NASA POWER AOD_55). Smoke and pollution over Java")
    w("   read like Mars dust by number. The dimension is labelled 'Dust and aerosol' and the note says so. If the")
    w("   team prefers, drop the similarity for this dimension and show the two values only.")
    w("4. Antarctica reads an aerosol optical depth of exactly 0.00 in every cell: the product is rounded to 0.01.")
    w("5. Lunar 'ice' is the share of the window that never warms above 110 K (stability, not detection). Earth")
    w("   'ice' is the permafrost share, mapped north of 25 N only. They are compared as 'ground that holds or can")
    w("   hold ice'. Mars has no value yet.")
    w("6. Wind on Mars pushes about a hundredth as hard as the same wind on Earth. A wind match is not a load match.")
    w("")
    w("## `data/rovers.json`: slope limits and speeds")
    w("")
    w("Built by `validation/build/make_rovers.py`. A = the quoted words were found again in the saved source text in the")
    w("main session; B = sub-agent only.")
    w("")
    w("| Rover | Figure | Value | Unit | Source | Check | Note |")
    w("| --- | --- | --- | --- | --- | --- | --- |")
    for rover, field, value, unit, source, url, check, note, derived in make_rovers.REVIEW:
        w(f"| {rover} | {field}{' (derived)' if derived else ''} | {value} | {unit} | {source} {url} | {check} | {note} |")
    w("")
    w("Decisions a human should make:")
    w("")
    w("1. Which limit is 'the' limit. The file uses the operating rule where one is published (Perseverance and")
    w("   Curiosity 30 degrees, the Mars Exploration Rovers 25) and the design requirement otherwise (VIPER 15, the")
    w("   Apollo rover 25). The other published figures are kept beside it.")
    w("2. The Apollo rover's energy rate (75.6 Wh per km) is 2.1 ampere-hours per km times 36 volts: the multiplication")
    w("   is ours. It is used only for a lunar route and never adjusted for slope.")
    w("3. Not found in a primary source and left out: Zhurong, Yutu, Lunokhod, the Artemis terrain vehicle, and any")
    w("   energy figure for a Mars rover.")
    w("")


def pick(table: dict, target: dict):
    return table.get(target["id"]) or table.get(f"*{target['body']}") or table.get("*")


def main() -> None:
    targets = json.loads((ROOT / "data" / "targets.json").read_text())
    out: list[str] = []
    w = out.append
    w("# REVIEW_ME: values to check by hand")
    w("")
    w("Part 1 covers `data/targets.json`. Part 2, further down, covers `data/modules.json`. Part 3 covers the named")
    w("places, target minerals and rover figures added on 2026-11-15.")
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
    w("8. Marius Hills (added 2026-11-15) is SBATS's own choice of a lava-tube target. It is not a NASA landing region,")
    w("   the pit's link to an open tube is not confirmed, and its temperature is a different statistic from the polar")
    w("   targets (measured surface mean against modelled mean at 2 cm depth). It has no known Earth analog listed, so")
    w("   it takes no part in validation: the frozen validation numbers are those of the other seven targets.")
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
    part3(w)
    (ROOT / "data" / "REVIEW_ME.md").write_text("\n".join(out))
    print("wrote data/REVIEW_ME.md")


if __name__ == "__main__":
    main()

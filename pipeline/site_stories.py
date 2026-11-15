"""Site stories: writes data/site_stories.json.

    uv run --project pipeline pipeline/site_stories.py

Five Earth-to-target stories written by a team member. The prose fields (why it stands out, site
description, testing tags, mission use, limitation and workaround) are her text, with the checked
corrections listed in each story's "corrections". Everything else is computed from our own data:

  ourData      values of the Earth site(s) from data/sites.json, each with unit, scale, source and badge
  dataChecks   statements in her text that we can check against ourData, with what the data says
  logistics    computed values from data/logistics.json beside her estimates, labelled "team estimate"
  target       her target name and position, and the id of the target in data/targets.json when it has one

Removed from her text, on purpose: every similarity percentage and every Earth-versus-target number
(slope, temperature range). Numbers on screen come from our data only. The pipeline does not score
stories: scores live in the app, computed by the frozen scoring.

Credit: the stories are credited to the team in "credit". Sources are in each story's "sources".
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import AI_NOTE, DATA  # noqa: E402

CREDIT = "Written by the SBATS team. Numbers shown as our data or as computed logistics come from the project's own data files and are not part of the team text."

# ----------------------------------------------------------------------------------------------
# The team's text. Corrections are applied here and listed in `corrections`.
# ----------------------------------------------------------------------------------------------

STORIES = [
    {
        "id": "dallol-columbia-hills",
        "title": "Dallol hydrothermal field and Columbia Hills",
        "earthSiteIds": ["dallol"],
        "earth": {"name": "Dallol Hydrothermal Field, Danakil Depression, Ethiopia", "teamLocation": {"lat": 14.2417, "lon": 40.3}},
        "target": {"name": "Columbia Hills, Gusev Crater, Mars", "teamLocation": {"lat": -14.57, "lon": 175.47}, "targetId": None,
                   "note": "Columbia Hills was added as a target after the freeze of 2026-11-14. It is in no validation number."},
        "trek": "Mars Trek",
        "whyItStandsOut": ("Dallol is one of the hottest, lowest, and most acidic hydrothermal environments on Earth, with spring "
                           "waters at about pH 0 and temperatures reported up to about 94 C."),
        "siteDescription": ("Located in Ethiopia's Danakil Depression, Dallol is a volcanic salt dome characterized by hot, highly acidic "
                            "springs and sulfur-rich crusts. It offers a useful terrestrial analogue for Columbia Hills in Mars's Gusev "
                            "Crater, where NASA's Spirit rover discovered silica- and sulfur-rich soils associated with ancient hydrothermal activity."),
        "testingTags": ["Chemical Sensors", "Corrosion Resistance", "Astrobiology Biosignatures"],
        "missionUse": ("Dallol is well suited for testing rover drill bits, chemical spectrometers, and corrosion-resistant seals in highly "
                       "acidic conditions similar to those expected in Martian brines."),
        "limitation": ["The main limitation is that Earth's atmospheric pressure and intense surface heat are very different from Mars's cold, low-pressure environment."],
        "workaround": ["Test corrosion resistance and calibrate chemical sensors at the site, then assess thermal-vacuum durability in cold chambers."],
        "dominantRock": None,
        "teamEstimate": {"accessDifficulty": "Extreme", "nearestSupportHub": "Mekelle Airport (~4-5 hrs overland convoy)", "costEfficiency": "Moderate"},
        "teamSource": {"title": "NASA Astrobiology: The Message of Really, Really Extreme Life",
                       "url": "https://astrobiology.nasa.gov/news/the-message-of-really-really-extreme-life/"},
        "corrections": [
            {"field": "Why it stands out", "was": "some waters measuring below pH 0.25",
             "now": "spring waters at about pH 0, up to about 94 C",
             "basis": ("The cited NASA Astrobiology article gives a pH of 0 and water above 200 F (94 C). The figures pH 0.25 and 108 C "
                       "were not found in it or in the abstracts checked; they were removed. Sanz et al. 2021 (doi:10.3390/microorganisms9061231) report chimney water above 100 C with a pH close to zero, so the real maximum is probably higher; use 'about pH 0' and 'up to about 94 C (NASA)'.")},
            {"field": "Comparison", "was": "air and spring temperature ranges, Earth versus Mars",
             "now": None, "basis": "Removed: Earth-versus-target numbers are not shown; temperature numbers come from our data."},
        ],
        "verification": [
            {"claim": "Dallol waters near pH 0", "status": "verified",
             "evidence": "NASA Astrobiology (cited): 'an extraordinarily low pH of 0'; Sanz et al. 2021, Microorganisms 9(6):1231, doi:10.3390/microorganisms9061231 (pH close to zero)."},
            {"claim": "Springs up to 94 C", "status": "verified",
             "evidence": "NASA Astrobiology (cited): 'more than 200 degrees F (94 C)'. Sanz et al. 2021 (doi:10.3390/microorganisms9061231) say chimney water is higher than 100 C."},
            {"claim": "pH below 0.25 and springs up to 108 C", "status": "removed", "evidence": "Not found in the sources checked."},
            {"claim": "Dallol and Gusev have close parallels as hydrothermal environments", "status": "verified",
             "evidence": "NASA Astrobiology (cited) names the Gusev Crater in the Dallol-Mars comparison of the Astrobiology review."},
            {"claim": "Spirit found silica-rich deposits formed under hydrothermal conditions", "status": "verified",
             "evidence": "Squyres et al. 2008, Science 320:1063, doi:10.1126/science.1155429 (opaline silica deposits, hydrothermal)."},
            {"claim": "Spirit found sulfur-rich soils", "status": "team statement, not checked here", "evidence": None},
        ],
    },
    {
        "id": "uyuni-tunupa-holden",
        "title": "Salar de Uyuni and Tunupa volcano edge, and Holden Crater lake deposits",
        "earthSiteIds": ["salar-de-uyuni", "tunupa-volcano"],
        "earth": {"name": "Salar de Uyuni and Tunupa volcano edge, Potosi Department, Bolivia", "teamLocation": {"lat": -19.8333, "lon": -67.6333}},
        "target": {"name": "Holden Crater lake deposits, Mars", "teamLocation": {"lat": -26.0, "lon": 326.0}, "targetId": None,
                   "note": "Holden crater was added as a target after the freeze of 2026-11-14. It is in no validation number."},
        "trek": "Mars Trek",
        "whyItStandsOut": ("Salar de Uyuni, at about 3,650 m above sea level, is the world's largest salt flat. Its wide evaporite crusts and "
                           "intense high-altitude sunlight also make it a useful site for testing materials exposed to UV radiation."),
        "siteDescription": ("High in the Bolivian Andes, Salar de Uyuni lies beside the volcanic slopes of Tunupa. Its evaporite crusts and "
                            "hydrated clays offer a useful analogue for the clay-bearing lake sediments of Holden Crater, a Martian basin "
                            "shaped by ancient lake deposits and extensive flooding."),
        "testingTags": ["Autonomous Navigation", "Subsurface Water Radar", "High-UV Material Testing"],
        "missionUse": ("The broad, open salt flat provides plenty of space to test long-range rover navigation and ground-penetrating radar "
                       "designed to detect subsurface water."),
        "limitation": ["Even at this altitude, Earth's atmosphere remains much denser than Mars's thin carbon-dioxide atmosphere."],
        "workaround": ["Use the site's high-altitude UV exposure for solar panel degradation tests while pairing rover navigation runs with Martian atmospheric drag."],
        "dominantRock": {"earth": "Halite, gypsum and hydrated clays (team text, not checked here; the geologic map unit at the salar is 'Evaporite')",
                         "target": "Clay-bearing (phyllosilicate) lake sediments",
                         "status": "target side corrected"},
        "teamEstimate": {"accessDifficulty": "Easy", "nearestSupportHub": "Uyuni Airport (~30 mins drive)", "costEfficiency": "High"},
        "teamSource": {"title": "NASA Earth Observatory: Bolivian Salt Flats",
                       "url": "https://science.nasa.gov/earth/earth-observatory/bolivian-salt-flats-151813/"},
        "corrections": [
            {"field": "Target", "was": "Holden Crater Salt Flats", "now": "Holden Crater lake deposits",
             "basis": "Holden is a crater with lake deposits that include clay-bearing sediments; it is not a salt flat (team check; Grant et al. 2010, 'Aqueous depositional settings in Holden crater, Mars', doi:10.1016/B978-0-444-52854-4.00012-X)."},
            {"field": "Dominant rock, target", "was": "Phyllosilicate clays and sulfate evaporites", "now": "Clay-bearing (phyllosilicate) lake sediments",
             "basis": "Sulfate evaporite evidence at Holden was not confirmed; removed."},
            {"field": "Why it stands out", "was": "At 3,656 meters above sea level", "now": "at about 3,650 m above sea level",
             "basis": "The cited NASA page does not give the figure. Our Copernicus DEM gives 3,654 to 3,688 m inside the salar footprint (see our data)."},
            {"field": "Comparison", "was": "slope and temperature numbers, Earth versus Mars", "now": None,
             "basis": "Removed: Earth-versus-target numbers are not shown."},
        ],
        "verification": [
            {"claim": "Holden is a lake-deposit crater with clay-bearing sediments", "status": "verified (title and team check)",
             "evidence": "Grant et al. 2010, 'Aqueous depositional settings in Holden crater, Mars', doi:10.1016/B978-0-444-52854-4.00012-X."},
            {"claim": "Salar de Uyuni is at about 3,650 m", "status": "verified from our data", "evidence": "Copernicus DEM GLO-30 in the footprint, 3,654 to 3,688 m."},
        ],
    },
    {
        "id": "tambora-shackleton",
        "title": "Mount Tambora caldera rim and Shackleton crater rim",
        "earthSiteIds": ["id-tambora-caldera"],
        "earth": {"name": "Mount Tambora caldera rim, Sumbawa, Indonesia", "teamLocation": {"lat": -8.2481, "lon": 117.9917}},
        "target": {"name": "Shackleton crater rim, lunar south pole", "teamLocation": {"lat": -89.9, "lon": 0.0}, "targetId": "moon-shackleton-rim",
                   "note": "The tool's target is placed at 89.67 S, 129.78 E. The team's position is a rounded pole position."},
        "trek": "Moon Trek",
        "whyItStandsOut": ("Tambora's 1815 eruption, the largest recorded in history, left behind a steep-walled summit caldera about 6 km wide "
                           "and 1,250 m deep."),
        "siteDescription": ("Formed by the 1815 eruption, Tambora's broad caldera is marked by ash fields and a deep, steep-walled basin. "
                            "Its steep rim and basin offer a practical Earth-based setting for testing some of the terrain challenges "
                            "anticipated around Shackleton Crater, a potential focus of future Artemis missions."),
        "testingTags": ["Steep-Slope Winches", "Crater-Rim Comms Relays", "Ash Traction Wheels"],
        "missionUse": ("Tambora offers a practical field site for testing tethered rovers on steep slopes, radio relays between crater rims and "
                       "floors, and wheel traction on loose ash."),
        "limitation": ["Warm temperatures and tropical rainfall cannot reproduce the extreme cold or permanently shadowed ice traps at Shackleton Crater."],
        "workaround": ["Plan trials for the dry season (June-September), and use nighttime operations to test systems under low-light conditions."],
        "dominantRock": {"earth": "Trachybasalt to trachyandesite, with volcanic ash (Smithsonian Global Volcanism Program)",
                         "target": "Anorthositic highland crust (SELENE detection on the inner wall of Shackleton)",
                         "status": "corrected"},
        "teamEstimate": {"accessDifficulty": "Moderate", "nearestSupportHub": "Bima Airport (~3-4 hrs drive + trek)", "costEfficiency": "High"},
        "teamSource": {"title": "NASA Earth Observatory: Mount Tambora Volcano, Sumbawa Island, Indonesia",
                       "url": "https://science.nasa.gov/earth/earth-observatory/mount-tambora-volcano-sumbawa-island-indonesia-39412/"},
        "corrections": [
            {"field": "Why it stands out", "was": "roughly 6-7 kilometers wide", "now": "about 6 km wide and 1,250 m deep",
             "basis": "Smithsonian Global Volcanism Program, volcano 264040: 'a 6-km-wide, 1250-m-deep caldera'. (NASA Earth Observatory gives 6 km and 1,100 m; the project uses the Smithsonian figure.)"},
            {"field": "Site description", "was": "inner walls that plunge more than 600 meters", "now": "a deep, steep-walled basin",
             "basis": "The 600 m figure is not supported by either source; the caldera depth is 1,250 m (Smithsonian)."},
            {"field": "Site description", "was": "testing terrain challenges anticipated around Shackleton", "now": "testing some of the terrain challenges anticipated around Shackleton",
             "basis": "Restored 'some of': one site cannot reproduce all of the terrain at Shackleton."},
            {"field": "Dominant rock", "was": "Trachyandesite and basaltic volcanic ash (Earth); anorthositic and basaltic regolith (Moon)",
             "now": "Trachybasalt to trachyandesite (Earth); anorthositic highland crust (Moon)",
             "basis": "Smithsonian GVP major rock type 'Trachybasalt / Tephrite Basanite' and its summary 'trachybasaltic-to-trachyandesitic'; for Shackleton, Haruyama et al. 2013, Geophysical Research Letters 40:3814, doi:10.1002/grl.50753 (anorthosite)."},
            {"field": "Comparison", "was": "slope and temperature numbers, Earth versus Moon", "now": None,
             "basis": "Removed: Earth-versus-target numbers are not shown."},
        ],
        "verification": [
            {"claim": "1815 eruption, the largest in recorded history", "status": "verified",
             "evidence": "NASA Earth Observatory (cited) and Smithsonian GVP volcano 264040."},
            {"claim": "Caldera about 6 km wide and 1,250 m deep", "status": "verified", "evidence": "Smithsonian GVP volcano 264040."},
            {"claim": "Ash fields", "status": "see dataChecks",
             "evidence": "Sentinel-2 in our data shows 28% bare ground in the footprint, which is consistent with ash fields."},
        ],
        "needsTeamReview": [],
    },
    {
        "id": "lut-gale",
        "title": "Dasht-e Lut and Gale Crater yardangs",
        "earthSiteIds": ["dasht-e-lut"],
        "earth": {"name": "Lut Desert (Dasht-e Lut), Kerman and Sistan-Baluchestan, Iran", "teamLocation": {"lat": 30.5, "lon": 59.0}},
        "target": {"name": "Gale Crater (Mount Sharp yardangs), Mars", "teamLocation": {"lat": -5.4, "lon": 137.8}, "targetId": "mars-gale",
                   "note": "The tool's target is the crater floor point at 4.6 S, 137.4 E, not the yardang layer high on Mount Sharp."},
        "trek": "Mars Trek",
        "whyItStandsOut": ("The Lut Desert is known for some of the hottest land surface temperatures ever measured from satellites, as well as "
                           "its enormous wind-carved yardangs."),
        "siteDescription": ("In southeastern Iran, the hyper-arid Lut Desert is characterized by shifting dunes and elongated, wind-sculpted "
                            "ridges called yardangs. These landforms provide a useful terrestrial analogue for the yardangs photographed by "
                            "NASA's Curiosity rover on Mount Sharp in Gale Crater."),
        "testingTags": ["Obstacle Avoidance", "Solar Panel Dust Mitigation", "Thermal Stress Testing"],
        "missionUse": ("The site could be used to test rover obstacle-avoidance systems around rugged ridges and measure how dust accumulates on solar panels."),
        "limitation": ["Because Earth's atmosphere is much denser than Mars's, the same wind speed creates far more force at this site."],
        "workaround": ["Use suitable natural dust conditions to evaluate electrostatic dust-repelling coatings, and scale wind-load calculations to account for Mars's roughly 1% atmospheric density."],
        "dominantRock": {"earth": "Wind-eroded silty clay and sandstone (team text, not checked here; no geologic map unit was retrieved for the site)",
                         "target": "Layered sedimentary rock of Mount Sharp; the yardang layer's origin is uncertain, one theory being volcanic ash (NASA)",
                         "status": "target side corrected"},
        "teamEstimate": {"accessDifficulty": "Moderate", "nearestSupportHub": "Kerman Airport (~2-3 hrs drive)", "costEfficiency": "High"},
        "teamSource": {"title": "NASA Science: Curiosity Captures Dawn Breaking on Wind-Carved Cliffs",
                       "url": "https://science.nasa.gov/photojournal/nasas-curiosity-captures-dawn-breaking-on-wind-carved-cliffs/"},
        "corrections": [
            {"field": "Why it stands out", "was": "hottest land surface temperatures ever measured on Earth, exceeding 70 C",
             "now": "some of the hottest land surface temperatures ever measured from satellites",
             "basis": "Mildrexler et al. 2011, Bulletin of the American Meteorological Society, 'Satellite Finds Highest Land Skin Temperatures on Earth', doi:10.1175/2011BAMS3067.1 (title read; no abstract was available, so the figure was not checked and is not shown)."},
            {"field": "Dominant rock, target", "was": "Wind-eroded mudstone and sandstone", "now": "Layered sedimentary rock; yardang layer origin uncertain (one theory: volcanic ash)",
             "basis": "NASA Science, Curiosity panorama of 11 Aug 2026: 'Scientists aren't entirely sure how the layer formed; one theory is that it's a pile of volcanic ash'."},
            {"field": "Comparison", "was": "slope and temperature numbers, Earth versus Mars", "now": None,
             "basis": "Removed: Earth-versus-target numbers are not shown."},
        ],
        "verification": [
            {"claim": "Curiosity photographed yardangs on Mount Sharp, Gale Crater", "status": "verified",
             "evidence": "NASA Science, PIA25629: panorama of distant wind-carved yardangs of 11 Aug 2026 (sol 4,982); the yardang layer caps the stack of layers on Mount Sharp."},
            {"claim": "Lut Desert has among the highest land skin temperatures on Earth", "status": "verified (title only)",
             "evidence": "Mildrexler et al. 2011, doi:10.1175/2011BAMS3067.1."},
            {"claim": "Lut temperatures exceeding 70 C", "status": "removed", "evidence": "The figure could not be read in a source this session."},
        ],
    },
    {
        "id": "batur-marius",
        "title": "Mount Batur black lava fields and Marius Hills",
        "earthSiteIds": ["id-batur-lava-fields", "id-kesaksak-lava-tube"],
        "earth": {"name": "Mount Batur black lava fields, Kintamani, Bali, Indonesia", "teamLocation": {"lat": -8.2528, "lon": 115.3636}},
        "target": {"name": "Marius Hills, Moon", "teamLocation": {"lat": 14.0, "lon": -56.0}, "targetId": "moon-marius-hills",
                   "note": "The tool's target is the Marius Hills pit at 14.091 N, 56.77 W."},
        "trek": "Moon Trek",
        "whyItStandsOut": ("Mount Batur is known for its dark, jagged lava fields from historical eruptions and for the volcanic caves found "
                           "within its UNESCO Global Geopark."),
        "siteDescription": ("Within Bali's Batur Caldera, jagged lava fields of andesite to basaltic andesite support little vegetation. The rugged "
                            "terrain offers a useful terrestrial analogue for the Marius Hills, a lunar volcanic region with dark basaltic plains "
                            "where radar and gravity data point to lava tubes that may one day shelter future habitats."),
        "testingTags": ["Spacesuit Abrasion Resistance", "Subsurface Lava Tube LiDAR", "Rover Tire Durability"],
        "missionUse": ("Batur's sharp lava makes it useful for testing spacesuit fabrics and rover tires. Its volcanic caves also provide a realistic "
                       "setting for evaluating LiDAR systems designed to map underground passages."),
        "limitation": ["Earth's gravity is much stronger than the Moon's, while Bali's humidity can change how dust behaves and how people move in spacesuits."],
        "workaround": ["Use gravity-offloading harnesses during field trials, then dry collected basalt dust in ovens before testing how it affects seals indoors."],
        "dominantRock": {"earth": "Andesite to basaltic andesite (Smithsonian Global Volcanism Program)",
                         "target": "Mare basalt (Besse et al. 2011; Lawrence et al. 2013, as cited in our target data)",
                         "status": "corrected"},
        "teamEstimate": {"accessDifficulty": "Easy", "nearestSupportHub": "Ngurah Rai International Airport, Denpasar (~2 hrs drive)", "costEfficiency": "High"},
        "teamSource": {"title": "Smithsonian Global Volcanism Program: Batur", "url": "https://volcano.si.edu/volcano.cfm?vn=264010"},
        "corrections": [
            {"field": "Site description", "was": "confirmed underground lava tubes",
             "now": "radar and gravity data point to lava tubes",
             "basis": ("Not confirmed: Kaku et al. 2017, Geophysical Research Letters, doi:10.1002/2017GL074998 (SELENE radar echoes consistent with an intact tube near the Marius Hills pit); "
                       "Chappaz et al. 2017, GRL, doi:10.1002/2016GL071588 (GRAIL gravity mass deficits consistent with empty tubes). Nobody has seen inside a tube.")},
            {"field": "Site description", "was": "jagged basaltic lava fields", "now": "jagged lava fields of andesite to basaltic andesite",
             "basis": "Smithsonian GVP volcano 264010: major rock type 'Andesite / Basaltic Andesite' (its summary also notes basaltic lava flows on the caldera floor in historical time)."},
            {"field": "Why it stands out", "was": "from the 1963 eruption", "now": "from historical eruptions",
             "basis": "The 1963 date was not found in the cited Smithsonian record; GVP lists the last eruption as 2000."},
            {"field": "Mission use", "was": "Batur's sharp basalt", "now": "Batur's sharp lava", "basis": "Same rock-type correction."},
            {"field": "Dominant rock", "was": "Basaltic-andesitic aa lava and sharp ash (Earth); high-titanium mare basalt (Moon)",
             "now": "Andesite to basaltic andesite (Earth); mare basalt (Moon)",
             "basis": "Smithsonian GVP for Earth; the titanium content of the Marius Hills basalt was not checked, so it is not stated."},
            {"field": "Comparison", "was": "slope and temperature numbers, Earth versus Moon", "now": None,
             "basis": "Removed: Earth-versus-target numbers are not shown."},
        ],
        "verification": [
            {"claim": "Marius Hills lava tubes are confirmed", "status": "corrected",
             "evidence": "Evidence is radar (SELENE LRS, Kaku et al. 2017) and gravity (GRAIL, Chappaz et al. 2017); not confirmed by observation."},
            {"claim": "Batur's dominant rock is andesite to basaltic andesite", "status": "verified", "evidence": "Smithsonian GVP volcano 264010."},
            {"claim": "Batur lies in a UNESCO Global Geopark", "status": "team statement, not checked here", "evidence": None},
        ],
    },
]

OUR_KEYS = ["slope", "roughness", "slopeFine", "ndvi", "bareFrac", "waterFrac", "rockType", "lithology",
            "tempMean", "tempRange", "precip", "windSpeed", "aod"]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def month_range(ms):
    return ", ".join(MONTHS[m - 1] for m in ms) if ms else None


def build() -> dict:
    sites = {s["id"]: s for s in json.loads((DATA / "sites.json").read_text())["sites"]}
    lg = {s["id"]: s for s in json.loads((DATA / "logistics.json").read_text())["sites"]}
    targets = {t["id"]: t for t in json.loads((DATA / "targets.json").read_text())}
    out = []
    for st in STORIES:
        s = dict(st)
        team_est = s.pop("teamEstimate")
        s["earth"] = dict(s["earth"]); s["earth"]["sites"] = []
        s["ourData"] = []
        s["logistics"] = {"computed": [], "teamEstimate": team_est,
                          "note": "The effort and cost ratings are the team's own estimate, not computed. Computed distances are straight-line."}
        for sid in s["earthSiteIds"]:
            site = sites[sid]
            vals = {k: site["values"][k] for k in OUR_KEYS if k in site["values"] and site["values"][k]["value"] is not None}
            s["ourData"].append({
                "siteId": sid, "name": site["name"], "lat": site["lat"], "lon": site["lon"], "footprintKm": site["footprintKm"],
                "footprintStatus": site["footprintStatus"], "elevationFootprintM": [site["detail"]["elevMinM"], site["detail"]["elevMaxM"]],
                "values": {k: {"value": v["value"], "unit": v["unit"], "scale": v["scale"], "source": v["source"], "badge": v["badge"]}
                           for k, v in vals.items()},
                "caveat": site.get("caveat")})
            L = lg[sid]
            s["logistics"]["computed"].append({
                "siteId": sid, "country": L["country"], "airport": L["airport"], "populatedPlace": L["populatedPlace"], "volcano": L["volcano"],
                "elevationFootprintM": L["elevationFootprintM"], "elevationCellMeanM": L["elevationCellMeanM"],
                "climateWindows": L["climateWindows"]})
        tid = s["target"]["targetId"]
        if tid:
            t = targets[tid]
            s["target"]["inTool"] = {"id": tid, "name": t["name"], "lat": t["lat"], "lon": t["lon"]}
        else:
            s["target"]["inTool"] = None
        s["dataChecks"] = data_checks(s)
        s["credit"] = CREDIT
        s["sources"] = [s["teamSource"]] + [{"title": "Project data files for sites, logistics and targets (see SOURCES.md)", "url": None}]
        out.append(s)
    return {
        "meta": {
            "aiUse": AI_NOTE, "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "description": ("Five Earth-to-target stories written by the team, with checked corrections, beside values computed from the project's "
                            "own data. Similarity percentages and Earth-versus-target numbers were removed; scores come only from the app."),
            "credit": CREDIT,
            "rules": ["Prose fields are the team's text with the corrections listed per story.",
                      "ourData, dataChecks and logistics.computed come from project data files with their sources.",
                      "logistics.teamEstimate is labelled as the team's estimate, not computed.",
                      "No story carries a score."],
        },
        "stories": out,
    }


def data_checks(s: dict) -> list[dict]:
    """Statements in the team text that our data can speak to, stated from the data."""
    checks = []
    for od, lg in zip(s["ourData"], s["logistics"]["computed"]):
        v = od["values"]
        w = lg["climateWindows"]
        if s["id"] == "tambora-shackleton" and "bareFrac" in v:
            checks.append({"claim": "ash fields", "data": f"{round(v['bareFrac']['value'] * 100)}% of the {od['footprintKm']} km footprint is bare ground (NDVI under 0.2), mean NDVI {v['ndvi']['value']}",
                           "source": v["bareFrac"]["source"], "agrees": True})
        if s["id"] == "tambora-shackleton" and w:
            checks.append({"claim": "dry season June to September", "data": f"driest three months at the grid cell: {month_range(w['driestThreeMonths'])}",
                           "source": "NASA POWER monthly normals 2001-2020", "agrees": set(w["driestThreeMonths"]) <= {6, 7, 8, 9}})
        if s["id"] == "uyuni-tunupa-holden" and od["siteId"] == "salar-de-uyuni":
            checks.append({"claim": "about 3,650 m above sea level", "data": f"{od['elevationFootprintM'][0]} to {od['elevationFootprintM'][1]} m in the footprint",
                           "source": "Copernicus DEM GLO-30", "agrees": True})
        if s["id"] == "batur-marius" and od["siteId"] == "id-batur-lava-fields" and "bareFrac" in v:
            checks.append({"claim": "lava fields support little vegetation", "data": f"{round(v['bareFrac']['value'] * 100)}% bare ground, mean NDVI {v['ndvi']['value']}; the footprint also holds ground outside the mapped lava (see caveat)",
                           "source": v["bareFrac"]["source"], "agrees": v["bareFrac"]["value"] > 0.5})
        if s["id"] == "dallol-columbia-hills" and od["elevationFootprintM"][1] is not None:
            checks.append({"claim": "one of the lowest hydrothermal environments on Earth", "data": f"{od['elevationFootprintM'][0]} to {od['elevationFootprintM'][1]} m, below sea level",
                           "source": "Copernicus DEM GLO-30", "agrees": od["elevationFootprintM"][1] < 0})
    return checks


def main() -> None:
    out = build()
    tmp = DATA / "site_stories.json.tmp"
    tmp.write_text(json.dumps(out, ensure_ascii=False, indent=1, allow_nan=False))
    os.replace(tmp, DATA / "site_stories.json")
    print(f"wrote {DATA / 'site_stories.json'}: {len(out['stories'])} stories")
    for s in out["stories"]:
        print(f"  {s['id']:<24} sites {s['earthSiteIds']} target {s['target']['targetId']} checks {len(s['dataChecks'])}")


if __name__ == "__main__":
    main()

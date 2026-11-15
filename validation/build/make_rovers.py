"""Writes data/rovers.json: published slope limits and speeds of rovers, for the route calculation.

Every number is read in a cited source. `check` (written to data/REVIEW_ME.md, not to the JSON):
  A  the quoted words were found again in the saved source text in the main session
  B  reported by a research sub-agent from the full text; not found again by a text search
     (scanned reports do not search well)
Converted values (cm/s to m per hour, ampere-hours per km to watt-hours per km) are marked derived
and show the arithmetic.

There is no energy model against slope: none was found that is published, simple and citable. The one
energy figure is the Apollo rover's measured rate on the Moon, and it applies to that vehicle on the
Moon only.

Run from the repository root:  python3 validation/build/make_rovers.py

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REVIEW = []  # (rover, field, value, unit, source, url, check, note)

M2020 = ("NASA, Mars 2020 Perseverance rover components page", "https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/")
JPLMOB = ("NASA/JPL Robotics, Mars 2020 rover mobility page", "https://robotics.jpl.nasa.gov/what-we-do/flight-projects/mars-2020-rover/m2020mobility/")
RANKIN = ("Rankin, Maimone, Biesiadecki, Patel, Levine and Toupet 2020, Driving Curiosity: Mars Rover Mobility Trends During the First Seven Years (JPL)", "https://www-robotics.jpl.nasa.gov/media/documents/2020-mobility-trending.pdf")
BIES = ("Biesiadecki, Leger and Maimone 2007, International Journal of Robotics Research 26(1):91, doi:10.1177/0278364907073777", "https://doi.org/10.1177/0278364907073777")
LEGER = ("Leger et al. 2005, Mars Exploration Rover Surface Operations: Driving Spirit at Gusev Crater (JPL)", "https://www-robotics.jpl.nasa.gov/media/documents/leger_driving05.pdf")
VIPER = ("Bluethmann 2024, VIPER Rover Overview and Mobility and Hardware (NASA NTRS 20240013903)", "https://ntrs.nasa.gov/citations/20240013903")
VIPER_OPS = ("NASA, VIPER lunar operations page", "https://science.nasa.gov/mission/viper/lunar-operations/")
VIPER_BRIEF = ("NASA 2025, VIPER updated technical briefing", "https://assets.science.nasa.gov/content/dam/science/psd/lunar-science/documents/2025-02-13_VIPER_Updated_Technical_Briefing_Presentation-Shared.pdf")
COSTES = ("Costes, Farmer and George 1972, Mobility Performance of the Lunar Roving Vehicle, NASA TR R-401 (NTRS 19730008090)", "https://ntrs.nasa.gov/citations/19730008090")
A17 = ("Apollo 17 Mission Report, JSC-07904 (NASA NTRS 19730015117)", "https://ntrs.nasa.gov/citations/19730015117")
APSR = ("Apollo Program Summary Report, JSC-09423, 1975, Table 4-IX and section 4.8 (NASA NTRS 19750013242)", "https://ntrs.nasa.gov/citations/19750013242")
PDS_MPF = ("NASA PDS, Mars Pathfinder rover instrument host description", "https://pds.nasa.gov/data/mpfr-m-apxs-2-edr-v1.0/mprv_0001/document/insthost.htm")


def fig(rover, field, value, unit, kind, src, check, note=None, derived=False):
    REVIEW.append((rover, field, value, unit, src[0], src[1], check, note or "", derived))
    out = {"value": value, "unit": unit, "kind": kind, "source": src[0], "url": src[1], "badge": "Literature"}
    if derived:
        out["derived"] = True
    if note:
        out["note"] = note
    return out


def build():
    REVIEW.clear()
    return [
        {
            "id": "perseverance", "name": "Perseverance (Mars 2020)", "body": "mars", "crewed": False,
            "slopeLimit": fig("perseverance", "slopeLimit", 30, "degrees", "tilt that rover drivers avoid", M2020, "A",
                              "'rover drivers avoid terrains that would tilt the rover more than 30 degrees'."),
            "otherSlopeFigures": [fig("perseverance", "otherSlope", 45, "degrees", "tilt it is designed to withstand without tipping over", M2020, "A")],
            "speed": fig("perseverance", "speed", 152, "m per hour", "top speed on flat, hard ground", M2020, "A"),
            "otherSpeeds": [fig("perseverance", "otherSpeed", 110, "m per hour", "approximate rate when driving autonomously", JPLMOB, "A")],
            "energy": None,
        },
        {
            "id": "curiosity", "name": "Curiosity (Mars Science Laboratory)", "body": "mars", "crewed": False,
            "slopeLimit": fig("curiosity", "slopeLimit", 30, "degrees", "nominal flight tilt limit", RANKIN, "A",
                              "'the nominal flight tilt limit is 30 degrees. However, the tilt limit is typically lowered for each drive'. The largest tilt in the first seven years was 25.3 degrees."),
            "otherSlopeFigures": [],
            "speed": fig("curiosity", "speed", 150, "m per hour", "maximum wheel speed (4.2 cm per second)", JPLMOB, "A",
                         "'maximum wheel speed is just 4.2 cm/sec (or approximately 150 meters per hour)'."),
            "otherSpeeds": [fig("curiosity", "otherSpeed", 18, "m per hour", "upper end of the rate when driving autonomously (15 to 18 m per hour)", JPLMOB, "B")],
            "energy": None,
        },
        {
            "id": "mer", "name": "Spirit and Opportunity (Mars Exploration Rovers)", "body": "mars", "crewed": False,
            "slopeLimit": fig("mer", "slopeLimit", 25, "degrees", "slope above which a drive needs special planning", BIES, "A",
                              "'driving on slopes greater than 25 degrees requires special planning'. The rovers drove on hard slopes of up to 31 degrees and are statically stable to 45."),
            "otherSlopeFigures": [
                fig("mer", "otherSlope", 31, "degrees", "steepest hard slope driven", BIES, "B"),
                fig("mer", "otherSlope", 10, "degrees", "sandy slope that can already block progress", LEGER, "B"),
            ],
            "speed": fig("mer", "speed", 124, "m per hour", "directed driving, the fastest mode", BIES, "A"),
            "otherSpeeds": [fig("mer", "otherSpeed", 36, "m per hour", "autonomous navigation", BIES, "B")],
            "energy": None,
        },
        {
            "id": "sojourner", "name": "Sojourner (Mars Pathfinder)", "body": "mars", "crewed": False,
            "slopeLimit": None,
            "otherSlopeFigures": [],
            "speed": fig("sojourner", "speed", 24, "m per hour", "top speed", PDS_MPF, "A", "Derived: 'top speed of 0.4 m/min' x 60.", derived=True),
            "otherSpeeds": [],
            "energy": None,
        },
        {
            "id": "viper", "name": "VIPER (lunar polar rover)", "body": "moon", "crewed": False,
            "slopeLimit": fig("viper", "slopeLimit", 15, "degrees", "design requirement", VIPER, "A",
                              "'Slopes up to 15 deg (reqt)'. NASA's operations page adds that it can tackle 25 or 30 degrees when necessary."),
            "otherSlopeFigures": [fig("viper", "otherSlope", 30, "degrees", "upper end of what it can tackle when necessary (25 or 30 degrees)", VIPER_OPS, "B")],
            "speed": fig("viper", "speed", 720, "m per hour", "top speed", VIPER_BRIEF, "A", "Derived: 'Top Speed: 20cm/s' x 3600 / 100.", derived=True),
            "otherSpeeds": [fig("viper", "otherSpeed", 360, "m per hour", "prospecting speed", VIPER_BRIEF, "B", "Derived: 10 cm/s x 3600 / 100.", derived=True)],
            "energy": None,
        },
        {
            "id": "lrv", "name": "Apollo Lunar Roving Vehicle", "body": "moon", "crewed": True,
            "slopeLimit": fig("lrv", "slopeLimit", 25, "degrees", "specified maximum slope", COSTES, "B",
                              "The same report puts the wheel's climbing ability on simulated lunar soil at 18 to 23 degrees; the Apollo 17 crew found slopes of up to 20 degrees easy."),
            "otherSlopeFigures": [fig("lrv", "otherSlope", 20, "degrees", "slope the Apollo 17 crew negotiated easily, straight ahead", A17, "B")],
            "speed": fig("lrv", "speed", 7600, "m per hour", "average speed while driving, Apollo 17 (the lowest of the three missions)", APSR, "B",
                         "Mission averages were 9.2, 7.7 and 7.6 km per hour."),
            "otherSpeeds": [fig("lrv", "otherSpeed", 9200, "m per hour", "average speed while driving, Apollo 15 (the highest)", APSR, "B")],
            "energy": fig("lrv", "energy", 75.6, "Wh per km", "measured mission rate, Apollo 16 (the highest of the three missions)", APSR, "B",
                          "Derived: 2.1 ampere-hours per km x 36 volts. The three missions used 1.9, 2.1 and 1.64 ampere-hours per km. Measured on the Moon, "
                          "at one sixth of Earth's gravity, for this vehicle with two astronauts. It is a mission average, not a function of slope.", derived=True),
        },
    ]


def main() -> None:
    rovers = build()
    out = {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "note": ("Published slope limits and speeds of rovers, each with its source, for app/src/lib/route. slopeLimit is the limit used "
                     "in operations or stated as the design requirement; otherSlopeFigures are shown for context. speed gives a lower bound "
                     "on driving time. A rover with no published figure has null."),
            "energyNote": ("No published, simple, citable model of rover energy against slope was found. The only energy figure is the Apollo "
                           "rover's measured rate on the Moon. Do not apply it to another vehicle, another body, or a slope."),
            "notFound": ["Zhurong, Yutu and Lunokhod slope limits and speeds in a primary source", "an Artemis Lunar Terrain Vehicle requirement document", "energy per metre for any Mars rover"],
            "generatedBy": "validation/build/make_rovers.py",
        },
        "rovers": rovers,
    }
    path = ROOT / "data" / "rovers.json"
    path.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    print(f"wrote {path.relative_to(ROOT)}: {len(rovers)} rovers, {len(REVIEW)} sourced figures")


if __name__ == "__main__":
    main()

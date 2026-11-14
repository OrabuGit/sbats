"""Writes data/modules.json: every number the base simulation uses, each with its source.

Rules (team, 2026-11-14): every number needs a real cited source. A value that cannot be sourced is
null, its module is "illustrative", and it is listed in data/REVIEW_ME.md. Nothing here is invented.

Three kinds of value appear, and each is marked:
- published   the number is printed in the source.
- derived     one multiplication or division of numbers printed in the same source (for example
              16.25 kg/kWe x 20 kWe). `derived: true`, and the note shows the arithmetic.
- null        no source found. The note says what was looked for.

`check` is not written to the JSON; it feeds data/REVIEW_ME.md:
  A = read in the source text, or computed from the source data, in the main working session
  B = reported by a research sub-agent from a fetched page or abstract, not opened again

Run from the repository root:  python3 validation/build/make_modules.py

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

BVAD = "NASA Life Support Baseline Values and Assumptions Document, NASA/TP-2015-218570/REV2 (2022)"
DRA5 = "Drake, Hoffman and Beaty 2010, Human Exploration of Mars, Design Reference Architecture 5.0, IEEE Aerospace Conference (NASA NTRS 20090040343)"
KP = "Kleinhenz and Paz 2020, Case Studies for Lunar ISRU Systems Utilizing Polar Water, AIAA ASCEND (NASA NTRS 20205007966)"
ISS_BATT = "Dalton et al. 2016, International Space Station Lithium-Ion Battery, NASA Aerospace Battery Workshop (NASA NTRS 20170004112)"
IROSA = "NASA 2021, New Solar Arrays to Power NASA's International Space Station Research, nasa.gov"
NSSDC_EARTH = "NASA NSSDCA Earth Fact Sheet"
NSSDC_MOON = "NASA NSSDCA Moon Fact Sheet"
HLS = "Dwyer Cianciolo 2024, Artemis Human Landing System Update, NASA EDL Summer Seminar (NASA NTRS 20240009596)"
CARGO = "NASA 2024, Work Underway on Large Cargo Landers for NASA's Artemis Moon Missions, nasa.gov"
LRO_LITHO = "NASA LRO lithograph LG-2013-11-084-GSFC, Temperature Variation on the Moon"
WHEELER = "Wheeler 2020, Bioregenerative Life Support for Humans in Space (NASA NTRS 20205008786)"
MCD = "Mars Climate Database v6.2 (LMD/OU/IAA/ESA/CNES), incident solar flux on a horizontal surface (validation/build/mars_sunlight.py)"
LEONE = "Leone et al. 2023, iScience 26:107853, doi:10.1016/j.isci.2023.107853"
MAZARICO = "Mazarico et al. 2011, Icarus 211:1066, doi:10.1016/j.icarus.2010.10.030"
PIQUEUX = "Piqueux et al. 2019, Geophysical Research Letters 46:14290, doi:10.1029/2019GL083947"
BRAMSON = "Bramson et al. 2015, Geophysical Research Letters 42, doi:10.1002/2015GL064844; Golombek et al. 2021, LPSC abstract 2420"
SVS = "NASA Scientific Visualization Studio 30983 and JPL Opportunity status, 2018 global dust storm"

REVIEW_ROWS = []  # (path, value, unit, source, check, kind, note) for data/REVIEW_ME.md


def v(path, value, unit, source, badge="Literature", note=None, derived=False, check="A"):
    if value is None:
        out = {"value": None, "unit": unit, "source": None, "badge": None, "note": note}
        REVIEW_ROWS.append((path, None, unit, source or "", check, "null", note))
        return out
    out = {"value": value, "unit": unit, "source": source, "badge": badge}
    if derived:
        out["derived"] = True
    if note:
        out["note"] = note
    REVIEW_ROWS.append((path, value, unit, source, check, "derived" if derived else "published", note or ""))
    return out


def moon_site(target, lit, lit_note, dark, dark_note, cold_trap_share, lit_check="A", dark_check="B"):
    ice_note = (
        f"No measurement of extractable ice exists for this site. Diviner shows {cold_trap_share}% of the 55.6 km window never "
        "warms above 110 K, where water ice is stable (validation/build/moon_temperature.py). The one direct measurement of lunar "
        "polar water, 5.6 +/- 2.9% by mass, is from the LCROSS impact at Cabeus (Colaprete et al. 2010, Science), a different crater."
    )
    p = f"sites.{target}"
    return {
        "irradianceWm2": v(f"{p}.irradianceWm2", 1361.0, "W/m2", NSSDC_MOON,
                           note="Sunlight at the Moon's distance on an array turned to face the Sun. At the poles the Sun is on the horizon, so arrays stand upright."),
        "litFraction": v(f"{p}.litFraction", lit, "fraction", LEONE if lit is not None else None, note=lit_note, check=lit_check),
        "longestDarkHours": v(f"{p}.longestDarkHours", dark, "hours", MAZARICO if dark is not None else None, note=dark_note, check=dark_check),
        "iceAvailability": v(f"{p}.iceAvailability", None, "fraction of nominal miner output", None, note=ice_note),
    }


def mars_site(target, irradiance, lit, dark, storm, ice, ice_source, ice_note, ice_check):
    p = f"sites.{target}"
    model = "Climate model, not a measurement. Mean over the Mars year, seasons weighted by their length."
    return {
        "irradianceWm2": v(f"{p}.irradianceWm2", irradiance, "W/m2", MCD, note=model + " Mean flux on flat ground while the Sun is up."),
        "litFraction": v(f"{p}.litFraction", lit, "fraction", MCD, note=model + " Share of local hours with any sunlight."),
        "longestDarkHours": v(f"{p}.longestDarkHours", dark, "hours", MCD, note="Longest night of the Mars year, from hourly model output: good to about an hour."),
        "iceAvailability": v(f"{p}.iceAvailability", ice, "fraction of nominal miner output", ice_source, note=ice_note, check=ice_check),
        "dustStormSolarFactor": v(f"{p}.dustStormSolarFactor", storm, "fraction of normal sunlight", MCD,
                                  note="Dust-storm scenario divided by the normal year, at five seasons in the dust-storm season (Ls 210 to 330). Climate model."),
    }


def build():
    REVIEW_ROWS.clear()
    crew = {
        "oxygenKgPerDay": v("crew.oxygenKgPerDay", 0.895, "kg per person per day", f"{BVAD}, Table 3-31"),
        "waterKgPerDay": v("crew.waterKgPerDay", 3.217, "kg per person per day", f"{BVAD}, Table 3-31",
                           note="Potable water: 2.00 kg drinking, 0.5 kg food preparation, 0.717 kg extra for exercise. Hygiene water and water recycling are not modelled."),
        "foodKgPerDay": v("crew.foodKgPerDay", 0.800, "kg dry mass per person per day", f"{BVAD}, Table 3-31", note="Food solids without packaging."),
    }
    constants = {
        "oxygenKgPerKgWater": v("constants.oxygenKgPerKgWater", 0.867, "kg oxygen per kg water", KP, derived=True,
                                note="Derived: 13 t of oxygen from 15 t of water in the study's baseline case (13 / 15)."),
        "solarConstantWm2": v("constants.solarConstantWm2", 1361.0, "W/m2", NSSDC_EARTH, note="Sunlight at Earth's distance, above the atmosphere."),
    }
    modules = {
        "habitat": {
            "label": "Habitat",
            "description": "Crew quarters, sized on the Mars surface habitat of NASA's Design Reference Architecture 5.0: six crew, about 21.5 t, 12.1 kW.",
            "params": {
                "massKg": v("modules.habitat.massKg", 21500, "kg", DRA5, note="'approximately 21.5 t'."),
                "crewCapacity": v("modules.habitat.crewCapacity", 6, "people", DRA5, note="The architecture sends six crew members, housed in one habitat."),
                "powerKw": v("modules.habitat.powerKw", 12.1, "kW", DRA5, note="'using 12.1 kWe of electrical power'. Whatever thermal control that figure includes is not broken out."),
                "heatingKwPerDegC": v("modules.habitat.heatingKwPerDegC", None, "kW per degree C", None,
                                      note="No published heat-loss figure per degree was found for a surface habitat. The heating load is not modelled."),
                "comfortTempC": v("modules.habitat.comfortTempC", None, "degrees C", None,
                                  note="Only needed for the heating load, which is not modelled."),
            },
        },
        "solar": {
            "label": "Solar array",
            "description": "One roll-out solar array of the kind added to the International Space Station (iROSA): more than 20 kW in full sunlight at Earth's distance.",
            "params": {
                "massKg": v("modules.solar.massKg", 325, "kg", f"{BVAD}, Table 3-16", derived=True,
                            note="Derived: 16.25 kg per kW (the table's estimate for the ISS roll-out array producing 20 kW, arrays only) x 20 kW."),
                "ratedPowerKw": v("modules.solar.ratedPowerKw", 20, "kW", IROSA, note="'Each new solar array will produce more than 20 kilowatts'. Dust and heat on a planet's surface are not modelled."),
                "ratedIrradianceWm2": v("modules.solar.ratedIrradianceWm2", 1361.0, "W/m2", NSSDC_EARTH, note="The sunlight the rated power refers to: Earth's distance, above the atmosphere."),
            },
        },
        "battery": {
            "label": "Battery",
            "description": "One lithium-ion battery unit of the kind fitted to the International Space Station: about 15 kWh.",
            "params": {
                "massKg": v("modules.battery.massKg", 197.3, "kg", ISS_BATT, derived=True, note="Derived: specification weight 435 lb x 0.45359 kg per lb."),
                "capacityKwh": v("modules.battery.capacityKwh", 15, "kWh", ISS_BATT, note="'Li-Ion ~15 kWh'. Depth-of-discharge limits are not modelled."),
            },
        },
        "greenhouse": {
            "label": "Greenhouse",
            "description": "A 50 m2 crop chamber under electric light, with wheat as the reference crop. NASA's Wheeler gives about 50 m2 as the area that feeds one person.",
            "params": {
                "massKg": v("modules.greenhouse.massKg", 5075, "kg", f"{BVAD}, Table 4-88", derived=True, note="Derived: 101.5 kg per m2 of growing area x 50 m2."),
                "growingAreaM2": v("modules.greenhouse.growingAreaM2", 50, "m2", WHEELER, check="B",
                                   note="The size chosen for one module: 'about 50 m2' of crops supplies one person's food calories."),
                "foodKgPerM2Day": v("modules.greenhouse.foodKgPerM2Day", 0.020, "kg dry edible mass per m2 per day", f"{BVAD}, Table 4-90", note="Wheat: 20.00 g dry weight per m2 per day."),
                "oxygenKgPerM2Day": v("modules.greenhouse.oxygenKgPerM2Day", 0.056, "kg per m2 per day", f"{BVAD}, Table 4-91", note="Wheat: 56.00 g per m2 per day."),
                "waterKgPerM2Day": v("modules.greenhouse.waterKgPerM2Day", None, "kg net make-up water per m2 per day", None,
                                     note="Wheat takes up 11.79 kg per m2 per day (BVAD Rev 2, Table 4-91), but transpires nearly all of it, and a closed chamber recovers it. No net make-up figure was found, so greenhouse water is left out."),
                "powerKwPerM2": v("modules.greenhouse.powerKwPerM2", 2.6, "kW per m2", f"{BVAD}, Table 4-88",
                                  note="Lamps, ballasts, root zone and fans. Based on high-pressure sodium lamps; BVAD says it has not been updated for LED lighting, which would lower it."),
            },
        },
        "iceMiner": {
            "label": "Ice miner",
            "description": "A lunar polar water plant sized on NASA's baseline ISRU case: 15 t of water in 225 days from regolith holding 5% ice by mass, with electrolysis to oxygen.",
            "params": {
                "massKg": v("modules.iceMiner.massKg", 4900, "kg", KP, note="'Total Mass 4.9 tons' for the whole plant (ridge system, mine system, two water tankers), without its power system."),
                "waterKgPerDay": v("modules.iceMiner.waterKgPerDay", 66.7, "kg per day", KP, derived=True,
                                   note="Derived: 15 t of water collected and processed in 225 days (15,000 / 225). The study assumes 5% ice by mass and 75% extraction."),
                "powerKw": v("modules.iceMiner.powerKw", 20, "kW", KP, note="'approximately 20 kW' for the water extractor subsystem."),
                "electrolysisKwhPerKgOxygen": v("modules.iceMiner.electrolysisKwhPerKgOxygen", 8.31, "kWh per kg oxygen", KP, derived=True,
                                                note="Derived: the electrolysis subsystem draws approximately 20 kW and makes 13 t of oxygen in 225 days (20 kW x 24 h / 57.8 kg per day)."),
            },
        },
        "landingPad": {
            "label": "Landing pad",
            "description": "A place where a large cargo lander can set down. Cargo per landing is the lower figure NASA gives for its Artemis cargo landers.",
            "params": {
                "massKg": v("modules.landingPad.massKg", None, "kg", None, note="No published mass for a prepared lunar or Martian landing pad was found."),
                "cargoKgPerDelivery": v("modules.landingPad.cargoKgPerDelivery", 12000, "kg", CARGO, note="'approximately 26,000 - 33,000 pounds (12 to 15 metric tons) of payload'. The lower figure is used. A lunar lander; no Mars figure was looked for."),
                "maxSlopeDeg": v("modules.landingPad.maxSlopeDeg", 10, "degrees", HLS,
                                 note="'Surface slope for landing (100m): <10 deg', from a seminar slide of Artemis III requirements, not the requirements document. The site slopes it is compared with are means over a 55 km window at 463 m spacing."),
            },
        },
    }
    events = {
        "lunarNight": {
            "label": "Lunar night",
            "description": "No sunlight. At low latitudes it lasts 14 Earth days. At a polar site the simulation uses that site's longest dark period instead, where one is published.",
            "body": "moon",
            "params": {
                "durationDays": v("events.lunarNight.durationDays", 14, "days", LRO_LITHO, note="'a lunar night lasts 14 Earth days'."),
                "solarFactor": v("events.lunarNight.solarFactor", 0, "fraction of normal sunlight", LRO_LITHO, note="Night: the Sun is below the horizon."),
            },
        },
        "marsDustStorm": {
            "label": "Mars dust storm",
            "description": "A planet-wide dust storm like that of 2018. Sunlight at the surface falls to a fraction that depends on the site.",
            "body": "mars",
            "params": {
                "durationDays": v("events.marsDustStorm.durationDays", 54, "days", SVS, derived=True,
                                  note="Derived: the 2018 storm was first detected on 30 May and by 23 July more dust was falling out than being raised (54 days). Dust took until mid-September to clear."),
                "solarFactor": v("events.marsDustStorm.solarFactor", None, "fraction of normal sunlight", None,
                                 note="No single figure: each Mars site carries its own in sites.<id>.dustStormSolarFactor, from the Mars Climate Database."),
            },
        },
    }
    sites = {
        "moon-shackleton-rim": moon_site(
            "moon-shackleton-rim", 0.87,
            "Upper end of the published range for the Shackleton rim (50% to 87% of the time): assumes the arrays stand at the best-lit spot.",
            36, "'longest total darkness about 1.5 days' at the best-lit rim location (1.5 x 24 hours). From the paper's abstract.", 11.1),
        "moon-malapert-massif": moon_site(
            "moon-malapert-massif", 0.82,
            "Upper end of the published range for Malapert Massif (50% to 82%): assumes the arrays stand at the best-lit spot.",
            None, "No published longest dark period for this site was found.", 1.5),
        "moon-mons-mouton": moon_site(
            "moon-mons-mouton", None, "No published share of time in sunlight for this site was found.",
            None, "No published longest dark period for this site was found.", 0.5),
        "moon-haworth": moon_site(
            "moon-haworth", None, "The crater floor is in permanent shadow. No published figure for the landing region beside it was found.",
            None, "No published longest dark period for the landing region was found.", 35.4),
        "mars-jezero": mars_site("mars-jezero", 295.2, 0.501, 13.4, 0.170, 0, PIQUEUX,
                                 "Inferred, not measured at the site: shallow ground ice is reported at latitudes as low as 35 N and 45 S, and Jezero is at 18 N.", "B"),
        "mars-gale": mars_site("mars-gale", 318.7, 0.492, 13.4, 0.219, 0, PIQUEUX,
                               "Inferred, not measured at the site: shallow ground ice is reported at latitudes as low as 35 N and 45 S, and Gale is at 5 S.", "B"),
        "mars-arcadia-planitia": mars_site("mars-arcadia-planitia", 240.7, 0.509, 15.4, 0.102, 1, BRAMSON,
                                           "A widespread layer of excess water ice tens of metres thick, and the site was chosen for its ice. 1 means the miner works at its rated output; the rating itself is a lunar figure.", "A"),
    }
    return {
        "meta": {
            "note": "Module numbers for the SBATS base simulation. Every value has a source; a value with no source is null and its module is illustrative. See data/REVIEW_ME.md.",
            "generatedBy": "validation/build/make_modules.py",
            "aiAssistance": "Compiled with AI assistance (Claude Code) from the cited sources; see AI_USE.md.",
        },
        "crew": crew,
        "constants": constants,
        "modules": modules,
        "events": events,
        "sites": sites,
    }


def main() -> None:
    data = build()
    path = ROOT / "data" / "modules.json"
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    kinds = {}
    for row in REVIEW_ROWS:
        kinds[row[5]] = kinds.get(row[5], 0) + 1
    print(f"wrote {path.relative_to(ROOT)}: {len(REVIEW_ROWS)} values {kinds}")


if __name__ == "__main__":
    main()

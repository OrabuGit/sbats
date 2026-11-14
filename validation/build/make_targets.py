"""Writes data/targets.json from the hand-curated values below.

Every number is written here as a literal, with its source next to it, so that a reviewer can check
each one against data/REVIEW_ME.md. Nothing is computed in this file. The measured values (terrain,
temperature) were produced by the scripts named in the comments and copied in by hand.

Run from the repository root:  python3 validation/build/make_targets.py

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
import json
from pathlib import Path

# --------------------------------------------------------------------------------------------
# Sources (short forms; full rows in SOURCES.md)
# --------------------------------------------------------------------------------------------
LOLA = "LRO LOLA polar gridded DEM LDEM_80S_80M (NASA PDS), measured with pipeline/terrain_metrics.py over a 55.6 km window (validation/target_terrain.py)"
MOLA = "MGS MOLA MEGDR 128 pixels per degree (NASA PDS), measured with pipeline/terrain_metrics.py over a 55.6 km window (validation/target_terrain.py)"
DIVINER = "LRO Diviner Polar Resource Product, PDS LRO-L-DLRE-5-PRP-V2.0 (Paige et al. 2010, Science 330:479): mean of annual average temperature over a 55.6 km window (validation/build/moon_temperature.py)"
MCD = "Mars Climate Database v6.2 (LMD/OU/IAA/ESA/CNES), climatology scenario, air temperature 2 m above the surface (validation/build/mars_temperature.py)"
REMS = "Curiosity REMS daily minimum and maximum air temperature, sols 10 to 4995, NASA Mars weather feed (Centro de Astrobiologia) (validation/build/mars_temperature.py)"
NDVI_SRC = "NASA Earth Observatory, Measuring Vegetation (NDVI and EVI): NDVI of 0.1 and below is barren rock, sand or snow"
PRECIP_MOON = "NASA NSSDC Moon Fact Sheet: surface pressure 3 x 10^-15 bar, so no rain or snow can form"
PRECIP_MARS = "NASA Science, Mars Facts: the atmosphere is too thin for liquid water to last on the surface"

# --------------------------------------------------------------------------------------------
# Tolerances (sigma). These are design parameters, not measurements. See data/REVIEW_ME.md.
# --------------------------------------------------------------------------------------------
SIGMA_TEMP_MEAN = 15.0     # deg C
SIGMA_TEMP_RANGE = 5.0     # deg C
SIGMA_PRECIP = 250.0       # mm/year: the arid limit of Meigs' classification (USGS, Walker 1992)
SIGMA_NDVI = 0.1
NDVI_BARE = 0.05           # middle of the 0 to 0.1 "barren" band


def slope_sigma(value: float) -> float:
    """Half the target slope, at least 1 degree."""
    return round(max(1.0, 0.5 * value), 2)


def roughness_sigma(value: float) -> float:
    """Half the target roughness, at least 50 m."""
    return round(max(50.0, 0.5 * value), 1)


def v(value, sigma, source, badge, note=None):
    out = {"value": value, "sigma": sigma, "source": source, "badge": badge}
    if value is None:
        out = {"value": None, "sigma": None, "source": None, "badge": None}
    if note:
        out["note"] = note
    return out


def terrain(slope, roughness, source):
    if slope is None or roughness is None:
        note = "Not measured yet. Run validation/target_terrain.py."
        return v(None, None, None, None, note), v(None, None, None, None, note)
    return (
        v(slope, slope_sigma(slope), source, "Mission"),
        v(roughness, roughness_sigma(roughness), source, "Mission"),
    )


# GLiM rock class codes (data/SCHEMA.md)
BASIC_VOLCANIC, SILICICLASTIC, BASIC_PLUTONIC = 2, 3, 4

MOON_RANGE_NOTE = (
    "No value. A lunar day lasts 29.53 Earth days and at the pole the Sun circles the horizon, so a "
    "daily max-minus-min swing like Earth's has no counterpart here, and no published site value was found."
)
MOON_CANNOT_COPY = [
    "Gravity: 1.62 m/s2 at the lunar surface against 9.80 m/s2 on Earth, about one sixth (NASA NSSDC Moon Fact Sheet).",
    "Vacuum: the surface pressure at night is about 3 x 10^-15 bar, effectively no atmosphere (NASA NSSDC Moon Fact Sheet).",
    "Radiation: the Chang'e 4 lander measured an average dose equivalent of 1,369 microsieverts per day on the lunar surface, with no atmosphere or magnetic field to shield it (Zhang et al. 2020, Science Advances).",
    "Light: the Moon's spin axis is tilted by only 1.54 degrees (NASA Photojournal PIA13720), so at the pole the Sun stays at the horizon all year, ridges can be lit for months and crater floors never are. Earth's polar day and night do not behave this way.",
    "Day length: one lunar day lasts 29.53 Earth days (NASA NSSDC Moon Fact Sheet), so warm and cold periods last weeks, not hours.",
]
MARS_CANNOT_COPY = [
    "Gravity: 3.73 m/s2 at the surface of Mars against 9.82 m/s2 on Earth, a little over one third (NASA NSSDC Mars Fact Sheet).",
    "Thin atmosphere: the mean surface pressure is 6.36 mb (NASA NSSDC Mars Fact Sheet) against 1014 mb on Earth (NASA NSSDC Earth Fact Sheet), and it is mostly carbon dioxide.",
    "Radiation: Curiosity's RAD instrument measured about 0.67 millisieverts per day on the surface from August 2012 to June 2013 (Southwest Research Institute release, 9 December 2013, on Hassler et al. 2014, Science).",
    "No liquid water: the atmosphere is too thin for liquid water to last on the surface (NASA Science, Mars Facts), so Earth's rain, rivers and wet soil have no counterpart.",
]


def moon(id_, name, lat, lon, summary, temp_mean, slope, roughness, lith, lith_source, lith_note, extra_cannot=()):
    s, r = terrain(slope, roughness, LOLA)
    return {
        "id": id_, "name": name, "body": "moon", "lat": lat, "lon": lon, "summary": summary,
        "values": {
            "tempMean": v(temp_mean, SIGMA_TEMP_MEAN, DIVINER, "Mission",
                          "Annual average at 2 cm depth from the Diviner team's thermal model, averaged over the window. Sunlit ridges and shadowed floors inside the window differ by more than 100 K.")
            if temp_mean is not None else v(None, None, None, None, "Not measured yet. Run validation/build/moon_temperature.py."),
            "tempRange": v(None, None, None, None, MOON_RANGE_NOTE),
            "precip": v(0, SIGMA_PRECIP, PRECIP_MOON, "Literature"),
            "ndvi": v(NDVI_BARE, SIGMA_NDVI, NDVI_SRC, "Literature",
                      "Reference value for bare ground on Earth's NDVI scale. Not measured on the Moon."),
            "slope": s,
            "roughness": r,
            "lithology": v(lith, None, lith_source, "Literature", lith_note),
        },
        "cannotCopy": MOON_CANNOT_COPY + list(extra_cannot),
    }


def mars(id_, name, lat, lon, summary, temp_mean, temp_mean_note, temp_range, temp_range_source, temp_range_badge,
         temp_range_note, slope, roughness, lith, lith_source, lith_note):
    s, r = terrain(slope, roughness, MOLA)
    return {
        "id": id_, "name": name, "body": "mars", "lat": lat, "lon": lon, "summary": summary,
        "values": {
            "tempMean": v(temp_mean, SIGMA_TEMP_MEAN, MCD, "Literature", temp_mean_note),
            "tempRange": v(temp_range, SIGMA_TEMP_RANGE, temp_range_source, temp_range_badge, temp_range_note),
            "precip": v(0, SIGMA_PRECIP, PRECIP_MARS, "Literature"),
            "ndvi": v(NDVI_BARE, SIGMA_NDVI, NDVI_SRC, "Literature",
                      "Reference value for bare ground on Earth's NDVI scale. Not measured on Mars."),
            "slope": s,
            "roughness": r,
            "lithology": v(lith, None, lith_source, "Literature", lith_note) if lith is not None
            else v(None, None, None, None, lith_note),
        },
        "cannotCopy": MARS_CANNOT_COPY,
    }


HIGHLAND_NOTE = (
    "GLiM class 4, Basic plutonic rocks. Chosen by SBATS: lunar highland crust is anorthosite, a plutonic rock "
    "of calcium-rich feldspar. {detail}"
)

TARGETS = [
    moon(
        "moon-malapert-massif", "Malapert Massif", -85.98, -1.67,
        "A mountain thought to be a remnant of the South Pole-Aitken basin rim. It is one of NASA's nine candidate landing regions for Artemis III (NASA release 24-136, October 2024).",
        temp_mean=None, slope=None, roughness=None,
        lith=BASIC_PLUTONIC,
        lith_source="Flahaut et al. 2020, Planetary and Space Science 180:104750 (highland crust covered in South Pole-Aitken ejecta); LROC featured image 1294",
        lith_note=HIGHLAND_NOTE.format(detail="No direct rock measurement at this site was found: the massif is described as highland crust under basin ejecta."),
    ),
    moon(
        "moon-mons-mouton", "Mons Mouton", -84.6, 31.0,
        "A wide, flat-topped mountain near the south pole, also a remnant of the South Pole-Aitken basin rim. 'Mons Mouton' and 'Mons Mouton Plateau' are two of NASA's nine candidate landing regions for Artemis III (NASA release 24-136, October 2024).",
        temp_mean=None, slope=None, roughness=None,
        lith=BASIC_PLUTONIC,
        lith_source="Wueller et al. 2025, JGR Planets 130(10), doi:10.1029/2025JE009127 (basin-rim massif covered by later ejecta)",
        lith_note=HIGHLAND_NOTE.format(detail="No direct rock measurement at this site was found: the massif rock is not exposed at the surface."),
    ),
    moon(
        "moon-haworth", "Haworth", -87.45, -5.17,
        "A 51 km crater more than four billion years old whose floor never sees the Sun, one of the coldest places measured near the south pole. The region beside it is one of NASA's nine candidate landing regions for Artemis III (NASA release 24-136, October 2024).",
        temp_mean=None, slope=None, roughness=None,
        lith=BASIC_PLUTONIC,
        lith_source="Tye et al. 2015, Icarus 255:70 (pre-Nectarian crater in highland terrain)",
        lith_note=HIGHLAND_NOTE.format(detail="No direct rock measurement at this site was found."),
        extra_cannot=[
            "Permanent shadow: the floor of Haworth never exceeds about 40 K (Sefton-Nash et al. 2013, EPSC abstract 864), colder than any natural place on Earth.",
        ],
    ),
    moon(
        "moon-shackleton-rim", "Shackleton rim", -89.67, 129.78,
        "The rim of the 21 km crater that sits almost exactly on the south pole. A point near the rim is in sunlight continuously for 240 days of the year (Mazarico et al. 2011, Icarus), next to a floor in permanent shadow. 'Peak near Shackleton' and 'Connecting Ridge' were on NASA's 2022 list of Artemis III candidate regions (release 22-089) but not on the 2024 list.",
        temp_mean=None, slope=None, roughness=None,
        lith=BASIC_PLUTONIC,
        lith_source="Haruyama et al. 2013, Geophysical Research Letters 40:3814, doi:10.1002/grl.50753 (purest anorthosite on the inner wall of Shackleton)",
        lith_note=HIGHLAND_NOTE.format(detail="Here the anorthosite was detected directly by the SELENE Multiband Imager."),
    ),
    mars(
        "mars-jezero", "Jezero crater", 18.44, 77.45,
        "A 45 km crater that held a lake and a river delta about 3.5 billion years ago. NASA's Perseverance rover landed here on 18 February 2021 to study those deposits and collect samples.",
        temp_mean=None,
        temp_mean_note="Climate model value. The Perseverance MEDA team reports a mean air temperature of around -55 C (UPV/EHU release on Rodriguez-Manfredi et al. 2023), which agrees.",
        temp_range=None, temp_range_source=MCD, temp_range_badge="Literature",
        temp_range_note="Climate model value. The Perseverance MEDA team reports a day-night difference of around 50 to 60 C (UPV/EHU release on Rodriguez-Manfredi et al. 2023).",
        slope=None, roughness=None,
        lith=BASIC_VOLCANIC,
        lith_source="Farley et al. 2022, Science 377:eabo2196 (crater floor is igneous: Maaz lava flows over the Seitah olivine-rich rock)",
        lith_note="GLiM class 2, Basic volcanic rocks, for the lava flows the rover landed on. The delta to the west is sedimentary.",
    ),
    mars(
        "mars-gale", "Gale crater", -4.6, 137.4,
        "A 154 km crater with a central mountain of layered sediments. NASA's Curiosity rover landed here in August 2012 and found deposits of an ancient lake that could have supported life (Grotzinger et al. 2014, Science).",
        temp_mean=None,
        temp_mean_note="Climate model value, used so that all Mars targets share one definition. Curiosity's REMS record gives -43.7 C for the midpoint of the daily minimum and maximum, 11 C warmer than the model's figure for the same statistic. See data/REVIEW_ME.md.",
        temp_range=None, temp_range_source=REMS, temp_range_badge="Mission",
        temp_range_note="Mean daily maximum minus minimum of air temperature about 1.6 m above ground. The climate model gives 54 C.",
        slope=None, roughness=None,
        lith=SILICICLASTIC,
        lith_source="Grotzinger et al. 2014, Science 343:1242777; Vaniman et al. 2014, Science 343:1243480 (lake mudstones and sandstones)",
        lith_note="GLiM class 3, Siliciclastic sedimentary rocks. The grains are basaltic, unlike most sandstone and mudstone on Earth.",
    ),
    mars(
        "mars-arcadia-planitia", "Arcadia Planitia (site AP-1)", 39.8, -157.9,
        "Smooth northern plains with a layer of buried water ice tens of metres thick (Bramson et al. 2015, Geophysical Research Letters). Site AP-1 is one of four prime candidate landing sites studied for SpaceX Starship, chosen for its ice and safe terrain (Golombek et al. 2021, LPSC abstract 2420).",
        temp_mean=None,
        temp_mean_note="Climate model value. No lander has measured here.",
        temp_range=None, temp_range_source=MCD, temp_range_badge="Literature",
        temp_range_note="Climate model value. No lander has measured here.",
        slope=None, roughness=None,
        lith=None, lith_source=None,
        lith_note="No value. The geologic map unit at site AP-1 was not verified. Parts of Arcadia Planitia are mapped as Amazonian volcanic flows (Tanaka et al. 2014, USGS SIM 3292).",
    ),
]

# --------------------------------------------------------------------------------------------
# Measured values, copied by hand from validation/output/*.json. Edit here, then rerun.
# id: (tempMean C, tempRange C, slope deg, roughness m)
# --------------------------------------------------------------------------------------------
MEASURED = {
    "moon-malapert-massif": (-159.5, None, 12.3, 1571.3),
    "moon-mons-mouton": (-141.3, None, 9.42, 1018.6),
    "moon-haworth": (-211.9, None, 11.04, 1552.3),
    "moon-shackleton-rim": (-176.2, None, 10.78, 910.9),
    "mars-jezero": (-56.6, 48.8, 2.63, 287.4),
    "mars-gale": (-57.7, 62.1, 6.11, 1262.8),
    "mars-arcadia-planitia": (-74.5, 53.2, 0.27, 16.8),
}


def main() -> None:
    for t in TARGETS:
        m = MEASURED.get(t["id"])
        if not m:
            continue
        temp_mean, temp_range, slope, roughness = m
        vals = t["values"]
        if temp_mean is not None:
            vals["tempMean"].update({"value": temp_mean, "sigma": SIGMA_TEMP_MEAN,
                                     "source": DIVINER if t["body"] == "moon" else MCD,
                                     "badge": "Mission" if t["body"] == "moon" else "Literature"})
            if t["body"] == "moon":
                vals["tempMean"]["note"] = ("Annual average at 2 cm depth from the Diviner team's thermal model, averaged over "
                                            "the 55.6 km window. Sunlit ridges and shadowed floors inside the window differ by more than 100 K.")
        if temp_range is not None:
            src = vals["tempRange"]["source"] or (REMS if t["id"] == "mars-gale" else MCD)
            vals["tempRange"].update({"value": temp_range, "sigma": SIGMA_TEMP_RANGE})
            vals["tempRange"]["source"] = src
            vals["tempRange"]["badge"] = "Mission" if t["id"] == "mars-gale" else "Literature"
        if slope is not None and roughness is not None:
            src = LOLA if t["body"] == "moon" else MOLA
            vals["slope"] = v(slope, slope_sigma(slope), src, "Mission")
            vals["roughness"] = v(roughness, roughness_sigma(roughness), src, "Mission")
    path = Path(__file__).resolve().parents[2] / "data" / "targets.json"
    path.write_text(json.dumps(TARGETS, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {path} with {len(TARGETS)} targets")


if __name__ == "__main__":
    main()

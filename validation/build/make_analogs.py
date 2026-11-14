"""Writes data/analogs.json from the hand-curated list below.

The list is kept here, one site per line, so a reviewer can read and correct it easily.
Every coordinate and citation was collected on 2026-11-14 (see data/REVIEW_ME.md for how each was
checked). Run from the repository root:  python3 validation/build/make_analogs.py

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
import json
from pathlib import Path

MOON = ["moon-malapert-massif", "moon-mons-mouton", "moon-haworth", "moon-shackleton-rim"]
WARM = ["mars-jezero", "mars-gale"]          # arid, volcanic or sedimentary Mars analogs
COLD = ["mars-arcadia-planitia"]             # permafrost, ground ice, polar desert
MARS = WARM + COLD

# (id, name, lat, lon, analogFor, source, note)
KNOWN = [
    ("atacama-yungay", "Atacama Desert hyperarid core (Yungay), Chile", -24.0, -70.0, WARM,
     "Navarro-Gonzalez et al. 2003, Science 302:1018, doi:10.1126/science.1089143 (Mars-like soils)",
     "Coordinates are the published 'roughly 24 S, 70 W' (Glass et al. 2023, Astrobiology), not a surveyed station position."),
    ("haughton-crater", "Haughton impact structure, Devon Island, Canada", 75.3833, -89.6667, MARS,
     "Lee and Osinski 2005, Meteoritics and Planetary Science 40:1755, doi:10.1111/j.1945-5100.2005.tb00144.x", None),
    ("beacon-valley", "Beacon Valley, McMurdo Dry Valleys, Antarctica", -77.8167, 160.65, COLD,
     "Heldmann et al. 2013, Planetary and Space Science 85:53, doi:10.1016/j.pss.2013.05.019; Wikipedia 'Beacon Valley'",
     "The analog statement was read on Wikipedia; only the title of the paper was checked."),
    ("don-juan-pond", "Don Juan Pond, Wright Valley, Antarctica", -77.5644, 161.1722, COLD,
     "Dickson et al. 2013, Scientific Reports 3:1166, doi:10.1038/srep01166", None),
    ("mauna-kea", "Mauna Kea, Hawaii, USA", 19.8206, -155.4681, MOON,
     "ten Kate et al. 2013, Journal of Aerospace Engineering 26(1):183, doi:10.1061/(ASCE)AS.1943-5525.0000200",
     "Summit coordinates. The field-test site on the flank was not located."),
    ("kilauea", "Kilauea, Hawaii, USA", 19.421, -155.287, MOON + WARM,
     "Hughes et al. 2019, Astrobiology 19(3):260, doi:10.1089/ast.2018.1847; Smithsonian GVP volcano 332010", None),
    ("craters-of-the-moon", "Craters of the Moon, Idaho, USA", 43.4617, -113.5627, WARM,
     "Hughes et al. 2019, Astrobiology 19(3):260, doi:10.1089/ast.2018.1847", None),
    ("lanzarote-timanfaya", "Timanfaya, Lanzarote, Spain", 28.9942, -13.7933, MOON + WARM,
     "ESA PANGAEA course, 'What is Pangaea?', esa.int",
     "ESA names Lanzarote's volcanic terrains, not a single feature. Timanfaya coordinates used."),
    ("ries-crater", "Noerdlinger Ries impact crater, Germany", 48.8833, 10.5667, MOON,
     "ESA PANGAEA course, 'What is Pangaea?', esa.int (lunar geology and impact cratering)", None),
    ("askja", "Askja caldera, Iceland highlands", 65.033, -16.783, MOON + WARM,
     "Wikipedia 'Askja' (Apollo training); Europlanet TA1 Iceland field sites, europlanet.org; Smithsonian GVP volcano 373060",
     "Analog use was read on Wikipedia and the Europlanet page, not in a paper."),
    ("mdrs-utah", "Mars Desert Research Station, Hanksville, Utah, USA", 38.4065, -110.7919, WARM,
     "Wikipedia 'Mars Desert Research Station' (Mars Society station)", "Analog use was read on Wikipedia."),
    ("rio-tinto", "Rio Tinto, Huelva, Spain", 37.21, -6.938, WARM,
     "Amils et al. 2014, Life 4(3):511, doi:10.3390/life4030511", None),
    ("dallol", "Dallol, Danakil Depression, Ethiopia", 14.242, 40.3, WARM,
     "Cavalazzi et al. 2019, Astrobiology 19(4):553, doi:10.1089/ast.2018.1926; Smithsonian GVP volcano 221041", None),
    ("sp-crater", "SP Crater, San Francisco Volcanic Field, Arizona, USA", 35.5822, -111.6318, MOON,
     "Wikipedia 'S P Crater' (astronaut training)", "Analog use was read on Wikipedia."),
    ("meteor-crater", "Meteor Crater, Arizona, USA", 35.0281, -111.0233, MOON,
     "Wikipedia 'Meteor Crater' (Apollo astronaut training)", "Analog use was read on Wikipedia."),
    ("death-valley-ubehebe", "Ubehebe Crater, Death Valley, California, USA", 37.0097, -117.4503, WARM,
     "US National Park Service news release, 24 Feb 2012, nps.gov/deva/learn/news/mars-and-mojave.htm", None),
    ("pilbara-north-pole-dome", "North Pole Dome, Pilbara, Australia", -21.0483, 119.3931, WARM,
     "Brown, Walter and Cudahy 2005, Australian Journal of Earth Sciences 52:353, doi:10.1080/08120090500134530", None),
    ("arkaroola", "Arkaroola, Flinders Ranges, Australia", -30.3117, 139.3361, WARM,
     "Thomas et al. 2012, Episodes 35(1):226, doi:10.18814/epiiugs/2012/v35i1/022", None),
    ("qaidam-basin", "Qaidam Basin, China", 37.2667, 94.45, WARM,
     "Angles and Li 2017, JGR Planets 122:856, doi:10.1002/2017JE005293",
     "Basin centroid. The paper studies the western basin."),
    ("makhtesh-ramon", "Makhtesh Ramon, Negev, Israel", 30.5786, 34.8178, WARM,
     "Wikipedia 'D-MARS' (Desert Mars Analog Ramon Station)", "Analog use was read on Wikipedia."),
    ("lonar-crater", "Lonar crater, Maharashtra, India", 19.975, 76.5075, WARM,
     "Kumar et al. 2014, JGR Planets 119:2029, doi:10.1002/2013JE004543", None),
    ("ladakh-tso-kar", "Tso Kar, Ladakh, India", 33.3, 77.9833, MARS,
     "Pandey et al. 2020, International Journal of Astrobiology 19(1):78, doi:10.1017/S1473550419000119", None),
    ("makgadikgadi-pans", "Makgadikgadi Pans, Botswana", -20.8, 25.3333, WARM,
     "Pineau et al. 2024, EPSC2024-991, doi:10.5194/epsc2024-991", "Conference abstract."),
    ("teide", "Teide and Las Canadas, Tenerife, Spain", 28.2731, -16.6394, WARM,
     "Wikipedia 'Teide'; Smithsonian GVP volcano 383030", "Analog use was read on Wikipedia."),
    ("etna", "Mount Etna, Sicily, Italy", 37.748, 14.999, MOON,
     "Wedler et al. 2021, Philosophical Transactions of the Royal Society A 379:20190574, doi:10.1098/rsta.2019.0574; Smithsonian GVP volcano 211060", None),
    ("sudbury", "Sudbury Basin, Ontario, Canada", 46.6, -81.1833, MOON,
     "Wikipedia 'Sudbury Basin' (Apollo astronaut training)", "Analog use was read on Wikipedia."),
    ("kangerlussuaq", "Kangerlussuaq, Greenland", 67.0086, -50.6892, COLD,
     "Grau Galofre and Noblet 2024, EPSC2024-1039, doi:10.5194/epsc2024-1039", "Conference abstract."),
    ("mistastin-crater", "Mistastin crater, Labrador, Canada", 55.8833, -63.3, MOON,
     "Wikipedia 'Mistastin crater' (CSA and NASA astronaut field geology training)", "Analog use was read on Wikipedia."),
]

NEGATIVE = [
    ("neg-kalimantan-betung-kerihun", "Betung Kerihun National Park, Kalimantan, Indonesia", 1.2208, 113.3531,
     "Wikipedia 'Betung Kerihun National Park': Borneo montane and lowland rain forest", None),
    ("neg-amazon-jau", "Jau National Park, central Amazon, Brazil", -2.3, -63.05,
     "Wikipedia 'Jau National Park': dense rainforest, average annual rainfall over 2500 mm", None),
    ("neg-congo-salonga", "Salonga National Park, Congo basin, DR Congo", -2.0, 21.0,
     "Wikipedia 'Salonga National Park': Africa's largest tropical rainforest reserve", None),
    ("neg-jakarta", "Jakarta, Indonesia", -6.18, 106.83,
     "Wikipedia 'Jakarta': dense tropical city, annual precipitation about 1,933 mm (1991-2020 normals)", None),
    ("neg-singapore", "Singapore", 1.2833, 103.8333,
     "Wikipedia 'Geography of Singapore': dense tropical city, average annual rainfall around 2,340 mm", None),
    ("neg-paris", "Paris, France", 48.8567, 2.3522,
     "Wikipedia 'Paris': dense temperate city, average annual precipitation 641 mm", None),
]

CANDIDATE = [
    ("id-kawah-ijen", "Kawah Ijen, East Java, Indonesia", -8.058, 114.242, ["mars-gale"],
     "Smithsonian GVP volcano 263350; Loehr et al. 2005, Environmental Science and Pollution Research 12(2):89, doi:10.1065/espr2004.09.118 (crater lake pH below 0.3); Rodriguez and van Bergen 2016, Netherlands Journal of Geosciences 95(2):153, doi:10.1017/njg.2015.12 (hyperacid volcanic lakes as analogues of Martian sulphate-rich terrains, with Kawah Ijen as an example)",
     "No paper found states in so many words that Kawah Ijen is a Mars analog. Rodriguez and van Bergen name it as an example of the lake type; their own fieldwork is at Poas and Copahue."),
    ("id-merapi", "Mount Merapi and the Opak River, Central Java, Indonesia", -7.54, 110.446, ["mars-gale"],
     "Smithsonian GVP volcano 263250; Argadestya et al. 2022, Earth and Space Science 9(11), doi:10.1029/2022EA002279 (Merapi volcaniclastic sediments compared with Gale crater rocks)",
     "A mineral-sorting process study. It does not call Merapi a Mars analog site. Its abstract names Gale crater only."),
    ("id-gua-lawa", "Gua Lawa lava tube, Purbalingga, Central Java, Indonesia", -7.2314, 109.3175, [],
     "Widagdo and Setijadi 2007, Dinamika Rekayasa 3(2):57-60 (formed by lava flow); Siswandi et al. 2024, Proceedings ICMA-SURE, doi:10.20884/2.procicma.2024.3.1.10237 (basalt, SiO2 50.5 to 51.4 percent)",
     "Lava tube on the flank of Mount Slamet. Coordinates from Wikidata Q25153151, not from a survey. No source links it to planetary research: the analog idea is SBATS's own. Not matched to a listed target, so analogFor is empty."),
    ("id-goa-pandan", "Goa Pandan basalt lava cave, East Lampung, Sumatra, Indonesia", -5.364, 105.664, [],
     "Al Farishi et al. 2024, JGEET 9(2):188-194, doi:10.25299/jgeet.2024.9.2.16848; Sirait et al. 2023, JGEET 8(2):112-122, doi:10.25299/jgeet.2023.8.2.12118",
     "Coordinates are those of Giri Mulyo village (Wikidata Q14629677), not the cave entrance. No source links it to planetary research. analogFor is empty."),
    ("id-kesaksak-lava-tube", "Kesaksak lava tube, Batur caldera, Bali, Indonesia", -8.2403, 115.3775, [],
     "Agastya et al. 2023, Jurnal Geominerba 8(1):44-61, doi:10.58522/ppsdm22.v8i1.134 (tube in the 1888 basaltic lava flow); Smithsonian GVP volcano 264010",
     "Coordinates are those of Batur volcano (GVP). The position of the tube inside the caldera is not published. No source links it to planetary research. analogFor is empty."),
    ("id-maros-pangkep-karst", "Maros-Pangkep karst caves, South Sulawesi, Indonesia", -5.0031, 119.6944, [],
     "UNESCO Global Geoparks, 'Maros Pangkep', unesco.org/en/iggp/geoparks/maros-pangkep (572 caves)",
     "Limestone karst, not a lava tube. Listed as a verified cave system only. No source links it to planetary research. analogFor is empty."),
]


def entry(id_, name, lat, lon, kind, analog_for, source, note):
    e = {"id": id_, "name": name, "lat": lat, "lon": lon, "kind": kind, "analogFor": analog_for, "source": source}
    if note:
        e["note"] = note
    return e


def main():
    out = [entry(i, n, la, lo, "known", a, s, note) for i, n, la, lo, a, s, note in KNOWN]
    out += [entry(i, n, la, lo, "negative", [], s, note) for i, n, la, lo, s, note in NEGATIVE]
    out += [entry(i, n, la, lo, "candidate", a, s, note) for i, n, la, lo, a, s, note in CANDIDATE]
    ids = [e["id"] for e in out]
    assert len(ids) == len(set(ids)), "duplicate id"
    path = Path(__file__).resolve().parents[2] / "data" / "analogs.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {path} with {len(KNOWN)} known, {len(NEGATIVE)} negative, {len(CANDIDATE)} candidate")


if __name__ == "__main__":
    main()

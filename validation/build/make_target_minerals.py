"""Writes data/target_minerals.json: minerals reported at the targets, and the families they share
with NASA EMIT's Earth mineral identifications.

Site-level result only. It never enters the all-round score (added after the freeze of 2026-11-14).

Every target mineral is one row with the paper it was read in. `access` says how it was read:
  FT   full text of the paper was read
  ABS  abstract only
  TALK slides of a workshop talk, not a peer-reviewed paper
Rows were compiled by a research sub-agent and the key quotes re-read in the saved source texts in the
main session (data/REVIEW_ME.md, Part 3). Nothing is from memory. A mineral that no opened source
reports at a target is simply not listed.

`families` reduces both sides to comparable groups. `emitPatterns` are fragments of EMIT spectral
library names (USGS library, as listed in the EMIT L2B grouping table and as seen in data/sites.json).
A family with no pattern cannot be identified by EMIT's mineral product, so it is "not comparable".

Run from the repository root:  python3 validation/build/make_target_minerals.py

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

RAMPE = "Rampe et al. 2020, Geochemistry 80:125605 (CheMin X-ray diffraction, review of six years in Gale)"
RAMPE_URL = "https://doi.org/10.1016/j.chemer.2020.125605"
THORPE = "Thorpe et al. 2022, JGR Planets 127:e2021JE007099"
THORPE_URL = "https://doi.org/10.1029/2021JE007099"
TUTOLO = "Tutolo et al. 2025, Science 388:292"
TUTOLO_URL = "https://doi.org/10.1126/science.ado9966"
FRAEMAN = "Fraeman et al. 2013, Geology 41:1103"
FRAEMAN_URL = "https://doi.org/10.1130/G34613.1"
FARLEY = "Farley et al. 2022, Science 377:eabo2196"
FARLEY_URL = "https://doi.org/10.1126/science.abo2196"
WIENS = "Wiens et al. 2022, Science Advances 8:eabo3399"
WIENS_URL = "https://doi.org/10.1126/sciadv.abo3399"
TICE = "Tice et al. 2022, Science Advances 8:eabp9084"
TICE_URL = "https://doi.org/10.1126/sciadv.abp9084"
GOUDGE = "Goudge et al. 2015, JGR Planets 120:775"
GOUDGE_URL = "https://doi.org/10.1002/2014JE004782"
HARUYAMA = "Haruyama et al. 2013, Geophysical Research Letters 40:3814"
HARUYAMA_URL = "https://doi.org/10.1002/grl.50753"
BESSE = "Besse et al. 2011, JGR 116:E00G13"
BESSE_URL = "https://doi.org/10.1029/2010JE003725"

FAMILIES = [
    # id, label, emitPatterns, note
    ("olivine", "Olivine", ["olivine", "forsterite", "fayalite"], None),
    ("pyroxene", "Pyroxene", ["pyroxene", "augite", "pigeonite", "diopside", "hypersthene", "bronzite", "enstatite", "hedenbergite"], None),
    ("plagioclase", "Plagioclase feldspar", [], "Plain feldspar has no absorption that EMIT's mineral product identifies, so it cannot be compared."),
    ("magnetite", "Magnetite", ["magnetite"], None),
    ("hematite", "Hematite", ["hematite"], None),
    ("goethite", "Goethite", ["goethite", "goeth."], None),
    ("akaganeite", "Akaganeite", [], "Not in EMIT's spectral library."),
    ("jarosite", "Jarosite", ["jarosite"], None),
    ("calcium-sulfate", "Calcium sulfate (gypsum, bassanite, anhydrite)", ["gypsum", "bassanite", "anhydrite"], None),
    ("magnesium-sulfate", "Magnesium sulfate", ["kieserite", "epsomite", "hexahydrite"], None),
    ("iron-sulfate", "Iron sulfate", ["szomolnokite", "copiapite", "coquimbite", "schwertmannite", "butlerite"], None),
    ("smectite", "Smectite clay", ["smectite", "smect.", "nontronite", "montmorillonite", "saponite", "beidellite", "hectorite", "na-mont", "mont_"], None),
    ("kaolinite", "Kaolinite", ["kaolinite", "kaolin", "kaol", "halloysite", "dickite", "nacrite"], None),
    ("mica-illite", "Mica and illite", ["illite", "muscov", "musc."], None),
    ("carbonate-mgfe", "Magnesium-iron carbonate (magnesite, siderite)", ["magnesite", "siderite"], None),
    ("carbonate-ca", "Calcium carbonate (calcite, aragonite, dolomite)", ["calcite", "aragonite", "dolomite"], None),
    ("silica", "Silica (tridymite, cristobalite, opal)", ["opal", "chalcedony"], "EMIT's library has opal and chalcedony, not tridymite or cristobalite."),
    ("perchlorate", "Perchlorate", ["perchlorate"], None),
    ("phosphate", "Phosphate", [], "Not in EMIT's mineral groups."),
    ("hydrated-glass", "Hydrated volcanic glass", ["basaltic_glass", "basaltglass"], None),
    ("gibbsite", "Gibbsite", ["gibbsite"], None),
    ("serpentine", "Serpentine", ["serpentine", "chrysotile", "cronstedtite", "lizardite", "antigorite"], None),
]


def m(family, name, method, instrument, abundance, source, url, access):
    return {"family": family, "name": name, "method": method, "instrument": instrument, "abundance": abundance,
            "source": source, "url": url, "badge": "Literature", "access": access}


CHEMIN = "Curiosity CheMin"
GALE = [
    m("plagioclase", "plagioclase feldspar", "in-place", CHEMIN, "6 to 56% by weight of the crystalline part, by sample", f"{RAMPE}, Table 2", RAMPE_URL, "FT"),
    m("pyroxene", "pyroxene", "in-place", CHEMIN, "2 to 42% of the crystalline part", f"{RAMPE}, Table 2", RAMPE_URL, "FT"),
    m("olivine", "olivine", "in-place", CHEMIN, "1 to 8% of the crystalline part; 20.5% in the Rocknest sand", f"{RAMPE}, Tables 2 and 7", RAMPE_URL, "FT"),
    m("magnetite", "magnetite", "in-place", CHEMIN, "1 to 16% of the crystalline part", f"{RAMPE}, Table 2", RAMPE_URL, "FT"),
    m("hematite", "hematite", "in-place", CHEMIN, "1 to 28% of the crystalline part", f"{RAMPE}, Table 2", RAMPE_URL, "FT"),
    m("hematite", "crystalline hematite", "orbital", "MRO CRISM", None, FRAEMAN, FRAEMAN_URL, "ABS"),
    m("akaganeite", "akaganeite", "in-place", CHEMIN, "1 to 11% of the crystalline part", f"{RAMPE}, Table 2", RAMPE_URL, "FT"),
    m("jarosite", "jarosite", "in-place", CHEMIN, "1 to 8% of the crystalline part", f"{RAMPE}, Table 2", RAMPE_URL, "FT"),
    m("calcium-sulfate", "anhydrite, bassanite and gypsum", "in-place", CHEMIN, "anhydrite 1 to 21%, bassanite 1 to 7%, gypsum 1 to 7% of the crystalline part", f"{RAMPE}, Table 2", RAMPE_URL, "FT"),
    m("smectite", "iron saponite; smectite resembling montmorillonite or nontronite", "in-place", CHEMIN, "clay minerals 3 to 28% by weight of the sample", f"{RAMPE}, Table 5 and text", RAMPE_URL, "FT"),
    m("smectite", "iron-magnesium smectite", "orbital", "MRO CRISM", None, FRAEMAN, FRAEMAN_URL, "ABS"),
    m("silica", "tridymite, cristobalite and opal-CT", "in-place", CHEMIN, "tridymite 34% of the crystalline part in one sample; cristobalite 6 to 12%; opal-CT 4 to 11% of the sample", f"{RAMPE}, Tables 2 and 5", RAMPE_URL, "FT"),
    m("carbonate-mgfe", "siderite", "in-place", CHEMIN, "about 1 to 3% by weight in three samples", f"{THORPE}, section 4", THORPE_URL, "FT"),
    m("carbonate-mgfe", "siderite", "in-place", CHEMIN, "4.8 to 10.5% by weight, in a higher part of the section", TUTOLO, TUTOLO_URL, "ABS"),
]

JEZERO = [
    m("olivine", "olivine", "in-place", "Perseverance PIXL", "65% of the analysed surface of one abraded rock (Dourbes, Seitah)", FARLEY, FARLEY_URL, "FT"),
    m("olivine", "olivine with magnesium-rich carbonate", "orbital", "MRO CRISM", None, GOUDGE, GOUDGE_URL, "ABS"),
    m("pyroxene", "augite", "in-place", "Perseverance PIXL", "13% of the analysed surface of the same rock", FARLEY, FARLEY_URL, "FT"),
    m("plagioclase", "plagioclase (andesine)", "in-place", "Perseverance SuperCam", None, WIENS, WIENS_URL, "FT"),
    m("carbonate-mgfe", "iron-magnesium carbonate (magnesite to siderite)", "in-place", "Perseverance SuperCam and PIXL", "a very small fraction, likely under 5%, of the Seitah rock", f"{WIENS}; {TICE}", WIENS_URL, "FT"),
    m("carbonate-mgfe", "magnesium-rich carbonate", "orbital", "MRO CRISM", None, GOUDGE, GOUDGE_URL, "ABS"),
    m("calcium-sulfate", "hydrous calcium sulfate", "in-place", "Perseverance SHERLOC and PIXL", None, f"{FARLEY}; {TICE}", FARLEY_URL, "FT"),
    m("magnesium-sulfate", "magnesium sulfate", "in-place", "Perseverance PIXL", None, TICE, TICE_URL, "FT"),
    m("perchlorate", "sodium perchlorate", "in-place", "Perseverance SHERLOC and SuperCam", None, f"{FARLEY}; {WIENS}", FARLEY_URL, "FT"),
    m("smectite", "iron-rich clay such as nontronite", "in-place", "Perseverance SuperCam", None, WIENS, WIENS_URL, "FT"),
    m("smectite", "iron-magnesium smectite (saponite or nontronite) in the western fan", "orbital", "MRO CRISM", None, GOUDGE, GOUDGE_URL, "ABS"),
    m("phosphate", "merrillite", "in-place", "Perseverance PIXL", None, TICE, TICE_URL, "FT"),
]

# Added 2026-11-15, after the freeze. Read in the abstracts (ABS) or in the slides of a workshop talk (TALK).
MORRIS06 = "Morris et al. 2006, JGR Planets 111(E2), doi:10.1029/2005JE002584, authors' manuscript on NASA NTRS 20080030169"
MORRIS06_URL = "https://ntrs.nasa.gov/citations/20080030169"
MORRIS10 = "Morris et al. 2010, Science 329:421-424, doi:10.1126/science.1189667"
MORRIS10_URL = "https://doi.org/10.1126/science.1189667"
SQUYRES08 = "Squyres et al. 2008, Science 320:1063-1067, doi:10.1126/science.1155429"
SQUYRES08_URL = "https://doi.org/10.1126/science.1155429"
MB = "Spirit Moessbauer spectrometer"
GUSEV = [
    m("olivine", "olivine", "in-place", MB, "with pyroxene, 40 to 49% of the iron in moderately altered hills rocks, 9 to 24% in pervasively altered ones; sometimes absent", MORRIS06, MORRIS06_URL, "ABS"),
    m("pyroxene", "pyroxene", "in-place", MB, "more iron in pyroxene than in olivine in the hills rocks", MORRIS06, MORRIS06_URL, "ABS"),
    m("magnetite", "magnetite", "in-place", MB, "about 10 to 15% of the iron in some hills rocks", MORRIS06, MORRIS06_URL, "ABS"),
    m("hematite", "hematite", "in-place", MB, None, MORRIS06, MORRIS06_URL, "ABS"),
    m("goethite", "goethite", "in-place", MB, "up to 40% of the iron, in the rock Clovis", MORRIS06, MORRIS06_URL, "ABS"),
    m("iron-sulfate", "ferric sulfate, in the Paso Robles soil", "in-place", MB, "about 65% of the iron in that soil", MORRIS06, MORRIS06_URL, "ABS"),
    m("carbonate-mgfe", "magnesium-iron carbonate", "in-place", "Spirit rover instruments (not named in the abstract)", "16 to 34% by weight of the outcrop", MORRIS10, MORRIS10_URL, "ABS"),
    m("silica", "opaline silica", "in-place", "Spirit rover instruments (not named in the abstract)", "as much as 91% SiO2 by weight", SQUYRES08, SQUYRES08_URL, "ABS"),
]
WRAY = "Wray, J., 'Mineralogic diversity at Holden crater', talk at the 4th MSL Landing Site Workshop (NASA), reporting Milliken et al. 2007 and Milliken and Bish 2010"
WRAY_URL = "https://marsoweb.nas.nasa.gov/landingsites/msl/workshops/4th_workshop/talks/3_Wray_Holden_opt.pdf"
HOLDEN = [
    m("smectite", "iron-magnesium clay minerals, which may be mixed-layer smectite and chlorite", "orbital", "MRO CRISM", None, WRAY, WRAY_URL, "TALK"),
]

TARGETS = {
    "mars-gusev-columbia-hills": {"minerals": GUSEV, "note": "Added after the freeze. Rocks and soils analysed by Spirit on the plains and in the Columbia Hills. The Moessbauer figures are shares of the iron, not of the rock. Ilmenite and nanophase ferric oxide were also found and have no family here."},
    "mars-holden": {"minerals": HOLDEN, "note": "Added after the freeze. Seen from orbit only, in the light-toned layered deposits and the flood deposits over them. The source is the slides of a workshop talk, not a paper, and it says the clays 'may be' smectite and chlorite mixed layers: counting them as smectite is SBATS's reading. The same talk reports olivine and pyroxene in the crater wall and the breccia, which are not the lake deposits and are left out."},
    "mars-gale": {"minerals": GALE, "note": "Drilled samples along Curiosity's route up Mount Sharp. Abundances vary a great deal from sample to sample; the ranges are across samples in which the mineral was detected."},
    "mars-jezero": {"minerals": JEZERO, "note": "Abraded rocks of the crater floor (Seitah and Maaz) and orbital spectra of the fans. Serpentine was looked for and not found (Farley et al. 2022)."},
    "moon-shackleton-rim": {
        "minerals": [m("plagioclase", "plagioclase of very pure anorthosite", "orbital", "SELENE (Kaguya) Multiband Imager", None, HARUYAMA, HARUYAMA_URL, "ABS")],
        "note": "One mineral, seen from orbit on the crater's inner wall. EMIT cannot identify plain feldspar, so no Earth site can be compared on minerals with this target.",
    },
    "moon-marius-hills": {
        "minerals": [
            m("pyroxene", "high-calcium pyroxene", "orbital", "Chandrayaan-1 M3", None, BESSE, BESSE_URL, "ABS"),
            m("olivine", "olivine, in some flows", "orbital", "Chandrayaan-1 M3", None, BESSE, BESSE_URL, "ABS"),
        ],
        "note": "Orbital spectra of the mare basalts. No abundances are given.",
    },
    "mars-arcadia-planitia": {"minerals": [], "note": "No lander has been here and no mineral study of the site was found. A study of domes several hundred kilometres west (Farrand et al. 2021, Icarus 357:114111) is not the site."},
    "moon-malapert-massif": {"minerals": [], "note": "No published mineral result for this site was found."},
    "moon-mons-mouton": {"minerals": [], "note": "No published mineral result for this site was found."},
    "moon-haworth": {"minerals": [], "note": "No published mineral result for this site was found."},
}


def main() -> None:
    ids = {t["id"] for t in json.loads((ROOT / "data" / "targets.json").read_text())}
    assert set(TARGETS) == ids, f"targets differ: {set(TARGETS) ^ ids}"
    family_ids = [f[0] for f in FAMILIES]
    assert len(family_ids) == len(set(family_ids))
    for tid, t in TARGETS.items():
        for row in t["minerals"]:
            assert row["family"] in family_ids, (tid, row["family"])
    out = {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "note": ("Minerals reported at the targets in cited papers, and the mineral families used to compare them with NASA EMIT "
                     "identifications at Earth sites (data/sites.json, mineralogy). Site-level result only, added after the freeze of "
                     "2026-11-14: never part of the all-round score. An EMIT identification is a spectral match in a 60 m pixel, not an "
                     "abundance; a rover result is a laboratory measurement of one sample. A shared family is a pointer, not proof."),
            "emitMinimumShare": 0.01,
            "emitMinimumShareNote": "An EMIT family counts when it is matched in at least 1% of the clear pixels of the footprint. A display rule.",
            "emitSource": "NASA EMIT L2B Estimated Mineral Identification and Band Depth (EMITL2BMIN), LP DAAC; method: Brodrick et al. 2023, EMIT L2b ATBD, JPL D-104479",
            "access": {"FT": "full text of the paper was read", "ABS": "abstract only", "TALK": "slides of a workshop talk, not a peer-reviewed paper"},
            "generatedBy": "validation/build/make_target_minerals.py",
        },
        "families": [{"id": i, "label": label, "emitPatterns": patterns, "note": note} for i, label, patterns, note in FAMILIES],
        "targets": TARGETS,
    }
    path = ROOT / "data" / "target_minerals.json"
    path.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    print(f"wrote {path.relative_to(ROOT)}: {len(FAMILIES)} families, {sum(len(t['minerals']) for t in TARGETS.values())} target mineral rows")


if __name__ == "__main__":
    main()

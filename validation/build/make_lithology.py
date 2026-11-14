"""Writes data/lithology_similarity.json: one entry for every pair of GLiM rock classes.

The classes and codes are the legend Session B published in data/SCHEMA.md (GLiM v1.0,
Hartmann and Moosdorf 2012). The three similarity levels were approved by the team on 2026-11-14.
What is decided here is only which pairs count as "related". The rule, applied to every pair:

  A pair is related when the two classes share an origin (how the rock formed) and sit next to
  each other in composition, or share a composition and differ only in how they were emplaced.
  Everything else is unrelated.

  1. Volcanic rocks next to each other in silica content: basic-intermediate, intermediate-acid.
  2. Plutonic rocks next to each other in silica content: basic-intermediate, intermediate-acid.
  3. The volcanic and plutonic rock of the same silica class (same magma, erupted or not).
  4. Pyroclastics with each volcanic class (same eruptions, fragmented instead of flowing).
  5. Sediments that share detrital material: unconsolidated, siliciclastic, mixed.
  6. Mixed sedimentary with carbonate (mixed units contain carbonate beds).
  7. Carbonate with evaporite (both precipitated from water, often in the same basins).
  8. Metamorphics with acid plutonic (gneiss and granite basement, same quartz-feldspar make-up).

  Basic against acid (basalt against rhyolite, gabbro against granite) is unrelated even though the
  origin is shared: the two ends differ in minerals, chemistry and landforms. Ice is unrelated to
  every rock class.

The family names (volcanic, plutonic, sedimentary, metamorphic) and the basic / intermediate / acid
split are GLiM's own first-level classes, so pairs decided by them cite GLiM. Rules 7 and 8 are
standard geology but are this project's judgement, so their source is null.

Run from the repository root:  python3 validation/build/make_lithology.py

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
import json
from itertools import combinations
from pathlib import Path

GLIM = "Hartmann and Moosdorf 2012, GLiM class definitions, doi:10.1029/2012GC004370"

# code: (abbr, label, family, silica class or None)
CLASSES = {
    1: ("su", "Unconsolidated sediments", "sedimentary", None),
    2: ("vb", "Basic volcanic rocks", "volcanic", "basic"),
    3: ("ss", "Siliciclastic sedimentary rocks", "sedimentary", None),
    4: ("pb", "Basic plutonic rocks", "plutonic", "basic"),
    5: ("sm", "Mixed sedimentary rocks", "sedimentary", None),
    6: ("sc", "Carbonate sedimentary rocks", "sedimentary", None),
    7: ("va", "Acid volcanic rocks", "volcanic", "acid"),
    8: ("mt", "Metamorphics", "metamorphic", None),
    9: ("pa", "Acid plutonic rocks", "plutonic", "acid"),
    10: ("vi", "Intermediate volcanic rocks", "volcanic", "intermediate"),
    12: ("py", "Pyroclastics", "volcanic", None),
    13: ("pi", "Intermediate plutonic rocks", "plutonic", "intermediate"),
    14: ("ev", "Evaporites", "sedimentary", None),
    16: ("ig", "Ice and glaciers", "ice", None),
}
SILICA = ["basic", "intermediate", "acid"]
ROCK = {"basic": ("basalt", "gabbro"), "intermediate": ("andesite", "diorite"), "acid": ("rhyolite", "granite")}

# Related pairs that the family and silica rules do not produce: (abbr, abbr): (justification, source)
EXTRA_RELATED = {
    ("su", "ss"): ("Same detrital grains (sand, silt, clay): one is loose, the other cemented into rock.", GLIM),
    ("ss", "sm"): ("Mixed sedimentary units are interbedded siliciclastic and carbonate rock, so they share the siliciclastic part.", GLIM),
    ("su", "sm"): ("Both are largely detrital sediment; mixed units add carbonate beds and are consolidated.", GLIM),
    ("sm", "sc"): ("Mixed sedimentary units are interbedded siliciclastic and carbonate rock, so they share the carbonate part.", GLIM),
    ("sc", "ev"): ("Both are precipitated from water rather than eroded from older rock, and often form in the same basins.", None),
    ("mt", "pa"): ("Gneiss and granite make up the same crystalline basement and share a quartz and feldspar make-up.", None),
}


def relation(a: int, b: int) -> tuple[str, str, str | None]:
    abbr_a, label_a, fam_a, sil_a = CLASSES[a]
    abbr_b, label_b, fam_b, sil_b = CLASSES[b]
    la, lb = label_a.lower(), label_b.lower()
    key = (abbr_a, abbr_b) if (abbr_a, abbr_b) in EXTRA_RELATED else (abbr_b, abbr_a)
    if key in EXTRA_RELATED:
        text, source = EXTRA_RELATED[key]
        return "related", text, source

    if "ice" in (fam_a, fam_b):
        other = lb if fam_a == "ice" else la
        return "unrelated", f"Glacier ice is frozen water, not rock: it shares no origin or composition with {other}.", None

    igneous = {"volcanic", "plutonic"}
    if fam_a in igneous and fam_b in igneous:
        # Pyroclastics have no silica class in GLiM.
        if "py" in (abbr_a, abbr_b):
            other_fam = fam_b if abbr_a == "py" else fam_a
            other = lb if abbr_a == "py" else la
            if other_fam == "volcanic":
                return "related", f"Both come from volcanic eruptions: pyroclastics are the fragmented ash and tephra, {other} the lavas.", GLIM
            return "unrelated", f"Pyroclastics are loose eruption deposits at the surface; {other} cooled slowly at depth as massive crystalline rock.", GLIM
        step = abs(SILICA.index(sil_a) - SILICA.index(sil_b))
        if fam_a == fam_b:
            kind = "erupted lavas" if fam_a == "volcanic" else "intrusive rocks that cooled at depth"
            idx = 0 if fam_a == "volcanic" else 1
            ra, rb = ROCK[sil_a][idx], ROCK[sil_b][idx]
            if step == 1:
                return "related", f"Both are {kind}, next to each other in silica content ({ra} and {rb}).", GLIM
            return "unrelated", f"Both are {kind}, but at opposite ends of the silica range ({ra} and {rb}): different minerals, chemistry and landforms.", GLIM
        if step == 0:
            v, p = ROCK[sil_a]
            return "related", f"Same {sil_a} magma composition: {v} erupted at the surface, {p} cooled at depth.", GLIM
        ra = ROCK[sil_a][0 if fam_a == "volcanic" else 1]
        rb = ROCK[sil_b][0 if fam_b == "volcanic" else 1]
        return "unrelated", f"Different emplacement (one erupted, one intrusive) and different silica class ({ra} and {rb}).", GLIM

    if fam_a == fam_b == "sedimentary":
        return "unrelated", f"Both are sedimentary, but {la} and {lb} are made of different material by different processes.", GLIM

    fams = {fam_a, fam_b}
    if fams == {"sedimentary", "volcanic"} or fams == {"sedimentary", "plutonic"}:
        return "unrelated", f"Different origin: one is laid down as sediment or precipitate, the other formed from magma ({la}, {lb}).", GLIM
    if "metamorphic" in fams:
        other = lb if fam_a == "metamorphic" else la
        return "unrelated", f"Metamorphic rocks were recrystallised under heat and pressure; no shared origin or typical composition with {other}.", GLIM
    raise AssertionError(f"no rule for {abbr_a}, {abbr_b}")


def main() -> None:
    pairs = []
    for a, b in combinations(sorted(CLASSES), 2):
        rel, text, source = relation(a, b)
        pairs.append({"a": a, "b": b, "relation": rel, "justification": text, "source": source})
    assert len(pairs) == 91
    out = {"levels": {"same": 1.0, "related": 0.6, "unrelated": 0.15}, "pairs": pairs}
    path = Path(__file__).resolve().parents[2] / "data" / "lithology_similarity.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    related = [(CLASSES[p["a"]][0], CLASSES[p["b"]][0]) for p in pairs if p["relation"] == "related"]
    print(f"wrote {path}: {len(pairs)} pairs, {len(related)} related")
    print("related:", ", ".join(f"{x}-{y}" for x, y in related))


if __name__ == "__main__":
    main()

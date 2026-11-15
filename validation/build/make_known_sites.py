"""Writes data/known_sites.json: real places on the Moon and Mars that a user can pick as a target.

Source of the rows: validation/build/known_sites_raw.json, compiled on 2026-11-15 by a research
sub-agent under one rule: every latitude and longitude must be read in a source opened in that session
(NASA NSSDCA tables, NASA/JPL rover files, LROC, the IAU Gazetteer, peer-reviewed papers), never typed
from memory. Each row keeps the citation, the URL and the quoted line it was read from. The main
session checked the list against the targets already in data/targets.json and against well-known
values (data/REVIEW_ME.md, Part 3).

This script only adds what can be computed:
  id        a stable slug
  targetId  the curated target of data/targets.json within 27.8 km of the place (half the 55.6 km
            window the curated values describe), if any. The same rule app/src/lib/targets applies.

Run from the repository root:  python3 validation/build/make_known_sites.py

Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.
"""
import json
import math
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = Path(__file__).resolve().parent / "known_sites_raw.json"
RADIUS_KM = {"moon": 1737.4, "mars": 3389.5}
CURATED_RADIUS_KM = 27.8


def distance_km(body, lat1, lon1, lat2, lon2):
    r = math.radians
    a = math.sin(r(lat2 - lat1) / 2) ** 2 + math.cos(r(lat1)) * math.cos(r(lat2)) * math.sin(r(lon2 - lon1) / 2) ** 2
    return 2 * RADIUS_KM[body] * math.asin(min(1.0, math.sqrt(a)))


def slug(body, name):
    text = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    text = re.sub(r"\(.*?\)", "", text)                      # drop bracketed nicknames
    text = re.sub(r"^(Artemis III candidates?|Starship candidate):\s*", lambda m: "artemis-" if "Artemis" in m.group(0) else "starship-", text)
    text = text.replace("'", "").split(",")[0].split(" at the ")[0]   # "Chang'e" -> "Change"; drop trailing descriptions
    text = re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-").lower()
    text = re.sub(r"-+", "-", text)
    if text.startswith(f"{body}-"):
        text = text[len(body) + 1:]
    return f"{body}-{text}"[:60].rstrip("-")


def main() -> None:
    raw = json.loads(RAW.read_text())
    targets = json.loads((ROOT / "data" / "targets.json").read_text())
    sites, seen = [], set()
    for x in raw:
        assert x["body"] in RADIUS_KM and -90 <= x["lat"] <= 90 and -180 <= x["lon"] <= 180, x["name"]
        assert x["kind"] in ("landing-site", "candidate-region") and x["source"] and x["url"], x["name"]
        sid = slug(x["body"], x["name"])
        assert sid not in seen, f"duplicate id {sid}"
        seen.add(sid)
        near = [(distance_km(x["body"], x["lat"], x["lon"], t["lat"], t["lon"]), t["id"]) for t in targets if t["body"] == x["body"]]
        near = sorted(d for d in near if d[0] <= CURATED_RADIUS_KM)
        note = " ".join(s for s in [x.get("note"), f"Longitude as the source gives it: {x['lonNote']}." if x.get("lonNote") else None] if s)
        sites.append({
            "id": sid, "name": x["name"], "body": x["body"], "lat": x["lat"], "lon": x["lon"], "kind": x["kind"],
            "mission": x.get("mission"), "agency": x.get("agency"), "date": x.get("date"), "status": x["status"],
            "source": x["source"], "url": x["url"], "access": x.get("access", "primary"),
            "quote": x.get("quote"), "note": note or None,
            "targetId": near[0][1] if near else None,
            "targetDistanceKm": round(near[0][0], 1) if near else None,
        })
    sites.sort(key=lambda s: (s["body"], s["kind"], s["date"] or "9999", s["name"]))
    out = {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "note": ("Real places on the Moon and Mars a user can pick as a target: mission landing sites and candidate landing or base "
                     "regions. Every coordinate was read in the cited source; none is from memory. A candidate region's point is a "
                     "published centre or site point, not a boundary; where a region has no published centre, the IAU centre of the "
                     "feature that names it is used and the note says so. A status of 'proposed in the literature, not an official "
                     "shortlist' marks a place proposed by its authors and not chosen by any agency. targetId links a place to the curated target of data/targets.json "
                     "whose 55.6 km window holds it."),
            "coordinateConvention": "Latitude north positive; longitude east positive, -180 to 180. The source's own longitude is quoted in each note. Mars sources do not always say whether latitude is planetocentric or planetographic; at this scale the difference is under 0.4 degrees.",
            "counts": {b: {k: sum(1 for s in sites if s["body"] == b and s["kind"] == k) for k in ("landing-site", "candidate-region")} for b in ("moon", "mars")},
            "generatedBy": "validation/build/make_known_sites.py from validation/build/known_sites_raw.json",
        },
        "sites": sites,
    }
    path = ROOT / "data" / "known_sites.json"
    path.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    linked = [(s["id"], s["targetId"], s["targetDistanceKm"]) for s in sites if s["targetId"]]
    print(f"wrote {path.relative_to(ROOT)}: {len(sites)} places, {out['meta']['counts']}")
    for row in linked:
        print("  linked", row)
    print("  ids:", ", ".join(s["id"] for s in sites))


if __name__ == "__main__":
    main()

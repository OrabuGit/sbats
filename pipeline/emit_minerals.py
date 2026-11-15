"""Surface mineral identifications from NASA EMIT inside each site footprint.

Used by sites.py (the result is the "mineralogy" block of each site in data/sites.json). To run alone:

    uv run --project pipeline pipeline/emit_minerals.py

Source: EMIT L2B Estimated Mineral Identification and Band Depth, 60 m (EMITL2BMIN, NASA LP DAAC),
with every flag (cloud, cirrus, water, spacecraft, aggregate) of the matching EMIT L2A mask product. EMIT is an imaging
spectrometer on the International Space Station; it sees latitudes up to about 52 degrees.

Per site: the granules whose outline contains the site (product version 2, plus version 1 for
scenes version 2 does not hold), least cloudy first, at most MAX_TRIES of them. The first one in which at least MIN_VALID of the footprint pixels are free of cloud, cirrus
and water is used; if none qualifies the mineralogy is null with the reason. Nothing is merged
across dates. For each of the product's two mineral groups the file lists the share of valid
footprint pixels with an identification and the most frequent spectral-library matches with their
mean band depth. Names are the product's own library names. An identification is a best spectral
match, not an abundance, and it is weak where plants cover the ground.
"""
from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

import h5py
import numpy as np
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import CACHE, DATA, USER_AGENT, read_env_token  # noqa: E402

CMR = "https://cmr.earthdata.nasa.gov/search/granules.umm_json"
MIN_COLLECTIONS = [("EMITL2BMIN", "002"), ("EMITL2BMIN", "001")]
MASK_COLLECTIONS = [("EMITL2AMASK", "003"), ("EMITL2AMASK", "002"), ("EMITL2ARFL", "001")]
MAX_TRIES = 8
MIN_VALID = 0.5
TOP = 5
RAW = CACHE / "emit"
RAW.mkdir(exist_ok=True)
M_PER_DEG = 111194.9
# Every band of the L2A mask whose name ends in "flag" removes a pixel when set: cloud, cirrus, water,
# spacecraft, dilated cloud, the aggregate flag and, in newer masks, the SpecTf cloud flag. Reading only
# the older cloud flags is not enough: in newer masks they are empty and the cloud is in the SpecTf flag
# (seen at Kawah Ijen, 2026-04-27: older flags 0, SpecTf cloud flag 1 over the whole footprint).


def _cmr(short_name: str, version: str, **params) -> list[dict]:
    r = requests.get(CMR, params={"short_name": short_name, "version": version, "page_size": 200, **params},
                     headers={"User-Agent": USER_AGENT}, timeout=60)
    r.raise_for_status()
    return [i["umm"] for i in r.json()["items"]]


def _download(url: str) -> Path:
    p = RAW / url.split("/")[-1]
    if not p.exists():
        tmp = p.with_suffix(".part")
        for attempt in range(5):
            try:
                with requests.get(url, headers={"Authorization": "Bearer " + read_env_token(), "User-Agent": USER_AGENT},
                                  stream=True, timeout=(30, 600)) as r:
                    r.raise_for_status()
                    with open(tmp, "wb") as f:
                        for chunk in r.iter_content(1 << 20):
                            f.write(chunk)
                break
            except requests.RequestException as e:
                status = getattr(e.response, "status_code", None)
                if attempt == 4 or status in (401, 403, 404):
                    raise RuntimeError(f"download failed ({status or type(e).__name__}): {p.name}") from None
                time.sleep(5 * (attempt + 1))
        tmp.rename(p)
    return p


def _nc_url(g: dict, must: str, must_not: str = "\0") -> str | None:
    for u in g.get("RelatedUrls", []):
        name = u["URL"].split("/")[-1]
        if u["URL"].startswith("https") and name.endswith(".nc") and must in name and must_not not in name:
            return u["URL"]
    return None


def _scene_key(granule_ur: str) -> str:
    """Acquisition start time in an EMIT granule name (yyyymmddThhmmss): the same for every product of one scene."""
    return re.search(r"\d{8}T\d{6}", granule_ur).group(0)


def _mask_for(g: dict) -> tuple[np.ndarray, str] | None:
    """True where the L2A mask flags cloud, cirrus or water, for the same scene. None if no mask granule is found."""
    t = g["TemporalExtent"]["RangeDateTime"]
    for sn, ver in MASK_COLLECTIONS:
        for m in _cmr(sn, ver, temporal=f"{t['BeginningDateTime']},{t['EndingDateTime']}"):
            if _scene_key(m["GranuleUR"]) != _scene_key(g["GranuleUR"]):
                continue
            url = _nc_url(m, "MASK")
            if not url:
                continue
            p = _download(url)
            with h5py.File(p) as f:
                names = [n.decode().strip().lower() if isinstance(n, bytes) else str(n).strip().lower()
                         for n in f["sensor_band_parameters/mask_bands"][:]]
                idx = [i for i, n in enumerate(names) if n.endswith("flag")]
                if not idx:
                    continue
                assert any("cloud" in names[i] for i in idx), names
                bad = np.zeros(f["mask"].shape[:2], bool)
                for i in idx:
                    band = f["mask"][:, :, i]
                    bad |= (band > 0.5) | (band < 0) | ~np.isfinite(band)   # set, or no mask value at all
            p.unlink()
            return bad, f"{m['GranuleUR']} (flags: {', '.join(names[i] for i in idx)})"
    return None


def site_minerals(lat: float, lon: float, side_km: float) -> dict:
    # Both product versions are searched: version 2 first, then version 1 scenes that version 2 does not have.
    granules, seen = [], set()
    for rank, (sn, ver) in enumerate(MIN_COLLECTIONS):
        for g in _cmr(sn, ver, point=f"{lon},{lat}"):
            if _scene_key(g["GranuleUR"]) not in seen:
                seen.add(_scene_key(g["GranuleUR"]))
                g["_collection"], g["_rank"] = f"{sn} v{ver}", rank
                granules.append(g)
    if not granules:
        return {"covered": False, "reason": "No EMIT L2B mineral granule contains the site."}
    granules.sort(key=lambda g: (g.get("CloudCover") is None, g.get("CloudCover") or 0, g["_rank"]))
    collection = "EMITL2BMIN v002 and v001"
    dlat = side_km * 500 / M_PER_DEG
    dlon = dlat / np.cos(np.radians(lat))
    tried = []
    for g in granules[:MAX_TRIES]:
        rec = {"granule": g["GranuleUR"], "date": g["TemporalExtent"]["RangeDateTime"]["BeginningDateTime"][:10],
               "sceneCloudPct": g.get("CloudCover")}
        tried.append(rec)
        url = _nc_url(g, "MIN_", "UNCERT")
        if not url:
            rec["skipped"] = "no data file listed"
            continue
        p = _download(url)
        with h5py.File(p) as f:
            la, lo = f["location/lat"][:], f["location/lon"][:]
            inside = (np.abs(la - lat) <= dlat) & (np.abs(lo - lon) <= dlon)
            n_in = int(inside.sum())
            # The footprint is wholly inside the scene when none of its pixels lies on the edge of the image.
            on_edge = inside[0].any() or inside[-1].any() or inside[:, 0].any() or inside[:, -1].any()
            if n_in == 0 or on_edge:
                rec["skipped"] = "footprint not wholly inside the scene"
                p.unlink()
                continue
            mask = _mask_for(g)
            if mask is None:
                rec["skipped"] = "no matching L2A mask granule"
                p.unlink()
                continue
            bad, mask_name = mask
            valid = inside & ~bad
            # Pixels the mineral product itself left empty (fill value) are no retrieval, not "no mineral".
            fill = int(f["group_1_mineral_id"].attrs["_FillValue"][0])
            valid &= (f["group_1_mineral_id"][:] != fill) & (f["group_2_mineral_id"][:] != fill)
            rec["validShare"] = round(float(valid.sum() / n_in), 3)
            if rec["validShare"] < MIN_VALID:
                rec["skipped"] = f"under {MIN_VALID:.0%} of the footprint has a retrieval free of cloud, cirrus and water"
                p.unlink()
                continue
            index = f["mineral_metadata/index"][:]
            names = [x.decode() for x in f["mineral_metadata/name"][:]]
            # Version 1 files have no "sample_name"; the library title is then null.
            titles = ([x.decode() for x in f["mineral_metadata/sample_name"][:]] if "sample_name" in f["mineral_metadata"]
                      else [None] * len(names))
            by_index = {int(i): (n, t) for i, n, t in zip(index, names, titles)}
            groups = {}
            for gi in (1, 2):
                ids = f[f"group_{gi}_mineral_id"][:][valid]
                depth = f[f"group_{gi}_band_depth"][:][valid]
                found = ids > 0
                top = []
                vals, counts = np.unique(ids[found], return_counts=True)
                for v, c in sorted(zip(vals, counts), key=lambda x: -x[1])[:TOP]:
                    name, title = by_index.get(int(v), (None, None))
                    top.append({"libraryName": name, "libraryTitle": title,
                                "shareOfValidPixels": round(float(c / valid.sum()), 3),
                                "meanBandDepth": round(float(depth[ids == v].mean()), 4)})
                groups[f"group{gi}"] = {"identifiedShare": round(float(found.mean()), 3), "top": top}
            version = f.attrs.get("title", b"")
            version = version.decode() if isinstance(version, bytes) else str(version)
        p.unlink()
        return {"covered": True, "collection": g["_collection"], "product": version, "granule": rec["granule"], "date": rec["date"],
                "sceneCloudPct": rec["sceneCloudPct"], "mask": mask_name, "pixels": int(valid.sum()), "pixelsInFootprint": n_in,
                "validShare": rec["validShare"], **groups, "granulesAvailable": len(granules), "tried": tried}
    return {"covered": True, "collection": collection, "granulesAvailable": len(granules), "tried": tried,
            "reason": f"EMIT has {len(granules)} granules over the site, but none of the {len(tried)} least cloudy ones gave a usable footprint."}


if __name__ == "__main__":
    for s in json.loads((DATA / "sites.json").read_text())["sites"]:
        m = s.get("mineralogy") or {}
        v = m.get("value")
        print(f"{s['id']:<26}", "null: " + str(m.get('note'))[:110] if v is None else
              f"{m['date']} valid {m['validShare']} | g1 {v['group1']['identifiedShare']} {[t['libraryName'] for t in v['group1']['top'][:2]]}"
              f" | g2 {v['group2']['identifiedShare']} {[t['libraryName'] for t in v['group2']['top'][:2]]}")

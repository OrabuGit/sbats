# Session B decisions

Small choices made without asking, one line each with the reason.

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-11-14 | Site footprints are squares of 2 to 5 km centred on the analogs.json coordinates; the side per site is in `pipeline/sites.py` and in `data/sites.json` | A square maps directly onto the raster window; sizes follow the size of each feature |
| 2026-11-14 | Site terrain is reported twice: 463 m posts (`slope`, `roughness`) and about 31 m posts (`slopeFine`, `roughnessFine`) | Only the 463 m values are comparable with the targets and the grid; the fine values show the feature itself |
| 2026-11-14 | The 463 m window is a whole number of 463 m posts, so it is slightly smaller or larger than the stated footprint (written as `windowKm`) | Keeps the post spacing exactly the one used for the grid and targets |
| 2026-11-14 | Site bare-ground fraction = share of non-water Sentinel-2 pixels with annual NDVI below 0.2 | Common NDVI convention for bare rock, sand and soil (USGS remote sensing phenology guidance: 0.1 and below barren, 0.2 to 0.3 shrub and grass); the threshold is stored in the file |
| 2026-11-14 | Sentinel-2 snow observations are left out of site NDVI and reported as `snowObsShare` | Matches the approved rule that bare ground means exposed, ice-free ground |
| 2026-11-14 | Only Sentinel-2 scenes flagged `earthsearch:boa_offset_applied` are used (about 92% of scenes) | The other scenes may carry a different reflectance offset; mixing them would bias NDVI |
| 2026-11-14 | Up to 3 least-cloudy Sentinel-2 scenes per month, scene cloud cover under 80%, cloud masked per pixel | Tropical sites rarely have a clear scene; per-pixel masking over several scenes gives most pixels data in most months |
| 2026-11-14 | Site rock type uses Macrostrat regional maps only at large, medium or small scale, never its generalized world map | The world map was wrong at two Indonesian sites (sediment at a lava tube, volcanic at a limestone karst) |
| 2026-11-14 | Where no regional map exists, rock type is the volcano's major rock type from the Smithsonian GVP, labelled scale "volcano"; otherwise null | A verifiable database value; nothing is inferred for non-volcanic sites |
| 2026-11-14 | Site rock names map to a GLiM class code only through an exact-name table in `pipeline/sites.py`; anything else has code null | Avoids guessing a class for mixed or unusual units such as impact breccia |
| 2026-11-14 | Monthly site climate covers all 40 sites in analogs.json and takes the value of the POWER grid cell containing the site, no interpolation | "Never interpolate"; the file labels every field scale "grid" |
| 2026-11-14 | Monthly precipitation is stored as mm/month (source mm/day times days in month, February 28.25) | A monthly total is what a "best month" chart needs; the conversion is stated in the file |
| 2026-11-14 | Solar irradiance is POWER `ALLSKY_SFC_SW_DWN` in W/m2 (24 hour mean, horizontal surface, all sky), from the CERES SYN1deg 1 degree grid | It is the surface value the sandbox formula needs; W/m2 matches the Moon and Mars figures in DESIGN.md |

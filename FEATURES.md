# Where everything is

Checked in the browser from the home page as a first-time visitor on 2026-11-15. A click is one press on a labelled
button or tab. "Nav" means the word in the top bar, which is on every page.

| Feature | Where it is | Clicks from home |
| --- | --- | --- |
| Guided tour (10 steps, skippable) | Starts by itself on the first visit; "Tour" in the top bar replays it | 0 first visit, 1 later |
| Live pairs between the worlds | The home hero, running by itself; press a pin to pick your own | 0 |
| What you can do (five cards on the Tambora and Shackleton pair) | Home, under the hero | 1 to open any feature |
| Find analog: pick a world, a place, then Earth | Nav "Find analog" | 1 to start, 3 to reach the ranked matches |
| Heatmap of Earth, ranked list, what the match is for (four purposes) | Matches step | 3 |
| Named sites tab | Matches step, tab "Named sites" | 4 |
| Match page | Click a row of the list | 4 |
| Match tabs: Overview, Full data, What to test here, 3D terrain, Report | Pinned text tabs at the top of a match | 4 to open the match, 1 for each tab |
| Score rings and the weakest link | Match, Overview | 4 |
| Sunlight comparison | Match, Overview | 4 |
| Top three measurements, "See all measurements" | Match, Overview | 4 |
| Seven kinds of testing, rated from our data (or "Not assessed") | Match, tab "What to test here" | 5 |
| Field logistics (country, nearest airport, place, volcano, elevation, months) | Match and site pages, tab "What to test here" | 5 |
| Full data: factor table, cross-sections, slope histograms, monthly climate | Match, tab "Full data" | 5 (1 from the home card "Compare factor by factor") |
| Compare slider, side by side | Match, tab "3D terrain" | 5 |
| 3D terrain preview | Match, top right of Overview | 4 |
| Full 3D view (surfaces, contours, exaggeration, sun) | "Open 3D terrain" under the preview; site pages "Open full 3D view" | 5 (1 from the home card "Fly the terrain") |
| Rover route planner and example route | Inside the 3D view, panel "View", section "Route" | 6 (1 from the home card "Plan a rover route") |
| Base planner | Match, tab "3D terrain", "Work with this place" | 5 |
| Report, CSV, GeoJSON | Match, tab "Report" | 5 |
| Save a match or base | "Save" on the match page; nav "Saved" lists them | 5 to save, 1 to list |
| Explore the data (two-factor chart of every Earth cell) | Home card "Explore the data", or "Open the chart" on the ranked matches | 1 |
| Custom conditions | Find analog, step 1, the card "Custom" | 2 |
| Five team story pairs with the tool's own verdict, the Earth site beside its Moon or Mars target | Home, section "Featured sites · proposed by the team" | 0 (scroll) |
| Featured sites, benchmarks and team stories | Nav "Featured sites" | 1 |
| Site pages, with a row of all the other sites at the top | Featured sites, then a site, or a pair on the home page | 1 to 2 |
| Validation, incl. remove-one-factor and agreement cards | Nav "Validation" | 1 |
| Method, scoring walkthrough, limits and known gaps (caves) | Nav "Method" | 1 |
| Learn (bases, rovers, worlds, history) | Nav "Learn" | 1 |
| AI assistance record | Footer link "AI assistance" on the home, Learn, Method, Validation and site pages | 1 after scrolling to the footer |

Nothing important lives only in the footer. The footer holds the AI assistance record, which is also stated in the README.

## Without graphics acceleration
The whole flow works on a device that cannot draw WebGL (check it with `?nogl` in the address): the Moon and Mars picker and the Earth heatmap are flat maps with the same pins and the same clicks, the match page has all its data, and the Pick-a-world and locator pictures are still images. Only the 3D terrain view says "3D needs graphics acceleration on this device"; the example route and its profile are still planned and shown. Every page is inside an error boundary, so a failure shows a message and a way back.

## Load time, measured
Method: the built site served from this machine with a link shaped like Chrome's Fast 4G (9 Mbit/s shared, 165 ms before every response, gzip for text, no cache). "Usable" is the moment the home page first draws, read from a performance mark.

| | Before (commit c1cd2ad) | After |
|---|---|---|
| Home page usable | 2.8 s and 3.5 s in two runs | 1.8 s and 2.1 s in two runs |
| Data sent before it is usable | 1.9 MB | 1.3 MB |
| Data sent in the first 20 s | 11.6 and 14.4 MB | 4.4 MB |
| Textures | three 2048 files twice, then the 4096 files | three 2048 files once; 4096 only where a big globe opens |

The simulation is not the same as Chrome's own throttling, so read the figures as a comparison of the two builds, not as a promise of a time on any one connection.

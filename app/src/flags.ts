// Feature flags. Unfinished features stay hidden behind a flag so the live site always builds.
export const flags = {
  /**
   * RECON split view and base sandbox (checkpoints 3 and 4). Runs on data/modules.json. If that
   * file is ever missing, step 3 locks in a production build rather than show the UI fixture's
   * placeholder numbers; `?sandbox=fixture` opens it anyway, labelled.
   */
  recon: true,
  /** BOOTS 3D terrain view (checkpoint 5): site and target side by side from data/extracts. */
  boots: true,
  /** Method page: the scoring formula and the ranking rules. */
  methodPage: true,
  /**
   * "Best month to test" in the dossier and on site pages, from data/site_climate.json (named
   * sites only). The rule is in src/lib/bestMonth.ts.
   */
  bestMonth: true,
  /** Featured site pages from data/sites.json. */
  sitePages: true,
  /** Print-ready report of a match, with CSV and GeoJSON export. */
  report: true,
  /** Terrain page: route, rover, slope colours. */
  terrain: true,
  /**
   * Step 2 "click any point" and named places without a curated target: a target is built from the
   * body's global grid (lib/targets). Works for a body whose grid file exists (data/moon.json today).
   */
  anyPoint: true,
  /** Stability of a rank in the results list and on the match page (Session C's rankStability). */
  stability: true,
  /**
   * NASA EMIT mineral identifications for the Indonesian sites. Off: Session B found that the
   * mineralogy built on 2026-11-15 was not screened with every cloud flag, so some identifications
   * may be cloud. Turn on only when Session C confirms the rebuilt file.
   */
  indonesiaMinerals: false,
} as const;

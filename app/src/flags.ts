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
  report: false,
  /** Terrain page: route, rover, slope colours. */
  terrain: false,
  /**
   * Step 2 "click any point" on the Moon or Mars. Off: the data has measured values for the listed
   * base sites only. Turn on when Session B publishes values for arbitrary points.
   */
  anyPoint: false,
  /** Stability of a rank in the results list. Off until the scoring library publishes it. */
  stability: false,
} as const;

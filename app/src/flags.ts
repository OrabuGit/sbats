// Feature flags. Unfinished features stay hidden behind a flag so the live site always builds.
export const flags = {
  /** RECON split view and base sandbox (checkpoint 3). */
  recon: false,
  /** BOOTS 3D terrain shot (checkpoint 5). */
  boots: false,
  /** Method page: the scoring formula and the ranking rules. */
  methodPage: true,
  /**
   * "Best month to test" in the dossier. Off until the pipeline publishes monthly climate data:
   * earth.json holds annual values only, and the app does not invent a month.
   */
  bestMonth: false,
} as const;

// Feature flags. Unfinished features stay hidden behind a flag so the live site always builds.
export const flags = {
  /** RECON split view and base sandbox (checkpoint 3). */
  recon: false,
  /** BOOTS 3D terrain shot (checkpoint 5). */
  boots: false,
  /** Method and validation pages (checkpoint 2). */
  methodPage: false,
} as const;

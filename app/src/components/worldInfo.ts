export type WorldId = 'earth' | 'moon' | 'mars';

/** Volumetric mean radius, km (NASA NSSDCA planetary fact sheets). Used to draw the worlds at true relative size. */
export const WORLD_RADIUS_KM: Record<WorldId, number> = { earth: 6371.0, moon: 1737.4, mars: 3389.5 };
export const WORLD_NAME: Record<WorldId, string> = { earth: 'Earth', moon: 'Moon', mars: 'Mars' };
export const WORLD_CREDIT =
  'Earth: Blue Marble, NASA Earth Observatory. Moon: LROC WAC mosaic, NASA/GSFC/Arizona State University. Mars: Viking MDIM 2.1, NASA/JPL/USGS.';

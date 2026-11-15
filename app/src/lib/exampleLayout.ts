import type { SavedLayout } from './simAdapter';

/** A small starting base, so there is something to deploy. A layout only: every number still comes from modules.json. */
export const EXAMPLE_LAYOUT: SavedLayout = {
  resupplyEveryDays: 10,
  modules: [
    { type: 'habitat', x: 11, y: 5 },
    { type: 'iceMiner', x: 14, y: 7 },
    { type: 'landingPad', x: 19, y: 9 },
    ...[4, 5, 6, 7, 8, 9, 10, 11].map((x) => ({ type: 'solar' as const, x, y: 2 })),
    ...[6, 7, 8, 9].flatMap((x) => [4, 5, 6].map((y) => ({ type: 'battery' as const, x, y }))),
  ],
};

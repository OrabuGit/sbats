/** A path drawn on one terrain, in km from the centre (x east, z south). */
export interface RouteDraw {
  points: { x: number; z: number }[];
  /** Per segment (points.length - 1): 0 normal, 1 over 75% of the slope limit (amber), 2 over the limit (red, dashed). */
  steep?: (0 | 1 | 2)[];
  /** A straight line shown to explain a block, not a route: drawn muted, and no rover drives it. */
  straight?: boolean;
  /** Where to put the waypoint markers. Defaults to every point. */
  waypoints?: { x: number; z: number }[];
}

/** Slope classes for the surface colours and their legend: upper bound in degrees and a flat colour. */
export const SLOPE_CLASSES: { upTo: number; label: string; color: string }[] = [
  { upTo: 5, label: '0 to 5°', color: '#3a434c' },
  { upTo: 10, label: '5 to 10°', color: '#6b5a2e' },
  { upTo: 15, label: '10 to 15°', color: '#9c7421' },
  { upTo: 25, label: '15 to 25°', color: '#cd8f11' },
  { upTo: Infinity, label: 'over 25°', color: '#ffb000' },
];

// Rover route planner over an elevation grid. Pure TypeScript, no UI, no file or network access.
//
// README
// - Input: a square elevation grid (row-major, north row first, metres, NaN = no data) with its post
//   spacing `pixelM`, waypoints in grid pixels (`col` east, `row` south; first = start, last = end),
//   and a rover slope limit in degrees read from data/rovers.json by the caller. Nothing is typed here.
// - Search: A* on an 8-connected grid made of every `stride`-th post (default: the smallest stride that
//   keeps a side at or under 400 nodes, so a 667-post Earth extract uses every 2nd post). Distances use the
//   true spacing, `pixelM * stride` metres per straight step and that times sqrt(2) per diagonal step.
// - A step is forbidden when its slope, atan(|rise| / run) between the two posts, is over the limit, or
//   when either post has no data. Cost of a step = run * (1 + slopePenalty * slope / limit), so the search
//   prefers the shortest path and, among near-equal ones, the gentler one. The heuristic is the octile
//   distance, which never overestimates, so the path found is optimal for that cost.
// - Legs are planned one after the other, waypoint to waypoint. If a leg has no path under the limit the
//   plan stops there and reports the straight line of that leg: its sections over the limit (length and
//   steepest slope), and the reachable post closest to the leg's end.
// - Limits: steps go in 8 directions only, so a planned length can be up to about 8% longer than a free
//   path; slopes are measured over the stride spacing, and a coarser spacing reads gentler. Not survey-grade.
//
// Tests: npx tsx --test app/src/lib/__tests__/routePlan.test.ts

export interface PlanGrid {
  /** Posts per side. */
  size: number;
  /** Metres between neighbouring posts. */
  pixelM: number;
  /** size * size heights in metres, row-major. NaN is no data. */
  data: Float32Array;
}

/** A point in grid pixels of the full grid. May be fractional. */
export interface GridPoint {
  col: number;
  row: number;
}

export interface PlanOptions {
  /** Steepest step allowed, degrees. */
  limitDeg: number;
  /** Use every `stride`-th post. Defaults to strideFor(size). */
  stride?: number;
  /** Extra cost per unit of slope as a share of the limit. Defaults to 0.2. */
  slopePenalty?: number;
}

export interface PlanSample {
  /** The post, in full-grid pixels. */
  col: number;
  row: number;
  /** Distance along the path from the start of the plan, metres. */
  distanceM: number;
  elevationM: number;
  /** Slope of the step that arrives at this post, degrees; 0 for the first post. */
  slopeDeg: number;
}

export interface StraightSection {
  /** Distance along the straight line from the leg's start, metres. */
  fromM: number;
  toM: number;
  lengthM: number;
  maxSlopeDeg: number;
}

export interface Blocked {
  /** Index of the leg (waypoint `leg` to waypoint `leg + 1`) that has no path. */
  leg: number;
  reason: 'slope' | 'no data';
  /** The straight line of that leg, sampled at the stride spacing. elevationM null where there is no data. */
  straight: { col: number; row: number; distanceM: number; elevationM: number | null; slopeDeg: number | null }[];
  /** Runs of the straight line steeper than the limit. */
  sections: StraightSection[];
  /** Sum of the section lengths, metres (0 when there are none), and the steepest slope among them (null when there are none). */
  overLimitM: number;
  maxSlopeDeg: number | null;
  /** The reachable post closest to the leg's end, and its distance from it in metres. */
  closest: GridPoint;
  closestToEndM: number;
}

export interface PlanResult {
  ok: boolean;
  limitDeg: number;
  stride: number;
  /** Metres between the posts used. */
  spacingM: number;
  /** The planned path: every post visited, start to end. On failure, the legs planned before the block. */
  samples: PlanSample[];
  distanceM: number;
  climbM: number;
  descentM: number;
  maxSlopeDeg: number;
  /** Waypoints given, including start and end. */
  waypoints: number;
  blocked: Blocked | null;
}

export const DEFAULT_MAX_NODES = 400;
export const DEFAULT_SLOPE_PENALTY = 0.2;

/** Smallest stride that keeps one side of the search grid at or under maxNodes posts. */
export function strideFor(size: number, maxNodes = DEFAULT_MAX_NODES): number {
  return Math.max(1, Math.ceil((size - 1) / (maxNodes - 1)));
}

/** "every post", "every 2nd post", "every 3rd post". */
export function strideWords(stride: number): string {
  if (stride <= 1) return 'every post';
  const s = stride % 100 >= 11 && stride % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][stride % 10] ?? 'th';
  return `every ${stride}${s} post`;
}

const deg = (rise: number, run: number) => (Math.atan(Math.abs(rise) / run) * 180) / Math.PI;

/** Bilinear height at a fractional pixel, or null outside the grid or next to no data. */
export function heightAt(g: PlanGrid, col: number, row: number): number | null {
  if (!(col >= 0 && row >= 0 && col <= g.size - 1 && row <= g.size - 1)) return null;
  const c0 = Math.min(g.size - 2, Math.floor(col));
  const r0 = Math.min(g.size - 2, Math.floor(row));
  const fc = col - c0;
  const fr = row - r0;
  const at = (c: number, r: number) => g.data[r * g.size + c];
  const a = at(c0, r0);
  const b = at(c0 + 1, r0);
  const c = at(c0, r0 + 1);
  const d = at(c0 + 1, r0 + 1);
  if ([a, b, c, d].some((v) => Number.isNaN(v))) return null;
  return a * (1 - fc) * (1 - fr) + b * fc * (1 - fr) + c * (1 - fc) * fr + d * fc * fr;
}

/** Binary min-heap of node indices keyed by a score array. */
class Heap {
  private items: number[] = [];
  private keys: number[] = [];
  get size() {
    return this.items.length;
  }
  push(item: number, key: number) {
    const a = this.items;
    const k = this.keys;
    a.push(item);
    k.push(key);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= k[i]) break;
      [a[p], a[i]] = [a[i], a[p]];
      [k[p], k[i]] = [k[i], k[p]];
      i = p;
    }
  }
  pop(): number {
    const a = this.items;
    const k = this.keys;
    const top = a[0];
    const lastA = a.pop() as number;
    const lastK = k.pop() as number;
    if (a.length > 0) {
      a[0] = lastA;
      k[0] = lastK;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && k[l] < k[m]) m = l;
        if (r < a.length && k[r] < k[m]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        [k[m], k[i]] = [k[i], k[m]];
        i = m;
      }
    }
    return top;
  }
}

const DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

interface Coarse {
  n: number;
  stride: number;
  spacingM: number;
  h: Float32Array;
}

function coarse(g: PlanGrid, stride: number): Coarse {
  const n = Math.floor((g.size - 1) / stride) + 1;
  const h = new Float32Array(n * n);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) h[r * n + c] = g.data[r * stride * g.size + c * stride];
  return { n, stride, spacingM: g.pixelM * stride, h };
}

/** A* between two coarse nodes. Returns the node path, or null and the reachable node closest to the goal. */
function search(cg: Coarse, from: number, to: number, limitDeg: number, penalty: number): { path: number[] | null; closest: number } {
  const { n, h, spacingM } = cg;
  const g = new Float64Array(n * n).fill(Infinity);
  const prev = new Int32Array(n * n).fill(-1);
  const closed = new Uint8Array(n * n);
  const tc = to % n;
  const tr = Math.floor(to / n);
  const heur = (i: number) => {
    const dc = Math.abs((i % n) - tc);
    const dr = Math.abs(Math.floor(i / n) - tr);
    return spacingM * (Math.max(dc, dr) + (Math.SQRT2 - 1) * Math.min(dc, dr));
  };
  const heap = new Heap();
  g[from] = 0;
  heap.push(from, heur(from));
  let closest = from;
  let closestH = heur(from);
  while (heap.size > 0) {
    const i = heap.pop();
    if (closed[i]) continue;
    closed[i] = 1;
    const hi = heur(i);
    if (hi < closestH) {
      closestH = hi;
      closest = i;
    }
    if (i === to) break;
    const c = i % n;
    const r = (i - c) / n;
    const zi = h[i];
    for (const [dc, dr] of DIRS) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= n || nr >= n) continue;
      const j = nr * n + nc;
      if (closed[j]) continue;
      const zj = h[j];
      if (Number.isNaN(zj)) continue;
      const run = dc !== 0 && dr !== 0 ? spacingM * Math.SQRT2 : spacingM;
      const s = deg(zj - zi, run);
      if (s > limitDeg) continue;
      const cost = g[i] + run * (1 + (penalty * s) / limitDeg);
      if (cost < g[j]) {
        g[j] = cost;
        prev[j] = i;
        heap.push(j, cost + heur(j));
      }
    }
  }
  if (!closed[to]) return { path: null, closest };
  const path: number[] = [];
  for (let k = to; k !== -1; k = prev[k]) path.push(k);
  return { path: path.reverse(), closest };
}

/** The straight line of a leg sampled at the spacing, with its runs steeper than the limit. */
function straightLine(grid: PlanGrid, a: GridPoint, b: GridPoint, spacingM: number, limitDeg: number) {
  const lenM = Math.hypot(b.col - a.col, b.row - a.row) * grid.pixelM;
  const steps = Math.max(1, Math.ceil(lenM / spacingM));
  const run = lenM / steps;
  const straight: Blocked['straight'] = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const col = a.col + (b.col - a.col) * t;
    const row = a.row + (b.row - a.row) * t;
    const z = heightAt(grid, col, row);
    const before = straight[k - 1]?.elevationM;
    const slopeDeg = k > 0 && z !== null && before !== null && before !== undefined && run > 0 ? deg(z - before, run) : null;
    straight.push({ col, row, distanceM: run * k, elevationM: z, slopeDeg });
  }
  const sections: StraightSection[] = [];
  let open: StraightSection | null = null;
  for (let k = 1; k < straight.length; k++) {
    const s = straight[k].slopeDeg;
    if (s !== null && s > limitDeg) {
      if (!open) {
        open = { fromM: straight[k - 1].distanceM, toM: straight[k].distanceM, lengthM: 0, maxSlopeDeg: s };
        sections.push(open);
      }
      open.toM = straight[k].distanceM;
      open.lengthM = open.toM - open.fromM;
      open.maxSlopeDeg = Math.max(open.maxSlopeDeg, s);
    } else open = null;
  }
  return { straight, sections };
}

/**
 * Plans a route through the waypoints in order over the grid, with no step steeper than the limit.
 * Throws on fewer than two waypoints or a limit that is not a positive number.
 */
export function planRoute(grid: PlanGrid, waypoints: GridPoint[], opts: PlanOptions): PlanResult {
  if (waypoints.length < 2) throw new Error('planRoute needs a start and an end');
  if (!(opts.limitDeg > 0)) throw new Error('planRoute needs a slope limit in degrees');
  if (grid.data.length !== grid.size * grid.size) throw new Error('grid data does not match its size');
  const stride = Math.max(1, Math.floor(opts.stride ?? strideFor(grid.size)));
  const penalty = opts.slopePenalty ?? DEFAULT_SLOPE_PENALTY;
  const cg = coarse(grid, stride);
  const { n, spacingM } = cg;
  const nodeOf = (p: GridPoint) => {
    const c = Math.max(0, Math.min(n - 1, Math.round(p.col / stride)));
    const r = Math.max(0, Math.min(n - 1, Math.round(p.row / stride)));
    return r * n + c;
  };
  const result: PlanResult = {
    ok: true,
    limitDeg: opts.limitDeg,
    stride,
    spacingM,
    samples: [],
    distanceM: 0,
    climbM: 0,
    descentM: 0,
    maxSlopeDeg: 0,
    waypoints: waypoints.length,
    blocked: null,
  };
  const push = (node: number) => {
    const c = node % n;
    const r = (node - c) / n;
    const z = cg.h[node];
    const last = result.samples[result.samples.length - 1];
    if (!last) {
      result.samples.push({ col: c * stride, row: r * stride, distanceM: 0, elevationM: z, slopeDeg: 0 });
      return;
    }
    const run = Math.hypot(c * stride - last.col, r * stride - last.row) * grid.pixelM;
    if (run === 0) return;
    const rise = z - last.elevationM;
    const s = deg(rise, run);
    result.distanceM += run;
    if (rise > 0) result.climbM += rise;
    else result.descentM -= rise;
    result.maxSlopeDeg = Math.max(result.maxSlopeDeg, s);
    result.samples.push({ col: c * stride, row: r * stride, distanceM: result.distanceM, elevationM: z, slopeDeg: s });
  };
  for (let leg = 0; leg < waypoints.length - 1; leg++) {
    const from = nodeOf(waypoints[leg]);
    const to = nodeOf(waypoints[leg + 1]);
    const noData = Number.isNaN(cg.h[from]) || Number.isNaN(cg.h[to]);
    const found = noData ? { path: null, closest: from } : search(cg, from, to, opts.limitDeg, penalty);
    if (!found.path) {
      const { straight, sections } = straightLine(grid, waypoints[leg], waypoints[leg + 1], spacingM, opts.limitDeg);
      const cc = found.closest % n;
      const cr = (found.closest - cc) / n;
      const tc = to % n;
      const tr = (to - tc) / n;
      result.ok = false;
      result.blocked = {
        leg,
        reason: noData ? 'no data' : 'slope',
        straight,
        sections,
        overLimitM: sections.reduce((s, x) => s + x.lengthM, 0),
        maxSlopeDeg: sections.length ? Math.max(...sections.map((s) => s.maxSlopeDeg)) : null,
        closest: { col: cc * stride, row: cr * stride },
        closestToEndM: Math.hypot(tc - cc, tr - cr) * spacingM,
      };
      return result;
    }
    for (const node of found.path) push(node);
  }
  return result;
}

/** Steepness class of a slope against a limit: 0 under 75% of it, 1 from 75% up to the limit, 2 over it. */
export function steepClass(slopeDeg: number | null, limitDeg: number): 0 | 1 | 2 {
  if (slopeDeg === null) return 0;
  if (slopeDeg > limitDeg) return 2;
  if (slopeDeg > 0.75 * limitDeg) return 1;
  return 0;
}

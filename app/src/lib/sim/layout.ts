import { MODULE_TYPES } from './types';
import type { Layout, ModuleType, PlacedModule } from './types';

// A saved base design, small enough for a share link.
//
// Text form:   1.<crew>.<resupply>.<modules>
//   1          format version
//   <crew>     crew on site, or "-" for "fill every habitat place"
//   <resupply> days between cargo deliveries, or "-" for none
//   <modules>  three characters per module: a letter for the type, then x and y in base 36 (0-9, a-z)
// Only letters, digits, "." and "-" are used, so the string needs no escaping in a URL.
// Example: "1.4.10.h00s10s20b01" is a habitat at (0,0), solar arrays at (1,0) and (2,0), a battery at (0,1),
// four crew, cargo every 10 days.

export const LAYOUT_VERSION = 1;
export const GRID_SIZE = 36;
export const MAX_MODULES = 200;

const CODES: Record<ModuleType, string> = { habitat: 'h', solar: 's', battery: 'b', greenhouse: 'g', iceMiner: 'i', landingPad: 'p' };
const TYPES = new Map<string, ModuleType>(MODULE_TYPES.map((t) => [CODES[t], t]));

export interface SavedLayout extends Layout {
  /** Days between cargo deliveries. null: no resupply. */
  resupplyEveryDays: number | null;
}

export class LayoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LayoutError';
  }
}

function checkModule(m: PlacedModule): void {
  if (!MODULE_TYPES.includes(m.type)) throw new LayoutError(`unknown module type "${String(m.type)}"`);
  for (const v of [m.x, m.y]) {
    if (!Number.isInteger(v) || v < 0 || v >= GRID_SIZE) throw new LayoutError(`grid position must be a whole number from 0 to ${GRID_SIZE - 1}, got ${String(v)}`);
  }
}

/** Checks a layout: known module types, positions on the grid, no two modules on one square, sane crew and resupply. */
export function validateLayout(layout: SavedLayout): void {
  if (!Array.isArray(layout.modules)) throw new LayoutError('modules must be a list');
  if (layout.modules.length > MAX_MODULES) throw new LayoutError(`at most ${MAX_MODULES} modules`);
  const taken = new Set<number>();
  for (const m of layout.modules) {
    checkModule(m);
    const square = m.x * GRID_SIZE + m.y;
    if (taken.has(square)) throw new LayoutError(`two modules on square ${m.x}, ${m.y}`);
    taken.add(square);
  }
  if (layout.crew !== undefined && (!Number.isInteger(layout.crew) || layout.crew < 0 || layout.crew > 999)) {
    throw new LayoutError('crew must be a whole number from 0 to 999');
  }
  const r = layout.resupplyEveryDays;
  if (r !== null && (!Number.isInteger(r) || r < 1 || r > 999)) throw new LayoutError('resupply interval must be a whole number of days from 1 to 999, or null');
}

/** Encodes a layout as a short URL-safe string. Throws LayoutError if the layout is not valid. */
export function encodeLayout(layout: SavedLayout): string {
  validateLayout(layout);
  const modules = layout.modules.map((m) => CODES[m.type] + m.x.toString(36) + m.y.toString(36)).join('');
  return [LAYOUT_VERSION, layout.crew ?? '-', layout.resupplyEveryDays ?? '-', modules].join('.');
}

/** Decodes a string made by encodeLayout. Throws LayoutError on anything it does not recognise. */
export function decodeLayout(text: string): SavedLayout {
  if (typeof text !== 'string' || text.length > 4 * MAX_MODULES + 32) throw new LayoutError('not a layout string');
  const parts = text.split('.');
  if (parts.length !== 4) throw new LayoutError('a layout string has four parts separated by "."');
  const [version, crewText, resupplyText, body] = parts as [string, string, string, string];
  if (version !== String(LAYOUT_VERSION)) throw new LayoutError(`unsupported layout version "${version}"`);
  const whole = (s: string, what: string): number => {
    if (!/^\d{1,3}$/.test(s)) throw new LayoutError(`${what} must be a number or "-"`);
    return Number(s);
  };
  if (!/^([a-z][0-9a-z]{2})*$/.test(body)) throw new LayoutError('module list is malformed');
  const modules: PlacedModule[] = [];
  for (let i = 0; i < body.length; i += 3) {
    const type = TYPES.get(body[i] as string);
    if (!type) throw new LayoutError(`unknown module code "${body[i]}"`);
    modules.push({ type, x: parseInt(body[i + 1] as string, 36), y: parseInt(body[i + 2] as string, 36) });
  }
  const layout: SavedLayout = { modules, resupplyEveryDays: resupplyText === '-' ? null : whole(resupplyText, 'resupply interval') };
  if (crewText !== '-') layout.crew = whole(crewText, 'crew');
  validateLayout(layout);
  return layout;
}

/** The same layout as a plain JSON object, for browser storage. */
export function layoutToJson(layout: SavedLayout): { v: number; crew: number | null; resupplyEveryDays: number | null; modules: [string, number, number][] } {
  validateLayout(layout);
  return { v: LAYOUT_VERSION, crew: layout.crew ?? null, resupplyEveryDays: layout.resupplyEveryDays, modules: layout.modules.map((m) => [m.type, m.x, m.y]) };
}

export function layoutFromJson(json: unknown): SavedLayout {
  const j = json as { v?: unknown; crew?: unknown; resupplyEveryDays?: unknown; modules?: unknown };
  if (!j || typeof j !== 'object' || j.v !== LAYOUT_VERSION || !Array.isArray(j.modules)) throw new LayoutError('not a saved layout');
  const modules = (j.modules as unknown[]).map((entry) => {
    if (!Array.isArray(entry) || entry.length !== 3) throw new LayoutError('each module is [type, x, y]');
    return { type: entry[0] as ModuleType, x: entry[1] as number, y: entry[2] as number };
  });
  const layout: SavedLayout = { modules, resupplyEveryDays: (j.resupplyEveryDays ?? null) as number | null };
  if (j.crew !== null && j.crew !== undefined) layout.crew = j.crew as number;
  validateLayout(layout);
  return layout;
}

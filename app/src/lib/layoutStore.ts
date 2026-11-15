// The base layout being worked on, kept in memory so the sandbox and the terrain page see the same one.
import type { SavedLayout } from './simAdapter';
import type { RouteResult } from './matchAdapter';

let last: SavedLayout | null = null;
export const getLastLayout = () => last;
export const setLastLayout = (l: SavedLayout) => {
  last = l;
};

// Routes measured on the terrain page, kept so the report of the same pair can include them.
const routes = new Map<string, { label: string; result: RouteResult }[]>();
export const routeKey = (earthId: string, targetId: string) => `${earthId}|${targetId}`;
export const getRoutes = (key: string) => routes.get(key) ?? [];
export const setRoutes = (key: string, list: { label: string; result: RouteResult }[]) => {
  if (list.length === 0) routes.delete(key);
  else routes.set(key, list);
};

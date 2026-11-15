// The base layout being worked on, kept in memory so the sandbox and the terrain page see the same one.
import type { SavedLayout } from './simAdapter';

let last: SavedLayout | null = null;
export const getLastLayout = () => last;
export const setLastLayout = (l: SavedLayout) => {
  last = l;
};

// Saved locations: a target and an Earth cell, kept in this browser only.
import { useCallback, useEffect, useState } from 'react';

export interface SavedLocation {
  id: string;
  targetId: string;
  targetName: string;
  /** Set when the target is a picked point rather than a listed base site, so it can be rebuilt. */
  targetPoint?: { body: 'moon' | 'mars'; lat: number; lon: number };
  lat: number;
  lon: number;
  name: string;
  score: number | null;
  /** False when the target has no temperature: the score runs high and must not be read beside others. */
  comparable?: boolean;
  savedAt: string;
}

const KEY = 'sbats.saved.v1';
const EVENT = 'sbats-saved';

function read(): SavedLocation[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? (list as SavedLocation[]).filter((x) => x && typeof x.id === 'string' && typeof x.lat === 'number') : [];
  } catch {
    return [];
  }
}

export const savedId = (targetId: string, lat: number, lon: number) => `${targetId}@${lat},${lon}`;

/** The saved list, with add and remove. `error` is set when the browser refuses to store. */
export function useSaved() {
  const [list, setList] = useState<SavedLocation[]>(read);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setList(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const write = useCallback((next: SavedLocation[]) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
      setError(null);
      window.dispatchEvent(new Event(EVENT));
    } catch (e) {
      setError(`Could not save in this browser: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);
  const add = useCallback((s: SavedLocation) => write([s, ...read().filter((x) => x.id !== s.id)].slice(0, 50)), [write]);
  const remove = useCallback((id: string) => write(read().filter((x) => x.id !== id)), [write]);
  return { list, add, remove, error };
}

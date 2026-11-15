// Which country a point on Earth is in, from Natural Earth (world-atlas, 1:110m). Used to say what a
// grid cell is: a cell code and coordinates alone do not tell a person where on Earth it is.
import { useEffect, useState } from 'react';
import { feature } from 'topojson-client';
import { geoContains } from 'd3-geo';
import type { Feature, Geometry } from 'geojson';

type Country = Feature<Geometry, { name: string }>;
let loaded: Promise<Country[]> | null = null;

function countries(): Promise<Country[]> {
  loaded ??= import('world-atlas/countries-110m.json').then((m) => {
    const topo = m.default as unknown as Parameters<typeof feature>[0];
    const fc = feature(topo, (topo as unknown as { objects: { countries: never } }).objects.countries) as unknown as { features: Country[] };
    return fc.features;
  });
  return loaded;
}

const cache = new Map<string, string | null>();
const key = (lat: number, lon: number) => `${lat.toFixed(2)},${lon.toFixed(2)}`;

/** The country containing the point, or null for the open sea or a coast the 1:110m outline misses. */
export async function countryAt(lat: number, lon: number): Promise<string | null> {
  const k = key(lat, lon);
  if (cache.has(k)) return cache.get(k) ?? null;
  const list = await countries();
  let name: string | null = null;
  for (const c of list) {
    if (geoContains(c, [lon, lat])) {
      name = c.properties.name;
      break;
    }
  }
  cache.set(k, name);
  return name;
}

/** Country names for a set of points, filled in as the outline loads. A point without one maps to null. */
export function useCountries(points: { lat: number; lon: number }[]): Map<string, string | null> {
  const [names, setNames] = useState<Map<string, string | null>>(new Map());
  const sig = points.map((p) => key(p.lat, p.lon)).join('|');
  useEffect(() => {
    let alive = true;
    Promise.all(points.map(async (p) => [key(p.lat, p.lon), await countryAt(p.lat, p.lon)] as const)).then((rows) => {
      if (alive) setNames(new Map(rows));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return names;
}
export const countryKey = key;

// Field logistics from data/logistics.json (Session B, pipeline/logistics.py; shape in data/SCHEMA.md).
// One 5 MB columnar file: entry k of every cells.* array belongs to cell k of earth.json, and the 21 sites
// have their own rows. It is fetched only when a match or site page asks for it, and cached by loadExtra.
// Every value is read as written. A null is "no data". Distances are straight-line, not travel time.
import type { ReactNode } from 'react';
import type { Badge } from '../types';
import { loadData, loadExtra } from '../data/access';
import { useAsync } from '../lib/useAsync';
import { SourceBadge } from './Badges';

type Idx = (number | null)[];
export interface LogisticsFile {
  meta: {
    sources: { country: string; airport: string; populatedPlace: string; volcano: string; elevation: string; climate: string };
    activeSince: number;
    cellCount: number;
    badge?: string;
  };
  tables: {
    countries: string[];
    airports: { name: string; iata: string | null; icao: string | null; country: string; municipality: string | null }[];
    places: { name: string; country: string; population: number | null }[];
    volcanoes: { number: number; name: string; lastEruptionYear: number | null }[];
  };
  sites: SiteLogistics[];
  cells: {
    country: Idx;
    airport: Idx;
    airportKm: Idx;
    place: Idx;
    placeKm: Idx;
    volcano: Idx;
    volcanoKm: Idx;
    elevationM: Idx;
    driestThreeMonthsStart: Idx;
    warmestMonth: Idx;
    coldestMonth: Idx;
    sunniestMonth: Idx;
    wettestMonth?: Idx;
  };
}
export interface SiteLogistics {
  id?: string;
  siteId?: string;
  name?: string;
  country: string | null;
  airport: { name: string; iata: string | null; country: string; km: number | null } | null;
  populatedPlace: { name: string; population: number | null; km: number | null } | null;
  volcano: { name: string; number: number; lastEruptionYear: number | null; km: number | null } | null;
  elevationFootprintM?: { min: number | null; max: number | null; source: string } | null;
  elevationCellMeanM: number | null;
  climateWindows: {
    driestThreeMonths: number[] | null;
    driestThreeMonthsPrecipMm?: number | null;
    warmestMonth: number | null;
    coldestMonth: number | null;
    sunniestMonth: number | null;
    wettestMonth: number | null;
  } | null;
}

export const loadLogistics = () => loadExtra<LogisticsFile>('logistics.json');

/** One place's logistics in one shape, for a cell or a site. */
export interface PlaceLogistics {
  scale: 'cell' | 'site';
  country: string | null;
  airport: { name: string; code: string | null; km: number | null } | null;
  place: { name: string; population: number | null; km: number | null } | null;
  volcano: { name: string; lastEruptionYear: number | null; km: number | null } | null;
  elevationMeanM: number | null;
  elevationFootprint: { min: number | null; max: number | null; source: string } | null;
  driest: number[] | null;
  driestPrecipMm: number | null;
  warmest: number | null;
  coldest: number | null;
  wettest: number | null;
  sunniest: number | null;
}

const at = <T,>(arr: T[] | undefined, i: number | null | undefined): T | null => (arr && typeof i === 'number' && i >= 0 && i < arr.length ? arr[i] : null);

export function fromSite(s: SiteLogistics): PlaceLogistics {
  const cw = s.climateWindows;
  return {
    scale: 'site',
    country: s.country ?? null,
    airport: s.airport ? { name: s.airport.name, code: s.airport.iata, km: s.airport.km } : null,
    place: s.populatedPlace ? { name: s.populatedPlace.name, population: s.populatedPlace.population, km: s.populatedPlace.km } : null,
    volcano: s.volcano ? { name: s.volcano.name, lastEruptionYear: s.volcano.lastEruptionYear, km: s.volcano.km } : null,
    elevationMeanM: s.elevationCellMeanM ?? null,
    elevationFootprint: s.elevationFootprintM ?? null,
    driest: cw?.driestThreeMonths?.length ? cw.driestThreeMonths : null,
    driestPrecipMm: cw?.driestThreeMonthsPrecipMm ?? null,
    warmest: cw?.warmestMonth ?? null,
    coldest: cw?.coldestMonth ?? null,
    wettest: cw?.wettestMonth ?? null,
    sunniest: cw?.sunniestMonth ?? null,
  };
}

export function fromCell(f: LogisticsFile, k: number): PlaceLogistics {
  const c = f.cells;
  const ap = at(f.tables.airports, at(c.airport, k));
  const pl = at(f.tables.places, at(c.place, k));
  const vo = at(f.tables.volcanoes, at(c.volcano, k));
  const start = at(c.driestThreeMonthsStart, k);
  return {
    scale: 'cell',
    country: at(f.tables.countries, at(c.country, k)),
    airport: ap ? { name: ap.name, code: ap.iata ?? ap.icao, km: at(c.airportKm, k) } : null,
    place: pl ? { name: pl.name, population: pl.population, km: at(c.placeKm, k) } : null,
    volcano: vo ? { name: vo.name, lastEruptionYear: vo.lastEruptionYear, km: at(c.volcanoKm, k) } : null,
    elevationMeanM: at(c.elevationM, k),
    elevationFootprint: null,
    driest: start === null ? null : [0, 1, 2].map((d) => ((start - 1 + d) % 12) + 1),
    driestPrecipMm: null,
    warmest: at(c.warmestMonth, k),
    coldest: at(c.coldestMonth, k),
    wettest: at(c.wettestMonth, k),
    sunniest: at(c.sunniestMonth, k),
  };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = (m: number | null) => (m !== null && m >= 1 && m <= 12 ? MONTHS[m - 1] : 'no data');
const km = (v: number | null) => (v === null ? 'distance: no data' : `${v.toLocaleString('en-US', { maximumFractionDigits: v < 10 ? 1 : 0 })} km straight-line`);
const m = (v: number) => `${Math.round(v).toLocaleString('en-US').replace('-', '−')} m`;

/**
 * The logistics of a place: a site by id, or an Earth cell by its lat and lon (looked up in earth.json,
 * whose order logistics.json follows). Both files are cached, so a second page costs nothing.
 */
export function usePlaceLogistics(where: { siteId: string } | { lat: number; lon: number } | null): { status: 'loading' | 'ready' | 'none'; place: PlaceLogistics | null; file: LogisticsFile | null } {
  const key = where === null ? 'none' : 'siteId' in where ? `s-${where.siteId}` : `c-${where.lat},${where.lon}`;
  const s = useAsync(async () => {
    if (where === null) return null;
    const f = await loadLogistics();
    if (!f) return null;
    if ('siteId' in where) {
      const row = f.sites.find((r) => (r.id ?? r.siteId) === where.siteId);
      return { f, place: row ? fromSite(row) : null };
    }
    const bundle = await loadData();
    if (bundle.origin.earth !== 'real' || bundle.earth.cells.length !== f.cells.country.length) return { f, place: null };
    const k = bundle.earth.cells.findIndex((c) => c.lat === where.lat && c.lon === where.lon);
    return { f, place: k < 0 ? null : fromCell(f, k) };
  }, `logistics-${key}`);
  if (s.status === 'loading') return { status: 'loading', place: null, file: null };
  if (s.status === 'error' || !s.value) return { status: 'none', place: null, file: null };
  return { status: 'ready', place: s.value.place, file: s.value.f };
}

const MEASURED: Badge = 'Measured';
const LITERATURE: Badge = 'Literature';

export interface LogisticsLine {
  label: string;
  value: string;
  badge: ReactNode;
  source: string;
}

/** The lines to show for one place, each with its badge and source. A missing value reads "no data". */
export function logisticsLines(p: PlaceLogistics, f: LogisticsFile | null): LogisticsLine[] {
  const src = f?.meta.sources;
  const since = f?.meta.activeSince ?? 1900;
  const cellNote = p.scale === 'cell' ? ' Value of the 0.5 degree grid cell.' : ' Value of the grid cell holding the site.';
  const climate = src?.climate ?? 'NASA POWER monthly climatology 2001-2020';
  const climateBadge = <SourceBadge badge={MEASURED} source={climate} />;
  // Reference records (airports, places, volcanoes, countries) carry the Literature badge, as in SOURCES.md.
  const ref = (what: string) => <SourceBadge badge={LITERATURE} source={`${what}. Distance is straight-line (great-circle), computed by pipeline/logistics.py; not travel distance or time.`} />;
  const lines: LogisticsLine[] = [
    { label: 'Country', value: p.country ?? 'no data', badge: p.country ? <SourceBadge badge={LITERATURE} source={src?.country ?? 'Natural Earth'} /> : null, source: src?.country ?? 'Natural Earth' },
    {
      label: 'Nearest airport with scheduled service',
      value: p.airport ? `${p.airport.name}${p.airport.code ? ` (${p.airport.code})` : ''}, ${km(p.airport.km)}` : 'no data',
      badge: p.airport ? ref(src?.airport ?? 'OurAirports') : null,
      source: `${src?.airport ?? 'OurAirports'}. Straight-line, not travel time; the nearest may not be the most practical.`,
    },
    {
      label: 'Nearest populated place',
      value: p.place ? `${p.place.name}${p.place.population !== null ? `, population ${p.place.population.toLocaleString('en-US')}` : ''}, ${km(p.place.km)}` : 'no data',
      badge: p.place ? ref(src?.populatedPlace ?? 'Natural Earth') : null,
      source: `${src?.populatedPlace ?? 'Natural Earth'}. Straight-line, not travel time.`,
    },
    {
      label: `Nearest volcano erupted since ${since}`,
      value: p.volcano ? `${p.volcano.name}${p.volcano.lastEruptionYear !== null ? `, last eruption ${p.volcano.lastEruptionYear}` : ''}, ${km(p.volcano.km)}` : 'no data',
      badge: p.volcano ? ref(src?.volcano ?? 'Smithsonian Global Volcanism Program') : null,
      source: `${src?.volcano ?? 'Smithsonian Global Volcanism Program'}. Straight-line.`,
    },
    {
      label: 'Mean land elevation, grid cell',
      value: p.elevationMeanM === null ? 'no data' : m(p.elevationMeanM),
      badge: p.elevationMeanM === null ? null : <SourceBadge badge={MEASURED} source={src?.elevation ?? 'ETOPO 2022'} />,
      source: `${src?.elevation ?? 'NOAA NCEI ETOPO 2022'}. A cell mean, not the height at the place.`,
    },
  ];
  if (p.elevationFootprint && p.elevationFootprint.min !== null && p.elevationFootprint.max !== null)
    lines.push({
      label: 'Elevation range in the site footprint',
      value: `${m(p.elevationFootprint.min)} to ${m(p.elevationFootprint.max)}`,
      badge: <SourceBadge badge={MEASURED} source={p.elevationFootprint.source} />,
      source: p.elevationFootprint.source,
    });
  lines.push(
    {
      label: 'Driest three months',
      value: p.driest ? `${p.driest.map(monthName).join(', ')}${p.driestPrecipMm !== null && p.driestPrecipMm !== undefined ? `, ${Math.round(p.driestPrecipMm)} mm in total` : ''}` : 'no data',
      badge: p.driest ? climateBadge : null,
      source: `${climate}.${cellNote}`,
    },
    { label: 'Warmest month', value: monthName(p.warmest), badge: p.warmest ? climateBadge : null, source: `${climate}.${cellNote}` },
    { label: 'Coldest month', value: monthName(p.coldest), badge: p.coldest ? climateBadge : null, source: `${climate}.${cellNote}` },
    { label: 'Wettest month', value: monthName(p.wettest), badge: p.wettest ? climateBadge : null, source: `${climate}.${cellNote}` },
    { label: 'Sunniest month', value: monthName(p.sunniest), badge: p.sunniest ? climateBadge : null, source: `${climate}.${cellNote}` },
  );
  return lines;
}

import type { Badge } from '../types';
import type { MatchRecord } from '../lib/matchAdapter';
import { loadExtra } from '../data/access';
import type { ExtractItem } from '../data/sites';
import { useAsync } from '../lib/useAsync';
import { dayLengths, dayMeaning, hoursText, limitFromRovers, precipMeaning, reliefMeaning, roughnessMeaning, slopeMeaning, tempMeaning, type RoversLike } from '../lib/plainResults';
import { ComputedBadge, SourceBadge } from './Badges';
import { Reveal } from './HomeStory';
import { Block } from './ValidationParts';

/** One measured value with where it came from. value null is "no data". */
export interface LogisticsValue {
  value: number | null;
  badge: Badge | null;
  source: string | null;
  /** What the value describes, for example "footprint, 20 km" or "grid cell, 55 km". */
  scale?: string;
}

interface Props {
  lat: number;
  tempMean: LogisticsValue | null;
  precip: LogisticsValue | null;
  slope: LogisticsValue | null;
  roughness: LogisticsValue | null;
  /** Highest minus lowest height of the same-scale elevation extract. null when none was built. */
  relief: { item: ExtractItem; windowKm: number } | null;
  /** 'match' is a band on the match page; 'site' is a block of the site page. */
  variant?: 'match' | 'site';
}

/** The earth-side measurements of a match record, as logistics values. */
export function logisticsFromRecord(record: MatchRecord): Pick<Props, 'tempMean' | 'precip' | 'slope' | 'roughness'> {
  const rows = record.dimensions.flatMap((d) => d.rows);
  const get = (key: string): LogisticsValue | null => {
    const side = rows.find((r) => r.key === key)?.earth;
    if (!side) return null;
    const scale = side.scale === 'site' ? `footprint${record.earth.footprintKm ? `, ${record.earth.footprintKm} km` : ''}` : side.scale === 'volcano' ? 'whole volcano' : 'grid cell, 55 km';
    return { value: typeof side.value === 'number' ? side.value : null, badge: side.badge, source: side.source, scale };
  };
  return { tempMean: get('tempMean'), precip: get('precip'), slope: get('slope'), roughness: get('roughness') };
}

const minus = (s: string) => s.replace('-', '−');

function Row({ label, value, badge, meaning }: { label: string; value: string; badge: React.ReactNode; meaning: string }) {
  return (
    <div className="grid gap-x-8 gap-y-1 border-t border-line py-4 md:grid-cols-[minmax(0,200px)_minmax(0,260px)_minmax(0,1fr)]">
      <dt className="text-[14px] text-text">{label}</dt>
      <dd className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`num text-[15px] ${value === 'no data' ? 'text-muted' : 'text-text'}`}>{value}</span>
        {badge}
      </dd>
      <dd className="text-[13px] leading-5 text-muted">{meaning}</dd>
    </div>
  );
}

const NO_DATA = 'No data for this place.';

/**
 * Quantities a field team would plan around, all worked out from numbers this page already has.
 * Day lengths are computed from latitude (lib/plainResults.ts, rule 6); the rest are measured values
 * with their own badge and a sentence from a fixed rule. Nothing here is a travel time or a distance.
 */
export function FieldLogistics({ lat, tempMean, precip, slope, roughness, relief, variant = 'match' }: Props) {
  const rovers = useAsync(() => loadExtra<RoversLike>('rovers.json'), 'rovers-logistics');
  const limit = rovers.status === 'ready' ? limitFromRovers(rovers.value) : null;
  const { longest, shortest } = dayLengths(lat);
  const tag = (v: LogisticsValue | null) => (v?.value === null || !v ? null : <SourceBadge badge={v.badge} source={v.source} />);
  const at = (v: LogisticsValue | null) => (v?.scale ? ` (${v.scale})` : '');
  const reliefM = relief?.item.elevation ? relief.item.elevation.max - relief.item.elevation.min : null;
  const slopeBadge = (
    <>
      {tag(slope)}
      {slope?.value != null && limit && <SourceBadge badge="Literature" source={`${limit.rover} slope limit: ${limit.source}`} />}
    </>
  );
  const intro = 'What a field team would plan around, worked out from the numbers for this place. No travel times and no distances: the data has none.';
  const rows = (
    <dl className="mt-5">
            <Row
              label="Latitude"
              value={minus(`${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`)}
              badge={<ComputedBadge title="The place's own coordinate." />}
              meaning="Sets how long the days are and how high the Sun climbs."
            />
            <Row
              label="Longest and shortest day"
              value={`${hoursText(longest)} and ${hoursText(shortest)}`}
              badge={<ComputedBadge title="Computed from latitude with the sunrise equation and the Earth's axial tilt of 23.44 degrees. No refraction." />}
              meaning={dayMeaning(lat)}
            />
            <Row
              label={`Mean temperature${at(tempMean)}`}
              value={tempMean?.value == null ? 'no data' : minus(`${tempMean.value.toFixed(1)} °C`)}
              badge={tag(tempMean)}
              meaning={tempMean?.value == null ? NO_DATA : tempMeaning(tempMean.value)}
            />
            <Row
              label={`Precipitation${at(precip)}`}
              value={precip?.value == null ? 'no data' : `${precip.value.toFixed(0)} mm/year`}
              badge={tag(precip)}
              meaning={precip?.value == null ? NO_DATA : precipMeaning(precip.value)}
            />
            <Row
              label={`Mean slope${at(slope)}`}
              value={slope?.value == null ? 'no data' : `${slope.value.toFixed(1)}°`}
              badge={slopeBadge}
              meaning={slope?.value == null ? NO_DATA : slopeMeaning(slope.value, limit)}
            />
            <Row
              label={`Roughness${at(roughness)}`}
              value={roughness?.value == null ? 'no data' : `${roughness.value.toFixed(roughness.value < 10 ? 1 : 0)} m`}
              badge={tag(roughness)}
              meaning={roughness?.value == null ? NO_DATA : roughnessMeaning(roughness.value)}
            />
            {relief && (
              <Row
                label={`Relief of the ${relief.windowKm} km window`}
                value={reliefM === null ? 'no data' : `${Math.round(reliefM).toLocaleString('en-US')} m`}
                badge={relief.item.elevation ? <SourceBadge badge={relief.item.elevation.badge} source={relief.item.elevation.product} /> : null}
                meaning={reliefM === null ? NO_DATA : reliefMeaning(reliefM, relief.windowKm)}
              />
            )}
            <div className="border-t border-line" aria-hidden="true" />
    </dl>
  );
  if (variant === 'site') {
    return (
      <Block id="s-logistics" label="Field logistics" title="What a team would plan around." lead={intro}>
        <Reveal className="max-w-[1200px]">{rows}</Reveal>
      </Block>
    );
  }
  return (
    <section className="border-t border-line" aria-labelledby="h-logistics">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-10 sm:px-10">
        <Reveal>
          <h3 id="h-logistics" className="display text-[24px] leading-8 text-text">
            Field logistics
          </h3>
          <p className="mt-1 max-w-[64ch] text-[14px] leading-[22px] text-muted">{intro}</p>
          {rows}
        </Reveal>
      </div>
    </section>
  );
}

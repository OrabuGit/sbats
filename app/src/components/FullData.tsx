import type { CellScore, EarthCell, EarthFile, Target } from '../types';
import type { MatchRecord, SharedMinerals } from '../lib/matchAdapter';
import type { ExtractItem } from '../data/sites';
import type { SiteClimate } from '../data/sandbox';
import type { MetaByKey } from '../lib/format';
import { Reveal } from './HomeStory';
import { FullDataTable } from './FullDataTable';
import { ElevationSection, SlopeSection } from './FullDataCharts';
import { ClimateSection } from './FullDataClimate';
import { FactsSection } from './FullDataFacts';
import { factorLines } from './FullDataCalc';
import { useMemo } from 'react';
import { loadData } from '../data/access';
import { loadSiteClimate } from '../data/sandbox';
import { useAsync } from '../lib/useAsync';

interface Props {
  record: MatchRecord;
  explained: CellScore;
  cell: EarthCell;
  target: Target;
  meta: MetaByKey;
  placeName: string;
  scale: 'grid' | 'site';
  ground: { earth: ExtractItem | null; target: ExtractItem | null; windowKm: number };
  /** data/earth.json. Left out (undefined): taken from the app's cached data load, so no second download. null: none. */
  earth?: EarthFile | null;
  /** data/site_climate.json. Left out (undefined): taken from the cached loader. null: none. */
  climate?: SiteClimate | null;
  /** Minerals shared with the target, from the match library. Optional. */
  minerals?: SharedMinerals | null;
}

const H4 = 'display text-[18px] leading-7 text-text';

/** Every number behind the match, with its unit, source and resolution, and the two places drawn on the same axes. */
export function FullData({ record, explained, cell, target, meta, placeName, scale, ground, earth: earthProp, climate: climateProp, minerals = null }: Props) {
  // Both files are already loaded and cached by the app; these only read the cache when the caller passed nothing.
  const bundle = useAsync(() => (earthProp === undefined ? loadData() : Promise.resolve(null)), `fd-earth-${earthProp === undefined}`);
  const files = useAsync(() => (climateProp === undefined ? loadSiteClimate() : Promise.resolve(null)), `fd-climate-${climateProp === undefined}`);
  const earth = earthProp !== undefined ? earthProp : bundle.status === 'ready' && bundle.value ? bundle.value.earth : null;
  const climate = climateProp !== undefined ? climateProp : files.status === 'ready' ? files.value : null;
  const lines = useMemo(() => factorLines(record, earth, explained), [record, earth, explained]);
  const site = scale === 'site';
  const earthName = placeName.split(',')[0];
  const targetName = target.name.split(',')[0];
  const pad = 'mx-auto w-full max-w-[1200px] px-5 sm:px-10';
  return (
    <section className={`${pad} py-10`} aria-labelledby="h-full">
      <h3 id="h-full" className="display text-[24px] leading-8 text-text">
        Full data
      </h3>
      <p className="mt-1 max-w-[72ch] text-[14px] leading-[22px] text-muted">
        Every number behind this match, with its unit, source and resolution, and the two places drawn on the same axes. Nothing here is typed in: values come from the data files or are computed in your browser from them.
      </p>

      <Reveal className="mt-8 min-w-0">
        <h4 className={H4}>Every measurement</h4>
        <div className="mt-3">
          <FullDataTable lines={lines} targetName={target.name} haveEarth={earth !== null} />
        </div>
      </Reveal>

      <Reveal className="mt-12 min-w-0">
        <h4 className={H4}>Elevation cross-sections, same scale</h4>
        <div className="mt-3">
          <ElevationSection earth={ground.earth} target={ground.target} earthName={earthName} targetName={targetName} />
        </div>
      </Reveal>

      <Reveal className="mt-12 min-w-0">
        <h4 className={H4}>Slope distribution</h4>
        <div className="mt-3">
          <SlopeSection earth={ground.earth} target={ground.target} earthName={earthName} targetName={targetName} />
        </div>
      </Reveal>

      <Reveal className="mt-12 min-w-0">
        <h4 className={H4}>Monthly climate at the Earth site</h4>
        <div className="mt-3">
          <ClimateSection climate={climate} siteId={record.earth.id} name={placeName} />
        </div>
      </Reveal>

      <Reveal className="mt-12 min-w-0">
        <h4 className={`${H4} mb-3`}>Rock, minerals, ground cover, position and confidence</h4>
        <FactsSection
          record={record}
          cell={cell}
          target={target}
          meta={meta}
          earth={earth}
          minerals={minerals}
          confidence={site ? record.score.confidence : explained.confidence}
          coverage={site ? record.score.coverage : explained.coverage}
          missing={site ? record.score.missing : explained.missing}
          siteScale={site}
        />
      </Reveal>
    </section>
  );
}

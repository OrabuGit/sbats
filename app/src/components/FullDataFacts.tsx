import type { Confidence, EarthCell, EarthFile, FactorKey, Target } from '../types';
import type { MatchRecord, MatchSide, SharedMinerals } from '../lib/matchAdapter';
import { formatCoords } from '../lib/geo';
import { formatValue, keyLabel, type MetaByKey } from '../lib/format';
import { ComputedBadge, ConfidenceBadge, SourceBadge } from './Badges';
import { fmtN } from './FullDataCalc';

function Side({ side }: { side: MatchSide | null }) {
  if (!side || side.value === null) return <span className="text-muted">no data</span>;
  return (
    <span className="flex flex-wrap items-center gap-x-2">
      <span className="text-text">{side.text}</span>
      {side.scale === 'computed' ? <ComputedBadge /> : <SourceBadge badge={side.badge} source={side.source} />}
    </span>
  );
}

function Row({ label, earth, target, targetName }: { label: string; earth: React.ReactNode; target: React.ReactNode; targetName: string }) {
  return (
    <div className="grid gap-x-8 gap-y-2 border-t border-line py-4 md:grid-cols-[170px_minmax(0,1fr)_minmax(0,1fr)]">
      <dt className="text-[14px] font-semibold text-text">{label}</dt>
      <dd className="min-w-0 text-[14px] leading-[22px]">
        <span className="label block md:hidden">Earth</span>
        {earth}
      </dd>
      <dd className="min-w-0 text-[14px] leading-[22px]">
        <span className="label block md:hidden">{targetName}</span>
        {target}
      </dd>
    </div>
  );
}

const pct = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? `${fmtN(v * 100, 1)}% of the cell's land` : null);

function Share({ v, badge, source }: { v: number | null | undefined; badge: 'Measured' | 'Mission' | 'Literature' | null; source: string | null }) {
  const t = pct(v);
  if (!t) return <span className="text-muted">no data</span>;
  return (
    <span className="flex flex-wrap items-center gap-x-2">
      <span className="num text-text">{t}</span>
      <SourceBadge badge={badge} source={source} />
    </span>
  );
}

export interface FactsProps {
  record: MatchRecord;
  cell: EarthCell;
  target: Target;
  meta: MetaByKey;
  earth: EarthFile | null;
  minerals: SharedMinerals | null;
  confidence: Confidence | null;
  coverage: number;
  missing: readonly FactorKey[];
  siteScale: boolean;
}

/** Rock type, minerals, bare ground, position and confidence, for both places. */
export function FactsSection({ record, cell, target, meta, earth, minerals, confidence, coverage, missing, siteScale }: FactsProps) {
  const rows = record.dimensions.flatMap((d) => d.rows);
  const rock = rows.find((r) => r.key === 'lithology') ?? null;
  const mineral = record.dimensions.find((d) => d.id === 'minerals')?.rows[0] ?? null;
  const lc = earth?.meta.landCover?.keys ?? [];
  const barren = lc.find((k) => k.key === 'barrenFrac');
  const ice = lc.find((k) => k.key === 'snowIceFrac');
  const lcSource = earth?.meta.landCover?.source ?? null;
  const rockFallback = cell.lithology !== null && cell.lithology !== undefined ? formatValue('lithology', cell.lithology, meta) : null;
  const footprintBare = record.earth.bareShare;
  const ndviRow = rows.find((r) => r.key === 'ndvi');
  const rockMeta = meta.lithology;

  return (
    <dl>
      <div className="hidden gap-x-8 pb-2 md:grid md:grid-cols-[170px_minmax(0,1fr)_minmax(0,1fr)]" aria-hidden="true">
        <span />
        <span className="label">Earth</span>
        <span className="label">{target.name}</span>
      </div>

      <Row
        label="Rock type"
        targetName={target.name}
        earth={
          rock?.earth.value !== null && rock ? (
            <Side side={rock.earth} />
          ) : rockFallback ? (
            <span className="flex flex-wrap items-center gap-x-2">
              <span className="text-text">{rockFallback}</span>
              <SourceBadge badge={rockMeta?.badge ?? null} source={rockMeta?.source ?? null} />
            </span>
          ) : (
            <span className="text-muted">no data</span>
          )
        }
        target={<Side side={rock?.target ?? null} />}
      />

      <Row
        label="Minerals"
        targetName={target.name}
        earth={
          <>
            <Side side={mineral?.earth ?? null} />
            {mineral?.earth.note && <span className="mt-1 block text-[12px] leading-4 text-muted">{mineral.earth.note}</span>}
          </>
        }
        target={
          <>
            <Side side={mineral?.target ?? null} />
            {minerals && (
              <span className="mt-1 block text-[12px] leading-4 text-muted">
                {minerals.shared.length > 0 && <span className="block">Found at both: {minerals.shared.map((m) => m.label).join(', ')}.</span>}
                {minerals.targetOnly.length > 0 && <span className="block">At the target, not identified here: {minerals.targetOnly.map((m) => m.label).join(', ')}.</span>}
                {minerals.earthOnly.length > 0 && <span className="block">Here, not reported at the target: {minerals.earthOnly.map((m) => m.label).join(', ')}.</span>}
              </span>
            )}
          </>
        }
      />

      <Row
        label="Bare ground"
        targetName={target.name}
        earth={
          <span className="block space-y-1">
            <span className="block">
              <span className="text-[12px] text-muted">Barren ground </span>
              <Share v={cell.barrenFrac} badge={barren?.badge ?? (earth ? null : 'Measured')} source={lcSource} />
            </span>
            <span className="block">
              <span className="text-[12px] text-muted">Permanent snow and ice </span>
              <Share v={cell.snowIceFrac} badge={ice?.badge ?? (earth ? null : 'Measured')} source={lcSource} />
            </span>
            {siteScale && footprintBare !== null && (
              <span className="block">
                <span className="text-[12px] text-muted">Bare ground in the {record.earth.footprintKm !== null ? `${fmtN(record.earth.footprintKm)} km ` : ''}footprint </span>
                <span className="flex flex-wrap items-center gap-x-2">
                  <span className="num text-text">{fmtN(footprintBare * 100, 1)}% of the footprint</span>
                  <SourceBadge badge={ndviRow?.earth.badge ?? null} source={ndviRow?.earth.source ?? null} />
                </span>
              </span>
            )}
          </span>
        }
        target={<span className="text-muted">no data</span>}
      />

      <Row
        label="Position"
        targetName={target.name}
        earth={
          <span className="num text-text">
            {formatCoords(record.earth.lat, record.earth.lon)}
            {(record.earth.lat !== cell.lat || record.earth.lon !== cell.lon) && <span className="block text-[12px] text-muted">cell centre {formatCoords(cell.lat, cell.lon)}</span>}
          </span>
        }
        target={<span className="num text-text">{formatCoords(target.lat, target.lon)}</span>}
      />

      <Row
        label="Confidence"
        targetName={target.name}
        earth={
          <span className="block">
            <ConfidenceBadge confidence={confidence} coverage={coverage} />
            <span className="num mt-1 block text-[13px] text-text">Factors with data cover {fmtN(coverage * 100)}% of the weight.</span>
            {missing.length > 0 && <span className="mt-0.5 block text-[12px] leading-4 text-muted">Left out for lack of data: {missing.map((k) => keyLabel(k, meta).toLowerCase()).join(', ')}.</span>}
            <span className="mt-0.5 flex items-center gap-2 text-[12px] text-muted">
              <ComputedBadge title="Computed in the browser by the scoring library from the factors that have data." />
              High needs full coverage, medium 0.8 or more, else low.
            </span>
          </span>
        }
        target={
          <span className="block">
            <ConfidenceBadge confidence={record.target.confidence} />
            <span className="mt-1 block text-[13px] leading-5 text-muted">
              {record.target.missing.length > 0 ? `The target has no published ${record.target.missing.map((k) => keyLabel(k, meta).toLowerCase()).join(', ')}.` : 'Every factor has a target value.'}
            </span>
          </span>
        }
      />
    </dl>
  );
}

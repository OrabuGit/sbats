import type { MatchRecord } from '../lib/matchAdapter';
import { AnalogProfile } from './AnalogProfile';
import { profileOf, scoreSentence, type ProfileDim } from '../lib/profile';
import { useEffect, useMemo, useRef } from 'react';
import type { Analog, CellScore, EarthCell, EarthFile, KeyBreakdown, Target } from '../types';
import type { CellIndex } from '../lib/geo';
import { formatCoords, siteCode } from '../lib/geo';
import { formatScore, formatShare, formatSim, formatValue, isSunKey, type MetaByKey } from '../lib/format';
import { PRESETS, PURPOSES, type TargetScorer } from '../lib/scoringAdapter';
import { bestMonth, MONTH_NAMES } from '../lib/bestMonth';
import { MATCH, MISS } from '../lib/verdict';
import type { ExtractIndex, FeaturedSite, SiteValue, SitesFile } from '../data/sites';
import type { SiteClimate } from '../data/sandbox';
import { ComputedBadge, ConfidenceBadge, SourceBadge, Tag } from './Badges';
import { BestMonthTable } from './BestMonth';
import { ELEMENT_NAME, isElement } from './ElementIcon';
import { Ground } from './Ground';
import { SiteTile } from './MapTile';
import { FieldLogistics, type LogisticsValue } from './FieldLogistics';
import { TeamStories } from './StoryTeam';
import { storiesFor, useStories } from '../data/stories';
import { Absent, DataTable, Td } from './InfoParts';
import { DimensionStrip, LedgerRow, ScaleSquares, Spark, type DimTile } from './SiteParts';
import { Block, CountUp, Meter, More, Rv, useSeen } from './ValidationParts';

interface Props {
  /** The match record of this site against a target, at the footprint. */
  recordFor?: (site: FeaturedSite, target: Target) => MatchRecord | null;
  sites: SitesFile;
  siteId: string;
  onSite: (id: string) => void;
  earth: EarthFile;
  index: CellIndex;
  meta: MetaByKey;
  targets: Target[];
  target: Target;
  onTarget: (id: string) => void;
  scorer: TargetScorer;
  analogs: Analog[];
  climate: SiteClimate | null;
  extracts: ExtractIndex | null;
  /** Opens the dossier of the grid cell around the site. */
  onDossier: (cellIndex: number) => void;
  /** Opens the base sandbox on the site's grid cell. null while the sandbox is not available. */
  onBuild: ((cellIndex: number) => void) | null;
  /** Opens the full 3D terrain view of this site against the current target, when both have an elevation extract. */
  onTerrain?: ((cellIndex: number) => void) | null;
}

const KIND_LABEL = { candidate: 'Proposed site', known: 'Known analog', negative: 'Negative control' } as const;
const SCALE_LABEL = { site: 'Footprint', volcano: 'Whole volcano', grid: 'Grid cell' } as const;
const COMPARED = ['slope', 'roughness', 'ndvi', 'lithology', 'precip', 'tempMean', 'tempRange', 'sunElevation'] as const;
const OTHER: { key: string; label: string }[] = [
  { key: 'slopeFine', label: 'Mean slope, 31 m posts' },
  { key: 'roughnessFine', label: 'Roughness, 31 m posts' },
  { key: 'bareFrac', label: 'Bare ground share' },
  { key: 'waterFrac', label: 'Open water share' },
  { key: 'snowObsShare', label: 'Snow in clear observations' },
  { key: 'rockType', label: 'Rock type, as named by the source' },
  { key: 'rockTypeVolcano', label: 'Rock type of the whole volcano' },
];

/** Short names: the earth.json labels describe the 0.5° window, which is wrong for a footprint. */
const NAMES: Record<string, string> = {
  slope: 'Mean slope',
  roughness: 'Roughness',
  ndvi: 'Vegetation (NDVI)',
  lithology: 'Rock class',
  precip: 'Precipitation',
  tempMean: 'Mean temperature',
  tempRange: 'Day-night temperature range',
  sunElevation: 'Noon Sun elevation',
};
const name = (key: string) => NAMES[key] ?? key;
const KEY_WORD = { precip: 'precipitation', tempMean: 'mean temperature', tempRange: 'day-night temperature range' } as const;
const fx = (v: number | null, d: number) => (v === null ? 'no data' : v.toFixed(d).replace('-', '−'));

const num = (v: SiteValue | undefined): number | null => (typeof v?.value === 'number' ? v.value : null);
const short = (n: string) => n.split(',')[0];
const region = (n: string) => n.split(',').slice(1).join(',').trim();

function otherText(key: string, v: SiteValue): string {
  if (v.value === null) return 'no data';
  if (typeof v.value === 'string') return v.value;
  if (key.endsWith('Frac') || key.endsWith('Share')) return formatShare(v.value);
  return `${v.value.toFixed(1)}${v.unit === 'degrees' ? '°' : ` ${v.unit}`}`;
}

const GROUPS: { kind: FeaturedSite['kind']; label: string }[] = [
  { kind: 'candidate', label: 'Proposed' },
  { kind: 'known', label: 'Established' },
  { kind: 'negative', label: 'Controls' },
];

/** Every featured site as a row of plain text tabs, proposed first, the current one underlined. Scrolls sideways on its own. */
function SiteTabs({ sites, current, onSite }: { sites: FeaturedSite[]; current: string; onSite: (id: string) => void }) {
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = row.current;
    const on = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el || !on) return;
    // Bring the current tab into the row's view without moving the page.
    el.scrollLeft = Math.max(0, on.offsetLeft - el.clientWidth / 2 + on.offsetWidth / 2);
  }, [current]);
  return (
    <nav aria-label="Featured sites" className="border-b border-line">
      <div ref={row} className="relative flex items-stretch gap-x-6 overflow-x-auto px-5 sm:px-10 lg:px-16">
        {GROUPS.map((g) => {
          const list = sites.filter((s) => s.kind === g.kind);
          if (list.length === 0) return null;
          return (
            <div key={g.kind} className="flex shrink-0 items-stretch gap-x-5" role="group" aria-label={g.label}>
              <span className="label flex items-center">{g.label}</span>
              {list.map((s) => {
                const on = s.id === current;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSite(s.id)}
                    aria-current={on ? 'page' : undefined}
                    className={`min-h-11 shrink-0 whitespace-nowrap border-b-2 text-[14px] transition-colors ${on ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'}`}
                  >
                    {short(s.name)}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

/** A match score in big type, counting up once on screen. */
function ScoreTile({ label, e, note, dims }: { label: string; e: CellScore | null; note: string; dims: ProfileDim[] | null }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const has = e !== null && e.score !== null;
  return (
    <div ref={ref} className="border-t border-line pt-4">
      <p className="label">{label}</p>
      <p className={`display mt-2 leading-none ${has ? 'text-[32px] text-text sm:text-[40px]' : 'text-[22px] text-muted'}`}>
        {has ? <CountUp value={e.score} decimals={0} play={seen} /> : 'NO DATA'}
        {has && <span className="ml-2 text-[16px] font-normal text-muted">/ 100</span>}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <ConfidenceBadge confidence={e?.confidence ?? null} coverage={e?.coverage} />
      </div>
      {dims && <p className="mt-2 max-w-[40ch] text-[13px] leading-5 text-text">{scoreSentence(has ? e.score : null, dims)}</p>}
      <p className="mt-2 max-w-[34ch] text-[13px] leading-5 text-muted">{note}</p>
    </div>
  );
}

export function SitePage({ recordFor, sites, siteId, onSite, earth, index, meta, targets, target, onTarget, scorer, analogs, climate, extracts, onDossier, onBuild, onTerrain }: Props) {
  const site: FeaturedSite = sites.sites.find((s) => s.id === siteId) ?? sites.sites[0];
  const analog = analogs.find((a) => a.id === site.id) ?? null;
  const cellIndex = useMemo(() => index.nearest(site.lat, site.lon, 2), [index, site]);
  const cell: EarthCell | null = cellIndex >= 0 ? earth.cells[cellIndex] : null;
  const weights = PRESETS[0].weights;
  // The profile of this site against this target, from the match record.
  const profile = useMemo(() => {
    try {
      const rec = recordFor ? recordFor(site, target) : null;
      return rec ? profileOf(rec) : null;
    } catch {
      return null;
    }
  }, [recordFor, site, target]);

  // The footprint values in the shape of a grid cell, so the same scoring function reads both.
  const footprint: EarthCell = useMemo(
    () => ({
      lat: site.lat,
      lon: site.lon,
      tempMean: num(site.values.tempMean),
      tempRange: num(site.values.tempRange),
      precip: num(site.values.precip),
      ndvi: num(site.values.ndvi),
      slope: num(site.values.slope),
      roughness: num(site.values.roughness),
      lithology: num(site.values.lithology),
      snowIceFrac: null,
      barrenFrac: null,
    }),
    [site],
  );
  const { atSite, siteNote } = useMemo(() => {
    try {
      return { atSite: scorer.explain(footprint, weights), siteNote: null as string | null };
    } catch (e) {
      // A rock class outside the similarity table: compare without rock type and say so.
      try {
        return {
          atSite: scorer.explain({ ...footprint, lithology: null }, weights),
          siteNote: `Rock type is left out of the footprint comparison: ${e instanceof Error ? e.message : String(e)}`,
        };
      } catch {
        return { atSite: null, siteNote: 'The footprint values could not be compared with this target.' };
      }
    }
  }, [scorer, footprint, weights]);
  const atCell: CellScore | null = useMemo(() => (cell ? scorer.explain(cell, weights) : null), [scorer, cell, weights]);

  const keysOf = (e: CellScore | null) => new Map<string, KeyBreakdown>((e?.breakdown ?? []).flatMap((f) => f.keys).map((k) => [k.key as string, k]));
  const siteKeys = keysOf(atSite);
  const cellKeys = keysOf(atCell);

  // The five dimensions, at the footprint and at the grid cell.
  const tiles: DimTile[] = useMemo(() => {
    const at = (c: EarthCell | null) => {
      try {
        return c ? scorer.profile(c) : [];
      } catch {
        return [];
      }
    };
    const s = at(footprint);
    const g = at(cell);
    return g.map((d) => ({
      id: isElement(d.id) ? d.id : 'terrain',
      name: isElement(d.id) ? ELEMENT_NAME[d.id] : d.label,
      site: s.find((x) => x.id === d.id)?.similarity ?? null,
      cell: d.similarity,
      measures: d.measures,
    }));
  }, [scorer, footprint, cell]);
  const profileNote = tiles.length > 0 && tiles.every((t) => t.site === null);

  const purposes = useMemo(() => {
    let s: ReturnType<TargetScorer['purposeScores']> | null = null;
    try {
      s = scorer.purposeScores(footprint);
    } catch {
      s = null;
    }
    const c = cell ? scorer.purposeScores(cell) : null;
    return PURPOSES.map((p) => ({ def: p, site: s?.find((x) => x.id === p.id)?.result ?? null, cell: c?.find((x) => x.id === p.id)?.result ?? null }));
  }, [scorer, footprint, cell]);

  const months = climate?.sites.find((s) => s.id === site.id)?.months ?? null;
  const month = useMemo(() => (months && atCell ? bestMonth(months, atCell) : null), [months, atCell]);
  const bestRow = month?.months.find((m) => m.month === month.best) ?? null;
  const climateSource = climate ? `NASA POWER monthly climatology ${climate.meta.period}` : '';

  const extract = extracts?.items.find((i) => i.id === site.id) ?? null;
  const targetExtract = extracts?.items.find((i) => i.id === target.id) ?? null;
  const windowKm = extracts?.meta.windowKm ?? 20;

  const lines = COMPARED.map((key) => ({ key, k: siteKeys.get(key) }))
    .filter((x): x is { key: (typeof COMPARED)[number]; k: KeyBreakdown } => !!x.k && x.k.similarity !== null)
    .sort((a, b) => (b.k.similarity as number) - (a.k.similarity as number));
  const noData = COMPARED.filter((key) => siteKeys.get(key)?.similarity == null);

  const scenes = site.detail.sentinel2Scenes ?? [];
  const sceneDates = scenes.map((s) => s.date).sort();
  const sources = new Map<string, string>();
  for (const v of Object.values(site.values)) if (v?.source && v.badge) sources.set(v.source, v.badge);
  const times = Math.round((55 * 55) / (site.footprintKm * site.footprintKm));
  const stories = useStories();
  // Field logistics: the footprint value where there is one, else the grid cell's, each with its own badge.
  const logistic = (key: 'tempMean' | 'precip' | 'slope' | 'roughness'): LogisticsValue | null => {
    const sv = site.values[key];
    if (sv && typeof sv.value === 'number') return { value: sv.value, badge: sv.badge, source: sv.source, scale: sv.scale === 'site' ? `footprint, ${site.footprintKm} km` : sv.scale === 'volcano' ? 'whole volcano' : 'grid cell, 55 km' };
    const cv = cell ? cell[key] : null;
    if (typeof cv === 'number') return { value: cv, badge: meta[key]?.badge ?? null, source: meta[key]?.source ?? null, scale: 'grid cell, 55 km' };
    return null;
  };

  return (
    <>
      <SiteTabs sites={sites.sites} current={site.id} onSite={onSite} />
      <div className="border-b border-line">
        <div className="flex flex-col items-stretch px-1 sm:flex-row sm:px-6 lg:px-12">
          <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-4 sm:flex-none">
            <span className="label">Target</span>
            <select value={target.id} onChange={(e) => onTarget(e.target.value)} className="h-11 min-w-0 max-w-[60vw] bg-bg text-[13px] text-text">
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Poster */}
      <section id="s-score" aria-labelledby="s-name" className="px-5 pb-16 pt-10 sm:px-10 sm:pt-14 lg:px-16">
        <div className="grid items-start gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <Rv>
            {extract ? (
              <Ground item={extract} layer="image" windowKm={windowKm} footprintKm={site.footprintKm} />
            ) : (
              <SiteTile body="earth" lat={site.lat} lon={site.lon} name={short(site.name)} />
            )}
          </Rv>
          <div className="min-w-0">
            <Rv>
              <p className="label">{KIND_LABEL[site.kind]}</p>
              <h3 id="s-name" className="display-xl mt-3 text-[44px] sm:text-[72px]">
                {short(site.name)}
              </h3>
              {region(site.name) && <p className="mt-3 text-[18px] text-muted">{region(site.name)}</p>}
              <p className="num mt-3 text-[13px] text-muted">
                {formatCoords(site.lat, site.lon)}
                {cell ? ` · grid cell ${siteCode(cell)}` : ''}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <Tag>
                  Footprint {site.footprintKm} km × {site.footprintKm} km
                </Tag>
              </div>
            </Rv>
            <Rv i={1} className="mt-10">
              <p className="label">Analog profile against {target.name}, measured inside the {site.footprintKm} km footprint</p>
              {profile ? (
                <div className="mt-3 max-w-[560px]">
                  <AnalogProfile profile={profile} />
                </div>
              ) : (
                <p className="mt-3 text-[14px] text-muted">No data. The footprint could not be compared with this target.</p>
              )}
              <p className="label mt-8">Computed by the tool: all-round match to {target.name}, Base weights</p>
              <div className="mt-3 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                <ScoreTile label={`Footprint, ${site.footprintKm} km`} e={atSite} dims={profile?.dims ?? null} note="The same formula on the footprint values. Not used in the ranking." />
                <ScoreTile label="Grid cell, 0.5°" e={atCell} dims={null} note="The whole 55 km square around the site: the score in the heatmap and the candidates list. It describes the square, not the site." />
              </div>
              {siteNote && (
                <p className="mt-3 text-[13px] text-accent" role="note">
                  {siteNote}
                </p>
              )}
            </Rv>
            <Rv i={2} className="mt-8">
              <div className="flex flex-wrap gap-2">
                {cellIndex >= 0 && (
                  <button type="button" onClick={() => onDossier(cellIndex)} className="btn">
                    Open the grid cell dossier
                  </button>
                )}
                {cellIndex >= 0 && onTerrain && (
                  <button type="button" onClick={() => onTerrain(cellIndex)} className="btn btn-primary">
                    Open full 3D view
                  </button>
                )}
                {cellIndex >= 0 && onBuild && (
                  <button type="button" onClick={() => onBuild(cellIndex)} className="btn btn-primary">
                    Build a base here
                  </button>
                )}
              </div>
            </Rv>
          </div>
        </div>
      </section>

      {storiesFor(stories, site.id).length > 0 && (
        <Block
          id="s-story"
          label="Team story"
          title="What the team wrote about this place."
          lead="Written by the SBATS team and checked against our data. The story carries no score: the scores above are computed by the tool."
        >
          <div className="max-w-[1200px]">
            <TeamStories key={site.id} stories={storiesFor(stories, site.id)} />
          </div>
        </Block>
      )}

      {/* Five dimensions and the ledger */}
      <Block
        id="s-match"
        label={`Against ${target.name}`}
        title="What matches and what does not."
        lead={
          <>
            Five dimensions at the footprint. A similarity of <span className="num text-text">{MATCH.toFixed(2)}</span> or more counts as a match, below <span className="num text-text">{MISS.toFixed(2)}</span> as no
            match. The two ticks on each bar mark those cut-offs.
          </>
        }
      >
        <div className="max-w-[1200px]">
          {tiles.length === 0 ? (
            <p className="text-[14px] text-muted">No data. No dimension could be compared with this target.</p>
          ) : (
            <DimensionStrip tiles={tiles} />
          )}
          {profileNote && <p className="mt-4 text-[13px] text-muted">No footprint value could be compared. The grid cell figures under each tile are shown instead.</p>}

          <Rv className="mt-16">
            <h4 className="display text-[26px] leading-8 text-text">Value by value</h4>
            <p className="mt-2 max-w-[60ch] text-[14px] leading-[22px] text-muted">Footprint values against the target, with the similarity on the right.</p>
            {lines.length === 0 ? (
              <p className="mt-4 text-[14px] text-muted">No data. Nothing at this site could be compared with {target.name}.</p>
            ) : (
              <ul className="mt-4">
                {lines.map((x) => (
                  <LedgerRow
                    key={x.key}
                    name={name(x.key)}
                    here={formatValue(x.key, x.k.earthValue, meta)}
                    there={formatValue(x.key, x.k.targetValue, meta)}
                    similarity={x.k.similarity}
                  />
                ))}
                <li className="border-t border-line" aria-hidden="true" />
              </ul>
            )}
            {noData.length > 0 && <p className="mt-2 text-[13px] text-muted">No data, left out: {noData.map((k) => name(k).toLowerCase()).join(', ')}.</p>}
          </Rv>

          <Rv className="mt-16">
            <h4 className="display text-[26px] leading-8 text-text">What Earth cannot copy</h4>
            <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {target.cannotCopy.map((s, i) => (
                <li key={i} className="border-t border-line pt-3 text-[14px] leading-[22px] text-text">
                  {s}
                </li>
              ))}
            </ul>
          </Rv>
        </div>
      </Block>

      {/* Scale */}
      <Block id="s-values" label="Scale" title="How small the footprint is." lead={site.footprintNote} size="m">
        <div className="grid max-w-[1200px] items-center gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <Rv>
            <ScaleSquares footprintKm={site.footprintKm} windowKm={extract ? windowKm : null} />
          </Rv>
          <Rv i={1}>
            <p className="display-l text-[44px] sm:text-[64px]">
              <span className="num">1 / {times}</span>
            </p>
            <p className="mt-3 max-w-[44ch] text-[16px] leading-[26px] text-muted">
              The 0.5° grid cell around the site is about 55 km on a side, about <span className="num text-text">{times}</span> times the area of the {site.footprintKm} km footprint. Terrain and
              vegetation are measured inside the footprint. Climate is the grid cell value.
            </p>
          </Rv>
        </div>
        <Rv className="mt-12 max-w-[1200px]">
          <More title="Footprint next to grid cell, every value">
            <DataTable
              caption={`Values at ${site.name}: footprint, grid cell and ${target.name}`}
              headers={['Quantity', `Footprint, ${site.footprintKm} km`, 'Describes', 'Grid cell, 0.5°', target.name, 'Similarity, footprint', 'Similarity, grid cell']}
              numeric={[1, 3, 4, 5, 6]}
              minWidth={860}
            >
              {COMPARED.map((key) => {
                const sv = site.values[key];
                const sk = siteKeys.get(key);
                const ck = cellKeys.get(key);
                const sun = isSunKey(key);
                const tv = sun ? null : target.values[key as keyof Target['values']];
                const m = sun ? null : meta[key as keyof MetaByKey];
                const siteVal = sun ? (sk?.earthValue ?? null) : num(sv);
                const cellVal = sun ? (ck?.earthValue ?? null) : cell ? (cell[key as keyof Target['values']] ?? null) : null;
                const targetVal = sk?.targetValue ?? ck?.targetValue ?? tv?.value ?? null;
                return (
                  <tr key={key} className="border-b border-line">
                    <Td>
                      <span className="whitespace-nowrap">{name(key)}</span>
                    </Td>
                    <Td num muted={siteVal === null}>
                      {formatValue(key, siteVal, meta)} {siteVal !== null && (sun ? <ComputedBadge /> : <SourceBadge badge={sv?.badge ?? null} source={sv?.source} />)}
                    </Td>
                    <Td muted>{sun ? 'Latitude' : sv ? SCALE_LABEL[sv.scale] : 'no data'}</Td>
                    <Td num muted={cellVal === null}>
                      {formatValue(key, cellVal, meta)} {cellVal !== null && (sun ? <ComputedBadge /> : <SourceBadge badge={m?.badge ?? null} source={m?.source} />)}
                    </Td>
                    <Td num muted={targetVal === null}>
                      {targetVal === null ? 'no published value' : formatValue(key, targetVal, meta)}{' '}
                      {targetVal !== null && (sun ? <ComputedBadge /> : <SourceBadge badge={tv?.badge ?? null} source={tv?.source} />)}
                    </Td>
                    <Td num muted={sk?.similarity == null}>{sk?.similarity == null ? 'no data' : formatSim(sk.similarity)}</Td>
                    <Td num muted={ck?.similarity == null}>{ck?.similarity == null ? 'no data' : formatSim(ck.similarity)}</Td>
                  </tr>
                );
              })}
            </DataTable>
            <p className="max-w-[72ch] text-[12px] leading-5 text-muted">
              Slope and roughness use the same method and 463 m posts at all three scales, so they are comparable. In a footprint this small that is only {site.values.slope?.pixels ?? 'a few'} pixels.
              Climate is the grid cell value in both columns: no climate dataset here resolves the footprint. Similarity runs from 0 to 1.
            </p>
            <DataTable caption="Other footprint measurements" headers={['Other footprint measurements', 'Value', 'Describes', 'Note']} numeric={[1]} minWidth={640}>
              {OTHER.map(({ key, label }) => {
                const v = site.values[key];
                if (!v) return null;
                return (
                  <tr key={key} className="border-b border-line">
                    <Td>{label}</Td>
                    <Td num muted={v.value === null}>
                      {otherText(key, v)} <SourceBadge badge={v.badge} source={v.source} />
                    </Td>
                    <Td muted>{SCALE_LABEL[v.scale]}</Td>
                    <Td muted>{v.note ?? ''}</Td>
                  </tr>
                );
              })}
            </DataTable>
          </More>
        </Rv>
      </Block>

      {/* Climate */}
      <Block
        id="s-month"
        label="Best month to test"
        title={bestRow ? `${MONTH_NAMES[bestRow.month - 1]} is the closest month.` : 'The year at this site.'}
        lead={bestRow ? `The month whose climate is closest to ${target.name}.` : undefined}
      >
        {month && bestRow ? (
          <div className="max-w-[1200px]">
            <Rv>
              <p className="num flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] text-text">
                <span className="font-semibold text-accent">{MONTH_NAMES[bestRow.month - 1]}</span>
                <span>
                  {fx(bestRow.precip, 0)} mm · mean {fx(bestRow.tempMean, 1)} °C · day-night range {fx(bestRow.tempRange, 1)} °C
                </span>
                <SourceBadge badge="Measured" source={climateSource} />
              </p>
            </Rv>
            <Rv i={1} className="mt-8">
              <div className="grid gap-x-10 gap-y-8 md:grid-cols-3">
                <Spark title="Precipitation" unit="mm" kind="bars" best={month.best} points={month.months.map((m) => ({ month: m.month, value: m.precip }))} />
                <Spark title="Mean temperature" unit="°C" kind="line" digits={1} best={month.best} points={month.months.map((m) => ({ month: m.month, value: m.tempMean }))} />
                <Spark title="Sunlight" unit="W/m²" kind="line" best={month.best} points={month.months.map((m) => ({ month: m.month, value: m.solar }))} />
              </div>
              <p className="mt-6 max-w-[72ch] text-[13px] leading-5 text-muted">
                The amber month is closest to {target.name} on {month.keys.map((k) => KEY_WORD[k]).join(', ')}, by the comparison the match score uses. Values are for the 0.5° grid cell around the site, not
                measured at the site.
              </p>
            </Rv>
            <div className="mt-6">
              <More title="Monthly climate table">
                <BestMonthTable result={month} source={climateSource} period={climate?.meta.period ?? ''} />
              </More>
            </div>
          </div>
        ) : (
          <p className="text-[14px] text-muted">No data. No monthly climate is published for this site.</p>
        )}
      </Block>

      <FieldLogistics
        variant="site"
        where={{ siteId: site.id }}
        lat={site.lat}
        tempMean={logistic('tempMean')}
        precip={logistic('precip')}
        slope={logistic('slope')}
        roughness={logistic('roughness')}
        relief={extract?.elevation ? { item: extract, windowKm } : null}
      />

      {/* Purposes */}
      <Block id="s-test" label="What a mission team could test here" title="Which purposes fit." lead="A purpose score uses only the factors that purpose depends on.">
        <div className="max-w-[1200px]">
          <Rv>
            <ul>
              {purposes.map(({ def, site: s, cell: c }) => {
                const sv = s && s.score !== null ? s.score : null;
                const cv = c && c.score !== null ? c.score : null;
                return (
                  <li key={def.id} className="grid items-center gap-x-8 gap-y-3 border-t border-line py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                    <div>
                      <p className="text-[16px] font-semibold text-text">{def.label}</p>
                      <p className="mt-1 text-[13px] leading-5 text-muted">{def.why}</p>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { l: `Footprint, ${site.footprintKm} km`, v: sv },
                        { l: 'Grid cell, 0.5°', v: cv },
                      ].map((row) => (
                        <div key={row.l} className="grid grid-cols-[minmax(0,130px)_minmax(0,1fr)_56px] items-center gap-3">
                          <span className="text-[12px] text-muted">{row.l}</span>
                          <Meter value={row.v === null ? null : row.v / 100} label={`${def.label}, ${row.l}`} height={8} />
                          <span className={`num text-right ${row.v === null ? 'text-[11px] text-muted' : 'text-[14px] text-text'}`}>{row.v === null ? 'no data' : formatScore(row.v)}</span>
                        </div>
                      ))}
                    </div>
                  </li>
                );
              })}
              <li className="border-t border-line" aria-hidden="true" />
            </ul>
            <p className="mt-2 max-w-[72ch] text-[12px] leading-5 text-muted">
              Match scores, 0 to 100 <ComputedBadge title="Computed in the browser by the scoring library." />. The purposes were defined after the validation results were known, so they are a second view.
            </p>
          </Rv>
          {analog && (
            <Rv className="mt-12">
              <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
                <div>
                  <h4 className="display text-[22px] leading-7 text-text">Used in practice for</h4>
                  {analog.usedFor && analog.usedFor.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {analog.usedFor.map((u) => (
                        <li key={u} className="border-l-2 border-line pl-3 text-[14px] leading-[22px] text-text">
                          {PURPOSES.find((p) => p.id === u)?.label ?? u}
                          {analog.usedForSource?.[u] ? <span className="block text-[12px] text-muted">{analog.usedForSource[u]}</span> : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-[14px] leading-[22px] text-muted">
                      {site.kind === 'candidate' ? 'No field campaign for space analog work is recorded for this site. It is a proposal.' : 'No data.'}
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="display text-[22px] leading-7 text-text">Published basis</h4>
                  <p className="mt-3 text-[14px] leading-[22px] text-text">
                    {analog.source} <SourceBadge badge="Literature" source={analog.source} />
                  </p>
                  {analog.note && <p className="mt-2 text-[13px] leading-5 text-muted">{analog.note}</p>}
                </div>
              </div>
            </Rv>
          )}
        </div>
      </Block>

      {/* Ground at one scale */}
      <Block
        id="s-ground"
        label={`Ground at one scale, ${windowKm} km across`}
        title={`${short(site.name)} next to ${target.name}.`}
        lead={extract ? `North is up. The amber square is the ${site.footprintKm} km footprint. Both pictures cover the same ground area.` : undefined}
      >
        {extract ? (
          <div className="max-w-[1100px]">
            <Rv>
              <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
                <div>
                  <p className="label mb-2">{short(site.name)}, relief</p>
                  <Ground item={extract} layer="relief" windowKm={windowKm} footprintKm={site.footprintKm} />
                </div>
                {targetExtract && (
                  <div>
                    <p className="label mb-2">{target.name}, relief</p>
                    <Ground item={targetExtract} layer="relief" windowKm={windowKm} />
                  </div>
                )}
              </div>
            </Rv>
            <p className="mt-4 max-w-[72ch] text-[12px] leading-5 text-muted">
              Relief is shaded from the elevation grid with the same light on each body. Pixel size differs by world and is printed under each picture. Nothing is upsampled.
            </p>
          </div>
        ) : (
          <p className="text-[14px] text-muted">No data. No same-scale extract was built for this site.</p>
        )}
      </Block>

      {/* Method and sources */}
      <section id="s-process" aria-labelledby="s-details" className="px-5 pb-24 pt-6 sm:px-10 lg:px-16">
        <h3 id="s-details" className="sr-only">
          Method and sources
        </h3>
        <div className="max-w-[1100px]">
          {(site.detail.errors ?? []).map((e) => (
            <p key={e} className="mb-4 border-l-2 border-accent pl-3 text-[14px] leading-[22px] text-text" role="note">
              {e}
            </p>
          ))}
          <More title="How the footprint values were measured">
            <dl className="space-y-3">
              {Object.entries(sites.meta.methods).map(([k, v]) => (
                <div key={k}>
                  <dt className="label">{k}</dt>
                  <dd className="mt-1 text-[13px] leading-5 text-text">{v}</dd>
                </div>
              ))}
            </dl>
            <h4 className="label">This site</h4>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
              <dt className="text-muted">Elevation in the footprint</dt>
              <dd className="num">{site.detail.elevMinM == null || site.detail.elevMaxM == null ? 'no data' : `${site.detail.elevMinM.toFixed(0)} m to ${site.detail.elevMaxM.toFixed(0)} m`}</dd>
              <dt className="text-muted">Elevation tile</dt>
              <dd className="num break-all">{site.detail.demTile ?? 'no data'}</dd>
              <dt className="text-muted">Sentinel-2 scenes</dt>
              <dd className="num">{scenes.length === 0 ? 'no data' : `${scenes.length}, ${sceneDates[0]} to ${sceneDates[sceneDates.length - 1]}, tile ${site.detail.sentinel2Tile ?? 'unknown'}`}</dd>
              <dt className="text-muted">Months with a clear view, median per pixel</dt>
              <dd className="num">{site.detail.sentinel2MedianMonthsPerPixel == null ? 'no data' : `${site.detail.sentinel2MedianMonthsPerPixel} of 12`}</dd>
              <dt className="text-muted">Pixels never clear</dt>
              <dd className="num">{site.detail.sentinel2PixelsNeverClear == null ? 'no data' : site.detail.sentinel2PixelsNeverClear.toLocaleString('en-US')}</dd>
            </dl>
          </More>
          <More id="s-sources" title={`Sources, ${sources.size}`} className="!border-t-0">
            <ul className="space-y-1">
              {[...sources.entries()].sort().map(([s, badge]) => (
                <li key={s} className="text-[12px] text-muted">
                  {badge}: {s}
                </li>
              ))}
            </ul>
            {!atSite && !atCell && <Absent what="No score could be computed for this site." />}
          </More>
        </div>
      </section>
    </>
  );
}

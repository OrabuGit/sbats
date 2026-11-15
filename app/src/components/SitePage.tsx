import { useMemo } from 'react';
import type { Analog, CellScore, EarthCell, EarthFile, KeyBreakdown, Target } from '../types';
import type { CellIndex } from '../lib/geo';
import { formatCoords, siteCode } from '../lib/geo';
import { formatScore, formatShare, formatSim, formatValue, isSunKey, type MetaByKey } from '../lib/format';
import { PRESETS, PURPOSES, type TargetScorer } from '../lib/scoringAdapter';
import { bestMonth } from '../lib/bestMonth';
import type { ExtractIndex, FeaturedSite, SiteValue, SitesFile } from '../data/sites';
import type { SiteClimate } from '../data/sandbox';
import { ComputedBadge, ConfidenceBadge, SourceBadge, Tag } from './Badges';
import { BestMonthSummary, BestMonthTable } from './BestMonth';
import { Ground } from './Ground';
import { Absent, DataTable, Section, Td } from './InfoParts';

interface Props {
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

const num = (v: SiteValue | undefined): number | null => (typeof v?.value === 'number' ? v.value : null);

function otherText(key: string, v: SiteValue): string {
  if (v.value === null) return 'no data';
  if (typeof v.value === 'string') return v.value;
  if (key.endsWith('Frac') || key.endsWith('Share')) return formatShare(v.value);
  return `${v.value.toFixed(1)}${v.unit === 'degrees' ? '°' : ` ${v.unit}`}`;
}

/** Similarity bands for the plain-language lists. The numbers are shown next to every line. */
const MATCH = 0.6;
const MISS = 0.3;

export function SitePage({ sites, siteId, onSite, earth, index, meta, targets, target, onTarget, scorer, analogs, climate, extracts, onDossier, onBuild }: Props) {
  const site: FeaturedSite = sites.sites.find((s) => s.id === siteId) ?? sites.sites[0];
  const analog = analogs.find((a) => a.id === site.id) ?? null;
  const cellIndex = useMemo(() => index.nearest(site.lat, site.lon, 2), [index, site]);
  const cell: EarthCell | null = cellIndex >= 0 ? earth.cells[cellIndex] : null;
  const weights = PRESETS[0].weights;

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
  const climateSource = climate ? `NASA POWER monthly climatology ${climate.meta.period}` : '';

  const extract = extracts?.items.find((i) => i.id === site.id) ?? null;
  const targetExtract = extracts?.items.find((i) => i.id === target.id) ?? null;
  const windowKm = extracts?.meta.windowKm ?? 20;

  const lines = COMPARED.map((key) => ({ key, k: siteKeys.get(key) })).filter((x): x is { key: (typeof COMPARED)[number]; k: KeyBreakdown } => !!x.k && x.k.similarity !== null);
  const text = (x: { key: string; k: KeyBreakdown }) =>
    `${name(x.key)}: ${formatValue(x.key, x.k.earthValue, meta)} here, ${formatValue(x.key, x.k.targetValue, meta)} at ${target.name}`;
  const groups = [
    { title: 'Matches', items: lines.filter((x) => (x.k.similarity as number) >= MATCH) },
    { title: 'Partly matches', items: lines.filter((x) => (x.k.similarity as number) < MATCH && (x.k.similarity as number) >= MISS) },
    { title: 'Does not match', items: lines.filter((x) => (x.k.similarity as number) < MISS) },
  ];
  const noData = COMPARED.filter((key) => siteKeys.get(key)?.similarity == null);

  const scenes = site.detail.sentinel2Scenes ?? [];
  const sceneDates = scenes.map((s) => s.date).sort();
  const sources = new Map<string, string>();
  for (const v of Object.values(site.values)) if (v?.source && v.badge) sources.set(v.source, v.badge);

  return (
    <>
      <div className="border-b border-line">
        <div className="flex flex-col items-stretch border-b border-line sm:flex-row">
          <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 border-b border-line px-4 sm:flex-none sm:border-b-0 sm:border-r sm:px-6">
            <span className="label">Site</span>
            <select value={site.id} onChange={(e) => onSite(e.target.value)} className="h-11 min-w-0 max-w-[60vw] bg-panel text-[13px] text-text">
              {sites.sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-4 sm:flex-none sm:border-r sm:border-line sm:px-6">
            <span className="label">Target</span>
            <select value={target.id} onChange={(e) => onTarget(e.target.value)} className="h-11 min-w-0 max-w-[60vw] bg-panel text-[13px] text-text">
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="px-4 py-4 sm:px-6">
          <p className="num text-[12px] text-muted">
            {formatCoords(site.lat, site.lon)}
            {cell ? ` · grid cell ${siteCode(cell)}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Tag>{KIND_LABEL[site.kind]}</Tag>
            <Tag>
              Footprint {site.footprintKm} km × {site.footprintKm} km
            </Tag>
          </div>
          <p className="mt-3 max-w-[72ch] text-[14px] text-text">
            {site.footprintNote} The 0.5° grid cell around it is about 55 km on a side, about{' '}
            <span className="num">{Math.round((55 * 55) / (site.footprintKm * site.footprintKm))}</span> times the area of the footprint.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {cellIndex >= 0 && (
              <button type="button" onClick={() => onDossier(cellIndex)} className="btn">
                Open the grid cell dossier
              </button>
            )}
            {cellIndex >= 0 && onBuild && (
              <button type="button" onClick={() => onBuild(cellIndex)} className="btn btn-primary">
                Build a base here
              </button>
            )}
          </div>
        </div>
      </div>

      <Section id="s-score" title={`All-round match to ${target.name}, Base weights`} wide>
        <dl className="grid max-w-[720px] gap-x-6 gap-y-5 sm:grid-cols-2">
          {[
            { label: `Footprint, ${site.footprintKm} km`, e: atSite, note: 'The same formula on the footprint values. Not used in the ranking.' },
            { label: 'Grid cell, 0.5°', e: atCell, note: 'The score in the heatmap and the candidates list.' },
          ].map(({ label, e, note }) => (
            <div key={label} className="border-t border-line pt-3">
              <dt className="label">{label}</dt>
              <dd className="mt-1 flex items-end justify-between gap-3">
                <span className={`num font-semibold leading-none ${e && e.score !== null ? 'text-[32px] text-text' : 'text-[17px] text-muted'}`}>
                  {e && e.score !== null ? formatScore(e.score) : 'NO DATA'}
                  {e && e.score !== null && <span className="ml-1 text-[13px] font-normal text-muted">/ 100</span>}
                </span>
                <ConfidenceBadge confidence={e?.confidence ?? null} coverage={e?.coverage} />
              </dd>
              <dd className="mt-2 text-[12px] text-muted">{note}</dd>
            </div>
          ))}
        </dl>
        {siteNote && (
          <p className="text-[12px] text-accent" role="note">
            {siteNote}
          </p>
        )}
      </Section>

      <Section id="s-values" title="Footprint next to grid cell" wide>
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
        <p className="max-w-[72ch] text-[12px] text-muted">
          Slope and roughness use the same method and 463 m posts at all three scales, so they are comparable. In a footprint this small that is
          only {site.values.slope?.pixels ?? 'a few'} pixels. Climate is the grid cell value in both columns: no climate dataset here resolves
          the footprint. Similarity runs from 0 to 1.
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
      </Section>

      <Section id="s-match" title={`What matches ${target.name} and what does not`}>
        {lines.length === 0 ? (
          <p className="text-muted">No data. Nothing at this site could be compared with {target.name}.</p>
        ) : (
          groups.map(
            (g) =>
              g.items.length > 0 && (
                <div key={g.title}>
                  <h4 className="label mt-3 first:mt-0">{g.title}</h4>
                  <ul className="mt-1.5 space-y-1.5">
                    {g.items.map((x) => (
                      <li key={x.key} className="flex items-baseline justify-between gap-4 border-l-2 border-line pl-3 text-[13px]">
                        <span>{text(x)}</span>
                        <span className="num shrink-0 text-[12px] text-muted">{formatSim(x.k.similarity)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ),
          )
        )}
        {noData.length > 0 && (
          <p className="text-[12px] text-muted">
            No data, left out: {noData.map((k) => name(k).toLowerCase()).join(', ')}.
          </p>
        )}
        <p className="text-[12px] text-muted">
          Footprint values against the target, with the similarity on the right. {MATCH.toFixed(1)} and above counts as a match, below{' '}
          {MISS.toFixed(1)} as no match.
        </p>
        <h4 className="label mt-3">What Earth cannot copy</h4>
        <ul className="mt-1.5 space-y-1.5">
          {target.cannotCopy.map((s, i) => (
            <li key={i} className="border-l-2 border-line pl-3 text-[13px]">
              {s}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="s-test" title="What a mission team could test here" wide>
        <DataTable caption="Match by purpose" headers={['Purpose', 'Depends on', `Footprint, ${site.footprintKm} km`, 'Grid cell, 0.5°']} numeric={[2, 3]} minWidth={560}>
          {purposes.map(({ def, site: s, cell: c }) => (
            <tr key={def.id} className="border-b border-line">
              <Td>{def.label}</Td>
              <Td muted>{def.why}</Td>
              <Td num muted={!s || s.score === null}>{s && s.score !== null ? formatScore(s.score) : 'no data'}</Td>
              <Td num muted={!c || c.score === null}>{c && c.score !== null ? formatScore(c.score) : 'no data'}</Td>
            </tr>
          ))}
        </DataTable>
        <p className="max-w-[72ch] text-[12px] text-muted">
          Match scores, 0 to 100 <ComputedBadge title="Computed in the browser by the scoring library." />. A purpose score uses only the
          factors that purpose depends on. The purposes were defined after the validation results were known, so they are a second view.
        </p>
        {analog && (
          <div className="max-w-[72ch] space-y-2">
            {analog.usedFor && analog.usedFor.length > 0 && (
              <>
                <h4 className="label mt-3">Used in practice for</h4>
                <ul className="space-y-1.5">
                  {analog.usedFor.map((u) => (
                    <li key={u} className="border-l-2 border-line pl-3 text-[13px]">
                      {PURPOSES.find((p) => p.id === u)?.label ?? u}
                      {analog.usedForSource?.[u] ? <span className="block text-[12px] text-muted">{analog.usedForSource[u]}</span> : null}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <h4 className="label mt-3">Published basis</h4>
            <p className="text-[13px]">
              {analog.source} <SourceBadge badge="Literature" source={analog.source} />
            </p>
            {analog.note && <p className="text-[12px] text-muted">{analog.note}</p>}
            {site.kind === 'candidate' && (!analog.usedFor || analog.usedFor.length === 0) && (
              <p className="text-[12px] text-muted">No field campaign for space analog work is recorded for this site. It is a proposal.</p>
            )}
          </div>
        )}
      </Section>

      <Section id="s-month" title="Best month to test" wide>
        {month ? (
          <>
            <div className="max-w-[420px]">
              <BestMonthSummary result={month} targetName={target.name} source={climateSource} />
            </div>
            <BestMonthTable result={month} source={climateSource} period={climate?.meta.period ?? ''} />
          </>
        ) : (
          <p className="text-muted">No data. No monthly climate is published for this site.</p>
        )}
      </Section>

      <Section id="s-ground" title={`Ground at one scale, ${windowKm} km across`} wide>
        {extract ? (
          <div className="grid max-w-[1100px] gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {extract.image && (
              <div>
                <p className="label mb-1.5">{site.name.split(',')[0]}, image</p>
                <Ground item={extract} layer="image" windowKm={windowKm} footprintKm={site.footprintKm} />
              </div>
            )}
            <div>
              <p className="label mb-1.5">{site.name.split(',')[0]}, relief</p>
              <Ground item={extract} layer="relief" windowKm={windowKm} footprintKm={site.footprintKm} />
            </div>
            {targetExtract && (
              <div>
                <p className="label mb-1.5">{target.name}, relief</p>
                <Ground item={targetExtract} layer="relief" windowKm={windowKm} />
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted">No data. No same-scale extract was built for this site.</p>
        )}
        {extract && (
          <p className="max-w-[72ch] text-[12px] text-muted">
            North is up. The amber square is the {site.footprintKm} km footprint. Relief is shaded from the elevation grid with the same light on
            each body. Pixel size differs and nothing is upsampled: 30 m on Earth, 80 m on the Moon, 463 m on Mars, which looks coarse.
          </p>
        )}
      </Section>

      <Section id="s-process" title="How the footprint values were measured">
        <dl className="space-y-3">
          {Object.entries(sites.meta.methods).map(([k, v]) => (
            <div key={k}>
              <dt className="label">{k}</dt>
              <dd className="mt-1 text-[13px]">{v}</dd>
            </div>
          ))}
        </dl>
        <h4 className="label mt-3">This site</h4>
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
        {(site.detail.errors ?? []).map((e) => (
          <p key={e} className="text-[12px] text-accent" role="note">
            {e}
          </p>
        ))}
      </Section>

      <Section id="s-sources" title="Sources">
        <ul className="space-y-1">
          {[...sources.entries()].sort().map(([s, badge]) => (
            <li key={s} className="text-[12px] text-muted">
              {badge}: {s}
            </li>
          ))}
        </ul>
        {!atSite && !atCell && <Absent what="No score could be computed for this site." />}
      </Section>
    </>
  );
}

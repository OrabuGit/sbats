import { ArrowLeft } from 'lucide-react';
import type { CellScore, CellSummary, ClampGap, EarthCell, EarthFile, FactorKey, Target } from '../types';
import type { BestMonth } from '../lib/bestMonth';
import { MONTH_NAMES } from '../lib/bestMonth';
import { downloadText, toCsv } from '../lib/download';
import { formatCoords, siteCode } from '../lib/geo';
import { formatScore, formatShare, formatSim, formatValue, isSunKey, keyLabel, unscoredText, type MetaByKey } from '../lib/format';
import { PURPOSES, matchWord, type DimensionProfile, type PurposeDef, type PurposeId } from '../lib/scoringAdapter';
import { VERDICT_WORD, verdictOf } from '../lib/verdict';

interface Props {
  cell: EarthCell;
  placeName: string | null;
  target: Target;
  explained: CellScore;
  meta: MetaByKey;
  earth: EarthFile;
  purpose: PurposeDef | null;
  profile: DimensionProfile[] | null;
  purposeScores: { id: PurposeId; result: CellScore }[] | null;
  percentile: number | null;
  rank: number | null;
  gaps: ClampGap[];
  month: { result: BestMonth; source: string } | null;
  results: CellSummary[];
  onBack: () => void;
}

const EXPORT_ROWS = 200;
const COMPUTED = 'Computed in the browser from latitude and the axial tilt of each body (obliquity from the NASA NSSDCA fact sheets).';
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** A match as a document: readable on screen, printable, with numbered citations. */
export function Report({ cell, placeName, target, explained: e, meta, earth, purpose, profile, purposeScores, percentile, rank, gaps, month, results, onBack }: Props) {
  const name = placeName ?? siteCode(cell);
  const scored = e.score !== null;
  const today = new Date().toISOString().slice(0, 10);

  // Citations are numbered in the order they first appear in the table.
  const refs: string[] = [];
  const cite = (source: string | null | undefined): number | null => {
    if (!source) return null;
    let i = refs.indexOf(source);
    if (i < 0) i = refs.push(source) - 1;
    return i + 1;
  };
  const rows = e.breakdown.flatMap((f) =>
    f.keys.map((k) => {
      const sun = isSunKey(k.key);
      const m = sun ? null : meta[k.key as FactorKey];
      const tv = sun ? null : target.values[k.key as FactorKey];
      const cover = k.bareGround?.source === 'landCover';
      return {
        factor: f.label,
        weight: f.weight,
        name: sun ? k.label : keyLabel(k.key, meta),
        earth: cover ? `${formatShare(k.bareGround?.barrenFrac)} barren` : formatValue(k.key, k.earthValue, meta),
        earthRef: cover ? cite(earth.meta.landCover?.source ?? 'MODIS MCD12C1 land cover') : k.earthValue === null ? null : cite(sun ? COMPUTED : m ? `${m.source} (${m.badge})` : null),
        target: k.targetValue === null ? 'no data' : formatValue(k.key, k.targetValue, meta),
        targetRef: k.targetValue === null ? null : cite(sun ? COMPUTED : tv?.source ? `${tv.source} (${tv.badge})` : null),
        used: k.targetClamped !== null && k.targetValue !== null && k.targetClamped !== k.targetValue ? formatValue(k.key, k.targetClamped, meta) : null,
        similarity: k.similarity,
        raw: k,
      };
    }),
  );
  const monthRef = month ? cite(`${month.source} (Measured, 0.5° grid cell)`) : null;
  const best = month?.result.months.find((m) => m.month === month.result.best);
  const base = `sbats-${slug(name)}-${target.id}`;

  const matchCsv = () =>
    downloadText(
      `${base}-match.csv`,
      'text/csv',
      toCsv(
        ['factor', 'measurement', 'earth_value', 'target_value', 'target_value_used', 'tolerance', 'similarity', 'verdict', 'earth_source', 'target_source'],
        rows.map((r) => [
          r.factor,
          r.name,
          r.raw.earthValue,
          r.raw.targetValue,
          r.raw.targetClamped,
          r.raw.sigma,
          r.similarity === null ? null : Number(r.similarity.toFixed(4)),
          VERDICT_WORD[verdictOf(r.similarity)],
          r.earthRef ? refs[r.earthRef - 1] : null,
          r.targetRef ? refs[r.targetRef - 1] : null,
        ]),
      ),
    );
  const ranked = () =>
    results
      .map((r, index) => ({ r, index }))
      .filter((x) => x.r.score !== null)
      .sort((a, b) => (b.r.score as number) - (a.r.score as number))
      .slice(0, EXPORT_ROWS);
  const resultsCsv = () =>
    downloadText(
      `sbats-${target.id}-top-${EXPORT_ROWS}.csv`,
      'text/csv',
      toCsv(
        ['rank', 'cell', 'lat', 'lon', 'score', 'confidence', 'coverage', 'target'],
        ranked().map((x, i) => [i + 1, siteCode(earth.cells[x.index]), earth.cells[x.index].lat, earth.cells[x.index].lon, Number((x.r.score as number).toFixed(2)), x.r.confidence, Number(x.r.coverage.toFixed(3)), target.id]),
      ),
    );
  const resultsGeoJson = () => {
    const h = earth.meta.resolutionDeg / 2;
    downloadText(
      `sbats-${target.id}-top-${EXPORT_ROWS}.geojson`,
      'application/geo+json',
      JSON.stringify({
        type: 'FeatureCollection',
        name: `SBATS-26 match scores for ${target.name}`,
        features: ranked().map((x, i) => {
          const c = earth.cells[x.index];
          return {
            type: 'Feature',
            properties: { rank: i + 1, cell: siteCode(c), score: Number((x.r.score as number).toFixed(2)), confidence: x.r.confidence, coverage: Number(x.r.coverage.toFixed(3)), target: target.id },
            geometry: { type: 'Polygon', coordinates: [[[c.lon - h, c.lat - h], [c.lon + h, c.lat - h], [c.lon + h, c.lat + h], [c.lon - h, c.lat + h], [c.lon - h, c.lat - h]]] },
          };
        }),
      }),
    );
  };

  const Ref = ({ n }: { n: number | null }) => (n === null ? null : <sup className="num ml-0.5 text-[10px] text-muted">[{n}]</sup>);
  const H = ({ children }: { children: React.ReactNode }) => <h3 className="mb-2 mt-8 border-b border-line pb-1 text-[14px] font-semibold text-text">{children}</h3>;

  return (
    <main className="scroll min-h-0 flex-1 bg-panel" aria-labelledby="h-report">
      <div className="no-print flex flex-wrap items-stretch border-b border-line">
        <button type="button" onClick={onBack} className="tool border-r border-line">
          <ArrowLeft size={14} aria-hidden="true" /> Match
        </button>
        <span className="flex-1" />
        <button type="button" onClick={matchCsv} className="tool border-l border-line">
          This match, CSV
        </button>
        <button type="button" onClick={resultsCsv} className="tool border-l border-line">
          Top {EXPORT_ROWS}, CSV
        </button>
        <button type="button" onClick={resultsGeoJson} className="tool border-l border-line">
          Top {EXPORT_ROWS}, GeoJSON
        </button>
        <button type="button" onClick={() => window.print()} className="btn btn-primary !rounded-none">
          Download PDF
        </button>
      </div>
      <p className="no-print border-b border-line px-4 py-2 text-[12px] text-muted sm:px-6">
        Download PDF opens the print dialog: choose "Save as PDF". The exports hold the {EXPORT_ROWS} best-scoring cells for {target.name}, unspaced.
      </p>

      <article className="report mx-auto max-w-[820px] px-4 py-8 sm:px-8">
        <p className="label">SBATS-26 · analog match report · {today}</p>
        <h2 id="h-report" className="mt-2 text-[22px] font-semibold leading-7 text-text">
          {name} as a stand-in for {target.name}
        </h2>
        <p className="num mt-1 text-[12px] text-muted">
          Earth cell {siteCode(cell)}, {formatCoords(cell.lat, cell.lon)}, {earth.meta.resolutionDeg}° grid · {target.body === 'moon' ? 'Moon' : 'Mars'}, {formatCoords(target.lat, target.lon)}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-line py-4 sm:grid-cols-4">
          {[
            [purpose ? purpose.label : 'All-round match', scored ? `${formatScore(e.score)} / 100` : 'no data'],
            ['Reading', scored ? `${matchWord(e.score as number)} match` : 'no data'],
            ['Confidence', e.confidence ? `${e.confidence}, coverage ${(e.coverage * 100).toFixed(0)}%` : 'no data'],
            ['Standing', percentile === null ? 'no data' : `above ${percentile.toFixed(0)}% of cells${rank !== null ? `, rank ${rank}` : ''}`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="label">{k}</dt>
              <dd className="num mt-1 text-[14px] font-semibold text-text">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[14px] leading-[22px] text-text">{scored ? e.reason : unscoredText(e, meta)}</p>

        <H>1. Factor by factor</H>
        <table className="w-full border-collapse text-left text-[12px]">
          <thead>
            <tr className="border-b border-line">
              {['Factor', 'Measurement', 'Earth', target.name, 'Similarity', 'Verdict'].map((h, i) => (
                <th key={h} scope="col" className={`label py-1.5 pr-3 font-normal ${i === 4 ? 'text-right' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-line align-top">
                <td className="py-1.5 pr-3 text-text">{r.factor}</td>
                <td className="py-1.5 pr-3 text-muted">{r.name}</td>
                <td className="num py-1.5 pr-3 text-text">
                  {r.earth}
                  <Ref n={r.earthRef} />
                </td>
                <td className="num py-1.5 pr-3 text-text">
                  {r.target}
                  <Ref n={r.targetRef} />
                  {r.used && <span className="block text-[11px] text-muted">scored as {r.used}</span>}
                </td>
                <td className="num py-1.5 pr-3 text-right text-text">{formatSim(r.similarity)}</td>
                <td className="py-1.5 text-text">{VERDICT_WORD[verdictOf(r.similarity)]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-muted">
          Similarity is exp(−0.5 × ((Earth − target) / tolerance)²), from 0 to 1. 0.6 or more is a match, below 0.3 is not. The score is 100 times the
          weighted geometric mean of the factor similarities. "Scored as" is the nearest value found anywhere on Earth.
        </p>

        <H>2. What Earth cannot copy</H>
        <ul className="space-y-1.5">
          {target.cannotCopy.map((s, i) => (
            <li key={i} className="text-[13px] leading-5 text-text">
              {s}
            </li>
          ))}
          {gaps.map((g) => (
            <li key={g.key} className="text-[13px] leading-5 text-text">
              {isSunKey(g.key) ? g.label : keyLabel(g.key, meta)}: {formatValue(g.key, g.targetValue, meta)} at {target.name}; the nearest value in any Earth cell is{' '}
              {formatValue(g.key, g.clampedValue, meta)}.
            </li>
          ))}
        </ul>

        {(profile || purposeScores) && <H>3. Analog profile and purposes</H>}
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {profile && (
            <table className="w-full border-collapse text-left text-[12px]">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="label py-1.5 font-normal">Dimension</th>
                  <th scope="col" className="label py-1.5 text-right font-normal">Similarity</th>
                  <th scope="col" className="label py-1.5 text-right font-normal">Percentile</th>
                </tr>
              </thead>
              <tbody>
                {profile.map((d) => (
                  <tr key={d.id} className="border-b border-line">
                    <td className="py-1.5 text-text">{d.label}</td>
                    <td className="num py-1.5 text-right text-text">{formatSim(d.similarity)}</td>
                    <td className="num py-1.5 text-right text-text">{d.midPercentile === null ? 'no data' : (d.midPercentile * 100).toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {purposeScores && (
            <table className="w-full border-collapse text-left text-[12px]">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="label py-1.5 font-normal">Purpose</th>
                  <th scope="col" className="label py-1.5 text-right font-normal">Score, 0 to 100</th>
                </tr>
              </thead>
              <tbody>
                {purposeScores.map(({ id, result }) => (
                  <tr key={id} className="border-b border-line">
                    <td className="py-1.5 text-text">{PURPOSES.find((p) => p.id === id)?.label ?? id}</td>
                    <td className="num py-1.5 text-right text-text">{formatScore(result.score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <H>4. Best month to test</H>
        <p className="text-[13px] leading-5 text-text">
          {best ? (
            <>
              {MONTH_NAMES[best.month - 1]}: precipitation {best.precip === null ? 'no data' : `${best.precip.toFixed(0)} mm`}, mean temperature{' '}
              {best.tempMean === null ? 'no data' : `${best.tempMean.toFixed(1)} °C`}, day-night temperature range {best.tempRange === null ? 'no data' : `${best.tempRange.toFixed(1)} °C`}
              <Ref n={monthRef} />. The month whose normals are closest to the target by the same formula.
            </>
          ) : (
            'No data. Monthly climate exists for the sites in analogs.json only.'
          )}
        </p>

        <H>5. Limits</H>
        <ul className="space-y-1.5 text-[13px] leading-5 text-text">
          <li>The score describes a whole {earth.meta.resolutionDeg}° cell, about {Math.round(earth.meta.resolutionDeg * 111)} km on a side, not a site inside it.</li>
          <li>Values are annual means. Gravity, vacuum and radiation are never scored.</li>
          <li>Known Moon analogs rank mid-table on this score. The validation numbers, including the weak ones, are in the app under Method, Validation.</li>
        </ul>

        <H>References</H>
        <ol className="space-y-1.5">
          {refs.map((r, i) => (
            <li key={r} className="grid grid-cols-[36px_1fr] text-[12px] leading-[18px] text-text">
              <span className="num text-muted">[{i + 1}]</span>
              <span className="break-words">{r}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 border-t border-line pt-3 text-[11px] text-muted">
          Generated by SBATS-26 on {today} from the Earth grid built {String(earth.meta.generatedAt).slice(0, 10)}. Scores are computed in the browser from the published data files.
          Code written with AI assistance (Claude Code); every value comes from the cited sources, none from an AI model.
        </p>
      </article>
    </main>
  );
}

import { ArrowLeft } from 'lucide-react';
import type { CellSummary, EarthCell, EarthFile, Target } from '../types';
import { downloadText, toCsv } from '../lib/download';
import { siteCode } from '../lib/geo';
import { buildReport, type CellStability, type MatchRecord, type ReportText, type RouteResult, type StabilityResult } from '../lib/matchAdapter';
import { useAsync } from '../lib/useAsync';
import { loadFrozen, loadReport } from '../data/validation';

interface Props {
  cell: EarthCell;
  target: Target;
  earth: EarthFile;
  /** The match record for this pair (Session C's library). The report is built from it alone. */
  record: MatchRecord;
  stability: { result: StabilityResult; cell: CellStability | null } | null;
  /** Routes measured on the terrain page for this pair, if any. */
  routes: { label: string; result: RouteResult }[];
  results: CellSummary[];
  onBack: () => void;
}

const EXPORT_ROWS = 200;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function Text({ t }: { t: ReportText }) {
  return (
    <>
      {t.text}
      {t.cites.length > 0 && <sup className="num ml-0.5 text-[10px] text-muted">{t.cites.map((n) => `[${n}]`).join('')}</sup>}
    </>
  );
}

/** A match as a document: readable on screen, printable, with numbered citations. Content from buildReport. */
export function Report({ cell, target, earth, record, stability, routes, results, onBack }: Props) {
  const validation = useAsync(async () => {
    const [r, f] = await Promise.all([loadReport('base'), loadFrozen()]);
    const h = r?.sets.holdout.overall;
    if (!h || !f || h.rocAuc === null || h.top10Share === null || h.meanPercentile === null) return null;
    return { holdoutAuc: h.rocAuc, holdoutTop10: h.top10Share, holdoutMeanPercentile: h.meanPercentile, frozenAt: f.frozenAt };
  }, 'report-validation');
  const report = buildReport({ record, stability, routes, validation: validation.status === 'ready' ? validation.value : null });
  const base = `sbats-${slug(record.earth.name)}-${target.id}`;

  const matchCsv = () =>
    downloadText(
      `${base}-match.csv`,
      'text/csv',
      toCsv(
        ['dimension', 'in_score', 'measurement', 'earth_value', 'earth_scale', 'target_value', 'similarity', 'verdict', 'reason', 'earth_source', 'target_source'],
        record.dimensions.flatMap((d) =>
          d.rows.map((r) => [d.label, d.inScore ? 'yes' : 'no', r.label, r.earth.text, r.earth.scale, r.target.text, r.similarity === null ? null : Number(r.similarity.toFixed(4)), r.verdict, r.reason, r.earth.source, r.target.source]),
        ),
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
        Download PDF opens the print dialog: choose "Save as PDF". The exports hold the {EXPORT_ROWS} best-scoring cells for {target.name} with the
        current weights, unspaced. This report is for {siteCode(cell)} at {record.earth.scale === 'site' ? 'footprint' : 'grid cell'} scale.
      </p>

      <article className="report mx-auto max-w-[820px] px-4 py-8 sm:px-8">
        <p className="label">SBATS-26 · analog match report · {report.generatedAt.slice(0, 10)}</p>
        <h2 id="h-report" className="mt-2 text-[22px] font-semibold leading-7 text-text">
          {report.title}
        </h2>
        <p className="mt-1 text-[13px] text-muted">{report.subtitle}</p>
        <div className="mt-5 space-y-2 border-y border-line py-4">
          {report.summary.map((t, i) => (
            <p key={i} className="text-[14px] leading-[22px] text-text">
              <Text t={t} />
            </p>
          ))}
        </div>

        {report.sections.map((sec, n) => (
          <section key={sec.id}>
            <h3 className="mb-2 mt-8 border-b border-line pb-1 text-[14px] font-semibold text-text">
              {n + 1}. {sec.title}
            </h3>
            <div className="space-y-2">
              {sec.paragraphs.map((t, i) => (
                <p key={i} className="text-[13px] leading-5 text-text">
                  <Text t={t} />
                </p>
              ))}
            </div>
            {sec.table && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-line">
                      {sec.table.columns.map((c) => (
                        <th key={c} scope="col" className="label py-1.5 pr-3 font-normal">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sec.table.rows.map((row, r) => (
                      <tr key={r} className="border-b border-line align-top">
                        {row.map((t, c) => (
                          <td key={c} className={`py-1.5 pr-3 ${c === 0 ? 'text-text' : 'num text-text'}`}>
                            <Text t={t} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}

        <h3 className="mb-2 mt-8 border-b border-line pb-1 text-[14px] font-semibold text-text">References</h3>
        <ol className="space-y-1.5">
          {report.citations.map((c) => (
            <li key={c.n} className="grid grid-cols-[36px_1fr] text-[12px] leading-[18px] text-text">
              <span className="num text-muted">[{c.n}]</span>
              <span className="break-words">
                {c.text}
                {c.badge ? ` (${c.badge})` : ''}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-6 space-y-1 border-t border-line pt-3">
          {report.footer.map((f) => (
            <p key={f} className="text-[11px] text-muted">
              {f}
            </p>
          ))}
          <p className="text-[11px] text-muted">Code written with AI assistance (Claude Code). Every value comes from the cited sources, none from an AI model.</p>
        </div>
      </article>
    </main>
  );
}

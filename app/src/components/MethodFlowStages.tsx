import { useEffect, useState } from 'react';
import { Radiation, Weight, Wind } from 'lucide-react';
import { MEDIUM_CONFIDENCE_COVERAGE, MIN_COVERAGE, PRESETS, gaussianSimilarity, weightedGeometricMean } from '../lib/scoringAdapter';
import { formatValue, keyLabel } from '../lib/format';
import type { KeyBreakdown } from '../types';
import { ComputedBadge, ConfidenceBadge, SourceBadge } from './Badges';
import { StageFrame, fade, gapOf, move, useProgress, type FlowData, type StageProps } from './MethodFlowParts';

const TOTAL = 7;
const MONO = 'IBM Plex Mono, monospace';
const pc = (v: number) => `${Math.round(v * 1000) / 10}%`;
const s2 = (v: number | null) => (v === null ? 'no data' : v.toFixed(2));
const sign = (z: number) => `${z < 0 ? '−' : '+'}${Math.abs(z).toFixed(1)}`;

/** A key's Earth value as text, or "no data". Where the barren share stood in for NDVI, that share. */
function earthText(d: FlowData, k: KeyBreakdown): string {
  if (k.key === 'ndvi' && k.earthValue === null && k.bareGround?.barrenFrac != null) return `barren share ${pc(k.bareGround.barrenFrac)}`;
  return formatValue(k.key, k.earthValue, d.meta);
}

function EarthBadge({ d, k }: { d: FlowData; k: KeyBreakdown }) {
  if (k.key === 'sunElevation') return <ComputedBadge />;
  if (k.earthValue === null && k.key !== 'ndvi') return null;
  return <SourceBadge badge={d.meta[k.key as keyof typeof d.meta]?.badge ?? null} source={d.meta[k.key as keyof typeof d.meta]?.source} />;
}

function TargetBadge({ d, k }: { d: FlowData; k: KeyBreakdown }) {
  if (k.key === 'sunElevation') return <ComputedBadge />;
  const v = d.target.values[k.key as keyof typeof d.target.values];
  return <SourceBadge badge={v?.badge ?? null} source={v?.source} />;
}

const NoData = ({ children }: { children: React.ReactNode }) => <span className="num text-[13px] text-muted">{children}</span>;

/* 1. Two places */
export function StageTwoPlaces({ d, on, rm }: StageProps) {
  const t = d.target;
  return (
    <StageFrame n={0} total={TOTAL} title="Two places">
      <div className="grid grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 sm:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)] sm:gap-x-4" style={fade(on, rm, 0)}>
        <span />
        <div>
          <p className="text-[13px] text-muted">Target</p>
          <p className="display mt-0.5 text-[20px] leading-6 text-text">{t.name}</p>
          <p className="num text-[12px] text-muted">
            {t.body === 'moon' ? 'Moon' : 'Mars'} · {t.lat.toFixed(1)}°, {t.lon.toFixed(1)}°
          </p>
        </div>
        <div>
          <p className="text-[13px] text-muted">Earth cell</p>
          <p className="display mt-0.5 text-[20px] leading-6 text-text">{d.where ?? 'Open land'}</p>
          <p className="num text-[12px] text-muted">
            {d.cell.lat.toFixed(2)}°, {d.cell.lon.toFixed(2)}°
          </p>
        </div>
      </div>
      <ul className="mt-3 divide-y divide-line border-t border-line">
        {d.keys.map((k, i) => (
          <li key={k.key} className="grid grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 py-3 sm:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)] sm:gap-x-4" style={fade(on, rm, i + 1)}>
            <span className="text-[13px] text-text">{keyLabel(k.key, d.meta)}</span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {k.targetValue === null ? <NoData>no data</NoData> : <span className="num text-[17px] font-medium text-text">{formatValue(k.key, k.targetValue, d.meta)}</span>}
              {k.targetValue !== null && <TargetBadge d={d} k={k} />}
            </span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {earthText(d, k) === 'no data' ? <NoData>no data</NoData> : <span className="num text-[17px] font-medium text-text">{earthText(d, k)}</span>}
              <EarthBadge d={d} k={k} />
            </span>
          </li>
        ))}
      </ul>
    </StageFrame>
  );
}

/* 2. The gap in tolerances */
const ZMAX = 3;
export function StageGap({ d, on, rm }: StageProps) {
  return (
    <StageFrame n={1} total={TOTAL} title="The gap">
      <p className="num text-[12px] text-muted" style={fade(on, rm, 0)}>
        gap = (Earth value − target value) ÷ tolerance
      </p>
      <ul className="mt-2 divide-y divide-line border-t border-line">
        {d.keys.map((k, i) => {
          const z = gapOf(k);
          const w = z === null ? 0 : Math.min(1, Math.abs(z) / ZMAX) * 50;
          const moved = k.targetValue !== null && k.targetClamped !== null && k.targetValue !== k.targetClamped;
          let note: string;
          if (z !== null && k.earthValue !== null && k.targetClamped !== null && k.sigma !== null) {
            note = `${formatValue(k.key, Math.abs(k.earthValue - k.targetClamped), d.meta)} apart, tolerance ${formatValue(k.key, k.sigma, d.meta)}`;
          } else if (k.key === 'lithology') {
            note = 'a class, so no gap: a lookup table is used';
          } else if (k.key === 'ndvi' && k.bareGround?.source === 'landCover') {
            note = 'no NDVI here: the barren share is used';
          } else {
            note = 'no data, left out';
          }
          return (
            <li key={k.key} className="py-2" style={fade(on, rm, i)}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3">
                <span className="text-[13px] text-text">{keyLabel(k.key, d.meta)}</span>
                <span className="num text-[13px] text-text">{z === null ? '—' : `${sign(z)} tol`}</span>
              </div>
              <div className="relative mt-1.5 h-2 bg-line" aria-hidden="true">
                {[-2, -1, 1, 2].map((t) => (
                  <span key={t} className="absolute inset-y-0 w-px bg-bg" style={{ left: `${50 + (t / ZMAX) * 50}%` }} />
                ))}
                <span className="absolute inset-y-[-3px] left-1/2 w-px bg-muted" />
                {z !== null && (
                  <span
                    className="absolute inset-y-0 bg-accent"
                    style={{
                      left: z < 0 ? `${50 - (on || rm ? w : 0)}%` : '50%',
                      width: `${on || rm ? w : 0}%`,
                      transition: move(rm, 'width, left', 450, Math.min(i * 45, 360)),
                    }}
                  />
                )}
              </div>
              <p className="mt-1 text-[12px] leading-4 text-muted">
                {note}
                {moved && k.targetClamped !== null && <span>. Target moved to Earth&rsquo;s limit, {formatValue(k.key, k.targetClamped, d.meta)}</span>}
              </p>
            </li>
          );
        })}
      </ul>
    </StageFrame>
  );
}

/* 3. The Gaussian: each gap slides along the curve */
const W = 520;
const H = 176;
const X0 = 12;
const X1 = W - 12;
const Y0 = 140;
const Y1 = 14;
const px = (z: number) => X0 + ((z + ZMAX) / (2 * ZMAX)) * (X1 - X0);
const py = (s: number) => Y0 - s * (Y0 - Y1);
const CURVE = Array.from({ length: 97 }, (_, i) => {
  const z = -ZMAX + (i / 96) * 2 * ZMAX;
  return `${px(z).toFixed(1)},${py(gaussianSimilarity(z, 0, 1)).toFixed(1)}`;
}).join(' ');

export function StageSimilarity({ d, on, rm }: StageProps) {
  const p = useProgress(on, rm, 900);
  const rows = d.keys.map((k, i) => {
    const z = gapOf(k);
    const g = z === null ? null : gaussianSimilarity(z, 0, 1);
    let shown: number | null = k.similarity;
    if (z !== null && g !== null && k.similarity !== null) {
      const ratio = g > 1e-12 ? k.similarity / g : 1;
      shown = gaussianSimilarity(Math.max(-ZMAX, Math.min(ZMAX, z)) * p, 0, 1) * Math.pow(ratio, p);
      if (p >= 0.999) shown = k.similarity;
    }
    return { k, i, z, shown };
  });
  return (
    <StageFrame n={2} total={TOTAL} title="Gap to similarity">
      <p className="num text-[12px] text-muted" style={fade(on, rm, 0)}>
        similarity = exp(−½ × gap²)
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 block w-full" role="img" aria-label="Each gap, in tolerances, slides along the similarity curve to its similarity">
        <line x1={X0} x2={X1} y1={Y0} y2={Y0} stroke="#7C8894" />
        {[-3, -2, -1, 0, 1, 2, 3].map((t) => (
          <g key={t}>
            <line x1={px(t)} x2={px(t)} y1={Y0} y2={Y0 + 4} stroke="#7C8894" />
            <text x={px(t)} y={Y0 + 18} fontSize="11" fill="#7C8894" textAnchor="middle" fontFamily={MONO}>
              {t === 0 ? '0' : t > 0 ? `+${t}` : `−${-t}`}
            </text>
          </g>
        ))}
        <text x={X0} y={Y1 - 3} fontSize="11" fill="#7C8894" fontFamily={MONO}>
          1.00
        </text>
        <text x={X1} y={Y0 + 34} fontSize="11" fill="#7C8894" textAnchor="end">
          gap in tolerances
        </text>
        <polyline points={CURVE} fill="none" stroke="#D7DDE3" strokeWidth="2" />
        {rows.map(({ k, i, z }) => {
          if (z === null) return null;
          const zp = Math.max(-ZMAX, Math.min(ZMAX, z)) * p;
          const x = px(zp);
          const y = py(gaussianSimilarity(zp, 0, 1));
          return (
            <g key={k.key} style={{ opacity: on || rm ? 1 : 0 }}>
              <line x1={x} x2={x} y1={y} y2={Y0} stroke="#FFB000" strokeDasharray="2 3" opacity="0.6" />
              <circle cx={x} cy={y} r="8" fill="#FFB000" />
              <text x={x} y={y + 3.5} fontSize="10" fontWeight="600" fill="#0B0D0F" textAnchor="middle" fontFamily={MONO}>
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="mt-3 grid grid-cols-2 gap-x-6 border-t border-line">
        {rows.map(({ k, i, z, shown }) => (
          <li key={k.key} className="flex items-center gap-2 border-b border-line py-1.5" style={fade(on, rm, i)}>
            <span className={`num flex h-5 w-5 shrink-0 items-center justify-center text-[11px] font-semibold ${z === null ? 'border border-line text-muted' : 'bg-accent text-bg'}`} style={{ borderRadius: 10 }}>
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 text-[12px] leading-4 text-text" title={z === null ? `${keyLabel(k.key, d.meta)}: lookup or land cover, no curve` : keyLabel(k.key, d.meta)}>
              {keyLabel(k.key, d.meta)}
            </span>
            <span className="num text-[13px] text-text">{s2(shown)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[12px] leading-4 text-muted">Rock type has no curve: same class 1.00, related {d.lithLevels?.related.toFixed(2) ?? 'no data'}, unrelated {d.lithLevels?.unrelated.toFixed(2) ?? 'no data'}.</p>
    </StageFrame>
  );
}

/* 4. Weights */
export function StageWeights({ d, on, rm }: StageProps) {
  const max = Math.max(...d.factors.map((f) => f.weight));
  return (
    <StageFrame n={3} total={TOTAL} title="The weights">
      <p className="text-[13px] text-text" style={fade(on, rm, 0)}>
        Preset <span className="font-semibold">{d.preset.label}</span>: {d.preset.description}
      </p>
      <ul className="mt-3 divide-y divide-line border-t border-line">
        {d.factors.map((f, i) => (
          <li key={f.factor} className="py-2.5" style={fade(on, rm, i)}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[14px] text-text">{f.label}</span>
              <span className="num text-[14px] text-text">{pc(f.weight)}</span>
            </div>
            <div className="mt-1.5 h-2 bg-line" aria-hidden="true">
              <div className="h-full bg-accent" style={{ width: `${on || rm ? (f.weight / max) * 100 : 0}%`, transition: move(rm, 'width', 500, Math.min(i * 45, 360)) }} />
            </div>
            {f.keys.length > 1 && (
              <p className="mt-1 text-[12px] text-muted">
                Shared by {f.keys.map((k) => keyLabel(k.key, d.meta).toLowerCase()).join(' and ')}, {pc(f.weight / f.keys.length)} each
              </p>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 flex justify-between border-t border-line pt-2 text-[13px] text-muted">
        <span>All six</span>
        <span className="num text-text">{pc(d.factors.reduce((a, f) => a + f.weight, 0))}</span>
      </p>
      <p className="mt-2 text-[12px] leading-4 text-muted">Other presets ({PRESETS.filter((x) => x.id !== d.preset.id).map((x) => x.label).join(', ')}) change these numbers and nothing else.</p>
    </StageFrame>
  );
}

/* 5. The weighted geometric mean */
export function StageMean({ d, on, rm }: StageProps) {
  const present = d.factors.filter((f) => f.similarity !== null && f.effectiveWeight > 0);
  let run = 1;
  const rows = d.factors.map((f) => {
    const used = f.similarity !== null && f.effectiveWeight > 0;
    if (used) run *= Math.pow(f.similarity as number, f.effectiveWeight);
    return { f, used, run };
  });
  const score = d.cs.score;
  const entries = present.map((f) => ({ similarity: f.similarity as number, weight: f.effectiveWeight }));
  const wsum = entries.reduce((a, e) => a + e.weight, 0);
  const plain = wsum > 0 ? (100 * entries.reduce((a, e) => a + e.similarity * e.weight, 0)) / wsum : null;
  const limit = d.factors.find((f) => f.factor === d.cs.limitingFactor) ?? null;
  const lifted = limit && limit.similarity !== null && entries.length > 0 ? weightedGeometricMean(entries.map((e) => (e.similarity === limit.similarity && e.weight === limit.effectiveWeight ? { ...e, similarity: 1 } : e))) : null;
  const p = useProgress(on, rm, 600);
  return (
    <StageFrame n={4} total={TOTAL} title="One number">
      <p className="num text-[12px] text-muted" style={fade(on, rm, 0)}>
        score = 100 × (similarity ^ weight) × (similarity ^ weight) × …
      </p>
      <ul className="mt-2 divide-y divide-line border-t border-line">
        {rows.map(({ f, used, run: r }, i) => (
          <li key={f.factor} className="grid grid-cols-[84px_minmax(0,1fr)_44px] items-center gap-x-3 py-2 sm:grid-cols-[96px_104px_minmax(0,1fr)_44px]" style={fade(on, rm, i)}>
            <span className="text-[13px] text-text">{f.label}</span>
            <span className="num hidden text-[12px] text-muted sm:block">{used ? `${s2(f.similarity)} ^ ${f.effectiveWeight.toFixed(2)}` : 'left out'}</span>
            <span className="relative block h-2 bg-line" aria-hidden="true">
              <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${on || rm ? r * 100 : 0}%`, transition: move(rm, 'width', 400, Math.min(i * 70, 420)) }} />
            </span>
            <span className="num text-right text-[13px] text-text">{used ? r.toFixed(2) : '—'}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-baseline justify-between gap-3 border-t border-line pt-3">
        <span className="text-[13px] text-muted">
          Product <span className="num text-text">{run.toFixed(3)}</span> × 100
        </span>
        <span className="display num text-[40px] leading-none text-accent" style={{ opacity: on || rm ? 1 : 0, transition: move(rm, 'opacity', 300, 380) }}>
          {score === null ? 'no data' : (score * (rm ? 1 : Math.max(p, 0.001))).toFixed(0)}
        </span>
      </p>
      {limit && limit.similarity !== null && score !== null && lifted !== null && plain !== null && (
        <div className="mt-3 border-t border-line pt-3" style={fade(on, rm, 7)}>
          <p className="text-[13px] leading-5 text-text">
            The weakest link is <span className="font-semibold">{limit.label.toLowerCase()}</span> at <span className="num">{s2(limit.similarity)}</span>. At 1.00 the score would be{' '}
            <span className="num">{lifted.toFixed(0)}</span>, not <span className="num">{score.toFixed(0)}</span>.
          </p>
          {[
            ['Geometric mean (the score)', score],
            ['Plain average, same numbers', plain],
          ].map(([t, v], i) => (
            <div key={t as string} className="mt-2 grid grid-cols-[minmax(0,1fr)_36px] items-center gap-x-3 gap-y-1">
              <span className="text-[12px] text-muted">{t as string}</span>
              <span className="num text-right text-[13px] text-text">{(v as number).toFixed(0)}</span>
              <span className="col-span-2 block h-1.5 bg-line" aria-hidden="true">
                <span className={`block h-full ${i === 0 ? 'bg-accent' : 'bg-muted'}`} style={{ width: `${on || rm ? (v as number) : 0}%`, transition: move(rm, 'width', 450, 450 + i * 60) }} />
              </span>
            </div>
          ))}
        </div>
      )}
    </StageFrame>
  );
}

/* 6. Coverage and missing factors */
const STATUS: Record<string, string> = {
  scored: 'has data',
  'missing-earth': 'no data for the Earth cell',
  'missing-target': 'no value for the target',
  'zero-weight': 'weight is 0',
};

export function StageCoverage({ d, on, rm }: StageProps) {
  const cov = d.cs.coverage;
  const missingNames = d.cs.missing.map((k) => keyLabel(k, d.meta).toLowerCase());
  return (
    <StageFrame n={5} total={TOTAL} title="Coverage">
      <div style={fade(on, rm, 0)}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="label">Coverage</p>
          <p className="num text-[14px] text-text">{pc(cov)} of the weight had data</p>
        </div>
        <div className="relative mt-2 h-2 bg-line" aria-hidden="true">
          <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${on || rm ? cov * 100 : 0}%`, transition: move(rm, 'width', 500, 100) }} />
          {[MIN_COVERAGE, MEDIUM_CONFIDENCE_COVERAGE].map((m) => (
            <span key={m} className="absolute inset-y-[-3px] w-px bg-text" style={{ left: `${m * 100}%` }} />
          ))}
        </div>
        <div className="relative mt-1 h-4 text-[11px] text-muted" aria-hidden="true">
          <span className="num absolute -translate-x-1/2" style={{ left: `${MIN_COVERAGE * 100}%` }}>
            {MIN_COVERAGE.toFixed(1)} least
          </span>
          <span className="num absolute -translate-x-1/2" style={{ left: `${MEDIUM_CONFIDENCE_COVERAGE * 100 + 4}%` }}>
            {MEDIUM_CONFIDENCE_COVERAGE.toFixed(1)} medium
          </span>
          <span className="num absolute right-0">1.0 high</span>
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-text">
          <span>Confidence</span>
          <ConfidenceBadge confidence={d.cs.confidence} coverage={cov} />
          <span className="text-muted">Bare ground and dryness are required.</span>
        </p>
      </div>
      <ul className="mt-3 divide-y divide-line border-t border-line">
        {d.factors.map((f, i) => (
          <li key={f.factor} className="py-2" style={fade(on, rm, i + 1)}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] text-text">{f.label}</span>
              <span className="num text-[12px] text-muted">
                weight {pc(f.weight)} → {pc(f.effectiveWeight)}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] leading-4 text-muted">
              {f.keys.map((k, j) => (
                <span key={k.key}>
                  {j > 0 && ' · '}
                  {keyLabel(k.key, d.meta)}: <span className={k.status === 'scored' ? 'text-text' : 'text-text underline decoration-accent underline-offset-2'}>{STATUS[k.status]}</span>
                </span>
              ))}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] leading-5 text-text" style={fade(on, rm, 8)}>
        {missingNames.length === 0 ? 'Nothing is missing for this pair, so no weight is moved.' : `Left out: ${missingNames.join(', ')}. The other weights scale up to fill the gap.`}
        {d.missingTarget.length > 0 && d.cs.missing.length === 0 && ` The target has no value for ${d.missingTarget.map((k) => keyLabel(k, d.meta).toLowerCase()).join(', ')}.`}
      </p>
    </StageFrame>
  );
}

/* 7. The result: concentric rings, one per factor, and what the score leaves out */
const KINDS = [
  { match: /^Gravity/, Icon: Weight, name: 'Gravity' },
  { match: /^(Vacuum|Thin atmosphere)/, Icon: Wind, name: 'Air' },
  { match: /^Radiation/, Icon: Radiation, name: 'Radiation' },
];
/** The first clause of a dossier line, without its source: "Gravity: 1.62 m/s2 on the Moon, about one sixth (NASA)" becomes "1.62 m/s2 on the Moon". */
const brief = (line: string) => {
  const t = line.split(':').slice(1).join(':').replace(/\s*\([^)]*\)\.?\s*$/, '').split(/, (?=[a-z])/)[0].trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : line;
};
const CX = 50;
const STEP = 5.2;
const R_OUT = 46;
const RW = 4.2;

export function StageResult({ d, on, rm }: StageProps) {
  const score = d.cs.score;
  const p = useProgress(on, rm, 900);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    // One frame after turning on, so the rings grow from empty instead of appearing full.
    if (!on) return setArmed(false);
    const f = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(f);
  }, [on]);
  const go = rm ? true : armed;
  return (
    <StageFrame n={6} total={TOTAL} title="The result">
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="relative aspect-square w-[44%] max-w-[230px] shrink-0 [container-type:inline-size]">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" role="img" aria-label={score === null ? 'No score' : `Score ${score.toFixed(0)} out of 100, from six factors`}>
            {d.factors.map((f, i) => {
              const r = R_OUT - i * STEP;
              const C = 2 * Math.PI * r;
              const sim = f.similarity === null ? 0 : Math.max(0, Math.min(1, f.similarity));
              return (
                <g key={f.factor}>
                  <circle cx={CX} cy={CX} r={r} fill="none" stroke="#2A3138" strokeWidth={RW} />
                  <circle
                    cx={CX}
                    cy={CX}
                    r={r}
                    fill="none"
                    stroke={f.similarity !== null && f.similarity >= 0.3 ? '#FFB000' : '#7C8894'}
                    strokeWidth={RW}
                    strokeDasharray={`${C} ${C}`}
                    strokeDashoffset={C * (1 - (go ? sim : 0))}
                    transform={`rotate(-90 ${CX} ${CX})`}
                    style={{ transition: move(rm, 'stroke-dashoffset', 700, i * 50) }}
                  />
                  <text x={CX} y={CX - r + 1.1} fontSize="3.2" fontWeight="700" fill={sim > 0.04 ? '#0B0D0F' : '#D7DDE3'} textAnchor="middle" fontFamily={MONO}>
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="display text-[17cqw] leading-none text-text">{score === null ? '-' : Math.round(score * (rm ? 1 : p))}</p>
            <p className="mt-[1cqw] text-[5cqw] leading-none text-muted">{score === null ? 'no data' : 'of 100'}</p>
          </div>
        </div>
        <ol className="min-w-0 flex-1">
          {d.factors.map((f, i) => (
            <li key={f.factor} className="flex items-baseline justify-between gap-2 border-b border-line py-1 text-[12px]" style={fade(on, rm, i)}>
              <span className="min-w-0 truncate text-text">
                <span className="num mr-1.5 text-muted">{i + 1}</span>
                {f.label}
              </span>
              <span className="num text-text">{s2(f.similarity)}</span>
            </li>
          ))}
          <li className="pt-1.5 text-[11px] text-muted">Rings run outer to inner. A ring fills to its similarity.</li>
        </ol>
      </div>
      <div className="mt-4 border-t border-line pt-3" style={fade(on, rm, 6)}>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-text">
          <span>Confidence</span>
          <ConfidenceBadge confidence={d.cs.confidence} coverage={d.cs.coverage} />
        </p>
        <p className="label mt-4 !text-text">What Earth cannot copy, never scored</p>
        <ul className="mt-2 grid grid-cols-3 gap-x-4">
          {KINDS.map(({ match, Icon, name }, i) => {
            const line = d.target.cannotCopy.find((l) => match.test(l)) ?? null;
            return (
              <li key={name} className="border-t border-line pt-2" style={fade(on, rm, 7 + i)}>
                <Icon size={22} strokeWidth={1.5} className="text-muted" aria-hidden="true" />
                <p className="display mt-1.5 text-[14px] leading-4 text-text">{name}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-muted">{line ? brief(line) : 'no data'}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </StageFrame>
  );
}

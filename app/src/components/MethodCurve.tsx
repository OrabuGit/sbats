import { useEffect, useMemo, useRef, useState } from 'react';
// The adapter does not re-export the similarity function, so the page reads it from the library itself.
import { gaussianSimilarity } from '../lib/scoringAdapter';
import { MATCH, MISS, VERDICT_WORD, verdictOf } from '../lib/verdict';
import { MChip, s2 } from './MethodParts';

export interface Tolerance {
  id: string;
  label: string;
  unit: string;
  sigma: number;
}

const H = 280;
const X0 = 34;
const Y0 = 244; // similarity 0
const Y1 = 22; // similarity 1
const ZMAX = 3;
const py = (s: number) => Y0 - s * (Y0 - Y1);

/** The similarity curve: the gap between an Earth value and the target, in tolerances, against similarity. Draggable. */
export function MethodCurve({ tolerances }: { tolerances: Tolerance[] }) {
  const [z, setZ] = useState(1.5);
  const [tolId, setTolId] = useState<string>('z');
  const svg = useRef<SVGSVGElement>(null);
  // Drawn at the real pixel width, so the labels stay 11 px on a phone and on a desktop.
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(280, Math.round(el.getBoundingClientRect().width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const X1 = W - 12;
  const px = (z: number) => X0 + ((z + ZMAX) / (2 * ZMAX)) * (X1 - X0);
  const curve = useMemo(
    () =>
      Array.from({ length: 121 }, (_, i) => {
        const z = -ZMAX + (i / 120) * 2 * ZMAX;
        return `${px(z).toFixed(1)},${py(gaussianSimilarity(z, 0, 1)).toFixed(1)}`;
      }).join(' '),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [W],
  );
  const tol = tolerances.find((t) => t.id === tolId) ?? null;
  const s = gaussianSimilarity(z, 0, 1);
  const verdict = verdictOf(s);
  const gap = tol ? Math.abs(z) * tol.sigma : null;
  const decimals = tol && tol.sigma < 1 ? 2 : 1;

  const fromPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = svg.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const v = ((x - X0) / (X1 - X0)) * 2 * ZMAX - ZMAX;
    setZ(Math.round(Math.max(-ZMAX, Math.min(ZMAX, v)) * 20) / 20);
  };

  const marks = [1, 2].map((k) => ({ k, s: gaussianSimilarity(k, 0, 1) }));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
      <div>
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full cursor-ew-resize select-none"
          height={H}
          style={{ touchAction: 'pan-y' }}
          role="img"
          aria-label={`Similarity against the gap between the Earth value and the target, in tolerances. At a gap of ${Math.abs(z).toFixed(2)} tolerances the similarity is ${s2(s)}.`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            fromPointer(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons) fromPointer(e);
          }}
        >
          {/* Verdict cut-offs */}
          {[MATCH, MISS].map((v) => (
            <g key={v}>
              <line x1={X0} x2={X1} y1={py(v)} y2={py(v)} stroke="#2A3138" strokeDasharray="3 5" />
              <text x={X0} y={py(v) - 5} fontSize="11" fill="#7C8894" fontFamily="IBM Plex Mono, monospace">
                {s2(v)}
              </text>
            </g>
          ))}
          {[
            { y: (1 + MATCH) / 2, t: 'matches' },
            { y: (MATCH + MISS) / 2, t: 'partly' },
            { y: MISS / 2, t: 'does not match' },
          ].map((z2) => (
            <text key={z2.t} x={px(0)} y={py(z2.y) + 4} fontSize="11" fill="#7C8894" textAnchor="middle">
              {z2.t}
            </text>
          ))}
          {/* Axis */}
          <line x1={X0} x2={X1} y1={Y0} y2={Y0} stroke="#7C8894" />
          {[-3, -2, -1, 0, 1, 2, 3].map((t) => (
            <g key={t}>
              <line x1={px(t)} x2={px(t)} y1={Y0} y2={Y0 + 5} stroke="#7C8894" />
              <text x={px(t)} y={Y0 + 20} fontSize="11" fill="#7C8894" textAnchor="middle" fontFamily="IBM Plex Mono, monospace">
                {t === 0 ? '0' : t > 0 ? `+${t}` : `−${-t}`}
              </text>
            </g>
          ))}
          <text x={(X0 + X1) / 2} y={H - 4} fontSize="11" fill="#7C8894" textAnchor="middle">
            gap between Earth and target, in tolerances
          </text>
          {/* The curve */}
          <polyline points={curve} fill="none" stroke="#D7DDE3" strokeWidth="2" />
          {/* Reference points: one and two tolerances away */}
          {marks.flatMap((m) => [m.k, -m.k]).map((k) => (
            <circle key={k} cx={px(k)} cy={py(gaussianSimilarity(k, 0, 1))} r="2.5" fill="#7C8894" />
          ))}
          {marks.map((m) => (
            <text key={m.k} x={px(-m.k) - 8} y={py(m.s) - 6} fontSize="11" fill="#7C8894" textAnchor="end" fontFamily="IBM Plex Mono, monospace">
              {s2(m.s)}
            </text>
          ))}
          {/* The marker */}
          <line x1={px(z)} x2={px(z)} y1={py(s)} y2={Y0} stroke="#FFB000" strokeDasharray="3 3" />
          <line x1={X0} x2={px(z)} y1={py(s)} y2={py(s)} stroke="#FFB000" strokeDasharray="3 3" />
          <circle cx={px(z)} cy={py(s)} r="6" fill="#FFB000" />
        </svg>
        <label className="mt-1 block">
          <span className="sr-only">Gap in tolerances</span>
          <input
            type="range"
            className="slider"
            min={-ZMAX}
            max={ZMAX}
            step={0.05}
            value={z}
            onChange={(e) => setZ(Number(e.target.value))}
            aria-valuetext={`gap ${z.toFixed(2)} tolerances, similarity ${s2(s)}`}
          />
        </label>
      </div>

      <div>
        <p className="label">Similarity at this gap</p>
        <p className="num mt-1 text-[64px] font-medium leading-[64px] text-accent">{s2(s)}</p>
        <p className="mt-3 text-[14px] text-text">
          Reads as <span className="font-medium">{VERDICT_WORD[verdict].toLowerCase()}</span>. The gap is{' '}
          <span className="num">{Math.abs(z).toFixed(2)}</span> tolerances
          {gap !== null && tol && (
            <>
              , <span className="num">{gap.toFixed(decimals)}</span> {tol.unit}
            </>
          )}
          .
        </p>
        <p className="label mt-6">Show the gap as</p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Unit of the gap">
          <MChip on={tolId === 'z'} onClick={() => setTolId('z')}>
            Tolerances
          </MChip>
          {tolerances.map((t) => (
            <MChip key={t.id} on={tolId === t.id} onClick={() => setTolId(t.id)}>
              {t.label}
            </MChip>
          ))}
        </div>
        {tolerances.length === 0 && <p className="mt-2 text-[13px] text-muted">No data. The frozen tolerances were not published with this build.</p>}
        {tol && (
          <p className="mt-3 text-[13px] text-muted">
            One tolerance for {tol.label.toLowerCase()} is <span className="num">{tol.sigma}</span> {tol.unit} (frozen value).
          </p>
        )}
      </div>
    </div>
  );
}

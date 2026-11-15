import type { EarthFile } from '../types';
import { PRESETS, FACTORS } from '../lib/scoringAdapter';
import { Reveal } from './HomeStory';

/** Six small drawings, one per stage. All numbers drawn come from the Base preset or the Earth file. */
function Glyph({ n, earth }: { n: number; earth: EarthFile }) {
  const base = PRESETS[0].weights;
  const w = FACTORS.map((f) => base[f.id]);
  const topW = Math.max(...w);
  if (n === 0) {
    // Datasets: one bar per measurement, all the same length (every measurement is one file).
    const rows = Math.min(earth.meta.factors.length, 8);
    return (
      <div className="flex h-12 flex-col justify-between" aria-hidden="true">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="bar-grow h-[3px] bg-muted" style={{ ['--i' as string]: i * 0.5 }} />
        ))}
      </div>
    );
  }
  if (n === 1) {
    return (
      <svg viewBox="0 0 120 48" className="block h-12 w-full max-w-[140px]" aria-hidden="true">
        {Array.from({ length: 8 }, (_, c) =>
          Array.from({ length: 4 }, (_, r) => {
            const lit = (c * 3 + r * 5) % 7 < 3;
            return <rect key={`${c}-${r}`} x={c * 15} y={r * 12} width="13" height="10" fill={lit ? '#FFB000' : '#2A3138'} />;
          }),
        )}
      </svg>
    );
  }
  if (n === 2) {
    const pts = Array.from({ length: 61 }, (_, i) => {
      const z = -3 + i * 0.1;
      return `${(i / 60) * 120},${44 - 40 * Math.exp(-0.5 * z * z)}`;
    });
    return (
      <svg viewBox="0 0 120 48" className="block h-12 w-full max-w-[140px]" aria-hidden="true">
        <polyline points={pts.join(' ')} fill="none" stroke="#FFB000" strokeWidth="2" />
        <line x1="0" y1="45" x2="120" y2="45" stroke="#2A3138" />
      </svg>
    );
  }
  if (n === 3) {
    return (
      <div className="flex h-12 items-end gap-1.5" aria-hidden="true">
        {w.map((v, i) => (
          <div key={i} className="w-4 bg-muted" style={{ height: `${(v / topW) * 100}%` }} />
        ))}
      </div>
    );
  }
  if (n === 4) {
    return (
      <div className="flex h-12 flex-col justify-end" aria-hidden="true">
        <div className="relative h-[3px] bg-line">
          <div className="bar-grow absolute inset-y-0 left-0 w-full bg-accent" style={{ ['--to' as string]: 1 }} />
        </div>
        <div className="num mt-1 flex justify-between text-[11px] text-muted">
          <span>0</span>
          <span>100</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-12 items-end gap-1.5" aria-hidden="true">
      {[3, 2, 1].map((n2) => (
        <div key={n2} className="flex gap-0.5">
          {[1, 2, 3].map((i) => (
            <span key={i} className={`block h-3 w-1 ${i <= n2 ? 'bg-text' : 'bg-line'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Pipeline of one score, from datasets to confidence. The headline of the page. */
export function MethodPipeline({ earth }: { earth: EarthFile }) {
  const cellKm = Math.round(earth.meta.resolutionDeg * 111);
  const stages: { name: string; big: string; line: string }[] = [
    { name: 'Datasets', big: String(earth.meta.factors.length), line: 'measurements from public datasets, each with a source badge' },
    { name: 'Grid cells', big: `${earth.meta.resolutionDeg}°`, line: `${earth.cells.length.toLocaleString('en-US')} land cells, about ${cellKm} km a side` },
    { name: 'Similarity', big: '0 to 1', line: 'one number per measurement: how close the cell is to the target' },
    { name: 'Weights', big: '6', line: `factors, weighted by the mission preset (${PRESETS.length} presets)` },
    { name: 'Match score', big: '0 to 100', line: 'weighted geometric mean of the similarities' },
    { name: 'Confidence', big: 'high, medium, low', line: 'how much of the weight had data, or no score at all' },
  ];
  return (
    <ol className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-6" aria-label="From datasets to a match score">
      {stages.map((s, i) => (
        <li key={s.name}>
          <Reveal i={i}>
            <div className="h-[2px] bg-line">
              <div className="bar-grow h-full bg-accent" style={{ ['--i' as string]: i, ['--to' as string]: 0.35 }} />
            </div>
            <p className="label mt-3">
              <span className="num">{i + 1}</span> · {s.name}
            </p>
            <div className="mt-4">
              <Glyph n={i} earth={earth} />
            </div>
            <p className="display mt-4 text-[22px] leading-6 text-text">{s.big}</p>
            <p className="mt-2 text-[13px] leading-5 text-muted">{s.line}</p>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}

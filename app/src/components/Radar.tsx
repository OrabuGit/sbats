import type { FactorBreakdown } from '../types';

const SHORT: Record<string, string> = {
  terrain: 'TERRAIN',
  bareGround: 'BARE',
  dryness: 'DRY',
  temperature: 'TEMP',
  sunlight: 'SUN',
  rockType: 'ROCK',
};

/** Hand-rolled SVG radar of the six factor similarities. Factors with no data sit at the centre, marked hollow. */
export function Radar({ factors }: { factors: FactorBreakdown[] }) {
  const w = 320;
  const h = 236;
  const cx = w / 2;
  const cy = h / 2;
  const r = 76;
  const n = factors.length;
  const point = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v] as const;
  };
  const ring = (v: number) => factors.map((_, i) => point(i, v).join(',')).join(' ');
  const shape = factors.map((f, i) => point(i, f.similarity ?? 0).join(',')).join(' ');
  const summary = factors
    .map((f) => `${f.label} ${f.similarity === null ? 'no data' : f.similarity.toFixed(2)}`)
    .join(', ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto block w-full max-w-[340px]" role="img" aria-label={`Similarity by factor: ${summary}`}>
      {[0.25, 0.5, 0.75, 1].map((v) => (
        <polygon key={v} points={ring(v)} fill="none" stroke="#2A3138" strokeWidth="1" />
      ))}
      {factors.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#2A3138" strokeWidth="1" />;
      })}
      <polygon points={shape} fill="#FFB000" fillOpacity="0.14" stroke="#FFB000" strokeWidth="1.5" strokeLinejoin="miter" />
      {factors.map((f, i) => {
        const [x, y] = point(i, f.similarity ?? 0);
        return f.similarity === null ? (
          <rect key={f.factor} x={x - 3} y={y - 3} width="6" height="6" fill="#12161A" stroke="#7C8894" strokeWidth="1" />
        ) : (
          <rect key={f.factor} x={x - 2.5} y={y - 2.5} width="5" height="5" fill="#FFB000" />
        );
      })}
      {factors.map((f, i) => {
        const [x, y] = point(i, 1.2);
        const anchor = Math.abs(x - cx) < 6 ? 'middle' : x > cx ? 'start' : 'end';
        // Two lines per axis: the factor name, then its similarity.
        const top = y < cy - r ? y - 12 : y > cy + r ? y + 4 : y - 6;
        return (
          <text key={f.factor} textAnchor={anchor} fontFamily="IBM Plex Mono, monospace" fontSize="10" letterSpacing="1">
            <tspan x={x} y={top} fill="#7C8894">
              {SHORT[f.factor] ?? f.label.toUpperCase()}
            </tspan>
            <tspan x={x} y={top + 13} fill={f.similarity === null ? '#7C8894' : '#D7DDE3'} fontWeight="600">
              {f.similarity === null ? 'NO DATA' : f.similarity.toFixed(2)}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}

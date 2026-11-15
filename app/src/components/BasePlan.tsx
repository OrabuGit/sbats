import { EXAMPLE_LAYOUT } from '../lib/exampleLayout';
import type { ModuleType } from '../lib/simAdapter';

const COLS = 24;
const ROWS = 12;
const LETTER: Record<ModuleType, string> = { habitat: 'H', solar: 'S', battery: 'B', greenhouse: 'G', iceMiner: 'I', landingPad: 'P' };
const NAME: Record<ModuleType, string> = { habitat: 'habitat', solar: 'solar array', battery: 'battery', greenhouse: 'greenhouse', iceMiner: 'ice miner', landingPad: 'landing pad' };

/**
 * A top-down plan of the base planner's example layout, drawn over the picture of the place: the same modules in the same
 * grid cells the planner starts from. A drawing made in code; it carries no data of its own.
 */
export function BasePlan({ image }: { image: string | null }) {
  const used = [...new Set(EXAMPLE_LAYOUT.modules.map((m) => m.type))];
  return (
    <figure className="m-0">
      <div className="relative aspect-[2/1] overflow-hidden bg-panel">
        {image && <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
        <span className="absolute inset-0 bg-bg/60" aria-hidden="true" />
        <svg viewBox={`0 0 ${COLS} ${ROWS}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" role="img" aria-label="Plan of the example base: habitat, ice miner, landing pad, a row of solar arrays and a block of batteries on a grid">
          <g stroke="#D7DDE3" strokeOpacity="0.14" strokeWidth="0.03">
            {Array.from({ length: COLS + 1 }, (_, i) => (
              <line key={`v${i}`} x1={i} y1={0} x2={i} y2={ROWS} />
            ))}
            {Array.from({ length: ROWS + 1 }, (_, i) => (
              <line key={`h${i}`} x1={0} y1={i} x2={COLS} y2={i} />
            ))}
          </g>
          {EXAMPLE_LAYOUT.modules.map((m, i) => {
            const x = m.x + 0.1;
            const y = m.y + 0.1;
            const key = `${m.type}${i}`;
            if (m.type === 'landingPad')
              return (
                <g key={key}>
                  <circle cx={m.x + 0.5} cy={m.y + 0.5} r={0.4} fill="#0B0D0F" stroke="#FFB000" strokeWidth="0.07" />
                  <text x={m.x + 0.5} y={m.y + 0.5} textAnchor="middle" dominantBaseline="central" fontSize="0.5" fill="#FFB000" fontFamily="Inter Variable, Inter, sans-serif" fontWeight="600">
                    {LETTER[m.type]}
                  </text>
                </g>
              );
            const accent = m.type === 'habitat';
            return (
              <g key={key}>
                <rect x={x} y={y} width={0.8} height={0.8} fill="#0B0D0F" fillOpacity="0.85" stroke={accent ? '#FFB000' : '#D7DDE3'} strokeWidth={accent ? 0.09 : 0.06} />
                {m.type === 'solar' && <line x1={x} y1={y + 0.4} x2={x + 0.8} y2={y + 0.4} stroke="#D7DDE3" strokeWidth="0.04" />}
                {m.type !== 'solar' && m.type !== 'battery' && (
                  <text x={m.x + 0.5} y={m.y + 0.5} textAnchor="middle" dominantBaseline="central" fontSize="0.5" fill={accent ? '#FFB000' : '#D7DDE3'} fontFamily="Inter Variable, Inter, sans-serif" fontWeight="600">
                    {LETTER[m.type]}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] leading-4 text-muted">
        <span>The base planner&rsquo;s example layout, placed on the site.</span>
        {used.map((t) => (
          <span key={t} className="inline-flex items-center gap-1">
            <span className="num text-text">{LETTER[t]}</span> {NAME[t]}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

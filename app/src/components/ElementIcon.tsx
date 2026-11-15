export type ElementId = 'geology' | 'terrain' | 'climate' | 'bareGround' | 'sunlight' | 'minerals' | 'wind' | 'dust' | 'ice';

/** Short plain names, used where the icon stands alone. */
export const ELEMENT_NAME: Record<ElementId, string> = {
  geology: 'Rock',
  terrain: 'Terrain',
  climate: 'Climate',
  bareGround: 'Bare ground',
  sunlight: 'Sunlight',
  minerals: 'Minerals',
  wind: 'Wind',
  dust: 'Dust',
  ice: 'Ice',
};

export const isElement = (id: string): id is ElementId => id in ELEMENT_NAME;

/**
 * One drawing per kind of ground or sky the match compares. Line art on a 48 px grid; each has a small
 * motion of its own (rays turn, wind drifts, a crystal glints) that stops under reduced motion.
 */
export function ElementIcon({ id, size = 28, className = '', still = false }: { id: ElementId; size?: number; className?: string; still?: boolean }) {
  const a = still ? '' : 'ico-anim';
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={`${a} ${className}`} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {id === 'geology' && (
        <>
          <path d="M8 34 L14 16 L24 10 L36 14 L41 28 L33 38 L16 39 Z" />
          <path d="M14 16 L22 24 L36 14M22 24 L16 39M22 24 L33 38M22 24 L41 28" strokeWidth={1.6} />
          <path className="ico-glint" d="M30 19 L32 21" strokeWidth={2.6} />
        </>
      )}
      {id === 'terrain' && (
        <>
          <path className="ico-draw" pathLength={100} d="M3 38 L15 18 L22 28 L30 12 L45 38" />
          <path d="M3 42 H45" strokeWidth={1.6} />
          <path d="M26 20 L30 12 L33 18" strokeWidth={1.4} />
        </>
      )}
      {id === 'climate' && (
        <>
          <path d="M16 28 V10 a4 4 0 0 1 8 0 V28 a7 7 0 1 1 -8 0 Z" />
          <path className="ico-bob" d="M20 20 V32" strokeWidth={3} />
          <circle cx="20" cy="35" r="2.6" fill="currentColor" stroke="none" />
          <path className="ico-drip" d="M36 14 C33 19 31 22 31 25 a5 5 0 0 0 10 0 C41 22 39 19 36 14 Z" />
        </>
      )}
      {id === 'bareGround' && (
        <>
          <path d="M4 22 H44" />
          <path d="M4 32 C12 28 20 36 28 31 S40 30 44 32" />
          <path d="M4 40 C14 37 22 43 32 39 S40 38 44 40" />
          <path d="M18 22 L21 28 L17 32M30 22 L28 27" strokeWidth={1.6} />
          <path d="M34 15 a5 5 0 0 1 9 -2" strokeWidth={1.6} />
          <path d="M8 14 L14 8M10 17 L18 9" strokeWidth={1.6} />
        </>
      )}
      {id === 'sunlight' && (
        <>
          <circle cx="24" cy="24" r="8" />
          <g className="ico-spin">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
              <path key={d} d="M24 6 V12" transform={`rotate(${d} 24 24)`} />
            ))}
          </g>
        </>
      )}
      {id === 'minerals' && (
        <>
          <path d="M14 38 L9 24 L14 14 L19 24 L14 38 Z" />
          <path d="M26 40 L19 22 L26 8 L33 22 L26 40 Z" />
          <path d="M38 38 L33 27 L38 19 L43 27 L38 38 Z" />
          <path d="M19 24 H33" strokeWidth={1.4} />
          <path className="ico-glint" d="M24 14 L26 18" strokeWidth={2.6} />
        </>
      )}
      {id === 'wind' && (
        <>
          <path className="ico-drift" d="M5 17 H28 a5 5 0 1 0 -5 -5" />
          <path className="ico-drift ico-late" d="M5 26 H36 a5 5 0 1 1 -5 5" />
          <path className="ico-drift" d="M5 35 H20" />
        </>
      )}
      {id === 'dust' && (
        <>
          <circle className="ico-float" cx="12" cy="16" r="2.2" fill="currentColor" stroke="none" />
          <circle className="ico-float ico-late" cx="26" cy="12" r="1.6" fill="currentColor" stroke="none" />
          <circle className="ico-float" cx="38" cy="20" r="2.6" fill="currentColor" stroke="none" />
          <circle className="ico-float ico-late" cx="18" cy="28" r="1.8" fill="currentColor" stroke="none" />
          <circle className="ico-float" cx="32" cy="32" r="2" fill="currentColor" stroke="none" />
          <circle className="ico-float ico-late" cx="10" cy="38" r="1.4" fill="currentColor" stroke="none" />
          <circle className="ico-float" cx="40" cy="40" r="1.4" fill="currentColor" stroke="none" />
        </>
      )}
      {id === 'ice' && (
        <g className="ico-spin-slow">
          <path d="M24 4 V44M7 14 L41 34M7 34 L41 14" />
          <path d="M19 8 L24 12 L29 8M19 40 L24 36 L29 40M6 19 L11 21 L9 26M42 29 L37 27 L39 22M6 29 L11 27 L9 22M42 19 L37 21 L39 26" strokeWidth={1.6} />
        </g>
      )}
    </svg>
  );
}

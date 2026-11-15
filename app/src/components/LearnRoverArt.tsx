/** Line drawings of the rovers in data/rovers.json, drawn for this page. They are pictures, not data, and carry no scale. */
export function LearnRoverArt({ id, className = '' }: { id: string; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const wheel = (cx: number, r: number, spokes = false) => (
    <g key={cx}>
      <circle cx={cx} cy={64 - r} r={r} />
      {spokes && <path d={`M${cx - r * 0.7} ${64 - r}h${r * 1.4}M${cx} ${64 - r * 1.7}v${r * 1.4}`} strokeWidth={0.9} />}
      <circle cx={cx} cy={64 - r} r={r * 0.3} strokeWidth={1} />
    </g>
  );
  return (
    <svg viewBox="0 0 160 70" className={className} aria-hidden="true" {...common}>
      <path d="M2 64H158" strokeWidth={1} opacity={0.5} />
      {(id === 'perseverance' || id === 'curiosity') && (
        <>
          {/* body, deck, mast with camera head, robotic arm, power source at the back */}
          <path d="M40 36h66v12H40z" />
          <path d="M44 36v-4h58v4" />
          <path d="M92 32V10" />
          <path d="M84 6h18v6H84z" />
          <circle cx="89" cy="9" r="1.4" />
          <circle cx="96" cy="9" r="1.4" />
          <path d="M106 42l14 2 8-10" />
          <path d="M128 34l6 3-3 5" />
          <path d="M40 40l-12-6v-8l8-2 4 6" />
          {id === 'curiosity' && <path d="M60 32v-6h10v6" />}
          {/* rocker-bogie */}
          <path d="M50 48l-16 8M50 48l22 8M72 56l14-8M96 48l18 8M96 48l-10 0" />
          {[34, 72, 114].map((x) => wheel(x, 7))}
        </>
      )}
      {id === 'mer' && (
        <>
          <path d="M20 30h120l-6 4H26z" />
          <path d="M50 34h60v12H50z" />
          <path d="M92 30V8" />
          <path d="M84 4h16v6H84z" />
          <path d="M112 30l6-12" />
          <circle cx="119" cy="16" r="3" />
          <path d="M50 42l-14 4" />
          <path d="M58 46l-16 10M58 46l22 10M80 56l14-10M102 46l14 10" />
          {[42, 80, 116].map((x) => wheel(x, 6))}
        </>
      )}
      {id === 'sojourner' && (
        <>
          <path d="M50 38h60v8H50z" />
          <path d="M46 36h68" />
          <path d="M54 36v-2h52v2" strokeWidth={1} />
          <path d="M100 34v-14" />
          <path d="M98 20h4" />
          <path d="M56 46l-10 10M56 46l22 10M78 56l12-10M100 46l14 10" />
          {[46, 80, 114].map((x) => wheel(x, 5))}
        </>
      )}
      {id === 'viper' && (
        <>
          <path d="M44 22h72v26H44z" />
          <path d="M44 30h-6v12h6M116 30h6v12h-6" />
          <path d="M98 22V6" />
          <path d="M90 2h16v6H90z" />
          <path d="M54 22v-6h24v6" />
          <circle cx="52" cy="38" r="2" />
          <circle cx="108" cy="38" r="2" />
          <path d="M56 48l-8 4M104 48l8 4" />
          {[44, 116].map((x) => wheel(x, 10))}
        </>
      )}
      {id === 'lrv' && (
        <>
          {/* open frame, two seats, fenders, antenna dish; no people */}
          <path d="M22 46h116" />
          <path d="M28 46l4-6h96l4 6" />
          <path d="M18 46a14 10 0 0 1 28 0M114 46a14 10 0 0 1 28 0" />
          <path d="M62 40V28h10v12M80 40V28h10v12" />
          <path d="M62 34h10M80 34h10" strokeWidth={1} />
          <path d="M48 40V22" />
          <path d="M40 22a8 4 0 0 0 16 0z" />
          <path d="M120 40V30h8" />
          {[32, 128].map((x) => wheel(x, 9, true))}
        </>
      )}
    </svg>
  );
}

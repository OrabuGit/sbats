/**
 * The SBATS wordmark, built as type. The A is drawn in code as a peak without a crossbar: terrain, and
 * the one place the accent colour appears in the name. Everything else is the display typeface.
 */
export function Wordmark({ size = 22, suffix = true }: { size?: number; suffix?: boolean }) {
  const h = size;
  return (
    <span className="inline-flex items-baseline text-text" style={{ fontSize: h, lineHeight: 1 }}>
      <span className="display-xl" style={{ letterSpacing: '0.02em' }}>
        SB
      </span>
      <svg
        viewBox="0 0 20 18"
        aria-hidden="true"
        style={{ width: h * 0.82, height: h * 0.74, marginInline: h * 0.03 }}
        className="shrink-0 self-baseline"
      >
        <path d="M1 18 L10 1.5 L19 18 L14.6 18 L10 9.6 L5.4 18 Z" fill="var(--color-accent)" />
      </svg>
      <span className="display-xl" style={{ letterSpacing: '0.02em' }}>
        TS
      </span>
      {suffix && (
        <span className="num ml-2 self-center text-muted" style={{ fontSize: h * 0.45, letterSpacing: '0.06em' }}>
          26
        </span>
      )}
      <span className="sr-only"> SBATS-26</span>
    </span>
  );
}

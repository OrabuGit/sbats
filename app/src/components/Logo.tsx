/** The SBATS logo: a real SVG file (public/logo.svg), outlined, no font needed to draw it. */
export function Logo({ height = 24, mark = false }: { height?: number; mark?: boolean }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}${mark ? 'logo-mark.svg' : 'logo.svg'}`}
      alt="SBATS"
      height={height}
      style={{ height, width: 'auto' }}
      className="block"
      draggable={false}
    />
  );
}

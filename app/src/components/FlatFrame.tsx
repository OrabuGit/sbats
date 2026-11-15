import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';

interface Props {
  label: string;
  /** Called with the latitude and longitude of a click on the map. */
  onPoint?: (lat: number, lon: number) => void;
  /** Scrolls the map so this point is in view whenever `seq` changes. */
  focus?: { lat: number; lon: number; seq: number } | null;
  /** The map layers, drawn inside a box that keeps the 2 to 1 shape of an equirectangular map. */
  children: (box: { w: number; h: number }) => ReactNode;
  /** Controls and notes drawn over the corners of the frame. */
  overlay?: ReactNode;
  /** Classes that place the scrolling map inside the frame, to keep it clear of a heading drawn over the top. */
  area?: string;
}

/**
 * A flat map for devices that cannot draw WebGL: an equirectangular box that fits the space, zooms with two buttons
 * and scrolls when zoomed. Layers are plain elements, so everything on it is a real button.
 */
export function FlatFrame({ label, onPoint, focus, children, overlay, area = 'inset-0' }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState({ w: 800, h: 400 });
  const [zoom, setZoom] = useState(1);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setRoom({ w: Math.max(240, el.clientWidth), h: Math.max(120, el.clientHeight) });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitW = Math.min(room.w, room.h * 2);
  const w = Math.round(fitW * zoom);
  const h = Math.round(w / 2);

  useEffect(() => {
    const el = scroller.current;
    if (!el || !focus) return;
    const x = ((focus.lon + 180) / 360) * w + Math.max(0, (el.clientWidth - w) / 2);
    const y = ((90 - focus.lat) / 180) * h + Math.max(0, (el.clientHeight - h) / 2);
    el.scrollTo({ left: Math.max(0, x - el.clientWidth / 2), top: Math.max(0, y - el.clientHeight / 2) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.seq]);

  const click = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onPoint) return;
      const r = e.currentTarget.getBoundingClientRect();
      const lon = ((e.clientX - r.left) / r.width) * 360 - 180;
      const lat = 90 - ((e.clientY - r.top) / r.height) * 180;
      if (lat < -90 || lat > 90) return;
      onPoint(lat, lon);
    },
    [onPoint],
  );

  return (
    <section className="relative h-full min-h-0 w-full overflow-hidden bg-bg" aria-label={label}>
      <div ref={scroller} className={`scroll absolute overflow-auto ${area}`}>
        <div className="flex min-h-full min-w-full items-center justify-center">
          <div className="relative shrink-0" style={{ width: w, height: h }} onClick={click}>
            {children({ w, h })}
          </div>
        </div>
      </div>
      {overlay}
      <div className="absolute bottom-3 right-3 flex flex-col border border-line bg-panel">
        <button type="button" onClick={() => setZoom((z) => Math.min(6, z * 1.5))} aria-label="Zoom in" className="tool !px-0">
          <Plus size={16} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => setZoom((z) => Math.max(1, z / 1.5))} aria-label="Zoom out" className="tool !px-0 border-t border-line">
          <Minus size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

/** Position of a latitude and longitude inside a flat map box, as percentages. */
export const at = (lat: number, lon: number) => ({ left: `${((lon + 180) / 360) * 100}%`, top: `${((90 - lat) / 180) * 100}%` });

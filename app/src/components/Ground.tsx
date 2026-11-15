import { useEffect, useRef, useState } from 'react';
import { loadElevation, loadImage, type ExtractItem } from '../data/sites';
import { reliefCanvas } from '../lib/relief';
import { SourceBadge } from './Badges';

export type GroundLayer = 'image' | 'relief';

/** Which layer is actually drawn for an item: the image when asked for and present, else the relief. */
export function shownLayer(item: ExtractItem, want: GroundLayer): GroundLayer | null {
  if (want === 'image' && item.image) return 'image';
  return item.elevation ? 'relief' : item.image ? 'image' : null;
}

const RES = 1000;

/**
 * One same-scale extract drawn north up. Every extract covers the same square of ground, so two of
 * these side by side are at one scale. `band` crops to the middle half (a 2:1 strip) for the
 * sandbox grid. Children are laid over the picture.
 */
export function Ground({
  item,
  layer,
  windowKm,
  band = false,
  footprintKm,
  children,
}: {
  item: ExtractItem;
  layer: GroundLayer;
  windowKm: number;
  band?: boolean;
  /** Draws the outline of a centred square of this size, km. */
  footprintKm?: number;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const shown = shownLayer(item, layer);

  useEffect(() => {
    let alive = true;
    setState('loading');
    const source: Promise<CanvasImageSource & { width: number; height: number }> =
      shown === 'image' && item.image
        ? loadImage(item.image.file)
        : item.elevation
          ? loadElevation(item.elevation).then((h) => reliefCanvas(h, item.elevation!.size, item.elevation!.pixelM))
          : Promise.reject(new Error('no layer'));
    source.then(
      (src) => {
        const cv = ref.current;
        if (!alive || !cv) return;
        const g = cv.getContext('2d')!;
        const size = src.width;
        // Coarse grids (Mars, 463 m) are drawn as the blocks they are, not smoothed into detail they lack.
        g.imageSmoothingEnabled = size >= cv.width / 4;
        g.clearRect(0, 0, cv.width, cv.height);
        if (band) g.drawImage(src, 0, size / 4, size, size / 2, 0, 0, cv.width, cv.height);
        else g.drawImage(src, 0, 0, size, size, 0, 0, cv.width, cv.height);
        setState('ready');
      },
      () => alive && setState('error'),
    );
    return () => {
      alive = false;
    };
  }, [item, shown, band]);

  const meta = shown === 'image' ? item.image : item.elevation;
  const fp = footprintKm ? (footprintKm / windowKm) * 100 : null;
  const barKm = 5;
  return (
    <figure className="m-0">
      <div className={`relative w-full overflow-hidden border border-line bg-panel [container-type:inline-size] ${band ? 'aspect-[2/1]' : 'aspect-square'}`}>
        <canvas ref={ref} width={RES} height={band ? RES / 2 : RES} className="absolute inset-0 h-full w-full" role="img" aria-label={`${item.name}, ${shown === 'image' ? 'image' : 'shaded relief'}, north up`} />
        {state !== 'ready' && (
          <p className="label absolute inset-0 flex items-center px-3" role="status">
            {state === 'loading' ? 'Loading ground' : 'Ground could not be loaded'}
          </p>
        )}
        {fp !== null && state === 'ready' && (
          <div
            className="pointer-events-none absolute border border-accent"
            style={{ left: `${50 - fp / 2}%`, width: `${fp}%`, top: `${50 - (band ? fp : fp / 2)}%`, height: `${band ? fp * 2 : fp}%` }}
            aria-hidden="true"
          />
        )}
        {children}
        <div className="pointer-events-none absolute bottom-2 left-2 bg-bg px-1.5 py-1" aria-hidden="true">
          <div className="h-1 border-x border-b border-text" style={{ width: `${(barKm / windowKm) * 100}cqw` }} />
          <p className="num mt-0.5 text-[10px] leading-3 text-text">{barKm} km</p>
        </div>
      </div>
      <figcaption className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
        <span className="num">
          {windowKm} km × {band ? windowKm / 2 : windowKm} km · {meta ? `${meta.pixelM.toFixed(0)} m pixels` : 'no data'}
          {item.elevation ? ` · ${(item.elevation.max - item.elevation.min).toLocaleString('en-US', { maximumFractionDigits: 0 })} m of relief` : ''}
        </span>
        {meta && <SourceBadge badge={meta.badge} source={meta.product} />}
        {meta && <span className="basis-full">{meta.attribution}</span>}
      </figcaption>
    </figure>
  );
}

import { useEffect, useRef, useState } from 'react';
import { loadElevation, loadImage, type ExtractItem } from '../data/sites';
import { reliefCanvas } from '../lib/relief';
import { SourceBadge } from './Badges';
import { shownLayer, type GroundLayer } from './Ground';

const RES = 800;

/** One extract drawn north up on a square canvas, the same way Ground draws it. */
function Pane({ item, onShown, className = '' }: { item: ExtractItem; onShown: (l: GroundLayer | null) => void; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  // An image with no pixel in it (no clear scene over the place) is replaced by the relief when there is one.
  const [blank, setBlank] = useState(false);
  const shown = blank && item.elevation ? 'relief' : shownLayer(item, 'image');
  useEffect(() => {
    setBlank(false);
  }, [item]);
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
        g.imageSmoothingEnabled = src.width >= cv.width / 4;
        g.clearRect(0, 0, cv.width, cv.height);
        g.drawImage(src, 0, 0, src.width, src.height, 0, 0, cv.width, cv.height);
        if (shown === 'image' && item.elevation) {
          const d = g.getImageData(0, 0, cv.width, cv.height).data;
          let opaque = false;
          for (let i = 3; i < d.length && !opaque; i += 4 * 97) opaque = d[i] > 0;
          if (!opaque) {
            setBlank(true);
            return;
          }
        }
        setState('ready');
      },
      () => {
        if (!alive) return;
        if (shown === 'image' && item.elevation) setBlank(true);
        else setState('error');
      },
    );
    return () => {
      alive = false;
    };
  }, [item, shown]);
  useEffect(() => {
    onShown(shown);
  }, [shown, onShown]);
  return (
    <>
      <canvas ref={ref} width={RES} height={RES} className={`absolute inset-0 h-full w-full ${className}`} role="img" aria-label={`${item.name}, ${shown === 'image' ? (item.image?.product ?? 'image') : 'shaded relief'}, north up`} />
      {state !== 'ready' && (
        <p className="label absolute inset-0 flex items-center px-3" role="status">
          {state === 'loading' ? 'Loading ground' : 'Ground could not be loaded'}
        </p>
      )}
    </>
  );
}

function Credit({ side, name, item, shown }: { side: string; name: string; item: ExtractItem; shown: GroundLayer | null }) {
  const meta = shown === 'image' ? item.image : item.elevation;
  return (
    <div className="min-w-0 text-[12px] leading-[18px] text-muted">
      <p className="label">{side}</p>
      <p className="text-[14px] font-semibold text-text">{name}</p>
      {meta ? (
        <>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2">
            <span className="num">{meta.pixelM.toFixed(0)} m pixels</span>
            <SourceBadge badge={meta.badge} source={meta.product} />
          </p>
          <p className="text-text">{shown === 'image' ? meta.product : `Shaded relief, tinted by height, from ${meta.product}`}</p>
          <p>{meta.attribution}</p>
        </>
      ) : (
        <p>No data.</p>
      )}
    </div>
  );
}

/**
 * Two same-scale pictures under one divider: the Earth place on the left, the target on the right.
 * Drag the divider, or focus the slider and use the arrow keys (Home and End jump to the ends).
 */
export function CompareSlider({ earth, target, windowKm, earthName, targetName, targetWorld }: { earth: ExtractItem; target: ExtractItem; windowKm: number; earthName: string; targetName: string; targetWorld: string }) {
  const [pos, setPos] = useState(50);
  const [earthLayer, setEarthLayer] = useState<GroundLayer | null>(shownLayer(earth, 'image'));
  const [targetLayer, setTargetLayer] = useState<GroundLayer | null>(shownLayer(target, 'image'));
  const [focus, setFocus] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const move = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };
  const barKm = 5;
  return (
    <div className="max-w-[680px]">
      <div
        ref={box}
        className="relative aspect-square w-full touch-pan-y select-none overflow-hidden border border-line bg-panel [container-type:inline-size]"
        style={{ cursor: 'ew-resize' }}
        onPointerDown={(e) => {
          drag.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e.clientX);
        }}
        onPointerMove={(e) => drag.current && move(e.clientX)}
        onPointerUp={() => (drag.current = false)}
        onPointerCancel={() => (drag.current = false)}
      >
        <Pane item={target} onShown={setTargetLayer} />
        {/* The Earth place covers the part left of the divider. */}
        <div className="absolute inset-0 bg-panel" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <Pane item={earth} onShown={setEarthLayer} />
        </div>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-accent" style={{ left: `${pos}%` }} aria-hidden="true" />
        <span
          className={`pointer-events-none absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-accent bg-bg text-accent ${focus ? 'outline outline-2 outline-offset-2 outline-text' : ''}`}
          style={{ left: `${pos}%` }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />
          </svg>
        </span>
        <p className="pointer-events-none absolute left-2 top-2 max-w-[44%] truncate bg-bg px-1.5 py-1 text-[12px] font-semibold text-text">Earth: {earthName}</p>
        <p className="pointer-events-none absolute right-2 top-2 max-w-[44%] truncate bg-bg px-1.5 py-1 text-[12px] font-semibold text-text">
          {targetWorld}: {targetName}
        </p>
        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 bg-bg px-1.5 py-1" aria-hidden="true">
          <div className="h-1 border-x border-b border-text" style={{ width: `${(barKm / windowKm) * 100}cqw` }} />
          <p className="num mt-0.5 text-center text-[10px] leading-3 text-text">{barKm} km</p>
        </div>
      </div>
      <label className="mt-3 flex min-h-11 items-center gap-3">
        <span className="label shrink-0">Divider</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(pos)}
          onChange={(e) => setPos(Number(e.target.value))}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          aria-label={`Divider between ${earthName} on the left and ${targetName} on the right`}
          aria-valuetext={`${Math.round(pos)} percent ${earthName}`}
          className="h-11 w-full accent-[#FFB000]"
        />
      </label>
      <div className="mt-2 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Credit side="Earth, left" name={earthName} item={earth} shown={earthLayer} />
        <Credit side={`${targetWorld}, right`} name={targetName} item={target} shown={targetLayer} />
      </div>
      <p className="mt-3 max-w-[72ch] text-[12px] text-muted">
        Both pictures cover the same {windowKm} km square, north up, at one scale. A picture is satellite imagery where the extract has one and shaded relief where it does not.
      </p>
    </div>
  );
}

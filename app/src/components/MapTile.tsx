import { useEffect, useRef, useState } from 'react';
import { formatCoords } from '../lib/geo';
import { dataUrl, loadElevation, type ExtractItem } from '../data/sites';
import { reliefCanvas } from '../lib/relief';
import { shownLayer } from './Ground';
import { WORLD_CREDIT } from './Worlds';

// A picture of a place that is never an empty box. SiteTile shows the same-scale extract (Sentinel-2,
// LROC or THEMIS image, else shaded relief of its elevation grid). MapTile is the fallback and the
// loading state: the app's own global mosaic of the body, cropped to a 24 degree window centred on the
// place, with a ring at the point. Mosaics are equirectangular: x = (lon + 180) / 360, y = (90 - lat) / 180.

export type Body = 'earth' | 'moon' | 'mars';

const TEXTURE: Record<Body, string> = { earth: 'blue-marble-4096', moon: 'moon-wac-4096', mars: 'mars-viking-4096' };
const tex = (b: Body) => `${import.meta.env.BASE_URL}textures/${TEXTURE[b]}.jpg`;

/** The sentence of WORLD_CREDIT for one body, for example "Moon: LROC WAC mosaic, ...". */
export function mosaicCredit(body: Body): string {
  const head = body === 'earth' ? 'Earth:' : body === 'moon' ? 'Moon:' : 'Mars:';
  return WORLD_CREDIT.split(/\s(?=(?:Earth|Moon|Mars):)/).find((s) => s.startsWith(head)) ?? WORLD_CREDIT;
}

/** Window width in degrees of longitude. */
const SPAN = 24;
/** Width and height of the whole mosaic in units of the tile width (the mosaic is 2:1). */
const W = 360 / SPAN;
const H = W / 2;
/** Tile height over width (4:3). */
const ASPECT = 0.75;

/** The mosaic crop alone, filling its positioned parent. */
export function MapPicture({ body, lat, lon }: { body: Body; lat: number; lon: number }) {
  const lonN = ((((lon + 180) % 360) + 360) % 360) - 180;
  const x = (lonN + 180) / 360;
  const y = Math.min(1, Math.max(0, (90 - lat) / 180));
  // Offsets in units of the tile width; the vertical one is held inside the mosaic so the poles show ground, not a gap.
  const offX = 0.5 - x * W;
  const offY = Math.min(0, Math.max(ASPECT - H, ASPECT / 2 - y * H));
  const markY = (offY + y * H) / ASPECT;
  return (
    <span className="absolute inset-0 block overflow-hidden bg-panel [container-type:inline-size]" aria-hidden="true">
      <span
        className="absolute inset-0 block"
        style={{
          backgroundImage: `url(${tex(body)})`,
          backgroundSize: `${W * 100}cqw ${H * 100}cqw`,
          backgroundPosition: `${offX * 100}cqw ${offY * 100}cqw`,
          backgroundRepeat: 'repeat-x',
        }}
      />
      <span
        className="absolute block h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent"
        style={{ left: '50%', top: `${markY * 100}%` }}
      />
    </span>
  );
}

/** A 4:3 crop of the body's mosaic around a point, with the name and coordinates beneath. */
export function MapTile({ body, lat, lon, name, note, small = false }: { body: Body; lat: number; lon: number; name: string; note?: string; small?: boolean }) {
  return (
    <figure className="m-0 min-w-0">
      <span className="relative block aspect-[4/3] w-full" role="img" aria-label={`${name}, ${formatCoords(lat, lon)}, on a global mosaic, about ${SPAN} degrees across, north up`}>
        <MapPicture body={body} lat={lat} lon={lon} />
      </span>
      <TileCaption name={name} lat={lat} lon={lon} source={note ?? `Global mosaic, about ${SPAN}° across. ${mosaicCredit(body)}`} small={small} />
    </figure>
  );
}

function TileCaption({ name, lat, lon, source, small }: { name: string; lat: number; lon: number; source: string; small: boolean }) {
  return (
    <figcaption className="mt-2 min-w-0">
      <span className={`block text-text ${small ? 'text-[13px] leading-[18px]' : 'text-[14px] leading-5'}`}>{name}</span>
      <span className="num block text-[12px] leading-[18px] text-muted">{formatCoords(lat, lon)}</span>
      {!small && <span className="mt-0.5 block text-[11px] leading-4 text-muted">{source}</span>}
    </figcaption>
  );
}

/**
 * The best picture held for a place: the extract's image, else the shaded relief of its elevation, else
 * the mosaic crop. The mosaic is also shown while the extract loads and if it fails, so the box is never empty.
 */
export function SiteTile({
  item,
  body,
  lat,
  lon,
  name,
  small = false,
  caption = true,
}: {
  item?: ExtractItem | null;
  /** Fallback place, used when there is no extract. */
  body: Body;
  lat: number;
  lon: number;
  name: string;
  small?: boolean;
  /** false: the picture alone (spans only, so it can sit inside a button), filling the parent's width. */
  caption?: boolean;
}) {
  const shown = item ? shownLayer(item, 'image') : null;
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setState('loading');
    if (!item || shown !== 'relief' || !item.elevation) return;
    let alive = true;
    const ev = item.elevation;
    loadElevation(ev).then(
      (h) => {
        const cv = canvas.current;
        if (!alive || !cv) return;
        const src = reliefCanvas(h, ev.size, ev.pixelM);
        cv.width = src.width;
        cv.height = src.height;
        cv.getContext('2d')!.drawImage(src, 0, 0);
        setState('ready');
      },
      () => alive && setState('error'),
    );
    return () => {
      alive = false;
    };
  }, [item, shown]);

  const at = item ?? { body, lat, lon, name };
  const where = { lat: at.lat, lon: at.lon };
  const label = name;
  const source =
    item && shown === 'image' && item.image
      ? `${item.image.product}${item.image.date ? `, ${item.image.date}` : ''}. ${item.image.attribution}`
      : item && shown === 'relief' && item.elevation
        ? `Shaded relief from ${item.elevation.product}. ${item.elevation.attribution}`
        : `Global mosaic, about ${SPAN}° across. ${mosaicCredit(body)}`;

  const Root = caption ? 'figure' : 'span';
  return (
    <Root className={`m-0 block min-w-0 ${caption ? '' : 'h-full'}`}>
      <span className={`relative block w-full overflow-hidden bg-panel ${caption ? 'aspect-[4/3]' : 'h-full'}`}>
        {state !== 'ready' && <MapPicture body={item?.body ?? body} lat={where.lat} lon={where.lon} />}
        {item && shown === 'image' && item.image && (
          <img
            src={dataUrl(item.image.file)}
            alt={`${label}, ${item.image.product}, north up`}
            loading="lazy"
            onLoad={() => setState('ready')}
            onError={() => setState('error')}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 motion-reduce:transition-none ${state === 'ready' ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
        {item && shown === 'relief' && (
          <canvas
            ref={canvas}
            role="img"
            aria-label={`${label}, shaded relief, north up`}
            className={`absolute inset-0 h-full w-full object-cover ${state === 'ready' ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
        {state !== 'ready' && <span className="sr-only">{state === 'loading' && item ? 'Loading the picture' : `${label} on a global mosaic`}</span>}
      </span>
      {caption && (
        <TileCaption name={label} lat={where.lat} lon={where.lon} source={state === 'error' ? `Global mosaic, about ${SPAN}° across. ${mosaicCredit(item?.body ?? body)}` : source} small={small} />
      )}
    </Root>
  );
}

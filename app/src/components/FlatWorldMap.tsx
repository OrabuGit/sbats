import type { Target } from '../types';
import type { GlobePlace } from './WorldGlobe';
import { FlatFrame, at } from './FlatFrame';

interface Props {
  targets: Target[];
  targetId: string;
  places: GlobePlace[];
  placeId: string | null;
  onPick: (id: string) => void;
  onPoint: ((lat: number, lon: number) => void) | null;
}

const FILE = { moon: 'moon-wac-2048', mars: 'mars-viking-2048' } as const;

/** The Moon or Mars as a flat map, with the same pins as the globe. Used when this device cannot draw WebGL. */
export function FlatWorldMap({ targets, targetId, places, placeId, onPick, onPoint }: Props) {
  const fallback = targets.find((t) => t.id === targetId) ?? targets[0];
  const target = places.find((p) => p.id === placeId) ?? fallback;
  const body = target.body;
  const here = places.filter((p) => p.body === body);
  return (
    <FlatFrame
      label={`Flat map of ${body === 'moon' ? 'the Moon' : 'Mars'} with named places pinned`}
      onPoint={onPoint ?? undefined}
      focus={{ lat: target.lat, lon: target.lon, seq: 0 }}
      overlay={<p className="readout absolute bottom-3 left-3 bg-bg px-2 py-1 !text-[10px]">Flat map. This device cannot draw the 3D globe.</p>}
    >
      {() => (
        <>
          <img src={`${import.meta.env.BASE_URL}textures/${FILE[body]}.jpg`} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none" />
          {here.map((p) => {
            const on = p.id === target.id;
            return (
              <div key={p.id} className="absolute" style={{ ...at(p.lat, p.lon), transform: 'translate(-8px,-12px)', zIndex: on ? 2 : 1 }}>
                <button
                  type="button"
                  title={p.name}
                  aria-label={p.hasValues ? `${p.name}: find analogs on Earth` : `${p.name}: no measured values yet`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPick(p.id);
                  }}
                  style={{ transform: 'none' }}
                  className={`tm${on ? ' tm-on' : ''}${p.hasValues ? '' : ' tm-quiet'}`}
                >
                  <span className="tm-dot" />
                  <span className="tm-name">{p.name}</span>
                </button>
              </div>
            );
          })}
        </>
      )}
    </FlatFrame>
  );
}

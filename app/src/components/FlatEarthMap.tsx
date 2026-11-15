import { useEffect, useRef } from 'react';
import type { CellSummary, EarthFile } from '../types';
import type { CellIndex } from '../lib/geo';
import type { Candidate } from '../lib/rank';
import { AMBER, NO_DATA, NO_DATA_ALPHA, SCORE_CLASSES, cellAlpha } from '../lib/heat';
import { FlatFrame, at } from './FlatFrame';

interface SiteMarker {
  analog: { lat: number; lon: number; name: string };
  index: number;
}

interface Props {
  earth: EarthFile;
  results: CellSummary[];
  index: CellIndex;
  selected: number | null;
  candidates: Candidate[];
  sites: SiteMarker[];
  onSelect: (index: number) => void;
  focus: { lat: number; lon: number; seq: number } | null;
  links?: { lat: number; lon: number; label: string }[];
  anchor?: { name: string; body: 'moon' | 'mars' };
}

const W = 2048;
const H = 1024;

/** Earth as a flat map with the match heatmap over the imagery. Used when this device cannot draw WebGL. */
export function FlatEarthMap({ earth, results, index, selected, candidates, sites, onSelect, focus, anchor }: Props) {
  const cv = useRef<HTMLCanvasElement>(null);
  const img = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    let alive = true;
    const paint = () => {
      const c = cv.current;
      const g = c?.getContext('2d');
      if (!c || !g) return;
      g.clearRect(0, 0, W, H);
      if (img.current) g.drawImage(img.current, 0, 0, W, H);
      else {
        g.fillStyle = '#0F1418';
        g.fillRect(0, 0, W, H);
      }
      const res = earth.meta.resolutionDeg;
      const cw = (res / 360) * W + 0.7;
      const ch = (res / 180) * H + 0.7;
      earth.cells.forEach((cell, i) => {
        const r = results[i];
        const x = ((cell.lon - res / 2 + 180) / 360) * W - 0.35;
        const y = ((90 - cell.lat - res / 2) / 180) * H - 0.35;
        if (!r || r.score === null) {
          g.fillStyle = NO_DATA;
          g.globalAlpha = NO_DATA_ALPHA * 0.5;
        } else {
          g.fillStyle = `rgb(${AMBER})`;
          g.globalAlpha = cellAlpha(r.score);
        }
        g.fillRect(x, y, cw, ch);
      });
      g.globalAlpha = 1;
    };
    if (!img.current) {
      const im = new Image();
      im.onload = () => {
        if (!alive) return;
        img.current = im;
        paint();
      };
      im.src = `${import.meta.env.BASE_URL}textures/blue-marble-2048.jpg`;
    }
    paint();
    return () => {
      alive = false;
    };
  }, [earth, results]);

  const ranked = new Set(candidates.map((c) => c.index));
  const cellPoint = (i: number) => earth.cells[i];

  return (
    <FlatFrame
      label="Flat map of Earth with match score heatmap"
      focus={focus}
      area="inset-0 lg:top-[170px] lg:bottom-[76px]"
      onPoint={(lat, lon) => {
        const i = index.nearest(lat, lon, 1);
        if (i >= 0) onSelect(i);
      }}
      overlay={
        <>
          {anchor && (
            <p className="absolute left-3 top-3 z-10 bg-bg px-2 py-1 text-[13px] text-text">
              <span className="text-muted">{anchor.body === 'moon' ? 'On the Moon: ' : 'On Mars: '}</span>
              {anchor.name}
            </p>
          )}
          <div className="absolute bottom-3 left-3 bg-bg px-2 py-2">
            <p className="label mb-1.5">Match score, 0 to 100</p>
            <div className="flex items-end gap-px" aria-hidden="true">
              {SCORE_CLASSES.map((c) => (
                <div key={c.min} className="w-7">
                  <div className="h-3" style={{ background: `rgba(${AMBER},${(0.035 + 0.93 * c.b).toFixed(2)})` }} />
                  <div className="num mt-1 text-[10px] leading-3 text-muted">{c.label}</div>
                </div>
              ))}
              <div className="ml-2 w-14">
                <div className="h-3" style={{ background: NO_DATA }} />
                <div className="num mt-1 text-[10px] leading-3 text-muted">no data</div>
              </div>
            </div>
            <p className="sr-only">Seven steps from 0 to 100. Brighter amber is a closer match. Grey cells have no score.</p>
            <p className="readout mt-1.5 hidden !text-[10px] sm:block">Flat map. Imagery: NASA Blue Marble, GIBS</p>
          </div>
        </>
      }
    >
      {() => (
        <>
          <canvas ref={cv} width={W} height={H} className="absolute inset-0 h-full w-full" aria-hidden="true" />
          {sites
            .filter((s) => !ranked.has(s.index))
            .map((s) => (
              <div key={`s${s.index}`} className="absolute" style={{ ...at(s.analog.lat, s.analog.lon), transform: 'translate(-12px,-12px)' }}>
                <button
                  type="button"
                  className="gm gm-site"
                  title={s.analog.name}
                  aria-label={`Open ${s.analog.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(s.index);
                  }}
                >
                  <span />
                </button>
              </div>
            ))}
          {candidates.map((c) => {
            const cell = cellPoint(c.index);
            return (
              <div key={`r${c.index}`} className="absolute" style={{ ...at(cell.lat, cell.lon), transform: 'translate(-11px,-11px)' }}>
                <button
                  type="button"
                  className="gm gm-rank"
                  aria-label={`Open candidate ${c.rank}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(c.index);
                  }}
                >
                  {c.rank}
                </button>
              </div>
            );
          })}
          {selected !== null && (
            <div className="pointer-events-none absolute" style={{ ...at(cellPoint(selected).lat, cellPoint(selected).lon), transform: 'translate(-17px,-17px)' }}>
              <div className="gm gm-selected" aria-hidden="true" />
            </div>
          )}
        </>
      )}
    </FlatFrame>
  );
}

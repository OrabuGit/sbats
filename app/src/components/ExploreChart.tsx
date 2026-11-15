import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EarthFile, FactorKey } from '../types';
import { formatValue, keyLabel, type MetaByKey } from '../lib/format';
import { axisUnit, keyStats, niceTicks, tickText, unitOf, type KeyStats } from './ExploreStats';

export type MarkKind = 'target' | 'match' | 'known' | 'candidate' | 'negative';

export interface Mark {
  id: string;
  kind: MarkKind;
  /** Short text for the point: the rank for a match. */
  label: string;
  name: string;
  /** Index into earth.cells, or null for the target (it is not a cell). */
  index: number | null;
  /** Values on the two axes at the moment. null when there is no data. */
  x: number | null;
  y: number | null;
}

export type Sel = { type: 'mark'; id: string } | { type: 'cell'; index: number } | null;

const INK = '#D7DDE3';
const MUTED = '#7C8894';
const LINE = '#2A3138';
const BG = '#0B0D0F';
const ACCENT = '#FFB000';
const MONO = 'IBM Plex Mono, ui-monospace, monospace';

const M = { l: 62, r: 14, t: 12, b: 50 };
const PAD = 14; // inside the plot, so points at the end of a range are not cut
const BUCKET = 12;

/** A small stable number from 0 to 1 per cell, for spreading rock classes into a band. Display only. */
const spread = (i: number) => (((Math.imul(i + 1, 2654435761) >>> 0) % 1000) / 1000);

/** Shape of one mark, centred on 0,0. */
export function MarkGlyph({ kind, label, r = 1 }: { kind: MarkKind; label?: string; r?: number }) {
  if (kind === 'target')
    return <circle r={8 * r} fill={ACCENT} stroke={BG} strokeWidth={1.5} />;
  if (kind === 'match')
    return (
      <>
        <circle r={9 * r} fill={INK} stroke={BG} strokeWidth={1.5} />
        {label && (
          <text textAnchor="middle" y={3.6 * r} fontSize={10.5 * r} fontWeight={600} fontFamily={MONO} fill={BG}>
            {label}
          </text>
        )}
      </>
    );
  if (kind === 'known') return <circle r={5.5 * r} fill={BG} stroke={INK} strokeWidth={1.6} />;
  if (kind === 'candidate')
    return <path d={`M0 ${-7 * r} L${7 * r} 0 L0 ${7 * r} L${-7 * r} 0 Z`} fill={BG} stroke={INK} strokeWidth={1.6} />;
  return <path d={`M${-5 * r} ${-5 * r} L${5 * r} ${5 * r} M${5 * r} ${-5 * r} L${-5 * r} ${5 * r}`} stroke={INK} strokeWidth={2} fill="none" />;
}

interface Layout {
  w: number;
  h: number;
  x0: number;
  y0: number;
  pw: number;
  ph: number;
}

interface Grid {
  px: Float32Array;
  py: Float32Array;
  bw: number;
  start: Int32Array;
  items: Int32Array;
  plotted: number;
}

function buildGrid(ux: Float32Array, uy: Float32Array, L: Layout): Grid {
  const n = ux.length;
  const px = new Float32Array(n);
  const py = new Float32Array(n);
  const bw = Math.ceil(L.pw / BUCKET) + 1;
  const bh = Math.ceil(L.ph / BUCKET) + 1;
  const start = new Int32Array(bw * bh + 1);
  const bucket = new Int32Array(n).fill(-1);
  let plotted = 0;
  for (let i = 0; i < n; i++) {
    if (Number.isNaN(ux[i]) || Number.isNaN(uy[i])) {
      px[i] = NaN;
      continue;
    }
    px[i] = L.x0 + PAD + ux[i] * (L.pw - 2 * PAD);
    py[i] = L.y0 + L.ph - PAD - uy[i] * (L.ph - 2 * PAD);
    const b = Math.floor((py[i] - L.y0) / BUCKET) * bw + Math.floor((px[i] - L.x0) / BUCKET);
    bucket[i] = b;
    start[b + 1]++;
    plotted++;
  }
  for (let b = 0; b < bw * bh; b++) start[b + 1] += start[b];
  const items = new Int32Array(plotted);
  const fill = start.slice(0, bw * bh);
  for (let i = 0; i < n; i++) if (bucket[i] >= 0) items[fill[bucket[i]]++] = i;
  return { px, py, bw, start, items, plotted };
}

function nearestCell(g: Grid, L: Layout, x: number, y: number, maxPx: number): number {
  const bh = Math.ceil(L.ph / BUCKET) + 1;
  const bx = Math.floor((x - L.x0) / BUCKET);
  const by = Math.floor((y - L.y0) / BUCKET);
  const reach = Math.ceil(maxPx / BUCKET);
  let best = -1;
  let bestD = maxPx * maxPx;
  for (let j = Math.max(0, by - reach); j <= Math.min(bh - 1, by + reach); j++) {
    for (let i = Math.max(0, bx - reach); i <= Math.min(g.bw - 1, bx + reach); i++) {
      const b = j * g.bw + i;
      for (let k = g.start[b]; k < g.start[b + 1]; k++) {
        const c = g.items[k];
        const d = (g.px[c] - x) ** 2 + (g.py[c] - y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
    }
  }
  return best;
}

interface Props {
  earth: EarthFile;
  meta: MetaByKey;
  xKey: FactorKey;
  yKey: FactorKey;
  /** Spread skewed axes with a square-root scale. */
  stretch: boolean;
  marks: Mark[];
  selected: Sel;
  onSelect: (s: Sel) => void;
  onOpenCell: (index: number) => void;
  /** The mark ids with the target's short name, drawn as a label. */
  targetName: string;
  describedBy?: string;
}

/**
 * Every Earth cell as a faint dot on a canvas, with the target, the matches and the known sites as
 * SVG marks on top. The container is one focusable group: arrow keys move a cursor, the nearest
 * mark or cell is read out beside the chart.
 */
export function ExploreChart({ earth, meta, xKey, yKey, stretch, marks, selected, onSelect, onOpenCell, targetName, describedBy }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(720);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(260, Math.round(el.getBoundingClientRect().width))));
    ro.observe(el);
    setWidth(Math.max(260, Math.round(el.getBoundingClientRect().width)));
    return () => ro.disconnect();
  }, []);

  const height = width < 560 ? 340 : 480;
  const L: Layout = useMemo(() => ({ w: width, h: height, x0: M.l, y0: M.t, pw: width - M.l - M.r, ph: height - M.t - M.b }), [width, height]);

  const sx = keyStats(earth, xKey);
  const sy = keyStats(earth, yKey);
  const sqx = stretch && sx.skewed;
  const sqy = stretch && sy.skewed;

  // Position of every cell on the two axes, 0 to 1. NaN when the cell lacks a value on either axis.
  const units = useMemo(() => {
    const n = earth.cells.length;
    const ux = new Float32Array(n);
    const uy = new Float32Array(n);
    const jitter = (s: KeyStats, u: number, i: number) => (s.categorical ? u + (spread(i) - 0.5) * (0.8 / s.codes.length) : u);
    for (let i = 0; i < n; i++) {
      const c = earth.cells[i];
      const a = axisUnit(sx, c[xKey], sqx);
      const b = axisUnit(sy, c[yKey], sqy);
      if (a === null || b === null) {
        ux[i] = NaN;
        uy[i] = NaN;
      } else {
        ux[i] = jitter(sx, a, i);
        uy[i] = jitter(sy, b, i * 7 + 3);
      }
    }
    return { ux, uy };
  }, [earth, xKey, yKey, sx, sy, sqx, sqy]);

  const grid = useMemo(() => buildGrid(units.ux, units.uy, L), [units, L]);

  // The canvas: every cell, faint, at the real device resolution.
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.round(L.w * dpr);
    cv.height = Math.round(L.h * dpr);
    const g = cv.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, L.w, L.h);
    g.fillStyle = 'rgba(160,172,184,0.1)';
    const { px, py } = grid;
    const dot = L.w < 560 ? 1.4 : 1.8;
    for (let i = 0; i < px.length; i++) {
      if (Number.isNaN(px[i])) continue;
      g.fillRect(px[i] - dot / 2, py[i] - dot / 2, dot, dot);
    }
  }, [grid, L]);

  // Where each mark is drawn. A target value beyond Earth's range sits at the edge, flagged.
  const placed = useMemo(() => {
    const toXY = (m: Mark) => {
      const a = axisUnit(sx, m.x, sqx);
      const b = axisUnit(sy, m.y, sqy);
      if (a === null || b === null) return null;
      return {
        m,
        x: L.x0 + PAD + a * (L.pw - 2 * PAD),
        y: L.y0 + L.ph - PAD - b * (L.ph - 2 * PAD),
        offX: !sx.categorical && m.x !== null ? (m.x < sx.min ? -1 : m.x > sx.max ? 1 : 0) : 0,
        offY: !sy.categorical && m.y !== null ? (m.y < sy.min ? -1 : m.y > sy.max ? 1 : 0) : 0,
      };
    };
    return marks.map(toXY).filter((p): p is NonNullable<ReturnType<typeof toXY>> => p !== null);
  }, [marks, sx, sy, sqx, sqy, L]);

  const pick = useCallback(
    (x: number, y: number, touch: boolean): Sel => {
      // Marks win over cells; the one drawn on top (target, then matches) wins among marks.
      const reach = touch ? 24 : 16;
      let bestMark: (typeof placed)[number] | null = null;
      let bestD = reach * reach;
      for (const p of placed) {
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d <= bestD) {
          bestD = d;
          bestMark = p;
        }
      }
      if (bestMark) return { type: 'mark', id: bestMark.m.id };
      const c = nearestCell(grid, L, x, y, touch ? 30 : 24);
      return c >= 0 ? { type: 'cell', index: c } : null;
    },
    [placed, grid, L],
  );

  const same = (a: Sel, b: Sel) =>
    a === b || (a !== null && b !== null && a.type === b.type && (a.type === 'mark' ? a.id === (b as typeof a).id : a.index === (b as typeof a).index));

  const choose = (s: Sel) => {
    if (s !== null && !same(s, selected)) onSelect(s);
  };

  const local = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 48 : 12;
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (e.key in d) {
      e.preventDefault();
      const t = placed.find((p) => p.m.kind === 'target');
      const from = cursor ?? (t ? { x: t.x, y: t.y } : { x: L.x0 + L.pw / 2, y: L.y0 + L.ph / 2 });
      const next = {
        x: Math.min(L.x0 + L.pw, Math.max(L.x0, from.x + d[e.key][0])),
        y: Math.min(L.y0 + L.ph, Math.max(L.y0, from.y + d[e.key][1])),
      };
      setCursor(next);
      choose(pick(next.x, next.y, true));
    } else if ((e.key === 'Enter' || e.key === ' ') && selected) {
      e.preventDefault();
      const idx = selected.type === 'cell' ? selected.index : (marks.find((m) => m.id === selected.id)?.index ?? null);
      if (idx !== null) onOpenCell(idx);
    }
  };

  // Ticks. Positions come from the same mapping as the points.
  const ticks = (s: KeyStats, sq: boolean, size: number, minGap: number, horizontal: boolean) => {
    const pos = (v: number) => {
      const u = axisUnit(s, v, sq) ?? 0;
      return horizontal ? L.x0 + PAD + u * (size - 2 * PAD) : L.y0 + L.ph - PAD - u * (size - 2 * PAD);
    };
    if (s.categorical) return s.codes.map((c) => ({ v: c, p: pos(c), text: String(c) }));
    const { ticks: tv, step } = niceTicks(s.min, s.max, horizontal ? Math.max(3, Math.floor(size / 90)) : Math.max(3, Math.floor(size / 60)));
    const out: { v: number; p: number; text: string }[] = [];
    let last = -Infinity;
    for (const v of tv) {
      const p = pos(v);
      if (Math.abs(p - last) < minGap) continue;
      last = p;
      out.push({ v, p, text: tickText(v, step) });
    }
    return out;
  };
  const xt = ticks(sx, sqx, L.pw, 46, true);
  const yt = ticks(sy, sqy, L.ph, 26, false);

  const axisTitle = (k: FactorKey, sq: boolean) => {
    const u = unitOf(k, meta);
    return `${keyLabel(k, meta)}${u ? ` (${u})` : ''}${sq ? ', square-root scale' : ''}`;
  };

  const target = placed.find((p) => p.m.kind === 'target');
  const selMark = selected?.type === 'mark' ? placed.find((p) => p.m.id === selected.id) : undefined;
  const selCell =
    selected?.type === 'cell' && !Number.isNaN(grid.px[selected.index]) ? { x: grid.px[selected.index], y: grid.py[selected.index] } : null;
  const order: MarkKind[] = ['negative', 'candidate', 'known', 'match', 'target'];
  const draw = [...placed].sort((a, b) => order.indexOf(a.m.kind) - order.indexOf(b.m.kind));

  const labelOf = (p: (typeof placed)[number]) => {
    const text = p.m.kind === 'target' ? targetName : p.m.name;
    const onRight = p.x < L.x0 + L.pw * 0.62;
    return { text, x: onRight ? 14 : -14, anchor: onRight ? ('start' as const) : ('end' as const) };
  };

  const fmtAt = (k: FactorKey, v: number | null) => (v === null ? 'no data' : formatValue(k, v, meta));

  return (
    <div>
      <div
        ref={box}
        role="group"
        tabIndex={0}
        aria-label={`Scatter of ${grid.plotted.toLocaleString('en-US')} Earth cells: ${axisTitle(xKey, sqx)} across, ${axisTitle(yKey, sqy)} up. Arrow keys move a cursor; Enter opens the selected cell.`}
        aria-describedby={describedBy}
        onKeyDown={onKeyDown}
        onBlur={() => setCursor(null)}
        onPointerMove={(e) => {
          if (e.pointerType === 'touch') return;
          const p = local(e);
          setCursor(null);
          choose(pick(p.x, p.y, false));
        }}
        onPointerDown={(e) => {
          const p = local(e);
          setCursor(null);
          choose(pick(p.x, p.y, e.pointerType === 'touch'));
        }}
        className="relative w-full cursor-crosshair select-none"
        style={{ height, touchAction: 'pan-y' }}
      >
        <canvas ref={canvas} className="absolute left-0 top-0" style={{ width: L.w, height: L.h }} aria-hidden="true" />
        <svg width={L.w} height={L.h} viewBox={`0 0 ${L.w} ${L.h}`} className="absolute left-0 top-0" aria-hidden="true" focusable="false">
          {/* Grid and axes */}
          {xt.map((t) => (
            <line key={`gx${t.v}`} x1={t.p} x2={t.p} y1={L.y0} y2={L.y0 + L.ph} stroke={LINE} strokeOpacity={0.55} />
          ))}
          {yt.map((t) => (
            <line key={`gy${t.v}`} x1={L.x0} x2={L.x0 + L.pw} y1={t.p} y2={t.p} stroke={LINE} strokeOpacity={0.55} />
          ))}
          <rect x={L.x0} y={L.y0} width={L.pw} height={L.ph} fill="none" stroke={LINE} />
          {xt.map((t) => (
            <g key={`tx${t.v}`}>
              <line x1={t.p} x2={t.p} y1={L.y0 + L.ph} y2={L.y0 + L.ph + 5} stroke={MUTED} />
              <text x={t.p} y={L.y0 + L.ph + 19} fontSize="11" fill={MUTED} textAnchor="middle" fontFamily={MONO}>
                {t.text}
              </text>
            </g>
          ))}
          {yt.map((t) => (
            <g key={`ty${t.v}`}>
              <line x1={L.x0 - 5} x2={L.x0} y1={t.p} y2={t.p} stroke={MUTED} />
              <text x={L.x0 - 9} y={t.p + 4} fontSize="11" fill={MUTED} textAnchor="end" fontFamily={MONO}>
                {t.text}
              </text>
            </g>
          ))}
          <text x={L.x0 + L.pw / 2} y={L.h - 6} fontSize="12" fill={INK} textAnchor="middle" fontFamily="Inter, system-ui, sans-serif">
            {axisTitle(xKey, sqx)}
          </text>
          <text transform={`translate(13 ${L.y0 + L.ph / 2}) rotate(-90)`} fontSize="12" fill={INK} textAnchor="middle" fontFamily="Inter, system-ui, sans-serif">
            {axisTitle(yKey, sqy)}
          </text>

          {/* Target guide lines, with its two values at the axes */}
          {target && (
            <g>
              <line x1={target.x} x2={target.x} y1={target.y} y2={L.y0 + L.ph} stroke={ACCENT} strokeDasharray="3 3" strokeOpacity={0.8} />
              <line x1={L.x0} x2={target.x} y1={target.y} y2={target.y} stroke={ACCENT} strokeDasharray="3 3" strokeOpacity={0.8} />
              <text x={target.x} y={L.y0 + L.ph - 6} fontSize="11" fontFamily={MONO} fill={ACCENT} textAnchor={target.x > L.x0 + L.pw - 70 ? 'end' : 'start'} dx={target.x > L.x0 + L.pw - 70 ? -16 : 16} stroke={BG} strokeWidth="3" paintOrder="stroke">
                {fmtAt(xKey, target.m.x)}
              </text>
              <text x={target.x - L.x0 < 70 ? target.x + 14 : L.x0 + 6} y={target.x - L.x0 < 70 ? target.y + 18 : target.y - 5} fontSize="11" fontFamily={MONO} fill={ACCENT} stroke={BG} strokeWidth="3" paintOrder="stroke">
                {fmtAt(yKey, target.m.y)}
              </text>
            </g>
          )}

          {selCell && (
            <g transform={`translate(${selCell.x} ${selCell.y})`}>
              <circle r={7} fill="none" stroke={INK} strokeWidth={1.5} />
              <circle r={1.8} fill={INK} />
            </g>
          )}

          {draw.map((p) => (
            <g key={p.m.id} transform={`translate(${p.x} ${p.y})`}>
              <MarkGlyph kind={p.m.kind} label={p.m.label} />
              {p.offX !== 0 && <path d={p.offX < 0 ? 'M-12 -4 L-17 0 L-12 4' : 'M12 -4 L17 0 L12 4'} stroke={ACCENT} strokeWidth="2" fill="none" />}
              {p.offY !== 0 && <path d={p.offY < 0 ? 'M-4 12 L0 17 L4 12' : 'M-4 -12 L0 -17 L4 -12'} stroke={ACCENT} strokeWidth="2" fill="none" />}
            </g>
          ))}

          {/* Labels for the target and for the selected mark */}
          {[target, selMark]
            .filter((p, i, a): p is NonNullable<typeof p> => !!p && a.indexOf(p) === i)
            .map((p) => {
              const l = labelOf(p);
              const dy = p.m.kind === 'target' ? -12 : 4;
              return (
                <text key={`l${p.m.id}`} x={p.x + l.x} y={p.y + dy} fontSize="12" fontWeight={500} fill={p.m.kind === 'target' ? ACCENT : INK} textAnchor={l.anchor} fontFamily="Inter, system-ui, sans-serif" stroke={BG} strokeWidth="3.5" paintOrder="stroke">
                  {l.text}
                </text>
              );
            })}
          {selMark && (
            <circle cx={selMark.x} cy={selMark.y} r={selMark.m.kind === 'match' ? 14 : 12} fill="none" stroke={INK} strokeWidth={1.5} />
          )}

          {cursor && (
            <g transform={`translate(${cursor.x} ${cursor.y})`}>
              <circle r={16} fill="none" stroke={MUTED} strokeDasharray="3 3" />
              <path d="M-5 0H5M0 -5V5" stroke={INK} />
            </g>
          )}
        </svg>
      </div>
      <p className="num mt-1 text-[12px] text-muted">
        {grid.plotted.toLocaleString('en-US')} of {earth.cells.length.toLocaleString('en-US')} Earth cells have a value on both axes.
        {(sx.categorical || sy.categorical) && ' Rock classes are spread within their row so the cells can be seen; the spread carries no information.'}
      </p>
    </div>
  );
}

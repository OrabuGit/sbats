import { EXAMPLE_LAYOUT } from '../lib/exampleLayout';
import { Suspense, forwardRef, lazy, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { flags } from '../flags';
import { getLastLayout, setLastLayout } from '../lib/layoutStore';
import { Eraser, FolderOpen, Link2, Minus, Plus, Save, Trash2 } from 'lucide-react';
import type { EarthCell, Target } from '../types';
import {
  MODULE_PARAMS,
  MODULE_TYPES,
  deployTwice,
  encodeLayout,
  layoutToJson,
  missingParams,
  simulate,
  siteFromEarthCell,
  siteFromTarget,
  type DayState,
  type Evaluation,
  type ModuleType,
  type ModulesFile,
  type PlacedModule,
  type Readiness,
  type ResourceId,
  type SavedLayout,
  type SimEvent,
  type Simulation,
  type SiteConditions,
} from '../lib/simAdapter';
import { formatCoords } from '../lib/geo';
import { ComputedBadge, SourceBadge, Tag } from './Badges';
import { Ground, mostlyShadow, shownLayer, type GroundLayer } from './Ground';
import { loadElevation, type ExtractItem } from '../data/sites';

const Terrain3D = lazy(() => import('./Terrain3D').then((m) => ({ default: m.Terrain3D })));

// The part of the 36 x 36 layout grid that is drawn. Modules outside it (from a share link made
// elsewhere) still count and are reported in a note.
const COLS = 24;
const ROWS = 12;
const DAYS = 30;

const LETTER: Record<ModuleType, string> = { habitat: 'H', solar: 'S', battery: 'B', greenhouse: 'G', iceMiner: 'I', landingPad: 'P' };

export { EXAMPLE_LAYOUT };

export interface SandboxHandle {
  loadExample: () => void;
  /** Switches the centre between the plan grids and the 3D terrain. */
  setMode: (mode: 'plan' | '3d') => void;
  deploy: () => void;
  setDay: (day: number) => void;
}

interface Props {
  cell: EarthCell;
  siteName: string;
  siteCode: string;
  target: Target;
  modules: { file: ModulesFile; fixture: boolean; problems: string[] };
  /** Measured annual mean sunlight at the surface for a named site, or null to use the latitude upper bound. */
  solar: { wm2: number; source: string } | null;
  /** Same-scale ground extracts for the two panes. An item is null when none was built for that place. */
  ground: { earth: ExtractItem | null; target: ExtractItem | null; windowKm: number };
  /** A layout from a share link, applied once. */
  initial: SavedLayout | null;
  /** Phone only: which of the two side panels is shown under the split view. */
  tab: 'setup' | 'results';
  onTab: (t: 'setup' | 'results') => void;
  onBack: () => void;
  /** Saves the base into the Saved list. Returns false when the browser refused. */
  onSaveBase: (layout: unknown, moduleCount: number) => boolean;
  /** Opens the Saved page. */
  onOpenSaved: () => void;
  savedBases: number;
}

const n0 = (v: number | null | undefined) => (v === null || v === undefined ? 'no data' : v.toLocaleString('en-US', { maximumFractionDigits: 0 }));
const n1 = (v: number | null | undefined) => (v === null || v === undefined ? 'no data' : v.toLocaleString('en-US', { maximumFractionDigits: 1 }));
const signed = (v: number | null) => (v === null ? 'no data' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 1 })}`);

const READY_CLASS: Record<Readiness, string> = { GREEN: 'border-ready text-ready', AMBER: 'border-accent text-accent', RED: 'border-fail text-fail' };
const READY_TEXT: Record<Readiness, string> = {
  GREEN: 'Every resource balance is zero or positive through the longest dark period.',
  AMBER: 'At least one resource survives only on stored reserves.',
  RED: 'At least one resource runs out.',
};
const STATUS_CLASS = { ok: 'text-ready', reserves: 'text-accent', short: 'text-fail', unknown: 'text-muted' } as const;
const STATUS_WORD = { ok: 'OK', reserves: 'Reserves', short: 'Short', unknown: 'No data' } as const;

function ReadinessBadge({ value }: { value: Readiness | null }) {
  return (
    <span className={`num inline-block border px-2 py-0.5 text-[13px] font-semibold tracking-[0.12em] ${value ? READY_CLASS[value] : 'border-line text-muted'}`}>
      {value ?? 'NO DATA'}
    </span>
  );
}

/** One of the two panes of the split view: the layout on its grid, and the conditions it runs under. */
function Pane({
  title,
  site,
  body,
  modules,
  readiness,
  badge,
  onCell,
  children,
  ground,
}: {
  title: string;
  site: SiteConditions;
  body: string;
  modules: PlacedModule[];
  readiness: Readiness | null | undefined;
  badge: React.ReactNode;
  onCell?: (x: number, y: number) => void;
  children?: React.ReactNode;
  ground: { item: ExtractItem | null; windowKm: number; layer: GroundLayer };
}) {
  const at = useMemo(() => new Map(modules.map((m) => [m.x * 100 + m.y, m.type])), [modules]);
  const rows = [
    { label: 'Sunlight when lit', value: site.irradianceWm2 === null ? 'no data' : `${n0(site.irradianceWm2)} W/m²${site.irradianceIsUpperBound ? ' (upper bound)' : ''}` },
    { label: 'Share of time lit', value: site.litFraction === null ? 'no data' : `${n0(site.litFraction * 100)}%` },
    { label: 'Longest dark period', value: site.longestDarkHours === null ? 'no data' : `${n1(site.longestDarkHours)} h` },
    { label: 'Mean temperature', value: site.tempMeanC === null ? 'no data' : `${n1(site.tempMeanC)} °C` },
    { label: 'Mean slope', value: site.slopeDeg === null ? 'no data' : `${n1(site.slopeDeg)}°` },
    { label: 'Ice an ice miner can reach', value: site.iceAvailability === null ? 'no data' : `${n0(site.iceAvailability * 100)}%` },
  ];
  const over = ground.item !== null;
  const grid = (
    <div
      className={over ? 'absolute inset-0 grid' : 'grid border-l border-t border-line'}
      style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gridTemplateRows: over ? `repeat(${ROWS}, minmax(0, 1fr))` : undefined }}
      role={onCell ? 'group' : 'img'}
      aria-label={onCell ? 'Base layout grid. Click a square to place the selected module or to remove one.' : `The same layout at ${title}`}
    >
      {Array.from({ length: ROWS * COLS }, (_, i) => {
        const x = i % COLS;
        const y = Math.floor(i / COLS);
        const type = at.get(x * 100 + y);
        const cls = `flex items-center justify-center border-b border-r text-[10px] font-semibold leading-none num ${over ? 'border-bg/25' : 'aspect-square border-line'} ${
          type ? 'bg-text text-bg' : onCell ? (over ? 'hover:bg-bg/50' : 'hover:bg-panel') : ''
        }`;
        return onCell ? (
          <button key={i} type="button" tabIndex={-1} className={cls} onClick={() => onCell(x, y)} aria-label={`Square ${x + 1}, ${y + 1}${type ? `: ${type}` : ''}`}>
            {type ? LETTER[type] : ''}
          </button>
        ) : (
          <span key={i} className={cls}>
            {type ? LETTER[type] : ''}
          </span>
        );
      })}
    </div>
  );
  return (
    <section className="flex min-w-0 flex-1 flex-col border-b border-line bg-bg p-3 last:border-b-0 xl:border-b-0 xl:border-r xl:last:border-r-0" aria-label={title}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label truncate">{body}</p>
          <h3 className="mt-0.5 min-h-10 text-[14px] font-semibold leading-5 text-text">{title}</h3>
        </div>
        {readiness !== undefined && <ReadinessBadge value={readiness} />}
      </div>
      <div className="mt-3">
        {ground.item ? (
          <Ground item={ground.item} layer={ground.layer} windowKm={ground.windowKm} band>
            {grid}
          </Ground>
        ) : (
          <>
            {grid}
            <p className="mt-1.5 text-[11px] text-muted">No data. No same-scale ground extract was built for this place.</p>
          </>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
        {rows.map((r) => (
          <div key={r.label} className="col-span-2 grid grid-cols-subgrid items-baseline">
            <dt className="text-[12px] text-muted">{r.label}</dt>
            <dd className={`num text-right text-[12px] ${r.value === 'no data' ? 'text-muted' : 'text-text'}`}>{r.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">{badge}</div>
      {children}
    </section>
  );
}

function StockBar({ label, unit, earth, target, max }: { label: string; unit: string; earth: number | null; target: number | null | undefined; max: number }) {
  const bar = (v: number | null | undefined, name: string) =>
    v === undefined ? null : (
      <div className="grid grid-cols-[52px_1fr_72px] items-center gap-2">
        <span className="label text-[10px]">{name}</span>
        <div className="h-2 border border-line bg-bg" role="meter" aria-label={`${label}, ${name}`} aria-valuemin={0} aria-valuemax={Math.round(max)} aria-valuenow={Math.round(v ?? 0)}>
          <div className="h-full bg-text" style={{ width: `${max > 0 && v !== null ? Math.max(0, Math.min(1, v / max)) * 100 : 0}%` }} />
        </div>
        <span className={`num text-right text-[11px] ${v === null ? 'text-muted' : 'text-text'}`}>{v === null ? 'no data' : `${n0(v)} ${unit}`}</span>
      </div>
    );
  return (
    <li className="py-1.5">
      <p className="text-[12px] text-text">{label}</p>
      <div className="mt-1 space-y-1">
        {bar(earth, 'Earth')}
        {bar(target, 'Target')}
      </div>
    </li>
  );
}

const STOCKS: { key: 'batteryKwh' | 'waterKg' | 'oxygenKg' | 'foodKg'; label: string; unit: string }[] = [
  { key: 'batteryKwh', label: 'Battery charge', unit: 'kWh' },
  { key: 'waterKg', label: 'Water', unit: 'kg' },
  { key: 'oxygenKg', label: 'Oxygen', unit: 'kg' },
  { key: 'foodKg', label: 'Food', unit: 'kg' },
];

function sustainText(s: Simulation['sustainability']): string {
  if (!s) return 'no data';
  return s.reachedHorizon ? `over ${s.days}` : `${s.days}`;
}

export const Sandbox = forwardRef<SandboxHandle, Props>(function Sandbox(
  { cell, siteName, target, modules, solar, ground, initial, tab, onTab, onBack, onSaveBase, onOpenSaved, savedBases },
  ref,
) {
  const file = modules.file;
  const [layout, setLayout] = useState<SavedLayout>(initial ?? getLastLayout() ?? { modules: [], resupplyEveryDays: null });
  // Kept while the sandbox is closed, and shared with the terrain page.
  useEffect(() => setLastLayout(layout), [layout]);
  const [tool, setTool] = useState<ModuleType | 'erase'>('habitat');
  const [deployed, setDeployed] = useState(false);
  const [day, setDay] = useState(DAYS);
  const [event, setEvent] = useState(false);
  const [eventDay, setEventDay] = useState(5);
  const [message, setMessage] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [layer, setLayer] = useState<GroundLayer>('image');
  const [mode, setMode] = useState<'plan' | '3d'>('plan');
  // Fetch the elevation grids ahead of time, so the 3D view opens without a wait.
  useEffect(() => {
    if (!flags.boots) return;
    for (const item of [ground.earth, ground.target]) if (item?.elevation) loadElevation(item.elevation).catch(() => {});
  }, [ground.earth, ground.target]);

  useEffect(() => {
    if (initial) setLayout(initial);
  }, [initial]);
  // A new site or target is a new comparison: the target column waits for Deploy again.
  useEffect(() => setDeployed(false), [cell, target.id]);

  const earthSite = useMemo(
    () =>
      siteFromEarthCell(
        { lat: cell.lat, lon: cell.lon, tempMean: cell.tempMean, slope: cell.slope, insolationKwhM2Day: solar ? (solar.wm2 * 24) / 1000 : null },
        file,
        { name: siteName },
      ),
    [cell, file, siteName, solar],
  );
  const targetSite = useMemo(() => siteFromTarget(target, file), [target, file]);
  const report = useMemo(() => deployTwice(layout, earthSite, targetSite, file), [layout, earthSite, targetSite, file]);

  const eventType: SimEvent['type'] = target.body === 'moon' ? 'lunarNight' : 'marsDustStorm';
  const eventEntry = file.events[eventType];
  const simEarth = useMemo(
    () => simulate(layout, earthSite, file, { days: DAYS, resupplyEveryDays: layout.resupplyEveryDays }),
    [layout, earthSite, file],
  );
  const simTarget = useMemo(
    () =>
      simulate(layout, targetSite, file, {
        days: DAYS,
        resupplyEveryDays: layout.resupplyEveryDays,
        events: event ? [{ type: eventType, startDay: eventDay }] : [],
      }),
    [layout, targetSite, file, event, eventType, eventDay],
  );

  const counts = report.earth.counts;
  const outside = layout.modules.filter((m) => m.x >= COLS || m.y >= ROWS).length;
  const capacity = report.earth.crewCapacity;

  const change = useCallback((next: SavedLayout) => {
    setLayout(next);
    setMessage(null);
    setLink(null);
  }, []);

  const onCell = (x: number, y: number) => {
    const here = layout.modules.findIndex((m) => m.x === x && m.y === y);
    if (here >= 0) return change({ ...layout, modules: layout.modules.filter((_, i) => i !== here) });
    if (tool === 'erase') return;
    change({ ...layout, modules: [...layout.modules, { type: tool, x, y }] });
  };
  /** Keyboard path: add a module on the first free square, or remove the last one of its type. */
  const step = (type: ModuleType, delta: 1 | -1) => {
    if (delta < 0) {
      const last = layout.modules.map((m) => m.type).lastIndexOf(type);
      if (last >= 0) change({ ...layout, modules: layout.modules.filter((_, i) => i !== last) });
      return;
    }
    const taken = new Set(layout.modules.map((m) => m.x * 100 + m.y));
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (!taken.has(x * 100 + y)) return change({ ...layout, modules: [...layout.modules, { type, x, y }] });
    setMessage('The grid is full.');
  };
  const setCrew = (crew: number | undefined) => {
    const next: SavedLayout = { modules: layout.modules, resupplyEveryDays: layout.resupplyEveryDays };
    if (crew !== undefined) next.crew = Math.max(0, Math.min(999, crew));
    change(next);
  };

  const save = () => {
    if (layout.modules.length === 0) return setMessage('Place a module first.');
    const ok = onSaveBase(layoutToJson(layout), layout.modules.length);
    setMessage(ok ? 'Saved. It is under Saved, in the top bar.' : 'Could not save in this browser.');
  };
  const share = () => {
    try {
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('base', encodeLayout(layout));
      url.searchParams.set('target', target.id);
      url.searchParams.set('site', `${cell.lat},${cell.lon}`);
      const text = url.toString();
      setLink(text);
      navigator.clipboard?.writeText(text).then(
        () => setMessage('Link copied.'),
        () => setMessage('Copy the link below.'),
      );
    } catch (e) {
      setMessage(`Could not make a link: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      loadExample: () => {
        setLayout(EXAMPLE_LAYOUT);
        setDeployed(false);
        setDay(DAYS);
        setMode('plan');
      },
      deploy: () => setDeployed(true),
      setMode,
      setDay: (d: number) => setDay(Math.max(1, Math.min(DAYS, Math.round(d)))),
    }),
    [],
  );

  const dayE: DayState | undefined = simEarth.days[day - 1];
  const dayT: DayState | undefined = simTarget.days[day - 1];
  const stockMax = (key: (typeof STOCKS)[number]['key']) =>
    Math.max(1, ...simEarth.days.map((d) => d[key] ?? 0), ...(deployed ? simTarget.days.map((d) => d[key] ?? 0) : []), key === 'batteryKwh' ? (simEarth.initialStock.batteryKwh ?? 0) : 0);
  const cargoDays = layout.resupplyEveryDays ? Array.from({ length: DAYS }, (_, i) => i + 1).filter((d) => d % (layout.resupplyEveryDays as number) === 0) : [];
  const eventDays = dayT ? simTarget.days.filter((d) => d.events.length > 0).map((d) => d.day) : [];
  const gapLines = report.lines.slice(0, report.lines.length - report.cannotTest.length - 1);

  const resourceRow = (id: ResourceId) => {
    const e = report.earth.resources[id];
    const t = report.target.resources[id];
    const cellOf = (ev: Evaluation, r: typeof e) => (
      <td className="py-2 pl-3 text-right align-top">
        <span className={`num block text-[13px] ${r.net === null ? 'text-muted' : 'text-text'}`}>
          {id === 'crew' ? (r.production === null ? 'no data' : `${n0(ev.crew)} / ${n0(r.production)}`) : signed(r.net)}
        </span>
        <span className={`num block text-[10px] ${STATUS_CLASS[r.status]}`}>{STATUS_WORD[r.status]}</span>
      </td>
    );
    return (
      <tr key={id} className="border-b border-line" title={deployed ? t.note : e.note}>
        <th scope="row" className="py-2 text-left align-top font-normal">
          <span className="block text-[13px] text-text">{e.label}</span>
          <span className="num block text-[10px] text-muted">{id === 'crew' ? 'on site / places' : id === 'power' ? 'kW net' : 'kg per day net'}</span>
        </th>
        {cellOf(report.earth, e)}
        {deployed ? cellOf(report.target, t) : <td className="num py-2 pl-3 text-right align-top text-[12px] text-muted">not deployed</td>}
      </tr>
    );
  };

  const left = (
    <aside
      aria-label="Modules and base settings"
      className={`scroll order-3 bg-bg lg:order-1 lg:block lg:min-h-0 lg:border-r lg:border-line ${tab === 'setup' ? 'block' : 'hidden'}`}
    >
      <section className="border-b border-line p-4" aria-labelledby="h-palette">
        <h2 id="h-palette" className="label mb-1">
          Modules
        </h2>
        <p className="mb-3 text-[12px] text-muted">
          Select a module and click the Earth grid, or use plus and minus. One square is{' '}
          <span className="num">{((ground.windowKm / COLS) * 1000).toFixed(0)} m</span>, so positions are schematic.
        </p>
        {modules.fixture && (
          <p className="mb-3 border border-accent p-2 text-[12px] text-accent" role="note">
            Fixture module numbers, not real. The module numbers are not published with this build, so every result here is a placeholder.
          </p>
        )}
        {modules.problems.length > 0 && (
          <p className="mb-3 border border-accent p-2 text-[12px] text-accent" role="alert">
            modules.json has {modules.problems.length} problem{modules.problems.length > 1 ? 's' : ''}: {modules.problems.slice(0, 2).join('; ')}
          </p>
        )}
        <ul className="-mx-4 border-y border-line">
          {MODULE_TYPES.map((type) => {
            const entry = file.modules[type];
            const missing = missingParams(file, type);
            const on = tool === type;
            return (
              <li key={type} className="border-b border-line last:border-b-0">
                <div className="flex items-stretch">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTool(type)}
                    className={`row min-w-0 flex-1 !border-b-0 ${on ? 'row-on' : ''}`}
                  >
                    <span className="num flex h-5 w-5 shrink-0 items-center justify-center bg-text text-[11px] font-semibold text-bg" aria-hidden="true">
                      {LETTER[type]}
                    </span>
                    <span className={`min-w-0 flex-1 text-[14px] ${on ? 'font-medium' : ''}`}>{entry.label}</span>
                  </button>
                  <button type="button" onClick={() => step(type, -1)} disabled={counts[type] === 0} aria-label={`Remove one ${entry.label}`} className="tool !px-0 border-l border-line">
                    <Minus size={14} aria-hidden="true" />
                  </button>
                  <output className="num flex w-8 items-center justify-center border-l border-line text-[13px] text-text" aria-label={`${entry.label} count`}>
                    {counts[type]}
                  </output>
                  <button type="button" onClick={() => step(type, 1)} aria-label={`Add one ${entry.label}`} className="tool !px-0 border-l border-line">
                    <Plus size={14} aria-hidden="true" />
                  </button>
                </div>
                <details className="border-t border-line">
                  <summary className="flex min-h-9 cursor-pointer items-center gap-2 px-3 text-[12px] text-muted hover:text-text">
                    <span className="flex-1">
                      <span className="num">{MODULE_PARAMS[type].length}</span> numbers and sources
                    </span>
                    {missing.length > 0 && <Tag tone="accent" title={`No sourced value for: ${missing.join(', ')}`}>Illustrative</Tag>}
                  </summary>
                  <p className="px-3 pb-2 text-[12px] text-text">{entry.description}</p>
                  <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-3 pb-3">
                    {MODULE_PARAMS[type].map((key) => {
                      const p = entry.params[key];
                      return (
                        <div key={key} className="col-span-2 grid grid-cols-subgrid items-center">
                          <dt className="num text-[11px] text-muted">{key}</dt>
                          <dd className="flex items-center justify-end gap-2">
                            <span className={`num text-[12px] ${p?.value === null || p === undefined ? 'text-muted' : 'text-text'}`} title={p?.note}>
                              {p?.value === null || p === undefined ? 'no data' : `${p.value.toLocaleString('en-US')} ${p.unit}`.trim()}
                            </span>
                            <SourceBadge badge={p?.badge ?? null} source={p?.source} />
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </details>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button type="button" aria-pressed={tool === 'erase'} onClick={() => setTool('erase')} className={`btn !px-2 ${tool === 'erase' ? 'btn-accent' : ''}`}>
            <Eraser size={13} aria-hidden="true" /> Erase
          </button>
          <button type="button" onClick={() => change(EXAMPLE_LAYOUT)} className="btn !px-2">
            Example
          </button>
          <button type="button" onClick={() => change({ modules: [], resupplyEveryDays: layout.resupplyEveryDays })} className="btn !px-2">
            <Trash2 size={13} aria-hidden="true" /> Clear
          </button>
        </div>
        {outside > 0 && (
          <p className="mt-2 text-[12px] text-muted" role="note">
            {outside} module{outside > 1 ? 's' : ''} from this layout sit outside the part of the grid shown here. They still count.
          </p>
        )}
      </section>

      <section className="border-b border-line p-4" aria-labelledby="h-crew">
        <h2 id="h-crew" className="label mb-2">
          Crew and cargo
        </h2>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] text-text">Crew on site</span>
          <div className="flex items-stretch border border-line">
            <button type="button" onClick={() => setCrew((layout.crew ?? capacity ?? 0) - 1)} aria-label="One crew member fewer" className="tool !px-0">
              <Minus size={14} aria-hidden="true" />
            </button>
            <output className="num flex w-14 items-center justify-center border-x border-line text-[13px] text-text">{n0(layout.crew ?? capacity ?? 0)}</output>
            <button type="button" onClick={() => setCrew((layout.crew ?? capacity ?? 0) + 1)} aria-label="One crew member more" className="tool !px-0">
              <Plus size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[13px] text-text">
          <input type="checkbox" checked={layout.crew === undefined} onChange={(e) => setCrew(e.target.checked ? undefined : (capacity ?? 0))} className="check" />
          Fill every habitat place
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[13px] text-text">
          <input
            type="checkbox"
            checked={layout.resupplyEveryDays !== null}
            onChange={(e) => change({ ...layout, resupplyEveryDays: e.target.checked ? 10 : null })}
            className="check"
          />
          Cargo deliveries
        </label>
        {layout.resupplyEveryDays !== null && (
          <label className="flex items-center justify-between gap-3 text-[13px] text-text">
            Days between deliveries
            <input
              type="number"
              min={1}
              max={DAYS}
              value={layout.resupplyEveryDays}
              onChange={(e) => change({ ...layout, resupplyEveryDays: Math.max(1, Math.min(DAYS, Math.round(Number(e.target.value) || 1))) })}
              className="num h-11 w-20 border border-line bg-bg px-2 text-right text-[13px] text-text"
            />
          </label>
        )}
        <p className="mt-1 text-[12px] text-muted">
          A delivery needs a landing pad on a mean slope of{' '}
          <span className="num">{file.modules.landingPad.params.maxSlopeDeg?.value ?? 'no data'}°</span> or less. Transit is not modelled.
        </p>
      </section>

      <section className="p-4" aria-labelledby="h-save">
        <h2 id="h-save" className="label mb-2">
          Save and share
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={save} className="btn !px-2">
            <Save size={13} aria-hidden="true" /> Save base
          </button>
          <button type="button" onClick={onOpenSaved} className="btn !px-2">
            <FolderOpen size={13} aria-hidden="true" /> Saved{savedBases > 0 ? ` (${savedBases})` : ''}
          </button>
          <button type="button" onClick={share} className="btn !px-2">
            <Link2 size={13} aria-hidden="true" /> Link
          </button>
        </div>
        <p className="mt-2 min-h-5 text-[12px] text-text" role="status" aria-live="polite">
          {message}
        </p>
        {link && (
          <label className="mt-1 block text-[12px] text-muted">
            Share link
            <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="num mt-1 h-11 w-full border border-line bg-bg px-2 text-[11px] text-text" />
          </label>
        )}
        <p className="mt-2 text-[12px] text-muted">The link holds the layout, the Earth cell and the target. A saved base stays in this browser.</p>
      </section>
    </aside>
  );

  const right = (
    <aside
      aria-label="Resources and gap report"
      className={`scroll order-3 bg-bg lg:block lg:min-h-0 lg:border-l lg:border-line ${tab === 'results' ? 'block' : 'hidden'}`}
    >
      <section className="border-b border-line p-4" aria-labelledby="h-res">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="h-res" className="label">
            Resources
          </h2>
          <ComputedBadge title="Computed in the browser by the simulation library from the module numbers, each of which carries its own source." />
        </div>
        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="label py-1.5 text-left font-normal">
                Per day
              </th>
              <th scope="col" className="label py-1.5 pl-3 text-right font-normal">
                Earth
              </th>
              <th scope="col" className="label py-1.5 pl-3 text-right font-normal">
                Target
              </th>
            </tr>
          </thead>
          <tbody>
            {(['power', 'water', 'oxygen', 'food', 'crew'] as const).map(resourceRow)}
            <tr>
              <th scope="row" className="py-2 text-left font-normal">
                <span className="block text-[13px] text-text">Delivered mass</span>
                <span className="num block text-[10px] text-muted">kg, all modules</span>
              </th>
              <td colSpan={2} className={`num py-2 pl-3 text-right text-[13px] ${report.earth.deliveredMassKg === null ? 'text-muted' : 'text-text'}`}>
                {n0(report.earth.deliveredMassKg)}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-1 text-[11px] text-muted">No launch cost: the data has no cited cost per kg.</p>
      </section>

      <section className="border-b border-line p-4" aria-labelledby="h-gap">
        <h2 id="h-gap" className="label">
          Gap report
        </h2>
        {!deployed ? (
          <>
            <p className="mt-2 text-[13px] text-text">
              Runs the same layout under the conditions at {target.name} and lists each difference from the Earth site.
            </p>
            <button type="button" onClick={() => setDeployed(true)} className="btn btn-primary mt-3 w-full">
              Deploy at {target.name}
            </button>
          </>
        ) : layout.modules.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted">No modules placed. Place one, or press Example.</p>
        ) : (
          <>
            <ul className="mt-2 space-y-2">
              {gapLines.map((l, i) => (
                <li key={i} className={`border-l-2 pl-3 text-[13px] text-text ${i === 0 ? 'border-accent font-medium' : 'border-line'}`}>
                  {l}
                </li>
              ))}
            </ul>
            <h3 className="label mt-4">What a rehearsal on Earth cannot test</h3>
            <ul className="mt-2 space-y-2">
              {report.cannotTest.map((l, i) => (
                <li key={i} className="border-l-2 border-line pl-3 text-[13px] text-text">
                  {l}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="border-b border-line p-4" aria-labelledby="h-time">
        <h2 id="h-time" className="label">
          {DAYS} days
        </h2>
        <dl className="mt-2 grid grid-cols-2 gap-4">
          <div className="border-t border-line pt-2">
            <dt className="label text-[10px]">Days without cargo, Earth</dt>
            <dd className="num mt-1 text-[17px] font-semibold text-text">{sustainText(simEarth.sustainability)}</dd>
          </div>
          <div className="border-t border-line pt-2">
            <dt className="label text-[10px]">Days without cargo, target</dt>
            <dd className={`num mt-1 text-[17px] font-semibold ${deployed ? 'text-text' : 'text-muted'}`}>{deployed ? sustainText(simTarget.sustainability) : 'not deployed'}</dd>
          </div>
        </dl>
        <label htmlFor="sim-day" className="mt-3 flex items-baseline justify-between text-[13px] text-text">
          Day <output htmlFor="sim-day" className="num text-[13px]">{day} of {DAYS}</output>
        </label>
        <input id="sim-day" type="range" min={1} max={DAYS} step={1} value={day} onChange={(e) => setDay(Number(e.target.value))} className="slider" aria-valuetext={`Day ${day}`} />
        <div className="grid border-l border-line" style={{ gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))` }} aria-hidden="true">
          {Array.from({ length: DAYS }, (_, i) => i + 1).map((d) => (
            <span key={d} className={`h-2 border-r border-line ${cargoDays.includes(d) ? 'bg-accent' : deployed && eventDays.includes(d) ? 'bg-muted' : d === day ? 'bg-text' : ''}`} />
          ))}
        </div>
        <p className="mt-1 text-[11px] text-muted">
          {cargoDays.length > 0 ? `Cargo on days ${cargoDays.join(', ')} (amber).` : 'No cargo scheduled.'}
          {deployed && eventDays.length > 0 ? ` ${eventEntry.label} on days ${eventDays[0]} to ${eventDays[eventDays.length - 1]} at the target (grey).` : ''}
        </p>
        <ul className="mt-2 divide-y divide-line">
          {STOCKS.map((s) => (
            <StockBar key={s.key} label={s.label} unit={s.unit} earth={dayE ? dayE[s.key] : null} target={deployed ? (dayT ? dayT[s.key] : null) : undefined} max={stockMax(s.key)} />
          ))}
        </ul>
        {dayT && deployed && (dayT.depleted.length > 0 || dayT.shed.length > 0) && (
          <p className="mt-2 text-[12px] text-fail" role="note">
            Target, day {day}:{dayT.depleted.length > 0 ? ` ${dayT.depleted.join(', ')} ran out.` : ''}
            {dayT.shed.length > 0 ? ` Switched off for lack of power: ${dayT.shed.map((t) => file.modules[t].label.toLowerCase()).join(', ')}.` : ''}
          </p>
        )}
        <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-[13px] text-text">
          <input type="checkbox" checked={event} onChange={(e) => setEvent(e.target.checked)} className="check" />
          {eventEntry.label} at the target
        </label>
        {event && (
          <label className="flex items-center justify-between gap-3 text-[13px] text-text">
            Starts on day
            <input type="number" min={1} max={DAYS} value={eventDay} onChange={(e) => setEventDay(Math.max(1, Math.min(DAYS, Math.round(Number(e.target.value) || 1))))} className="num h-11 w-20 border border-line bg-bg px-2 text-right text-[13px] text-text" />
          </label>
        )}
        {[...new Set([...simEarth.notes, ...(deployed ? simTarget.notes : [])])].map((n) => (
          <p key={n} className="mt-2 text-[12px] text-muted" role="note">
            {n}
          </p>
        ))}
      </section>

      <section className="p-4" aria-labelledby="h-notes">
        <h2 id="h-notes" className="label">
          Sources of the site conditions
        </h2>
        <ul className="mt-2 space-y-1.5">
          {[...new Set([...earthSite.notes, ...targetSite.notes, ...report.earth.notes, ...(deployed ? report.target.notes : [])])].map((n) => (
            <li key={n} className="text-[12px] text-muted">
              {n}
            </li>
          ))}
          {solar && <li className="text-[12px] text-muted">Earth sunlight is the annual mean of the grid cell around the site, not a measurement at the site: {solar.source}.</li>}
        </ul>
      </section>
    </aside>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[320px_minmax(0,1fr)_380px]">
      {left}
      <div className="scroll order-1 shrink-0 border-b border-line bg-bg lg:order-2 lg:min-h-0 lg:border-b-0">
        <div className="flex flex-wrap items-stretch border-b border-line bg-bg [&_.tab]:-mb-px">
          <button type="button" onClick={onBack} className="tool border-r border-line">
            Back to the match
          </button>
          <p className="hidden min-w-0 flex-1 items-center px-4 text-[13px] text-muted md:flex">One layout, two sites</p>
          <span className="flex-1 md:hidden" />
          {flags.boots && (
            <div className="flex border-l border-line px-1" role="group" aria-label="View">
              {(['plan', '3d'] as const).map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className="tab">
                  {m === 'plan' ? 'Plan' : '3D terrain'}
                </button>
              ))}
            </div>
          )}
          {(ground.earth || ground.target) && (
            <div className="flex border-l border-line px-1" role="group" aria-label="Ground layer">
              {(['image', 'relief'] as const).map((l) => (
                <button key={l} type="button" aria-pressed={layer === l} onClick={() => setLayer(l)} className="tab">
                  {l === 'image' ? 'Image' : 'Relief'}
                </button>
              ))}
            </div>
          )}
        </div>
        {mode === '3d' &&
          (ground.earth && ground.target ? (
            <Suspense
              fallback={
                <p className="label p-3" role="status">
                  Loading terrain
                </p>
              }
            >
              <Terrain3D
                earth={{ item: ground.earth, modules: layout.modules }}
                target={{ item: ground.target, modules: deployed ? layout.modules : [], note: deployed ? undefined : 'not deployed' }}
                windowKm={ground.windowKm}
                layer={layer}
                cols={COLS}
                rows={ROWS}
              />
            </Suspense>
          ) : (
            <p className="p-3 text-[13px] text-muted">
              No data. No terrain extract was built for {ground.earth ? target.name : 'this Earth cell'}. Open a featured site that has one, for example Kawah Ijen or Mount Merapi.
            </p>
          ))}
        <div className={mode === '3d' ? 'hidden' : 'flex flex-col xl:flex-row'}>
          <Pane
            title={siteName}
            body={`Earth · ${formatCoords(cell.lat, cell.lon)}`}
            site={earthSite}
            modules={layout.modules}
            readiness={layout.modules.length === 0 ? null : report.earth.readiness}
            onCell={onCell}
            ground={{ item: ground.earth, windowKm: ground.windowKm, layer }}
            badge={
              <>
                <SourceBadge badge="Measured" source="Temperature and slope: data/earth.json" />
                {solar ? <SourceBadge badge="Measured" source={solar.source} /> : <ComputedBadge title="Sunlight and night length are computed from latitude. The sunlight figure is an upper bound." />}
                <span>{solar ? 'Sunlight: 0.5° grid cell.' : 'Sunlight: upper bound from latitude.'}</span>
              </>
            }
          />
          <Pane
            title={target.name}
            body={`${target.body === 'moon' ? 'Moon' : 'Mars'} · ${formatCoords(target.lat, target.lon)}`}
            site={targetSite}
            modules={deployed ? layout.modules : []}
            readiness={deployed ? (layout.modules.length === 0 ? null : report.target.readiness) : undefined}
            ground={{ item: ground.target, windowKm: ground.windowKm, layer }}
            badge={
              <>
                <SourceBadge badge={target.values.tempMean.badge} source={target.values.tempMean.source} />
                <SourceBadge badge={file.sites[target.id]?.irradianceWm2.badge ?? null} source={file.sites[target.id]?.irradianceWm2.source} />
                <span>{deployed ? 'Deployed.' : 'Not deployed.'}</span>
              </>
            }
          >
            {!deployed && (
              <button type="button" onClick={() => setDeployed(true)} className="btn btn-accent mt-3">
                Deploy the same layout here
              </button>
            )}
          </Pane>
        </div>
        {layer === 'image' && ground.target && shownLayer(ground.target, 'image') === 'relief' && (
          <p className="border-t border-line px-3 py-2 text-[11px] text-muted" role="note">
            {ground.target.image && mostlyShadow(ground.target)
              ? `The image of ${target.name} is ${((ground.target.image.darkShare ?? 0) * 100).toFixed(0)}% shadow, so its pane shows shaded relief from the elevation grid.`
              : `No image of ${target.name} is in the data, so its pane shows shaded relief from the elevation grid.`}
          </p>
        )}
        {deployed && layout.modules.length > 0 && (
          <div className="grid gap-px border-t border-line bg-line sm:grid-cols-2">
            {[
              { name: siteName, r: report.earth.readiness },
              { name: target.name, r: report.target.readiness },
            ].map(({ name, r }) => (
              <p key={name} className="bg-bg px-3 py-2 text-[12px] text-text">
                <span className="font-medium">{name}:</span> {r ? READY_TEXT[r] : 'Cannot be judged: a number it depends on has no source.'}
              </p>
            ))}
          </div>
        )}
      </div>
      <div className="tabs tabs-fill order-2 shrink-0 bg-bg lg:hidden" role="group" aria-label="Panel">
        {(['setup', 'results'] as const).map((t) => (
          <button key={t} type="button" aria-pressed={tab === t} onClick={() => onTab(t)} className="tab">
            {t === 'setup' ? 'Modules' : 'Resources'}
          </button>
        ))}
      </div>
      {right}
    </div>
  );
});

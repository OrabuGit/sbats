import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { EarthFile, FactorKey, Target, TargetValue } from '../types';

/** The factors a person can set. Rock class is a pick from the classes of earth.json. */
const KEYS = ['tempMean', 'tempRange', 'precip', 'ndvi', 'slope', 'roughness'] as const;
const REQUIRED: readonly FactorKey[] = ['ndvi', 'precip'];
export const CUSTOM_ID = 'custom-conditions';

interface Row {
  on: boolean;
  value: string;
  tol: string;
}

const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? null : Number(s));
const round = (v: number) => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 100) / 100);

/**
 * Step 2 for a world of your own: set a value and a tolerance for each factor, then search Earth with the same
 * scoring as every other target. The tolerance is the sigma of the Gaussian similarity: a gap of one tolerance
 * scores 0.61. Advanced and exploratory: nothing here is a measured place.
 */
export function CustomStep({ earth, targets, onSearch, hidden = false }: { earth: EarthFile; targets: Target[]; onSearch: (t: Target) => void; hidden?: boolean }) {
  const range = useMemo(() => {
    const r = {} as Record<string, { lo: number; hi: number }>;
    for (const k of [...KEYS, 'lithology'] as FactorKey[]) {
      let lo = Infinity;
      let hi = -Infinity;
      for (const c of earth.cells) {
        const v = c[k];
        if (typeof v !== 'number') continue;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      r[k] = { lo, hi };
    }
    return r;
  }, [earth]);
  const meta = (k: FactorKey) => earth.meta.factors.find((f) => f.key === k);
  const classes = meta('lithology')?.classes ?? [];

  const from = (t: Target | null): Record<string, Row> =>
    Object.fromEntries(
      KEYS.map((k) => {
        const tv = t?.values[k];
        const span = range[k].hi - range[k].lo;
        return [k, { on: REQUIRED.includes(k) || tv?.value != null, value: tv?.value != null ? String(round(tv.value)) : '', tol: tv?.sigma != null ? String(round(tv.sigma)) : String(round(span * 0.1)) }];
      }),
    );
  const [rows, setRows] = useState<Record<string, Row>>(() => from(null));
  const [rock, setRock] = useState<string>('');
  const [seed, setSeed] = useState('');
  const [error, setError] = useState<string | null>(null);

  const setRow = (k: string, patch: Partial<Row>) => setRows((r) => ({ ...r, [k]: { ...r[k], ...patch } }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const values = {} as Record<FactorKey, TargetValue>;
    for (const k of earth.meta.factors.map((f) => f.key)) values[k] = { value: null, sigma: null, source: null, badge: null };
    for (const k of KEYS) {
      const r = rows[k];
      if (!r.on) continue;
      const v = num(r.value);
      const t = num(r.tol);
      if (v === null || t === null || t <= 0) {
        setError(`${meta(k)?.label ?? k}: enter a value and a tolerance above 0, or switch it off.`);
        return;
      }
      values[k] = { value: v, sigma: t, source: 'Your own input', badge: null };
    }
    for (const k of REQUIRED) {
      if (values[k].value === null) {
        setError(`${meta(k)?.label ?? k} is required: the score needs it.`);
        return;
      }
    }
    if (rock !== '') values.lithology = { value: Number(rock), sigma: null, source: 'Your own input', badge: null };
    setError(null);
    onSearch({
      id: CUSTOM_ID,
      name: 'Your custom conditions',
      body: 'moon',
      lat: 0,
      lon: 0,
      summary: 'Conditions set by you. Earth is searched for the places that come closest to them with the same scoring as every other target.',
      values,
      cannotCopy: [],
    });
  };

  return (
    <main className={`min-h-0 flex-1 overflow-y-auto bg-bg ${hidden ? 'hidden' : ''}`} aria-labelledby="h-custom">
      <form onSubmit={submit} className="mx-auto max-w-[920px] px-5 pb-16 pt-8 sm:px-10 sm:pt-12">
        <p className="text-[14px] text-accent">Advanced, exploratory</p>
        <h1 id="h-custom" className="display-l mt-1 text-[36px] sm:text-[56px]">
          Custom conditions
        </h1>
        <p className="mt-3 max-w-[60ch] text-[16px] leading-6 text-muted">
          Set what the ground and climate should be like, and how close counts. Earth is then searched with the same scoring as for any Moon or Mars place. These values are yours, not a measured place, so the result says what matches your numbers and nothing more.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <label htmlFor="seed" className="text-[14px] text-text">
            Start from a target
          </label>
          <select
            id="seed"
            value={seed}
            onChange={(e) => {
              setSeed(e.target.value);
              const t = targets.find((x) => x.id === e.target.value) ?? null;
              setRows(from(t));
              setRock(t?.values.lithology?.value != null ? String(t.values.lithology.value) : '');
            }}
            className="h-11 bg-panel px-3 text-[14px] text-text"
          >
            <option value="">Blank</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <ul className="mt-6">
          {KEYS.map((k) => {
            const m = meta(k);
            const r = rows[k];
            const req = REQUIRED.includes(k);
            const unit = m?.unit ?? '';
            return (
              <li key={k} className="grid items-center gap-x-5 gap-y-2 border-t border-line py-4 sm:grid-cols-[minmax(0,1fr)_150px_150px]">
                <div className="flex items-start gap-3">
                  <input id={`on-${k}`} type="checkbox" checked={r.on} disabled={req} onChange={(e) => setRow(k, { on: e.target.checked })} className="check mt-1" />
                  <div>
                    <label htmlFor={`on-${k}`} className="block text-[16px] font-medium text-text">
                      {m?.label ?? k}
                      {req && <span className="ml-2 text-[12px] font-normal text-muted">required</span>}
                    </label>
                    <p className="text-[12px] text-muted">
                      Earth ranges from {round(range[k].lo)} to {round(range[k].hi)} {unit}
                    </p>
                  </div>
                </div>
                <label className="block text-[12px] text-muted">
                  Value {unit && `(${unit})`}
                  <input inputMode="decimal" value={r.value} disabled={!r.on} onChange={(e) => setRow(k, { value: e.target.value })} className="mt-1 h-11 w-full bg-panel px-3 text-[15px] text-text disabled:opacity-40" />
                </label>
                <label className="block text-[12px] text-muted">
                  Tolerance (±)
                  <input inputMode="decimal" value={r.tol} disabled={!r.on} onChange={(e) => setRow(k, { tol: e.target.value })} className="mt-1 h-11 w-full bg-panel px-3 text-[15px] text-text disabled:opacity-40" />
                </label>
              </li>
            );
          })}
          <li className="grid items-center gap-x-5 gap-y-2 border-t border-line py-4 sm:grid-cols-[minmax(0,1fr)_310px]">
            <div>
              <label htmlFor="rock" className="block text-[16px] font-medium text-text">
                Dominant rock class
              </label>
              <p className="text-[12px] text-muted">Optional. Same rock scores 1, related rock 0.6, unrelated 0.15.</p>
            </div>
            <select id="rock" value={rock} onChange={(e) => setRock(e.target.value)} className="h-11 w-full bg-panel px-3 text-[15px] text-text">
              <option value="">Not set</option>
              {classes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </li>
        </ul>

        <p className="mt-2 max-w-[64ch] text-[13px] leading-5 text-muted">A value outside Earth&rsquo;s range is scored against the nearest value Earth has, as for every target. Sunlight is not part of a custom search.</p>
        {error && (
          <p className="mt-4 border-l-2 border-accent pl-3 text-[14px] text-text" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary mt-6 !h-12 !px-6 !text-[16px]">
          Search Earth <ArrowRight size={17} aria-hidden="true" />
        </button>
      </form>
    </main>
  );
}

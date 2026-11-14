// Data for the base sandbox: module numbers (data/modules.json) and monthly site climate
// (data/site_climate.json). Same rule as the other files: the real file when it is published,
// otherwise a clearly labelled fixture, and the UI says which one is on screen.
import { loadExtra } from './access';
import { validateModulesFile, type ModulesFile } from '../lib/simAdapter';

export interface ModulesBundle {
  file: ModulesFile;
  /** True when the numbers are the made-up UI fixture, not data/modules.json. */
  fixture: boolean;
  /** Problems found in the real file. Empty when valid or when the fixture is in use. */
  problems: string[];
}

let modules: Promise<ModulesBundle> | null = null;
export function loadModules(): Promise<ModulesBundle> {
  modules ??= (async () => {
    const forced = new URLSearchParams(window.location.search).get('data') === 'fixture';
    const real = forced ? null : await loadExtra<ModulesFile>('modules.json');
    if (real && typeof real === 'object' && real.modules && real.crew && real.events) {
      return { file: real, fixture: false, problems: validateModulesFile(real) };
    }
    const fx = (await import('../mocks/modules.fixture.json')).default as unknown as ModulesFile;
    return { file: fx, fixture: true, problems: [] };
  })();
  return modules;
}

export interface SiteClimate {
  meta: { period: string; fields: { key: string; label: string; unit: string; badge: 'Measured' | 'Mission' | 'Literature'; source: string }[] };
  sites: {
    id: string;
    name: string;
    months: { month: number; tempMean: number | null; tempRange: number | null; precip: number | null; solar: number | null }[];
  }[];
}
export const loadSiteClimate = () => loadExtra<SiteClimate>('site_climate.json');

/** Annual mean surface sunlight for a named site, W/m2 (24 hour mean), or null without 12 monthly values. */
export function annualSolar(climate: SiteClimate | null, siteId: string | null): { wm2: number; source: string } | null {
  const site = climate?.sites.find((s) => s.id === siteId);
  if (!site || site.months.length !== 12) return null;
  const vals = site.months.map((m) => m.solar);
  if (vals.some((v) => typeof v !== 'number')) return null;
  const source = climate?.meta.fields.find((f) => f.key === 'solar')?.source ?? 'NASA POWER';
  return { wm2: (vals as number[]).reduce((a, b) => a + b, 0) / 12, source };
}

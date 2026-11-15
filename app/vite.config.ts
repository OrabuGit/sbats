import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

// The built data files live in /data at the repo root (owned by the pipeline and
// scoring sessions). This plugin serves them at <base>data/*.json in dev and copies
// them into dist/data on build, together with data/manifest.json, the list of files present. Files that do not exist yet are simply absent, and
// the data-access module falls back to the fixtures in src/mocks.
const DATA_DIR = path.resolve(__dirname, '../data');

const ROOT = path.resolve(__dirname, '..');

/** Splits SOURCES.md into its tables, one per heading, so the Method page can show every row. */
function parseSources(md: string): { title: string; headers: string[]; rows: string[][] }[] {
  const out: { title: string; headers: string[]; rows: string[][] }[] = [];
  let title = 'Datasets';
  let current: { title: string; headers: string[]; rows: string[][] } | null = null;
  const cells = (line: string) =>
    line
      .trim()
      .replace(/^\||\|$/g, '')
      .split(/(?<!\\)\|/)
      .map((c) => c.trim());
  for (const line of md.split('\n')) {
    if (line.startsWith('## ')) {
      title = line.slice(3).trim();
      current = null;
    } else if (line.trim().startsWith('|')) {
      const c = cells(line);
      if (c.every((x) => /^:?-+:?$/.test(x))) continue;
      if (!current) {
        current = { title, headers: c, rows: [] };
        out.push(current);
      } else if (c.some((x) => x !== '')) current.rows.push(c);
    } else if (line.trim() === '') current = current && current.rows.length > 0 ? null : current;
  }
  return out.filter((t) => t.rows.length > 0);
}

// Files from outside /data that the Method and Validation pages show. They are read at build time
// (and on each request in dev) and published next to the data files, so the pages always show the
// numbers the validation scripts wrote, never a copy typed into the app.
const fromFile = (rel: string) => () => {
  const f = path.join(ROOT, rel);
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
};
/**
 * The written findings per site (validation/sites/FINDINGS.md), split into fields. The featured
 * sites page prints these sentences as they are, so no claim in the app is stronger than the findings.
 */
function parseFindings(md: string) {
  const clean = (t: string) => t.replace(/\*\*/g, '').replace(/\s*\n\s*/g, ' ').trim();
  const field = (body: string, name: string): string[] => {
    const m = body.match(new RegExp(`\\*\\*${name}:\\*\\*([\\s\\S]*?)(?=\\n\\*\\*[A-Z]|\\n\\n[^-\\s]|\\n#|$)`));
    if (!m) return [];
    const text = m[1];
    const bullets = text.split(/\n- /);
    return bullets.map(clean).filter(Boolean);
  };
  const sections = md.split(/\n## /).slice(1).map((sec) => {
    const nl = sec.indexOf('\n');
    const title = sec.slice(0, nl).trim();
    const body = sec.slice(nl + 1);
    const bullets = body
      .split(/\n(?=- )/)
      .filter((b) => b.startsWith('- '))
      .map((b) => clean(b.slice(2).split(/\n\n/)[0]));
    return { title, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), strong: field(body, 'Strong'), short: field(body, 'Short'), notScored: field(body, 'Not scored at all'), bullets };
  });
  const claim = md.match(/So the honest claim[^\n]*\n[^\n]*\n[^\n]*/);
  return { written: (md.match(/Written (\d{4}-\d{2}-\d{2})/) ?? [])[1] ?? null, claim: claim ? clean(claim[0]) : null, sections };
}

const EXTRA: Record<string, () => string | null> = {
  'validation-sites.json': fromFile('validation/output/sites.json'),
  'findings.json': () => {
    const md = fromFile('validation/sites/FINDINGS.md')();
    return md === null ? null : JSON.stringify(parseFindings(md));
  },
  'validation-report-base.json': fromFile('validation/output/report.json'),
  'validation-report-rover.json': fromFile('validation/output/report.rover.json'),
  'validation-report-ice.json': fromFile('validation/output/report.ice.json'),
  'validation-report-astrobiology.json': fromFile('validation/output/report.astrobiology.json'),
  'validation-candidates.json': fromFile('validation/output/candidates.json'),
  'validation-purposes.json': fromFile('validation/output/purposes.json'),
  'validation-frozen.json': fromFile('validation/tuning/frozen.json'),
  'sources.json': () => {
    const md = fromFile('SOURCES.md')();
    return md === null ? null : JSON.stringify(parseSources(md));
  },
};

/** The built data files that exist right now. The app asks for this list before fetching anything. */
let production = false;
function listData(): string[] {
  const all = fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR).filter((f) => (f.endsWith('.json') || f.endsWith('.bin')) && f !== 'manifest.json') : [];
  // earth.bin holds the same data as earth.json in an eighth of the size (the pipeline checks they
  // are identical), so a production build ships only the compact file.
  const data = production && all.includes('earth.bin') ? all.filter((f) => f !== 'earth.json') : all;
  const extra = Object.keys(EXTRA).filter((k) => EXTRA[k]() !== null);
  return [...data, ...extra, ...listExtracts()].sort();
}

/** Same-scale elevation and imagery extracts (data/extracts), listed as paths relative to /data. */
const EXTRACT_DIR = path.join(DATA_DIR, 'extracts');
const EXTRACT_TYPES: Record<string, string> = { '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.f32': 'application/octet-stream' };
function listExtracts(): string[] {
  if (!fs.existsSync(path.join(EXTRACT_DIR, 'index.json'))) return [];
  const out = ['extracts/index.json'];
  for (const d of fs.readdirSync(EXTRACT_DIR, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    for (const f of fs.readdirSync(path.join(EXTRACT_DIR, d.name))) if (path.extname(f) in EXTRACT_TYPES) out.push(`extracts/${d.name}/${f}`);
  }
  return out;
}

function sbatsData(): Plugin {
  return {
    name: 'sbats-data',
    configResolved(config) {
      production = config.command === 'build';
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        const ex = url.match(/\/data\/(extracts\/(?:[a-z0-9-]+\/)?[A-Za-z0-9_.-]+\.(?:json|jpg|f32))$/);
        if (ex) {
          const file = path.join(DATA_DIR, ex[1]);
          if (!fs.existsSync(file)) {
            res.statusCode = 404;
            res.end('not found');
            return;
          }
          res.setHeader('Content-Type', EXTRACT_TYPES[path.extname(file)]);
          res.setHeader('Cache-Control', 'no-cache');
          fs.createReadStream(file).pipe(res);
          return;
        }
        const m = url.match(/\/data\/([A-Za-z0-9_.-]+\.(?:json|bin))$/);
        if (!m) return next();
        const json = (body: string) => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(body);
        };
        if (m[1] === 'manifest.json') return json(JSON.stringify({ files: listData() }));
        if (m[1] in EXTRA) {
          const body = EXTRA[m[1]]();
          if (body !== null) return json(body);
        }
        const file = path.join(DATA_DIR, m[1]);
        if (!fs.existsSync(file)) {
          res.statusCode = 404;
          res.end('not found');
          return;
        }
        res.setHeader('Content-Type', m[1].endsWith('.bin') ? 'application/octet-stream' : 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        fs.createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      const out = path.resolve(__dirname, 'dist/data');
      const files = listData();
      fs.mkdirSync(out, { recursive: true });
      for (const f of files) {
        if (f in EXTRA) fs.writeFileSync(path.join(out, f), EXTRA[f]() ?? 'null');
        else if (f.startsWith('extracts/')) {
          fs.mkdirSync(path.dirname(path.join(out, f)), { recursive: true });
          fs.copyFileSync(path.join(DATA_DIR, f), path.join(out, f));
        } else fs.copyFileSync(path.join(DATA_DIR, f), path.join(out, f));
      }
      fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ files }));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), sbatsData()],
  server: { port: 5173, strictPort: false },
  build: {
    rolldownOptions: {
      output: {
        // three.js on its own, apart from globe.gl and the app, so each part caches separately.
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/, priority: 2 },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
});

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

/** The built data files that exist right now. The app asks for this list before fetching anything. */
function listData(): string[] {
  if (!fs.existsSync(DATA_DIR)) return [];
  return fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json') && f !== 'manifest.json').sort();
}

function sbatsData(): Plugin {
  return {
    name: 'sbats-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        const m = url.match(/\/data\/([A-Za-z0-9_.-]+\.json)$/);
        if (!m) return next();
        if (m[1] === 'manifest.json') {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(JSON.stringify({ files: listData() }));
          return;
        }
        const file = path.join(DATA_DIR, m[1]);
        if (!fs.existsSync(file)) {
          res.statusCode = 404;
          res.end('not found');
          return;
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        fs.createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      const out = path.resolve(__dirname, 'dist/data');
      const files = listData();
      fs.mkdirSync(out, { recursive: true });
      for (const f of files) fs.copyFileSync(path.join(DATA_DIR, f), path.join(out, f));
      fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ files }));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), sbatsData()],
  server: { port: 5173, strictPort: false },
});

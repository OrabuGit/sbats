// Minerals on both sides: which mineral families each Earth site shares with each target.
//
//     npx tsx validation/minerals.ts
//
// Earth side: NASA EMIT identifications inside each site's footprint (data/sites.json, Session B).
// Target side: minerals reported by rovers and orbiters in cited papers (data/target_minerals.json).
// Site-level result only, added after the freeze: it changes no score. Writes
// validation/output/MINERALS.md and minerals.json. The reading is in validation/sites/FINDINGS.md.
//
// Code generated with AI assistance (Claude Code), directed and reviewed by the team. See AI_USE.md.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { emitFamilies, sharedMinerals } from '../app/src/lib/match/index';
import type { EmitMineralogy, TargetMineralsFile } from '../app/src/lib/match/index';
import { DATA, OUT, readJson } from './lib';

interface SitesFile {
  meta: { generatedAt: string };
  sites: { id: string; name: string; kind: string; mineralogy?: (EmitMineralogy & { emitCovers?: boolean }) | null }[];
}

const sites = readJson<SitesFile>(join(DATA, 'sites.json'));
const file = readJson<TargetMineralsFile>(join(DATA, 'target_minerals.json'));
const targets = Object.entries(file.targets).filter(([, t]) => t.minerals.length > 0);
const short = (label: string): string => label.split(' (')[0] as string;
const pct = (v: number): string => `${Math.round(v * 100)}%`;

const rows = sites.sites.map((s) => {
  const earth = emitFamilies(s.mineralogy, file.families, file.meta.emitMinimumShare);
  return {
    id: s.id,
    name: s.name,
    kind: s.kind,
    date: s.mineralogy?.date ?? null,
    reason: earth ? null : (s.mineralogy?.note ?? 'No EMIT data.'),
    vegetationShare: earth?.nonMineralShare ?? null,
    identified: earth?.families.map((f) => ({ family: f.family, label: f.label, shareOfValidPixels: f.shareOfValidPixels })) ?? null,
    unassigned: earth?.unassigned.filter((u) => u.shareOfValidPixels >= file.meta.emitMinimumShare).map((u) => ({ libraryName: u.libraryName, libraryTitle: u.libraryTitle, shareOfValidPixels: u.shareOfValidPixels })) ?? null,
    targets: Object.fromEntries(
      targets.map(([id, t]) => {
        const sh = sharedMinerals(earth, t.minerals, file.families);
        return [id, sh ? { similarity: sh.similarity === null ? null : Math.round(sh.similarity * 1000) / 1000, shared: sh.shared.map((x) => x.label), targetOnly: sh.targetOnly.map((x) => x.label), notComparable: sh.notComparable.map((x) => x.label), earthOnly: sh.earthOnly.map((x) => x.label) } : null];
      }),
    ),
  };
});

const md: string[] = [];
md.push('# Minerals on both sides: what each Earth site shares with each target', '');
md.push(`Written ${new Date().toISOString()} by \`npx tsx validation/minerals.ts\`. Site values: data/sites.json built ${sites.meta.generatedAt} (Session B).`, '');
md.push('**Site-level result only. Added after the score was frozen on 2026-11-14: it is not part of any score and has not been validated.**', '');
md.push('How to read it:', '');
md.push('- Earth side: NASA EMIT, an imaging spectrometer on the Space Station. An "identification" is a spectral match in a 60 m pixel on one date. The share is how often a mineral\'s signature is matched in the clear pixels of the footprint, not how much of the mineral is there.');
md.push('- Target side: minerals reported in cited papers, by a rover instrument in place or by an orbiter.');
md.push(`- Both are reduced to mineral families. A family counts on Earth when it is matched in at least ${pct(file.meta.emitMinimumShare)} of the clear pixels.`);
md.push('- "Shared" is a pointer for a geologist, not proof of the same rock. Iron oxides and clays are common weathering products on Earth; finding them says little on its own.');
md.push('- Some target minerals cannot be compared at all: EMIT cannot identify plain feldspar, akaganeite or phosphates.');
md.push('- Vegetation hides the ground. Where dry vegetation is matched in most pixels, few minerals are seen.', '');

md.push('## What the targets report', '');
md.push('| Target | Mineral families reported | Comparable with EMIT | Not comparable |', '| --- | --- | --- | --- |');
for (const [id, t] of targets) {
  const fams = [...new Set(t.minerals.map((m) => m.family))];
  const label = (f: string): string => short(file.families.find((x) => x.id === f)?.label ?? f);
  const comparable = fams.filter((f) => (file.families.find((x) => x.id === f)?.emitPatterns.length ?? 0) > 0);
  md.push(`| ${id} | ${fams.length} | ${comparable.map(label).join(', ') || 'none'} | ${fams.filter((f) => !comparable.includes(f)).map(label).join(', ') || 'none'} |`);
}
for (const [id, t] of Object.entries(file.targets)) if (t.minerals.length === 0) md.push(`| ${id} | 0 | ${t.note ?? ''} | |`);
md.push('');

md.push('## What EMIT identifies at each Earth site', '');
md.push('| Site | Kind | Date | Dry vegetation matched | Mineral families identified (share of clear pixels) | Seen but not assigned to a family |', '| --- | --- | --- | --- | --- | --- |');
for (const r of rows) {
  if (!r.identified) md.push(`| ${r.name} | ${r.kind} | | | no data: ${r.reason} | |`);
  else md.push(`| ${r.name} | ${r.kind} | ${r.date ?? ''} | ${pct(r.vegetationShare ?? 0)} | ${r.identified.map((f) => `${short(f.label)} ${pct(f.shareOfValidPixels)}`).join(', ') || 'none'} | ${(r.unassigned ?? []).map((u) => `${u.libraryTitle ?? u.libraryName} ${pct(u.shareOfValidPixels)}`).join(', ') || 'none'} |`);
}
md.push('');

md.push('## Shared minerals, site by target', '');
md.push(`| Site | ${targets.map(([id]) => id).join(' | ')} |`, `| --- | ${targets.map(() => '---').join(' | ')} |`);
for (const r of rows) {
  if (!r.identified) continue;
  const cells = targets.map(([id]) => {
    const t = r.targets[id];
    if (!t || t.similarity === null) return 'not comparable';
    const n = t.shared.length + t.targetOnly.length;
    return `${t.shared.length} of ${n}: ${t.shared.map(short).join(', ') || 'none'}`;
  });
  md.push(`| ${r.name} | ${cells.join(' | ')} |`);
}
md.push('', 'Each cell: how many of the target\'s comparable mineral families EMIT also identified at the site, and which.', '');

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'minerals.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), sitesGeneratedAt: sites.meta.generatedAt, emitMinimumShare: file.meta.emitMinimumShare, sites: rows }, null, 1)}\n`);
writeFileSync(join(OUT, 'MINERALS.md'), `${md.join('\n')}\n`);
console.log(`Minerals: ${rows.filter((r) => r.identified).length} of ${rows.length} sites have EMIT data. Wrote ${join(OUT, 'MINERALS.md')}`);

import type { Analog, CellSummary, EarthFile, Target } from '../types';
import type { Candidate } from '../lib/rank';
import { formatCoords, siteCode } from '../lib/geo';
import { formatShare } from '../lib/format';
import { DIMENSIONS, PURPOSES } from '../lib/scoringAdapter';
import { useAsync } from '../lib/useAsync';
import { countryKey, useCountries } from '../lib/where';
import { loadExtra } from '../data/access';
import { mineralsWithheld } from '../lib/matchAdapter';
import { dataUrl, loadFindings, loadSiteScores, type ExtractIndex, type FeaturedSite, type Findings, type SiteScores, type SitesFile } from '../data/sites';
import { ConfidenceBadge, SourceBadge, Tag } from './Badges';
import { ELEMENT_NAME, ElementIcon, type ElementId } from './ElementIcon';
import { Reveal } from './HomeStory';
import { useState } from 'react';

interface Props {
  sites: SitesFile | null;
  sitesState: 'loading' | 'ready' | 'error';
  extracts: ExtractIndex | null;
  analogs: Analog[];
  targets: Target[];
  target: Target;
  earth: EarthFile;
  results: CellSummary[];
  top: Candidate[];
  reason: (index: number) => string;
  /** Notes that must be shown with any score for the current target. */
  warnings: string[];
  onSitePage: (id: string) => void;
  onMatch: (lat: number, lon: number, targetId: string) => void;
  onCell: (index: number) => void;
}

const short = (name: string) => name.split(',')[0];
const region = (name: string) => name.split(',').slice(1).join(',').trim();

type Scored = SiteScores['sites'][number];

/** data/benchmarks.json (Session C): proposed and established sites scored by one procedure, with group figures. */
interface Tested {
  text: string;
  basis: string;
}
/** data/discoveries.json (Session C): what the frozen score ranks first per target, with rank ranges. */
interface Discoveries {
  meta: { caveats: string[]; rules: { indonesiaBox: { latMin: number; latMax: number; lonMin: number; lonMax: number } } };
  targets: {
    target: string;
    top: Pick[];
    indonesia: Pick[];
  }[];
}
interface Pick {
  lat: number;
  lon: number;
  score: number;
  rank: number;
  percentile: number;
  isNew: boolean;
  nearestKnown: { name: string; km: number } | null;
  stability: { rankP05: number; rankP95: number; shareInTop10: number } | null;
}
interface Benchmarks {
  sites?: { id: string; couldTest?: Tested[]; cannotTest?: Tested[] }[];
  meta: { caveats: string[] };
  groups: {
    candidates: number;
    known: number;
    dimensionMean: Record<string, { candidates: number | null; known: number | null }>;
    purposeMedian: Record<string, { candidates: number | null; known: number | null }>;
    purposeBest: Record<string, { candidates: number | null; known: number | null }>;
  };
}
const f2 = (v: number | null | undefined) => (v === null || v === undefined ? 'no data' : v.toFixed(2));
const f0 = (v: number | null | undefined) => (v === null || v === undefined ? 'no data' : v.toFixed(0));

/** The result to show for a site: against the target it is listed for, else the one it scores best against. */
function pick(s: Scored | undefined, analog: Analog | undefined) {
  if (!s || s.results.length === 0) return null;
  const listed = s.results.find((r) => r.listed) ?? s.results.find((r) => r.target === analog?.analogFor[0]);
  if (listed) return listed;
  // Not listed for any target: show the one it does best against, on its best purpose.
  const best = (r: Scored['results'][number]) => Math.max(0, ...Object.values(r.site.purposes).map((p) => p.score ?? 0));
  return [...s.results].sort((a, b) => best(b) - best(a))[0];
}

function Lines({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <h4 className="mb-2 text-[14px] font-semibold text-text">{title}</h4>
      {items.length === 0 ? (
        <p className="text-[13px] text-muted">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((t) => (
            <li key={t} className="border-l-2 border-line pl-3 text-[13px] leading-5 text-text">
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The five dimensions as five lit icons: filled where the site matches, outlined where it partly does, grey where it does not. */
function ProfileDots({ result, size = 'md' }: { result: NonNullable<ReturnType<typeof pick>> | null; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-8 w-8' : 'h-12 w-12';
  return (
    <ul className={`flex ${size === 'sm' ? 'gap-1.5' : 'gap-3'}`} aria-label="Match to its target on five dimensions">
      {DIMENSIONS.map((d) => {
        const v = result?.site.dimensions[d.id]?.similarity ?? null;
        const tone = v === null ? 'border-dashed border-line text-muted' : v >= 0.75 ? 'border-accent bg-accent text-bg' : v >= 0.3 ? 'border-accent text-accent' : 'border-line text-muted';
        return (
          <li key={d.id} className="flex flex-col items-center gap-1" title={`${ELEMENT_NAME[d.id as ElementId] ?? d.label}: ${v === null ? 'no data' : v.toFixed(2)}`}>
            <span className={`flex ${box} items-center justify-center rounded-full border-2 ${tone}`}>
              <ElementIcon id={d.id as ElementId} size={size === 'sm' ? 18 : 26} still={size === 'sm'} />
            </span>
            {size === 'md' && <span className="num text-[12px] text-muted">{v === null ? 'no data' : v.toFixed(2)}</span>}
          </li>
        );
      })}
    </ul>
  );
}

function SiteArticle({ site, lead, image, finding, scored, analog, targets, tested, onSitePage, onMatch }: {
  site: FeaturedSite;
  lead: boolean;
  image: { file: string; attribution: string; date?: string } | null;
  finding: Findings['sections'][number] | null;
  scored: Scored | undefined;
  analog: Analog | undefined;
  targets: Target[];
  /** Sentences built by fixed rules from measured values (data/benchmarks.json). */
  tested: { could: Tested[]; cannot: Tested[] } | null;
  onSitePage: Props['onSitePage'];
  onMatch: Props['onMatch'];
}) {
  const result = pick(scored, analog);
  const target = targets.find((t) => t.id === result?.target);
  const sources = [...new Set(Object.values(site.values).flatMap((v) => (v?.source ? [v.source] : [])))];
  const best = result
    ? PURPOSES.map((p) => ({ label: p.label, score: result.site.purposes[p.id]?.score ?? null }))
        .filter((p) => p.score !== null)
        .sort((a, b) => (b.score as number) - (a.score as number))[0]
    : null;
  return (
    <article className={`grid gap-x-12 gap-y-6 py-12 ${lead ? 'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]'}`} aria-labelledby={`f-${site.id}`}>
      <figure className="m-0">
        <div className={`overflow-hidden bg-bg ${lead ? 'aspect-[4/3]' : 'aspect-[3/2]'}`}>
          {image ? (
            <img src={dataUrl(image.file)} alt={`${short(site.name)} from Sentinel-2, 20 km across, north up`} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <p className="p-3 text-[12px] text-muted">No data. No image extract was built for this site.</p>
          )}
        </div>
        {image && (
          <figcaption className="readout mt-1.5">
            Sentinel-2 true colour{image.date ? `, ${image.date}` : ''}. 20 km across, cropped. {image.attribution}
          </figcaption>
        )}
      </figure>
      <div className="min-w-0">
        <p className="text-[14px] text-muted">{region(site.name)}</p>
        <h3 id={`f-${site.id}`} className={`display mt-1 text-text ${lead ? 'text-[44px] leading-[48px]' : 'text-[32px] leading-9'}`}>
          {short(site.name)}
        </h3>
        <p className="num mt-1 text-[12px] text-muted">
          {formatCoords(site.lat, site.lon)} · footprint {site.footprintKm} km × {site.footprintKm} km
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {scored?.provisional && <Tag tone="accent" title={scored.caveat ?? undefined}>Provisional footprint</Tag>}
          {best && best.score !== null && (
            <Tag>
              Best purpose: {best.label} {best.score.toFixed(0)}
            </Tag>
          )}
          {typeof scored?.bareFrac === 'number' && <Tag>{formatShare(scored.bareFrac)} bare</Tag>}
        </div>

        {result && target && (
          <div className="mt-6">
            <p className="mb-2 text-[13px] text-muted">Match to {target.name}, from the footprint</p>
            <ProfileDots result={result} />
          </div>
        )}

        <div className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <Lines title="Strong for" items={finding?.strong ?? []} empty="No written finding for this site. See the numbers on its site page." />
          <Lines title="Falls short on" items={[...(finding?.short ?? []), ...(finding?.notScored ?? []).map((t) => `Not scored at all: ${t}`)]} empty="No written finding for this site." />
        </div>

        <details className="group mt-6 border-t border-line pt-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[15px] font-medium text-text [&::-webkit-details-marker]:hidden">
            Process, and what a team could test here
            <span className="text-muted transition-transform group-open:rotate-90" aria-hidden="true">›</span>
          </summary>
        <div className="mt-3 grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <div>
            <h4 className="mb-2 text-[14px] font-semibold text-text">Process</h4>
            {analog?.process ? (
              <>
                <p className="text-[13px] leading-5 text-text">
                  {analog.process.text} <SourceBadge badge="Literature" source={analog.process.source} />
                </p>
                {analog.process.links.map((l) => (
                  <p key={l.target + l.text} className="mt-1.5 border-l-2 border-line pl-3 text-[13px] leading-5 text-text">
                    <span className="label mr-2">{targets.find((t) => t.id === l.target)?.name ?? l.target}</span>
                    {l.text} <SourceBadge badge="Literature" source={l.source} />
                  </p>
                ))}
                <p className="mt-1.5 text-[12px] text-muted">Where it differs: {analog.process.differs}</p>
              </>
            ) : (
              <p className="text-[13px] leading-5 text-text">
                {scored?.rockType ? `Rock: ${scored.rockType}. ` : ''}
                {analog ? analog.source : 'No data. No process is recorded for this site.'}
              </p>
            )}
            {analog?.note && <p className="mt-1.5 text-[12px] text-muted">{analog.note}</p>}
          </div>
          <div>
            <h4 className="mb-2 text-[14px] font-semibold text-text">What a team could test here</h4>
            {tested && tested.could.length > 0 ? (
              <ul className="space-y-1.5">
                {tested.could.map((t) => (
                  <li key={t.text} title={`From ${t.basis}`} className="border-l-2 border-line pl-3 text-[13px] leading-5 text-text">
                    {t.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted">No data. No test sentences were published for this site.</p>
            )}
            {tested && tested.cannot.length > 0 && (
              <>
                <h4 className="mb-2 mt-5 text-[14px] font-semibold text-text">What it cannot test</h4>
                <ul className="space-y-1.5">
                  {tested.cannot.map((t) => (
                    <li key={t.text} title={`From ${t.basis}`} className="border-l-2 border-line pl-3 text-[13px] leading-5 text-muted">
                      {t.text}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {result && (
              <dl className="kv mt-4">
                {PURPOSES.map((p) => {
                  const v = result.site.purposes[p.id]?.score ?? null;
                  return (
                    <div key={p.id}>
                      <dt>
                        {p.label}
                        {target ? `, ${target.name}` : ''}
                      </dt>
                      <dd className={v === null ? '!text-muted' : ''}>{v === null ? 'no data' : `${v.toFixed(0)} / 100`}</dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </div>
        </div>

        </details>

        <details className="group border-t border-line pt-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[15px] font-medium text-text [&::-webkit-details-marker]:hidden">
            Scale of the numbers
            <span className="text-muted transition-transform group-open:rotate-90" aria-hidden="true">›</span>
          </summary>
        <p className="mt-2 max-w-[60ch] text-[13px] leading-5 text-text">
          {site.footprintNote} Terrain and vegetation are measured inside the footprint. Climate is the value of the 55 km grid cell.
          {scored?.caveat ? ` ${scored.caveat}` : ''}
        </p>
        </details>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => onSitePage(site.id)} className="btn">
            Site page
          </button>
          {target && (
            <button type="button" onClick={() => onMatch(site.lat, site.lon, target.id)} className="btn">
              Match against {target.name}
            </button>
          )}
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-[12px] text-muted hover:text-text">
            <span className="num">{sources.length + (analog ? 1 : 0)}</span> sources
          </summary>
          <ul className="mt-2 space-y-1">
            {analog && (
              <li className="text-[12px] text-muted">
                <SourceBadge badge="Literature" source={analog.source} /> {analog.source}
              </li>
            )}
            {sources.map((s) => (
              <li key={s} className="text-[12px] text-muted">
                {s}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </article>
  );
}

/** Featured sites: the team's proposed sites first and largest, then benchmarks, then the top of the scan. */
export function FeaturedPage({ sites, sitesState, extracts, analogs, targets, target, earth, results, top, reason, warnings, onSitePage, onMatch, onCell }: Props) {
  const findings = useAsync(loadFindings, 'findings');
  const scores = useAsync(loadSiteScores, 'site-scores');
  const bench = useAsync(() => loadExtra<Benchmarks>('benchmarks.json'), 'benchmarks');
  const bm = bench.status === 'ready' ? bench.value : null;
  const disc = useAsync(() => loadExtra<Discoveries>('discoveries.json'), 'discoveries');
  const found = disc.status === 'ready' ? (disc.value?.targets.find((t) => t.target === target.id) ?? null) : null;
  const pickAt = (lat: number, lon: number) => found?.top.find((p) => p.lat === lat && p.lon === lon) ?? null;
  const indo = found?.indonesia[0] ?? null;
  const fd = findings.status === 'ready' ? findings.value : null;
  const sc = scores.status === 'ready' ? scores.value : null;
  const findingOf = (id: string) => fd?.sections.find((s) => s.strong.length > 0 && id.includes(s.slug)) ?? null;
  const countries = useCountries(top.slice(0, 3).map((c) => earth.cells[c.index]));
  const [selId, setSelId] = useState<string | null>(null);
  const all = sites?.sites ?? [];
  // Sites with a written finding and an image lead; the rest follow in file order.
  const LEAD = ['tambora', 'batur'];
  const lead = (s: FeaturedSite) => {
    const i = LEAD.findIndex((k) => s.id.includes(k));
    return i < 0 ? LEAD.length : i;
  };
  const weight = (s: FeaturedSite) => lead(s) * 10 + (findingOf(s.id) ? 0 : 2) + (extracts?.items.some((i) => i.id === s.id && i.image) ? 0 : 1);
  const proposed = all.filter((s) => s.kind === 'candidate').sort((a, b) => weight(a) - weight(b));
  const known = all.filter((s) => s.kind === 'known');
  // The sentence of the findings, without its lead-in clause.
  const rawClaim = fd?.claim?.replace(/^.*?narrow:\s*/, '') ?? null;
  const claim = rawClaim ? rawClaim.charAt(0).toUpperCase() + rawClaim.slice(1) : null;
  const limits = fd?.sections.find((s) => s.slug === 'the-short-version')?.bullets ?? [];

  return (
    <main className="scroll min-h-0 flex-1 bg-bg" aria-labelledby="h-featured">
      <div className="mx-auto w-full max-w-[1200px] [&_section]:px-5 sm:[&_section]:px-10">
      <header className="px-5 pb-6 pt-10 sm:px-10 sm:pt-16">
        <Reveal>
          <h2 id="h-featured" className="display-xl max-w-[14ch] text-[44px] sm:text-[84px]">
            Featured sites
          </h2>
        </Reveal>
        <Reveal i={1}>
          <p className="mt-4 max-w-[48ch] text-[18px] leading-7 text-muted">Places we propose, places the world already uses, and the best the scan found.</p>
        </Reveal>
        <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-4">
          {[
            [proposed.length, 'proposed in Indonesia'],
            [known.length, 'established benchmarks'],
            [top.length > 0 ? Math.min(3, top.length) : 0, 'best cells of the global scan'],
          ].map(([n, t]) => (
            <div key={t as string} className="flex items-baseline gap-3">
              <dt className="display text-[44px] leading-none text-text">{n}</dt>
              <dd className="text-[14px] text-muted">{t}</dd>
            </div>
          ))}
        </dl>
        {claim && <p className="mt-8 max-w-[60ch] border-l-2 border-accent pl-4 text-[17px] leading-7 text-text">{claim}</p>}
        <p className="mt-3 max-w-[72ch] text-[12px] text-muted">
          {findings.status === 'loading'
            ? 'Loading findings'
            : fd
              ? `The "strong for" and "falls short on" lines are the sentences of validation/sites/FINDINGS.md${fd.written ? `, written ${fd.written}` : ''}, printed as they are.`
              : 'No data. The written findings were not published with this build, so no claim is made here beyond the numbers.'}
        </p>
      </header>

      <section aria-labelledby="h-proposed">
        <h2 id="h-proposed" className="display pt-6 text-[32px] leading-9 text-text">
          Proposed by the team
        </h2>
        {sitesState === 'loading' && (
          <p className="py-6 text-[13px] text-muted" role="status">
            Loading sites
          </p>
        )}
        {sitesState !== 'loading' && proposed.length === 0 && <p className="py-6 text-[13px] text-muted">No data. data/sites.json is not published with this build.</p>}
        {proposed.length > 0 && (
          <div className="-mx-5 mt-6 overflow-x-auto px-6 py-1 pb-4 sm:-mx-10 sm:px-11" role="tablist" aria-label="Proposed sites">
            <div className="flex snap-x gap-4">
              {proposed.map((s) => {
                const img = extracts?.items.find((x) => x.id === s.id)?.image ?? null;
                const on = (selId ?? proposed[0].id) === s.id;
                const result = pick(sc?.sites.find((x) => x.id === s.id), analogs.find((a) => a.id === s.id));
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setSelId(s.id)}
                    className={`group relative flex h-[300px] w-[210px] shrink-0 snap-start flex-col justify-end overflow-hidden bg-panel text-left sm:h-[340px] sm:w-[250px] ${on ? 'outline outline-2 outline-offset-2 outline-accent' : ''}`}
                  >
                    {img && <img src={dataUrl(img.file)} alt="" loading="lazy" className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out ${on ? 'scale-105' : 'group-hover:scale-[1.04]'}`} />}
                    <span className={`absolute inset-0 transition-colors duration-300 ${on ? 'bg-bg/35' : 'bg-bg/60 group-hover:bg-bg/45'}`} aria-hidden="true" />
                    <span className="relative p-4">
                      <ProfileDots result={result} size="sm" />
                      <span className="display mt-3 block text-[22px] leading-6 text-text">{short(s.name)}</span>
                      <span className="mt-0.5 block text-[12px] text-text/80">{region(s.name)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {(() => {
          const s = proposed.find((x) => x.id === selId) ?? proposed[0];
          if (!s) return null;
          const img = extracts?.items.find((x) => x.id === s.id)?.image ?? null;
          return (
            <div key={s.id} className="arrive" role="tabpanel">
              <SiteArticle
                site={s}
                lead
                image={img}
                finding={findingOf(s.id)}
                scored={sc?.sites.find((x) => x.id === s.id)}
                analog={analogs.find((a) => a.id === s.id)}
                targets={targets}
                tested={(() => {
                  const b = bm?.sites?.find((x) => x.id === s.id);
                  // The sentence about minerals seen from orbit is withheld for the Indonesian sites until their EMIT data is rebuilt.
                  const keep = (t: Tested) => !(mineralsWithheld(s.id) && /mineral/i.test(t.text));
                  return b ? { could: (b.couldTest ?? []).filter(keep), cannot: b.cannotTest ?? [] } : null;
                })()}
                onSitePage={onSitePage}
                onMatch={onMatch}
              />
            </div>
          );
        })()}
      </section>

      {limits.length > 0 && (
        <section className="py-10" aria-labelledby="h-read">
          <h2 id="h-read" className="display text-[32px] leading-9 text-text">
            How to read the proposed sites
          </h2>
          <ul className="mt-3 grid max-w-[1100px] gap-x-8 gap-y-3 md:grid-cols-2">
            {limits.map((t) => (
              <li key={t} className="border-l-2 border-line pl-3 text-[13px] leading-5 text-text">
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="py-10" aria-labelledby="h-known">
        <h2 id="h-known" className="display text-[32px] leading-9 text-text">
          Established analog sites, as benchmarks
        </h2>
        <p className="mt-2 max-w-[72ch] text-[13px] text-muted">
          Sites used by space agencies and field teams, scored by the same footprint procedure. Scores are match scores, 0 to 100, for the purpose
          and target each site does best on. Best is chosen after the fact from all targets, which flatters.
        </p>
        <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {known.map((s, k) => {
            const scored = sc?.sites.find((x) => x.id === s.id);
            let best: { purpose: string; target: string; score: number; res: NonNullable<ReturnType<typeof pick>> } | null = null;
            for (const r of scored?.results ?? [])
              for (const p of PURPOSES) {
                const v = r.site.purposes[p.id]?.score;
                if (typeof v === 'number' && (!best || v > best.score)) best = { purpose: p.label, target: r.target, score: v, res: r };
              }
            const t = targets.find((x) => x.id === best?.target);
            const img = extracts?.items.find((x) => x.id === s.id)?.image ?? null;
            return (
              <li key={s.id}>
                <Reveal i={k % 3}>
                  <button type="button" onClick={() => onSitePage(s.id)} className="group block w-full text-left">
                    <span className="relative block aspect-[16/10] overflow-hidden bg-panel">
                      {img && <img src={dataUrl(img.file)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]" />}
                      <span className="absolute bottom-0 left-0 bg-bg px-3 py-2">
                        <span className="display block text-[34px] leading-none text-text">{best ? best.score.toFixed(0) : '-'}</span>
                      </span>
                    </span>
                    <span className="display mt-3 block text-[20px] leading-6 text-text group-hover:text-accent">{short(s.name)}</span>
                    <span className="mt-0.5 block text-[13px] text-muted">{best ? `${best.purpose}, against ${t?.name ?? 'a target'}` : 'no data'} · {s.footprintKm} km footprint</span>
                  </button>
                  <div className="mt-3">
                    <ProfileDots result={best?.res ?? null} size="sm" />
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
        {scores.status === 'ready' && !sc && <p className="mt-2 text-[12px] text-muted">No data. Site-scale scores were not published with this build.</p>}

        <h3 className="display mt-12 text-[26px] leading-8 text-text">Proposed sites against the benchmarks</h3>
        {bm ? (
          <>
            <p className="mt-1 max-w-[72ch] text-[13px] text-muted">
              The {bm.groups.candidates} proposed sites and the {bm.groups.known} established sites, scored by one procedure at footprint scale, over all
              targets. Similarity runs from 0 to 1 and purpose scores from 0 to 100.
            </p>
            <div className="mt-3 grid max-w-[1100px] gap-x-10 gap-y-6 md:grid-cols-2">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="label py-2 font-normal">Mean similarity</th>
                    <th scope="col" className="label py-2 text-right font-normal">Proposed</th>
                    <th scope="col" className="label py-2 text-right font-normal">Established</th>
                  </tr>
                </thead>
                <tbody>
                  {DIMENSIONS.map((d) => (
                    <tr key={d.id} className="border-b border-line">
                      <td className="py-2 text-text">{d.label}</td>
                      <td className="num py-2 text-right text-text">{f2(bm.groups.dimensionMean[d.id]?.candidates)}</td>
                      <td className="num py-2 text-right text-text">{f2(bm.groups.dimensionMean[d.id]?.known)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="label py-2 font-normal">Purpose score, median and best target</th>
                    <th scope="col" className="label py-2 text-right font-normal">Proposed</th>
                    <th scope="col" className="label py-2 text-right font-normal">Established</th>
                  </tr>
                </thead>
                <tbody>
                  {PURPOSES.map((p) => (
                    <tr key={p.id} className="border-b border-line">
                      <td className="py-2 text-text">{p.label}</td>
                      <td className="num py-2 text-right text-text">
                        {f0(bm.groups.purposeMedian[p.id]?.candidates)} · {f0(bm.groups.purposeBest[p.id]?.candidates)}
                      </td>
                      <td className="num py-2 text-right text-text">
                        {f0(bm.groups.purposeMedian[p.id]?.known)} · {f0(bm.groups.purposeBest[p.id]?.known)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-3 max-w-[72ch] space-y-1">
              {bm.meta.caveats.map((c) => (
                <li key={c} className="text-[12px] text-muted">
                  {c}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-[13px] text-muted">{bench.status === 'loading' ? 'Loading benchmarks' : 'No data. data/benchmarks.json is not published with this build.'}</p>
        )}
      </section>

      <section className="pb-16 pt-10" aria-labelledby="h-scan">
        <h2 id="h-scan" className="display text-[32px] leading-9 text-text">
          Top of the global scan for {target.name}
        </h2>
        <p className="mt-2 max-w-[72ch] text-[13px] text-muted">
          The three best 0.5° cells by all-round match, at least 250 km apart. Cell scale, about 55 km on a side. Pick another place in step 2 to
          change the target.
        </p>
        {warnings.map((w) => (
          <p key={w} className="mt-2 max-w-[72ch] border-l-2 border-accent pl-3 text-[12px] leading-[18px] text-text" role="note">
            {w}
          </p>
        ))}
        {top.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted">No data. No cell is scored for this target.</p>
        ) : (
          <ol className="mt-4 grid max-w-[1100px] gap-x-6 gap-y-4 md:grid-cols-3">
            {top.slice(0, 3).map((c) => {
              const cell = earth.cells[c.index];
              const r = results[c.index];
              return (
                <li key={c.index} className="border-t border-line pt-4">
                  <p className="text-[13px] text-muted">Number {c.rank}</p>
                  <p className="display mt-1 text-[56px] leading-none text-text">
                    {r.score === null ? 'no data' : r.score.toFixed(0)}
                    <span className="ml-2 text-[14px] font-normal text-muted">out of 100</span>
                  </p>
                  <p className="mt-3 text-[16px] font-medium text-text">{countries.get(countryKey(cell.lat, cell.lon)) ?? 'Open land'}</p>
                  <p className="num text-[11px] text-muted">{formatCoords(cell.lat, cell.lon)} · {siteCode(cell)}</p>
                  <p className="mt-1 flex items-center gap-3 text-[12px] text-muted">
                    {reason(c.index)} <ConfidenceBadge confidence={r.confidence} coverage={r.coverage} />
                  </p>
                  {(() => {
                    const pk = pickAt(cell.lat, cell.lon);
                    return pk ? (
                      <p className="mt-1 text-[12px] text-muted">
                        {pk.isNew && pk.nearestKnown ? `New: ${Math.round(pk.nearestKnown.km).toLocaleString('en-US')} km from the nearest known analog. ` : ''}
                        {pk.stability ? `Rank ${pk.stability.rankP05} to ${pk.stability.rankP95} in nine of ten redraws of the weights.` : ''}
                      </p>
                    ) : null;
                  })()}
                  <button type="button" onClick={() => onCell(c.index)} className="btn mt-3">
                    Open the match
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {indo && (
          <p className="mt-6 max-w-[72ch] border-t border-line pt-3 text-[13px] leading-5 text-text">
            Best cell in the Indonesian region for {target.name}: <span className="num">{formatCoords(indo.lat, indo.lon)}</span>, score{' '}
            <span className="num">{indo.score.toFixed(0)}</span> of 100, rank <span className="num">{indo.rank.toLocaleString('en-US')}</span>, above{' '}
            <span className="num">{Math.round(indo.percentile * 100)}%</span> of Earth's cells. The proposed sites are not at the top of the scan, and
            the page does not claim they are.
          </p>
        )}
        {found && disc.status === 'ready' && disc.value && (
          <ul className="mt-3 max-w-[72ch] space-y-1">
            {disc.value.meta.caveats.map((c) => (
              <li key={c} className="text-[12px] text-muted">
                {c}
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </main>
  );
}

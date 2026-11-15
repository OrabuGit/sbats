import { ArrowRight } from 'lucide-react';
import type { ExtractIndex, ExtractItem, SitesFile } from '../data/sites';
import { loadStories, type SiteStory } from '../data/stories';
import { useAsync } from '../lib/useAsync';
import type { StoryPair } from '../lib/storyPairs';
import { Reveal } from './HomeStory';
import { SiteTile, mosaicCredit, type Body } from './MapTile';
import { StoryTool } from './StoryTool';

// The featured section of the home page: the team's five site stories as Earth-and-target pairs, in
// the layout of the old featured sites (a full-bleed lead, then a row of cards). Pictures come from the
// same-scale extracts, else the app's own global mosaic (SiteTile never leaves an empty box). The words
// are the team's; everything under "Computed by the tool" is the tool's own (lib/storyPairs.ts).

const ORDER = ['tambora-shackleton', 'batur-marius', 'dallol-columbia-hills', 'uyuni-tunupa-holden', 'lut-gale'];

const short = (n: string) => n.split(',')[0];
const region = (n: string) => n.split(',').slice(1).join(',').trim();
const bodyOf = (id: string | null, name: string): Body => (id?.startsWith('mars') || /mars/i.test(name) ? 'mars' : id?.startsWith('moon') || /moon|lunar/i.test(name) ? 'moon' : 'earth');

/** The first sentence when the text is long; whole when short. */
function firstSentence(t: string | null): string | null {
  if (!t) return null;
  if (t.length <= 170) return t;
  const m = t.match(/^(.+?[.!?])(\s|$)/);
  return m ? m[1] : t;
}

function credit(item: ExtractItem | null, body: Body): string {
  if (item?.image) return item.image.attribution.startsWith(item.image.product.split(' (')[0]) ? item.image.attribution : `${item.image.product}. ${item.image.attribution}`;
  if (item?.elevation) return `Shaded relief from ${item.elevation.product}. ${item.elevation.attribution}`;
  return `Global mosaic, about 24° across. ${mosaicCredit(body)}`;
}

interface Resolved {
  story: SiteStory;
  pair: StoryPair | null;
  earthId: string;
  earthName: string;
  earthFull: string;
  earthPoint: { lat: number; lon: number } | null;
  earthItem: ExtractItem | null;
  tName: string;
  tFull: string;
  tPoint: { lat: number; lon: number } | null;
  tBody: Body;
  tItem: ExtractItem | null;
  why: string | null;
}

function resolve(story: SiteStory, pair: StoryPair | null, sites: SitesFile | null, extracts: ExtractIndex | null): Resolved {
  const ex = (id: string | null | undefined) => (id ? (extracts?.items.find((i) => i.id === id) ?? null) : null);
  const earthId = story.earthSiteIds[0] ?? '';
  const site = sites?.sites.find((s) => s.id === earthId) ?? null;
  const earthFull = site?.name ?? story.earth.name;
  const tId = story.target.inTool?.id ?? story.target.targetId;
  return {
    story,
    pair,
    earthId,
    earthName: short(earthFull),
    earthFull,
    earthPoint: site ?? story.earth.teamLocation ?? story.ourData[0] ?? null,
    earthItem: ex(earthId),
    tName: story.target.inTool?.name ?? short(story.target.name),
    tFull: story.target.name,
    tPoint: story.target.inTool ?? story.target.teamLocation,
    tBody: bodyOf(tId, story.target.name),
    tItem: ex(tId),
    why: firstSentence(story.whyItStandsOut),
  };
}

/** The target's picture, small, for the lower right corner of the Earth picture. */
function Inset({ r, className }: { r: Resolved; className: string }) {
  if (!r.tPoint) return null;
  return (
    <span className={`block ${className}`}>
      <span className="relative block aspect-[4/3] w-full border-2 border-bg">
        <SiteTile item={r.tItem} body={r.tBody} lat={r.tPoint.lat} lon={r.tPoint.lon} name={r.tName} caption={false} />
      </span>
      <span className="block bg-bg px-1.5 py-0.5 text-[12px] leading-[18px] text-text">{r.tName}</span>
    </span>
  );
}

function Lead({ r, cellKm, onSite, onAll }: { r: Resolved; cellKm: number; onSite: () => void; onAll: () => void }) {
  const where = region(r.earthFull);
  return (
    <>
      <div className="relative min-h-[520px] overflow-hidden bg-panel sm:min-h-[72svh]">
        {r.earthPoint && (
          <span className="absolute inset-0 block">
            <SiteTile item={r.earthItem} body="earth" lat={r.earthPoint.lat} lon={r.earthPoint.lon} name={r.earthName} caption={false} />
          </span>
        )}
        <div className="absolute inset-0 bg-bg/55" aria-hidden="true" />
        <div className="relative flex min-h-[520px] flex-col justify-end px-5 pb-10 pt-24 sm:min-h-[72svh] sm:px-10 sm:pr-[250px] lg:px-16 lg:pb-16 lg:pr-[320px]">
          <Inset r={r} className="mb-6 w-[150px] sm:hidden" />
          <Reveal>
            <p className="num text-[12px] text-text/80">Featured sites · proposed by the team</p>
          </Reveal>
          <Reveal i={1}>
            <h2 id="h-home-featured" className="display-xl mt-3 max-w-[18ch] text-[40px] text-text sm:text-[64px] lg:text-[80px]">
              {r.story.title}
            </h2>
          </Reveal>
          <Reveal i={2}>
            <p className="mt-3 text-[14px] text-text/80">
              {where ? `${where}. ` : ''}Stands in for {r.tFull}.
            </p>
            {r.why && <p className="mt-2 max-w-[58ch] text-[15px] leading-[24px] text-text sm:text-[17px] sm:leading-7">{r.why}</p>}
            <p className="mt-1 text-[12px] text-text/80">Written by the SBATS team</p>
          </Reveal>
          <Reveal i={3}>
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
              <button type="button" onClick={onSite} className="btn btn-primary !px-6">
                Open the site page
              </button>
              <button type="button" onClick={onAll} className="link-rule inline-flex min-h-11 items-center text-[16px] font-medium text-text">
                All featured sites
              </button>
            </div>
          </Reveal>
        </div>
        <Inset r={r} className="absolute bottom-10 right-5 hidden w-[200px] sm:block lg:bottom-16 lg:right-16 lg:w-[240px]" />
      </div>
      <p className="mt-2 px-5 text-[11px] leading-4 text-muted sm:px-10 lg:px-16">
        Pictures: {r.earthName}, {credit(r.earthItem, 'earth')} {r.tName}, {credit(r.tItem, r.tBody)}
      </p>
      <div className="mt-8 px-5 sm:px-10 lg:px-16">
        <Reveal>
          <StoryTool pair={r.pair} earthName={r.earthName} targetName={r.tName} cellKm={cellKm} maxRows={8} onSite={onSite} wide />
        </Reveal>
      </div>
    </>
  );
}

function Card({ r, cellKm, onSite }: { r: Resolved; cellKm: number; onSite: () => void }) {
  const where = region(r.earthFull);
  return (
    <article aria-labelledby={`pair-${r.story.id}`} className="min-w-0">
      <button type="button" onClick={onSite} className="group block w-full text-left" aria-label={`Open the ${r.earthName} site page`}>
        <span className="relative block aspect-[4/3] overflow-hidden bg-panel">
          {r.earthPoint && <SiteTile item={r.earthItem} body="earth" lat={r.earthPoint.lat} lon={r.earthPoint.lon} name={r.earthName} caption={false} />}
          <Inset r={r} className="absolute bottom-2 right-2 w-[40%]" />
        </span>
      </button>
      <h3 id={`pair-${r.story.id}`} className="display mt-3 text-[20px] leading-[26px] text-text">
        <button type="button" onClick={onSite} className="text-left hover:text-accent">
          {r.story.title}
        </button>
      </h3>
      <p className="mt-0.5 text-[13px] text-muted">
        {where ? `${where} · ` : ''}against {r.tName}
      </p>
      {r.why && <p className="mt-2 line-clamp-2 text-[14px] leading-[22px] text-text">{r.why}</p>}
      <p className="mt-1 text-[11px] leading-4 text-muted">
        Pictures: {credit(r.earthItem, 'earth')} {credit(r.tItem, r.tBody)}
      </p>
      <div className="mt-4">
        <StoryTool pair={r.pair} earthName={r.earthName} targetName={r.tName} cellKm={cellKm} maxRows={4} onSite={onSite} />
      </div>
    </article>
  );
}

/** The featured section of the home page: the team's pairs, in the team's order. */
export function StoryPairs({
  pairs,
  sites,
  extracts,
  cellKm,
  onSite,
  onAll,
}: {
  pairs: StoryPair[] | undefined;
  sites: SitesFile | null;
  extracts: ExtractIndex | null;
  cellKm: number;
  onSite: (id: string) => void;
  onAll: () => void;
}) {
  const file = useAsync(loadStories, 'site-stories');
  const stories = file.status === 'ready' && file.value && Array.isArray(file.value.stories) ? file.value.stories : [];
  const rank = (s: SiteStory) => {
    const i = ORDER.indexOf(s.id);
    return i < 0 ? ORDER.length : i;
  };
  const sorted = [...stories].sort((a, b) => rank(a) - rank(b)).map((s) => resolve(s, pairs?.find((p) => p.storyId === s.id) ?? null, sites, extracts));
  const lead = sorted[0] ?? null;
  const rest = sorted.slice(1);

  return (
    <section aria-labelledby="h-home-featured" className="pb-8 pt-12">
      {lead && <Lead r={lead} cellKm={cellKm} onSite={() => onSite(lead.earthId)} onAll={onAll} />}
      {!lead && (
        <div className="px-5 py-24 sm:px-10 lg:px-16">
          <h2 id="h-home-featured" className="display-l text-[34px]">
            Featured sites · proposed by the team
          </h2>
          <p className="mt-3 text-[14px] text-muted" role="status">
            {file.status === 'loading' ? 'Loading the team’s sites' : 'No data. The team’s site stories are not published with this build.'}
          </p>
        </div>
      )}
      {rest.length > 0 && (
        <div className="mt-16 px-5 sm:px-10 lg:px-16">
          <ul className="-mx-5 flex scroll-pl-5 snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-14 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {rest.map((r, i) => (
              <li key={r.story.id} className="w-[80vw] shrink-0 snap-start sm:w-auto">
                <Reveal i={i % 4}>
                  <Card r={r} cellKm={cellKm} onSite={() => onSite(r.earthId)} />
                </Reveal>
              </li>
            ))}
          </ul>
          <Reveal className="mt-12">
            <p className="max-w-[60ch] text-[14px] leading-[22px] text-muted">
              The Indonesian candidates, the established analog sites shown as benchmarks, and the team stories in full are on the featured sites page.
            </p>
            <button type="button" onClick={onAll} className="link-rule mt-3 inline-flex min-h-11 items-center gap-2 text-[16px] font-medium text-text">
              All featured sites <ArrowRight size={16} aria-hidden="true" />
            </button>
          </Reveal>
        </div>
      )}
    </section>
  );
}

import { ArrowRight } from 'lucide-react';
import type { ExtractIndex, SitesFile } from '../data/sites';
import { loadStories, type SiteStory } from '../data/stories';
import { useAsync } from '../lib/useAsync';
import type { StoryPair } from '../lib/storyPairs';
import { ConfidenceBadge } from './Badges';
import { Reveal } from './HomeStory';
import { SiteTile, type Body } from './MapTile';

// The team's five site stories as Earth-and-target pairs on the home page. Pictures come from the
// same-scale extracts (or the global mosaic when there is none); the words are the team's; the verdict
// is the tool's own, computed in the browser (lib/storyPairs.ts). No story value is shown as a score.

const ORDER = ['tambora-shackleton', 'batur-marius', 'dallol-columbia-hills', 'uyuni-tunupa-holden', 'lut-gale'];
/** A second, smaller Earth tile shown with a pair. */
const SECOND: Record<string, string> = { 'uyuni-tunupa-holden': 'tunupa-volcano' };
const NO_TARGET = 'No tool target for this place, so the tool gives no score.';

const short = (n: string) => n.split(',')[0];
const bodyOf = (id: string | null, name: string): Body => (id?.startsWith('mars') || /mars/i.test(name) ? 'mars' : id?.startsWith('moon') || /moon|lunar/i.test(name) ? 'moon' : 'earth');

/** The first sentence when the text is long; whole when short. */
function firstSentence(t: string | null): string | null {
  if (!t) return null;
  if (t.length <= 170) return t;
  const m = t.match(/^(.+?[.!?])(\s|$)/);
  return m ? m[1] : t;
}

function Pair({ story, n, pair, sites, extracts, onSite }: { story: SiteStory; n: number; pair: StoryPair | null; sites: SitesFile | null; extracts: ExtractIndex | null; onSite: (id: string) => void }) {
  const earthId = story.earthSiteIds[0];
  const site = sites?.sites.find((s) => s.id === earthId) ?? null;
  const ex = (id: string | null | undefined) => (id ? (extracts?.items.find((i) => i.id === id) ?? null) : null);
  const earthPoint = site ?? story.earth.teamLocation ?? story.ourData[0] ?? null;
  const secondId = SECOND[story.id];
  const second = secondId ? (sites?.sites.find((s) => s.id === secondId) ?? null) : null;
  const tId = story.target.inTool?.id ?? story.target.targetId;
  const tPoint = story.target.inTool ?? story.target.teamLocation;
  const tBody = bodyOf(tId, story.target.name);
  const tName = story.target.inTool?.name ?? short(story.target.name);
  const v = pair?.verdict ?? null;
  const why = firstSentence(story.whyItStandsOut);

  return (
    <article className="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" aria-labelledby={`pair-${story.id}`}>
      <Reveal>
        <div className="grid grid-cols-2 gap-3 sm:gap-5">
          <div className="min-w-0">
            {earthPoint ? (
              <SiteTile item={ex(earthId)} body="earth" lat={earthPoint.lat} lon={earthPoint.lon} name={short(site?.name ?? story.earth.name)} />
            ) : (
              <p className="text-[13px] text-muted">No data. No position for this Earth site.</p>
            )}
            {second && (
              <div className="mt-4 w-2/3">
                <SiteTile item={ex(second.id)} body="earth" lat={second.lat} lon={second.lon} name={short(second.name)} small />
              </div>
            )}
          </div>
          <div className="min-w-0">
            {tPoint ? (
              <SiteTile item={ex(tId)} body={tBody} lat={tPoint.lat} lon={tPoint.lon} name={tName} />
            ) : (
              <p className="text-[13px] text-muted">No data. No position for this target.</p>
            )}
          </div>
        </div>
      </Reveal>
      <Reveal i={1} className="min-w-0">
        <p className="num text-[12px] text-muted">{String(n).padStart(2, '0')}</p>
        <h3 id={`pair-${story.id}`} className="display mt-2 text-[26px] leading-8 text-text sm:text-[32px] sm:leading-[38px]">
          {story.title}
        </h3>
        {why && <p className="mt-3 max-w-[56ch] text-[15px] leading-6 text-text">{why}</p>}
        <p className="mt-1 text-[12px] text-muted">Written by the SBATS team</p>

        <div className="mt-6 border-l-2 border-accent pl-4">
          <p className="text-[12px] text-muted">Computed by the tool: grid cell 0.5° against {tId ? tName : 'the target'}, Base weights</p>
          {!tId ? (
            <>
              <p className="mt-1 text-[15px] leading-6 text-text">{NO_TARGET}</p>
              {story.target.note && <p className="mt-1 text-[12px] leading-[18px] text-muted">{story.target.note}</p>}
            </>
          ) : v && v.score !== null ? (
            <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="display text-[34px] leading-none text-text">{v.score.toFixed(0)}</span>
              <span className="text-[13px] text-muted">/ 100</span>
              <span className="text-[15px] font-medium text-text">{v.word} match</span>
              <ConfidenceBadge confidence={(v.confidence as 'high' | 'medium' | 'low' | null) ?? null} />
            </p>
          ) : (
            <p className="mt-1 text-[15px] leading-6 text-muted">{pair ? 'No data. The grid cell has too little data for a score.' : 'No data. The verdict is not computed on this page.'}</p>
          )}
        </div>

        <button type="button" onClick={() => onSite(earthId)} className="link-rule mt-6 inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-text">
          Open the {short(site?.name ?? story.earth.name)} site page <ArrowRight size={16} aria-hidden="true" />
        </button>
      </Reveal>
    </article>
  );
}

/** The featured section of the home page: the team's pairs, in the team's order. */
export function StoryPairs({ pairs, sites, extracts, onSite, onAll }: { pairs: StoryPair[] | undefined; sites: SitesFile | null; extracts: ExtractIndex | null; onSite: (id: string) => void; onAll: () => void }) {
  const file = useAsync(loadStories, 'site-stories');
  const stories = file.status === 'ready' && file.value && Array.isArray(file.value.stories) ? file.value.stories : [];
  const rank = (s: SiteStory) => {
    const i = ORDER.indexOf(s.id);
    return i < 0 ? ORDER.length : i;
  };
  const sorted = [...stories].sort((a, b) => rank(a) - rank(b));
  return (
    <section aria-labelledby="h-home-featured" className="px-5 pb-8 pt-20 sm:px-10 lg:px-16">
      <Reveal>
        <h2 id="h-home-featured" className="display-l text-[30px] sm:text-[44px]">
          Featured sites · proposed by the team
        </h2>
        <p className="mt-2 max-w-[64ch] text-[15px] leading-6 text-muted">
          Five places on Earth the team proposes, each beside the Moon or Mars place it stands in for. The words are the team&rsquo;s. The verdict under each pair is the tool&rsquo;s own.
        </p>
      </Reveal>
      {file.status === 'loading' && (
        <p className="mt-10 text-[13px] text-muted" role="status">
          Loading the team&rsquo;s sites
        </p>
      )}
      {file.status !== 'loading' && sorted.length === 0 && <p className="mt-10 text-[13px] text-muted">No data. data/site_stories.json is not published with this build.</p>}
      {sorted.length > 0 && (
        <ol className="mt-14 space-y-20 sm:space-y-24">
          {sorted.map((s, i) => (
            <li key={s.id}>
              <Pair story={s} n={i + 1} pair={pairs?.find((p) => p.storyId === s.id) ?? null} sites={sites} extracts={extracts} onSite={onSite} />
            </li>
          ))}
        </ol>
      )}
      <Reveal className="mt-16">
        <p className="max-w-[60ch] text-[14px] leading-[22px] text-muted">The Indonesian candidates, the established analog sites shown as benchmarks, and the team stories in full are on the featured sites page.</p>
        <button type="button" onClick={onAll} className="link-rule mt-3 inline-flex min-h-11 items-center text-[16px] font-medium text-text">
          All featured sites
        </button>
      </Reveal>
    </section>
  );
}

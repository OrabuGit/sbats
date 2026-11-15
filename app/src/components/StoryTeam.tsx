import { useEffect, useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import type { SiteStory, StoryValue } from '../data/stories';
import { loadSiteScores } from '../data/sites';
import { PURPOSES } from '../lib/scoringAdapter';
import { formatCoords } from '../lib/geo';
import { useAsync } from '../lib/useAsync';
import { ComputedBadge, SourceBadge } from './Badges';
import { More } from './ValidationParts';
import { Reveal } from './HomeStory';
import { fromSite, logisticsLines } from './FieldLogisticsData';

// A team story from data/site_stories.json, kept apart from what the tool computes. The left column is the
// team's text ("Team story", credited); the right column is the tool's scores ("Computed by the tool") and
// values from our data files, each with its badge. The story file carries no score.

const CREDIT = 'Written by the SBATS team';

const VALUE_LABEL: Record<string, string> = {
  slope: 'Mean slope',
  slopeFine: 'Mean slope, fine posts',
  roughness: 'Roughness',
  ndvi: 'Vegetation index (NDVI)',
  bareFrac: 'Bare ground',
  waterFrac: 'Water',
  rockType: 'Rock type',
  lithology: 'Rock class',
  tempMean: 'Mean temperature',
  tempRange: 'Daily temperature range',
  precip: 'Precipitation',
  windSpeed: 'Wind speed',
  aod: 'Aerosol optical depth',
};

const fmtValue = (v: StoryValue) => {
  if (v.value === null || v.value === undefined) return 'no data';
  const val = typeof v.value === 'number' ? String(v.value).replace('-', '−') : v.value;
  return v.unit ? `${val} ${v.unit}` : val;
};

function Sub({ children }: { children: React.ReactNode }) {
  return <h5 className="label mt-7 first:mt-0">{children}</h5>;
}

/** The tool's own scores for the story's Earth sites against its target, from validation/output/sites.json. */
function ToolScores({ story }: { story: SiteStory }) {
  const scores = useAsync(loadSiteScores, 'site-scores');
  const sc = scores.status === 'ready' ? scores.value : null;
  const t = story.target;
  return (
    <div>
      <p className="label text-accent">Computed by the tool</p>
      {t.targetId === null ? (
        <p className="mt-2 text-[14px] leading-[22px] text-muted">
          No tool target for this place, so the tool gives no score. {t.note}
        </p>
      ) : (
        <>
          <p className="mt-2 text-[13px] leading-5 text-muted">
            Purpose scores against {t.inTool?.name ?? t.targetId}, 0 to 100, from the footprint values and the frozen formula.
          </p>
          {story.earthSiteIds.map((id) => {
            const site = sc?.sites.find((s) => s.id === id);
            const res = site?.results.find((r) => r.target === t.targetId);
            return (
              <div key={id} className="mt-3">
                <p className="text-[14px] text-text">{(site?.name ?? story.ourData.find((o) => o.siteId === id)?.name ?? id).split(',')[0]}</p>
                {scores.status === 'loading' ? (
                  <p className="text-[13px] text-muted">Loading scores</p>
                ) : (
                  <dl className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 text-[13px]">
                    {PURPOSES.map((p) => {
                      const v = res?.site.purposes[p.id]?.score ?? null;
                      return (
                        <div key={p.id} className="contents">
                          <dt className="text-muted">{p.label}</dt>
                          <dd className={`num text-right ${v === null ? 'text-muted' : 'text-text'}`}>{v === null ? 'no data' : v.toFixed(v < 1 ? 1 : 0)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
              </div>
            );
          })}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
            <ComputedBadge title="Scored by the validation scripts with the frozen formula (validation/output/sites.json)." />
            <span>Not part of the team's text.</span>
          </p>
        </>
      )}
    </div>
  );
}

function OurData({ story }: { story: SiteStory }) {
  if (story.ourData.length === 0) return null;
  return (
    <div>
      <Sub>From our data</Sub>
      {story.ourData.map((o) => (
        <div key={o.siteId} className="mt-3">
          <p className="text-[14px] text-text">{o.name}</p>
          <p className="num text-[12px] text-muted">
            {formatCoords(o.lat, o.lon)}
            {o.footprintKm !== null ? ` · footprint ${o.footprintKm} km` : ''}
            {o.footprintStatus ? ` (${o.footprintStatus})` : ''}
            {o.elevationFootprintM && o.elevationFootprintM[0] !== null && o.elevationFootprintM[1] !== null
              ? ` · ${Math.round(o.elevationFootprintM[0]).toLocaleString('en-US').replace('-', '−')} to ${Math.round(o.elevationFootprintM[1]).toLocaleString('en-US').replace('-', '−')} m`
              : ''}
          </p>
          <dl className="mt-2">
            {Object.entries(o.values).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-t border-line py-1.5 text-[13px]">
                <dt className="text-muted">
                  {VALUE_LABEL[k] ?? k}
                  <span className="text-[12px]"> · {v.scale}</span>
                </dt>
                <dd className="flex flex-wrap items-baseline justify-end gap-x-2 text-right">
                  <span className={`num ${v.value === null ? 'text-muted' : 'text-text'}`}>{fmtValue(v)}</span>
                  <SourceBadge badge={v.badge} source={v.source} />
                </dd>
              </div>
            ))}
          </dl>
          {o.caveat && <p className="mt-2 text-[12px] leading-[18px] text-muted">{o.caveat}</p>}
        </div>
      ))}
    </div>
  );
}

function Logistics({ story }: { story: SiteStory }) {
  const lg = story.logistics;
  if (!lg) return null;
  const team = lg.teamEstimate;
  return (
    <div>
      <Sub>Logistics</Sub>
      <div className="mt-3 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-text">Computed from our data</p>
          {lg.computed.length === 0 && <p className="mt-1 text-[13px] text-muted">no data</p>}
          {lg.computed.map((c) => {
            const lines = logisticsLines(fromSite(c), null).filter((l) => !/month|elevation/i.test(l.label) || l.label === 'Driest three months');
            return (
              <div key={c.siteId} className="mt-2">
                {lg.computed.length > 1 && <p className="text-[12px] text-muted">{story.ourData.find((o) => o.siteId === c.siteId)?.name.split(',')[0] ?? c.siteId}</p>}
                <dl>
                  {lines.map((l) => (
                    <div key={l.label} className="border-t border-line py-1.5 text-[13px]">
                      <dt className="text-muted">{l.label}</dt>
                      <dd className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                        <span className={l.value === 'no data' ? 'text-muted' : 'text-text'}>{l.value}</span>
                        {l.badge}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-text">Team estimate</p>
          {team ? (
            <dl className="mt-2">
              {(
                [
                  ['Access difficulty', team.accessDifficulty],
                  ['Nearest support hub', team.nearestSupportHub],
                  ['Cost efficiency', team.costEfficiency],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="border-t border-line py-1.5 text-[13px]">
                  <dt className="text-muted">{k}</dt>
                  <dd className={`mt-0.5 ${v ? 'text-text' : 'text-muted'}`}>{v ?? 'no data'}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-1 text-[13px] text-muted">no data</p>
          )}
          <p className="mt-2 text-[12px] leading-[18px] text-muted">The team's own judgement of effort and cost. Not computed.</p>
        </div>
      </div>
      {lg.note && <p className="mt-3 text-[12px] leading-[18px] text-muted">{lg.note}</p>}
    </div>
  );
}

/** One team story, full width, with the tool's numbers beside it. */
export function TeamStory({ story, headingLevel = 3 }: { story: SiteStory; headingLevel?: 3 | 4 }) {
  const H = headingLevel === 3 ? 'h3' : 'h4';
  const t = story.target;
  const review = story.needsTeamReview ?? [];
  const pairs = story.limitation.map((l, i) => ({ l, w: story.workaround[i] ?? null }));
  const extraWork = story.workaround.slice(story.limitation.length);
  return (
    <article aria-labelledby={`story-${story.id}`} className="grid gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <p className="label text-accent">Team story{story.trek ? ` · ${story.trek}` : ''}</p>
        <H id={`story-${story.id}`} className="display mt-2 text-[28px] leading-8 text-text sm:text-[34px] sm:leading-10">
          {story.title}
        </H>
        <p className="mt-2 text-[13px] text-muted">{CREDIT}.</p>
        <p className="mt-4 text-[14px] leading-[22px] text-text">
          {story.earth.name} <span className="text-muted">and</span> {t.name}
        </p>
        <p className="num mt-1 text-[12px] leading-[18px] text-muted">
          {t.teamLocation ? `Team's target position ${formatCoords(t.teamLocation.lat, t.teamLocation.lon)}` : ''}
          {t.inTool ? ` · tool's point ${formatCoords(t.inTool.lat, t.inTool.lon)}` : ''}
        </p>
        <p className="mt-1 text-[12px] leading-[18px] text-muted">
          {t.targetId === null
            ? `No tool target for this place. ${t.note ?? ''}`
            : t.inTool
              ? `The tool's point differs from the team's rounded position. ${t.note ?? ''}`
              : (t.note ?? '')}
        </p>

        {review.length > 0 && (
          <div className="mt-5 border-l-2 border-accent pl-4" role="note">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-accent">
              <AlertTriangle size={14} aria-hidden="true" />
              Needs team review
            </p>
            <ul className="mt-1 space-y-1">
              {review.map((r) => (
                <li key={r} className="text-[14px] leading-[22px] text-text">
                  {r} Shown as the team wrote it until the team reviews it.
                </li>
              ))}
            </ul>
          </div>
        )}

        {story.whyItStandsOut && (
          <>
            <Sub>Why it stands out</Sub>
            <p className="mt-2 max-w-[62ch] text-[16px] leading-[26px] text-text">{story.whyItStandsOut}</p>
          </>
        )}
        {story.siteDescription && (
          <>
            <Sub>The site</Sub>
            <p className="mt-2 max-w-[62ch] text-[15px] leading-[24px] text-text">{story.siteDescription}</p>
          </>
        )}
        {story.testingTags.length > 0 && (
          <>
            <Sub>What it could test</Sub>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
              {story.testingTags.map((tag) => (
                <li key={tag} className="text-[14px] text-text">
                  {tag}
                </li>
              ))}
            </ul>
          </>
        )}
        {story.missionUse && (
          <>
            <Sub>Mission use</Sub>
            <p className="mt-2 max-w-[62ch] text-[15px] leading-[24px] text-text">{story.missionUse}</p>
          </>
        )}
        {(pairs.length > 0 || extraWork.length > 0) && (
          <>
            <Sub>Limits and workarounds</Sub>
            <ul className="mt-2 space-y-3">
              {pairs.map(({ l, w }) => (
                <li key={l} className="max-w-[62ch] text-[14px] leading-[22px]">
                  <p className="text-text">{l}</p>
                  <p className="mt-1 text-muted">
                    <span className="text-text">Workaround: </span>
                    {w ?? 'none given'}
                  </p>
                </li>
              ))}
              {extraWork.map((w) => (
                <li key={w} className="max-w-[62ch] text-[14px] leading-[22px] text-muted">
                  <span className="text-text">Workaround: </span>
                  {w}
                </li>
              ))}
            </ul>
          </>
        )}
        <Sub>Dominant rock</Sub>
        {story.dominantRock ? (
          <dl className="mt-2 max-w-[62ch] text-[14px] leading-[22px]">
            <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-3">
              <dt className="text-muted">Earth</dt>
              <dd className="text-text">{story.dominantRock.earth}</dd>
            </div>
            <div className="mt-1 grid grid-cols-[80px_minmax(0,1fr)] gap-x-3">
              <dt className="text-muted">Target</dt>
              <dd className="text-text">{story.dominantRock.target}</dd>
            </div>
            <p className="mt-1 text-[12px] text-muted">Status: {story.dominantRock.status}, see How this was checked.</p>
          </dl>
        ) : (
          <p className="mt-2 text-[14px] text-muted">no data</p>
        )}

        {story.dataChecks.length > 0 && (
          <>
            <Sub>Team text against our data</Sub>
            <ul className="mt-2 space-y-3">
              {story.dataChecks.map((c) => (
                <li key={c.claim} className="max-w-[62ch] text-[14px] leading-[22px]">
                  <p className="flex items-center gap-2 text-text">
                    {c.agrees ? <Check size={14} aria-hidden="true" className="text-text" /> : <X size={14} aria-hidden="true" className="text-accent" />}
                    <span>
                      “{c.claim}”: <span className={c.agrees ? 'text-muted' : 'text-accent'}>{c.agrees ? 'the data agrees' : 'the data disagrees'}</span>
                    </span>
                  </p>
                  <p className="mt-0.5 pl-[22px] text-[13px] text-muted">
                    {c.data}. Source: {c.source}.
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="mt-7 text-[12px] leading-[18px] text-muted">
          {story.credit ?? `${CREDIT}.`}
          {story.teamSource && (
            <>
              {' '}
              Team source:{' '}
              {story.teamSource.url?.startsWith('https://') ? (
                <a href={story.teamSource.url} target="_blank" rel="noreferrer" className="link-rule">
                  {story.teamSource.title}
                </a>
              ) : (
                story.teamSource.title
              )}
              .
            </>
          )}
        </p>
      </div>

      <div className="min-w-0 lg:border-l lg:border-line lg:pl-10">
        <ToolScores story={story} />
        <div className="mt-8">
          <OurData story={story} />
        </div>
        <div className="mt-8">
          <Logistics story={story} />
        </div>
      </div>

      <div className="min-w-0 lg:col-span-2">
        <More title="How this was checked">
          {story.corrections.length > 0 && (
            <div>
              <p className="label">Corrections to the team's first draft</p>
              <ul className="mt-2 space-y-3">
                {story.corrections.map((c, i) => (
                  <li key={`${c.field}-${i}`} className="max-w-[80ch] text-[13px] leading-5">
                    <p className="text-text">
                      <span className="num text-muted">{c.field}</span>: {c.was ? `“${c.was}”` : 'nothing'} became {c.now ? `“${c.now}”` : 'removed'}
                    </p>
                    <p className="mt-0.5 text-muted">{c.basis}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {story.verification.length > 0 && (
            <div>
              <p className="label">Verification</p>
              <ul className="mt-2 space-y-3">
                {story.verification.map((v) => (
                  <li key={v.claim} className="max-w-[80ch] text-[13px] leading-5">
                    <p className="text-text">
                      {v.claim} <span className="text-muted">· {v.status}</span>
                    </p>
                    <p className="mt-0.5 text-muted">{v.evidence}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {story.sources.length > 0 && (
            <div>
              <p className="label">Sources</p>
              <ul className="mt-2 space-y-1">
                {story.sources.map((s) => (
                  <li key={s.title} className="text-[13px] text-muted">
                    {s.url?.startsWith('https://') ? (
                      <a href={s.url} target="_blank" rel="noreferrer" className="link-rule">
                        {s.title}
                      </a>
                    ) : (
                      s.title
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </More>
      </div>
    </article>
  );
}

/** Several stories, one at a time, chosen with tabs. */
export function TeamStories({ stories, initial }: { stories: SiteStory[]; initial?: string }) {
  const [sel, setSel] = useState<string>(initial && stories.some((s) => s.id === initial) ? initial : (stories[0]?.id ?? ''));
  // A site article elsewhere on the page can ask for its story.
  useEffect(() => {
    const pick = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (stories.some((s) => s.id === id)) setSel(id);
    };
    window.addEventListener('sbats-story', pick);
    return () => window.removeEventListener('sbats-story', pick);
  }, [stories]);
  const on = stories.find((s) => s.id === sel) ?? stories[0];
  if (!on) return null;
  return (
    <div>
      {stories.length > 1 && (
        <div className="-mx-1 flex flex-wrap gap-x-1 gap-y-1 border-b border-line" role="tablist" aria-label="Team stories">
          {stories.map((s) => {
            const active = s.id === on.id;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`story-panel-${s.id}`}
                onClick={() => setSel(s.id)}
                className={`min-h-11 px-3 text-left text-[14px] ${active ? 'border-b-2 border-accent text-text' : 'border-b-2 border-transparent text-muted hover:text-text'}`}
              >
                {s.earth.name.split(',')[0]}
                <span className="text-muted"> / {s.target.name.split(',')[0]}</span>
              </button>
            );
          })}
        </div>
      )}
      <Reveal key={on.id} className="mt-8">
        <div id={`story-panel-${on.id}`} role={stories.length > 1 ? 'tabpanel' : undefined}>
          <TeamStory story={on} />
        </div>
      </Reveal>
    </div>
  );
}

import type { ReactNode } from 'react';
import { useAsync } from '../lib/useAsync';
import { loadAblation, loadAgreement, type AblationFile, type AgreementFile, type AgreementPair, type SetStats } from '../data/validation';
import { ComputedBadge } from './Badges';
import { Block, Meter, Rv } from './ValidationParts';

// The plain headline of the Validation page, and two cards read from validation/output/ablation.json and agreement.json (shown only when published).

const sample = (s: SetStats) => `${s.knownSites} test sites (${s.negativeSites} controls)`;

/** The one sentence to quote: how far up the Earth ranking known analogs land on the hold-out sites. */
export function ValidationHeadline({ stats }: { stats: SetStats }) {
  const p = stats.meanPercentile;
  return (
    <div>
      <h3 id="v-headline" className="display-xl mt-3 max-w-[20ch] text-[40px] sm:text-[72px]">
        {p === null ? 'Known analogs: no data' : `Known analogs beat ${Math.round(p * 100)}% of all land squares`}
      </h3>
      <dl className="mt-8 grid max-w-[560px] grid-cols-2 gap-x-8 gap-y-4 border-t border-line pt-4">
        <div>
          <dt className="label">Chance</dt>
          <dd className="num mt-1 text-[28px] font-semibold leading-none text-muted">50%</dd>
        </div>
        <div>
          <dt className="label">Test sites</dt>
          <dd className="num mt-1 text-[28px] font-semibold leading-none text-text">{stats.knownSites}</dd>
        </div>
        <div className="col-span-2">
          <Meter value={p} tick={0.5} tickLabel="Chance, 50%" label="Share of land squares a known analog beats, hold-out sites" height={10} />
          <div className="num mt-2 flex justify-between text-[12px] text-muted">
            <span>0</span>
            <span>chance</span>
            <span>100</span>
          </div>
        </div>
      </dl>
      <p className="mt-4 max-w-[60ch] text-[14px] leading-[22px] text-muted">
        On average, over {stats.knownSites} known analogs and {stats.positiveCases} site-and-target pairs, with {stats.negativeSites} negative controls kept alongside. None was used to
        choose a weight or a tolerance. {sample(stats)} is a small test: read it as a check, not a precise estimate.
      </p>
    </div>
  );
}

const pc = (v: number | null | undefined) => (v === null || v === undefined ? 'no data' : `${Math.round(v * 100)}%`);
const pts = (v: number | null | undefined) => (v === null || v === undefined ? null : v === 0 ? 'no change' : `${v < 0 ? '−' : '+'}${Math.abs(v * 100).toFixed(1)} points`);
const BY_SCRIPTS = 'Computed by the validation scripts in /validation, read from their output files.';

function Card({ title, lead, children, index }: { title: string; lead: ReactNode; children: ReactNode; index: number }) {
  return (
    <Rv i={index}>
      <div className="h-full border-t border-line pt-5">
        <h4 className="display text-[22px] leading-7 text-text">{title}</h4>
        <div className="mt-2 max-w-[60ch] text-[14px] leading-[22px] text-muted">{lead}</div>
        <div className="mt-5 space-y-5">{children}</div>
      </div>
    </Rv>
  );
}

function AblationCard({ data, holdout, index }: { data: AblationFile; holdout: SetStats | null; index: number }) {
  const base = data.reference.metrics.meanPercentile;
  const stays = data.removals.map((r) => r.bestPlaceStaysFor).filter((n): n is number => typeof n === 'number');
  const compared = data.removals.find((r) => typeof r.targetsCompared === 'number')?.targetsCompared ?? null;
  return (
    <Card
      index={index}
      title="Remove one factor at a time"
      lead={
        <>
          <p>{data.note}</p>
          <p className="mt-3">
            Baseline: known analogs beat <span className="num text-text">{pc(base)}</span> of scored land with all six dimensions, over{' '}
            <span className="num text-text">{data.sites.known}</span> known sites and <span className="num text-text">{data.sites.negative}</span> controls ({data.sites.note.replace(/\.$/, '')}).
            {holdout && holdout.meanPercentile !== null && (
              <>
                {' '}
                The headline <span className="num text-text">{pc(holdout.meanPercentile)}</span> above uses the hold-out sites only, so the two numbers come from different samples
                and do not contradict each other.
              </>
            )}
          </p>
        </>
      }
    >
      {data.removals.map((r) => {
        const after = r.metrics.meanPercentile;
        const ch = pts(r.change.meanPercentile);
        return (
          <div key={r.removed}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[14px]">
              <span className="text-text">Without {r.label.toLowerCase()}</span>
              <span className="num text-text">
                {pc(after)}
                <span className="ml-2 text-muted">{ch ? `${ch} against ${pc(base)}` : ''}</span>
              </span>
            </div>
            <div className="mt-1.5">
              <Meter value={after} tick={base ?? undefined} tickLabel={`All six dimensions, ${pc(base)}`} label={`Share of scored land the known analogs beat without ${r.label}`} height={8} />
            </div>
            {typeof r.bestPlaceStaysFor === 'number' && typeof r.targetsCompared === 'number' && (
              <p className="num mt-1 text-[12px] leading-[18px] text-muted">
                Best single Earth place unchanged for {r.bestPlaceStaysFor} of {r.targetsCompared} targets
              </p>
            )}
          </div>
        );
      })}
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
        <ComputedBadge title={BY_SCRIPTS} />
        <span>
          Tick: all six dimensions.{stays.length > 0 && compared !== null ? ` The best single place stays the same for ${Math.min(...stays)} to ${Math.max(...stays)} of ${compared} targets.` : ''} Frozen formula of{' '}
          {data.frozenAt}, not changed by this check.
        </span>
      </p>
    </Card>
  );
}

const tooFew = (p: AgreementPair) => p.n < 5 || /too few/i.test(p.verdict);

function AgreementCard({ data, index }: { data: AgreementFile; index: number }) {
  return (
    <Card index={index} title="Do independent datasets agree" lead={<p>{data.note}</p>}>
      {data.pairs.map((p) => {
        const r = typeof p.pearsonR === 'number' ? p.pearsonR : null;
        const few = tooFew(p);
        return (
          <div key={p.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[14px]">
              <span className="text-text">{p.title}</span>
              <span className={`num shrink-0 ${few ? 'text-muted' : 'text-text'}`}>{few ? 'too few to judge' : r !== null ? `r ${r.toFixed(3)}` : ''}</span>
            </div>
            {!few && r !== null && (
              <div className="mt-1.5">
                <Meter value={Math.max(0, r)} label={`Correlation, ${p.title}`} height={8} tone="text" />
              </div>
            )}
            <p className="mt-1 text-[12px] leading-[18px] text-muted">
              {p.first} against {p.second}.
            </p>
            <p className="num mt-0.5 text-[12px] leading-[18px] text-muted">
              {p.n} places · {few ? 'too few to judge' : p.verdict}
            </p>
            {p.caveat && <p className="mt-0.5 text-[12px] leading-[18px] text-muted">{p.caveat}</p>}
          </div>
        );
      })}
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
        <ComputedBadge title={BY_SCRIPTS} />
        <span>Verdict rule: {data.rule}</span>
      </p>
    </Card>
  );
}

/** The two cards. Renders nothing at all unless at least one file is published and readable. */
export function ValidationChecks({ holdout = null }: { holdout?: SetStats | null }) {
  const ab = useAsync(loadAblation, 'ablation');
  const ag = useAsync(loadAgreement, 'agreement');
  const abl = ab.status === 'ready' ? ab.value : null;
  const agr = ag.status === 'ready' ? ag.value : null;
  if (!abl && !agr) return null;
  return (
    <Block
      id="v-checks"
      label="Further checks"
      title="Does the result hold up?"
      size="m"
      lead="Two more tests: take one scoring dimension away at a time, and set independent datasets side by side. Both are read from the validation scripts' output files."
    >
      <div className="grid max-w-[1100px] gap-x-12 gap-y-10 md:grid-cols-2">
        {abl && <AblationCard data={abl} holdout={holdout} index={0} />}
        {agr && <AgreementCard data={agr} index={1} />}
      </div>
    </Block>
  );
}

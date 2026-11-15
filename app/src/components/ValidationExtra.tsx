import type { ReactNode } from 'react';
import { FACTOR_LABELS } from '../lib/scoringAdapter';
import { useAsync } from '../lib/useAsync';
import { loadAblation, loadAgreement, type AblationData, type AgreementData, type SetStats } from '../data/validation';
import { Tag } from './Badges';
import { Block, Meter, Rv } from './ValidationParts';

// The plain headline of the Validation page, and two cards that appear only when their data files are published.

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

const pc = (v: number) => `${(v * 100).toFixed(1)}%`;
const signed = (v: number) => `${v < 0 ? '−' : '+'}${Math.abs(v * 100).toFixed(1)} points`;

function Card({ title, lead, children, index }: { title: string; lead: string; children: ReactNode; index: number }) {
  return (
    <Rv i={index}>
      <div className="h-full border-t border-line pt-5">
        <h4 className="display text-[22px] leading-7 text-text">{title}</h4>
        <p className="mt-2 max-w-[56ch] text-[14px] leading-[22px] text-muted">{lead}</p>
        <div className="mt-5 space-y-4">{children}</div>
      </div>
    </Rv>
  );
}

function AblationCard({ data, index }: { data: AblationData; index: number }) {
  const name = (f: AblationData['factors'][number]) => f.label ?? FACTOR_LABELS[f.factor as keyof typeof FACTOR_LABELS] ?? f.factor;
  const rows = [...data.factors].sort((a, b) => (a.change ?? 0) - (b.change ?? 0));
  return (
    <Card
      index={index}
      title="Remove one factor at a time"
      lead={`Each row drops one factor, re-ranks every land square and re-scores the known analogs. ${data.metric ?? 'The figure is the share of land squares a known analog beats'}${data.full === null ? '' : `; the full model gives ${pc(data.full)}`}. A big drop means that factor matters.`}
    >
      {rows.map((f) => (
        <div key={f.factor}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="text-text">Without {name(f).toLowerCase()}</span>
            <span className="num text-text">
              {pc(f.without)}
              {f.change !== null && <span className="ml-2 text-muted">{signed(f.change)}</span>}
            </span>
          </div>
          <div className="mt-1.5">
            <Meter value={f.without} tick={data.full ?? undefined} tickLabel={data.full === null ? undefined : `Full model, ${pc(data.full)}`} label={`Share of land squares beaten without ${name(f)}`} height={8} />
          </div>
        </div>
      ))}
      <p className="flex items-center gap-2 text-[12px] text-muted">
        <Tag title="Computed by the validation scripts in /validation">Measured</Tag>
        {data.full !== null && <span>Tick: the full model.</span>}
      </p>
    </Card>
  );
}

function AgreementCard({ data, index }: { data: AgreementData; index: number }) {
  return (
    <Card
      index={index}
      title="Do independent datasets agree"
      lead="Where two datasets from different sources describe the same thing, how closely do they match? Close agreement means the answer does not hinge on one source."
    >
      {data.pairs.map((p) => (
        <div key={`${p.a}|${p.b}|${p.label ?? ''}`}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="text-text">
              {p.label ? `${p.label}: ` : ''}
              {p.a} against {p.b}
            </span>
            <span className="num shrink-0 text-text">{Math.round(p.agreement * 100)}%</span>
          </div>
          <div className="mt-1.5">
            <Meter value={p.agreement} label={`Agreement, ${p.a} against ${p.b}`} height={8} />
          </div>
          <p className="num mt-1 text-[12px] text-muted">
            {Math.round(p.agreement * 100)}% of {p.n.toLocaleString('en-US')} {p.unit ?? 'samples'}
            {p.metric ? `, ${p.metric}` : ''}
          </p>
        </div>
      ))}
      <p className="flex items-center gap-2 text-[12px] text-muted">
        <Tag title="Computed by the validation scripts in /validation">Measured</Tag>
      </p>
    </Card>
  );
}

/** The two optional cards. Renders nothing at all unless at least one file is published and readable. */
export function ValidationChecks() {
  const ab = useAsync(loadAblation, 'ablation');
  const ag = useAsync(loadAgreement, 'agreement');
  const abl = ab.status === 'ready' ? ab.value : null;
  const agr = ag.status === 'ready' ? ag.value : null;
  if (!abl && !agr) return null;
  return (
    <Block id="v-checks" label="Further checks" title="Does the result hold up?" size="m" lead="Two more ways to test the ranking, computed from the same hold-out sites and the same Earth grid.">
      <div className="grid max-w-[1100px] gap-x-12 gap-y-10 md:grid-cols-2">
        {abl && <AblationCard data={abl} index={0} />}
        {agr && <AgreementCard data={agr} index={1} />}
      </div>
    </Block>
  );
}

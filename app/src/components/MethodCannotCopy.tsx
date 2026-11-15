import { useState } from 'react';
import { Radiation, Weight, Wind } from 'lucide-react';
import type { Target } from '../types';
import { shortName } from '../lib/format';
import { SourceBadge } from './Badges';
import { MChip } from './MethodParts';

const KINDS = [
  { match: /^Gravity/, Icon: Weight, name: 'Gravity' },
  { match: /^(Vacuum|Thin atmosphere)/, Icon: Wind, name: 'Air' },
  { match: /^Radiation/, Icon: Radiation, name: 'Radiation' },
];

const short = shortName;

/** Three things no place on Earth can copy, never part of the score. The lines are the dossier's own, per target. */
export function MethodCannotCopy({ targets }: { targets: Target[] }) {
  const [id, setId] = useState(targets[0]?.id ?? '');
  const t = targets.find((x) => x.id === id) ?? targets[0];
  if (!t) return <p className="text-muted">No data. No targets were published with this build.</p>;
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Target">
        {targets.map((x) => (
          <MChip key={x.id} on={x.id === t.id} onClick={() => setId(x.id)}>
            {short(x.name)}
          </MChip>
        ))}
      </div>
      <ul className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-3">
        {KINDS.map(({ match, Icon, name }) => {
          const line = t.cannotCopy.find((l) => match.test(l)) ?? null;
          const [head, ...rest] = (line ?? '').split(':');
          const text = rest.join(':').trim();
          return (
            <li key={name} className="border-t border-line pt-4">
              <Icon size={28} strokeWidth={1.5} className="text-muted" aria-hidden="true" />
              <p className="display mt-4 text-[22px] text-text">{line ? head : name}</p>
              <p className="mt-2 text-[13px] leading-5 text-muted">{line ? text : 'No data'}</p>
              <p className="mt-3 flex items-center gap-2">
                <span className="label !text-text">Never scored</span>
                {line && <SourceBadge badge={/measured/i.test(line) ? 'Mission' : 'Literature'} />}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

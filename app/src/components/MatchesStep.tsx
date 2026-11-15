import type { ReactNode } from 'react';
import type { Candidate } from '../lib/rank';
import type { Preset, Target } from '../types';
import { useCountries } from '../lib/where';
import { CandidateList, type ListMode } from './CandidateList';
import { MatchControls, PRESET_WORDS } from './MatchControls';
import { PURPOSES } from '../lib/scoringAdapter';

type ListProps = Parameters<typeof CandidateList>[0];
type ControlProps = Parameters<typeof MatchControls>[0];

interface Props extends Omit<ListProps, 'countries' | 'mode' | 'onMode'> {
  /** The Earth globe, already wired to the same results. */
  globe: ReactNode;
  controls: ControlProps;
  presets: Preset[];
  listMode: ListMode;
  onListMode: (m: ListMode) => void;
  hidden: boolean;
  body: Target['body'];
  /** The target is a set of conditions typed in by hand, not a place. */
  custom?: boolean;
  /** Opens the chart of every Earth cell on two factors. */
  onExplore?: () => void;
  available?: (index: number) => string[];
  /** The strip comparing the previewed pair, shown over the bottom of the globe. */
  strip?: ReactNode;
}

/** Step 3: Earth fills the page, the best places are pinned on it, and one panel lists them. */
export function MatchesStep({ globe, controls, listMode, onListMode, hidden, body, custom = false, onExplore, strip, available, ...list }: Props) {
  const shown: Candidate[] = list.candidates;
  const countries = useCountries(shown.map((c) => list.earth.cells[c.index]));
  const world = body === 'moon' ? 'the Moon' : 'Mars';
  const forWhat = controls.mode === 'purpose' ? (PURPOSES.find((p) => p.id === controls.purposeId)?.label ?? null) : controls.presetId ? (PRESET_WORDS[controls.presetId]?.label ?? null) : 'your own weights';
  return (
    <main className={`min-h-0 flex-1 flex-col bg-bg lg:flex-row ${hidden ? 'hidden' : 'flex'}`} aria-labelledby="h-matches">
      <div className="flex shrink-0 flex-col lg:relative lg:min-h-0 lg:flex-1">
        <div className="bg-bg px-5 pb-3 pt-4 sm:px-10 sm:pt-6 lg:pointer-events-none lg:absolute lg:left-0 lg:top-0 lg:z-10 lg:max-w-[calc(100%-1rem)] lg:px-16 lg:pb-4">
          <h1 id="h-matches" className="display-l text-[30px] sm:text-[48px]">
            Where on Earth
          </h1>
          <p className="mt-1 max-w-[36ch] text-[14px] leading-5 text-muted">
            {custom ? (
              <>The Earth places closest to <span className="text-text">your conditions</span>. Click a pin to compare it, or a row to open it.</>
            ) : (
              <>
                The best places to rehearse a base like <span className="text-text">{list.target.name}</span> on {world}, ranked for <span className="text-text">{forWhat?.toLowerCase()}</span>. Click a pin to compare it, or a row to open it.
              </>
            )}
          </p>
        </div>
        <div className="relative h-[44svh] min-h-[280px] lg:h-full">{globe}</div>
        {strip}
      </div>
      <aside aria-label="Matches" className="scroll min-h-0 flex-1 bg-bg pb-8 pt-5 lg:w-[460px] lg:flex-none lg:border-l lg:border-line">
        <MatchControls {...controls} />
        {onExplore && (
          <div className="px-5 pt-2 sm:px-6">
            <button type="button" onClick={onExplore} className="link-rule text-[14px] font-medium text-text">
              Explore every cell on two factors
            </button>
          </div>
        )}
        <div className="mt-5">
          <CandidateList {...list} available={available} countries={countries} mode={listMode} onMode={onListMode} />
        </div>
      </aside>
    </main>
  );
}

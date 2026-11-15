import { ArrowRight, X } from 'lucide-react';
import { ActivityArt, activityOf } from './ActivityArt';
import { ElementIcon, isElement } from './ElementIcon';
import { PRESET_WORDS } from './MatchControls';
import { MATCH, MISS } from '../lib/verdict';
import { AiMark } from './AiMark';

export interface PairInfo {
  mode: 'place' | 'site';
  /** The end the person picked. */
  from: string;
  /** The other end: an Earth place for a Moon or Mars pick, the most similar target for an Earth pick. */
  to: string;
  toSub: string;
  score: number | null;
  confidence: 'high' | 'medium' | 'low' | null;
  dims: { id: string; label: string; similarity: number | null }[];
  note: string | null;
}

interface Props {
  pair: PairInfo;
  /** One chip per link: its Earth place and score. */
  chips: { label: string; score: number | null }[];
  active: number;
  onActive: (i: number) => void;
  presets: { id: string }[];
  presetId: string | null;
  onPreset: (id: string) => void;
  onOpen: () => void;
  onAll: (() => void) | null;
  onClose: () => void;
}

/** One dimension of the pair: a short track with the 0.30 and 0.75 cut-offs marked. */
function Mini({ id, label, v }: { id: string; label: string; v: number | null }) {
  return (
    <div className="min-w-0" role="meter" aria-label={`${label} similarity`} aria-valuemin={0} aria-valuemax={1} aria-valuenow={v ?? 0} aria-valuetext={v === null ? 'no data' : v.toFixed(2)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted">
          {isElement(id) && <ElementIcon id={id} size={16} className={v !== null && v >= MATCH ? 'text-accent' : ''} />}
          <span className="truncate">{label}</span>
        </span>
        <span className={`num text-[13px] font-semibold ${v === null ? 'text-muted' : 'text-text'}`}>{v === null ? 'no data' : v.toFixed(2)}</span>
      </div>
      <div className="relative mt-1 h-1.5 bg-line">
        {v !== null && <div className="h-full bg-accent" style={{ width: `${Math.max(0, Math.min(1, v)) * 100}%` }} />}
        <span className="absolute inset-y-[-2px] w-px bg-bg" style={{ left: `${MISS * 100}%` }} />
        <span className="absolute inset-y-[-2px] w-px bg-bg" style={{ left: `${MATCH * 100}%` }} />
      </div>
    </div>
  );
}

/** The strip under the home globes: the selected pair, dimension by dimension, and one click to the match. */
export function HomePair({ pair, chips, active, onActive, presets, presetId, onPreset, onOpen, onAll, onClose }: Props) {
  return (
    <section aria-label="Selected pair" className="relative z-10 bg-bg px-5 pb-5 pt-5 sm:px-8 lg:absolute lg:inset-x-0 lg:bottom-0 lg:border-t lg:border-line">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="display truncate text-[24px] leading-8 text-text">{pair.from}</p>
          <p className="mt-0.5 text-[14px] leading-5 text-muted">
            {pair.mode === 'place' ? 'Closest on Earth: ' : 'Closest base site: '}
            <span className="text-text">{pair.to}</span>
            {pair.toSub ? `. ${pair.toSub}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-4">
          <div className="text-right">
            <p className="display text-[40px] leading-none text-text">{pair.score === null ? '-' : pair.score.toFixed(0)}</p>
            <p className="mt-1 text-[12px] text-muted">{pair.confidence ? `${pair.confidence} confidence` : 'no confidence'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Clear the selection" className="tool !px-2">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {pair.note ? (
        <p className="mt-4 text-[14px] leading-5 text-muted">{pair.note}</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
          {pair.dims.map((d) => (
            <Mini key={d.id} id={d.id} label={d.label} v={d.similarity} />
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
        {chips.length > 1 && (
          <div className="flex flex-wrap gap-x-5" role="group" aria-label="Other matches">
            {chips.map((c, i) => (
              <button key={i} type="button" aria-pressed={i === active} onClick={() => onActive(i)} className={`min-h-9 border-b-2 text-[14px] transition-colors ${i === active ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'}`}>
                {c.label}
                <span className="ml-1.5 text-muted">{c.score === null ? '-' : c.score.toFixed(0)}</span>
              </button>
            ))}
          </div>
        )}
        {pair.mode === 'place' && (
          <div className="flex flex-wrap gap-x-4" role="group" aria-label="What the match is for">
            {presets.map((p) => (
              <button key={p.id} type="button" aria-pressed={p.id === presetId} title={PRESET_WORDS[p.id]?.line} onClick={() => onPreset(p.id)} className={`inline-flex h-9 items-center gap-1.5 text-[13px] ${p.id === presetId ? 'text-accent' : 'text-muted hover:text-text'}`}>
                <ActivityArt kind={activityOf(p.id, null)} className="h-5 w-auto" />
                {PRESET_WORDS[p.id]?.label ?? p.id}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-4">
          {onAll && (
            <button type="button" onClick={onAll} className="link-rule text-[14px] font-medium text-text">
              All matches
            </button>
          )}
          <button type="button" onClick={onOpen} className="btn btn-primary !px-5">
            Open the match <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
      <AiMark className="mt-3" />
    </section>
  );
}

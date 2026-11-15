import { FACTOR_IDS } from './types';
import type { FactorId, Weights } from './types';

export type PresetId = 'base' | 'rover' | 'ice' | 'astrobiology';

export interface Preset {
  id: PresetId;
  label: string;
  /** One line on what the preset emphasises, for the UI. */
  description: string;
  weights: Weights;
}

/**
 * Mission presets. They change weights only: the similarity of every factor is the same under every preset.
 *
 * Base is the table in the Method page. The other three follow the one-line rule there
 * ("Rover raises Terrain, Ice raises Temperature and Rock type, Astrobiology raises Dryness and Rock type").
 * These weights are a starting guess: tune once against the validation set, then freeze.
 * Each preset sums to 1.
 */
export const PRESETS: Record<PresetId, Preset> = {
  base: {
    id: 'base',
    label: 'Base',
    description: 'Balanced weights for a crewed surface base.',
    weights: { terrain: 0.25, bareGround: 0.2, dryness: 0.15, temperature: 0.15, sunlight: 0.1, rockType: 0.15 },
  },
  rover: {
    id: 'rover',
    label: 'Rover',
    description: 'Mobility tests. Raises Terrain.',
    weights: { terrain: 0.4, bareGround: 0.2, dryness: 0.1, temperature: 0.1, sunlight: 0.1, rockType: 0.1 },
  },
  ice: {
    id: 'ice',
    label: 'Ice',
    description: 'Ice prospecting and cold operations. Raises Temperature and Rock type.',
    weights: { terrain: 0.15, bareGround: 0.15, dryness: 0.1, temperature: 0.3, sunlight: 0.05, rockType: 0.25 },
  },
  astrobiology: {
    id: 'astrobiology',
    label: 'Astrobiology',
    description: 'Habitability and biosignature studies. Raises Dryness and Rock type.',
    weights: { terrain: 0.1, bareGround: 0.15, dryness: 0.3, temperature: 0.1, sunlight: 0.05, rockType: 0.3 },
  },
};

/** Preset ids in display order. */
export const PRESET_IDS: readonly PresetId[] = ['base', 'rover', 'ice', 'astrobiology'];

export const DEFAULT_PRESET_ID: PresetId = 'base';

/**
 * Returns the weights scaled to sum to 1. Throws when a weight is negative or not finite,
 * or when every weight is zero.
 */
export function normaliseWeights(weights: Weights): Weights {
  let total = 0;
  for (const id of FACTOR_IDS) {
    const w = weights[id];
    if (typeof w !== 'number' || !Number.isFinite(w) || w < 0) {
      throw new RangeError(`Weight for "${id}" must be a non-negative finite number, got ${String(w)}`);
    }
    total += w;
  }
  if (total <= 0) {
    throw new RangeError('At least one weight must be greater than zero');
  }
  const out = {} as Record<FactorId, number>;
  for (const id of FACTOR_IDS) {
    out[id] = weights[id] / total;
  }
  return out;
}

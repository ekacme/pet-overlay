/**
 * Runtime configuration — the single source of truth for the control sliders.
 * Each spec's `key` doubles as the <input> element id; `valId` is the element
 * showing its current value, and `decimals` how that value is formatted.
 */

import type { PetConfig } from './pets';

export interface SliderSpec {
  key: keyof PetConfig;
  valId: string;
  decimals: number;
}

export const SLIDERS: readonly SliderSpec[] = [
  { key: 'wanderWeight', valId: 'wanderVal', decimals: 2 },
  { key: 'wallWeight', valId: 'wallVal', decimals: 1 },
  { key: 'seekWeight', valId: 'seekVal', decimals: 2 },
  { key: 'petSize', valId: 'sizeVal', decimals: 1 },
  { key: 'maxSpeed', valId: 'speedVal', decimals: 1 },
  { key: 'wanderRadius', valId: 'radiusVal', decimals: 0 },
  { key: 'feelerLength', valId: 'feelerVal', decimals: 0 },
];

const inputs = new Map<keyof PetConfig, HTMLInputElement>();

/** Initialise slider elements to the defaults and sync their value labels. Call once on boot. */
export function initConfig(defaults: PetConfig): void {
  for (const { key, valId, decimals } of SLIDERS) {
    const input = document.getElementById(key) as HTMLInputElement | null;
    if (!input) throw new Error(`Missing slider element #${key}`);
    input.value = String(defaults[key]);
    inputs.set(key, input);

    const valEl = document.getElementById(valId);
    if (valEl) valEl.textContent = defaults[key].toFixed(decimals);
  }
}

/** Read a single config value from its slider. */
export function cfg(key: keyof PetConfig): number {
  const input = inputs.get(key);
  if (!input) throw new Error(`Config not initialised for key: ${key}`);
  return parseFloat(input.value);
}

/** Snapshot every slider into a full PetConfig. */
export function readConfig(): PetConfig {
  const out = {} as PetConfig;
  for (const { key } of SLIDERS) out[key] = cfg(key);
  return out;
}

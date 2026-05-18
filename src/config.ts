/**
 * Runtime configuration — reads slider values from the DOM.
 * Each property maps to an <input type="range"> element by id.
 */

import type { PetConfig } from './pet';

const SLIDER_IDS: Record<keyof PetConfig, string> = {
  petSize: 'petSize',
  wanderWeight: 'wanderWeight',
  maxSpeed: 'maxSpeed',
  wanderRadius: 'wanderRadius',
  wallWeight: 'wallWeight',
  feelerLength: 'feelerLength',
};

const VAL_IDS: Record<keyof PetConfig, string> = {
  petSize: 'sizeVal',
  wanderWeight: 'wanderVal',
  maxSpeed: 'speedVal',
  wanderRadius: 'radiusVal',
  wallWeight: 'wallVal',
  feelerLength: 'feelerVal',
};

const sliders = new Map<keyof PetConfig, HTMLInputElement>();

/** Initialise slider references and wire up display sync. Call once on boot. */
export function initConfig(defaults: PetConfig): void {
  for (const [key, id] of Object.entries(SLIDER_IDS) as [keyof PetConfig, string][]) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) throw new Error(`Missing slider element #${id}`);
    el.value = String(defaults[key]);
    sliders.set(key, el);

    const valEl = document.getElementById(VAL_IDS[key]);
    if (valEl) {
      const step = el.step;
      valEl.textContent = defaults[key].toFixed(step.includes('.') ? 2 : 0);
    }
  }
}

/** Read a single config value from its slider. */
export function cfg(key: keyof PetConfig): number {
  const el = sliders.get(key);
  if (!el) throw new Error(`Config not initialised for key: ${key}`);
  return parseFloat(el.value);
}

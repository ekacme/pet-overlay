import { el } from './dom';
import { SLIDERS } from '../config';
import type { Pet, PetConfig } from '../pets';

/** The slice of app state the controls read and mutate. */
export interface Controls {
  getPet(): Pet;
  isPaused(): boolean;
  setPaused(paused: boolean): void;
  isShowDebug(): boolean;
  setShowDebug(show: boolean): void;
  resetPet(): void;
  spawnFood(): void;
  clearFood(): void;
  isAutoSpawn(): boolean;
  setAutoSpawn(on: boolean): void;
}

/** How each slider value is applied to the live pet. */
const APPLY: Record<keyof PetConfig, (pet: Pet, v: number) => void> = {
  petSize: (p, v) => p.resize(v),
  maxSpeed: (p, v) => (p.maxSpeed = v),
  wanderRadius: (p, v) => (p.wanderRadius = v),
  wanderWeight: (p, v) => (p.wanderWeight = v),
  wallWeight: (p, v) => (p.wallWeight = v),
  feelerLength: (p, v) => (p.feelerLength = v),
  seekWeight: (p, v) => (p.seekWeight = v),
  eatDuration: (p, v) => (p.eatDuration = v),
};

/** Wire up the buttons and sliders to the running app. */
export function wireControls(c: Controls): void {
  el('btnPause').addEventListener('click', function (this: HTMLButtonElement) {
    const paused = !c.isPaused();
    c.setPaused(paused);
    this.textContent = paused ? 'Play' : 'Pause';
    this.classList.toggle('active', paused);
  });

  el('btnReset').addEventListener('click', () => c.resetPet());

  el('btnDebug').addEventListener('click', function (this: HTMLButtonElement) {
    const show = !c.isShowDebug();
    c.setShowDebug(show);
    this.classList.toggle('active', show);
  });

  el('btnSpawnFood').addEventListener('click', () => c.spawnFood());

  el('btnClearFood').addEventListener('click', () => c.clearFood());

  el('btnAutoSpawn').addEventListener('click', function (this: HTMLButtonElement) {
    const on = !c.isAutoSpawn();
    c.setAutoSpawn(on);
    this.classList.toggle('active', on);
  });

  for (const { key, valId, decimals } of SLIDERS) {
    const input = el<HTMLInputElement>(key);
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      el(valId).textContent = v.toFixed(decimals);
      APPLY[key](c.getPet(), v);
    });
  }
}

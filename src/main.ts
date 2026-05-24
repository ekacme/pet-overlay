import 'pixi.js/math-extras';
import { Loki, type Pet } from './pets';
import { initConfig, readConfig } from './config';
import { createStage } from './scene/stage';
import { FixedTimestep } from './engine/fixed_timestep';
import { Hud } from './ui/hud';
import { wireControls } from './ui/controls';
import { el } from './ui/dom';

async function main(): Promise<void> {
  const wrap = el<HTMLDivElement>('canvas-wrap');
  const stage = await createStage(wrap);

  initConfig({
    petSize: 0.5,
    wanderWeight: 0.4,
    maxSpeed: 2,
    wanderRadius: 60,
    wallWeight: 1,
    feelerLength: 100,
  });

  const { width: w, height: h } = stage.app.screen;
  function createPet(): Pet {
    const x = w * 0.3 + Math.random() * w * 0.4;
    const y = h * 0.3 + Math.random() * h * 0.4;
    return new Loki(x, y, stage.layers, readConfig());
  }

  let pet = createPet();
  let paused = false;
  let showDebug = true;

  const clock = new FixedTimestep(60, 5);
  const hud = new Hud();

  stage.app.ticker.add(() => {
    hud.tickFps(performance.now());
    if (paused) return;

    const { width: W, height: H } = stage.app.screen;
    const { steps, alpha } = clock.tick();
    for (let s = 0; s < steps; s++) pet.update(W, H);

    pet.drawDebug(showDebug);
    pet.render(alpha);
    hud.update(pet);
  });

  wireControls({
    getPet: () => pet,
    isPaused: () => paused,
    setPaused: (p) => (paused = p),
    isShowDebug: () => showDebug,
    setShowDebug: (s) => (showDebug = s),
    resetPet: () => {
      pet.destroy();
      pet = createPet();
    },
  });
}

main().catch(console.error);

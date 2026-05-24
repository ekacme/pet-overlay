import 'pixi.js/math-extras';
import { Loki, type Pet } from './pets';
import { initConfig, readConfig } from './config';
import { createStage } from './scene/stage';
import { FoodField } from './scene/food';
import { FixedTimestep } from './engine/fixed_timestep';
import { Hud } from './ui/hud';
import { wireControls } from './ui/controls';
import { el } from './ui/dom';

const EAT_RADIUS = 16;
const AUTO_SPAWN_INTERVAL = 2500; // ms

async function main(): Promise<void> {
  const wrap = el<HTMLDivElement>('canvas-wrap');
  const stage = await createStage(wrap);
  const food = new FoodField(stage.foodLayer);

  initConfig({
    petSize: 0.5,
    wanderWeight: 0.4,
    maxSpeed: 2,
    wanderRadius: 60,
    wallWeight: 1,
    feelerLength: 100,
    seekWeight: 1.2,
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
  let autoSpawn = false;
  let lastSpawn = 0;

  const clock = new FixedTimestep(60, 5);
  const hud = new Hud();

  // Place food at the clicked canvas point (mapping CSS pixels → screen coords).
  stage.app.canvas.addEventListener('pointerdown', (e) => {
    const rect = stage.app.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (stage.app.screen.width / rect.width);
    const y = (e.clientY - rect.top) * (stage.app.screen.height / rect.height);
    food.spawn(x, y);
  });

  stage.app.ticker.add(() => {
    const now = performance.now();
    hud.tickFps(now);
    food.draw();
    if (paused) return;

    const { width: W, height: H } = stage.app.screen;

    if (autoSpawn && now - lastSpawn > AUTO_SPAWN_INTERVAL) {
      food.spawnRandom(W, H);
      lastSpawn = now;
    }

    const ctx = { canvasW: W, canvasH: H, food: food.positions };
    const { steps, alpha } = clock.tick();
    for (let s = 0; s < steps; s++) {
      pet.update(ctx);
      food.consumeNear(pet.position, EAT_RADIUS);
    }

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
    spawnFood: () => food.spawnRandom(stage.app.screen.width, stage.app.screen.height),
    isAutoSpawn: () => autoSpawn,
    setAutoSpawn: (on) => (autoSpawn = on),
  });
}

main().catch(console.error);

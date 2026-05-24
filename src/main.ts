import 'pixi.js/math-extras';
import type { Point } from 'pixi.js';
import { Loki, type Pet } from './pets';
import { initConfig, readConfig } from './config';
import { createStage } from './scene/stage';
import { FoodField } from './scene/food';
import { FixedTimestep } from './engine/fixed_timestep';
import { Hud } from './ui/hud';
import { wireControls } from './ui/controls';
import { el } from './ui/dom';

const SIM_HZ = 60;
const EAT_RADIUS = 4;
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
    eatDuration: 1.5,
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
  let eatStepsLeft = 0;
  let eatingFood: Point | null = null;

  const clock = new FixedTimestep(SIM_HZ, 5);
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
      if (eatStepsLeft > 0) {
        // Mid-meal: hold still, then remove the pellet when the timer runs out.
        pet.hold();
        if (--eatStepsLeft === 0 && eatingFood) {
          food.remove(eatingFood);
          eatingFood = null;
        }
      } else {
        pet.update(ctx);
        const reached = food.nearestWithin(pet.position, EAT_RADIUS);
        if (reached) {
          eatingFood = reached;
          eatStepsLeft = Math.max(1, Math.round(pet.eatDuration * SIM_HZ));
        }
      }
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
    clearFood: () => food.clear(eatingFood),
    isAutoSpawn: () => autoSpawn,
    setAutoSpawn: (on) => (autoSpawn = on),
  });
}

main().catch(console.error);

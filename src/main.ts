import { Loki } from './loki';
import type { Pet } from './pet';
import './style.css';
import 'pixi.js/math-extras';
import { Application } from 'pixi.js';
import { FixedTimestep } from './fixed_timestep';

(async () => {
  const app = new Application();
  await app.init({ backgroundAlpha: 0, resizeTo: window });

  const pet: Pet = new Loki(app.screen.width / 2, app.screen.height / 2);

  app.stage.addChild(pet.container);

  document.body.appendChild(app.canvas);

  const clock = new FixedTimestep(60, 5);
  let frameCount = 0;
  let fpsTime = performance.now();

  app.ticker.add(() => {
    const now = performance.now();

    frameCount++;
    if (now - fpsTime > 500) {
      frameCount = 0;
      fpsTime = now;
    }

    const { steps, alpha } = clock.tick();
    for (let s = 0; s < steps; s++) {
      pet.update(app.screen.width, app.screen.height);
    }

    pet.render(alpha);
  });
})();

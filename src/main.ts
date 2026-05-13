import { Loki } from './loki';
import type { Pet } from './pet';
import './style.css';
import 'pixi.js/math-extras';
import { Application } from 'pixi.js';

(async () => {
  const app = new Application();
  await app.init({ backgroundAlpha: 0, resizeTo: window });

  const pet: Pet = new Loki(app.screen.width / 2, app.screen.height / 2);

  app.stage.addChild(pet.container);

  document.body.appendChild(app.canvas);

  app.ticker.add((time) => {
    const delta = time.deltaTime;
    pet.update(delta, app.screen.width, app.screen.height);
  });
})();

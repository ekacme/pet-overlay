import './style.css';
import { Application } from 'pixi.js';

(async () => {
  const app = new Application();
  await app.init({ backgroundAlpha: 0, resizeTo: window });

  document.body.appendChild(app.canvas);
})();

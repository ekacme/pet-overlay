import { Loki } from './loki';
import type { AgentLayers, Pet } from './pet';
import './style.css';
import 'pixi.js/math-extras';
import { Application, Container } from 'pixi.js';
import { FixedTimestep } from './fixed_timestep';

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Missing element #${id}`);
  return e as T;
}

(async () => {
  const wrap = el<HTMLDivElement>('canvas-wrap');

  function calcSize() {
    const s = Math.min(wrap.clientWidth - 48, wrap.clientHeight - 48);
    return {
      w: Math.min(s, wrap.clientWidth - 48),
      h: Math.min(s, wrap.clientHeight - 48),
    };
  }

  const initial = calcSize();

  // Pixi application
  const app = new Application();
  await app.init({
    width: initial.w,
    height: initial.h,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    resizeTo: window,
  });
  wrap.appendChild(app.canvas);

  // Layers
  const debugLayer = new Container();
  const agentLayer = new Container();

  app.stage.addChild(agentLayer, debugLayer);

  // Pet management
  const layers: AgentLayers = {
    debug: debugLayer,
    agent: agentLayer,
  };

  let showDebug = true;

  const { width: w, height: h } = app.screen;
  const pet: Pet = new Loki(
    w * 0.3 + Math.random() * w * 0.4,
    h * 0.3 + Math.random() * h * 0.4,
    layers,
  );

  const clock = new FixedTimestep(60, 5);
  let frameCount = 0;
  let fpsTime = performance.now();

  // Resize
  window.addEventListener('resize', () => {
    const { w, h } = calcSize();
    app.renderer.resize(w, h);
  });

  app.ticker.add(() => {
    const now = performance.now();
    const { width: W, height: H } = app.screen;

    frameCount++;
    if (now - fpsTime > 500) {
      frameCount = 0;
      fpsTime = now;
    }

    const { steps, alpha } = clock.tick();
    for (let s = 0; s < steps; s++) {
      pet.update(W, H);
    }

    pet.drawDebug(showDebug);

    pet.render(alpha);
  });
})();

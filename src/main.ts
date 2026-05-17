import { Loki } from './loki';
import { petStateName, type PetLayers, type Pet, type PetConfig } from './pet';
import 'pixi.js/math-extras';
import { Application, Container, Graphics } from 'pixi.js';
import { FixedTimestep } from './fixed_timestep';
import { drawGrid, drawWalls } from './layers';
import { heading } from './vec';
import { cfg, initConfig } from './config';

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Missing element #${id}`);
  return e as T;
}

async function main(): Promise<void> {
  const wrap = el<HTMLDivElement>('canvas-wrap');

  function calcSize() {
    // const s = Math.min(wrap.clientWidth - 48, wrap.clientHeight - 48);
    // const result = {
    //   w: Math.min(s, wrap.clientWidth - 48),
    //   h: Math.min(s, wrap.clientHeight - 48),
    // };

    const result = {
      w: wrap.clientWidth - 48,
      h: wrap.clientHeight - 48,
    };
    console.log(result);
    return result;
  }

  const initial = calcSize();

  // Pixi application
  const app = new Application();
  await app.init({
    width: initial.w,
    height: initial.h,
    backgroundColor: 0x0a0c10,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    // resizeTo: window,
  });
  wrap.appendChild(app.canvas);

  // Layers
  const gridLayer = new Container();
  const wallLayer = new Container();
  const debugLayer = new Container();
  const petLayer = new Container();

  app.stage.addChild(gridLayer, wallLayer, petLayer, debugLayer);

  const gridGfx = new Graphics();
  gridLayer.addChild(gridGfx);
  const wallGfx = new Graphics();
  wallLayer.addChild(wallGfx);

  function drawStatic(): void {
    drawGrid(gridGfx, app.screen.width, app.screen.height);
    drawWalls(wallGfx, app.screen.width, app.screen.height);
  }
  drawStatic();

  // Pet management
  const layers: PetLayers = {
    debug: debugLayer,
    pet: petLayer,
  };

  let paused = false;
  let showDebug = true;

  const petConfig: PetConfig = {
    petSize: 0.5,
    wanderWeight: 0.4,
    maxSpeed: 2,
    wanderRadius: 60,
  };
  initConfig(petConfig);

  const { width: w, height: h } = app.screen;
  function createLoki(): Pet {
    return new Loki(w * 0.3 + Math.random() * w * 0.4, h * 0.3 + Math.random() * h * 0.4, layers, {
      petSize: cfg('petSize'),
      maxSpeed: cfg('maxSpeed'),
      wanderRadius: cfg('wanderRadius'),
      wanderWeight: cfg('wanderWeight'),
    });
  }

  let pet: Pet = createLoki();

  const clock = new FixedTimestep(60, 5);
  let frameCount = 0;
  let fpsTime = performance.now();

  // Resize
  window.addEventListener('resize', () => {
    const { w, h } = calcSize();
    app.renderer.resize(w, h);
    drawStatic();
  });

  app.ticker.add(() => {
    const now = performance.now();
    const { width: W, height: H } = app.screen;

    frameCount++;
    if (now - fpsTime > 500) {
      frameCount = 0;
      fpsTime = now;
    }

    if (paused) return;

    const { steps, alpha } = clock.tick();
    for (let s = 0; s < steps; s++) {
      pet.update(W, H);
    }

    pet.drawDebug(showDebug);

    pet.render(alpha);

    el('tSpeed').textContent = pet.velocity.magnitude().toFixed(1);
    el('tHeading').textContent =
      Math.round(((heading(pet.velocity) * 180) / Math.PI + 360) % 360) + '°';
    const stateEl = el('tState');
    stateEl.textContent = petStateName(pet.state);
    stateEl.style.color = '#e8a24e';
  });

  el('btnPause').addEventListener('click', function (this: HTMLButtonElement) {
    paused = !paused;
    this.textContent = paused ? 'Play' : 'Pause';
    this.classList.toggle('active', paused);
  });

  el('btnReset').addEventListener('click', () => {
    pet.destroy();
    pet = createLoki();
  });

  el('btnDebug').addEventListener('click', function (this: HTMLButtonElement) {
    showDebug = !showDebug;
    this.classList.toggle('active', showDebug);
  });

  el<HTMLInputElement>('wanderWeight').addEventListener('input', function () {
    const v = parseFloat(this.value);
    el('wanderVal').textContent = v.toFixed(2);
    pet.wanderWeight = v;
  });

  el<HTMLInputElement>('petSize').addEventListener('input', function () {
    const v = parseFloat(this.value);
    el('sizeVal').textContent = v.toFixed(1);
    pet.resize(v);
  });

  el<HTMLInputElement>('maxSpeed').addEventListener('input', function () {
    const v = parseFloat(this.value);
    el('speedVal').textContent = v.toFixed(1);
    pet.maxSpeed = v;
  });

  el<HTMLInputElement>('wanderRadius').addEventListener('input', function () {
    const v = parseFloat(this.value);
    el('radiusVal').textContent = String(v);
    pet.wanderRadius = v;
  });
}

main().catch(console.error);

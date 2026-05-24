import { Application, Container, Graphics } from 'pixi.js';
import { drawGrid, drawWalls } from './layers';
import type { PetLayers } from '../pets';

export interface Stage {
  app: Application;
  layers: PetLayers;
  foodLayer: Container;
}

const WRAP_PADDING = 48;

/**
 * Boot the Pixi application inside `wrap`: create the render layers, draw the
 * static background (grid + walls), and keep them sized to the container.
 */
export async function createStage(wrap: HTMLElement): Promise<Stage> {
  const size = () => ({
    w: wrap.clientWidth - WRAP_PADDING,
    h: wrap.clientHeight - WRAP_PADDING,
  });
  const initial = size();

  const app = new Application();
  await app.init({
    width: initial.w,
    height: initial.h,
    backgroundColor: 0x0a0c10,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  wrap.appendChild(app.canvas);

  // Draw order: grid → walls → food → pet → debug overlay.
  const gridLayer = new Container();
  const wallLayer = new Container();
  const foodLayer = new Container();
  const petLayer = new Container();
  const debugLayer = new Container();
  app.stage.addChild(gridLayer, wallLayer, foodLayer, petLayer, debugLayer);

  const gridGfx = new Graphics();
  gridLayer.addChild(gridGfx);
  const wallGfx = new Graphics();
  wallLayer.addChild(wallGfx);

  function drawStatic(): void {
    drawGrid(gridGfx, app.screen.width, app.screen.height);
    drawWalls(wallGfx, app.screen.width, app.screen.height);
  }
  drawStatic();

  window.addEventListener('resize', () => {
    const { w, h } = size();
    app.renderer.resize(w, h);
    drawStatic();
  });

  return { app, layers: { debug: debugLayer, pet: petLayer }, foodLayer };
}

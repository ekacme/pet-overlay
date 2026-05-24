import { Container, Graphics, Point } from 'pixi.js';
import { WALL_MARGIN } from '../world';

const FOOD_RADIUS = 5;
const MAX_FOOD = 40;
const FOOD_COLOR = 0x9be870;

/** Holds the food pellets in the world and renders them into its own layer. */
export class FoodField {
  private items: Point[] = [];
  private readonly gfx: Graphics;
  private dirty = true;

  constructor(layer: Container) {
    this.gfx = new Graphics();
    layer.addChild(this.gfx);
  }

  get count(): number {
    return this.items.length;
  }

  /** Live view of pellet positions, for behaviours to seek. */
  get positions(): readonly Point[] {
    return this.items;
  }

  /** Drop a pellet at a point, up to the max count. */
  spawn(x: number, y: number): void {
    if (this.items.length >= MAX_FOOD) return;
    this.items.push(new Point(x, y));
    this.dirty = true;
  }

  /** Drop a pellet at a random point inside the walls. */
  spawnRandom(canvasW: number, canvasH: number): void {
    const m = WALL_MARGIN + FOOD_RADIUS;
    this.spawn(m + Math.random() * (canvasW - 2 * m), m + Math.random() * (canvasH - 2 * m));
  }

  /** Remove one pellet within `radius` of `pos`. Returns true if one was eaten. */
  consumeNear(pos: Point, radius: number): boolean {
    const r2 = radius * radius;
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].subtract(pos).magnitudeSquared() <= r2) {
        this.items.splice(i, 1);
        this.dirty = true;
        return true;
      }
    }
    return false;
  }

  clear(): void {
    if (this.items.length === 0) return;
    this.items = [];
    this.dirty = true;
  }

  /** Redraw pellets when the set has changed. Call once per frame. */
  draw(): void {
    if (!this.dirty) return;
    this.gfx.clear();
    for (const p of this.items) {
      this.gfx.circle(p.x, p.y, FOOD_RADIUS).fill({ color: FOOD_COLOR });
    }
    this.dirty = false;
  }
}

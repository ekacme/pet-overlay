import { Graphics, Point } from 'pixi.js';
import { DeformingBodyPet, type PetLayers, type PetConfig } from './pet';
import { WanderBehaviour, WallAvoidanceBehaviour } from './behaviours';

const SWAY_FREQ = 3;
const SWAY_AMP = 0.5;
const MAX_BEND = 0.45;
const ELLIPSE_RES = 20;

const SEGMENTS = [
  { rx: 18, ry: 20, space: 0 },
  { rx: 15, ry: 17, space: 12 },
  { rx: 12, ry: 14, space: 12 },
  { rx: 8, ry: 10, space: 11 },
  { rx: 8, ry: 10, space: 9 },
] as const;

export class Loki extends DeformingBodyPet {
  private segPositions: Point[];
  private segAngles: number[];
  private time = 0;

  constructor(x: number, y: number, layers: PetLayers, config: PetConfig) {
    super(x, y, config, layers, [new WanderBehaviour(), new WallAvoidanceBehaviour()]);
    let off = 0;
    this.segPositions = SEGMENTS.map((s) => {
      off += s.space * this.size;
      return new Point(x - off, y);
    });
    this.segAngles = SEGMENTS.map(() => 0);
  }

  get bodyRadius(): number {
    return 40 * this.size;
  }

  override update(canvasW: number, canvasH: number): void {
    super.update(canvasW, canvasH);
    this.time += 0.04;
  }

  drawBody(gfx: Graphics, renderPos: Point): void {
    // Chain each segment behind the previous, clamping joint bend and applying sway
    this.segPositions[0].copyFrom(renderPos);
    for (let i = 1; i < this.segPositions.length; i++) {
      const prev = this.segPositions[i - 1];
      const cur = this.segPositions[i];
      let a = Math.atan2(prev.y - cur.y, prev.x - cur.x);

      if (i > 1) {
        const prevA = this.segAngles[i - 1];
        let delta = a - prevA;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        if (delta > MAX_BEND) delta = MAX_BEND;
        else if (delta < -MAX_BEND) delta = -MAX_BEND;
        a = prevA + delta;
      }
      this.segAngles[i] = a;

      const space = SEGMENTS[i].space * this.size;
      const wiggle = Math.sin(this.time * SWAY_FREQ + i * 0.6) * SWAY_AMP * this.size;
      cur.x = prev.x - Math.cos(a) * space + Math.cos(a + Math.PI / 2) * wiggle;
      cur.y = prev.y - Math.sin(a) * space + Math.sin(a + Math.PI / 2) * wiggle;
    }
    this.segAngles[0] = this.segAngles[1] ?? 0;

    const n = SEGMENTS.length;
    for (let i = n - 1; i >= 0; i--) {
      const rx = SEGMENTS[i].rx * this.size;
      const ry = SEGMENTS[i].ry * this.size;
      const pos = this.segPositions[i];
      const ang = this.segAngles[i];

      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const sx = pos.x - cosA * rx * 0.3;
      const sy = pos.y - sinA * rx * 0.3;

      const project = (lx: number, ly: number): [number, number] => [
        sx + lx * cosA - ly * sinA,
        sy + lx * sinA + ly * cosA,
      ];

      if (i === n - 1) {
        // Triangle tail: base toward body, tip pointing backward
        const [bx1, by1] = project(rx, -ry);
        const [bx2, by2] = project(rx, ry);
        const [tx, ty] = project(-rx, 0);
        gfx.moveTo(bx1, by1);
        gfx.lineTo(tx, ty);
        gfx.lineTo(bx2, by2);
      } else {
        // Rotated ellipse as polygon
        for (let k = 0; k < ELLIPSE_RES; k++) {
          const theta = (k / ELLIPSE_RES) * Math.PI * 2;
          const [px, py] = project(Math.cos(theta) * rx, Math.sin(theta) * ry);
          if (k === 0) gfx.moveTo(px, py);
          else gfx.lineTo(px, py);
        }
      }
      gfx.closePath();
      gfx.fill({ color: 0xad4d5f }).stroke({ width: 1, color: 0x333333 });
    }
  }
}

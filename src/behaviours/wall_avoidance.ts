import { Graphics, Point } from 'pixi.js';
import { fromAngle, heading, limit } from '../vec';
import { PetState, type Pet } from '../pet';
import type { Behaviour, SteerContext } from './types';

const WALL_MARGIN = 40;

export interface FeelerHit {
  tip: Point;
  hit: boolean;
  angle: number;
  len: number;
}

/** Steers back toward the canvas centre when feelers or proximity detect a wall. */
export class WallAvoidanceBehaviour implements Behaviour {
  private prevWallSteer = new Point();
  private lastForceMag = 0;

  // Exposed for the debug overlay.
  feelerHits: FeelerHit[] = [];
  closestWall = 999;

  steer(pet: Pet, ctx: SteerContext): Point {
    const { canvasW, canvasH } = ctx;
    const h = heading(pet.velocity);
    const maxForce = pet.maxSpeed * 0.18;
    const canvasCenter = new Point(canvasW / 2, canvasH / 2);

    const angles = [0, 0.45, -0.45];
    const lengths = [pet.feelerLength, pet.feelerLength * 0.7, pet.feelerLength * 0.7];
    let steer = new Point();
    this.feelerHits = [];

    const dists = [
      pet.position.x - WALL_MARGIN,
      canvasW - WALL_MARGIN - pet.position.x,
      pet.position.y - WALL_MARGIN,
      canvasH - WALL_MARGIN - pet.position.y,
    ];
    this.closestWall = Math.max(0, Math.min(...dists));

    for (let i = 0; i < 3; i++) {
      const feelerAngle = h + angles[i];
      const tip = pet.position.add(fromAngle(feelerAngle).multiplyScalar(lengths[i]));
      let hit = false;
      let overshot = 0;
      if (tip.x < WALL_MARGIN) {
        hit = true;
        overshot = Math.max(overshot, WALL_MARGIN - tip.x);
      }
      if (tip.x > canvasW - WALL_MARGIN) {
        hit = true;
        overshot = Math.max(overshot, tip.x - (canvasW - WALL_MARGIN));
      }
      if (tip.y < WALL_MARGIN) {
        hit = true;
        overshot = Math.max(overshot, WALL_MARGIN - tip.y);
      }
      if (tip.y < canvasH - WALL_MARGIN) {
        hit = true;
        overshot = Math.max(overshot, tip.y - (canvasH - WALL_MARGIN));
      }

      this.feelerHits.push({ tip, hit, angle: feelerAngle, len: lengths[i] });

      if (hit) {
        const toCenter = canvasCenter.subtract(pet.position);
        const desired = toCenter.normalize().multiplyScalar(pet.maxSpeed);
        const force = limit(desired.subtract(pet.velocity), maxForce);
        const t = Math.min(overshot / pet.feelerLength, 1.0);
        steer = steer.add(force.multiplyScalar(t * t * t * 0.8));
      }
    }

    const proximityThreshold = WALL_MARGIN * 2.5;
    const closestDist = Math.min(...dists);
    if (closestDist < proximityThreshold) {
      const t = 1.0 - closestDist / proximityThreshold;
      const toCenter = canvasCenter.subtract(pet.position);
      const desired = toCenter.normalize().multiplyScalar(pet.maxSpeed);
      const force = limit(desired.subtract(pet.velocity), maxForce);
      steer = steer.add(force.multiplyScalar(t * t * t * 0.8));
    }

    const raw = limit(steer, maxForce);
    const smoothing = 0.15;
    this.prevWallSteer = new Point(
      this.prevWallSteer.x + (raw.x - this.prevWallSteer.x) * smoothing,
      this.prevWallSteer.y + (raw.y - this.prevWallSteer.y) * smoothing,
    );

    const out = this.prevWallSteer.multiplyScalar(pet.wallWeight);
    this.lastForceMag = out.magnitude();
    return out;
  }

  activeState(): PetState | null {
    return this.lastForceMag > 0.3 ? PetState.AVOID : null;
  }

  drawDebug(pet: Pet, gfx: Graphics): void {
    for (const f of this.feelerHits) {
      gfx.moveTo(pet.position.x, pet.position.y);
      gfx.lineTo(f.tip.x, f.tip.y);
      gfx.stroke({
        width: f.hit ? 2 : 1,
        color: f.hit ? 0xe87e7e : 0xe8a24e,
        alpha: f.hit ? 0.7 : 0.15,
      });

      if (f.hit) {
        gfx.circle(f.tip.x, f.tip.y, 4);
        gfx.fill({ color: 0xe87e7e, alpha: 0.8 });
      }
    }
  }
}

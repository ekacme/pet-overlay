import { Graphics, Point } from 'pixi.js';
import { limit } from '../engine/vec';
import { PetState, type Pet } from '../pets/pet';
import type { Behaviour, SteerContext } from './types';

/** Distance from the target at which the pet starts easing its speed down. */
const ARRIVE_RADIUS = 20;

/** Steers toward the nearest food, slowing to a stop as it arrives. */
export class SeekArrivalBehaviour implements Behaviour {
  private target: Point | null = null;

  steer(pet: Pet, ctx: SteerContext): Point {
    this.target = nearest(pet.position, ctx.food);
    if (!this.target) return new Point();

    const toTarget = this.target.subtract(pet.position);
    const dist = toTarget.magnitude();
    if (dist === 0) return new Point();

    // Arrival: full speed outside the radius, easing to zero as we reach it.
    const speed = dist < ARRIVE_RADIUS ? pet.maxSpeed * (dist / ARRIVE_RADIUS) : pet.maxSpeed;
    const desired = toTarget.normalize().multiplyScalar(speed);
    const steer = limit(desired.subtract(pet.velocity), pet.maxSpeed * 0.2);

    return steer.multiplyScalar(pet.seekWeight);
  }

  activeState(): PetState | null {
    return this.target ? PetState.SEEK : null;
  }

  drawDebug(pet: Pet, gfx: Graphics): void {
    if (!this.target) return;
    const seekColor = 0x9be870;

    gfx.moveTo(pet.position.x, pet.position.y);
    gfx.lineTo(this.target.x, this.target.y);
    gfx.stroke({ width: 1.5, color: seekColor, alpha: 0.6 });

    gfx.circle(this.target.x, this.target.y, ARRIVE_RADIUS);
    gfx.stroke({ width: 1, color: seekColor, alpha: 0.12 });
  }
}

/** Nearest point in `food` to `pos`, or null if there's none. */
function nearest(pos: Point, food: readonly Point[]): Point | null {
  let best: Point | null = null;
  let bestDist = Infinity;
  for (const f of food) {
    const d = f.subtract(pos).magnitudeSquared();
    if (d < bestDist) {
      bestDist = d;
      best = f;
    }
  }
  return best;
}

import { Graphics, Point } from 'pixi.js';
import { createNoise2D, type NoiseFunction2D } from 'simplex-noise';
import { fromAngle, heading, limit } from '../vec';
import type { Pet } from '../pet';
import type { Behaviour } from './types';

/** Smooth noise-driven roaming around a circle projected ahead of the pet. */
export class WanderBehaviour implements Behaviour {
  private wanderAngle = Math.random() * Math.PI * 2;
  private noise2D: NoiseFunction2D = createNoise2D();
  private noiseTime = Math.random() * 100;

  // Exposed for the debug overlay.
  circleCenter = new Point();
  target = new Point();

  steer(pet: Pet): Point {
    const h = heading(pet.velocity);
    const wanderDist = pet.wanderRadius * 1.5;

    const center = pet.position.add(fromAngle(h).multiplyScalar(wanderDist));
    this.circleCenter.copyFrom(center);

    this.noiseTime += 0.008;
    const noiseVal = this.noise2D(this.noiseTime, this.noiseTime * 0.7);
    this.wanderAngle += noiseVal * 0.12;

    const target = center.add(fromAngle(this.wanderAngle).multiplyScalar(pet.wanderRadius));
    this.target.copyFrom(target);

    const desired = target.subtract(pet.position);
    const desiredNorm = desired.normalize().multiplyScalar(pet.maxSpeed);
    const steer = limit(desiredNorm.subtract(pet.velocity), 0.3);

    return steer.multiplyScalar(pet.wanderWeight);
  }

  drawDebug(pet: Pet, gfx: Graphics): void {
    const wanderColor = 0x5ec4d4;

    // Wander circle
    const cx = this.circleCenter.x;
    const cy = this.circleCenter.y;
    const segs = 32;
    for (let i = 0; i < segs; i += 2) {
      const a1 = (i / segs) * Math.PI * 2;
      const a2 = ((i + 1) / segs) * Math.PI * 2;
      gfx.moveTo(cx + Math.cos(a1) * pet.wanderRadius, cy + Math.sin(a1) * pet.wanderRadius);
      gfx.lineTo(cx + Math.cos(a2) * pet.wanderRadius, cy + Math.sin(a2) * pet.wanderRadius);
    }
    gfx.stroke({ width: 1, color: wanderColor, alpha: 0.5 });

    // Wander target dot
    gfx.circle(this.target.x, this.target.y, 4);
    gfx.fill({ color: wanderColor, alpha: 0.6 });

    // Line to wander target
    gfx.moveTo(pet.position.x, pet.position.y);
    gfx.lineTo(this.target.x, this.target.y);
    gfx.stroke({ width: 1, color: wanderColor, alpha: 0.15 });
  }
}

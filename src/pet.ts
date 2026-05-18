import { Container, Graphics, Point } from 'pixi.js';
import { createNoise2D, type NoiseFunction2D } from 'simplex-noise';
import { fromAngle, heading, lerp, limit } from './vec';

export const PetState = {
  WANDER: 0,
  AVOID: 1,
} as const;

type PetState = (typeof PetState)[keyof typeof PetState];

export function petStateName(state: PetState): string {
  return (
    Object.keys(PetState).find((k) => PetState[k as keyof typeof PetState] === state) ?? 'UNKNOWN'
  );
}

export interface PetConfig {
  petSize: number;
  maxSpeed: number;
  wanderRadius: number;
  wanderWeight: number;
  wallWeight: number;
  feelerLength: number;
}

export interface FeelerHit {
  tip: Point;
  hit: boolean;
  angle: number;
  len: number;
}

export interface PetLayers {
  debug: Container;
  pet: Container;
}

const WALL_MARGIN = 40;

export abstract class Pet {
  position: Point;
  prevPosition: Point;
  velocity: Point;

  protected size: number;
  state: PetState = PetState.WANDER;
  closestWall = 999;
  feelerHits: FeelerHit[] = [];

  wanderCircleCenter = new Point();
  wanderTarget = new Point();

  readonly debugGfx: Graphics;
  readonly bodyGfx: Graphics;

  private acceleration: Point = new Point();
  private wanderAngle: number;
  private noise2D: NoiseFunction2D;
  private noiseTime: number;
  private prevWallSteer = new Point();

  maxSpeed: number;
  // private maxForce: number;
  wanderRadius: number;
  wanderWeight: number;
  feelerLength: number;
  wallWeight: number;

  constructor(x: number, y: number, config: Partial<PetConfig>, layers: PetLayers) {
    this.position = new Point(x, y);
    this.prevPosition = new Point(x, y);

    const velocityAngle = Math.random() * Math.PI * 2;
    this.velocity = fromAngle(velocityAngle);

    this.wanderAngle = Math.random() * Math.PI * 2;
    this.noise2D = createNoise2D();
    this.noiseTime = Math.random() * 100;

    this.size = config.petSize ?? 0.5;
    this.maxSpeed = config.maxSpeed ?? 3;
    // this.maxForce = config.maxForce ?? 0.1;
    this.wanderRadius = config.wanderRadius ?? 50;
    this.wanderWeight = config.wanderWeight ?? 0.6;
    this.wallWeight = config.wallWeight ?? 1.8;
    this.feelerLength = config.feelerLength ?? 60;

    this.debugGfx = new Graphics();
    layers.debug.addChild(this.debugGfx);

    this.bodyGfx = new Graphics();
    layers.pet.addChild(this.bodyGfx);

    this.buildBody();
  }

  destroy(): void {
    this.debugGfx.destroy();
    this.bodyGfx.destroy();
  }

  abstract get bodyRadius(): number;
  abstract buildBody(): void;

  wander() {
    const h = heading(this.velocity);
    const wanderDist = this.wanderRadius * 1.5;

    const center = this.position.add(fromAngle(h).multiplyScalar(wanderDist));
    this.wanderCircleCenter.copyFrom(center);

    this.noiseTime += 0.008;
    const noiseVal = this.noise2D(this.noiseTime, this.noiseTime * 0.7);
    this.wanderAngle += noiseVal * 0.12;

    const target = center.add(fromAngle(this.wanderAngle).multiplyScalar(this.wanderRadius));
    this.wanderTarget.copyFrom(target);

    const desired = target.subtract(this.position);
    const desiredNorm = desired.normalize().multiplyScalar(this.maxSpeed);
    const steer = limit(desiredNorm.subtract(this.velocity), 0.3);

    return steer.multiplyScalar(this.wanderWeight);
  }

  private wallAvoidance(canvasW: number, canvasH: number): Point {
    const h = heading(this.velocity);
    const maxForce = this.maxSpeed * 0.18;
    const canvasCenter = new Point(canvasW / 2, canvasH / 2);

    const angles = [0, 0.45, -0.45];
    const lengths = [this.feelerLength, this.feelerLength * 0.7, this.feelerLength * 0.7];
    let steer = new Point();
    this.feelerHits = [];

    const dists = [
      this.position.x - WALL_MARGIN,
      canvasW - WALL_MARGIN - this.position.x,
      this.position.y - WALL_MARGIN,
      canvasH - WALL_MARGIN - this.position.y,
    ];
    this.closestWall = Math.max(0, Math.min(...dists));

    for (let i = 0; i < 3; i++) {
      const feelerAngle = h + angles[i];
      const tip = this.position.add(fromAngle(feelerAngle).multiplyScalar(lengths[i]));
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
        const toCenter = canvasCenter.subtract(this.position);
        const desired = toCenter.normalize().multiplyScalar(this.maxSpeed);
        const force = limit(desired.subtract(this.velocity), maxForce);
        const t = Math.min(overshot / this.feelerLength, 1.0);
        steer = steer.add(force.multiplyScalar(t * t * t * 0.8));
      }
    }

    const proximityThreshold = WALL_MARGIN * 2.5;
    const closestDist = Math.min(...dists);
    if (closestDist < proximityThreshold) {
      const t = 1.0 - closestDist / proximityThreshold;
      const toCenter = canvasCenter.subtract(this.position);
      const desired = toCenter.normalize().multiplyScalar(this.maxSpeed);
      const force = limit(desired.subtract(this.velocity), maxForce);
      steer = steer.add(force.multiplyScalar(t * t * t * 0.8));
    }

    const raw = limit(steer, maxForce);
    const smoothing = 0.15;
    this.prevWallSteer = new Point(
      this.prevWallSteer.x + (raw.x - this.prevWallSteer.x) * smoothing,
      this.prevWallSteer.y + (raw.y - this.prevWallSteer.y) * smoothing,
    );

    return this.prevWallSteer.multiplyScalar(this.wallWeight);
  }

  applyForce(force: Point) {
    this.acceleration = this.acceleration.add(force);
  }

  update(canvasW: number, canvasH: number) {
    const wanderForce = this.wander();
    const wallForce = this.wallAvoidance(canvasW, canvasH);

    // Apply forces
    this.applyForce(wanderForce);
    this.applyForce(wallForce);

    if (wallForce.magnitude() > 0.3) {
      this.state = PetState.AVOID;
    } else {
      this.state = PetState.WANDER;
    }

    this.velocity = limit(this.velocity.add(this.acceleration), this.maxSpeed);
    if (this.velocity.magnitude() < 0.5) {
      const dir = this.velocity.x === 0 && this.velocity.y === 0 ? new Point(1, 0) : this.velocity;
      this.velocity = dir.normalize().multiplyScalar(0.5);
    }

    // Update position values
    this.prevPosition.copyFrom(this.position);
    this.position = this.position.add(this.velocity);
    this.acceleration.set(0, 0);

    // Limit the pet to the container
    this.position.x = Math.max(5, Math.min(canvasW - 5, this.position.x));
    this.position.y = Math.max(5, Math.min(canvasH - 5, this.position.y));
  }

  resize(newSize: number) {
    this.size = newSize;
    this.buildBody();
  }

  drawDebug(showDebug: boolean): void {
    this.debugGfx.clear();
    this.debugGfx.visible = showDebug;
    if (!showDebug) return;

    const velocityColor = 0x7ee8a2;
    const wanderColor = 0x5ec4d4;

    // Wander circle
    const cx = this.wanderCircleCenter.x;
    const cy = this.wanderCircleCenter.y;
    const segs = 32;
    for (let i = 0; i < segs; i += 2) {
      const a1 = (i / segs) * Math.PI * 2;
      const a2 = ((i + 1) / segs) * Math.PI * 2;
      this.debugGfx.moveTo(
        cx + Math.cos(a1) * this.wanderRadius,
        cy + Math.sin(a1) * this.wanderRadius,
      );
      this.debugGfx.lineTo(
        cx + Math.cos(a2) * this.wanderRadius,
        cy + Math.sin(a2) * this.wanderRadius,
      );
    }
    this.debugGfx.stroke({ width: 1, color: wanderColor, alpha: 0.5 });

    // Wander target dot
    this.debugGfx.circle(this.wanderTarget.x, this.wanderTarget.y, 4);
    this.debugGfx.fill({ color: wanderColor, alpha: 0.6 });

    // Line to wander target
    this.debugGfx.moveTo(this.position.x, this.position.y);
    this.debugGfx.lineTo(this.wanderTarget.x, this.wanderTarget.y);
    this.debugGfx.stroke({ width: 1, color: wanderColor, alpha: 0.15 });

    // Feelers
    for (const f of this.feelerHits) {
      this.debugGfx.moveTo(this.position.x, this.position.y);
      this.debugGfx.lineTo(f.tip.x, f.tip.y);
      this.debugGfx.stroke({
        width: f.hit ? 2 : 1,
        color: f.hit ? 0xe87e7e : 0xe8a24e,
        alpha: f.hit ? 0.7 : 0.15,
      });

      if (f.hit) {
        this.debugGfx.circle(f.tip.x, f.tip.y, 4);
        this.debugGfx.fill({ color: 0xe87e7e, alpha: 0.8 });
      }
    }

    // Velocity vector
    const vEnd = this.position.add(this.velocity.normalize().multiplyScalar(25));
    this.debugGfx.moveTo(this.position.x, this.position.y);
    this.debugGfx.lineTo(vEnd.x, vEnd.y);
    this.debugGfx.stroke({ width: 1.5, color: velocityColor, alpha: 1 });
  }

  render(alpha: number) {
    const renderPos = lerp(this.prevPosition, this.position, alpha);
    const h = heading(this.velocity);

    this.bodyGfx.position.set(renderPos.x, renderPos.y);
    this.bodyGfx.rotation = h;
  }
}

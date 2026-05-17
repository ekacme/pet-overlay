import { Container, Graphics, Point } from 'pixi.js';
import { createNoise2D, type NoiseFunction2D } from 'simplex-noise';
import { fromAngle, heading, lerp, limit } from './vec';

const PetState = {
  WANDER: 0,
} as const;

type PetState = (typeof PetState)[keyof typeof PetState];

interface PetConfig {
  maxSpeed?: number;
  maxForce?: number;
  wanderDist?: number;
  wanderRadius?: number;
  wanderJitter?: number;
  wanderWeight?: number;
}

export interface AgentLayers {
  debug: Container;
  agent: Container;
}

export abstract class Pet {
  position: Point;
  prevPosition: Point;
  velocity: Point;

  state: PetState;
  protected size: number;

  wanderCircleCenter = new Point();
  wanderTarget = new Point();

  readonly debugGfx: Graphics;
  readonly bodyGfx: Graphics;

  private acceleration: Point = new Point();
  private wanderAngle: number;
  private noise2D: NoiseFunction2D;
  private noiseTime: number;

  private maxSpeed: number;
  // private maxForce: number;
  private wanderRadius: number;
  private wanderWeight: number;

  constructor(x: number, y: number, config: PetConfig = {}, layers: AgentLayers) {
    this.position = new Point(x, y);
    this.prevPosition = new Point(x, y);

    const velocityAngle = Math.random() * Math.PI * 2;
    this.velocity = fromAngle(velocityAngle);

    this.wanderAngle = Math.random() * Math.PI * 2;
    this.noise2D = createNoise2D();
    this.noiseTime = Math.random() * 100;

    this.size = 0.5;
    this.state = PetState.WANDER;

    this.maxSpeed = config.maxSpeed ?? 3;
    // this.maxForce = config.maxForce ?? 0.1;
    this.wanderRadius = config.wanderRadius ?? 50;
    this.wanderWeight = config.wanderWeight ?? 0.6;

    this.debugGfx = new Graphics();
    layers.debug.addChild(this.debugGfx);

    this.bodyGfx = new Graphics();
    layers.agent.addChild(this.bodyGfx);

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

  applyForce(force: Point) {
    this.acceleration = this.acceleration.add(force);
  }

  update(canvasW: number, canvasH: number) {
    const wanderForce = this.wander();

    // Apply forces
    this.applyForce(wanderForce);

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

  drawDebug(showDebug: boolean): void {
    this.debugGfx.clear();
    this.debugGfx.visible = showDebug;
    if (!showDebug) return;

    const velocityColor = 0x7ee8a2;
    const wanderColor = 0x3254a8;

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

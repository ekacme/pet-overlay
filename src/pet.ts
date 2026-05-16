import { Container, Point } from 'pixi.js';
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

export abstract class Pet {
  container: Container;

  position: Point;
  prevPosition: Point;
  velocity: Point;
  acceleration: Point;
  size: number;
  state: PetState;

  wanderAngle: number;
  wanderRadius: number;
  wanderWeight: number;

  maxSpeed: number;
  maxForce: number;

  noise2D: NoiseFunction2D;
  noiseTime: number;

  constructor(x: number, y: number, config: PetConfig = {}) {
    this.container = new Container();

    this.position = new Point(x, y);
    this.prevPosition = new Point(x, y);

    const velocityAngle = Math.random() * Math.PI * 2;
    this.velocity = fromAngle(velocityAngle);
    this.acceleration = new Point(0, 0);

    this.wanderAngle = Math.random() * Math.PI * 2;
    this.noise2D = createNoise2D();
    this.noiseTime = Math.random() * 100;

    this.size = 0.5;
    this.state = PetState.WANDER;

    this.maxSpeed = config.maxSpeed ?? 3;
    this.maxForce = config.maxForce ?? 0.1;
    this.wanderRadius = config.wanderRadius ?? 50;
    this.wanderWeight = config.wanderWeight ?? 0.6;

    this.container.rotation = velocityAngle;

    this.buildBody();
  }

  abstract get bodyRadius(): number;
  abstract buildBody(): void;

  wander() {
    const h = heading(this.velocity);
    const wanderDist = this.wanderRadius * 1.5;

    const center = this.position.add(fromAngle(h).multiplyScalar(wanderDist));

    this.noiseTime += 0.008;
    const noiseVal = this.noise2D(this.noiseTime, this.noiseTime * 0.7);
    this.wanderAngle += noiseVal * 0.12;

    const target = center.add(fromAngle(this.wanderAngle).multiplyScalar(this.wanderRadius));

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

  render(alpha: number) {
    const renderPos = lerp(this.prevPosition, this.position, alpha);
    const h = heading(this.velocity);

    this.container.position.set(renderPos.x, renderPos.y);
    this.container.rotation = h;
  }
}

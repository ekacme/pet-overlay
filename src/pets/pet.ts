import { Container, Graphics, Point } from 'pixi.js';
import { fromAngle, heading, lerp, limit } from '../engine/vec';
import type { Behaviour, SteerContext } from '../behaviours';

export const PetState = {
  WANDER: 0,
  AVOID: 1,
  SEEK: 2,
  EATING: 3,
} as const;

export type PetState = (typeof PetState)[keyof typeof PetState];

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
  seekWeight: number;
  /** Seconds the pet spends eating a pellet before it's consumed. */
  eatDuration: number;
}

export interface PetLayers {
  debug: Container;
  pet: Container;
}

/**
 * Shared simulation core for every pet: steering, integration and debug
 * overlays. Subclasses don't extend this directly — they pick a *body
 * strategy* by extending {@link StaticBodyPet} or {@link DeformingBodyPet},
 * which decide how/when geometry is drawn each frame.
 */
export abstract class Pet {
  position: Point;
  prevPosition: Point;
  velocity: Point;

  protected size: number;
  state: PetState = PetState.WANDER;

  /** Composable steering behaviours, summed each frame. Supplied by subclasses. */
  protected behaviours: Behaviour[];

  readonly debugGfx: Graphics;
  readonly bodyGfx: Graphics;

  private acceleration: Point = new Point();

  maxSpeed: number;
  wanderRadius: number;
  wanderWeight: number;
  feelerLength: number;
  wallWeight: number;
  seekWeight: number;
  eatDuration: number;

  constructor(
    x: number,
    y: number,
    config: Partial<PetConfig>,
    layers: PetLayers,
    behaviours: Behaviour[],
  ) {
    this.position = new Point(x, y);
    this.prevPosition = new Point(x, y);

    const velocityAngle = Math.random() * Math.PI * 2;
    this.velocity = fromAngle(velocityAngle);

    this.size = config.petSize ?? 0.5;
    this.maxSpeed = config.maxSpeed ?? 3;
    this.wanderRadius = config.wanderRadius ?? 50;
    this.wanderWeight = config.wanderWeight ?? 0.6;
    this.wallWeight = config.wallWeight ?? 1.8;
    this.feelerLength = config.feelerLength ?? 60;
    this.seekWeight = config.seekWeight ?? 1.2;
    this.eatDuration = config.eatDuration ?? 1.5;

    this.behaviours = behaviours;

    this.debugGfx = new Graphics();
    layers.debug.addChild(this.debugGfx);

    this.bodyGfx = new Graphics();
    layers.pet.addChild(this.bodyGfx);
  }

  destroy(): void {
    this.debugGfx.destroy();
    this.bodyGfx.destroy();
  }

  /** Draw the interpolated body for this frame. The body strategy decides how. */
  abstract render(alpha: number): void;

  applyForce(force: Point) {
    this.acceleration = this.acceleration.add(force);
  }

  update(ctx: SteerContext) {
    // Sum the steering forces from every behaviour.
    for (const b of this.behaviours) {
      this.applyForce(b.steer(this, ctx));
    }

    // First behaviour that wants to report a state wins; otherwise wander.
    let nextState: PetState = PetState.WANDER;
    for (const b of this.behaviours) {
      const s = b.activeState?.();
      if (s != null) {
        nextState = s;
        break;
      }
    }
    this.state = nextState;

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
    this.position.x = Math.max(5, Math.min(ctx.canvasW - 5, this.position.x));
    this.position.y = Math.max(5, Math.min(ctx.canvasH - 5, this.position.y));
  }

  /**
   * Hold still for one simulation step while eating: no steering or movement,
   * but the body keeps facing its last direction. Subclasses may override to
   * keep animating in place (see {@link Loki}). Drives the EATING state.
   */
  hold(): void {
    this.prevPosition.copyFrom(this.position);
    this.acceleration.set(0, 0);
    this.state = PetState.EATING;
  }

  resize(newSize: number) {
    this.size = newSize;
  }

  drawDebug(showDebug: boolean): void {
    this.debugGfx.clear();
    this.debugGfx.visible = showDebug;
    if (!showDebug) return;

    // Each behaviour draws its own overlay (feelers, wander circle, ...).
    for (const b of this.behaviours) {
      b.drawDebug?.(this, this.debugGfx);
    }

    // Velocity vector
    const velocityColor = 0x7ee8a2;
    const vEnd = this.position.add(this.velocity.normalize().multiplyScalar(25));
    this.debugGfx.moveTo(this.position.x, this.position.y);
    this.debugGfx.lineTo(vEnd.x, vEnd.y);
    this.debugGfx.stroke({ width: 1.5, color: velocityColor, alpha: 1 });
  }
}

/**
 * Body strategy for rigid shapes: geometry is drawn **once** into `bodyGfx`
 * (in local space) and reused. Each frame only the container's position and
 * rotation change, so movement is cheap. The geometry is rebuilt lazily after
 * construction or a resize — never from the constructor, so subclass fields are
 * guaranteed to be initialised by the time {@link buildBody} runs.
 */
export abstract class StaticBodyPet extends Pet {
  private bodyDirty = true;

  /** Draw the body once, in local space (origin = pet position, +x = forward). */
  abstract buildBody(gfx: Graphics): void;

  override resize(newSize: number): void {
    super.resize(newSize);
    this.bodyDirty = true;
  }

  render(alpha: number): void {
    if (this.bodyDirty) {
      this.bodyGfx.clear();
      this.buildBody(this.bodyGfx);
      this.bodyDirty = false;
    }

    const renderPos = lerp(this.prevPosition, this.position, alpha);
    this.bodyGfx.position.set(renderPos.x, renderPos.y);
    this.bodyGfx.rotation = heading(this.velocity);
  }
}

/**
 * Body strategy for deforming shapes (undulating chains, flapping wings):
 * `bodyGfx` is cleared and redrawn in world space every frame. The container
 * transform is reset to identity; the subclass draws everything itself.
 */
export abstract class DeformingBodyPet extends Pet {
  /**
   * Redraw the whole body for this frame.
   * @param gfx       cleared graphics to draw into (world space)
   * @param renderPos interpolated pet position for this frame
   * @param heading   current facing angle, in radians
   */
  abstract drawBody(gfx: Graphics, renderPos: Point, heading: number): void;

  render(alpha: number): void {
    const renderPos = lerp(this.prevPosition, this.position, alpha);

    this.bodyGfx.position.set(0, 0);
    this.bodyGfx.rotation = 0;
    this.bodyGfx.clear();

    this.drawBody(this.bodyGfx, renderPos, heading(this.velocity));
  }
}

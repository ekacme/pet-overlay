import type { Graphics, Point } from 'pixi.js';
import type { Pet, PetState } from '../pets/pet';

export interface SteerContext {
  canvasW: number;
  canvasH: number;
  /** Positions of all food currently in the world. */
  food: readonly Point[];
}

/**
 * A composable steering behaviour. A pet assembles a list of these and sums
 * the forces they return each frame, so different species can be built from
 * different combinations (e.g. a bird vs an anomalocaris) without subclassing
 * the movement code.
 */
export interface Behaviour {
  /** Steering force contributed this frame. */
  steer(pet: Pet, ctx: SteerContext): Point;
  /** Optional behaviour-specific debug overlay. */
  drawDebug?(pet: Pet, gfx: Graphics): void;
  /** State this behaviour wants the pet to report while it's active, or null. */
  activeState?(): PetState | null;
}

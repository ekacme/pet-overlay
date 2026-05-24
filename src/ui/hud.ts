import { el } from './dom';
import { petStateName, type Pet } from '../pets';
import { heading } from '../engine/vec';
import { FpsMeter } from '../engine/fps_meter';

/** The on-screen telemetry readouts (speed / heading / state) and FPS counter. */
export class Hud {
  private readonly tSpeed = el('tSpeed');
  private readonly tHeading = el('tHeading');
  private readonly tState = el('tState');
  private readonly fpsEl = el('fps');
  private readonly fps = new FpsMeter();

  /** Refresh the FPS readout. Call every render frame, even while paused. */
  tickFps(now: number): void {
    const fps = this.fps.tick(now);
    if (fps !== null) this.fpsEl.textContent = `${fps} FPS`;
  }

  /** Refresh the pet telemetry. Call when the simulation advances. */
  update(pet: Pet): void {
    this.tSpeed.textContent = pet.velocity.magnitude().toFixed(1);
    this.tHeading.textContent =
      Math.round(((heading(pet.velocity) * 180) / Math.PI + 360) % 360) + '°';
    this.tState.textContent = petStateName(pet.state);
  }
}

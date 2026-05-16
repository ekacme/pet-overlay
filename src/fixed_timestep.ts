export class FixedTimestep {
  private readonly step: number;
  private readonly maxSteps: number;
  private accumulator = 0;
  private lastTime = performance.now();

  constructor(hz = 60, maxSteps = 5) {
    this.step = 1 / hz;
    this.maxSteps = maxSteps;
  }

  /**
   * Call once per render frame.
   * Returns { steps, alpha } where:
   *   steps = number of physics ticks to run this frame
   *   alpha = interpolation factor for rendering (0..1)
   */
  tick(): { steps: number; alpha: number } {
    const now = performance.now();
    const frameDelta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.accumulator += Math.min(frameDelta, this.maxSteps * this.step);

    let steps = 0;
    while (this.accumulator >= this.step && steps < this.maxSteps) {
      this.accumulator -= this.step;
      steps++;
    }

    const alpha = this.accumulator / this.step;
    return { steps, alpha };
  }
}

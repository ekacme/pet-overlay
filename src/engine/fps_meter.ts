/** Counts render frames and reports a smoothed FPS at a fixed interval. */
export class FpsMeter {
  private frames = 0;
  private last = performance.now();
  private readonly interval: number;

  constructor(intervalMs = 500) {
    this.interval = intervalMs;
  }

  /**
   * Call once per render frame. Returns the measured FPS when a new sample is
   * ready (every `intervalMs`), otherwise `null`.
   */
  tick(now: number): number | null {
    this.frames++;
    const elapsed = now - this.last;
    if (elapsed < this.interval) return null;

    const fps = Math.round((this.frames * 1000) / elapsed);
    this.frames = 0;
    this.last = now;
    return fps;
  }
}

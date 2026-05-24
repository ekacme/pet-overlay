import { Graphics } from 'pixi.js';
import { WALL_MARGIN } from '../world';

/** Draw the subtle background grid. */
export function drawGrid(gfx: Graphics, w: number, h: number): void {
  gfx.clear();
  const step = 40;
  for (let x = step; x < w; x += step) {
    gfx.moveTo(x, 0);
    gfx.lineTo(x, h);
  }
  for (let y = step; y < h; y += step) {
    gfx.moveTo(0, y);
    gfx.lineTo(w, y);
  }
  gfx.stroke({ width: 0.5, color: 0x1e2230, alpha: 0.5 });
}

/** Draw wall gradient zones and dashed boundary lines. */
export function drawWalls(gfx: Graphics, w: number, h: number): void {
  gfx.clear();
  const margin = WALL_MARGIN;

  // Soft gradient zones (approximated with alpha rects)
  for (let i = 0; i < margin; i++) {
    const a = (1 - i / margin) * 0.05;
    gfx
      .rect(i, 0, 1, h) // left
      .rect(w - i - 1, 0, 1, h) // right
      .rect(0, i, w, 1) // top
      .rect(0, h - i - 1, w, 1) // bottom
      .fill({ color: 0xe87e7e, alpha: a });
  }

  // Dashed border
  const dashLen = 6;
  const gapLen = 8;
  const total = dashLen + gapLen;

  for (let x = margin; x < w - margin; x += total) {
    gfx.moveTo(x, margin);
    gfx.lineTo(Math.min(x + dashLen, w - margin), margin);
    gfx.moveTo(x, h - margin);
    gfx.lineTo(Math.min(x + dashLen, w - margin), h - margin);
  }
  for (let y = margin; y < h - margin; y += total) {
    gfx.moveTo(margin, y);
    gfx.lineTo(margin, Math.min(y + dashLen, h - margin));
    gfx.moveTo(w - margin, y);
    gfx.lineTo(w - margin, Math.min(y + dashLen, h - margin));
  }
  gfx.stroke({ width: 1, color: 0xe87e7e, alpha: 0.12 });
}

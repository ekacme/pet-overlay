import { Point } from 'pixi.js';
import 'pixi.js/math-extras';

export function limit(v: Point, max: number): Point {
  const m = v.magnitude();
  if (m <= max) return v.clone();
  const n = v.normalize();
  return n.multiplyScalar(max);
}

export function heading(v: Point): number {
  return Math.atan2(v.y, v.x);
}

export function fromAngle(angle: number): Point {
  return new Point(Math.cos(angle), Math.sin(angle));
}

export function lerp(a: Point, b: Point, t: number): Point {
  return new Point(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
}

import { Container, Point } from 'pixi.js';

export abstract class Pet {
  container: Container;

  position: Point;
  velocity: Point;
  size: number;

  constructor(x: number, y: number) {
    this.container = new Container();

    this.position = new Point(x, y);
    this.velocity = new Point(-1, 0);
    this.size = 1;

    this.draw();
  }

  abstract get bodyRadius(): number;
  abstract draw(): void;

  update(delta: number, screenW: number, screenH: number) {
    this.container.x = this.position.x;
    this.container.y = this.position.y;
  }
}

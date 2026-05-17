import { Graphics } from 'pixi.js';
import { Pet, type PetLayers, type PetConfig } from './pet';

const BODY_RX = 40;
const BODY_RY = 20;
const EYE_RX = 7;
const EYE_RY = 5;
const EYE_OFFSET_X = 30;
const EYE_OFFSET_Y = 11;
const PUPIL_RX = 2;
const PUPIL_RY = 3;

export class Loki extends Pet {
  constructor(x: number, y: number, layers: PetLayers, config: PetConfig) {
    const defaults: PetConfig = {
      maxSpeed: 2,
      wanderRadius: 60,
      wanderWeight: 0.4,
    };
    super(x, y, { ...defaults, ...config }, layers);

    this.buildBody();
  }

  get bodyRadius(): number {
    return BODY_RX * this.size;
  }

  buildBody() {
    this.bodyGfx.removeChildren();

    const body = new Graphics();
    body.ellipse(0, 0, BODY_RX * this.size, BODY_RY * this.size);
    body.fill('orange');
    this.bodyGfx.addChild(body);

    const eyeLeft = new Graphics();
    eyeLeft.ellipse(
      EYE_OFFSET_X * this.size,
      -EYE_OFFSET_Y * this.size,
      EYE_RX * this.size,
      EYE_RY * this.size,
    );
    eyeLeft.fill(0xffffff).stroke({ width: 1, color: 'orange' });
    this.bodyGfx.addChild(eyeLeft);

    const eyeRight = new Graphics();
    eyeRight.ellipse(
      EYE_OFFSET_X * this.size,
      EYE_OFFSET_Y * this.size,
      EYE_RX * this.size,
      EYE_RY * this.size,
    );
    eyeRight.fill(0xffffff).stroke({ width: 1, color: 'orange' });
    this.bodyGfx.addChild(eyeRight);

    const pupilLeft = new Graphics();
    pupilLeft.ellipse(
      EYE_OFFSET_X * this.size,
      -EYE_OFFSET_Y * this.size,
      PUPIL_RX * this.size,
      PUPIL_RY * this.size,
    );
    pupilLeft.fill(0x000000);
    this.bodyGfx.addChild(pupilLeft);

    const pupilRight = new Graphics();
    pupilRight.ellipse(
      EYE_OFFSET_X * this.size,
      EYE_OFFSET_Y * this.size,
      PUPIL_RX * this.size,
      PUPIL_RY * this.size,
    );
    pupilRight.fill(0x000000);
    this.bodyGfx.addChild(pupilRight);
  }
}

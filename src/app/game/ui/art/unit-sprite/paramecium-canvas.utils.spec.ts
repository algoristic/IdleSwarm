import { UNIT_SPRITE_COLORS } from '../art-palette';
import { drawParamecium } from './paramecium-canvas.utils';

class FakeContext {
  ops: string[] = [];
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  lineJoin = '';
  lineCap = '';
  globalAlpha = 1;
  turn = 0;

  #record(op: string, ...args: number[]): void {
    this.ops.push([op, ...args.map((v) => v.toFixed(2))].join(' '));
  }

  save(): void {
    this.#record('save');
  }

  restore(): void {
    this.#record('restore');
  }

  beginPath(): void {
    this.#record('beginPath');
  }

  closePath(): void {
    this.#record('closePath');
  }

  moveTo(x: number, y: number): void {
    this.#record('moveTo', x, y);
  }

  lineTo(x: number, y: number): void {
    this.#record('lineTo', x, y);
  }

  bezierCurveTo(...args: number[]): void {
    this.#record('bezierCurveTo', ...args);
  }

  arc(x: number, y: number, r: number): void {
    this.#record('arc', x, y, r);
  }

  ellipse(x: number, y: number, rx: number, ry: number): void {
    this.#record('ellipse', x, y, rx, ry);
  }

  scale(x: number, y: number): void {
    this.#record('scale', x, y);
  }

  translate(x: number, y: number): void {
    this.#record('translate', x, y);
  }

  getTransform(): { a: number; b: number } {
    return { a: Math.cos(this.turn), b: Math.sin(this.turn) };
  }

  clip(): void {
    this.#record('clip');
  }

  fill(): void {
    this.ops.push(`fill ${this.fillStyle} ${this.globalAlpha}`);
  }

  stroke(): void {
    this.ops.push(`stroke ${this.strokeStyle} ${this.lineWidth}`);
  }
}

function draw(
  time: number,
  offset: number,
  detail: 'full' | 'reduced',
  turn = 0,
  variant = 0,
): string[] {
  const ctx = new FakeContext();
  ctx.turn = turn;
  drawParamecium(ctx as unknown as CanvasRenderingContext2D, variant, time, offset, detail);
  return ctx.ops;
}

const COLORS = UNIT_SPRITE_COLORS.eater;
const paints = (ops: string[]): string[] =>
  ops.filter((op) => op.startsWith('fill') || op.startsWith('stroke'));

describe('drawParamecium', () => {
  it('zeichnet die Schichten wie das SVG', () => {
    const ops = paints(draw(0, 0, 'full'));
    expect(ops.slice(0, 9)).toEqual([
      `fill ${COLORS.glow} 0.14`,
      `stroke ${COLORS.glow} 4`,
      `stroke ${COLORS.cilia} 0.4`,
      `fill ${COLORS.rim} 1`,
      `stroke ${COLORS.rim} 1.4`,
      `fill ${COLORS.shade} 1`,
      `fill ${COLORS.body} 1`,
      `fill ${COLORS.inner} 1`,
      `fill ${COLORS.groove} 1`,
    ]);
    expect(ops).toContain(`fill ${COLORS.food} 1`);
    expect(ops).toContain(`fill ${COLORS.nucleus} 1`);
    expect(ops).toContain(`fill ${COLORS.micronucleus} 1`);
    expect(ops.at(-1)).toBe(`fill ${COLORS.vacuole} 1`);
  });

  it('lässt reduziert Leuchtsaum, Nahrung und Vakuolen weg, aber nicht die Wimpern', () => {
    const ops = paints(draw(0, 0, 'reduced'));
    expect(ops).toContain(`stroke ${COLORS.cilia} 0.55`);
    for (const color of [COLORS.glow, COLORS.food, COLORS.vacuole]) {
      expect(ops.some((op) => op.includes(color))).toBe(false);
    }
  });

  it('bewegt sich mit der Zeit und nach dem Versatz', () => {
    expect(draw(0.5, 0, 'full')).not.toEqual(draw(0, 0, 'full'));
    expect(draw(0.5, 0, 'full')).toEqual(draw(0, 0.5, 'full'));
  });

  it('rollt um die Längsachse', () => {
    expect(draw(0, 0, 'full')[1]).toBe('scale 1.00 1.00');
    expect(draw(1.2, 0, 'full')[1]).toBe('scale 1.00 0.94');
  });

  it('hält das Licht oben links, wie auch immer die Figur gedreht ist', () => {
    const light = (ops: string[]): string | undefined =>
      ops.find((op) => op.startsWith('translate'));
    expect(light(draw(0, 0, 'full'))).toBe('translate -0.50 -1.10');
    expect(light(draw(0, 0, 'full', Math.PI / 2))).toBe('translate -1.10 0.50');
  });

  it('zeichnet die Varianten verschieden', () => {
    expect(draw(0, 0, 'full', 0, 1)).not.toEqual(draw(0, 0, 'full'));
  });
});

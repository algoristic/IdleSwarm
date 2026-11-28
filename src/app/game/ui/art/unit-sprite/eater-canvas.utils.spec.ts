import { UNIT_SPRITE_COLORS } from '../art-palette';
import { drawEater } from './eater-canvas.utils';

class FakeContext {
  ops: string[] = [];
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  lineJoin = '';
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

  bezierCurveTo(...args: number[]): void {
    this.#record('bezierCurveTo', ...args);
  }

  arc(x: number, y: number, r: number): void {
    this.#record('arc', x, y, r);
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

function draw(...args: [number, number, number, 'full' | 'reduced']): string[] {
  return drawTurned(0, ...args);
}

function drawTurned(turn: number, ...args: [number, number, number, 'full' | 'reduced']): string[] {
  const ctx = new FakeContext();
  ctx.turn = turn;
  drawEater(ctx as unknown as CanvasRenderingContext2D, ...args);
  return ctx.ops;
}

const translates = (ops: string[]): string[] => ops.filter((op) => op.startsWith('translate'));

const COLORS = UNIT_SPRITE_COLORS.eater;

describe('drawEater', () => {
  it('zeichnet die Schichten wie das SVG', () => {
    const fills = draw(0, 0, 0, 'full').filter((op) => op.startsWith('fill'));
    expect(fills.slice(0, 5)).toEqual([
      `fill ${COLORS.glow} 0.14`,
      `fill ${COLORS.rim} 1`,
      `fill ${COLORS.shade} 1`,
      `fill ${COLORS.body} 1`,
      `fill ${COLORS.inner} 1`,
    ]);
    expect(fills).toContain(`fill ${COLORS.alga} 1`);
    expect(fills.at(-2)).toBe(`fill ${COLORS.nucleus} 1`);
    expect(fills.at(-1)).toBe(`fill ${COLORS.vacuole} 1`);
  });

  it('lässt reduziert Leuchtsaum, Algen und Vakuole weg', () => {
    const fills = draw(0, 0, 0, 'reduced').filter((op) => op.startsWith('fill'));
    expect(fills).toEqual([
      `fill ${COLORS.rim} 1`,
      `fill ${COLORS.shade} 1`,
      `fill ${COLORS.body} 1`,
      `fill ${COLORS.inner} 1`,
      `fill ${COLORS.nucleus} 1`,
    ]);
  });

  it('bewegt sich mit der Zeit und nach dem Versatz', () => {
    expect(draw(0, 1.5, 0, 'full')).not.toEqual(draw(0, 0, 0, 'full'));
    expect(draw(0, 1.5, 0, 'full')).toEqual(draw(0, 0, 1.5, 'full'));
  });

  it('zeichnet die Varianten verschieden', () => {
    expect(draw(1, 0, 0, 'full')).not.toEqual(draw(0, 0, 0, 'full'));
  });

  it('hält das Licht oben links, wie auch immer die Figur gedreht ist', () => {
    expect(translates(draw(0, 0, 0, 'full'))[0]).toBe('translate -0.50 -1.10');
    expect(translates(drawTurned(Math.PI / 2, 0, 0, 0, 'full'))[0]).toBe('translate -1.10 0.50');
  });

  it('lässt Algen und Kern im Schub nach vorn strömen', () => {
    expect(translates(draw(0, 0, 0, 'full'))).toContain('translate 0.00 0.00');
    expect(translates(draw(0, 3, 0, 'full'))).toContain('translate 0.80 0.00');
  });
});

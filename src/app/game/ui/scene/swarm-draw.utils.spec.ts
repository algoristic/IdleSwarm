import { UnitId } from '../../domain/models/unit.model';
import { SwarmSprite } from './models/swarm.model';
import { buildSwarmDrift, drawSwarmFrame, spriteDocument, spritePixels } from './swarm-draw.utils';
import { swarmFigures } from './swarm-formation.utils';
import { flowRotation, nextTrek } from './swarm-motion.utils';
import { SWARM_FIXTURE } from './swarm.fixture';

let pathCount = 0;

class FakePath {
  id = `p${pathCount++}`;
  ops: string[] = [];

  moveTo(x: number, y: number): void {
    this.ops.push(`M ${x} ${y}`);
  }

  lineTo(x: number, y: number): void {
    this.ops.push(`L ${x} ${y}`);
  }

  arc(x: number, y: number, r: number, a0: number, a1: number): void {
    this.ops.push(`A ${x} ${y} ${r} ${a0} ${a1}`);
  }
}

class FakeContext {
  ops: string[] = [];
  canvas = { width: 1020, height: 1200 };
  #matrices = 0;

  set globalAlpha(v: number) {
    this.ops.push(`globalAlpha=${v}`);
  }

  set strokeStyle(v: string) {
    this.ops.push(`strokeStyle=${v}`);
  }

  set lineWidth(v: number) {
    this.ops.push(`lineWidth=${v}`);
  }

  set fillStyle(v: string) {
    this.ops.push(`fillStyle=${v}`);
  }

  set lineCap(v: string) {
    this.ops.push(`lineCap=${v}`);
  }

  setTransform(...args: (number | { id: number })[]): void {
    const values = args.map((v) => (typeof v === 'object' ? `m${v.id}` : v));
    this.ops.push(`setTransform ${values.join(' ')}`);
  }

  getTransform(): { id: number } {
    const id = ++this.#matrices;
    this.ops.push(`getTransform m${id}`);
    return { id };
  }

  clearRect(...args: number[]): void {
    this.ops.push(`clearRect ${args.join(' ')}`);
  }

  rotate(a: number): void {
    this.ops.push(`rotate ${a}`);
  }

  translate(x: number, y: number): void {
    this.ops.push(`translate ${x} ${y}`);
  }

  scale(x: number, y: number): void {
    this.ops.push(`scale ${x} ${y}`);
  }

  stroke(path: FakePath): void {
    this.ops.push(`stroke ${path.id}`);
  }

  fill(path: FakePath): void {
    this.ops.push(`fill ${path.id}`);
  }

  drawImage(image: string, ...args: number[]): void {
    this.ops.push(`drawImage ${image} ${args.join(' ')}`);
  }
}

const SPRITE_UNITS: [UnitId, number][] = [
  ['eater', 12],
  ['brooder', 20],
  ['eggBearer', 24],
  ['clutch', 28],
  ['broodClump', 37],
];

function withoutUnits(ops: readonly string[], units: readonly UnitId[]): string[] {
  const result: string[] = [];
  for (const op of ops) {
    if (units.some((unit) => op.startsWith(`drawImage ${unit} `))) {
      let start = result.length - 1;
      while (!/^setTransform m\d+$/.test(result[start])) start--;
      result.splice(start);
    } else {
      result.push(op);
    }
  }
  return result;
}

beforeEach(() => {
  pathCount = 0;
  vi.stubGlobal('Path2D', FakePath);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildSwarmDrift', () => {
  it.each(SWARM_FIXTURE.drift)('folgt dem Prototyp (unterwegs: $travel)', ({ travel, groups }) => {
    const drift = buildSwarmDrift(travel);
    expect(drift.travel).toBe(travel);
    const actual = drift.groups.map((g) => ({
      c: g.color,
      w: 'width' in g ? g.width : undefined,
      o: 'opacity' in g ? g.opacity : undefined,
      ops: (g.path as unknown as FakePath).ops,
    }));
    expect(actual).toEqual(groups.map((g) => ({ w: undefined, o: undefined, ...g })));
  });
});

describe('drawSwarmFrame', () => {
  it.each(SWARM_FIXTURE.draws)(
    'zeichnet wie cvDraw ohne Fresslinge und kriechende Brutlinge ($units, Winkel $angle, Bewegung $motion)',
    ({ units, travelAngle, now, motion, trekAt, trek, ops }) => {
      const start = nextTrek({ from: 0, to: 0, at: 0 }, travelAngle, trekAt);
      expect(start).toEqual(trek);
      const animated: UnitId[] = travelAngle === null ? ['eater', 'brooder'] : ['eater'];
      const sprites: Partial<Record<UnitId, SwarmSprite>> = {};
      for (const [unit, halfExtent] of SPRITE_UNITS) {
        if (animated.includes(unit)) continue;
        sprites[unit] = { kind: 'raster', image: unit as unknown as CanvasImageSource, halfExtent };
      }
      const ctx = new FakeContext();
      drawSwarmFrame(ctx as unknown as CanvasRenderingContext2D, {
        now,
        motion,
        pixelRatio: 1.5,
        drift: buildSwarmDrift(travelAngle !== null),
        flowRotation: flowRotation(travelAngle),
        trek: start,
        swirl: travelAngle === null,
        figures: swarmFigures(units, travelAngle !== null),
        sprites,
      });
      expect(ctx.ops).toEqual(withoutUnits(ops, animated));
    },
  );
});

describe('animierte Sprites', () => {
  it('ruft sie nach denselben Transformationen mit Zeit und Index je Einheit auf', () => {
    const units = [3, 1, 0, 0, 0, 0];
    const figures = swarmFigures(units, false);
    const frame = {
      now: 2000,
      motion: true,
      pixelRatio: 1.5,
      drift: null,
      flowRotation: 0,
      trek: { from: 0, to: 0, at: 0 },
      swirl: true,
      figures,
    };
    const raster = new FakeContext();
    const rasterSprites: Partial<Record<UnitId, SwarmSprite>> = {};
    for (const [unit, halfExtent] of SPRITE_UNITS) {
      rasterSprites[unit] = {
        kind: 'raster',
        image: unit as unknown as CanvasImageSource,
        halfExtent,
      };
    }
    drawSwarmFrame(raster as unknown as CanvasRenderingContext2D, {
      ...frame,
      sprites: rasterSprites,
    });

    const animated = new FakeContext();
    const calls: [number, number][] = [];
    drawSwarmFrame(animated as unknown as CanvasRenderingContext2D, {
      ...frame,
      sprites: {
        ...rasterSprites,
        eater: {
          kind: 'animated',
          draw: (ctx, time, index) => {
            calls.push([time, index]);
            (ctx as unknown as FakeContext).ops.push(`drawImage eater -12 -12 24 24`);
          },
        },
      },
    });

    expect(animated.ops).toEqual(raster.ops);
    expect(calls).toEqual([
      [2, 0],
      [2, 1],
      [2, 2],
    ]);
  });
});

function figureOps(units: number[], unit: UnitId, now: number, motion: boolean): string[] {
  const ctx = new FakeContext();
  drawSwarmFrame(ctx as unknown as CanvasRenderingContext2D, {
    now,
    motion,
    pixelRatio: 1,
    drift: null,
    flowRotation: 0,
    trek: { from: 0, to: 0, at: 0 },
    swirl: true,
    figures: swarmFigures(units, false),
    sprites: {
      [unit]: {
        kind: 'animated',
        draw: (c: CanvasRenderingContext2D) => void (c as unknown as FakeContext).ops.push('draw'),
      },
    },
  });
  return ctx.ops.slice(ctx.ops.lastIndexOf('setTransform m2') + 1);
}

describe('gleitende Fresslinge', () => {
  const glideOps = (now: number, motion: boolean): string[] =>
    figureOps([1, 0, 0, 0, 0, 0], 'eater', now, motion);

  it('verschiebt und dreht die Figur entlang ihrer Bahn und lässt sie seitlich pendeln', () => {
    const ops = glideOps(3000, true);
    expect(ops).toHaveLength(6);
    expect(ops[0]).toBe('translate 52 0');
    expect(ops[1]).toMatch(/^translate -?\d/);
    expect(ops[2]).toMatch(/^rotate -?\d/);
    expect(ops[3]).toMatch(/^translate 0 -?\d/);
    expect(ops[4]).toBe('scale 1.33 1.33');
    expect(ops[5]).toBe('draw');
  });

  it('gleitet mit der Zeit weiter und steht ohne Bewegung still', () => {
    expect(glideOps(3000, true)).not.toEqual(glideOps(0, true));
    expect(glideOps(3000, false)).toEqual(glideOps(0, true));
  });
});

describe('kriechende Brutlinge', () => {
  const crawlOps = (now: number, motion: boolean): string[] =>
    figureOps([0, 1, 0, 0, 0, 0], 'brooder', now, motion);

  it('verschiebt und dreht die Figur um ihren Platz', () => {
    const ops = crawlOps(3000, true);
    expect(ops).toHaveLength(5);
    expect(ops[0]).toBe('translate 18 0');
    expect(ops[1]).toMatch(/^translate -?\d/);
    expect(ops[2]).toMatch(/^rotate -?\d/);
    expect(ops[3]).toBe('scale 1 1');
    expect(ops[4]).toBe('draw');
  });

  it('kriecht mit der Zeit weiter und steht ohne Bewegung still', () => {
    expect(crawlOps(3000, true)).not.toEqual(crawlOps(0, true));
    expect(crawlOps(3000, false)).toEqual(crawlOps(0, true));
  });
});

describe('Sprites', () => {
  it('rastert wie cvInit', () => {
    expect(spritePixels(12, 1)).toBe(30);
    expect(spritePixels(49, 3)).toBe(368);
    expect(spriteDocument('<g/>', 20, 50)).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="-20 -20 40 40"><g/></svg>',
    );
  });
});

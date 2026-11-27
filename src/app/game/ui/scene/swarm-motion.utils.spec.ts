import {
  alternate,
  applyRoll,
  cubicBezier,
  EASE_IN_OUT,
  EASE_OUT,
  flowRotation,
  fraction,
  nextTrek,
  paddleAngle,
  trekAngle,
} from './swarm-motion.utils';
import { SWARM_FIXTURE } from './swarm.fixture';

const XS = [0, 0.1, 0.25, 0.5, 0.73, 1];

describe('Bewegungskurven', () => {
  it('cubicBezier', () => {
    expect(XS.map(EASE_IN_OUT)).toEqual(SWARM_FIXTURE.bezier.easeInOut);
    expect(XS.map(EASE_OUT)).toEqual(SWARM_FIXTURE.bezier.easeOut);
    expect(XS.map(cubicBezier(0.62, 0, 0.22, 1))).toEqual(SWARM_FIXTURE.bezier.custom);
  });

  it.each(SWARM_FIXTURE.alt)(
    'alternate($t, $duration, $delay)',
    ({ t, duration, delay, value }) => {
      expect(alternate(t, duration, delay)).toBe(value);
    },
  );

  it.each(SWARM_FIXTURE.paddle)('paddleAngle($p)', ({ p, value }) => {
    expect(paddleAngle(p)).toBe(value);
  });

  it.each(SWARM_FIXTURE.frac)('fraction($x)', ({ x, value }) => {
    expect(fraction(x)).toBe(value);
  });

  it.each(SWARM_FIXTURE.roll)('applyRoll($t, $duration, $delay)', ({ t, duration, delay, ops }) => {
    const calls: string[] = [];
    const ctx = {
      rotate: (a: number): void => void calls.push(`rotate ${a}`),
      scale: (x: number, y: number): void => void calls.push(`scale ${x} ${y}`),
    };
    applyRoll(ctx, t, duration, delay);
    expect(calls).toEqual(ops);
  });
});

describe('Reiserichtung', () => {
  it.each(SWARM_FIXTURE.trek)('trekAngle bei $now', ({ from, to, at, now, value }) => {
    expect(trekAngle({ from, to, at }, now)).toBe(value);
  });

  it('startet den Übergang beim Wechsel der Richtung', () => {
    let trek = { from: 0, to: 0, at: 0 };
    for (const step of SWARM_FIXTURE.trekSeq) {
      trek = nextTrek(trek, step.angle, step.now);
      expect(trek).toEqual(step.trek);
    }
  });

  it('behält den Übergang bei gleicher Richtung', () => {
    const trek = { from: 0, to: 33.3, at: 1000 };
    expect(nextTrek(trek, 33.33, 1500)).toBe(trek);
  });

  it('flowRotation', () => {
    expect(flowRotation(null)).toBe(0);
    expect(flowRotation(-30)).toBe(60);
  });
});

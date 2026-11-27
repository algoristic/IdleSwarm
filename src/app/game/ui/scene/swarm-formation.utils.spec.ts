import { SwarmFigure } from './models/swarm.model';
import { swarmFigureCounts, swarmFigures } from './swarm-formation.utils';
import { SWARM_FIXTURE } from './swarm.fixture';

function canonical(f: SwarmFigure): string {
  const values =
    f.kind === 'bob'
      ? ['bob', f.unit, f.x, f.y, f.rotation, f.scale, f.variant, f.delay]
      : f.kind === 'paddle'
        ? [
            'pad',
            f.unit,
            f.x,
            f.y,
            f.scale,
            f.index,
            f.radius,
            f.duration,
            f.reverse,
            f.start,
            f.roll,
            f.paddleDelay,
            f.rollDelay,
          ]
        : ['swim', f.unit, f.x, f.y, f.rotation, f.scale, f.variant, f.delay, f.rollDelay];
  return values.map(String).join('|');
}

describe('swarmFigureCounts', () => {
  it('zählt je Stufe mit Deckel', () => {
    expect(swarmFigureCounts([0, 0, 0, 0, 0, 0])).toEqual([0, 0, 0, 0, 0, 0]);
    expect(swarmFigureCounts([12.7, 1, 0, 0, 0, 0])).toEqual([12, 1, 0, 0, 0, 0]);
    expect(swarmFigureCounts([100, 25, 3, 1, 0, 0])).toEqual([30, 3, 1, 1, 0, 0]);
    expect(swarmFigureCounts([1e9, 1e9, 1e9, 1e9, 1e9, 1e9])).toEqual([48, 8, 4, 4, 4, 4]);
  });
});

describe('swarmFigures', () => {
  it.each(SWARM_FIXTURE.formation)(
    'folgt dem Prototyp für $units (unterwegs: $travel)',
    ({ units, travel, figures }) => {
      expect(swarmFigures(units, travel).map(canonical)).toEqual(figures);
    },
  );
});

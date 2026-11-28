import { SwarmFigure } from './models/swarm.model';
import { swarmFigureCounts, swarmFigures } from './swarm-formation.utils';
import { SWARM_FIXTURE } from './swarm.fixture';

function canonical(f: SwarmFigure): string {
  const values =
    f.kind === 'bob'
      ? ['bob', f.unit, f.x, f.y, f.rotation, f.scale, f.variant, f.delay]
      : [f.kind, f.unit, f.x, f.y, f.scale];
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
    'folgt dem Prototyp ohne Fresslinge und kriechende Brutlinge für $units (unterwegs: $travel)',
    ({ units, travel, figures }) => {
      const others = swarmFigures(units, travel).filter(
        (f) => f.unit !== 'eater' && f.kind !== 'crawl',
      );
      const expected = figures.filter(
        (f) => !f.includes('|eater|') && (travel || !f.includes('|brooder|')),
      );
      expect(others.map(canonical)).toEqual(expected);
    },
  );

  it.each([false, true])('setzt die Fresslinge größer in den Ring (unterwegs: %s)', (travel) => {
    const units = [100, 25, 3, 1, 0, 0];
    const figures = swarmFigures(units, travel);
    const eaters = figures.filter((f) => f.unit === 'eater');
    const r0 = 30 + 22 * Math.sqrt(figures.length - eaters.length);
    const spacing = travel ? 18 : 22;
    expect(eaters).toHaveLength(swarmFigureCounts(units)[0]);
    eaters.forEach((f, i) => {
      const [fx, fy] = travel ? [1.25, 0.62] : [1, 1];
      expect(Math.hypot(f.x / fx, f.y / fy)).toBeCloseTo(r0 + spacing * Math.sqrt(i + 1), 6);
      expect(f.scale).toBeGreaterThanOrEqual(1.33);
      expect(f.scale).toBeLessThanOrEqual(1.67);
      expect(f.kind).toBe(travel ? 'swim' : 'glide');
    });
  });

  it('lässt die Brutlinge an der Stelle um ihren Platz kriechen', () => {
    const atSite = swarmFigures([0, 25, 0, 0, 0, 0], false);
    const travelling = swarmFigures([0, 25, 0, 0, 0, 0], true);
    expect(atSite.map((f) => f.kind)).toEqual(['crawl', 'crawl', 'crawl']);
    expect(travelling.map((f) => f.kind)).toEqual(['bob', 'bob', 'bob']);
    atSite.forEach((f, i) => {
      expect(f.kind === 'crawl' && f.index).toBe(i);
      if (f.kind !== 'crawl') return;
      const r = Math.hypot(f.x, f.y);
      f.crawl.x.values.forEach((x, k) => {
        const distance = Math.hypot(f.x + x, f.y + f.crawl.y.values[k]);
        expect(Math.abs(distance - r)).toBeLessThanOrEqual(6 + 1e-6);
      });
    });
  });
});

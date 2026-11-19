import { seedToRngState } from '@app/shared/util/rng/rng';

import {
  bubble,
  createPlankton,
  planktonPoint,
  YIELD_PARTICLE_LIFE_MS,
  YIELD_PARTICLE_MAX_RATE,
  yieldParticleRate,
  yieldParticles,
} from './scene-effects-logic';
import { sceneScale, scenePixelRatio, siteAppearance } from './scene-geometry-logic';

describe('yieldParticleRate', () => {
  it('ist ohne Ertrag 0 und wächst gedeckelt mit der Nahrung/s', () => {
    expect(yieldParticleRate(0, false)).toBe(0);
    expect(yieldParticleRate(Number.NaN, false)).toBe(0);
    expect(yieldParticleRate(1, false)).toBe(3);
    expect(yieldParticleRate(1000, false)).toBe(8);
    expect(yieldParticleRate(Number.POSITIVE_INFINITY, false)).toBe(YIELD_PARTICLE_MAX_RATE);
  });

  it('halbiert bei reduzierten Partikeln', () => {
    expect(yieldParticleRate(1000, true)).toBe(4);
    expect(yieldParticleRate(1, true)).toBe(2);
  });
});

describe('yieldParticles', () => {
  it('liefert je Rate höchstens Rate · Lebensdauer Teilchen', () => {
    const particles = yieldParticles(10_000, 10, 7);
    expect(particles).toHaveLength((10 * YIELD_PARTICLE_LIFE_MS) / 1000);
    for (const particle of particles) {
      expect(particle.opacity).toBeGreaterThan(0);
      expect(particle.opacity).toBeLessThanOrEqual(1);
    }
    expect(yieldParticles(10_000, 0, 7)).toEqual([]);
  });

  it('ist für dieselbe Zeit reproduzierbar', () => {
    expect(yieldParticles(4321, 6, 99)).toEqual(yieldParticles(4321, 6, 99));
  });
});

describe('Plankton und Blasen', () => {
  it('bleibt im Viewport und steigt auf', () => {
    const { plankton } = createPlankton(20, seedToRngState('test'));
    for (const item of plankton) {
      const later = planktonPoint(item, 50_000, 0.3);
      expect(later.x).toBeGreaterThanOrEqual(0);
      expect(later.x).toBeLessThan(1);
      expect(later.y).toBeGreaterThanOrEqual(0);
      expect(later.y).toBeLessThan(1);
    }
  });

  it('lässt Blasen steigen und verblassen', () => {
    const early = bubble(0, 0);
    const later = bubble(0, 1200);
    expect(later.y).toBeLessThan(early.y);
    expect(later.opacity).toBeLessThan(early.opacity);
  });
});

describe('Geometrie', () => {
  it('deckelt das Pixelverhältnis auf 2', () => {
    expect(scenePixelRatio(3)).toBe(2);
    expect(scenePixelRatio(1.5)).toBe(1.5);
    expect(scenePixelRatio(0)).toBe(1);
  });

  it('verkleinert die Szene auf kleinen Viewports mit Untergrenze', () => {
    expect(sceneScale(1920, 1080)).toBe(1);
    expect(sceneScale(390, 844)).toBeCloseTo(390 / 700);
    expect(sceneScale(200, 300)).toBe(0.5);
  });

  it('lässt eine leere Futterstelle kleiner und blasser, aber sichtbar', () => {
    expect(siteAppearance(1)).toEqual({ scale: 1, opacity: 1 });
    expect(siteAppearance(0)).toEqual({ scale: 0.45, opacity: 0.5 });
    expect(siteAppearance(2).scale).toBe(1);
  });
});

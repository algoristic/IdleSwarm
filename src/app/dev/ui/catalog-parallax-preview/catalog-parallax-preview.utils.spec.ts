import { clampPan, parallaxLayers } from './catalog-parallax-preview.utils';

describe('catalog-parallax-preview.utils', () => {
  it('begrenzt die Verschiebung auf den Kreis', () => {
    expect(clampPan(30, 40, 100)).toEqual({ x: 30, y: 40 });
    expect(clampPan(300, 400, 100)).toEqual({ x: 60, y: 80 });
  });

  it('verschiebt die Ebenen je nach Tiefe und zeichnet weich', () => {
    const layers = parallaxLayers({ x: 100, y: -100 }, true);
    expect(layers.far).toEqual({
      transform: 'translate(35px, -35px) scale(1.15)',
      filter: 'blur(4px) brightness(0.95)',
    });
    expect(layers.haze).toEqual({
      transform: 'translate(65px, -65px) scale(1.05)',
      filter: 'blur(1.5px)',
    });
    expect(layers.map).toEqual({ transform: 'translate(100px, -100px) scale(1)', filter: 'none' });
  });

  it('lässt ohne Weichzeichner nur die Helligkeit', () => {
    const layers = parallaxLayers({ x: 0, y: 0 }, false);
    expect(layers.far.filter).toBe('brightness(0.95)');
    expect(layers.haze.filter).toBe('none');
  });
});

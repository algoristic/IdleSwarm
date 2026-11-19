import { stageSize, worldCamera, worldCameraStyle } from './shell-camera-logic';

describe('stageSize', () => {
  it('folgt auf breiten Viewports dem Mockup: Höhe · 0,86 oder Breite − 720', () => {
    expect(stageSize({ width: 1920, height: 1000 })).toBe(860);
    expect(stageSize({ width: 1280, height: 1000 })).toBe(560);
  });

  it('hält mindestens 360 px, solange der Viewport breit genug ist', () => {
    expect(stageSize({ width: 1000, height: 900 })).toBe(360);
    expect(stageSize({ width: 1400, height: 300 })).toBe(360);
  });

  it('läuft auf schmalen Viewports nicht über', () => {
    expect(stageSize({ width: 375, height: 800 })).toBe(343);
    expect(stageSize({ width: 20, height: 800 })).toBe(0);
  });

  it('rundet auf ganze Pixel ab', () => {
    expect(stageSize({ width: 1920, height: 999 })).toBe(859);
  });
});

describe('worldCamera', () => {
  const viewport = { width: 1600, height: 1200 };

  it('lässt die Welt in der Szene unverändert und deckt den Viewport ab', () => {
    expect(worldCamera('scene', viewport, 800)).toEqual({
      scale: 1,
      clipRadius: 2000,
      centerX: 800,
      centerY: 600,
      blur: 0,
      brightness: 1,
    });
  });

  it('schrumpft die Welt im Kartenmodus auf die eigene Position der Karte', () => {
    const camera = worldCamera('map', viewport, 800);
    // Ausschnitt 300 px · Skalierung = Radius der eigenen Position (30 von 800 im viewBox).
    expect(camera.clipRadius * camera.scale).toBeCloseTo(30);
    expect(
      worldCamera('map', viewport, 400).clipRadius * worldCamera('map', viewport, 400).scale,
    ).toBeCloseTo(15);
    expect(camera.brightness).toBe(1.15);
    expect(camera.blur).toBe(0);
  });

  it('vergrößert die Welt im Genom-Modus, unscharf und abgedunkelt', () => {
    expect(worldCamera('gen', viewport, 800)).toMatchObject({
      scale: 2.8,
      clipRadius: 2000,
      blur: 7,
      brightness: 0.4,
    });
  });
});

describe('worldCameraStyle', () => {
  it('baut die CSS-Werte mit gleicher Form in allen Modi', () => {
    expect(
      worldCameraStyle({
        scale: 0.1,
        clipRadius: 300,
        centerX: 500,
        centerY: 400,
        blur: 0,
        brightness: 1.15,
      }),
    ).toEqual({
      transformOrigin: '500px 400px',
      transform: 'scale(0.1)',
      clipPath: 'circle(300px at 500px 400px)',
      filter: 'blur(0px) brightness(1.15)',
    });
  });
});

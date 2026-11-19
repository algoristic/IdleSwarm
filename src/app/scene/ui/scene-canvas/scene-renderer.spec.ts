import type { SceneFrame } from '../../domain/models/scene.model';
import type { ScenePalette } from './scene-palette';
import { SceneRenderer } from './scene-renderer';

/** 2D-Kontext, der jeden Aufruf annimmt und `drawImage` zählt (jsdom hat kein Canvas). */
function fakeCanvas(calls: { drawImage: number }): HTMLCanvasElement {
  const ctx = new Proxy(
    {},
    {
      get: (_target, property) => {
        if (property === 'drawImage') {
          return () => calls.drawImage++;
        }
        if (property === 'createLinearGradient' || property === 'createRadialGradient') {
          return () => ({ addColorStop: () => undefined });
        }
        return () => undefined;
      },
      set: () => true,
    },
  );
  return { width: 0, height: 0, getContext: () => ctx } as unknown as HTMLCanvasElement;
}

const color = { base: 'a', shade: 'b' };
const palette: ScenePalette = {
  skyTop: 'a',
  skyMid: 'a',
  skyBottom: 'a',
  light: 'a',
  hills: ['a', 'a', 'a'],
  plankton: ['a', 'b', 'c', 'd', 'e'],
  site: ['a', 'a', 'a'],
  siteGlow: 'a',
  siteGlowEnd: 'a',
  shadow: 'a',
  gloss: 'a',
  highlight: 'a',
  bubble: 'a',
  bubbleHighlight: 'a',
  drone: color,
  soldier: color,
  queen: color,
  food: color,
};

const frame = (overrides: Partial<SceneFrame> = {}): SceneFrame => ({
  width: 800,
  height: 600,
  pixelRatio: 2,
  sprites: { queens: 2, drones: 40, soldiers: 10 },
  traveling: false,
  stockShare: 0.5,
  yieldParticleRate: 6,
  reducedMotion: false,
  ...overrides,
});

describe('SceneRenderer', () => {
  it('liefert ohne 2D-Kontext null statt zu werfen', () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement;
    expect(SceneRenderer.create(canvas, palette, () => canvas)).toBeNull();
  });

  it('zeichnet Szene, Agenten und Teilchen und passt die Canvas-Größe an', () => {
    const calls = { drawImage: 0 };
    const canvas = fakeCanvas(calls);
    const renderer = SceneRenderer.create(canvas, palette, () => fakeCanvas({ drawImage: 0 }));
    expect(renderer).not.toBeNull();

    renderer?.draw(1000, frame());
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(1200);
    // Hintergrund mit Hügeln, 120 Plankton, Schein, 6 Blasen, 52 Agenten (frisch: unsichtbar), Teilchen.
    expect(calls.drawImage).toBeGreaterThanOrEqual(1 + 120 + 1 + 6);

    calls.drawImage = 0;
    renderer?.draw(5000, frame({ traveling: true, reducedMotion: true }));
    // Unterwegs ohne Futterstelle und Teilchen; Plankton halbiert, Agenten eingeblendet.
    expect(calls.drawImage).toBe(1 + 60 + 52);
  });

  it('zeichnet den Hintergrund erst neu, wenn die Lichtkegel spürbar geschwankt sind', () => {
    // Nur der Hintergrund kopiert in Offscreen-Canvas (die Hügel); Sprites malen ohne `drawImage`.
    const offscreen = { drawImage: 0 };
    const renderer = SceneRenderer.create(fakeCanvas({ drawImage: 0 }), palette, () =>
      fakeCanvas(offscreen),
    );
    renderer?.draw(1000, frame());
    expect(offscreen.drawImage).toBe(1);
    renderer?.draw(1016, frame());
    expect(offscreen.drawImage).toBe(1);
    renderer?.draw(4000, frame());
    expect(offscreen.drawImage).toBe(2);
  });

  it('lässt die Lichtkegel bei reduzierter Bewegung stillstehen und zeichnet keine Blasen', () => {
    const calls = { drawImage: 0 };
    const offscreen = { drawImage: 0 };
    const renderer = SceneRenderer.create(fakeCanvas(calls), palette, () => fakeCanvas(offscreen));
    const still = frame({
      reducedMotion: true,
      yieldParticleRate: 0,
      sprites: { queens: 0, drones: 0, soldiers: 0 },
    });
    renderer?.draw(1000, still);
    renderer?.draw(20_000, still);
    expect(offscreen.drawImage).toBe(1);
    calls.drawImage = 0;
    renderer?.draw(21_000, still);
    // Hintergrund, 60 Plankton, Schein; keine Blasen.
    expect(calls.drawImage).toBe(1 + 60 + 1);
  });
});

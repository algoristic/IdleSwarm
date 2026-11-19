import type { BallColors, ScenePalette } from './scene-palette';

/** Erzeugt ein leeres Canvas in Geräte-Pixeln (für Sprites und vorgerenderte Ebenen). */
export type CanvasFactory = (width: number, height: number) => HTMLCanvasElement;

/** Vorgerendertes Bild; `extent` ist die halbe Kantenlänge in Szene-Pixeln (Maßstab 1). */
export interface Sprite {
  readonly image: HTMLCanvasElement;
  readonly extent: number;
}

/** Sprites je Typ; pro Frame zeichnet der Renderer sie nur noch mit `drawImage`. */
export interface SceneSprites {
  readonly drone: Sprite;
  readonly droneLoaded: Sprite;
  /** Spitze zeigt nach rechts (Winkel 0); der Renderer dreht in Laufrichtung. */
  readonly soldier: Sprite;
  readonly queen: Sprite;
  /** Nahrungskugel mit Radius `extent` für Ertragsteilchen. */
  readonly food: Sprite;
  readonly bubble: Sprite;
  /** Planktonpunkte je Farbe (Radius `extent`). */
  readonly planktonDots: readonly Sprite[];
  readonly planktonStars: readonly Sprite[];
}

const DRONE_RADIUS = 6;
const SOLDIER_RADIUS = 7;
const QUEEN_RADIUS = 11;
const PARTICLE_RADIUS = 5;
const PLANKTON_DOT_RADIUS = 2;
const PLANKTON_STAR_RADIUS = 3.7;

/**
 * Rendert alle Sprites im Flat-Stil des Mockups vor: Kugel aus dunklem Grund, versetztem Körper und
 * Glanzlicht, dazu der Kern; kein Weichzeichner. `resolution` ist Geräte-Pixel je Szene-Pixel.
 * Ohne 2D-Kontext `null`.
 */
export function createSceneSprites(
  palette: ScenePalette,
  resolution: number,
  createCanvas: CanvasFactory,
): SceneSprites | null {
  const sprite = (
    extent: number,
    paint: (ctx: CanvasRenderingContext2D) => void,
  ): Sprite | null => {
    const size = Math.max(1, Math.ceil(extent * 2 * resolution));
    const image = createCanvas(size, size);
    const ctx = image.getContext('2d');
    if (!ctx) {
      return null;
    }
    ctx.setTransform(resolution, 0, 0, resolution, size / 2, size / 2);
    paint(ctx);
    return { image, extent };
  };

  const drone = sprite(DRONE_RADIUS + 4, (ctx) => paintDrone(ctx, palette, false));
  const droneLoaded = sprite(DRONE_RADIUS + 4, (ctx) => paintDrone(ctx, palette, true));
  const soldier = sprite(SOLDIER_RADIUS + 3, (ctx) => {
    triangle(ctx, 0, 0, SOLDIER_RADIUS, palette.soldier.shade);
    triangle(ctx, -0.8, -0.8, 5.8, palette.soldier.base);
    nucleus(ctx, 0, 0, 6, palette.soldier);
  });
  const queen = sprite(QUEEN_RADIUS + 6, (ctx) => {
    ball(ctx, 0, 0, QUEEN_RADIUS, palette.queen, palette.highlight);
    nucleus(ctx, 0, 0, QUEEN_RADIUS, palette.queen);
    // Krönchen aus drei Punkten.
    ball(ctx, -5, -11, 2.6, palette.food, palette.highlight);
    ball(ctx, 0, -13, 3, palette.food, palette.highlight);
    ball(ctx, 5, -11, 2.6, palette.food, palette.highlight);
  });
  const food = sprite(PARTICLE_RADIUS, (ctx) =>
    ball(ctx, 0, 0, PARTICLE_RADIUS, palette.food, palette.highlight),
  );
  const bubble = sprite(PARTICLE_RADIUS, (ctx) => {
    ctx.fillStyle = palette.bubble;
    dot(ctx, 0, 0, PARTICLE_RADIUS);
    ctx.fillStyle = palette.bubbleHighlight;
    dot(ctx, -PARTICLE_RADIUS * 0.35, -PARTICLE_RADIUS * 0.35, PARTICLE_RADIUS * 0.35);
  });
  const planktonDots = palette.plankton.map((color) =>
    sprite(PLANKTON_DOT_RADIUS, (ctx) => {
      ctx.fillStyle = color;
      dot(ctx, 0, 0, PLANKTON_DOT_RADIUS);
    }),
  );
  const planktonStars = palette.plankton.map((color) =>
    sprite(PLANKTON_STAR_RADIUS, (ctx) => {
      const s = PLANKTON_STAR_RADIUS;
      ctx.fillStyle = color;
      ctx.fillRect(-s, -0.6, s * 2, 1.2);
      ctx.fillRect(-0.6, -s, 1.2, s * 2);
    }),
  );

  if (!drone || !droneLoaded || !soldier || !queen || !food || !bubble) {
    return null;
  }
  const dots = planktonDots.filter((item): item is Sprite => item !== null);
  const stars = planktonStars.filter((item): item is Sprite => item !== null);
  if (dots.length !== palette.plankton.length || stars.length !== palette.plankton.length) {
    return null;
  }
  return {
    drone,
    droneLoaded,
    soldier,
    queen,
    food,
    bubble,
    planktonDots: dots,
    planktonStars: stars,
  };
}

export function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function paintDrone(ctx: CanvasRenderingContext2D, palette: ScenePalette, loaded: boolean): void {
  ball(ctx, 0, 0, DRONE_RADIUS, palette.drone, palette.highlight);
  nucleus(ctx, 0, 0, DRONE_RADIUS, palette.drone);
  if (loaded) {
    ball(ctx, 5, -5, 2.8, palette.food, palette.highlight);
  }
}

function ball(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  colors: BallColors,
  highlight: string,
): void {
  ctx.fillStyle = colors.shade;
  dot(ctx, x, y, r);
  ctx.fillStyle = colors.base;
  dot(ctx, x - r * 0.12, y - r * 0.12, r * 0.84);
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.42, y - r * 0.42, r * 0.22, r * 0.13, -0.7, 0, Math.PI * 2);
  ctx.fill();
}

function nucleus(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  colors: BallColors,
): void {
  ctx.fillStyle = colors.shade;
  dot(ctx, x + r * 0.18, y + r * 0.15, r * 0.32);
}

function triangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
): void {
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineWidth = r * 0.55;
  ctx.stroke();
  ctx.fill();
}

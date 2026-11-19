import { UNIT_TYPES } from '@app/swarm/domain/models/units.model';

import type {
  AgentPose,
  Plankton,
  SceneAgent,
  SceneAgents,
  SceneFrame,
} from '../../domain/models/scene.model';
import {
  activeAgentCounts,
  agentPose,
  createSceneAgents,
  syncAgents,
} from '../../domain/scene-agent-logic';
import {
  BUBBLE_COUNT,
  bubble,
  createPlankton,
  PLANKTON_COUNT,
  planktonPoint,
  yieldParticles,
} from '../../domain/scene-effects-logic';
import { sceneScale, siteAppearance, sitePulse } from '../../domain/scene-geometry-logic';
import type { ScenePalette } from './scene-palette';
import {
  type CanvasFactory,
  createSceneSprites,
  dot,
  type SceneSprites,
  type Sprite,
} from './scene-sprites';

/** Lichtkegel nach Mockup: Mitte, Breite (Anteile der Breite) und Phase des Schwankens. */
const LIGHT_CONES = [
  [0.2, 0.09, 0],
  [0.48, 0.06, 1.3],
  [0.78, 0.11, 2.1],
] as const;
/** Hügel nach Mockup: Grundlinie (Anteil der Höhe), Amplitude, Frequenz, Phase; hinten nach vorn. */
const HILLS = [
  [0.74, 22, 0.004, 1],
  [0.82, 28, 0.006, 3],
  [0.9, 18, 0.009, 5],
] as const;
const HILL_STEP = 24;
const SITE_GLOW_RADIUS = 280;
const WARM_ZONES = [
  [170, 0.07],
  [128, 0.1],
  [98, 0.14],
] as const;
const PLANKTON_OPACITY = 0.22;
/** Während der Reise zieht das Plankton seitlich vorbei (Viewport-Anteil je ms). */
const TRAVEL_DRIFT_PER_MS = 0.00004;
/** Größere Frame-Lücken (Tab im Hintergrund) zählen nicht für die Drift. */
const MAX_FRAME_GAP_MS = 100;
/**
 * Himmel, Lichtkegel und Hügel liegen vorgerendert in einem Bild und werden erst neu gezeichnet,
 * wenn ein Kegel um so viele CSS-Pixel geschwankt ist; sonst kosteten die großen Flächen jeden Frame.
 */
const BACKDROP_SWAY_STEP = 0.5;

/**
 * Zeichnet die Szene nach Mockup K2-K (`frame()`) in ein Canvas 2D. Himmel, Lichtkegel und Hügel
 * liegen vorgerendert in einem Bild (neu bei Größenwechsel und spürbarem Schwanken der Kegel),
 * Einheiten, Teilchen und der Schein der Futterstelle sind Sprites. Die Futterstelle liegt im
 * Zentrum des Viewports (Fixpunkt der Kamera im Kartenmodus).
 */
export class SceneRenderer {
  readonly #canvas: HTMLCanvasElement;
  readonly #ctx: CanvasRenderingContext2D;
  readonly #palette: ScenePalette;
  readonly #createCanvas: CanvasFactory;

  #width = 0;
  #height = 0;
  #ratio = 0;
  #scale = 1;
  #sprites: SceneSprites | null = null;
  #hills: HTMLCanvasElement | null = null;
  #backdrop: HTMLCanvasElement | null = null;
  #backdropSways: readonly number[] | null = null;
  #siteGlow: Sprite | null = null;
  #agents: SceneAgents = createSceneAgents();
  readonly #plankton: readonly Plankton[];
  readonly #particleSeed: number;
  #drift = 0;
  #lastNowMs: number | null = null;

  private constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    palette: ScenePalette,
    createCanvas: CanvasFactory,
  ) {
    this.#canvas = canvas;
    this.#ctx = ctx;
    this.#palette = palette;
    this.#createCanvas = createCanvas;
    const { plankton, rngState } = createPlankton(PLANKTON_COUNT, this.#agents.rngState);
    this.#plankton = plankton;
    this.#particleSeed = rngState;
    this.#agents = { ...this.#agents, rngState };
  }

  /** `null`, wenn der Browser (oder jsdom) keinen 2D-Kontext liefert; dann bleibt die Szene leer. */
  static create(
    canvas: HTMLCanvasElement,
    palette: ScenePalette,
    createCanvas: CanvasFactory,
  ): SceneRenderer | null {
    const ctx = canvas.getContext('2d');
    return ctx ? new SceneRenderer(canvas, ctx, palette, createCanvas) : null;
  }

  draw(nowMs: number, frame: SceneFrame): void {
    if (frame.width <= 0 || frame.height <= 0) {
      return;
    }
    if (
      frame.width !== this.#width ||
      frame.height !== this.#height ||
      frame.pixelRatio !== this.#ratio
    ) {
      this.#resize(frame);
    }
    const sprites = this.#sprites;
    if (!sprites || !this.#hills) {
      return;
    }
    const backdrop = this.#syncBackdrop(nowMs, frame);
    if (!backdrop) {
      return;
    }
    this.#syncAgents(nowMs, frame);
    const gap =
      this.#lastNowMs === null
        ? 0
        : Math.min(MAX_FRAME_GAP_MS, Math.max(0, nowMs - this.#lastNowMs));
    this.#lastNowMs = nowMs;
    if (frame.traveling) {
      this.#drift += gap * TRAVEL_DRIFT_PER_MS;
    }

    const ctx = this.#ctx;
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(backdrop, 0, 0);
    ctx.setTransform(this.#ratio, 0, 0, this.#ratio, 0, 0);
    this.#drawPlankton(nowMs, frame, sprites);

    // Ab hier Szene-Koordinaten: Ursprung in der Futterstelle, Maßstab nach Viewport.
    const m = this.#ratio * this.#scale;
    ctx.setTransform(m, 0, 0, m, (this.#ratio * this.#width) / 2, (this.#ratio * this.#height) / 2);
    if (!frame.traveling) {
      this.#drawSite(nowMs, frame, sprites);
    }
    this.#drawAgents(nowMs, frame, sprites);
    if (!frame.traveling) {
      for (const particle of yieldParticles(nowMs, frame.yieldParticleRate, this.#particleSeed)) {
        ctx.globalAlpha = particle.opacity;
        this.#drawSprite(sprites.food, particle.x, particle.y, particle.size / sprites.food.extent);
      }
    }
    ctx.globalAlpha = 1;
  }

  #resize(frame: SceneFrame): void {
    this.#width = frame.width;
    this.#height = frame.height;
    this.#ratio = frame.pixelRatio;
    this.#scale = sceneScale(frame.width, frame.height);
    const deviceWidth = Math.round(frame.width * frame.pixelRatio);
    const deviceHeight = Math.round(frame.height * frame.pixelRatio);
    this.#canvas.width = deviceWidth;
    this.#canvas.height = deviceHeight;
    this.#sprites = createSceneSprites(
      this.#palette,
      this.#ratio * this.#scale,
      this.#createCanvas,
    );
    this.#backdrop = this.#createCanvas(deviceWidth, deviceHeight);
    this.#backdropSways = null;
    this.#hills = this.#prerender(deviceWidth, deviceHeight, (ctx) => {
      HILLS.forEach(([base, amplitude, frequency, phase], index) => {
        const baseline = this.#height * base;
        ctx.fillStyle = this.#palette.hills[index];
        ctx.beginPath();
        ctx.moveTo(0, this.#height);
        for (let x = 0; x <= this.#width + HILL_STEP; x += HILL_STEP) {
          const wave =
            Math.sin(x * frequency + phase) * amplitude +
            Math.sin(x * frequency * 2.3 + phase * 1.7) * amplitude * 0.35;
          ctx.lineTo(x, baseline + wave);
        }
        ctx.lineTo(this.#width + HILL_STEP, this.#height);
        ctx.fill();
      });
    });
    // Als Sprite vorgerendert: Ein Bild zu kopieren ist billiger, als den Verlauf je Frame zu füllen.
    const resolution = this.#ratio * this.#scale;
    const glowSize = Math.max(1, Math.ceil(SITE_GLOW_RADIUS * 2 * resolution));
    const glowImage = this.#createCanvas(glowSize, glowSize);
    const glowCtx = glowImage.getContext('2d');
    if (glowCtx) {
      glowCtx.setTransform(resolution, 0, 0, resolution, glowSize / 2, glowSize / 2);
      const glow = glowCtx.createRadialGradient(0, 0, 0, 0, 0, SITE_GLOW_RADIUS);
      glow.addColorStop(0, this.#palette.siteGlow);
      glow.addColorStop(1, this.#palette.siteGlowEnd);
      glowCtx.fillStyle = glow;
      dot(glowCtx, 0, 0, SITE_GLOW_RADIUS);
    }
    this.#siteGlow = glowCtx ? { image: glowImage, extent: SITE_GLOW_RADIUS } : null;
  }

  /**
   * Zeichnet Himmel, Lichtkegel und Hügel neu, sobald ein Kegel um `BACKDROP_SWAY_STEP` geschwankt
   * ist; bei reduzierter Bewegung stehen die Kegel still. `null` ohne 2D-Kontext.
   */
  #syncBackdrop(nowMs: number, frame: SceneFrame): HTMLCanvasElement | null {
    const backdrop = this.#backdrop;
    const hills = this.#hills;
    const ctx = backdrop?.getContext('2d');
    if (!backdrop || !hills || !ctx) {
      return null;
    }
    const sways = LIGHT_CONES.map(([, , phase]) =>
      frame.reducedMotion ? 0 : Math.sin(nowMs / 5000 + phase) * this.#width * 0.03,
    );
    const cached = this.#backdropSways;
    if (cached && sways.every((sway, i) => Math.abs(sway - cached[i]) < BACKDROP_SWAY_STEP)) {
      return backdrop;
    }
    this.#backdropSways = sways;
    ctx.setTransform(this.#ratio, 0, 0, this.#ratio, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, this.#height);
    sky.addColorStop(0, this.#palette.skyTop);
    sky.addColorStop(0.55, this.#palette.skyMid);
    sky.addColorStop(1, this.#palette.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.#width, this.#height);
    this.#drawLightCones(ctx, sways);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(hills, 0, 0);
    return backdrop;
  }

  #prerender(
    width: number,
    height: number,
    paint: (ctx: CanvasRenderingContext2D) => void,
  ): HTMLCanvasElement | null {
    const canvas = this.#createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }
    ctx.setTransform(this.#ratio, 0, 0, this.#ratio, 0, 0);
    paint(ctx);
    return canvas;
  }

  #syncAgents(nowMs: number, frame: SceneFrame): void {
    const active = activeAgentCounts(this.#agents);
    const changed = UNIT_TYPES.some((type) => active[type] !== frame.sprites[type]);
    const pruneDue = this.#agents.pruneAtMs !== null && nowMs >= this.#agents.pruneAtMs;
    if (changed || pruneDue) {
      this.#agents = syncAgents(this.#agents, frame.sprites, nowMs);
    }
  }

  #drawLightCones(ctx: CanvasRenderingContext2D, sways: readonly number[]): void {
    const w = this.#width;
    const h = this.#height;
    ctx.fillStyle = this.#palette.light;
    for (const [index, [center, width]] of LIGHT_CONES.entries()) {
      const sway = sways[index];
      ctx.beginPath();
      ctx.moveTo(center * w - width * w * 0.4, 0);
      ctx.lineTo(center * w + width * w * 0.4, 0);
      ctx.lineTo(center * w + width * w * 1.6 + sway + w * 0.12, h);
      ctx.lineTo(center * w - width * w * 0.2 + sway + w * 0.12, h);
      ctx.fill();
    }
  }

  #drawPlankton(nowMs: number, frame: SceneFrame, sprites: SceneSprites): void {
    const ctx = this.#ctx;
    // Reduzierte Bewegung: nur jedes zweite Teilchen.
    const step = frame.reducedMotion ? 2 : 1;
    for (let i = 0; i < this.#plankton.length; i += step) {
      const plankton = this.#plankton[i];
      const point = planktonPoint(plankton, nowMs, this.#drift);
      const x = point.x * this.#width + point.wobble;
      const y = point.y * this.#height;
      ctx.globalAlpha = PLANKTON_OPACITY * plankton.depth;
      const sprite = plankton.star
        ? sprites.planktonStars[plankton.color]
        : sprites.planktonDots[plankton.color];
      // Sterne wachsen mit der Tiefe langsamer als Punkte (Mockup: 1,8 · z + 1 statt 1,3 · z).
      const size = plankton.star ? (1.8 * plankton.depth + 1) / 3.7 : (1.3 * plankton.depth) / 2;
      const extent = sprite.extent * size;
      ctx.drawImage(sprite.image, x - extent, y - extent, extent * 2, extent * 2);
    }
    ctx.globalAlpha = 1;
  }

  #drawSite(nowMs: number, frame: SceneFrame, sprites: SceneSprites): void {
    const ctx = this.#ctx;
    const palette = this.#palette;
    const pulse = sitePulse(nowMs);
    const { scale, opacity } = siteAppearance(frame.stockShare);
    const k = pulse * scale;

    if (this.#siteGlow) {
      this.#drawSprite(this.#siteGlow, 0, 0, 1);
    }
    ctx.fillStyle = palette.site[1];
    for (const [radius, alpha] of WARM_ZONES) {
      ctx.globalAlpha = alpha;
      dot(ctx, 0, 0, radius * pulse);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.shadow;
    ctx.beginPath();
    ctx.ellipse(6, 70 * k, 70 * scale, 14 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = opacity;
    this.#blob(0, 0, 80 * k, nowMs, palette.site[0], 0);
    this.#blob(-6 * scale, -6 * scale, 70 * k, nowMs, palette.site[1], 0.4);
    this.#blob(-14 * scale, -16 * scale, 44 * k, nowMs, palette.site[2], 1.1);
    ctx.fillStyle = palette.gloss;
    ctx.beginPath();
    ctx.ellipse(-34 * scale, -38 * scale, 13 * scale, 7 * scale, -0.7, 0, Math.PI * 2);
    ctx.fill();

    // Reduzierte Bewegung: keine aufsteigenden Blasen.
    const bubbles = frame.reducedMotion ? 0 : BUBBLE_COUNT;
    for (let i = 0; i < bubbles; i++) {
      const item = bubble(i, nowMs);
      ctx.globalAlpha = item.opacity * opacity;
      this.#drawSprite(sprites.bubble, item.x, item.y, item.size / sprites.bubble.extent);
    }
    ctx.globalAlpha = 1;
  }

  #drawAgents(nowMs: number, frame: SceneFrame, sprites: SceneSprites): void {
    const ctx = this.#ctx;
    const posed: { agent: SceneAgent; pose: AgentPose }[] = this.#agents.agents.map((agent) => ({
      agent,
      pose: agentPose(agent, nowMs, frame.traveling),
    }));
    // Von hinten (oben) nach vorn (unten) zeichnen.
    posed.sort((a, b) => a.pose.y - b.pose.y);
    for (const { agent, pose } of posed) {
      if (pose.opacity <= 0) {
        continue;
      }
      ctx.globalAlpha = pose.opacity;
      switch (agent.kind) {
        case 'drones':
          this.#drawSprite(pose.loaded ? sprites.droneLoaded : sprites.drone, pose.x, pose.y, 1);
          break;
        case 'soldiers':
          this.#drawRotated(sprites.soldier, pose.x, pose.y, pose.heading);
          break;
        case 'queens':
          this.#drawSprite(sprites.queen, pose.x, pose.y, 1);
          break;
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Zeichnet ein Sprite in Szene-Koordinaten um `(x, y)`, um `size` skaliert. */
  #drawSprite(sprite: Sprite, x: number, y: number, size: number): void {
    const extent = sprite.extent * size;
    this.#ctx.drawImage(sprite.image, x - extent, y - extent, extent * 2, extent * 2);
  }

  #drawRotated(sprite: Sprite, x: number, y: number, angle: number): void {
    const ctx = this.#ctx;
    const m = this.#ratio * this.#scale;
    const cos = Math.cos(angle) * m;
    const sin = Math.sin(angle) * m;
    const originX = (this.#ratio * this.#width) / 2 + x * m;
    const originY = (this.#ratio * this.#height) / 2 + y * m;
    ctx.setTransform(cos, sin, -sin, cos, originX, originY);
    ctx.drawImage(
      sprite.image,
      -sprite.extent,
      -sprite.extent,
      sprite.extent * 2,
      sprite.extent * 2,
    );
    ctx.setTransform(m, 0, 0, m, (this.#ratio * this.#width) / 2, (this.#ratio * this.#height) / 2);
  }

  /** Weich wabernder Nahrungsklumpen (Mockup `blob`). */
  #blob(x: number, y: number, r: number, nowMs: number, color: string, offset: number): void {
    const ctx = this.#ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      const radius =
        r +
        Math.sin(angle * 5 + nowMs / 700 + offset) * r * 0.06 +
        Math.sin(angle * 3 - nowMs / 1100) * r * 0.05;
      ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    }
    ctx.fill();
  }
}

import { SwarmDrift, SwarmFrame } from './models/swarm.model';
import { speckGroups, streakLines } from './swarm-drift.utils';
import {
  alternate,
  applyRoll,
  BOB_DURATIONS,
  DEG,
  fraction,
  paddleAngle,
  SWIM_DURATIONS,
  trekAngle,
} from './swarm-motion.utils';

export const SWARM_CANVAS_BOX = { x: -340, y: -340, width: 680, height: 800 } as const;

export function canvasPixelRatio(devicePixelRatio: number): number {
  return Math.min(devicePixelRatio || 1, 3);
}

export function spritePixels(halfExtent: number, pixelRatio: number): number {
  return Math.ceil(2 * halfExtent * Math.min(4, pixelRatio * 1.25));
}

export function spriteDocument(markup: string, halfExtent: number, pixels: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pixels}" height="${pixels}" viewBox="${-halfExtent} ${-halfExtent} ${2 * halfExtent} ${2 * halfExtent}">${markup}</svg>`;
}

export function spriteDataUrl(document: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(document);
}

export function buildSwarmDrift(travel: boolean): SwarmDrift {
  if (!travel) {
    return {
      travel,
      groups: speckGroups().map((g) => {
        const path = new Path2D();
        for (const c of g.circles) {
          path.moveTo(c.x + c.r, c.y);
          path.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        }
        return { color: g.color, path };
      }),
    };
  }
  return {
    travel,
    groups: streakLines().map((line) => {
      const path = new Path2D();
      for (const s of line.segments) {
        path.moveTo(line.x, s.y0);
        path.lineTo(line.x, s.y1);
      }
      return { color: line.color, width: line.width, opacity: line.opacity, path };
    }),
  };
}

export function drawSwarmFrame(ctx: CanvasRenderingContext2D, frame: SwarmFrame): void {
  const k = frame.pixelRatio;
  const time = frame.motion ? frame.now / 1000 : 0;
  const box = SWARM_CANVAS_BOX;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(k, 0, 0, k, -box.x * k, -box.y * k);
  const base = ctx.getTransform();
  const drift = frame.drift;
  if (drift) {
    ctx.rotate(frame.flowRotation * DEG);
    if (drift.travel) {
      ctx.translate(0, -60 + 120 * fraction(time / 2.4));
      ctx.lineCap = 'round';
      for (const q of drift.groups) {
        ctx.globalAlpha = q.opacity;
        ctx.strokeStyle = q.color;
        ctx.lineWidth = q.width;
        ctx.stroke(q.path);
      }
      ctx.globalAlpha = 1;
    } else {
      const u = alternate(time, 18, 0);
      ctx.translate(14 * u, -22 * u);
      for (const q of drift.groups) {
        ctx.fillStyle = q.color;
        ctx.fill(q.path);
      }
    }
  }
  ctx.setTransform(base);
  ctx.rotate(trekAngle(frame.trek, frame.now) * DEG);
  const trek = ctx.getTransform();
  const swirl = frame.swirl ? fraction(time / 140) * 360 * DEG : 0;
  for (const f of frame.figures) {
    const sprite = frame.sprites[f.unit];
    if (!sprite) continue;
    ctx.setTransform(trek);
    if (f.kind === 'bob') {
      ctx.rotate(swirl);
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rotation * DEG);
      ctx.scale(f.scale, f.scale);
      const u = alternate(time, BOB_DURATIONS[f.variant], f.delay);
      const b = 0.97 + 0.06 * u;
      ctx.translate(-3 + 6 * u, -2 + 4 * u);
      ctx.scale(b, b);
    } else if (f.kind === 'paddle') {
      const p = fraction((time + f.paddleDelay) / f.duration);
      ctx.translate(f.x, f.y);
      ctx.rotate((f.start + paddleAngle(f.reverse ? 1 - p : p)) * DEG);
      ctx.translate(f.radius, 0);
      ctx.rotate((f.reverse ? -90 : 90) * DEG);
      ctx.scale(f.scale, f.scale);
      applyRoll(ctx, time, f.roll, f.rollDelay);
    } else {
      const u = alternate(time, SWIM_DURATIONS[f.variant], f.delay);
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rotation * DEG);
      ctx.scale(f.scale, f.scale);
      ctx.translate(-2 + 5 * u, 1 - 2 * u);
      ctx.rotate((-6 + 13 * u) * DEG);
      applyRoll(ctx, time, 1, f.rollDelay);
    }
    const h = sprite.halfExtent;
    ctx.drawImage(sprite.image, -h, -h, 2 * h, 2 * h);
  }
}

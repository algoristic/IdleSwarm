import { UNIT_SPRITE_COLORS } from '../art-palette';
import { keyframeValue } from '../keyframes.utils';
import { Point, smoothSegments } from '../path.utils';
import { EATER_TIMING, EATER_VARIANTS, EaterDetail, VACUOLE_PULSE } from './eater.utils';

const TAU = Math.PI * 2;
const COLORS = UNIT_SPRITE_COLORS.eater;

function trace(ctx: CanvasRenderingContext2D, points: readonly Point[]): void {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [, c1, c2, p] of smoothSegments(points)) {
    ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p[0], p[1]);
  }
  ctx.closePath();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

export function drawEater(
  ctx: CanvasRenderingContext2D,
  variantIndex: number,
  time: number,
  offset: number,
  detail: EaterDetail,
): void {
  const variant = EATER_VARIANTS[variantIndex % EATER_VARIANTS.length];
  const t = time + offset;
  const phase = ((t / EATER_TIMING.outline) % 1) * TAU;
  const body = variant.outline(phase);
  const full = detail === 'full';
  ctx.save();
  ctx.lineJoin = 'round';
  if (full) {
    trace(ctx, body);
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = ctx.strokeStyle = COLORS.glow;
    ctx.lineWidth = 4;
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  trace(ctx, body);
  ctx.fillStyle = ctx.strokeStyle = COLORS.rim;
  ctx.lineWidth = 1.4;
  ctx.fill();
  ctx.stroke();
  ctx.clip();
  ctx.fillStyle = COLORS.shade;
  ctx.fill();
  ctx.translate(-0.5, -1.1);
  ctx.fillStyle = COLORS.body;
  trace(ctx, body);
  ctx.fill();
  ctx.translate(0.5, 1.1);
  ctx.fillStyle = COLORS.inner;
  trace(ctx, variant.inner(phase));
  ctx.fill();
  if (full) {
    ctx.fillStyle = COLORS.alga;
    for (const alga of variant.algae) {
      const angle = alga.rotation * (Math.PI / 180);
      for (const cell of alga.cells) {
        circle(ctx, alga.at[0] + Math.cos(angle) * cell, alga.at[1] + Math.sin(angle) * cell, 0.55);
      }
    }
  }
  const wanderAt = t / EATER_TIMING.nucleus;
  ctx.fillStyle = COLORS.nucleus;
  circle(
    ctx,
    variant.nucleus[0] + keyframeValue(variant.nucleusX, wanderAt),
    variant.nucleus[1] + keyframeValue(variant.nucleusY, wanderAt),
    1.9,
  );
  if (full) {
    const pulse = keyframeValue(VACUOLE_PULSE, t / EATER_TIMING.vacuole);
    ctx.fillStyle = COLORS.vacuole;
    circle(ctx, variant.vacuole[0], variant.vacuole[1], 0.9 * pulse);
  }
  ctx.restore();
}

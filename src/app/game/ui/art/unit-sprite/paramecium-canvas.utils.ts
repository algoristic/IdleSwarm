import { UNIT_SPRITE_COLORS } from '../art-palette';
import { keyframeValue } from '../keyframes.utils';
import { Point, smoothSegments } from '../path.utils';
import { DEGREES, VACUOLE_PULSE, worldLight } from './figure.utils';
import {
  PARAMECIUM_ROLL,
  PARAMECIUM_TIMING,
  PARAMECIUM_VARIANTS,
  VACUOLE_CANALS,
} from './paramecium.utils';
import { SpriteDetail } from './unit-sprite.model';

const TAU = Math.PI * 2;
const COLORS = UNIT_SPRITE_COLORS.eater;

function trace(ctx: CanvasRenderingContext2D, points: readonly Point[], closed = true): void {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [, c1, c2, p] of smoothSegments(points, closed)) {
    ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p[0], p[1]);
  }
  if (closed) ctx.closePath();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

export function drawParamecium(
  ctx: CanvasRenderingContext2D,
  variantIndex: number,
  time: number,
  offset: number,
  detail: SpriteDetail,
): void {
  const variant = PARAMECIUM_VARIANTS[variantIndex % PARAMECIUM_VARIANTS.length];
  const t = time + offset;
  const full = detail === 'full';
  const roll = keyframeValue(PARAMECIUM_ROLL, t / PARAMECIUM_TIMING.roll);
  const ciliaPhase = ((t / PARAMECIUM_TIMING.cilia) % 1) * TAU;
  const ripplePhase = ((t / PARAMECIUM_TIMING.ripple) % 1) * TAU;
  const outline = variant.outline(ripplePhase);
  const matrix = ctx.getTransform();
  const [lightX, lightY] = worldLight(Math.atan2(matrix.b, matrix.a) * DEGREES);
  ctx.save();
  ctx.scale(1, 1 - 0.06 * roll);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (full) {
    trace(ctx, outline);
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = ctx.strokeStyle = COLORS.glow;
    ctx.lineWidth = 4;
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.beginPath();
  for (const [[x, y], [dx, dy]] of variant.cilia(ciliaPhase, ripplePhase)) {
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
  }
  ctx.strokeStyle = COLORS.cilia;
  ctx.lineWidth = full ? 0.4 : 0.55;
  ctx.stroke();
  trace(ctx, outline);
  ctx.fillStyle = ctx.strokeStyle = COLORS.rim;
  ctx.lineWidth = 1.4;
  ctx.fill();
  ctx.stroke();
  ctx.clip();
  ctx.fillStyle = COLORS.shade;
  ctx.fill();
  ctx.translate(lightX, lightY);
  ctx.fillStyle = COLORS.body;
  trace(ctx, outline);
  ctx.fill();
  ctx.translate(-lightX, -lightY);
  ctx.fillStyle = COLORS.inner;
  trace(ctx, variant.innerPoints);
  ctx.fill();
  const groove = -1.1 * roll;
  ctx.translate(0, groove);
  ctx.fillStyle = COLORS.groove;
  trace(ctx, variant.groovePoints);
  ctx.fill();
  circle(ctx, variant.mouth[0], variant.mouth[1], 0.55);
  ctx.strokeStyle = COLORS.groove;
  ctx.lineWidth = 0.8;
  trace(ctx, variant.gulletPoints, false);
  ctx.stroke();
  ctx.translate(0, -groove);
  if (full) {
    ctx.fillStyle = COLORS.food;
    for (const food of variant.foods) {
      const at = (t + food.delay) / PARAMECIUM_TIMING.cyclosis;
      circle(
        ctx,
        keyframeValue(variant.cyclosisX, at),
        keyframeValue(variant.cyclosisY, at),
        food.r,
      );
    }
  }
  const wanderAt = t / PARAMECIUM_TIMING.cyclosis;
  const nx = variant.nucleus[0] + keyframeValue(variant.nucleusX, wanderAt);
  const ny = variant.nucleus[1] + keyframeValue(variant.nucleusY, wanderAt);
  ctx.fillStyle = COLORS.nucleus;
  ctx.beginPath();
  ctx.ellipse(nx, ny, 2.4, 1.6, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = COLORS.micronucleus;
  circle(ctx, nx + 1.7, ny - 1, 0.5);
  if (full) {
    ctx.strokeStyle = ctx.fillStyle = COLORS.vacuole;
    ctx.lineWidth = 0.35;
    for (const vacuole of variant.vacuoles) {
      const pulse = keyframeValue(VACUOLE_PULSE, (t + vacuole.delay) / PARAMECIUM_TIMING.vacuole);
      const [vx, vy] = vacuole.at;
      ctx.beginPath();
      for (const [[x0, y0], [x1, y1]] of VACUOLE_CANALS) {
        ctx.moveTo(vx + x0 * pulse, vy + y0 * pulse);
        ctx.lineTo(vx + x1 * pulse, vy + y1 * pulse);
      }
      ctx.stroke();
      circle(ctx, vx, vy, 0.6 * pulse);
    }
  }
  ctx.restore();
}

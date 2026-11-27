export type RandomSource = () => number;

const LCG_MODULUS = 2147483647;
const LCG_MULTIPLIER = 16807;

export function lcg(seed: number): RandomSource {
  let x = seed % LCG_MODULUS || 1;
  return () => ((x = (x * LCG_MULTIPLIER) % LCG_MODULUS) - 1) / (LCG_MODULUS - 1);
}

type PathPoint = [number, number];

export function blobPath(r: number, seed: number, n = 9, jitter = 0.28, cx = 0, cy = 0): string {
  const random = lcg(seed + 7);
  const points: PathPoint[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 + random() * 0.3;
    const radius = r * (1 - jitter + random() * jitter * 2);
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  const mid = (p: PathPoint, q: PathPoint): PathPoint => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  let d = `M${mid(points[n - 1], points[0])
    .map((v) => v.toFixed(1))
    .join(' ')}`;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const m = mid(p, points[(i + 1) % n]);
    d += `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  }
  return d + 'Z';
}

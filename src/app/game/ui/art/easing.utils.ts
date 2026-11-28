export type Easing = (x: number) => number;

export function cubicBezier(x1: number, y1: number, x2: number, y2: number): Easing {
  const f = (t: number, a: number, b: number): number =>
    3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 18; i++) {
      const m = (lo + hi) / 2;
      if (f(m, x1, x2) < x) lo = m;
      else hi = m;
    }
    return f((lo + hi) / 2, y1, y2);
  };
}

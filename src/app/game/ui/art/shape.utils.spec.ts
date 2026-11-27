import { blobPath, lcg } from './shape.utils';

const firstFive = (seed: number): number[] => {
  const random = lcg(seed);
  return Array.from({ length: 5 }, () => random());
};

const SEED_ONE = [
  0.000007825903601782307, 0.13153778773875702, 0.7556053220812281, 0.4586501316713636,
  0.5327672371945971,
];

describe('lcg', () => {
  it('liefert die Folge des Prototyps', () => {
    expect(firstFive(1)).toEqual(SEED_ONE);
    expect(firstFive(42)).toEqual([
      0.0003287070433876543, 0.5245871017916008, 0.7354235320681926, 0.26330554044182,
      0.3762239710206389,
    ]);
  });

  it('ersetzt Seeds, die auf 0 fallen, durch 1', () => {
    expect(firstFive(0)).toEqual(SEED_ONE);
    expect(firstFive(2147483647)).toEqual(SEED_ONE);
  });

  it('behält negative Seeds wie der Prototyp', () => {
    expect(firstFive(-5)).toEqual([
      -0.00003913231197663798, -0.6576889414877528, -0.7780266118031243, -0.2932506602194632,
      -0.6638361878356303,
    ]);
  });
});

describe('blobPath', () => {
  it('zeichnet mit den Standardwerten', () => {
    expect(blobPath(15, 123)).toBe(
      'M10.2 -3.2Q11.6 0.0 11.6 5.6Q11.6 11.1 6.5 12.9Q1.4 14.6 -2.7 12.8Q-6.8 11.0 -10.7 7.4Q-14.6 3.8 -13.5 -2.4Q-12.5 -8.7 -9.9 -10.8Q-7.4 -13.0 0.3 -14.6Q8.0 -16.2 8.4 -11.2Q8.8 -6.3 10.2 -3.2Z',
    );
  });

  it('zeichnet mit eigener Punktzahl und Streuung', () => {
    expect(blobPath(5.2, 77, 8, 0.12)).toBe(
      'M4.4 -1.5Q4.6 0.0 3.9 2.1Q3.1 4.2 1.0 4.6Q-1.1 4.9 -2.6 3.6Q-4.0 2.2 -4.6 1.1Q-5.2 -0.1 -4.4 -2.1Q-3.5 -4.0 -1.1 -4.8Q1.4 -5.5 2.8 -4.3Q4.2 -3.1 4.4 -1.5Z',
    );
  });

  it('verschiebt den Mittelpunkt', () => {
    expect(blobPath(190, 1000, 10, 0.22, 240.5, -130)).toBe(
      'M405.7 -178.8Q427.0 -129.6 402.5 -43.8Q377.9 42.0 324.8 49.4Q271.6 56.7 214.8 54.3Q157.9 51.9 130.5 9.2Q103.2 -33.4 95.7 -86.0Q88.2 -138.5 94.0 -216.4Q99.9 -294.3 164.4 -303.1Q228.9 -312.0 291.5 -309.9Q354.1 -307.9 369.2 -268.0Q384.4 -228.1 405.7 -178.8Z',
    );
    expect(blobPath(160, 500, 9, 0.35, -812.3, 455.9)).toBe(
      'M-638.0 396.7Q-631.1 456.1 -660.3 510.4Q-689.6 564.7 -743.6 562.5Q-797.5 560.2 -848.7 552.4Q-899.9 544.6 -955.3 523.3Q-1010.6 501.9 -974.7 446.0Q-938.7 390.1 -909.8 349.0Q-880.9 307.9 -829.6 300.4Q-778.2 292.9 -711.6 315.1Q-644.9 337.3 -638.0 396.7Z',
    );
  });
});

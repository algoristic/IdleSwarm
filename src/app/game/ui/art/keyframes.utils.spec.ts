import { evenKeyTimes, keyframeValue } from './keyframes.utils';

const LINEAR = (x: number): number => x;

describe('keyframeValue', () => {
  const frames = { values: [1, 1.2, 0.3, 1], keyTimes: [0, 0.6, 0.72, 1], easing: LINEAR };

  it('trifft die Werte an den Zeitmarken', () => {
    expect(keyframeValue(frames, 0)).toBe(1);
    expect(keyframeValue(frames, 0.6)).toBeCloseTo(1.2);
    expect(keyframeValue(frames, 0.72)).toBeCloseTo(0.3);
  });

  it('interpoliert dazwischen und wiederholt sich', () => {
    expect(keyframeValue(frames, 0.3)).toBeCloseTo(1.1);
    expect(keyframeValue(frames, 1.3)).toBeCloseTo(keyframeValue(frames, 0.3));
  });

  it('wendet das Easing je Abschnitt an', () => {
    const eased = { ...frames, easing: (x: number): number => x * x };
    expect(keyframeValue(eased, 0.3)).toBeCloseTo(1 + 0.2 * 0.25);
  });
});

describe('evenKeyTimes', () => {
  it('verteilt die Zeitmarken gleichmäßig', () => {
    expect(evenKeyTimes(5)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
});

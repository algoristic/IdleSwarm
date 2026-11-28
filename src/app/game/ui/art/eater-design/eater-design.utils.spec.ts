import {
  BACILLUS,
  DIATOM,
  DINOFLAGELLATE,
  HELIOZOAN,
  PRISM,
  SPIRAL,
  STENTOR,
} from './eater-design.utils';

function numbers(path: string): number[] {
  return (path.match(/-?\d*\.?\d+/g) ?? []).map(Number);
}

describe('Entwürfe', () => {
  it('bleiben in der Box des Fresslings', () => {
    const paths = [
      BACILLUS.body,
      BACILLUS.flagellaFrames,
      DINOFLAGELLATE.body,
      DINOFLAGELLATE.tailFrames,
      HELIOZOAN.body,
      DIATOM.body,
      STENTOR.body,
      SPIRAL.crownFrames,
      PRISM.body,
      PRISM.edgeFrames,
      ...PRISM.shards.map((shard) => shard.path),
    ];
    const coordinates = paths.flatMap((path) => numbers(path.replace(/l[^M]*/g, '')));
    expect(Math.max(...coordinates.map(Math.abs))).toBeLessThanOrEqual(12);
    expect(
      Math.max(
        ...SPIRAL.segments.map(
          (s) => Math.abs(Number(s.transform.match(/-?[\d.]+/g)?.[1])) + s.r * 1.25,
        ),
      ),
    ).toBeLessThanOrEqual(12);
    expect(Math.max(...HELIOZOAN.rays.map((ray) => ray.length + 0.4))).toBeLessThanOrEqual(12);
  });
});

import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { Num } from '@app/shared/util/num/num';

import { MAP_CENTER } from '../../domain/sonar-map-logic';
import { toSonarView } from '../../feature/state/sonar.utils';
import type { SonarMapView } from './sonar-map.component.model';
import { layoutSonarMap, type SonarMapTexts } from './sonar-map.layout';

function mapWith(positions: readonly { x: number; y: number }[]): SonarMapView {
  const state = createInitialState({ seed: 'sonar-layout', now: 0 });
  return toSonarView(
    {
      state: {
        ...state,
        map: {
          ...state.map,
          candidates: positions.map((position) => ({
            type: 'algal-mat' as const,
            position,
            size: Num.from(1e4),
            defense: Num.ZERO,
          })),
        },
      },
      selected: null,
    },
    DEFAULT_BALANCE,
  ).map;
}

function textsFor(map: SonarMapView): SonarMapTexts {
  return {
    names: map.nodes.map(() => 'Algenmatte'),
    dna: map.nodes.map(() => null),
    rings: map.rings.map((ring) => String(ring.distance)),
    range: '6 · Reichweite',
    here: 'Algenmatte (hier)',
  };
}

describe('layoutSonarMap', () => {
  it('beschriftet die eigene Position unten, solange dort Platz ist', () => {
    const map = mapWith([{ x: 5, y: 0 }]);
    const layout = layoutSonarMap(map, 1, textsFor(map));
    expect(layout.hereLabel).toMatchObject({ x: 0, anchor: 'middle' });
    expect(layout.hereLabel.y).toBeGreaterThan(0);
  });

  it('weicht mit „(hier)“ Zielen direkt über und unter dem Zentrum aus', () => {
    const map = mapWith([
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]);
    const layout = layoutSonarMap(map, 1, textsFor(map));
    expect(layout.hereLabel.anchor).not.toBe('middle');
    expect(layout.hereLabel.x).not.toBe(0);
  });

  it('setzt Ringnummern und Reichweite unter die Ringe', () => {
    const map = mapWith([{ x: 5, y: 0 }]);
    const layout = layoutSonarMap(map, 1, textsFor(map));
    expect(layout.rangeLabelY).toBeGreaterThan(MAP_CENTER + map.range.radius);
    layout.ringLabelYs.forEach((y, i) =>
      expect(y).toBeGreaterThan(MAP_CENTER + map.rings[i].radius),
    );
  });
});

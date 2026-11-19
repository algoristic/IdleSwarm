import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { Num } from '@app/shared/util/num/num';

import { candidateInfo, candidateInfos } from './map-logic';
import type { SiteCandidate } from './models/map.model';

function candidate(x: number, y: number, defense = 0): SiteCandidate {
  return { type: 'vent', position: { x, y }, size: Num.from(1000), defense: Num.from(defense) };
}

describe('candidateInfo', () => {
  // Game-Design §4.7, Beispiel mit K5 (d = 5,8) und K6 (d = 6,5) aus Beispiel 3.
  const k5 = candidate(5.8, 0, 103);
  const k6 = candidate(0, -6.5, 73);

  it('leitet den Status aus Distanz und Reichweite ab', () => {
    expect(candidateInfo(k5, { x: 0, y: 0 }, 5, DEFAULT_BALANCE).status).toBe('out-of-range');
    expect(candidateInfo(k6, { x: 0, y: 0 }, 5, DEFAULT_BALANCE).status).toBe('unexplored');
  });

  it('deckt bei höherer Reichweite sofort auf', () => {
    expect(candidateInfo(k5, { x: 0, y: 0 }, 6, DEFAULT_BALANCE).status).toBe('in-range');
    expect(candidateInfo(k6, { x: 0, y: 0 }, 6, DEFAULT_BALANCE).status).toBe('out-of-range');
  });

  it('misst die Distanz von der aktuellen Position', () => {
    const info = candidateInfo(candidate(4, 7), { x: 1, y: 3 }, 5, DEFAULT_BALANCE);
    expect(info.distance).toBe(5);
    expect(info.status).toBe('in-range');
    expect(info.travelMs).toBe(50_000);
  });

  it('leitet DNA und Fundchance ab', () => {
    const info = candidateInfo(candidate(3, 0, 26), { x: 0, y: 0 }, 5, DEFAULT_BALANCE);
    expect(info.dna.toNumber()).toBeCloseTo(13.55, 2);
    expect(info.findChance).toBe(0.2);
    expect(info.travelMs).toBe(30_000);
  });

  it('liefert die Werte in der Reihenfolge der Kandidaten', () => {
    const infos = candidateInfos([k6, k5], { x: 0, y: 0 }, 5, DEFAULT_BALANCE);
    expect(infos.map(({ status }) => status)).toEqual(['unexplored', 'out-of-range']);
  });
});

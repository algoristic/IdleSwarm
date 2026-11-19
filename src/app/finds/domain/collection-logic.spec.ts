import { DEFAULT_BALANCE } from '@app/balance/domain/constants';

import {
  badgeEffect,
  badgeEffects,
  collectionProgress,
  earnedBadges,
  findsDrawer,
  isSetComplete,
  setProgress,
} from './collection-logic';
import { initialFinds } from './finds-logic';
import type { CollectedId, Finds } from './models/finds.model';

const params = DEFAULT_BALANCE;

function withCollected(collected: Partial<Record<CollectedId, number>>): Finds {
  return { ...initialFinds('sammlung'), collected };
}

describe('Sammlung und Badges (Game-Design §4.17)', () => {
  it('zählt x / 3 je Set und erkennt vollständige Sets', () => {
    const finds = withCollected({ pyrite: 1, magnetite: 1, pumice: 1 });
    expect(setProgress(finds, 'deep-stones')).toEqual({ found: 2, total: 3 });
    expect(isSetComplete(finds, 'deep-stones')).toBe(false);
    const complete = withCollected({ pyrite: 1, magnetite: 1, 'basalt-pebble': 1 });
    expect(isSetComplete(complete, 'deep-stones')).toBe(true);
    expect(earnedBadges(complete)).toEqual(['deep-stones']);
  });

  it('leitet Badge-Effekte mit `<setId>BadgeEffect` ab', () => {
    expect(badgeEffects(initialFinds('leer'), params)).toEqual([]);
    const all = withCollected({
      'bone-splinter': 1,
      'fat-pearl': 1,
      'tooth-scale': 1,
      pumice: 1,
      'foam-ball': 1,
      'clay-bead': 1,
    });
    expect(badgeEffects(all, params)).toEqual([
      { target: 'combatLoss', op: 'mul', value: 0.95 },
      { target: 'findChance', op: 'add', value: 0.1 },
    ]);
    expect(badgeEffects(all, { ...params, driftBadgeEffect: 0.3 })[1]).toMatchObject({
      value: 0.3,
    });
  });

  it('nennt den Bonus jedes Badges, auch ohne vollständiges Set', () => {
    expect(badgeEffect('mat-relics', params)).toEqual({
      target: 'collectRate',
      op: 'add',
      value: 0.05,
    });
    expect(badgeEffect('whale-relics', { ...params, whaleRelicsBadgeEffect: 0.9 })).toEqual({
      target: 'combatLoss',
      op: 'mul',
      value: 0.9,
    });
  });

  it('rechnet den Fortschritt x / y; v1 y = 24 (Mockup „3 / 24“)', () => {
    expect(collectionProgress(initialFinds('leer'), params)).toEqual({ found: 0, total: 24 });
    // Zwei Schwefelperlen und ein Urzeitkristall wie im Mockup.
    const mockup = withCollected({ 'sulfur-pearl': 2, 'primal-crystal': 1 });
    expect(collectionProgress(mockup, params)).toEqual({ found: 3, total: 24 });
    // Ein Zähler über der benötigten Zahl zählt wie die benötigte Zahl.
    const surplus = withCollected({ chloroplast: 7, stromatolite: 1 });
    expect(collectionProgress(surplus, params)).toEqual({ found: 3, total: 24 });
    expect(collectionProgress(surplus, { ...params, sulfurShellFragments: 7 }).total).toBe(26);
  });

  it('liefert die Schublade „Funde“ mit bekannten und unbekannten Feldern', () => {
    const drawer = findsDrawer(withCollected({ 'sulfur-pearl': 2, pyrite: 1 }), params);
    expect(drawer.progress).toEqual({ found: 3, total: 24 });
    expect(drawer.sets.map((set) => set.id)).toEqual([
      'mat-relics',
      'deep-stones',
      'whale-relics',
      'drift',
    ]);
    expect(drawer.sets[1]).toEqual({
      id: 'deep-stones',
      progress: { found: 1, total: 3 },
      badge: false,
      fields: [
        { id: 'pyrite', known: true },
        { id: 'basalt-pebble', known: false },
        { id: 'magnetite', known: false },
      ],
    });
    const sulfur = drawer.fragments.find((group) => group.adaptation === 'sulfur-shell');
    expect(sulfur).toEqual({
      adaptation: 'sulfur-shell',
      fragment: 'sulfur-pearl',
      progress: { found: 2, total: 5 },
      unlocked: false,
      fields: [true, true, false, false, false].map((known) => ({ id: 'sulfur-pearl', known })),
    });
    const fields = drawer.sets.flatMap((set) => set.fields).length;
    expect(fields + drawer.fragments.flatMap((group) => group.fields).length).toBe(24);
  });
});

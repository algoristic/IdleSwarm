import { BALANCE_V1 } from '@app/balance/domain/balance-v1.testing';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';

import { Onboarding } from './models/onboarding.model';
import {
  hintsOfUnlocks,
  isHintAvailable,
  isUnlocked,
  markHintSeen,
  pendingHints,
  reachedUnlocks,
  resetHints,
  START_ONBOARDING,
  unlockProgress,
  updateUnlocks,
} from './onboarding-logic';

const start = Object.freeze(createInitialState({ seed: 'onboarding', now: 0 }, BALANCE_V1));

function withPatch(patch: Partial<GameState>): GameState {
  return { ...start, ...patch };
}

describe('updateUnlocks (Game-Design §4.18)', () => {
  it('schaltet im Startzustand nichts frei und gibt denselben Zustand zurück', () => {
    expect(updateUnlocks(start, BALANCE_V1)).toBe(start);
  });

  it.each([
    [
      'Nahrung reicht für den nächsten Drüsenpunkt',
      withPatch({ res: { food: Num.from(100), dna: Num.ZERO } }),
    ],
    ['Drüsenpunkt gekauft', withPatch({ pheromones: { ...start.pheromones, glands: 1 } })],
  ])('schaltet Pheromone frei: %s', (_name, state) => {
    expect(updateUnlocks(state, BALANCE_V1).onboarding.unlocked).toEqual(['pheromones']);
  });

  it('rechnet den Drüsenpreis mit der Zahl gekaufter Punkte', () => {
    // Freigeschaltet ist es dann schon über den Punkt; der Preis zählt nur ohne Punkt.
    const poor = withPatch({ res: { food: Num.from(99.9), dna: Num.ZERO } });
    expect(updateUnlocks(poor, BALANCE_V1)).toBe(poor);
    const cheap = { ...BALANCE_V1, glandCost: 50 };
    expect(updateUnlocks(poor, cheap).onboarding.unlocked).toEqual(['pheromones']);
  });

  it.each([
    ['Vorrat genau 25 %', withPatch({ site: { ...start.site, stock: Num.from(5000) } })],
    ['schon gezogen', withPatch({ map: { ...start.map, moves: 1 } })],
    ['unterwegs', withPatch({ travel: { target: start.map.candidates[0], remainingMs: 1000 } })],
  ])('schaltet die Umgebung frei: %s', (_name, state) => {
    expect(updateUnlocks(state, BALANCE_V1).onboarding.unlocked).toEqual(['map']);
  });

  it('schaltet die Umgebung über 25 % Vorrat nicht frei', () => {
    const state = withPatch({ site: { ...start.site, stock: Num.from(5000.5) } });
    expect(updateUnlocks(state, BALANCE_V1)).toBe(state);
  });

  it('schaltet Funde ab dem ersten Fund und das Genom ab der ersten DNA frei', () => {
    const found = withPatch({ finds: { ...start.finds, total: 1 } });
    expect(updateUnlocks(found, BALANCE_V1).onboarding.unlocked).toEqual(['finds']);
    const dna = withPatch({ res: { food: start.res.food, dna: Num.from(1e-3) } });
    expect(updateUnlocks(dna, BALANCE_V1).onboarding.unlocked).toEqual(['genome']);
    const evolved = withPatch({ genome: { owned: ['cilia-1'] } });
    expect(updateUnlocks(evolved, BALANCE_V1).onboarding.unlocked).toEqual(['genome']);
  });

  it('ergänzt in Listenreihenfolge und nimmt nichts zurück', () => {
    const partly = withPatch({
      onboarding: { unlocked: ['genome'], seenHints: ['collect'] },
      res: { food: Num.from(500), dna: Num.ZERO },
    });
    const next = updateUnlocks(partly, BALANCE_V1);
    expect(next.onboarding).toEqual({ unlocked: ['pheromones', 'genome'], seenHints: ['collect'] });
    expect(next.onboarding.seenHints).toBe(partly.onboarding.seenHints);
  });

  it('prüft nichts mehr, wenn alles freigeschaltet ist', () => {
    const all = withPatch({
      onboarding: { unlocked: ['pheromones', 'map', 'finds', 'genome'], seenHints: [] },
    });
    expect(updateUnlocks(all, BALANCE_V1)).toBe(all);
  });

  it('liefert dieselbe Liste, wenn nichts dazukommt', () => {
    const unlocked = ['finds'] as const;
    expect(reachedUnlocks(unlocked, unlockProgress(start), BALANCE_V1)).toBe(unlocked);
  });
});

describe('Hinweise (US-09.04)', () => {
  const onboarding: Onboarding = Object.freeze({
    unlocked: Object.freeze(['map'] as const),
    seenHints: Object.freeze(['map'] as const),
  });

  it('zeigt den Start-Hinweis immer und die übrigen erst mit ihrem Teil', () => {
    expect(pendingHints(START_ONBOARDING)).toEqual(['collect']);
    expect(pendingHints(onboarding)).toEqual(['collect', 'auto-move']);
    expect(isHintAvailable(onboarding, 'genome')).toBe(false);
    expect(isUnlocked(onboarding, 'map')).toBe(true);
  });

  it('ordnet jeder Freischaltung ihre Hinweise zu', () => {
    expect(hintsOfUnlocks(['map', 'pheromones'])).toEqual(['pheromones', 'map', 'auto-move']);
    expect(hintsOfUnlocks([])).toEqual([]);
  });

  it('markiert einen Hinweis einmal und setzt alle zurück', () => {
    const seen = markHintSeen(onboarding, 'collect');
    expect(seen).toEqual({ unlocked: ['map'], seenHints: ['collect', 'map'] });
    expect(markHintSeen(seen, 'map')).toBe(seen);
    expect(resetHints(seen)).toEqual({ unlocked: ['map'], seenHints: [] });
    expect(resetHints(START_ONBOARDING)).toBe(START_ONBOARDING);
  });
});

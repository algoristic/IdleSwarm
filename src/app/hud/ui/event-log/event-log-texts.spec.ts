import type { GameEvent } from '@app/engine/domain/models/game-event.model';
import { Num } from '@app/shared/util/num/num';

import { eventLogText } from './event-log-texts';

describe('eventLogText', () => {
  const departed = (change: Partial<Extract<GameEvent, { type: 'departed' }>> = {}): GameEvent => ({
    type: 'departed',
    playedMs: 0,
    siteType: 'whale-fall',
    distance: 4,
    leftBehind: { drones: Num.from(12.7), soldiers: Num.ZERO },
    forfeitedStock: Num.from(120.2),
    auto: false,
    ...change,
  });

  const arrived = (losses: number, dna = 13.55): GameEvent => ({
    type: 'arrived',
    playedMs: 0,
    siteType: 'whale-fall',
    losses: Num.from(losses),
    dna: Num.from(dna),
  });

  it('meldet den Aufbruch mit Zurückgelassenen und verfallenem Vorrat', () => {
    expect(eventLogText(departed())).toBe(
      'Aufbruch zu Walsturz (Distanz 4,0) · 13 Drohnen zurückgelassen · Restvorrat 121 verfallen',
    );
  });

  it('nennt nur, was zurückbleibt, in Ein- und Mehrzahl, und kennzeichnet den Auto-Aufbruch', () => {
    expect(
      eventLogText(
        departed({
          leftBehind: { drones: Num.ZERO, soldiers: Num.ONE },
          forfeitedStock: Num.ZERO,
          auto: true,
        }),
      ),
    ).toBe('Aufbruch zu Walsturz (Distanz 4,0) · 1 Soldat zurückgelassen · automatisch');
    expect(
      eventLogText(
        departed({
          leftBehind: { drones: Num.ONE, soldiers: Num.from(3) },
          forfeitedStock: Num.ZERO,
        }),
      ),
    ).toBe(
      'Aufbruch zu Walsturz (Distanz 4,0) · 1 Drohne zurückgelassen · 3 Soldaten zurückgelassen',
    );
  });

  it('rundet Zurückgelassene auf wie die Vorschau, ein Bruchteil fällt nicht weg', () => {
    expect(
      eventLogText(
        departed({
          leftBehind: { drones: Num.from(0.2), soldiers: Num.from(2.3) },
          forfeitedStock: Num.ZERO,
        }),
      ),
    ).toBe(
      'Aufbruch zu Walsturz (Distanz 4,0) · 1 Drohne zurückgelassen · 3 Soldaten zurückgelassen',
    );
  });

  it('meldet die Ankunft mit aufgerundeten Verlusten und abgerundeter DNA (Beispiel 7)', () => {
    expect(eventLogText(arrived(9.73))).toBe(
      'Ankunft: Walsturz eingenommen · −10 Soldaten · +13 DNA',
    );
    expect(eventLogText(arrived(2.3))).toBe(
      'Ankunft: Walsturz eingenommen · −3 Soldaten · +13 DNA',
    );
    expect(eventLogText(arrived(1))).toBe('Ankunft: Walsturz eingenommen · −1 Soldat · +13 DNA');
    expect(eventLogText(arrived(0, 1))).toBe(
      'Ankunft: Walsturz eingenommen · ohne Verluste · +1 DNA',
    );
    // Ein Bruchteil eines Soldaten erscheint als „−1“, nie als „−0“ oder „ohne Verluste“.
    expect(eventLogText(arrived(0.3))).toBe('Ankunft: Walsturz eingenommen · −1 Soldat · +13 DNA');
  });

  it('schreibt Zahlen im eingestellten Zahlenformat', () => {
    const event = arrived(2.5e6, 1.2345e10);
    expect(eventLogText(event)).toBe(
      'Ankunft: Walsturz eingenommen · −2,50 Mio. Soldaten · +12,34 Mrd. DNA',
    );
    expect(eventLogText(event, 'scientific')).toBe(
      'Ankunft: Walsturz eingenommen · −2,50e6 Soldaten · +1,23e10 DNA',
    );
    expect(eventLogText(event, 'engineering')).toBe(
      'Ankunft: Walsturz eingenommen · −2,50e6 Soldaten · +12,34e9 DNA',
    );
  });

  it('meldet die leere Futterstelle', () => {
    expect(eventLogText({ type: 'siteDepleted', playedMs: 0, siteType: 'vent' })).toBe(
      'Futterstelle leer: Hydrothermaler Schlot',
    );
  });

  it('meldet eine entwickelte Adaption mit Namen und Kosten', () => {
    expect(
      eventLogText({ type: 'evolved', playedMs: 0, node: 'chemotaxis', cost: Num.from(253) }),
    ).toBe('Adaption entwickelt: Chemotaxis · −253 DNA');
  });

  describe('Funde', () => {
    const found = (change: Partial<Extract<GameEvent, { type: 'found' }>> = {}): GameEvent => ({
      type: 'found',
      playedMs: 0,
      siteType: 'vent',
      trigger: 'arrival',
      harvestShare: null,
      entry: 'foreign-dna',
      kind: 'dna',
      replaced: null,
      amount: null,
      buffExpiresAtMs: null,
      fragment: null,
      unlocked: null,
      badge: null,
      ...change,
    });

    it('meldet DNA und Nahrung abgerundet mit Futterstelle und Auslöser', () => {
      expect(eventLogText(found({ amount: Num.from(13.97) }))).toBe(
        'Fund: Fremde DNA · +13 DNA · Hydrothermaler Schlot, Einnahme',
      );
      expect(
        eventLogText(
          found({
            entry: 'nutrient-bubble',
            kind: 'food',
            amount: Num.from(1000.6),
            trigger: 'harvest',
            harvestShare: 0.5,
          }),
        ).replace(/\s/g, ' '),
      ).toBe('Fund: Nährstoffblase · +1.000 Nahrung · Hydrothermaler Schlot, 50,0 % abgebaut');
    });

    it('nennt beim Ersatz den ursprünglichen Eintrag', () => {
      expect(eventLogText(found({ replaced: 'pyrite', amount: Num.from(11) }))).toBe(
        'Fund: Fremde DNA statt Pyrit · +11 DNA · Hydrothermaler Schlot, Einnahme',
      );
    });

    it('meldet Buff-Ablauf, Fragmentfortschritt, Freischaltung und Badge', () => {
      expect(
        eventLogText(found({ entry: 'plankton-bloom', kind: 'buff', buffExpiresAtMs: 660_000 })),
      ).toBe('Fund: Planktonblüte · wirkt bis 11 min · Hydrothermaler Schlot, Einnahme');
      expect(
        eventLogText(
          found({
            entry: 'thermophile',
            kind: 'fragment',
            fragment: { found: 3, required: 3 },
            unlocked: 'thermosynthesis',
          }),
        ),
      ).toBe(
        'Fund: Thermophile Mikrobe · 3 / 3 · Thermosynthese freigeschaltet · Hydrothermaler Schlot, Einnahme',
      );
      expect(
        eventLogText(found({ entry: 'magnetite', kind: 'collectible', badge: 'deep-stones' })),
      ).toBe('Fund: Magnetit · Badge Steinkundler erhalten · Hydrothermaler Schlot, Einnahme');
    });
  });
});

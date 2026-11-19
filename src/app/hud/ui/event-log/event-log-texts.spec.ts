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
      'Aufbruch zu Walsturz (Distanz 4,0) · 12 Drohnen zurückgelassen · Restvorrat 121 verfallen',
    );
  });

  it('nennt nur, was zurückbleibt, in Ein- und Mehrzahl, und kennzeichnet den Auto-Aufbruch', () => {
    expect(
      eventLogText(
        departed({
          leftBehind: { drones: Num.from(0.4), soldiers: Num.ONE },
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

  it('meldet die Ankunft mit Verlusten und DNA (Beispiel 7)', () => {
    expect(eventLogText(arrived(9.73))).toBe(
      'Ankunft: Walsturz eingenommen · −9 Soldaten · +13 DNA',
    );
    expect(eventLogText(arrived(1))).toBe('Ankunft: Walsturz eingenommen · −1 Soldat · +13 DNA');
    expect(eventLogText(arrived(0, 1))).toBe(
      'Ankunft: Walsturz eingenommen · ohne Verluste · +1 DNA',
    );
    // Unter einem Soldaten weder „−0“ noch „ohne Verluste“.
    expect(eventLogText(arrived(0.3))).toBe('Ankunft: Walsturz eingenommen · +13 DNA');
  });

  it('meldet die leere Futterstelle', () => {
    expect(eventLogText({ type: 'siteDepleted', playedMs: 0, siteType: 'vent' })).toBe(
      'Futterstelle leer: Hydrothermaler Schlot',
    );
  });
});

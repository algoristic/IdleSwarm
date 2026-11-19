# ADR-004: Unveränderlicher State, Kommandos als reine Funktionen

**Status:** Angenommen
**Datum:** 2026-11-18

## Kontext

Eingaben und der Logik-Takt ändern denselben Spielzustand. Die Oberfläche beobachtet ihn über Signals, Tests und die Modell-Seite brauchen nachvollziehbare Übergänge ([Konzept §3.3](../technisches-konzept.md#33-datenfluss)).

## Entscheidung

- Das Spielgeschehen ändert sich nur über zwei Funktionen: `apply(state, cmd)` für Kommandos und `step(state, dt)` für den Zeitfortschritt.
- Beide verändern ihre Eingabe nicht und liefern neue Objekte, als flache Kopien der geänderten Teile.
- `syncClock(state, nowMs)` führt nur `time.now` nach, ohne dass Spielzeit vergeht. Nach Laden und Speichern ersetzt der GameStore den Zustand als Ganzes.
- Abgeleitete Werte (Raten, Preise, Einnehmbarkeit) stehen nicht im State. Sie entstehen über reine Funktionen in `balance/domain` und werden in `computed()` gekapselt.
- `step` gibt Ereignisse als Liste zurück. Log, Effekte und Rückkehr-Zusammenfassung lesen sie.

### Umsetzungsstand

**Umgesetzt:**

- [`engine/domain/commands-logic.ts`](../../src/app/engine/domain/commands-logic.ts): Typ `Command` mit `noop`, `buy`, `sacrificeDrones`, `convertDronesToQueen`, `setTransportPriority`, `depart` und `setAutoMove` (seit M1.2; `newSite` ist mit dem Provisorium entfallen), seit M1.3 `setPheromones`, `strengthenGland` und `evolve`. `applyCommand` liefert wie `step` `{ state, events }`, `apply` ist die Kurzform ohne Ereignisse. Fehlt ein Fall in `applyCommand`, schlägt das Kompilieren fehl. Ein wirkungsloses Kommando liefert denselben Zustand ohne Ereignisse.
- [`engine/domain/step-logic.ts`](../../src/app/engine/domain/step-logic.ts): `step` führt Reise, Grundertrag, Sammeln, Brut, seit M1.3 die Fundziehungen und den Ablauf der Buffs sowie das Auto-Weiterziehen aus und liefert `{ state, events }`.
- [`engine/domain/models/game-event.model.ts`](../../src/app/engine/domain/models/game-event.model.ts): `GameEvent` und `StepResult`; die Ereignisse `departed`, `arrived` und `siteDepleted` definiert [`site/domain/models/site-event.model.ts`](../../src/app/site/domain/models/site-event.model.ts) als Codes mit IDs, Rohwerten und `playedMs`; seit M1.3 kommen `evolved` ([`genome-event.model.ts`](../../src/app/genome/domain/models/genome-event.model.ts)) und `found` ([`finds-event.model.ts`](../../src/app/finds/domain/models/finds-event.model.ts)) dazu.
- [`engine/domain/models/game-state.model.ts`](../../src/app/engine/domain/models/game-state.model.ts): alle Felder sind `readonly`. Effekte und Modifikatoren stehen nicht im Zustand; `stateModifiers` ([`engine/domain/modifiers-logic.ts`](../../src/app/engine/domain/modifiers-logic.ts)) leitet sie bei jeder Berechnung aus den gespeicherten Quellen ab.
- [`engine/data-access/game-store/game-store.service.ts`](../../src/app/engine/data-access/game-store/game-store.service.ts): `dispatch` wendet Kommandos über `applyCommand` sofort an, `tick` ruft `step` auf; der Zustand ist nach außen nur lesbar. Die Ereignisse beider landen im Ereignis-Log (`log`, höchstens 50 Einträge, nur im Arbeitsspeicher), das das HUD anzeigt. `load` setzt ein anderes Spiel ein (Laden, neues Spiel) und leert das Log; `replace` ersetzt den Zustand desselben Spiels (Speichern, Uhrabgleich), das Log bleibt.

**Geplant:** Weitere Kommandos und Ereignisse folgen mit den Mechaniken ab M1.4; Effekte und Rückkehr-Zusammenfassung lesen die Ereignisse später ebenfalls.

## Konsequenzen

- Der Zustand passt direkt zu Signals, Tests bleiben einfach.
- Dieselben Funktionen sind ohne Oberfläche nutzbar.
- Negativ: Jede Änderung erzeugt neue Objekte für die geänderten Teile.
- Negativ: Die Unveränderlichkeit des States sichert nur der Compiler über `readonly`; zur Laufzeit ist er nicht eingefroren. `Num` dagegen ist auch zur Laufzeit eingefroren.
- Negativ: Jedes neue Kommando braucht einen eigenen Typ und einen Fall in `apply`.

## Verworfene Alternativen

- **Direkte Mutation des Zustands:** passt nicht zu Signals und erschwert Tests.
- **Abgeleitete Werte im State speichern:** Sie müssten mit ihren Grundwerten synchron gehalten werden und würden in Spielstände gelangen.

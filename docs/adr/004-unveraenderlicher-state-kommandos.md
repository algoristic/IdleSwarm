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

- [`engine/domain/commands-logic.ts`](../../src/app/engine/domain/commands-logic.ts): Typ `Command` und `apply` mit `noop`, `newSite` und `buy`; fehlt ein Fall in `apply`, schlägt das Kompilieren fehl.
- [`engine/domain/step-logic.ts`](../../src/app/engine/domain/step-logic.ts): `step` führt Grundertrag, Sammeln und Brut aus und liefert `{ state, events }`. Die Ereignisliste ist noch leer.
- [`engine/domain/models/game-state.model.ts`](../../src/app/engine/domain/models/game-state.model.ts): alle Felder sind `readonly`.
- [`engine/data-access/game-store/game-store.service.ts`](../../src/app/engine/data-access/game-store/game-store.service.ts): `dispatch` wendet Kommandos sofort an, `tick` ruft `step` auf; der Zustand ist nach außen nur lesbar.

**Geplant:** Weitere Kommandos und die Ereignisse von `step` folgen mit den Mechaniken ab M1.2.

## Konsequenzen

- Der Zustand passt direkt zu Signals, Tests bleiben einfach.
- Dieselben Funktionen sind ohne Oberfläche nutzbar.
- Negativ: Jede Änderung erzeugt neue Objekte für die geänderten Teile.
- Negativ: Die Unveränderlichkeit des States sichert nur der Compiler über `readonly`; zur Laufzeit ist er nicht eingefroren. `Num` dagegen ist auch zur Laufzeit eingefroren.
- Negativ: Jedes neue Kommando braucht einen eigenen Typ und einen Fall in `apply`.

## Verworfene Alternativen

- **Direkte Mutation des Zustands:** passt nicht zu Signals und erschwert Tests.
- **Abgeleitete Werte im State speichern:** Sie müssten mit ihren Grundwerten synchron gehalten werden und würden in Spielstände gelangen.

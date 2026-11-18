# ADR-004: Unveränderlicher State, Kommandos als reine Funktionen

**Status:** Angenommen
**Datum:** 2026-11-18

## Kontext

Eingaben und der Logik-Takt ändern denselben Spielzustand. Die Oberfläche beobachtet ihn über Signals, Tests und die Modell-Seite brauchen nachvollziehbare Übergänge ([Konzept §3.3](../technisches-konzept.md#33-datenfluss)).

## Entscheidung

- Das Spielgeschehen ändert sich nur über zwei Funktionen: `apply(state, cmd)` für Kommandos und `step(state, dt)` für den Zeitfortschritt.
- Beide verändern ihre Eingabe nicht und liefern neue Objekte, als flache Kopien der geänderten Teile.
- `syncClock(state, nowMs)` führt nur `time.now` nach, ohne dass Spielzeit vergeht. Nach Laden und Speichern ersetzt der GameStore den Zustand als Ganzes.
- Abgeleitete Werte (Raten, Preise, Einnehmbarkeit) stehen nicht im State. Sie entstehen über reine Funktionen in `core/balance` und werden in `computed()` gekapselt.
- `step` gibt Ereignisse als Liste zurück. Log, Effekte und Rückkehr-Zusammenfassung lesen sie.

### Umsetzungsstand

**Umgesetzt:**

- [`core/rules/commands.ts`](../../src/app/core/rules/commands.ts): Typ `Command` und `apply` mit `noop`, `newSite` und `buy`; fehlt ein Fall in `apply`, schlägt das Kompilieren fehl.
- [`core/sim/step.ts`](../../src/app/core/sim/step.ts): `step` führt Grundertrag, Sammeln und Brut aus und liefert `{ state, events }`. Die Ereignisliste ist noch leer.
- [`core/state/game-state.ts`](../../src/app/core/state/game-state.ts): alle Felder sind `readonly`.
- [`game/game-store.service.ts`](../../src/app/game/game-store.service.ts): `dispatch` wendet Kommandos sofort an, `tick` ruft `step` auf; der Zustand ist nach außen nur lesbar.

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

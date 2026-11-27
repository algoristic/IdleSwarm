# ADR 0001: Spielzustand im Store

- **Status:** angenommen
- **Datum:** 27.11.2026

## Kontext

Die Regeln in `game/domain` mutieren einen `GameState` (Golden Master, exakte Reihenfolge wie im Prototyp). Die Oberfläche ist zoneless und liest nur Signals. Ein Frame führt je nach verstrichener Zeit und Tempo null bis 2000 Schritte aus. Ansichten leiten Teilwerte per `computed` ab, auch aus verschachtelten Objekten (`state.travel`, `state.sites`, `state.stats`). Plattformzugriffe brauchen Tokens, damit Tests sie ersetzen können.

## Entscheidung

- `GameStoreService` (`game/data-access/game-store`) hält den Spielzustand privat und lässt die Domäne ihn mutieren.
- Nach jedem Frame mit mindestens einem Schritt, nach jeder Spieleraktion und nach jedem Speichern gibt der Store einen Schnappschuss aus: `structuredClone` des internen Zustands als neuer Wert des Signals `state`. Frames ohne Schritt erzeugen keinen neuen Wert.
- Der Schnappschuss hat den Typ `GameState`. Er ist eine Kopie, Änderungen daran wirken nicht aufs Spiel. Ein tiefes Readonly passt nicht ohne Casts zu den Domänenfunktionen, die `GameState` erwarten (`derive(config, state)` u. a.), darum entfällt es.
- Ereignisse aus `step` landen in einem Protokoll (Signal `events`) mit fortlaufender ID je Ereignis (`{ id, event }`), höchstens die letzten 50. Ein neues Array entsteht nur bei neuen Ereignissen. Verbraucher merken sich die zuletzt gesehene ID; so geht bei zusammengefassten Frames nichts verloren. Ein neues Spiel oder ein Import leert das Protokoll, die IDs zählen weiter.
- `GameLoopService` (`game/data-access/game-loop`) treibt die Schleife über `requestAnimationFrame` mit dem festen `dt`-Akkumulator aus der Domäne (`advanceClock`, `isSaveDue`) und einem Tempo-Signal.
- `GameSaveService` (`game/data-access/game-save`) liest und schreibt den Spielstand unter `idleswarm-save` (`parseSave`, `serializeGame`).
- Plattformzugriffe liegen hinter Tokens mit Root-Default: `GAME_CONFIG`, `SAVE_STORAGE`, `WALL_CLOCK_NOW`, `NEW_GAME_SEED`, `FRAME_SCHEDULER`, `MONOTONIC_NOW`, `PAGE_VISIBILITY`.

## Konsequenzen

- Jeder Schnappschuss kostet eine tiefe Kopie, höchstens eine je Frame und Aktion, unabhängig von der Zahl der Schritte.
- Jeder Schnappschuss ist eine neue Referenz bis in alle Teilobjekte. `computed`s, die Teilobjekte liefern, rechnen bei jedem Schnappschuss neu; wer das vermeiden will, leitet Rohwerte ab oder setzt eine eigene `equal`-Funktion.
- In Frames ohne Schritt ändert sich nichts. Eine flüssige Darstellung zwischen den Schritten (Interpolation über `acc / dt`) kommt später separat.

## Verworfene Alternativen

- **Gleiche Referenz mit `equal: () => false`:** Das Signal meldet jede Änderung, aber `computed`s, die ein Teilobjekt zurückgeben, vergleichen per `Object.is`, sehen dieselbe Referenz und aktualisieren abhängige Ansichten nicht. Außerdem könnten Verbraucher den Spielzustand am Store vorbei ändern.
- **Versionszähler neben dem Zustand:** dieselbe Falle; jede Ableitung müsste den Zähler zusätzlich lesen, sonst bleibt sie stehen.

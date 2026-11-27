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
- Plattformzugriffe liegen hinter Tokens mit Root-Default: `GAME_CONFIG`, `SAVE_STORAGE`, `WALL_CLOCK_NOW`, `NEW_GAME_SEED`, `FRAME_SCHEDULER`, `MONOTONIC_NOW`, `PAGE_VISIBILITY`, `CATCH_UP_WORKER_FACTORY`.

### Nachberechnung

- Die Offline-Nachberechnung (`catchUp` aus der Domäne) läuft im Web Worker `game/data-access/catch-up/catch-up.worker.ts`, der nur Domänencode importiert. `CatchUpService` schickt Config, Schnappschuss und Sekunden, empfängt Fortschritt je Block und das Ergebnis und beendet den Worker danach.
- Gibt es keinen Worker oder schlägt er fehl (Fabrik `null`, Fehler, ungültige Antwort), rechnet der Service dieselbe Domänenfunktion auf einer Kopie im Hauptthread nach.
- `GameLoopService` startet die Nachberechnung beim Start mit geladenem Spielstand, bei `start()` nach `stop()` und beim Sichtbarwerden nach mehr als 2 s. Für die Dauer hält er die Frames an und der Store ist gesperrt: Aktionen liefern `null`, `advance`, `replace` und `newGame` wirken nicht, `save()` schreibt nicht. So bleibt der alte Stand mit altem `savedAt` gespeichert, und wer die Seite währenddessen schließt, bekommt die Zeit beim nächsten Laden nachberechnet.
- Das Ergebnis übernimmt der Store mit einem Schnappschuss, ohne das Ereignisprotokoll zu leeren. Es läuft nie mehr als eine Nachberechnung; Lücken, die währenddessen anfallen, rechnet die Schleife danach nach. Nach `stop()` oder dem Zerstören wird ein laufendes Ergebnis verworfen.
- Beim Übernehmen setzt die Schleife `savedAt` des Zustands im Speicher auf den Zeitpunkt, zu dem der Lauf angefragt wurde. Ein `start()` nach `stop()` rechnet so nur die noch offene Zeit nach; die Platte behält den alten Stand, der beim nächsten Laden vollständig nachrechnet.
- Zusammenfassungen, die noch nicht verworfen sind, führt die Schleife zu einer zusammen (`mergeCatchUpSummaries`).
- Bekannte Einschränkungen: Ein Worker, der nie antwortet, hat keine Zeitgrenze; die Sperre bleibt dann bis `stop()` bestehen. Der Fallback im Hauptthread rechnet ohne Zwischenpausen und blockiert die Seite für die Dauer (der Prototyp wartete je Block); er ist der seltene Fall ohne Worker.

## Konsequenzen

- Jeder Schnappschuss kostet eine tiefe Kopie, höchstens eine je Frame und Aktion, unabhängig von der Zahl der Schritte.
- Jeder Schnappschuss ist eine neue Referenz bis in alle Teilobjekte. `computed`s, die Teilobjekte liefern, rechnen bei jedem Schnappschuss neu; wer das vermeiden will, leitet Rohwerte ab oder setzt eine eigene `equal`-Funktion.
- In Frames ohne Schritt ändert sich nichts. Eine flüssige Darstellung zwischen den Schritten (Interpolation über `acc / dt`) kommt später separat.

## Verworfene Alternativen

- **Gleiche Referenz mit `equal: () => false`:** Das Signal meldet jede Änderung, aber `computed`s, die ein Teilobjekt zurückgeben, vergleichen per `Object.is`, sehen dieselbe Referenz und aktualisieren abhängige Ansichten nicht. Außerdem könnten Verbraucher den Spielzustand am Store vorbei ändern.
- **Versionszähler neben dem Zustand:** dieselbe Falle; jede Ableitung müsste den Zähler zusätzlich lesen, sonst bleibt sie stehen.

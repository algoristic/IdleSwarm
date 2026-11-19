# ADR-003: Fester Logik-Takt von 10 Hz und seeded RNG

**Status:** Angenommen
**Datum:** 2026-11-18

## Kontext

Das Spielergebnis darf nicht von der Framerate abhängen. Gleichzeitig braucht das Projekt reproduzierbare Abläufe: als Grundlage für Tests und die Modell-Seite und gegen Save-Scumming ([Konzept §4](../technisches-konzept.md#4-simulation)).

## Entscheidung

- Die Logik läuft mit festen **10 Hz** (`dt` = 100 ms), unabhängig von der Framerate. Der GameLoop sammelt die vergangene Zeit in einem Akkumulator und führt daraus feste Schritte aus.
- Pro Aufwachen holt der Logik-Takt höchstens **60 s (600 Ticks)** nach. Der Rest wird bis AP 1.5.1 verworfen, `time.now` wird per `syncClock` nachgeführt.
- Das Rendering läuft in einem getrennten Takt über `requestAnimationFrame`, liest nur den Zustand und pausiert bei verborgener Seite.
- Kommandos (Kauf, Neue Futterstelle) werden sofort angewendet, nicht erst im nächsten Tick.
- Zufall kommt nur aus dem seeded RNG (**Mulberry32**). Sein Zustand liegt als `rngState` (uint32) im `GameState`; der Seed wird mit **FNV-1a** über die UTF-16-Codeeinheiten darauf abgebildet.
- Gleicher Seed und gleiche Abfolge von Kommandos und Schritten ergeben denselben Zustand.
- Die Schichten `domain` und `util` lesen die Uhr nicht selbst; Zeitpunkte und `dt` werden übergeben.
- Ab AP 1.5.1 werden Offline-Zeit und große Zeitsprünge im Hintergrund-Tab in adaptiven Schritten nachgeholt, die an Ereignisgrenzen verkürzt werden.

### Umsetzungsstand

**Umgesetzt:**

- `TICKS_PER_SECOND` und `TICK_MS` in [`balance/domain/constants.ts`](../../src/app/balance/domain/constants.ts)
- Mulberry32 und Seed-Hash in [`shared/util/rng/rng.ts`](../../src/app/shared/util/rng/rng.ts)
- `rngState` in [`engine/domain/models/game-state.model.ts`](../../src/app/engine/domain/models/game-state.model.ts)
- `step(state, dtMs)` und `syncClock(state, nowMs)` in [`engine/domain/step-logic.ts`](../../src/app/engine/domain/step-logic.ts); `step` führt Reise, Grundertrag, Sammeln, Brut und Auto-Weiterziehen aus und schreibt die Zeit fort (seit M1.2). Endet eine Reise im Schritt, wird er an der Ankunft geteilt; die Ankunft liegt damit unabhängig von `dtMs` exakt. Seit M1.3 teilt `step` auch an den Abbau-Schwellen der Funde und am Ablauf eines Buffs.
- **Zweiter RNG-Strom (seit M1.3):** Funde ziehen aus `finds.rngState` im `GameState`, getrennt vom `rngState` des Generators ([Game-Design §4.16](../game-design.md#416-funde)). Er entsteht mit demselben Seed-Hash aus `seed + '#finds'` (`findsRngState` in [`finds/domain/finds-logic.ts`](../../src/app/finds/domain/finds-logic.ts)); jede Ziehung verbraucht genau drei Zahlen, auch ohne Fund. So hängen die Kandidaten weiter nur von Seed und Weiterzügen ab. Die Migration 3→4 leitet den Strom ebenso aus dem Seed ab.
- Seit M1.2 zieht die Spiellogik Zufall: Der Futterstellen-Generator ([`site/domain/generator-logic.ts`](../../src/app/site/domain/generator-logic.ts)) verbraucht je Erzeugung immer `5 · k` Zahlen aus `rngState` (beim Spielstart und nach jeder Ankunft) und gibt den fortgeschriebenen Zustand zurück. Die Migration 2→3 erzeugt die Startkandidaten ebenso aus dem übernommenen `rngState` ([ADR-005](005-speicherformat-localstorage.md)).
- Determinismus-Test [`engine/domain/determinism.spec.ts`](../../src/app/engine/domain/determinism.spec.ts): gleicher Seed und gleiche Abfolge ergeben denselben Zustand, auch über Aufbruch, Reise, Ankunft und Auto-Weiterziehen; ein anderer Seed ergibt einen anderen Verlauf.
- Logik- und Render-Takt in [`engine/data-access/game-loop/game-loop.service.ts`](../../src/app/engine/data-access/game-loop/game-loop.service.ts). Seit AP 1.4.6 holt der Takt einen Rückstand über 60 s (verborgener Tab, eingefrorene Seite) in Schritten von 1 s nach, geteilt an `nextSplitMs`; die Obergrenze `MAX_CATCH_UP_MS` ist vorläufig 24 h ([TK §4](../technisches-konzept.md#4-simulation)).
- Canvas-Renderer der Szene (AP 1.4.2): Er liest den Zustand nur im Render-Takt (`GameLoop.onRender`) und zieht visuellen Zufall aus einem eigenen seeded RNG, nie aus `rngState` ([ADR-006](006-rendering-canvas-svg-css.md)).
- Kommandos wirken sofort über `GameStore.dispatch`. Die Entscheidung nennt als Beispiel „Kommandos (Kauf, Neue Futterstelle)“; „Neue Futterstelle“ ist mit M1.2 entfallen. Heute gibt es `noop`, `buy`, `sacrificeDrones`, `convertDronesToQueen`, `setTransportPriority`, `depart`, `setAutoMove` und seit M1.3 `setPheromones`, `strengthenGland` und `evolve` ([`engine/domain/commands-logic.ts`](../../src/app/engine/domain/commands-logic.ts)).

**Geplant:**

- Offline-Catch-up beim Laden: Umsetzung ab AP 1.5.1, dabei die endgültige Obergrenze und ein gemeinsamer Weg mit dem Nachholen im Takt

## Konsequenzen

- Simulation und Tests sind reproduzierbar und unabhängig von Anzeige und Gerät.
- Spielstände führen den RNG-Zustand mit; Neuladen ändert die Zufallsfolge nicht.
- Negativ: Mulberry32, der Seed-Hash und der Zusatz `#finds` des Fund-Stroms dürfen sich nicht mehr ändern, weil Spielstände von ihnen abhängen.
- Negativ: Weil Kommandos sofort wirken, zählt für die Reproduktion auch ihre Position zwischen den Schritten, nicht nur ihre Menge.
- Negativ: Bis AP 1.5.1 geht Zeit verloren: alles über 60 s pro Aufwachen und die Zeit seit dem letzten Speichern beim Laden.
- Negativ: Der adaptive Catch-up ist eine Näherung an die Echtzeit-Simulation. Ein Test muss die Toleranz absichern ([Konzept §10](../technisches-konzept.md#10-qualitätssicherung)).
- Das Budget (`step` < 2 ms auf einem Mittelklasse-Smartphone, Catch-up für 24 h < 1 s) ist ein Ziel und noch nicht gemessen.

## Verworfene Alternativen

- **Logik im Takt der Framerate:** Das Ergebnis hinge von Gerät und Bildrate ab.
- **Unseeded Zufall (`Math.random`):** Abläufe wären nicht reproduzierbar.
- **Catch-up in festen 100-ms-Schritten:** 24 h wären 864.000 Schritte; das Konzept sieht dafür deshalb adaptive Schritte vor.

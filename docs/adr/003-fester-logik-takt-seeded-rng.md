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
- `core/` liest die Uhr nicht selbst; Zeitpunkte und `dt` werden übergeben.
- Ab AP 1.5.1 werden Offline-Zeit und große Zeitsprünge im Hintergrund-Tab in adaptiven Schritten nachgeholt, die an Ereignisgrenzen verkürzt werden.

### Umsetzungsstand

**Umgesetzt:**

- `TICKS_PER_SECOND` und `TICK_MS` in [`core/balance/constants.ts`](../../src/app/core/balance/constants.ts)
- Mulberry32 und Seed-Hash in [`core/rng/rng.ts`](../../src/app/core/rng/rng.ts)
- `rngState` in [`core/state/game-state.ts`](../../src/app/core/state/game-state.ts)
- `step(state, dtMs)` und `syncClock(state, nowMs)` in [`core/sim/step.ts`](../../src/app/core/sim/step.ts); `step` führt Grundertrag, Sammeln und Brut aus und schreibt die Zeit fort
- Logik- und Render-Takt in [`game/game-loop.service.ts`](../../src/app/game/game-loop.service.ts)

**Geplant:**

- Canvas-Renderer der Szene: Umsetzung ab AP 1.4.2
- Offline-Catch-up: Umsetzung ab AP 1.5.1

## Konsequenzen

- Simulation und Tests sind reproduzierbar und unabhängig von Anzeige und Gerät.
- Spielstände führen den RNG-Zustand mit; Neuladen ändert die Zufallsfolge nicht.
- Negativ: Mulberry32 und der Seed-Hash dürfen sich nicht mehr ändern, weil Spielstände von ihnen abhängen.
- Negativ: Weil Kommandos sofort wirken, zählt für die Reproduktion auch ihre Position zwischen den Schritten, nicht nur ihre Menge.
- Negativ: Bis AP 1.5.1 geht Zeit verloren: alles über 60 s pro Aufwachen und die Zeit seit dem letzten Speichern beim Laden.
- Negativ: Der adaptive Catch-up ist eine Näherung an die Echtzeit-Simulation. Ein Test muss die Toleranz absichern ([Konzept §10](../technisches-konzept.md#10-qualitätssicherung)).
- Das Budget (`step` < 2 ms auf einem Mittelklasse-Smartphone, Catch-up für 24 h < 1 s) ist ein Ziel und noch nicht gemessen.

## Verworfene Alternativen

- **Logik im Takt der Framerate:** Das Ergebnis hinge von Gerät und Bildrate ab.
- **Unseeded Zufall (`Math.random`):** Abläufe wären nicht reproduzierbar.
- **Catch-up in festen 100-ms-Schritten:** 24 h wären 864.000 Schritte; das Konzept sieht dafür deshalb adaptive Schritte vor.

# ADR-007: Modell-Seite mit ECharts auf derselben Logik, Balancing-Snapshots als Tests

**Status:** Angenommen
**Datum:** 2026-11-18

## Kontext

Das Pacing entscheidet über die Qualität eines Idle-Spiels. Wachstum, Kosten und Wartezeiten sollen deshalb ab M1.1 sichtbar sein, ungewollte Verschiebungen sollen auffallen ([Projektplan](../projektplan.md), [Konzept §5](../technisches-konzept.md#5-mathematisches-modell--modell-seite)). Aussagekräftig ist das nur, wenn die Simulation exakt die Logik des Spiels verwendet.

## Entscheidung

- `core/balance` ist die **einzige Quelle** für Formeln. Spiel, Offline-Catch-up, Headless-Runner und Modell-Seite rufen dieselben Funktionen auf; die Modell-Seite enthält keine Kopie der Spiellogik.
- Die Modell-Seite ist eine lazy Route `/modell`. Im Produktiv-Build ist sie nur per Flag erreichbar und nicht verlinkt.
- Diagramme nutzen **Apache ECharts** über eine eigene dünne Wrapper-Komponente.
- Der Headless-Runner läuft auf der Modell-Seite im Web Worker und in Vitest direkt. `params` überschreibt Konstanten aus `core/balance`.
- Kennzahlen fester Bot-Läufe (Seed, Dauer) werden in Vitest als **Snapshot mit Toleranz** verglichen. Gewollte Änderungen aktualisieren den Snapshot bewusst.

Zielwerte, Toleranzen und Snapshot-Inhalte legt dieses ADR nicht fest. Die Pacing-Ziele stehen vorläufig im [Projektplan §3.5](../projektplan.md#35-pacing-ziele-vorläufig).

### Umsetzungsstand

**Umgesetzt:**

- [`core/balance/constants.ts`](../../src/app/core/balance/constants.ts): alle Konstanten aus dem Game-Design als `BalanceParams` mit den Standardwerten `DEFAULT_BALANCE`; [`formulas.ts`](../../src/app/core/balance/formulas.ts) enthält die Formeln.
- [`core/sim/runner.ts`](../../src/app/core/sim/runner.ts): Headless-Runner `runSimulation` mit Teil-Overrides über `params`, Standard-Schrittweite 1000 ms.
- [`core/sim/bots/`](../../src/app/core/sim/bots/): Bots „Aktiv“ und „Idle“.
- [`model/model-page.ts`](../../src/app/model/model-page.ts): lazy Route `/modell` mit Parameter-Panel, Basislauf, JSON-Export, Diagrammen und Kennzahlen.
- [`model/model-route.guard.ts`](../../src/app/model/model-route.guard.ts): Im Produktiv-Build ist die Route nur mit `?dev` erreichbar, im Entwicklungs-Build immer. Das Spiel verlinkt sie nicht.
- [`model/charts/echart.ts`](../../src/app/model/charts/echart.ts): eigener Wrapper um Apache ECharts (`^6.1.0`).
- [`model/sim/sim.worker.ts`](../../src/app/model/sim/sim.worker.ts): Der Runner läuft im Web Worker, [`reduce-result.ts`](../../src/app/model/sim/reduce-result.ts) verkleinert die Ergebnisse vor dem Senden.

**Geplant:**

| Teil | Umsetzung |
|---|---|
| Zyklen und Stillstand | ab AP 1.2.9 |
| Upgrade-Wirkung, Zielband, Warnungen | ab AP 1.3.7 |
| Balancing-Snapshots | ab AP 1.5.5 |

## Konsequenzen

- Modell und Spiel können nicht auseinanderlaufen.
- Varianten lassen sich ohne Codeänderung testen.
- Ungewollte Pacing-Änderungen lassen Tests fehlschlagen.
- Die lazy Route belastet das Spiel-Bundle nicht.
- Negativ: `core/balance` muss überschreibbare Parameter unterstützen.
- Negativ: Gewollte Balancing-Änderungen erfordern jedes Mal eine bewusste Aktualisierung der Snapshots.
- Negativ: ECharts kommt als Laufzeit-Abhängigkeit hinzu, der eigene Wrapper muss gepflegt werden.

## Verworfene Alternativen

- **Eigene Formeln oder eine Kopie der Spiellogik für die Modell-Seite:** Modell und Spiel könnten voneinander abweichen.
- **Drittanbieter-Wrapper für ECharts:** Er brächte einen Versionszwang mit sich.

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

**Umgesetzt:** noch nichts davon; `src/app/model/` enthält noch keinen Code, ECharts ist noch keine Abhängigkeit. [`core/balance/constants.ts`](../../src/app/core/balance/constants.ts) enthält bisher nur die Takt-Konstanten.

**Geplant:**

| Teil | Umsetzung |
|---|---|
| Headless-Runner, Bots „Aktiv“ und „Idle“ | ab AP 1.1.7 |
| Modell-Seite v1 mit ECharts | ab AP 1.1.8 |
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

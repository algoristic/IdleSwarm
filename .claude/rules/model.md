---
paths:
  - "src/app/model/**"
---

# Modell-Seite

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `model/feature/model.routes.ts` | Route `/modell` (lazy), registriert `provideModelState()` |
| `model/feature/state/model.guards.ts` | `modelRouteGuard`, `DEV_BUILD`, `MODEL_DEV_FLAG` (`?dev` im Produktiv-Build) |
| `model/feature/state/model.facade.ts` | `ModelFacade`: Formularmodell `params`, `config`, entprellter Auto-Lauf (`RUN_DEBOUNCE_MS`), Basislauf, Zoom, `stop()` |
| `model/feature/model/model.page.{ts,html}` | `ModelPage`; bildet `SimError` auf Texte ab und stoppt den Lauf beim Verlassen |
| `model/data-access/sim/` | `SimService`, `SIM_WORKER_FACTORY`, Protokoll (`sim-service.model.ts`), Worker-Kern (`sim-service.utils.ts`), `sim.worker.ts` |
| `model/domain/bots/` | Bots „Aktiv“ und „Idle“ |
| `model/domain/models/` | `BOT_KINDS`, `BotSpec`, `SimConfig`; `ModelParamsValue` |
| `model/domain/params-logic.ts`, `model-params-logic.ts` | Eingaben parsen und prüfen, Export; `defaultModelParams`, `toSimConfig`, `DURATIONS_MS` |
| `model/domain/reduce-result-logic.ts`, `wait-share-logic.ts` | Ergebnisse vor dem Senden verkleinern; Wartezeit-Anteil im Ausschnitt |
| `model/ui/form-model-params/` | `FormModelParamsComponent` (Signal Forms, `model()`), `modelParamsSchema` |
| `model/ui/model-charts/` | Reiter, Achse, Markierungen; `chart-options.ts` baut die ECharts-Option |
| `model/ui/model-metrics/` | Kennzahlentabelle; `metric-rows.ts` |
| `model/ui/echart/` | `EchartComponent` (Wrapper, ADR-007), `CHART_PALETTE`, `ECHARTS_INIT` |
| `model/ui/bot-labels/` | Anzeigenamen der Bots |

## Besonderheiten

- Die Modell-Seite enthält keine Spiellogik; sie ruft `runSimulation` aus `engine/domain` mit `params` auf.
- Neue Konstanten in `BalanceParams` erscheinen automatisch im Formular; einen Hinweistext in `hints` der Formular-Komponente ergänzen.
- Der Worker importiert nur `domain`, `util` und das Protokoll; Fehler kommen als `SimError`-Code, die Meldung des Workers als `detail`.
- Diagrammfarben stammen aus `--sw-chart-*` und weiteren Tokens; `CHART_PALETTE` liest sie einmal aus den CSS-Variablen. In Tests `readChartPalette` mit einer eigenen Funktion aufrufen.
- Test-IDs: `model.params.*`, `model.charts.*`, `model.metrics.*`, `model.results.*`. Bei `<select>` lösen Tests `input` und `change` aus, wie ein Browser.

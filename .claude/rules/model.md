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
| `model/feature/state/model.facade.ts` | `ModelFacade`: Formularmodell `params`, `config`, entprellter Auto-Lauf (`RUN_DEBOUNCE_MS`), Basislauf, Zoom, `stop()`; Stillstands-Schwelle `stallThreshold` (Signal, zweiseitig gebunden) und `stalls` (`computed` über `runs` und Schwelle, `null` bei ungültiger Schwelle, startet keinen Lauf) |
| `model/feature/model/model.page.{ts,html}` | `ModelPage`; bildet `SimError` auf Texte ab und stoppt den Lauf beim Verlassen |
| `model/data-access/sim/` | `SimService`, `SIM_WORKER_FACTORY`, Protokoll (`sim-service.model.ts`), Worker-Kern (`sim-service.utils.ts`), `sim.worker.ts` |
| `model/domain/bots/` | Vier Bots (Kaufregeln unten); alle schalten bei der ersten Entscheidung das Auto-Weiterziehen ein |
| `model/domain/models/` | `BOT_KINDS` (`active`, `idle`, `drone-heavy`, `soldier-heavy`), `BotSpec`, `SimConfig`; `ModelParamsValue`; `stall.model.ts`: `STALL_KINDS`, `Stall`, `BotStalls` (`approximate` bei ausgedünnter Liste), `StallThresholdValue` |
| `model/domain/params-logic.ts`, `model-params-logic.ts` | Eingaben parsen und prüfen, Export; `defaultModelParams` (Bots „Aktiv“ und „Idle“ angehakt, die beiden neuen nicht), `toSimConfig`, `DURATIONS_MS` |
| `model/domain/reduce-result-logic.ts`, `wait-share-logic.ts` | Ergebnisse vor dem Senden verkleinern (`EVENT_TYPES`: `buy`, `siteEmpty`, `arrived`; `departed` fällt weg); `SiteSummary` (`count`, `first`, `last`, `medianDurationMs`, `medianTravelMs` ohne die erste, `fightCount`, `dnaTotal`); `siteList` mit allen Futterstellen, ab `MAX_SITES` (1.000) gleichmäßig ausgedünnt (`thinEvenly`); Wartezeit-Anteil im Ausschnitt |
| `model/domain/stall-logic.ts` | Analyse-Parameter `DEFAULT_STALL_THRESHOLD_MINUTES` (60, nicht in `BalanceParams`), `parseStallThresholdMinutes` (ganze Minuten ab 1), `stallThresholdMs`, `botStalls` (über `stallSpans` aus `engine/domain/cycle-metrics-logic.ts`, zeitlich sortiert) |
| `model/ui/form-model-params/` | `FormModelParamsComponent` (Signal Forms, `model()`), `modelParamsSchema` |
| `model/ui/model-charts/` | Reiter, Achse, Markierungen (▲ Kauf, ◆ leer, ● Weitergezogen = `arrived`); `model-charts.model.ts`: `SampleTab` (`resources`, `rates`, `decisions`), `SiteTab` (`siteDuration`, `soldiers`), `ChartTab`; `chart-options.ts` baut die Option der Zeitreihen, `site-chart-options.ts` die je Futterstelle |
| `model/ui/model-stalls/` | `ModelStallsComponent`: Stillstände je Bot mit Zeitraum und Dauer (offene Strecken „bis Laufende“), Hinweis bei ausgedünnter Liste; enthält das Schwellenformular |
| `model/ui/form-stall-threshold/` | `FormStallThresholdComponent` (Signal Forms, `model()` wie `FormModelParamsComponent`), `stallThresholdSchema` |
| `model/ui/model-metrics/` | Kennzahlentabelle; `metric-rows.ts` (seit AP 1.2.9 auch Reisezeit Median, Einnahmen mit Kampf, DNA gesamt, längste Strecke ohne Kampfziel, längster Aufenthalt) |
| `model/ui/echart/` | `EchartComponent` (Wrapper, ADR-007; registriert `LineChart`, `ScatterChart`, `BarChart`), `CHART_PALETTE`, `ECHARTS_INIT` |
| `model/ui/bot-labels/` | Anzeigenamen der Bots |

## Besonderheiten

- Die Modell-Seite enthält keine Spiellogik; sie ruft `runSimulation` aus `engine/domain` mit `params` auf.
- Neue Konstanten in `BalanceParams` erscheinen automatisch im Formular; einen Hinweistext in `hints` der Formular-Komponente ergänzen. Seit M1.2 gehören dazu Generator, Kampf, Opfern, Reise, Strategie, Schwelle und die Typtabelle als flache Felder je Typ (`ventSizeFactor` …).
- Der Worker importiert nur `domain`, `util` und das Protokoll; Fehler kommen als `SimError`-Code, die Meldung des Workers als `detail`.
- Diagrammfarben stammen aus `--sw-chart-*` und weiteren Tokens; `CHART_PALETTE` liest sie einmal aus den CSS-Variablen. In Tests `readChartPalette` mit einer eigenen Funktion aufrufen.
- Bots: „Aktiv“ entscheidet jede Sekunde und kauft Königinnen und Drohnen nach kürzester Amortisation (`buyByPayback`, spart auf die beste Einheit); „Idle“ schaut alle 5 min vorbei und kauft alles Bezahlbare, Königin vor Drohne. „Drohnen-lastig“ kauft mit `buyByPayback` wie „Aktiv“, keine Soldaten. „Soldaten-lastig“ kauft die günstigere von Soldat und Königin (Gleichstand: Soldat), keine Drohnen (die kommen aus der Brut), und spart wie „Aktiv“. Beide neuen Bots entscheiden im Takt von „Aktiv“ (`ACTIVE_DECIDE_EVERY_MS`, `ActiveBotOptions`) und setzen bei der ersten Entscheidung Mitnahme-Priorität und Strategie: „Drohnen zuerst“ und „Geringster Widerstand“ bzw. „Soldaten zuerst“ und „Kampfgehärtet“. „Aktiv“ und „Idle“ lassen beides auf den Startwerten.
- Ein neuer Bot: `BOT_KINDS` und `BotSpec` ergänzen, `createBot` (`sim-service.utils.ts`) behandeln, Namen in `BOT_LABELS`, Linienstil in `BOT_LINES` (`chart-options.ts`), Startwert in `defaultModelParams`.
- Linienstile: Die Farbe steht für die Größe, die Bots unterscheiden sich an Strichstärke, Deckkraft und Muster (`BOT_LINES`: Aktiv durchgezogen, Idle dünn und blasser, Drohnen-lastig gepunktet, Soldaten-lastig Strich-Punkt); der Basislauf ist gestrichelt. Die Markierungszeile je Art wächst mit der Zahl der Bots (mindestens zwei), damit sich Arten nicht überlagern.
- Reiter je Futterstelle (`siteDuration`, `soldiers`): x-Achse ist die Futterstelle (0 = Start), ohne Zoom und Markierungen. „Dauer je Futterstelle“ stapelt je Bot Reise und Aufenthalt als Balken in Minuten, ein offener Aufenthalt (bis Laufende) ist blasser; der Log-Schalter fehlt dort. „Soldaten vor/nach Einnahme“ zeigt je Bot drei Linien (vor Aufbruch, mitgekommen, nach Einnahme), Einnahmen mit Kampf als größere Raute; Werte ≤ 0 werden auf der Log-Achse zur Lücke. Der Tooltip zeigt alle Felder der Futterstelle.
- Stillstände sind reine Auswertung des Ergebnisses: Die Schwelle wirkt ohne neuen Lauf; eine ungültige Schwelle blendet die Liste aus. „Kein Kampfziel“ heißt keine Einnahme mit Abwehr > 0 (Algenmatten beenden keine Strecke), „Kein Aufbruch“ ein Aufenthalt über der Schwelle; Strecken müssen strikt länger als die Schwelle sein, offene am Laufende zählen mit.
- Test-IDs: `model.params.*`, `model.charts.*` (Reiter `model.charts.tab-<tab>` inkl. `tab-siteDuration`, `tab-soldiers`; Hinweise `model.charts.hint-{siteDuration,soldiers}`), `model.metrics.*`, `model.results.*`, `model.stalls.{threshold,threshold-error}`, `model.stalls.<bot>`, `model.stalls.<bot>.{empty,item}`. Bei `<select>` lösen Tests `input` und `change` aus, wie ein Browser.

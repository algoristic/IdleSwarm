---
paths:
  - "src/app/balance/**"
  - "src/app/engine/**"
  - "src/app/swarm/**"
  - "src/app/site/**"
---

# Simulation: balance, engine, swarm, site

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `balance/domain/constants.ts` | `BalanceParams`, `DEFAULT_BALANCE`, `TICK_MS`; einzige Quelle für Konstanten (Game-Design §2.3) |
| `balance/domain/formulas.ts` | alle Formeln: Preise, Raten, Brut, Platz, Restzeiten, `isAffordable`; seit M1.2 Generator (`candidateSize`, `candidateDefense` …), Reichweite und Status, Transport (`carriedUnits`), Kampf (`expectedLosses`, `dnaReward`), Opfern, `travelDurationMs`, `clampAutoThreshold` |
| `swarm/domain/models/units.model.ts`, `transport-priority.model.ts` | `UNIT_TYPES`, `UnitType`, `Units`; `TRANSPORT_PRIORITIES` (stabile IDs) |
| `swarm/domain/units-logic.ts`, `brood-logic.ts` | `canBuy`, `buyUnit`; Brut-Teil des Schritts (`applyBrood`) |
| `swarm/domain/transport-logic.ts` | `planTransport` (mitkommend/zurückgelassen), `applyTransport`, `setTransportPriority` |
| `swarm/domain/sacrifice-logic.ts` | `sacrificeDrones`, `queenPriceInDrones`, `canConvertDronesToQueen`, `convertDronesToQueen` |
| `site/domain/models/site.model.ts`, `data/sites-era1.data.ts` | `Site`; Futterstellentypen mit stabilen IDs, `SAFE_SITE_TYPE` |
| `site/domain/models/map.model.ts`, `travel.model.ts`, `auto-move.model.ts` | `SiteMap`, `SiteCandidate`, `RoutePoint`, `ROUTE_MAX_POINTS`, `CANDIDATE_STATUSES`; `Travel`; `AutoMove`, `STRATEGY_IDS` |
| `site/domain/models/site-event.model.ts` | Ereignisse `departed`, `arrived`, `siteDepleted` (`SiteEvent`), `SiteResult` |
| `site/domain/collect-logic.ts` | Sammel-Teil des Schritts: `applyCollect`, `collectStep` (meldet `siteDepleted` mit exaktem Zeitpunkt) |
| `site/domain/generator-logic.ts`, `map-logic.ts` | `generateCandidates` (seeded RNG, Garantie der Algenmatte); `candidateInfo`/`candidateInfos` (Distanz, Status, Reisedauer) |
| `site/domain/combat-logic.ts` | `assessCombat`, `assessTarget(s)` (mit `S'` nach Transport), `applyCapture` |
| `site/domain/move-logic.ts` | `departureBlocker`, `canDepart`, `depart`, `arrive` |
| `site/domain/strategy-logic.ts`, `auto-move-logic.ts` | `strategyTarget` (mit Rückfall); `setAutoMove`, `isAutoMoveDue`, `applyAutoMove` |
| `site/ui/site-type-labels/` | `SITE_TYPE_LABELS` (Namen der Typen für HUD, Log und Umgebung) |
| `engine/domain/models/game-state.model.ts` | `GameState`, `STATE_VERSION` (3); setzt `Units`, `Site`, `SiteMap`, `Travel`, `AutoMove` und `TransportPriority` zusammen |
| `engine/domain/models/game-event.model.ts` | `GameEvent`, `StepResult` |
| `engine/domain/game-state-logic.ts` | `createInitialState` (erzeugt die Startkandidaten) |
| `engine/domain/commands-logic.ts` | `Command`-Union (`noop`, `buy`, `sacrificeDrones`, `convertDronesToQueen`, `setTransportPriority`, `depart`, `setAutoMove`), `applyCommand` (Zustand und Ereignisse), `apply` (nur Zustand) |
| `engine/domain/step-logic.ts` | `step` (Reise, Sammeln vor Brut, Auto-Weiterziehen, Game-Design §4.3), `syncClock` |
| `engine/domain/random-logic.ts` | `drawRandom` auf dem `rngState` des Zustands |
| `engine/domain/runner-logic.ts`, `bot-logic.ts` | Headless-Runner `runSimulation`, `SimEvent`, Kennzahlen (`SiteMetric`, `SimMetrics`); Bot-Schnittstelle, Preis-Cache, `CommandPlan` (`enableAutoMove`, `setStrategy`, `setTransportPriority`; setzen nur bei Änderung) |
| `engine/domain/cycle-metrics-logic.ts` | Strecken eines Laufs (`TimeSpan` mit `open` bis Laufende): `noCombatCaptureSpans`, `siteStaySpans`, `longestSpanMs`, `spansLongerThan`, `stallSpans` (`StallSpans`: `noCombatCapture`, `noDeparture`, gleiche Schwelle) |
| `engine/data-access/game-store/` | `GameStore` (Signal, `dispatch`, `tick`, `replace`, Ereignis-Log `log`, `LOG_MAX_ENTRIES`), `LogEntry`, `createSeed`, `createNewGame` |
| `engine/data-access/game-loop/` | `GameLoop`: fester Takt, Nachholen bis `MAX_TICKS_PER_WAKE`, Render-Takt über `onRender` |
| `engine/data-access/game-core/` | `provideGameCore()` und `initGame` (Laden, Autosave, Takt) |

## Besonderheiten

- Eine neue Mechanik bekommt ihre Regeln in der Fachdomäne (`swarm`, `site` …). `engine/domain` ruft sie nur in `applyCommand` und `step` auf. Die Domäne `sonar` ist nur Oberfläche, ihre Regeln liegen in `site`.
- `balance/domain` importiert aus den Fachdomänen nur Typen (`import type`); die Fachdomänen importieren die Formeln. So entsteht kein Laufzeitzyklus.
- Ein neues Kommando: Variante in `Command` ergänzen und in `applyCommand` behandeln; `assertNever` meldet fehlende Fälle beim Kompilieren. Ein wirkungsloses Kommando gibt denselben Zustand ohne Ereignisse zurück (der Runner zählt Käufe nur bei geändertem Zustand).
- Ereignisse sind Codes mit IDs, Rohwerten und `playedMs` (Spielzeit), nie Texte. Neue Arten in `site-event.model.ts` (bzw. der Fachdomäne) ergänzen und in `GameEvent` aufnehmen; HUD-Log (`event-log-texts.ts`) und Runner (`Recorder.gameEvents(events, before, after)` mit den Zuständen vor und nach dem Kommando bzw. Schritt) behandeln sie.
- `step` teilt einen Schritt an der Ankunft: Im Reiseteil ruhen Grundertrag und Sammeln, die Brut läuft; danach läuft der Rest wie ohne Reise. Das Auto-Weiterziehen prüft am Ende jedes Schritts. Der Runner teilt zusätzlich an Ankunft und vorhergesagtem Auto-Auslöser (`nextSplitMs`).
- Einnehmbarkeit, Verluste und Strategieziel rechnen vor dem Aufbruch mit `S'` nach Transport (`assessTarget`); gekämpft wird bei der Ankunft mit den dann vorhandenen Soldaten.
- Der Generator verbraucht immer `5 · k` Zufallszahlen; sonst verschiebt sich die Zufallsfolge aller späteren Kandidaten und eingefrorene Spielstände/Tests brechen.
- Ein neues Feld im `GameState` ändert das Spielstand-Format: Migration in `persistence/domain/migrations/` (siehe Regeldatei `persistence`).
- Die vier Bots („Aktiv“, „Idle“, „Drohnen-lastig“, „Soldaten-lastig“) liegen in `model/domain/bots/`, der Runner kennt nur die Schnittstelle aus `bot-logic.ts`. Alle schalten bei der ersten Entscheidung das Auto-Weiterziehen ein; der Runner meldet `buy`, `siteEmpty`, `departed` und `arrived` als `SimEvent`.
- `SiteMetric` (seit AP 1.2.9): Futterstelle von der Ankunft (`startMs`, die erste bei 0) bis zum Aufbruch (`departureMs`, `durationMs` ohne Reise; ohne Aufbruch `null`). Getrennt: `travelMs` (Aufbruch an der vorigen bis Ankunft), `emptyMs`, `size`, `collected` (Größe minus Restvorrat beim Aufbruch bzw. am Laufende), `defense`, `fought` (`B > 0`, Algenmatten zählen nicht), `dna`, Soldaten-Bilanz `soldiersBeforeDeparture`/`soldiersCarried` (bei der ersten `null`), `soldiersAtArrival`, `losses`, `soldiersAfterCapture`. `SimMetrics` hat dazu `longestNoCombatCaptureMs` und `longestSiteStayMs`.
- Der `Recorder` liest `S'` und das Ziel aus `after` des Aufbruchs (ein Aufbruch ist immer das letzte Ereignis seines Kommandos bzw. Schritts). Bei der Ankunft endet der Runner-Schritt erst an der nächsten ganzen Millisekunde; den exakten Bestand nach dem Kampf rechnet er deshalb mit einem eigenen `step` von `before` genau bis zur Ankunft nach. Bricht das Auto-Weiterziehen dort sofort wieder auf, zählen die Zurückgelassenen zu `soldiersAfterCapture`.
- `GameStore`, `GameLoop` und `PersistenceService` sind `@Injectable()` ohne `providedIn`; in Tests über `providers: [GameStore, …]` bereitstellen. Uhr und `requestAnimationFrame` kommen über `CLOCK` und `ANIMATION_FRAME`.
- Der Determinismus-Test (`engine/domain/determinism.spec.ts`) und die Leistungstests im Runner-Spec (im Abdeckungslauf übersprungen) müssen grün bleiben.

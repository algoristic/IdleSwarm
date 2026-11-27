---
paths:
  - 'src/app/game/**'
---

# game

Das ganze Spiel. Bisher gibt es Domänenmodell, Spielwerte, Zufall, Startzustand, Regeln, Zeitschritt, Spielstand und Nachberechnung (`domain`), Store, Schleife, Speichern und Nachberechnung im Worker (`data-access`) sowie die Texte der Spieldaten (`ui/texts`). Facade und Ansichten folgen (`docs/plan-angular-umbau.md`). Referenz für Regeln und Werte ist der eingefrorene Prototyp.

## Modelle (`domain/models`)

- ID-Listen `as const` mit abgeleitetem Typ: `UNIT_IDS`, `UPGRADE_IDS`, `SITE_TYPE_IDS`, `FIND_IDS`, `BUFF_IDS` (Teilmenge von `FIND_IDS`), `ZONE_IDS`, `TARGET_KINDS`.
- Die Reihenfolge jeder Liste ist die des Prototyps. Zufall (`pickWeighted`, Startplatzierung) und Kette hängen davon ab; nicht umsortieren.
- `GameState` mit `Site`, `Find`, `Travel`, `Mark`, `Point`, `GameStats`; `SAVE_VERSION = 1`.
- `GameConfig` ist tief readonly; Einheiten und Zonen als Listen, Ausbauten und Stellentypen als `Record` über die IDs.
- `DerivedValues`: Ergebnis von `derive` (`thrust`, `speed`, `baseSpeed`, `digestion`, `appetite`, `eatRate`, `capacity`, `eggRate`, `chainMultiplier`, `reach`); wird nicht gespeichert.
- `GameEvent`: Union über `type` (`siteDried`, `zoneChanged`, `departed`, `travelAborted`, `arrived`, `findCollected`, `unmarked`, `noTarget`, `ended`) mit IDs und Codes statt Texten; `GameEventHandler`.
- `travel.model.ts`: `TravelTarget` (Stelle oder Fundstück), `TravelRate` (`travelTime`, `available`, `average`), `SiteAlternative`, `MARK_RESULTS`/`MarkResult`.
- `upgrade.model.ts`: `UPGRADE_PURCHASES`/`UpgradePurchase` (`free`, `paid`, `unaffordable`), `CHAIN_UPGRADE_PURCHASES`/`ChainUpgradePurchase` (`paid`, `unaffordable`, `disabled`).
- `unit.model.ts`: `BUY_MODES`/`BuyMode` (`one`, `quarter`, `max`; Kaufmenge 1 / 25 % / Max).
- `save.model.ts`: `LOAD_OUTCOMES`/`LoadOutcome` (`loaded`, `fresh`, `reset`), `LoadResult` (`state`, `outcome`).
- `catch-up.model.ts`: `CatchUpSummary` (Sekunden, simulierte Sekunden, `capped`, Schritte, Ernte, Vorrat, Ankünfte, erreichte Zonen, ausgetrocknete Stellen, Leerlauf, Fundtypen, Fresslinge vorher/nachher; nur Zahlen und IDs), `CatchUpProgressHandler`.

## Spielstand v1

Englische IDs und Feldnamen. Sie werden gespeichert und sind stabil; Umbenennen entscheidet der Nutzer. Wichtigste Abbildungen aus dem Prototyp (Version 3):

- Felder: `v→version`, `rng→rngState`, `t→time`, `vorrat→food`, `eier→eggs`, `ranks→upgradeRanks`, `free→freeUpgrades`, `pos→position`, `at→siteId`, `findTimers→findRespawnAt`, `leave→leaveRequested`, `hist→harvestHistory`; an Stellen `known→discovered`, `goneAt→removeAt`, `born→bornAt`; an `Mark` und `Travel` `id→targetId`.
- Ausbauten `herd/verd/geis/kropf→hearth/digestion/flagella/crop`; Stellentypen `algen/plankton/krebs/schnee/seegras→algae/plankton/carcass/marineSnow/seagrass`; Buffs `fress/lege/verm/wind→feedingFrenzy/layingBoost/breedingFrenzy/tailwind`.

Das vollständige Mapping ergibt sich aus Modellen und `new-game-logic.fixture.ts`.

## Spielwerte (`domain/data/game-config.data.ts`)

`DEFAULT_GAME_CONFIG`: Werte 1:1 aus `CFG` des Prototyps, ohne Texte und Icons.

## Logik (`domain/*-logic.ts`)

- `rng-logic.ts`: `nextRandom` (mulberry32, Zustand in `rngState`), `pickWeighted` über die Reihenfolge einer ID-Liste (nicht über die Schlüsselreihenfolge des Gewichtsobjekts).
- `upgrade-logic.ts`: `upgradeEffect`, `upgradeCost`, `reachFor`, `travelSpeedFor`, `chainUpgradeCost`, `chainUpgradeFactor`, `isChainUpgradeLocked`, `buyUpgrade` (Keimzelle zuerst), `buyChainUpgrade`, `CHAIN_UPGRADE_COUNT` (Zahl der Erzeugungs-Ausbauten, `CHAIN_UPS` im Prototyp; Länge von `chainRanks`).
- `geometry-logic.ts`: `distance`.
- `derive-logic.ts`: `derive(config, state): DerivedValues`.
- `chain-logic.ts`: `productionOf`, `produce` (Eier und Kette je Schritt, Freischaltung), `maxBuy`, `buyAmount(…, mode: BuyMode)`, `buyUnit(…, count): boolean`.
- `harvest-logic.ts`: `harvestHistoryLength`, `addFood` (über der Kapazität mit Wurzel gedämpft), `averageHarvest`, `harvest` (liefert die Ernterate, führt Verlauf und Statistik).
- `site-logic.ts`: `randomSizeFactor`, `createSite`, `placeInDisc`, `isZoneInRange`, `discover` (bekommt die Reichweite direkt), `getSite`, `currentSite`, `availableFood`, `siteThreshold`, `isSiteReachable`, `isSiteTargetable`, `availableAtArrival`, `drySite`, `spawnSite`, `updateSites`, `removeGoneSites`, `spawnNewSites`.
- `find-logic.ts`: `createFind`, `getFind`, `isFindTargetable`, `applyFind`, `collectFind`, `tickBuffs`, `respawnFinds`.
- `travel-logic.ts`: `travelRate`, `bestAlternative`, `markTarget`, `depart`, `advanceTravel`, `expireMark`, `moveOn`; Spieleraktionen `toggleMark(…, kind, targetId): MarkResult`, `clearMark(state): boolean`, `requestLeave(state): boolean`.
- `step-logic.ts`: `step(config, state, onEvent?)`.
- `new-game-logic.ts`: `newGame(config, seed, now)`.
- `save-logic.ts`: `serializeGame`, `migrate(config, value, now): GameState | null` (verlangt `version` 1 und `sites` als Array; fehlende Felder aus `newGame` mit dem gespeicherten Seed, sonst 1; `stats`, `buffs`, `upgradeRanks` zusammengeführt; `chainRanks` und Ernteverlauf falscher Länge ersetzt), `parseSave(config, raw, seed, now): LoadResult` (ohne Spielstand `fresh`, bei kaputtem oder fremdem `reset`, jeweils mit `newGame`).
- `loop-logic.ts`: `advanceClock(config, accumulator, elapsedSeconds, tempo): ClockAdvance` (fester `dt`-Akkumulator; Frame höchstens `MAX_FRAME_SECONDS` = 1 s, höchstens `MAX_STEPS_PER_FRAME` = 2000 Schritte, dann wird der Rest verworfen), `isSaveDue` (ab `saveInterval`).
- `catch-up-logic.ts`: `catchUpSteps` (gedeckelt bei `offlineMax`), `needsCatchUp` (verborgen > `CATCH_UP_MIN_HIDDEN_SECONDS` = 2 s), `showsCatchUpProgress` (> `CATCH_UP_CHUNK_STEPS` = 20000 Schritte), `showsCatchUpSummary` (ab `CATCH_UP_SUMMARY_MIN_SECONDS` = 60 s), `catchUp(config, state, seconds, onProgress?): CatchUpSummary | null` (Blöcke zu 20000 Schritten, Fortschritt je Block; `null` ohne ganzen Schritt), `mergeCatchUpSummaries(a, b)` (Summen addiert, Listen verkettet, Vorrat und Fresslinge danach aus `b`, vorher aus `a`).

`step` in dieser Reihenfolge: `derive` → `produce` → `harvest` → `tickBuffs` → `updateSites` → `removeGoneSites` → `advanceTravel`; dann erneut `derive` → `discover` → `spawnNewSites` → `respawnFinds` → `expireMark` → `moveOn` → Prüfung auf Spielende → `time += dt`.

- Ereignisse gehen als `GameEvent` an den optionalen Callback `onEvent`; ohne Callback läuft `step` stumm.
- Käufe und Spieleraktionen liefern Ergebniscodes (`MarkResult`, `UpgradePurchase`, `ChainUpgradePurchase`, `boolean`), keine Texte.

Regeln:

- Funktionen bekommen `GameConfig` als Parameter, keine globale Config.
- Der Zustand wird mutiert.
- Reihenfolge der Zufallszahlen und der Gleitkomma-Operationen bleibt exakt wie im Prototyp (Golden Master in AP 3).
- Feste Längen (Zonen, Einheiten, Verlauf der Ernte) werden aus der Config abgeleitet.
- Wie `pickWeighted` platziert `newGame` die Startstellen (`map.initialSites`) in der Reihenfolge von `SITE_TYPE_IDS`, nicht in der Schlüsselreihenfolge des Objekts; bei den Standardwerten ist beides gleich.
- `getSite` und `currentSite` liegen in `site-logic`, damit kein Importzyklus entsteht.

Eigenheiten des Prototyps, die bewusst 1:1 bleiben:

- `depart` setzt `spawnTimers[zone + 1] = 0` auch hinter der letzten Zone. In Zone 3 wird das Array dadurch 5 lang und landet so im Spielstand v1. Ob das so bleibt, entscheidet der Nutzer.
- Die Eier-Rate nimmt beim Fressen an einer Stelle mit `eggMultiplier` immer den Wert von `marineSnow`.
- `foodBubble` ignoriert die Kapazität.
- `step` ruft `derive` zweimal auf; Fundstücke wirken mit dem ersten Ergebnis.
- Rückenwind läuft nur ab, wenn zu Beginn des Schritts gereist wird; Fressrausch nur bei Ernte > 0.
- Fehlende optionale Config-Werte ergeben `NaN` wie im Prototyp (`?? Number.NaN`).
- Wahrheitswert-Prüfungen bleiben truthy (z. B. `lifetime`, `decay`, `floorFraction`).

## Data-Access (`data-access`)

Zustand, Schleife, Spielstand und Nachberechnung (ADR `docs/adr/0001-spielzustand-im-store.md`). Services sind `@Injectable()` ohne `providedIn`; `provideGameLoopService()` schließt Store, Speichern und Nachberechnung ein, `provideGameStoreService()` das Speichern.

- `game-store/` `GameStoreService`: hält den `GameState` privat, die Domäne mutiert ihn. Lädt beim Erzeugen über `GameSaveService.load()`.
  - Signale `state` (Schnappschuss), `events`, `loadOutcome`, `catchingUp`.
  - `advance(steps)`, `replace(state): boolean`, `newGame(): boolean` (ersetzt und speichert), `save()`.
  - Aktionen mit Ergebnis oder `null` bei Sperre: `buyUnit(unit, mode)`, `buyUpgrade(id)`, `buyChainUpgrade(index)`, `toggleMark(kind, targetId)`, `clearMark()`, `requestLeave()`; dazu `markEndSeen()`.
  - Für die Schleife: `beginCatchUp()`, `applyCatchUp(state)`, `endCatchUp()`.
  - Token `GAME_CONFIG` (Root-Default `DEFAULT_GAME_CONFIG`).
- `game-save/` `GameSaveService`: `load(): LoadResult` (`parseSave`), `save(state)` (setzt `savedAt`, schreibt `serializeGame` unter `GAME_SAVE_KEY` = `idleswarm-save`; Fehler beim Schreiben oder Lesen werden wie im Prototyp verschluckt), `createGame()`. Tokens `SAVE_STORAGE` (`localStorage` oder `null`), `WALL_CLOCK_NOW` (`Date.now`), `NEW_GAME_SEED` (Zufalls-Seed); Typ `SaveStorage`.
- `game-loop/` `GameLoopService`: Signale `tempo`, `catchUpSummary`, `catchUpProgress`; `setTempo`, `dismissCatchUpSummary`, `start`, `stop`, `pause`, `resume`. Tokens `FRAME_SCHEDULER` (`requestAnimationFrame`), `MONOTONIC_NOW` (`performance.now`), `PAGE_VISIBILITY` (`hidden`, `visibilitychange`, `pagehide`); Typen `FrameScheduler`, `PageVisibility`.
- `catch-up/` `CatchUpService`: `run(config, state, seconds): Promise<CatchUpResult | null>`, `cancel()`, Signal `progress` (nur bei mehr als einem Block). Token `CATCH_UP_WORKER_FACTORY` (Modul-Worker `catch-up.worker.ts` oder `null` ohne `Worker`). Protokoll in `catch-up-service.model.ts` (`CatchUpRequest`, `CatchUpResponse` mit `progress`/`done`, `CatchUpWorker`), Type Guards `isCatchUpRequest`, `isCatchUpResponse` in `catch-up-service.utils.ts`.

Schnappschuss und Ereignisse:

- Nach jedem Frame mit mindestens einem Schritt, jeder Aktion, jedem Speichern, `replace` und `applyCatchUp` gibt der Store `structuredClone` des internen Zustands als neuen Wert von `state` aus; Frames ohne Schritt erzeugen keinen (ADR 0001). Änderungen am Schnappschuss wirken nicht aufs Spiel.
- `events`: Protokoll `GameEventEntry` (`{ id, event }`) mit fortlaufender ID, höchstens `GAME_EVENT_LOG_SIZE` = 50 Einträge; neues Array nur bei neuen Ereignissen. `replace` und `newGame` leeren es, die IDs zählen weiter; `applyCatchUp` leert es nicht, Ereignisse der Nachberechnung kommen nur über die Zusammenfassung.

Schleife:

- Ein Frame rechnet `advanceClock` mit dem Tempo, ruft `advance` und speichert alle `saveInterval` Sekunden Echtzeit (unabhängig vom Tempo). In der Pause und während der Nachberechnung läuft nur die Frame-Kette weiter.
- Erster `start()`: mit geladenem Spielstand Nachberechnung seit `savedAt`, sonst (`fresh`, `reset`) sofort speichern. `start()` nach `stop()` rechnet die Zeit seit `savedAt` im Speicher nach.
- Verstecken: Zeitpunkt merken und speichern; `pagehide`: speichern. Sichtbarwerden nach mehr als 2 s: Nachberechnung der verborgenen Zeit.
- `stop()` (auch beim Zerstören): Frames und Listener ab, offene Lücken und laufende Nachberechnung verworfen, `save()` (wirkt während der noch bestehenden Sperre nicht).

Nachberechnung:

- Während eines Laufs ist der Store gesperrt (`catchingUp`): Aktionen liefern `null`, `advance`, `replace`, `newGame` und `save` wirken nicht. Die Platte behält den alten Stand mit altem `savedAt`.
- Es läuft höchstens ein Lauf; Lücken, die währenddessen anfallen, werden gesammelt und danach nachgereicht. Ergebnisse nach `stop()` werden verworfen.
- Beim Übernehmen setzt die Schleife `savedAt` im Speicher auf den Zeitpunkt der Anfrage.
- Zusammenfassungen werden mit der noch angezeigten zu einer zusammengeführt (`mergeCatchUpSummaries`) und erst ab 60 s gezeigt; `dismissCatchUpSummary` verwirft sie.
- `CatchUpService` schickt Config, Schnappschuss und Sekunden an den Worker und beendet ihn nach dem Ergebnis. Ohne Worker, bei Fehler oder ungültiger Antwort rechnet er `catchUp` auf einer Kopie im Hauptthread.

Worker-Build:

- Worker heißen `*.worker.ts`; sie gehören zu `tsconfig.worker.json` (`lib` `webworker`, über `webWorkerTsConfig` in `angular.json`) und sind aus `tsconfig.app.json` ausgenommen.
- `catch-up.worker.ts` importiert außer `domain` die Protokolldateien `catch-up-service.model.ts` und `catch-up-service.utils.ts` (CLAUDE.md §7). Diese beiden importieren nichts aus `@angular/*` oder `rxjs`.

Bewusste Abweichungen und Einschränkungen gegenüber dem Prototyp:

- Während der Nachberechnung wird nicht gespeichert und es gibt keine Aktionen.
- Der Fallback ohne Worker rechnet ohne Zwischenpausen und blockiert die Seite (der Prototyp wartete je Block).
- Ein Worker, der nie antwortet, hat keine Zeitgrenze; die Sperre bleibt bis `stop()`.

## Texte (`ui/texts/game-texts.ts`)

`$localize`-Records `UNIT_TEXTS` (`name`, `plural`, `dative`, `abbreviation`), `UPGRADE_NAMES`, `SITE_TYPE_NAMES`, `ZONE_NAMES`, `FIND_NAMES`, `FIND_DESCRIPTIONS`. IDs `@@uiGame-gameTexts-<key>`. Fundbeschreibungen sind Funktionen von `GameConfig`; Zahlen kommen über `formatNumber`, die Einheit „s“ steht im Text.

## Tests

- `rng-logic.spec.ts`: Referenzwerte von mulberry32 und `pickWeighted`.
- `new-game-logic.spec.ts` mit `new-game-logic.fixture.ts`: Startzustände für die Seeds 4242, −123456789 und 13 (Seed 13 deckt eine verworfene Platzierung und das Entdecken in der aktuellen Zone ab). Die `newGame`-Fixture wurde einmal erzeugt, indem der Prototyp unter Node lief und die Felder umbenannt wurden; ihr Erzeugerskript ist nicht im Repo.
- `golden-master.spec.ts` mit `golden-master.fixture.ts`: Szenarien `default` (Seed 19), `chainUpgrade` (Seed 10, Erzeugungs-Ausbau an) und `edgeCases` (Seed 1; Test-Abweichungen der Config: keine Startstellen, `spawn.minTargets` 0, `travel.base` 1; abgebrochene Reise, Verlassen ohne Ziel).
  - Der Spec spielt die aufgezeichneten Aktionen nach und vergleicht exakt: Ergebnis jeder Aktion, Ereignisse je Schritt, kompakte Prüfpunkte (alle 150 Schritte) und volle Zustände (Start, Ende und nach `zoneChanged`, `travelAborted`, `noTarget`, `ended`).
  - Abgedeckt sind alle Ereignistypen, alle Markierungscodes, alle Fundtypen, alle Kaufmodi und Kaufergebnisse sowie Rückenwind auf der Reise; das Erzeugerskript bricht sonst ab.
- Erzeugerskript `node tools/golden-master/generate.mjs` (im Repo-Wurzelverzeichnis): extrahiert Logik und `onMark` über Textmarken aus dem eingefrorenen Prototyp, führt sie in `node:vm` aus, zeichnet die Aktionen einer Strategie mit ihren Ergebnissen auf, bildet den Prototyp-Spielstand (Version 3) auf v1 ab und schreibt `golden-master.fixture.ts` und `prototype-game-config.fixture.ts`.
- `PROTOTYPE_GAME_CONFIG` (`prototype-game-config.fixture.ts`) ist die eingefrorene Kopie der Prototyp-Werte. Golden Master und `newGame`-Spec nutzen sie statt `DEFAULT_GAME_CONFIG`, damit spätere Kalibrierung die Tests nicht bricht.
- Ändert sich die Mechanik bewusst, wird der Golden Master gelöscht statt angepasst. Bis AP 13 den Prototyp entfernt, lässt sich die Fixture neu erzeugen.
- `save-logic.spec.ts`: `parseSave` (frisch, kaputt, fremde Version, `sites` kein Array, unverändert geladen) und `migrate` (fehlende Felder, Seed 1, zusammengeführte Teilobjekte, falsche Längen).
- `loop-logic.spec.ts`: Akkumulator, Deckel je Frame (1 s, 2000 Schritte), Tempo, `isSaveDue`.
- `catch-up-logic.spec.ts`: Schritte und Deckel `offlineMax`, gleiche Schritte wie `step`, gezählte Ereignisse, `mergeCatchUpSummaries`, Schwellen (2 s, ein Block, 60 s).
- `game-store.service.spec.ts`: Laden (gespeichert, kaputt, gesperrter oder fehlender Speicher), neues Spiel über die Tokens, Kopien, Ereignisprotokoll, Sperre und `applyCatchUp`. `GameSaveService` hat keinen eigenen Spec und wird hier mitgetestet.
- `game-loop.service.spec.ts`: Schleife über ersetzte Tokens (Frames, Uhren, Sichtbarkeit, Worker-Fabrik): Speichern beim Start, feste Schritte und Tempo, Speicherintervall, `pagehide`/Verstecken, `stop`/`start`, Pause, Nachberechnung mit Sperre, Lücken, Verwerfen und Zusammenführen.
- `catch-up.service.spec.ts` und `catch-up-service.utils.spec.ts`: Worker-Protokoll, Fortschritt, Fallback im Hauptthread (kein Worker, Fehler, ungültige Antwort), Abbrechen; Type Guards.

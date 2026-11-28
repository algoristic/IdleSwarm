---
paths:
  - 'src/app/game/**'
---

# game

Das ganze Spiel. Bisher gibt es Domänenmodell, Spielwerte, Zufall, Startzustand, Regeln, Zeitschritt, Spielstand und Nachberechnung (`domain`), Store, Schleife, Speichern und Nachberechnung im Worker (`data-access`), Facade, Routen und das Seitengerüst mit HUD, Kontextzeile, Chips, Ansichtswahl, Menüknopf und Toasts (`feature`) sowie dessen Präsentationskomponenten, die Asset-Bibliothek (Palette, Zeichenfunktionen, SVG-Komponenten und Canvas-Renderer in `ui/art`, `ui/scene`, `ui/map`, `ui/neuron`) und die Texte der Spieldaten (`ui`). Die Inhalte der Ansichten folgen (`docs/plan-angular-umbau.md`). Referenz für Regeln, Werte und Darstellung ist der eingefrorene Prototyp.

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
- `zone.model.ts`: `NextZone` (`zone`, `threshold`, `open`).
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
- `upgrade-logic.ts`: `upgradeEffect`, `upgradeCost`, `reachFor`, `travelSpeedFor`, `chainUpgradeCost`, `chainUpgradeFactor`, `isChainUpgradeLocked`, `buyUpgrade` (Keimzelle zuerst), `buyChainUpgrade`, `CHAIN_UPGRADE_COUNT` (Zahl der Erzeugungs-Ausbauten, `CHAIN_UPS` im Prototyp; Länge von `chainRanks`); für die Anzeige `canAffordUpgrade` (Freiausbau oder genug Vorrat), `canAffordChainUpgrade` (nicht gesperrt und genug Einheiten der nächsten Stufe), `upgradeCount` (Erzeugungs-Ausbauten nur mit `chainUpgrade.enabled`), `affordableUpgradeCount`.
- `geometry-logic.ts`: `distance`.
- `derive-logic.ts`: `derive(config, state): DerivedValues`.
- `chain-logic.ts`: `productionOf`, `produce` (Eier und Kette je Schritt, Freischaltung), `maxBuy`, `buyAmount(…, mode: BuyMode)`, `buyUnit(…, count): boolean`.
- `harvest-logic.ts`: `harvestHistoryLength`, `addFood` (über der Kapazität mit Wurzel gedämpft), `averageHarvest`, `harvest` (liefert die Ernterate, führt Verlauf und Statistik); für die Anzeige `harvestThrottlePercent` (Drosselung über der Kapazität in ganzen Prozent, mindestens 1; bis zur Kapazität `null`), `foodFillPercent` (höchstens 100).
- `site-logic.ts`: `randomSizeFactor`, `createSite`, `placeInDisc`, `isZoneInRange`, `discover` (bekommt die Reichweite direkt), `getSite`, `currentSite`, `availableFood`, `siteThreshold`, `isSiteReachable`, `isSiteTargetable`, `availableAtArrival`, `drySite`, `spawnSite`, `updateSites`, `removeGoneSites`, `spawnNewSites`; für die Anzeige `siteFillShare` (Vorrat je Größe, ausgetrocknet 0, nie negativ), `timeUntilEmpty` (`availableFood` je Ernterate).
- `find-logic.ts`: `createFind`, `getFind`, `isFindTargetable`, `applyFind`, `collectFind`, `tickBuffs`, `respawnFinds`, `activeBuffs` (Buffs mit Restzeit in der Reihenfolge von `BUFF_IDS`).
- `travel-logic.ts`: `travelRate`, `bestAlternative`, `markTarget`, `depart`, `advanceTravel`, `expireMark`, `moveOn`; Spieleraktionen `toggleMark(…, kind, targetId): MarkResult`, `clearMark(state): boolean`, `requestLeave(state): boolean`; für die Anzeige `travelRemainingTime`, `travelProgress` (ohne Strecke 1), `travelDestination` (Ziel der Reise oder `null`).
- `zone-logic.ts`: `nextZone(config, state, thrust): NextZone | null` (nächste Zone mit Schwelle und ob der Schub reicht; in der letzten Zone `null`).
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
- Füllstand und Reisefortschritt kommen aus dem Schnappschuss, ohne die Interpolation des Prototyps zwischen den Schritten; die folgt mit AP 11.

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
- `game-save/` `GameSaveService`: `load(): LoadResult` (`parseSave`), `save(state)` (setzt `savedAt`, schreibt `serializeGame` unter `GAME_SAVE_KEY` = `idleswarm-save`; Fehler beim Schreiben oder Lesen werden wie im Prototyp verschluckt, die leeren `catch`-Blöcke verweisen auf ADR 0001), `createGame()`. Tokens `SAVE_STORAGE` (`localStorage` oder `null`), `WALL_CLOCK_NOW` (`Date.now`), `NEW_GAME_SEED` (Zufalls-Seed); Typ `SaveStorage`.
- `game-loop/` `GameLoopService`: Signale `tempo`, `catchUpSummary`, `catchUpProgress`, `catchUpFailed`; `setTempo`, `dismissCatchUpSummary`, `dismissCatchUpFailure`, `start`, `stop`, `pause`, `resume`. Tokens `FRAME_SCHEDULER` (`requestAnimationFrame`), `MONOTONIC_NOW` (`performance.now`), `PAGE_VISIBILITY` (`hidden`, `visibilitychange`, `pagehide`); Typen `FrameScheduler`, `PageVisibility`.
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
- Wirft die Nachberechnung (auch der Fallback), endet der Lauf ohne Übernahme, die Sperre löst sich, offene Lücken werden verworfen und `catchUpFailed` wird `true` (nur im laufenden Durchgang, nicht nach `stop()`); `dismissCatchUpFailure` setzt es zurück. Keine unbehandelte Promise-Ablehnung.
- Hinweis für die Facade (AP 5): `catchUpSummary` und `catchUpFailed` gehören zum Lauf, nicht zum Spiel. `store.newGame()` und `replace()` verwerfen sie nicht; bei Neues Spiel und Import ruft die Facade `dismissCatchUpSummary()` und `dismissCatchUpFailure()`. `pause()` bleibt über `stop()`/`start()` hinweg bestehen.
- `CatchUpService` schickt Config, Schnappschuss und Sekunden an den Worker und beendet ihn nach dem Ergebnis. Ohne Worker, bei Fehler oder ungültiger Antwort rechnet er `catchUp` auf einer Kopie im Hauptthread.

Worker-Build:

- Worker heißen `*.worker.ts`; sie gehören zu `tsconfig.worker.json` (`lib` `webworker`, über `webWorkerTsConfig` in `angular.json`) und sind aus `tsconfig.app.json` ausgenommen.
- `catch-up.worker.ts` importiert außer `domain` die Protokolldateien `catch-up-service.model.ts` und `catch-up-service.utils.ts` (`.claude/rules/state.md`). Diese beiden importieren nichts aus `@angular/*` oder `rxjs`.

Bewusste Abweichungen und Einschränkungen gegenüber dem Prototyp:

- Während der Nachberechnung wird nicht gespeichert und es gibt keine Aktionen.
- Der Fallback ohne Worker rechnet ohne Zwischenpausen und blockiert die Seite (der Prototyp wartete je Block).
- Ein Worker, der nie antwortet, hat keine Zeitgrenze; die Sperre bleibt bis `stop()`.
- Scheitert die Nachberechnung, geht die Offline-Zeit verloren, sobald wieder gespeichert wird; die UI kann es über `catchUpFailed` melden.

## Feature (`feature`)

Routen und Zustand:

- `gameRoutes`: Elternroute `''` mit `GamePage` und `providers: [provideGameState()]`; Kinder `''` (`SwarmPage`, `pathMatch: 'full'`), `umgebung` (`MapPage`), `ausbau` (`UpgradesPage`), je mit `data.view` (`GameViewId`: `swarm`, `map`, `upgrades`; Liste `GAME_VIEWS`).
- `app.routes.ts` in dieser Reihenfolge: Dev-Routen (`appDevRoutes`, `.claude/rules/dev.md`), Spielroute (lazy), `**` → `''`.
- `provideGameState()` = `GameFacade` und `provideGameLoopService()`. Der Zustand gehört zur Elternroute.
- `GameFacade`:
  - `config` (`GAME_CONFIG`), `view` (`GameView`), `toasts`, `menuOpen`, `collapsedSheets` (eingeklappt je Ansicht, Start ausgeklappt).
  - `start()`, `stop()`, `leave()` (`stop()` und `closeMenu()`), `dismissToast(id)`, `openMenu()`, `closeMenu()`, `setSheetCollapsed(view, collapsed)`.
- `game.utils.ts` (rein, ohne Angular):
  - `toGameView(config, state, tempo, catchUpProgress)`: `hud`, `swarm`, `map`, `upgrades` (je Kontextzeile), `chips`, `catchUp` (Overlay oder `null`). Unterwegs ist die Ernte 0.
  - Chips in fester Reihenfolge: nächste Zone, aktive Buffs, Freiausbauten, Tempo (nur ≠ 1).
  - Kontextzeile Schwarm: Reise (Ziel, Restzeit, Fortschritt) oder Stelle (Typ, Füllstand, Unterzeile ausgetrocknet, Schnitt bei der Zielstelle, „leer in“ oder keine Ernte); Tag zeigt die Markierung vor der besten Alternative, unterwegs keine Alternative.
  - Toasts: `toastCandidates` (Start-Toast mit ID `START_TOAST_ID` = 0 bei `fresh` und `reset`, dazu die Ereignisse `findCollected`, `zoneChanged`, `travelAborted`, `unmarked`, `noTarget`), `advanceToastQueue`, `removeToast`, `EMPTY_TOAST_QUEUE`; `isGameView`.
- Toast-Warteschlange: `linkedSignal` über den Kandidaten mit `ToastQueue` (`visible`, `lastSeenId`). Neu sind nur IDs über `lastSeenId`; sichtbar sind höchstens `MAX_VISIBLE_TOASTS` = 2, die neuesten. Verdrängte und abgelaufene Toasts kommen nie zurück, auch nicht, wenn das Protokoll weiterläuft oder geleert wird. Ein Toast verschwindet nur über `animationend` (`expired` → `dismissToast`).

Seiten:

- `GamePage` (Gerüst): startet die Schleife im Konstruktor und ruft über `DestroyRef` `leave()`. Facade-Zustand gehört zur Elternroute und überlebt die Seite; deshalb schließt das Verlassen das Menü (Toasts und eingeklappte Blätter bleiben). Navigation zwischen den Kindrouten startet nicht neu; Verlassen der Elternroute (z. B. `/katalog` im Dev-Build) speichert und stoppt, die Rückkehr rechnet die Zeit seit `savedAt` nach.
  - Aktive Ansicht per `toSignal` über `Router.events` (`NavigationEnd`) aus `data.view` des Kinds; `context` wählt die passende Kontextzeile.
  - Zeigt HUD, Kontextzeile, Menüknopf, Chips, Ansichtswahl, Toasts, `<router-outlet>`, das Nachberechnungs-Overlay (während `catchUpProgress`) und `DialogMenuComponent`.
  - Positionen mit Safe Area und die Rahmenhöhe ab `sm` in `game.page.css` (BEM `game__*`).
- `SwarmPage`, `MapPage`, `UpgradesPage`: je ein `app-bottom-sheet` (Titel „Kette“, „Ziele“, „Ausbau“) mit dem Eingeklappt-Zustand aus der Facade; noch ohne Inhalt.
- `dialog-menu/` `DialogMenuComponent`: Platzhalter im `app-dialog-frame` mit Titel „Menü“ und „Schließen“, offen über `menuOpen`.

Noch nicht umgesetzt:

- Inhalte der Blätter (AP 7, 9, 10), Segment Schwarm/Kette (AP 7).
- Menüinhalt, Ende-Dialog, „Während du weg warst“ und Anzeige von `catchUpFailed` (AP 8).
- Übergänge zwischen den Ansichten und Interpolation (AP 11).

## UI (`ui`)

Präsentational, nur Inputs/Outputs; Viewmodel-Typen in `<component>.model.ts`, die Facade setzt sie in `GameView` zusammen.

- `app-hud` (`HudView`, `HarvestNote`): drei `app-pill` für Vorrat (Balken, Kapazität als `extra`), Eier (Rate) und Ernte (Unterzeile unterwegs, gedrosselt oder je Sekunde); Spalten in `hud.component.css`.
- Kontextzeilen `app-swarm-context` (`SwarmContextView`), `app-map-context` (`MapContextView`: Zone, Geschwindigkeit), `app-upgrades-context` (`UpgradesContextView`: bezahlbar von gesamt). Sie tragen `ContextBarDirective` (`[appContextBar]`) als `hostDirective`.
- `app-progress-ring`: `fraction`, `tone` `lime` | `cyan`.
- `app-chips` (`ChipView`: `zone`, `buff`, `freeUpgrades`, `tempo`).
- `app-view-nav`: `routerLink` auf `/umgebung`, `/`, `/ausbau`; die aktive Ansicht trägt `aria-current="page"`.
- `app-menu-button`: Output `clicked`.
- `app-game-toast` (`GameToast`, `GameToastMessage` als Codes): `toast`, `config` (für Fundbeschreibungen); Output `expired`. Färbt die Hervorhebungen selbst.
- `app-catch-up-overlay` (`CatchUpOverlayView`: `percent` oder `null`).

Test-IDs: `game.<bereich>.<element>`, z. B. `game.frame`, `game.hud.food.value`, `game.ctx.<view>`, `game.views.<view>`, `game.<view>.sheet` und `game.<view>.sheet.grip`, `game.menu.open|title|close`, `game.chips.<id>`, `game.toasts.<kind>`, `game.catchUp.text`, `game.swarm.canvas`, `game.neuron.<upgradeId>`, `game.neuron.flagella`, `game.neuron.chain.<key>`, `game.neuron.node.rank`, `game.neuron.chainNode.rank`, `game.neuron.label.name|cost`, `game.neuron.reach.<index>`.

### Asset-Bibliothek (AP 6)

Alle visuellen Elemente des Prototyps 1:1 (gleiche Pfade, `lcg`-Seeds, Farben, Kurven und Dauern), eingebunden im Dev-Katalog (`.claude/rules/dev.md`). Grundsätze:

- Farben der Illustrationen nur aus `ui/art/art-palette.ts` (ADR 0002), gebunden per `[attr.fill]`/`[attr.stroke]`; Komponenten-CSS ohne Hex-Werte.
- Reine Zeichenfunktionen (Formen, Geometrie, Formation, Kurven, Canvas-Zeichnen) sind Angular-freie `*.utils.ts` neben den Komponenten, gemeinsame in `ui/art`.
- SVG-Teilkomponenten haben einen Attributselektor `g[app-…]` und werden als `<svg:g app-… />` in ein `<svg>` gesetzt. IDs von Gradienten und Clip-Pfaden sind je Instanz eindeutig (Modulzähler, z. B. `app-unit-sprite-<n>`).
- Die Schwarm-Szene gibt es nur als Canvas wie im Prototyp-Standard (`applyCanvas(true)`); die SVG-Formation mit `.swim`, `.bob`, `.paddle` ist nicht portiert. CSS-Bewegung gibt es nur, wo der Prototyp im Standard SVG zeigt: Mini-Schwarm der Karte (die Fresslinge dort per SMIL, ADR 0003) und Neuron.
- Bewegung schaltet der Input `motion` (Standard `true`) ab; die CSS-Animationen entfallen zusätzlich bei `prefers-reduced-motion: reduce`. Der Canvas zeichnet ohne `motion` mit Zeit 0.
- Hintergründe (Ferne, Dunst, Schwarm-Hintergrund) sind im Prototyp-Standard gerastert und stehen still; die Komponenten sind statisches SVG ohne Strahlen- und Teilchenbewegung.
- Kein Messmodus (`STRESS` ist immer 1).
- Bewusste Abweichung: Der Fressling ist die Amöbe (ADR 0003), nicht der Fressling des Prototyps.

### `ui/art`

- `art-palette.ts`: `as const`-Objekte je Bereich, Werte 1:1 aus dem Prototyp: `UNIT_SPRITE_COLORS`, `SPARKLE_COLOR`, `LOCKED_UNIT_ICON_COLORS`, `ZONE_MOODS` (`deep`, `mid`, `light`, `shape`, `glow`, `kind` aus `ZONE_MOOD_KINDS`; Index 4 ist die Ferne hinter der letzten Zone), `SITE_COLORS`, `SITE_MOODS`, `SCENE_COLORS`, `SITE_ICON_COLORS`, `MAP_COLORS`, `SOMA_COLORS` (`SomaTone`), `NEURON_COLORS`, dazu `EATER_DESIGN_COLORS` je Fressling-Entwurf (nicht aus dem Prototyp).
- `shape.utils.ts`: `lcg(seed): RandomSource` und `blobPath(r, seed, n?, jitter?, cx?, cy?)`.
- `path.utils.ts`: Typen `Point`, `PathSegment`, `Wander`, `WaveOptions`, `OutlineSample`; `formatCoord`, `formatPoint`, `smoothSegments` (Catmull-Rom als Kurvensegmente, für SVG und Canvas), `smoothPath`, `radialPoints`, `radialOutline`, `outlineSamples`, `ciliaFringe`, `wavePath`, `loopFrames` (geschlossene `values`-Liste), `easeSplines`, `wander` (Werte, Splines und Punkte).
- `easing.utils.ts`: `Easing`, `cubicBezier` (von `ui/scene/swarm-motion.utils.ts` genutzt). `keyframes.utils.ts`: `Keyframes`, `evenKeyTimes`, `keyframeValue` (wertet Keyframes wie SMIL `calcMode="spline"` aus; für den Canvas).
- `g[app-unit-sprite]` (`unit: UnitId`, `variant` Standard 0, `motion` Standard `false`, `detail: EaterDetail` Standard `full`, `phase` in Sekunden Standard je Instanz, `light: EaterLight | null`): Figur je Einheit, Clip- und Form-ID je Instanz. `variant`, `motion`, `detail`, `phase` und `light` wirken bisher nur beim Fressling. `phase` setzt das negative `begin` aller Takte (die Karte übergibt `eaterPhaseOffset(i)`, damit Verformung und Bahn synchron laufen); `light` animiert den Lichtversatz gegen die Drehung der Bahn, ohne `light` steht er fest auf `EATER_LIGHT`.
  - Fressling (ADR 0003): Amöbe aus `EATER_VARIANTS` (`unit-sprite/eater.utils.ts`): 5 Varianten (`EATER_VARIANT_COUNT`) mit festen `lcg`-Seeds; Variante 0 ist der Entwurf aus dem Katalog. Jede hat einen Umriss (`outline(phase)`, `inner(phase)` als Punkte, eingepasst auf ±9,6 und damit mit Leuchtsaum in ±12), Kern mit `wander`, Vakuole (`VACUOLE_PULSE`, hinten) und zwei Algen aus je 1–3 Kügelchen. Die Front zeigt bei allen Varianten nach +x. Verformung je Umrisstakt (ein Schub): das Scheinfüßchen vorn ist in der Ruhe (Phase 0) am längsten und wird im Schub eingezogen, ein seitliches tastet im Wechsel; Falten laufen an beiden Flanken von vorn nach hinten (über `u = (1 − cos angle)/2`); feine Runzeln am Hinterende; mitten im Schub streckt sich der Körper (`STRETCH`), und das Innenplasma strömt nach vorn. Algen und Kern strömen mit (`EATER_FLOW`, eigener Takt im SVG, `keyframeValue` im Canvas). Takte `EATER_TIMING` (Umriss 6 s, Kern 8,5 s, Vakuole 3,8 s) gelten für SMIL und Canvas. `detail: 'reduced'` lässt Leuchtsaum, Algen und Vakuole weg (Karte). `eaterVariantFor(index)` und `eaterPhaseOffset(index)` geben einer Figur fest Variante und Versatz. Licht von oben links: `worldLight(rotation)` dreht den Versatz `EATER_LIGHT` der Aufhellung gegen die Drehung der Figur.
  - Kriechen (ADR 0003): `eaterCrawl(index, area: CrawlArea): EaterCrawl` ist ein geschlossener Zufallsweg aus 12 Schüben ab `area.start` (Seed `index * 3571 + 29`; Schritt `step · 0,7…1,3`, Richtungswechsel bis ±70°, ab der Hälfte zieht es zurück zum Start, Restlücke linear verteilt, Punkte radial in den Ring `inner`…`outer` um die Schwarmmitte geklemmt), ein Schub je `EATER_TIMING.outline`, Runde 72 s; Werte relativ zum Start; `x`, `y`, `rotation` als `Keyframes` für den Canvas, dazu SMIL-Strings (`translateValues`, `rotateValues`, `lightValues`, `keyTimes`, `keySplines`). Die Drehung an einem Punkt ist die Winkelhalbierende von ein- und ausgehendem Segment, die Front zeigt also in Laufrichtung. Die Ruhepunkte der Bahn fallen auf Phase 0 des Umrisses.
  - `unit-sprite/eater-canvas.utils.ts`: `drawEater(ctx, variant, time, offset, detail)` zeichnet dieselben Schichten als Vektor in den Canvas; den Lichtversatz dreht es nach dem Winkel aus `ctx.getTransform()`, damit das Licht in jeder Lage oben links bleibt. `UNIT_SPRITE_HALF_EXTENT` (halbe Kantenlänge je Einheit, Rastergröße im Canvas) und `CHAIN_ICON_SCALE` (`ChainIconUnit`: Fressling bis Gelege) in `unit-sprite.model.ts`.
- `g[app-eater-design]` (`design: EaterDesignId` aus `EATER_DESIGN_IDS` in `eater-design.model.ts`, `motion`): Fressling-Entwürfe nach echten Mikroorganismen im Kurzgesagt-Stil: `paramecium` (Pantoffeltierchen), `bacillus` (Stäbchenbakterium), `dinoflagellate`, `heliozoan` (Sonnentierchen), `diatom` (Kieselalge), `stentor` (Trompetentierchen) und die Fantasieentwürfe `spiral` (Spiralschlund: Kammern entlang einer logarithmischen Spirale, Peristaltik zur Fadenkrone hin, Partikel werden eingesogen) und `prism` (Prismling: rubinrote Kristallraute aus 8 Facetten in vier Tönen um einen kreisenden inneren Scheitel, Splitter treiben hinterher; kein Punkt im Zentrum). Nur im Katalog (`eater-designs`, „Einheiten-Entwürfe“). Die Amöbe war ein Entwurf und ist jetzt der Fressling (`g[app-unit-sprite]`, ADR 0003).
  - Stil: flache Flächen, Randring im eigenen Farbton statt dunklem Umriss, Schattenseite unten rechts (Form in `shade`, darüber die Form in `body` nach oben links versetzt, per Clip), Leuchtsaum als breiter Strich mit geringer Deckkraft; kein Glanzpunkt, keine Augen oder Gesichter (helle Punkte nicht paarweise neben einen dunklen Kern setzen). Box ±12 wie `UNIT_SPRITE_HALF_EXTENT.eater`, Bewegungsrichtung +x.
  - Bewegung per SMIL (`<animate>` auf `d`, `opacity`, `x2`, `cx`, `stroke-dashoffset`; `<animateTransform>`; `<animateMotion>`), weil Safari `d` nicht per CSS animiert. Phasenversatz je Instanz über negatives `begin` (Modulzähler). Ohne `motion` entfallen alle Animationselemente; `prefers-reduced-motion` wirkt auf SMIL nicht.
  - IDs je Instanz `app-eater-design-clip-<n>` und `app-eater-design-shape-<n>`; die Form steht in `<defs>` und wird per `<use>` geteilt.
  - `eater-design.utils.ts`: Geometrie je Entwurf (`PARAMECIUM`, `BACILLUS`, `DINOFLAGELLATE`, `HELIOZOAN`, `DIATOM`, `STENTOR`, `SPIRAL`, `PRISM`) mit den Helfern aus `ui/art/path.utils.ts`. Spec daneben (Box ±12).
- `g[app-sparkle-sprite]`: Funkeln der Fundstücke.
- `app-unit-icon` (`unit: UnitId | null`, `variant: 'list' | 'tab'`): eigenes `<svg>`; `null` zeigt das gesperrte Symbol mit „?“. Rahmen aus `unitIconFrame` (`unit-icon.utils.ts`; Liste 34 × 34 für alle Einheiten, die Amöbe in `-12 -12 24 24`). `g[app-chain-node]` gibt `motion` an das Sprite weiter, die Amöbe verformt sich dort; die Listen-Icons bleiben statisch.

### `ui/scene`

- Statische SVG-Teile: `g[app-far-mood]` (`mood`; Index über `farMoodIndex(zone, zoneCount)`), `g[app-zone-haze]` (`zone`), `g[app-scene-backdrop]` (`kind: SceneBackdropKind` = Stellentyp, `travel` oder `none`, `zone`), `g[app-scene-site]` (`type`, `shape`, `fillFraction`; Skala `sceneSiteScale` = 0,35 + 0,65·√Anteil). Geometrie in `mood.utils.ts` und `scene-site.utils.ts`, Typen in `models/scene.model.ts`.
- `sceneBackdrop` mischt wie der Prototyp die Länge der deutschen Stellenschlüssel in den Seed (`PROTOTYPE_SITE_KEY_LENGTHS`: `algen` 5, `plankton` 8, `krebs` 5, `schnee` 6, `seegras` 7); nicht durch die englischen IDs ersetzen.
- Drift: `driftItems(travel)` (`drift.utils.ts`, Seed 42; 70 Flocken oder 16 Striche, Kachel `STREAK_TILE` = 120), gruppiert in `swarm-drift.utils.ts` (`speckGroups`, `streakLines`).
- `app-swarm-canvas`: Inputs `units` (Anzahl je Einheit in der Reihenfolge von `UNIT_IDS`), `travelAngle` (`number | null`; `null` = an einer Stelle), `motion`. Fläche `SWARM_CANVAS_BOX` (680 × 800 ab −340/−340).
  - Sprites (`SwarmSprite`): `raster` (Bild, alle Einheiten außer dem Fressling) oder `animated` (`draw(ctx, time, index)`, der Fressling über `drawEater` mit `eaterVariantFor` und `eaterPhaseOffset`). `drawSwarmFrame` zählt den Index je Einheit und ruft nach denselben Transformationen `drawImage` oder `draw` auf.
  - Lebenszyklus: `afterNextRender` startet; die Raster-Sprites kommen aus einem versteckten `<svg>` mit `g[app-unit-sprite]` (ohne Fressling), per `XMLSerializer` als SVG-Daten-URL in ein `Image` und von dort in ein Canvas gerastert (`spritePixels`, Pixelverhältnis höchstens 3). Die Frame-Kette läuft über `requestAnimationFrame` von `DOCUMENT.defaultView`; `DestroyRef` bricht sie ab und verwirft noch dekodierende Sprites.
  - Formation (`swarm-formation.utils.ts`): `swarmFigureCounts` (Fresslinge bis 48, Brüter bis 8, höhere Stufen bis 4), `swarmFigures(units, travelling)` mit Goldenem Winkel; an der Stelle `bob`/`crawl` (Fresslinge mit `eaterCrawl` im Ring ab `r0`, Schritt 22, und `eaterPhaseOffset(i)`), unterwegs `bob`/`swim` gestaucht (Front in Reiserichtung +x). Fresslinge sind um `EATER_SCALE` = 1,35 größer als im Prototyp, im Abstand `EATER_SPACING` (22 an der Stelle, 18 unterwegs statt 17; ADR 0003).
  - Bewegung (`swarm-motion.utils.ts`): `cubicBezier`, `EASE_IN_OUT`, `EASE_OUT`, `alternate` (kein Paddeln und kein Rollen der Fresslinge, ADR 0003); Trek-Übergang `nextTrek`/`trekAngle` über `TREK_DURATION_MS` = 800 auf den auf 0,1° gerundeten Winkel; `flowRotation` dreht die Drift (Winkel + 90°). Das Zeichnen je Frame macht `drawSwarmFrame` (`swarm-draw.utils.ts`), die Drift als `Path2D` aus `buildSwarmDrift`.
- Hinweis für AP 11: `travelAngle` je Reise fest übergeben. Ein Winkel, der sich ständig ändert, startet in jedem Frame einen neuen 800-ms-Übergang.
- Noch nicht umgesetzt (AP 11): Rastern der Hintergründe ins Canvas, Lage im Ebenenstapel, Interpolation zwischen den Schritten, Übergänge und die Anbindung an Zustand und Ansicht.

### `ui/map`

- `map.model.ts`: `REACH_PX` = 252 (Kartenpixel je Reichweite), `MAP_SITE_ICON_RADIUS` je Stellentyp, `MAP_ZONES`/`MapZone` (`current`, `next`).
- `g[app-map-site-icon]` (`type`, `shape`, `radius`): Symbol je Stellentyp, Geometrie aus `mapSiteIconGeometry` (`map-site-icon.utils.ts`, Union `MapSiteIconGeometry`).
- `g[app-map-site]` (`type`, `shape`, `fillFraction`, `dead`, `zone`, `highlight: MapSiteHighlight` = `none` | `target` | `auto`, `here`): Füllstand über die Symbolgröße, ausgetrocknet `opacity-35`, nächste Zone blasser mit gestricheltem Ring, Ring für Ziel und Auto-Ziel; mit `here` ohne Symbol (das zeigt `g[app-map-current-site]`). Ringe und Radien in `map-site.utils.ts`.
- `g[app-map-current-site]` (`type`, `shape`, `fillFraction`, `dead`): die Stelle, an der der Schwarm ist, vergrößert.
- `g[app-map-find]` (`zone`, `highlight: MapFindHighlight` = `none` | `target`).
- `g[app-map-swarm]` (`eaters`, `brooders`, `motion`): Mini-Schwarm; die Brüter kreisen per CSS (`map-swarm__swirl`), die Fresslinge kriechen per SMIL (`animateTransform` translate und rotate aus `eaterCrawl` im Ring ab 15, Schritt 8, damit die Brüter in der Mitte frei bleiben, negatives `begin` aus `eaterPhaseOffset`, derselbe Versatz als `phase` und die Lichtwerte als `light` ans Sprite; ohne `motion` statisch am Startpunkt; ADR 0003). Plätze aus `mapSwarmLayout` (`MapSwarmCrawler`); jeder Fressling hat `variant` (`eaterVariantFor(i)`) und wird reduziert gezeichnet (`detail="reduced"`, SMIL nur mit `motion`).
- `g[app-map-water]`: Wasser mit drei Ringen aus `REACH_PX`.
- Keine Test-IDs; Klickflächen sind vorbereitet (`cursor-pointer`, transparente Trefferkreise), Outputs gibt es noch nicht.
- Noch nicht umgesetzt (AP 10): Reichweitenringe, Route, Abdunklung, Beschriftungen, Verschieben und Markieren.

### `ui/neuron`

- `neuron.model.ts`: `CHAIN_KEYS`/`ChainKey`, `SWARM_DENDRITE_IDS`, `NeuronSelection`, `UpgradeCostView` (`free`, `food`, `units`, `lockedUntil`), `UpgradeNodeView`, `ChainNodeView` (`locked`), `SwarmNeuronView`, `ChainNeuronView`, Geometrie- und Anzeigetypen (`DendriteGeometry`, `BeadView`, `MyelinView`, `ReachMilestoneView`, `NeuronOrganellesView`). Die Facade setzt die Viewmodels in AP 7 zusammen; die Komponenten bekommen nur Rohwerte.
- `neuron.utils.ts`: `NEURON_VIEW_BOX` (`-500 -560 1700 1400`), `CHAIN_NEURON_X`, feste Pfade und Dendriten (`SWARM_DENDRITES`, `CHAIN_DENDRITES`), `beadPositions` (höchstens 5 und die nächste), `myelinStates` und `reachMilestones` (über `reach.every` aus `GameConfig`), `neuronOrganelles(showChain)` (Seed 99).
- Komponenten: `g[app-neuron-backdrop]` (`showChain`), `g[app-neuron-soma]` (`tone: SomaTone`), `g[app-neuron-dendrite]` (`geometry`, `rank`, `tone`, `locked`, `motion`), `g[app-neuron-axon]` (`path`, `tone`, `motion`), `g[app-upgrade-node]` (`rank`, `affordable`, `selected`, `motion`), `g[app-chain-node]` (`unit`, `rank`, `affordable`, `locked`, `selected`, `motion`), `g[app-neuron-label]` (`position`, `name`, `cost`, `affordable`, `align`, `tone`), `g[app-swarm-neuron]` (`view`, `config`, `motion`), `g[app-chain-neuron]` (`view`, `motion`).
- Texte: `@@uiGame-chainNeuron-synapse|title`, `@@uiGame-neuronLabel-cost-free|food|units|lockedUntil`, `@@uiGame-swarmNeuron-milestone-*`; Namen aus `UPGRADE_NAMES` und `UNIT_TEXTS`.
- Bewegung (Signal auf Dendrit und Axon, Puls und Auswahl der Knoten) als CSS-Klassen `…--moving` nur mit `motion`, in den `.component.css` mit `prefers-reduced-motion`.
- Eigenheiten des Prototyps, die bewusst 1:1 bleiben: Kosten am Ketten-Neuron stehen immer in der Kostenfarbe `chainCost`, auch wenn nicht bezahlbar (Reihenfolge der CSS-Regeln im Prototyp). Ränge zeigt die Pipe `formatInteger`.
- Noch nicht umgesetzt (AP 7): Auswahl, Fokus, Verschieben, Tabs und Outputs.

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
- `game-loop.service.spec.ts`: Schleife über ersetzte Tokens (Frames, Uhren, Sichtbarkeit, Worker-Fabrik): Speichern beim Start, feste Schritte und Tempo, Speicherintervall, `pagehide`/Verstecken, `stop`/`start`, Pause, Nachberechnung mit Sperre, Lücken, Verwerfen, Zusammenführen und Fehler (Fake-Worker meldet `onerror`, der Fallback wirft über eine Config mit werfendem Getter `finds`).
- `catch-up.service.spec.ts` und `catch-up-service.utils.spec.ts`: Worker-Protokoll, Fortschritt, Fallback im Hauptthread (kein Worker, Fehler, ungültige Antwort), Abbrechen; Type Guards.
- `upgrade-logic.spec.ts`, `site-logic.spec.ts`, `travel-logic.spec.ts`, `harvest-logic.spec.ts`, `find-logic.spec.ts`, `zone-logic.spec.ts`: die Anzeigefunktionen aus AP 5.
- `feature/state/game.utils.spec.ts`: `toastCandidates`, `advanceToastQueue` (höchstens zwei, nichts kehrt zurück), `toGameView` (Ernte unterwegs, Unterzeilen, Markierung vor Alternative, Reihenfolge der Chips, Fortschritt der Nachberechnung).
- Asset-Bibliothek (AP 6): Die Erwartungswerte wurden einmal aus den Originalfunktionen des eingefrorenen Prototyps unter Node erzeugt (`STRESS` = 1); die Erzeugerskripte sind nicht im Repo.
  - `ui/art/shape.utils.spec.ts`: Folgen von `lcg` und Pfade von `blobPath`.
  - `ui/art/path.utils.spec.ts`, `keyframes.utils.spec.ts`: Schleifen, Normalen, gerade Welle, Kreis, `wander`, Segmente; Keyframes an den Marken, dazwischen, mit Easing.
  - `ui/art/unit-sprite/eater.utils.spec.ts` und `eater-canvas.utils.spec.ts`: 5 verschiedene Varianten, Algen aus 1–3 Kügelchen, Front nach +x, Scheinfüßchen in der Ruhe länger als im Schub, Wanderbahn (geschlossen ab dem Platz, im Ring, Schrittweite, Stillstand an den Keyframes, Front in Laufrichtung, Licht gegen die Drehung, stabil je Index), Box ±12 mit Saum, gleiche Befehle je Bild, Variante je Index; Schichten im Canvas, reduziert, Zeit und Versatz, Varianten, Licht bei gedrehter Figur, Strömung von Algen und Kern.
  - `ui/scene/scene-geometry.spec.ts` mit `scene-geometry.fixture.ts`: Markup von Ferne, Dunst, Schwarm-Hintergrund und Stelle als Länge, Hash und Anfang, dazu Drift und Skala der Stelle.
  - `ui/scene/swarm-formation.utils.spec.ts`, `swarm-motion.utils.spec.ts`, `swarm-draw.utils.spec.ts` mit `swarm.fixture.ts`: Figurenzahl und Formation (Prototyp-Vergleich ohne Fresslinge, dazu Plätze und Skala der Fresslinge an der Stelle und unterwegs), Kurven und Trek-Übergang, aufgezeichnete Zeichenaufrufe je Frame (mit Raster-Sprites, ohne Fresslinge per `withoutEaters`), kriechende Fresslinge, Drift und Rastern der Sprites; dazu ein Fall, dass animierte Sprites nach denselben Transformationen mit Zeit und Index je Einheit aufgerufen werden.
  - `ui/map/map-site-icon/map-site-icon.utils.spec.ts` und `ui/map/map-swarm/map-swarm.utils.spec.ts` mit je einer `*.fixture.ts`: Markup der Stellensymbole und des Mini-Schwarms (Brüter und Plätze der Fresslinge), dazu Variante, Bahn, Phase und Licht je Fressling.
  - `ui/neuron/neuron.utils.spec.ts`: Perlen, Myelin, Meilensteine (mit `PROTOTYPE_GAME_CONFIG`) und Organellen mit Werten aus dem Prototyp im Spec.
- `e2e/game.e2e.ts` (Desktop und Smartphone): HUD mit Werten und Willkommens-Toast, Wechsel der Ansichten mit URL und `aria-current`, Griff des Blatts, Menü öffnen und schließen.

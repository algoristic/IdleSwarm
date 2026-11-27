---
paths:
  - 'src/app/game/**'
---

# game

Das ganze Spiel. Bisher gibt es Domänenmodell, Spielwerte, Zufall, Startzustand, Regeln und Zeitschritt (`domain`) sowie die Texte der Spieldaten (`ui/texts`). Store, Schleife und Ansichten folgen (`docs/plan-angular-umbau.md`). Referenz für Regeln und Werte ist der eingefrorene Prototyp.

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

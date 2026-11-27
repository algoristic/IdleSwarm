---
paths:
  - 'src/app/game/**'
---

# game

Das ganze Spiel. Bisher gibt es Domänenmodell, Spielwerte, Zufall und den Startzustand (`domain`) sowie die Texte der Spieldaten (`ui/texts`). Regeln, Zeitschritt, Store, Schleife und Ansichten folgen (`docs/plan-angular-umbau.md`). Referenz für Regeln und Werte ist der eingefrorene Prototyp.

## Modelle (`domain/models`)

- ID-Listen `as const` mit abgeleitetem Typ: `UNIT_IDS`, `UPGRADE_IDS`, `SITE_TYPE_IDS`, `FIND_IDS`, `BUFF_IDS` (Teilmenge von `FIND_IDS`), `ZONE_IDS`, `TARGET_KINDS`.
- Die Reihenfolge jeder Liste ist die des Prototyps. Zufall (`pickWeighted`, Startplatzierung) und Kette hängen davon ab; nicht umsortieren.
- `GameState` mit `Site`, `Find`, `Travel`, `Mark`, `Point`, `GameStats`; `SAVE_VERSION = 1`.
- `GameConfig` ist tief readonly; Einheiten und Zonen als Listen, Ausbauten und Stellentypen als `Record` über die IDs.

## Spielstand v1

Englische IDs und Feldnamen. Sie werden gespeichert und sind stabil; Umbenennen entscheidet der Nutzer. Wichtigste Abbildungen aus dem Prototyp (Version 3):

- Felder: `v→version`, `rng→rngState`, `t→time`, `vorrat→food`, `eier→eggs`, `ranks→upgradeRanks`, `free→freeUpgrades`, `pos→position`, `at→siteId`, `findTimers→findRespawnAt`, `leave→leaveRequested`, `hist→harvestHistory`; an Stellen `known→discovered`, `goneAt→removeAt`, `born→bornAt`.
- Ausbauten `herd/verd/geis/kropf→hearth/digestion/flagella/crop`; Stellentypen `algen/plankton/krebs/schnee/seegras→algae/plankton/carcass/marineSnow/seagrass`; Buffs `fress/lege/verm/wind→feedingFrenzy/layingBoost/breedingFrenzy/tailwind`.

Das vollständige Mapping ergibt sich aus Modellen und `new-game-logic.fixture.ts`.

## Spielwerte (`domain/data/game-config.data.ts`)

`DEFAULT_GAME_CONFIG`: Werte 1:1 aus `CFG` des Prototyps, ohne Texte und Icons.

## Logik (`domain/*-logic.ts`)

- `rng-logic.ts`: `nextRandom` (mulberry32, Zustand in `rngState`), `pickWeighted` über die Reihenfolge einer ID-Liste (nicht über die Schlüsselreihenfolge des Gewichtsobjekts).
- `upgrade-logic.ts`: `upgradeEffect`, `reachFor`.
- `geometry-logic.ts`: `distance`.
- `site-logic.ts`: `randomSizeFactor`, `createSite`, `placeInDisc`, `isZoneInRange`, `discover` (bekommt die Reichweite direkt).
- `find-logic.ts`: `createFind`.
- `new-game-logic.ts`: `newGame(config, seed, now)`, `harvestHistoryLength`.

Regeln:

- Funktionen bekommen `GameConfig` als Parameter, keine globale Config.
- Der Zustand wird mutiert.
- Reihenfolge der Zufallszahlen und der Gleitkomma-Operationen bleibt exakt wie im Prototyp (Golden Master in AP 3).
- Feste Längen (Zonen, Einheiten, Verlauf der Ernte) werden aus der Config abgeleitet.

## Texte (`ui/texts/game-texts.ts`)

`$localize`-Records `UNIT_TEXTS` (`name`, `plural`, `dative`, `abbreviation`), `UPGRADE_NAMES`, `SITE_TYPE_NAMES`, `ZONE_NAMES`, `FIND_NAMES`, `FIND_DESCRIPTIONS`. IDs `@@uiGame-gameTexts-<key>`. Fundbeschreibungen sind Funktionen von `GameConfig`; Zahlen kommen über `formatNumber`, die Einheit „s“ steht im Text.

## Tests

- `rng-logic.spec.ts`: Referenzwerte von mulberry32 und `pickWeighted`.
- `new-game-logic.spec.ts` mit `new-game-logic.fixture.ts`: Startzustände für die Seeds 4242, −123456789 und 13 (Seed 13 deckt eine verworfene Platzierung und das Entdecken in der aktuellen Zone ab). Die Fixture wurde einmal erzeugt, indem der Prototyp unter Node lief und die Felder umbenannt wurden; das Erzeugerskript ist nicht im Repo.

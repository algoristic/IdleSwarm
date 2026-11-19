---
paths:
  - "src/app/finds/**"
---

# Funde, Sammlung und Badges

Funde, Buffs, Fragmente, Sammelobjekte und Badges der Ära I (Game-Design §4.16, §4.17, AP 1.3.5 und 1.3.6). Die Domäne hat nur Regeln (`domain`) und Namen (`ui`); angezeigt werden die Funde im Funde-Panel des HUD (`hud/ui/finds-panel`) und im Log, die Fragmente auch in der Genom-Ansicht.

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `finds/domain/models/finds.model.ts` | stabile IDs: `BUFF_IDS`, `FRAGMENT_IDS`, `COLLECTIBLE_IDS`, `COLLECTED_IDS` (Fragmente und Sammelobjekte), `FOREIGN_DNA`, `NUTRIENT_BUBBLE`, `FIND_ENTRY_IDS` (Ziehungsreihenfolge), `FIND_KINDS`, `COLLECTION_SET_IDS` (= Badge-IDs), `FIND_TRIGGERS` (`arrival`, `harvest`); `FindEntry`, `FindEffectSpec`, `CollectionSet`, `FragmentAdaptations`, `FindBuff`, gespeicherter Zustand `Finds` (`rngState`, `total`, `collected`, `buffs`); `isBuffId`, `isCollectedId` |
| `finds/domain/models/finds-event.model.ts` | Ereignis `found` (`FoundEvent`: Typ, Auslöser, Schwelle, wirksamer und ersetzter Eintrag, Art, Menge, Buff-Ablauf, Fragmentfortschritt, freigeschaltete Adaption, Badge, `playedMs`), `FindsResult` |
| `finds/domain/models/collection.model.ts` | `CollectionProgress`, `DrawerField`, `DrawerSet`, `DrawerFragments`, `FindsDrawer` |
| `finds/domain/data/finds-era1.data.ts` | `FIND_ENTRIES` (Ziehungsreihenfolge), `FIND_ENTRY_BY_ID`, `FIND_ENTRIES_BY_SITE`, `COLLECTION_SETS`, `COLLECTION_SET_BY_ID`, `FRAGMENT_ADAPTATIONS` (abgeleitet aus den Genom-Daten); nur Struktur (Art, Fundorte, Ziel, Set) |
| `finds/domain/finds-logic.ts` | `findsRngState(seed)` (`seedToRngState(seed + '#finds')`), `initialFinds`, `drawFind` (eine Ziehung), `isFindTargetReached`; Buffs: `isBuffActive`, `buffEffects`, `pruneBuffs`, `nextBuffExpiryMs`; Abbau-Schwellen: `nextHarvestThreshold` (`HarvestThreshold`) |
| `finds/domain/collection-logic.ts` | `isCollectibleCollected`, `setProgress`, `isSetComplete`, `earnedBadges`, `badgeEffect(id, params)`, `badgeEffects(finds, params)` (Quelle für `stateEffects`), `collectionProgress` (x / y, v1 y = 24), `findsDrawer` (Inhalt der Schublade „Funde“) |
| `finds/ui/finds-labels/finds-labels.ts` | `FIND_ENTRY_LABELS`, `COLLECTION_SET_LABELS`, `BADGE_LABELS`; genutzt von HUD-Log, Funde-Panel und Genom-Ansicht |

## Besonderheiten

- Eigener RNG-Strom: `finds.rngState` entsteht beim neuen Spiel und in der Migration 3→4 aus `seedToRngState(seed + '#finds')`. Der Zusatz `#finds` darf sich nicht ändern, Spielstände hängen davon ab. Jede Ziehung verbraucht genau drei Zahlen (`r_1` Fund ja/nein, `r_2` Eintrag, `r_3` Streuung `u_F`), auch ohne Fund; der Generator-RNG `rngState` bleibt unberührt. Ändert sich die Zahl der Ziehungen, verschieben sich alle späteren Funde.
- Gezogen wird nur in `engine/domain/step-logic.ts`: nach jeder Ankunft (`'arrival'`, nach `arrived`, für die neue Futterstelle) und an jeder Abbau-Schwelle `j / n_A` (`'harvest'`, aufsteigend; bei 100 % nach `siteDepleted`). `step` und `nextSplitMs` teilen an Schwellen und Buff-Abläufen, damit sie exakt liegen.
- Der erste Fund des Spiels (`total === 0`) ist immer Fremde DNA, unabhängig von `r_2`, mit `replaced = null`. Danach wird ein Eintrag mit erreichtem Ziel (Fragment, dessen Adaption frei ist; gesammeltes Sammelobjekt) zu Fremder DNA mit demselben `u_F`; `replaced` nennt den gezogenen Eintrag. Jeder Fund zählt in `total`, auch ein Ersatz. Ziehungen ohne Fund erzeugen kein Ereignis.
- Buffs wirken nur mit `mul` auf `collectRate`, `broodRate` oder `findChance` und nur, solange `expiresAtMs > time.played` (`isBuffActive`); ein weiterer Fund desselben Buffs verlängert ihn (`max(Ablauf, t) + T_B`), je Buff-ID gibt es höchstens einen Eintrag. Abgelaufene Einträge dürfen im Zustand stehen, wirken aber nicht; `pruneBuffs` entfernt sie.
- Badges und freigeschaltete einzigartige Adaptionen werden aus `collected` abgeleitet und nie gespeichert; die Badge-ID ist die Set-ID.
- Alle Zahlen sind `params` je ID (`<id>Weight`, `foreignDnaFactor`, `nutrientBubbleShare`, `<id>Factor`, `<id>Seconds`, `<setId>BadgeEffect`; Zuordnung `FIND_ENTRY_PARAMS`, `BADGE_PARAMS` in `balance/domain/formulas.ts`). Die Spieldaten enthalten keine Zahlen.
- Abhängigkeiten: `finds/domain` nutzt `genome/domain` zur Laufzeit (Genom-Daten, `fragmentProgress`, `isUniqueAdaptationUnlocked`), `genome/domain` nutzt `finds/domain` nur über Typen (`import type`). So entsteht kein Laufzeitzyklus; neue Abhängigkeiten von `genome/domain` nach `finds` vermeiden.
- Ein neuer Eintrag: ID in `finds.model.ts` an der richtigen Stelle der Ziehungsreihenfolge, Eintrag in `FIND_ENTRIES`, Schlüssel in `BalanceParams` und `FIND_ENTRY_PARAMS`, Name in `FIND_ENTRY_LABELS`. Die Grenzen auf der Modell-Seite leiten sich aus den Daten ab.

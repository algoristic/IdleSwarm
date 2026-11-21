# ADR-005: Komprimiertes JSON in `localStorage` mit Migrationskette

**Status:** Angenommen
**Datum:** 2026-11-18

## Kontext

Ohne Backend liegen Spielstände vollständig im Browser ([ADR-008](008-kein-backend-github-pages.md)). Sie müssen spätere Spielversionen überstehen und dürfen bei Fehlern nicht stillschweigend verloren gehen ([Konzept §7](../technisches-konzept.md#7-persistenz)). `Num`-Werte passen nicht in JSON-Zahlen ([ADR-002](002-break-infinity-num.md)).

## Entscheidung

- **Format:** JSON, komprimiert mit `lz-string` als Base64 (`compressToBase64`). Der Product Owner hat die Bibliothek freigegeben. Sie arbeitet synchron und ist deshalb auch bei `pagehide` nutzbar.
- **`Num`** wird als String gespeichert.
- **Version 1** enthält nach Entscheidung des Product Owners nur `version`, `seed`, `rngState`, `time`, `era`, `res` und `units`. Weitere Felder kommen mit ihren Mechaniken über Migrationen.
- **Migrationen:** Beim Laden wird ein Stand schrittweise von Version `n` auf `n + 1` angehoben, bis die aktuelle Version erreicht ist.
- **Validierung:** Vor dem Schreiben und nach dem Laden wird der Stand geprüft. Übernommen werden nur bekannte Felder. Negative Mengen und ungültige Zeiten werden abgelehnt.

| Slot | Inhalt |
|---|---|
| `idleswarm.save` | aktueller Stand |
| `idleswarm.save.backup` | vorheriger lesbarer Primär-Stand |
| `idleswarm.save.unreadable` | zuletzt verdrängter unlesbarer Primär-Stand; ein unlesbares Backup, sofern der Slot frei ist |

- **Speichern:** Der bisherige Primär-Stand wandert erst ins Backup, bei Unlesbarkeit in den Slot `idleswarm.save.unreadable`. Danach wird der neue Stand geschrieben. Scheitert das, bleibt der Primär-Stand erhalten und der Sicherungs-Slot bekommt seinen alten Wert zurück.
- **Laden:** Erst der Primär-Stand, sonst das Backup. Das Ergebnis meldet `empty`, `loaded`, `restored-from-backup` oder `failed`; der Speicher bleibt dabei unverändert.
- **Autosave:** alle 30 s sowie bei `visibilitychange` (hidden) und `pagehide`.
- **Speicherzugriff scheitert beim Laden:** Es wird nichts überschrieben. Jeder Speicherversuch prüft zuerst erneut und übernimmt einen dann lesbaren Stand.
- **Unlesbares Backup:** Es wandert nach `idleswarm.save.unreadable`, sofern dieser Slot frei ist.

### Umsetzungsstand

**Umgesetzt** in `persistence/domain/`:

- [`serialize-logic.ts`](../../src/app/persistence/domain/serialize-logic.ts): Kodierung und Validierung
- [`slots-logic.ts`](../../src/app/persistence/domain/slots-logic.ts): Slots, Speichern und Laden über die Schnittstelle `KeyValueStore`, der `localStorage` genügt
- [`migrations/migrations-logic.ts`](../../src/app/persistence/domain/migrations/migrations-logic.ts): Migrationskette und `SaveError`. Die Registry enthält die Migrationen 1→2 ([`v1-to-v2.ts`](../../src/app/persistence/domain/migrations/v1-to-v2.ts)), 2→3 ([`v2-to-v3.ts`](../../src/app/persistence/domain/migrations/v2-to-v3.ts)), 3→4 ([`v3-to-v4.ts`](../../src/app/persistence/domain/migrations/v3-to-v4.ts)) und 4→5 ([`v4-to-v5.ts`](../../src/app/persistence/domain/migrations/v4-to-v5.ts)).
- **Version 3** (AP 1.2.1–1.2.7) ergänzt `map`, `travel`, `auto` und `priority` ([Game-Design §5](../game-design.md#5-spielstand-version-3)). Die Migration 2→3 setzt nach Entscheidung im Game-Design alles außer Seed, RNG-Zustand und Zeiten auf die Startwerte und erzeugt die Startkandidaten aus dem übernommenen `rngState`; Startwerte und Generatorwerte stehen dort als feste Literale, damit spätere Balance-Änderungen das Ergebnis nicht verschieben.
- **Version 4** (AP 1.3.4) ergänzt `pheromones`, `genome` und `finds` ([Game-Design §5.1](../game-design.md#51-spielstand-version-4)). Die Migration 3→4 setzt nach PO-Entscheidung ebenso alles außer Seed, RNG-Zustand und Zeiten auf die Startwerte (feste Literale `V4_START`, Generatorwerte und `readRngState` aus `v2-to-v3.ts`) und leitet den Fund-RNG `finds.rngState` wie ein neues Spiel aus dem Seed ab ([ADR-003](003-fester-logik-takt-seeded-rng.md)). Ein Stand der Version 2 wird dabei zweimal zurückgesetzt; seine Kandidaten entstehen aus dem RNG-Zustand nach 2→3.
- **Version 5** (aktuell, M1.5, Grundlage für AP 1.5.2–1.5.4) ergänzt `settings` und `onboarding` ([Game-Design §5.2](../game-design.md#52-spielstand-version-5)). Die Migration 4→5 setzt nach PO-Entscheidung erstmals nicht zurück: Der gesamte Fortschritt bleibt, die Einstellungen bekommen den Standard, freigeschaltet wird, was der Stand schon erreicht hat (Freischaltregeln aus `onboarding/domain` mit festen Werten `V5_UNLOCK_PARAMS`), und die Hinweise dazu gelten als gesehen. Stände der Versionen 1–3 laufen durch ihre zurücksetzenden Migrationen und dann 4→5.
- **Import:** `importSave(text)` in `serialize-logic.ts` entfernt Leerraum aus eingefügtem Text und liest dann wie `decodeSave` (Migration und Prüfung); Fehler kommen als `SaveError` im Ergebnis zurück. Export ist `encodeSave`.
- Die Prüfung beim Laden lässt Route mit 1 bis 50 Punkten und die Schwelle in `[0; 1]` zu, damit ein späteres Absenken von `θ_max` gespeicherte Stände nicht ungültig macht. Ebenso hängt die Prüfung der Version 4 von keinem Balance-Wert ab: Pheromonpunkte ganzzahlig ≥ 0 ohne Prüfung gegen `P_ges`, nur bekannte Knoten mit Vorgänger, Fundzähler ≥ 1 auch über der benötigten Fragmentzahl, abgelaufene Buffs zulässig. Version 5: Einstellungen nur aus ihren Listen, Onboarding nur bekannte IDs ohne Doppelte (die Reihenfolge wird normalisiert, die Passung zum Fortschritt nicht geprüft).
- Tests mit eingefrorenen Spielständen der Versionen 1, 2, 3 und 4 ([`serialize-logic.spec.ts`](../../src/app/persistence/domain/serialize-logic.spec.ts); der v3-Stand liegt mitten in der zweiten Reise und wird seit Version 4 migriert, der v4-Stand an der ersten Futterstelle mit Drüsenpunkt und Fund) und je Migration ([`v1-to-v2.spec.ts`](../../src/app/persistence/domain/migrations/v1-to-v2.spec.ts), [`v2-to-v3.spec.ts`](../../src/app/persistence/domain/migrations/v2-to-v3.spec.ts), [`v3-to-v4.spec.ts`](../../src/app/persistence/domain/migrations/v3-to-v4.spec.ts), [`v4-to-v5.spec.ts`](../../src/app/persistence/domain/migrations/v4-to-v5.spec.ts)).

**Umgesetzt** in [`persistence/data-access/persistence/persistence.service.ts`](../../src/app/persistence/data-access/persistence/persistence.service.ts): Laden beim Start, Autosave, Hinweise an die Oberfläche und das erneute Laden nach einem gescheiterten Speicherzugriff. Ein unveränderter Zustand wird nicht erneut geschrieben, damit ein zweites Ereignis beim Verlassen das Backup nicht verdrängt.

- **Autosave-Intervall** (AP 1.5.3): aus `settings.autosaveIntervalMs` im Spielstand (10 s, 30 s, 60 s, 5 min); ändert es sich (Einstellung, Import, Zurücksetzen), startet der Timer mit dem neuen Wert neu. `AUTOSAVE_INTERVAL_MS` ist nur noch der Standard (30 s).
- **Export, Import, Zurücksetzen** (AP 1.5.2, US-07.04, US-07.05): `exportSave()` speichert und liefert den Stand als `encodeSave`-Text; `importSave(text)` prüft mit `importSave` aus `serialize-logic.ts` und liefert `'imported'` oder den `SaveErrorCode`. Ein übernommener Stand ersetzt das Spiel ohne Offline-Nachholen (sonst ließe sich mit alten Export-Texten Zeit gewinnen), die Uhr wird nur abgeglichen. `resetGame()` beginnt ein neues Spiel mit neuem Seed und behält die Einstellungen; das Onboarding beginnt von vorn. Import und Zurücksetzen speichern sofort; wie jedes Speichern verdrängt das den bisherigen Primär-Stand ins Backup, der vorige Stand liegt dort also nur bis zum nächsten Speichern. Ein beim Start gescheitertes Laden wird danach nicht mehr nachgeholt, weil der Spieler den Stand ausdrücklich ersetzt.
- **Oberfläche:** Dialog „Einstellungen“ (`settings/feature`, `settings/ui`) mit Export (Textfeld und Kopieren), Import mit Bestätigung und Fehlermeldung je Code, Zurücksetzen in zwei Schritten mit Angebot, vorher zu exportieren.

## Konsequenzen

- Spielstände bleiben über Versionen hinweg ladbar, solange die Kette lückenlos ist.
- Ein unlesbarer Primär-Stand wird nicht sofort vernichtet und bleibt für eine Analyse erhalten.
- Negativ: Jede Erweiterung des gespeicherten Zustands braucht eine neue Version, eine Migration und einen Test mit eingefrorenem Beispielstand ([Konzept §10](../technisches-konzept.md#10-qualitätssicherung)). Unbekannte Felder gehen beim Laden sonst verloren.
- Negativ: Es gibt je einen Slot für Backup und unlesbare Stände. Ältere Inhalte werden dort ersetzt.
- Negativ: Ein Stand aus einer neueren Spielversion gilt als unlesbar (`future-version`) und wird beim nächsten Speichern in den Slot für unlesbare Stände verschoben.
- Negativ: Speichern läuft synchron im Hauptthread und dekodiert zusätzlich den bisherigen Primär-Stand, um ihn einzuordnen.
- Negativ: `localStorage` ist an Browser und Gerät gebunden. Werden die Browserdaten gelöscht, ist der Stand weg, sofern er nicht exportiert wurde.
- `PersistenceService` wertet `restored-from-backup` und `failed` aus und stellt daraus einen Hinweis für den Spieler bereit.

## Verworfene Alternativen

- **Vollständiges Zustandsmodell aus [Konzept §3.4](../technisches-konzept.md#34-zustandsmodell-entwurf) schon in Version 1:** Der Product Owner hat Version 1 auf die vorhandenen Felder begrenzt.
- **Unlesbaren Primär-Stand überschreiben:** Die Daten wären ohne Rückweg verloren.
- **`Num` als JSON-Zahl:** Der Wertebereich von `number` reicht nicht aus.
- **Texte oder Werte aus `data/` im Spielstand:** Spielstände speichern nur stabile IDs.
- **Speicherung auf einem Server:** Es gibt kein Backend. Cloud-Sync bleibt eine spätere Option ohne Formatänderung.

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

- [`serialize.ts`](../../src/app/persistence/domain/serialize-logic.ts): Kodierung und Validierung
- [`slots.ts`](../../src/app/persistence/domain/slots-logic.ts): Slots, Speichern und Laden über die Schnittstelle `KeyValueStore`, der `localStorage` genügt
- [`migrations/index.ts`](../../src/app/persistence/domain/migrations/migrations-logic.ts): Migrationskette und `SaveError`. Die Registry enthält die Migration von Version 1 auf die aktuelle Version 2 ([`v1-to-v2.ts`](../../src/app/persistence/domain/migrations/v1-to-v2.ts)).

**Umgesetzt** in [`persistence/data-access/persistence/persistence.service.ts`](../../src/app/persistence/data-access/persistence/persistence.service.ts): Laden beim Start, Autosave, Hinweise an die Oberfläche und das erneute Laden nach einem gescheiterten Speicherzugriff. Ein unveränderter Zustand wird nicht erneut geschrieben, damit ein zweites Ereignis beim Verlassen das Backup nicht verdrängt.

**Geplant:**

- Export und Import: Umsetzung in AP 1.5.2
- Einstellbares Autosave-Intervall: Umsetzung in AP 1.5.3

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

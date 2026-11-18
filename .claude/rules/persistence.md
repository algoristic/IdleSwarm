---
paths:
  - "src/app/persistence/**"
---

# Persistenz

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `persistence/domain/serialize-logic.ts` | `encodeSave`/`decodeSave`: JSON, komprimiert mit `lz-string`, Prüfung beim Lesen |
| `persistence/domain/slots-logic.ts` | `saveGame`/`loadGame` über `KeyValueStore`; Primär-, Backup- und Unlesbar-Slot (`SAVE_KEY`, `BACKUP_KEY`, `UNREADABLE_KEY`) |
| `persistence/domain/migrations/` | `migrate`, `MIGRATIONS`, `SaveError`; eine Datei je Schritt (`v1-to-v2.ts`) |
| `persistence/data-access/persistence/persistence.service.ts` | `PersistenceService`: `restore`, `save`, Autosave (`AUTOSAVE_INTERVAL_MS`, `visibilitychange`, `pagehide`) |
| `persistence-service.tokens.ts` | `KEY_VALUE_STORE` mit `localStorage` als Root-Default |
| `persistence-service.model.ts` | `RestoreNotice` (Code für die Oberfläche) |

## Besonderheiten

- Formatänderung: `STATE_VERSION` in `engine/domain/models/game-state.model.ts` erhöhen, eine Migration `vN-to-vN+1.ts` anlegen und in `MIGRATIONS` eintragen, Test mit eingefrorenem Beispiel-Spielstand (ADR-005).
- Der Dienst liefert nur Codes und Signals (`notice`, `lastSaveError`, `lastSavedAt`); Texte bildet das HUD ab.
- War der Speicher beim Laden nicht lesbar, lädt `save()` erst nach, bevor es schreibt. Sonst verdrängte ein provisorisches Spiel den echten Stand.
- Tests ersetzen `KEY_VALUE_STORE` durch einen Speicher im Arbeitsspeicher und die Zeit über Fake-Timer bzw. `CLOCK`.

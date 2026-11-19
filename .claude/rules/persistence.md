---
paths:
  - "src/app/persistence/**"
---

# Persistenz

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `persistence/domain/serialize-logic.ts` | `encodeSave`/`decodeSave`: JSON, komprimiert mit `lz-string`, Prüfung beim Lesen (Version 3: auch `map`, `travel`, `auto`, `priority`) |
| `persistence/domain/slots-logic.ts` | `saveGame`/`loadGame` über `KeyValueStore`; Primär-, Backup- und Unlesbar-Slot (`SAVE_KEY`, `BACKUP_KEY`, `UNREADABLE_KEY`) |
| `persistence/domain/migrations/` | `migrate`, `MIGRATIONS`, `SaveError` (`migrations-logic.ts`); eine Datei je Schritt (`v1-to-v2.ts`, `v2-to-v3.ts`) |
| `persistence/data-access/persistence/persistence.service.ts` | `PersistenceService`: `restore`, `save`, Autosave (`AUTOSAVE_INTERVAL_MS`, `visibilitychange`, `pagehide`) |
| `persistence-service.tokens.ts` | `KEY_VALUE_STORE` mit `localStorage` als Root-Default |
| `persistence-service.model.ts` | `RestoreNotice` (Code für die Oberfläche) |

## Besonderheiten

- Formatänderung: `STATE_VERSION` in `engine/domain/models/game-state.model.ts` erhöhen, eine Migration `vN-to-vN+1.ts` anlegen und in `MIGRATIONS` eintragen, Test mit eingefrorenem Beispiel-Spielstand (ADR-005).
- Migrationen verwenden feste Literale statt `DEFAULT_BALANCE` (`V3_START`, `V3_GENERATOR_PARAMS` in `v2-to-v3.ts`), damit spätere Balance-Änderungen ihr Ergebnis nicht verschieben. 2→3 setzt alles außer Seed, RNG-Zustand und Zeiten auf die Startwerte und erzeugt die Startkandidaten aus dem übernommenen `rngState`.
- Eingefrorene Stände in `serialize-logic.spec.ts`: v1, v2 (vor AP 1.1.9) und v3 (mitten in der zweiten Reise, mit Route); nicht anpassen.
- Ladeprüfung: Route 1 bis `ROUTE_MAX_POINTS` (50) Punkte, Schwelle in `[0; 1]` (nicht `θ_max`, damit ein späteres Absenken alte Stände nicht ungültig macht; wirksam ist `min(θ, θ_max)`, der gespeicherte Wert bleibt), Strategie- und Prioritäts-IDs aus den `as const`-Listen.
- `restore` und `#adopt` (auch beim Nachladen vor dem Speichern) setzen den Stand mit `GameStore.load` ein, ebenso ein neues Spiel; das leert das Ereignis-Log. `save` übernimmt den geschriebenen Stand mit `GameStore.replace`, das Log bleibt.
- Der Dienst liefert nur Codes und Signals (`notice`, `lastSaveError`, `lastSavedAt`); Texte bildet das HUD ab.
- War der Speicher beim Laden nicht lesbar, lädt `save()` erst nach, bevor es schreibt. Sonst verdrängte ein provisorisches Spiel den echten Stand.
- Tests ersetzen `KEY_VALUE_STORE` durch einen Speicher im Arbeitsspeicher und die Zeit über Fake-Timer bzw. `CLOCK`.

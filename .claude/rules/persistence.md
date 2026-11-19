---
paths:
  - "src/app/persistence/**"
---

# Persistenz

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `persistence/domain/serialize-logic.ts` | `encodeSave`/`decodeSave`: JSON, komprimiert mit `lz-string`, Prüfung beim Lesen (Version 3: auch `map`, `travel`, `auto`, `priority`; Version 4: auch `pheromones`, `genome`, `finds`) |
| `persistence/domain/slots-logic.ts` | `saveGame`/`loadGame` über `KeyValueStore`; Primär-, Backup- und Unlesbar-Slot (`SAVE_KEY`, `BACKUP_KEY`, `UNREADABLE_KEY`) |
| `persistence/domain/migrations/` | `migrate`, `MIGRATIONS`, `SaveError` (`migrations-logic.ts`); eine Datei je Schritt (`v1-to-v2.ts`, `v2-to-v3.ts`, `v3-to-v4.ts`) |
| `persistence/data-access/persistence/persistence.service.ts` | `PersistenceService`: `restore`, `save`, Autosave (`AUTOSAVE_INTERVAL_MS`, `visibilitychange`, `pagehide`) |
| `persistence-service.tokens.ts` | `KEY_VALUE_STORE` mit `localStorage` als Root-Default |
| `persistence-service.model.ts` | `RestoreNotice` (Code für die Oberfläche) |

## Besonderheiten

- Formatänderung: `STATE_VERSION` in `engine/domain/models/game-state.model.ts` erhöhen, eine Migration `vN-to-vN+1.ts` anlegen und in `MIGRATIONS` eintragen, Test mit eingefrorenem Beispiel-Spielstand (ADR-005).
- Migrationen verwenden feste Literale statt `DEFAULT_BALANCE` (`V3_START`, `V3_GENERATOR_PARAMS` in `v2-to-v3.ts`, `V4_START` in `v3-to-v4.ts`), damit spätere Balance-Änderungen ihr Ergebnis nicht verschieben. 2→3 und 3→4 setzen alles außer Seed, RNG-Zustand und Zeiten auf die Startwerte und erzeugen die Startkandidaten aus dem übernommenen `rngState`. 3→4 nutzt dafür `V3_GENERATOR_PARAMS` und `readRngState` aus `v2-to-v3.ts` und leitet `finds.rngState` wie ein neues Spiel aus dem Seed ab (`findsRngState`). Ein v2-Stand wird also zweimal zurückgesetzt; seine Kandidaten entstehen aus dem RNG-Zustand nach 2→3.
- Eingefrorene Stände in `serialize-logic.spec.ts`: v1, v2 (vor AP 1.1.9) und v3 (mitten in der zweiten Reise, mit Route); nicht anpassen. Seit Version 4 wird auch der v3-Stand migriert und auf den Startzustand gesetzt (Tests: migriert, weiterspielbar, wieder speicherbar).
- Ladeprüfung: Route 1 bis `ROUTE_MAX_POINTS` (50) Punkte, Schwelle in `[0; 1]` (nicht `θ_max`, damit ein späteres Absenken alte Stände nicht ungültig macht; wirksam ist `min(θ, θ_max)`, der gespeicherte Wert bleibt), Strategie- und Prioritäts-IDs aus den `as const`-Listen.
- Ladeprüfung Version 4, ohne Balance-Werte (Game-Design §5.1): Pheromonpunkte und `glands` ganze Zahlen ≥ 0 (`P_v ≤ P_ges` wird nicht geprüft); `genome.owned` nur bekannte Knoten-IDs, keine doppelt, zu jedem der Vorgänger (`GENOME_NODE_PREDECESSORS`; die Reihenfolge wird nicht geprüft); `finds.rngState` uint32, `finds.total` ganze Zahl ≥ 0, `collected` nur bekannte IDs mit ganzen Zahlen ≥ 1 (über der benötigten Fragmentzahl zulässig), `buffs` nur bekannte IDs, jede höchstens einmal, `expiresAtMs` endlich und ≥ 0 (abgelaufene zulässig).
- `restore` und `#adopt` (auch beim Nachladen vor dem Speichern) setzen den Stand mit `GameStore.load` ein, ebenso ein neues Spiel; das leert das Ereignis-Log. `save` übernimmt den geschriebenen Stand mit `GameStore.replace`, das Log bleibt.
- Der Dienst liefert nur Codes und Signals (`notice`, `lastSaveError`, `lastSavedAt`); Texte bildet das HUD ab.
- War der Speicher beim Laden nicht lesbar, lädt `save()` erst nach, bevor es schreibt. Sonst verdrängte ein provisorisches Spiel den echten Stand.
- Tests ersetzen `KEY_VALUE_STORE` durch einen Speicher im Arbeitsspeicher und die Zeit über Fake-Timer bzw. `CLOCK`.

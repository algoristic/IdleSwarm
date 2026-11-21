---
paths:
  - "src/app/settings/**"
---

# Einstellungen

Spielereinstellungen (US-09.01, Game-Design §4.18, §5.2), gespeichert mit dem Spielstand (`GameState.settings`, seit Version 5). Bisher nur `domain`; Oberfläche (Einstellungs-Schublade) und Anwendung (Zahlenformat, Animationen, Autosave-Intervall) kommen mit AP 1.5.2–1.5.4 in den Domänen, die sie nutzen.

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `settings/domain/models/settings.model.ts` | `NUMBER_FORMATS` (`short`, `scientific`, `engineering`), `MOTION_SETTINGS` (`system`, `full`, `reduced`), `AUTOSAVE_INTERVALS_MS` (10 s, 30 s, 60 s, 5 min, aus `shared/util/time/time-units`), `Settings`, `DEFAULT_SETTINGS` (eingefroren: `short`, `system`, 30 s), Typwächter `isNumberFormat`, `isMotionSetting`, `isAutosaveIntervalMs` |
| `settings/domain/settings-logic.ts` | `SettingsPatch` (`Partial<Settings>`), `isValidSettingsPatch`, `updateSettings(settings, patch)` (ungültiges Feld oder keine Änderung: dasselbe Objekt) |

## Besonderheiten

- Geändert wird nur über das Kommando `updateSettings` (`engine/domain/commands-logic.ts`) mit einem oder mehreren Feldern; ein Wert außerhalb der Listen macht das ganze Kommando wirkungslos.
- Die IDs und Intervallwerte sind stabil (Spielstand). Eine neue Option ist eine Erweiterung der Liste; Entfernen oder Umbenennen braucht eine Migration (Regeldatei `persistence`).
- `AutosaveIntervalMs` ist `number`, weil die Werte aus Konstanten berechnet sind; gültig sind nur die Werte der Liste (`isAutosaveIntervalMs`).
- `motion: 'system'` folgt `prefers-reduced-motion`; die eine Quelle für reduzierte Bewegung bleibt der `MotionPreferenceService` (CLAUDE.md §4), der die Einstellung lesen soll.
- Texte für die Optionen gehören in `feature`/`ui` der nutzenden Domäne (`Record<NumberFormat, string>` …), nie in `settings/domain`.

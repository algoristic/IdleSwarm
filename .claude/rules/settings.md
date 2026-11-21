---
paths:
  - "src/app/settings/**"
---

# Einstellungen

Spielereinstellungen (US-09.01, Game-Design §4.18, §5.2), gespeichert mit dem Spielstand (`GameState.settings`, seit Version 5), und seit AP 1.5.2/1.5.3 der Dialog „Einstellungen“ mit Spielstand-Verwaltung (Export, Import, Zurücksetzen; US-07.04, US-07.05).

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `settings/domain/models/settings.model.ts` | `NUMBER_FORMATS` (`short`, `scientific`, `engineering`), `MOTION_SETTINGS` (`system`, `full`, `reduced`), `AUTOSAVE_INTERVALS_MS` (10 s, 30 s, 60 s, 5 min, aus `shared/util/time/time-units`), `Settings`, `DEFAULT_SETTINGS` (eingefroren: `short`, `system`, 30 s), Typwächter `isNumberFormat`, `isMotionSetting`, `isAutosaveIntervalMs` |
| `settings/domain/settings-logic.ts` | `SettingsPatch` (`Partial<Settings>`), `isValidSettingsPatch`, `updateSettings(settings, patch)` (ungültiges Feld oder keine Änderung: dasselbe Objekt), `parseAutosaveIntervalMs(text)` (Formularwert → Intervall aus der Liste oder `null`) |
| `settings/feature/state/settings.facade.ts` | `SettingsFacade`: `settings` (Referenz ändert sich nur bei Änderung), `numberNotation` (für `NUMBER_NOTATION`), `view` (`SettingsView`), `open`, `dialog` (`SettingsDialogView`: Ansicht, Export-Text, Kopierstatus, Import-Text und -Fehler, Rückmeldung); `openDialog`, `closeDialog`, `showPanel` (Export-Ansicht ruft `PersistenceService.exportSave`), `update(patch)` (→ `updateSettings`), `resetHints` (→ `resetHints`), `copyExport` (`CLIPBOARD`, Fehlschlag → `failed`), `requestImport(text)` → Ansicht `import-confirm`, `confirmImport` (`PersistenceService.importSave`; Erfolg → Übersicht mit `imported`, Fehler → Ansicht `import` mit Code, Text bleibt), `confirmReset` (`resetGame`, Dialog zu) |
| `settings/feature/state/settings.providers.ts` | `provideSettingsState()` (an der Shell-Route): Facade und `NUMBER_NOTATION` aus `numberNotation`; `provideAppliedSettings()` (Bootstrap, `app.config.ts`): stellt `MOTION_OVERRIDE` als `computed` aus `settings.motion` über `motionOverride` bereit, app-weit auch auf `/modell`; kein Effekt |
| `settings/feature/state/settings.utils.ts` | `toSettingsView`, `motionOverride` (`system` → `null`, `full` → `false`, `reduced` → `true`) |
| `settings/feature/state/settings.tokens.ts` | `BUILD_INFO` (`version` aus `package.json`, `buildTime` aus dem Build-Define `IDLESWARM_BUILD_TIME`, sonst `null`) |
| `settings/feature/settings-dialog/` | `SettingsDialogComponent`: `ModalDialogComponent` (immer im DOM, `[open]` aus der Facade, damit `close()` den Fokus zurückgibt) mit `DialogSettingsComponent`, solange offen, und `DialogSettingsActionsComponent` im Slot `[dialogActions]`, solange eine Ansicht außer der Übersicht offen ist; die Shell bindet ihn nach `</main>` ein |
| `settings/ui/settings-button/` | `SettingsButtonComponent`: Zahnrad (Inline-SVG, `currentColor`), rund 44 px wie die Zoom-Leiste, `aria-label` „Einstellungen“, `aria-haspopup="dialog"`, Output `clickedOpen` |
| `settings/ui/dialog-settings/` | `DialogSettingsComponent` mit `SettingsView`, `SettingsDialogView`, `SETTINGS_PANELS` (`main`, `export`, `import`, `import-confirm`, `reset`, `reset-confirm`), `SettingsNotice`, `CopyStatus` (`dialog-settings.component.model.ts`); Übersicht mit `FormSettingsComponent` (Export, Import, Zurücksetzen projiziert in „Speichern“), Hinweise, Info (Version, Build-Datum oder „Entwicklung“); Ansichten Export (readonly Textfeld, markiert alles bei Fokus/Klick, Kopieren mit Status), Import (`FormImportSaveComponent`, Fehler aus `IMPORT_ERROR_TEXTS`), Bestätigungen (Texte; ihre Knöpfe in `DialogSettingsActionsComponent`); Wechsel der Ansicht fokussiert deren Titel (`#panelHeading`, `afterRenderEffect`) |
| `settings/ui/dialog-settings-actions/` | `DialogSettingsActionsComponent` (Input `panel`, Outputs `selectedPanel`, `clickedConfirmImport`, `clickedConfirmReset`): feste Fußleiste der Ansichten Export und Import (Zurück), Import bestätigen (Überschreiben, Abbrechen), Zurücksetzen (Vorher exportieren, Weiter zum Zurücksetzen, Abbrechen) und endgültig zurücksetzen; die Übersicht hat keine |
| `settings/ui/form-settings/` | `FormSettingsComponent` (Signal Forms, Modell `linkedSignal` aus `settings`, `SettingsFormModel` mit dem Intervall als Text): Radiogruppen Zahlenformat (mit Beispiel `1,2345e10` je Notation über `formatNum: format`), Animationen, Autosave; `(change)` am Formular meldet sofort `changedSettings` (`SettingsPatch`) |
| `settings/ui/form-import-save/` | `FormImportSaveComponent` (Signal Forms, `importSaveSchema`: nicht leer), Input `text` (füllt nach Fehler wieder), Output `submittedSave` |
| `settings/ui/settings-labels/` | `NUMBER_FORMAT_LABELS`, `MOTION_SETTING_LABELS`, `AUTOSAVE_INTERVAL_LABELS`, `IMPORT_ERROR_TEXTS` (`Record<SaveErrorCode, string>`) |

## Besonderheiten

- Geändert wird nur über das Kommando `updateSettings` (`engine/domain/commands-logic.ts`) mit einem oder mehreren Feldern; ein Wert außerhalb der Listen macht das ganze Kommando wirkungslos.
- Die IDs und Intervallwerte sind stabil (Spielstand). Eine neue Option ist eine Erweiterung der Liste; Entfernen oder Umbenennen braucht eine Migration (Regeldatei `persistence`).
- `AutosaveIntervalMs` ist `number`, weil die Werte aus Konstanten berechnet sind; gültig sind nur die Werte der Liste (`isAutosaveIntervalMs`).
- `motion: 'system'` folgt `prefers-reduced-motion`; die eine Quelle für reduzierte Bewegung bleibt der `MotionPreferenceService` (CLAUDE.md §4), dessen Quelle `MOTION_OVERRIDE` `provideAppliedSettings()` aus dem Spielstand bereitstellt (kein Signal-Sync aus einem Effekt, CLAUDE.md §6).
- `NumberFormat` und `Notation` (`shared/util/format`) haben dieselben IDs; `SettingsFacade.numberNotation` ist als `computed<Notation>` typisiert, damit eine Abweichung nicht kompiliert.
- Einstellungen wirken sofort: kein Absenden, jede Auswahl ist ein `updateSettings`-Kommando; das Autosave-Intervall übernimmt der `PersistenceService` (Regeldatei `persistence`).
- Import und Zurücksetzen laufen nur über den `PersistenceService` (kein Offline-Nachholen beim Import, Einstellungen bleiben beim Zurücksetzen). Der Dialogzustand ist lokaler UI-Zustand der Facade, nicht im Spielstand.
- Texte für die Optionen stehen in `settings/ui/settings-labels`, nie in `settings/domain`.
- Test-IDs: `settings.open`, `settings.dialog`, `settings.dialog.close`, `settings.number-format.<id>`, `settings.motion.<id>`, `settings.autosave.<ms>`, `settings.export.{open,text,copy,copy-status,error}`, `settings.import.{open,text,submit,confirm,cancel,error,success}`, `settings.reset.{open,export,confirm-1,confirm-2,cancel}`, `settings.dialog.{body,actions}`, `settings.hints.{reset,notice}`, `settings.back`, `settings.version`, `settings.build-date`.

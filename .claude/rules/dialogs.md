---
paths:
  - 'src/**/dialog-*/**'
---

# Dialoge

- Dialoginhalte liegen in `dialog-<name>/` (ESLint meldet `<name>-dialog`).
- Dialoge werden typisiert geöffnet; Daten- und Ergebnistypen stehen in der `*.model.ts` des Dialogs.
- Dialoge öffnet die Facade oder eine Seite im `feature`-Layer, nie eine `ui`-Komponente.
- Modale Dialoge verwenden das native `<dialog>` mit `showModal()` (Rahmen: `app-dialog-frame` aus `shared/ui`).

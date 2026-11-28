---
paths:
  - 'src/**/form-*/**'
  - 'src/**/dialog-*/**'
---

# Formulare

Nur **Signal Forms** (`@angular/forms/signals`); andere Formular-APIs meldet ESLint.

- **Modell:** ein beschreibbares Signal mit genau den Werten, die die Controls bearbeiten (z. B. Strings für Zahleneingaben mit deutschem Komma). Sein Typ steht in der `*.model.ts` der Komponente. Das Paar heißt `<name>Model` und `<name>Form`.
  - Leere Formulare starten mit `signal({...})`.
  - Aus einem Input befüllte Formulare nutzen `linkedSignal(() => …)` (nie `computed()`, meldet ESLint).
  - Liefert der Input für dieselbe Sache neue Referenzen, während der Nutzer editiert, nur bei Identitätswechsel zurücksetzen: `linkedSignal({ source: this.#id, computation: () => ({ … untracked(this.x) … }) })` mit `#id = computed(() => this.x().id)`.
  - Hält der `feature`-Layer das Modell, weil Änderungen dort sofort wirken, bekommt die Formular-Komponente es über `model()` und der Aufrufer bindet zweiseitig (`[(paramsModel)]="facade.params"`). Der Typ liegt dann in `domain/models`, wenn auch die Ableitung in `domain` ihn braucht.
- **Schema:** Validierung und Feldzustand (`disabled`, `hidden`, `readonly`) stehen in der Schema-Funktion, reaktiv über `when`, nie imperativ aus Effects. `$localize`-Meldungen stehen inline im Schema (`message:`).
  - Wiederverwendbare Regelsätze sind `schema<T>(…)`-Konstanten in der `ui`-Schicht. Die reinen Prüf- und Formatierungsfunktionen dahinter liegen in `domain` oder `util`.
- **Bindung:** `FormField` und `FormRoot` importieren, jedes Control mit `[formField]` binden. Eigene Controls implementieren `FormValueControl` (`value = model<T>()`).
- **Absenden:** `submission.action` in den `form()`-Optionen, `<form [formRoot]="xForm">`. Eine Formular-Komponente gibt ein typisiertes Ergebnis über einen Output aus (`submittedParams`). Was damit passiert, entscheidet der `feature`-Layer.
- Fehler nur für berührte oder bearbeitete Felder anzeigen (`xForm.name().touched()` bzw. `.dirty()`, dazu `.invalid()`, `.errors()`).

---
paths:
  - 'src/**/*.component.*'
  - 'src/**/*.page.*'
  - 'src/**/*.directive.ts'
  - 'src/**/*.pipe.ts'
---

# Komponenten und Templates

Was ESLint prüft (Signal-APIs, `inject()` und welche Tokens eine Schicht injizieren darf, Metadaten- und Member-Reihenfolge, Dateinamen, Modifier, Control Flow, i18n-IDs, Tailwind-Klassen, Test-IDs an interaktiven Elementen, Methodenaufrufe mit Argumenten in Bindungen …), steht hier nicht. Die Meldung erklärt die Regel.

## Rollen

- Geroutete Seiten heißen `<name>.page.{ts,html}`, alle anderen Komponenten `<name>.component.{ts,html}`.
- `feature` enthält Seiten und Komponenten, die eine Facade injizieren. Alles Präsentationale liegt in `ui`, auch wenn nur eine Seite es nutzt.
- `ui`-Komponenten: Daten kommen über Inputs herein, Ereignisse gehen über Outputs hinaus; keine Dialoge. Router-Direktiven wie `routerLink` im Template sind erlaubt.
- Namen beschreiben, was eine Komponente zeigt. Nur zwei Rollen-Präfixe: `dialog-` und `form-`.
- SVG-Teilkomponenten innerhalb eines `<svg>` haben einen Attributselektor `g[app-<name>]`, weil Element-Hosts in SVG nicht gezeichnet werden.
- Eine `.css`-Datei mit `styleUrl` gibt es nur für Sonder-Styles, keine leeren Style-Dateien.
- Das `display` des Hosts setzt die Host-Klasse: `host: { class: 'block' }`.

## Klasse

- Member, die das Template nutzt, sind öffentlich ohne Modifier. Member, die nur die Klasse nutzt, sind `#`-Felder.
- Outputs heißen wie Ereignisse in der Vergangenheitsform (`clickedSave`, `selectedItem`). Template-Handler heißen `onX(...)`, Formular- und Dialogaktionen sind einfache Verben (`submit()`, `confirm()`).
- Zoneless: Alles, was das Template zeigt, kommt aus Signals oder Template-Ereignissen. Nie einfache Felder aus Timern, Promises oder Subscriptions zuweisen und ein Update erwarten.
- Aufräumen von Timern und Listenern über `DestroyRef`.

## Templates

```angular
@let view = facade.view();

<dd class="tabular-nums" data-testid="items.summary.total">{{ view.total | formatNumber }}</dd>
@for (item of view.items; track item.id) {
  <app-item-card [item]="item" (clickedSave)="facade.save(item.id)" />
}
```

- Signal-Werte, die das Template mehrfach braucht, oben in einem `@let`-Block sammeln. Zum Auspacken unter gleichem Namen der Unterstrich-Alias: `@let _form = form();`.
- `@for` trackt über ein Identitätsfeld (`track item.id`), bei Primitiven über `$index` oder den Wert.
- Werte formatieren die Pipes aus `shared/ui/pipes`, nie ad hoc runden. Alles andere wird als `computed` abgeleitet, z. B. als Viewmodel der Facade.
- **`data-testid` auch an angezeigten Werten** (an interaktiven Elementen verlangt es ESLint). Schema `<feature>.<bereich>.<element>`, dynamisch `[attr.data-testid]="'items.' + item.id + '.save'"`.
- Zahlen (Mengen, Preise) bekommen `tabular-nums`, auch über eine Komponente, die projizierten Inhalt so setzt (`app-pill`).

## Texte

- Jeder Text für Nutzer bekommt eine explizite ID ohne Meaning und Description: `<span i18n="@@…">`, `<ng-container i18n="@@…">`, `i18n-<attr>="@@…"`, in TS `$localize` als Feld. Platzhalter mit Namen: ``$localize`:@@uiItems-itemCard-price:Preis: ${price}:price: €` ``.
- Schema `@@<layer><Domain>-<componentOrClass>-<key>` (ESLint prüft das Präfix). `<key>` darf mehrere Segmente haben (`notice-saveFailed`). Eine ID wird nie für einen anderen Text wiederverwendet.
- Mehrzahl über ICU (`{count, plural, =1 {Eintrag} other {Einträge}}`).
- Die Abbildung Code → Text steht im `feature`- oder `ui`-Layer, typisiert als `Record<Code, string>`.
- Kürzel und Einheiten des festen de-DE-Formats (`Tsd.`, `Mio.`, `∞`, `–`, `s`, `min`, `h`) stehen in `shared/util` und sind keine `$localize`-Texte.

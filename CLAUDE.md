# CLAUDE.md

## Git

- Niemals ohne ausdrückliche Anweisung des Nutzers stagen (`git add`, `git stage` o. Ä.) oder committen – auch nicht nach Abschluss einer Aufgabe.
- Änderungen bleiben im Working Tree; nach Änderungen nur berichten, was geändert wurde.
- Eine Erlaubnis zum Stagen/Committen gilt nur für den jeweiligen Auftrag, nicht dauerhaft.
- **Branches:** gearbeitet wird auf Feature-Branches mit Pull Request nach `development` (nur Prüfung); `development` ist der Teststand auf GitHub Pages, `main` der Produktivstand auf dem Server (Merge aus `development`). Pushen und Mergen nur auf Ansage.
- **Version:** Ein normaler Commit ändert die Version nicht. Die Version in `package.json` ändert sich nur auf Ansage des Nutzers (`npm version <patch|minor|major> --no-git-tag-version`, ändert `package.json` und `package-lock.json`). Keine git-Tags.

## Projektkontext

Leere Angular-App (kein Backend, deutsche Oberfläche) und ein Prototyp des Spiels (`public/prototype/index.html`). Architektur-Entscheidungen entstehen bei Bedarf unter `docs/adr/`.

- **Der Code ist der aktuelle Stand.** Es gibt keine Produktspezifikation. Während des Umbaus dokumentiert der Prototyp den Status quo: Regeln, Spielwerte und Darstellung stehen dort, nicht in einem separaten Dokument.
- **Der Prototyp ist eingefroren.** Seit Beginn des Umbaus wird er nicht mehr geändert. Er bleibt die Referenz für Regeln, Spielwerte und Darstellung, bis AP 13 ihn entfernt. Der Umbauplan mit Status steht in `docs/plan-angular-umbau.md`.
- Nächste Schritte werden im Gespräch mit Claude geplant. Nachfragen, bevor auf einem Punkt aufgebaut wird, der noch nicht entschieden ist.
- Jede neue Laufzeitabhängigkeit braucht eine ADR.

**Regeldateien:** Was im Code existiert, wird je Bereich in pfadbezogenen Regeldateien `.claude/rules/<bereich>.md` beschrieben (Frontmatter `paths`). Claude Code lädt eine Regeldatei automatisch, sobald eine passende Datei gelesen oder bearbeitet wird.

- Vor der Planung einer Änderung die Regeldateien der betroffenen Bereiche lesen.
- Nach der Änderung die Neuerungen dort einarbeiten.
- Ein neuer Bereich bekommt eine eigene Regeldatei und eine Zeile in dieser Tabelle.

| Bereich (Regeldatei) | Pfade | Inhalt |
| --- | --- | --- |
| `shared` (`.claude/rules/shared.md`) | `src/app/shared/**` | Formatierung de-DE (`util/format.ts`) und ihre Pipes, Tokens in `src/styles.css`, generische UI-Elemente (`ui`) |
| `game` (`.claude/rules/game.md`) | `src/app/game/**` | Domänenmodell, Spielstand v1, `GameConfig`, Zufall und `newGame`, Regeln und Zeitschritt, Golden Master (`domain`), Store, Schleife, Spielstand, Nachberechnung (`data-access`), Routen, Facade, Viewmodel und Seiten (`feature`), Präsentationskomponenten, Asset-Bibliothek (`ui/art`, `scene`, `map`, `neuron`: Palette, Zeichenfunktionen, SVG-Komponenten, Canvas-Renderer) und Texte der Spieldaten (`ui`) |
| `dev` (`.claude/rules/dev.md`) | `src/app/dev/**`, `src/app/dev-routes*.ts` | Dateiersetzung der Dev-Routen, Katalog (Routen, Einträge, Suche, Regler, Vorschauen, Katalog-E2E) |

**Regeln, die überall gelten:**

- Fachlogik ist reines TypeScript in den `domain`-Schichten.
- Templates formatieren nur über Pipes, die auf Formatierungsfunktionen in `shared/util` zugreifen. Nie ad hoc runden oder formatieren.

**Repo-Fakten:**

- Präfix für Komponenten und Direktiven ist `app`.
- Prettier mit `printWidth` 100; `docs/`, `CLAUDE.md` und `.claude/` werden nicht formatiert.
- Pfad-Alias `@app/*` → `src/app/*`.
- `tools/` enthält Node-Skripte außerhalb der App, z. B. `tools/golden-master/generate.mjs`. Prettier formatiert sie, ESLint prüft nur `src/` und `e2e/`.
- **Exakte Versionen:** Jede Version in `package.json` ist exakt (`"4.3.5"`), nie `^`, `~`, `>=` oder `*`. Die `.npmrc` setzt `save-exact=true`; nach `npm i` trotzdem `package.json` prüfen. Updates sind bewusste Versionssprünge.
- Node per `nvm use` (`.nvmrc`).
- CI (`.github/workflows/ci.yml`) prüft Lint, Format, Unit-Tests mit Abdeckung, Build und E2E bei Pull Requests und Pushes auf `main`/`development`; ein Push auf `development` deployt auf GitHub Pages, ein Push auf `main` per SFTP auf den eigenen Server (beide Base-Href `/IdleSwarm/`, Apache-Konfiguration in `deploy/apache/.htaccess`).
- Die Build-Konfiguration richtet sich nach dem Ziel: `production` (ohne Dev-Domäne) bei Push und manuellem Lauf auf `main` und bei Pull Requests nach `main`, sonst `pages` (Produktions-Build mit Dev-Domäne, `npm run build:pages`, Serve-Konfiguration `pages`). E2E läuft gegen genau diesen Build.

## 0. Umgang mit dieser Datei

- Beim Bearbeiten bestehender Dateien bleibt die Datei in sich einheitlich. Keine Stile mischen, nichts Unbeteiligtes umbauen, außer es ist gewünscht.
- Widersprechen sich diese Datei und der umgebende Code, nachfragen statt raten.
- Vorhandene Dienste, Tokens, Pipes und Helfer wiederverwenden, bevor neue entstehen.

## 1. Architektur: Domänen und Schichten

Code wird zuerst nach Domäne, dann nach Schicht gruppiert: `src/app/<domain>/<layer>/…`, z. B. `orders/domain`, `orders/feature`, `orders/ui`. Die App-Wurzel (`main.ts`, Root-Komponente, Root-Routen, `app.config.ts`) startet und verdrahtet nur. Alle Funktionalität liegt in den Domänen-Ordnern.

| Schicht | Enthält | darf abhängen von |
| --- | --- | --- |
| `feature` | Routen, Seiten, Smart Components, `state/` (Facade, Providers, Guards) | feature, ui, data-access, domain, util |
| `ui` | Präsentationskomponenten (nur Inputs/Outputs), Pipes, Formular-Komponenten, reine Zeichenfunktionen (`*.utils.ts`) | ui, domain, util |
| `data-access` | Stores, Persistenz (localStorage), Worker-Clients, Plattform-Tokens | data-access, domain, util |
| `domain` | Modelle (Interfaces, `as const`-Listen), Fachdaten, reine Regeln und Formeln | domain, util |
| `util` | generische Helfer ohne Fachwissen (Formatierung, Parser) | util |

ESLint erzwingt diese Regeln (`no-restricted-imports` je Schicht in `eslint.config.js`; die Schichtregeln nehmen Specs aus, die Domänenrichtung unten nicht). Passt eine Abhängigkeit nicht, wandert der Code in die richtige Schicht, statt quer zu importieren oder die Regel abzuschalten.

- **Angular-freie Schichten:** `domain` und `util` importieren nichts aus `@angular/*` oder `rxjs`. So läuft der Code in Vitest unter Node und in Web Workern.
- **Smart und präsentational:** `feature` enthält Seiten und Komponenten, die eine Facade injizieren. Alles Präsentationale liegt in `ui`, auch wenn nur eine Seite es nutzt.
- **Texte und Zugriff:** Texte für Nutzer gibt es nur in Angular (§5). Die Logik liefert IDs und Codes, die `feature` oder `ui` auf `$localize`-Texte abbilden. Komponenten greifen nie direkt auf Stores, localStorage oder Worker zu, nur über Facades.
- **Worker:** Worker importieren nur `domain` und `util` und erzeugen keinen Angular-Injector.

**Domänen:**

| Domäne | Inhalt |
| --- | --- |
| `game` | Das ganze Spiel: Regeln, Spielwerte und Zeitschritt (`domain`, eine `*-logic.ts` je Thema: Kette, Ernte, Stellen, Reise, Fundstücke), Zustand, Spielschleife und Spielstand (`data-access`), Facade und Spielseite mit den Ansichten Umgebung, Schwarm und Ausbau (`feature`, `ui` in Unterordnern, z. B. `scene`, `map`, `neuron`, `hud`, `chain`) |
| `dev` | Nur im Dev-Build: Katalog, Kalibrierwerkzeuge, Schaltfläche fürs Testtempo; entfällt im Produktiv-Build per Dateiersetzung |
| `shared` | Domänenübergreifendes ohne Fachwissen: Zahlen- und Zeitformatierung de-DE (`util`), Pipes (`ui/pipes`) und generische UI-Elemente wie Button, Segment, Pill, Tag, Bottom-Sheet, Toast und Dialograhmen (`ui`) |

Die Abhängigkeitsrichtung ist `dev → game → shared`: `shared` importiert weder `game` noch `dev`, `game` nicht `dev`. ESLint erzwingt sie, auch in Specs.

Jede Fachdomäne definiert ihren Teil des Zustands und ihre Regeln selbst.

## 2. Ordnerstruktur je Schicht

**feature:**

```
<domain>/feature/
├── <domain>.routes.ts              # export const <domain>Routes: Routes
├── <name>/                         # Seite <name>.page.{ts,html} oder Smart Component <name>.component.{ts,html}
├── dialog-*/                       # Dialoginhalte
└── state/
    ├── <domain>.facade.ts          # <Domain>Facade
    ├── <domain>.providers.ts       # provide<Domain>State()
    ├── <domain>.guards.ts          # Guard-Fabriken
    └── <domain>.model.ts           # Viewmodel-Typen
```

**ui:** ein Ordner je Komponente oder Direktive, benannt nach dem, was sie zeigt (`item-card`, `status-badge`, `form-*`, `dialog-*`). Komponentenspezifische Typen liegen in `<component>.model.ts`, gemeinsame Typen eines `ui`-Ordners in `models/<name>.model.ts`. Pipes liegen unter `pipes/<name>/<name>.pipe.ts`. Reine, Angular-freie Zeichenfunktionen (Formen, Geometrie, Formation, Bewegungskurven, Canvas-Zeichnen) liegen als `<name>.utils.ts` neben den Komponenten, die sie nutzen, gemeinsame in `game/ui/art/`. Eine `.css`-Datei gibt es nur für Sonderfälle (§4).

**data-access:**

```
<domain>/data-access/<name>/
├── <name>.service.ts               # <Name>Service
├── <name>-service.providers.ts     # provide<Name>Service()
├── <name>-service.tokens.ts        # Plattform-Tokens mit Root-Default
└── <name>-service.model.ts         # Transporttypen (z. B. Worker-Protokoll)
```

**domain:** Modelle in `models/<name>.model.ts`, Fachdaten in `data/<name>.data.ts`, reine Regeln in `<name>-logic.ts`.

## 3. Komponenten und Templates

### Namen und Metadaten

- Geroutete Seiten heißen `<name>.page.{ts,html}` mit Klasse `<Name>Page` und Selektor `app-<name>-page`. Alle anderen Komponenten heißen `<name>.component.{ts,html}` mit Klasse `<Name>Component` und Selektor `app-<name>`. ESLint erzwingt die Suffixe.
- SVG-Teilkomponenten, die innerhalb eines `<svg>` gezeichnet werden, haben einen Attributselektor auf dem SVG-Element (`g[app-<name>]`), weil Element-Hosts in SVG nicht gezeichnet werden; sonst gilt `app-<name>`.
- Direktiven heißen `<name>.directive.ts` mit Klasse `<Name>Directive` und Attributselektor `app<Name>`.
- Namen beschreiben, was eine Komponente zeigt. Ob sie smart oder präsentational ist, folgt aus ihrer Schicht. Nur zwei Rollen-Präfixe: `dialog-` und `form-`.
- Standalone ist implizit, also kein `standalone: true`, keine NgModules.
- Metadaten in der Reihenfolge `selector`, `imports`, `templateUrl`, `styleUrl` (Singular), `host`. Das Template ist immer eine eigene Datei. Eine `.css`-Datei und `styleUrl` gibt es nur, wenn die Komponente Sonder-Styles braucht (§4); keine leeren Style-Dateien.
- Das `display` des Hosts setzt die Host-Klasse, `host: { class: 'block' }`, nie `:host { display }` (§4).
- Kein `changeDetection` setzen: In Angular 22 ist OnPush der Standard.
- Zoneless: Alles, was das Template zeigt, kommt aus Signals oder Template-Ereignissen. Nie einfache Felder aus Timern, Promises oder Subscriptions zuweisen und ein Update erwarten. Kein `NgZone`.

### Klassen-Member

```ts
// feature-Komponente; ui-Komponenten injizieren keine App-Dienste, nur Inputs/Outputs
export class ItemListComponent {
  facade = inject(ItemsFacade); // vom Template gelesen → öffentlich, ohne Modifier
  readonly #router = inject(Router); // nur in der Klasse genutzt → privates Feld

  items = input.required<ItemView[]>();
  activeItem = input<ItemId>();

  selectedItem = output<ItemId>(); // Outputs als Ereignisse in der Vergangenheitsform

  itemCount = computed(() => this.items().length);

  title = $localize`:@@featureItems-itemList-title:Einträge`;

  onSelectItem(item: ItemId): void {
    this.selectedItem.emit(item);
  }

  #formatLabel(item: ItemView): string {
    return `${item.name} (${item.count})`;
  }
}
```

- DI nur über `inject()`-Feldinitialisierer, nie über den Konstruktor.
- Sichtbarkeit:
  - Member, die das Template nutzt, haben keinen Modifier. Kein `protected`.
  - Member, die nur die Klasse nutzt, sind ECMAScript-private Felder: `readonly #router = inject(Router)`, `#formatLabel(…)`. Kein `private` und kein `_`-Präfix.
- Nur Signal-APIs: `input()`, `input.required()`, `output()`, `model()` (nur für eigene Formular-Controls und Formular-Komponenten, siehe Formulare), `computed()`, `linkedSignal()`, `viewChild()`. Nie `@Input()`, `@Output()`, `EventEmitter` oder `@ViewChild`. Kein `readonly` davor.
- Outputs heißen wie Ereignisse in der Vergangenheitsform: `clickedSave`, `selectedItem`, `submittedForm`.
- Template-Handler heißen `onX(...)`. Formular- und Dialogaktionen sind einfache Verben (`submit()`, `confirm()`).
- Reihenfolge der Member:
  1. `inject()`
  2. Inputs
  3. Konstanten
  4. Outputs
  5. View-Queries
  6. abgeleiteter Zustand (`computed`)
  7. `$localize`-Texte
  8. Lifecycle-Hooks
  9. Handler
  10. private Helfer
- Methoden haben explizite Rückgabetypen. Lifecycle-Hooks mit `implements OnInit` usw.
- **Kein manuelles `.subscribe()` in Komponenten.** Ist eine Subscription unvermeidbar, dann mit `takeUntilDestroyed()`. Aufräumen von Timern und Listenern über `DestroyRef`.

### Templates

```angular
@let view = facade.view();

<dl>
  <dt i18n="@@featureItems-items-total">Summe</dt>
  <dd class="tabular-nums" data-testid="items.summary.total">{{ view.total | formatNumber }}</dd>
</dl>
@for (item of view.items; track item.id) {
  <app-item-card [item]="item" (clickedSave)="facade.save(item.id)" />
}
```

- Signal-Werte, die das Template mehrfach braucht, oben in einem `@let`-Block sammeln. Zum Auspacken unter gleichem Namen den Unterstrich-Alias nehmen: `@let _form = form();`.
- Nur eingebaute Control Flow (`@if`, `@for`, `@switch`, `@defer`).
- `@for` trackt immer über ein Identitätsfeld (`track item.id`), bei Primitiven über `$index` oder den Wert.
- Templates rufen außer Event-Handlern und Signals keine Methoden auf. Werte formatieren die Pipes aus `shared/ui/pipes`; alles andere wird als `computed` abgeleitet, z. B. als Viewmodel der Facade.
- **`data-testid` an interaktiven Elementen und angezeigten Werten.** Schema `<feature>.<bereich>.<element>`, z. B. `data-testid="items.list.save"`. Dynamisch: `[attr.data-testid]="'items.' + item.id + '.save'"`.

### Formulare

Neue Formulare verwenden **Signal Forms** (`@angular/forms/signals`). Keine Reactive Forms (`FormGroup`, `FormControl`), keine template-getriebenen Formulare, kein `ngModel`.

- **Modell:** ein beschreibbares Signal mit genau den Werten, die die Controls bearbeiten (z. B. Strings für Zahleneingaben mit deutschem Komma). Sein Typ steht in der `*.model.ts` der Komponente. Das Paar heißt `<name>Model` und `<name>Form`.
  - Leere Formulare starten mit `signal({...})`.
  - Aus einem Input befüllte Formulare nutzen `linkedSignal(() => …)`. Formulare nie in `computed()` bauen.
  - Liefert der Input für dieselbe Sache neue Referenzen, während der Nutzer editiert, nur bei Identitätswechsel zurücksetzen: `linkedSignal({ source: this.#id, computation: () => ({ … untracked(this.x) … }) })` mit `#id = computed(() => this.x().id)`.
  - Hält der `feature`-Layer das Modell, weil Änderungen dort sofort wirken, bekommt die Formular-Komponente es über `model()` und der Aufrufer bindet zweiseitig (`[(paramsModel)]="facade.params"`). Der Typ liegt dann in `domain/models`, wenn auch die Ableitung in `domain` ihn braucht.
- **Schema:** Validierung und Feldzustand (`disabled`, `hidden`, `readonly`) stehen in der Schema-Funktion, reaktiv über `when`, nie imperativ aus Effects. `$localize`-Meldungen stehen inline im Schema (`message:`).
  - Wiederverwendbare Regelsätze sind `schema<T>(…)`-Konstanten in der `ui`-Schicht. Die reinen Prüf- und Formatierungsfunktionen dahinter liegen in `domain` oder `util`.
- **Bindung:** `FormField` und `FormRoot` aus `@angular/forms/signals` importieren, jedes Control mit `[formField]` binden. Eigene Controls implementieren `FormValueControl` (`value = model<T>()`), nicht `ControlValueAccessor`.
- **Absenden:** `submission.action` in den `form()`-Optionen, `<form [formRoot]="xForm">`. Eine Formular-Komponente gibt ein typisiertes Ergebnis über einen Output aus (`submittedParams`). Was damit passiert, entscheidet der `feature`-Layer.
- Fehler nur für berührte oder bearbeitete Felder anzeigen (`xForm.name().touched()` bzw. `.dirty()`, dazu `.invalid()`, `.errors()`).

### Dialoge

- Dialoginhalte liegen in `dialog-<name>/` (nie `<name>-dialog`).
- Dialoge werden typisiert geöffnet, Daten- und Ergebnistypen stehen in der `*.model.ts` des Dialogs.
- Dialoge öffnet die Facade oder eine Seite im `feature`-Layer, nie eine `ui`-Komponente.
- Modale Dialoge verwenden das native `<dialog>` mit `showModal()`, kein CDK.

### ui-Schicht

`ui`-Komponenten sind rein präsentational: Daten kommen über Inputs herein, Ereignisse gehen über Outputs hinaus. Keine Facades, keine Stores, keine Dienste, kein `Router`, keine Dialoge. Framework- und Plattform-Tokens sind erlaubt (`ElementRef`, `DestroyRef`, `Renderer2`, `DOCUMENT`), ebenso Router-Direktiven wie `routerLink` im Template.

## 4. Styling

Styling verwendet **Tailwind CSS v4** mit semantischen Tokens. `src/styles.css` ist das einzige globale Stylesheet:

- Es importiert Tailwind und definiert die Farb-Tokens als CSS-Variablen.
- Es bildet die Tokens über `@theme inline` auf Tailwind-Farben ab.
- Es enthält die eigenen Varianten (`@custom-variant`).

- **Templates verwenden Utility-Klassen**, Farben nur aus den Tokens (z. B. `bg-bg`, `text-fg`, `text-accent`). Abstände, Größen und Typografie aus der Tailwind-Skala.
- **Keine Arbitrary Values** (`p-[13px]`, `bg-[#123456]`). Neue Farben sind neue Tokens in `src/styles.css`, mit Textkontrast ≥ 4,5:1.
- **Ausnahme Illustrationen:** Farben von SVG-Kunst und Canvas kommen aus der Palette `game/ui/art/art-palette.ts` (ADR 0002), nicht aus Tokens. SVG-Templates binden sie per Attribut (`[attr.fill]`) aus Feldern oder `computed`.
- Klassennamen immer vollständig schreiben. Tailwind findet Klassen durch Scannen der Quellen, also nicht aus Strings zusammensetzen (`'bg-' + x`). Varianten über Signal-Inputs und ein `computed`-Mapping mit vollständigen Klassennamen.
- Zustände folgen ARIA-Attributen statt Klassen-Ternären: `aria-disabled:`, `aria-selected:`, `aria-current` über eine eigene Variante, `disabled:` bei nativen Elementen.
- Zahlen (Mengen, Preise) bekommen `tabular-nums`.
- **Host-Styling** über die Host-Klasse (`host: { class: 'block' }`, `host: { '[class]': 'classes()' }`). Kein `display` oder andere Eigenschaften auf `:host`, die Aufrufer per Utility ändern könnten: Angulars Komponenten-Styles sind ungelayert und schlagen Tailwinds `@layer utilities`.
- **Komponenten-CSS** (`.component.css`/`.page.css`, Plain CSS, kein Sass) gibt es nur für Sonderfälle, die Utilities nicht ausdrücken können. Darin werden Tokens als `var(--…)` gelesen; nie fest eingetragene Hex-/RGB-Werte. Keine Tailwind-Direktiven (`@apply`, `@reference`, `@theme`) in Komponenten-Styles. `ViewEncapsulation` nicht überschreiben.
- Eigene Klassennamen in CSS folgen BEM (`block__element--modifier`).
- Keine weiteren UI-Frameworks (Angular Material, Bootstrap usw.). Für Icons wird eine Bibliothek per ADR gewählt, sobald welche gebraucht werden.

## 5. i18n

Die Quellsprache ist **Deutsch**. Texte entstehen mit `@angular/localize`.

- Jeder Text für Nutzer bekommt eine **explizite ID**, ohne Meaning und Description.
- ID-Schema: `@@<layer><Domain>-<componentOrClass>-<key>`.
  - `<layer><Domain>` ist Schicht und Domäne in camelCase (`items/feature` → `featureItems`, `items/ui` → `uiItems`).
  - `<componentOrClass>` ist der Klassenname in camelCase ohne Suffix `Component`/`Page` (`ItemsPage` → `items`, `itemCard`, `itemsFacade`).
  - `<key>` darf mehrere Segmente haben (`space-warning`, `notice-saveFailed`).
  - Beispiele: `@@featureItems-items-title`, `@@uiItems-itemCard-price`, `@@featureItems-itemsFacade-notice-saveFailed`.
  - Eine ID wird nie für einen anderen Text wiederverwendet.
- In TypeScript als Feld: ``title = $localize`:@@featureItems-items-title:Einträge`;``. Platzhalter mit Namen: ``$localize`:@@uiItems-itemCard-price:Preis: ${price}:price: €` ``.
- In Templates: `<span i18n="@@uiItems-itemCard-name">…</span>`, `<ng-container i18n="@@…">`, `i18n-<attr>="@@…"` für Attribute (z. B. `i18n-aria-label`).
- Mehrzahl über ICU (`{count, plural, =1 {Eintrag} other {Einträge}}`).
- Die Logik in `domain` kennt keine Texte, nur IDs und Codes. Die Abbildung Code → Text steht im `feature`- oder `ui`-Layer, typisiert als `Record<Code, string>`.
- Zahlen formatiert `shared/util` (de-DE), nicht `Intl` mit der Laufzeit-Locale.
- Kürzel und Einheiten des festen de-DE-Formats (`Tsd.`, `Mio.` …, `∞`, `–`, `s`, `min`, `h`) stehen fest in `shared/util` und sind keine `$localize`-Texte.

## 6. State: Signals und Facades

Es gibt **kein NgRx**. Zustand liegt in Signals in Stores der `data-access`-Schicht.

**Facade** (`<domain>.facade.ts`), der einzige Zugang für Komponenten:

```ts
@Injectable()
export class ItemsFacade {
  readonly #store = inject(ItemsStore);

  view = computed<ItemsView>(() => toItemsView(this.#store.state()));

  save(id: ItemId): void {
    this.#store.save(id);
  }
}
```

- Facades stellen **Viewmodels** als `computed` bereit. Die Ableitung ist eine reine Funktion (`toItemsView` in `feature/state/<domain>.utils.ts`), die ohne Angular testbar ist. Abgeleitete Werte werden nicht im Zustand gespeichert.
- Viewmodels enthalten Rohwerte (Zahlen, Codes). Formatieren die Pipes, und Texte setzt das Template ein.
- Komponenten injizieren nie Stores oder Dienste aus `data-access`, nur die Facade ihrer Domäne. Facades anderer Domänen nutzt eine Seite nur, wenn sie diese ausdrücklich zusammensetzt.
- Facades enthalten keine Fachregeln; die liegen in `domain`.
- Lokaler UI-Zustand (offenes Panel, Auswahl) liegt als Signal in der Facade oder der Seite.
- Effects (`effect()`) nur für echte Seiteneffekte in die Außenwelt (z. B. DOM-Attribute, Entprellen). Nie Signals aus Effects heraus synchronisieren; dafür gibt es `computed` und `linkedSignal`.
- **Signals statt RxJS:** Eigene Logik und eigener Zustand verwenden nur Signals. RxJS kommt nur an Angular-Schnittstellen vor, die Observables liefern (z. B. `Router.events`). Dort wird sofort per `toSignal()` umgewandelt, oder, wenn eine Subscription unvermeidbar ist, mit `takeUntilDestroyed()` abonniert. Keine eigenen `Subject`s, `BehaviorSubject`s oder Observable-Ketten für Zustand oder Eingaben.

**Providers** (`<domain>.providers.ts`):

```ts
export function provideItemsState(): (Provider | EnvironmentProviders)[] {
  return [ItemsFacade];
}
```

- Routengebundener State wird in der Route registriert: `providers: [provideItemsState()]`.
- App-weite Abläufe startet `provideAppInitializer(...)` im Bootstrap. Seitenbezogene Abläufe starten und stoppen über funktionale Guards oder `DestroyRef`, nicht über `ngOnInit`.

## 7. Data-Access

- Services sind `@Injectable()` ohne `providedIn` und werden über `provide<Name>Service()` bereitgestellt; die `provide<Domain>State()`, die einen Service nutzt, schließt ihn ein.
- **Plattformzugriffe** (localStorage, Worker, `requestAnimationFrame`, `Date.now`, `performance.now`) liegen hinter Injection-Tokens mit Root-Default, damit Tests sie ersetzen können.
- Methoden liefern typisierte Domänenwerte oder Signals. Fehler werden als Codes zurückgegeben oder als Signal bereitgestellt, nicht als Text.
- Worker-Protokolle (Request/Response-Typen, Type Guards) liegen in `<name>-service.model.ts` bzw. `<name>-service.utils.ts`.

## 8. Routing und Bootstrap

- Jedes Feature hat `<domain>.routes.ts` mit `export const <domain>Routes: Routes`.
- Features werden lazy geladen:

  ```ts
  {
    path: 'eintraege',
    loadChildren: async () => (await import('@app/items/feature/items.routes')).itemsRoutes,
  },
  ```

- Guards nur funktional (`CanActivateFn`, `CanMatchFn`, `CanDeactivateFn`), als Fabriken in der Routendefinition aufgerufen. Keine Klassen-Guards, keine Resolver. Umleiten mit `RedirectCommand`.
- App-weite Verdrahtung (Router, App-weiter State) passiert in den Bootstrap-Providers. `provideAppInitializer(...)`, nie `APP_INITIALIZER`.

## 9. Domänenmodelle und TypeScript

- `interface` für Objektformen, `type` für Unions, Aliase und `Pick`/`Omit`.
- Enum-artige Werte als `as const`-Liste mit abgeleitetem Typ, **kein** TS-`enum`:

  ```ts
  export const ITEM_KINDS = ['book', 'film', 'game'] as const;
  export type ItemKind = (typeof ITEM_KINDS)[number];
  ```

- Modelldateien heißen `*.model.ts`.
- Der Code kompiliert unter `strict` und `strictTemplates`. `unknown` statt `any`, keine Non-Null-Assertions, um echte Nullbarkeit zu verdecken.
- Unbenutzte Parameter und Variablen bekommen ein `_`-Präfix. Unbenutzte Importe sind ein Lint-Fehler.
- Importe innerhalb einer Domäne sind relativ (`./`, `../`). Importe aus anderen Domänen und von der App-Wurzel verwenden den Alias `@app/<domain>/<layer>/…`, nie relative Pfade in fremde Domänen. So sind Querabhängigkeiten auf einen Blick sichtbar.
- Importe sortiert ESLint (`import-x/order`, alphabetisch, Gruppen durch Leerzeilen getrennt). `npm run lint -- --fix` statt von Hand sortieren.
- Formatieren macht Prettier (`.prettierrc`), nicht die Hand.
- **Bezeichner sind Englisch, Kommentare Deutsch.** Texte für Nutzer sind deutsche i18n-Quelltexte.
- **Möglichst keine Kommentare.** Was der Code tut und warum, zeigen Namen, Typen und kleine Funktionen. Kein JSDoc, keine Abschnittsbanner, kein auskommentierter Code, keine Kommentare, die den Code nacherzählen.
  - Erlaubt nur in Ausnahmen, die sich im Code nicht ausdrücken lassen (z. B. Umgehung eines Framework-Fehlers), dann knapp und mit Verweis auf Issue oder ADR.

## 10. Testing

Getestet werden die **wesentliche** Logik und die **wesentlichen** E2E-Abläufe; Hauptziel ist, unbeabsichtigte Regressionen zu vermeiden, nicht Vollständigkeit.

**Übergang:** Bis zur Kalibrierung und Abnahme durch den Nutzer (`docs/plan-angular-umbau.md`) wird lose getestet: Formatierung (`shared/util`), Golden Master der Spielregeln, E2E-Smoke. Die Abdeckung wird gemessen, die Untergrenze ist ausgesetzt. Danach legt AP 14 ein Testkonzept fest und führt die Untergrenze wieder ein.

- **Vitest** für die wesentlichen Regeln in den `domain`-Schichten und `util`. Die Abdeckung wird gemessen (`vitest-base.config.mts`); eine Untergrenze ist ein Sicherheitsnetz, kein Ziel. Specs liegen neben dem Code (`<name>.spec.ts`).
- **UI:** Komponententests nur für Komponenten und Seiten mit eigener Logik, die brechen kann (z. B. Formular-Parsing). Rein darstellende Komponenten deckt der E2E-Smoke ab. Erwartete Werte nicht aus dem Code unter Test ableiten.
- **E2E:** Playwright-Smoke für Desktop und Smartphone (`e2e/*.e2e.ts`) gegen den Produktions-Build (`e2e/serve.mjs`); nur wesentliche Abläufe, nur auf Test-IDs und Rollen warten, keine festen Wartezeiten.
- Plattformzugriffe in Tests über die Tokens aus §7 ersetzen, Zeit über Fake-Timer bzw. Parameter.

## 11. Änderungen prüfen

| Aufgabe | Befehl |
| --- | --- |
| Node wählen | `nvm use` (`.nvmrc`) |
| Dev-Server | `npm start` |
| Unit-Tests | `npm test` |
| Unit-Tests mit Abdeckung (wie CI) | `npm run test:coverage` |
| Ein Spec | `npx ng test --watch=false --include src/app/<pfad>/<name>.spec.ts` |
| Lint (und Fix) | `npm run lint` (`npm run lint -- --fix`) |
| Format | `npm run format:check`, `npx prettier --write <dateien>` |
| Build (prüft Typen und Budgets) | `npm run build` |
| Build mit Dev-Domäne wie GitHub Pages | `npm run build:pages` |
| E2E (baut, dann Playwright; einmalig `npx playwright install chromium`) | `npm run e2e` |
| E2E mit Katalog (nur gegen den Pages-Build) | `npm run build:pages && E2E_BUILD_CONFIGURATION=pages npx playwright test` |

Vor dem Abschluss einer Aufgabe sind Lint, Format, Tests, Build und E2E grün (CI-Gate).

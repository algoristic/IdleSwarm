# CLAUDE.md

## Git

- Niemals ohne ausdrückliche Anweisung des Nutzers stagen (`git add`, `git stage` o. Ä.) oder committen – auch nicht nach Abschluss einer Aufgabe.
- Änderungen bleiben im Working Tree; nach Änderungen nur berichten, was geändert wurde.
- Eine Erlaubnis zum Stagen/Committen gilt nur für den jeweiligen Auftrag, nicht dauerhaft.

## Projektkontext

**IdleSwarm** ist ein Idle-Browserspiel für eine Person (Angular, kein Backend, deutsche Oberfläche). Was gebaut wird, steht in `docs/`:

- `docs/projektplan.md`: Ausbaustufen (AS), Meilensteine und Arbeitspakete (`AP x.y.z`), Abhängigkeiten, Pacing-Ziele, Definition of Done (§6).
- `docs/game-design.md`: Formeln, Startwerte, Kostenkurven, Spielstand-Format.
- `docs/produktplanung.md`: User Stories (`US-xx.yy`).
- `docs/technisches-konzept.md` (TK): Stack, Architektur, Simulation, Persistenz, Rendering.
- `docs/adr/`: Architektur-Entscheidungen mit Umsetzungsstand.

**Arbeitsweise:** Gearbeitet wird ein AP nach dem anderen („Setze AP x.y.z aus `docs/projektplan.md` um“).

- Prüfen, ob die Abhängigkeiten des AP fertig sind.
- Nachfragen, bevor auf einem Punkt aufgebaut wird, der nur „Vorschlag“ und nicht „entschieden“ ist.
- Nach dem AP: Umsetzungsstand in den betroffenen ADRs und im TK nachziehen, ebenso die Regeldateien der berührten Bereiche. Weicht die Umsetzung von der Spezifikation ab, wird die Spezifikation angepasst.
- Jede neue Laufzeitabhängigkeit braucht eine ADR.

**Architektur:** Die Regeln unten beruhen auf [ADR-009](docs/adr/009-domaenen-schichten-facade.md) (Domänen, Facades), [ADR-010](docs/adr/010-tailwind-tokens.md) (Tailwind), [ADR-011](docs/adr/011-i18n-localize.md) (`$localize`) und [ADR-012](docs/adr/012-signal-forms.md) (Signal Forms); der Code folgt ihnen seit AP 1.1.10.

**Regeldateien:** Was im Code existiert, wird je Bereich in pfadbezogenen Regeldateien `.claude/rules/<bereich>.md` beschrieben (Frontmatter `paths`). Claude Code lädt eine Regeldatei automatisch, sobald eine passende Datei gelesen oder bearbeitet wird.

- Vor der Planung eines AP die Regeldateien der betroffenen Bereiche lesen.
- Nach dem AP die Änderungen dort einarbeiten.
- Ein neuer Bereich bekommt eine eigene Regeldatei und eine Zeile in dieser Tabelle.

| Bereich (Regeldatei) | Pfade | Inhalt |
| --- | --- | --- |
| [`simulation`](.claude/rules/simulation.md) | `src/app/{balance,engine,swarm,site}/**` | Formeln, `GameState`, Kommandos, `step`, Runner, GameStore und GameLoop |
| [`persistence`](.claude/rules/persistence.md) | `src/app/persistence/**` | Spielstand-Format, Slots, Migrationen, Autosave |
| [`hud`](.claude/rules/hud.md) | `src/app/hud/**` | Prototyp-HUD: Facade, Viewmodel, Kaufknopf, Futterstelle |
| [`model`](.claude/rules/model.md) | `src/app/model/**` | Modell-Seite: Bots, Worker, Parameterformular, Diagramme, Kennzahlen |
| [`shared`](.claude/rules/shared.md) | `src/app/shared/**`, `src/styles.css` | `Num`, Formatierung, RNG, Pipes, Plattform-Tokens, Design-Tokens |

**Regeln, die überall gelten:**

- Die Spiellogik ist reines, deterministisches TypeScript in den `domain`-Schichten. Spiel, Offline-Catch-up, Headless-Runner und Modell-Seite rufen dieselben Funktionen auf (TK §5.1). Die Modell-Seite enthält keine Kopie der Spiellogik.
- Formeln und Konstanten stehen nur in `balance/domain`, alle Konstanten sind über `params` überschreibbar (ADR-007).
- Große Zahlen laufen nur über den `Num`-Typ, nie direkt über `break_infinity.js` (ADR-002).
- Spielzeit wird nur über die Konstanten aus `balance/domain` umgerechnet (z. B. `TICK_MS`), nie mit Literalen wie `100` oder `1000`.
- Zufall nur über den seeded RNG im State (ADR-003).
- IDs in Spieldaten (Einheiten, Futterstellentypen, Adaptionen, Funde) sind stabil; Spielstände speichern nur IDs. Eine Änderung am Spielstand-Format braucht eine Migration (ADR-005).
- Änderungen an Formeln oder Konstanten werden auf der Modell-Seite geprüft (Pacing-Ziele, Projektplan §3.5).
- Templates formatieren nur über Pipes, die auf die Formatierungsfunktionen in `shared/util` zugreifen. Nie ad hoc runden oder formatieren.

**Repo-Fakten:**

- Präfix für Komponenten und Direktiven ist `app`.
- Prettier mit `printWidth` 100; `docs/`, `CLAUDE.md` und `.claude/` werden nicht formatiert.
- Pfad-Alias `@app/*` → `src/app/*`.
- **Exakte Versionen:** Jede Version in `package.json` ist exakt (`"4.3.5"`), nie `^`, `~`, `>=` oder `*`. Die `.npmrc` setzt `save-exact=true`; nach `npm i` trotzdem `package.json` prüfen. Updates sind bewusste Versionssprünge.
- Node per `nvm use` (`.nvmrc`).
- CI (`.github/workflows/ci.yml`) prüft Lint, Format, Unit-Tests mit Abdeckung und Build bei jedem Push; ein Push auf `main` deployt auf GitHub Pages (Base-Href `/IdleSwarm/`).
- Die Modell-Seite (`/modell`) ist im Produktiv-Build nur mit `?dev` erreichbar (`DEV_BUILD`, `modelRouteGuard`).

## 0. Umgang mit dieser Datei

- Beim Bearbeiten bestehender Dateien bleibt die Datei in sich einheitlich. Keine Stile mischen, nichts Unbeteiligtes umbauen, außer es ist gewünscht.
- Widersprechen sich diese Datei und der umgebende Code, nachfragen statt raten.
- Vorhandene Dienste, Tokens, Pipes und Helfer wiederverwenden, bevor neue entstehen.

## 1. Architektur: Domänen und Schichten

Code wird zuerst nach Domäne, dann nach Schicht gruppiert: `src/app/<domain>/<layer>/…`, z. B. `swarm/domain`, `hud/feature`, `hud/ui`. Die App-Wurzel (`main.ts`, Root-Komponente, Root-Routen, `app.config.ts`) startet und verdrahtet nur. Alle Funktionalität liegt in den Domänen-Ordnern.

| Schicht | Enthält | darf abhängen von |
| --- | --- | --- |
| `feature` | Routen, Seiten, Smart Components, `state/` (Facade, Providers, Guards) | feature, ui, data-access, domain, util |
| `ui` | Präsentationskomponenten (nur Inputs/Outputs), Pipes, Formular-Komponenten | ui, domain, util |
| `data-access` | GameStore, GameLoop (Timer, rAF), Persistenz (localStorage), Worker-Clients, Plattform-Tokens | data-access, domain, util |
| `domain` | Modelle (Interfaces, `as const`-Listen), Spieldaten, reine Regeln und Formeln | domain, util |
| `util` | generische Helfer ohne Fachwissen (`Num`, RNG, Formatierung) | util |

ESLint erzwingt diese Regeln (`no-restricted-imports` je Schicht in `eslint.config.js`; Specs sind ausgenommen). Passt eine Abhängigkeit nicht, wandert der Code in die richtige Schicht, statt quer zu importieren oder die Regel abzuschalten.

- **Angular-freie Schichten:** `domain` und `util` importieren nichts aus `@angular/*` oder `rxjs`. So läuft der Code in Vitest unter Node, im Web Worker der Modell-Seite und im Headless-Runner.
- **Determinismus:** `domain` und `util` verwenden kein `Math.random`, `Date`, `Date.now`, `performance.now` und kein `crypto`. Zeit kommt als Parameter herein, Zufall nur über den seeded RNG. Eine ESLint-Regel erzwingt das; Ausnahmen nur mit begründetem `eslint-disable`. `Math.exp`/`Math.log`/`**` sind erlaubt, weil kein Bit-Gleichstand zwischen Browsern verlangt ist.
- **Smart und präsentational:** `feature` enthält Seiten und Komponenten, die eine Facade injizieren. Alles Präsentationale liegt in `ui`, auch wenn nur eine Seite es nutzt.
- **Texte und Zugriff:** Texte für Spieler gibt es nur in Angular (§5). Die Logik liefert IDs und Codes (z. B. `RestoreNotice`), die `feature` oder `ui` auf `$localize`-Texte abbilden. Komponenten greifen nie direkt auf GameStore, localStorage oder Worker zu, nur über Facades.
- **Worker:** Worker importieren nur `domain` und `util` und erzeugen keinen Angular-Injector.

**Domänen:**

| Domäne | Inhalt |
| --- | --- |
| `shared` | `util`: `Num`, RNG, Formatierung; `ui`: allgemeine Bausteine und Pipes; `data-access`: Plattform-Tokens (`CLOCK`, `ANIMATION_FRAME`) |
| `balance` | `domain`: Konstanten, Formeln, später Zielbänder (`targets`) |
| `engine` | `domain`: Zusammensetzung des `GameState`, `apply` (Kommandos), `step`, Ereignisse, Headless-Runner und Bot-Schnittstelle; `data-access`: GameStore, GameLoop, `provideGameCore()` |
| `swarm` | Einheiten, Brut, später Pheromone |
| `site` | Futterstellen, Sammeln, später Generator und Weiterziehen |
| `persistence` | `domain`: Serialisierung, Slots, Migrationen; `data-access`: `PersistenceService`, `KEY_VALUE_STORE` |
| `hud` | Prototyp-HUD (`feature`, `ui`) |
| `model` | Modell-Seite: Bots, Parameter, Laufauswertung (`domain`), Sim-Worker und `SimService` (`data-access`), Parameterformular, Diagramme, Kennzahlen (`ui`), Seite und `ModelFacade` (`feature`) |
| später | `shell` (K2-Ebenen, Modus, Kamera), `scene` (Canvas), `sonar`, `genome`, `finds`, `settings` |

Jede Fachdomäne definiert ihren Teil des Zustands (z. B. `Units` in `swarm/domain/models`, `Site` in `site/domain/models`) und ihre Regeln. `engine/domain` setzt daraus `GameState`, `apply` und `step` zusammen. Zusätzliche Standorte ab AS3 bleiben damit eine Sache von `site` und `engine`.

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

**ui:** ein Ordner je Komponente oder Direktive, benannt nach dem, was sie zeigt (`buy-button`, `feeding-site`, `hud-meter`, `form-*`, `dialog-*`). Komponentenspezifische Typen liegen in `<component>.model.ts`, gemeinsame Typen eines `ui`-Ordners in `models/<name>.model.ts`. Pipes liegen unter `pipes/<name>/<name>.pipe.ts`. Eine `.css`-Datei gibt es nur für Sonderfälle (§4).

**data-access:**

```
<domain>/data-access/<name>/
├── <name>.service.ts               # <Name>Service
├── <name>-service.providers.ts     # provide<Name>Service()
├── <name>-service.tokens.ts        # Plattform-Tokens mit Root-Default
└── <name>-service.model.ts         # Transporttypen (z. B. Worker-Protokoll)
```

**domain:** Modelle in `models/<name>.model.ts`, Spieldaten in `data/<name>.data.ts`, reine Regeln in `<name>-logic.ts`.

## 3. Komponenten und Templates

### Namen und Metadaten

- Geroutete Seiten heißen `<name>.page.{ts,html}` mit Klasse `<Name>Page` und Selektor `app-<name>-page`. Alle anderen Komponenten heißen `<name>.component.{ts,html}` mit Klasse `<Name>Component` und Selektor `app-<name>`. ESLint erzwingt die Suffixe.
- Direktiven heißen `<name>.directive.ts` mit Klasse `<Name>Directive` und Attributselektor `app<Name>`.
- Namen beschreiben, was eine Komponente zeigt. Ob sie smart oder präsentational ist, folgt aus ihrer Schicht. Nur zwei Rollen-Präfixe: `dialog-` und `form-`.
- Standalone ist implizit, also kein `standalone: true`, keine NgModules.
- Metadaten in der Reihenfolge `selector`, `imports`, `templateUrl`, `styleUrl` (Singular), `host`. Das Template ist immer eine eigene Datei. Eine `.css`-Datei und `styleUrl` gibt es nur, wenn die Komponente Sonder-Styles braucht (§4); keine leeren Style-Dateien.
- Das `display` des Hosts setzt die Host-Klasse, `host: { class: 'block' }`, nie `:host { display }` (§4).
- Kein `changeDetection` setzen: In Angular 22 ist OnPush der Standard.
- Zoneless: Alles, was das Template zeigt, kommt aus Signals oder Template-Ereignissen. Nie einfache Felder aus Timern, Promises oder Subscriptions zuweisen und ein Update erwarten. Kein `NgZone`.
- Render-Takt: Canvas-Renderer melden sich über den GameLoop für den rAF an (`onRender`) und lesen den Zustand dort. Pro Frame laufen keine Template-Bindungen.

### Klassen-Member

```ts
// feature-Komponente; ui-Komponenten injizieren keine App-Dienste, nur Inputs/Outputs
export class UnitListComponent {
  facade = inject(HudFacade); // vom Template gelesen → öffentlich, ohne Modifier
  readonly #router = inject(Router); // nur in der Klasse genutzt → privates Feld

  units = input.required<UnitView[]>();
  activeUnit = input<UnitType>();

  selectedUnit = output<UnitType>(); // Outputs als Ereignisse in der Vergangenheitsform

  unitCount = computed(() => this.units().length);

  title = $localize`:@@featureHud-unitList-title:Schwarm`;

  onSelectUnit(unit: UnitType): void {
    this.selectedUnit.emit(unit);
  }

  #formatLabel(unit: UnitView): string {
    return `${unit.name} (${unit.count})`;
  }
}
```

- DI nur über `inject()`-Feldinitialisierer, nie über den Konstruktor.
- Sichtbarkeit:
  - Member, die das Template nutzt, haben keinen Modifier. Kein `protected`.
  - Member, die nur die Klasse nutzt, sind ECMAScript-private Felder: `readonly #router = inject(Router)`, `#formatLabel(…)`. Kein `private` und kein `_`-Präfix.
- Nur Signal-APIs: `input()`, `input.required()`, `output()`, `model()` (nur für eigene Formular-Controls und Formular-Komponenten, siehe Formulare), `computed()`, `linkedSignal()`, `viewChild()`. Nie `@Input()`, `@Output()`, `EventEmitter` oder `@ViewChild`. Kein `readonly` davor.
- Outputs heißen wie Ereignisse in der Vergangenheitsform: `clickedBuy`, `selectedUnit`, `submittedParams`.
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
@let hud = facade.hud();

<dl>
  <dt i18n="@@featureHud-hudPage-food">Nahrung</dt>
  <dd class="tabular-nums" data-testid="hud.resources.food">{{ hud.food | formatNum }}</dd>
</dl>
@for (unit of hud.units; track unit.id) {
  <app-buy-button [unit]="unit" (clickedBuy)="facade.buy(unit.id)" />
}
```

- Signal-Werte, die das Template mehrfach braucht, oben in einem `@let`-Block sammeln. Zum Auspacken unter gleichem Namen den Unterstrich-Alias nehmen: `@let _form = form();`.
- Nur eingebaute Control Flow (`@if`, `@for`, `@switch`, `@defer`).
- `@for` trackt immer über ein Identitätsfeld (`track unit.id`), bei Primitiven über `$index` oder den Wert.
- Templates rufen außer Event-Handlern und Signals keine Methoden auf. Werte formatieren die Pipes aus `shared/ui/pipes`; alles andere wird als `computed` abgeleitet, z. B. als Viewmodel der Facade.
- **`data-testid` an interaktiven Elementen und angezeigten Werten.** Schema `<feature>.<bereich>.<element>`, z. B. `data-testid="hud.units.drones.buy"`. Dynamisch: `[attr.data-testid]="'hud.units.' + unit.id + '.buy'"`.

### Formulare

Neue Formulare verwenden **Signal Forms** (`@angular/forms/signals`). Keine Reactive Forms (`FormGroup`, `FormControl`), keine template-getriebenen Formulare, kein `ngModel`.

- **Modell:** ein beschreibbares Signal mit genau den Werten, die die Controls bearbeiten (z. B. Strings für Zahleneingaben mit deutschem Komma). Sein Typ steht in der `*.model.ts` der Komponente. Das Paar heißt `<name>Model` und `<name>Form`.
  - Leere Formulare starten mit `signal({...})`.
  - Aus einem Input befüllte Formulare nutzen `linkedSignal(() => …)`. Formulare nie in `computed()` bauen.
  - Liefert der Input für dieselbe Sache neue Referenzen, während der Spieler editiert (das passiert bei jedem Tick!), nur bei Identitätswechsel zurücksetzen: `linkedSignal({ source: this.#id, computation: () => ({ … untracked(this.x) … }) })` mit `#id = computed(() => this.x().id)`.
  - Hält der `feature`-Layer das Modell, weil Änderungen dort sofort wirken (Auto-Lauf der Modell-Seite), bekommt die Formular-Komponente es über `model()` und der Aufrufer bindet zweiseitig (`[(paramsModel)]="facade.params"`). Der Typ liegt dann in `domain/models`, weil auch die Ableitung in `domain` ihn braucht. Vorbild: `FormModelParamsComponent`.
- **Schema:** Validierung und Feldzustand (`disabled`, `hidden`, `readonly`) stehen in der Schema-Funktion, reaktiv über `when`, nie imperativ aus Effects. `$localize`-Meldungen stehen inline im Schema (`message:`).
  - Wiederverwendbare Regelsätze sind `schema<T>(…)`-Konstanten in der `ui`-Schicht. Die reinen Prüf- und Formatierungsfunktionen dahinter liegen in `domain` oder `util`.
- **Bindung:** `FormField` und `FormRoot` aus `@angular/forms/signals` importieren, jedes Control mit `[formField]` binden. Eigene Controls implementieren `FormValueControl` (`value = model<T>()`), nicht `ControlValueAccessor`.
- **Absenden:** `submission.action` in den `form()`-Optionen, `<form [formRoot]="xForm">`. Eine Formular-Komponente gibt ein typisiertes Ergebnis über einen Output aus (`submittedParams`). Was damit passiert, entscheidet der `feature`-Layer.
- Fehler nur für berührte oder bearbeitete Felder anzeigen (`xForm.name().touched()` bzw. `.dirty()`, dazu `.invalid()`, `.errors()`).

### Dialoge

- Dialoginhalte liegen in `dialog-<name>/` (nie `<name>-dialog`).
- Dialoge werden typisiert geöffnet, Daten- und Ergebnistypen stehen in der `*.model.ts` des Dialogs.
- Dialoge öffnet die Facade oder eine Seite im `feature`-Layer, nie eine `ui`-Komponente.
- Welche Dialog- und Overlay-Technik (CDK oder eigene Lösung für Bottom-Sheets) verwendet wird, entscheidet AP 1.4.5 mit einer ADR.

### ui-Schicht

`ui`-Komponenten sind rein präsentational: Daten kommen über Inputs herein, Ereignisse gehen über Outputs hinaus. Keine Facades, kein GameStore, keine Dienste, kein `Router`, keine Dialoge. Framework- und Plattform-Tokens sind erlaubt (`ElementRef`, `DestroyRef`, `Renderer2`, `DOCUMENT`), ebenso Router-Direktiven wie `routerLink` im Template.

**Ausnahme Diagramm-Wrapper:** Die ECharts-Wrapper-Komponente (ADR-007) darf ECharts direkt initialisieren und auf Größenänderungen reagieren. Daten und Optionen kommen trotzdem nur über Inputs.

## 4. Styling

Styling verwendet **Tailwind CSS v4** mit semantischen Tokens ([ADR-010](docs/adr/010-tailwind-tokens.md)). `src/styles.css` ist das einzige globale Stylesheet:

- Es importiert Tailwind und definiert die `--sw-*`-Tokens aus der Palette des UI-Leitbilds ([Mockup K2-K · Kurzgesagt-Stil](docs/mockups/k2-kurzgesagt.html)).
- Es bildet die Tokens über `@theme inline` auf Tailwind-Farben ab. Die Standardpalette ist abgeschaltet.
- Es enthält die eigenen Varianten (`@custom-variant`).

Das Spiel hat nur ein dunkles Thema; ein helles ist nicht geplant.

- **Templates verwenden Utility-Klassen**, Farben nur aus den Tokens: z. B. `bg-bg`, `bg-glass`, `border-border`, `text-fg`, `text-fg-muted`, `text-accent`, `text-warning`, `text-danger`. Abstände, Größen und Typografie aus der Tailwind-Skala.
- **Keine Arbitrary Values** (`p-[13px]`, `bg-[#123456]`) und keine Standardfarben. Neue Farben sind neue Tokens in `src/styles.css`, mit Textkontrast ≥ 4,5:1.
- Klassennamen immer vollständig schreiben. Tailwind findet Klassen durch Scannen der Quellen, also nicht aus Strings zusammensetzen (`'bg-' + x`). Varianten über Signal-Inputs und ein `computed`-Mapping mit vollständigen Klassennamen.
- Zustände folgen ARIA-Attributen statt Klassen-Ternären: `aria-disabled:`, `aria-selected:`, `aria-current` über eine eigene Variante, `disabled:` bei nativen Elementen.
- Zahlen (Mengen, Raten, Preise) bekommen `tabular-nums`.
- Reduzierte Bewegung über `motion-reduce:` bzw. `@media (prefers-reduced-motion: reduce)` und die Einstellung aus AP 1.5.3.
- **Host-Styling** über die Host-Klasse (`host: { class: 'block' }`, `host: { '[class]': 'classes()' }`). Kein `display` oder andere Eigenschaften auf `:host`, die Aufrufer per Utility ändern könnten: Angulars Komponenten-Styles sind ungelayert und schlagen Tailwinds `@layer utilities`.
- **Komponenten-CSS** (`.component.css`/`.page.css`, Plain CSS, kein Sass) gibt es nur für Sonderfälle, die Utilities nicht ausdrücken können. Darin werden Tokens als `var(--sw-*)` gelesen; nie fest eingetragene Hex-/RGB-Werte. Keine Tailwind-Direktiven (`@apply`, `@reference`, `@theme`) in Komponenten-Styles. `ViewEncapsulation` nicht überschreiben.
- **Ausnahme K2:** Die folgenden Teile stehen ausdrücklich in Komponenten-CSS, auch mit freien Werten:
  - Ebenen, Kamera und Moduswechsel (`transform`, `scale`, `clip-path: circle()`, `filter`, `opacity`, Übergänge mit `--sw-ease`)
  - die aus dem Platz berechnete Größe `--ms`
  - SVG-Animationen von Sonar und Genom (Sweep, Membran, Pulse)
  - Canvas-Container
  - `env(safe-area-inset-*)`

  Werte, die mehrfach vorkommen (Dauern, Easing, Schlagschatten, Cel-Schatten), werden zu Tokens. Der Modus steht als `data-mode` am Shell-Container; Utilities reagieren darauf über eigene Varianten (`mode-map:`, `mode-scene:`, `mode-gen:`).
- **Canvas** liest seine Farben einmal beim Start bzw. bei einem Themenwechsel aus den Token-Variablen (`getComputedStyle`), nicht pro Frame und nicht als Literal.
- Eigene Klassennamen in CSS folgen BEM (`block__element--modifier`).
- Keine weiteren UI-Frameworks (Angular Material, Bootstrap usw.). Für Icons wird eine Bibliothek per ADR gewählt, sobald welche gebraucht werden.

## 5. i18n

Die Quellsprache ist **Deutsch** ([ADR-011](docs/adr/011-i18n-localize.md)). Texte entstehen mit `@angular/localize`. Eine englische Übersetzung (XLF, Extraktion, Prüfung) kommt erst mit dem Querschnittsthema „Englische Übersetzung“. Bis dahin gibt es keine XLF-Dateien.

- Jeder Text für Spieler bekommt eine **explizite ID**, ohne Meaning und Description.
- ID-Schema: `@@<layer><Domain>-<componentOrClass>-<key>`.
  - `<layer><Domain>` ist Schicht und Domäne in camelCase (`hud/feature` → `featureHud`, `model/ui` → `uiModel`).
  - `<componentOrClass>` ist der Klassenname in camelCase ohne Suffix `Component`/`Page` (`hudPage` → `hud`, `buyButton`, `hudFacade`).
  - `<key>` darf mehrere Segmente haben (`space-warning`, `notice-restoredFromBackup`).
  - Beispiele: `@@featureHud-hud-title`, `@@uiHud-buyButton-price`, `@@featureHud-hudFacade-notice-saveFailed`.
  - Eine ID wird nie für einen anderen Text wiederverwendet.
- In TypeScript als Feld: ``title = $localize`:@@featureHud-hud-title:IdleSwarm`;``. Platzhalter mit Namen: ``$localize`:@@uiHud-buyButton-price:Preis: ${price}:price: Nahrung` ``.
- In Templates: `<span i18n="@@uiHud-buyButton-name">…</span>`, `<ng-container i18n="@@…">`, `i18n-<attr>="@@…"` für Attribute (z. B. `i18n-aria-label`).
- Mehrzahl über ICU (`{count, plural, =1 {Drohne} other {Drohnen}}`).
- Die Logik in `domain` kennt keine Texte, nur IDs und Codes. Die Abbildung Code → Text steht im `feature`- oder `ui`-Layer, typisiert als `Record<Code, string>`.
- Zahlen formatiert weiterhin `shared/util` (de-DE, TK §9), nicht `Intl` mit der Laufzeit-Locale.

## 6. State: Signal-Store und Facades

Es gibt **kein NgRx** ([ADR-009](docs/adr/009-domaenen-schichten-facade.md)). Der Spielzustand liegt als ein Signal im `GameStore` (`engine/data-access`). Er ändert sich nur über `dispatch(cmd)` (Kommando → `apply`), `tick(dt)` (→ `step`) und `replace(state)` (Laden).

**Facade** (`<domain>.facade.ts`), der einzige Zugang für Komponenten:

```ts
@Injectable()
export class HudFacade {
  readonly #store = inject(GameStore);
  readonly #persistence = inject(PersistenceService);

  hud = computed<HudView>(() => toHudView(this.#store.state(), DEFAULT_BALANCE));
  lastSavedAt = this.#persistence.lastSavedAt;

  buy(unit: UnitType): void {
    this.#store.dispatch({ type: 'buy', unit });
  }
}
```

- Facades stellen **Viewmodels** als `computed` bereit. Die Ableitung ist eine reine Funktion (`toHudView` in `feature/state/<domain>.utils.ts`), die ohne Angular testbar ist. Abgeleitete Werte (Raten, Preise) kommen aus `balance/domain` und werden nicht im State gespeichert (TK §3.3).
- Viewmodels enthalten Rohwerte (`Num`, Zahlen, Codes). Formatieren die Pipes, und Texte setzt das Template ein.
- Komponenten injizieren nie den `GameStore` oder Dienste aus `data-access`, nur die Facade ihrer Domäne. Facades anderer Domänen nutzt eine Seite nur, wenn sie diese ausdrücklich zusammensetzt.
- Facades enthalten keine Spielregeln. Jede Zustandsänderung ist ein Kommando, das `engine/domain` anwendet.
- Lokaler UI-Zustand, der nicht in den Spielstand gehört (offene Schublade, Zoom-Ausschnitt), liegt als Signal in der Facade oder der Seite, nie im `GameState`.
- Effects (`effect()`) nur für echte Seiteneffekte in die Außenwelt (z. B. DOM-Attribute, Entprellen). Nie Signals aus Effects heraus synchronisieren; dafür gibt es `computed` und `linkedSignal`.
- **Signals statt RxJS:** Eigene Logik und eigener Zustand verwenden nur Signals. RxJS kommt nur an Angular-Schnittstellen vor, die Observables liefern (z. B. `Router.events`). Dort wird sofort per `toSignal()` umgewandelt, oder, wenn eine Subscription unvermeidbar ist, mit `takeUntilDestroyed()` abonniert. Keine eigenen `Subject`s, `BehaviorSubject`s oder Observable-Ketten für Zustand oder Eingaben; Entprellen und Sperren (z. B. die Mausrad-Sperre) laufen über Signals und Timer mit Aufräumen über `DestroyRef`.

**Providers** (`<domain>.providers.ts`):

```ts
export function provideHudState(): (Provider | EnvironmentProviders)[] {
  return [HudFacade];
}
```

- Routengebundener State wird in der Route registriert: `providers: [provideHudState()]`.
- **Ausnahme (Spielkern):** `GameStore`, `GameLoop` und `PersistenceService` werden genau einmal im Bootstrap bereitgestellt (`provideGameCore()` in `app.config.ts`), damit es nur einen Zustand, einen Takt und einen Autosave gibt.
- **Starten:** Laden, Takt und Autosave startet `provideAppInitializer(...)` im Bootstrap. Seitenbezogene Abläufe (z. B. Läufe der Modell-Seite) starten und stoppen über funktionale Guards (`enterX`/`leaveX`) oder `DestroyRef`, nicht über `ngOnInit`.

## 7. Data-Access

```ts
@Injectable()
export class PersistenceService {
  readonly #store = inject(GameStore);
  readonly #keyValueStore = inject(KEY_VALUE_STORE);
  …
}
```

- Services sind `@Injectable()` ohne `providedIn` und werden über `provide<Name>Service()` bereitgestellt; die `provide<Domain>State()`, die einen Service nutzt, schließt ihn ein (Ausnahme Spielkern, §6).
- **Plattformzugriffe** (localStorage, Worker, `requestAnimationFrame`, `Date.now`, `performance.now`) liegen hinter Injection-Tokens mit Root-Default, damit Tests sie ersetzen können. Vorbilder: `CLOCK` und `ANIMATION_FRAME` (`shared/data-access/platform/platform.tokens.ts`), `KEY_VALUE_STORE` (`persistence/data-access/persistence/persistence-service.tokens.ts`), `SIM_WORKER_FACTORY` (`model/data-access/sim/sim-service.tokens.ts`), `DEV_BUILD` (`model/feature/state/model.guards.ts`).
- Methoden liefern typisierte Domänenwerte oder Signals. Fehler werden als Codes (z. B. `SaveError`) zurückgegeben oder als Signal bereitgestellt, nicht als Text.
- Worker-Protokolle (Request/Response-Typen, Type Guards) liegen in `<name>-service.model.ts` bzw. `<name>-service.utils.ts`.
- Kein `HttpClient`: Es gibt kein Backend (ADR-008).

## 8. Routing und Bootstrap

- Jedes Feature hat `<domain>.routes.ts` mit `export const <domain>Routes: Routes`.
- Features werden lazy geladen:

  ```ts
  {
    path: 'modell',
    canMatch: [modelRouteGuard],
    loadChildren: async () => (await import('@app/model/feature/model.routes')).modelRoutes,
  },
  ```

- Guards nur funktional (`CanActivateFn`, `CanMatchFn`, `CanDeactivateFn`), als Fabriken in der Routendefinition aufgerufen. Keine Klassen-Guards, keine Resolver. Umleiten mit `RedirectCommand`.
- App-weite Verdrahtung (Router, Spielkern, App-weiter State) passiert in den Bootstrap-Providers. `provideAppInitializer(...)`, nie `APP_INITIALIZER`.

## 9. Domänenmodelle und TypeScript

- `interface` für Objektformen, `type` für Unions, Aliase und `Pick`/`Omit`.
- Enum-artige Werte als `as const`-Liste mit abgeleitetem Typ, **kein** TS-`enum`:

  ```ts
  export const UNIT_TYPES = ['queens', 'drones', 'soldiers'] as const;
  export type UnitType = (typeof UNIT_TYPES)[number];
  ```

- Modelldateien heißen `*.model.ts`.
- Der Code kompiliert unter `strict` und `strictTemplates`. `unknown` statt `any`, keine Non-Null-Assertions, um echte Nullbarkeit zu verdecken.
- Unbenutzte Parameter und Variablen bekommen ein `_`-Präfix. Unbenutzte Importe sind ein Lint-Fehler.
- Importe innerhalb einer Domäne sind relativ (`./`, `../`). Importe aus anderen Domänen und von der App-Wurzel verwenden den Alias `@app/<domain>/<layer>/…`, nie relative Pfade in fremde Domänen. So sind Querabhängigkeiten auf einen Blick sichtbar.
- Importe sortiert ESLint (`import-x/order`, alphabetisch, Gruppen durch Leerzeilen getrennt). `npm run lint -- --fix` statt von Hand sortieren.
- Formatieren macht Prettier (`.prettierrc`), nicht die Hand.
- **Bezeichner sind Englisch, Kommentare Deutsch.** Texte für Spieler sind deutsche i18n-Quelltexte.
- Sparsam kommentieren: kein JSDoc an offensichtlichen Membern, keine Abschnittsbanner. Nur nicht offensichtliche Entscheidungen kommentieren (z. B. warum eine Rundung so gewählt ist).

## 10. Testing (bis M5.0: Regressionsschutz)

Bis zum Konzept-Meilenstein M5.0 gibt es keinen vollständigen Testplan (TK §10, Projektplan §6). Getestet werden nur die **wesentliche** Logik und die **wesentlichen** E2E-Abläufe; Hauptziel ist, unbeabsichtigte Regressionen zu vermeiden, nicht Vollständigkeit. Viele Mechaniken sind noch offen; ein engeres Testkorsett würde die Entwicklung jetzt zu sehr einschränken. Die strengeren Regeln aus PortfoliGo (Oracle-Regel, Mutationstests, Seiten-Tests je Akzeptanzkriterium) werden frühestens im Konzept-Meilenstein M5.0 neu bewertet.

- **Vitest** für die wesentlichen Regeln und Formeln in den `domain`-Schichten und `util` (z. B. Formeln, `apply`/`step`, Migrationen). CI erzwingt dort eine Untergrenze von 70 % Abdeckung (`vitest-base.config.mts`); sie ist ein Sicherheitsnetz gegen große ungetestete Lücken, kein Ziel. Specs liegen neben dem Code (`<name>.spec.ts`).
- **Determinismus:** gleicher Seed und gleiche Kommandos ⇒ identischer State.
- **Spielstände:** ein Test je Migration mit eingefrorenen Beispiel-Spielständen.
- **Balancing:** Kennzahlen fester Bot-Läufe als Snapshots mit Toleranz (ab AP 1.5.5).
- **UI:** Komponententests nur für Komponenten und Seiten mit eigener Logik, die brechen kann (z. B. Formular-Parsing). Rein darstellende Komponenten deckt der E2E-Smoke ab. Erwartete Werte nicht aus dem Code unter Test ableiten.
- **E2E:** Playwright-Smoke für Desktop und Smartphone ab AP 1.5.7.
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

Vor dem Abschluss eines AP sind Lint, Format, Tests und Build grün (CI-Gate).
